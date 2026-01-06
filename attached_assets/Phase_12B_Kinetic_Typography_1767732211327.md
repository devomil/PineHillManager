# Phase 12B: Kinetic Typography System

## Objective

Build Remotion components that render professional kinetic typography animations. These components will be used when the motion graphics router detects text animation requirements in visual directions.

## Prerequisites

- Phase 12A complete (motion graphics router working)
- Remotion installed and configured
- Basic Remotion composition structure exists

## What This Phase Creates

- `remotion/components/motion-graphics/KineticText.tsx` - Main kinetic text component
- `remotion/components/motion-graphics/WordByWord.tsx` - Word-level animation
- `remotion/components/motion-graphics/CharacterAnimation.tsx` - Character-level effects
- `remotion/components/motion-graphics/TextPresets.tsx` - Pre-built animation styles
- `server/services/kinetic-typography-service.ts` - Backend config generator

## What Success Looks Like

```
[KineticTypography] Rendering "Your wellness journey starts here"
[KineticTypography] Style: word-by-word, Stagger: 6 frames
[KineticTypography] Animation: spring entrance, fade exit
[Remotion] Composition rendered: 300 frames @ 30fps
```

---

## Step 1: Create Directory Structure

```bash
mkdir -p remotion/components/motion-graphics
```

---

## Step 2: Create Kinetic Text Base Component

Create `remotion/components/motion-graphics/KineticText.tsx`:

