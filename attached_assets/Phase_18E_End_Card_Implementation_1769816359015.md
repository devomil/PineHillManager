# Phase 18E: End Card Implementation

## Priority: MEDIUM
## Dependency: Phase 18C (Brand Injection)
## Estimated Time: 2-3 hours

---

## Problem

Videos end abruptly after the CTA. A professional end card with animated logo, tagline, and contact info is missing.

---

## Solution

Add `AnimatedEndCard` component that displays after the CTA outro with professional animations.

---

## Task 1: Define End Card Config Interface

Add to `shared/types/brand-injection.ts`:

```typescript
// shared/types/brand-injection.ts

export interface EndCardConfig {
  enabled: boolean;
  duration: number;  // Seconds (typically 4-5)
  
  background: {
    type: 'solid' | 'gradient' | 'animated-gradient';
    color?: string;
    gradientFrom?: string;
    gradientTo?: string;
  };
  
  logo: {
    url: string;           // Must be public URL
    size: number;          // Percentage of width
    animation: 'fade' | 'zoom' | 'bounce' | 'shine';
    delay: number;         // Seconds
  };
  
  tagline?: {
    text: string;
    fontSize: number;
    color: string;
    animation: 'fade' | 'slide-up' | 'typewriter';
    delay: number;
  };
  
  contact: {
    website?: string;
    phone?: string;
    email?: string;
    color: string;
    animation: 'fade' | 'slide-up' | 'stagger';
    delay: number;
  };
  
  social?: {
    icons: Array<'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok'>;
    color: string;
    size: number;
    animation: 'pop' | 'slide';
    delay: number;
  };
  
  ambientEffect?: {
    type: 'particles' | 'bokeh' | 'none';
    intensity: number;
    color: string;
  };
}
```

---

## Task 2: Update Universal Video Service

Add to `server/services/universal-video-service.ts`:

```typescript
// Add to prepareForRender() method:

async prepareForRender(projectId: number): Promise<RenderInput> {
  // ... existing code from 18A-18D ...

  // ═══════════════════════════════════════════════════════════════
  // PHASE 18E: Build end card configuration
  // ═══════════════════════════════════════════════════════════════
  console.log('[Render] Step 5: Building end card configuration...');
  const endCardConfig = await this.buildEndCardConfig(projectId, brandInjection);
  console.log(`[Render] End card: ${endCardConfig.enabled ? `ENABLED (${endCardConfig.duration}s)` : 'DISABLED'}`);

  // Build render input
  const renderInput: RenderInput = {
    projectId,
    scenes: resolvedScenes,
    musicUrl: project.musicUrl,
    overlays: Object.fromEntries(overlayConfigs),
    brandInjection,
    soundDesign,
    voiceoverRanges,
    soundEffectsBaseUrl,
    endCard: endCardConfig,  // NEW
  };

  return renderInput;
}

/**
 * Build end card configuration from brand settings
 */
private async buildEndCardConfig(
  projectId: number, 
  brandInjection: BrandInjectionPlan
): Promise<EndCardConfig> {
  // Get brand settings from project or use defaults
  const brandColors = brandInjection.colors;
  const logoUrl = brandInjection.logoIntro.logoUrl;  // Reuse resolved logo URL

  return {
    enabled: true,
    duration: 5,  // 5 seconds
    
    background: {
      type: 'gradient',
      gradientFrom: brandColors.primary,
      gradientTo: this.darkenColor(brandColors.primary, 20),
    },
    
    logo: {
      url: logoUrl,
      size: 25,
      animation: 'zoom',
      delay: 0.2,
    },
    
    tagline: {
      text: 'Health. Naturally.',  // Can be loaded from brand settings
      fontSize: 36,
      color: '#ffffff',
      animation: 'fade',
      delay: 0.8,
    },
    
    contact: {
      website: brandInjection.ctaOutro.website,
      phone: brandInjection.ctaOutro.phone,
      color: '#ffffff',
      animation: 'stagger',
      delay: 1.2,
    },
    
    social: {
      icons: ['facebook', 'instagram'],
      color: '#ffffff',
      size: 32,
      animation: 'pop',
      delay: 2.0,
    },
    
    ambientEffect: {
      type: 'bokeh',
      intensity: 0.3,
      color: brandColors.accent,
    },
  };
}

/**
 * Darken a hex color by percentage
 */
private darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max((num >> 16) - amt, 0);
  const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
  const B = Math.max((num & 0x0000FF) - amt, 0);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}
```

