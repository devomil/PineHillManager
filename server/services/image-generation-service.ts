import { imageProviderSelector, ImageProviderSelection } from './image-provider-selector';

interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  provider?: 'flux' | 'falai';
}

interface GeneratedImage {
  url: string;
  provider: string;
  prompt: string;
  width: number;
  height: number;
}

class ImageGenerationService {
  
  async generateImage(options: ImageGenerationOptions): Promise<GeneratedImage> {
    const provider = options.provider || 'falai';
    
    console.log(`[ImageGen] Generating with ${provider}: ${options.prompt.substring(0, 50)}...`);
    
    if (provider === 'flux') {
      return this.generateWithFlux(options);
    } else {
      return this.generateWithFalAI(options);
    }
  }
  
  private async generateWithFlux(options: ImageGenerationOptions): Promise<GeneratedImage> {
    const width = options.width || 1280;
    const height = options.height || 720;
    
    try {
      const apiKey = process.env.PIAPI_API_KEY;
      if (!apiKey) {
        throw new Error('PIAPI_API_KEY not configured');
      }
      
      const response = await fetch('https://api.piapi.ai/api/v1/task', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'Qubico/flux1-schnell',
          task_type: 'txt2img',
          input: {
            prompt: options.prompt,
            negative_prompt: options.negativePrompt || 'blurry, low quality, distorted, watermark, text',
            width,
            height,
            num_inference_steps: 4,
          },
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Flux API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.data?.output?.image_url) {
        return {
          url: result.data.output.image_url,
          provider: 'flux',
          prompt: options.prompt,
          width,
          height,
        };
      }
      
      if (result.data?.task_id) {
        console.log(`[ImageGen] Flux task created: ${result.data.task_id}`);
        return {
          url: `pending:${result.data.task_id}`,
          provider: 'flux',
          prompt: options.prompt,
          width,
          height,
        };
      }
      
      throw new Error('Unexpected Flux response format');
      
    } catch (error: any) {
      console.error('[ImageGen] Flux.1 failed:', error.message);
      console.log('[ImageGen] Falling back to fal.ai');
      return this.generateWithFalAI(options);
    }
  }
  
  private async generateWithFalAI(options: ImageGenerationOptions): Promise<GeneratedImage> {
    const width = options.width || 1280;
    const height = options.height || 720;
    
    try {
      const apiKey = process.env.FAL_API_KEY;
      if (!apiKey) {
        console.log('[ImageGen] FAL_API_KEY not configured, returning placeholder');
        return {
          url: 'placeholder:no-api-key',
          provider: 'falai',
          prompt: options.prompt,
          width,
          height,
        };
      }
      
      const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: options.prompt,
          image_size: { width, height },
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: true,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`fal.ai API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      return {
        url: result.images?.[0]?.url || result.url || 'placeholder:response-parse-error',
        provider: 'falai',
        prompt: options.prompt,
        width,
        height,
      };
      
    } catch (error: any) {
      console.error('[ImageGen] fal.ai failed:', error.message);
      return {
        url: 'placeholder:generation-failed',
        provider: 'falai',
        prompt: options.prompt,
        width: options.width || 1280,
        height: options.height || 720,
      };
    }
  }
  
  async generateImagesForScenes(
    scenes: Array<{
      sceneIndex: number;
      contentType: string;
      sceneType: string;
      visualDirection: string;
      needsImage: boolean;
    }>
  ): Promise<Map<number, GeneratedImage>> {
    const providerSelections = imageProviderSelector.selectProvidersForScenes(scenes);
    const results = new Map<number, GeneratedImage>();
    
    for (const scene of scenes.filter(s => s.needsImage)) {
      const selection = providerSelections.get(scene.sceneIndex);
      if (!selection) continue;
      
      try {
        const image = await this.generateImage({
          prompt: scene.visualDirection,
          provider: selection.provider.id as 'flux' | 'falai',
        });
        
        results.set(scene.sceneIndex, image);
        console.log(`[ImageGen] Scene ${scene.sceneIndex + 1}: ${selection.provider.displayName} ✓`);
        
      } catch (error: any) {
        console.error(`[ImageGen] Scene ${scene.sceneIndex + 1} failed:`, error.message);
      }
    }
    
    return results;
  }
}

export const imageGenerationService = new ImageGenerationService();
