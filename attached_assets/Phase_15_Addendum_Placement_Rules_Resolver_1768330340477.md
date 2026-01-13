# Phase 15 Addendum: Placement Rules to Generation Parameters

## Overview

Phase 15B defines `placementRules` for each asset type. Phase 14C has the I2I/I2V composition logic. This addendum connects them so that asset placement rules automatically control generation parameters.

---

## The Gap

### Phase 15B Defines (Asset Taxonomy):
```typescript
'logo-watermark': {
  placementRules: {
    typicalPosition: 'bottom-right',
    typicalScale: 'small',
    typicalOpacity: 0.3,
    animationStyle: 'none',
  }
}
```

### Phase 14C Needs (Generation Parameters):
```typescript
{
  position: { x: 90, y: 90 },  // Where does 'bottom-right' → {x, y}?
  scale: 0.1,                   // Where does 'small' → 0.1?
  opacity: 0.3,                 // Direct mapping
  strength: 0.6,                // For I2I - not defined in taxonomy!
}
```

### Missing Connection:
- `typicalPosition` → pixel/percentage coordinates
- `typicalScale` → numeric scale value
- Asset category → I2I strength value
- `animationStyle` → I2V motion prompt

---

## Solution: Placement Rules Resolver

### Step 1: Position Mapping

```typescript
// shared/config/placement-resolver.ts

export interface ResolvedPosition {
  x: number;      // 0-100 percentage from left
  y: number;      // 0-100 percentage from top
  anchor: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
}

/**
 * Convert typicalPosition to actual coordinates
 */
export function resolvePosition(
  typicalPosition: string,
  frameWidth: number = 1920,
  frameHeight: number = 1080
): ResolvedPosition {
  
  const positions: Record<string, ResolvedPosition> = {
    // Full frame positions
    'full-frame': { x: 50, y: 50, anchor: 'center' },
    'background': { x: 50, y: 50, anchor: 'center' },
    'center': { x: 50, y: 50, anchor: 'center' },
    
    // Corner positions (with padding)
    'top-left': { x: 8, y: 8, anchor: 'top-left' },
    'top-right': { x: 92, y: 8, anchor: 'top-right' },
    'bottom-left': { x: 8, y: 92, anchor: 'bottom-left' },
    'bottom-right': { x: 92, y: 92, anchor: 'bottom-right' },
    'corner': { x: 92, y: 92, anchor: 'bottom-right' },  // Default corner = bottom-right
    
    // Edge positions
    'top-center': { x: 50, y: 8, anchor: 'top-center' },
    'bottom-center': { x: 50, y: 92, anchor: 'bottom-center' },
    'left-center': { x: 8, y: 50, anchor: 'center' },
    'right-center': { x: 92, y: 50, anchor: 'center' },
    
    // Product-specific positions
    'product-hero': { x: 50, y: 65, anchor: 'bottom-center' },
    'product-left': { x: 30, y: 70, anchor: 'bottom-center' },
    'product-right': { x: 70, y: 70, anchor: 'bottom-center' },
    
    // Badge/certification row
    'badge-row': { x: 15, y: 88, anchor: 'bottom-left' },
  };
  
  return positions[typicalPosition] || positions['center'];
}
```

### Step 2: Scale Mapping

```typescript
// shared/config/placement-resolver.ts (continued)

export interface ResolvedScale {
  value: number;           // 0.0 to 2.0 multiplier
  maxWidth: number;        // Maximum width in pixels
  maxHeight: number;       // Maximum height in pixels
  minWidth: number;        // Minimum width in pixels
}

/**
 * Convert typicalScale to actual scale values
 */
export function resolveScale(
  typicalScale: string,
  frameWidth: number = 1920,
  frameHeight: number = 1080
): ResolvedScale {
  
  const scales: Record<string, ResolvedScale> = {
    'full': {
      value: 1.0,
      maxWidth: frameWidth,
      maxHeight: frameHeight,
      minWidth: frameWidth * 0.9,
    },
    'large': {
      value: 0.7,
      maxWidth: Math.round(frameWidth * 0.6),
      maxHeight: Math.round(frameHeight * 0.7),
      minWidth: Math.round(frameWidth * 0.4),
    },
    'medium': {
      value: 0.4,
      maxWidth: Math.round(frameWidth * 0.35),
      maxHeight: Math.round(frameHeight * 0.4),
      minWidth: Math.round(frameWidth * 0.2),
    },
    'small': {
      value: 0.15,
      maxWidth: Math.round(frameWidth * 0.15),
      maxHeight: Math.round(frameHeight * 0.15),
      minWidth: Math.round(frameWidth * 0.08),
    },
    'tiny': {
      value: 0.08,
      maxWidth: Math.round(frameWidth * 0.08),
      maxHeight: Math.round(frameHeight * 0.08),
      minWidth: Math.round(frameWidth * 0.05),
    },
  };
  
  return scales[typicalScale] || scales['medium'];
}
```

