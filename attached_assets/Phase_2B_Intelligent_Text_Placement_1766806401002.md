# Phase 2B: Intelligent Text Placement

## Objective
Use the scene analysis from Phase 2A to dynamically position text overlays so they never block faces or important content. The Remotion composition will receive precise positioning instructions instead of using fixed positions.

## Prerequisites
- Phase 2A complete (scene analysis working and stored)
- Scene analysis data available in project.scenes[].analysis

## What Success Looks Like
- Text overlays automatically avoid faces
- Text color adapts to background brightness
- Text shadow/background added when needed for readability
- Product overlays positioned in safe zones
- No manual adjustment needed for most scenes

---

## Step 1: Create Composition Instructions Generator

Create a new file `server/services/composition-instructions-service.ts`:

```typescript
// server/services/composition-instructions-service.ts

import { SceneAnalysis, SafeZones } from './scene-analysis-service';

export interface TextOverlayInstruction {
  text: string;
  position: {
    x: number;  // percentage 0-100
    y: number;  // percentage 0-100
    anchor: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  };
  style: {
    fontSize: number;
    fontWeight: string;
    color: string;
    textShadow?: string;
    backgroundColor?: string;
    padding?: string;
  };
  animation: {
    enter: 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'zoom';
    exit: 'fade' | 'slide-down' | 'slide-left' | 'slide-right';
    enterDuration: number;
    exitDuration: number;
    enterDelay: number;
  };
}

export interface ProductOverlayInstruction {
  enabled: boolean;
  position: {
    x: number;  // percentage 0-100
    y: number;  // percentage 0-100
    anchor: string;
  };
  scale: number;  // 0.1 - 1.0
  animation: 'fade' | 'zoom' | 'slide';
  shadow: boolean;
}

export interface SceneCompositionInstructions {
  sceneId: string;
  textOverlays: TextOverlayInstruction[];
  productOverlay?: ProductOverlayInstruction;
  lowerThird?: {
    enabled: boolean;
    position: { y: number };
    style: {
      accentColor: string;
      backgroundColor: string;
    };
  };
}

class CompositionInstructionsService {
  
  /**
   * Generate composition instructions for a scene based on its analysis
   */
  generateInstructions(
    sceneId: string,
    textOverlays: Array<{ text: string; style?: string }>,
    analysis: SceneAnalysis | undefined,
    options: {
      useProductOverlay?: boolean;
      brandColor?: string;
      defaultTextPosition?: 'top' | 'center' | 'lower-third';
    } = {}
  ): SceneCompositionInstructions {
    
    // Use analysis or fall back to safe defaults
    const safeAnalysis = analysis || this.getDefaultAnalysis();
    
    const instructions: SceneCompositionInstructions = {
      sceneId,
      textOverlays: this.positionTextOverlays(textOverlays, safeAnalysis, options),
      productOverlay: options.useProductOverlay 
        ? this.positionProductOverlay(safeAnalysis) 
        : undefined,
    };
    
    return instructions;
  }

  /**
   * Position text overlays based on scene analysis
   */
  private positionTextOverlays(
    overlays: Array<{ text: string; style?: string }>,
    analysis: SceneAnalysis,
    options: { defaultTextPosition?: 'top' | 'center' | 'lower-third'; brandColor?: string }
  ): TextOverlayInstruction[] {
    
    const rec = analysis.recommendations;
    const safeZones = analysis.safeZones;
    
    // Determine base position from analysis
    const basePosition = this.calculateBasePosition(rec.textPosition, safeZones);
    
    // Style based on analysis
    const textColor = rec.textColor;
    const needsShadow = rec.needsTextShadow;
    const needsBackground = rec.needsTextBackground;
    
    return overlays.map((overlay, index) => {
      const style = overlay.style || 'body';
      
      // Stack multiple overlays vertically
      const yOffset = index * 8; // 8% spacing between lines
      
      return {
        text: overlay.text,
        position: {
          x: basePosition.x,
          y: Math.min(basePosition.y + yOffset, 95), // Don't go off screen
          anchor: this.getAnchor(rec.textPosition),
        },
        style: {
          fontSize: this.getFontSize(style),
          fontWeight: this.getFontWeight(style),
          color: textColor,
          textShadow: needsShadow 
            ? '2px 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)' 
            : undefined,
          backgroundColor: needsBackground 
            ? 'rgba(0,0,0,0.6)' 
            : undefined,
          padding: needsBackground ? '8px 16px' : undefined,
        },
        animation: {
          enter: this.getEnterAnimation(style, analysis.mood),
          exit: 'fade',
          enterDuration: 0.5,
          exitDuration: 0.3,
          enterDelay: index * 0.15, // Stagger animations
        },
      };
    });
  }

  /**
   * Position product overlay in a safe zone
   */
  private positionProductOverlay(analysis: SceneAnalysis): ProductOverlayInstruction {
    const rec = analysis.recommendations;
    
    if (!rec.productOverlaySafe) {
      // Product overlay would block content - disable or minimize
      return {
        enabled: false,
        position: { x: 90, y: 90, anchor: 'bottom-right' },
        scale: 0.15,
        animation: 'fade',
        shadow: true,
      };
    }
    
    // Map recommendation to percentage positions
    const xMap = { left: 10, center: 50, right: 90 };
    const yMap = { top: 10, center: 50, bottom: 90 };
    
    return {
      enabled: true,
      position: {
        x: xMap[rec.productOverlayPosition.x] || 90,
        y: yMap[rec.productOverlayPosition.y] || 90,
        anchor: `${rec.productOverlayPosition.y}-${rec.productOverlayPosition.x}`,
      },
      scale: analysis.faces.detected ? 0.2 : 0.25, // Smaller if faces present
      animation: analysis.mood === 'dramatic' ? 'zoom' : 'fade',
      shadow: true,
    };
  }

  /**
   * Calculate base position for text from recommendations
   */
  private calculateBasePosition(
    textPosition: { vertical: string; horizontal: string },
    safeZones: SafeZones
  ): { x: number; y: number } {
    // Vertical mapping
    const yMap: Record<string, number> = {
      'top': 12,
      'center': 50,
      'lower-third': 82,
    };
    
    // Horizontal mapping
    const xMap: Record<string, number> = {
      'left': 15,
      'center': 50,
      'right': 85,
    };
    
    let y = yMap[textPosition.vertical] || 82;
    let x = xMap[textPosition.horizontal] || 50;
    
    // Verify the position is actually safe, adjust if not
    const zoneKey = this.getZoneKey(textPosition.vertical, textPosition.horizontal);
    if (!safeZones[zoneKey as keyof SafeZones]) {
      // Find an alternative safe zone
      const alternative = this.findSafeAlternative(safeZones);
      if (alternative) {
        y = yMap[alternative.vertical] || y;
        x = xMap[alternative.horizontal] || x;
      }
    }
    
    return { x, y };
  }

  private getZoneKey(vertical: string, horizontal: string): string {
    const vMap: Record<string, string> = {
      'top': 'top',
      'center': 'middle',
      'lower-third': 'bottom',
    };
    const hMap: Record<string, string> = {
      'left': 'Left',
      'center': 'Center',
      'right': 'Right',
    };
    return `${vMap[vertical] || 'bottom'}${hMap[horizontal] || 'Center'}`;
  }

  private findSafeAlternative(safeZones: SafeZones): { vertical: string; horizontal: string } | null {
    // Priority order for finding safe zones
    const priorities = [
      { zone: 'bottomCenter', vertical: 'lower-third', horizontal: 'center' },
      { zone: 'bottomLeft', vertical: 'lower-third', horizontal: 'left' },
      { zone: 'bottomRight', vertical: 'lower-third', horizontal: 'right' },
      { zone: 'topCenter', vertical: 'top', horizontal: 'center' },
      { zone: 'topLeft', vertical: 'top', horizontal: 'left' },
      { zone: 'topRight', vertical: 'top', horizontal: 'right' },
    ];
    
    for (const p of priorities) {
      if (safeZones[p.zone as keyof SafeZones]) {
        return { vertical: p.vertical, horizontal: p.horizontal };
      }
    }
    
    // Default to lower-third center (most common safe spot)
    return { vertical: 'lower-third', horizontal: 'center' };
  }

  private getAnchor(textPosition: { vertical: string; horizontal: string }): TextOverlayInstruction['position']['anchor'] {
    const v = textPosition.vertical === 'top' ? 'top' : 
              textPosition.vertical === 'center' ? 'center' : 'bottom';
    const h = textPosition.horizontal;
    
    if (v === 'center' && h === 'center') return 'center';
    return `${v}-${h}` as TextOverlayInstruction['position']['anchor'];
  }

  private getFontSize(style: string): number {
    const sizes: Record<string, number> = {
      'title': 72,
      'headline': 56,
      'subheadline': 42,
      'body': 36,
      'caption': 28,
    };
    return sizes[style] || 36;
  }

  private getFontWeight(style: string): string {
    const weights: Record<string, string> = {
      'title': '700',
      'headline': '600',
      'subheadline': '600',
      'body': '500',
      'caption': '400',
    };
    return weights[style] || '500';
  }

  private getEnterAnimation(
    style: string, 
    mood: string
  ): TextOverlayInstruction['animation']['enter'] {
    if (mood === 'dramatic') return 'zoom';
    if (style === 'title') return 'fade';
    if (style === 'headline') return 'slide-up';
    return 'fade';
  }

  private getDefaultAnalysis(): SceneAnalysis {
    return {
      faces: { detected: false, count: 0, positions: [] },
      composition: {
        focalPoint: { x: 50, y: 50 },
        brightness: 'normal',
        dominantColors: ['#808080'],
      },
      safeZones: {
        topLeft: true, topCenter: true, topRight: true,
        middleLeft: true, middleCenter: false, middleRight: true,
        bottomLeft: true, bottomCenter: true, bottomRight: true,
      },
      recommendations: {
        textPosition: { vertical: 'lower-third', horizontal: 'center' },
        textColor: '#FFFFFF',
        needsTextShadow: true,
        needsTextBackground: false,
        productOverlayPosition: { x: 'right', y: 'bottom' },
        productOverlaySafe: true,
      },
      contentType: 'mixed',
      mood: 'neutral',
    };
  }
}

export const compositionInstructionsService = new CompositionInstructionsService();
```

