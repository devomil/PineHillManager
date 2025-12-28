# Phase 4F: Brand Quality Checks

## Objective

Update the quality evaluation service to detect AI text hallucination (garbled text like "peocineate") and score brand compliance. This catches the issues identified in the test video.

## Prerequisites

- Phase 4A-4E complete
- Phase 3 quality evaluation service working
- `quality-evaluation-service.ts` exists

## What This Phase Modifies

- `server/services/quality-evaluation-service.ts` - Add brand compliance checks

## What Success Looks Like

```
[QualityEval] Checking brand compliance for scene 2...
[QualityEval] AI text detected: "peocineate", "weth meal"
[QualityEval] Brand compliance score: 35/100
[QualityEval] Issues: ai-text-detected (critical), off-brand-content (major)
```

---

## Step 1: Update Quality Issue Types

In `server/services/quality-evaluation-service.ts`, update the `QualityIssue` type:

```typescript
export interface QualityIssue {
  type: 
    | 'text-overlap' 
    | 'face-blocked' 
    | 'poor-visibility' 
    | 'bad-composition' 
    | 'technical' 
    | 'content-mismatch'
    | 'ai-text-detected'      // NEW - garbled AI text
    | 'ai-ui-detected'        // NEW - fake UI elements
    | 'off-brand-content'     // NEW - content doesn't match brand
    | 'missing-brand-element'; // NEW - expected brand element missing
  severity: 'critical' | 'major' | 'minor';
  description: string;
  timestamp?: number;
  sceneIndex?: number;
  examples?: string[];  // NEW - specific examples found
}
```

---

## Step 2: Add Brand Compliance Evaluation Method

Add this method to the `QualityEvaluationService` class:

```typescript
/**
 * Evaluate brand compliance and detect AI hallucinations
 */
async evaluateBrandCompliance(
  frameBase64: string,
  sceneContext: {
    sceneType: string;
    expectedContent: string;
    isFirstScene: boolean;
    isLastScene: boolean;
    shouldHaveWatermark: boolean;
  }
): Promise<{
  score: number;
  issues: QualityIssue[];
}> {
  console.log(`[QualityEval] Checking brand compliance...`);
  
  try {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: frameBase64,
              },
            },
            {
              type: 'text',
              text: this.buildBrandCompliancePrompt(sceneContext),
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return this.parseBrandComplianceResponse(content.text);

  } catch (error: any) {
    console.error(`[QualityEval] Brand compliance check failed:`, error.message);
    return { score: 70, issues: [] };
  }
}

/**
 * Build the prompt for brand compliance checking
 */
private buildBrandCompliancePrompt(sceneContext: {
  sceneType: string;
  expectedContent: string;
  isFirstScene: boolean;
  isLastScene: boolean;
  shouldHaveWatermark: boolean;
}): string {
  return `Analyze this video frame for brand compliance and AI generation artifacts.

SCENE CONTEXT:
- Scene type: ${sceneContext.sceneType}
- Expected content: ${sceneContext.expectedContent}
- First scene (should have logo intro): ${sceneContext.isFirstScene}
- Last scene (should have CTA): ${sceneContext.isLastScene}
- Should have watermark: ${sceneContext.shouldHaveWatermark}

CHECK FOR THESE SPECIFIC ISSUES:

1. AI-GENERATED TEXT (CRITICAL)
   Look for ANY text that appears garbled, misspelled, or nonsensical.
   Examples of AI text hallucination:
   - "peocineate" instead of real words
   - "weth meal" instead of "with meal"  
   - "Noney", "Fioliday", "Decumeds"
   - Any gibberish that looks like attempted text
   - Partial words or character soup

2. AI-GENERATED UI ELEMENTS (MAJOR)
   Look for fake interface elements that don't belong:
   - Fake calendars with nonsense labels
   - Mock spreadsheets or charts
   - Fake app interfaces
   - Random numbers that look like data (e.g., "1102", "5idups")
   - Dashboard-like elements in non-dashboard content

3. OFF-BRAND CONTENT (MAJOR)
   Content that doesn't match wellness/health brand:
   - Finance/business graphics in wellness video
   - Unrelated stock imagery
   - Content that doesn't match the expected scene type

4. MISSING BRAND ELEMENTS (MINOR)
   Expected elements that are missing:
   - Logo/watermark if expected
   - Brand colors not present
   - CTA elements on last scene

