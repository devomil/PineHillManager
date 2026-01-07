# Phase 12E: Split-Screen Compositor

## Objective

Build Remotion components for multi-panel layouts including split-screens, before/after comparisons, and picture-in-picture. These are essential for scenes that show comparisons, multiple perspectives, or overlay content.

## Prerequisites

- Phase 12A-D complete
- Remotion media handling working

## What This Phase Creates

- `remotion/components/motion-graphics/SplitScreen.tsx` - Multi-panel layouts
- `remotion/components/motion-graphics/BeforeAfter.tsx` - Comparison slider/wipe
- `remotion/components/motion-graphics/PictureInPicture.tsx` - PiP overlay
- `server/services/split-screen-service.ts` - Backend config generator

---

## Step 1: Create Split Screen Component

Create `remotion/components/motion-graphics/SplitScreen.tsx`:

```tsx
// remotion/components/motion-graphics/SplitScreen.tsx

import React from 'react';
import {
  AbsoluteFill,
  Img,
  Video,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

export interface SplitPanel {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  label?: string;
  labelPosition?: 'top' | 'bottom' | 'overlay';
}

export type SplitLayout = 
  | '2-horizontal'   // Side by side
  | '2-vertical'     // Top and bottom
  | '3-horizontal'   // Three columns
  | '3-vertical'     // Three rows
  | '4-grid'         // 2x2 grid
  | '1-2-horizontal' // One large, two small
  | '2-1-horizontal' // Two small, one large
  | '1-2-vertical'   // One large top, two small bottom
  | '2-1-vertical';  // Two small top, one large bottom

export interface SplitScreenProps {
  panels: SplitPanel[];
  layout: SplitLayout;
  
  // Divider styling
  dividerStyle: {
    width: number;
    color: string;
    animated: boolean;
  };
  
  // Label styling
  labelStyle: {
    fontSize: number;
    fontWeight: string | number;
    fontFamily: string;
    color: string;
    backgroundColor: string;
    backgroundOpacity: number;
    padding: number;
  };
  
  // Animation
  transitionType: 'simultaneous' | 'sequential' | 'wipe-left' | 'wipe-right' | 'wipe-down';
  transitionDuration: number;
  staggerDelay: number;
  
  // Background
  backgroundColor: string;
}

export const SplitScreen: React.FC<SplitScreenProps> = ({
  panels,
  layout,
  dividerStyle,
  labelStyle,
  transitionType,
  transitionDuration,
  staggerDelay,
  backgroundColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  
  // Calculate panel positions based on layout
  const panelConfigs = calculatePanelPositions(layout, width, height, dividerStyle.width);
  
  // Exit animation
  const exitStartFrame = durationInFrames - Math.round(fps * 0.5);
  const exitOpacity = frame >= exitStartFrame
    ? interpolate(frame, [exitStartFrame, durationInFrames], [1, 0], { extrapolateRight: 'clamp' })
    : 1;
  
  return (
    <AbsoluteFill style={{ backgroundColor, opacity: exitOpacity }}>
      {/* Panels */}
      {panels.map((panel, index) => {
        if (index >= panelConfigs.length) return null;
        
        const config = panelConfigs[index];
        const startFrame = transitionType === 'sequential' ? index * staggerDelay : 0;
        const localFrame = frame - startFrame;
        
        // Calculate entrance animation
        let clipPath = 'none';
        let opacity = 1;
        let transform = '';
        
        if (localFrame < transitionDuration) {
          const progress = Math.max(0, localFrame / transitionDuration);
          
          switch (transitionType) {
            case 'wipe-left':
              clipPath = `inset(0 ${(1 - progress) * 100}% 0 0)`;
              break;
            case 'wipe-right':
              clipPath = `inset(0 0 0 ${(1 - progress) * 100}%)`;
              break;
            case 'wipe-down':
              clipPath = `inset(0 0 ${(1 - progress) * 100}% 0)`;
              break;
            case 'sequential':
              opacity = progress;
              transform = `scale(${0.9 + progress * 0.1})`;
              break;
            default:
              opacity = progress;
          }
        }
        
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: config.x,
              top: config.y,
              width: config.width,
              height: config.height,
              overflow: 'hidden',
              clipPath,
              opacity,
              transform,
            }}
          >
            {/* Media */}
            {panel.mediaType === 'video' ? (
              <Video
                src={panel.mediaUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <Img
                src={panel.mediaUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}
            
            {/* Label */}
            {panel.label && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  ...(panel.labelPosition === 'top' && { top: 0 }),
                  ...(panel.labelPosition === 'bottom' && { bottom: 0 }),
                  ...(panel.labelPosition === 'overlay' && { top: '50%', transform: 'translateY(-50%)' }),
                  padding: labelStyle.padding,
                  backgroundColor: `rgba(${hexToRgb(labelStyle.backgroundColor)}, ${labelStyle.backgroundOpacity})`,
                  textAlign: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: labelStyle.fontSize,
                    fontWeight: labelStyle.fontWeight,
                    fontFamily: labelStyle.fontFamily,
                    color: labelStyle.color,
                  }}
                >
                  {panel.label}
                </span>
              </div>
            )}
          </div>
        );
      })}
      
      {/* Dividers */}
      {dividerStyle.width > 0 && (
        <Dividers
          layout={layout}
          dividerStyle={dividerStyle}
          width={width}
          height={height}
          frame={frame}
          transitionDuration={transitionDuration}
        />
      )}
    </AbsoluteFill>
  );
};

// Calculate panel positions based on layout
function calculatePanelPositions(
  layout: SplitLayout,
  width: number,
  height: number,
  dividerWidth: number
): Array<{ x: number; y: number; width: number; height: number }> {
  const gap = dividerWidth;
  
  switch (layout) {
    case '2-horizontal':
      return [
        { x: 0, y: 0, width: (width - gap) / 2, height },
        { x: (width + gap) / 2, y: 0, width: (width - gap) / 2, height },
      ];
      
    case '2-vertical':
      return [
        { x: 0, y: 0, width, height: (height - gap) / 2 },
        { x: 0, y: (height + gap) / 2, width, height: (height - gap) / 2 },
      ];
      
    case '3-horizontal':
      const thirdWidth = (width - gap * 2) / 3;
      return [
        { x: 0, y: 0, width: thirdWidth, height },
        { x: thirdWidth + gap, y: 0, width: thirdWidth, height },
        { x: (thirdWidth + gap) * 2, y: 0, width: thirdWidth, height },
      ];
      
    case '3-vertical':
      const thirdHeight = (height - gap * 2) / 3;
      return [
        { x: 0, y: 0, width, height: thirdHeight },
        { x: 0, y: thirdHeight + gap, width, height: thirdHeight },
        { x: 0, y: (thirdHeight + gap) * 2, width, height: thirdHeight },
      ];
      
    case '4-grid':
      const halfWidth = (width - gap) / 2;
      const halfHeight = (height - gap) / 2;
      return [
        { x: 0, y: 0, width: halfWidth, height: halfHeight },
        { x: halfWidth + gap, y: 0, width: halfWidth, height: halfHeight },
        { x: 0, y: halfHeight + gap, width: halfWidth, height: halfHeight },
        { x: halfWidth + gap, y: halfHeight + gap, width: halfWidth, height: halfHeight },
      ];
      
    case '1-2-horizontal':
      const twoThirds = (width - gap) * 2 / 3;
      const oneThird = (width - gap) / 3;
      return [
        { x: 0, y: 0, width: twoThirds, height },
        { x: twoThirds + gap, y: 0, width: oneThird, height: (height - gap) / 2 },
        { x: twoThirds + gap, y: (height + gap) / 2, width: oneThird, height: (height - gap) / 2 },
      ];
      
    default:
      return [{ x: 0, y: 0, width, height }];
  }
}

// Divider lines component
const Dividers: React.FC<{
  layout: SplitLayout;
  dividerStyle: SplitScreenProps['dividerStyle'];
  width: number;
  height: number;
  frame: number;
  transitionDuration: number;
}> = ({ layout, dividerStyle, width, height, frame, transitionDuration }) => {
  const progress = Math.min(frame / transitionDuration, 1);
  const animatedLength = dividerStyle.animated ? progress : 1;
  
  const getDividers = () => {
    const dividers: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    
    switch (layout) {
      case '2-horizontal':
        dividers.push({ x1: width / 2, y1: 0, x2: width / 2, y2: height });
        break;
      case '2-vertical':
        dividers.push({ x1: 0, y1: height / 2, x2: width, y2: height / 2 });
        break;
      case '4-grid':
        dividers.push({ x1: width / 2, y1: 0, x2: width / 2, y2: height });
        dividers.push({ x1: 0, y1: height / 2, x2: width, y2: height / 2 });
        break;
    }
    
    return dividers;
  };
  
  return (
    <svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      {getDividers().map((d, i) => {
        const length = Math.sqrt(Math.pow(d.x2 - d.x1, 2) + Math.pow(d.y2 - d.y1, 2));
        return (
          <line
            key={i}
            x1={d.x1}
            y1={d.y1}
            x2={d.x1 + (d.x2 - d.x1) * animatedLength}
            y2={d.y1 + (d.y2 - d.y1) * animatedLength}
            stroke={dividerStyle.color}
            strokeWidth={dividerStyle.width}
          />
        );
      })}
    </svg>
  );
};

// Helper to convert hex to RGB
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

export default SplitScreen;
```

