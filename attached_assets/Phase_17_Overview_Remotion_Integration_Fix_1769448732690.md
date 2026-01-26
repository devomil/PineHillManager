# Phase 17: Remotion Integration Fix

## Executive Summary

The Replit agent has built extensive Remotion components for overlays, brand assets, sound effects, and animations across Phases 8-16. However, **these components are not connected to the actual rendering pipeline**. Videos render as raw AI-generated clips without:

- Logo intro/watermark/CTA outro
- Text overlays
- Sound effects and transitions
- Professional graphics and animations
- Brand asset placement

Additionally, **asset URLs fail to load** because they point to the local Replit dev server, which Remotion Lambda cannot access.

---

## Root Cause Analysis

### Problem 1: Asset URL Resolution Failure

```
Error: Error loading image with src: https://58265a68-cbcc-4b55-91b2-58806c585b51-00-395r5svtpwqde.picard.replit.dev/assets/pine-hill-farm-logo.png
```

**Why it happens:**
- Brand assets stored with relative URLs like `/api/brand-assets/file/123`
- Server resolves these to Replit dev URLs (`*.picard.replit.dev`)
- Remotion Lambda runs in AWS - cannot access Replit's internal network
- Images fail to load, causing blank spaces or errors

**Solution:** Convert all asset URLs to publicly accessible cloud storage URLs (GCS, S3, or PiAPI ephemeral storage).

### Problem 2: Overlay Configuration Not Passed to Remotion

The render pipeline calls Remotion with scene data but **never includes overlay configurations**:

```typescript
// CURRENT (broken) - no overlays
const renderInput = {
  scenes: sceneData,
  musicUrl: project.musicUrl,
  // Missing: overlays, brandInjection, soundDesign
};

// REQUIRED (working) - with overlays
const renderInput = {
  scenes: sceneData,
  musicUrl: project.musicUrl,
  overlays: overlayConfigs,        // Per-scene overlay configs
  brandInjection: brandPlan,       // Logo intro, watermark, CTA
  soundDesign: soundConfig,        // Transition sounds, ambient
  endCard: endCardConfig,          // Animated end card
};
```

### Problem 3: UniversalVideoComposition Not Rendering Overlays

The Remotion composition receives data but doesn't render overlay components:

```tsx
// CURRENT (broken)
export const UniversalVideoComposition = ({ scenes, musicUrl }) => {
  return (
    <AbsoluteFill>
      {scenes.map(scene => <SceneVideo ... />)}
      {musicUrl && <Audio src={musicUrl} />}
      {/* Missing: overlays, watermark, end card, sound effects */}
    </AbsoluteFill>
  );
};
```

---

## Phase 17 Sub-Phases

### Phase 17A: Public Asset URL Resolution
**Priority: CRITICAL (blocks everything else)**
- Create `assetUrlResolver` service
- Convert relative URLs to public GCS URLs
- Cache resolved URLs to avoid repeated lookups
- Add fallback to PiAPI ephemeral storage upload

### Phase 17B: Overlay Pipeline Connection
**Priority: HIGH**
- Call `overlayConfigurationService` during render preparation
- Pass overlay configs to Remotion inputProps
- Update `UniversalVideoComposition` to receive and render overlays

### Phase 17C: Brand Injection Integration
**Priority: HIGH**
- Wire `brandInjectionService` to render pipeline
- Add LogoIntro sequence to first scene
- Add Watermark layer to middle scenes
- Add CTA overlay to last scene

### Phase 17D: Sound Design Integration
**Priority: MEDIUM**
- Add `SoundDesignLayer` component to composition
- Wire transition sounds to scene boundaries
- Implement audio ducking for voiceover
- Add ambient layer support

### Phase 17E: End Card Implementation
**Priority: MEDIUM**
- Add `AnimatedEndCard` sequence after last scene
- Configure end card timing and duration
- Wire brand contact info to end card props

---

## Files Requiring Changes

```
server/services/
├── asset-url-resolver.ts          # 17A - NEW: Resolve URLs to public
├── universal-video-service.ts     # 17B - Add overlay configs
├── brand-injection-service.ts     # 17C - Verify connected
├── overlay-configuration-service.ts # 17B - Verify called
└── render-pipeline-service.ts     # 17B-E - Orchestrate all

remotion/
├── UniversalVideoComposition.tsx  # 17B-E - Add overlay rendering
├── components/
│   ├── overlays/                  # 17B - Verify components work
│   │   ├── TextOverlay.tsx
│   │   ├── LogoOverlay.tsx
│   │   ├── WatermarkOverlay.tsx
│   │   └── CTAOverlay.tsx
│   ├── audio/                     # 17D - Sound components
│   │   ├── SoundDesignLayer.tsx
│   │   └── DuckedMusic.tsx
│   └── endcard/                   # 17E - End card
│       └── AnimatedEndCard.tsx

server/routes/
└── universal-video-routes.ts      # 17A - URL resolution
```

---

## Expected Results After Phase 17

### Before (Current):
```
Scene 1: Raw AI video, no logo
Scene 2: Raw AI video, no watermark
Scene 3: Raw AI video, no overlays
CTA Scene: Raw video, no branding, ends abruptly
Audio: Just voiceover and music, no SFX
```

### After (Phase 17):
```
Scene 1: Logo intro (2.5s), then video
Scene 2: Video with watermark (bottom-right)
Scene 3: Video with text overlay, watermark
CTA Scene: Video → Logo → CTA text → End card (5s)
Audio: Voiceover + music + transition SFX + ambient
```

---

## Implementation Order

1. **Phase 17A** (CRITICAL) - Without public URLs, nothing loads
2. **Phase 17B** (HIGH) - Connect overlay pipeline
3. **Phase 17C** (HIGH) - Brand injection 
4. **Phase 17D** (MEDIUM) - Sound design
5. **Phase 17E** (MEDIUM) - End card

---

## Success Criteria

Phase 17 is complete when:

- [ ] No "Error loading image" messages in Remotion logs
- [ ] All asset URLs resolve to public cloud storage URLs
- [ ] First scene shows logo intro animation
- [ ] Middle scenes have watermark in corner
- [ ] CTA scene shows logo + headline + website
- [ ] End card displays after CTA
- [ ] Transition sounds play between scenes
- [ ] Music ducks under voiceover

---

## Diagnostic Commands

Add to render pipeline to verify services are called:

```typescript
console.log('[Render] ====== PHASE 17 DIAGNOSTICS ======');
console.log('[Render] Overlay configs generated:', overlayConfigs.size);
console.log('[Render] Brand injection plan:', JSON.stringify(brandPlan, null, 2));
console.log('[Render] Sound design enabled:', soundConfig.enabled);
console.log('[Render] End card enabled:', endCard.enabled);
console.log('[Render] ===================================');
```

---

## Begin Implementation

Start with **Phase_17A_Public_Asset_URL_Resolution.md** - this unblocks everything else.