---

## Step 2: Integrate with Asset Generation

Modify `server/services/universal-video-service.ts`:

### Add import:
```typescript
import { compositionInstructionsService, SceneCompositionInstructions } from './composition-instructions-service';
```

### After scene analysis, generate composition instructions:

```typescript
// After the scene analysis loop, add:

console.log(`[Assets] Generating composition instructions...`);

for (let i = 0; i < updatedProject.scenes.length; i++) {
  const scene = updatedProject.scenes[i];
  
  const instructions = compositionInstructionsService.generateInstructions(
    scene.id,
    scene.textOverlays || [],
    scene.analysis,
    {
      useProductOverlay: scene.assets?.useProductOverlay || false,
      brandColor: project.branding?.primaryColor || '#2D5A27',
    }
  );
  
  // Store instructions with the scene
  updatedProject.scenes[i].compositionInstructions = instructions;
  
  console.log(`[Assets] Scene ${i + 1} instructions:`, {
    textCount: instructions.textOverlays.length,
    textPosition: instructions.textOverlays[0]?.position,
    productEnabled: instructions.productOverlay?.enabled,
  });
}

console.log(`[Assets] Composition instructions complete`);
```

---

## Step 3: Update Remotion Composition

Modify `remotion/UniversalVideoComposition.tsx` to use the composition instructions:

