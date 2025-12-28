# Phase 6C: Visual Analysis Context

## Objective

Inject Pine Hill Farm visual guidelines into the scene analysis service so Claude Vision evaluates generated visuals against the brand's aesthetic requirements. This ensures AI-generated content matches the warm, natural, farm-to-wellness look.

## Prerequisites

- Phase 6A complete (Brand Context Service working)
- Phase 6B complete (Script Parsing Context working)
- Scene analysis service exists (from Phase 2A)
- Claude Vision integration working

## What This Phase Creates/Modifies

- `server/brand-context/visual-guidelines.md` - Detailed visual guidelines document
- `server/services/scene-analysis-service.ts` - Add brand visual context

## What Success Looks Like

**Before (Generic Analysis):**
```
Scene Analysis:
- Composition: Good
- Lighting: Adequate
- Subject: Person visible
- Recommendation: Pass
```

**After (Brand-Aware Analysis):**
```
Scene Analysis:
- Composition: 85/100 (Good framing, rule of thirds)
- Brand Aesthetic Match: 72/100
  - Lighting: Too cool/clinical (should be warm, golden)
  - Setting: Generic office (should be natural/home)
  - Colors: Blue-gray tones (should be earth tones)
  - Feel: Corporate (should be family/farm warmth)
- Recommendation: Regenerate with warmer aesthetic
- Suggested Changes:
  - Add warm color grading
  - Change setting to natural environment
  - Softer, golden lighting
```

---

## Step 1: Create Visual Guidelines Document

Create `server/brand-context/visual-guidelines.md`:

```markdown
# Pine Hill Farm Visual Guidelines

## Brand Visual Identity

Pine Hill Farm is a farm-to-wellness destination. Our visual language communicates warmth, authenticity, nature, and holistic health. Every image and video should feel like an invitation into our family farm and wellness community.

## The Pine Hill Farm Look

### Lighting
**DO:**
- Warm, golden hour lighting
- Soft, diffused natural light
- Gentle window light
- Warm-toned artificial light (2700K-3200K)
- Dappled sunlight through trees/windows

**DON'T:**
- Cool, blue-tinted lighting
- Harsh fluorescent lights
- Clinical/hospital lighting
- Stark, shadowless lighting
- Cold, overcast looks

### Color Palette
**Primary Colors:**
- Forest Green (#2D5A27) - Nature, growth, health
- Earthy Brown (#8B7355) - Grounded, organic, farm
- Warm Gold (#D4A574) - Warmth, premium, honey

**Supporting Colors:**
- Natural Cream (#F5F2ED) - Clean, organic, soft
- Sage Green (#87A878) - Fresh, herbal, calm
- Terracotta (#C4785A) - Earth, warmth, natural

**Avoid:**
- Bright clinical white
- Cold blue/gray tones
- Neon or artificial colors
- Stark black
- Sterile silver/chrome

### Settings & Environments
**Ideal Settings:**
- Farm fields with golden light
- Gardens with herbs and vegetables
- Cozy home kitchens with natural materials
- Wellness spa spaces with wood and plants
- Sunlit living rooms with organic decor
- Outdoor patios and porches
- Natural landscapes (meadows, forests)

**Avoid:**
- Hospital or clinical environments
- Sterile white laboratories
- Generic corporate offices
- Cold, modern minimalist spaces
- Pharmacy or drugstore settings
- Fluorescent-lit spaces

### People & Expressions
**Show:**
- Real people (not overly polished models)
- Authentic, natural expressions
- Genuine smiles and emotions
- Women 35-65 as primary subjects
- Family interactions
- Caring, supportive moments
- People in comfortable, natural clothing

**Avoid:**
- Stock photo perfection
- Forced or fake smiles
- Overly made-up appearances
- Corporate attire
- Isolated, lonely subjects
- Fear or anxiety expressions
- Clinical patient/doctor dynamics

### Textures & Materials
**Embrace:**
- Natural wood (barn wood, oak, walnut)
- Organic cotton and linen
- Ceramic and pottery
- Fresh plants and herbs
- Natural stone
- Woven baskets
- Glass jars with natural products

**Avoid:**
- Plastic and synthetic materials
- Chrome and stainless steel (clinical)
- Glossy, artificial surfaces
- Fluorescent colors
- Mass-produced items
- Pharmaceutical packaging

### Composition Guidelines
**Framing:**
- Rule of thirds for balance
- Plenty of negative space (breathing room)
- Subject not centered but connected
- Natural framing (doorways, windows, foliage)

**Depth:**
- Shallow depth of field for intimacy
- Background context without distraction
- Foreground elements for dimension

**Movement:**
- Slow, gentle camera movements
- Smooth pans and reveals
- Avoid jarring cuts or fast motion
- Peaceful, contemplative pacing

## Scene Type Visual Guidelines

### Hook Scenes
- Show relatable health struggle
- Authentic facial expressions
- Warm but slightly muted tones
- Setting: Home or everyday environment
- Person should look relatable, not defeated

### Problem Scenes
- Empathetic portrayal of struggle
- NOT dark or depressing
- Soft lighting even in difficult moments
- Show conventional medicine frustration gently
- Always leave room for hope

### Solution Scenes
- Brightening of mood and lighting
- Introduction of natural elements
- Pine Hill Farm products/settings
- Transition from struggle to hope
- Warm, inviting atmosphere

### Benefit/Transformation Scenes
- Full warm, golden lighting
- Joyful, genuine expressions
- Natural outdoor settings or bright interiors
- Active, healthy lifestyle moments
- Connection with others (family, community)

### Product Scenes
- Natural backgrounds (wood, plants)
- Warm, studio-like lighting
- Products surrounded by organic elements
- Human hands for scale and connection
- NOT pharmaceutical style

### CTA Scenes
- Welcoming, inviting atmosphere
- Clear but soft text overlays
- Logo in natural setting
- Warm, hopeful closing mood
- Community and support feeling

## Brand Aesthetic Scoring Rubric

When evaluating visual content for Pine Hill Farm brand alignment:

### Lighting (25 points)
- 25: Perfect warm, golden lighting
- 20: Mostly warm with minor cool areas
- 15: Neutral lighting, neither warm nor cold
- 10: Noticeably cool or clinical
- 5: Cold, harsh, or fluorescent

### Color Palette (25 points)
- 25: Perfect earth tones and brand colors
- 20: Mostly warm tones with minor deviations
- 15: Neutral colors, not distinctly branded
- 10: Cool or off-brand colors present
- 5: Clinical or artificial color scheme

### Setting/Environment (25 points)
- 25: Perfect natural/farm/wellness setting
- 20: Natural setting with minor off-brand elements
- 15: Generic but acceptable setting
- 10: Corporate or sterile elements visible
- 5: Clinical, cold, or inappropriate setting

### Authenticity/Feel (25 points)
- 25: Perfectly authentic, warm, inviting
- 20: Mostly authentic with minor stock-photo feel
- 15: Generic but not off-putting
- 10: Noticeably artificial or corporate
- 5: Cold, clinical, or fear-based

**Total Brand Alignment Score: X/100**
- 85-100: Excellent - On brand, proceed
- 70-84: Good - Minor adjustments recommended
- 50-69: Fair - Consider regeneration
- Below 50: Poor - Must regenerate

## Visual Do's and Don'ts Summary

### ✅ DO
- Warm, golden lighting
- Natural settings (farm, garden, home)
- Earth tones (green, brown, gold)
- Real people with authentic expressions
- Organic materials (wood, plants)
- Hopeful, empowering mood
- Family and community feeling

### ❌ DON'T
- Cold, clinical lighting
- Hospital/office settings
- Blue, gray, sterile colors
- Stock photo perfection
- Plastic, synthetic materials
- Fear-based or negative imagery
- Isolated, corporate feeling
```