```tsx
// remotion/components/motion-graphics/KineticText.tsx

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from 'remotion';

export type AnimationStyle = 
  | 'word-by-word'
  | 'character'
  | 'line-by-line'
  | 'bounce'
  | 'wave'
  | 'reveal'
  | 'split'
  | 'typewriter'
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'scale-in'
  | 'blur-in';

export type EasingType = 
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'spring'
  | 'bounce';

export interface KineticTextProps {
  text: string;
  style: AnimationStyle;
  
  // Positioning
  position: 'top' | 'center' | 'bottom' | 'custom';
  customPosition?: { x: number; y: number };
  alignment: 'left' | 'center' | 'right';
  
  // Typography
  fontSize: number;
  fontFamily: string;
  fontWeight: string | number;
  color: string;
  lineHeight?: number;
  letterSpacing?: number;
  
  // Animation timing
  staggerDelay: number; // frames between each word/char
  entranceDuration: number; // frames for entrance
  holdDuration: number; // frames to hold at full visibility
  exitDuration: number; // frames for exit
  startFrame?: number; // when to start (default: 0)
  
  // Animation style
  easing: EasingType;
  
  // Visual enhancements
  textShadow?: boolean;
  textShadowColor?: string;
  textShadowBlur?: number;
  textStroke?: {
    width: number;
    color: string;
  };
  
  // Background box
  backgroundBox?: {
    enabled: boolean;
    color: string;
    opacity: number;
    padding: number;
    borderRadius: number;
  };
  
  // Gradient text (optional)
  gradient?: {
    enabled: boolean;
    colors: string[];
    direction: 'horizontal' | 'vertical' | 'diagonal';
  };
}

// Helper function to apply easing
const applyEasing = (progress: number, easing: EasingType, fps: number, frame: number): number => {
  switch (easing) {
    case 'linear':
      return progress;
    case 'ease-in':
      return Easing.in(Easing.ease)(progress);
    case 'ease-out':
      return Easing.out(Easing.ease)(progress);
    case 'ease-in-out':
      return Easing.inOut(Easing.ease)(progress);
    case 'spring':
      return spring({
        frame,
        fps,
        config: { damping: 12, stiffness: 200 },
      });
    case 'bounce':
      return spring({
        frame,
        fps,
        config: { damping: 8, stiffness: 150 },
      });
    default:
      return progress;
  }
};

export const KineticText: React.FC<KineticTextProps> = ({
  text,
  style,
  position,
  customPosition,
  alignment,
  fontSize,
  fontFamily,
  fontWeight,
  color,
  lineHeight = 1.4,
  letterSpacing = 0,
  staggerDelay,
  entranceDuration,
  holdDuration,
  exitDuration,
  startFrame = 0,
  easing,
  textShadow = false,
  textShadowColor = 'rgba(0,0,0,0.3)',
  textShadowBlur = 4,
  textStroke,
  backgroundBox,
  gradient,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Calculate timing
  const localFrame = frame - startFrame;
  if (localFrame < 0) return null;
  
  // Split text based on style
  const units = getTextUnits(text, style);
  const totalEntranceTime = entranceDuration + (units.length - 1) * staggerDelay;
  const exitStartFrame = totalEntranceTime + holdDuration;
  const totalDuration = exitStartFrame + exitDuration;
  
  // Calculate global opacity for exit
  const globalExitOpacity = localFrame >= exitStartFrame
    ? interpolate(
        localFrame,
        [exitStartFrame, totalDuration],
        [1, 0],
        { extrapolateRight: 'clamp' }
      )
    : 1;
  
  // Position styles
  const positionStyles = getPositionStyles(position, customPosition, alignment);
  
  // Text shadow style
  const shadowStyle = textShadow
    ? `0 2px ${textShadowBlur}px ${textShadowColor}`
    : 'none';
  
  // Gradient style
  const gradientStyle = gradient?.enabled
    ? {
        background: getGradientCSS(gradient.colors, gradient.direction),
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }
    : {};
  
  return (
    <AbsoluteFill
      style={{
        ...positionStyles,
        opacity: globalExitOpacity,
      }}
    >
      {backgroundBox?.enabled && (
        <div
          style={{
            position: 'absolute',
            backgroundColor: backgroundBox.color,
            opacity: backgroundBox.opacity,
            padding: backgroundBox.padding,
            borderRadius: backgroundBox.borderRadius,
            inset: -backgroundBox.padding,
          }}
        />
      )}
      
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start',
          gap: style === 'character' ? 0 : '0.3em',
          fontFamily,
          fontSize,
          fontWeight,
          lineHeight,
          letterSpacing,
          color,
          textShadow: shadowStyle,
          ...gradientStyle,
        }}
      >
        {units.map((unit, index) => (
          <AnimatedUnit
            key={index}
            text={unit}
            index={index}
            style={style}
            localFrame={localFrame}
            staggerDelay={staggerDelay}
            entranceDuration={entranceDuration}
            easing={easing}
            fps={fps}
            color={color}
            isCharacter={style === 'character'}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// Helper component for animated units (words or characters)
const AnimatedUnit: React.FC<{
  text: string;
  index: number;
  style: AnimationStyle;
  localFrame: number;
  staggerDelay: number;
  entranceDuration: number;
  easing: EasingType;
  fps: number;
  color: string;
  isCharacter: boolean;
}> = ({
  text,
  index,
  style,
  localFrame,
  staggerDelay,
  entranceDuration,
  easing,
  fps,
  color,
  isCharacter,
}) => {
  const unitStartFrame = index * staggerDelay;
  const unitFrame = localFrame - unitStartFrame;
  
  if (unitFrame < 0) {
    // Not yet visible
    return <span style={{ opacity: 0 }}>{text}{!isCharacter && ' '}</span>;
  }
  
  const progress = Math.min(unitFrame / entranceDuration, 1);
  const easedProgress = applyEasing(progress, easing, fps, unitFrame);
  
  // Get animation transforms based on style
  const transforms = getAnimationTransforms(style, easedProgress, unitFrame, fps);
  
  return (
    <span
      style={{
        display: 'inline-block',
        opacity: transforms.opacity,
        transform: transforms.transform,
        whiteSpace: isCharacter ? 'pre' : 'normal',
      }}
    >
      {text}
    </span>
  );
};

// Get text units based on animation style
function getTextUnits(text: string, style: AnimationStyle): string[] {
  switch (style) {
    case 'character':
      return text.split('');
    case 'line-by-line':
      return text.split('\n');
    case 'word-by-word':
    case 'bounce':
    case 'wave':
    case 'reveal':
    case 'split':
    case 'slide-up':
    case 'slide-down':
    case 'scale-in':
    case 'blur-in':
    default:
      return text.split(' ').filter(w => w.length > 0);
  }
}

// Get position styles
function getPositionStyles(
  position: string,
  customPosition: { x: number; y: number } | undefined,
  alignment: string
): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    padding: '5%',
  };
  
  if (position === 'custom' && customPosition) {
    return {
      ...base,
      left: `${customPosition.x}%`,
      top: `${customPosition.y}%`,
      transform: 'translate(-50%, -50%)',
      justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start',
    };
  }
  
  switch (position) {
    case 'top':
      return {
        ...base,
        top: '10%',
        left: 0,
        right: 0,
        justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start',
      };
    case 'center':
      return {
        ...base,
        top: '50%',
        left: 0,
        right: 0,
        transform: 'translateY(-50%)',
        justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start',
      };
    case 'bottom':
    default:
      return {
        ...base,
        bottom: '15%',
        left: 0,
        right: 0,
        justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start',
      };
  }
}

// Get animation transforms based on style
function getAnimationTransforms(
  style: AnimationStyle,
  progress: number,
  frame: number,
  fps: number
): { opacity: number; transform: string } {
  switch (style) {
    case 'bounce':
      return {
        opacity: progress,
        transform: `translateY(${(1 - progress) * -30}px) scale(${0.5 + progress * 0.5})`,
      };
      
    case 'wave':
      const waveOffset = Math.sin(frame * 0.2) * 10 * (1 - progress);
      return {
        opacity: progress,
        transform: `translateY(${waveOffset}px)`,
      };
      
    case 'reveal':
      return {
        opacity: progress,
        transform: `scaleX(${progress})`,
      };
      
    case 'split':
      return {
        opacity: progress,
        transform: `translateX(${(1 - progress) * (Math.random() > 0.5 ? 50 : -50)}px)`,
      };
      
    case 'slide-up':
      return {
        opacity: progress,
        transform: `translateY(${(1 - progress) * 40}px)`,
      };
      
    case 'slide-down':
      return {
        opacity: progress,
        transform: `translateY(${(1 - progress) * -40}px)`,
      };
      
    case 'scale-in':
      return {
        opacity: progress,
        transform: `scale(${0.3 + progress * 0.7})`,
      };
      
    case 'blur-in':
      return {
        opacity: progress,
        transform: `scale(${0.9 + progress * 0.1})`,
      };
      
    case 'typewriter':
      return {
        opacity: progress >= 1 ? 1 : 0,
        transform: 'none',
      };
      
    case 'fade':
    case 'word-by-word':
    case 'character':
    case 'line-by-line':
    default:
      return {
        opacity: progress,
        transform: `translateY(${(1 - progress) * 20}px)`,
      };
  }
}

// Get gradient CSS
function getGradientCSS(colors: string[], direction: string): string {
  const angle = direction === 'horizontal' ? '90deg' 
    : direction === 'vertical' ? '180deg' 
    : '135deg';
  return `linear-gradient(${angle}, ${colors.join(', ')})`;
}

export default KineticText;
```

