# Phase 3: Quality Evaluation Loop

## Objective
Add automated quality review using Claude Vision to evaluate rendered output and trigger regeneration if quality is below threshold. This creates a feedback loop that ensures professional output quality.

## Prerequisites
- All Phase 1 steps complete (AI video generation)
- All Phase 2 steps complete (intelligent composition)
- Videos rendering successfully

## What Success Looks Like
- Rendered videos are automatically reviewed by Claude Vision
- Quality issues are detected and logged
- Low-quality scenes trigger automatic regeneration
- Final output meets broadcast quality standards
- Quality report generated for each video

---

## Step 1: Create Quality Evaluation Service

Create `server/services/quality-evaluation-service.ts`:

```typescript
// server/services/quality-evaluation-service.ts

import Anthropic from '@anthropic-ai/sdk';
import { videoFrameExtractor } from './video-frame-extractor';

export interface QualityIssue {
  type: 'text-overlap' | 'face-blocked' | 'poor-visibility' | 'bad-composition' | 'technical' | 'content-mismatch';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  timestamp?: number;  // seconds into video
  sceneIndex?: number;
}

export interface SceneQualityScore {
  sceneId: string;
  sceneIndex: number;
  overallScore: number;  // 0-100
  scores: {
    composition: number;      // Text/overlay placement
    visibility: number;       // Text readability
    technicalQuality: number; // No artifacts, good resolution
    contentMatch: number;     // Video matches narration
    professionalLook: number; // Broadcast quality
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
  private anthropic: Anthropic;
  private qualityThreshold = 70;  // Minimum acceptable score

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }

  /**
   * Evaluate the quality of a rendered video
   */
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
    
    const sceneScores: SceneQualityScore[] = [];
    const allIssues: QualityIssue[] = [];
    
    let currentTime = 0;
    
    for (let i = 0; i < projectData.scenes.length; i++) {
      const scene = projectData.scenes[i];
      
      // Extract frame from middle of scene
      const frameTime = currentTime + (scene.duration / 2);
      console.log(`[QualityEval] Evaluating scene ${i + 1} at ${frameTime.toFixed(1)}s...`);
      
      const frameData = await videoFrameExtractor.extractFrameAsBase64(videoUrl, frameTime);
      
      if (frameData) {
        const evaluation = await this.evaluateFrame(frameData.base64, scene, i);
        sceneScores.push(evaluation);
        allIssues.push(...evaluation.issues);
      } else {
        // Can't extract frame - add placeholder
        sceneScores.push(this.getPlaceholderScore(scene.id, i));
      }
      
      currentTime += scene.duration;
    }
    
    // Calculate overall score
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

  /**
   * Evaluate a single frame
   */
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
      overallScore: 60,
      scores: {
        composition: 60,
        visibility: 60,
        technicalQuality: 60,
        contentMatch: 60,
        professionalLook: 60,
      },
      issues: [{
        type: 'technical',
        severity: 'minor',
        description: 'Could not evaluate frame - using placeholder score',
        sceneIndex,
      }],
      passesThreshold: false,
      needsRegeneration: true,
    };
  }

  private generateRecommendations(
    sceneScores: SceneQualityScore[],
    issues: QualityIssue[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Analyze patterns
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

  /**
   * Quick check if a single scene passes quality
   */
  async quickSceneCheck(
    imageBase64: string,
    expectedText: string[]
  ): Promise<{ passes: boolean; issues: string[] }> {
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
```

---

## Step 2: Create Regeneration Service

Create `server/services/scene-regeneration-service.ts`:

```typescript
// server/services/scene-regeneration-service.ts

import { aiVideoService } from './ai-video-service';
import { sceneAnalysisService } from './scene-analysis-service';
import { compositionInstructionsService } from './composition-instructions-service';
import { QualityIssue, SceneQualityScore } from './quality-evaluation-service';

interface RegenerationResult {
  success: boolean;
  sceneId: string;
  newVideoUrl?: string;
  newAnalysis?: any;
  newInstructions?: any;
  error?: string;
}

class SceneRegenerationService {
  private maxRetries = 2;

  /**
   * Regenerate scenes that failed quality checks
   */
  async regenerateFailedScenes(
    project: any,
    failedScenes: SceneQualityScore[]
  ): Promise<RegenerationResult[]> {
    console.log(`[Regen] Regenerating ${failedScenes.length} scenes...`);
    
    const results: RegenerationResult[] = [];
    
    for (const failedScene of failedScenes) {
      const scene = project.scenes[failedScene.sceneIndex];
      if (!scene) continue;
      
      console.log(`[Regen] Regenerating scene ${failedScene.sceneIndex + 1}: ${scene.type}`);
      
      const result = await this.regenerateScene(
        scene,
        project,
        failedScene.issues
      );
      
      results.push(result);
    }
    
    return results;
  }

  /**
   * Regenerate a single scene
   */
  async regenerateScene(
    scene: any,
    project: any,
    issues: QualityIssue[]
  ): Promise<RegenerationResult> {
    try {
      // Modify prompt based on issues
      const improvedPrompt = this.improvePromptFromIssues(
        scene.visualDirection || scene.background?.source || '',
        issues
      );
      
      console.log(`[Regen] Improved prompt: ${improvedPrompt.substring(0, 100)}...`);
      
      // Generate new video
      const videoResult = await aiVideoService.generateVideo({
        prompt: improvedPrompt,
        duration: Math.min(scene.duration || 5, 10),
        aspectRatio: project.outputFormat?.aspectRatio || '16:9',
        sceneType: scene.type,
        negativePrompt: this.buildNegativePrompt(issues),
      });
      
      if (!videoResult.success || !videoResult.s3Url) {
        return {
          success: false,
          sceneId: scene.id,
          error: videoResult.error || 'Video generation failed',
        };
      }
      
      // Re-analyze the new video
      const analysis = await sceneAnalysisService.analyzeScene(videoResult.s3Url, {
        sceneType: scene.type,
        narration: scene.narration || '',
        hasTextOverlays: (scene.textOverlays?.length || 0) > 0,
        hasProductOverlay: scene.assets?.useProductOverlay || false,
      });
      
      // Generate new composition instructions
      const instructions = compositionInstructionsService.generateInstructions(
        scene.id,
        scene.textOverlays || [],
        analysis,
        {
          useProductOverlay: scene.assets?.useProductOverlay,
          sceneType: scene.type,
          sceneDuration: scene.duration,
        }
      );
      
      return {
        success: true,
        sceneId: scene.id,
        newVideoUrl: videoResult.s3Url,
        newAnalysis: analysis,
        newInstructions: instructions,
      };
      
    } catch (error: any) {
      console.error(`[Regen] Scene regeneration failed:`, error.message);
      return {
        success: false,
        sceneId: scene.id,
        error: error.message,
      };
    }
  }

  private improvePromptFromIssues(originalPrompt: string, issues: QualityIssue[]): string {
    let improved = originalPrompt;
    
    for (const issue of issues) {
      switch (issue.type) {
        case 'text-overlap':
        case 'face-blocked':
          // Request cleaner composition with space for text
          improved += ' Leave clear space in the lower third for text overlays.';
          improved += ' Position subjects in the upper portion of frame.';
          break;
          
        case 'poor-visibility':
          // Request better contrast
          improved += ' Use high contrast lighting with clear backgrounds.';
          break;
          
        case 'content-mismatch':
          // Be more explicit about content
          improved = `IMPORTANT: ${improved}. Focus specifically on this topic.`;
          break;
          
        case 'bad-composition':
          improved += ' Use professional cinematography with rule of thirds composition.';
          break;
      }
    }
    
    return improved;
  }

  private buildNegativePrompt(issues: QualityIssue[]): string {
    const negatives = [
      'blurry', 'low quality', 'distorted', 'ugly', 'deformed',
      'text', 'watermark', 'logo', 'border', 'frame',
    ];
    
    for (const issue of issues) {
      if (issue.type === 'poor-visibility') {
        negatives.push('dark', 'underexposed', 'overexposed', 'low contrast');
      }
      if (issue.type === 'bad-composition') {
        negatives.push('cluttered', 'busy background', 'centered subject');
      }
    }
    
    return negatives.join(', ');
  }
}

export const sceneRegenerationService = new SceneRegenerationService();
```

---

## Step 3: Integrate Quality Evaluation into Render Flow

Update `server/routes/universal-video-routes.ts`:

### Add imports:
```typescript
import { qualityEvaluationService } from '../services/quality-evaluation-service';
import { sceneRegenerationService } from '../services/scene-regeneration-service';
```

### Add quality evaluation after render completes:

```typescript
// After successful render, add quality evaluation
if (renderResult.success && renderResult.outputUrl) {
  console.log(`[Render] Starting quality evaluation...`);
  
  try {
    const qualityReport = await qualityEvaluationService.evaluateVideo(
      renderResult.outputUrl,
      {
        projectId: project.id,
        scenes: project.scenes.map(s => ({
          id: s.id,
          type: s.type,
          narration: s.narration || '',
          duration: s.duration,
          textOverlays: s.textOverlays,
        })),
      }
    );
    
    // Store quality report with project
    project.qualityReport = qualityReport;
    
    console.log(`[Render] Quality: ${qualityReport.overallScore}/100, ${qualityReport.passesQuality ? 'PASSED' : 'NEEDS REVIEW'}`);
    
    if (!qualityReport.passesQuality) {
      // Log issues but don't block - user can decide
      console.warn(`[Render] Quality issues detected:`, qualityReport.criticalIssues);
      console.warn(`[Render] Recommendations:`, qualityReport.recommendations);
      
      // Optional: Auto-regenerate failed scenes
      const failedScenes = qualityReport.sceneScores.filter(s => s.needsRegeneration);
      
      if (failedScenes.length > 0 && failedScenes.length <= 2) {
        // Only auto-regen if 1-2 scenes failed (not majority)
        console.log(`[Render] Auto-regenerating ${failedScenes.length} failed scenes...`);
        
        const regenResults = await sceneRegenerationService.regenerateFailedScenes(
          project,
          failedScenes
        );
        
        // Apply successful regenerations
        for (const result of regenResults) {
          if (result.success) {
            const sceneIndex = project.scenes.findIndex((s: any) => s.id === result.sceneId);
            if (sceneIndex >= 0) {
              project.scenes[sceneIndex].assets.videoUrl = result.newVideoUrl;
              project.scenes[sceneIndex].analysis = result.newAnalysis;
              project.scenes[sceneIndex].compositionInstructions = result.newInstructions;
            }
          }
        }
        
        // TODO: Trigger re-render if scenes were regenerated
      }
    }
    
    // Save updated project with quality report
    await storage.setItem(`project:${project.id}`, project);
    
  } catch (error: any) {
    console.error(`[Render] Quality evaluation failed:`, error.message);
    // Don't fail the render - quality evaluation is enhancement
  }
}
```

---

## Step 4: Add Quality Report Endpoint

Add to `server/routes/universal-video-routes.ts`:

```typescript
// GET quality report for a project
router.get('/projects/:projectId/quality-report', async (req, res) => {
  try {
    const project = await storage.getItem(`project:${req.params.projectId}`);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (!project.qualityReport) {
      return res.status(404).json({ error: 'No quality report available' });
    }
    
    res.json(project.qualityReport);
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST trigger quality evaluation manually
router.post('/projects/:projectId/evaluate-quality', async (req, res) => {
  try {
    const project = await storage.getItem(`project:${req.params.projectId}`);
    
    if (!project || !project.outputUrl) {
      return res.status(400).json({ error: 'Project has no rendered video' });
    }
    
    const qualityReport = await qualityEvaluationService.evaluateVideo(
      project.outputUrl,
      {
        projectId: project.id,
        scenes: project.scenes,
      }
    );
    
    project.qualityReport = qualityReport;
    await storage.setItem(`project:${project.id}`, project);
    
    res.json(qualityReport);
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Step 5: Add Quality Display to Frontend

In `client/src/components/universal-video-producer.tsx`:

```tsx
// Add quality report display component

const QualityReportDisplay: React.FC<{ report: VideoQualityReport }> = ({ report }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-2">Quality Report</h3>
      
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-2xl font-bold ${getScoreColor(report.overallScore)}`}>
          {report.overallScore}/100
        </span>
        {report.passesQuality ? (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
            ✓ Broadcast Ready
          </span>
        ) : (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
            ⚠ Needs Review
          </span>
        )}
      </div>
      
      {report.criticalIssues.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-red-600 mb-1">Critical Issues:</h4>
          <ul className="text-sm text-red-700">
            {report.criticalIssues.map((issue, i) => (
              <li key={i}>• {issue.description}</li>
            ))}
          </ul>
        </div>
      )}
      
      {report.recommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-1">Recommendations:</h4>
          <ul className="text-sm text-gray-700">
            {report.recommendations.map((rec, i) => (
              <li key={i}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Use in main component where project status is shown:
{project.qualityReport && (
  <QualityReportDisplay report={project.qualityReport} />
)}
```

---

## Verification Checklist

- [ ] Quality evaluation service created
- [ ] Scene regeneration service created
- [ ] Quality evaluation runs after render
- [ ] Quality report stored with project
- [ ] Quality issues logged and displayed
- [ ] Auto-regeneration works for 1-2 failed scenes
- [ ] Quality report endpoint accessible
- [ ] Frontend displays quality report

---

## Quality Thresholds

| Score | Status | Action |
|-------|--------|--------|
| 90-100 | Excellent | Ready for distribution |
| 80-89 | Good | Ready, minor improvements possible |
| 70-79 | Acceptable | Review before distribution |
| 60-69 | Poor | Consider regeneration |
| <60 | Failed | Regeneration required |

---

## Cost Estimate

Quality evaluation adds:
- ~$0.02-0.03 per scene (Claude Vision)
- 6 scenes = ~$0.15 per video evaluation

This is minimal compared to the value of ensuring quality output.

---

## Troubleshooting

**Evaluation always passes:** Lower the threshold or make prompts more critical
**Too many regenerations:** Raise threshold or limit auto-regen to critical issues
**Frame extraction fails:** Check FFmpeg installation
**Scores inconsistent:** Consider evaluating multiple frames per scene

---

## Future Enhancements

- Evaluate multiple frames per scene for consistency
- Track quality trends over time
- A/B test different composition strategies
- Machine learning model for faster evaluation
- User feedback integration for quality calibration