### Step 3: I2I Strength by Asset Category

```typescript
// shared/config/placement-resolver.ts (continued)

export interface I2IConfig {
  strength: number;           // 0.0-1.0: How much AI can alter the image
  guidanceScale: number;      // 5-15: How closely to follow prompt
  preserveComposition: boolean;
  description: string;
}

/**
 * Get I2I parameters based on asset category and type
 * 
 * Strength guide:
 * - 0.2-0.3: Minimal change (style transfer, color correction)
 * - 0.4-0.5: Moderate change (add elements, adjust lighting)
 * - 0.6-0.7: Significant change (new background, major alterations)
 * - 0.8-0.9: Major change (use image as loose reference only)
 */
export function getI2IConfig(
  assetCategory: string,
  assetType: string,
  useCase: 'background-generation' | 'style-transfer' | 'scene-integration' | 'product-placement'
): I2IConfig {
  
  // Category-based defaults
  const categoryDefaults: Record<string, I2IConfig> = {
    'location': {
      strength: 0.35,
      guidanceScale: 7.5,
      preserveComposition: true,
      description: 'Keep location recognizable, enhance lighting/atmosphere',
    },
    'products': {
      strength: 0.25,
      guidanceScale: 8.0,
      preserveComposition: true,
      description: 'Product must remain clearly visible and accurate',
    },
    'people': {
      strength: 0.30,
      guidanceScale: 7.0,
      preserveComposition: true,
      description: 'Person likeness must be preserved',
    },
    'logos': {
      strength: 0.15,
      guidanceScale: 9.0,
      preserveComposition: true,
      description: 'Logo must remain exact - minimal alterations',
    },
    'trust': {
      strength: 0.10,
      guidanceScale: 9.0,
      preserveComposition: true,
      description: 'Certifications must remain exact and readable',
    },
    'services': {
      strength: 0.40,
      guidanceScale: 7.0,
      preserveComposition: true,
      description: 'Equipment recognizable, environment can be enhanced',
    },
    'creative': {
      strength: 0.60,
      guidanceScale: 6.0,
      preserveComposition: false,
      description: 'Creative assets can be significantly adapted',
    },
    'documents': {
      strength: 0.20,
      guidanceScale: 8.0,
      preserveComposition: true,
      description: 'Document content must remain readable',
    },
  };
  
  // Use-case adjustments
  const useCaseAdjustments: Record<string, number> = {
    'background-generation': 0.15,    // Add 15% more change allowed
    'style-transfer': 0.10,           // Add 10% more change
    'scene-integration': 0.05,        // Slight increase
    'product-placement': -0.05,       // Decrease - preserve product more
  };
  
  const baseConfig = categoryDefaults[assetCategory] || categoryDefaults['creative'];
  const adjustment = useCaseAdjustments[useCase] || 0;
  
  return {
    ...baseConfig,
    strength: Math.min(0.9, Math.max(0.1, baseConfig.strength + adjustment)),
  };
}
```

### Step 4: I2V Motion Prompt Generator

