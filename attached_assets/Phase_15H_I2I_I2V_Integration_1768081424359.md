# Phase 15H: I2I/I2V Integration and Workflow Override

## Overview

This phase addresses three critical issues discovered during testing:

1. **I2I/I2V not being called** - Brand assets are overlaid, not integrated
2. **Wrong providers used** - Only Kling 1.6 and Flux despite Premium tier
3. **No workflow override** - Can't disable brand asset matching for a scene

---

## Issue 1: I2I/I2V Not Actually Being Called

### Current Behavior (Broken)

When "Product Hero Workflow" is triggered:

```
Step 1: Generate AI background with Flux (Txt2Img)        ✅ Happening
Step 2: Overlay product photo on top (static composite)   ✅ Happening
Step 3: Apply Ken Burns to final composite                ✅ Happening

MISSING: Use product photo as I2I reference for generation
MISSING: Use product photo as I2V source for video
```

**Result:** Product just "floats" on generic AI background - not integrated into scene.

### Expected Behavior (Fixed)

For **Image-to-Image (I2I)** scenes:
```
Step 1: Send brand asset to I2I endpoint as reference
Step 2: Generate NEW image that incorporates the asset naturally
Step 3: Asset is part of the generated scene, not overlaid
```

For **Image-to-Video (I2V)** scenes:
```
Step 1: Send brand asset to I2V endpoint as first frame
Step 2: Generate video that animates FROM that image
Step 3: Brand asset is the foundation, with AI-generated motion
```

---

### Fix: Implement Actual I2I Calls

```typescript
// server/services/image-generation-service.ts

interface I2IRequest {
  referenceImageUrl: string;     // Brand asset URL
  prompt: string;                // Scene visual direction
  strength: number;              // 0.3-0.8 (how much to change)
  provider: string;              // flux-kontext, gpt-image-1.5, etc.
}

/**
 * Generate image using Image-to-Image with brand asset as reference
 */
export async function generateImageToImage(
  request: I2IRequest
): Promise<GeneratedImage> {
  
  console.log(`[I2I] Reference: ${request.referenceImageUrl}`);
  console.log(`[I2I] Provider: ${request.provider}`);
  console.log(`[I2I] Strength: ${request.strength}`);
  
  // Call PiAPI I2I endpoint
  const response = await fetch('https://api.piapi.ai/api/v1/task', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PIAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: mapProviderToModel(request.provider),
      task_type: 'img2img',  // <-- CRITICAL: Must be img2img, not txt2img
      input: {
        image_url: request.referenceImageUrl,
        prompt: request.prompt,
        strength: request.strength,  // How much to deviate from reference
        guidance_scale: 7.5,
      },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`I2I generation failed: ${await response.text()}`);
  }
  
  const result = await response.json();
  return await pollForImageCompletion(result.task_id);
}

/**
 * Map our provider IDs to PiAPI model names
 */
function mapProviderToModel(provider: string): string {
  const mapping: Record<string, string> = {
    'flux-kontext': 'Qubico/flux1-dev-advanced',
    'flux-1.1-pro': 'flux-pro',
    'gpt-image-1.5': 'gpt-image-1.5',
    'stable-diffusion-3': 'sd3',
    // Add more mappings
  };
  return mapping[provider] || 'flux-pro';
}
```

---

### Fix: Implement Actual I2V Calls

```typescript
// server/services/video-generation-service.ts

interface I2VRequest {
  sourceImageUrl: string;        // Brand asset URL
  motionPrompt: string;          // What motion to apply
  duration: number;              // Seconds
  provider: string;              // kling-2.6, veo-3.1, etc.
  aspectRatio: string;
}

/**
 * Generate video using Image-to-Video with brand asset as first frame
 */
export async function generateImageToVideo(
  request: I2VRequest
): Promise<GeneratedVideo> {
  
  console.log(`[I2V] Source image: ${request.sourceImageUrl}`);
  console.log(`[I2V] Provider: ${request.provider}`);
  console.log(`[I2V] Motion prompt: ${request.motionPrompt}`);
  
  // Map provider to PiAPI model
  const modelMap: Record<string, string> = {
    'kling-2.6': 'kling-v2.6',
    'kling-2.6-pro': 'kling-v2.6-pro',
    'kling-2.5': 'kling-v2.5',
    'veo-3.1': 'veo-3.1',
    'runway-gen3': 'runway-gen3-turbo',
    'luma-ray2': 'luma-ray2',
    'hailuo': 'hailuo-minimax',
    'wan-2.6': 'wan-2.6',
  };
  
  const model = modelMap[request.provider] || 'kling-v2.6';
  
  // Call PiAPI I2V endpoint
  const response = await fetch('https://api.piapi.ai/api/v1/task', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PIAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      task_type: 'img2video',  // <-- CRITICAL: Must be img2video
      input: {
        image_url: request.sourceImageUrl,
        prompt: request.motionPrompt,
        duration: Math.min(request.duration, 10),
        aspect_ratio: request.aspectRatio,
        // Provider-specific options
        ...(model.includes('kling') && {
          mode: 'pro',  // Use pro mode for better quality
          cfg_scale: 0.5,
        }),
      },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`I2V generation failed: ${await response.text()}`);
  }
  
  const result = await response.json();
  return await pollForVideoCompletion(result.task_id);
}
```

