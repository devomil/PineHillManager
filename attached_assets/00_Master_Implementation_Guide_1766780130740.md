# Pine Hill Farm Video Production System: Master Implementation Guide

## Overview

This document provides the Replit agent with a comprehensive understanding of the phased implementation approach for building a next-level, TV-commercial quality video production system. Each phase has its own detailed markdown file with specific implementation instructions.

**IMPORTANT FOR REPLIT AGENT:** Complete each phase fully before moving to the next. Verify all checklist items pass before proceeding. If you encounter errors, debug within the current phase rather than skipping ahead.

---

## Project Vision

Transform Pine Hill Farm's video marketing from basic slideshow-style outputs to **broadcast-quality TV commercials** generated automatically using AI. The system will be proprietary to Pine Hill Farm's marketing team.

### Current State
- Basic video generation with stock footage (Pexels)
- Generic background music
- Fixed text positioning (often overlaps faces)
- Random transitions
- No sound design

### Target State
- AI-generated video matched to cinematic visual direction
- Custom AI music matched to mood
- Professional sound design (whooshes, ambience)
- Intelligent text placement (never overlaps faces)
- Mood-matched transitions and Ken Burns effects
- Automated quality review and regeneration
- Perfect product imagery

---

## Technology Stack

### Video Generation (Multi-Provider)
| Provider | Access Method | Strength |
|----------|---------------|----------|
| Runway Gen-3 | Direct API (RUNWAY_API_KEY) | Cinematic, dramatic scenes |
| Kling | PiAPI | Human subjects, expressions |
| Luma | PiAPI | Product reveals, camera motion |
| Hailuo | PiAPI | Fast B-roll, cost-effective |
| Hunyuan | PiAPI | Nature, abstract |
| Veo 3.1 | PiAPI | High-quality cinematic |

### Image Generation
| Provider | Access Method | Use Case |
|----------|---------------|----------|
| Flux.1 | PiAPI | Product shots, hero images |
| fal.ai | Direct API (existing) | Lifestyle images |

### Audio Production
| Provider | Access Method | Use Case |
|----------|---------------|----------|
| ElevenLabs | Direct API (existing) | Voiceover narration |
| Udio | PiAPI | Custom background music |
| Kling Sound | PiAPI | Sound effects, transitions |

### Intelligence Layer
| Component | Provider | Purpose |
|-----------|----------|---------|
| Script Parsing | Claude (Anthropic) | Convert scripts to scenes |
| Scene Analysis | Claude Vision | Detect faces, composition |
| Quality Review | Claude Vision | Automated QA |

### Rendering
| Component | Provider |
|-----------|----------|
| Video Composition | Remotion |
| Render Execution | AWS Lambda |
| Asset Storage | AWS S3 |

---

## Environment Variables Required

The following secrets must be configured in Replit:

```
# Video Generation
RUNWAY_API_KEY=your_runway_api_key
PIAPI_API_KEY=your_piapi_api_key

# Existing (should already be set)
ANTHROPIC_API_KEY=your_anthropic_key
ELEVENLABS_API_KEY=your_elevenlabs_key
FAL_KEY=your_fal_key
PEXELS_API_KEY=your_pexels_key

# AWS
REMOTION_AWS_ACCESS_KEY_ID=your_aws_key
REMOTION_AWS_SECRET_ACCESS_KEY=your_aws_secret
REMOTION_AWS_BUCKET=remotionlambda-useast1-refjo5giq5
```

---

## Phase Overview

### Phase 1: AI Asset Generation (Foundation)

| Sub-Phase | Focus | Document | Priority |
|-----------|-------|----------|----------|
| **1A** | Runway Gen-3 Integration | Phase_1A_Runway_Integration.md | 🔴 Critical |
| **1B** | PiAPI Multi-Provider (Kling, Luma, Hailuo) | Phase_1B_PiAPI_MultiProvider.md | 🔴 Critical |
| **1C** | Professional Sound Design (Kling Sound) | Phase_1C_Sound_Design.md | 🟡 High |
| **1D** | Custom AI Music (Udio) | Phase_1D_Custom_Music.md | 🟡 High |
| **1E** | Product Image Generation (Flux.1) | Phase_1E_Product_Images.md | 🟢 Medium |

### Phase 2: Intelligent Composition (Intelligence)

| Sub-Phase | Focus | Document | Priority |
|-----------|-------|----------|----------|
| **2A** | Claude Vision Scene Analysis | Phase_2A_Scene_Analysis.md | 🔴 Critical |
| **2B** | Intelligent Text Placement | Phase_2B_Intelligent_Text_Placement.md | 🔴 Critical |
| **2C** | Smart Transitions & Ken Burns | Phase_2C_Smart_Transitions.md | 🟡 High |

