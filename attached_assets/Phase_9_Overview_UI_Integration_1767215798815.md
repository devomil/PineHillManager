# Phase 9: UI Integration - Master Overview

## Purpose

Phases 7 and 8 implemented powerful backend services for multi-provider selection, scene analysis, auto-regeneration, and quality assurance. However, **the UI was not updated** to expose these features to users. This phase bridges that gap by updating all UI components to display and control the new capabilities.

## Current Problem

The backend is working correctly:
- ✅ Provider selection working (Kling 16 scenes, Hailuo 3 scenes, Flux.1 12 images, fal.ai 7 images)
- ✅ Scene analysis running (scores like 94, 89, 90, 83, 77)
- ✅ Quality thresholds enforced (auto-approve ≥85, needs-review 70-84)
- ✅ Sound design calculated (19 ambient, 18 transitions, 15 accents)

But the UI shows:
- ❌ Old media sources (AI, Pexels, Unsplash, Brand Media, Asset Library)
- ❌ No quality scores on scene cards
- ❌ No approve/reject/regenerate buttons
- ❌ No QA step in progress tracker
- ❌ No provider badges showing which AI generated each scene
- ❌ No QA Dashboard for reviewing flagged scenes

## What Users Should See

### Before (Current Broken UI):
```
Scene Card:
┌─────────────────────────────────────────┐
│ [thumbnail] Solution | 18s | 🏠         │
│ Strategy Four: Practice Mindful Eating  │
└─────────────────────────────────────────┘

Scene Editor Media Sources:
┌─────────────────────────────────────────┐
│ IMAGE SOURCES    │ VIDEO SOURCES        │
│ • AI             │ • AI                 │
│ • Pexels         │ • Pexels             │
│ • Unsplash       │ • Brand Media        │
│ • Brand Media    │ • Asset Library      │
└─────────────────────────────────────────┘
```

### After (Phase 9 Complete):
```
Scene Card:
┌─────────────────────────────────────────────────────────┐
│ [thumbnail] Solution | 18s | 🏠 | Kling 1.6 | 89/100 ✓ │
│ Strategy Four: Practice Mindful Eating                  │
│ [Approve] [Reject] [Regenerate]          needs review ⚠ │
└─────────────────────────────────────────────────────────┘

Scene Editor Media Sources:
┌─────────────────────────────────────────────────────────┐
│ IMAGE PROVIDERS        │ VIDEO PROVIDERS               │
│ ◉ Flux.1 (products)    │ ◉ Kling 1.6 (human/faces)    │
│ ○ fal.ai (lifestyle)   │ ○ Runway (cinematic)         │
│ ○ Brand Media          │ ○ Luma (product reveals)     │
│ ○ Asset Library        │ ○ Hailuo (B-roll/nature)     │
│                        │ ○ Brand Media                 │
│ Recommended: Flux.1    │ Recommended: Kling 1.6 ✨     │
└─────────────────────────────────────────────────────────┘
```

## Phase 9 Sub-Phases

### Phase 9A: Scene Card Enhancement
Update scene cards in the Scenes Preview to show:
- Quality score badge (color-coded: green ≥85, yellow 70-84, red <70)
- Status indicator (✓ approved, ⚠ needs review, ❌ rejected)
- Provider badge showing which AI generated the content
- Quick action buttons (Approve, Reject, Regenerate)

### Phase 9B: Scene Editor Provider Update
Replace old media sources with new provider options:
- **Video**: Runway, Kling 1.6, Luma, Hailuo (+ Brand Media, Asset Library)
- **Image**: Flux.1, fal.ai (+ Brand Media, Asset Library)
- Show recommended provider based on scene content
- Display provider strengths/best-for on hover

### Phase 9C: Progress Tracker QA Step
Add QA step to the progress pipeline:
- Insert between Assembly and Rendering
- Show overall QA score when complete
- Color-code based on pass/review/fail status
- Click to open QA Dashboard

### Phase 9D: QA Dashboard Implementation
Create the quality assurance review interface:
- Overall project score with breakdown
- List of scenes needing review
- Per-scene approve/reject/regenerate controls
- Bulk actions (Approve All, Re-Analyze)
- Block rendering until quality threshold met

### Phase 9E: Generation Preview Enhancement
Update the generation preview panel to show:
- All video providers with scene counts
- All image providers with counts
- Sound design breakdown (ambient, transitions, accents)
- Intelligence features (Claude Vision, text placement, transitions)
- Estimated cost breakdown by provider

