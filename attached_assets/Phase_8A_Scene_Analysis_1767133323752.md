# Phase 8A: Claude Vision Scene Analysis

## Objective

Implement comprehensive scene analysis using Claude Vision immediately after each asset is generated. This analysis scores content quality, detects issues, and provides actionable feedback for the regeneration loop.

## What This Phase Creates

- `server/services/scene-analysis-service.ts` - Core analysis logic
- Integration with asset generation pipeline
- Analysis result storage and retrieval

---

## Scene Analysis Service

Create `server/services/scene-analysis-service.ts`:

```typescript
// server/services/scene-analysis-service.ts

import Anthropic from '@anthropic-ai/sdk';
import { brandContextService } from './brand-context-service';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================
// TYPES
// ============================================

export interface SceneContext {
  sceneIndex: number;
  sceneType: string;
  narration: string;
  visualDirection: string;
  expectedContentType: string;
  totalScenes: number;
}

export interface AnalysisIssue {
  category: 'content_match' | 'ai_artifacts' | 'brand_compliance' | 'technical' | 'composition';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  suggestion: string;
}

export interface SceneAnalysisResult {
  sceneIndex: number;
  overallScore: number;
  
  // Individual scores (0-100 scaled to their weight)
  technicalScore: number;      // max 20
  contentMatchScore: number;   // max 30
  brandComplianceScore: number; // max 30
  compositionScore: number;    // max 20
  
  // Detailed checks
  aiArtifactsDetected: boolean;
  aiArtifactDetails: string[];
  contentMatchDetails: string;
  brandComplianceDetails: string;
  
  // Frame analysis for composition
  frameAnalysis: {
    subjectPosition: 'left' | 'center' | 'right' | 'none';
    faceDetected: boolean;
    faceRegion?: { x: number; y: number; width: number; height: number };
    busyRegions: string[];
    dominantColors: string[];
    lightingType: 'warm' | 'cool' | 'neutral' | 'mixed';
    safeTextZones: Array<{ position: string; confidence: number }>;
  };
  
  // Issues and recommendations
  issues: AnalysisIssue[];
  recommendation: 'approved' | 'needs_review' | 'regenerate' | 'critical_fail';
  improvedPrompt?: string;
  
  // Metadata
  analysisTimestamp: string;
  analysisModel: string;
}

// ============================================
// SCENE ANALYSIS SERVICE
// ============================================

class SceneAnalysisService {
  
  /**
   * Analyze a generated scene image/video frame
   */
  async analyzeScene(
    imageBase64: string,
    context: SceneContext
  ): Promise<SceneAnalysisResult> {
    console.log(`[SceneAnalysis] Analyzing scene ${context.sceneIndex + 1}/${context.totalScenes}`);
    
    // Get brand context for compliance checking
    const brandContext = await brandContextService.getVisualAnalysisContext();
    
    // Build comprehensive analysis prompt
    const analysisPrompt = this.buildAnalysisPrompt(context, brandContext);
    
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
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
                text: analysisPrompt,
              },
            ],
          },
        ],
      });
      
      // Parse Claude's response
      const analysisText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';
      
      const result = this.parseAnalysisResponse(analysisText, context);
      
      console.log(`[SceneAnalysis] Scene ${context.sceneIndex + 1} score: ${result.overallScore}/100`);
      console.log(`[SceneAnalysis] Recommendation: ${result.recommendation}`);
      
      return result;
      
    } catch (error: any) {
      console.error(`[SceneAnalysis] Failed:`, error.message);
      
      // Return critical failure result
      return this.createFailureResult(context, error.message);
    }
  }
  
  /**
   * Analyze a video by extracting key frames
   */
  async analyzeVideo(
    videoUrl: string,
    context: SceneContext,
    frameCount: number = 3
  ): Promise<SceneAnalysisResult> {
    // Extract frames from video
    const frames = await this.extractVideoFrames(videoUrl, frameCount);
    
    if (frames.length === 0) {
      return this.createFailureResult(context, 'Could not extract video frames');
    }
    
    // Analyze each frame
    const frameResults: SceneAnalysisResult[] = [];
    for (const frame of frames) {
      const result = await this.analyzeScene(frame, context);
      frameResults.push(result);
    }
    
    // Aggregate results (use worst score for safety)
    return this.aggregateFrameResults(frameResults, context);
  }
  
  /**
   * Build the analysis prompt for Claude Vision
   */
  private buildAnalysisPrompt(context: SceneContext, brandContext: string): string {
    return `You are a video production quality analyst. Analyze this image for a marketing video scene.

