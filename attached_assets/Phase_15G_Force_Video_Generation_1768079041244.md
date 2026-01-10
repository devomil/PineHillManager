# Phase 15G: Force Video Generation for Premium/Ultra Tiers

## Objective

When users select **Premium** or **Ultra** quality tiers, the system MUST generate actual AI video (Text-to-Video or Image-to-Video) for EVERY scene. Image + Ken Burns is NOT acceptable for broadcast quality.

---

## The Problem

### Current Behavior

Even when "Premium" is selected:
- 95% of scenes use **Image Generation + Ken Burns effect**
- Only 5% use actual video generation
- Result: Animated slideshow, NOT broadcast-quality video

### Evidence from Testing

| Scene | Expected | Actual |
|-------|----------|--------|
| Hook (B-Roll) | AI Video of woman in wellness space | Static image + Ken Burns |
| Solution | AI Video of personalized care | Static image + Ken Burns |
| Brand | AI Video of brand environment | Static image + Ken Burns |
| Explanation | AI Video of health approach | Static image + Ken Burns |
| Benefit | AI Video of lab testing | Static image + Ken Burns |

**Quality scores (Q: 82-88) are misleading** - they're scoring image quality, not video quality.

---

## Root Cause

The current routing logic in media source selection:

```typescript
// CURRENT (BROKEN)
function selectMediaSource(scene, qualityTier) {
  // Always defaults to cheapest option
  if (canUseImage(scene)) {
    return { type: 'image', postProcess: 'ken-burns' };  // ❌ Always chosen
  }
  return { type: 'video' };  // ❌ Rarely reached
}
```

**Problem:** No consideration of quality tier in the decision.

---

## The Fix

### New Media Type Rules by Quality Tier

| Quality Tier | Allowed Media Types | Ken Burns Allowed? |
|--------------|--------------------|--------------------|
| **Ultra** | T2V, I2V only | ❌ Never |
| **Premium** | T2V, I2V only | ❌ Never |
| **Standard** | T2V, I2V, Image+Motion | ⚠️ Limited |

### Updated Decision Logic

```typescript
// server/services/media-source-selector.ts

export type MediaType = 
  | 't2v'           // Text-to-Video (AI generates video from prompt)
  | 'i2v'           // Image-to-Video (AI animates uploaded image)
  | 'image-motion'  // Image + Ken Burns/pan effect
  | 'stock';        // Stock footage fallback

interface MediaSourceDecision {
  mediaType: MediaType;
  provider: string;
  sourceAsset?: BrandAsset;
  reason: string;
}

/**
 * Select media source based on quality tier and scene requirements
 */
export function selectMediaSource(
  scene: Scene,
  matchedAssets: AssetMatch[],
  qualityTier: QualityTier
): MediaSourceDecision {
  
  // ═══════════════════════════════════════════════════════════════
  // RULE 1: Premium/Ultra MUST use real video generation
  // ═══════════════════════════════════════════════════════════════
  
  if (qualityTier === 'ultra' || qualityTier === 'premium') {
    
    // Check if we have a brand asset to use for I2V
    const i2vAsset = findI2VAsset(matchedAssets);
    
    if (i2vAsset) {
      // Use I2V with the brand asset
      return {
        mediaType: 'i2v',
        provider: selectI2VProvider(qualityTier),
        sourceAsset: i2vAsset.asset,
        reason: `I2V with brand asset "${i2vAsset.asset.name}" (${qualityTier} tier requires video)`,
      };
    }
    
    // No brand asset - use T2V (Text-to-Video)
    return {
      mediaType: 't2v',
      provider: selectT2VProvider(qualityTier),
      reason: `T2V generation (${qualityTier} tier requires video, no brand asset matched)`,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // RULE 2: Standard tier can use image+motion for some scenes
  // ═══════════════════════════════════════════════════════════════
  
  if (qualityTier === 'standard') {
    
    // Check if we have a brand asset for I2V
    const i2vAsset = findI2VAsset(matchedAssets);
    
    if (i2vAsset) {
      return {
        mediaType: 'i2v',
        provider: selectI2VProvider(qualityTier),
        sourceAsset: i2vAsset.asset,
        reason: `I2V with brand asset "${i2vAsset.asset.name}"`,
      };
    }
    
    // For standard tier, allow image+motion for simple scenes
    if (isSimpleScene(scene)) {
      return {
        mediaType: 'image-motion',
        provider: selectImageProvider(qualityTier),
        reason: 'Image + Ken Burns (standard tier, simple scene)',
      };
    }
    
    // Complex scenes still need T2V even at standard tier
    return {
      mediaType: 't2v',
      provider: selectT2VProvider(qualityTier),
      reason: 'T2V generation (complex scene requires video)',
    };
  }
  
  // Default fallback
  return {
    mediaType: 't2v',
    provider: selectT2VProvider(qualityTier),
    reason: 'T2V generation (default)',
  };
}

/**
 * Determine if a scene is "simple" enough for image+motion
 * Only used for Standard tier
 */
function isSimpleScene(scene: Scene): boolean {
  const direction = scene.visualDirection.toLowerCase();
  
  // Scenes that REQUIRE actual video motion
  const requiresVideo = [
    'walking', 'running', 'moving', 'action',
    'speaking', 'talking', 'conversation',
    'pouring', 'flowing', 'cooking',
    'demonstration', 'showing', 'presenting',
    'montage', 'sequence', 'transition',
    'hands', 'gesture', 'interaction',
  ];
  
  // If any motion keyword is present, it's NOT simple
  for (const keyword of requiresVideo) {
    if (direction.includes(keyword)) {
      return false;
    }
  }
  
  // Static scenes might be acceptable for image+motion
  const staticIndicators = [
    'still', 'static', 'background', 'environment',
    'product shot', 'display', 'arrangement',
    'landscape', 'exterior', 'interior view',
  ];
  
  for (const indicator of staticIndicators) {
    if (direction.includes(indicator)) {
      return true;
    }
  }
  
  // Default: NOT simple (use video)
  return false;
}
```