---

## Step 2: Add Visual Guidelines Loader to Brand Context Service

Update `server/services/brand-context-service.ts`:

```typescript
// Add to BrandContextService class:

private visualGuidelines: string | null = null;

/**
 * Load visual guidelines markdown
 */
async loadVisualGuidelines(): Promise<string> {
  if (this.visualGuidelines) {
    return this.visualGuidelines;
  }

  try {
    const guidelinesPath = path.join(__dirname, '../brand-context/visual-guidelines.md');
    this.visualGuidelines = fs.readFileSync(guidelinesPath, 'utf-8');
    console.log('[BrandContext] Visual guidelines loaded');
    return this.visualGuidelines;
  } catch (error: any) {
    console.error('[BrandContext] Failed to load visual guidelines:', error.message);
    // Return condensed version if file not found
    return this.getCondensedVisualGuidelines();
  }
}

/**
 * Get condensed visual guidelines for prompts
 */
private getCondensedVisualGuidelines(): string {
  return `
## Pine Hill Farm Visual Guidelines (Condensed)

LIGHTING: Warm, golden (NOT cold/clinical)
COLORS: Earth tones - greens, browns, warm golds (NOT blue/gray/sterile)
SETTINGS: Farm, garden, natural home, spa (NOT hospital/office/clinical)
PEOPLE: Real, authentic, women 35-65 (NOT stock-photo perfect)
TEXTURES: Natural wood, plants, organic (NOT plastic/chrome/synthetic)
MOOD: Warm, hopeful, inviting (NOT fear-based/corporate)

Score 85+ = On brand | 70-84 = Minor fixes | Below 70 = Regenerate
`;
}

/**
 * Get visual analysis context for Claude Vision
 */
async getVisualAnalysisContextFull(): Promise<string> {
  const guidelines = await this.loadVisualGuidelines();
  const brandData = await this.loadBrandContext();

  return `
