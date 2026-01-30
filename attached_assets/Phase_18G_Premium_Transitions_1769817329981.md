# Phase 18G: Premium Transitions

## Priority: LOW
## Dependency: Phase 18F (Film Treatment)
## Estimated Time: 2-3 hours

---

## Purpose

Replace basic crossfades with premium cinematic transitions:
- Light leaks (warm golden glow)
- Film burns (vintage feel)
- Whip pans (dynamic motion blur)
- Elegant dissolves (exponential ease)

---

## Task 1: Create Light Leak Transition

Create `remotion/components/transitions/LightLeak.tsx`:

```typescript
// remotion/components/transitions/LightLeak.tsx

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface LightLeakProps {
  progress: number;     // 0.0 to 1.0
  color?: 'warm' | 'golden' | 'cool';
  intensity?: number;   // 0.0 to 1.0
  direction?: 'left' | 'right' | 'center';
}

export const LightLeak: React.FC<LightLeakProps> = ({
  progress,
  color = 'golden',
  intensity = 0.8,
  direction = 'right',
}) => {
  // Calculate leak animation
  const leakOpacity = interpolate(
    progress,
    [0, 0.3, 0.5, 0.7, 1],
    [0, intensity, intensity * 1.2, intensity * 0.5, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const leakScale = interpolate(
    progress,
    [0, 0.5, 1],
    [0.8, 1.2, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const leakX = direction === 'left' ? -20 : direction === 'right' ? 20 : 0;
  const translateX = interpolate(progress, [0, 1], [leakX, -leakX]);

  // Color presets
  const colorGradients: Record<string, string[]> = {
    warm: ['rgba(255, 180, 100, 0.8)', 'rgba(255, 120, 50, 0.6)', 'rgba(255, 80, 20, 0.3)'],
    golden: ['rgba(255, 220, 150, 0.9)', 'rgba(255, 180, 80, 0.7)', 'rgba(255, 140, 30, 0.4)'],
    cool: ['rgba(200, 220, 255, 0.7)', 'rgba(150, 200, 255, 0.5)', 'rgba(100, 180, 255, 0.3)'],
  };

  const colors = colorGradients[color];

  return (
    <AbsoluteFill
      style={{
        mixBlendMode: 'screen',
        opacity: leakOpacity,
        transform: `translateX(${translateX}%) scale(${leakScale})`,
      }}
    >
      {/* Multiple gradient layers for depth */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-20%',
          right: '-20%',
          bottom: '-20%',
          background: `radial-gradient(ellipse 80% 60% at ${direction === 'left' ? '30%' : direction === 'right' ? '70%' : '50%'} 40%, ${colors[0]}, ${colors[1]}, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          right: '-10%',
          bottom: '-10%',
          background: `radial-gradient(ellipse 60% 40% at ${direction === 'left' ? '20%' : direction === 'right' ? '80%' : '50%'} 60%, ${colors[1]}, ${colors[2]}, transparent 60%)`,
        }}
      />
    </AbsoluteFill>
  );
};
```

---

## Task 2: Create Film Burn Transition

Create `remotion/components/transitions/FilmBurn.tsx`:

```typescript
// remotion/components/transitions/FilmBurn.tsx

import React from 'react';
import { AbsoluteFill, interpolate, random } from 'remotion';

interface FilmBurnProps {
  progress: number;
  intensity?: number;
  seed?: number;  // For consistent randomization
}

