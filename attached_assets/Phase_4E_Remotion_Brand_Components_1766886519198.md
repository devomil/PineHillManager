# Phase 4E: Remotion Brand Components

## Objective

Add React components to the Remotion composition that render brand overlays (intro logo animation, watermarks, CTA outro). These components use the brand instructions generated in Phase 4C.

## Prerequisites

- Phase 4A-4D complete
- `project.brandInstructions` populated with overlay data
- `scene.brandOverlays` populated for each scene
- Remotion composition rendering successfully

## What This Phase Creates

- Brand overlay components in `remotion/UniversalVideoComposition.tsx`
- Intro animation component
- Watermark overlay component
- CTA outro component

## What Success Looks Like

- First scene shows logo fade/zoom animation
- Middle scenes have corner watermark
- Last scene shows CTA with logo, headline, and website

---

## Step 1: Add Brand Overlay Interfaces

Add these interfaces to your Remotion composition file or a shared types file:

```tsx
// In remotion/UniversalVideoComposition.tsx (at the top)

interface BrandOverlay {
  type: 'logo' | 'watermark' | 'cta' | 'intro' | 'outro';
  assetUrl: string;
  position: {
    x: number;
    y: number;
    anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  };
  size: {
    width: number;
    maxHeight?: number;
  };
  animation: {
    type: 'fade' | 'slide' | 'zoom' | 'none';
    duration: number;
    delay?: number;
  };
  timing: {
    startTime: number;
    duration: number;
  };
  opacity: number;
}

interface CTAText {
  headline: string;
  subtext?: string;
  url: string;
}

interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  background: string;
}

interface ProjectBrandInstructions {
  introAnimation?: BrandOverlay;
  watermark?: BrandOverlay;
  outroSequence?: BrandOverlay[];
  colors: BrandColors;
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  callToAction: {
    text: string;
    subtext?: string;
    url: string;
  };
}
```

---

## Step 2: Create Brand Overlay Component

Add this component to render individual brand overlays:

```tsx
import { useCurrentFrame, interpolate, Img } from 'remotion';

interface BrandOverlayComponentProps {
  overlay: BrandOverlay;
  sceneDuration: number;
  fps: number;
}

const BrandOverlayComponent: React.FC<BrandOverlayComponentProps> = ({
  overlay,
  sceneDuration,
  fps,
}) => {
  const frame = useCurrentFrame();
  const startFrame = overlay.timing.startTime * fps;
  const animationFrames = overlay.animation.duration * fps;
  const delayFrames = (overlay.animation.delay || 0) * fps;
  const totalDuration = overlay.timing.duration === -1 
    ? sceneDuration * fps 
    : overlay.timing.duration * fps;
  
  // Don't render if before start time
  if (frame < startFrame) return null;
  
  // Don't render if after end time (unless duration is -1 for "entire scene")
  if (overlay.timing.duration !== -1 && frame > startFrame + totalDuration) return null;
  
  const adjustedFrame = frame - startFrame - delayFrames;
  
  // Calculate opacity based on animation
  let opacity = 0;
  if (adjustedFrame < 0) {
    opacity = 0;
  } else if (adjustedFrame < animationFrames) {
    // Fade in
    opacity = interpolate(
      adjustedFrame,
      [0, animationFrames],
      [0, overlay.opacity],
      { extrapolateRight: 'clamp' }
    );
  } else if (overlay.timing.duration !== -1 && adjustedFrame > totalDuration - animationFrames) {
    // Fade out
    const fadeOutFrame = adjustedFrame - (totalDuration - animationFrames);
    opacity = interpolate(
      fadeOutFrame,
      [0, animationFrames],
      [overlay.opacity, 0],
      { extrapolateRight: 'clamp' }
    );
  } else {
    opacity = overlay.opacity;
  }
  
  // Calculate scale for zoom animation
  let scale = 1;
  if (overlay.animation.type === 'zoom' && adjustedFrame >= 0 && adjustedFrame < animationFrames) {
    scale = interpolate(
      adjustedFrame,
      [0, animationFrames],
      [0.7, 1],
      { extrapolateRight: 'clamp' }
    );
  }
  
  // Calculate slide offset
  let translateY = 0;
  if (overlay.animation.type === 'slide' && adjustedFrame >= 0 && adjustedFrame < animationFrames) {
    translateY = interpolate(
      adjustedFrame,
      [0, animationFrames],
      [50, 0],
      { extrapolateRight: 'clamp' }
    );
  }
  
  // Position calculation based on anchor
  const getPositionStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      position: 'absolute',
    };
    const { x, y, anchor } = overlay.position;
    
    if (anchor === 'center') {
      style.left = '50%';
      style.top = '50%';
      style.transform = `translate(-50%, -50%) scale(${scale}) translateY(${translateY}px)`;
    } else {
      if (anchor.includes('left')) {
        style.left = `${x}%`;
      } else if (anchor.includes('right')) {
        style.right = `${100 - x}%`;
      }
      
      if (anchor.includes('top')) {
        style.top = `${y}%`;
      } else if (anchor.includes('bottom')) {
        style.bottom = `${100 - y}%`;
      }
      
      style.transform = `scale(${scale}) translateY(${translateY}px)`;
    }
    
    return style;
  };
  
  return (
    <div
      style={{
        ...getPositionStyle(),
        opacity,
        width: `${overlay.size.width}%`,
        maxHeight: overlay.size.maxHeight ? `${overlay.size.maxHeight}%` : undefined,
        zIndex: overlay.type === 'watermark' ? 10 : 20,
      }}
    >
      <Img
        src={overlay.assetUrl}
        style={{
          width: '100%',
          height: 'auto',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};
```