### Phase 3: Quality Assurance (Polish)

| Sub-Phase | Focus | Document | Priority |
|-----------|-------|----------|----------|
| **3** | Automated Quality Evaluation | Phase_3_Quality_Evaluation.md | 🟢 Medium |

---

## Implementation Order

```
Week 1: Foundation
├── Phase 1A: Runway Integration (Day 1-2)
├── Phase 1B: PiAPI Multi-Provider (Day 2-3)
└── Testing & Verification (Day 4-5)

Week 2: Audio Enhancement
├── Phase 1C: Sound Design (Day 1-2)
├── Phase 1D: Custom Music (Day 2-3)
└── Phase 1E: Product Images (Day 4-5)

Week 3: Intelligence Layer
├── Phase 2A: Scene Analysis (Day 1-2)
├── Phase 2B: Text Placement (Day 2-3)
└── Phase 2C: Transitions (Day 4-5)

Week 4: Polish
├── Phase 3: Quality Evaluation (Day 1-3)
└── Integration Testing (Day 4-5)
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                                │
│                 (Video Producer Page)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SCRIPT PARSER                                 │
│              (Claude AI - Existing)                              │
│                                                                  │
│  Input: Marketing script                                         │
│  Output: Scenes with narration, visual direction, scene types    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 ASSET GENERATION SERVICE                         │
│            (universal-video-service.ts)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   VIDEO     │  │   AUDIO     │  │   IMAGE     │              │
│  │ GENERATION  │  │ GENERATION  │  │ GENERATION  │              │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤              │
│  │ • Runway    │  │ • ElevenLabs│  │ • Flux.1    │              │
│  │ • Kling     │  │   (voice)   │  │ • fal.ai    │              │
│  │ • Luma      │  │ • Udio      │  │             │              │
│  │ • Hailuo    │  │   (music)   │  │             │              │
│  │ • Veo       │  │ • Kling     │  │             │              │
│  │             │  │   Sound     │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               SCENE ANALYSIS SERVICE                             │
│                 (Claude Vision)                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Face detection (positions, count)                             │
│  • Focal point identification                                    │
│  • Safe zones for text                                           │
│  • Content type classification                                   │
│  • Mood detection                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│            COMPOSITION INSTRUCTIONS SERVICE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Text overlay positioning (avoids faces)                       │
│  • Product overlay placement                                     │
│  • Ken Burns parameters (follows focal point)                    │
│  • Transition selection (matches mood)                           │
│  • Audio timing (voiceover, music, SFX)                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  REMOTION COMPOSITION                            │
│            (UniversalVideoComposition.tsx)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Renders video with intelligent composition                    │
│  • Applies Ken Burns effects                                     │
│  • Positions text based on analysis                              │
│  • Syncs audio layers (voice, music, SFX)                        │
│  • Applies transitions                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS LAMBDA RENDER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Chunked rendering for long videos (>90s)                      │
│  • FFmpeg concatenation                                          │
│  • S3 upload                                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               QUALITY EVALUATION SERVICE                         │
│                   (Claude Vision)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Evaluate rendered output                                      │
│  • Detect quality issues                                         │
│  • Trigger regeneration if needed                                │
│  • Generate quality report                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FINAL OUTPUT                                  │
│              (S3 URL for download)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

After all phases are complete, the following files should exist:

```
server/
├── config/
│   └── ai-video-providers.ts          # Phase 1A/1B
│
├── services/
│   ├── runway-video-service.ts        # Phase 1A
│   ├── piapi-video-service.ts         # Phase 1B
│   ├── ai-video-service.ts            # Phase 1A/1B (orchestrator)
│   ├── sound-design-service.ts        # Phase 1C
│   ├── ai-music-service.ts            # Phase 1D
│   ├── product-image-service.ts       # Phase 1E
│   ├── scene-analysis-service.ts      # Phase 2A
│   ├── video-frame-extractor.ts       # Phase 2A
│   ├── composition-instructions-service.ts  # Phase 2B/2C
│   ├── quality-evaluation-service.ts  # Phase 3
│   ├── scene-regeneration-service.ts  # Phase 3
│   └── universal-video-service.ts     # Modified in multiple phases
│
└── routes/
    └── universal-video-routes.ts      # Modified in multiple phases

