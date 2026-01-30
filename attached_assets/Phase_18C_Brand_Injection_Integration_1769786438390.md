# Phase 18C: Brand Injection Integration

## Priority: HIGH
## Dependency: Phase 18A, 18B
## Estimated Time: 3-4 hours

---

## Problem

`brandInjectionService` exists but isn't connected to the render pipeline. Videos lack:
- Logo intro animation
- Persistent watermark
- CTA outro with contact info

---

## Solution

Wire `brandInjectionService` to render pipeline and add brand components to Remotion composition.

---

## Task 1: Define Brand Injection Plan Interface

Create `shared/types/brand-injection.ts`:

```typescript
// shared/types/brand-injection.ts

export interface BrandInjectionPlan {
  enabled: boolean;
  
  logoIntro: {
    enabled: boolean;
    logoUrl: string;         // Must be public URL
    duration: number;        // Seconds (typically 2-3)
    animation: 'fade' | 'zoom' | 'slide' | 'bounce';
    backgroundColor: string;
  };
  
  watermark: {
    enabled: boolean;
    logoUrl: string;         // Must be public URL
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    size: number;            // Percentage of width
    opacity: number;         // 0.0 to 1.0
    startAfterIntro: boolean;
  };
  
  ctaOutro: {
    enabled: boolean;
    logoUrl: string;         // Must be public URL
    headline: string;
    subheadline?: string;
    website?: string;
    phone?: string;
    duration: number;        // Seconds (typically 4-5)
    backgroundColor: string;
    textColor: string;
    animation: 'fade' | 'slide-up' | 'stagger';
  };
  
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}
```

---

## Task 2: Update Universal Video Service for Brand Injection

Add to `server/services/universal-video-service.ts`:

```typescript
// Add import
import { brandInjectionService } from './brand-injection-service';
import { assetUrlResolver } from './asset-url-resolver';

// Update prepareForRender() method:

async prepareForRender(projectId: number): Promise<RenderInput> {
  // ... existing code from 18A and 18B ...

  // ═══════════════════════════════════════════════════════════════
  // PHASE 18C: Generate brand injection plan
  // ═══════════════════════════════════════════════════════════════
  console.log('[Render] Step 3: Generating brand injection plan...');
  const brandInjection = await this.generateBrandInjectionPlan(projectId);
  
  if (brandInjection.enabled) {
    console.log('[Render] Brand injection plan:');
    console.log(`[Render]   Logo intro: ${brandInjection.logoIntro.enabled ? 'ENABLED' : 'disabled'}`);
    console.log(`[Render]   Watermark: ${brandInjection.watermark.enabled ? 'ENABLED' : 'disabled'}`);
    console.log(`[Render]   CTA outro: ${brandInjection.ctaOutro.enabled ? 'ENABLED' : 'disabled'}`);
  } else {
    console.log('[Render] Brand injection: DISABLED');
  }

  // Build render input
  const renderInput: RenderInput = {
    projectId,
    scenes: resolvedScenes,
    musicUrl: project.musicUrl,
    overlays: Object.fromEntries(overlayConfigs),
    brandInjection,  // NEW
  };

  return renderInput;
}

/**
 * Generate brand injection plan with resolved URLs
 */
private async generateBrandInjectionPlan(projectId: number): Promise<BrandInjectionPlan> {
  try {
    // Get base plan from service
    const plan = await brandInjectionService.createInjectionPlan(projectId);
    
    if (!plan.enabled) {
      return plan;
    }

    // Resolve all logo URLs to public URLs
    console.log('[BrandInjection] Resolving logo URLs...');
    
    if (plan.logoIntro.enabled && plan.logoIntro.logoUrl) {
      plan.logoIntro.logoUrl = await assetUrlResolver.resolve(plan.logoIntro.logoUrl);
      console.log('[BrandInjection]   Intro logo: OK');
    }
    
    if (plan.watermark.enabled && plan.watermark.logoUrl) {
      plan.watermark.logoUrl = await assetUrlResolver.resolve(plan.watermark.logoUrl);
      console.log('[BrandInjection]   Watermark: OK');
    }
    
    if (plan.ctaOutro.enabled && plan.ctaOutro.logoUrl) {
      plan.ctaOutro.logoUrl = await assetUrlResolver.resolve(plan.ctaOutro.logoUrl);
      console.log('[BrandInjection]   Outro logo: OK');
    }

    return plan;
  } catch (error) {
    console.error('[BrandInjection] Error creating plan:', error);
    // Return disabled plan on error
    return {
      enabled: false,
      logoIntro: { enabled: false, logoUrl: '', duration: 0, animation: 'fade', backgroundColor: '#000' },
      watermark: { enabled: false, logoUrl: '', position: 'bottom-right', size: 8, opacity: 0.7, startAfterIntro: true },
      ctaOutro: { enabled: false, logoUrl: '', headline: '', duration: 0, backgroundColor: '#000', textColor: '#fff', animation: 'fade' },
      colors: { primary: '#000', secondary: '#fff', accent: '#007bff' },
    };
  }
}
```