export const FilmBurn: React.FC<FilmBurnProps> = ({
  progress,
  intensity = 0.7,
  seed = 42,
}) => {
  // Fade in and out
  const opacity = interpolate(
    progress,
    [0, 0.2, 0.5, 0.8, 1],
    [0, intensity * 0.5, intensity, intensity * 0.7, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Generate organic shapes
  const shapes = Array.from({ length: 5 }, (_, i) => {
    const x = random(`burn-x-${seed}-${i}`) * 100;
    const y = random(`burn-y-${seed}-${i}`) * 100;
    const size = 30 + random(`burn-size-${seed}-${i}`) * 50;
    const rotation = random(`burn-rot-${seed}-${i}`) * 360;
    
    return { x, y, size, rotation };
  });

  // Animate position based on progress
  const drift = interpolate(progress, [0, 1], [0, 20]);

  return (
    <AbsoluteFill
      style={{
        mixBlendMode: 'overlay',
        opacity,
      }}
    >
      {shapes.map((shape, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${shape.x + drift * (i % 2 ? 1 : -1)}%`,
            top: `${shape.y + drift * (i % 2 ? -1 : 1)}%`,
            width: shape.size,
            height: shape.size * 1.5,
            borderRadius: '50%',
            transform: `rotate(${shape.rotation}deg)`,
            background: `radial-gradient(ellipse, rgba(255, 200, 100, 0.9), rgba(255, 100, 50, 0.5), transparent 70%)`,
            filter: 'blur(20px)',
          }}
        />
      ))}
      
      {/* Overall burn overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(255, 150, 50, 0.3) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
```

---

## Task 3: Create Whip Pan Transition

Create `remotion/components/transitions/WhipPan.tsx`:

```typescript
// remotion/components/transitions/WhipPan.tsx

import React from 'react';
import { AbsoluteFill, interpolate, Easing } from 'remotion';

interface WhipPanProps {
  progress: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  blurAmount?: number;
  children: React.ReactNode;
}

export const WhipPan: React.FC<WhipPanProps> = ({
  progress,
  direction = 'right',
  blurAmount = 30,
  children,
}) => {
  // Fast in middle, slow at ends (ease in-out)
  const easedProgress = Easing.inOut(Easing.cubic)(progress);

  // Calculate blur (peak in middle)
  const blur = interpolate(
    progress,
    [0, 0.3, 0.5, 0.7, 1],
    [0, blurAmount * 0.5, blurAmount, blurAmount * 0.5, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Calculate translation
  const translateValue = interpolate(
    easedProgress,
    [0, 1],
    [0, direction === 'left' || direction === 'up' ? -100 : 100]
  );

  const isHorizontal = direction === 'left' || direction === 'right';
  const transform = isHorizontal
    ? `translateX(${translateValue}%)`
    : `translateY(${translateValue}%)`;

  // Blur direction
  const blurStyle = isHorizontal
    ? `blur(${blur}px) saturate(1.1)`
    : `blur(${blur}px) saturate(1.1)`;

  return (
    <AbsoluteFill
      style={{
        transform,
        filter: blurStyle,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
```

---

## Task 4: Create Elegant Dissolve Transition

Create `remotion/components/transitions/ElegantDissolve.tsx`:

```typescript
// remotion/components/transitions/ElegantDissolve.tsx

import React from 'react';
import { AbsoluteFill, interpolate, Easing } from 'remotion';

interface ElegantDissolveProps {
  progress: number;
  fromContent: React.ReactNode;
  toContent: React.ReactNode;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'exponential';
}

export const ElegantDissolve: React.FC<ElegantDissolveProps> = ({
  progress,
  fromContent,
  toContent,
  easing = 'exponential',
}) => {
  // Apply easing
  const easingFunctions: Record<string, (t: number) => number> = {
    'linear': (t) => t,
    'ease-in': Easing.in(Easing.quad),
    'ease-out': Easing.out(Easing.quad),
    'ease-in-out': Easing.inOut(Easing.quad),
    'exponential': (t) => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, 10 * (t - 1) + 1) / 2,
  };

  const easedProgress = easingFunctions[easing](progress);

  // Opacity for each layer
  const fromOpacity = interpolate(easedProgress, [0, 0.5, 1], [1, 0.3, 0]);
  const toOpacity = interpolate(easedProgress, [0, 0.5, 1], [0, 0.7, 1]);

  // Slight scale for depth
  const fromScale = interpolate(easedProgress, [0, 1], [1, 1.02]);
  const toScale = interpolate(easedProgress, [0, 1], [0.98, 1]);

  return (
    <AbsoluteFill>
      {/* From content (fading out) */}
      <AbsoluteFill
        style={{
          opacity: fromOpacity,
          transform: `scale(${fromScale})`,
        }}
      >
        {fromContent}
      </AbsoluteFill>

      {/* To content (fading in) */}
      <AbsoluteFill
        style={{
          opacity: toOpacity,
          transform: `scale(${toScale})`,
        }}
      >
        {toContent}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

---

## Task 5: Create Transition Manager Component

Create `remotion/components/transitions/TransitionManager.tsx`:

```typescript
// remotion/components/transitions/TransitionManager.tsx

import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { LightLeak } from './LightLeak';
import { FilmBurn } from './FilmBurn';
import { WhipPan } from './WhipPan';
import { ElegantDissolve } from './ElegantDissolve';

export type TransitionType = 
  | 'cut'
  | 'dissolve'
  | 'elegant-dissolve'
  | 'light-leak'
  | 'light-leak-golden'
  | 'film-burn'
  | 'whip-pan'
  | 'whip-pan-left'
  | 'fade';

export interface TransitionConfig {
  type: TransitionType;
  duration: number;  // Seconds
}

interface TransitionManagerProps {
  transition: TransitionConfig;
  fromContent: React.ReactNode;
  toContent: React.ReactNode;
  startFrame: number;
}

export const TransitionManager: React.FC<TransitionManagerProps> = ({
  transition,
  fromContent,
  toContent,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const transitionDuration = transition.duration * fps;
  const progress = Math.min(1, Math.max(0, (frame - startFrame) / transitionDuration));

  switch (transition.type) {
    case 'cut':
      return <>{progress < 0.5 ? fromContent : toContent}</>;

    case 'fade':
    case 'dissolve':
      return (
        <ElegantDissolve
          progress={progress}
          fromContent={fromContent}
          toContent={toContent}
          easing="ease-in-out"
        />
      );

    case 'elegant-dissolve':
      return (
        <ElegantDissolve
          progress={progress}
          fromContent={fromContent}
          toContent={toContent}
          easing="exponential"
        />
      );

    case 'light-leak':
    case 'light-leak-golden':
      return (
        <>
          <ElegantDissolve
            progress={progress}
            fromContent={fromContent}
            toContent={toContent}
            easing="ease-in-out"
          />
          <LightLeak
            progress={progress}
            color={transition.type === 'light-leak-golden' ? 'golden' : 'warm'}
            direction="right"
          />
        </>
      );

    case 'film-burn':
      return (
        <>
          <ElegantDissolve
            progress={progress}
            fromContent={fromContent}
            toContent={toContent}
            easing="ease-in-out"
          />
          <FilmBurn progress={progress} />
        </>
      );

    case 'whip-pan':
      return progress < 0.5 ? (
        <WhipPan progress={progress * 2} direction="right">
          {fromContent}
        </WhipPan>
      ) : (
        <WhipPan progress={(progress - 0.5) * 2} direction="right">
          {toContent}
        </WhipPan>
      );

    case 'whip-pan-left':
      return progress < 0.5 ? (
        <WhipPan progress={progress * 2} direction="left">
          {fromContent}
        </WhipPan>
      ) : (
        <WhipPan progress={(progress - 0.5) * 2} direction="left">
          {toContent}
        </WhipPan>
      );

    default:
      return <>{progress < 0.5 ? fromContent : toContent}</>;
  }
};
```

---

## Task 6: Export from Index

Create `remotion/components/transitions/index.ts`:

```typescript
// remotion/components/transitions/index.ts

export { LightLeak } from './LightLeak';
export { FilmBurn } from './FilmBurn';
export { WhipPan } from './WhipPan';
export { ElegantDissolve } from './ElegantDissolve';
export { TransitionManager, type TransitionType, type TransitionConfig } from './TransitionManager';
```

---

## Task 7: Visual Style → Transition Mapping

Add to render service:

```typescript
// server/config/visual-style-transitions.ts

import { TransitionType } from '../remotion/components/transitions';

export const STYLE_TRANSITION_MAP: Record<string, TransitionType> = {
  'Hero (Cinematic)': 'light-leak-golden',
  'Lifestyle': 'elegant-dissolve',
  'Product Showcase': 'fade',
  'Educational': 'dissolve',
  'Social (Energetic)': 'whip-pan',
  'Premium': 'light-leak-golden',
};

export function getTransitionForStyle(visualStyle: string): TransitionType {
  return STYLE_TRANSITION_MAP[visualStyle] || 'elegant-dissolve';
}
```

---

## Verification

After implementation, watch the rendered video and verify:
- Transitions between scenes feel cinematic
- Light leaks add warm golden glow
- Dissolves have elegant exponential easing
- No jarring hard cuts (unless intended)

---

## Success Criteria

- [ ] `LightLeak.tsx` created with color variations
- [ ] `FilmBurn.tsx` created with organic shapes
- [ ] `WhipPan.tsx` created with motion blur
- [ ] `ElegantDissolve.tsx` created with exponential easing
- [ ] `TransitionManager.tsx` orchestrates all transitions
- [ ] Visual styles map to appropriate transitions

---

## Next Phase

Proceed to **Phase 18H: Broadcast Composition Wrapper** to unify everything.
