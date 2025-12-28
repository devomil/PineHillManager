# Phase 4: Brand Bible Integration - Master Overview

## Purpose

Phase 4 connects the existing Brand Media Library to the video generation pipeline, solving three critical issues discovered in testing:

| Issue | Example from Test Video | Root Cause |
|-------|------------------------|------------|
| Content mismatch | "FINANCE", "1102 Monthly System Review" appearing in wellness video | AI generated random content without brand context |
| AI text hallucination | "peocineate", "weth meal", "alinndeaifel" | AI video models rendered text inside video instead of clean footage |
| Fake UI elements | "Noney", "Fioliday", "5idups", calendars | AI hallucinated UI components that don't exist |

## What Phase 4 Delivers

1. **Brand-aware AI prompts** - Every video/image generation includes Pine Hill Farm brand context
2. **Anti-hallucination protection** - Mandatory negative prompts prevent AI from generating text/UI
3. **Automatic brand injection** - Logos, watermarks, and CTAs inserted automatically
4. **Brand compliance checking** - Quality evaluation detects AI text and off-brand content

## Prerequisites

Before starting Phase 4, verify:

- [ ] Phases 1A-1E complete (AI video, sound, music, images working)
- [ ] Phases 2A-2C complete (scene analysis, text placement, transitions working)
- [ ] Phase 3 complete (quality evaluation working)
- [ ] Brand Media Library has assets uploaded (`/api/brand-media-library` returns data)
- [ ] Database table `brand_media_library` exists and has records

## Sub-Phase Structure

Complete each sub-phase fully before moving to the next:

```
Phase 4A: Brand Bible Service
    ↓ (creates brandBibleService)
Phase 4B: Prompt Enhancement  
    ↓ (creates promptEnhancementService, uses brandBibleService)
Phase 4C: Brand Asset Injection
    ↓ (creates brandInjectionService, uses brandBibleService)
Phase 4D: Pipeline Integration
    ↓ (updates ai-video, runway, piapi, universal-video services)
Phase 4E: Remotion Brand Components
    ↓ (adds brand overlay components to composition)
Phase 4F: Brand Quality Checks
    ↓ (updates quality evaluation for brand compliance)
```

## Files Created by Phase 4

```
server/services/
├── brand-bible-service.ts         # 4A - Load and cache brand assets
├── prompt-enhancement-service.ts  # 4B - Enhance prompts, add negative prompts
└── brand-injection-service.ts     # 4C - Generate brand overlay instructions

server/services/ (modified)
├── ai-video-service.ts            # 4D - Use enhanced prompts
├── runway-video-service.ts        # 4D - Pass negative prompts
├── piapi-video-service.ts         # 4D - Pass negative prompts
├── universal-video-service.ts     # 4D - Load brand bible, generate instructions
└── quality-evaluation-service.ts  # 4F - Brand compliance checks

remotion/
└── UniversalVideoComposition.tsx  # 4E - Brand overlay components
```

## Existing Infrastructure Used

Phase 4 connects to infrastructure that already exists:

| Component | Location | Status |
|-----------|----------|--------|
| Brand Media Library API | `/api/brand-media-library` | ✅ Exists |
| Database table | `brand_media_library` | ✅ Exists |
| Asset upload | `/api/brand-media-library/upload` | ✅ Exists |
| Frontend UI | Asset Library → Brand Media tab | ✅ Exists |

## Implementation Order

1. **Read Phase_4A** → Implement → Verify checklist → Commit
2. **Read Phase_4B** → Implement → Verify checklist → Commit
3. **Read Phase_4C** → Implement → Verify checklist → Commit
4. **Read Phase_4D** → Implement → Verify checklist → Commit
5. **Read Phase_4E** → Implement → Verify checklist → Commit
6. **Read Phase_4F** → Implement → Verify checklist → Commit

## Success Criteria

Phase 4 is complete when:

- [ ] Brand bible loads from database with caching
- [ ] All AI video prompts include brand context
- [ ] All AI video prompts include negative prompts (no text, no UI)
- [ ] Test video shows NO garbled AI text
- [ ] Test video shows NO fake UI/calendars
- [ ] Logo appears in intro animation (first scene)
- [ ] Watermark appears in middle scenes
- [ ] CTA with logo and website appears in final scene
- [ ] Quality evaluation detects AI text hallucination
- [ ] Quality evaluation scores brand compliance

## Begin Implementation

Start with **Phase_4A_Brand_Bible_Service.md** and follow each document sequentially.
