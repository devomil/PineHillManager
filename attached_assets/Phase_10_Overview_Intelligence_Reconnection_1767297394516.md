# Phase 10: Intelligence Reconnection & Validation

## Purpose

Phase 9 successfully updated the UI to display quality scores, provider badges, and filter controls. However, **the backend intelligence services are not actually running or are disconnected**. This phase reconnects and validates all Phase 8 intelligence features.

## Critical Problems Identified

### Problem 1: Visual Direction Not Being Followed
**Scene 17 Example:**
- Visual Direction: "text overlay with the three actionable steps: Identify your top 3 sources of added sugar, Add one extra serving of vegetables, Replace one ultra-processed snack"
- Actual Output: Generic wellness center entrance image with NO text overlay
- Quality Score: Shows as "approved" when it should FAIL

**Scene 15 Example:**
- Visual Direction: "Woman looking confident and empowered in bright kitchen surrounded by fresh, whole foods"
- Actual Output: Extreme close-up of woman's mouth/face - completely wrong framing
- Quality Score: Shows as high when content doesn't match

### Problem 2: Quality Scores Are Fake
- Scenes showing Q: 90, Q: 91, Q: 93 but content clearly doesn't match
- Claude Vision analysis is either not running or results are being ignored
- Scores appear to be placeholder/random values

### Problem 3: QA Gate Not Blocking
- Progress tracker shows QA step but rendering proceeds anyway
- No actual validation before render
- "Approved (17)" shown but scenes have obvious issues

### Problem 4: Smart Text Placement Missing
- Scenes requiring text overlays (like CTA scenes) have no text
- Text placement service not being called during composition

## What Needs To Be Fixed

```
CURRENT BROKEN FLOW:
Generate Asset → [Skip Analysis] → Fake Score → [Skip QA] → Render

REQUIRED WORKING FLOW:
Generate Asset → Claude Vision Analysis → Real Score → Content Match Check → 
  → If Failed: Auto-Regenerate or Flag
  → If Passed: Smart Text Placement → Brand Injection → QA Gate → Render
```

## Phase 10 Sub-Phases

### Phase 10A: Claude Vision Integration Verification
- Verify ANTHROPIC_API_KEY is configured
- Ensure scene-analysis-service.ts is being called after asset generation
- Add logging to confirm analysis is running
- Fix any connection issues

### Phase 10B: Content Match Validation
- Implement actual content-to-narration matching
- Scene with "text overlay" in visual direction MUST have text overlay
- Scene with "woman in kitchen" must show woman AND kitchen
- Flag mismatches as failures regardless of technical quality

### Phase 10C: Real Quality Scoring
- Remove any hardcoded/placeholder scores
- Ensure scores come from actual Claude Vision analysis
- Implement proper scoring rubric:
  - Technical Quality: 20 points
  - Content Match: 30 points (CRITICAL)
  - Brand Compliance: 30 points
  - Composition: 20 points

### Phase 10D: QA Gate Enforcement
- Block rendering when ANY scene has score < 70
- Block rendering when ANY scene has "needs_review" status
- Require explicit user approval for borderline scenes
- Show clear blocking reasons

### Phase 10E: Smart Text Placement Restoration
- Detect scenes requiring text overlays from visual direction
- Generate text overlays for CTA scenes, explanation scenes
- Apply text placement service during composition
- Verify text appears in final render

## Files That Need Verification/Fixes

```
server/services/
├── scene-analysis-service.ts      # Is this being called?
├── auto-regeneration-service.ts   # Is this connected?
├── text-placement-service.ts      # Is this running?
├── quality-gate-service.ts        # Is this enforcing?
└── brand-injection-service.ts     # Is this injecting?

server/routes/
├── asset-generation.ts            # Does this call analysis after generation?
├── quality-routes.ts              # Do these return real data?
└── render-routes.ts               # Does this check QA gate?
```

## Success Criteria

Phase 10 is complete when:

1. **Content Match Works**: Scene 17 with "text overlay with three actionable steps" either:
   - Shows text overlay in the generated image, OR
   - Fails analysis with "Missing required text overlay" and score < 70

2. **Real Scores**: Scene 15 with wrong framing:
   - Scores < 50 for content mismatch
   - Status shows "rejected" or "needs_review"
   - Not "approved" with 90+ score

3. **QA Gate Blocks**: Cannot click "Render Video" when:
   - Any scene has score < 70
   - Any scene has unresolved "needs_review" status
   - Button is disabled with clear message

4. **Text Overlays Appear**: CTA scene includes:
   - The three actionable steps as text overlays
   - Properly positioned (not over faces)
   - Readable contrast

## Diagnostic Commands

Add these to verify services are running:

```typescript
// In asset generation completion handler:
console.log('[DIAGNOSTIC] Asset generated for scene', sceneIndex);
console.log('[DIAGNOSTIC] Calling scene analysis service...');
const analysis = await sceneAnalysisService.analyzeScene(...);
console.log('[DIAGNOSTIC] Analysis result:', JSON.stringify(analysis, null, 2));

// In render route:
console.log('[DIAGNOSTIC] Render requested for project', projectId);
const report = await qualityGateService.generateReport(...);
console.log('[DIAGNOSTIC] QA Report:', JSON.stringify(report, null, 2));
console.log('[DIAGNOSTIC] Can render:', report.canRender);
if (!report.canRender) {
  console.log('[DIAGNOSTIC] Blocking reasons:', report.blockingReasons);
  throw new Error('QA gate not passed: ' + report.blockingReasons.join(', '));
}
```

## Visual Reference

### What Scene 17 Should Look Like:
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [Wellness center entrance image]                          │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  This week, try this:                               │   │
│   │  • Identify your top 3 sources of added sugar       │   │
│   │  • Add one extra serving of vegetables              │   │
│   │  • Replace one ultra-processed snack                │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### What Scene 15 Should Look Like:
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [Wide/medium shot showing:]                               │
│   - Woman (full upper body visible, confident expression)   │
│   - Bright kitchen environment                              │
│   - Fresh whole foods visible (fruits, vegetables)          │
│   - Natural lighting                                        │
│   - Earth tones                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘

NOT: Extreme close-up of mouth only
```

## Implementation Order

1. **Phase 10A** - Verify Claude Vision is connected and running
2. **Phase 10B** - Implement real content match validation
3. **Phase 10C** - Ensure scores come from actual analysis
4. **Phase 10D** - Enforce QA gate before rendering
5. **Phase 10E** - Restore smart text placement

## Note to Replit Agent

**This is a debugging and reconnection phase.** The services were built in Phase 8 but appear to be:
- Not being called
- Returning fake/placeholder data
- Not blocking rendering

Your task is to:
1. Add logging to trace the actual execution path
2. Identify where the disconnect happened
3. Reconnect the services properly
4. Verify with real test cases that analysis is running

**Do not rebuild the services** - they should already exist. Focus on:
- Finding why they're not being called
- Reconnecting them to the asset generation and render pipelines
- Ensuring real data flows through the system
