# Phase 8C: Smart Text Placement

## Objective

Implement intelligent text placement that uses Claude Vision frame analysis to position text overlays without obscuring faces, subjects, or important visual elements. This fixes duplicate/overlapping text issues.

## Problems This Solves

1. **Duplicate text overlays** - Text rendering twice in same position
2. **Text over faces** - Blocking subject's face with lower thirds
3. **Poor contrast** - White text on light backgrounds
4. **Cluttered positioning** - Text in busy visual areas

---

## Text Placement Service

Create `server/services/text-placement-service.ts`:

```typescript
// server/services/text-placement-service.ts

import { SceneAnalysisResult } from './scene-analysis-service';

export interface TextOverlay {
  id: string;
  text: string;
  type: 'lower_third' | 'title' | 'subtitle' | 'caption' | 'cta';
}

export interface TextStyle {
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'semibold';
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
  shadow?: boolean;
}

export interface TextPlacement {
  overlay: TextOverlay;
  position: {
    x: number;
    y: number;
    anchor: string;
  };
  animation: {
    enter: string;
    exit: string;
    duration: number;
  };
  timing: {
    startFrame: number;
    endFrame: number;
  };
  style: TextStyle;
  placementReason: string;
}

// Pine Hill Farm branded styles
const DEFAULT_STYLES: Record<string, TextStyle> = {
  lower_third: {
    fontSize: 32,
    fontWeight: 'semibold',
    fontFamily: 'Inter, sans-serif',
    color: '#FFFFFF',
    backgroundColor: 'rgba(45, 90, 39, 0.85)', // PHF Forest Green
    padding: 16,
    borderRadius: 4,
    shadow: true,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: 'Inter, sans-serif',
    color: '#FFFFFF',
    shadow: true,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: 'normal',
    fontFamily: 'Inter, sans-serif',
    color: '#FFFFFF',
    shadow: true,
  },
  caption: {
    fontSize: 20,
    fontWeight: 'normal',
    fontFamily: 'Inter, sans-serif',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    borderRadius: 4,
  },
  cta: {
    fontSize: 36,
    fontWeight: 'bold',
    fontFamily: 'Inter, sans-serif',
    color: '#FFFFFF',
    backgroundColor: '#D4A574', // PHF Warm Gold
    padding: 20,
    borderRadius: 8,
    shadow: true,
  },
};

const POSITION_COORDS: Record<string, { x: number; y: number; anchor: string }> = {
  'lower-third': { x: 50, y: 85, anchor: 'bottom-center' },
  'bottom-left': { x: 10, y: 90, anchor: 'bottom-left' },
  'bottom-center': { x: 50, y: 92, anchor: 'bottom-center' },
  'bottom-right': { x: 90, y: 90, anchor: 'bottom-right' },
  'top-center': { x: 50, y: 15, anchor: 'top-center' },
  'top-left': { x: 10, y: 10, anchor: 'top-left' },
  'top-right': { x: 90, y: 10, anchor: 'top-right' },
  'center': { x: 50, y: 50, anchor: 'center' },
};

class TextPlacementService {
  
  /**
   * Calculate optimal text placements for a scene
   */
  calculatePlacements(
    overlays: TextOverlay[],
    frameAnalysis: SceneAnalysisResult['frameAnalysis'],
    sceneDuration: number,
    fps: number = 30
  ): TextPlacement[] {
    // Deduplicate first
    const uniqueOverlays = this.deduplicateOverlays(overlays);
    const placements: TextPlacement[] = [];
    
    for (const overlay of uniqueOverlays) {
      const position = this.findBestPosition(
        overlay.type,
        frameAnalysis,
        placements
      );
      
      if (!position) {
        console.warn(`[TextPlacement] No position found for: ${overlay.text.substring(0, 30)}`);
        continue;
      }
      
      const style = this.adjustStyleForBackground(
        DEFAULT_STYLES[overlay.type] || DEFAULT_STYLES.caption,
        frameAnalysis.dominantColors,
        frameAnalysis.lightingType
      );
      
      const animation = this.selectAnimation(overlay.type);
      const timing = this.calculateTiming(overlay.type, sceneDuration, fps);
      
      placements.push({
        overlay,
        position,
        animation,
        timing,
        style,
        placementReason: position.reason,
      });
    }
    
    // Resolve any timing overlaps
    this.resolveOverlaps(placements);
    
    return placements;
  }
  
  /**
   * Remove duplicate text overlays
   */
  private deduplicateOverlays(overlays: TextOverlay[]): TextOverlay[] {
    const seen = new Set<string>();
    return overlays.filter(overlay => {
      const key = `${overlay.text}-${overlay.type}`;
      if (seen.has(key)) {
        console.warn(`[TextPlacement] Duplicate removed: "${overlay.text}"`);
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  /**
   * Find best position avoiding faces and busy regions
   */
  private findBestPosition(
    type: string,
    frameAnalysis: SceneAnalysisResult['frameAnalysis'],
    existingPlacements: TextPlacement[]
  ): { x: number; y: number; anchor: string; reason: string } | null {
    
    const preferences: Record<string, string[]> = {
      lower_third: ['lower-third', 'bottom-left', 'bottom-right'],
      title: ['center', 'top-center'],
      subtitle: ['center', 'bottom-center'],
      caption: ['bottom-center', 'lower-third'],
      cta: ['center', 'bottom-center'],
    };
    
    const preferredPositions = preferences[type] || ['lower-third'];
    const faceRegion = frameAnalysis.faceRegion;
    const safeZones = frameAnalysis.safeTextZones || [];
    const busyRegions = frameAnalysis.busyRegions || [];
    
    let bestPosition: any = null;
    let bestScore = -999;
    
    for (const posName of Object.keys(POSITION_COORDS)) {
      const coords = POSITION_COORDS[posName];
      let score = 50;
      let reason = '';
      
      // Bonus for preferred position
      if (preferredPositions.includes(posName)) {
        score += 30;
        reason = `Preferred for ${type}`;
      }
      
      // Bonus for safe zones
      if (safeZones.find(z => z.position === posName)) {
        score += 20;
        reason += ', safe zone';
      }
      
      // Heavy penalty for face overlap
      if (faceRegion && this.overlapsRegion(coords, faceRegion)) {
        score -= 100;
        reason += ', BLOCKED BY FACE';
      }
      
      // Penalty for busy regions
      if (busyRegions.some(r => posName.includes(r))) {
        score -= 25;
        reason += ', busy area';
      }
      
      // Penalty for overlap with existing text
      for (const existing of existingPlacements) {
        if (this.positionsOverlap(coords, existing.position)) {
          score -= 50;
          reason += ', text overlap';
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestPosition = { ...coords, reason };
      }
    }
    
    return bestScore > 0 ? bestPosition : null;
  }
  
  /**
   * Check if position overlaps with face region
   */
  private overlapsRegion(
    position: { x: number; y: number },
    region: { x: number; y: number; width: number; height: number }
  ): boolean {
    const px = position.x / 100;
    const py = position.y / 100;
    const padding = 0.1;
    
    return (
      px >= region.x - padding &&
      px <= region.x + region.width + padding &&
      py >= region.y - padding &&
      py <= region.y + region.height + padding
    );
  }
  
  /**
   * Check if two text positions overlap
   */
  private positionsOverlap(pos1: { x: number; y: number }, pos2: { x: number; y: number }): boolean {
    return Math.abs(pos1.x - pos2.x) < 20 && Math.abs(pos1.y - pos2.y) < 15;
  }
  
  /**
   * Adjust text style for background contrast
   */
  private adjustStyleForBackground(
    baseStyle: TextStyle,
    dominantColors: string[],
    lightingType: string
  ): TextStyle {
    const style = { ...baseStyle };
    
    const isLightBackground = lightingType === 'warm' || 
      dominantColors.some(c => ['white', 'cream', 'beige', 'yellow'].some(lc => c.toLowerCase().includes(lc)));
    
    if (isLightBackground && !style.backgroundColor) {
      style.shadow = true;
      style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      style.padding = style.padding || 12;
    }
    
    return style;
  }
  
  /**
   * Select animation based on overlay type
   */
  private selectAnimation(type: string): TextPlacement['animation'] {
    const animations: Record<string, TextPlacement['animation']> = {
      lower_third: { enter: 'slide-up', exit: 'fade', duration: 0.4 },
      title: { enter: 'fade', exit: 'fade', duration: 0.6 },
      subtitle: { enter: 'fade', exit: 'fade', duration: 0.4 },
      caption: { enter: 'fade', exit: 'fade', duration: 0.3 },
      cta: { enter: 'pop', exit: 'fade', duration: 0.5 },
    };
    return animations[type] || animations.caption;
  }
  
  /**
   * Calculate frame timing for text
   */
  private calculateTiming(type: string, sceneDuration: number, fps: number): TextPlacement['timing'] {
    const totalFrames = Math.round(sceneDuration * fps);
    
    switch (type) {
      case 'title':
        return { startFrame: Math.round(fps * 0.3), endFrame: totalFrames - Math.round(fps * 0.3) };
      case 'lower_third':
        return { startFrame: Math.round(fps * 0.8), endFrame: totalFrames - Math.round(fps * 0.3) };
      case 'cta':
        return { startFrame: Math.round(totalFrames * 0.5), endFrame: totalFrames };
      default:
        return { startFrame: Math.round(fps * 0.5), endFrame: totalFrames - Math.round(fps * 0.2) };
    }
  }
  
  /**
   * Resolve overlapping text by staggering timing
   */
  private resolveOverlaps(placements: TextPlacement[]): void {
    for (let i = 1; i < placements.length; i++) {
      for (let j = 0; j < i; j++) {
        const p1 = placements[i];
        const p2 = placements[j];
        
        if (!this.positionsOverlap(p1.position, p2.position)) continue;
        
        const timeOverlap = p1.timing.startFrame < p2.timing.endFrame && 
                           p2.timing.startFrame < p1.timing.endFrame;
        
        if (timeOverlap) {
          p1.timing.startFrame = p2.timing.endFrame + 10;
          console.log(`[TextPlacement] Resolved overlap: "${p1.overlay.text.substring(0, 20)}" delayed`);
        }
      }
    }
  }
}

export const textPlacementService = new TextPlacementService();
```

