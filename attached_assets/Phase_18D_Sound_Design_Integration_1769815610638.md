# Phase 18D: Sound Design Integration

## Priority: MEDIUM
## Dependency: Phase 18B (Overlay Pipeline)
## Estimated Time: 2-3 hours

---

## Problem

Videos lack professional sound design:
- No transition sounds between scenes
- Music doesn't duck under voiceover
- No ambient layer or impact sounds

---

## Solution

Add `SoundDesignLayer` and `DuckedMusic` components to the Remotion composition.

---

## Task 1: Define Sound Design Config Interface

Create `shared/types/sound-design.ts`:

```typescript
// shared/types/sound-design.ts

export interface SoundDesignConfig {
  enabled: boolean;
  
  transitions: {
    enabled: boolean;
    defaultSound: 'whoosh-soft' | 'whoosh-medium' | 'swipe' | 'none';
    volume: number;  // 0.0 to 1.0
  };
  
  logoReveal: {
    enabled: boolean;
    sound: 'logo-impact' | 'shimmer' | 'none';
    volume: number;
  };
  
  riseSwell: {
    enabled: boolean;
    durationBeforeCTA: number;  // Seconds before CTA to start
    volume: number;
  };
  
  audioDucking: {
    enabled: boolean;
    baseVolume: number;      // Music volume when no VO (e.g., 0.35)
    duckLevel: number;       // Music volume during VO (e.g., 0.1)
    fadeFrames: number;      // Frames to fade in/out
  };
  
  ambient: {
    enabled: boolean;
    sound: 'room-tone-warm' | 'subtle-air' | 'none';
    volume: number;
  };
}

export interface TransitionSound {
  sceneIndex: number;
  startFrame: number;
  sound: string;
  volume: number;
}

export interface VoiceoverRange {
  startFrame: number;
  endFrame: number;
}
```

---

## Task 2: Update Universal Video Service

Add to `server/services/universal-video-service.ts`:

```typescript
// Add to prepareForRender() method:

async prepareForRender(projectId: number): Promise<RenderInput> {
  // ... existing code from 18A, 18B, 18C ...

  // ═══════════════════════════════════════════════════════════════
  // PHASE 18D: Configure sound design
  // ═══════════════════════════════════════════════════════════════
  console.log('[Render] Step 4: Configuring sound design...');
  const soundDesign = this.configureSoundDesign(project);
  console.log(`[Render] Sound design: ${soundDesign.enabled ? 'ENABLED' : 'DISABLED'}`);

  // Calculate voiceover ranges for audio ducking
  const voiceoverRanges = this.calculateVoiceoverRanges(scenes, fps);
  console.log(`[Render] Voiceover ranges: ${voiceoverRanges.length} segments`);

  // Build render input
  const renderInput: RenderInput = {
    projectId,
    scenes: resolvedScenes,
    musicUrl: project.musicUrl,
    overlays: Object.fromEntries(overlayConfigs),
    brandInjection,
    soundDesign,          // NEW
    voiceoverRanges,      // NEW
    soundEffectsBaseUrl: process.env.SOUND_EFFECTS_URL || 'https://storage.googleapis.com/pinehillfarm-renders/audio/sfx',
  };

  return renderInput;
}

/**
 * Configure sound design based on project settings
 */
private configureSoundDesign(project: Project): SoundDesignConfig {
  // Default configuration (can be customized per project)
  return {
    enabled: true,
    transitions: {
      enabled: true,
      defaultSound: 'whoosh-soft',
      volume: 0.4,
    },
    logoReveal: {
      enabled: true,
      sound: 'logo-impact',
      volume: 0.5,
    },
    riseSwell: {
      enabled: true,
      durationBeforeCTA: 3,  // 3 seconds before CTA
      volume: 0.3,
    },
    audioDucking: {
      enabled: true,
      baseVolume: 0.35,
      duckLevel: 0.1,
      fadeFrames: 15,  // 0.5 seconds at 30fps
    },
    ambient: {
      enabled: false,  // Optional
      sound: 'room-tone-warm',
      volume: 0.05,
    },
  };
}

/**
 * Calculate frame ranges where voiceover is playing
 */
private calculateVoiceoverRanges(scenes: Scene[], fps: number): VoiceoverRange[] {
  const ranges: VoiceoverRange[] = [];
  let currentFrame = 0;

  for (const scene of scenes) {
    const sceneDurationFrames = Math.round(scene.duration * fps);
    
    if (scene.voiceoverUrl) {
      ranges.push({
        startFrame: currentFrame,
        endFrame: currentFrame + sceneDurationFrames,
      });
    }
    
    currentFrame += sceneDurationFrames;
  }

  return ranges;
}
```