# Brand Visual Analysis Context

You are evaluating visual content for ${brandData.brand.name}, a ${brandData.brand.tagline}.

${guidelines}

## Evaluation Instructions

1. Score each visual element (Lighting, Colors, Setting, Authenticity) out of 25 points
2. Calculate total Brand Alignment Score out of 100
3. Identify specific issues that don't match PHF aesthetic
4. Provide actionable recommendations for improvement
5. Determine if content should pass, be adjusted, or regenerated
`;
}
```

---

## Step 3: Update Scene Analysis Service

Update `server/services/scene-analysis-service.ts`:

### Add import:
```typescript
import { brandContextService } from './brand-context-service';
```

### Update analyzeScene method:

```typescript
async analyzeScene(
  frameBase64: string,
  sceneContext: {
    sceneType: string;
    narration: string;
    sceneIndex: number;
    expectedContentType: string;
  }
): Promise<SceneAnalysisResult> {
  console.log(`[SceneAnalysis] Analyzing scene ${sceneContext.sceneIndex + 1} with brand context...`);

  // Load brand visual context
  const visualContext = await brandContextService.getVisualAnalysisContextFull();

  const response = await this.anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
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
            text: this.buildBrandAwareAnalysisPrompt(sceneContext, visualContext),
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  return this.parseBrandAwareAnalysisResponse(content.text);
}

private buildBrandAwareAnalysisPrompt(
  sceneContext: {
    sceneType: string;
    narration: string;
    sceneIndex: number;
    expectedContentType: string;
  },
  visualContext: string
): string {
  return `Analyze this video frame for Pine Hill Farm brand alignment.

${visualContext}

SCENE CONTEXT:
- Scene Type: ${sceneContext.sceneType}
- Scene Number: ${sceneContext.sceneIndex + 1}
- Expected Content: ${sceneContext.expectedContentType}
- Narration: "${sceneContext.narration}"

ANALYSIS REQUIRED:

1. **Technical Quality**
   - Resolution and sharpness
   - Exposure and contrast
   - Focus accuracy

2. **Composition**
   - Framing and rule of thirds
   - Subject placement
   - Visual balance

3. **Brand Aesthetic Alignment** (CRITICAL)
   Score each element 0-25:
   
   a) LIGHTING (0-25):
      - Is it warm and golden? Or cold and clinical?
      - Natural or artificial feeling?
   
   b) COLOR PALETTE (0-25):
      - Earth tones (green, brown, gold)? Or cold blues/grays?
      - Brand color alignment?
   
   c) SETTING/ENVIRONMENT (0-25):
      - Natural, farm, home, wellness? Or clinical, corporate?
      - Organic textures present?
   
   d) AUTHENTICITY/FEEL (0-25):
      - Real and warm? Or stock-photo/corporate?
      - Would target audience (women 35-65) connect?

4. **Scene Type Appropriateness**
   - Does this visual match a "${sceneContext.sceneType}" scene?
   - Does it support the narration?

Return JSON:
{
  "technical": {
    "score": 0-100,
    "issues": []
  },
  "composition": {
    "score": 0-100,
    "notes": ""
  },
  "brandAlignment": {
    "lighting": {
      "score": 0-25,
      "assessment": "warm/neutral/cold",
      "issue": "description if score < 20"
    },
    "colorPalette": {
      "score": 0-25,
      "assessment": "earth tones/neutral/cold tones",
      "issue": "description if score < 20"
    },
    "setting": {
      "score": 0-25,
      "assessment": "natural/neutral/clinical",
      "issue": "description if score < 20"
    },
    "authenticity": {
      "score": 0-25,
      "assessment": "authentic/generic/artificial",
      "issue": "description if score < 20"
    },
    "totalScore": 0-100,
    "overallAssessment": "on-brand/needs-adjustment/off-brand"
  },
  "sceneTypeMatch": {
    "appropriate": true/false,
    "notes": ""
  },
  "recommendation": "pass/adjust/regenerate",
  "suggestedImprovements": [
    "specific actionable improvement"
  ]
}`;
}

private parseBrandAwareAnalysisResponse(text: string): SceneAnalysisResult {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Log brand alignment results
    const brandScore = parsed.brandAlignment?.totalScore || 0;
    console.log(`[SceneAnalysis] Brand alignment: ${brandScore}/100 - ${parsed.brandAlignment?.overallAssessment}`);

    if (brandScore < 70) {
      console.log(`[SceneAnalysis] Brand issues:`);
      if (parsed.brandAlignment?.lighting?.score < 20) {
        console.log(`  - Lighting: ${parsed.brandAlignment.lighting.issue}`);
      }
      if (parsed.brandAlignment?.colorPalette?.score < 20) {
        console.log(`  - Colors: ${parsed.brandAlignment.colorPalette.issue}`);
      }
      if (parsed.brandAlignment?.setting?.score < 20) {
        console.log(`  - Setting: ${parsed.brandAlignment.setting.issue}`);
      }
      if (parsed.brandAlignment?.authenticity?.score < 20) {
        console.log(`  - Feel: ${parsed.brandAlignment.authenticity.issue}`);
      }
    }

    return {
      technical: parsed.technical,
      composition: parsed.composition,
      brandAlignment: parsed.brandAlignment,
      sceneTypeMatch: parsed.sceneTypeMatch,
      recommendation: parsed.recommendation,
      suggestedImprovements: parsed.suggestedImprovements || [],
      overallScore: this.calculateOverallScore(parsed),
    };

  } catch (error: any) {
    console.error('[SceneAnalysis] Failed to parse response:', error.message);
    throw error;
  }
}

private calculateOverallScore(parsed: any): number {
  const technicalWeight = 0.25;
  const compositionWeight = 0.25;
  const brandWeight = 0.50; // Brand alignment is most important

  const technicalScore = parsed.technical?.score || 70;
  const compositionScore = parsed.composition?.score || 70;
  const brandScore = parsed.brandAlignment?.totalScore || 70;

  return Math.round(
    technicalScore * technicalWeight +
    compositionScore * compositionWeight +
    brandScore * brandWeight
  );
}
```

