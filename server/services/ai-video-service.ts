// server/services/ai-video-service.ts

import { runwayVideoService } from './runway-video-service';
import { piapiVideoService } from './piapi-video-service';
import { promptEnhancementService } from './prompt-enhancement-service';
import { 
  AI_VIDEO_PROVIDERS, 
  selectProvidersForScene, 
  getConfiguredProviders 
} from '../config/ai-video-providers';
import { getVisualStyleConfig, VisualStyleConfig } from '@shared/visual-style-config';

interface AIVideoResult {
  success: boolean;
  videoUrl?: string;
  s3Url?: string;
  provider?: string;
  duration?: number;
  cost?: number;
  error?: string;
  generationTimeMs?: number;
}

interface AIVideoOptions {
  prompt: string;
  duration: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  sceneType: string;
  preferredProvider?: string;
  negativePrompt?: string;
  narration?: string;
  mood?: string;
  contentType?: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
  visualStyle?: string;
  imageUrl?: string;
}

class AIVideoService {
  
  constructor() {
    console.log('[AIVideoService] Initializing multi-provider service...');
    const providers = getConfiguredProviders();
    console.log(`[AIVideoService] Configured providers: ${providers.join(', ') || 'none'}`);
  }
  
  isAvailable(): boolean {
    return getConfiguredProviders().length > 0;
  }

  getAvailableProviders(): string[] {
    return getConfiguredProviders();
  }

  async generateVideo(options: AIVideoOptions): Promise<AIVideoResult> {
    const configuredProviders = getConfiguredProviders();
    
    if (configuredProviders.length === 0) {
      return { success: false, error: 'No AI video providers configured' };
    }

    // Get visual style configuration (Phase 5B)
    const styleConfig = getVisualStyleConfig(options.visualStyle || 'professional');
    
    // Determine content type from style config if not provided
    const contentType = options.contentType || 
      styleConfig.defaultContentTypes[options.sceneType as keyof typeof styleConfig.defaultContentTypes] ||
      'lifestyle';
    
    // Build enhanced prompt with style modifiers
    const styleEnhancedPrompt = this.applyStyleToPrompt(options.prompt, styleConfig);
    
    console.log(`[AIVideo] Using style: ${styleConfig.name}`);

    // ENHANCE PROMPT WITH BRAND CONTEXT AND SAFETY
    console.log(`[PromptEnhance] Enhancing prompt for ${options.sceneType} scene`);
    const enhanced = await promptEnhancementService.enhanceVideoPrompt(
      styleEnhancedPrompt,
      {
        sceneType: options.sceneType,
        narration: options.narration,
        mood: options.mood || styleConfig.promptModifiers.mood,
        contentType,
        excludeElements: styleConfig.negativePromptAdditions,
      }
    );
    
    console.log(`[AIVideo] Enhanced prompt for ${options.sceneType} scene`);
    
    // Create enhanced options with brand context and negative prompt
    const enhancedOptions: AIVideoOptions = {
      ...options,
      prompt: enhanced.prompt,
      negativePrompt: enhanced.negativePrompt,
      contentType,
    };

    // Select providers based on style preferences (Phase 5B)
    const providerOrder = enhancedOptions.preferredProvider 
      ? [enhancedOptions.preferredProvider, ...configuredProviders.filter(p => p !== enhancedOptions.preferredProvider)]
      : this.selectProvidersForStyle(styleConfig.preferredVideoProviders, enhancedOptions.sceneType, contentType, configuredProviders);

    console.log(`[AIVideo] Scene: ${enhancedOptions.sceneType}`);
    console.log(`[AIVideo] Provider order: ${providerOrder.join(' → ')}`);

    for (const providerKey of providerOrder) {
      const provider = AI_VIDEO_PROVIDERS[providerKey];
      
      if (!provider) continue;
      
      console.log(`[AIVideo] Trying ${provider.name}...`);
      
      try {
        const result = await this.generateWithProvider(providerKey, provider, enhancedOptions);
        
        if (result.success && result.s3Url) {
          console.log(`[AIVideo] ✓ Success with ${provider.name}`);
          return {
            ...result,
            provider: providerKey,
          };
        }
        
        console.warn(`[AIVideo] ✗ ${provider.name} failed: ${result.error}`);
        
      } catch (error: any) {
        console.warn(`[AIVideo] ✗ ${provider.name} error: ${error.message}`);
      }
    }

    return { 
      success: false, 
      error: `All providers failed for ${enhancedOptions.sceneType} scene` 
    };
  }