---

### Update Product Hero Workflow

```typescript
// server/services/workflows/product-hero-workflow.ts

export async function executeProductHeroWorkflow(
  scene: Scene,
  brandAsset: BrandAsset,
  qualityTier: QualityTier
): Promise<GeneratedMedia> {
  
  console.log(`[ProductHero] Starting workflow for scene ${scene.id}`);
  console.log(`[ProductHero] Brand asset: ${brandAsset.name}`);
  console.log(`[ProductHero] Quality tier: ${qualityTier}`);
  
  // Step 1: Decide generation mode
  const isVideoScene = shouldGenerateVideo(scene, qualityTier);
  
  if (isVideoScene) {
    // ═══════════════════════════════════════════════════════════
    // VIDEO PATH: Use I2V to animate the product photo
    // ═══════════════════════════════════════════════════════════
    
    const provider = selectI2VProvider(qualityTier);
    
    // Create motion prompt (focus on subtle product movement)
    const motionPrompt = createProductMotionPrompt(scene.visualDirection);
    
    console.log(`[ProductHero] Using I2V with ${provider}`);
    
    const video = await generateImageToVideo({
      sourceImageUrl: brandAsset.fileUrl,
      motionPrompt,
      duration: scene.duration,
      provider,
      aspectRatio: '16:9',
    });
    
    return {
      type: 'video',
      url: video.url,
      generationType: 'i2v',
      sourceAsset: brandAsset.id,
    };
    
  } else {
    // ═══════════════════════════════════════════════════════════
    // IMAGE PATH: Use I2I to generate scene with product integrated
    // ═══════════════════════════════════════════════════════════
    
    const provider = selectI2IProvider(qualityTier);
    
    // Create prompt that incorporates the product into the scene
    const integrationPrompt = createProductIntegrationPrompt(
      scene.visualDirection,
      brandAsset.name
    );
    
    console.log(`[ProductHero] Using I2I with ${provider}`);
    
    const image = await generateImageToImage({
      referenceImageUrl: brandAsset.fileUrl,
      prompt: integrationPrompt,
      strength: 0.6,  // Keep 40% of original, generate 60% new
      provider,
    });
    
    return {
      type: 'image',
      url: image.url,
      generationType: 'i2i',
      sourceAsset: brandAsset.id,
    };
  }
}

/**
 * Create a prompt that naturally integrates the product
 */
function createProductIntegrationPrompt(
  visualDirection: string,
  productName: string
): string {
  return `${visualDirection}. 
The ${productName} products should be naturally integrated into the scene, 
appearing as part of the environment rather than floating or overlaid. 
Products should have realistic lighting and shadows matching the scene.`;
}

/**
 * Create motion prompt for product video
 */
function createProductMotionPrompt(visualDirection: string): string {
  // Extract any motion cues from visual direction
  const hasMotionCues = /pan|zoom|rotate|spin|reveal/i.test(visualDirection);
  
  if (hasMotionCues) {
    return visualDirection;
  }
  
  // Default subtle product motion
  return 'subtle camera push in, gentle lighting shifts, product remains stable and prominent';
}
```

---

## Issue 2: Wrong Providers Being Used

### Current Behavior (Broken)

Despite selecting "Premium" tier:
- Images: Only Flux (cheapest)
- Videos: Only Kling 1.6 (not even Kling 2.6!)

### Root Cause

Provider selection is likely hardcoded or not reading from quality tier config.

### Fix: Implement Quality-Aware Provider Selection