---

## Task 3: Create LogoIntro Component

Create `remotion/components/brand/LogoIntro.tsx`:

```typescript
// remotion/components/brand/LogoIntro.tsx

import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface LogoIntroProps {
  logoUrl: string;
  backgroundColor: string;
  animation: 'fade' | 'zoom' | 'slide' | 'bounce';
  duration: number;
}

export const LogoIntro: React.FC<LogoIntroProps> = ({
  logoUrl,
  backgroundColor,
  animation,
  duration,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationFrames = duration * fps;

  // Animation calculations
  const fadeIn = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const fadeOut = interpolate(
    frame,
    [durationFrames - fps * 0.5, durationFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const opacity = Math.min(fadeIn, fadeOut);

  // Animation-specific transforms
  let scale = 1;
  let translateY = 0;

  if (animation === 'zoom') {
    scale = spring({
      frame,
      fps,
      config: { damping: 12, stiffness: 100 },
    });
  } else if (animation === 'slide') {
    translateY = interpolate(frame, [0, fps * 0.5], [100, 0], {
      extrapolateRight: 'clamp',
    });
  } else if (animation === 'bounce') {
    scale = spring({
      frame,
      fps,
      config: { damping: 8, stiffness: 200 },
    });
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
      }}
    >
      <Img
        src={logoUrl}
        style={{
          maxWidth: '40%',
          maxHeight: '40%',
          objectFit: 'contain',
          transform: `scale(${scale}) translateY(${translateY}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
```

---

## Task 4: Create CTAOutro Component

Create `remotion/components/brand/CTAOutro.tsx`:

```typescript
// remotion/components/brand/CTAOutro.tsx

import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface CTAOutroProps {
  logoUrl: string;
  headline: string;
  subheadline?: string;
  website?: string;
  phone?: string;
  backgroundColor: string;
  textColor: string;
  animation: 'fade' | 'slide-up' | 'stagger';
}

export const CTAOutro: React.FC<CTAOutroProps> = ({
  logoUrl,
  headline,
  subheadline,
  website,
  phone,
  backgroundColor,
  textColor,
  animation,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Staggered animation delays
  const logoDelay = 0;
  const headlineDelay = fps * 0.3;
  const subheadlineDelay = fps * 0.5;
  const contactDelay = fps * 0.7;

  // Animation helper
  const getOpacity = (delay: number) => {
    if (animation === 'fade' || animation === 'stagger') {
      return interpolate(frame, [delay, delay + fps * 0.3], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    }
    return 1;
  };

  const getTranslateY = (delay: number) => {
    if (animation === 'slide-up' || animation === 'stagger') {
      return interpolate(frame, [delay, delay + fps * 0.4], [50, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    }
    return 0;
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
      }}
    >
      {/* Logo */}
      {logoUrl && (
        <div
          style={{
            opacity: getOpacity(logoDelay),
            transform: `translateY(${getTranslateY(logoDelay)}px)`,
            marginBottom: 40,
          }}
        >
          <Img
            src={logoUrl}
            style={{
              maxWidth: 250,
              maxHeight: 120,
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      {/* Headline */}
      <h1
        style={{
          color: textColor,
          fontSize: 64,
          fontWeight: 'bold',
          textAlign: 'center',
          margin: 0,
          marginBottom: 20,
          opacity: getOpacity(headlineDelay),
          transform: `translateY(${getTranslateY(headlineDelay)}px)`,
        }}
      >
        {headline}
      </h1>

      {/* Subheadline */}
      {subheadline && (
        <p
          style={{
            color: textColor,
            fontSize: 32,
            textAlign: 'center',
            margin: 0,
            marginBottom: 40,
            opacity: getOpacity(subheadlineDelay) * 0.8,
            transform: `translateY(${getTranslateY(subheadlineDelay)}px)`,
          }}
        >
          {subheadline}
        </p>
      )}

      {/* Contact Info */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 15,
          opacity: getOpacity(contactDelay),
          transform: `translateY(${getTranslateY(contactDelay)}px)`,
        }}
      >
        {website && (
          <p style={{ color: textColor, fontSize: 36, margin: 0 }}>
            {website}
          </p>
        )}
        {phone && (
          <p style={{ color: textColor, fontSize: 32, margin: 0, opacity: 0.9 }}>
            {phone}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};
```

---

## Task 5: Update UniversalVideoComposition for Brand Injection

Modify `remotion/UniversalVideoComposition.tsx`:

```typescript
// Add imports
import { LogoIntro } from './components/brand/LogoIntro';
import { CTAOutro } from './components/brand/CTAOutro';
import { WatermarkOverlay } from './components/overlays/WatermarkOverlay';
import { BrandInjectionPlan } from '@shared/types/brand-injection';

// Update component props
interface UniversalVideoCompositionProps extends RenderInputProps {
  brandInjection?: BrandInjectionPlan;
}

export const UniversalVideoComposition: React.FC<UniversalVideoCompositionProps> = ({
  scenes,
  musicUrl,
  overlays,
  brandInjection,
}) => {
  const { fps, durationInFrames } = useVideoConfig();

  // Calculate brand injection timing
  const logoIntroDuration = brandInjection?.logoIntro.enabled 
    ? Math.round(brandInjection.logoIntro.duration * fps)
    : 0;
  
  const ctaOutroDuration = brandInjection?.ctaOutro.enabled
    ? Math.round(brandInjection.ctaOutro.duration * fps)
    : 0;

  const ctaOutroStart = durationInFrames - ctaOutroDuration;
  const mainContentStart = logoIntroDuration;
  const mainContentEnd = ctaOutroStart;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* LOGO INTRO (first 2-3 seconds)                                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {brandInjection?.logoIntro.enabled && brandInjection.logoIntro.logoUrl && (
        <Sequence
          from={0}
          durationInFrames={logoIntroDuration}
          name="LogoIntro"
        >
          <LogoIntro
            logoUrl={brandInjection.logoIntro.logoUrl}
            backgroundColor={brandInjection.logoIntro.backgroundColor}
            animation={brandInjection.logoIntro.animation}
            duration={brandInjection.logoIntro.duration}
          />
        </Sequence>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MAIN SCENE CONTENT                                              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Sequence
        from={mainContentStart}
        durationInFrames={mainContentEnd - mainContentStart}
        name="MainContent"
      >
        {scenes.map((scene, index) => {
          const timing = calculateSceneTimings(scenes, fps)[index];
          const sceneOverlays = overlays?.[scene.id];

          return (
            <Sequence
              key={scene.id}
              from={timing.startFrame}
              durationInFrames={timing.durationFrames}
              name={`Scene-${index + 1}`}
            >
              <SceneContent scene={scene} />
              {sceneOverlays && (
                <SceneOverlays config={sceneOverlays} sceneDuration={scene.duration} fps={fps} />
              )}
            </Sequence>
          );
        })}
      </Sequence>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* WATERMARK (middle scenes, not on intro/outro)                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {brandInjection?.watermark.enabled && brandInjection.watermark.logoUrl && (
        <Sequence
          from={mainContentStart + Math.round(fps)}  // Start 1s after intro
          durationInFrames={mainContentEnd - mainContentStart - Math.round(2 * fps)}
          name="Watermark"
        >
          <WatermarkOverlay
            logoUrl={brandInjection.watermark.logoUrl}
            position={brandInjection.watermark.position}
            size={brandInjection.watermark.size}
            opacity={brandInjection.watermark.opacity}
          />
        </Sequence>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CTA OUTRO (last 4-5 seconds)                                    */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {brandInjection?.ctaOutro.enabled && (
        <Sequence
          from={ctaOutroStart}
          durationInFrames={ctaOutroDuration}
          name="CTAOutro"
        >
          <CTAOutro
            logoUrl={brandInjection.ctaOutro.logoUrl}
            headline={brandInjection.ctaOutro.headline}
            subheadline={brandInjection.ctaOutro.subheadline}
            website={brandInjection.ctaOutro.website}
            phone={brandInjection.ctaOutro.phone}
            backgroundColor={brandInjection.ctaOutro.backgroundColor}
            textColor={brandInjection.ctaOutro.textColor}
            animation={brandInjection.ctaOutro.animation}
          />
        </Sequence>
      )}

      {/* Background music */}
      {musicUrl && <Audio src={musicUrl} volume={0.3} />}
      
    </AbsoluteFill>
  );
};
```

---

## Verification

After implementation, check the console logs:

```
[Render] Step 3: Generating brand injection plan...
[BrandInjection] Resolving logo URLs...
[BrandInjection]   Intro logo: OK
[BrandInjection]   Watermark: OK
[BrandInjection]   Outro logo: OK
[Render] Brand injection plan:
[Render]   Logo intro: ENABLED
[Render]   Watermark: ENABLED
[Render]   CTA outro: ENABLED
```

---

## Success Criteria

- [ ] `brandInjectionService` called during render prep
- [ ] All logo URLs resolved to public URLs
- [ ] `LogoIntro.tsx` component created
- [ ] `CTAOutro.tsx` component created
- [ ] Logo intro appears in first 2-3 seconds of video
- [ ] Watermark visible in corner during middle scenes
- [ ] CTA outro shows at end with contact info

---

## Next Phase

Proceed to **Phase 18D: Sound Design Integration** once this is complete.