---

## Step 4: Update Scene Analysis Result Type

```typescript
export interface SceneAnalysisResult {
  technical: {
    score: number;
    issues: string[];
  };
  composition: {
    score: number;
    notes: string;
  };
  brandAlignment: {
    lighting: {
      score: number;
      assessment: string;
      issue?: string;
    };
    colorPalette: {
      score: number;
      assessment: string;
      issue?: string;
    };
    setting: {
      score: number;
      assessment: string;
      issue?: string;
    };
    authenticity: {
      score: number;
      assessment: string;
      issue?: string;
    };
    totalScore: number;
    overallAssessment: 'on-brand' | 'needs-adjustment' | 'off-brand';
  };
  sceneTypeMatch: {
    appropriate: boolean;
    notes: string;
  };
  recommendation: 'pass' | 'adjust' | 'regenerate';
  suggestedImprovements: string[];
  overallScore: number;
}
```

---

## Verification Checklist

Before moving to Phase 6D, confirm:

- [ ] `visual-guidelines.md` created with full guidelines
- [ ] Brand context service loads visual guidelines
- [ ] Scene analysis includes brand alignment scoring
- [ ] Each brand element scored individually (lighting, colors, setting, feel)
- [ ] Total brand alignment score calculated correctly
- [ ] Brand issues logged to console
- [ ] Recommendations based on brand alignment
- [ ] Overall score weights brand alignment at 50%
- [ ] Suggested improvements are brand-specific

---

## Example Analysis Output

```json
{
  "technical": {
    "score": 88,
    "issues": []
  },
  "composition": {
    "score": 82,
    "notes": "Good framing, subject slightly left of center"
  },
  "brandAlignment": {
    "lighting": {
      "score": 15,
      "assessment": "cold",
      "issue": "Lighting is blue-tinted and clinical, should be warm golden tones"
    },
    "colorPalette": {
      "score": 18,
      "assessment": "neutral",
      "issue": "Gray and blue tones dominate, missing earth tones"
    },
    "setting": {
      "score": 12,
      "assessment": "clinical",
      "issue": "Appears to be office/clinical environment, should be natural/home"
    },
    "authenticity": {
      "score": 20,
      "assessment": "generic",
      "issue": "Has stock photo feel, needs more authentic expression"
    },
    "totalScore": 65,
    "overallAssessment": "off-brand"
  },
  "sceneTypeMatch": {
    "appropriate": true,
    "notes": "Content matches 'problem' scene type"
  },
  "recommendation": "regenerate",
  "suggestedImprovements": [
    "Add warm color grading (2700K-3200K color temperature)",
    "Change setting to home kitchen or natural environment",
    "Include organic textures like wood or plants",
    "Capture more authentic, relatable expression"
  ],
  "overallScore": 72
}
```

---

## Troubleshooting

### "Visual guidelines not loading"
- Check file path in brand context service
- Verify markdown file exists
- Check for file permission issues

### "Brand scores always neutral"
- Ensure full visual context is being passed
- Check Claude is receiving the image properly
- Verify prompt includes scoring rubric

### "Recommendations not matching scores"
- Check score thresholds in prompt
- Verify recommendation logic in parser

---

## Next Phase

Once Visual Analysis Context is working, proceed to **Phase 6D: Quality Evaluation Context** to add brand compliance to the quality assurance system.