---

## Remotion TextOverlay Component

```tsx
// remotion/components/TextOverlay.tsx

import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { TextPlacement } from '../../server/services/text-placement-service';

interface Props {
  placement: TextPlacement;
  fps: number;
}

export const TextOverlay: React.FC<Props> = ({ placement, fps }) => {
  const frame = useCurrentFrame();
  const { timing, animation, position, style, overlay } = placement;
  
  // Not visible outside timing window
  if (frame < timing.startFrame || frame > timing.endFrame) {
    return null;
  }
  
  const animFrames = Math.round(animation.duration * fps);
  
  // Opacity animation
  const opacity = interpolate(
    frame,
    [timing.startFrame, timing.startFrame + animFrames, timing.endFrame - animFrames, timing.endFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Transform animation
  let transform = '';
  if (animation.enter === 'slide-up') {
    const y = interpolate(frame, [timing.startFrame, timing.startFrame + animFrames], [30, 0], { extrapolateRight: 'clamp' });
    transform = `translateY(${y}px)`;
  } else if (animation.enter === 'pop') {
    const scale = interpolate(frame, [timing.startFrame, timing.startFrame + animFrames], [0.8, 1], { extrapolateRight: 'clamp' });
    transform = `scale(${scale})`;
  }
  
  // Position style
  const posStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: `translate(-50%, -50%) ${transform}`,
  };
  
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{
        ...posStyle,
        opacity,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        fontFamily: style.fontFamily,
        color: style.color,
        backgroundColor: style.backgroundColor,
        padding: style.padding,
        borderRadius: style.borderRadius,
        textShadow: style.shadow ? '2px 2px 4px rgba(0,0,0,0.5)' : undefined,
        whiteSpace: 'nowrap',
      }}>
        {overlay.text}
      </div>
    </AbsoluteFill>
  );
};
```

---

## Verification Checklist

- [ ] Text placement service created
- [ ] Deduplication removes duplicate text
- [ ] Position scoring avoids faces
- [ ] Position scoring avoids busy regions  
- [ ] Position scoring avoids overlapping text
- [ ] Style adjusted for background contrast
- [ ] Animation selected per type
- [ ] Timing calculated correctly
- [ ] Overlaps resolved by staggering
- [ ] Remotion component working

---

## Next Phase

Proceed to **Phase 8D: Mood-Matched Transitions**