---

## Task 3: Create SoundDesignLayer Component

Create `remotion/components/audio/SoundDesignLayer.tsx`:

```typescript
// remotion/components/audio/SoundDesignLayer.tsx

import React from 'react';
import { Audio, Sequence, useVideoConfig } from 'remotion';
import { SoundDesignConfig, TransitionSound } from '@shared/types/sound-design';

interface SoundDesignLayerProps {
  config: SoundDesignConfig;
  transitions: TransitionSound[];
  logoRevealFrame: number;
  ctaStartFrame: number;
  soundEffectsBaseUrl: string;
}

export const SoundDesignLayer: React.FC<SoundDesignLayerProps> = ({
  config,
  transitions,
  logoRevealFrame,
  ctaStartFrame,
  soundEffectsBaseUrl,
}) => {
  const { fps, durationInFrames } = useVideoConfig();

  if (!config.enabled) {
    return null;
  }

  // Build sound effect URLs
  const getSfxUrl = (name: string) => `${soundEffectsBaseUrl}/${name}.mp3`;

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TRANSITION SOUNDS                                               */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {config.transitions.enabled && transitions.map((transition, index) => (
        <Sequence
          key={`transition-${index}`}
          from={transition.startFrame}
          durationInFrames={Math.round(fps * 0.8)}  // ~0.8s duration
          name={`Transition-Sound-${index}`}
        >
          <Audio
            src={getSfxUrl(transition.sound || config.transitions.defaultSound)}
            volume={transition.volume || config.transitions.volume}
          />
        </Sequence>
      ))}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* LOGO REVEAL IMPACT                                              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {config.logoReveal.enabled && logoRevealFrame > 0 && (
        <Sequence
          from={logoRevealFrame}
          durationInFrames={Math.round(fps * 1.5)}
          name="Logo-Reveal-Sound"
        >
          <Audio
            src={getSfxUrl(config.logoReveal.sound)}
            volume={config.logoReveal.volume}
          />
        </Sequence>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* RISE/SWELL BEFORE CTA                                           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {config.riseSwell.enabled && ctaStartFrame > 0 && (
        <Sequence
          from={ctaStartFrame - Math.round(config.riseSwell.durationBeforeCTA * fps)}
          durationInFrames={Math.round(config.riseSwell.durationBeforeCTA * fps)}
          name="Rise-Swell"
        >
          <Audio
            src={getSfxUrl('rise-swell')}
            volume={config.riseSwell.volume}
          />
        </Sequence>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* AMBIENT LAYER (optional)                                        */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {config.ambient.enabled && (
        <Audio
          src={getSfxUrl(config.ambient.sound)}
          volume={config.ambient.volume}
          loop
        />
      )}
    </>
  );
};
```

---

## Task 4: Create DuckedMusic Component

Create `remotion/components/audio/DuckedMusic.tsx`:

```typescript
// remotion/components/audio/DuckedMusic.tsx

import React, { useMemo } from 'react';
import { Audio, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { VoiceoverRange } from '@shared/types/sound-design';

interface DuckedMusicProps {
  musicUrl: string;
  baseVolume: number;       // Volume when no VO (e.g., 0.35)
  duckLevel: number;        // Volume during VO (e.g., 0.1)
  voiceoverRanges: VoiceoverRange[];
  fadeFrames: number;       // Frames to fade (e.g., 15)
}

export const DuckedMusic: React.FC<DuckedMusicProps> = ({
  musicUrl,
  baseVolume,
  duckLevel,
  voiceoverRanges,
  fadeFrames,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Calculate current volume based on voiceover ranges
  const volume = useMemo(() => {
    // Check if we're in a voiceover range
    for (const range of voiceoverRanges) {
      // Fade down into voiceover
      if (frame >= range.startFrame - fadeFrames && frame < range.startFrame) {
        return interpolate(
          frame,
          [range.startFrame - fadeFrames, range.startFrame],
          [baseVolume, duckLevel],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
      }
      
      // During voiceover - stay ducked
      if (frame >= range.startFrame && frame < range.endFrame) {
        return duckLevel;
      }
      
      // Fade up after voiceover
      if (frame >= range.endFrame && frame < range.endFrame + fadeFrames) {
        return interpolate(
          frame,
          [range.endFrame, range.endFrame + fadeFrames],
          [duckLevel, baseVolume],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
      }
    }
    
    // Not in any voiceover range
    return baseVolume;
  }, [frame, voiceoverRanges, baseVolume, duckLevel, fadeFrames]);

  // Fade out at the end
  const finalVolume = interpolate(
    frame,
    [durationInFrames - 60, durationInFrames],
    [volume, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return <Audio src={musicUrl} volume={finalVolume} />;
};
```

