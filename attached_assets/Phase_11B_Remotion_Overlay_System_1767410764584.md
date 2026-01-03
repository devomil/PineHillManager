# Phase 11B: Remotion Overlay System

## Objective

Build Remotion components that render text, logos, and watermarks ON TOP of AI-generated backgrounds. These overlays are:
- Editable (user can change text)
- Properly styled (correct fonts, colors, contrast)
- Animated (fade in, slide up, etc.)
- Positioned intelligently (not covering faces)

## Components to Build

1. **TextOverlay** - General text with animation
2. **LogoOverlay** - Brand logo with positioning options
3. **WatermarkOverlay** - Corner watermark (persistent or periodic)
4. **LowerThird** - Name/title graphics (like news broadcasts)
5. **BulletList** - Animated list items (staggered appearance)
6. **CTAButton** - Call-to-action button graphic

## Implementation

### 1. TextOverlay Component

```tsx
// remotion/components/TextOverlay.tsx

import React from 'react';
import { 
  AbsoluteFill, 
  interpolate, 
  useCurrentFrame, 
  useVideoConfig,
  spring,
} from 'remotion';

export interface TextOverlayProps {
  text: string;
  position: 'top' | 'center' | 'bottom' | 'custom';
  customPosition?: { x: number; y: number }; // Percentage values
  alignment: 'left' | 'center' | 'right';
  style: {
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    color: string;
    backgroundColor?: string;
    backgroundOpacity?: number;
    padding?: number;
    borderRadius?: number;
    textShadow?: boolean;
  };
  animation: {
    type: 'none' | 'fade' | 'slide-up' | 'slide-left' | 'pop' | 'typewriter';
    duration: number; // in frames
    delay: number; // in frames
  };
  timing: {
    startFrame: number;
    endFrame: number;
  };
}

export const TextOverlay: React.FC<TextOverlayProps> = ({
  text,
  position,
  customPosition,
  alignment,
  style,
  animation,
  timing,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Only render within timing window
  if (frame < timing.startFrame || frame > timing.endFrame) {
    return null;
  }
  
  const localFrame = frame - timing.startFrame;
  const duration = timing.endFrame - timing.startFrame;
  const fadeOutStart = duration - Math.round(fps * 0.3);
  
  // Calculate opacity (fade in at start, fade out at end)
  let opacity = 1;
  if (animation.type !== 'none') {
    opacity = interpolate(
      localFrame,
      [animation.delay, animation.delay + animation.duration, fadeOutStart, duration],
      [0, 1, 1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }
  
  // Calculate transform based on animation type
  let transform = '';
  
  if (animation.type === 'slide-up') {
    const translateY = interpolate(
      localFrame,
      [animation.delay, animation.delay + animation.duration],
      [40, 0],
      { extrapolateRight: 'clamp' }
    );
    transform = `translateY(${translateY}px)`;
  } else if (animation.type === 'slide-left') {
    const translateX = interpolate(
      localFrame,
      [animation.delay, animation.delay + animation.duration],
      [60, 0],
      { extrapolateRight: 'clamp' }
    );
    transform = `translateX(${translateX}px)`;
  } else if (animation.type === 'pop') {
    const scale = spring({
      frame: localFrame - animation.delay,
      fps,
      config: { damping: 12, stiffness: 200 },
    });
    transform = `scale(${scale})`;
  }
  
  // Position calculation
  const getPositionStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      left: alignment === 'left' ? '5%' : alignment === 'right' ? 'auto' : '50%',
      right: alignment === 'right' ? '5%' : 'auto',
      transform: alignment === 'center' ? `translateX(-50%) ${transform}` : transform,
      textAlign: alignment,
    };
    
    if (position === 'custom' && customPosition) {
      return {
        ...base,
        left: `${customPosition.x}%`,
        top: `${customPosition.y}%`,
        transform: `translate(-50%, -50%) ${transform}`,
      };
    }
    
    switch (position) {
      case 'top':
        return { ...base, top: '10%' };
      case 'center':
        return { ...base, top: '50%', transform: `translate(-50%, -50%) ${transform}` };
      case 'bottom':
        return { ...base, bottom: '15%' };
      default:
        return { ...base, bottom: '15%' };
    }
  };
  
  // Typewriter effect
  const displayText = animation.type === 'typewriter'
    ? text.substring(0, Math.floor(interpolate(
        localFrame,
        [animation.delay, animation.delay + animation.duration],
        [0, text.length],
        { extrapolateRight: 'clamp' }
      )))
    : text;
  
  return (
    <div
      style={{
        ...getPositionStyles(),
        opacity,
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        color: style.color,
        backgroundColor: style.backgroundColor 
          ? `rgba(${hexToRgb(style.backgroundColor)}, ${style.backgroundOpacity || 0.8})`
          : 'transparent',
        padding: style.padding || 16,
        borderRadius: style.borderRadius || 8,
        textShadow: style.textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
        maxWidth: '80%',
        lineHeight: 1.4,
      }}
    >
      {displayText}
    </div>
  );
};

// Helper to convert hex to RGB
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
```