```typescript
// shared/config/placement-resolver.ts (continued)

export interface I2VConfig {
  motionPrompt: string;
  motionIntensity: 'subtle' | 'moderate' | 'dynamic';
  cameraMovement: string;
  duration: number;
  fps: number;
}

/**
 * Generate I2V motion parameters from animation style
 */
export function getI2VConfig(
  animationStyle: string,
  assetCategory: string,
  sceneDuration: number = 5
): I2VConfig {
  
  const motionConfigs: Record<string, I2VConfig> = {
    'ken-burns': {
      motionPrompt: 'slow cinematic push in, subtle parallax movement, gentle lighting shifts',
      motionIntensity: 'subtle',
      cameraMovement: 'slow zoom in with slight pan',
      duration: sceneDuration,
      fps: 24,
    },
    'fade-in': {
      motionPrompt: 'gentle fade from dark, soft ambient motion, natural breathing movement',
      motionIntensity: 'subtle',
      cameraMovement: 'static with subtle drift',
      duration: sceneDuration,
      fps: 24,
    },
    'slide-in': {
      motionPrompt: 'smooth lateral movement, element slides into frame, graceful entrance',
      motionIntensity: 'moderate',
      cameraMovement: 'horizontal pan',
      duration: sceneDuration,
      fps: 30,
    },
    'zoom': {
      motionPrompt: 'dramatic zoom revealing detail, cinematic push, focus pull effect',
      motionIntensity: 'moderate',
      cameraMovement: 'push in zoom',
      duration: sceneDuration,
      fps: 30,
    },
    'none': {
      motionPrompt: 'static shot, no camera movement, subtle ambient motion only',
      motionIntensity: 'subtle',
      cameraMovement: 'locked off',
      duration: sceneDuration,
      fps: 24,
    },
    'dynamic': {
      motionPrompt: 'energetic movement, orbiting camera, reveal and explore',
      motionIntensity: 'dynamic',
      cameraMovement: 'orbit or tracking shot',
      duration: sceneDuration,
      fps: 30,
    },
  };
  
  // Category-specific motion enhancements
  const categoryMotion: Record<string, string> = {
    'location': ', environment feels alive, natural light movement',
    'products': ', product remains stable and prominent, background has subtle motion',
    'people': ', natural human movement, breathing, subtle gestures',
    'services': ', equipment in use, professional demonstration feel',
  };
  
  const baseConfig = motionConfigs[animationStyle] || motionConfigs['ken-burns'];
  const categoryEnhancement = categoryMotion[assetCategory] || '';
  
  return {
    ...baseConfig,
    motionPrompt: baseConfig.motionPrompt + categoryEnhancement,
  };
}
```

---

## Step 5: Complete Resolver Service

```typescript
// server/services/placement-resolver-service.ts

import {
  resolvePosition,
  resolveScale,
  getI2IConfig,
  getI2VConfig,
  ResolvedPosition,
  ResolvedScale,
  I2IConfig,
  I2VConfig,
} from '@/shared/config/placement-resolver';
import { getAssetType, AssetTypeDefinition } from '@/shared/config/brand-asset-types';

export interface ResolvedPlacementRules {
  // Position
  position: ResolvedPosition;
  
  // Scale
  scale: ResolvedScale;
  
  // Opacity
  opacity: number;
  
  // I2I Configuration
  i2i: I2IConfig;
  
  // I2V Configuration
  i2v: I2VConfig;
  
  // Metadata
  assetType: string;
  assetCategory: string;
  canUseI2V: boolean;
  canComposite: boolean;
}

/**
 * Resolve all placement rules for an asset
 */
export function resolvePlacementRules(
  assetTypeId: string,
  options: {
    frameWidth?: number;
    frameHeight?: number;
    sceneDuration?: number;
    useCase?: 'background-generation' | 'style-transfer' | 'scene-integration' | 'product-placement';
  } = {}
): ResolvedPlacementRules {
  
  const {
    frameWidth = 1920,
    frameHeight = 1080,
    sceneDuration = 5,
    useCase = 'scene-integration',
  } = options;
  
  // Get asset type definition
  const assetType = getAssetType(assetTypeId);
  
  if (!assetType) {
    console.warn(`[PlacementResolver] Unknown asset type: ${assetTypeId}`);
    // Return sensible defaults
    return getDefaultPlacementRules(frameWidth, frameHeight, sceneDuration);
  }
  
  const rules = assetType.placementRules;
  
  // Resolve position
  const position = resolvePosition(rules.typicalPosition, frameWidth, frameHeight);
  
  // Resolve scale
  const scale = resolveScale(rules.typicalScale, frameWidth, frameHeight);
  
  // Get opacity (default to 1.0 if not specified)
  const opacity = rules.typicalOpacity ?? 1.0;
  
  // Get I2I config
  const i2i = getI2IConfig(assetType.category, assetTypeId, useCase);
  
  // Get I2V config
  const i2v = getI2VConfig(
    rules.animationStyle || 'ken-burns',
    assetType.category,
    sceneDuration
  );
  
  console.log(`[PlacementResolver] Resolved rules for ${assetTypeId}:`);
  console.log(`  Position: ${rules.typicalPosition} → (${position.x}, ${position.y})`);
  console.log(`  Scale: ${rules.typicalScale} → ${scale.value}`);
  console.log(`  Opacity: ${opacity}`);
  console.log(`  I2I Strength: ${i2i.strength}`);
  console.log(`  I2V Motion: ${i2v.motionIntensity}`);
  
  return {
    position,
    scale,
    opacity,
    i2i,
    i2v,
    assetType: assetTypeId,
    assetCategory: assetType.category,
    canUseI2V: rules.canBeAnimated,
    canComposite: rules.canBeComposited,
  };
}

/**
 * Default placement rules for unknown asset types
 */
function getDefaultPlacementRules(
  frameWidth: number,
  frameHeight: number,
  sceneDuration: number
): ResolvedPlacementRules {
  return {
    position: { x: 50, y: 50, anchor: 'center' },
    scale: {
      value: 0.5,
      maxWidth: frameWidth * 0.5,
      maxHeight: frameHeight * 0.5,
      minWidth: frameWidth * 0.2,
    },
    opacity: 1.0,
    i2i: {
      strength: 0.5,
      guidanceScale: 7.0,
      preserveComposition: true,
      description: 'Default settings',
    },
    i2v: {
      motionPrompt: 'subtle camera movement, gentle ambient motion',
      motionIntensity: 'subtle',
      cameraMovement: 'slow push',
      duration: sceneDuration,
      fps: 24,
    },
    assetType: 'unknown',
    assetCategory: 'unknown',
    canUseI2V: true,
    canComposite: true,
  };
}
```

