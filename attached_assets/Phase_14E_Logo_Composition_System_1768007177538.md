# Phase 14E: Logo Composition System

## Objective

Implement broadcast-quality logo placement that **never relies on AI generation** for logo/text rendering. This ensures 100% accuracy for Pine Hill Farm branding, certification marks (USDA Organic), and partner logos.

## Why Remotion Over AI?

| Approach | Logo Accuracy | Text Clarity | Consistency | Control |
|----------|---------------|--------------|-------------|---------|
| AI-generated logos | ~20% | Often garbled | Variable | None |
| Remotion composite | 100% | Perfect | Always consistent | Full |

**For TV-quality professionalism, logo composition must be deterministic, not generative.**

---

## Logo Placement Scenarios

Based on the Brand Media library, we handle:

1. **Primary Logo** - "Pine Hill Farm Logo - Primary" (signature script)
2. **Watermark** - "Pine Hill Farm watermark" (subtle overlay)
3. **Certification Marks** - USDA Organic, advocacy group logos
4. **Partner Logos** - Menopause Society, Functional Medicine, etc.

---

## Step 1: Define Types

```typescript
// shared/types/logo-composition-types.ts

export type LogoType = 
  | 'primary'       // Main Pine Hill Farm logo
  | 'watermark'     // Subtle watermark version
  | 'certification' // USDA Organic, etc.
  | 'partner';      // Partner/advocacy logos

export type LogoPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'lower-third-left' | 'lower-third-right'
  | 'custom';

export type LogoAnimation =
  | 'none'           // Static placement
  | 'fade-in'        // Opacity fade
  | 'slide-in'       // Slide from edge
  | 'scale-up'       // Scale from small
  | 'fade-out-end'   // Fade out at end
  | 'pulse';         // Subtle pulse (for CTAs)

export interface LogoPlacement {
  logoType: LogoType;
  assetId?: string;
  position: LogoPosition;
  customPosition?: { x: number; y: number };
  size: 'small' | 'medium' | 'large' | 'xlarge';
  maxWidthPercent?: number;
  maxHeightPercent?: number;
  opacity: number;
  shadow?: {
    enabled: boolean;
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  animation: LogoAnimation;
  animationDuration?: number;
  animationDelay?: number;
  startFrame?: number;
  endFrame?: number;
  avoidRegions?: Array<{ x: number; y: number; width: number; height: number }>;
}

export interface LogoCompositionConfig {
  sceneId: string;
  sceneDuration: number;
  fps: number;
  width: number;
  height: number;
  logos: LogoPlacement[];
  safeZoneMargin: number;
  respectProductRegions: boolean;
  productRegions?: Array<{ x: number; y: number; width: number; height: number }>;
}
```

---

## Step 2: Logo Asset Selector