### 2. LogoOverlay Component

```tsx
// remotion/components/LogoOverlay.tsx

import React from 'react';
import { Img, interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';

export interface LogoOverlayProps {
  logoUrl: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom';
  customPosition?: { x: number; y: number };
  size: number; // Percentage of video width
  opacity: number;
  animation: {
    type: 'none' | 'fade' | 'zoom' | 'slide';
    duration: number;
    delay: number;
  };
  timing: {
    startFrame: number;
    endFrame: number;
  };
  // Optional tagline under logo
  tagline?: string;
  taglineStyle?: {
    fontSize: number;
    color: string;
  };
}

export const LogoOverlay: React.FC<LogoOverlayProps> = ({
  logoUrl,
  position,
  customPosition,
  size,
  opacity: maxOpacity,
  animation,
  timing,
  tagline,
  taglineStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  
  if (frame < timing.startFrame || frame > timing.endFrame) {
    return null;
  }
  
  const localFrame = frame - timing.startFrame;
  const duration = timing.endFrame - timing.startFrame;
  
  // Fade animation
  let opacity = maxOpacity;
  if (animation.type !== 'none') {
    opacity = interpolate(
      localFrame,
      [animation.delay, animation.delay + animation.duration, duration - fps * 0.5, duration],
      [0, maxOpacity, maxOpacity, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }
  
  // Transform animation
  let transform = '';
  if (animation.type === 'zoom') {
    const scale = spring({
      frame: localFrame - animation.delay,
      fps,
      config: { damping: 15, stiffness: 180 },
    });
    transform = `scale(${Math.min(scale, 1)})`;
  } else if (animation.type === 'slide') {
    const translateY = interpolate(
      localFrame,
      [animation.delay, animation.delay + animation.duration],
      [-50, 0],
      { extrapolateRight: 'clamp' }
    );
    transform = `translateY(${translateY}px)`;
  }
  
  // Position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 20, left: 20 },
    'top-right': { top: 20, right: 20 },
    'bottom-left': { bottom: 20, left: 20 },
    'bottom-right': { bottom: 20, right: 20 },
    'center': { top: '50%', left: '50%', transform: `translate(-50%, -50%) ${transform}` },
    'custom': customPosition 
      ? { top: `${customPosition.y}%`, left: `${customPosition.x}%`, transform: `translate(-50%, -50%) ${transform}` }
      : {},
  };
  
  const logoWidth = (size / 100) * width;
  
  return (
    <div
      style={{
        position: 'absolute',
        ...positionStyles[position],
        opacity,
        transform: position !== 'center' && position !== 'custom' ? transform : undefined,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Img
        src={logoUrl}
        style={{
          width: logoWidth,
          height: 'auto',
          objectFit: 'contain',
        }}
      />
      {tagline && (
        <div
          style={{
            marginTop: 8,
            fontSize: taglineStyle?.fontSize || 16,
            color: taglineStyle?.color || '#FFFFFF',
            fontFamily: 'Inter, sans-serif',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          {tagline}
        </div>
      )}
    </div>
  );
};
```

### 3. WatermarkOverlay Component

```tsx
// remotion/components/WatermarkOverlay.tsx

import React from 'react';
import { Img, useCurrentFrame, useVideoConfig } from 'remotion';

export interface WatermarkOverlayProps {
  logoUrl: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size: number; // Percentage of video width (typically 8-12%)
  opacity: number; // Typically 0.5-0.7
  margin: number; // Pixels from edge
  showDuring: 'all' | 'middle' | 'custom';
  customTiming?: {
    startFrame: number;
    endFrame: number;
  };
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({
  logoUrl,
  position,
  size,
  opacity,
  margin,
  showDuring,
  customTiming,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width } = useVideoConfig();
  
  // Determine visibility
  let visible = true;
  
  if (showDuring === 'middle') {
    const introFrames = Math.round(fps * 3); // Skip first 3 seconds
    const outroFrames = Math.round(fps * 5); // Skip last 5 seconds
    visible = frame > introFrames && frame < (durationInFrames - outroFrames);
  } else if (showDuring === 'custom' && customTiming) {
    visible = frame >= customTiming.startFrame && frame <= customTiming.endFrame;
  }
  
  if (!visible) return null;
  
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: margin, left: margin },
    'top-right': { top: margin, right: margin },
    'bottom-left': { bottom: margin, left: margin },
    'bottom-right': { bottom: margin, right: margin },
  };
  
  const logoWidth = (size / 100) * width;
  
  return (
    <div
      style={{
        position: 'absolute',
        ...positionStyles[position],
        opacity,
      }}
    >
      <Img
        src={logoUrl}
        style={{
          width: logoWidth,
          height: 'auto',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};
```