---

## Step 6: Integration with Generation Services

### Update I2I Generation

```typescript
// server/services/image-generation-service.ts

import { resolvePlacementRules } from './placement-resolver-service';

export async function generateImageToImage(
  brandAsset: BrandAsset,
  visualDirection: string,
  options: { frameWidth?: number; frameHeight?: number } = {}
): Promise<GeneratedImage> {
  
  // Resolve placement rules from asset type
  const rules = resolvePlacementRules(brandAsset.assetType, {
    frameWidth: options.frameWidth,
    frameHeight: options.frameHeight,
    useCase: 'scene-integration',
  });
  
  console.log(`[I2I] Using strength: ${rules.i2i.strength} for ${brandAsset.assetType}`);
  console.log(`[I2I] Preserve composition: ${rules.i2i.preserveComposition}`);
  
  // Call PiAPI with resolved parameters
  const response = await piapiClient.generateI2I({
    model: 'flux-kontext',
    imageUrl: brandAsset.fileUrl,
    prompt: visualDirection,
    strength: rules.i2i.strength,          // ← From placement rules!
    guidanceScale: rules.i2i.guidanceScale, // ← From placement rules!
  });
  
  return response;
}
```

### Update I2V Generation

```typescript
// server/services/video-generation-service.ts

import { resolvePlacementRules } from './placement-resolver-service';

export async function generateImageToVideo(
  brandAsset: BrandAsset,
  visualDirection: string,
  sceneDuration: number,
  options: { frameWidth?: number; frameHeight?: number } = {}
): Promise<GeneratedVideo> {
  
  // Resolve placement rules from asset type
  const rules = resolvePlacementRules(brandAsset.assetType, {
    frameWidth: options.frameWidth,
    frameHeight: options.frameHeight,
    sceneDuration,
  });
  
  // Check if asset supports I2V
  if (!rules.canUseI2V) {
    console.warn(`[I2V] Asset type ${brandAsset.assetType} doesn't support animation`);
    // Fall back to composite overlay instead
    return generateWithOverlay(brandAsset, visualDirection, sceneDuration);
  }
  
  console.log(`[I2V] Motion intensity: ${rules.i2v.motionIntensity}`);
  console.log(`[I2V] Motion prompt: ${rules.i2v.motionPrompt}`);
  
  // Build the full motion prompt
  const fullMotionPrompt = buildMotionPrompt(visualDirection, rules.i2v);
  
  // Call PiAPI with resolved parameters
  const response = await piapiClient.generateI2V({
    model: 'kling-v2.6',
    imageUrl: brandAsset.fileUrl,
    prompt: fullMotionPrompt,        // ← Motion prompt from rules!
    duration: rules.i2v.duration,
    fps: rules.i2v.fps,
  });
  
  return response;
}

/**
 * Build motion prompt combining visual direction with I2V config
 */
function buildMotionPrompt(visualDirection: string, i2vConfig: I2VConfig): string {
  // Extract any explicit motion from visual direction
  const hasExplicitMotion = /pan|zoom|track|dolly|orbit/i.test(visualDirection);
  
  if (hasExplicitMotion) {
    // User specified motion, use their direction
    return visualDirection;
  }
  
  // Add motion from config
  return `${i2vConfig.motionPrompt}. ${i2vConfig.cameraMovement}`;
}
```

### Update Composite Overlay

```typescript
// server/services/composition-service.ts

import { resolvePlacementRules } from './placement-resolver-service';

