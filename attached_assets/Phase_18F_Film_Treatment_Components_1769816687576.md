# Phase 18F: Film Treatment Components

## Priority: MEDIUM
## Dependency: Phase 18A-18E (Foundation complete)
## Estimated Time: 3-4 hours

---

## Purpose

Add cinematic post-processing that transforms raw AI video into broadcast-quality content:
- Color grading (warm cinematic, cool corporate, etc.)
- Film grain (organic texture)
- Vignette (focus to center)
- Optional letterboxing (cinematic aspect ratio)

---

## Task 1: Create Color Grading Component

Create `remotion/components/post-processing/ColorGrading.tsx`:

```typescript
// remotion/components/post-processing/ColorGrading.tsx

import React from 'react';
import { AbsoluteFill } from 'remotion';

export type ColorGradePreset = 
  | 'warm-cinematic'     // Golden warmth, teal shadows (TV commercial)
  | 'cool-corporate'     // Clean, professional
  | 'vibrant-lifestyle'  // Saturated, punchy (social media)
  | 'moody-dramatic'     // High contrast, desaturated
  | 'natural-organic'    // True to life (health/wellness)
  | 'luxury-elegant'     // Rich blacks, golden highlights
  | 'none';

interface ColorGradingProps {
  preset: ColorGradePreset;
  intensity: number;  // 0.0 to 1.0
  children: React.ReactNode;
}

const COLOR_GRADE_FILTERS: Record<ColorGradePreset, string> = {
  'warm-cinematic': `
    contrast(1.1)
    saturate(1.15)
    sepia(0.15)
    brightness(1.02)
    hue-rotate(-5deg)
  `.replace(/\s+/g, ' ').trim(),
  
  'cool-corporate': `
    contrast(1.05)
    saturate(0.95)
    brightness(1.05)
    hue-rotate(10deg)
  `.replace(/\s+/g, ' ').trim(),
  
  'vibrant-lifestyle': `
    contrast(1.15)
    saturate(1.35)
    brightness(1.05)
  `.replace(/\s+/g, ' ').trim(),
  
  'moody-dramatic': `
    contrast(1.25)
    saturate(0.85)
    brightness(0.95)
  `.replace(/\s+/g, ' ').trim(),
  
  'natural-organic': `
    contrast(1.05)
    saturate(1.05)
    sepia(0.05)
    brightness(1.02)
  `.replace(/\s+/g, ' ').trim(),
  
  'luxury-elegant': `
    contrast(1.12)
    saturate(0.9)
    brightness(0.98)
    sepia(0.08)
  `.replace(/\s+/g, ' ').trim(),
  
  'none': '',
};

export const ColorGrading: React.FC<ColorGradingProps> = ({
  preset,
  intensity,
  children,
}) => {
  if (preset === 'none' || intensity === 0) {
    return <>{children}</>;
  }

  const filter = COLOR_GRADE_FILTERS[preset];

  return (
    <AbsoluteFill
      style={{
        filter: filter,
        opacity: intensity,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
```

---

## Task 2: Create Film Grain Component

Create `remotion/components/post-processing/FilmGrain.tsx`:

```typescript
// remotion/components/post-processing/FilmGrain.tsx

import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, random } from 'remotion';

interface FilmGrainProps {
  intensity: number;  // 0.0 to 0.1 (0.04 = 4% recommended)
  speed?: number;     // Animation speed multiplier
}

export const FilmGrain: React.FC<FilmGrainProps> = ({
  intensity = 0.04,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Animate noise position each frame for organic movement
  const noiseOffset = useMemo(() => ({
    x: random(`grain-x-${Math.floor(frame * speed)}`) * 100,
    y: random(`grain-y-${Math.floor(frame * speed)}`) * 100,
  }), [frame, speed]);

  if (intensity <= 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
        opacity: intensity * 10,
        zIndex: 100,
      }}
    >
      {/* SVG noise pattern */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="film-grain-filter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="4"
              seed={frame % 100}
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      </svg>

      {/* Animated grain overlay */}
      <div
        style={{
          position: 'absolute',
          top: -noiseOffset.y,
          left: -noiseOffset.x,
          width: width + 200,
          height: height + 200,
          background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.3,
          filter: 'contrast(170%) brightness(1000%)',
        }}
      />
    </div>
  );
};
```

---

## Task 3: Create Vignette Component