```typescript
// server/services/logo-asset-selector.ts

import { db } from '../db';
import { LogoType } from '../../shared/types/logo-composition-types';

interface LogoAssetInfo {
  id: string;
  url: string;
  width: number;
  height: number;
  hasTransparency: boolean;
  type: LogoType;
  name: string;
}

class LogoAssetSelector {
  private cache: Map<string, LogoAssetInfo> = new Map();
  
  async selectLogo(type: LogoType, preferredName?: string): Promise<LogoAssetInfo | null> {
    const cacheKey = `${type}-${preferredName || 'default'}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    const assets = await this.queryLogoAssets(type, preferredName);
    if (assets.length === 0) return null;
    
    const selected = this.rankAndSelect(assets, type, preferredName);
    this.cache.set(cacheKey, selected);
    return selected;
  }
  
  private async queryLogoAssets(type: LogoType, preferredName?: string): Promise<any[]> {
    const typeFilters: Record<LogoType, string[]> = {
      primary: ['logo', 'primary', 'pine hill farm'],
      watermark: ['watermark', 'overlay'],
      certification: ['usda', 'organic', 'certification'],
      partner: ['association', 'society', 'institute'],
    };
    
    const keywords = typeFilters[type];
    
    return db.query.brandMedia.findMany({
      where: (media, { or, ilike, eq }) => or(
        eq(media.mediaType, 'logo'),
        ...keywords.map(k => ilike(media.name, `%${k}%`)),
        ...keywords.map(k => ilike(media.tags, `%${k}%`))
      ),
    });
  }
  
  private rankAndSelect(assets: any[], type: LogoType, preferredName?: string): LogoAssetInfo {
    const scored = assets.map(asset => {
      let score = 0;
      const name = (asset.name || '').toLowerCase();
      
      if (preferredName && name.includes(preferredName.toLowerCase())) score += 100;
      
      switch (type) {
        case 'primary':
          if (name.includes('primary')) score += 50;
          if (name.includes('pine hill farm') && name.includes('logo')) score += 40;
          break;
        case 'watermark':
          if (name.includes('watermark')) score += 50;
          break;
        case 'certification':
          if (name.includes('usda')) score += 50;
          if (name.includes('organic')) score += 40;
          break;
      }
      
      if ((asset.fileName || '').toLowerCase().includes('.png')) score += 15;
      return { asset, score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].asset;
    
    return {
      id: best.id?.toString() || '0',
      url: best.url || '',
      width: best.width || 500,
      height: best.height || 500,
      hasTransparency: (best.fileName || '').toLowerCase().includes('.png'),
      type,
      name: best.name || 'Logo',
    };
  }
  
  clearCache(): void {
    this.cache.clear();
  }
}

export const logoAssetSelector = new LogoAssetSelector();
```

---

## Step 3: Logo Placement Calculator

```typescript
// server/services/logo-placement-calculator.ts

import { LogoPlacement, LogoCompositionConfig } from '../../shared/types/logo-composition-types';

class LogoPlacementCalculator {
  
  calculate(
    placement: LogoPlacement,
    logoAsset: { width: number; height: number },
    config: LogoCompositionConfig
  ): { x: number; y: number; width: number; height: number } {
    
    const { width: logoWidth, height: logoHeight } = this.calculateSize(placement, logoAsset, config);
    const { x, y } = this.calculatePosition(placement, logoWidth, logoHeight, config);
    const adjusted = config.respectProductRegions
      ? this.adjustForProductRegions(x, y, logoWidth, logoHeight, config)
      : { x, y };
    
    return { x: adjusted.x, y: adjusted.y, width: logoWidth, height: logoHeight };
  }
  
  private calculateSize(
    placement: LogoPlacement,
    logoAsset: { width: number; height: number },
    config: LogoCompositionConfig
  ): { width: number; height: number } {
    
    const sizeMap = { small: 0.08, medium: 0.12, large: 0.18, xlarge: 0.25 };
    const baseWidth = config.width * sizeMap[placement.size];
    const aspectRatio = logoAsset.width / logoAsset.height;
    
    let finalWidth = baseWidth;
    let finalHeight = baseWidth / aspectRatio;
    
    if (placement.maxWidthPercent) {
      const maxW = config.width * (placement.maxWidthPercent / 100);
      if (finalWidth > maxW) {
        finalWidth = maxW;
        finalHeight = finalWidth / aspectRatio;
      }
    }
    
    return { width: Math.round(finalWidth), height: Math.round(finalHeight) };
  }
  
  private calculatePosition(
    placement: LogoPlacement,
    logoWidth: number,
    logoHeight: number,
    config: LogoCompositionConfig
  ): { x: number; y: number } {
    
    const m = config.safeZoneMargin;
    const fw = config.width;
    const fh = config.height;
    
    const positions: Record<string, { x: number; y: number }> = {
      'top-left': { x: m, y: m },
      'top-center': { x: (fw - logoWidth) / 2, y: m },
      'top-right': { x: fw - logoWidth - m, y: m },
      'center-left': { x: m, y: (fh - logoHeight) / 2 },
      'center': { x: (fw - logoWidth) / 2, y: (fh - logoHeight) / 2 },
      'center-right': { x: fw - logoWidth - m, y: (fh - logoHeight) / 2 },
      'bottom-left': { x: m, y: fh - logoHeight - m },
      'bottom-center': { x: (fw - logoWidth) / 2, y: fh - logoHeight - m },
      'bottom-right': { x: fw - logoWidth - m, y: fh - logoHeight - m },
      'lower-third-left': { x: m * 2, y: fh * 0.75 - logoHeight / 2 },
      'lower-third-right': { x: fw - logoWidth - m * 2, y: fh * 0.75 - logoHeight / 2 },
    };
    
    if (placement.position === 'custom' && placement.customPosition) {
      return {
        x: fw * (placement.customPosition.x / 100) - logoWidth / 2,
        y: fh * (placement.customPosition.y / 100) - logoHeight / 2,
      };
    }
    
    return positions[placement.position] || positions['bottom-right'];
  }
  
  private adjustForProductRegions(
    x: number, y: number, width: number, height: number,
    config: LogoCompositionConfig
  ): { x: number; y: number } {
    
    if (!config.productRegions?.length) return { x, y };
    
    for (const region of config.productRegions) {
      if (this.checkOverlap({ x, y, width, height }, region)) {
        const m = config.safeZoneMargin;
        const inLeft = x < config.width / 2;
        const inTop = y < config.height / 2;
        
        if (inLeft && inTop) return { x: config.width - width - m, y: config.height - height - m };
        if (!inLeft && inTop) return { x: m, y: config.height - height - m };
        if (inLeft) return { x: config.width - width - m, y: m };
        return { x: m, y: m };
      }
    }
    
    return { x, y };
  }
  
  private checkOverlap(r1: any, r2: any): boolean {
    return !(r1.x + r1.width < r2.x || r2.x + r2.width < r1.x ||
             r1.y + r1.height < r2.y || r2.y + r2.height < r1.y);
  }
}

export const logoPlacementCalculator = new LogoPlacementCalculator();
```

---

## Step 4: Remotion Logo Component

```tsx
// remotion/components/overlays/LogoOverlay.tsx

import React from 'react';
import { Img, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface LogoOverlayProps {
  logoUrl: string;
  placement: { x: number; y: number; width: number; height: number; opacity: number };
  animation: 'none' | 'fade-in' | 'slide-in' | 'scale-up' | 'pulse';
  animationDuration: number;
  animationDelay: number;
  startFrame: number;
  endFrame?: number;
  shadow?: { enabled: boolean; color: string; blur: number; offsetX: number; offsetY: number };
}

export const LogoOverlay: React.FC<LogoOverlayProps> = ({
  logoUrl, placement, animation, animationDuration, animationDelay,
  startFrame, endFrame, shadow,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  
  const actualStart = startFrame + animationDelay;
  const actualEnd = endFrame || durationInFrames;
  
  if (frame < actualStart || frame > actualEnd) return null;
  
  const localFrame = frame - actualStart;
  const progress = Math.min(localFrame / animationDuration, 1);
  
  let opacity = placement.opacity;
  let transform = 'none';
  
  switch (animation) {
    case 'fade-in':
      opacity *= progress;
      break;
    case 'slide-in':
      opacity *= progress;
      transform = `translateX(${(1 - progress) * 100}px)`;
      break;
    case 'scale-up':
      opacity *= progress;
      transform = `scale(${0.5 + progress * 0.5})`;
      break;
    case 'pulse':
      transform = `scale(${1 + Math.sin(frame * 0.1) * 0.02})`;
      break;
  }
  
  const shadowStyle = shadow?.enabled
    ? `drop-shadow(${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.color})`
    : 'none';
  
  return (
    <Img
      src={logoUrl}
      style={{
        position: 'absolute',
        left: placement.x,
        top: placement.y,
        width: placement.width,
        height: placement.height,
        opacity,
        transform,
        filter: shadowStyle,
        objectFit: 'contain',
      }}
    />
  );
};

export default LogoOverlay;
```

---

## Step 5: Logo Composition Service

```typescript
// server/services/logo-composition-service.ts

import { LogoPlacement, LogoCompositionConfig } from '../../shared/types/logo-composition-types';
import { logoAssetSelector } from './logo-asset-selector';
import { logoPlacementCalculator } from './logo-placement-calculator';
import { BrandRequirementAnalysis } from '../../shared/types/brand-asset-types';

class LogoCompositionService {
  
  async buildConfig(
    sceneId: string,
    sceneDuration: number,
    analysis: BrandRequirementAnalysis,
    productRegions?: Array<{ x: number; y: number; width: number; height: number }>
  ): Promise<LogoCompositionConfig> {
    
    const logos: LogoPlacement[] = [];
    
    // Primary logo if branding required
    if (analysis.requirements.logoRequired) {
      const primary = await this.buildPrimaryPlacement(analysis);
      if (primary) logos.push(primary);
    }
    
    // Always add subtle watermark
    logos.push(this.buildWatermarkPlacement());
    
    // Add USDA Organic for product scenes
    if (analysis.requirements.productMentioned) {
      const cert = await this.buildCertificationPlacement();
      if (cert) logos.push(cert);
    }
    
    return {
      sceneId,
      sceneDuration,
      fps: 30,
      width: 1920,
      height: 1080,
      logos,
      safeZoneMargin: 40,
      respectProductRegions: true,
      productRegions,
    };
  }
  
  private async buildPrimaryPlacement(analysis: BrandRequirementAnalysis): Promise<LogoPlacement | null> {
    const logo = await logoAssetSelector.selectLogo('primary');
    if (!logo) return null;
    
    const prominent = analysis.requirements.brandingVisibility === 'prominent';
    
    return {
      logoType: 'primary',
      assetId: logo.id,
      position: prominent ? 'top-left' : 'bottom-right',
      size: prominent ? 'large' : 'medium',
      opacity: 1.0,
      animation: prominent ? 'scale-up' : 'fade-in',
      animationDuration: 20,
      animationDelay: 5,
      shadow: { enabled: true, color: 'rgba(0,0,0,0.2)', blur: 8, offsetX: 2, offsetY: 2 },
    };
  }
  
  private buildWatermarkPlacement(): LogoPlacement {
    return {
      logoType: 'watermark',
      position: 'bottom-right',
      size: 'small',
      opacity: 0.5,
      animation: 'fade-in',
      animationDuration: 15,
      animationDelay: 30,
    };
  }
  
  private async buildCertificationPlacement(): Promise<LogoPlacement | null> {
    const cert = await logoAssetSelector.selectLogo('certification', 'usda');
    if (!cert) return null;
    
    return {
      logoType: 'certification',
      assetId: cert.id,
      position: 'bottom-left',
      size: 'small',
      opacity: 0.9,
      animation: 'fade-in',
      animationDuration: 15,
      animationDelay: 45,
    };
  }
  
  async generateRemotionProps(config: LogoCompositionConfig): Promise<any[]> {
    const props = [];
    
    for (const placement of config.logos) {
      const asset = await logoAssetSelector.selectLogo(placement.logoType);
      if (!asset) continue;
      
      const calculated = logoPlacementCalculator.calculate(placement, asset, config);
      
      props.push({
        logoUrl: asset.url,
        placement: { ...calculated, opacity: placement.opacity },
        animation: placement.animation,
        animationDuration: placement.animationDuration || 15,
        animationDelay: placement.animationDelay || 0,
        startFrame: placement.startFrame || 0,
        endFrame: placement.endFrame,
        shadow: placement.shadow,
      });
    }
    
    return props;
  }
}

export const logoCompositionService = new LogoCompositionService();
```

---

## Verification Checklist

- [ ] Logo selector finds correct assets by type
- [ ] Placement calculator positions logos correctly
- [ ] Safe zone margins are respected
- [ ] Product regions are avoided
- [ ] Animations work (fade-in, slide-in, scale-up)
- [ ] Multiple logos compose simultaneously
- [ ] Watermark appears subtly
- [ ] USDA Organic appears on product scenes
- [ ] Shadow effects render properly

---

## Next Phase

Proceed to **Phase 14F: Workflow Orchestration** to tie all components together.