---

## Provider Selection by Tier

```typescript
// server/services/media-source-selector.ts (continued)

/**
 * Select T2V (Text-to-Video) provider based on quality tier
 */
function selectT2VProvider(qualityTier: QualityTier): string {
  const providers: Record<QualityTier, string[]> = {
    ultra: [
      'veo-3.1',           // Best cinematic quality
      'kling-2.6-pro',     // Excellent + native audio
      'kling-2.6-mc-pro',  // Motion control
      'runway-gen3-turbo', // Hollywood-grade
    ],
    premium: [
      'kling-2.6-pro',     // Great quality
      'veo-3.1',           // Cinematic
      'kling-2.6',         // Good value
      'luma-ray2',         // Product shots
    ],
    standard: [
      'kling-2.6',         // Balanced
      'kling-2.5',         // Consistent
      'wan-2.6',           // Fast
      'hailuo-minimax',    // Budget
    ],
  };
  
  // Return first available provider
  return providers[qualityTier][0];
}

/**
 * Select I2V (Image-to-Video) provider based on quality tier
 */
function selectI2VProvider(qualityTier: QualityTier): string {
  const providers: Record<QualityTier, string[]> = {
    ultra: [
      'kling-2.6-pro',     // Best I2V quality
      'veo-3.1',           // Cinematic
      'runway-gen3-turbo', // Excellent motion
    ],
    premium: [
      'kling-2.6',         // Great I2V
      'kling-2.6-pro',     // Higher quality
      'luma-ray2',         // Good for products
    ],
    standard: [
      'kling-2.6',         // Good I2V
      'kling-2.5',         // Consistent
      'wan-2.6',           // Fast
    ],
  };
  
  return providers[qualityTier][0];
}
```

---

## Update Video Generation Service