### Add types at top:
```typescript
interface TextOverlayInstruction {
  text: string;
  position: {
    x: number;
    y: number;
    anchor: string;
  };
  style: {
    fontSize: number;
    fontWeight: string;
    color: string;
    textShadow?: string;
    backgroundColor?: string;
    padding?: string;
  };
  animation: {
    enter: string;
    exit: string;
    enterDuration: number;
    exitDuration: number;
    enterDelay: number;
  };
}

interface SceneCompositionInstructions {
  sceneId: string;
  textOverlays: TextOverlayInstruction[];
  productOverlay?: {
    enabled: boolean;
    position: { x: number; y: number; anchor: string };
    scale: number;
    animation: string;
    shadow: boolean;
  };
}
```

### Create new text overlay component:
```tsx
const IntelligentTextOverlay: React.FC<{
  instruction: TextOverlayInstruction;
  sceneDuration: number;
  fps: number;
}> = ({ instruction, sceneDuration, fps }) => {
  const frame = useCurrentFrame();
  
  const enterFrames = instruction.animation.enterDuration * fps;
  const exitFrames = instruction.animation.exitDuration * fps;
  const delayFrames = instruction.animation.enterDelay * fps;
  const totalFrames = sceneDuration * fps;
  
  // Calculate opacity
  let opacity = 0;
  const adjustedFrame = frame - delayFrames;
  
  if (adjustedFrame < 0) {
    opacity = 0;
  } else if (adjustedFrame < enterFrames) {
    opacity = adjustedFrame / enterFrames;
  } else if (adjustedFrame > totalFrames - exitFrames) {
    opacity = (totalFrames - adjustedFrame) / exitFrames;
  } else {
    opacity = 1;
  }
  
  // Calculate transform based on animation type
  let transform = '';
  if (instruction.animation.enter === 'slide-up' && adjustedFrame < enterFrames) {
    const progress = adjustedFrame / enterFrames;
    const translateY = (1 - progress) * 30;
    transform = `translateY(${translateY}px)`;
  } else if (instruction.animation.enter === 'zoom' && adjustedFrame < enterFrames) {
    const progress = adjustedFrame / enterFrames;
    const scale = 0.8 + (progress * 0.2);
    transform = `scale(${scale})`;
  }
  
  // Calculate position based on anchor
  const getPositionStyle = () => {
    const { x, y, anchor } = instruction.position;
    const style: React.CSSProperties = {};
    
    if (anchor.includes('left')) {
      style.left = `${x}%`;
    } else if (anchor.includes('right')) {
      style.right = `${100 - x}%`;
    } else {
      style.left = `${x}%`;
      style.transform = (style.transform || '') + ' translateX(-50%)';
    }
    
    if (anchor.includes('top')) {
      style.top = `${y}%`;
    } else if (anchor.includes('bottom')) {
      style.bottom = `${100 - y}%`;
    } else {
      style.top = `${y}%`;
      style.transform = (style.transform || '') + ' translateY(-50%)';
    }
    
    return style;
  };
  
  return (
    <div
      style={{
        position: 'absolute',
        ...getPositionStyle(),
        opacity,
        transform,
        fontSize: instruction.style.fontSize,
        fontWeight: instruction.style.fontWeight,
        color: instruction.style.color,
        textShadow: instruction.style.textShadow,
        backgroundColor: instruction.style.backgroundColor,
        padding: instruction.style.padding,
        borderRadius: instruction.style.backgroundColor ? '4px' : undefined,
        maxWidth: '80%',
        textAlign: 'center',
        lineHeight: 1.3,
      }}
    >
      {instruction.text}
    </div>
  );
};
```

