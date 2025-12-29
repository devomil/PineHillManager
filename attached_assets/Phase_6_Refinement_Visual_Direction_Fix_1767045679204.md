# Phase 6 Refinement: Visual Direction Over-Branding Fix

## Problem Summary

The current Phase 6 implementation is inserting "Pine Hill Farm" literally into every visual direction, creating nonsensical scenes like:
- "Pine Hill Farm kitchen" (PHF doesn't have a kitchen)
- "Pine Hill Farm consultation room" (for educational content not set at PHF)
- "Pine Hill Farm entrance" (for scenes that aren't about visiting PHF)

**Root Cause:** The AI is interpreting "brand context" as "set everything AT Pine Hill Farm" instead of "apply Pine Hill Farm's visual AESTHETIC."

## The Distinction

| Concept | Description | When to Use |
|---------|-------------|-------------|
| **Brand Aesthetic** | Warm lighting, earth tones, natural textures, authentic people | ALL scenes |
| **Brand Location** | Explicitly mentioning "Pine Hill Farm" in the scene | ONLY CTA/outro scenes |

## Files to Update

1. `server/services/script-parser-service.ts` - Update system prompt
2. `server/brand-context/pine-hill-farm.json` - Add visual direction rules
3. `server/services/brand-context-service.ts` - Add aesthetic-only context method

---

## Fix 1: Update Script Parser System Prompt

In `server/services/script-parser-service.ts`, find the `buildBrandAwareSystemPrompt` method and update the visual direction instructions:

### FIND this section (or similar):
```typescript
VISUAL STYLE FOR PINE HILL FARM:
- Warm, golden lighting (NOT clinical/cold)
- Natural settings: farm fields, gardens, cozy interiors, spa environments
```

### REPLACE with:
```typescript
VISUAL DIRECTION RULES - CRITICAL:

1. APPLY THE AESTHETIC, DON'T FORCE THE LOCATION
   
   WRONG: "Pine Hill Farm kitchen with woman preparing food"
   RIGHT: "Warm, sunlit home kitchen with natural wood counters, woman preparing fresh vegetables, golden morning light, earth tones"
   
   WRONG: "Pine Hill Farm consultation room"
   RIGHT: "Cozy wellness space with plants, natural light, warm wood furniture"
   
   WRONG: "Pine Hill Farm entrance"
   RIGHT: "Welcoming wellness center with natural landscaping" (only for CTA scenes)

2. WHEN TO EXPLICITLY MENTION "PINE HILL FARM":
   - CTA scenes (call to action, visit us, contact us)
   - Outro scenes (final branding moment)
   - Product showcase scenes (PHF supplements, PHF CBD products)
   - NEVER in educational/informational scenes
   
3. BRAND AESTHETIC (apply to ALL scenes):
   - Warm, golden lighting (NOT clinical/cold)
   - Earth tones: greens, browns, warm golds
   - Natural textures: wood, plants, organic materials
   - Real people with authentic expressions
   - Home, garden, or wellness settings
   - Cozy, inviting atmosphere
   
4. SCENE TYPE VISUAL GUIDELINES:
   - HOOK/PROBLEM: Home setting, relatable environment, authentic person
   - EDUCATIONAL: Clean background, warm lighting, focus on subject matter
   - SOLUTION: Bright, hopeful, natural ingredients or wellness imagery
   - BENEFIT: Lifestyle imagery, transformation, vitality
   - CTA: Pine Hill Farm branding, logo, contact info, welcoming entrance

5. WHAT THE VISUAL DIRECTION SHOULD DESCRIBE:
   - Lighting quality and color temperature
   - Setting type (home kitchen, living room, garden, wellness space)
   - Subject (person demographics, expression, activity)
   - Textures and materials visible
   - Color palette
   - Camera framing/angle
   - Mood and atmosphere
   
   DO NOT describe fictional "Pine Hill Farm" locations that don't exist.
```

---

## Fix 2: Add Visual Direction Rules to Brand Context JSON

Update `server/brand-context/pine-hill-farm.json`, add a new section:

```json
{
  "visualDirectionRules": {
    "explicitBrandingScenes": [
      "cta",
      "outro",
      "product",
      "testimonial"
    ],
    "noBrandingScenes": [
      "hook",
      "problem",
      "agitation", 
      "solution",
      "benefit",
      "explanation",
      "process"
    ],
    "aestheticDescriptors": {
      "lighting": [
        "warm golden light",
        "soft natural light",
        "golden hour lighting",
        "warm morning light",
        "cozy ambient lighting"
      ],
      "settings": [
        "sunlit home kitchen",
        "cozy living room",
        "peaceful garden",
        "warm wellness space",
        "natural outdoor setting",
        "comfortable home environment"
      ],
      "textures": [
        "natural wood surfaces",
        "organic materials",
        "fresh plants",
        "linen and cotton fabrics",
        "ceramic and pottery"
      ],
      "colors": [
        "earth tones",
        "warm browns and greens",
        "golden accents",
        "natural cream backgrounds",
        "muted sage and terracotta"
      ],
      "subjects": [
        "authentic woman in her 40s",
        "relatable person",
        "real expression",
        "natural appearance",
        "comfortable casual clothing"
      ]
    },
    "forbiddenPhrases": [
      "Pine Hill Farm kitchen",
      "Pine Hill Farm living room", 
      "Pine Hill Farm garden",
      "Pine Hill Farm consultation room",
      "Pine Hill Farm office",
      "at Pine Hill Farm"
    ],
    "allowedBrandPhrases": [
      "Pine Hill Farm wellness center",
      "Pine Hill Farm products",
      "Pine Hill Farm logo",
      "Pine Hill Farm entrance",
      "visit Pine Hill Farm"
    ]
  }
}
```

---

## Fix 3: Add Aesthetic-Only Context Method

In `server/services/brand-context-service.ts`, add a new method:

```typescript
/**
 * Get aesthetic-only context for visual directions (no brand location forcing)
 */
async getAestheticOnlyContext(): Promise<string> {
  const data = await this.loadBrandContext();
  
  return `
VISUAL AESTHETIC GUIDELINES (Apply style, NOT location):

LIGHTING: ${data.visualDirectionRules?.aestheticDescriptors?.lighting?.join(', ') || 'warm golden light, soft natural light, golden hour lighting'}

SETTINGS: ${data.visualDirectionRules?.aestheticDescriptors?.settings?.join(', ') || 'sunlit home kitchen, cozy living room, peaceful garden, warm wellness space'}

TEXTURES: ${data.visualDirectionRules?.aestheticDescriptors?.textures?.join(', ') || 'natural wood surfaces, organic materials, fresh plants'}

COLORS: ${data.visualDirectionRules?.aestheticDescriptors?.colors?.join(', ') || 'earth tones, warm browns and greens, golden accents'}

SUBJECTS: ${data.visualDirectionRules?.aestheticDescriptors?.subjects?.join(', ') || 'authentic woman in her 40s, relatable person, real expression'}

CRITICAL RULE: Do NOT write "Pine Hill Farm [location]" in visual directions.
Write generic settings that MATCH the aesthetic instead.

WRONG: "Pine Hill Farm kitchen"
RIGHT: "Warm, sunlit home kitchen with natural wood counters"

Only mention "Pine Hill Farm" explicitly in CTA or product scenes.
`;
}

/**
 * Check if scene type should have explicit branding
 */
shouldIncludeExplicitBranding(sceneType: string): boolean {
  const explicitBrandingScenes = ['cta', 'outro', 'product', 'testimonial'];
  return explicitBrandingScenes.includes(sceneType.toLowerCase());
}
```

---

## Fix 4: Update Visual Direction Generation

When generating visual directions, check scene type:

```typescript
// In script parser or visual direction service
const shouldBrand = brandContextService.shouldIncludeExplicitBranding(scene.type);

if (shouldBrand) {
  // Use full brand context - can mention Pine Hill Farm
  context = await brandContextService.getVisualAnalysisContext();
} else {
  // Use aesthetic-only context - no Pine Hill Farm locations
  context = await brandContextService.getAestheticOnlyContext();
}
```

---

## Expected Results After Fix

### Before (Over-Branded):
```
Scene 1 (Hook):
Visual Direction: "Warm golden hour lighting in Pine Hill Farm kitchen, 
authentic woman 40s preparing fresh ingredients..."
```

### After (Aesthetic-Aligned):
```
Scene 1 (Hook):
Visual Direction: "Warm golden hour lighting in sunlit home kitchen, 
authentic woman in her 40s preparing fresh vegetables, natural wood 
counters, colorful organic produce, soft morning light through windows"
```

### CTA Scene (Appropriate Branding):
```
Scene 8 (CTA):
Visual Direction: "Pine Hill Farm wellness center entrance with warm 
welcome lighting, peaceful natural landscaping, logo visible, 
contact information overlay, inviting and approachable atmosphere"
```

---

## Verification Checklist

After implementing these fixes, verify:

- [ ] Educational scenes do NOT mention "Pine Hill Farm [location]"
- [ ] CTA/outro scenes DO include Pine Hill Farm branding
- [ ] Visual directions describe lighting, setting, textures, colors
- [ ] Settings are generic but match brand aesthetic
- [ ] "Pine Hill Farm kitchen" and similar phrases no longer appear
- [ ] Brand aesthetic (warm, natural, earth tones) still applied to all scenes
- [ ] Product scenes can mention "Pine Hill Farm products/supplements"

---

## Test Script

Re-run the weight loss script through the parser and check that:

1. Hook scene: "home kitchen" not "Pine Hill Farm kitchen"
2. Educational scenes: "wellness space" not "Pine Hill Farm consultation room"
3. CTA scene: Can include "Pine Hill Farm" branding appropriately

---

## Summary

This refinement separates:
- **Brand Aesthetic** (warm lighting, earth tones, natural textures) → Apply everywhere
- **Brand Location** (explicitly mentioning Pine Hill Farm) → Only CTA/outro scenes

The AI will still create on-brand visuals, but won't invent fictional "Pine Hill Farm" locations.
