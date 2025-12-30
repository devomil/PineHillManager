# Phase 8B: Intelligent Auto-Regeneration

## Objective

Implement an automatic regeneration loop that triggers when scene analysis scores fall below threshold. The system improves prompts based on specific failures, tries alternate providers, and escalates to user review after max attempts.

## What This Phase Creates

- `server/services/auto-regeneration-service.ts` - Regeneration logic
- Prompt improvement based on analysis feedback
- Provider fallback strategy
- User escalation queue

---

## Auto-Regeneration Service

Create `server/services/auto-regeneration-service.ts`:

```typescript
// server/services/auto-regeneration-service.ts

import { SceneAnalysisResult, sceneAnalysisService } from './scene-analysis-service';
import { videoProviderSelector } from './video-provider-selector';
import { imageProviderSelector } from './image-provider-selector';
import { piapiService } from './piapi-service';
import { brandContextService } from './brand-context-service';

// ============================================
// TYPES
// ============================================

export interface RegenerationAttempt {
  attemptNumber: number;
  timestamp: string;
  provider: string;
  prompt: string;
  result: 'success' | 'failed' | 'improved';
  scoreBefore: number;
  scoreAfter: number;
  analysisResult?: SceneAnalysisResult;
}

export interface RegenerationResult {
  success: boolean;
  finalScore: number;
  attempts: RegenerationAttempt[];
  escalatedToUser: boolean;
  newAssetUrl?: string;
  newAnalysis?: SceneAnalysisResult;
}

export interface SceneForRegeneration {
  id: number;
  sceneIndex: number;
  sceneType: string;
  contentType: string;
  narration: string;
  visualDirection: string;
  duration: number;
  currentProvider: string;
  currentAssetUrl?: string;
  analysisResult: SceneAnalysisResult;
  projectId: number;
}

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  maxAttempts: 3,
  minScoreToPass: 70,
  scoreImprovementThreshold: 10, // Must improve by at least 10 points
  providerFallbackOrder: {
    video: ['kling', 'runway', 'luma', 'hailuo'],
    image: ['falai', 'flux'],
  },
};

// ============================================
// AUTO-REGENERATION SERVICE
// ============================================

class AutoRegenerationService {
  
  /**
   * Main regeneration loop for a failed scene
   */
  async regenerateScene(scene: SceneForRegeneration): Promise<RegenerationResult> {
    console.log(`[AutoRegen] Starting regeneration for scene ${scene.sceneIndex + 1}`);
    console.log(`[AutoRegen] Current score: ${scene.analysisResult.overallScore}`);
    
    const attempts: RegenerationAttempt[] = [];
    let currentAnalysis = scene.analysisResult;
    let currentScore = currentAnalysis.overallScore;
    let newAssetUrl: string | undefined;
    
    for (let attempt = 1; attempt <= CONFIG.maxAttempts; attempt++) {
      console.log(`[AutoRegen] Attempt ${attempt}/${CONFIG.maxAttempts}`);
      
      // Determine strategy for this attempt
      const strategy = this.determineStrategy(attempt, currentAnalysis, scene);
      
      console.log(`[AutoRegen] Strategy: ${strategy.approach}`);
      console.log(`[AutoRegen] Provider: ${strategy.provider}`);
      
      // Improve the prompt based on issues
      const improvedPrompt = this.improvePrompt(
        scene.visualDirection,
        currentAnalysis,
        attempt
      );
      
      console.log(`[AutoRegen] Improved prompt: ${improvedPrompt.substring(0, 100)}...`);
      
      // Generate new asset
      const generationResult = await this.generateAsset(
        scene,
        strategy.provider,
        improvedPrompt
      );
      
      if (!generationResult.success || !generationResult.url) {
        attempts.push({
          attemptNumber: attempt,
          timestamp: new Date().toISOString(),
          provider: strategy.provider,
          prompt: improvedPrompt,
          result: 'failed',
          scoreBefore: currentScore,
          scoreAfter: currentScore,
        });
        continue;
      }
      
      // Analyze new asset
      const newAnalysis = await this.analyzeNewAsset(
        generationResult.url,
        scene
      );
      
      const scoreAfter = newAnalysis.overallScore;
      const improved = scoreAfter > currentScore;
      const passesThreshold = scoreAfter >= CONFIG.minScoreToPass;
      
      attempts.push({
        attemptNumber: attempt,
        timestamp: new Date().toISOString(),
        provider: strategy.provider,
        prompt: improvedPrompt,
        result: passesThreshold ? 'success' : (improved ? 'improved' : 'failed'),
        scoreBefore: currentScore,
        scoreAfter: scoreAfter,
        analysisResult: newAnalysis,
      });
      
      // If we pass threshold, we're done
      if (passesThreshold) {
        console.log(`[AutoRegen] Success! Score improved to ${scoreAfter}`);
        return {
          success: true,
          finalScore: scoreAfter,
          attempts,
          escalatedToUser: false,
          newAssetUrl: generationResult.url,
          newAnalysis,
        };
      }
      
      // Update for next iteration if improved
      if (improved) {
        currentScore = scoreAfter;
        currentAnalysis = newAnalysis;
        newAssetUrl = generationResult.url;
        console.log(`[AutoRegen] Improved to ${scoreAfter}, continuing...`);
      } else {
        console.log(`[AutoRegen] No improvement (${scoreAfter}), trying different approach...`);
      }
    }
    
    // Exhausted all attempts - escalate to user
    console.log(`[AutoRegen] Exhausted attempts, escalating to user review`);
    
    return {
      success: false,
      finalScore: currentScore,
      attempts,
      escalatedToUser: true,
      newAssetUrl,
      newAnalysis: currentAnalysis,
    };
  }
  
  /**
   * Determine regeneration strategy based on attempt number and issues
   */
  private determineStrategy(
    attempt: number,
    analysis: SceneAnalysisResult,
    scene: SceneForRegeneration
  ): { approach: string; provider: string } {
    const isVideo = scene.duration > 0 && scene.currentProvider !== 'flux' && scene.currentProvider !== 'falai';
    const providerOrder = isVideo 
      ? CONFIG.providerFallbackOrder.video 
      : CONFIG.providerFallbackOrder.image;
    
    // Attempt 1: Same provider, improved prompt
    if (attempt === 1) {
      return {
        approach: 'improved_prompt_same_provider',
        provider: scene.currentProvider,
      };
    }
    
    // Attempt 2: Different provider based on issues
    if (attempt === 2) {
      const newProvider = this.selectAlternateProvider(
        analysis,
        scene.currentProvider,
        providerOrder
      );
      return {
        approach: 'alternate_provider',
        provider: newProvider,
      };
    }
    
    // Attempt 3: Best provider for content type with heavily modified prompt
    if (attempt === 3) {
      const bestProvider = this.selectBestProviderForContent(
        scene.contentType,
        providerOrder
      );
      return {
        approach: 'best_provider_modified_prompt',
        provider: bestProvider,
      };
    }
    
    // Fallback
    return {
      approach: 'fallback',
      provider: providerOrder[0],
    };
  }
  
  /**
   * Select alternate provider based on analysis issues
   */
  private selectAlternateProvider(
    analysis: SceneAnalysisResult,
    currentProvider: string,
    providerOrder: string[]
  ): string {
    // Find next provider in order that isn't current
    for (const provider of providerOrder) {
      if (provider !== currentProvider) {
        return provider;
      }
    }
    return providerOrder[0];
  }
  
  /**
   * Select best provider for specific content type
   */
  private selectBestProviderForContent(
    contentType: string,
    providerOrder: string[]
  ): string {
    const contentProviderMap: Record<string, string> = {
      'person': 'kling',
      'lifestyle': 'kling',
      'product': 'luma',
      'nature': 'hailuo',
      'cinematic': 'runway',
      'food': 'flux',
      'object': 'flux',
    };
    
    const preferred = contentProviderMap[contentType];
    if (preferred && providerOrder.includes(preferred)) {
      return preferred;
    }
    
    return providerOrder[0];
  }
  
  /**
   * Improve prompt based on analysis issues
   */
  private improvePrompt(
    originalPrompt: string,
    analysis: SceneAnalysisResult,
    attempt: number
  ): string {
    let improvedPrompt = originalPrompt;
    
    // If Claude provided an improved prompt, use it as base
    if (analysis.improvedPrompt && attempt === 1) {
      improvedPrompt = analysis.improvedPrompt;
    }
    
    // Add fixes based on specific issues
    const fixes: string[] = [];
    
    for (const issue of analysis.issues) {
      switch (issue.category) {
        case 'ai_artifacts':
          fixes.push('photorealistic, no text overlays, no UI elements, clean image');
          break;
          
        case 'content_match':
          // Content mismatch - emphasize key elements from narration
          fixes.push('focus on the main subject clearly visible');
          break;
          
        case 'brand_compliance':
          if (issue.description.includes('lighting')) {
            fixes.push('warm golden natural lighting, soft shadows');
          }
          if (issue.description.includes('color')) {
            fixes.push('earth tones, warm browns and greens, natural palette');
          }
          if (issue.description.includes('clinical') || issue.description.includes('corporate')) {
            fixes.push('cozy home environment, natural textures, organic materials');
          }
          break;
          
        case 'technical':
          fixes.push('high resolution, sharp focus, professional quality');
          break;
          
        case 'composition':
          fixes.push('balanced composition, clear subject, uncluttered background');
          break;
      }
    }
    
    // Add attempt-specific modifications
    if (attempt >= 2) {
      fixes.push('simple composition, single clear subject');
    }
    
    if (attempt >= 3) {
      fixes.push('minimalist, clean, professional photography style');
    }
    
    // Deduplicate and append fixes
    const uniqueFixes = [...new Set(fixes)];
    if (uniqueFixes.length > 0) {
      improvedPrompt = `${improvedPrompt}. ${uniqueFixes.join(', ')}`;
    }
    
    // Add negative prompt elements
    improvedPrompt = `${improvedPrompt}. Avoid: garbled text, fake UI, distorted features, cold clinical lighting, blue/gray tones`;
    
    return improvedPrompt;
  }
  
  /**
   * Generate new asset with specified provider
   */
  private async generateAsset(
    scene: SceneForRegeneration,
    provider: string,
    prompt: string
  ): Promise<{ success: boolean; url?: string }> {
    const isVideo = scene.duration > 0 && !['flux', 'falai'].includes(provider);
    
    try {
      if (isVideo) {
        return this.generateVideo(provider, prompt, scene.duration);
      } else {
        return this.generateImage(provider, prompt);
      }
    } catch (error: any) {
      console.error(`[AutoRegen] Generation failed:`, error.message);
      return { success: false };
    }
  }
  
  /**
   * Generate video with specified provider
   */
  private async generateVideo(
    provider: string,
    prompt: string,
    duration: number
  ): Promise<{ success: boolean; url?: string }> {
    let result;
    
    switch (provider) {
      case 'kling':
        result = await piapiService.generateKlingVideo(prompt, { duration });
        break;
      case 'luma':
        result = await piapiService.generateLumaVideo(prompt, { duration });
        break;
      case 'hailuo':
        result = await piapiService.generateHailuoVideo(prompt, { duration });
        break;
      case 'runway':
        // Direct Runway API call
        result = await this.generateRunwayVideo(prompt, duration);
        break;
      default:
        return { success: false };
    }
    
    return {
      success: !!result?.url,
      url: result?.url,
    };
  }
  
  /**
   * Generate image with specified provider
   */
  private async generateImage(
    provider: string,
    prompt: string
  ): Promise<{ success: boolean; url?: string }> {
    let result;
    
    switch (provider) {
      case 'flux':
        result = await piapiService.generateFluxImage(prompt);
        break;
      case 'falai':
        // Direct fal.ai call
        result = await this.generateFalAIImage(prompt);
        break;
      default:
        return { success: false };
    }
    
    return {
      success: !!result?.url,
      url: result?.url,
    };
  }
  
  /**
   * Runway video generation (direct API)
   */
  private async generateRunwayVideo(
    prompt: string,
    duration: number
  ): Promise<{ url: string } | null> {
    // Implement Runway direct API call
    // This is a placeholder - actual implementation depends on Runway SDK
    console.log(`[AutoRegen] Generating Runway video...`);
    return null;
  }
  
  /**
   * fal.ai image generation (direct API)
   */
  private async generateFalAIImage(
    prompt: string
  ): Promise<{ url: string } | null> {
    try {
      const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${process.env.FAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          image_size: { width: 1280, height: 720 },
          num_inference_steps: 4,
          num_images: 1,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`fal.ai error: ${response.status}`);
      }
      
      const result = await response.json();
      return { url: result.images?.[0]?.url };
      
    } catch (error: any) {
      console.error(`[AutoRegen] fal.ai failed:`, error.message);
      return null;
    }
  }
  
  /**
   * Analyze newly generated asset
   */
  private async analyzeNewAsset(
    assetUrl: string,
    scene: SceneForRegeneration
  ): Promise<SceneAnalysisResult> {
    // Fetch image as base64
    const imageBase64 = await this.fetchAsBase64(assetUrl);
    
    return sceneAnalysisService.analyzeScene(imageBase64, {
      sceneIndex: scene.sceneIndex,
      sceneType: scene.sceneType,
      narration: scene.narration,
      visualDirection: scene.visualDirection,
      expectedContentType: scene.contentType,
      totalScenes: 1, // Not used in analysis
    });
  }
  
  /**
   * Fetch URL content as base64
   */
  private async fetchAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }
  
  /**
   * Queue scene for user review (escalation)
   */
  async escalateToUserReview(
    scene: SceneForRegeneration,
    regenerationResult: RegenerationResult
  ): Promise<void> {
    console.log(`[AutoRegen] Escalating scene ${scene.sceneIndex + 1} to user review queue`);
    
    // Store in database for user review
    // This creates a record in a review queue table
    await this.createReviewQueueEntry({
      projectId: scene.projectId,
      sceneId: scene.id,
      sceneIndex: scene.sceneIndex,
      reason: 'auto_regeneration_failed',
      attempts: regenerationResult.attempts,
      bestScore: regenerationResult.finalScore,
      createdAt: new Date().toISOString(),
    });
  }
  
  private async createReviewQueueEntry(entry: any): Promise<void> {
    // Database insert - implementation depends on your DB setup
    console.log(`[AutoRegen] Review queue entry created:`, entry);
  }
}

export const autoRegenerationService = new AutoRegenerationService();
```