### Create intelligent product overlay component:
```tsx
const IntelligentProductOverlay: React.FC<{
  productImage: string;
  instruction: SceneCompositionInstructions['productOverlay'];
  sceneDuration: number;
  fps: number;
}> = ({ productImage, instruction, sceneDuration, fps }) => {
  const frame = useCurrentFrame();
  
  if (!instruction?.enabled) {
    return null;
  }
  
  const enterFrames = 0.5 * fps;
  const exitFrames = 0.3 * fps;
  const totalFrames = sceneDuration * fps;
  
  // Fade in/out
  let opacity = 0;
  if (frame < enterFrames) {
    opacity = frame / enterFrames;
  } else if (frame > totalFrames - exitFrames) {
    opacity = (totalFrames - frame) / exitFrames;
  } else {
    opacity = 1;
  }
  
  // Scale animation for zoom enter
  let scale = instruction.scale;
  if (instruction.animation === 'zoom' && frame < enterFrames) {
    const progress = frame / enterFrames;
    scale = instruction.scale * (0.8 + (progress * 0.2));
  }
  
  const { x, y } = instruction.position;
  
  return (
    <div
      style={{
        position: 'absolute',
        right: `${100 - x}%`,
        bottom: `${100 - y}%`,
        opacity,
        transform: `scale(${scale})`,
        filter: instruction.shadow ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' : undefined,
      }}
    >
      <Img
        src={productImage}
        style={{
          maxWidth: '200px',
          maxHeight: '200px',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};
```