```typescript
// server/services/video-generation-service.ts

export async function generateSceneMedia(
  scene: Scene,
  project: Project,
  qualityTier: QualityTier
): Promise<GeneratedMedia> {
  
  // Step 1: Find matching brand assets
  const matchedAssets = await findMatchingBrandAssets(
    project.id,
    scene.visualDirection
  );
  
  // Step 2: Decide media source (NOW CONSIDERS QUALITY TIER)
  const decision = selectMediaSource(scene, matchedAssets, qualityTier);
  
  console.log(`[MediaGen] Scene ${scene.id}: ${decision.mediaType} via ${decision.provider}`);
  console.log(`[MediaGen] Reason: ${decision.reason}`);
  
  // Step 3: Generate based on decision
  switch (decision.mediaType) {
    
    case 't2v':
      // TEXT-TO-VIDEO: Generate actual video from prompt
      return await generateTextToVideo(
        scene.visualDirection,
        decision.provider,
        scene.duration,
        project.aspectRatio
      );
    
    case 'i2v':
      // IMAGE-TO-VIDEO: Animate brand asset
      return await generateImageToVideo(
        decision.sourceAsset!.fileUrl,
        scene.visualDirection,
        decision.provider,
        scene.duration,
        project.aspectRatio
      );
    
    case 'image-motion':
      // IMAGE + MOTION: Only for Standard tier simple scenes
      return await generateImageWithMotion(
        scene.visualDirection,
        scene.duration,
        project.aspectRatio
      );
    
    case 'stock':
      // STOCK FOOTAGE: Fallback for impossible prompts
      return await findStockFootage(
        scene.visualDirection,
        scene.duration
      );
    
    default:
      throw new Error(`Unknown media type: ${decision.mediaType}`);
  }
}

/**
 * Generate actual video using Text-to-Video
 */
async function generateTextToVideo(
  prompt: string,
  provider: string,
  duration: number,
  aspectRatio: string
): Promise<GeneratedMedia> {
  
  console.log(`[T2V] Generating ${duration}s video with ${provider}`);
  console.log(`[T2V] Prompt: ${prompt.substring(0, 100)}...`);
  
  // Call PiAPI for video generation
  const result = await piapiClient.generateVideo({
    model: provider,
    mode: 't2v',  // Text-to-Video
    prompt,
    duration: Math.min(duration, 10),
    aspectRatio,
  });
  
  return {
    type: 'video',
    url: result.videoUrl,
    thumbnailUrl: result.thumbnailUrl,
    duration: result.duration,
    provider,
    generationType: 't2v',
  };
}

/**
 * Generate video by animating an image (I2V)
 */
async function generateImageToVideo(
  imageUrl: string,
  motionPrompt: string,
  provider: string,
  duration: number,
  aspectRatio: string
): Promise<GeneratedMedia> {
  
  console.log(`[I2V] Animating image with ${provider}`);
  console.log(`[I2V] Source: ${imageUrl}`);
  
  // Create motion-focused prompt
  const prompt = createMotionPrompt(motionPrompt);
  
  const result = await piapiClient.generateVideo({
    model: provider,
    mode: 'i2v',  // Image-to-Video
    imageUrl,
    prompt,
    duration: Math.min(duration, 10),
    aspectRatio,
  });
  
  return {
    type: 'video',
    url: result.videoUrl,
    thumbnailUrl: result.thumbnailUrl,
    duration: result.duration,
    provider,
    generationType: 'i2v',
    sourceImageUrl: imageUrl,
  };
}
```

---

## UI Updates

### Show Media Type in Scene Card

```tsx
// client/src/components/scene-card/MediaTypeIndicator.tsx

interface MediaTypeIndicatorProps {
  mediaType: 't2v' | 'i2v' | 'image-motion' | 'stock';
  provider: string;
}

export function MediaTypeIndicator({ mediaType, provider }: MediaTypeIndicatorProps) {
  const configs = {
    't2v': {
      label: 'AI Video',
      icon: Video,
      color: 'text-green-600 bg-green-50',
      description: 'Real AI-generated motion',
    },
    'i2v': {
      label: 'Brand Video',
      icon: ImagePlay,
      color: 'text-blue-600 bg-blue-50',
      description: 'Animated brand photo',
    },
    'image-motion': {
      label: 'Image + Motion',
      icon: Image,
      color: 'text-amber-600 bg-amber-50',
      description: 'Ken Burns effect',
    },
    'stock': {
      label: 'Stock',
      icon: Film,
      color: 'text-gray-600 bg-gray-50',
      description: 'Stock footage',
    },
  };
  
  const config = configs[mediaType];
  const Icon = config.icon;
  
  return (
    <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded text-xs', config.color)}>
      <Icon className="w-3 h-3" />
      <span className="font-medium">{config.label}</span>
    </div>
  );
}
```

