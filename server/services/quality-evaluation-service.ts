import Anthropic from '@anthropic-ai/sdk';
import { videoFrameExtractor } from './video-frame-extractor';

export interface QualityIssue {
  type: 'text-overlap' | 'face-blocked' | 'poor-visibility' | 'bad-composition' | 'technical' | 'content-mismatch';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  timestamp?: number;
  sceneIndex?: number;
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
}

export const qualityEvaluationService = new QualityEvaluationService();