---

## Step 3: Create Intro Animation Component

```tsx
import { Sequence } from 'remotion';

interface IntroAnimationProps {
  overlay: BrandOverlay;
  fps: number;
}

const IntroAnimation: React.FC<IntroAnimationProps> = ({ overlay, fps }) => {
  const durationFrames = Math.ceil(overlay.timing.duration * fps);
  
  return (
    <Sequence from={0} durationInFrames={durationFrames}>
      <BrandOverlayComponent
        overlay={overlay}
        sceneDuration={overlay.timing.duration}
        fps={fps}
      />
    </Sequence>
  );
};
```

---

## Step 4: Create CTA Outro Component

```tsx
interface CTAOutroProps {
  logo: BrandOverlay;
  ctaText: CTAText;
  colors: BrandColors;
  sceneDuration: number;
  fps: number;
}

const CTAOutro: React.FC<CTAOutroProps> = ({
  logo,
  ctaText,
  colors,
  sceneDuration,
  fps,
}) => {
  const frame = useCurrentFrame();
  const ctaStartTime = Math.max(0, sceneDuration - 4);  // Start 4 seconds before end
  const startFrame = ctaStartTime * fps;
  
  // Don't render before CTA start time
  if (frame < startFrame) return null;
  
  const adjustedFrame = frame - startFrame;
  const fadeInFrames = 0.8 * fps;
  
  // Fade in the entire CTA
  const fadeIn = interpolate(
    adjustedFrame,
    [0, fadeInFrames],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Stagger the elements
  const logoOpacity = interpolate(
    adjustedFrame,
    [0, fadeInFrames],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  const headlineOpacity = interpolate(
    adjustedFrame,
    [fadeInFrames * 0.3, fadeInFrames * 1.2],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  const subtextOpacity = interpolate(
    adjustedFrame,
    [fadeInFrames * 0.5, fadeInFrames * 1.4],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  const urlOpacity = interpolate(
    adjustedFrame,
    [fadeInFrames * 0.7, fadeInFrames * 1.6],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `rgba(0, 0, 0, ${fadeIn * 0.75})`,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          marginBottom: '2rem',
          opacity: logoOpacity,
          width: '200px',
        }}
      >
        <Img
          src={logo.assetUrl}
          style={{
            width: '100%',
            height: 'auto',
            objectFit: 'contain',
          }}
        />
      </div>
      
      {/* Headline */}
      <h2
        style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: colors.text,
          textAlign: 'center',
          marginBottom: '0.75rem',
          textShadow: '2px 2px 8px rgba(0,0,0,0.5)',
          opacity: headlineOpacity,
          maxWidth: '80%',
          lineHeight: 1.2,
        }}
      >
        {ctaText.headline}
      </h2>
      
      {/* Subtext */}
      {ctaText.subtext && (
        <p
          style={{
            fontSize: '24px',
            color: colors.text,
            marginBottom: '1.5rem',
            textShadow: '1px 1px 4px rgba(0,0,0,0.5)',
            opacity: subtextOpacity,
          }}
        >
          {ctaText.subtext}
        </p>
      )}
      
      {/* Website URL */}
      <div
        style={{
          padding: '14px 36px',
          backgroundColor: colors.primary,
          borderRadius: '8px',
          fontSize: '28px',
          fontWeight: 'bold',
          color: colors.text,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          opacity: urlOpacity,
        }}
      >
        {ctaText.url}
      </div>
    </div>
  );
};
```

---

## Step 5: Create Watermark Component

```tsx
interface WatermarkProps {
  overlay: BrandOverlay;
  sceneDuration: number;
  fps: number;
}

const Watermark: React.FC<WatermarkProps> = ({ overlay, sceneDuration, fps }) => {
  return (
    <BrandOverlayComponent
      overlay={{
        ...overlay,
        timing: {
          ...overlay.timing,
          duration: -1,  // Show for entire scene
        },
      }}
      sceneDuration={sceneDuration}
      fps={fps}
    />
  );
};
```

---

## Step 6: Integrate into Main Composition

Update your main composition to use the brand components:

```tsx
interface CompositionProps {
  project: {
    scenes: Array<{
      id: string;
      type: string;
      duration: number;
      // ... other scene properties
      brandOverlays?: {
        sceneId: string;
        overlays: BrandOverlay[];
        ctaText?: CTAText;
      };
    }>;
    brandInstructions?: ProjectBrandInstructions;
    // ... other project properties
  };
}

const UniversalVideoComposition: React.FC<CompositionProps> = ({ project }) => {
  const fps = 30;
  const brandInstructions = project.brandInstructions;
  
  // Calculate scene start frames
  const getSceneStartFrame = (index: number): number => {
    let startFrame = 0;
    for (let i = 0; i < index; i++) {
      startFrame += project.scenes[i].duration * fps;
    }
    return startFrame;
  };
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {project.scenes.map((scene, index) => {
        const sceneStartFrame = getSceneStartFrame(index);
        const sceneDurationFrames = scene.duration * fps;
        const isFirstScene = index === 0;
        const isLastScene = index === project.scenes.length - 1;
        
        return (
          <Sequence
            key={scene.id}
            from={sceneStartFrame}
            durationInFrames={sceneDurationFrames}
          >
            <AbsoluteFill>
              {/* EXISTING SCENE CONTENT - video, text overlays, etc. */}
              {renderSceneContent(scene)}
              
              {/* BRAND OVERLAYS */}
              
              {/* Intro animation on first scene */}
              {isFirstScene && brandInstructions?.introAnimation && (
                <IntroAnimation
                  overlay={brandInstructions.introAnimation}
                  fps={fps}
                />
              )}
              
              {/* Watermark on middle scenes (not first, not last) */}
              {!isFirstScene && !isLastScene && brandInstructions?.watermark && (
                <Watermark
                  overlay={brandInstructions.watermark}
                  sceneDuration={scene.duration}
                  fps={fps}
                />
              )}
              
              {/* CTA outro on last scene */}
              {isLastScene && 
               brandInstructions?.outroSequence?.[0] && 
               scene.brandOverlays?.ctaText && (
                <CTAOutro
                  logo={brandInstructions.outroSequence[0]}
                  ctaText={scene.brandOverlays.ctaText}
                  colors={brandInstructions.colors}
                  sceneDuration={scene.duration}
                  fps={fps}
                />
              )}
              
              {/* Scene-specific brand overlays (e.g., product images) */}
              {scene.brandOverlays?.overlays.map((overlay, overlayIndex) => (
                <BrandOverlayComponent
                  key={`overlay-${overlayIndex}`}
                  overlay={overlay}
                  sceneDuration={scene.duration}
                  fps={fps}
                />
              ))}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

---

## Verification Checklist

Before moving to Phase 4F, confirm:

- [ ] All brand overlay interfaces defined
- [ ] `BrandOverlayComponent` renders with correct positioning
- [ ] `IntroAnimation` shows logo with zoom/fade animation
- [ ] `Watermark` appears in correct corner with correct opacity
- [ ] `CTAOutro` shows logo, headline, subtext, and URL
- [ ] First scene shows intro animation
- [ ] Middle scenes show watermark
- [ ] Last scene shows CTA outro
- [ ] Animations are smooth (fade, zoom, slide)
- [ ] Z-index layering is correct (CTA on top)

---

## Visual Testing Guide

### First Scene (Hook)
```
┌─────────────────────────────────────┐
│                                     │
│         [LOGO ANIMATION]            │  <- Fades/zooms in center
│             (3 sec)                 │
│                                     │
│    [Scene video content below]      │
│                                     │
└─────────────────────────────────────┘
```

### Middle Scenes
```
┌─────────────────────────────────────┐
│                                     │
│    [Scene video content]            │
│                                     │
│                                     │
│                          [LOGO]     │  <- Watermark, 70% opacity
└─────────────────────────────────────┘
```

### Last Scene (CTA)
```
┌─────────────────────────────────────┐
│                                     │
│            [LOGO]                   │
│                                     │
│   "Start Your Wellness Journey"     │
│   "Natural solutions for health"    │
│                                     │
│      [ PineHillFarm.com ]           │  <- Green button
│                                     │
└─────────────────────────────────────┘
```

---

## Troubleshooting

### "Logo not appearing"
- Check `brandInstructions.introAnimation` exists
- Verify `assetUrl` is a valid URL
- Check z-index isn't behind scene content

### "Watermark in wrong position"
- Check `position.anchor` value
- Verify coordinate calculation in `getPositionStyle()`

### "CTA not showing on last scene"
- Verify `isLastScene` is `true` for the final scene
- Check `ctaText` exists in `scene.brandOverlays`
- Verify `outroSequence` array has at least one item

### "Animations are choppy"
- Ensure `fps` value is consistent (30)
- Check `interpolate` extrapolation settings

---

## Next Phase

Once Remotion brand components are working, proceed to **Phase 4F: Brand Quality Checks** to add AI text detection and brand compliance scoring.