```typescript
// server/services/provider-selector.ts

import { QUALITY_TIERS, QualityTier } from '@/shared/config/quality-tiers';

/**
 * Select image provider based on quality tier and scene requirements
 */
export function selectImageProvider(
  qualityTier: QualityTier,
  requirements?: {
    needsI2I?: boolean;
    needsTextRendering?: boolean;
    needsPhotorealism?: boolean;
  }
): string {
  
  const tierConfig = QUALITY_TIERS[qualityTier];
  
  // If specific requirements, filter providers
  if (requirements?.needsI2I) {
    // Providers that support I2I
    const i2iProviders = ['flux-kontext', 'flux-1.1-pro', 'gpt-image-1.5'];
    const available = tierConfig.preferredImageProviders.filter(p => 
      i2iProviders.includes(p)
    );
    if (available.length > 0) return available[0];
  }
  
  if (requirements?.needsTextRendering) {
    // Providers good at text
    const textProviders = ['gpt-image-1.5', 'ideogram-v2', 'flux-1.1-pro'];
    const available = tierConfig.preferredImageProviders.filter(p => 
      textProviders.includes(p)
    );
    if (available.length > 0) return available[0];
  }
  
  // Default: first preferred provider for tier
  const provider = tierConfig.preferredImageProviders[0];
  
  console.log(`[ProviderSelect] Image provider for ${qualityTier}: ${provider}`);
  
  return provider;
}

/**
 * Select video provider based on quality tier and scene requirements
 */
export function selectVideoProvider(
  qualityTier: QualityTier,
  requirements?: {
    needsI2V?: boolean;
    needsAudio?: boolean;
    needsMotionControl?: boolean;
  }
): string {
  
  const tierConfig = QUALITY_TIERS[qualityTier];
  
  // If specific requirements, filter providers
  if (requirements?.needsI2V) {
    // All our video providers support I2V
    // But some are better at it
    const bestI2V = ['kling-2.6-pro', 'kling-2.6', 'veo-3.1', 'runway-gen3-turbo'];
    const available = tierConfig.preferredVideoProviders.filter(p => 
      bestI2V.includes(p)
    );
    if (available.length > 0) return available[0];
  }
  
  if (requirements?.needsAudio) {
    // Providers with native audio generation
    const audioProviders = ['kling-2.6-pro', 'kling-2.6', 'veo-3.1'];
    const available = tierConfig.preferredVideoProviders.filter(p => 
      audioProviders.includes(p)
    );
    if (available.length > 0) return available[0];
  }
  
  // Default: first preferred provider for tier
  const provider = tierConfig.preferredVideoProviders[0];
  
  console.log(`[ProviderSelect] Video provider for ${qualityTier}: ${provider}`);
  
  // CRITICAL: Validate we're not falling back to old providers
  if (provider === 'kling-1.6' || provider === 'kling-v1.6') {
    console.error(`[ProviderSelect] WARNING: Selected deprecated Kling 1.6!`);
    // Force upgrade to Kling 2.6
    return 'kling-2.6';
  }
  
  return provider;
}
```

### Verify Provider Registry Has Correct Models

```typescript
// server/config/video-providers.ts

// REMOVE or deprecate Kling 1.6
export const VIDEO_PROVIDERS = {
  // DON'T USE - Deprecated
  // 'kling-1.6': { ... },
  
  // Use these instead:
  'kling-2.6': {
    id: 'kling-2.6',
    piapiModel: 'kling-v2-master',  // Verify this is correct PiAPI model name
    capabilities: { t2v: true, i2v: true, audio: true },
    costPer10s: 0.39,
    quality: 'excellent',
  },
  
  'kling-2.6-pro': {
    id: 'kling-2.6-pro',
    piapiModel: 'kling-v2-master-pro',
    capabilities: { t2v: true, i2v: true, audio: true },
    costPer10s: 0.66,
    quality: 'cinematic',
  },
  
  // ... other providers
};
```

---

## Issue 3: UI Toggle to Disable Brand Asset Workflow

### Problem

Scene 5 shows "Product Hero Workflow" with 80% match, but the scene is about:
> "Comfortable home environment with woman opening at-home test kit"

The scene is about the **environment and action**, not showcasing the product. Forcing "Product Hero Workflow" is wrong here.

### Solution: Add "Use Brand Assets" Toggle

```tsx
// client/src/components/scene-editor/WorkflowOverrideToggle.tsx

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertCircle, Package } from 'lucide-react';

interface WorkflowOverrideToggleProps {
  sceneId: string;
  useBrandAssets: boolean;
  onChange: (value: boolean) => void;
  matchedAssetsCount: number;
  suggestedWorkflow: string;
}

export function WorkflowOverrideToggle({
  sceneId,
  useBrandAssets,
  onChange,
  matchedAssetsCount,
  suggestedWorkflow,
}: WorkflowOverrideToggleProps) {
  
  return (
    <div className="p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-600" />
          <Label htmlFor={`brand-assets-${sceneId}`} className="font-medium">
            Use Brand Assets
          </Label>
        </div>
        <Switch
          id={`brand-assets-${sceneId}`}
          checked={useBrandAssets}
          onCheckedChange={onChange}
        />
      </div>
      
      {useBrandAssets && matchedAssetsCount > 0 && (
        <div className="mt-2 text-sm text-gray-600">
          {matchedAssetsCount} asset{matchedAssetsCount > 1 ? 's' : ''} matched → {suggestedWorkflow}
        </div>
      )}
      
      {!useBrandAssets && (
        <div className="mt-2 text-sm text-amber-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Brand assets disabled - using standard AI generation
        </div>
      )}
    </div>
  );
}
```