---

## Integration with Asset Generation

Update the asset generation flow to include auto-regeneration:

```typescript
// In universal-video-service.ts or asset generation service:

async generateSceneAsset(scene: Scene, project: Project): Promise<void> {
  // Generate initial asset
  const asset = await this.generateAsset(scene);
  
  // Analyze immediately
  const analysis = await sceneAnalysisService.analyzeScene(
    asset.base64,
    buildSceneContext(scene)
  );
  
  // Store analysis
  scene.analysisResult = analysis;
  scene.qualityScore = analysis.overallScore;
  
  // Check if regeneration needed
  if (analysis.recommendation === 'regenerate' || analysis.recommendation === 'critical_fail') {
    console.log(`[Generation] Scene ${scene.sceneIndex + 1} needs regeneration (score: ${analysis.overallScore})`);
    
    const regenerationResult = await autoRegenerationService.regenerateScene({
      id: scene.id,
      sceneIndex: scene.sceneIndex,
      sceneType: scene.type,
      contentType: scene.contentType,
      narration: scene.narration,
      visualDirection: scene.visualDirection,
      duration: scene.duration,
      currentProvider: scene.provider,
      currentAssetUrl: asset.url,
      analysisResult: analysis,
      projectId: project.id,
    });
    
    if (regenerationResult.success) {
      // Update scene with new asset
      scene.imageUrl = regenerationResult.newAssetUrl;
      scene.analysisResult = regenerationResult.newAnalysis;
      scene.qualityScore = regenerationResult.finalScore;
      scene.regenerationAttempts = regenerationResult.attempts;
    } else {
      // Escalate to user
      await autoRegenerationService.escalateToUserReview(scene, regenerationResult);
      scene.needsUserReview = true;
    }
  }
  
  // Save scene
  await this.saveScene(scene);
}
```