remotion/
└── UniversalVideoComposition.tsx      # Modified in Phase 2B/2C
```

---

## Key Principles for Replit Agent

### 1. Incremental Implementation
- Complete one phase fully before starting the next
- Verify all checklist items pass
- Test with real content before moving on

### 2. Error Handling
- Every service should have try/catch blocks
- Failed providers should fall back to alternatives
- Log all errors with context

### 3. Console Logging
- Use consistent prefixes: `[ServiceName]`
- Log start, progress, and completion of operations
- Include timing and cost information

### 4. Type Safety
- Define interfaces for all data structures
- Use TypeScript strictly
- Export types that other services need

### 5. Fallback Strategy
- AI video: Runway → Kling → Luma → Hailuo → Stock (Pexels)
- Music: Udio → ElevenLabs Music
- Sound effects: Kling Sound → Skip (silent)
- Images: Flux.1 → fal.ai → Skip

### 6. Cost Awareness
- Track costs per generation
- Log cost estimates
- Use cheaper providers for B-roll

---

## Testing Protocol

After each phase, test with this script:

```
TITLE: Weight Loss Journey

OPENING SCENE:
[Show frustrated person on scale]
Narrator: "If you've tried everything to lose weight and nothing seems to work..."

SCENE 1 - THE STRUGGLE:
[Show person looking tired, stressed]
Narrator: "You're not alone. Traditional approaches often miss the bigger picture."

SCENE 2 - THE SOLUTION:
[Show Pine Hill Farm products, nature imagery]
Narrator: "Pine Hill Farm takes a different approach - holistic healing that addresses the root cause."

CLOSING SCENE:
[Show happy, healthy person]
Narrator: "Start your transformation today with Pine Hill Farm."

Call to Action: Visit PineHillFarm.com
```

Expected results:
- 4 scenes, ~60-90 seconds total
- AI-generated videos matching visual direction
- Custom music matching wellness mood
- Sound effects on transitions
- Text never overlapping faces
- Professional quality output

---

## Success Criteria

The implementation is complete when:

1. ✅ AI video generation works for all scene types
2. ✅ Multiple providers available with automatic selection
3. ✅ Custom music generated and mixed with voiceover
4. ✅ Sound effects on transitions
5. ✅ Product images generated when needed
6. ✅ Scene analysis detects faces and composition
7. ✅ Text overlays never block faces
8. ✅ Ken Burns follows focal points
9. ✅ Transitions match content mood
10. ✅ Quality evaluation runs automatically
11. ✅ Failed scenes regenerate automatically
12. ✅ 3-minute videos render successfully
13. ✅ Output is TV-commercial quality

---

## Estimated Costs Per Video

| Component | Provider | 3-min Video Cost |
|-----------|----------|------------------|
| AI Video (6 scenes) | Mixed | ~$2.00 |
| Voiceover | ElevenLabs | ~$0.50 |
| Background Music | Udio | ~$0.30 |
| Sound Effects | Kling Sound | ~$0.20 |
| Product Images | Flux.1 | ~$0.10 |
| Scene Analysis | Claude Vision | ~$0.15 |
| Quality Review | Claude Vision | ~$0.15 |
| Lambda Render | AWS | ~$0.50 |
| **Total** | | **~$3.90** |

This is exceptional value for TV-commercial quality output.

---

## Getting Started

1. **Verify Prerequisites:**
   - All environment variables set
   - Runway subscription active
   - PiAPI account with credits
   - ElevenLabs subscription active
   - AWS Lambda configured

2. **Start with Phase 1A:**
   - Open `Phase_1A_Runway_Integration.md`
   - Follow each step sequentially
   - Complete all verification checklist items
   - Test with a simple video

3. **Progress Through Phases:**
   - Only move to next phase when current phase is verified
   - Each phase builds on previous phases
   - Keep console logs enabled for debugging

4. **Report Issues:**
   - Note which phase and step failed
   - Include error messages
   - Describe expected vs actual behavior

---

## Phase Documents

| File | Description |
|------|-------------|
| `Phase_1A_Runway_Integration.md` | Runway Gen-3 direct API integration |
| `Phase_1B_PiAPI_MultiProvider.md` | PiAPI integration for Kling, Luma, Hailuo |
| `Phase_1C_Sound_Design.md` | Kling Sound for professional audio |
| `Phase_1D_Custom_Music.md` | Udio for AI-generated background music |
| `Phase_1E_Product_Images.md` | Flux.1 for product photography |
| `Phase_2A_Scene_Analysis.md` | Claude Vision scene analysis |
| `Phase_2B_Intelligent_Text_Placement.md` | Smart text positioning |
| `Phase_2C_Smart_Transitions.md` | Ken Burns and transitions |
| `Phase_3_Quality_Evaluation.md` | Automated quality review |

Begin with Phase 1A. Good luck!
