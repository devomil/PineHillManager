import {
  CompositionRequest,
  ProductPlacement,
  LogoPosition,
} from '../../shared/types/image-composition-types';
import type { BrandRequirementAnalysis } from '../../shared/types/brand-asset-types';

class CompositionRequestBuilder {
  
  async build(
    sceneId: string,
    visualDirection: string,
    analysis: BrandRequirementAnalysis,
    outputType: 'image' | 'video'
  ): Promise<CompositionRequest> {
    
    const environment = this.buildEnvironmentConfig(visualDirection, analysis);
    const products = await this.buildProductPlacements(analysis);
    const logoOverlay = await this.buildLogoOverlay(analysis);
    
    return {
      sceneId,
      visualDirection,
      environment,
      products,
      logoOverlay,
      output: {
        width: outputType === 'video' ? 1920 : 1920,
        height: outputType === 'video' ? 1080 : 1080,
        format: 'png',
        quality: 95,
      },
    };
  }
  
  private buildEnvironmentConfig(
    visualDirection: string,
    analysis: BrandRequirementAnalysis
  ): CompositionRequest['environment'] {
    
    const lower = visualDirection.toLowerCase();
    
    let style: 'photorealistic' | 'lifestyle' | 'studio' | 'natural' = 'photorealistic';
    if (lower.includes('lifestyle') || lower.includes('editorial')) {
      style = 'lifestyle';
    } else if (lower.includes('studio') || lower.includes('clean background')) {
      style = 'studio';
    } else if (lower.includes('natural') || lower.includes('organic')) {
      style = 'natural';
    }
    
    let lighting: 'warm' | 'cool' | 'natural' | 'dramatic' | 'soft' = 'warm';
    if (lower.includes('cool light') || lower.includes('blue')) {
      lighting = 'cool';
    } else if (lower.includes('dramatic')) {
      lighting = 'dramatic';
    } else if (lower.includes('soft') || lower.includes('diffused')) {
      lighting = 'soft';
    } else if (lower.includes('natural light')) {
      lighting = 'natural';
    }
    
    const prompt = this.cleanPromptForEnvironment(visualDirection);
    
    return {
      prompt,
      style,
      lighting,
      colorPalette: ['#2D5A27', '#D4A574', '#8B4513'],
    };
  }
  