## SCENE CONTEXT
- Scene ${context.sceneIndex + 1} of ${context.totalScenes}
- Scene Type: ${context.sceneType}
- Expected Content: ${context.expectedContentType}
- Narration: "${context.narration}"
- Visual Direction: "${context.visualDirection}"

## BRAND GUIDELINES
${brandContext}

## ANALYSIS REQUIRED

Analyze this image and provide a JSON response with the following structure:

\`\`\`json
{
  "technicalQuality": {
    "score": <0-100>,
    "resolution": "<good|acceptable|poor>",
    "focus": "<sharp|soft|blurry>",
    "exposure": "<good|overexposed|underexposed>",
    "issues": ["<issue1>", "<issue2>"]
  },
  "contentMatch": {
    "score": <0-100>,
    "matchesNarration": <true|false>,
    "matchesVisualDirection": <true|false>,
    "appropriateForSceneType": <true|false>,
    "explanation": "<why it matches or doesn't>"
  },
  "aiArtifacts": {
    "detected": <true|false>,
    "artifacts": [
      {
        "type": "<garbled_text|fake_ui|distorted_hands|unnatural_face|other>",
        "description": "<description>",
        "severity": "<critical|major|minor>"
      }
    ]
  },
  "brandCompliance": {
    "score": <0-100>,
    "lightingMatch": <true|false>,
    "lightingType": "<warm|cool|neutral|mixed>",
    "colorPaletteMatch": <true|false>,
    "dominantColors": ["<color1>", "<color2>"],
    "settingAppropriate": <true|false>,
    "authenticFeel": <true|false>,
    "issues": ["<issue1>", "<issue2>"]
  },
  "composition": {
    "score": <0-100>,
    "subjectPosition": "<left|center|right|none>",
    "faceDetected": <true|false>,
    "faceRegion": {"x": <0-1>, "y": <0-1>, "width": <0-1>, "height": <0-1>} | null,
    "busyRegions": ["<top|bottom|left|right|center>"],
    "safeTextZones": [
      {"position": "<lower-third|top|bottom-left|bottom-right>", "confidence": <0-100>}
    ]
  },
  "overallAssessment": {
    "recommendation": "<approved|needs_review|regenerate|critical_fail>",
    "primaryIssues": ["<issue1>", "<issue2>"],
    "improvedPrompt": "<if regenerate needed, provide improved visual direction>"
  }
}
\`\`\`

## SCORING WEIGHTS
- Technical Quality: 20% of total
- Content Match: 30% of total
- Brand Compliance: 30% of total
- Composition: 20% of total

## CRITICAL CHECKS
1. AI ARTIFACTS: Garbled/overlapping text, fake UI elements, distorted hands/faces
2. BLANK/EMPTY: Solid colors, gradients with no content, missing subjects
3. CONTENT MISMATCH: Image completely unrelated to narration
4. BRAND VIOLATION: Clinical/cold lighting, wrong color palette, corporate feel

If ANY critical issue is found, recommendation should be "regenerate" or "critical_fail".

Respond ONLY with the JSON, no other text.`;
  }
  
  /**
   * Parse Claude's analysis response
   */
  private parseAnalysisResponse(
    responseText: string,
    context: SceneContext
  ): SceneAnalysisResult {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const analysis = JSON.parse(jsonMatch[0]);
      
      // Calculate weighted scores
      const technicalScore = Math.round((analysis.technicalQuality?.score || 0) * 0.2);
      const contentMatchScore = Math.round((analysis.contentMatch?.score || 0) * 0.3);
      const brandComplianceScore = Math.round((analysis.brandCompliance?.score || 0) * 0.3);
      const compositionScore = Math.round((analysis.composition?.score || 0) * 0.2);
      
      const overallScore = technicalScore + contentMatchScore + brandComplianceScore + compositionScore;
      
      // Build issues list
      const issues: AnalysisIssue[] = [];
      
      // Add AI artifact issues
      if (analysis.aiArtifacts?.detected) {
        for (const artifact of analysis.aiArtifacts.artifacts || []) {
          issues.push({
            category: 'ai_artifacts',
            severity: artifact.severity || 'major',
            description: artifact.description,
            suggestion: `Remove ${artifact.type} by regenerating with cleaner prompt`,
          });
        }
      }
      
      // Add content match issues
      if (!analysis.contentMatch?.matchesNarration) {
        issues.push({
          category: 'content_match',
          severity: 'major',
          description: analysis.contentMatch?.explanation || 'Visual does not match narration',
          suggestion: 'Regenerate with more specific visual direction',
        });
      }
      
      // Add brand compliance issues
      for (const issue of analysis.brandCompliance?.issues || []) {
        issues.push({
          category: 'brand_compliance',
          severity: 'major',
          description: issue,
          suggestion: 'Adjust to match Pine Hill Farm aesthetic (warm lighting, earth tones)',
        });
      }
      
      // Add technical issues
      for (const issue of analysis.technicalQuality?.issues || []) {
        issues.push({
          category: 'technical',
          severity: 'minor',
          description: issue,
          suggestion: 'Regenerate for better quality',
        });
      }
      
      // Determine recommendation based on score and critical issues
      let recommendation: SceneAnalysisResult['recommendation'] = 'approved';
      const hasCriticalArtifact = analysis.aiArtifacts?.artifacts?.some(
        (a: any) => a.severity === 'critical'
      );
      
      if (hasCriticalArtifact || overallScore < 50) {
        recommendation = 'critical_fail';
      } else if (overallScore < 70) {
        recommendation = 'regenerate';
      } else if (overallScore < 85) {
        recommendation = 'needs_review';
      }
      
      return {
        sceneIndex: context.sceneIndex,
        overallScore,
        technicalScore,
        contentMatchScore,
        brandComplianceScore,
        compositionScore,
        aiArtifactsDetected: analysis.aiArtifacts?.detected || false,
        aiArtifactDetails: (analysis.aiArtifacts?.artifacts || []).map((a: any) => a.description),
        contentMatchDetails: analysis.contentMatch?.explanation || '',
        brandComplianceDetails: (analysis.brandCompliance?.issues || []).join('; '),
        frameAnalysis: {
          subjectPosition: analysis.composition?.subjectPosition || 'center',
          faceDetected: analysis.composition?.faceDetected || false,
          faceRegion: analysis.composition?.faceRegion || undefined,
          busyRegions: analysis.composition?.busyRegions || [],
          dominantColors: analysis.brandCompliance?.dominantColors || [],
          lightingType: analysis.brandCompliance?.lightingType || 'neutral',
          safeTextZones: analysis.composition?.safeTextZones || [],
        },
        issues,
        recommendation,
        improvedPrompt: analysis.overallAssessment?.improvedPrompt,
        analysisTimestamp: new Date().toISOString(),
        analysisModel: 'claude-sonnet-4-20250514',
      };
      
    } catch (error: any) {
      console.error('[SceneAnalysis] Parse error:', error.message);
      return this.createFailureResult(context, `Parse error: ${error.message}`);
    }
  }
  
  /**
   * Create a failure result when analysis fails
   */
  private createFailureResult(context: SceneContext, reason: string): SceneAnalysisResult {
    return {
      sceneIndex: context.sceneIndex,
      overallScore: 0,
      technicalScore: 0,
      contentMatchScore: 0,
      brandComplianceScore: 0,
      compositionScore: 0,
      aiArtifactsDetected: false,
      aiArtifactDetails: [],
      contentMatchDetails: '',
      brandComplianceDetails: '',
      frameAnalysis: {
        subjectPosition: 'none',
        faceDetected: false,
        busyRegions: [],
        dominantColors: [],
        lightingType: 'neutral',
        safeTextZones: [],
      },
      issues: [{
        category: 'technical',
        severity: 'critical',
        description: `Analysis failed: ${reason}`,
        suggestion: 'Retry analysis or manually review',
      }],
      recommendation: 'critical_fail',
      analysisTimestamp: new Date().toISOString(),
      analysisModel: 'claude-sonnet-4-20250514',
    };
  }
  
  /**
   * Extract frames from video for analysis
   */
  private async extractVideoFrames(
    videoUrl: string,
    frameCount: number
  ): Promise<string[]> {
    // Implementation depends on video processing library
    // This is a placeholder - use ffmpeg or similar
    console.log(`[SceneAnalysis] Extracting ${frameCount} frames from video`);
    
    try {
      // TODO: Implement actual frame extraction
      // For now, return empty array to trigger failure handling
      return [];
    } catch (error: any) {
      console.error('[SceneAnalysis] Frame extraction failed:', error.message);
      return [];
    }
  }
  
  /**
   * Aggregate multiple frame results into single scene result
   */
  private aggregateFrameResults(
    results: SceneAnalysisResult[],
    context: SceneContext
  ): SceneAnalysisResult {
    if (results.length === 0) {
      return this.createFailureResult(context, 'No frames to analyze');
    }
    
    if (results.length === 1) {
      return results[0];
    }
    
    // Use minimum scores (most conservative)
    const minScore = Math.min(...results.map(r => r.overallScore));
    const worstResult = results.find(r => r.overallScore === minScore) || results[0];
    
    // Aggregate all issues
    const allIssues: AnalysisIssue[] = [];
    for (const result of results) {
      for (const issue of result.issues) {
        if (!allIssues.some(i => i.description === issue.description)) {
          allIssues.push(issue);
        }
      }
    }
    
    return {
      ...worstResult,
      issues: allIssues,
    };
  }
  
  /**
   * Quick check for blank/gradient images
   */
  async isBlankOrGradient(imageBase64: string): Promise<boolean> {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
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
                text: 'Is this image blank, a solid color, or just a gradient with no meaningful content? Answer only "yes" or "no".',
              },
            ],
          },
        ],
      });
      
      const answer = response.content[0].type === 'text' 
        ? response.content[0].text.toLowerCase().trim()
        : '';
      
      return answer.includes('yes');
      
    } catch {
      return false;
    }
  }
}