---

## Step 2: Create Before/After Component

Create `remotion/components/motion-graphics/BeforeAfter.tsx`:

```tsx
// remotion/components/motion-graphics/BeforeAfter.tsx

import React from 'react';
import {
  AbsoluteFill,
  Img,
  Video,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

export interface BeforeAfterProps {
  beforeMedia: {
    url: string;
    type: 'image' | 'video';
    label: string;
  };
  afterMedia: {
    url: string;
    type: 'image' | 'video';
    label: string;
  };
  
  // Transition style
  transitionStyle: 'slider' | 'fade' | 'wipe' | 'flip';
  
  // Slider settings (for slider style)
  sliderConfig?: {
    startPosition: number; // 0-100
    endPosition: number; // 0-100
    handleColor: string;
    handleWidth: number;
  };
  
  // Label styling
  labelStyle: {
    fontSize: number;
    fontWeight: string | number;
    fontFamily: string;
    color: string;
    backgroundColor: string;
    backgroundOpacity: number;
  };
  
  // Animation timing
  transitionStartFrame: number;
  transitionDuration: number;
  holdBeforeFrames: number;
  holdAfterFrames: number;
  
  // Background
  backgroundColor: string;
}

export const BeforeAfter: React.FC<BeforeAfterProps> = ({
  beforeMedia,
  afterMedia,
  transitionStyle,
  sliderConfig = {
    startPosition: 100,
    endPosition: 0,
    handleColor: '#FFFFFF',
    handleWidth: 6,
  },
  labelStyle,
  transitionStartFrame,
  transitionDuration,
  holdBeforeFrames,
  holdAfterFrames,
  backgroundColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  
  // Calculate transition progress
  const transitionProgress = interpolate(
    frame,
    [
      transitionStartFrame,
      transitionStartFrame + transitionDuration,
    ],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Exit animation
  const exitStartFrame = durationInFrames - Math.round(fps * 0.5);
  const exitOpacity = frame >= exitStartFrame
    ? interpolate(frame, [exitStartFrame, durationInFrames], [1, 0], { extrapolateRight: 'clamp' })
    : 1;
  
  // Render media component
  const renderMedia = (media: typeof beforeMedia, style?: React.CSSProperties) => {
    if (media.type === 'video') {
      return (
        <Video
          src={media.url}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            ...style,
          }}
        />
      );
    }
    return (
      <Img
        src={media.url}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          ...style,
        }}
      />
    );
  };
  
  // Render label
  const renderLabel = (label: string, position: 'left' | 'right') => (
    <div
      style={{
        position: 'absolute',
        top: 20,
        [position]: 20,
        padding: '8px 16px',
        backgroundColor: `rgba(${hexToRgb(labelStyle.backgroundColor)}, ${labelStyle.backgroundOpacity})`,
        borderRadius: 4,
      }}
    >
      <span
        style={{
          fontSize: labelStyle.fontSize,
          fontWeight: labelStyle.fontWeight,
          fontFamily: labelStyle.fontFamily,
          color: labelStyle.color,
        }}
      >
        {label}
      </span>
    </div>
  );
  
  // Slider position
  const sliderPosition = interpolate(
    transitionProgress,
    [0, 1],
    [sliderConfig.startPosition, sliderConfig.endPosition]
  );
  
  return (
    <AbsoluteFill style={{ backgroundColor, opacity: exitOpacity }}>
      {transitionStyle === 'slider' && (
        <>
          {/* Before (full) */}
          <AbsoluteFill>
            {renderMedia(beforeMedia)}
            {renderLabel(beforeMedia.label, 'left')}
          </AbsoluteFill>
          
          {/* After (clipped) */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              clipPath: `inset(0 0 0 ${sliderPosition}%)`,
            }}
          >
            {renderMedia(afterMedia)}
            {renderLabel(afterMedia.label, 'right')}
          </div>
          
          {/* Slider handle */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `${sliderPosition}%`,
              width: sliderConfig.handleWidth,
              height: '100%',
              backgroundColor: sliderConfig.handleColor,
              transform: 'translateX(-50%)',
              boxShadow: '0 0 10px rgba(0,0,0,0.3)',
            }}
          >
            {/* Handle grip */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: sliderConfig.handleColor,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ display: 'flex', gap: 4 }}>
                <div style={{ width: 2, height: 16, backgroundColor: '#666' }} />
                <div style={{ width: 2, height: 16, backgroundColor: '#666' }} />
              </div>
            </div>
          </div>
        </>
      )}
      
      {transitionStyle === 'fade' && (
        <>
          <AbsoluteFill style={{ opacity: 1 - transitionProgress }}>
            {renderMedia(beforeMedia)}
            {renderLabel(beforeMedia.label, 'left')}
          </AbsoluteFill>
          <AbsoluteFill style={{ opacity: transitionProgress }}>
            {renderMedia(afterMedia)}
            {renderLabel(afterMedia.label, 'right')}
          </AbsoluteFill>
        </>
      )}
      
      {transitionStyle === 'wipe' && (
        <>
          <AbsoluteFill>
            {renderMedia(beforeMedia)}
            {renderLabel(beforeMedia.label, 'left')}
          </AbsoluteFill>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              clipPath: `inset(0 ${100 - transitionProgress * 100}% 0 0)`,
            }}
          >
            {renderMedia(afterMedia)}
            {renderLabel(afterMedia.label, 'right')}
          </div>
        </>
      )}
      
      {transitionStyle === 'flip' && (
        <div
          style={{
            width: '100%',
            height: '100%',
            perspective: 1000,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              transformStyle: 'preserve-3d',
              transform: `rotateY(${transitionProgress * 180}deg)`,
            }}
          >
            {/* Before (front) */}
            <AbsoluteFill
              style={{
                backfaceVisibility: 'hidden',
              }}
            >
              {renderMedia(beforeMedia)}
              {renderLabel(beforeMedia.label, 'left')}
            </AbsoluteFill>
            
            {/* After (back) */}
            <AbsoluteFill
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              {renderMedia(afterMedia)}
              {renderLabel(afterMedia.label, 'right')}
            </AbsoluteFill>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

export default BeforeAfter;
```

