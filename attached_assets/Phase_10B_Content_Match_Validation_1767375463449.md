# Phase 10B: Content Match Validation

## Objective

Implement rigorous content-to-visual-direction matching. A scene showing a "close-up of a woman's mouth" when the direction says "woman in bright kitchen surrounded by fresh foods" must FAIL, not score 90+.

## Current Problem

**Scene 15:**
- Visual Direction: "Woman looking confident and empowered in bright kitchen surrounded by fresh, whole foods, natural lighting, earth tones"
- Actual Output: Extreme close-up of woman's lower face/mouth
- Current Score: ~90 (WRONG - should be <50)

**Scene 17:**
- Visual Direction: "text overlay with the three actionable steps"
- Actual Output: Wellness center entrance with NO text
- Current Score: ~90 (WRONG - should be <50)

## Root Cause

The Claude Vision prompt is likely:
1. Only checking technical quality (resolution, clarity)
2. Not strictly validating content against visual direction
3. Being too lenient with "partial matches"

## Solution: Strict Content Matching Prompt

Update `server/services/scene-analysis-service.ts`:

```typescript
private buildAnalysisPrompt(context: SceneContext): string {
  return `You are a strict quality assurance analyst for video production. Your job is to determine if this generated image/frame ACTUALLY matches what was requested.

## CRITICAL INSTRUCTION
You must be STRICT about content matching. If the visual direction asks for specific elements and they are missing or wrong, the score MUST be low. Do not give high scores to technically good images that don't match what was requested.

## Visual Direction Requested:
"${context.visualDirection}"

## Narration Context:
"${context.narration}"

## Scene Type: ${context.sceneType}

## YOUR ANALYSIS TASK

### 1. CONTENT MATCH CHECK (Most Important - 40 points max)
Go through EACH element mentioned in the visual direction and verify it exists:

${this.extractRequiredElements(context.visualDirection)}

For EACH element:
- Present and correct: Full points
- Present but wrong: Half points  
- Missing entirely: Zero points
- CRITICAL: If visual direction mentions "text overlay" or "text with [content]" and there is NO text visible, this is an AUTOMATIC FAILURE (score 0 for content match)

### 2. FRAMING/COMPOSITION CHECK (15 points max)
- If direction says "wide shot" but image is close-up: FAIL
- If direction says "close-up" but image is wide: FAIL
- If direction mentions "full body" or "upper body" but only face/partial: FAIL
- If direction says "surrounded by X" but X is not visible: FAIL

### 3. TECHNICAL QUALITY (20 points max)
- Resolution and clarity
- No AI artifacts (distorted hands, garbled text, impossible geometry)
- Proper lighting

### 4. BRAND COMPLIANCE (15 points max)
- Warm, natural lighting (not clinical/cold)
- Earth tones, greens, natural colors
- Welcoming, health-focused aesthetic

### 5. OVERALL COHERENCE (10 points max)
- Does the image make sense for the narration?
- Would this work in a professional health video?

## SCORING RULES

**AUTOMATIC FAILURES (Score must be < 50):**
- Visual direction mentions "text overlay/text with X" but no text is visible
- Visual direction describes specific scene (e.g., "woman in kitchen") but scene is completely different
- Visual direction says "wide shot" but image is extreme close-up (or vice versa)
- Major element from visual direction is completely missing

**NEEDS REVIEW (Score 50-69):**
- Most elements present but one significant element missing
- Correct scene but wrong framing
- Technical issues but content matches

**ACCEPTABLE (Score 70-84):**
- All major elements present
- Minor deviations from direction
- Good technical quality

**EXCELLENT (Score 85-100):**
- Perfectly matches visual direction
- All elements present and correct
- Excellent technical quality

## RESPONSE FORMAT
Respond with JSON only:
{
  "overallScore": <0-100>,
  "contentMatchScore": <0-40>,
  "framingScore": <0-15>,
  "technicalScore": <0-20>,
  "brandScore": <0-15>,
  "coherenceScore": <0-10>,
  "recommendation": "approved" | "needs_review" | "rejected",
  "contentMatchDetails": {
    "requestedElements": ["element1", "element2", ...],
    "presentElements": ["element1", ...],
    "missingElements": ["element2", ...],
    "wrongElements": []
  },
  "issues": [
    {
      "severity": "critical" | "major" | "minor",
      "category": "content_mismatch" | "framing" | "technical" | "brand",
      "description": "Specific description of the issue"
    }
  ],
  "summary": "One sentence summary of why this score was given"
}`;
}

private extractRequiredElements(visualDirection: string): string {
  // Parse visual direction into checkable elements
  const elements: string[] = [];
  
  // Check for text overlay requirements
  if (visualDirection.toLowerCase().includes('text overlay') || 
      visualDirection.toLowerCase().includes('text with') ||
      visualDirection.toLowerCase().includes('overlay with')) {
    elements.push('- TEXT OVERLAY: Visual direction requires text to be visible in the image');
  }
  
  // Check for person requirements
  if (visualDirection.toLowerCase().includes('woman') || 
      visualDirection.toLowerCase().includes('man') ||
      visualDirection.toLowerCase().includes('person')) {
    elements.push('- PERSON: A person matching the description must be visible');
  }
  
  // Check for setting requirements
  if (visualDirection.toLowerCase().includes('kitchen')) {
    elements.push('- SETTING: Kitchen environment must be clearly visible');
  }
  if (visualDirection.toLowerCase().includes('surrounded by')) {
    const match = visualDirection.match(/surrounded by ([^,\.]+)/i);
    if (match) {
      elements.push(`- SURROUNDINGS: "${match[1]}" must be visible around the subject`);
    }
  }
  
  // Check for framing requirements
  if (visualDirection.toLowerCase().includes('wide shot')) {
    elements.push('- FRAMING: Wide shot showing full environment');
  }
  if (visualDirection.toLowerCase().includes('close-up')) {
    elements.push('- FRAMING: Close-up shot of subject');
  }
  if (visualDirection.toLowerCase().includes('full body')) {
    elements.push('- FRAMING: Full body of person must be visible');
  }
  
  // Check for specific objects
  const objectMatches = visualDirection.match(/\b(foods?|vegetables?|fruits?|products?|bottle|jar|plants?)\b/gi);
  if (objectMatches) {
    elements.push(`- OBJECTS: ${[...new Set(objectMatches)].join(', ')} must be visible`);
  }
  
  // Check for lighting/mood
  if (visualDirection.toLowerCase().includes('natural lighting')) {
    elements.push('- LIGHTING: Natural, soft lighting (not artificial/harsh)');
  }
  if (visualDirection.toLowerCase().includes('golden hour')) {
    elements.push('- LIGHTING: Golden hour warm lighting');
  }
  
  return elements.length > 0 
    ? 'Required elements to verify:\n' + elements.join('\n')
    : 'Verify all elements mentioned in the visual direction are present.';
}
```