export const sceneAnalysisService = new SceneAnalysisService();
```

---

## Integration Points

### After Image Generation

```typescript
// In image generation flow:
const image = await imageGenerationService.generateImage(options);

// Immediately analyze
const analysis = await sceneAnalysisService.analyzeScene(
  image.base64,
  {
    sceneIndex: scene.index,
    sceneType: scene.type,
    narration: scene.narration,
    visualDirection: scene.visualDirection,
    expectedContentType: scene.contentType,
    totalScenes: project.scenes.length,
  }
);

// Store analysis with scene
scene.analysisResult = analysis;
scene.qualityScore = analysis.overallScore;

// Trigger regeneration if needed (Phase 8B)
if (analysis.recommendation === 'regenerate' || analysis.recommendation === 'critical_fail') {
  await autoRegenerationService.regenerateScene(scene, analysis);
}
```

### After Video Generation

```typescript
// In video generation flow:
const video = await videoProviderService.generateVideo(provider, prompt, duration);

// Analyze video frames
const analysis = await sceneAnalysisService.analyzeVideo(
  video.url,
  sceneContext,
  3 // Check 3 frames: start, middle, end
);

scene.analysisResult = analysis;
```

---

## API Endpoint

```typescript
// POST /api/scenes/:id/analyze
router.post('/api/scenes/:id/analyze', async (req, res) => {
  const sceneId = parseInt(req.params.id);
  const scene = await getScene(sceneId);
  
  if (!scene.imageUrl && !scene.videoUrl) {
    return res.status(400).json({ error: 'Scene has no generated content' });
  }
  
  let analysis: SceneAnalysisResult;
  
  if (scene.videoUrl) {
    analysis = await sceneAnalysisService.analyzeVideo(
      scene.videoUrl,
      buildSceneContext(scene)
    );
  } else {
    const imageBase64 = await fetchImageAsBase64(scene.imageUrl);
    analysis = await sceneAnalysisService.analyzeScene(
      imageBase64,
      buildSceneContext(scene)
    );
  }
  
  // Update scene with analysis
  await updateScene(sceneId, { analysisResult: analysis });
  
  res.json(analysis);
});
```

---

## Verification Checklist

- [ ] Scene analysis service created
- [ ] Claude Vision integration working
- [ ] Analysis prompt includes brand context
- [ ] Scoring weights match spec (20/30/30/20)
- [ ] AI artifacts detected (garbled text, fake UI)
- [ ] Content match evaluated against narration
- [ ] Brand compliance checked against PHF guidelines
- [ ] Frame analysis extracts face/subject positions
- [ ] Safe text zones identified
- [ ] Blank/gradient detection working
- [ ] Recommendation thresholds correct (85/70/50)
- [ ] Issues list generated with suggestions
- [ ] Improved prompt generated for regeneration

---

## Next Phase

Once Scene Analysis is working, proceed to **Phase 8B: Intelligent Auto-Regeneration** which uses these analysis results to automatically fix failed scenes.