Return a JSON object with this EXACT structure:
{
  "aiTextDetected": {
    "found": true/false,
    "examples": ["list", "of", "garbled", "text"],
    "severity": "critical"
  },
  "aiUIDetected": {
    "found": true/false,
    "description": "what was found",
    "severity": "major"
  },
  "offBrandContent": {
    "found": true/false,
    "description": "what doesn't match",
    "severity": "major"
  },
  "missingBrandElements": {
    "found": true/false,
    "description": "what's missing",
    "severity": "minor"
  },
  "brandComplianceScore": 0-100,
  "overallAssessment": "brief summary"
}

SCORING GUIDE:
- AI text detected: -40 points (critical issue)
- AI UI detected: -25 points (major issue)
- Off-brand content: -20 points (major issue)
- Missing brand elements: -10 points (minor issue)
- Start at 100, subtract for issues found

Return ONLY the JSON object, no other text.`;
}

/**
 * Parse the brand compliance response
 */
private parseBrandComplianceResponse(text: string): {
  score: number;
  issues: QualityIssue[];
} {
  const issues: QualityIssue[] = [];
  let score = 100;

  try {
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[QualityEval] No JSON found in brand compliance response');
      return { score: 70, issues: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Process AI text detection
    if (parsed.aiTextDetected?.found) {
      issues.push({
        type: 'ai-text-detected',
        severity: 'critical',
        description: `AI-generated garbled text detected in video frame`,
        examples: parsed.aiTextDetected.examples || [],
      });
      score -= 40;
      console.log(`[QualityEval] AI text detected: ${parsed.aiTextDetected.examples?.join(', ')}`);
    }

    // Process AI UI detection
    if (parsed.aiUIDetected?.found) {
      issues.push({
        type: 'ai-ui-detected',
        severity: 'major',
        description: `AI-generated UI elements detected: ${parsed.aiUIDetected.description}`,
      });
      score -= 25;
      console.log(`[QualityEval] AI UI detected: ${parsed.aiUIDetected.description}`);
    }

    // Process off-brand content
    if (parsed.offBrandContent?.found) {
      issues.push({
        type: 'off-brand-content',
        severity: 'major',
        description: `Off-brand content: ${parsed.offBrandContent.description}`,
      });
      score -= 20;
      console.log(`[QualityEval] Off-brand content: ${parsed.offBrandContent.description}`);
    }

    // Process missing brand elements
    if (parsed.missingBrandElements?.found) {
      issues.push({
        type: 'missing-brand-element',
        severity: 'minor',
        description: `Missing brand element: ${parsed.missingBrandElements.description}`,
      });
      score -= 10;
    }

    // Use parsed score if available, otherwise use calculated
    const finalScore = parsed.brandComplianceScore ?? Math.max(0, score);
    
    console.log(`[QualityEval] Brand compliance score: ${finalScore}/100`);
    if (issues.length > 0) {
      console.log(`[QualityEval] Issues: ${issues.map(i => `${i.type} (${i.severity})`).join(', ')}`);
    }

    return {
      score: finalScore,
      issues,
    };

  } catch (parseError: any) {
    console.error('[QualityEval] Failed to parse brand compliance response:', parseError.message);
    return { score: 70, issues: [] };
  }
}
```

---

## Step 3: Integrate Brand Checks into Main Evaluation

Update the main `evaluateScene` or `evaluateFrame` method to include brand compliance:

```typescript
/**
 * Complete scene evaluation including brand compliance
 */
async evaluateSceneComplete(
  frameBase64: string,
  sceneData: {
    sceneIndex: number;
    sceneType: string;
    narration: string;
    totalScenes: number;
    hasTextOverlay: boolean;
  }
): Promise<{
  overallScore: number;
  compositionScore: number;
  brandComplianceScore: number;
  issues: QualityIssue[];
  recommendation: 'pass' | 'regenerate' | 'adjust';
}> {
  console.log(`[QualityEval] Starting complete evaluation for scene ${sceneData.sceneIndex + 1}...`);

  // Run composition evaluation (existing Phase 3 logic)
  const compositionResult = await this.evaluateComposition(frameBase64, {
    hasTextOverlay: sceneData.hasTextOverlay,
    sceneType: sceneData.sceneType,
  });

  // Run brand compliance evaluation (new Phase 4F logic)
  const brandResult = await this.evaluateBrandCompliance(frameBase64, {
    sceneType: sceneData.sceneType,
    expectedContent: sceneData.narration,
    isFirstScene: sceneData.sceneIndex === 0,
    isLastScene: sceneData.sceneIndex === sceneData.totalScenes - 1,
    shouldHaveWatermark: sceneData.sceneIndex > 0 && sceneData.sceneIndex < sceneData.totalScenes - 1,
  });

  // Combine issues
  const allIssues = [...compositionResult.issues, ...brandResult.issues];

  // Calculate weighted overall score
  // Brand compliance is weighted more heavily for AI text issues
  const hasCriticalBrandIssue = brandResult.issues.some(i => i.severity === 'critical');
  
  let overallScore: number;
  if (hasCriticalBrandIssue) {
    // Critical brand issues (AI text) heavily penalize the score
    overallScore = Math.min(compositionResult.score * 0.3 + brandResult.score * 0.7, 50);
  } else {
    // Normal weighting: 60% composition, 40% brand
    overallScore = compositionResult.score * 0.6 + brandResult.score * 0.4;
  }

  // Determine recommendation
  let recommendation: 'pass' | 'regenerate' | 'adjust';
  if (overallScore >= 70 && !hasCriticalBrandIssue) {
    recommendation = 'pass';
  } else if (hasCriticalBrandIssue || overallScore < 50) {
    recommendation = 'regenerate';  // AI text = must regenerate
  } else {
    recommendation = 'adjust';
  }

  console.log(`[QualityEval] Complete - Overall: ${Math.round(overallScore)}, Recommendation: ${recommendation}`);

  return {
    overallScore: Math.round(overallScore),
    compositionScore: compositionResult.score,
    brandComplianceScore: brandResult.score,
    issues: allIssues,
    recommendation,
  };
}
```

---

## Step 4: Add Batch Evaluation for Full Video

```typescript
/**
 * Evaluate all scenes in a video for brand compliance
 */
async evaluateVideoBrandCompliance(
  scenes: Array<{
    frameBase64: string;
    sceneIndex: number;
    sceneType: string;
    narration: string;
  }>
): Promise<{
  overallBrandScore: number;
  sceneScores: Array<{ sceneIndex: number; score: number; issues: QualityIssue[] }>;
  criticalIssues: QualityIssue[];
  recommendation: 'approved' | 'needs-regeneration' | 'needs-review';
}> {
  console.log(`[QualityEval] Starting brand compliance check for ${scenes.length} scenes...`);

  const sceneScores: Array<{ sceneIndex: number; score: number; issues: QualityIssue[] }> = [];
  const criticalIssues: QualityIssue[] = [];

  for (const scene of scenes) {
    const result = await this.evaluateBrandCompliance(scene.frameBase64, {
      sceneType: scene.sceneType,
      expectedContent: scene.narration,
      isFirstScene: scene.sceneIndex === 0,
      isLastScene: scene.sceneIndex === scenes.length - 1,
      shouldHaveWatermark: scene.sceneIndex > 0 && scene.sceneIndex < scenes.length - 1,
    });

    sceneScores.push({
      sceneIndex: scene.sceneIndex,
      score: result.score,
      issues: result.issues,
    });

    // Collect critical issues
    const critical = result.issues.filter(i => i.severity === 'critical');
    critical.forEach(issue => {
      criticalIssues.push({
        ...issue,
        sceneIndex: scene.sceneIndex,
      });
    });
  }

  // Calculate overall brand score (average of all scenes)
  const overallBrandScore = Math.round(
    sceneScores.reduce((sum, s) => sum + s.score, 0) / sceneScores.length
  );

  // Determine recommendation
  let recommendation: 'approved' | 'needs-regeneration' | 'needs-review';
  if (criticalIssues.length > 0) {
    recommendation = 'needs-regeneration';
  } else if (overallBrandScore < 70) {
    recommendation = 'needs-review';
  } else {
    recommendation = 'approved';
  }

  console.log(`[QualityEval] Brand check complete - Score: ${overallBrandScore}, Critical issues: ${criticalIssues.length}`);

  return {
    overallBrandScore,
    sceneScores,
    criticalIssues,
    recommendation,
  };
}
```

---

## Step 5: Update Scene Regeneration for Brand Issues

In `server/services/scene-regeneration-service.ts`, add handling for brand issues:

```typescript
/**
 * Determine regeneration strategy based on issue type
 */
getRegenerationStrategy(issues: QualityIssue[]): {
  shouldRegenerate: boolean;
  strategy: string;
  promptModifications: string[];
} {
  const promptModifications: string[] = [];
  let shouldRegenerate = false;
  let strategy = 'none';

  // Check for AI text - ALWAYS regenerate with stronger negative prompt
  const hasAIText = issues.some(i => i.type === 'ai-text-detected');
  if (hasAIText) {
    shouldRegenerate = true;
    strategy = 'regenerate-with-enhanced-negative-prompt';
    promptModifications.push(
      'CRITICAL: Generate only visual content with absolutely no text',
      'no words, no letters, no writing, no captions of any kind',
      'pure visual imagery only'
    );
  }

  // Check for AI UI elements - regenerate with content restrictions
  const hasAIUI = issues.some(i => i.type === 'ai-ui-detected');
  if (hasAIUI) {
    shouldRegenerate = true;
    strategy = 'regenerate-with-content-restrictions';
    promptModifications.push(
      'no user interfaces, no calendars, no charts, no data displays',
      'natural scene only, no digital elements'
    );
  }

  // Check for off-brand content - regenerate with brand guidance
  const hasOffBrand = issues.some(i => i.type === 'off-brand-content');
  if (hasOffBrand) {
    shouldRegenerate = true;
    strategy = 'regenerate-with-brand-guidance';
    promptModifications.push(
      'wellness and health focused content',
      'warm natural aesthetic',
      'no corporate or finance imagery'
    );
  }

  return {
    shouldRegenerate,
    strategy,
    promptModifications,
  };
}
```

---

## Verification Checklist

Before completing Phase 4, confirm:

- [ ] `QualityIssue` type includes new brand-related types
- [ ] `evaluateBrandCompliance()` method exists and works
- [ ] AI text detection identifies garbled text
- [ ] AI UI detection identifies fake calendars/charts
- [ ] Off-brand content detection works
- [ ] Brand compliance score is calculated correctly
- [ ] Critical issues trigger regeneration recommendation
- [ ] Console logs show brand evaluation results
- [ ] Batch evaluation works for full video
- [ ] Regeneration strategy includes prompt modifications

---

## Testing the Brand Quality Checks

### Test 1: AI Text Detection
Upload a frame with garbled AI text and verify:
```
[QualityEval] AI text detected: "peocineate", "weth meal"
[QualityEval] Brand compliance score: 60/100
[QualityEval] Issues: ai-text-detected (critical)
```

### Test 2: AI UI Detection
Upload a frame with fake calendar elements:
```
[QualityEval] AI UI detected: Fake calendar with nonsense labels
[QualityEval] Brand compliance score: 75/100
[QualityEval] Issues: ai-ui-detected (major)
```

### Test 3: Clean Frame
Upload a clean wellness video frame:
```
[QualityEval] Brand compliance score: 95/100
[QualityEval] No brand issues detected
```

---

## Scoring Reference

| Issue Type | Severity | Point Deduction | Example |
|------------|----------|-----------------|---------|
| AI text detected | Critical | -40 | "peocineate", "weth meal" |
| AI UI detected | Major | -25 | Fake calendar, mock spreadsheet |
| Off-brand content | Major | -20 | Finance graphics in wellness video |
| Missing brand element | Minor | -10 | No watermark on middle scene |

**Thresholds:**
- Score ≥ 70 + no critical issues = **Pass**
- Score 50-69 or has major issues = **Needs Review**
- Score < 50 or has critical issues = **Must Regenerate**

---

## Troubleshooting

### "Brand compliance check always returns 70"
- Check Anthropic API key is valid
- Verify image is properly base64 encoded
- Check for API errors in catch block

### "AI text not being detected"
- Model may need more specific examples in prompt
- Try lowering the detection threshold
- Check image quality is sufficient for text detection

### "Too many false positives"
- Adjust the scoring weights
- Add exclusions for legitimate text (brand name, etc.)
- Refine the prompt to be more specific

---

## Phase 4 Complete

With Phase 4F complete, you now have:

1. **Brand Bible Service** (4A) - Loads brand assets from database
2. **Prompt Enhancement** (4B) - Adds brand context and anti-hallucination prompts
3. **Brand Injection** (4C) - Generates overlay instructions for logos/CTAs
4. **Pipeline Integration** (4D) - Connects brand services to video generation
5. **Remotion Components** (4E) - Renders brand overlays in video
6. **Quality Checks** (4F) - Detects AI text and scores brand compliance

**Expected Results After Implementation:**
- Videos no longer contain garbled AI text
- Videos no longer contain fake UI elements
- Videos include logo intro animation
- Videos include corner watermark
- Videos end with branded CTA
- Quality evaluation catches any remaining issues

---

## Next Steps After Phase 4

1. **Upload brand assets** via Brand Media tab with correct `usageContexts`
2. **Generate a test video** and verify all brand elements appear
3. **Check quality evaluation logs** for any detected issues
4. **Iterate on negative prompts** if AI text still appears
5. **Adjust brand colors/positioning** as needed
