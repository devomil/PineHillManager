import { IMAGE_PROVIDERS } from '@shared/provider-config';

export interface ImageProviderSelection {
  provider: typeof IMAGE_PROVIDERS.flux | typeof IMAGE_PROVIDERS.falai;
  reason: string;
  confidence: number;
}

class ImageProviderSelectorService {
  
  selectProvider(
    contentType: string,
    sceneType: string,
    visualDirection: string,
    qualityTier: 'ultra' | 'premium' | 'standard' = 'premium'
  ): ImageProviderSelection {
    const lower = visualDirection.toLowerCase();
    
    // For ultra and premium tiers, prefer Flux (higher quality)
    // For standard tier, still use content-based selection but note it's cost-optimized
    const preferFlux = qualityTier === 'ultra' || qualityTier === 'premium';
    
    if (
      contentType === 'product' ||
      sceneType === 'product' ||
      /product|bottle|package|supplement|food|ingredient|object|item|merchandise/.test(lower)
    ) {
      return {
        provider: IMAGE_PROVIDERS.flux,
        reason: qualityTier === 'ultra' ? 'Ultra quality product rendering' : 'Product/object focus - clean commercial quality',
        confidence: 90,
      };
    }
    
    if (
      contentType === 'person' ||
      contentType === 'lifestyle' ||
      sceneType === 'testimonial' ||
      /person|woman|man|people|lifestyle|authentic|natural|wellness|customer/.test(lower)
    ) {
      // For ultra/premium, use Flux for higher quality even on lifestyle
      if (preferFlux) {
        return {
          provider: IMAGE_PROVIDERS.flux,
          reason: qualityTier === 'ultra' ? 'Ultra quality lifestyle rendering' : 'Premium lifestyle quality',
          confidence: 88,
        };
      }
      return {
        provider: IMAGE_PROVIDERS.falai,
        reason: 'Lifestyle/people - natural authentic feel',
        confidence: 85,
      };
    }
    
    if (
      contentType === 'nature' ||
      /garden|farm|outdoor|landscape|nature|environment|field|meadow/.test(lower)
    ) {
      if (preferFlux) {
        return {
          provider: IMAGE_PROVIDERS.flux,
          reason: qualityTier === 'ultra' ? 'Ultra quality nature scenes' : 'Premium environment quality',
          confidence: 85,
        };
      }
      return {
        provider: IMAGE_PROVIDERS.falai,
        reason: 'Environment/nature scene',
        confidence: 80,
      };
    }
    
    if (/food|vegetable|fruit|meal|kitchen|cooking|ingredient|herb|spice/.test(lower)) {
      return {
        provider: IMAGE_PROVIDERS.flux,
        reason: qualityTier === 'ultra' ? 'Ultra quality food detail' : 'Food/ingredients - accurate detail rendering',
        confidence: 88,
      };
    }
    
    if (/studio|clean|minimal|white background|isolated|professional/.test(lower)) {
      return {
        provider: IMAGE_PROVIDERS.flux,
        reason: 'Studio/clean aesthetic - sharp commercial quality',
        confidence: 85,
      };
    }
    
    // Default: Use Flux for ultra/premium, falai for standard
    if (preferFlux) {
      return {
        provider: IMAGE_PROVIDERS.flux,
        reason: qualityTier === 'ultra' ? 'Ultra tier default - maximum quality' : 'Premium tier default',
        confidence: 75,
      };
    }
    
    return {
      provider: IMAGE_PROVIDERS.falai,
      reason: 'General scene - cost-effective rendering',
      confidence: 70,
    };
  }
  
  selectProvidersForScenes(
    scenes: Array<{
      sceneIndex: number;
      contentType: string;
      sceneType: string;
      visualDirection: string;
      needsImage: boolean;
    }>,
    qualityTier: 'ultra' | 'premium' | 'standard' = 'premium'
  ): Map<number, ImageProviderSelection> {
    const selections = new Map<number, ImageProviderSelection>();
    
    scenes
      .filter(s => s.needsImage)
      .forEach(scene => {
        const selection = this.selectProvider(
          scene.contentType,
          scene.sceneType,
          scene.visualDirection,
          qualityTier
        );
        selections.set(scene.sceneIndex, selection);
      });
    
    const fluxCount = Array.from(selections.values())
      .filter(s => s.provider.id === 'flux').length;
    const falaiCount = Array.from(selections.values())
      .filter(s => s.provider.id === 'falai').length;
    
    console.log(`[ImageProvider] Selection: Flux.1: ${fluxCount}, fal.ai: ${falaiCount}`);
    
    return selections;
  }
  
  getProviderSummary(selections: Map<number, ImageProviderSelection>): { flux: number; falai: number } {
    const counts = { flux: 0, falai: 0 };
    
    selections.forEach(selection => {
      if (selection.provider.id === 'flux') {
        counts.flux++;
      } else {
        counts.falai++;
      }
    });
    
    return counts;
  }
  
  calculateImageCost(counts: { flux: number; falai: number }): number {
    const fluxCost = counts.flux * IMAGE_PROVIDERS.flux.costPerImage;
    const falaiCost = counts.falai * IMAGE_PROVIDERS.falai.costPerImage;
    return fluxCost + falaiCost;
  }
}

export const imageProviderSelector = new ImageProviderSelectorService();