### Update Scene Schema

```sql
-- Add column to scenes table
ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS use_brand_assets BOOLEAN DEFAULT true;
```

### Update Scene Editor

```tsx
// In SceneEditor component

const [useBrandAssets, setUseBrandAssets] = useState(scene.useBrandAssets ?? true);

// When workflow section renders:
<WorkflowOverrideToggle
  sceneId={scene.id}
  useBrandAssets={useBrandAssets}
  onChange={(value) => {
    setUseBrandAssets(value);
    updateScene({ useBrandAssets: value });
  }}
  matchedAssetsCount={matchedAssets.length}
  suggestedWorkflow={workflowDecision.workflowName}
/>

{/* Only show workflow details if brand assets enabled */}
{useBrandAssets && matchedAssets.length > 0 && (
  <WorkflowCard workflow={workflowDecision} />
)}
```

### Update Generation Logic

```typescript
// server/services/media-source-selector.ts

export function selectMediaSource(
  scene: Scene,
  matchedAssets: AssetMatch[],
  qualityTier: QualityTier
): MediaSourceDecision {
  
  // ═══════════════════════════════════════════════════════════════
  // CHECK: Is brand asset usage disabled for this scene?
  // ═══════════════════════════════════════════════════════════════
  
  if (scene.useBrandAssets === false) {
    console.log(`[MediaSource] Brand assets disabled for scene ${scene.id}`);
    
    // Use standard AI generation (T2V or Image based on tier)
    if (qualityTier === 'ultra' || qualityTier === 'premium') {
      return {
        mediaType: 't2v',
        provider: selectVideoProvider(qualityTier),
        reason: 'Brand assets disabled - using T2V (Premium/Ultra tier)',
      };
    }
    
    return {
      mediaType: 'image-motion',
      provider: selectImageProvider(qualityTier),
      reason: 'Brand assets disabled - using standard AI generation',
    };
  }
  
  // Continue with normal brand asset matching logic...
  // (rest of the function)
}
```

---

## Summary of Changes

### Phase 15H Checklist

1. **I2I Integration**
   - [ ] Add `generateImageToImage()` function
   - [ ] Call PiAPI with `task_type: 'img2img'`
   - [ ] Use brand asset as reference image
   - [ ] Set appropriate strength (0.5-0.7)

2. **I2V Integration**
   - [ ] Add `generateImageToVideo()` function
   - [ ] Call PiAPI with `task_type: 'img2video'`
   - [ ] Use brand asset as source frame
   - [ ] Create motion prompts for product animation

3. **Provider Selection**
   - [ ] Implement `selectImageProvider()` with tier awareness
   - [ ] Implement `selectVideoProvider()` with tier awareness
   - [ ] Remove/deprecate Kling 1.6 references
   - [ ] Verify PiAPI model name mappings

4. **Workflow Override UI**
   - [ ] Add `use_brand_assets` column to scenes table
   - [ ] Add `WorkflowOverrideToggle` component
   - [ ] Update scene editor to show toggle
   - [ ] Update generation logic to respect toggle

---

## Testing

### Test Case 1: I2I Actually Called

1. Create scene with product-hero workflow
2. Generate image
3. Check PiAPI task history
4. **Expected:** See `img2img` task (not `txt2img`)
5. **Expected:** Product is integrated into scene, not floating overlay

### Test Case 2: I2V Actually Called

1. Create scene with location-interior brand asset
2. Select Premium tier
3. Generate video
4. Check PiAPI task history
5. **Expected:** See `img2video` task
6. **Expected:** Video starts from brand asset, adds motion

### Test Case 3: Correct Providers Used

1. Select Premium tier
2. Generate assets
3. Check PiAPI task history
4. **Expected:** See Kling 2.6 or Veo (not Kling 1.6)
5. **Expected:** See Flux Pro or Midjourney (not just Flux Schnell)

### Test Case 4: Disable Brand Assets for Scene

1. Open Scene 5 editor
2. Toggle OFF "Use Brand Assets"
3. Save
4. Generate
5. **Expected:** Standard AI generation, no product overlay
6. **Expected:** Scene focuses on environment/action as intended

---

## Success Criteria

Phase 15H is complete when:

1. ✅ PiAPI shows `img2img` tasks when I2I is used
2. ✅ PiAPI shows `img2video` tasks when I2V is used
3. ✅ Products are integrated INTO scenes, not overlaid on top
4. ✅ Premium tier uses Kling 2.6+, Veo, Flux Pro (not Kling 1.6)
5. ✅ UI has toggle to disable brand asset matching per scene
6. ✅ Disabled scenes use standard AI generation