  private cleanPromptForEnvironment(visualDirection: string): string {
    let cleaned = visualDirection
      .replace(/pine hill farm/gi, '')
      .replace(/phf/gi, '')
      .replace(/product[s]?/gi, '')
      .replace(/bottle[s]?/gi, '')
      .replace(/packaging/gi, '')
      .replace(/branding/gi, '')
      .replace(/logo/gi, '')
      .replace(/black cohosh/gi, '')
      .replace(/deep sleep/gi, '')
      .replace(/wonder lotion/gi, '')
      .replace(/supplement[s]?/gi, '')
      .replace(/tincture[s]?/gi, '')
      .replace(/capsule[s]?/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (cleaned.length < 20) {
      cleaned = 'Clean, organized workspace with natural wood surfaces, warm lighting, plants in background, earth tone color palette';
    }
    
    return cleaned;
  }
  
  private async buildProductPlacements(
    analysis: BrandRequirementAnalysis
  ): Promise<ProductPlacement[]> {
    
    const placements: ProductPlacement[] = [];
    const matchedProducts = analysis.matchedAssets.products;
    
    if (matchedProducts.length === 0) {
      return placements;
    }
    
    if (matchedProducts.length === 1) {
      const asset = matchedProducts[0];
      placements.push({
        assetId: asset.id?.toString() || '0',
        assetUrl: asset.url || '',
        position: { x: 50, y: 70, anchor: 'bottom-center' },
        scale: 1.0,
        maxWidth: 40,
        maxHeight: 60,
        shadow: { enabled: true, angle: 135, blur: 15, opacity: 0.3 },
        zIndex: 1,
      });
    } else if (matchedProducts.length === 2) {
      matchedProducts.slice(0, 2).forEach((asset, i) => {
        placements.push({
          assetId: asset.id?.toString() || i.toString(),
          assetUrl: asset.url || '',
          position: { x: 35 + i * 30, y: 70, anchor: 'bottom-center' },
          scale: 0.85,
          maxWidth: 30,
          maxHeight: 50,
          shadow: { enabled: true, angle: 135, blur: 12, opacity: 0.25 },
          zIndex: i + 1,
        });
      });
    } else {
      const positions = [
        { x: 30, y: 75, scale: 0.7 },
        { x: 50, y: 65, scale: 0.9 },
        { x: 70, y: 75, scale: 0.7 },
        { x: 40, y: 80, scale: 0.6 },
        { x: 60, y: 80, scale: 0.6 },
      ];
      
      matchedProducts.slice(0, 5).forEach((asset, i) => {
        const pos = positions[i];
        placements.push({
          assetId: asset.id?.toString() || i.toString(),
          assetUrl: asset.url || '',
          position: { x: pos.x, y: pos.y, anchor: 'bottom-center' },
          scale: pos.scale,
          maxWidth: 25,
          maxHeight: 45,
          shadow: { enabled: true, angle: 135, blur: 10, opacity: 0.2 },
          zIndex: i + 1,
        });
      });
    }
    
    return placements;
  }
  
  private async buildLogoOverlay(
    analysis: BrandRequirementAnalysis
  ): Promise<CompositionRequest['logoOverlay'] | undefined> {
    
    if (!analysis.requirements.logoRequired) {
      return undefined;
    }
    
    const logoAsset = analysis.matchedAssets.logos[0];
    if (!logoAsset) {
      return undefined;
    }
    
    let position: LogoPosition = 'bottom-right';
    let size: 'small' | 'medium' | 'large' = 'medium';
    let opacity = 0.9;
    
    if (analysis.requirements.brandingVisibility === 'prominent') {
      position = 'top-left';
      size = 'large';
      opacity = 1.0;
    } else if (analysis.requirements.brandingVisibility === 'subtle') {
      position = 'bottom-right';
      size = 'small';
      opacity = 0.7;
    }
    
    return {
      assetId: logoAsset.id?.toString() || '0',
      position,
      size,
      opacity,
    };
  }
  
  buildFromSimpleParams(
    sceneId: string,
    environmentPrompt: string,
    productUrls: string[],
    options?: {
      style?: 'photorealistic' | 'lifestyle' | 'studio' | 'natural';
      lighting?: 'warm' | 'cool' | 'natural' | 'dramatic' | 'soft';
      width?: number;
      height?: number;
    }
  ): CompositionRequest {
    
    const products: ProductPlacement[] = [];
    
    if (productUrls.length === 1) {
      products.push({
        assetId: 'product-1',
        assetUrl: productUrls[0],
        position: { x: 50, y: 70, anchor: 'bottom-center' },
        scale: 1.0,
        maxWidth: 40,
        maxHeight: 60,
        shadow: { enabled: true, angle: 135, blur: 15, opacity: 0.3 },
        zIndex: 1,
      });
    } else if (productUrls.length === 2) {
      productUrls.forEach((url, i) => {
        products.push({
          assetId: `product-${i + 1}`,
          assetUrl: url,
          position: { x: 35 + i * 30, y: 70, anchor: 'bottom-center' },
          scale: 0.85,
          maxWidth: 30,
          maxHeight: 50,
          shadow: { enabled: true, angle: 135, blur: 12, opacity: 0.25 },
          zIndex: i + 1,
        });
      });
    } else {
      const positions = [
        { x: 30, y: 75, scale: 0.7 },
        { x: 50, y: 65, scale: 0.9 },
        { x: 70, y: 75, scale: 0.7 },
      ];
      
      productUrls.slice(0, 3).forEach((url, i) => {
        const pos = positions[i];
        products.push({
          assetId: `product-${i + 1}`,
          assetUrl: url,
          position: { x: pos.x, y: pos.y, anchor: 'bottom-center' },
          scale: pos.scale,
          maxWidth: 25,
          maxHeight: 45,
          shadow: { enabled: true, angle: 135, blur: 10, opacity: 0.2 },
          zIndex: i + 1,
        });
      });
    }
    
    return {
      sceneId,
      visualDirection: environmentPrompt,
      environment: {
        prompt: environmentPrompt,
        style: options?.style || 'photorealistic',
        lighting: options?.lighting || 'warm',
        colorPalette: ['#2D5A27', '#D4A574', '#8B4513'],
      },
      products,
      output: {
        width: options?.width || 1920,
        height: options?.height || 1080,
        format: 'png',
        quality: 95,
      },
    };
  }
}

export const compositionRequestBuilder = new CompositionRequestBuilder();
