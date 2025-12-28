# Phase 4B: Prompt Enhancement Service

## Objective

Create a service that enhances all AI generation prompts with brand context and mandatory negative prompts. This prevents AI text hallucination (garbled text like "peocineate") and ensures content matches the brand.

## Prerequisites

- Phase 4A complete (`brand-bible-service.ts` exists and working)
- `brandBibleService` exports brand context and negative prompts

## What This Phase Creates

- `server/services/prompt-enhancement-service.ts` - Enhances prompts for all AI services

## What Success Looks Like

```
[PromptEnhance] Enhancing prompt for hook scene
[PromptEnhance] Original: "person looking frustrated on bathroom scale..."
[PromptEnhance] Added brand context: "For Pine Hill Farm, a wellness..."
[PromptEnhance] Negative prompt: "no text, no words, no letters, no UI elements..."
```

---

## Step 1: Create Prompt Enhancement Service

Create `server/services/prompt-enhancement-service.ts`:

```typescript
// server/services/prompt-enhancement-service.ts

import { brandBibleService, BrandBible } from './brand-bible-service';

export interface EnhancedPrompt {
  prompt: string;
  negativePrompt: string;
  brandContext: string;
}

export interface PromptEnhancementOptions {
  sceneType: string;
  narration?: string;
  visualDirection?: string;
  mood?: string;
  contentType?: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
  excludeElements?: string[];
}

class PromptEnhancementService {
  
  /**
   * Enhance a video generation prompt with brand context and safety measures
   */
  async enhanceVideoPrompt(
    originalPrompt: string,
    options: PromptEnhancementOptions
  ): Promise<EnhancedPrompt> {
    const bible = await brandBibleService.getBrandBible();
    
    console.log(`[PromptEnhance] Enhancing prompt for ${options.sceneType} scene`);
    
    // Build enhanced prompt parts
    const enhancedParts: string[] = [];
    
    // 1. Brand context first
    enhancedParts.push(bible.promptContext);
    
    // 2. Scene-type specific guidance
    enhancedParts.push(this.getSceneTypeGuidance(options.sceneType));
    
    // 3. Content-type guidance if specified
    if (options.contentType) {
      enhancedParts.push(this.getContentTypeGuidance(options.contentType));
    }
    
    // 4. Mood guidance if specified
    if (options.mood) {
      enhancedParts.push(this.getMoodGuidance(options.mood));
    }
    
    // 5. Original prompt (cleaned of problematic elements)
    enhancedParts.push(this.cleanPrompt(originalPrompt));
    
    // 6. Quality enhancers
    enhancedParts.push('cinematic quality, professional videography, 4K, smooth motion');
    
    // Build comprehensive negative prompt
    const negativePrompt = this.buildNegativePrompt(bible, options);
    
    const enhancedPrompt = enhancedParts.filter(p => p.length > 0).join('. ');
    
    console.log(`[PromptEnhance] Original: "${originalPrompt.substring(0, 50)}..."`);
    console.log(`[PromptEnhance] Negative: "${negativePrompt.substring(0, 80)}..."`);
    
    return {
      prompt: enhancedPrompt,
      negativePrompt,
      brandContext: bible.promptContext,
    };
  }

  /**
   * Clean the original prompt of problematic elements
   */
  private cleanPrompt(prompt: string): string {
    return prompt
      // Remove instructions to add text (AI shouldn't generate text)
      .replace(/\b(with text|showing text|text overlay|text saying|caption|title|subtitle|words saying|displaying text)\b/gi, '')
      // Remove instructions to add UI elements
      .replace(/\b(calendar|chart|graph|infographic|dashboard|interface|UI|menu|spreadsheet|table)\b/gi, '')
      // Remove brand/logo mentions (we add our own branding)
      .replace(/\b(brand|logo|watermark|company name)\b/gi, '')
      // Remove quality terms that conflict with our additions
      .replace(/\b(4k|8k|hd|high quality|professional)\b/gi, '')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get guidance specific to scene type
   */
  private getSceneTypeGuidance(sceneType: string): string {
    const guidance: Record<string, string> = {
      hook: 'Opening shot, attention-grabbing, emotional connection, relatable scenario, draws viewer in',
      problem: 'Show challenge or pain point, empathetic portrayal, real-life situation, relatable struggle',
      solution: 'Reveal moment, transformation beginning, hope and possibility, turning point',
      benefit: 'Positive outcome, lifestyle improvement, wellness achievement, visible results',
      testimonial: 'Authentic person, genuine expression, trustworthy setting, natural conversation feel',
      product: 'Product showcase, clean presentation, professional lighting, hero shot, focus on item',
      cta: 'Inspiring conclusion, empowering imagery, motivational moment, call to action energy',
      explanation: 'Educational visual, clear demonstration, informative scene, easy to understand',
      broll: 'Supporting footage, ambient scene, contextual imagery, supplementary visual',
      story: 'Narrative moment, emotional journey, character-driven, storytelling visual',
    };
    
    return guidance[sceneType] || 'Professional quality, relevant to wellness content';
  }

  /**
   * Get guidance specific to content type
   */
  private getContentTypeGuidance(contentType: string): string {
    const guidance: Record<string, string> = {
      person: 'Real person, natural expression, authentic moment, warm lighting, lifestyle setting, genuine emotion',
      product: 'Product photography style, clean background, professional studio lighting, focus on item details',
      nature: 'Natural environment, organic textures, calming atmosphere, outdoor setting, peaceful scenery',
      abstract: 'Artistic interpretation, subtle motion, ambient mood, non-literal representation, conceptual',
      lifestyle: 'Day-in-the-life scene, relatable activity, wellness context, aspirational but achievable',
    };
    
    return guidance[contentType] || '';
  }

  /**
   * Get guidance specific to mood
   */
  private getMoodGuidance(mood: string): string {
    const guidance: Record<string, string> = {
      positive: 'Uplifting atmosphere, warm colors, bright lighting, joyful energy, optimistic feel',
      negative: 'Challenging moment, muted tones, relatable struggle, empathetic portrayal, before transformation',
      dramatic: 'High contrast, cinematic lighting, impactful composition, emotional weight, powerful',
      calm: 'Peaceful atmosphere, soft lighting, gentle motion, serene environment, relaxing',
      energetic: 'Dynamic movement, vibrant energy, active scene, lively composition, motivating',
      inspirational: 'Aspirational imagery, triumphant feeling, achievement moment, hopeful, empowering',
    };
    
    return guidance[mood] || '';
  }

  /**
   * Build comprehensive negative prompt
   */
  private buildNegativePrompt(bible: BrandBible, options: PromptEnhancementOptions): string {
    // Start with base negative prompts from brand bible
    const negatives: string[] = [...bible.negativePrompts];
    
    // Add scene-type specific exclusions
    if (['hook', 'testimonial', 'story'].includes(options.sceneType)) {
      negatives.push('no stock photo feel', 'no corporate sterile look', 'no fake smile', 'no posed feeling');
    }
    
    if (options.sceneType === 'product') {
      negatives.push('no cluttered background', 'no distracting elements', 'no harsh shadows');
    }
    
    if (options.sceneType === 'problem') {
      negatives.push('no overly dramatic', 'no unrealistic portrayal');
    }
    
    // Add content-type specific exclusions
    if (options.contentType === 'person') {
      negatives.push('no deformed faces', 'no extra limbs', 'no unnatural proportions', 'no distorted features');
    }
    
    if (options.contentType === 'product') {
      negatives.push('no floating objects', 'no unrealistic reflections');
    }
    
    // Add any custom exclusions passed in options
    if (options.excludeElements && options.excludeElements.length > 0) {
      negatives.push(...options.excludeElements.map(e => `no ${e}`));
    }
    
    // Always add these critical exclusions for all videos
    negatives.push(
      'no text overlays',
      'no generated text',
      'no fake screenshots',
      'no mock interfaces',
      'no artificial UI'
    );
    
    return negatives.join(', ');
  }

  /**
   * Enhance an image generation prompt
   */
  async enhanceImagePrompt(
    originalPrompt: string,
    imageType: 'product' | 'lifestyle' | 'hero' | 'overlay'
  ): Promise<EnhancedPrompt> {
    const bible = await brandBibleService.getBrandBible();
    
    const typeGuidance: Record<string, string> = {
      product: `${bible.brandName} product, professional product photography, studio lighting, clean white background, commercial quality, sharp focus`,
      lifestyle: `${bible.brandName} lifestyle imagery, natural setting, warm lighting, wellness aesthetic, authentic moment`,
      hero: `${bible.brandName} hero shot, dramatic lighting, premium quality, brand showcase, impactful composition`,
      overlay: `Clean product image, transparent background style, suitable for video overlay, sharp edges, professional cutout`,
    };
    
    const enhancedPrompt = `${typeGuidance[imageType]}. ${this.cleanPrompt(originalPrompt)}`;
    
    return {
      prompt: enhancedPrompt,
      negativePrompt: bible.negativePrompts.join(', '),
      brandContext: bible.promptContext,
    };
  }

  /**
   * Enhance music generation prompt
   */
  async enhanceMusicPrompt(
    mood: string,
    style: string,
    duration: number
  ): Promise<string> {
    const bible = await brandBibleService.getBrandBible();
    
    const parts = [
      `Background music for ${bible.brandName} wellness video`,
      `${mood} ${style} music`,
      'professional quality',
      'no vocals',
      'suitable for voiceover',
      `${duration} seconds long`,
    ];
    
    return parts.join(', ');
  }

  /**
   * Get negative prompt string for direct use
   */
  async getNegativePrompt(options?: Partial<PromptEnhancementOptions>): Promise<string> {
    const bible = await brandBibleService.getBrandBible();
    return this.buildNegativePrompt(bible, {
      sceneType: options?.sceneType || 'general',
      ...options,
    });
  }
}

export const promptEnhancementService = new PromptEnhancementService();
```

