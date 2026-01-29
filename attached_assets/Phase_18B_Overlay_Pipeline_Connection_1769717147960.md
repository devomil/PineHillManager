# Phase 18B: Overlay Pipeline Connection

## Priority: HIGH
## Dependency: Phase 18A (Asset URL Resolution)
## Estimated Time: 2-3 hours

---

## Problem

The `overlayConfigurationService` exists but is never called during render preparation. Overlays don't appear in videos.

---

## Solution

Wire `overlayConfigurationService` into the render pipeline and pass overlay configs to Remotion.

---

## Task 1: Update Universal Video Service

Modify `server/services/universal-video-service.ts`:

```typescript
// server/services/universal-video-service.ts

import { assetUrlResolver } from './asset-url-resolver';
import { overlayConfigurationService } from './overlay-configuration-service';

// Add to prepareForRender() method:

async prepareForRender(projectId: number): Promise<RenderInput> {
  console.log('[Render] ═══════════════════════════════════════════════════');
  console.log('[Render] Preparing project for Remotion render');
  console.log('[Render] ═══════════════════════════════════════════════════');

  // Load project and scenes
  const project = await this.loadProject(projectId);
  const scenes = await this.loadScenes(projectId);

  // ═══════════════════════════════════════════════════════════════
  // PHASE 18A: Resolve all asset URLs to public URLs
  // ═══════════════════════════════════════════════════════════════
  console.log('[Render] Step 1: Resolving asset URLs...');
  const resolvedScenes = await this.resolveSceneUrls(scenes);

  // ═══════════════════════════════════════════════════════════════
  // PHASE 18B: Generate overlay configurations
  // ═══════════════════════════════════════════════════════════════
  console.log('[Render] Step 2: Generating overlay configurations...');
  const overlayConfigs = await this.generateOverlayConfigs(projectId, scenes);
  console.log(`[Render] Generated overlay configs for ${overlayConfigs.size} scenes`);

  // Build render input with overlays
  const renderInput: RenderInput = {
    projectId,
    scenes: resolvedScenes,
    musicUrl: project.musicUrl,
    overlays: Object.fromEntries(overlayConfigs), // Convert Map to object
  };

  return renderInput;
}

/**
 * Generate overlay configurations for all scenes
 */
private async generateOverlayConfigs(
  projectId: number, 
  scenes: Scene[]
): Promise<Map<string, SceneOverlayConfig>> {
  const configs = new Map<string, SceneOverlayConfig>();

  try {
    // Use the overlay configuration service
    const overlayPlan = await overlayConfigurationService.generateOverlaysForProject(
      projectId,
      scenes
    );

    // Log what was generated
    for (const [sceneId, config] of Object.entries(overlayPlan)) {
      configs.set(sceneId, config as SceneOverlayConfig);
      
      const overlayTypes = [];
      if (config.logo) overlayTypes.push('logo');
      if (config.watermark) overlayTypes.push('watermark');
      if (config.texts?.length) overlayTypes.push(`${config.texts.length} texts`);
      if (config.cta) overlayTypes.push('CTA');
      
      console.log(`[Render]   Scene ${sceneId}: ${overlayTypes.join(', ') || 'none'}`);
    }
  } catch (error) {
    console.error('[Render] Error generating overlay configs:', error);
    // Return empty configs rather than failing
  }

  return configs;
}

/**
 * Resolve all URLs in scenes to public URLs
 */
private async resolveSceneUrls(scenes: Scene[]): Promise<Scene[]> {
  const resolved: Scene[] = [];

  for (const scene of scenes) {
    const resolvedScene = { ...scene };

    // Resolve video URL
    if (scene.videoUrl) {
      resolvedScene.videoUrl = await assetUrlResolver.resolve(scene.videoUrl);
    }

    // Resolve image URL
    if (scene.imageUrl) {
      resolvedScene.imageUrl = await assetUrlResolver.resolve(scene.imageUrl);
    }

    // Resolve voiceover URL
    if (scene.voiceoverUrl) {
      resolvedScene.voiceoverUrl = await assetUrlResolver.resolve(scene.voiceoverUrl);
    }

    resolved.push(resolvedScene);
  }

  return resolved;
}
```