---

## Task 3: Create AnimatedEndCard Component

Create `remotion/components/endcard/AnimatedEndCard.tsx`:

```typescript
// remotion/components/endcard/AnimatedEndCard.tsx

import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { EndCardConfig } from '@shared/types/brand-injection';

interface AnimatedEndCardProps {
  config: EndCardConfig;
}

export const AnimatedEndCard: React.FC<AnimatedEndCardProps> = ({ config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation helpers
  const getOpacity = (delay: number, duration = 0.4) => {
    const startFrame = delay * fps;
    return interpolate(
      frame,
      [startFrame, startFrame + duration * fps],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  };

  const getScale = (delay: number) => {
    const startFrame = delay * fps;
    return spring({
      frame: frame - startFrame,
      fps,
      config: { damping: 12, stiffness: 100 },
    });
  };

  const getTranslateY = (delay: number, distance = 30) => {
    const startFrame = delay * fps;
    return interpolate(
      frame,
      [startFrame, startFrame + fps * 0.4],
      [distance, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  };

  // Background gradient
  const backgroundStyle: React.CSSProperties = config.background.type === 'gradient'
    ? {
        background: `linear-gradient(180deg, ${config.background.gradientFrom} 0%, ${config.background.gradientTo} 100%)`,
      }
    : {
        backgroundColor: config.background.color || '#000',
      };

  return (
    <AbsoluteFill style={backgroundStyle}>
      
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* AMBIENT EFFECT (Bokeh particles)                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {config.ambientEffect?.type === 'bokeh' && (
        <BokehEffect 
          color={config.ambientEffect.color} 
          intensity={config.ambientEffect.intensity}
        />
      )}

      {/* Main content container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 60,
          zIndex: 1,
        }}
      >
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* LOGO                                                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {config.logo.url && (
          <div
            style={{
              opacity: getOpacity(config.logo.delay),
              transform: config.logo.animation === 'zoom' 
                ? `scale(${getScale(config.logo.delay)})`
                : undefined,
              marginBottom: 30,
            }}
          >
            <Img
              src={config.logo.url}
              style={{
                width: `${config.logo.size}vw`,
                maxWidth: 400,
                height: 'auto',
                objectFit: 'contain',
              }}
            />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAGLINE                                                         */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {config.tagline && (
          <p
            style={{
              color: config.tagline.color,
              fontSize: config.tagline.fontSize,
              fontWeight: 300,
              letterSpacing: 2,
              textTransform: 'uppercase',
              margin: 0,
              marginBottom: 40,
              opacity: getOpacity(config.tagline.delay),
              transform: `translateY(${getTranslateY(config.tagline.delay)}px)`,
            }}
          >
            {config.tagline.text}
          </p>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CONTACT INFO                                                    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {config.contact.website && (
            <p
              style={{
                color: config.contact.color,
                fontSize: 32,
                margin: 0,
                opacity: getOpacity(config.contact.delay),
                transform: `translateY(${getTranslateY(config.contact.delay)}px)`,
              }}
            >
              {config.contact.website}
            </p>
          )}
          {config.contact.phone && (
            <p
              style={{
                color: config.contact.color,
                fontSize: 28,
                margin: 0,
                opacity: getOpacity(config.contact.delay + 0.2) * 0.8,
                transform: `translateY(${getTranslateY(config.contact.delay + 0.2)}px)`,
              }}
            >
              {config.contact.phone}
            </p>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SOCIAL ICONS                                                    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {config.social && config.social.icons.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 20,
              marginTop: 40,
            }}
          >
            {config.social.icons.map((icon, index) => (
              <SocialIcon
                key={icon}
                icon={icon}
                size={config.social!.size}
                color={config.social!.color}
                opacity={getOpacity(config.social!.delay + index * 0.1)}
                scale={config.social!.animation === 'pop' 
                  ? getScale(config.social!.delay + index * 0.1)
                  : 1
                }
              />
            ))}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// Bokeh effect component
const BokehEffect: React.FC<{ color: string; intensity: number }> = ({ color, intensity }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Generate random bokeh circles
  const circles = Array.from({ length: 15 }, (_, i) => ({
    x: (i * 37) % 100,
    y: (i * 53) % 100,
    size: 20 + (i % 5) * 15,
    speed: 0.3 + (i % 3) * 0.2,
  }));

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: intensity }}>
      {circles.map((circle, i) => {
        const y = (circle.y + (frame / fps) * circle.speed * 10) % 120 - 10;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${circle.x}%`,
              top: `${y}%`,
              width: circle.size,
              height: circle.size,
              borderRadius: '50%',
              backgroundColor: color,
              opacity: 0.3 + (i % 3) * 0.1,
              filter: 'blur(8px)',
            }}
          />
        );
      })}
    </div>
  );
};