Create `remotion/components/post-processing/Vignette.tsx`:

```typescript
// remotion/components/post-processing/Vignette.tsx

import React from 'react';

interface VignetteProps {
  intensity: number;   // 0.0 to 0.5 (0.2 = 20% recommended)
  softness?: number;   // 0.0 to 1.0 (how gradual the falloff)
  color?: string;      // Usually black, can be tinted
}

export const Vignette: React.FC<VignetteProps> = ({
  intensity = 0.2,
  softness = 0.5,
  color = 'rgba(0, 0, 0, 1)',
}) => {
  if (intensity <= 0) {
    return null;
  }

  // Calculate gradient stops based on softness
  const innerStop = 40 + softness * 30;  // 40-70%
  const outerStop = 70 + softness * 20;  // 70-90%

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        background: `radial-gradient(
          ellipse at center,
          transparent ${innerStop}%,
          ${color.replace('1)', `${intensity})`)} ${outerStop}%,
          ${color.replace('1)', `${intensity * 1.5})`)} 100%
        )`,
        zIndex: 99,
      }}
    />
  );
};
```

---

## Task 4: Create Letterbox Component

Create `remotion/components/post-processing/Letterbox.tsx`:

```typescript
// remotion/components/post-processing/Letterbox.tsx

import React from 'react';
import { useVideoConfig } from 'remotion';

interface LetterboxProps {
  aspectRatio: '2.35:1' | '2.39:1' | '1.85:1' | 'none';
  color?: string;
}

export const Letterbox: React.FC<LetterboxProps> = ({
  aspectRatio,
  color = '#000000',
}) => {
  const { width, height } = useVideoConfig();

  if (aspectRatio === 'none') {
    return null;
  }

  // Calculate letterbox bar height
  const ratioMap: Record<string, number> = {
    '2.35:1': 2.35,
    '2.39:1': 2.39,
    '1.85:1': 1.85,
  };

  const targetRatio = ratioMap[aspectRatio];
  const currentRatio = width / height;

  if (currentRatio <= targetRatio) {
    return null;  // Video is already narrower than target
  }

  const targetHeight = width / targetRatio;
  const barHeight = (height - targetHeight) / 2;

  return (
    <>
      {/* Top bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: barHeight,
          backgroundColor: color,
          zIndex: 98,
        }}
      />
      {/* Bottom bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: barHeight,
          backgroundColor: color,
          zIndex: 98,
        }}
      />
    </>
  );
};
```

---

## Task 5: Create FilmTreatment Wrapper Component

Create `remotion/components/post-processing/FilmTreatment.tsx`:

```typescript
// remotion/components/post-processing/FilmTreatment.tsx

import React from 'react';
import { AbsoluteFill } from 'remotion';
import { ColorGrading, ColorGradePreset } from './ColorGrading';
import { FilmGrain } from './FilmGrain';
import { Vignette } from './Vignette';
import { Letterbox } from './Letterbox';

export interface FilmTreatmentConfig {
  enabled: boolean;
  colorGrade: ColorGradePreset;
  colorIntensity: number;      // 0.0 to 1.0
  grainIntensity: number;      // 0.0 to 0.1
  vignetteIntensity: number;   // 0.0 to 0.5
  letterbox: '2.35:1' | '2.39:1' | '1.85:1' | 'none';
}

interface FilmTreatmentProps {
  config: FilmTreatmentConfig;
  children: React.ReactNode;
}

export const FilmTreatment: React.FC<FilmTreatmentProps> = ({
  config,
  children,
}) => {
  if (!config.enabled) {
    return <>{children}</>;
  }

  return (
    <AbsoluteFill>
      {/* Apply color grading */}
      <ColorGrading preset={config.colorGrade} intensity={config.colorIntensity}>
        {/* Content */}
        {children}
      </ColorGrading>

      {/* Overlay effects (above content) */}
      <FilmGrain intensity={config.grainIntensity} />
      <Vignette intensity={config.vignetteIntensity} />
      <Letterbox aspectRatio={config.letterbox} />
    </AbsoluteFill>
  );
};

// Preset configurations for different visual styles
export const FILM_TREATMENT_PRESETS: Record<string, FilmTreatmentConfig> = {
  'hero-cinematic': {
    enabled: true,
    colorGrade: 'warm-cinematic',
    colorIntensity: 1.0,
    grainIntensity: 0.04,
    vignetteIntensity: 0.25,
    letterbox: 'none',
  },
  'lifestyle': {
    enabled: true,
    colorGrade: 'natural-organic',
    colorIntensity: 1.0,
    grainIntensity: 0.03,
    vignetteIntensity: 0.15,
    letterbox: 'none',
  },
  'product-showcase': {
    enabled: true,
    colorGrade: 'cool-corporate',
    colorIntensity: 0.8,
    grainIntensity: 0.02,
    vignetteIntensity: 0.1,
    letterbox: 'none',
  },
  'educational': {
    enabled: true,
    colorGrade: 'natural-organic',
    colorIntensity: 0.9,
    grainIntensity: 0.02,
    vignetteIntensity: 0.1,
    letterbox: 'none',
  },
  'social-energetic': {
    enabled: true,
    colorGrade: 'vibrant-lifestyle',
    colorIntensity: 1.0,
    grainIntensity: 0.01,
    vignetteIntensity: 0.05,
    letterbox: 'none',
  },
  'premium': {
    enabled: true,
    colorGrade: 'luxury-elegant',
    colorIntensity: 1.0,
    grainIntensity: 0.03,
    vignetteIntensity: 0.3,
    letterbox: '2.35:1',
  },
};
```