## Text Overlay Detection

Add specific handling for scenes that require text overlays:

```typescript
async analyzeScene(imageBase64: string, context: SceneContext): Promise<SceneAnalysisResult> {
  // Pre-check: Does this scene require text overlay?
  const requiresTextOverlay = this.requiresTextOverlay(context.visualDirection);
  
  // Call Claude Vision
  const analysis = await this.callClaudeVision(imageBase64, context);
  
  // Post-check: If text was required but not detected, force failure
  if (requiresTextOverlay && !analysis.contentMatchDetails?.presentElements?.some(e => 
    e.toLowerCase().includes('text')
  )) {
    console.log('[SceneAnalysis] FORCING FAILURE: Text overlay required but not detected');
    analysis.overallScore = Math.min(analysis.overallScore, 45);
    analysis.recommendation = 'rejected';
    analysis.issues.push({
      severity: 'critical',
      category: 'content_mismatch',
      description: 'Visual direction requires text overlay but no text is visible in the image',
    });
  }
  
  return analysis;
}

private requiresTextOverlay(visualDirection: string): boolean {
  const textKeywords = [
    'text overlay',
    'text with',
    'overlay with',
    'actionable steps',
    'bullet points',
    'list of',
    'showing text',
    'display text',
  ];
  
  const direction = visualDirection.toLowerCase();
  return textKeywords.some(keyword => direction.includes(keyword));
}
```

## Framing Validation

Add framing check to catch wrong shot types:

```typescript
private validateFraming(visualDirection: string, analysisResult: any): void {
  const direction = visualDirection.toLowerCase();
  
  // Check for framing mismatches
  if (direction.includes('wide shot') || direction.includes('full environment')) {
    if (analysisResult.detectedFraming === 'close-up' || 
        analysisResult.detectedFraming === 'extreme-close-up') {
      analysisResult.overallScore = Math.min(analysisResult.overallScore, 55);
      analysisResult.issues.push({
        severity: 'critical',
        category: 'framing',
        description: 'Visual direction requires wide shot but image is close-up',
      });
    }
  }
  
  if (direction.includes('surrounded by') || direction.includes('in kitchen') || 
      direction.includes('in bright kitchen')) {
    // If person is mentioned with environment, we need to see both
    if (analysisResult.detectedFraming === 'extreme-close-up' ||
        !analysisResult.contentMatchDetails?.presentElements?.some(e => 
          e.toLowerCase().includes('kitchen') || e.toLowerCase().includes('environment')
        )) {
      analysisResult.overallScore = Math.min(analysisResult.overallScore, 50);
      analysisResult.issues.push({
        severity: 'critical',
        category: 'framing',
        description: 'Visual direction requires person WITH environment but environment is not visible',
      });
    }
  }
}
```

## Test Cases

### Test Case 1: Missing Text Overlay
```typescript
const testScene1 = {
  visualDirection: "Welcoming wellness center entrance with text overlay showing three actionable steps",
  narration: "This week, try this: Identify your top 3 sources...",
};
// Image: Wellness center with NO text
// Expected: Score < 50, recommendation: "rejected"
// Issue: "Visual direction requires text overlay but no text is visible"
```

### Test Case 2: Wrong Framing
```typescript
const testScene2 = {
  visualDirection: "Woman looking confident in bright kitchen surrounded by fresh, whole foods",
  narration: "Here's the bottom line: Weight loss isn't just about counting calories...",
};
// Image: Extreme close-up of woman's mouth only
// Expected: Score < 50, recommendation: "rejected"
// Issue: "Visual direction requires person WITH environment but only face close-up visible"
```

### Test Case 3: Content Mismatch
```typescript
const testScene3 = {
  visualDirection: "Fresh colorful vegetables being chopped on wooden cutting board",
  narration: "Add one extra serving of vegetables to your daily meals...",
};
// Image: Generic office desk
// Expected: Score < 30, recommendation: "rejected"
// Issue: "Content completely unrelated to visual direction"
```

## Verification Checklist

- [ ] Analysis prompt includes strict content matching rules
- [ ] Text overlay detection is working
- [ ] Framing validation catches wrong shot types
- [ ] Scenes with missing required elements score < 50
- [ ] Test case 1 (missing text) fails correctly
- [ ] Test case 2 (wrong framing) fails correctly
- [ ] Test case 3 (content mismatch) fails correctly
- [ ] High scores only given when content actually matches

## Next Phase

Once content match validation is working, proceed to **Phase 10C: Real Quality Scoring** to ensure all scores come from actual analysis (no hardcoded values).
