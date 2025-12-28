# Phase 6D: Quality Evaluation Context

## Objective

Enhance the quality evaluation service with comprehensive Pine Hill Farm brand compliance criteria. This ensures the quality gate checks both technical quality AND brand alignment before approving videos.

## Prerequisites

- Phase 6A-6C complete
- Phase 3 quality evaluation service exists
- Phase 4F brand quality checks exist

## What This Phase Modifies

- `server/services/quality-evaluation-service.ts` - Enhanced brand compliance
- Quality scoring weighted toward brand alignment

---

## Step 1: Update Quality Evaluation Service

Add imports and comprehensive evaluation:

```typescript
import { brandContextService } from './brand-context-service';

async evaluateSceneComprehensive(
  frameBase64: string,
  sceneContext: {
    sceneIndex: number;
    sceneType: string;
    narration: string;
    totalScenes: number;
    expectedContentType: string;
  }
): Promise<ComprehensiveQualityResult> {
  const brandEvalContext = await brandContextService.getQualityEvaluationContext();
  const visualGuidelines = await brandContextService.getVisualAnalysisContextFull();

  const response = await this.anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frameBase64 }},
        { type: 'text', text: this.buildComprehensiveEvalPrompt(sceneContext, brandEvalContext, visualGuidelines) }
      ]
    }]
  });

  return this.parseComprehensiveEvalResponse(response.content[0].text, sceneContext);
}
```

---

## Step 2: Build Evaluation Prompt

The prompt evaluates four categories:

### 1. Technical Quality (20%)
- Resolution, exposure, focus, artifacts

### 2. Composition (15%)
- Framing, balance, subject placement

### 3. AI Artifacts (15%)
- Garbled text, fake UI, distortions

### 4. Brand Compliance (50%)
- **Lighting (12.5%)**: Warm/golden vs cold/clinical
- **Colors (12.5%)**: Earth tones vs sterile blues/grays
- **Setting (12.5%)**: Natural/farm vs clinical/corporate
- **Authenticity (12.5%)**: Real/relatable vs stock-photo

---

## Step 3: Score Calculation

```typescript
const weightedScore = Math.round(
  technicalScore * 0.20 +
  compositionScore * 0.15 +
  aiArtifactScore * 0.15 +
  brandScore * 0.50
);
```

---

## Step 4: Recommendation Logic

```typescript
let recommendation = 'pass';

if (aiArtifacts.textDetected || aiArtifacts.uiDetected) {
  recommendation = 'regenerate';
} else if (brandScore < 50) {
  recommendation = 'regenerate';
} else if (brandScore < 70 || weightedScore < 70) {
  recommendation = 'adjust';
}
```

---

## Verification Checklist

- [ ] Quality evaluation imports brand context service
- [ ] Prompt includes brand compliance criteria
- [ ] Each brand element scored (lighting, colors, setting, authenticity)
- [ ] Overall score weights brand at 50%
- [ ] Critical issues force regeneration
- [ ] Console logs show brand scoring

---

## Score Weighting Summary

| Category | Weight | Purpose |
|----------|--------|---------|
| Technical | 20% | Resolution, focus, exposure |
| Composition | 15% | Framing, balance |
| AI Artifacts | 15% | No garbled text/fake UI |
| **Brand** | **50%** | **PHF aesthetic match** |

---

## Recommendation Thresholds

| Condition | Action |
|-----------|--------|
| AI artifacts found | Regenerate |
| Brand < 50 | Regenerate |
| Brand 50-69 | Adjust |
| Overall 70+ | Pass |

---

## Next Phase

Once complete, proceed to **Phase 6E: Project Instructions System**.
