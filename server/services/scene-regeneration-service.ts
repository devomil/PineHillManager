import { aiVideoService } from './ai-video-service';
import { sceneAnalysisService } from './scene-analysis-service';
import { compositionInstructionsService } from './composition-instructions-service';
import { QualityIssue, SceneQualityScore } from './quality-evaluation-service';

interface RegenerationResult {
  success: boolean;
  sceneId: string;
  sceneIndex: number;
  newVideoUrl?: string;
  newAnalysis?: any;
  newInstructions?: any;
  error?: string;
  attempt: number;
}

interface SceneData {
  id: string;
  type: string;
  duration: number;
  narration?: string;
  visualDirection?: string;
  textOverlays?: Array<{ text: string; style?: string }>;
  assets?: {
    useProductOverlay?: boolean;
    videoUrl?: string;
  };
  background?: {
    source?: string;
  };
}

interface ProjectData {
  id: string;
  outputFormat?: {
    aspectRatio?: string;
  };
  scenes: SceneData[];
}

class SceneRegenerationService {
  private maxRetries = 2;

  async regenerateFailedScenes(
    project: ProjectData,
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
        failedScene.issues,
        failedScene.sceneIndex
      );
      
      results.push(result);
    }
    
    return results;
  }

  async regenerateScene(
    scene: SceneData,
    project: ProjectData,
    issues: QualityIssue[],
    sceneIndex: number,
    attempt: number = 1
  ): Promise<RegenerationResult> {
    try {
      const improvedPrompt = this.improvePromptFromIssues(
        scene.visualDirection || scene.background?.source || `${scene.type} scene for ${scene.narration || 'video'}`,
        issues
      );
      
      console.log(`[Regen] Improved prompt (attempt ${attempt}): ${improvedPrompt.substring(0, 100)}...`);
      
      const aspectRatio = (project.outputFormat?.aspectRatio || '16:9') as '16:9' | '9:16' | '1:1';
      const videoResult = await aiVideoService.generateVideo({
        prompt: improvedPrompt,
        duration: Math.min(scene.duration || 5, 10),
        aspectRatio,
        sceneType: scene.type,
        negativePrompt: this.buildNegativePrompt(issues),
      });
      
      if (!videoResult.success || !videoResult.s3Url) {
        if (attempt < this.maxRetries) {
          console.log(`[Regen] Attempt ${attempt} failed, retrying...`);
          return this.regenerateScene(scene, project, issues, sceneIndex, attempt + 1);
        }
        
        return {
          success: false,
          sceneId: scene.id,
          sceneIndex,
          error: videoResult.error || 'Video generation failed after retries',
          attempt,
        };
      }
      
      const analysis = await sceneAnalysisService.analyzeScene(videoResult.s3Url, {
        sceneType: scene.type,
        narration: scene.narration || '',
        hasTextOverlays: (scene.textOverlays?.length || 0) > 0,
        hasProductOverlay: scene.assets?.useProductOverlay || false,
      });
      
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
      
      console.log(`[Regen] Scene ${sceneIndex + 1} regenerated successfully`);
      
      return {
        success: true,
        sceneId: scene.id,
        sceneIndex,
        newVideoUrl: videoResult.s3Url,
        newAnalysis: analysis,
        newInstructions: instructions,
        attempt,
      };
      
    } catch (error: any) {
      console.error(`[Regen] Scene regeneration failed:`, error.message);
      
      if (attempt < this.maxRetries) {
        console.log(`[Regen] Attempt ${attempt} threw error, retrying...`);
        return this.regenerateScene(scene, project, issues, sceneIndex, attempt + 1);
      }
      
      return {
        success: false,
        sceneId: scene.id,
        sceneIndex,
        error: error.message,
        attempt,
      };
    }
  }

  private improvePromptFromIssues(originalPrompt: string, issues: QualityIssue[]): string {
    let improved = originalPrompt;
    const additions: string[] = [];
    
    for (const issue of issues) {
      switch (issue.type) {
        case 'text-overlap':
        case 'face-blocked':
          additions.push('Leave clear space in the lower third for text overlays.');
          additions.push('Position main subjects in the upper portion of the frame.');
          break;
          
        case 'poor-visibility':
          additions.push('Use high contrast lighting with clean, uncluttered backgrounds.');
          additions.push('Ensure good exposure and visibility.');
          break;
          
        case 'content-mismatch':
          improved = `IMPORTANT: Focus specifically on ${originalPrompt}. `;
          additions.push('Ensure the visual directly represents the described content.');
          break;
          
        case 'bad-composition':
          additions.push('Use professional cinematography with rule of thirds composition.');
          additions.push('Create balanced, visually appealing framing.');
          break;
          
        case 'technical':
          additions.push('Ensure sharp focus and high video quality.');
          additions.push('No artifacts, glitches, or distortions.');
          break;
      }
    }
    
    const uniqueAdditions = [...new Set(additions)];
    if (uniqueAdditions.length > 0) {
      improved += ' ' + uniqueAdditions.join(' ');
    }
    
    return improved;
  }

  private buildNegativePrompt(issues: QualityIssue[]): string {
    const negatives: string[] = [
      'blurry', 'low quality', 'distorted', 'ugly', 'deformed',
      'text', 'watermark', 'logo', 'border', 'frame',
      'amateur', 'unprofessional',
    ];
    
    for (const issue of issues) {
      if (issue.type === 'poor-visibility') {
        negatives.push('dark', 'underexposed', 'overexposed', 'low contrast', 'shadowy');
      }
      if (issue.type === 'bad-composition') {
        negatives.push('cluttered', 'busy background', 'poorly framed', 'off-center');
      }
      if (issue.type === 'technical') {
        negatives.push('pixelated', 'noise', 'artifacts', 'compression');
      }
    }
    
    return [...new Set(negatives)].join(', ');
  }

  getScenesNeedingRegeneration(
    sceneScores: SceneQualityScore[],
    maxScenes: number = 3
  ): SceneQualityScore[] {
    const failed = sceneScores.filter(s => s.needsRegeneration);
    
    failed.sort((a, b) => {
      const aCritical = a.issues.filter(i => i.severity === 'critical').length;
      const bCritical = b.issues.filter(i => i.severity === 'critical').length;
      if (aCritical !== bCritical) return bCritical - aCritical;
      return a.overallScore - b.overallScore;
    });
    
    return failed.slice(0, maxScenes);
  }
}

export const sceneRegenerationService = new SceneRegenerationService();
