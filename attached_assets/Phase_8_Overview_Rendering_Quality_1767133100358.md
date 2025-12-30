# Phase 8: Rendering Quality & Intelligence Loop - Master Overview

## Purpose

Phase 8 implements the **actual intelligence loop** that analyzes generated content, auto-regenerates failed scenes, applies smart composition, injects brand assets, and gates rendering behind quality approval. This fixes critical rendering issues including duplicate text overlays, mismatched visuals, blank gradient screens, and missing branding.

## Problems This Phase Solves

### Current Issues (from testing):
1. **Duplicate/garbled text overlays** - Text rendering twice or corrupted
2. **Mismatched visuals** - Generated images don't match narration context
3. **Blank gradient screens** - 40+ seconds of empty gradient (failed scene)
4. **No brand assets** - Missing logo intro, watermark, CTA outro
5. **No quality gates** - Broken content goes straight to render

### Root Cause:
The system generates assets but has **no validation loop** before rendering. Phase 7 added UI labels for intelligence features but didn't implement the actual logic.

## The Intelligence Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                 PHASE 8: INTELLIGENCE LOOP                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. GENERATE ASSET (via Phase 7 providers)                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. CLAUDE VISION ANALYSIS (Phase 8A)                     │  │
│  │    • Content matches narration?                          │  │
│  │    • AI artifacts present?                               │  │
│  │    • Brand aesthetic match?                              │  │
│  │    • Technical quality OK?                               │  │
│  │    OUTPUT: Score 0-100 + Issues List                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│              ┌─────────────────────────┐                        │
│              │    SCORE < 70?          │                        │
│              └─────────────────────────┘                        │
│                   ↓ YES          ↓ NO                           │
│  ┌────────────────────────┐  ┌────────────────────────────────┐│
│  │ 3. AUTO-REGENERATE     │  │ 4. SMART COMPOSITION           ││
│  │    (Phase 8B)          │  │    (Phase 8C/8D)               ││
│  │    • Improve prompt    │  │    • Text placement            ││
│  │    • Try different     │  │    • Transition matching       ││
│  │      provider          │  │    • Frame composition         ││
│  │    • Max 3 attempts    │  │                                ││
│  │    • Escalate if fail  │  │                                ││
│  └────────────────────────┘  └────────────────────────────────┘│
│           ↓ (loop back)                    ↓                    │
│                            ┌────────────────────────────────────┐
│                            │ 5. BRAND ASSET INJECTION          │
│                            │    (Phase 8E)                     │
│                            │    • Logo intro                   │
│                            │    • Watermark overlay            │
│                            │    • CTA outro                    │
│                            └────────────────────────────────────┘
│                                          ↓                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 6. FINAL QA & USER APPROVAL (Phase 8F)                   │  │
│  │    • Per-scene quality dashboard                         │  │
│  │    • Approve/Reject/Regenerate controls                  │  │
│  │    • Block render until threshold met                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 7. RENDER (only after approval)                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Quality Scoring System

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCENE QUALITY SCORE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TECHNICAL QUALITY (20 points)                                  │
│  ├── Resolution & clarity ............ 10 pts                  │
│  └── No artifacts (blur, noise) ...... 10 pts                  │
│                                                                 │
│  CONTENT MATCH (30 points)                                      │
│  ├── Visual matches narration ........ 15 pts                  │
│  └── Appropriate for scene type ...... 15 pts                  │
│                                                                 │
│  BRAND COMPLIANCE (30 points)                                   │
│  ├── Lighting (warm/golden) .......... 10 pts                  │
│  ├── Color palette (earth tones) ..... 10 pts                  │
│  └── Setting (natural/authentic) ..... 10 pts                  │
│                                                                 │
│  COMPOSITION (20 points)                                        │
│  ├── Text placement valid ............ 10 pts                  │
│  └── Subject framing ................. 10 pts                  │
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│  TOTAL: 100 points                                              │
│                                                                 │
│  THRESHOLDS:                                                    │
│  ├── 85-100: ✅ Auto-approve                                    │
│  ├── 70-84:  ⚠️  User review recommended                        │
│  ├── 50-69:  🔄 Auto-regenerate (then user review)              │
│  └── <50:    ❌ Must regenerate or user override                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 8 Sub-Phases

### Phase 8A: Claude Vision Scene Analysis
- Analyze each generated image/video immediately after creation
- Score content match, artifacts, brand compliance, technical quality
- Generate specific issue descriptions for failed checks
- Output: SceneAnalysisResult with score and issues