---

## Step 2: Test the Service

Add a temporary test route to verify prompt enhancement:

```typescript
// Temporary test - add to routes.ts
router.post('/api/test-prompt-enhance', async (req, res) => {
  try {
    const { prompt, sceneType, contentType, mood } = req.body;
    
    const enhanced = await promptEnhancementService.enhanceVideoPrompt(
      prompt || 'person looking at healthy food in kitchen',
      {
        sceneType: sceneType || 'lifestyle',
        contentType: contentType || 'person',
        mood: mood || 'positive',
      }
    );
    
    res.json({
      original: prompt,
      enhanced: enhanced.prompt,
      negativePrompt: enhanced.negativePrompt,
      negativePromptLength: enhanced.negativePrompt.split(', ').length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

Test with:
```bash
curl -X POST http://localhost:5000/api/test-prompt-enhance \
  -H "Content-Type: application/json" \
  -d '{"prompt": "woman checking calendar for meal prep", "sceneType": "hook"}'
```

Expected: The word "calendar" should be removed from the prompt, and negative prompt should include "no calendars".

---

## Verification Checklist

Before moving to Phase 4C, confirm:

- [ ] `server/services/prompt-enhancement-service.ts` exists
- [ ] Service exports `promptEnhancementService` singleton
- [ ] Service exports `EnhancedPrompt` and `PromptEnhancementOptions` interfaces
- [ ] `cleanPrompt()` removes text/UI/calendar references
- [ ] Scene type guidance is appropriate for each type
- [ ] Negative prompt includes all anti-hallucination terms
- [ ] Console logging shows enhancement process
- [ ] Test endpoint returns enhanced prompt without problematic terms

---

## Key Anti-Hallucination Terms

The negative prompt MUST include these terms to prevent the issues seen in test videos:

```
Text Prevention:
- no text, no words, no letters, no writing
- no captions, no subtitles, no titles, no labels

UI Prevention:
- no calendars, no charts, no graphs, no infographics
- no user interface, no UI elements, no buttons, no menus
- no spreadsheets, no tables, no data visualizations

Quality:
- no watermarks, no logos (we add our own)
- no blur, no artifacts, no distortion
```

---

## Troubleshooting

### "brandBibleService is not defined"
- Check import path: `import { brandBibleService } from './brand-bible-service'`
- Verify Phase 4A is complete

### Prompts not being cleaned
- Check regex patterns in `cleanPrompt()`
- Test with specific problematic terms

### Negative prompt too long
- Some AI APIs have character limits
- May need to prioritize most important terms
- Runway: 500 char limit on negative prompt

---

## Next Phase

Once prompt enhancement is working, proceed to **Phase 4C: Brand Asset Injection** to generate logo and watermark overlay instructions.
