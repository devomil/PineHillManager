# Phase 18H: Broadcast Composition Wrapper

## Priority: MEDIUM
## Dependency: Phase 18F, 18G
## Estimated Time: 1-2 hours

---

## Purpose

Create `BroadcastVideoComposition` that wraps `UniversalVideoComposition` with film treatment and premium transitions to deliver TV-quality output.

---

## Task 1: Create BroadcastVideoComposition

Create `remotion/BroadcastVideoComposition.tsx`:

```typescript
// remotion/BroadcastVideoComposition.tsx

import React from 'react';
import { AbsoluteFill } from 'remotion';
import { UniversalVideoComposition } from './UniversalVideoComposition';
import { FilmTreatment, FilmTreatmentConfig, FILM_TREATMENT_PRESETS } from './components/post-processing';
import { TransitionManager, TransitionConfig } from './components/transitions';
import { RenderInputProps } from './types';

export interface BroadcastInputProps extends RenderInputProps {
  // Film treatment settings
  filmTreatment?: FilmTreatmentConfig;
  
  // Premium transitions between scenes
  transitions?: TransitionConfig[];
}

export const BroadcastVideoComposition: React.FC<BroadcastInputProps> = (props) => {
  const {
    filmTreatment = FILM_TREATMENT_PRESETS['hero-cinematic'],
    ...universalProps
  } = props;

  return (
    <AbsoluteFill>
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FILM TREATMENT LAYER                                            */}
      {/* Wraps everything with cinematic post-processing                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <FilmTreatment config={filmTreatment}>
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* UNIVERSAL VIDEO COMPOSITION                                     */}
        {/* Contains: scenes, overlays, brand injection, sound design       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <UniversalVideoComposition {...universalProps} />
        
      </FilmTreatment>
    </AbsoluteFill>
  );
};
```

---

## Task 2: Register Composition in Remotion Index

Update `remotion/index.ts` (or `remotion/Root.tsx`):

```typescript
// remotion/index.ts

import { Composition } from 'remotion';
import { UniversalVideoComposition } from './UniversalVideoComposition';
import { BroadcastVideoComposition, BroadcastInputProps } from './BroadcastVideoComposition';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Original composition (for backwards compatibility) */}
      <Composition
        id="UniversalVideoComposition"
        component={UniversalVideoComposition}
        durationInFrames={900}  // 30 seconds at 30fps default
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          projectId: 0,
          scenes: [],
          musicUrl: '',
          overlays: {},
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* BROADCAST COMPOSITION (Phase 18 - Primary)                      */}
      {/* Use this for all production renders                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Composition
        id="BroadcastVideoComposition"
        component={BroadcastVideoComposition}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          projectId: 0,
          scenes: [],
          musicUrl: '',
          overlays: {},
          brandInjection: null,
          soundDesign: null,
          endCard: null,
          filmTreatment: {
            enabled: true,
            colorGrade: 'warm-cinematic',
            colorIntensity: 1.0,
            grainIntensity: 0.04,
            vignetteIntensity: 0.2,
            letterbox: 'none',
          },
        } as BroadcastInputProps}
        calculateMetadata={({ props }) => {
          // Dynamic duration based on scenes + brand elements
          const sceneDuration = props.scenes?.reduce((sum, s) => sum + (s.duration || 5), 0) || 30;
          const introDuration = props.brandInjection?.logoIntro.enabled 
            ? props.brandInjection.logoIntro.duration : 0;
          const outroDuration = props.brandInjection?.ctaOutro.enabled
            ? props.brandInjection.ctaOutro.duration : 0;
          const endCardDuration = props.endCard?.enabled ? props.endCard.duration : 0;
          
          const totalSeconds = sceneDuration + introDuration + outroDuration + endCardDuration;
          
          return {
            durationInFrames: Math.ceil(totalSeconds * 30),
          };
        }}
      />

      {/* Preview composition (lower quality, faster render) */}
      <Composition
        id="PreviewComposition"
        component={BroadcastVideoComposition}
        durationInFrames={900}
        fps={24}
        width={854}
        height={480}
        defaultProps={{
          projectId: 0,
          scenes: [],
          musicUrl: '',
          overlays: {},
          filmTreatment: {
            enabled: true,
            colorGrade: 'warm-cinematic',
            colorIntensity: 0.8,
            grainIntensity: 0.02,
            vignetteIntensity: 0.15,
            letterbox: 'none',
          },
        } as BroadcastInputProps}
      />

      {/* Social media vertical composition */}
      <Composition
        id="SocialVerticalComposition"
        component={BroadcastVideoComposition}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          projectId: 0,
          scenes: [],
          musicUrl: '',
          overlays: {},
          filmTreatment: {
            enabled: true,
            colorGrade: 'vibrant-lifestyle',
            colorIntensity: 1.0,
            grainIntensity: 0.01,
            vignetteIntensity: 0.05,
            letterbox: 'none',
          },
        } as BroadcastInputProps}
      />
    </>
  );
};
```