## Files to Create/Modify

```
client/src/components/
├── scene-card.tsx                    # 9A - Add score, status, provider, actions
├── scene-editor-modal.tsx            # 9B - Replace media sources with providers
├── progress-tracker.tsx              # 9C - Add QA step
├── qa-dashboard.tsx                  # 9D - NEW: Quality review interface
├── scene-quality-card.tsx            # 9D - NEW: Per-scene quality display
├── generation-preview-panel.tsx      # 9E - Show all providers and counts
└── provider-selector.tsx             # 9B - NEW: Provider selection component
```

## Implementation Order

1. **Phase 9A** - Scene cards (users can see quality scores)
2. **Phase 9B** - Scene editor (users can select providers)
3. **Phase 9C** - Progress tracker (users can see QA step)
4. **Phase 9D** - QA Dashboard (users can approve/reject)
5. **Phase 9E** - Generation preview (users can see full breakdown)

## Success Criteria

Phase 9 is complete when:

- [ ] Scene cards show quality scores (89/100, etc.)
- [ ] Scene cards show status badges (✓ approved, ⚠ needs review)
- [ ] Scene cards show provider badges (Kling 1.6, Flux.1, etc.)
- [ ] Scene cards have Approve/Reject/Regenerate buttons
- [ ] Scene editor shows new providers (not AI/Pexels/Unsplash)
- [ ] Scene editor shows recommended provider for scene type
- [ ] Progress tracker has QA step between Assembly and Rendering
- [ ] QA Dashboard accessible and functional
- [ ] QA Dashboard shows scenes needing review (Scene 10, Scene 17)
- [ ] Approve/Reject buttons work and update scene status
- [ ] Regenerate button triggers new generation and re-analysis
- [ ] Generation preview shows all providers with counts
- [ ] Rendering blocked until flagged scenes are resolved

## Visual Reference

### Progress Tracker (Current vs Target)
```
CURRENT:
[Script ✓]─[Voiceover ✓]─[Images ✓]─[Videos ✓]─[Music ✓]─[Assembly ●]─[Rendering]

TARGET:
[Script ✓]─[Voiceover ✓]─[Images ✓]─[Videos ✓]─[Music ✓]─[Assembly ✓]─[QA 85]─[Rendering]
                                                                         ↑
                                                            Click to open QA Dashboard
```

### Generation Preview (Current vs Target)
```
CURRENT:
┌─────────────────────────────────────────┐
│ 🎬 19 video clips                       │
│ 🖼️ 19 images                            │
│ 🎤 Voiceover: Rachel                    │
│ 🎵 Background music                     │
└─────────────────────────────────────────┘

TARGET:
┌─────────────────────────────────────────────────────────────┐
│ 🎬 Video: Kling (16), Hailuo (3)                           │
│ 🖼️ Images: Flux.1 (12), fal.ai (7)                         │
│ 🎤 Voiceover: ElevenLabs - Rachel                          │
│ 🎵 Music: Udio AI - Professional wellness                  │
│ 🔊 Sound FX: Kling Sound - 19 ambient, 18 transitions      │
│ 🧠 Intelligence: Claude Vision, Smart Text, Transitions    │
│ ✅ QA: 17 approved, 2 need review                          │
├─────────────────────────────────────────────────────────────┤
│ 💰 $18.42                              ⏱️ 6:49 duration     │
└─────────────────────────────────────────────────────────────┘
```

## Integration with Backend

The backend services already exist and are working. The UI components need to:

1. **Fetch data from existing endpoints:**
   - `GET /api/projects/:id/quality-report` → QA scores and statuses
   - `GET /api/scenes/:id` → Scene with analysisResult and provider info

2. **Call existing action endpoints:**
   - `POST /api/scenes/:id/approve` → Mark scene approved
   - `POST /api/scenes/:id/reject` → Mark scene rejected
   - `POST /api/scenes/:id/regenerate` → Trigger regeneration

3. **Use existing service data:**
   - `scene.analysisResult.overallScore` → Quality score
   - `scene.analysisResult.recommendation` → approved/needs_review/rejected
   - `scene.provider` → Which AI provider generated it
   - `scene.regenerationCount` → How many times regenerated

## Note to Replit Agent

The backend work from Phases 7 and 8 is complete and working. This phase is purely **UI/frontend work** to expose the existing functionality to users. Do not modify the backend services - only update the React components to display the data that's already being generated.

Key principle: **If the backend calculates it, the UI should show it.**
