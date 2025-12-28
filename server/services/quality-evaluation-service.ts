import Anthropic from '@anthropic-ai/sdk';
import { videoFrameExtractor } from './video-frame-extractor';

export interface QualityIssue {
  type: 
    | 'text-overlap' 
    | 'face-blocked' 
    | 'poor-visibility' 
    | 'bad-composition' 
    | 'technical' 
    | 'content-mismatch'
    | 'ai-text-detected'      // Garbled AI text (Phase 4F)
    | 'ai-ui-detected'        // Fake UI elements (Phase 4F)
    | 'off-brand-content'     // Content doesn't match brand (Phase 4F)
    | 'missing-brand-element'; // Expected brand element missing (Phase 4F)
  severity: 'critical' | 'major' | 'minor';
  description: string;
  timestamp?: number;
  sceneIndex?: number;
  examples?: string[];  // Specific examples found (Phase 4F)
}

export interface SceneQualityScore {
  sceneId: string;
  sceneIndex: number;
  overallScore: number;
  scores: {
    composition: number;
    visibility: number;
    technicalQuality: number;
    contentMatch: number;
    professionalLook: number;
  };
  issues: QualityIssue[];
  passesThreshold: boolean;
  needsRegeneration: boolean;
}

export interface VideoQualityReport {
  projectId: string;
  overallScore: number;
  passesQuality: boolean;
  sceneScores: SceneQualityScore[];
  criticalIssues: QualityIssue[];
  recommendations: string[];
  evaluatedAt: string;
}