export async function compositeAssetOntoBackground(
  backgroundUrl: string,
  brandAsset: BrandAsset,
  options: { frameWidth?: number; frameHeight?: number } = {}
): Promise<string> {
  
  const frameWidth = options.frameWidth || 1920;
  const frameHeight = options.frameHeight || 1080;
  
  // Resolve placement rules
  const rules = resolvePlacementRules(brandAsset.assetType, {
    frameWidth,
    frameHeight,
  });
  
  // Check if asset can be composited
  if (!rules.canComposite) {
    console.warn(`[Composite] Asset type ${brandAsset.assetType} should be full-frame, not overlay`);
  }
  
  // Calculate pixel position
  const pixelX = Math.round((rules.position.x / 100) * frameWidth);
  const pixelY = Math.round((rules.position.y / 100) * frameHeight);
  
  console.log(`[Composite] Placing ${brandAsset.name} at (${pixelX}, ${pixelY})`);
  console.log(`[Composite] Scale: ${rules.scale.value}, Max: ${rules.scale.maxWidth}x${rules.scale.maxHeight}`);
  console.log(`[Composite] Opacity: ${rules.opacity}`);
  
  // Use Sharp to composite
  const result = await sharp(backgroundUrl)
    .composite([{
      input: await prepareAssetForComposite(brandAsset, rules),
      left: pixelX,
      top: pixelY,
      blend: 'over',
    }])
    .toBuffer();
  
  return uploadBuffer(result);
}

/**
 * Prepare asset image for compositing
 */
async function prepareAssetForComposite(
  brandAsset: BrandAsset,
  rules: ResolvedPlacementRules
): Promise<Buffer> {
  
  const assetBuffer = await downloadAsBuffer(brandAsset.fileUrl);
  
  let pipeline = sharp(assetBuffer);
  
  // Resize to max dimensions while maintaining aspect ratio
  pipeline = pipeline.resize(rules.scale.maxWidth, rules.scale.maxHeight, {
    fit: 'inside',
    withoutEnlargement: true,
  });
  
  // Apply opacity if not 1.0
  if (rules.opacity < 1.0) {
    pipeline = pipeline.ensureAlpha().composite([{
      input: Buffer.from([255, 255, 255, Math.round(rules.opacity * 255)]),
      raw: { width: 1, height: 1, channels: 4 },
      tile: true,
      blend: 'dest-in',
    }]);
  }
  
  return pipeline.toBuffer();
}
```

---

## Quick Reference: Asset Type → Generation Parameters

| Asset Type | Position | Scale | I2I Strength | I2V Motion | Use For |
|------------|----------|-------|--------------|------------|---------|
| `location-interior-workspace` | full-frame | full | 0.35 | ken-burns | I2V source |
| `location-farm-grounds` | full-frame | full | 0.35 | ken-burns | I2V source |
| `product-hero-single` | center | large | 0.25 | zoom | Composite |
| `product-hero-group` | center | large | 0.25 | fade-in | Composite |
| `logo-primary-color` | center | medium | 0.15 | fade-in | Overlay |
| `logo-watermark` | bottom-right | small | 0.10 | none | Overlay (30%) |
| `trust-certification-usda` | bottom-left | small | 0.10 | fade-in | Overlay |
| `service-bioscan-device` | center | large | 0.40 | zoom | I2V source |
| `people-founder-portrait` | center | large | 0.30 | fade-in | Composite/I2V |

---

## Testing

### Test 1: Logo Watermark Placement
```typescript
const rules = resolvePlacementRules('logo-watermark');
// Expected:
// position: { x: 92, y: 92, anchor: 'bottom-right' }
// scale: { value: 0.15, maxWidth: 288, ... }
// opacity: 0.3
// i2i.strength: 0.15
```

### Test 2: Location I2V Config
```typescript
const rules = resolvePlacementRules('location-interior-workspace', {
  sceneDuration: 8
});
// Expected:
// canUseI2V: true
// i2v.motionPrompt: 'slow cinematic push in..., environment feels alive...'
// i2v.motionIntensity: 'subtle'
```

### Test 3: Product Composite
```typescript
const rules = resolvePlacementRules('product-hero-single');
// Expected:
// position: { x: 50, y: 65, anchor: 'bottom-center' }
// scale: { value: 0.7, ... }
// i2i.strength: 0.25
// canComposite: true
```

---

## Success Criteria

This addendum is complete when:

1. ✅ `resolvePlacementRules()` returns correct position coordinates
2. ✅ `resolvePlacementRules()` returns correct scale values
3. ✅ I2I generation uses `strength` from resolved rules
4. ✅ I2V generation uses `motionPrompt` from resolved rules
5. ✅ Composite overlay uses `position`, `scale`, `opacity` from rules
6. ✅ Console logs show resolved parameters for each asset
7. ✅ Different asset types produce different generation parameters