---

## Step 3: Create Word-by-Word Component

Create `remotion/components/motion-graphics/WordByWord.tsx`:

```tsx
// remotion/components/motion-graphics/WordByWord.tsx

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

export interface WordByWordProps {
  text: string;
  
  // Positioning
  position: 'top' | 'center' | 'bottom';
  alignment: 'left' | 'center' | 'right';
  
  // Typography
  fontSize: number;
  fontFamily: string;
  fontWeight: string | number;
  color: string;
  
  // Timing
  staggerFrames: number; // frames between words
  wordDuration: number; // frames for each word to animate in
  holdFrames: number; // frames to hold after all words visible
  
  // Style
  entranceStyle: 'fade-up' | 'fade' | 'pop' | 'slide-left' | 'slide-right';
  exitStyle: 'fade' | 'fade-down' | 'shrink';
  
  // Optional background
  showBackground?: boolean;
  backgroundColor?: string;
  backgroundOpacity?: number;
  backgroundPadding?: number;
  backgroundRadius?: number;
}

export const WordByWord: React.FC<WordByWordProps> = ({
  text,
  position,
  alignment,
  fontSize,
  fontFamily,
  fontWeight,
  color,
  staggerFrames,
  wordDuration,
  holdFrames,
  entranceStyle,
  exitStyle,
  showBackground = false,
  backgroundColor = '#000000',
  backgroundOpacity = 0.8,
  backgroundPadding = 20,
  backgroundRadius = 8,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  const words = text.split(' ').filter(w => w.length > 0);
  const totalEntranceFrames = (words.length - 1) * staggerFrames + wordDuration;
  const exitStartFrame = totalEntranceFrames + holdFrames;
  const exitDuration = Math.round(fps * 0.5);
  
  // Global exit animation
  const exitProgress = frame >= exitStartFrame
    ? interpolate(frame, [exitStartFrame, exitStartFrame + exitDuration], [0, 1], { extrapolateRight: 'clamp' })
    : 0;
  
  const getExitTransform = () => {
    switch (exitStyle) {
      case 'fade-down':
        return `translateY(${exitProgress * 30}px)`;
      case 'shrink':
        return `scale(${1 - exitProgress * 0.3})`;
      default:
        return 'none';
    }
  };
  
  // Position styles
  const positionStyles: React.CSSProperties = {
    position: 'absolute',
    left: '5%',
    right: '5%',
    display: 'flex',
    justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start',
    ...(position === 'top' && { top: '15%' }),
    ...(position === 'center' && { top: '50%', transform: 'translateY(-50%)' }),
    ...(position === 'bottom' && { bottom: '15%' }),
  };
  
  return (
    <AbsoluteFill>
      <div
        style={{
          ...positionStyles,
          opacity: 1 - exitProgress,
          transform: getExitTransform(),
        }}
      >
        {showBackground && (
          <div
            style={{
              position: 'absolute',
              backgroundColor,
              opacity: backgroundOpacity,
              padding: backgroundPadding,
              borderRadius: backgroundRadius,
              inset: -backgroundPadding,
            }}
          />
        )}
        
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start',
            gap: '0.25em',
            fontFamily,
            fontSize,
            fontWeight,
            color,
          }}
        >
          {words.map((word, index) => (
            <AnimatedWord
              key={index}
              word={word}
              index={index}
              frame={frame}
              fps={fps}
              staggerFrames={staggerFrames}
              wordDuration={wordDuration}
              entranceStyle={entranceStyle}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const AnimatedWord: React.FC<{
  word: string;
  index: number;
  frame: number;
  fps: number;
  staggerFrames: number;
  wordDuration: number;
  entranceStyle: string;
}> = ({ word, index, frame, fps, staggerFrames, wordDuration, entranceStyle }) => {
  const wordStartFrame = index * staggerFrames;
  const localFrame = frame - wordStartFrame;
  
  if (localFrame < 0) {
    return <span style={{ opacity: 0 }}>{word}</span>;
  }
  
  const progress = Math.min(localFrame / wordDuration, 1);
  
  // Spring animation for smoother motion
  const springProgress = spring({
    frame: localFrame,
    fps,
    config: { damping: 15, stiffness: 200 },
  });
  
  const clampedSpring = Math.min(springProgress, 1);
  
  let transform = '';
  let opacity = clampedSpring;
  
  switch (entranceStyle) {
    case 'fade-up':
      transform = `translateY(${(1 - clampedSpring) * 30}px)`;
      break;
    case 'pop':
      transform = `scale(${0.5 + clampedSpring * 0.5})`;
      break;
    case 'slide-left':
      transform = `translateX(${(1 - clampedSpring) * 50}px)`;
      break;
    case 'slide-right':
      transform = `translateX(${(1 - clampedSpring) * -50}px)`;
      break;
    case 'fade':
    default:
      transform = 'none';
      break;
  }
  
  return (
    <span
      style={{
        display: 'inline-block',
        opacity,
        transform,
      }}
    >
      {word}
    </span>
  );
};

export default WordByWord;
```

