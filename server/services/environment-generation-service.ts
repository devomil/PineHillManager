import { CompositionRequest } from '../../shared/types/image-composition-types';
import { imageGenerationService } from './image-generation-service';
import type { ImageStyle } from '../config/image-providers';

class EnvironmentGenerationService {
  
  async generateEnvironment(request: CompositionRequest): Promise<string> {
    console.log(`[EnvironmentGen] Generating environment for scene ${request.sceneId}`);
    
    const prompt = this.buildEnvironmentPrompt(request);
    console.log(`[EnvironmentGen] Prompt: ${prompt.substring(0, 150)}...`);
    
    try {
      const result = await imageGenerationService.generateImage({
        prompt,
        width: request.output.width,
        height: request.output.height,
        style: this.mapStyleToProvider(request.environment.style),
        negativePrompt: 'text, watermark, logo, brand name, product packaging, bottles, containers, human hands, faces, people',
      });
      
      if (result.url) {
        console.log(`[EnvironmentGen] Generated environment: ${result.url}`);
        return result.url;
      }
      
      throw new Error('Environment generation failed - no URL returned');
    } catch (error) {
      console.error('[EnvironmentGen] Failed:', error);
      throw error;
    }
  }
  
  private buildEnvironmentPrompt(request: CompositionRequest): string {
    const { environment, products } = request;
    
    let prompt = environment.prompt;
    
    if (products.length > 0) {
      const placementAreas = products.map(p => {
        if (p.position.y > 70) return 'foreground surface';
        if (p.position.y > 40) return 'middle ground';
        return 'background area';
      });
      
      const uniqueAreas = Array.from(new Set(placementAreas));
      prompt += `, with clear ${uniqueAreas.join(' and ')} for product placement`;
    }
    
    const lightingMap: Record<string, string> = {
      warm: 'warm golden lighting, soft shadows',
      cool: 'cool natural lighting, soft diffused light',
      natural: 'natural daylight, balanced exposure',
      dramatic: 'dramatic lighting with depth',
      soft: 'soft diffused lighting, minimal shadows',
    };
    prompt += `, ${lightingMap[environment.lighting] || lightingMap.warm}`;
    
    const styleMap: Record<string, string> = {
      photorealistic: 'photorealistic, 8k, professional photography',
      lifestyle: 'lifestyle photography, editorial style, magazine quality',
      studio: 'studio photography, clean background, professional product photography',
      natural: 'natural setting, organic feel, authentic environment',
    };
    prompt += `, ${styleMap[environment.style] || styleMap.photorealistic}`;
    
    if (environment.colorPalette && environment.colorPalette.length > 0) {
      prompt += `, earth tone color palette with greens and warm browns`;
    }
    
    prompt += `, empty space in composition for product placement, no text or logos, clean surfaces`;
    
    return prompt;
  }
  
  private mapStyleToProvider(style: string): ImageStyle {
    switch (style) {
      case 'photorealistic':
      case 'studio':
        return 'hero-shot';
      case 'lifestyle':
        return 'lifestyle';
      case 'natural':
        return 'nature';
      default:
        return 'default';
    }
  }
}

export const environmentGenerationService = new EnvironmentGenerationService();