  private async generateWithProvider(
    providerKey: string,
    provider: typeof AI_VIDEO_PROVIDERS[string],
    options: AIVideoOptions
  ): Promise<AIVideoResult> {
    
    if (provider.type === 'direct') {
      return this.generateDirect(providerKey, options);
    } else {
      return this.generateViaPiAPI(providerKey, options);
    }
  }

  private async generateDirect(
    providerKey: string,
    options: AIVideoOptions
  ): Promise<AIVideoResult> {
    if (providerKey === 'runway') {
      if (!runwayVideoService.isAvailable()) {
        return { success: false, error: 'Runway not configured' };
      }
      
      const result = await runwayVideoService.generateVideo({
        prompt: options.prompt,
        duration: options.duration,
        aspectRatio: options.aspectRatio,
        negativePrompt: options.negativePrompt,
        imageUrl: options.imageUrl,
      });
      
      return {
        success: result.success,
        videoUrl: result.videoUrl,
        s3Url: result.s3Url,
        duration: result.duration,
        cost: result.cost,
        error: result.error,
        generationTimeMs: result.generationTimeMs,
      };
    }
    
    return { success: false, error: `Unknown direct provider: ${providerKey}` };
  }

  private async generateViaPiAPI(
    providerKey: string,
    options: AIVideoOptions
  ): Promise<AIVideoResult> {
    if (!piapiVideoService.isAvailable()) {
      return { success: false, error: 'PiAPI not configured' };
    }
    
    const result = await piapiVideoService.generateVideo({
      prompt: options.prompt,
      duration: options.duration,
      aspectRatio: options.aspectRatio,
      model: providerKey,
      negativePrompt: options.negativePrompt,
    });
    
    return {
      success: result.success,
      videoUrl: result.videoUrl,
      s3Url: result.s3Url,
      duration: result.duration,
      cost: result.cost,
      error: result.error,
      generationTimeMs: result.generationTimeMs,
    };
  }

  /**
   * Apply visual style modifiers to the prompt (Phase 5B)
   */
  private applyStyleToPrompt(prompt: string, style: VisualStyleConfig): string {
    const modifiers = style.promptModifiers;
    const parts = [
      prompt,
      modifiers.mood,
      modifiers.lighting,
      modifiers.cameraWork,
      modifiers.colorGrade,
      style.stylePromptSuffix,
    ];
    return parts.filter(p => p).join(', ');
  }

  /**
   * Select providers based on style preferences and scene requirements (Phase 5B)
   */
  private selectProvidersForStyle(
    preferredProviders: string[],
    sceneType: string,
    contentType: string,
    configuredProviders: string[]
  ): string[] {
    // Start with style-preferred providers, filtered by what's configured
    const providers = preferredProviders.filter(p => configuredProviders.includes(p));
    
    // Add any configured providers not in preferred list as fallbacks
    for (const p of configuredProviders) {
      if (!providers.includes(p)) {
        providers.push(p);
      }
    }
    
    // Adjust for specific scene/content needs
    if (contentType === 'person') {
      // Runway and Kling handle people well - process in REVERSE order
      // so Runway ends up first (last unshift wins)
      const personProviders = ['kling', 'runway'];
      personProviders.forEach(p => {
        const idx = providers.indexOf(p);
        if (idx > 0) {
          providers.splice(idx, 1);
          providers.unshift(p);
        }
      });
    }
    
    // For CTA scenes, prioritize most reliable provider
    if (sceneType === 'cta') {
      const runwayIdx = providers.indexOf('runway');
      if (runwayIdx > 0) {
        providers.splice(runwayIdx, 1);
        providers.unshift('runway');
      }
    }
    
    return providers;
  }

  estimateCost(duration: number, providerKey?: string): number {
    if (providerKey && AI_VIDEO_PROVIDERS[providerKey]) {
      return duration * AI_VIDEO_PROVIDERS[providerKey].costPerSecond;
    }
    return duration * 0.04;
  }
}

export const aiVideoService = new AIVideoService();