---

## Step 4: Create Character Animation Component

Create `remotion/components/motion-graphics/CharacterAnimation.tsx`:

```tsx
// remotion/components/motion-graphics/CharacterAnimation.tsx

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from 'remotion';

export type CharacterEffect = 
  | 'wave'
  | 'bounce'
  | 'typewriter'
  | 'reveal'
  | 'scramble'
  | 'glow'
  | 'rainbow';

export interface CharacterAnimationProps {
  text: string;
  effect: CharacterEffect;
  
  // Positioning
  position: 'top' | 'center' | 'bottom';
  alignment: 'left' | 'center' | 'right';
  
  // Typography
  fontSize: number;
  fontFamily: string;
  fontWeight: string | number;
  color: string;
  
  // Timing
  staggerFrames: number; // frames between characters
  characterDuration: number; // frames for each character
  loopWave?: boolean; // for wave effect, continue looping
  
  // Style options
  glowColor?: string;
  rainbowColors?: string[];
}

export const CharacterAnimation: React.FC<CharacterAnimationProps> = ({
  text,
  effect,
  position,
  alignment,
  fontSize,
  fontFamily,
  fontWeight,
  color,
  staggerFrames,
  characterDuration,
  loopWave = false,
  glowColor = '#FFD700',
  rainbowColors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const characters = text.split('');
  
  // Position styles
  const positionStyles: React.CSSProperties = {
    position: 'absolute',
    left: '5%',
    right: '5%',
    display: 'flex',
    justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start',
    ...(position === 'top' && { top: '15%' }),
    ...(position === 'center' && { top: '50%', transform: 'translateY(-50%)' }),
    ...(position === 'bottom' && { bottom: '15%' }),
  };
  
  return (
    <AbsoluteFill>
      <div style={positionStyles}>
        <div
          style={{
            display: 'flex',
            fontFamily,
            fontSize,
            fontWeight,
            color,
          }}
        >
          {characters.map((char, index) => (
            <AnimatedCharacter
              key={index}
              char={char}
              index={index}
              totalChars={characters.length}
              frame={frame}
              fps={fps}
              effect={effect}
              staggerFrames={staggerFrames}
              characterDuration={characterDuration}
              loopWave={loopWave}
              baseColor={color}
              glowColor={glowColor}
              rainbowColors={rainbowColors}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const AnimatedCharacter: React.FC<{
  char: string;
  index: number;
  totalChars: number;
  frame: number;
  fps: number;
  effect: CharacterEffect;
  staggerFrames: number;
  characterDuration: number;
  loopWave: boolean;
  baseColor: string;
  glowColor: string;
  rainbowColors: string[];
}> = ({
  char,
  index,
  frame,
  fps,
  effect,
  staggerFrames,
  characterDuration,
  loopWave,
  glowColor,
  rainbowColors,
}) => {
  const charStartFrame = index * staggerFrames;
  const localFrame = frame - charStartFrame;
  
  // Handle space character
  if (char === ' ') {
    return <span style={{ width: '0.3em' }}>&nbsp;</span>;
  }
  
  let style: React.CSSProperties = {
    display: 'inline-block',
    whiteSpace: 'pre',
  };
  
  switch (effect) {
    case 'wave': {
      const waveProgress = loopWave
        ? (frame + index * 5) % 60 / 60
        : localFrame / characterDuration;
      const yOffset = Math.sin(waveProgress * Math.PI * 2) * 10;
      style = {
        ...style,
        transform: `translateY(${yOffset}px)`,
        opacity: localFrame < 0 ? 0 : 1,
      };
      break;
    }
    
    case 'bounce': {
      if (localFrame < 0) {
        style = { ...style, opacity: 0 };
      } else {
        const bounceSpring = spring({
          frame: localFrame,
          fps,
          config: { damping: 8, stiffness: 200 },
        });
        style = {
          ...style,
          transform: `translateY(${(1 - Math.min(bounceSpring, 1)) * -50}px)`,
          opacity: Math.min(bounceSpring, 1),
        };
      }
      break;
    }
    
    case 'typewriter': {
      style = {
        ...style,
        opacity: localFrame >= 0 ? 1 : 0,
      };
      break;
    }
    
    case 'reveal': {
      if (localFrame < 0) {
        style = { ...style, opacity: 0, transform: 'scaleY(0)' };
      } else {
        const progress = Math.min(localFrame / characterDuration, 1);
        style = {
          ...style,
          opacity: progress,
          transform: `scaleY(${progress})`,
          transformOrigin: 'bottom',
        };
      }
      break;
    }
    
    case 'scramble': {
      if (localFrame < 0) {
        style = { ...style, opacity: 0 };
      } else if (localFrame < characterDuration) {
        // Show random character while scrambling
        const scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const randomIndex = Math.floor(Math.random() * scrambleChars.length);
        return (
          <span style={{ ...style, opacity: 0.7 }}>
            {scrambleChars[randomIndex]}
          </span>
        );
      } else {
        style = { ...style, opacity: 1 };
      }
      break;
    }
    
    case 'glow': {
      if (localFrame < 0) {
        style = { ...style, opacity: 0 };
      } else {
        const glowProgress = Math.min(localFrame / characterDuration, 1);
        const glowIntensity = Math.sin(glowProgress * Math.PI) * 20;
        style = {
          ...style,
          opacity: glowProgress,
          textShadow: `0 0 ${glowIntensity}px ${glowColor}, 0 0 ${glowIntensity * 2}px ${glowColor}`,
        };
      }
      break;
    }
    
    case 'rainbow': {
      if (localFrame < 0) {
        style = { ...style, opacity: 0 };
      } else {
        const colorIndex = (index + Math.floor(frame / 10)) % rainbowColors.length;
        const progress = Math.min(localFrame / characterDuration, 1);
        style = {
          ...style,
          opacity: progress,
          color: rainbowColors[colorIndex],
          transition: 'color 0.3s',
        };
      }
      break;
    }
  }
  
  return <span style={style}>{char}</span>;
};

export default CharacterAnimation;
```