---

## Step 3: Create Picture-in-Picture Component

Create `remotion/components/motion-graphics/PictureInPicture.tsx`:

```tsx
// remotion/components/motion-graphics/PictureInPicture.tsx

import React from 'react';
import {
  AbsoluteFill,
  Img,
  Video,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

export interface PictureInPictureProps {
  mainMedia: {
    url: string;
    type: 'image' | 'video';
  };
  pipMedia: {
    url: string;
    type: 'image' | 'video';
    label?: string;
  };
  
  // PiP positioning
  pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  pipSize: number; // Percentage of main width
  pipMargin: number; // Pixels from edge
  
  // PiP styling
  pipStyle: {
    borderWidth: number;
    borderColor: string;
    borderRadius: number;
    shadow: boolean;
  };
  
  // Label styling
  labelStyle?: {
    fontSize: number;
    fontWeight: string | number;
    fontFamily: string;
    color: string;
    backgroundColor: string;
  };
  
  // Animation
  pipEntranceFrame: number;
  pipEntranceDuration: number;
  pipEntranceStyle: 'fade' | 'scale' | 'slide';
  
  // Background
  backgroundColor: string;
}

export const PictureInPicture: React.FC<PictureInPictureProps> = ({
  mainMedia,
  pipMedia,
  pipPosition,
  pipSize,
  pipMargin,
  pipStyle,
  labelStyle,
  pipEntranceFrame,
  pipEntranceDuration,
  pipEntranceStyle,
  backgroundColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  
  // PiP dimensions
  const pipWidth = width * (pipSize / 100);
  const pipHeight = pipWidth * (9 / 16); // Maintain 16:9 aspect
  
  // PiP position
  const pipPositionStyles: React.CSSProperties = {
    position: 'absolute',
    width: pipWidth,
    height: pipHeight,
  };
  
  switch (pipPosition) {
    case 'top-left':
      pipPositionStyles.top = pipMargin;
      pipPositionStyles.left = pipMargin;
      break;
    case 'top-right':
      pipPositionStyles.top = pipMargin;
      pipPositionStyles.right = pipMargin;
      break;
    case 'bottom-left':
      pipPositionStyles.bottom = pipMargin;
      pipPositionStyles.left = pipMargin;
      break;
    case 'bottom-right':
      pipPositionStyles.bottom = pipMargin;
      pipPositionStyles.right = pipMargin;
      break;
  }
  
  // PiP entrance animation
  const pipLocalFrame = frame - pipEntranceFrame;
  let pipOpacity = 0;
  let pipTransform = '';
  
  if (pipLocalFrame >= 0) {
    const progress = Math.min(pipLocalFrame / pipEntranceDuration, 1);
    const springProgress = spring({
      frame: pipLocalFrame,
      fps,
      config: { damping: 15, stiffness: 200 },
    });
    
    switch (pipEntranceStyle) {
      case 'fade':
        pipOpacity = progress;
        break;
      case 'scale':
        pipOpacity = progress;
        pipTransform = `scale(${Math.min(springProgress, 1)})`;
        break;
      case 'slide':
        pipOpacity = progress;
        const slideOffset = (1 - Math.min(springProgress, 1)) * 50;
        if (pipPosition.includes('right')) {
          pipTransform = `translateX(${slideOffset}px)`;
        } else {
          pipTransform = `translateX(${-slideOffset}px)`;
        }
        break;
    }
  }
  
  // Exit animation
  const exitStartFrame = durationInFrames - Math.round(fps * 0.5);
  const exitOpacity = frame >= exitStartFrame
    ? interpolate(frame, [exitStartFrame, durationInFrames], [1, 0], { extrapolateRight: 'clamp' })
    : 1;
  
  // Render media
  const renderMedia = (media: typeof mainMedia, style?: React.CSSProperties) => {
    if (media.type === 'video') {
      return (
        <Video
          src={media.url}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            ...style,
          }}
        />
      );
    }
    return (
      <Img
        src={media.url}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          ...style,
        }}
      />
    );
  };
  
  return (
    <AbsoluteFill style={{ backgroundColor, opacity: exitOpacity }}>
      {/* Main media */}
      <AbsoluteFill>
        {renderMedia(mainMedia)}
      </AbsoluteFill>
      
      {/* PiP overlay */}
      <div
        style={{
          ...pipPositionStyles,
          opacity: pipOpacity,
          transform: pipTransform,
          border: `${pipStyle.borderWidth}px solid ${pipStyle.borderColor}`,
          borderRadius: pipStyle.borderRadius,
          overflow: 'hidden',
          boxShadow: pipStyle.shadow ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
        }}
      >
        {renderMedia(pipMedia)}
        
        {/* PiP label */}
        {pipMedia.label && labelStyle && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '6px 10px',
              backgroundColor: labelStyle.backgroundColor,
              textAlign: 'center',
            }}
          >
            <span
              style={{
                fontSize: labelStyle.fontSize,
                fontWeight: labelStyle.fontWeight,
                fontFamily: labelStyle.fontFamily,
                color: labelStyle.color,
              }}
            >
              {pipMedia.label}
            </span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export default PictureInPicture;
```