---

## API Endpoint for Manual Regeneration

```typescript
// POST /api/scenes/:id/regenerate
router.post('/api/scenes/:id/regenerate', async (req, res) => {
  const sceneId = parseInt(req.params.id);
  const { provider, customPrompt } = req.body;
  
  const scene = await getSceneWithProject(sceneId);
  
  if (!scene.analysisResult) {
    return res.status(400).json({ error: 'Scene has not been analyzed yet' });
  }
  
  // Allow user to override provider or prompt
  const sceneForRegen: SceneForRegeneration = {
    ...scene,
    currentProvider: provider || scene.provider,
    visualDirection: customPrompt || scene.visualDirection,
  };
  
  const result = await autoRegenerationService.regenerateScene(sceneForRegen);
  
  if (result.success) {
    // Update scene in database
    await updateScene(sceneId, {
      imageUrl: result.newAssetUrl,
      videoUrl: result.newAssetUrl, // Depending on type
      analysisResult: result.newAnalysis,
      qualityScore: result.finalScore,
      regenerationAttempts: result.attempts,
    });
  }
  
  res.json(result);
});
```

---

## Verification Checklist

- [ ] Auto-regeneration service created
- [ ] Triggers on score < 70
- [ ] Maximum 3 attempts enforced
- [ ] Prompt improved based on specific issues
- [ ] Provider switching on attempt 2
- [ ] Best provider selected on attempt 3
- [ ] New asset analyzed after each attempt
- [ ] Success when score reaches 70+
- [ ] Escalation to user queue after max attempts
- [ ] Regeneration history tracked
- [ ] Manual regeneration endpoint working

---

## Next Phase

Once Auto-Regeneration is working, proceed to **Phase 8C: Smart Text Placement** which uses the frame analysis from 8A to position text overlays correctly.