---

## Task 6: Export from Index

Create `remotion/components/post-processing/index.ts`:

```typescript
// remotion/components/post-processing/index.ts

export { ColorGrading, type ColorGradePreset } from './ColorGrading';
export { FilmGrain } from './FilmGrain';
export { Vignette } from './Vignette';
export { Letterbox } from './Letterbox';
export { 
  FilmTreatment, 
  type FilmTreatmentConfig, 
  FILM_TREATMENT_PRESETS 
} from './FilmTreatment';
```

---

## Task 7: Update Universal Video Service

Add film treatment config to render pipeline:

```typescript
// server/services/universal-video-service.ts

import { FILM_TREATMENT_PRESETS } from '../remotion/components/post-processing';

// Add to prepareForRender():

// ═══════════════════════════════════════════════════════════════
// PHASE 18F: Configure film treatment
// ═══════════════════════════════════════════════════════════════
console.log('[Render] Step 6: Configuring film treatment...');
const filmTreatment = this.selectFilmTreatment(project.visualStyle);
console.log(`[Render] Film treatment: ${filmTreatment.colorGrade}`);
console.log(`[Render]   Color: ${filmTreatment.colorIntensity * 100}%`);
console.log(`[Render]   Grain: ${filmTreatment.grainIntensity * 100}%`);
console.log(`[Render]   Vignette: ${filmTreatment.vignetteIntensity * 100}%`);

// Add to renderInput
const renderInput: RenderInput = {
  // ... existing props ...
  filmTreatment,
};

/**
 * Select film treatment based on visual style
 */
private selectFilmTreatment(visualStyle: string): FilmTreatmentConfig {
  const presetMap: Record<string, string> = {
    'Hero (Cinematic)': 'hero-cinematic',
    'Lifestyle': 'lifestyle',
    'Product Showcase': 'product-showcase',
    'Educational': 'educational',
    'Social (Energetic)': 'social-energetic',
    'Premium': 'premium',
  };

  const preset = presetMap[visualStyle] || 'lifestyle';
  return FILM_TREATMENT_PRESETS[preset] || FILM_TREATMENT_PRESETS['lifestyle'];
}
```

---

## Verification

After implementation, check the logs:

```
[Render] Step 6: Configuring film treatment...
[Render] Film treatment: warm-cinematic
[Render]   Color: 100%
[Render]   Grain: 4%
[Render]   Vignette: 25%
```

Watch rendered video and verify:
- Colors feel warmer/cinematic (not flat digital)
- Subtle grain texture visible (organic feel)
- Edges slightly darkened (vignette draws focus)

---

## Success Criteria

- [ ] `ColorGrading.tsx` created with 6 presets
- [ ] `FilmGrain.tsx` created with animated noise
- [ ] `Vignette.tsx` created with customizable intensity
- [ ] `Letterbox.tsx` created (optional cinematic bars)
- [ ] `FilmTreatment.tsx` wrapper created
- [ ] Film treatment visible in rendered video
- [ ] No performance issues during render

---

## Next Phase

Proceed to **Phase 18G: Premium Transitions** for light leaks and film burns.