---

## Step 4: Create Split Screen Service

Create `server/services/split-screen-service.ts`:

```typescript
// server/services/split-screen-service.ts

import { SplitScreenConfig, BeforeAfterConfig } from '../../shared/types/motion-graphics-types';
import { brandBibleService } from './brand-bible-service';

class SplitScreenService {
  
  /**
   * Generate split screen configuration
   */
  async generateSplitScreenConfig(
    panels: Array<{ url: string; type: 'image' | 'video'; label?: string }>,
    duration: number,
    options?: {
      layout?: string;
      transitionType?: string;
    }
  ): Promise<SplitScreenConfig> {
    const brandColors = await this.getBrandColors();
    const fps = 30;
    
    // Auto-determine layout based on panel count
    let layout: string;
    if (options?.layout) {
      layout = options.layout;
    } else {
      switch (panels.length) {
        case 2:
          layout = '2-horizontal';
          break;
        case 3:
          layout = '3-horizontal';
          break;
        case 4:
          layout = '4-grid';
          break;
        default:
          layout = '2-horizontal';
      }
    }
    
    return {
      type: 'split-screen',
      duration,
      fps,
      width: 1920,
      height: 1080,
      backgroundColor: '#000000',
      brandColors,
      layout: layout as any,
      panels: panels.map(p => ({
        mediaUrl: p.url,
        mediaType: p.type,
        label: p.label,
        labelPosition: 'bottom' as const,
      })),
      dividerStyle: {
        width: 4,
        color: brandColors.secondary,
        animated: true,
      },
      transitionType: (options?.transitionType || 'simultaneous') as any,
      transitionDuration: Math.round(fps * 0.5),
    };
  }
  
  /**
   * Generate before/after configuration
   */
  async generateBeforeAfterConfig(
    before: { url: string; type: 'image' | 'video'; label: string },
    after: { url: string; type: 'image' | 'video'; label: string },
    duration: number,
    options?: {
      transitionStyle?: 'slider' | 'fade' | 'wipe' | 'flip';
    }
  ): Promise<BeforeAfterConfig> {
    const brandColors = await this.getBrandColors();
    const fps = 30;
    const totalFrames = duration * fps;
    
    return {
      type: 'before-after',
      duration,
      fps,
      width: 1920,
      height: 1080,
      backgroundColor: '#000000',
      brandColors,
      beforeMedia: {
        url: before.url,
        type: before.type,
        label: before.label,
      },
      afterMedia: {
        url: after.url,
        type: after.type,
        label: after.label,
      },
      transitionStyle: options?.transitionStyle || 'slider',
      sliderPosition: 50,
      labelStyle: {
        fontSize: 24,
        color: '#FFFFFF',
        backgroundColor: brandColors.primary,
      },
    };
  }
  
  /**
   * Parse visual direction for split screen content
   */
  parseSplitScreenFromDirection(visualDirection: string): {
    type: 'split-screen' | 'before-after' | 'pip' | 'unknown';
    panelCount: number;
    labels: string[];
  } {
    const lower = visualDirection.toLowerCase();
    
    if (lower.includes('before') && lower.includes('after')) {
      return {
        type: 'before-after',
        panelCount: 2,
        labels: ['Before', 'After'],
      };
    }
    
    if (lower.includes('picture in picture') || lower.includes('pip')) {
      return {
        type: 'pip',
        panelCount: 2,
        labels: [],
      };
    }
    
    if (lower.includes('split screen') || lower.includes('side by side')) {
      // Try to extract panel count
      const countMatch = lower.match(/(\d+)\s*(?:panel|way|screen)/);
      const panelCount = countMatch ? parseInt(countMatch[1]) : 2;
      
      // Try to extract labels
      const labelMatch = visualDirection.match(/(?:showing|comparing|displaying)\s*([^.]+)/i);
      const labels = labelMatch 
        ? labelMatch[1].split(/,|and|vs/).map(s => s.trim()).filter(Boolean)
        : [];
      
      return {
        type: 'split-screen',
        panelCount,
        labels,
      };
    }
    
    return {
      type: 'unknown',
      panelCount: 0,
      labels: [],
    };
  }
  
  /**
   * Get brand colors
   */
  private async getBrandColors() {
    try {
      const bible = await brandBibleService.getBrandBible();
      return {
        primary: bible.colors?.primary || '#2D5A27',
        secondary: bible.colors?.secondary || '#D4A574',
        accent: bible.colors?.accent || '#8B4513',
        text: bible.colors?.text || '#FFFFFF',
      };
    } catch {
      return {
        primary: '#2D5A27',
        secondary: '#D4A574',
        accent: '#8B4513',
        text: '#FFFFFF',
      };
    }
  }
}

export const splitScreenService = new SplitScreenService();
```

