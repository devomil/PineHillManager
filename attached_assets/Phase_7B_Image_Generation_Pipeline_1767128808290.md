# Phase 7B: Image Generation Pipeline

## Objective

Add Flux.1 and fal.ai image generation providers to the pipeline, with intelligent selection based on content type. Display image generation in the Generation Preview panel.

## Current Problem

The Generation Preview doesn't show image generation at all. The system should use:
- **Flux.1** for product shots, food, objects (clean commercial quality)
- **fal.ai** for lifestyle images, people, scenes (natural authentic feel)

## What This Phase Creates/Modifies

- `server/services/image-generation-service.ts` - NEW: Multi-provider image service
- `server/services/image-provider-selector.ts` - NEW: Selection logic
- `client/src/components/generation-preview-panel.tsx` - Show image providers
- API integration for Flux.1 and fal.ai

---

## Step 1: Create Image Provider Selector

Create `server/services/image-provider-selector.ts`:

```typescript
// server/services/image-provider-selector.ts

import { IMAGE_PROVIDERS } from '@shared/provider-config';

export interface ImageProviderSelection {
  provider: typeof IMAGE_PROVIDERS.flux | typeof IMAGE_PROVIDERS.falai;
  reason: string;
}

class ImageProviderSelectorService {
  
  /**
   * Select best image provider based on content
   */
  selectProvider(
    contentType: string,
    sceneType: string,
    visualDirection: string
  ): ImageProviderSelection {
    const lower = visualDirection.toLowerCase();
    
    // Product-focused content → Flux.1
    if (
      contentType === 'product' ||
      sceneType === 'product' ||
      /product|bottle|package|supplement|food|ingredient|object/.test(lower)
    ) {
      return {
        provider: IMAGE_PROVIDERS.flux,
        reason: 'Product/object focus - clean commercial quality',
      };
    }
    
    // People/lifestyle content → fal.ai
    if (
      contentType === 'person' ||
      contentType === 'lifestyle' ||
      sceneType === 'testimonial' ||
      /person|woman|man|people|lifestyle|authentic|natural/.test(lower)
    ) {
      return {
        provider: IMAGE_PROVIDERS.falai,
        reason: 'Lifestyle/people - natural authentic feel',
      };
    }
    
    // Nature/environment → fal.ai (better at scenes)
    if (
      contentType === 'nature' ||
      /garden|farm|outdoor|landscape|nature|environment/.test(lower)
    ) {
      return {
        provider: IMAGE_PROVIDERS.falai,
        reason: 'Environment/nature scene',
      };
    }
    
    // Food/ingredients → Flux.1 (accurate details)
    if (/food|vegetable|fruit|meal|kitchen|cooking|ingredient/.test(lower)) {
      return {
        provider: IMAGE_PROVIDERS.flux,
        reason: 'Food/ingredients - accurate detail rendering',
      };
    }
    
    // Default to fal.ai for general use
    return {
      provider: IMAGE_PROVIDERS.falai,
      reason: 'General scene - versatile rendering',
    };
  }
  
  /**
   * Select providers for all scenes needing images
   */
  selectProvidersForScenes(
    scenes: Array<{
      sceneIndex: number;
      contentType: string;
      sceneType: string;
      visualDirection: string;
      needsImage: boolean;
    }>
  ): Map<number, ImageProviderSelection> {
    const selections = new Map<number, ImageProviderSelection>();
    
    scenes
      .filter(s => s.needsImage)
      .forEach(scene => {
        const selection = this.selectProvider(
          scene.contentType,
          scene.sceneType,
          scene.visualDirection
        );
        selections.set(scene.sceneIndex, selection);
      });
    
    // Log summary
    const fluxCount = Array.from(selections.values())
      .filter(s => s.provider.id === 'flux').length;
    const falaiCount = Array.from(selections.values())
      .filter(s => s.provider.id === 'falai').length;
    
    console.log(`[ImageProvider] Selection: Flux.1: ${fluxCount}, fal.ai: ${falaiCount}`);
    
    return selections;
  }
}

export const imageProviderSelector = new ImageProviderSelectorService();
```

---

## Step 2: Create Image Generation Service

Create `server/services/image-generation-service.ts`:

```typescript
// server/services/image-generation-service.ts

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
  
  /**
   * Generate image using selected provider
   */
  async generateImage(options: ImageGenerationOptions): Promise<GeneratedImage> {
    const provider = options.provider || 'falai';
    
    console.log(`[ImageGen] Generating with ${provider}: ${options.prompt.substring(0, 50)}...`);
    
    if (provider === 'flux') {
      return this.generateWithFlux(options);
    } else {
      return this.generateWithFalAI(options);
    }
  }
  
  /**
   * Generate with Flux.1 (via API)
   */
  private async generateWithFlux(options: ImageGenerationOptions): Promise<GeneratedImage> {
    const width = options.width || 1280;
    const height = options.height || 720;
    
    try {
      // Flux.1 API call (adjust endpoint based on your integration)
      const response = await fetch(process.env.FLUX_API_ENDPOINT || 'https://api.flux.ai/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.FLUX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: options.prompt,
          negative_prompt: options.negativePrompt || 'blurry, low quality, distorted',
          width,
          height,
          num_inference_steps: 30,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Flux API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      return {
        url: result.image_url || result.url,
        provider: 'flux',
        prompt: options.prompt,
        width,
        height,
      };
      
    } catch (error: any) {
      console.error('[ImageGen] Flux.1 failed:', error.message);
      // Fallback to fal.ai
      console.log('[ImageGen] Falling back to fal.ai');
      return this.generateWithFalAI(options);
    }
  }
  
  /**
   * Generate with fal.ai
   */
  private async generateWithFalAI(options: ImageGenerationOptions): Promise<GeneratedImage> {
    const width = options.width || 1280;
    const height = options.height || 720;
    
    try {
      const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${process.env.FAL_API_KEY}`,
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
        throw new Error(`fal.ai API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      return {
        url: result.images?.[0]?.url || result.url,
        provider: 'falai',
        prompt: options.prompt,
        width,
        height,
      };
      
    } catch (error: any) {
      console.error('[ImageGen] fal.ai failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Generate images for multiple scenes
   */
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
```

---

## Step 3: Update Generation Preview Panel

Add image generation section to `generation-preview-panel.tsx`:

```tsx
{/* Image Generation */}
<div className="bg-white rounded-lg p-3 border">
  <div className="flex items-center gap-2 text-gray-500 mb-2">
    <ImageIcon className="h-4 w-4" />
    <span className="text-xs font-medium">Image Generation</span>
  </div>
  <div className="space-y-1.5">
    {estimate.providers.images?.flux > 0 && (
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-800">
          Flux.1
        </Badge>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {estimate.providers.images.flux} images
          </span>
          <span className="text-xs text-gray-400">
            (products)
          </span>
        </div>
      </div>
    )}
    {estimate.providers.images?.falai > 0 && (
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs bg-teal-100 text-teal-800">
          fal.ai
        </Badge>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {estimate.providers.images.falai} images
          </span>
          <span className="text-xs text-gray-400">
            (lifestyle)
          </span>
        </div>
      </div>
    )}
    {(!estimate.providers.images?.flux && !estimate.providers.images?.falai) && (
      <p className="text-xs text-gray-400">No standalone images needed</p>
    )}
  </div>
</div>
```

---

## Step 4: Update Generation Estimate API

Add image provider calculations to the estimate endpoint:

```typescript
// Calculate image provider selections
const scenesNeedingImages = scenes.filter((s: any) => 
  s.needsImage || 
  s.sceneType === 'product' || 
  !s.videoUrl // Scenes without video need images
);

const imageProviderCounts = { flux: 0, falai: 0 };
scenesNeedingImages.forEach((scene: any) => {
  const selection = imageProviderSelector.selectProvider(
    scene.contentType || 'lifestyle',
    scene.type,
    scene.visualDirection || ''
  );
  if (selection.provider.id === 'flux') {
    imageProviderCounts.flux++;
  } else {
    imageProviderCounts.falai++;
  }
});

// Add to response
res.json({
  // ... existing fields
  providers: {
    video: providerCounts,
    voiceover: 'ElevenLabs',
    music: project.musicEnabled !== false ? 'Udio AI (via PiAPI)' : 'Disabled',
    soundFx: 'Kling Sound', // Fixed from Runway Sound
    images: imageProviderCounts,
  },
  costs: {
    // ... existing costs
    images: (imageProviderCounts.flux * 0.03 + imageProviderCounts.falai * 0.02).toFixed(2),
  },
});
```

---

## Verification Checklist

Before moving to Phase 7C, confirm:

- [ ] Image provider selector created
- [ ] Selection based on content type (product → Flux, lifestyle → fal.ai)
- [ ] Image generation service supports both providers
- [ ] Fallback from Flux to fal.ai on failure
- [ ] Generation Preview shows image provider breakdown
- [ ] Image counts displayed correctly
- [ ] Cost calculation includes image generation

---

## Example Output

```
[ImageProvider] Selection: Flux.1: 4, fal.ai: 6

Scene 2 (product): Flux.1 - "Product/object focus - clean commercial quality"
Scene 4 (lifestyle): fal.ai - "Lifestyle/people - natural authentic feel"
Scene 7 (food): Flux.1 - "Food/ingredients - accurate detail rendering"
...
```

---

## Next Phase

Once Image Generation Pipeline is working, proceed to **Phase 7C: Sound Design Correction** to fix the Kling Sound integration.