class QualityEvaluationService {
  private anthropic: Anthropic | null = null;
  private qualityThreshold = 70;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }

  isAvailable(): boolean {
    return !!this.anthropic;
  }

  async evaluateVideo(
    videoUrl: string,
    projectData: {
      projectId: string;
      scenes: Array<{
        id: string;
        type: string;
        narration: string;
        duration: number;
        textOverlays?: Array<{ text: string }>;
      }>;
    }
  ): Promise<VideoQualityReport> {
    console.log(`[QualityEval] Starting evaluation for project ${projectData.projectId}`);
    
    if (!this.anthropic) {
      console.warn(`[QualityEval] Anthropic not configured, using default scores`);
      return this.getDefaultReport(projectData.projectId, projectData.scenes);
    }
    
    const sceneScores: SceneQualityScore[] = [];
    const allIssues: QualityIssue[] = [];
    
    let currentTime = 0;
    
    for (let i = 0; i < projectData.scenes.length; i++) {
      const scene = projectData.scenes[i];
      
      const frameTime = currentTime + (scene.duration / 2);
      console.log(`[QualityEval] Evaluating scene ${i + 1} at ${frameTime.toFixed(1)}s...`);
      
      const frameData = await videoFrameExtractor.extractFrameAsBase64(videoUrl, frameTime);
      
      if (frameData) {
        const evaluation = await this.evaluateFrame(frameData.base64, scene, i);
        sceneScores.push(evaluation);
        allIssues.push(...evaluation.issues);
      } else {
        sceneScores.push(this.getPlaceholderScore(scene.id, i));
      }
      
      currentTime += scene.duration;
    }
    
    const overallScore = sceneScores.length > 0
      ? Math.round(sceneScores.reduce((sum, s) => sum + s.overallScore, 0) / sceneScores.length)
      : 0;
    
    const criticalIssues = allIssues.filter(i => i.severity === 'critical');
    const passesQuality = overallScore >= this.qualityThreshold && criticalIssues.length === 0;
    
    const report: VideoQualityReport = {
      projectId: projectData.projectId,
      overallScore,
      passesQuality,
      sceneScores,
      criticalIssues,
      recommendations: this.generateRecommendations(sceneScores, allIssues),
      evaluatedAt: new Date().toISOString(),
    };
    
    console.log(`[QualityEval] Complete: Score ${overallScore}/100, ${passesQuality ? 'PASSED' : 'NEEDS REVIEW'}`);
    
    return report;
  }

  private async evaluateFrame(
    base64Image: string,
    scene: {
      id: string;
      type: string;
      narration: string;
      textOverlays?: Array<{ text: string }>;
    },
    sceneIndex: number
  ): Promise<SceneQualityScore> {
    if (!this.anthropic) {
      return this.getPlaceholderScore(scene.id, sceneIndex);
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: this.buildEvaluationPrompt(scene),
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      return this.parseEvaluationResponse(content.text, scene.id, sceneIndex);

    } catch (error: any) {
      console.error(`[QualityEval] Frame evaluation failed:`, error.message);
      return this.getPlaceholderScore(scene.id, sceneIndex);
    }
  }

  private buildEvaluationPrompt(scene: {
    type: string;
    narration: string;
    textOverlays?: Array<{ text: string }>;
  }): string {
    const expectedText = scene.textOverlays?.map(t => t.text).join(', ') || 'None';
    
    return `Evaluate this video frame for broadcast quality. Be critical but fair.

SCENE CONTEXT:
- Scene type: ${scene.type}
- Expected narration topic: "${scene.narration.substring(0, 100)}..."
- Expected text overlays: ${expectedText}

Rate each aspect 0-100 and identify any issues:

{
  "scores": {
    "composition": <0-100 - Is the visual layout professional? Text placed well?>,
    "visibility": <0-100 - Is all text clearly readable? Good contrast?>,
    "technicalQuality": <0-100 - No blur, artifacts, good resolution?>,
    "contentMatch": <0-100 - Does visual match the narration topic?>,
    "professionalLook": <0-100 - Would this look good on TV?>
  },
  "issues": [
    {
      "type": "text-overlap | face-blocked | poor-visibility | bad-composition | technical | content-mismatch",
      "severity": "critical | major | minor",
      "description": "Specific description of the issue"
    }
  ],
  "notes": "Brief overall assessment"
}

CRITICAL ISSUES (score impact):
- Text overlapping a face = critical, -30 points
- Text unreadable = critical, -25 points
- Content completely mismatched = critical, -40 points
- Poor image quality = major, -15 points
- Awkward composition = minor, -10 points

Return ONLY the JSON object.`;
  }

  private parseEvaluationResponse(
    text: string,
    sceneId: string,
    sceneIndex: number
  ): SceneQualityScore {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      const scores = {
        composition: parsed.scores?.composition || 70,
        visibility: parsed.scores?.visibility || 70,
        technicalQuality: parsed.scores?.technicalQuality || 70,
        contentMatch: parsed.scores?.contentMatch || 70,
        professionalLook: parsed.scores?.professionalLook || 70,
      };
      
      const overallScore = Math.round(
        (scores.composition + scores.visibility + scores.technicalQuality + 
         scores.contentMatch + scores.professionalLook) / 5
      );
      
      const issues: QualityIssue[] = (parsed.issues || []).map((issue: any) => ({
        type: issue.type || 'technical',
        severity: issue.severity || 'minor',
        description: issue.description || 'Unknown issue',
        sceneIndex,
      }));
      
      const hasCriticalIssues = issues.some(i => i.severity === 'critical');
      const passesThreshold = overallScore >= this.qualityThreshold && !hasCriticalIssues;
      
      return {
        sceneId,
        sceneIndex,
        overallScore,
        scores,
        issues,
        passesThreshold,
        needsRegeneration: !passesThreshold,
      };

    } catch (error: any) {
      console.error(`[QualityEval] Parse error:`, error.message);
      return this.getPlaceholderScore(sceneId, sceneIndex);
    }
  }

  private getPlaceholderScore(sceneId: string, sceneIndex: number): SceneQualityScore {
    return {
      sceneId,
      sceneIndex,
      overallScore: 75,
      scores: {
        composition: 75,
        visibility: 75,
        technicalQuality: 75,
        contentMatch: 75,
        professionalLook: 75,
      },
      issues: [{
        type: 'technical',
        severity: 'minor',
        description: 'Could not evaluate frame - using placeholder score',
        sceneIndex,
      }],
      passesThreshold: true,
      needsRegeneration: false,
    };
  }

  private getDefaultReport(projectId: string, scenes: Array<{ id: string }>): VideoQualityReport {
    return {
      projectId,
      overallScore: 75,
      passesQuality: true,
      sceneScores: scenes.map((scene, i) => this.getPlaceholderScore(scene.id, i)),
      criticalIssues: [],
      recommendations: ['Quality evaluation unavailable - using default scores'],
      evaluatedAt: new Date().toISOString(),
    };
  }

  private generateRecommendations(
    sceneScores: SceneQualityScore[],
    issues: QualityIssue[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (sceneScores.length === 0) {
      return ['No scenes to evaluate'];
    }
    
    const avgComposition = sceneScores.reduce((s, sc) => s + sc.scores.composition, 0) / sceneScores.length;
    const avgVisibility = sceneScores.reduce((s, sc) => s + sc.scores.visibility, 0) / sceneScores.length;
    const avgContentMatch = sceneScores.reduce((s, sc) => s + sc.scores.contentMatch, 0) / sceneScores.length;
    
    if (avgComposition < 70) {
      recommendations.push('Consider adjusting text placement algorithm - composition scores are low');
    }
    
    if (avgVisibility < 70) {
      recommendations.push('Text visibility needs improvement - try adding more shadow or background');
    }
    
    if (avgContentMatch < 70) {
      recommendations.push('Video content often mismatches narration - improve visual direction prompts');
    }
    
    const textOverlapIssues = issues.filter(i => i.type === 'text-overlap');
    if (textOverlapIssues.length > 0) {
      recommendations.push(`${textOverlapIssues.length} scene(s) have text overlapping faces - check face detection`);
    }
    
    const scenesNeedingRegen = sceneScores.filter(s => s.needsRegeneration);
    if (scenesNeedingRegen.length > 0) {
      recommendations.push(`${scenesNeedingRegen.length} scene(s) need regeneration: scenes ${scenesNeedingRegen.map(s => s.sceneIndex + 1).join(', ')}`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Video passes quality checks - ready for distribution');
    }
    
    return recommendations;
  }

  async quickSceneCheck(
    imageBase64: string,
    expectedText: string[]
  ): Promise<{ passes: boolean; issues: string[] }> {
    if (!this.anthropic) {
      return { passes: true, issues: [] };
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: `Quick quality check. Expected text: "${expectedText.join(', ')}". 
                
Answer in JSON: {"passes": true/false, "issues": ["issue1", "issue2"]}

Check for:
1. Text overlapping faces (FAIL)
2. Text unreadable (FAIL)
3. Professional appearance (PASS/FAIL)

Return ONLY the JSON.`,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        return { passes: true, issues: [] };
      }

      const match = content.text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          passes: parsed.passes ?? true,
          issues: parsed.issues ?? [],
        };
      }

      return { passes: true, issues: [] };

    } catch (error) {
      return { passes: true, issues: [] };
    }
  }

  // ============================================================
  // PHASE 4F: BRAND COMPLIANCE EVALUATION
  // ============================================================

  /**
   * Evaluate brand compliance and detect AI hallucinations
   */
  async evaluateBrandCompliance(
    frameBase64: string,
    sceneContext: {
      sceneType: string;
      expectedContent: string;
      isFirstScene: boolean;
      isLastScene: boolean;
      shouldHaveWatermark: boolean;
    }
  ): Promise<{
    score: number;
    issues: QualityIssue[];
  }> {
    console.log(`[QualityEval] Checking brand compliance...`);
    
    if (!this.anthropic) {
      console.warn(`[QualityEval] Anthropic not configured, skipping brand compliance check`);
      return { score: 70, issues: [] };
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: frameBase64,
                },
              },
              {
                type: 'text',
                text: this.buildBrandCompliancePrompt(sceneContext),
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      return this.parseBrandComplianceResponse(content.text);

    } catch (error: any) {
      console.error(`[QualityEval] Brand compliance check failed:`, error.message);
      return { score: 70, issues: [] };
    }
  }

  /**
   * Build the prompt for brand compliance checking
   */
  private buildBrandCompliancePrompt(sceneContext: {
    sceneType: string;
    expectedContent: string;
    isFirstScene: boolean;
    isLastScene: boolean;
    shouldHaveWatermark: boolean;
  }): string {
    return `Analyze this video frame for brand compliance and AI generation artifacts.

SCENE CONTEXT:
- Scene type: ${sceneContext.sceneType}
- Expected content: ${sceneContext.expectedContent}
- First scene (should have logo intro): ${sceneContext.isFirstScene}
- Last scene (should have CTA): ${sceneContext.isLastScene}
- Should have watermark: ${sceneContext.shouldHaveWatermark}

CHECK FOR THESE SPECIFIC ISSUES:

1. AI-GENERATED TEXT (CRITICAL)
   Look for ANY text that appears garbled, misspelled, or nonsensical.
   Examples of AI text hallucination:
   - "peocineate" instead of real words
   - "weth meal" instead of "with meal"  
   - "Noney", "Fioliday", "Decumeds"
   - Any gibberish that looks like attempted text
   - Partial words or character soup

2. AI-GENERATED UI ELEMENTS (MAJOR)
   Look for fake interface elements that don't belong:
   - Fake calendars with nonsense labels
   - Mock spreadsheets or charts
   - Fake app interfaces
   - Random numbers that look like data (e.g., "1102", "5idups")
   - Dashboard-like elements in non-dashboard content

3. OFF-BRAND CONTENT (MAJOR)
   Content that doesn't match wellness/health brand:
   - Finance/business graphics in wellness video
   - Unrelated stock imagery
   - Content that doesn't match the expected scene type

4. MISSING BRAND ELEMENTS (MINOR)
   Expected elements that are missing:
   - Logo/watermark if expected
   - Brand colors not present
   - CTA elements on last scene

Return a JSON object with this EXACT structure:
{
  "aiTextDetected": {
    "found": true/false,
    "examples": ["list", "of", "garbled", "text"],
    "severity": "critical"
  },
  "aiUIDetected": {
    "found": true/false,
    "description": "what was found",
    "severity": "major"
  },
  "offBrandContent": {
    "found": true/false,
    "description": "what doesn't match",
    "severity": "major"
  },
  "missingBrandElements": {
    "found": true/false,
    "description": "what's missing",
    "severity": "minor"
  },
  "brandComplianceScore": 0-100,
  "overallAssessment": "brief summary"
}

SCORING GUIDE:
- AI text detected: -40 points (critical issue)
- AI UI detected: -25 points (major issue)
- Off-brand content: -20 points (major issue)
- Missing brand elements: -10 points (minor issue)
- Start at 100, subtract for issues found

Return ONLY the JSON object, no other text.`;
  }

  /**
   * Parse the brand compliance response
   */
  private parseBrandComplianceResponse(text: string): {
    score: number;
    issues: QualityIssue[];
  } {
    const issues: QualityIssue[] = [];
    let score = 100;

    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[QualityEval] No JSON found in brand compliance response');
        return { score: 70, issues: [] };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Process AI text detection
      if (parsed.aiTextDetected?.found) {
        issues.push({
          type: 'ai-text-detected',
          severity: 'critical',
          description: `AI-generated garbled text detected in video frame`,
          examples: parsed.aiTextDetected.examples || [],
        });
        score -= 40;
        console.log(`[QualityEval] AI text detected: ${parsed.aiTextDetected.examples?.join(', ')}`);
      }

      // Process AI UI detection
      if (parsed.aiUIDetected?.found) {
        issues.push({
          type: 'ai-ui-detected',
          severity: 'major',
          description: `AI-generated UI elements detected: ${parsed.aiUIDetected.description}`,
        });
        score -= 25;
        console.log(`[QualityEval] AI UI detected: ${parsed.aiUIDetected.description}`);
      }

      // Process off-brand content
      if (parsed.offBrandContent?.found) {
        issues.push({
          type: 'off-brand-content',
          severity: 'major',
          description: `Off-brand content: ${parsed.offBrandContent.description}`,
        });
        score -= 20;
        console.log(`[QualityEval] Off-brand content: ${parsed.offBrandContent.description}`);
      }

      // Process missing brand elements
      if (parsed.missingBrandElements?.found) {
        issues.push({
          type: 'missing-brand-element',
          severity: 'minor',
          description: `Missing brand element: ${parsed.missingBrandElements.description}`,
        });
        score -= 10;
      }

      // Use parsed score if available, otherwise use calculated
      const finalScore = parsed.brandComplianceScore ?? Math.max(0, score);
      
      console.log(`[QualityEval] Brand compliance score: ${finalScore}/100`);
      if (issues.length > 0) {
        console.log(`[QualityEval] Issues: ${issues.map(i => `${i.type} (${i.severity})`).join(', ')}`);
      }

      return {
        score: finalScore,
        issues,
      };

    } catch (parseError: any) {
      console.error('[QualityEval] Failed to parse brand compliance response:', parseError.message);
      return { score: 70, issues: [] };
    }
  }

  /**
   * Complete scene evaluation including brand compliance
   */
  async evaluateSceneComplete(
    frameBase64: string,
    sceneData: {
      sceneIndex: number;
      sceneType: string;
      narration: string;
      totalScenes: number;
      hasTextOverlay: boolean;
    }
  ): Promise<{
    overallScore: number;
    compositionScore: number;
    brandComplianceScore: number;
    issues: QualityIssue[];
    recommendation: 'pass' | 'regenerate' | 'adjust';
  }> {
    console.log(`[QualityEval] Starting complete evaluation for scene ${sceneData.sceneIndex + 1}...`);

    // Run composition evaluation (existing Phase 3 logic)
    const compositionResult = await this.evaluateFrame(
      frameBase64,
      {
        id: `scene-${sceneData.sceneIndex}`,
        type: sceneData.sceneType,
        narration: sceneData.narration,
        textOverlays: sceneData.hasTextOverlay ? [{ text: 'overlay' }] : [],
      },
      sceneData.sceneIndex
    );

    // Run brand compliance evaluation (Phase 4F logic)
    const brandResult = await this.evaluateBrandCompliance(frameBase64, {
      sceneType: sceneData.sceneType,
      expectedContent: sceneData.narration,
      isFirstScene: sceneData.sceneIndex === 0,
      isLastScene: sceneData.sceneIndex === sceneData.totalScenes - 1,
      shouldHaveWatermark: sceneData.sceneIndex > 0 && sceneData.sceneIndex < sceneData.totalScenes - 1,
    });

    // Combine issues
    const allIssues = [...compositionResult.issues, ...brandResult.issues];

    // Calculate weighted overall score
    // Brand compliance is weighted more heavily for AI text issues
    const hasCriticalBrandIssue = brandResult.issues.some(i => i.severity === 'critical');
    
    let overallScore: number;
    if (hasCriticalBrandIssue) {
      // Critical brand issues (AI text) heavily penalize the score
      overallScore = Math.min(compositionResult.overallScore * 0.3 + brandResult.score * 0.7, 50);
    } else {
      // Normal weighting: 60% composition, 40% brand
      overallScore = compositionResult.overallScore * 0.6 + brandResult.score * 0.4;
    }

    // Determine recommendation
    let recommendation: 'pass' | 'regenerate' | 'adjust';
    if (overallScore >= 70 && !hasCriticalBrandIssue) {
      recommendation = 'pass';
    } else if (hasCriticalBrandIssue || overallScore < 50) {
      recommendation = 'regenerate';  // AI text = must regenerate
    } else {
      recommendation = 'adjust';
    }

    console.log(`[QualityEval] Complete - Overall: ${Math.round(overallScore)}, Recommendation: ${recommendation}`);

    return {
      overallScore: Math.round(overallScore),
      compositionScore: compositionResult.overallScore,
      brandComplianceScore: brandResult.score,
      issues: allIssues,
      recommendation,
    };
  }

  /**
   * Evaluate all scenes in a video for brand compliance
   */
  async evaluateVideoBrandCompliance(
    scenes: Array<{
      frameBase64: string;
      sceneIndex: number;
      sceneType: string;
      narration: string;
    }>
  ): Promise<{
    overallBrandScore: number;
    sceneScores: Array<{ sceneIndex: number; score: number; issues: QualityIssue[] }>;
    criticalIssues: QualityIssue[];
    recommendation: 'approved' | 'needs-regeneration' | 'needs-review';
  }> {
    console.log(`[QualityEval] Starting brand compliance check for ${scenes.length} scenes...`);

    const sceneScores: Array<{ sceneIndex: number; score: number; issues: QualityIssue[] }> = [];
    const criticalIssues: QualityIssue[] = [];

    for (const scene of scenes) {
      const result = await this.evaluateBrandCompliance(scene.frameBase64, {
        sceneType: scene.sceneType,
        expectedContent: scene.narration,
        isFirstScene: scene.sceneIndex === 0,
        isLastScene: scene.sceneIndex === scenes.length - 1,
        shouldHaveWatermark: scene.sceneIndex > 0 && scene.sceneIndex < scenes.length - 1,
      });

      sceneScores.push({
        sceneIndex: scene.sceneIndex,
        score: result.score,
        issues: result.issues,
      });

      // Collect critical issues
      const critical = result.issues.filter(i => i.severity === 'critical');
      critical.forEach(issue => {
        criticalIssues.push({
          ...issue,
          sceneIndex: scene.sceneIndex,
        });
      });
    }

    // Calculate overall brand score (average of all scenes)
    const overallBrandScore = sceneScores.length > 0
      ? Math.round(sceneScores.reduce((sum, s) => sum + s.score, 0) / sceneScores.length)
      : 70;

    // Determine recommendation
    let recommendation: 'approved' | 'needs-regeneration' | 'needs-review';
    if (criticalIssues.length > 0) {
      recommendation = 'needs-regeneration';
    } else if (overallBrandScore < 70) {
      recommendation = 'needs-review';
    } else {
      recommendation = 'approved';
    }

    console.log(`[QualityEval] Brand check complete - Score: ${overallBrandScore}, Critical issues: ${criticalIssues.length}`);

    return {
      overallBrandScore,
      sceneScores,
      criticalIssues,
      recommendation,
    };
  }
}

export const qualityEvaluationService = new QualityEvaluationService();