### 4. LowerThird Component

```tsx
// remotion/components/LowerThird.tsx

import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';

export interface LowerThirdProps {
  name: string;
  title?: string;
  style: {
    primaryColor: string; // Background color
    secondaryColor: string; // Accent color
    textColor: string;
    fontSize: number;
  };
  position: 'left' | 'right';
  timing: {
    startFrame: number;
    endFrame: number;
  };
}

export const LowerThird: React.FC<LowerThirdProps> = ({
  name,
  title,
  style,
  position,
  timing,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  if (frame < timing.startFrame || frame > timing.endFrame) {
    return null;
  }
  
  const localFrame = frame - timing.startFrame;
  const duration = timing.endFrame - timing.startFrame;
  
  // Slide in animation
  const slideProgress = spring({
    frame: localFrame,
    fps,
    config: { damping: 15, stiffness: 120 },
  });
  
  // Fade out
  const opacity = interpolate(
    localFrame,
    [duration - fps * 0.5, duration],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const translateX = position === 'left'
    ? interpolate(slideProgress, [0, 1], [-300, 0])
    : interpolate(slideProgress, [0, 1], [300, 0]);
  
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '15%',
        [position]: 40,
        transform: `translateX(${translateX}px)`,
        opacity,
        display: 'flex',
        alignItems: 'stretch',
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          width: 6,
          backgroundColor: style.secondaryColor,
          borderRadius: position === 'left' ? '4px 0 0 4px' : '0 4px 4px 0',
        }}
      />
      
      {/* Content */}
      <div
        style={{
          backgroundColor: style.primaryColor,
          padding: '12px 24px',
          borderRadius: position === 'left' ? '0 4px 4px 0' : '4px 0 0 4px',
        }}
      >
        <div
          style={{
            fontSize: style.fontSize,
            fontWeight: 'bold',
            color: style.textColor,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {name}
        </div>
        {title && (
          <div
            style={{
              fontSize: style.fontSize * 0.75,
              color: style.textColor,
              opacity: 0.8,
              fontFamily: 'Inter, sans-serif',
              marginTop: 4,
            }}
          >
            {title}
          </div>
        )}
      </div>
    </div>
  );
};
```

### 5. BulletList Component

```tsx
// remotion/components/BulletList.tsx

import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';

export interface BulletListProps {
  items: string[];
  position: 'left' | 'center' | 'right';
  verticalPosition: number; // Percentage from top
  style: {
    fontSize: number;
    color: string;
    backgroundColor: string;
    backgroundOpacity: number;
    bulletColor: string;
  };
  animation: {
    staggerDelay: number; // Frames between each item appearing
    itemDuration: number; // Animation duration for each item
  };
  timing: {
    startFrame: number;
    endFrame: number;
  };
}

export const BulletList: React.FC<BulletListProps> = ({
  items,
  position,
  verticalPosition,
  style,
  animation,
  timing,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  if (frame < timing.startFrame || frame > timing.endFrame) {
    return null;
  }
  
  const localFrame = frame - timing.startFrame;
  const duration = timing.endFrame - timing.startFrame;
  
  // Global fade out
  const globalOpacity = interpolate(
    localFrame,
    [duration - fps * 0.5, duration],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const alignItems = position === 'left' ? 'flex-start' : position === 'right' ? 'flex-end' : 'center';
  
  return (
    <div
      style={{
        position: 'absolute',
        top: `${verticalPosition}%`,
        left: position === 'left' ? '5%' : position === 'right' ? 'auto' : '50%',
        right: position === 'right' ? '5%' : 'auto',
        transform: position === 'center' ? 'translateX(-50%)' : 'none',
        opacity: globalOpacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems,
        gap: 12,
      }}
    >
      {items.map((item, index) => {
        const itemStartFrame = index * animation.staggerDelay;
        const itemProgress = spring({
          frame: localFrame - itemStartFrame,
          fps,
          config: { damping: 12, stiffness: 150 },
        });
        
        const itemOpacity = Math.min(itemProgress, 1);
        const translateY = interpolate(itemProgress, [0, 1], [20, 0]);
        
        return (
          <div
            key={index}
            style={{
              opacity: itemOpacity,
              transform: `translateY(${translateY}px)`,
              backgroundColor: `rgba(${hexToRgb(style.backgroundColor)}, ${style.backgroundOpacity})`,
              padding: '10px 20px',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ color: style.bulletColor, fontSize: style.fontSize * 1.2 }}>•</span>
            <span style={{ 
              color: style.color, 
              fontSize: style.fontSize, 
              fontFamily: 'Inter, sans-serif',
            }}>
              {item}
            </span>
          </div>
        );
      })}
    </div>
  );
};

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
```

