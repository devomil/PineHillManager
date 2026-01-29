# Phase 18 Quick Reference

## The Two Problems Being Solved

| Problem | Root Cause | Phase Fix |
|---------|------------|-----------|
| Assets fail to load | Replit dev URLs unreachable from Lambda | 18A |
| No overlays render | Services exist but not wired | 18B |
| No brand elements | brandInjectionService not called | 18B |
| No sound design | SoundDesignLayer not added | 18C |
| No end card | AnimatedEndCard not added | 18D |
| Flat/digital look | No film treatment applied | 18E |
| Basic transitions | Premium transitions not used | 18G |
| Node.js 20 warning | Lambda needs upgrade to 22.x | 18I |

---

## Implementation Order (Strict Sequence)

```
WEEK 1: Fix the Plumbing
├── 18A: Asset URL Resolution      [CRITICAL - Do First]
├── 18B: Overlay Pipeline Wiring   [HIGH]
├── 18C: Sound Design Layer        [MEDIUM]
└── 18D: End Card Component        [MEDIUM]

WEEK 2: Add the Polish
├── 18E: Film Treatment            [HIGH]
├── 18F: Broadcast Composition     [HIGH]
├── 18G: Premium Transitions       [LOW - Optional]
├── 18H: (merged into 18F)
├── 18I: Node.js 22 Upgrade        [HIGH]
└── 18J: Final Deployment          [HIGH]
```

---

## Key Files by Phase

### 18A: Asset URL Resolution
```
NEW:    server/services/asset-url-resolver.ts
NEW:    server/utils/url-validation.ts
UPDATE: server/services/index.ts (export)
```

### 18B: Overlay Pipeline Wiring
```
UPDATE: server/services/universal-video-service.ts
NEW:    shared/types/overlay-config.ts
NEW:    shared/types/brand-injection.ts
NEW:    remotion/components/brand/LogoIntro.tsx
NEW:    remotion/components/brand/CTAOutro.tsx
UPDATE: remotion/UniversalVideoComposition.tsx
```

### 18C: Sound Design Layer
```
NEW:    shared/types/sound-design.ts
NEW:    remotion/components/audio/SoundDesignLayer.tsx
NEW:    remotion/components/audio/DuckedMusic.tsx
UPDATE: remotion/UniversalVideoComposition.tsx
```

### 18D: End Card Component
```
NEW:    remotion/components/endcard/AnimatedEndCard.tsx
UPDATE: remotion/UniversalVideoComposition.tsx
```

### 18E: Film Treatment Components
```
NEW:    remotion/components/post-processing/ColorGrading.tsx
NEW:    remotion/components/post-processing/FilmGrain.tsx
NEW:    remotion/components/post-processing/Vignette.tsx
NEW:    remotion/components/post-processing/FilmTreatment.tsx
NEW:    remotion/components/post-processing/index.ts
```

### 18F: Broadcast Composition
```
NEW:    remotion/BroadcastVideoComposition.tsx
UPDATE: remotion/index.ts (register composition)
UPDATE: server/services/remotion-render-service.ts
```

### 18G: Premium Transitions (Optional)
```
NEW:    remotion/components/transitions/LightLeak.tsx
NEW:    remotion/components/transitions/FilmBurn.tsx
NEW:    remotion/components/transitions/WhipPan.tsx
NEW:    remotion/components/transitions/TransitionManager.tsx
```

### 18I: Node.js 22 Upgrade
```
DEPLOY: Lambda with --runtime nodejs22.x
UPDATE: Replit Secrets (REMOTION_FUNCTION_NAME)
DEPLOY: Remotion site bundle
```

### 18J: Final Deployment
```
CREATE: S3 bucket with CORS
UPLOAD: Sound effects to S3
TEST:   Full render pipeline
```

---

## Diagnostic Logging Pattern

Add to `prepareForRender()`:

```typescript
console.log('[Render] ═══════════════════════════════════════════');
console.log('[Render] Phase 18 Render Pipeline');
console.log('[Render] ═══════════════════════════════════════════');
console.log('[Render] Step 1: Asset URL resolution...');
console.log('[Render] Step 2: Overlay configuration...');
console.log(`[Render]   Overlays: ${overlayConfigs.size} scenes`);
console.log('[Render] Step 3: Brand injection...');
console.log(`[Render]   Logo intro: ${brandPlan.logoIntro.enabled}`);
console.log(`[Render]   Watermark: ${brandPlan.watermark.enabled}`);
console.log(`[Render]   CTA outro: ${brandPlan.ctaOutro.enabled}`);
console.log('[Render] Step 4: Sound design...');
console.log(`[Render]   Enabled: ${soundConfig.enabled}`);
console.log('[Render] Step 5: End card...');
console.log(`[Render]   Enabled: ${endCard.enabled}`);
console.log('[Render] Step 6: Film treatment...');
console.log(`[Render]   Color grade: ${filmTreatment.colorGrade}`);
console.log('[Render] ═══════════════════════════════════════════');
```

---

## URL Resolution Pattern

```typescript
// BEFORE (broken)
const logoUrl = '/api/brand-assets/file/123';
// Becomes: https://xxx.picard.replit.dev/api/...
// Lambda CANNOT access this!

// AFTER (fixed)
const logoUrl = await assetUrlResolver.resolve('/api/brand-assets/file/123');
// Becomes: https://storage.googleapis.com/bucket/path/logo.png
// Lambda CAN access this!
```

---

## Visual Style → Film Treatment Mapping

| Visual Style | Color Grade | Grain | Vignette |
|--------------|-------------|-------|----------|
| Hero (Cinematic) | warm-cinematic | 4% | 25% |
| Lifestyle | natural-organic | 3% | 15% |
| Product Showcase | cool-corporate | 2% | 10% |
| Educational | natural-organic | 2% | 10% |
| Social (Energetic) | vibrant-lifestyle | 1% | 5% |
| Premium | luxury-elegant | 3% | 30% |

---

## Lambda Deploy Commands

```bash
# Deploy Lambda with Node.js 22
npx remotion lambda functions deploy \
  --region us-east-2 \
  --memory 10240 \
  --timeout 900 \
  --disk 10240 \
  --architecture arm64 \
  --runtime nodejs22.x

# Deploy Remotion site bundle
npx remotion lambda sites create \
  --site-name pinehillfarm-video \
  --region us-east-2

# Verify deployment
npx remotion lambda functions ls --region us-east-2
```

---

## Success Checklist

### Foundation (18A-18D):
- [ ] No "Error loading image" in logs
- [ ] Logo intro appears (first 2-3s)
- [ ] Watermark visible in corner
- [ ] CTA shows website/phone
- [ ] End card animates in
- [ ] Transition sounds play
- [ ] Music ducks under voiceover

### Polish (18E-18J):
- [ ] Color grading applied
- [ ] Film grain visible (subtle)
- [ ] Vignette darkens edges
- [ ] Lambda shows nodejs22.x
- [ ] Render completes < 10 min
- [ ] Video URL is public

---

## Before vs After Phase 18

### BEFORE:
```
Raw AI clips → hard cuts → no branding → abrupt end
Flat colors → no texture → digital feel
Node.js 20.x → deprecation warning
```

### AFTER:
```
Logo intro → smooth transitions → watermark → CTA → end card
Cinematic colors → film grain → vignette → premium feel
Node.js 22.x → future-proof
```