---

## Task 5: Update UniversalVideoComposition

Add to `remotion/UniversalVideoComposition.tsx`:

```typescript
// Add imports
import { SoundDesignLayer } from './components/audio/SoundDesignLayer';
import { DuckedMusic } from './components/audio/DuckedMusic';
import { SoundDesignConfig, VoiceoverRange, TransitionSound } from '@shared/types/sound-design';

// Update props interface
interface UniversalVideoCompositionProps extends RenderInputProps {
  soundDesign?: SoundDesignConfig;
  voiceoverRanges?: VoiceoverRange[];
  soundEffectsBaseUrl?: string;
}

// Inside the component, replace the simple Audio with:

export const UniversalVideoComposition: React.FC<UniversalVideoCompositionProps> = ({
  scenes,
  musicUrl,
  overlays,
  brandInjection,
  soundDesign,
  voiceoverRanges = [],
  soundEffectsBaseUrl = '',
}) => {
  const { fps, durationInFrames } = useVideoConfig();

  // Calculate timing
  const logoIntroDuration = brandInjection?.logoIntro.enabled 
    ? Math.round(brandInjection.logoIntro.duration * fps) : 0;
  const ctaOutroStart = brandInjection?.ctaOutro.enabled
    ? durationInFrames - Math.round(brandInjection.ctaOutro.duration * fps) : durationInFrames;

  // Build transition sounds list
  const transitionSounds: TransitionSound[] = useMemo(() => {
    const sounds: TransitionSound[] = [];
    let currentFrame = logoIntroDuration;
    
    scenes.forEach((scene, index) => {
      if (index > 0) {
        sounds.push({
          sceneIndex: index,
          startFrame: currentFrame - Math.round(fps * 0.3),  // Start slightly before transition
          sound: soundDesign?.transitions.defaultSound || 'whoosh-soft',
          volume: soundDesign?.transitions.volume || 0.4,
        });
      }
      currentFrame += Math.round(scene.duration * fps);
    });
    
    return sounds;
  }, [scenes, logoIntroDuration, fps, soundDesign]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      
      {/* ... Logo intro, scenes, watermark, CTA outro (from 18C) ... */}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SOUND DESIGN LAYER                                              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {soundDesign?.enabled && (
        <SoundDesignLayer
          config={soundDesign}
          transitions={transitionSounds}
          logoRevealFrame={Math.round(fps * 0.3)}  // 0.3s into logo intro
          ctaStartFrame={ctaOutroStart}
          soundEffectsBaseUrl={soundEffectsBaseUrl}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* BACKGROUND MUSIC WITH DUCKING                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {musicUrl && soundDesign?.audioDucking.enabled ? (
        <DuckedMusic
          musicUrl={musicUrl}
          baseVolume={soundDesign.audioDucking.baseVolume}
          duckLevel={soundDesign.audioDucking.duckLevel}
          voiceoverRanges={voiceoverRanges}
          fadeFrames={soundDesign.audioDucking.fadeFrames}
        />
      ) : musicUrl ? (
        <Audio src={musicUrl} volume={0.3} />
      ) : null}
      
    </AbsoluteFill>
  );
};
```

---

## Task 6: Sound Effects Files Required

Upload these to S3/GCS at `{soundEffectsBaseUrl}/`:

| File | Duration | Description |
|------|----------|-------------|
| `whoosh-soft.mp3` | 0.5s | Soft transition whoosh |
| `whoosh-medium.mp3` | 0.6s | Medium transition whoosh |
| `swipe.mp3` | 0.4s | Quick swipe sound |
| `logo-impact.mp3` | 1.0s | Logo reveal impact |
| `rise-swell.mp3` | 3.0s | Rising sound before CTA |
| `room-tone-warm.mp3` | 30s | Ambient room tone (loops) |

---

## Verification

After implementation, check the console logs:

```
[Render] Step 4: Configuring sound design...
[Render] Sound design: ENABLED
[Render] Voiceover ranges: 5 segments
```

Listen to rendered video for:
- Whoosh sounds between scenes
- Impact sound on logo reveal
- Rising sound before CTA
- Music volume drops during voiceover

---

## Success Criteria

- [ ] `SoundDesignLayer.tsx` created
- [ ] `DuckedMusic.tsx` created
- [ ] Transition sounds play between scenes
- [ ] Music ducks under voiceover
- [ ] Rise/swell plays before CTA
- [ ] Sound effects load from S3/GCS URL

---

## Next Phase

Proceed to **Phase 18E: End Card Implementation** once this is complete.