---

## Task 3: Update Render Service to Use BroadcastVideoComposition

Update `server/services/remotion-render-service.ts`:

```typescript
// server/services/remotion-render-service.ts

import { renderMediaOnLambda } from '@remotion/lambda/client';

async renderVideo(request: RenderRequest): Promise<RenderResult> {
  // ... existing validation and setup ...

  // ═══════════════════════════════════════════════════════════════
  // PHASE 18H: Use BroadcastVideoComposition for production
  // ═══════════════════════════════════════════════════════════════
  const compositionId = request.preset === 'preview' 
    ? 'PreviewComposition'
    : request.preset === 'social-vertical'
    ? 'SocialVerticalComposition'
    : 'BroadcastVideoComposition';  // Default for broadcast-1080p, premium-4k

  console.log(`[Render] Using composition: ${compositionId}`);

  const result = await renderMediaOnLambda({
    region: this.region,
    functionName: this.functionName,
    serveUrl: this.serveUrl,
    composition: compositionId,  // Use appropriate composition
    inputProps: {
      projectId: request.projectId,
      scenes: request.scenes,
      musicUrl: request.musicUrl,
      overlays: request.overlays,
      brandInjection: request.brandInjection,
      soundDesign: request.soundDesign,
      endCard: request.endCard,
      filmTreatment: request.filmTreatment,
      voiceoverRanges: request.voiceoverRanges,
      soundEffectsBaseUrl: request.soundEffectsBaseUrl,
    },
    codec: 'h264',
    crf: request.preset === 'preview' ? 28 : request.preset === 'premium-4k' ? 16 : 18,
    // ... rest of config ...
  });

  return result;
}
```

---

## Task 4: Create Composition Selector Utility

Create `server/utils/composition-selector.ts`:

```typescript
// server/utils/composition-selector.ts

import { FILM_TREATMENT_PRESETS, FilmTreatmentConfig } from '../remotion/components/post-processing';

export type RenderPreset = 'preview' | 'broadcast-1080p' | 'social-vertical' | 'premium-4k';

export interface CompositionConfig {
  compositionId: string;
  width: number;
  height: number;
  fps: number;
  crf: number;
  filmTreatment: FilmTreatmentConfig;
}

export function getCompositionConfig(
  preset: RenderPreset,
  visualStyle: string
): CompositionConfig {
  const styleToPreset: Record<string, string> = {
    'Hero (Cinematic)': 'hero-cinematic',
    'Lifestyle': 'lifestyle',
    'Product Showcase': 'product-showcase',
    'Educational': 'educational',
    'Social (Energetic)': 'social-energetic',
    'Premium': 'premium',
  };

  const filmTreatmentPreset = styleToPreset[visualStyle] || 'hero-cinematic';
  const filmTreatment = FILM_TREATMENT_PRESETS[filmTreatmentPreset];

  switch (preset) {
    case 'preview':
      return {
        compositionId: 'PreviewComposition',
        width: 854,
        height: 480,
        fps: 24,
        crf: 28,
        filmTreatment: {
          ...filmTreatment,
          grainIntensity: filmTreatment.grainIntensity * 0.5,
        },
      };

    case 'social-vertical':
      return {
        compositionId: 'SocialVerticalComposition',
        width: 1080,
        height: 1920,
        fps: 30,
        crf: 20,
        filmTreatment: FILM_TREATMENT_PRESETS['social-energetic'],
      };

    case 'premium-4k':
      return {
        compositionId: 'BroadcastVideoComposition',
        width: 3840,
        height: 2160,
        fps: 30,
        crf: 16,
        filmTreatment,
      };

    case 'broadcast-1080p':
    default:
      return {
        compositionId: 'BroadcastVideoComposition',
        width: 1920,
        height: 1080,
        fps: 30,
        crf: 18,
        filmTreatment,
      };
  }
}
```

---

## Verification

After implementation:

1. Check the Remotion preview:
```bash
npx remotion preview
# Should show BroadcastVideoComposition in the sidebar
```

2. Verify composition is used in render:
```
[Render] Using composition: BroadcastVideoComposition
```

3. Watch rendered video and verify:
- Film treatment applied (color grading, grain, vignette)
- All brand elements visible
- Sound design working
- Premium quality output

---

## Success Criteria

- [ ] `BroadcastVideoComposition.tsx` created
- [ ] Composition registered in Remotion index
- [ ] Render service uses correct composition per preset
- [ ] Preview, broadcast, social, and 4K presets working
- [ ] Film treatment wraps entire composition

---

## Next Phase

Proceed to **Phase 18I: Node.js 22 Lambda Upgrade** to deploy to AWS.