---

## Task 2: Define Overlay Config Interface

Create or update `shared/types/overlay-config.ts`:

```typescript
// shared/types/overlay-config.ts

export interface SceneOverlayConfig {
  sceneId: string;
  logo?: LogoOverlayConfig;
  watermark?: WatermarkOverlayConfig;
  texts?: TextOverlayConfig[];
  cta?: CTAOverlayConfig;
}

export interface LogoOverlayConfig {
  enabled: boolean;
  url: string;           // Must be public URL
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size: number;          // Percentage of video width (e.g., 20 = 20%)
  animation: 'fade' | 'zoom' | 'slide';
  startTime: number;     // Seconds from scene start
  duration: number;      // Seconds
}

export interface WatermarkOverlayConfig {
  enabled: boolean;
  url: string;           // Must be public URL
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size: number;          // Percentage (e.g., 8 = 8%)
  opacity: number;       // 0.0 to 1.0
}

export interface TextOverlayConfig {
  id: string;
  text: string;
  position: 'top' | 'center' | 'bottom';
  style: 'headline' | 'subtitle' | 'caption';
  animation: 'fade' | 'slide-up' | 'typewriter';
  startTime: number;
  duration: number;
  color?: string;
  backgroundColor?: string;
}

export interface CTAOverlayConfig {
  enabled: boolean;
  headline: string;
  website?: string;
  phone?: string;
  logoUrl?: string;      // Must be public URL
  backgroundColor: string;
  textColor: string;
  animation: 'fade' | 'slide-up' | 'stagger';
}
```

---

## Task 3: Update Remotion Input Props Interface

Update `remotion/types.ts` or create if missing:

```typescript
// remotion/types.ts

import { SceneOverlayConfig } from '@shared/types/overlay-config';

export interface RenderInputProps {
  projectId: number;
  scenes: SceneData[];
  musicUrl?: string;
  overlays: Record<string, SceneOverlayConfig>;  // NEW
  brandInjection?: BrandInjectionPlan;           // Phase 18C
  soundDesign?: SoundDesignConfig;               // Phase 18D
  endCard?: EndCardConfig;                       // Phase 18E
}

export interface SceneData {
  id: string;
  order: number;
  duration: number;
  videoUrl?: string;
  imageUrl?: string;
  voiceoverUrl?: string;
  voiceoverText?: string;
}
```

---

## Task 4: Update UniversalVideoComposition to Receive Overlays

Modify `remotion/UniversalVideoComposition.tsx`:

```typescript
// remotion/UniversalVideoComposition.tsx

import { AbsoluteFill, Sequence, Video, Audio, Img } from 'remotion';
import { RenderInputProps, SceneData } from './types';
import { LogoOverlay } from './components/overlays/LogoOverlay';
import { WatermarkOverlay } from './components/overlays/WatermarkOverlay';
import { TextOverlay } from './components/overlays/TextOverlay';

export const UniversalVideoComposition: React.FC<RenderInputProps> = ({
  scenes,
  musicUrl,
  overlays,  // NEW: Overlay configurations
}) => {
  const { fps } = useVideoConfig();

  // Calculate scene timings
  const sceneTimings = calculateSceneTimings(scenes, fps);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Render each scene with its overlays */}
      {scenes.map((scene, index) => {
        const timing = sceneTimings[index];
        const sceneOverlays = overlays?.[scene.id];

        return (
          <Sequence
            key={scene.id}
            from={timing.startFrame}
            durationInFrames={timing.durationFrames}
            name={`Scene-${index + 1}`}
          >
            {/* Scene video/image */}
            <SceneContent scene={scene} />

            {/* ═══════════════════════════════════════════════════════ */}
            {/* PHASE 18B: Render overlays for this scene              */}
            {/* ═══════════════════════════════════════════════════════ */}
            {sceneOverlays && (
              <SceneOverlays 
                config={sceneOverlays} 
                sceneDuration={scene.duration}
                fps={fps}
              />
            )}
          </Sequence>
        );
      })}

      {/* Background music */}
      {musicUrl && <Audio src={musicUrl} volume={0.3} />}
    </AbsoluteFill>
  );
};

// Scene content renderer
const SceneContent: React.FC<{ scene: SceneData }> = ({ scene }) => {
  return (
    <AbsoluteFill>
      {scene.videoUrl && (
        <Video
          src={scene.videoUrl}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      {!scene.videoUrl && scene.imageUrl && (
        <Img
          src={scene.imageUrl}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      {scene.voiceoverUrl && (
        <Audio src={scene.voiceoverUrl} volume={1} />
      )}
    </AbsoluteFill>
  );
};

// Scene overlays renderer
const SceneOverlays: React.FC<{
  config: SceneOverlayConfig;
  sceneDuration: number;
  fps: number;
}> = ({ config, sceneDuration, fps }) => {
  return (
    <>
      {/* Logo overlay */}
      {config.logo?.enabled && config.logo.url && (
        <Sequence
          from={Math.round(config.logo.startTime * fps)}
          durationInFrames={Math.round(config.logo.duration * fps)}
        >
          <LogoOverlay
            logoUrl={config.logo.url}
            position={config.logo.position}
            size={config.logo.size}
            animation={config.logo.animation}
          />
        </Sequence>
      )}

      {/* Watermark overlay (entire scene) */}
      {config.watermark?.enabled && config.watermark.url && (
        <WatermarkOverlay
          logoUrl={config.watermark.url}
          position={config.watermark.position}
          size={config.watermark.size}
          opacity={config.watermark.opacity}
        />
      )}

      {/* Text overlays */}
      {config.texts?.map((text) => (
        <Sequence
          key={text.id}
          from={Math.round(text.startTime * fps)}
          durationInFrames={Math.round(text.duration * fps)}
        >
          <TextOverlay
            text={text.text}
            position={text.position}
            style={text.style}
            animation={text.animation}
            color={text.color}
            backgroundColor={text.backgroundColor}
          />
        </Sequence>
      ))}
    </>
  );
};

// Calculate timing for each scene
function calculateSceneTimings(scenes: SceneData[], fps: number) {
  let currentFrame = 0;
  
  return scenes.map(scene => {
    const startFrame = currentFrame;
    const durationFrames = Math.round(scene.duration * fps);
    currentFrame += durationFrames;
    
    return { startFrame, durationFrames };
  });
}
```

---

## Task 5: Create Basic Overlay Components (if missing)

Create `remotion/components/overlays/WatermarkOverlay.tsx`:

```typescript
// remotion/components/overlays/WatermarkOverlay.tsx

import React from 'react';
import { Img } from 'remotion';

interface WatermarkOverlayProps {
  logoUrl: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size: number;
  opacity: number;
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({
  logoUrl,
  position,
  size,
  opacity,
}) => {
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 20, left: 20 },
    'top-right': { top: 20, right: 20 },
    'bottom-left': { bottom: 20, left: 20 },
    'bottom-right': { bottom: 20, right: 20 },
  };

  return (
    <div
      style={{
        position: 'absolute',
        ...positionStyles[position],
        opacity,
        zIndex: 10,
      }}
    >
      <Img
        src={logoUrl}
        style={{
          width: `${size}%`,
          height: 'auto',
          maxWidth: 200,
        }}
      />
    </div>
  );
};
```

---

## Verification

After implementation, check the console logs:

```
[Render] ═══════════════════════════════════════════════════
[Render] Preparing project for Remotion render
[Render] ═══════════════════════════════════════════════════
[Render] Step 1: Resolving asset URLs...
[Render] Step 2: Generating overlay configurations...
[Render] Generated overlay configs for 5 scenes
[Render]   Scene abc123: logo
[Render]   Scene def456: watermark
[Render]   Scene ghi789: watermark, 2 texts
[Render]   Scene jkl012: watermark
[Render]   Scene mno345: watermark, CTA
```

---

## Success Criteria

- [ ] `overlayConfigurationService` called during render prep
- [ ] Overlay configs passed to Remotion inputProps
- [ ] `UniversalVideoComposition` receives overlays prop
- [ ] Watermark visible in rendered video
- [ ] Console shows overlay config generation

---

## Next Phase

Proceed to **Phase 18C: Brand Injection Integration** once this is complete.