### Phase 8B: Intelligent Auto-Regeneration
- Triggered when scene score < 70
- Improve prompt based on specific failures
- Try alternate provider if current one struggles
- Maximum 3 regeneration attempts per scene
- Escalate to user queue if still failing

### Phase 8C: Smart Text Placement
- Analyze frame to detect faces and subjects
- Calculate safe zones for text overlay
- Determine optimal text color for contrast
- Prevent text overlap with key visual elements
- Fix duplicate text rendering issues

### Phase 8D: Mood-Matched Transitions
- Analyze emotional flow between scenes
- Select transition type (cut, fade, dissolve, wipe)
- Set appropriate duration for pacing
- Ensure smooth audio crossfades

### Phase 8E: Brand Asset Injection
- Auto-inject logo intro (first 2-3 seconds)
- Apply watermark throughout video
- Inject CTA outro with contact info
- Pull assets from Brand Media library
- Configurable placement and timing

### Phase 8F: Quality Assurance Dashboard
- Visual per-scene quality display
- Color-coded status indicators
- Approve/Reject/Regenerate controls per scene
- Overall project quality score
- Block rendering until minimum threshold met
- User override capability with confirmation

## Files Created/Modified

```
server/services/
├── scene-analysis-service.ts      # 8A - Claude Vision analysis
├── auto-regeneration-service.ts   # 8B - Regeneration loop
├── text-placement-service.ts      # 8C - Smart text positioning
├── transition-service.ts          # 8D - Mood-matched transitions
├── brand-injection-service.ts     # 8E - Logo, watermark, CTA
└── quality-gate-service.ts        # 8F - Approval workflow

client/src/components/
├── qa-dashboard.tsx               # 8F - Quality dashboard UI
├── scene-quality-card.tsx         # 8F - Per-scene quality display
├── quality-gate-modal.tsx         # 8F - Approval modal
└── regenerate-controls.tsx        # 8B - Regeneration UI

server/routes/
└── quality-routes.ts              # API endpoints for QA workflow
```

## Expected Results After Phase 8

### Before (Current Issues):
```
Scene 3: Garbled text "Engineered with additives" overlapping
Scene 7: Sugar comparison visual doesn't make sense
Scene 12: 40 seconds of yellow/green gradient
Scene 18: No logo, no CTA, no branding
Overall: Broken video shipped to user
```

### After (Phase 8 Active):
```
Scene 3: Score 45 → Auto-regenerate → New prompt → Score 82 ✓
         Text placement recalculated, no overlap
Scene 7: Score 38 → Auto-regenerate with better context → Score 78 ✓
         Visual now shows recommended vs actual intake clearly
Scene 12: Score 0 (blank detected) → Auto-regenerate → Score 85 ✓
          Proper content generated
Scene 18: Brand injection applied → Logo intro, CTA outro ✓
QA Gate: Overall 81/100 → User reviews → Approves → Render
```

## Implementation Order

1. **Phase 8A** - Scene analysis (foundation for everything else)
2. **Phase 8B** - Auto-regeneration (uses 8A results)
3. **Phase 8C** - Text placement (uses 8A frame analysis)
4. **Phase 8D** - Transitions (uses 8A mood detection)
5. **Phase 8E** - Brand injection (independent, can run parallel)
6. **Phase 8F** - QA dashboard (brings it all together)

## Success Criteria

Phase 8 is complete when:

- [ ] Every generated asset is analyzed by Claude Vision
- [ ] Scores < 70 trigger automatic regeneration
- [ ] Max 3 regeneration attempts before user escalation
- [ ] Text placement avoids faces and busy regions
- [ ] No duplicate or garbled text overlays
- [ ] Transitions match scene emotional flow
- [ ] Logo intro appears on all videos
- [ ] Watermark applied throughout
- [ ] CTA outro with contact info on all videos
- [ ] QA dashboard shows per-scene scores
- [ ] Users can approve/reject/regenerate scenes
- [ ] Rendering blocked until quality threshold met
- [ ] Blank/gradient screens detected and flagged

## Integration with Previous Phases

- **Phase 6** (Brand Context): 8A uses brand guidelines for compliance scoring
- **Phase 7** (Providers): 8B can switch providers during regeneration
- **Phase 7 Addendum** (PiAPI): 8B routes regeneration through correct APIs

## Begin Implementation

Start with **Phase_8A_Scene_Analysis.md** and implement sequentially.
