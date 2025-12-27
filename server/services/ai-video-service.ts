// server/services/ai-video-service.ts

import { runwayVideoService } from './runway-video-service';
import { piapiVideoService } from './piapi-video-service';
import { 
  AI_VIDEO_PROVIDERS, 
  selectProvidersForScene, 
  getConfiguredProviders 
} from '../config/ai-video-providers';

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

    const providerOrder = options.preferredProvider 
      ? [options.preferredProvider, ...configuredProviders.filter(p => p !== options.preferredProvider)]
      : selectProvidersForScene(options.sceneType, options.prompt);

    console.log(`[AIVideo] Scene: ${options.sceneType}`);
    console.log(`[AIVideo] Provider order: ${providerOrder.join(' → ')}`);

    for (const providerKey of providerOrder) {
      const provider = AI_VIDEO_PROVIDERS[providerKey];
      
      if (!provider) continue;
      
      console.log(`[AIVideo] Trying ${provider.name}...`);
      
      try {
        const result = await this.generateWithProvider(providerKey, provider, options);
        
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
      error: `All providers failed for ${options.sceneType} scene` 
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

  estimateCost(duration: number, providerKey?: string): number {
    if (providerKey && AI_VIDEO_PROVIDERS[providerKey]) {
      return duration * AI_VIDEO_PROVIDERS[providerKey].costPerSecond;
    }
    return duration * 0.04;
  }
}

export const aiVideoService = new AIVideoService();
