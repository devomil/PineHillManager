# Phase 6: AI Context Injection - Master Overview

## Purpose

Phase 6 embeds brand knowledge and project instructions into every AI touchpoint in the Universal Video Producer. Currently, Claude and other AI services operate without knowledge of Pine Hill Farm's brand, values, products, or visual aesthetic. This phase ensures every AI interaction is brand-aware.

## The Problem

Without brand context, AI services:
- Parse scripts without understanding Pine Hill Farm terminology
- Generate visual directions without knowing the brand aesthetic
- Evaluate quality without brand-specific criteria
- Miss opportunities to reinforce brand messaging
- May suggest visuals that feel corporate instead of farm-to-wellness

## What Phase 6 Delivers

| AI Touchpoint | Current State | After Phase 6 |
|--------------|---------------|---------------|
| Script Parsing | Generic scene detection | Recognizes PHF products, services, audience |
| Visual Direction | Generic descriptions | Farm aesthetic, warm lighting, natural settings |
| Scene Analysis | Basic composition check | Brand alignment scoring |
| Quality Evaluation | Technical quality only | Brand compliance + aesthetic match |
| Prompt Enhancement | Generic wellness terms | PHF-specific descriptors and values |

## Pine Hill Farm Brand Summary

**Identity:**
- Family farm since 1853, organic certified 2017
- Women-owned (3 sisters with healthcare backgrounds)
- Farm-to-wellness concept
- Locations: Watertown, WI and Lake Geneva, WI (2025)
- Website: pinehillfarm.co

**Core Services:**
- Functional health consultations
- Hormone testing and balancing
- Mold/mycotoxin assessment and remediation
- Gut health and microbiome testing
- 300+ proprietary supplements
- Organic CBD products (gummies, oils)
- Wellness spa services

**Target Audience:**
- Health-conscious individuals seeking root-cause solutions
- Women 35-65 (hormone health, menopause)
- People frustrated with conventional medicine
- Those dealing with: mold illness, gut issues, hormone imbalance
- Veterans (50% discount honored)

**Brand Values:**
- Holistic over symptomatic
- Root cause over quick fix
- Natural over synthetic
- Family over corporate
- Education over sales
- Accessibility (HSA/FSA accepted)

**Visual Aesthetic:**
- Warm, golden lighting (farm/sunset feel)
- Natural settings (fields, gardens, spa)
- Earth tones: greens, browns, warm golds
- Real people, authentic expressions
- Organic textures (wood, plants, natural materials)
- Avoid: Clinical/sterile, cold/corporate, artificial/plastic

## Prerequisites

Before starting Phase 6, verify:

- [ ] Phase 1-5 complete
- [ ] Brand bible service (Phase 4A) working
- [ ] Script parsing service exists
- [ ] Scene analysis service exists
- [ ] Quality evaluation service exists
- [ ] Prompt enhancement service exists

## Sub-Phase Structure

```
Phase 6A: Brand Context Service
    ↓ (creates centralized brand knowledge store)
Phase 6B: Script Parsing Context
    ↓ (injects brand knowledge into script parsing)
Phase 6C: Visual Analysis Context
    ↓ (adds brand aesthetic to scene analysis)
Phase 6D: Quality Evaluation Context
    ↓ (brand compliance criteria for quality checks)
Phase 6E: Project Instructions System
    ↓ (AI role/mindset configuration)
```

## Files Created by Phase 6

```
server/
├── brand-context/
│   ├── pine-hill-farm.json           # 6A - Structured brand data
│   ├── visual-guidelines.md          # 6C - Visual aesthetic rules
│   └── ai-role-instructions.md       # 6E - Project instructions
├── services/
│   ├── brand-context-service.ts      # 6A - Load and format brand context
│   └── (existing services updated)   # 6B-6E - Context injection
```

## Integration Architecture

```
                    ┌─────────────────────────┐
                    │   Brand Context Service  │
                    │   (pine-hill-farm.json)  │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Script Parser │     │ Scene Analysis  │     │ Quality Eval    │
│   (Claude)    │     │ (Claude Vision) │     │ (Claude Vision) │
└───────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │    Brand Context      │    Visual Guidelines  │   Compliance
        │    + Terminology      │    + Aesthetic Rules  │   Criteria
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Better Scene  │     │ Brand-Aligned   │     │ Brand Compliance│
│ Detection     │     │ Visual Dir.     │     │ Scoring         │
└───────────────┘     └─────────────────┘     └─────────────────┘
```

## Context Injection Examples

### Script Parsing (Before)
```
User script: "Struggling with fatigue and brain fog? Your gut might be the answer."

AI Response: Scene type: "problem", Generic health content
```

### Script Parsing (After)
```
User script: "Struggling with fatigue and brain fog? Your gut might be the answer."

AI Response: 
- Scene type: "problem" 
- PHF Service Match: Gut health, GI360 Microbiome test
- Suggested visual: Person in natural setting looking tired
- Brand connection: Root cause approach, not quick fix
- Product opportunity: Gut health supplements
```

### Visual Direction (Before)
```
"Person looking at supplements in a store"
```

### Visual Direction (After)
```
"Woman in her 40s examining organic supplement bottles in a warm, 
sunlit space with wooden shelving and plants. Natural lighting, 
earth tones, authentic expression of curiosity. Farm-to-wellness 
aesthetic, not clinical pharmacy feel."
```

### Quality Evaluation (Before)
```
Score: 85/100
- Composition: Good
- Technical: Good
- No issues detected
```

### Quality Evaluation (After)
```
Score: 78/100
- Composition: 85 (Good framing)
- Technical: 90 (Sharp, well-lit)
- Brand Alignment: 60 (Concerns)
  - Setting feels too clinical/corporate
  - Lighting is cold, should be warm
  - Missing natural/organic elements
  - Recommendation: Regenerate with farm aesthetic
```

## Implementation Order

1. **Read Phase_6A** → Create brand context service and data files → Verify
2. **Read Phase_6B** → Update script parsing with brand context → Verify
3. **Read Phase_6C** → Update scene analysis with visual guidelines → Verify
4. **Read Phase_6D** → Update quality evaluation with brand criteria → Verify
5. **Read Phase_6E** → Implement project instructions system → Verify

## Success Criteria

Phase 6 is complete when:

- [ ] Brand context JSON contains all PHF data
- [ ] Script parser recognizes PHF products and services
- [ ] Scene analysis uses PHF visual guidelines
- [ ] Visual directions include brand-specific descriptors
- [ ] Quality evaluation scores brand alignment
- [ ] All Claude API calls include appropriate brand context
- [ ] Generated content feels authentically Pine Hill Farm
- [ ] AI understands root-cause philosophy vs quick-fix

## Cost Consideration

Adding brand context increases token usage:
- Brand context: ~1,500 tokens per call
- Visual guidelines: ~800 tokens per call
- Role instructions: ~500 tokens per call

Estimated additional cost: ~$0.02-0.05 per video project

This cost is justified by significantly improved brand alignment and reduced need for regeneration.

## Begin Implementation

Start with **Phase_6A_Brand_Context_Service.md** and follow each document sequentially.