// Social icon component
const SocialIcon: React.FC<{
  icon: string;
  size: number;
  color: string;
  opacity: number;
  scale: number;
}> = ({ icon, size, color, opacity, scale }) => {
  // Simple text placeholders - replace with actual SVG icons
  const iconMap: Record<string, string> = {
    facebook: 'f',
    instagram: '📷',
    twitter: '𝕏',
    linkedin: 'in',
    youtube: '▶',
    tiktok: '♪',
  };

  return (
    <div
      style={{
        width: size + 16,
        height: size + 16,
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <span style={{ color, fontSize: size * 0.6 }}>
        {iconMap[icon] || icon[0]}
      </span>
    </div>
  );
};
```

---

## Task 4: Update UniversalVideoComposition

Add to `remotion/UniversalVideoComposition.tsx`:

```typescript
// Add import
import { AnimatedEndCard } from './components/endcard/AnimatedEndCard';
import { EndCardConfig } from '@shared/types/brand-injection';

// Update props
interface UniversalVideoCompositionProps extends RenderInputProps {
  endCard?: EndCardConfig;
}

// Inside the component, after CTA outro:

{/* ═══════════════════════════════════════════════════════════════ */}
{/* END CARD (final 4-5 seconds)                                    */}
{/* ═══════════════════════════════════════════════════════════════ */}
{endCard?.enabled && (
  <Sequence
    from={durationInFrames - Math.round(endCard.duration * fps)}
    durationInFrames={Math.round(endCard.duration * fps)}
    name="EndCard"
  >
    <AnimatedEndCard config={endCard} />
  </Sequence>
)}
```

---

## Task 5: Update Total Duration Calculation

The video duration now needs to include the end card:

```typescript
// In the render service or composition registration

// Calculate total duration with brand elements
const calculateTotalDuration = (
  scenes: SceneData[],
  brandInjection: BrandInjectionPlan | null,
  endCard: EndCardConfig | null
): number => {
  // Base duration from scenes
  let totalSeconds = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  
  // Add logo intro
  if (brandInjection?.logoIntro.enabled) {
    totalSeconds += brandInjection.logoIntro.duration;
  }
  
  // Add CTA outro (already part of scene flow, not added separately)
  
  // Add end card
  if (endCard?.enabled) {
    totalSeconds += endCard.duration;
  }
  
  return totalSeconds;
};
```

---

## Verification

After implementation, check the console logs:

```
[Render] Step 5: Building end card configuration...
[Render] End card: ENABLED (5s)
```

Watch the rendered video and verify:
- End card appears after CTA
- Logo animates in with zoom effect
- Tagline fades in below logo
- Contact info slides up
- Social icons pop in one by one
- Bokeh particles float gently

---

## Success Criteria

- [ ] `AnimatedEndCard.tsx` created
- [ ] End card config generated from brand settings
- [ ] End card appears at video end
- [ ] Logo animation works (zoom/fade)
- [ ] Tagline displays correctly
- [ ] Contact info shows website/phone
- [ ] Social icons animate in
- [ ] Bokeh effect renders (optional)

---

## Next Phase

Proceed to **Phase 18F: Film Treatment Components** to add cinematic polish.