## Scene Composition with Overlays

```tsx
// remotion/compositions/SceneWithOverlays.tsx

import React from 'react';
import { AbsoluteFill, Sequence, Img, Video } from 'remotion';
import { TextOverlay, TextOverlayProps } from '../components/TextOverlay';
import { LogoOverlay, LogoOverlayProps } from '../components/LogoOverlay';
import { WatermarkOverlay, WatermarkOverlayProps } from '../components/WatermarkOverlay';
import { LowerThird, LowerThirdProps } from '../components/LowerThird';
import { BulletList, BulletListProps } from '../components/BulletList';

interface SceneProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  durationInFrames: number;
  overlays: {
    texts?: TextOverlayProps[];
    logo?: LogoOverlayProps;
    watermark?: WatermarkOverlayProps;
    lowerThirds?: LowerThirdProps[];
    bulletLists?: BulletListProps[];
  };
}

export const SceneWithOverlays: React.FC<SceneProps> = ({
  mediaUrl,
  mediaType,
  durationInFrames,
  overlays,
}) => {
  return (
    <AbsoluteFill>
      {/* Background media */}
      {mediaType === 'video' ? (
        <Video src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <Img src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      
      {/* Text overlays */}
      {overlays.texts?.map((textProps, i) => (
        <TextOverlay key={`text-${i}`} {...textProps} />
      ))}
      
      {/* Bullet lists */}
      {overlays.bulletLists?.map((listProps, i) => (
        <BulletList key={`bullets-${i}`} {...listProps} />
      ))}
      
      {/* Lower thirds */}
      {overlays.lowerThirds?.map((ltProps, i) => (
        <LowerThird key={`lt-${i}`} {...ltProps} />
      ))}
      
      {/* Logo (intro/CTA scenes) */}
      {overlays.logo && <LogoOverlay {...overlays.logo} />}
      
      {/* Watermark (persistent) */}
      {overlays.watermark && <WatermarkOverlay {...overlays.watermark} />}
    </AbsoluteFill>
  );
};
```

## PHF Brand Defaults

```typescript
// config/brand-overlay-defaults.ts

export const PHF_OVERLAY_DEFAULTS = {
  text: {
    fontFamily: 'Inter, system-ui, sans-serif',
    primaryColor: '#2D5A27', // Forest Green
    secondaryColor: '#D4A574', // Warm Gold
    backgroundColor: '#2D5A27',
    textColor: '#FFFFFF',
  },
  logo: {
    url: '/assets/brand/phf-logo.png',
    tagline: 'Cultivating Wellness',
  },
  watermark: {
    url: '/assets/brand/phf-icon.png',
    position: 'bottom-right' as const,
    size: 8, // 8% of width
    opacity: 0.7,
    margin: 20,
  },
  lowerThird: {
    primaryColor: '#2D5A27',
    secondaryColor: '#D4A574',
    textColor: '#FFFFFF',
  },
};
```

## Verification Checklist

- [ ] TextOverlay component renders with animation
- [ ] LogoOverlay component positions correctly
- [ ] WatermarkOverlay appears in corner
- [ ] LowerThird slides in properly
- [ ] BulletList staggers items
- [ ] SceneWithOverlays composes all layers
- [ ] PHF brand colors applied correctly
- [ ] Animations are smooth (spring physics)
- [ ] Text is readable (contrast, shadows)
- [ ] Overlays don't cover important content

## Next Phase

Once Remotion overlay components are built, proceed to **Phase 11C: Overlay UI Controls** to add the editor interface for configuring these overlays.