---

## Step 5: Create Text Presets

Create `remotion/components/motion-graphics/TextPresets.tsx`:

```tsx
// remotion/components/motion-graphics/TextPresets.tsx

import React from 'react';
import { KineticText, KineticTextProps } from './KineticText';
import { WordByWord, WordByWordProps } from './WordByWord';
import { CharacterAnimation, CharacterAnimationProps } from './CharacterAnimation';

/**
 * Pine Hill Farm Brand Presets
 */
const PHF_COLORS = {
  primary: '#2D5A27',
  secondary: '#D4A574',
  accent: '#8B4513',
  text: '#FFFFFF',
  background: '#F5F5DC',
};

const PHF_FONTS = {
  heading: 'Inter, system-ui, sans-serif',
  body: 'Inter, system-ui, sans-serif',
};

// Preset configurations
export type TextPresetName = 
  | 'headline-bounce'
  | 'headline-wave'
  | 'subtitle-fade'
  | 'cta-pop'
  | 'stat-reveal'
  | 'quote-typewriter'
  | 'list-slide'
  | 'dramatic-split';

interface TextPresetConfig {
  component: 'kinetic' | 'word-by-word' | 'character';
  props: Partial<KineticTextProps | WordByWordProps | CharacterAnimationProps>;
}

const PRESETS: Record<TextPresetName, TextPresetConfig> = {
  'headline-bounce': {
    component: 'kinetic',
    props: {
      style: 'bounce',
      fontSize: 72,
      fontFamily: PHF_FONTS.heading,
      fontWeight: '700',
      color: PHF_COLORS.primary,
      position: 'center',
      alignment: 'center',
      staggerDelay: 6,
      entranceDuration: 12,
      holdDuration: 60,
      exitDuration: 15,
      easing: 'spring',
      textShadow: true,
      backgroundBox: {
        enabled: true,
        color: '#FFFFFF',
        opacity: 0.95,
        padding: 30,
        borderRadius: 12,
      },
    },
  },
  
  'headline-wave': {
    component: 'character',
    props: {
      effect: 'wave',
      fontSize: 64,
      fontFamily: PHF_FONTS.heading,
      fontWeight: '700',
      color: PHF_COLORS.primary,
      position: 'center',
      alignment: 'center',
      staggerFrames: 2,
      characterDuration: 15,
      loopWave: true,
    },
  },
  
  'subtitle-fade': {
    component: 'word-by-word',
    props: {
      fontSize: 36,
      fontFamily: PHF_FONTS.body,
      fontWeight: '500',
      color: PHF_COLORS.text,
      position: 'bottom',
      alignment: 'center',
      staggerFrames: 8,
      wordDuration: 10,
      holdFrames: 90,
      entranceStyle: 'fade-up',
      exitStyle: 'fade',
      showBackground: true,
      backgroundColor: PHF_COLORS.primary,
      backgroundOpacity: 0.9,
      backgroundPadding: 20,
      backgroundRadius: 8,
    },
  },
  
  'cta-pop': {
    component: 'kinetic',
    props: {
      style: 'scale-in',
      fontSize: 48,
      fontFamily: PHF_FONTS.heading,
      fontWeight: '700',
      color: PHF_COLORS.text,
      position: 'center',
      alignment: 'center',
      staggerDelay: 4,
      entranceDuration: 15,
      holdDuration: 90,
      exitDuration: 10,
      easing: 'bounce',
      backgroundBox: {
        enabled: true,
        color: PHF_COLORS.secondary,
        opacity: 1,
        padding: 24,
        borderRadius: 50,
      },
    },
  },
  
  'stat-reveal': {
    component: 'character',
    props: {
      effect: 'reveal',
      fontSize: 96,
      fontFamily: PHF_FONTS.heading,
      fontWeight: '800',
      color: PHF_COLORS.primary,
      position: 'center',
      alignment: 'center',
      staggerFrames: 3,
      characterDuration: 10,
    },
  },
  
  'quote-typewriter': {
    component: 'character',
    props: {
      effect: 'typewriter',
      fontSize: 32,
      fontFamily: 'Georgia, serif',
      fontWeight: '400',
      color: PHF_COLORS.accent,
      position: 'center',
      alignment: 'center',
      staggerFrames: 2,
      characterDuration: 1,
    },
  },
  
  'list-slide': {
    component: 'word-by-word',
    props: {
      fontSize: 28,
      fontFamily: PHF_FONTS.body,
      fontWeight: '500',
      color: PHF_COLORS.text,
      position: 'center',
      alignment: 'left',
      staggerFrames: 12,
      wordDuration: 8,
      holdFrames: 60,
      entranceStyle: 'slide-left',
      exitStyle: 'fade',
      showBackground: true,
      backgroundColor: PHF_COLORS.primary,
      backgroundOpacity: 0.85,
      backgroundPadding: 16,
      backgroundRadius: 6,
    },
  },
  
  'dramatic-split': {
    component: 'kinetic',
    props: {
      style: 'split',
      fontSize: 84,
      fontFamily: PHF_FONTS.heading,
      fontWeight: '900',
      color: PHF_COLORS.primary,
      position: 'center',
      alignment: 'center',
      staggerDelay: 8,
      entranceDuration: 20,
      holdDuration: 45,
      exitDuration: 15,
      easing: 'ease-out',
      textShadow: true,
      textShadowColor: 'rgba(0,0,0,0.4)',
      textShadowBlur: 8,
    },
  },
};

/**
 * Get preset configuration by name
 */
export function getPreset(name: TextPresetName): TextPresetConfig {
  return PRESETS[name];
}

/**
 * PresetText component - renders text with a named preset
 */
interface PresetTextProps {
  text: string;
  preset: TextPresetName;
  overrides?: Partial<KineticTextProps | WordByWordProps | CharacterAnimationProps>;
}

export const PresetText: React.FC<PresetTextProps> = ({ text, preset, overrides = {} }) => {
  const config = PRESETS[preset];
  
  if (!config) {
    console.error(`[PresetText] Unknown preset: ${preset}`);
    return null;
  }
  
  const mergedProps = { ...config.props, ...overrides, text };
  
  switch (config.component) {
    case 'kinetic':
      return <KineticText {...(mergedProps as KineticTextProps)} />;
    case 'word-by-word':
      return <WordByWord {...(mergedProps as WordByWordProps)} />;
    case 'character':
      return <CharacterAnimation {...(mergedProps as CharacterAnimationProps)} />;
    default:
      return null;
  }
};

/**
 * Export all preset names for external use
 */
export const PRESET_NAMES = Object.keys(PRESETS) as TextPresetName[];

/**
 * Get all presets matching a category
 */
export function getPresetsByCategory(category: 'headline' | 'subtitle' | 'cta' | 'stat' | 'quote' | 'list'): TextPresetName[] {
  return PRESET_NAMES.filter(name => name.startsWith(category));
}

export default PresetText;
```