---

## Step 5: Update Component Index

Update `remotion/components/motion-graphics/index.ts`:

```typescript
// Add to existing exports
export { SplitScreen, type SplitScreenProps, type SplitPanel, type SplitLayout } from './SplitScreen';
export { BeforeAfter, type BeforeAfterProps } from './BeforeAfter';
export { PictureInPicture, type PictureInPictureProps } from './PictureInPicture';
```

---

## Verification Checklist

Phase 12E is complete when:

- [ ] `SplitScreen.tsx` renders multiple panels correctly
- [ ] Various layouts work (2-horizontal, 4-grid, etc.)
- [ ] `BeforeAfter.tsx` slider transition works
- [ ] `BeforeAfter.tsx` fade/wipe/flip transitions work
- [ ] `PictureInPicture.tsx` positions PiP correctly
- [ ] PiP entrance animations work
- [ ] Labels display properly
- [ ] Dividers animate correctly
- [ ] Exit animations work
- [ ] Brand colors are applied
- [ ] All components export from index.ts

---

## Final Phase 12 Integration

After completing all sub-phases, update the motion graphics generator to use all components:

```typescript
// server/services/motion-graphics-generator.ts

// Add imports for all services
import { kineticTypographyService } from './kinetic-typography-service';
import { infographicGeneratorService } from './infographic-generator-service';
import { visualMetaphorService } from './visual-metaphor-service';
import { splitScreenService } from './split-screen-service';

// In generateMotionGraphic method, route to appropriate service:
switch (graphicType) {
  case 'kinetic-typography':
    return kineticTypographyService.generateConfig(text, duration, options);
  case 'stat-counter':
  case 'progress-bar':
  case 'process-flow':
    return infographicGeneratorService.generateConfig(graphicType, content, duration);
  case 'tree-growth':
  case 'network-visualization':
    return visualMetaphorService.generateConfig(graphicType, content, duration);
  case 'split-screen':
  case 'before-after':
    return splitScreenService.generateConfig(graphicType, content, duration);
}
```

---

## Phase 12 Complete

Congratulations! Phase 12 is now complete. You have built:

1. **Scene Type Router** - Intelligent routing to motion graphics
2. **Kinetic Typography** - Professional text animations
3. **Animated Infographics** - Stat counters, progress bars, process flows
4. **Visual Metaphors** - Tree growth, network visualizations
5. **Split-Screen Compositor** - Multi-panel layouts, before/after, PiP

The motion graphics engine can now handle content that AI video generators cannot, producing broadcast-quality animated graphics with perfect text rendering and consistent brand styling.

---

## Next Steps

Proceed to **Phase 13: Demographic Diversity System** to address the "woman in her 40s" repetition issue.