### Warn if Premium Tier Has Image-Motion

```tsx
// client/src/components/generation-preview/QualityWarning.tsx

interface QualityWarningProps {
  qualityTier: QualityTier;
  scenes: Scene[];
}

export function QualityWarning({ qualityTier, scenes }: QualityWarningProps) {
  // Count scenes that would use image-motion
  const imageMotionScenes = scenes.filter(s => 
    s.predictedMediaType === 'image-motion'
  );
  
  if (qualityTier === 'standard' || imageMotionScenes.length === 0) {
    return null;
  }
  
  return (
    <Alert className="bg-amber-50 border-amber-200">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        <strong>{qualityTier === 'ultra' ? 'Ultra' : 'Premium'} tier selected:</strong>
        {' '}All {scenes.length} scenes will use AI video generation.
        This ensures broadcast-quality motion, not slideshow effects.
      </AlertDescription>
    </Alert>
  );
}
```

---

## Cost Implications

When Premium/Ultra is selected, costs increase because EVERY scene uses T2V or I2V:

| Scene Count | Standard (Image+Motion) | Premium (T2V) | Ultra (T2V + Multi-pass) |
|-------------|------------------------|---------------|--------------------------|
| 10 scenes | ~$1.50 | ~$6.00 | ~$20.00 |
| (5s each) | $0.15/scene | $0.60/scene | $2.00/scene |

**This is expected and correct.** Users choosing Premium are paying for real video, not Ken Burns effects.

---

## Testing

### Test Case 1: Premium Tier Forces Video

1. Create project with 10 scenes
2. Select "Premium" quality tier
3. Click "Generate Assets"
4. **Expected:** ALL 10 scenes use T2V or I2V
5. **Expected:** Console shows `[T2V] Generating...` for each scene
6. **Expected:** NO scenes use image-motion

### Test Case 2: Ultra Tier Forces Video

1. Select "Ultra" quality tier
2. Click "Generate Assets"
3. **Expected:** ALL scenes use T2V or I2V
4. **Expected:** Uses top-tier providers (Veo 3.1, Kling 2.6 Pro)

### Test Case 3: Standard Tier Allows Images

1. Select "Standard" quality tier
2. Click "Generate Assets"
3. **Expected:** Simple scenes MAY use image-motion
4. **Expected:** Complex scenes (with motion keywords) use T2V

### Test Case 4: I2V with Brand Assets

1. Upload "Pine Hill Farm Interior" photo
2. Classify as `location-interior-workspace`
3. Create scene with "consultation space" in visual direction
4. Select Premium tier
5. **Expected:** Uses I2V with the uploaded photo
6. **Expected:** Console shows `[I2V] Source: .../pine-hill-interior.jpg`

---

## Success Criteria

Phase 15G is complete when:

1. ✅ Premium tier: 100% of scenes use T2V or I2V (no image-motion)
2. ✅ Ultra tier: 100% of scenes use T2V or I2V (no image-motion)
3. ✅ Standard tier: Image-motion only for truly static scenes
4. ✅ Console logs show correct media type per scene
5. ✅ UI shows media type indicator (AI Video / Brand Video / Image+Motion)
6. ✅ Generated videos have actual motion, not Ken Burns
7. ✅ Cost estimates reflect video generation costs

---

## Summary

**The core fix:** Quality tier now CONTROLS whether scenes get real video or image effects.

| Tier | What You Get |
|------|--------------|
| **Ultra** | Real AI video for EVERY scene (Veo 3.1, Kling 2.6 Pro) |
| **Premium** | Real AI video for EVERY scene (Kling 2.6, Kling 2.6 Pro) |
| **Standard** | Mix of AI video and image+motion (cost-optimized) |

This ensures Premium/Ultra users get **actual broadcast-quality video**, not animated slideshows.