### Update the scene rendering to use instructions:

In your scene rendering code, replace fixed text positioning with:

```tsx
// Inside scene render function
const renderSceneContent = (scene: Scene, sceneFrame: number) => {
  const instructions = scene.compositionInstructions;
  
  return (
    <AbsoluteFill>
      {/* Background video/image */}
      {renderBackground(scene, sceneFrame)}
      
      {/* Text overlays with intelligent positioning */}
      {instructions?.textOverlays.map((textInstruction, idx) => (
        <IntelligentTextOverlay
          key={`text-${scene.id}-${idx}`}
          instruction={textInstruction}
          sceneDuration={scene.duration}
          fps={fps}
        />
      ))}
      
      {/* Product overlay with intelligent positioning */}
      {scene.assets?.productImage && instructions?.productOverlay && (
        <IntelligentProductOverlay
          productImage={scene.assets.productImage}
          instruction={instructions.productOverlay}
          sceneDuration={scene.duration}
          fps={fps}
        />
      )}
      
      {/* Lower third (if applicable) */}
      {scene.lowerThird && renderLowerThird(scene)}
    </AbsoluteFill>
  );
};
```

---

## Step 4: Add Fallback for Missing Instructions

If instructions aren't available (older projects), use defaults:

```typescript
// In composition-instructions-service.ts, add a method:

generateFallbackInstructions(
  sceneId: string,
  textOverlays: Array<{ text: string; style?: string }>
): SceneCompositionInstructions {
  return {
    sceneId,
    textOverlays: textOverlays.map((overlay, index) => ({
      text: overlay.text,
      position: {
        x: 50,
        y: 82 + (index * 8),
        anchor: 'bottom-center' as const,
      },
      style: {
        fontSize: this.getFontSize(overlay.style || 'body'),
        fontWeight: this.getFontWeight(overlay.style || 'body'),
        color: '#FFFFFF',
        textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
      },
      animation: {
        enter: 'fade' as const,
        exit: 'fade' as const,
        enterDuration: 0.5,
        exitDuration: 0.3,
        enterDelay: index * 0.15,
      },
    })),
  };
}
```

---

## Step 5: Test the Integration

1. Create a new video project with a script that includes faces
2. Generate assets
3. Check console for:
   - `[Assets] Scene 1 analyzed: { faces: 1, ... }`
   - `[Assets] Scene 1 instructions: { textPosition: { x: 50, y: 82 }, ... }`
4. Render the video
5. Verify text is NOT overlapping any faces

---

## Verification Checklist

Before moving to Phase 2C, confirm:

- [ ] `composition-instructions-service.ts` exists and exports service
- [ ] Instructions are generated after scene analysis
- [ ] Instructions stored in scene.compositionInstructions
- [ ] Remotion components use instructions for positioning
- [ ] Text avoids faces in rendered output
- [ ] Text color adapts to background
- [ ] Product overlay respects safe zones
- [ ] Fallback works for scenes without analysis

---

## Visual Verification

Compare before/after:

**Before (fixed positioning):**
- Text always in lower-third center
- May overlap faces
- White text on all backgrounds

**After (intelligent positioning):**
- Text positioned in safe zones
- Never overlaps faces
- Color/shadow adapts to background
- Product overlay in optimal position

---

## Troubleshooting

### Text still overlapping faces
- Check if analysis detected the face
- Verify safeZones in analysis result
- Check if instructions are being passed to Remotion

### Text in wrong position
- Check anchor calculation
- Verify x/y percentages are correct
- Check transform calculations in component

### Product overlay not showing
- Check if productOverlaySafe is false
- Verify enabled flag in instructions
- Check if product image URL is valid

---

## Next Phase

Once text placement is working correctly, proceed to **Phase 2C: Smart Transitions & Ken Burns** for intelligent motion effects.
