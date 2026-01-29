# Phase 18: Master Render Pipeline

## Executive Summary

Phase 18 combines the critical fixes from Phase 17 (service wiring) with the AWS Remotion infrastructure upgrades (cinematic quality) into a single, properly sequenced implementation plan.

**Current State:** Videos render as raw AI clips without branding, overlays, or professional polish.

**Target State:** Broadcast-quality videos with logo intros, watermarks, sound design, film treatment, and animated end cards.

---

## The Two-Part Problem

### Part 1: Broken Connections (Phase 17 Issues)
- Asset URLs fail (Replit dev URLs unreachable from Lambda)
- Overlay services exist but aren't called
- Brand injection services exist but aren't wired
- Remotion never receives overlay/brand props

### Part 2: Missing Polish (AWS Remotion Issues)
- No cinematic color grading
- No film grain texture
- No vignette effect
- Node.js 20.x deprecation warning
- Basic transitions instead of premium effects

---

## Implementation Order

```
WEEK 1: FIX THE PLUMBING
┌─────────────────────────────────────────┐
│ 18A: Asset URL Resolution    [CRITICAL] │
│      Without this, nothing loads        │
├─────────────────────────────────────────┤
│ 18B: Overlay Pipeline Wiring [HIGH]     │
│      Connect overlay + brand services   │
├─────────────────────────────────────────┤
│ 18C: Sound Design Layer      [MEDIUM]   │
│      Transition sounds + audio ducking  │
├─────────────────────────────────────────┤
│ 18D: End Card Component      [MEDIUM]   │
│      Animated end card after CTA        │
└─────────────────────────────────────────┘

WEEK 2: ADD THE POLISH
┌─────────────────────────────────────────┐
│ 18E: Film Treatment Components [HIGH]   │
│      Color grading, grain, vignette     │
├─────────────────────────────────────────┤
│ 18F: Broadcast Composition     [HIGH]   │
│      Wrapper with film treatment        │
├─────────────────────────────────────────┤
│ 18G: Lambda Upgrade & Deploy   [HIGH]   │
│      Node.js 22 + final deployment      │
└─────────────────────────────────────────┘
```

---

## Sub-Phase Summary

| Phase | Focus | Key Deliverable | Est. Time |
|-------|-------|-----------------|-----------|
| **18A** | Asset URLs | `assetUrlResolver.ts` service | 2-3 hours |
| **18B** | Service Wiring | Connected overlay + brand pipeline | 3-4 hours |
| **18C** | Sound Design | `SoundDesignLayer.tsx` component | 2-3 hours |
| **18D** | End Card | `AnimatedEndCard.tsx` component | 2-3 hours |
| **18E** | Film Treatment | Color grading + grain + vignette | 3-4 hours |
| **18F** | Composition | `BroadcastVideoComposition.tsx` | 2-3 hours |
| **18G** | Deployment | Node.js 22 Lambda + site deploy | 2-3 hours |

**Total Estimated Time: 16-23 hours across 7 focused sessions**

---

## Architecture After Phase 18

```
┌─────────────────────────────────────────────────────────────┐
│                    REPLIT APPLICATION                        │
│                                                              │
│  prepareForRender()                                          │
│       │                                                      │
│       ├─→ assetUrlResolver.resolveAll()     [18A]           │
│       │      Convert /api/... → https://storage.google...    │
│       │                                                      │
│       ├─→ overlayConfigurationService()     [18B]           │
│       │      Generate per-scene overlay configs              │
│       │                                                      │
│       ├─→ brandInjectionService()           [18B]           │
│       │      Create logo intro/watermark/CTA plan            │
│       │                                                      │
│       ├─→ buildSoundDesignConfig()          [18C]           │
│       │      Transition sounds + ducking config              │
│       │                                                      │
│       └─→ buildEndCardConfig()              [18D]           │
│              End card timing + content                       │
│                                                              │
│  renderInput = {                                             │
│    scenes,                                                   │
│    overlays,        ← NEW                                    │
│    brandInjection,  ← NEW                                    │
│    soundDesign,     ← NEW                                    │
│    endCard,         ← NEW                                    │
│    filmTreatment,   ← NEW                                    │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              AWS REMOTION LAMBDA (Node.js 22)                │
│                                                              │
│  BroadcastVideoComposition                    [18F]         │
│       │                                                      │
│       └─→ FilmTreatment                       [18E]         │
│              │  ├─ ColorGrading (warm-cinematic)            │
│              │  ├─ FilmGrain (4% organic)                   │
│              │  └─ Vignette (20% edges)                     │
│              │                                               │
│              └─→ UniversalVideoComposition                  │
│                     ├─ LogoIntro          [18B]             │
│                     ├─ SceneVideos + Overlays               │
│                     ├─ Watermark          [18B]             │
│                     ├─ SoundDesignLayer   [18C]             │
│                     ├─ DuckedMusic        [18C]             │
│                     └─ AnimatedEndCard    [18D]             │
└─────────────────────────────────────────────────────────────┘
```

---

## Success Criteria

Phase 18 is complete when rendered videos show:

### Week 1 Checkpoint (After 18A-18D):
- [ ] No "Error loading image" in logs
- [ ] Logo intro appears (first 2-3 seconds)
- [ ] Watermark visible in corner
- [ ] CTA overlay on last scene
- [ ] Transition sounds play
- [ ] Music ducks under voiceover
- [ ] Animated end card displays

### Week 2 Checkpoint (After 18E-18G):
- [ ] Cinematic color grading visible
- [ ] Subtle film grain texture
- [ ] Vignette focusing to center
- [ ] Lambda running Node.js 22.x
- [ ] No deprecation warnings
- [ ] Renders complete in < 10 minutes

---

## Current Infrastructure Reference

| Component | Current Value |
|-----------|---------------|
| Region | us-east-2 |
| API Gateway | https://q9hx7kml08.execute-api.us-east-2.amazonaws.com |
| Lambda | remotion-render-4-0-410-mem3008mb-disk10240mb-900sec |
| Remotion Version | 4.0.410 |
| Node.js | 20.x (to be upgraded to 22.x) |
| S3 Bucket | TBD (create in 18G) |

---

## Begin Implementation

Start with **Phase_18A_Asset_URL_Resolution.md** - this is the critical blocker that must be completed first.

---

## File Index

1. `Phase_18_Overview_Master_Render_Pipeline.md` (this file)
2. `Phase_18A_Asset_URL_Resolution.md`
3. `Phase_18B_Overlay_Pipeline_Wiring.md`
4. `Phase_18C_Sound_Design_Layer.md`
5. `Phase_18D_End_Card_Component.md`
6. `Phase_18E_Film_Treatment_Components.md`
7. `Phase_18F_Broadcast_Composition.md`
8. `Phase_18G_Lambda_Upgrade_Deploy.md`
9. `Phase_18_Quick_Reference.md`