---

## Step 6: Create Backend Kinetic Typography Service

Create `server/services/kinetic-typography-service.ts`:

```typescript
// server/services/kinetic-typography-service.ts

import { KineticTypographyConfig } from '../../shared/types/motion-graphics-types';
import { brandBibleService } from './brand-bible-service';

/**
 * Animation style selection based on content analysis
 */
type TextAnimationStyle = 
  | 'word-by-word'
  | 'character'
  | 'bounce'
  | 'wave'
  | 'reveal'
  | 'typewriter'
  | 'slide-up'
  | 'scale-in';

interface ContentAnalysis {
  wordCount: number;
  averageWordLength: number;
  hasNumbers: boolean;
  isPunctuation: boolean;
  isQuestion: boolean;
  isExclamation: boolean;
  sentiment: 'positive' | 'negative' | 'neutral';
}

class KineticTypographyService {
  
  /**
   * Generate kinetic typography configuration from text content
   */
  async generateConfig(
    text: string,
    duration: number,
    options?: {
      preferredStyle?: TextAnimationStyle;
      position?: 'top' | 'center' | 'bottom';
      alignment?: 'left' | 'center' | 'right';
      emphasizeWords?: string[];
    }
  ): Promise<KineticTypographyConfig> {
    console.log(`[KineticTypography] Generating config for: "${text.substring(0, 50)}..."`);
    
    // Analyze content
    const analysis = this.analyzeContent(text);
    
    // Get brand colors
    const brandColors = await this.getBrandColors();
    
    // Determine best animation style
    const animationStyle = options?.preferredStyle || this.selectAnimationStyle(analysis);
    
    // Calculate timing based on content and duration
    const timing = this.calculateTiming(analysis, duration, animationStyle);
    
    // Determine font size based on word count and content
    const fontSize = this.calculateFontSize(analysis);
    
    const config: KineticTypographyConfig = {
      type: 'kinetic-typography',
      duration,
      fps: 30,
      width: 1920,
      height: 1080,
      backgroundColor: '#FFFFFF',
      brandColors,
      text,
      animationStyle,
      fontSize,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: analysis.hasNumbers ? '800' : '700',
      textColor: brandColors.primary,
      position: options?.position || 'center',
      staggerDelay: timing.staggerDelay,
      entranceDuration: timing.entranceDuration,
      holdDuration: timing.holdDuration,
      exitDuration: timing.exitDuration,
      easing: this.selectEasing(animationStyle, analysis),
      textShadow: true,
      backgroundBox: {
        enabled: true,
        color: '#FFFFFF',
        opacity: 0.95,
        padding: 24,
        borderRadius: 12,
      },
    };
    
    console.log(`[KineticTypography] Style: ${animationStyle}, Font: ${fontSize}px, Duration: ${duration}s`);
    
    return config;
  }
  
  /**
   * Analyze text content
   */
  private analyzeContent(text: string): ContentAnalysis {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wordLengths = words.map(w => w.length);
    
    return {
      wordCount: words.length,
      averageWordLength: wordLengths.reduce((a, b) => a + b, 0) / words.length,
      hasNumbers: /\d/.test(text),
      isPunctuation: /[.!?]$/.test(text),
      isQuestion: text.trim().endsWith('?'),
      isExclamation: text.trim().endsWith('!'),
      sentiment: this.analyzeSentiment(text),
    };
  }
  
  /**
   * Simple sentiment analysis
   */
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const lower = text.toLowerCase();
    
    const positiveWords = ['wellness', 'health', 'happy', 'success', 'transform', 'achieve', 'natural', 'organic', 'fresh', 'vibrant', 'energy', 'balance'];
    const negativeWords = ['struggle', 'pain', 'tired', 'frustrated', 'problem', 'issue', 'difficult', 'hard', 'stress'];
    
    const positiveCount = positiveWords.filter(w => lower.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lower.includes(w)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
  
  /**
   * Select best animation style based on content
   */
  private selectAnimationStyle(analysis: ContentAnalysis): TextAnimationStyle {
    // Short text (1-3 words): scale-in or bounce for impact
    if (analysis.wordCount <= 3) {
      return analysis.isExclamation ? 'bounce' : 'scale-in';
    }
    
    // Medium text (4-8 words): word-by-word
    if (analysis.wordCount <= 8) {
      return 'word-by-word';
    }
    
    // Long text (9-15 words): slide-up for readability
    if (analysis.wordCount <= 15) {
      return 'slide-up';
    }
    
    // Very long text: typewriter for narrative feel
    return 'typewriter';
  }
  
  /**
   * Calculate timing parameters
   */
  private calculateTiming(
    analysis: ContentAnalysis,
    duration: number,
    style: TextAnimationStyle
  ): {
    staggerDelay: number;
    entranceDuration: number;
    holdDuration: number;
    exitDuration: number;
  } {
    const fps = 30;
    const totalFrames = duration * fps;
    
    // Reserve 15% for exit animation
    const exitDuration = Math.round(fps * 0.5);
    
    // Calculate entrance based on word count and style
    let staggerDelay: number;
    let entranceDuration: number;
    
    switch (style) {
      case 'typewriter':
        // Character-based: very fast stagger
        staggerDelay = 2;
        entranceDuration = 1;
        break;
        
      case 'bounce':
      case 'scale-in':
        // Impact styles: slower entrance
        staggerDelay = 8;
        entranceDuration = 15;
        break;
        
      case 'wave':
      case 'reveal':
        // Artistic styles: medium pace
        staggerDelay = 5;
        entranceDuration = 12;
        break;
        
      case 'word-by-word':
      case 'slide-up':
      default:
        // Standard pace: adjust based on word count
        const wordsPerSecond = analysis.wordCount / (duration * 0.5); // Use 50% of time for entrance
        staggerDelay = Math.max(4, Math.min(12, Math.round(fps / wordsPerSecond)));
        entranceDuration = Math.round(fps * 0.3);
        break;
    }
    
    // Calculate entrance time
    const totalEntranceTime = entranceDuration + (analysis.wordCount - 1) * staggerDelay;
    
    // Hold time is remaining after entrance and exit
    const holdDuration = Math.max(fps * 0.5, totalFrames - totalEntranceTime - exitDuration);
    
    return {
      staggerDelay,
      entranceDuration,
      holdDuration,
      exitDuration,
    };
  }
  
  /**
   * Calculate appropriate font size
   */
  private calculateFontSize(analysis: ContentAnalysis): number {
    // Base size
    let size = 72;
    
    // Adjust based on word count
    if (analysis.wordCount <= 3) {
      size = 96; // Large for short impact text
    } else if (analysis.wordCount <= 6) {
      size = 72;
    } else if (analysis.wordCount <= 10) {
      size = 56;
    } else if (analysis.wordCount <= 15) {
      size = 48;
    } else {
      size = 36; // Smaller for longer text
    }
    
    // Adjust for average word length
    if (analysis.averageWordLength > 8) {
      size = Math.round(size * 0.85);
    }
    
    return size;
  }
  
  /**
   * Select easing based on style and content
   */
  private selectEasing(
    style: TextAnimationStyle,
    analysis: ContentAnalysis
  ): 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring' | 'bounce' {
    switch (style) {
      case 'bounce':
        return 'bounce';
      case 'scale-in':
        return 'spring';
      case 'wave':
        return 'ease-in-out';
      case 'typewriter':
        return 'linear';
      default:
        return analysis.sentiment === 'positive' ? 'spring' : 'ease-out';
    }
  }
  
  /**
   * Get brand colors from brand bible
   */
  private async getBrandColors(): Promise<{
    primary: string;
    secondary: string;
    accent: string;
    text: string;
  }> {
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
  
  /**
   * Generate multiple text configurations for a multi-line display
   */
  async generateMultiLineConfig(
    lines: string[],
    duration: number,
    options?: {
      position?: 'top' | 'center' | 'bottom';
      staggerLines?: boolean;
      lineDelay?: number;
    }
  ): Promise<KineticTypographyConfig[]> {
    const configs: KineticTypographyConfig[] = [];
    const lineDelay = options?.staggerLines ? (options.lineDelay || 30) : 0;
    const lineDuration = (duration * 30 - (lines.length - 1) * lineDelay) / lines.length / 30;
    
    for (let i = 0; i < lines.length; i++) {
      const config = await this.generateConfig(lines[i], lineDuration, {
        position: options?.position || 'center',
      });
      
      // Adjust start frame for staggered lines
      if (options?.staggerLines) {
        (config as any).startFrame = i * lineDelay;
      }
      
      configs.push(config);
    }
    
    return configs;
  }
}

export const kineticTypographyService = new KineticTypographyService();
```

---

## Step 7: Create Index Export File

Create `remotion/components/motion-graphics/index.ts`:

```typescript
// remotion/components/motion-graphics/index.ts

export { KineticText, type KineticTextProps, type AnimationStyle, type EasingType } from './KineticText';
export { WordByWord, type WordByWordProps } from './WordByWord';
export { CharacterAnimation, type CharacterAnimationProps, type CharacterEffect } from './CharacterAnimation';
export { PresetText, getPreset, PRESET_NAMES, getPresetsByCategory, type TextPresetName } from './TextPresets';
```

---

## Verification Checklist

Before moving to Phase 12C, confirm:

- [ ] `remotion/components/motion-graphics/` directory created
- [ ] `KineticText.tsx` renders text with various animation styles
- [ ] `WordByWord.tsx` animates words individually
- [ ] `CharacterAnimation.tsx` animates characters with effects
- [ ] `TextPresets.tsx` provides brand-specific presets
- [ ] `kinetic-typography-service.ts` generates configs from text
- [ ] Animations use spring physics for smooth motion
- [ ] Brand colors are applied correctly
- [ ] Background boxes render with proper styling
- [ ] Exit animations work correctly
- [ ] All components export properly from index.ts

---

## Testing

Add a test composition to verify components work:

```tsx
// remotion/test/KineticTextTest.tsx

import { Composition } from 'remotion';
import { KineticText } from '../components/motion-graphics';

export const KineticTextTest: React.FC = () => {
  return (
    <Composition
      id="KineticTextTest"
      component={KineticText}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        text: 'Your wellness journey starts here',
        style: 'word-by-word',
        position: 'center',
        alignment: 'center',
        fontSize: 72,
        fontFamily: 'Inter, sans-serif',
        fontWeight: '700',
        color: '#2D5A27',
        staggerDelay: 6,
        entranceDuration: 12,
        holdDuration: 60,
        exitDuration: 15,
        easing: 'spring',
        textShadow: true,
        backgroundBox: {
          enabled: true,
          color: '#FFFFFF',
          opacity: 0.95,
          padding: 24,
          borderRadius: 12,
        },
      }}
    />
  );
};
```

---

## Troubleshooting

### "Component not rendering"
- Check that all imports are correct
- Verify frame timing calculations
- Check that text is not empty

### "Animation jerky"
- Increase entranceDuration
- Use spring easing instead of linear
- Reduce staggerDelay

### "Text cut off"
- Reduce fontSize
- Increase padding
- Check position settings

### "Colors wrong"
- Verify brandBibleService is returning correct values
- Check fallback colors in service

---

## Next Phase

Once kinetic typography is working, proceed to **Phase 12C: Animated Infographics** to build stat counters, progress bars, and data visualization components.
