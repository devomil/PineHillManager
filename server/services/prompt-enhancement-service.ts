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
   * 
   * IMPORTANT: If the original prompt is detailed (from Ask Suzzie), use it as the 
   * PRIMARY focus and only add quality terms. Generic guidance dilutes specificity.
   */
  async enhanceVideoPrompt(
    originalPrompt: string,
    options: PromptEnhancementOptions
  ): Promise<EnhancedPrompt> {
    const bible = await brandBibleService.getBrandBible();
    
    console.log(`[PromptEnhance] Enhancing prompt for ${options.sceneType} scene`);
    
    // Detect if this is a detailed visual direction (from Ask Suzzie or user-crafted)
    // Detailed directions typically have: 50+ words, multiple sentences, specific descriptors
    const isDetailedDirection = this.isDetailedVisualDirection(originalPrompt);
    
    // Build enhanced prompt parts
    const enhancedParts: string[] = [];
    
    if (isDetailedDirection) {
      // DETAILED MODE: Visual direction IS the prompt, only add quality terms
      console.log(`[PromptEnhance] DETAILED MODE: Using visual direction as primary prompt`);
      
      // 1. Original prompt FIRST (cleaned) - this is the core
      enhancedParts.push(this.cleanPrompt(originalPrompt));
      
      // 2. Minimal quality enhancers only
      enhancedParts.push('cinematic 4K, smooth motion, professional quality');
      
    } else {
      // BASIC MODE: Short/vague prompt needs full enhancement
      console.log(`[PromptEnhance] BASIC MODE: Adding full brand context and guidance`);
      
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
    }
    
    // Build comprehensive negative prompt
    const negativePrompt = this.buildNegativePrompt(bible, options);
    
    const enhancedPrompt = enhancedParts.filter(p => p.length > 0).join('. ');
    
    console.log(`[PromptEnhance] Mode: ${isDetailedDirection ? 'DETAILED' : 'BASIC'}`);
    console.log(`[PromptEnhance] Final prompt: "${enhancedPrompt.substring(0, 100)}..."`);
    console.log(`[PromptEnhance] Negative: "${negativePrompt.substring(0, 80)}..."`);
    
    return {
      prompt: enhancedPrompt,
      negativePrompt,
      brandContext: bible.promptContext,
    };
  }

  /**
   * Detect if a prompt is a detailed visual direction (should be used as-is)
   * vs a basic/short prompt that needs full enhancement
   */
  private isDetailedVisualDirection(prompt: string): boolean {
    if (!prompt) return false;
    
    const wordCount = prompt.split(/\s+/).length;
    const sentenceCount = (prompt.match(/[.!?]+/g) || []).length;
    
    // Detailed direction indicators:
    // - Has 30+ words (typical Ask Suzzie output is 50-80 words)
    // - Has multiple sentences (2+)
    // - Contains specific visual terms
    const hasSpecificTerms = /\b(camera|angle|shot|lighting|golden hour|close-up|medium|wide|composition|rule of thirds|eye level|diffused|dappled|warm|palette|earth tones|foreground|background)\b/i.test(prompt);
    
    const isDetailed = (wordCount >= 30 && sentenceCount >= 2) || 
                       (wordCount >= 20 && hasSpecificTerms);
    
    if (isDetailed) {
      console.log(`[PromptEnhance] Detected DETAILED direction: ${wordCount} words, ${sentenceCount} sentences, specific terms: ${hasSpecificTerms}`);
    }
    
    return isDetailed;
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
   * Critical anti-hallucination terms that MUST be in every negative prompt
   * These are explicitly defined here to guarantee safety regardless of BrandBible content
   */
  private readonly CRITICAL_SAFETY_TERMS: string[] = [
    // Text prevention (critical for AI hallucination)
    'no text', 'no words', 'no letters', 'no writing',
    'no captions', 'no subtitles', 'no titles', 'no labels',
    'no generated text', 'no text overlays',
    
    // UI prevention (prevents fake interfaces)
    'no calendars', 'no charts', 'no graphs', 'no infographics',
    'no user interface', 'no UI elements', 'no buttons', 'no menus',
    'no spreadsheets', 'no tables', 'no data visualizations',
    'no fake screenshots', 'no mock interfaces', 'no artificial UI',
    
    // Quality and branding
    'no watermarks', 'no logos', 'no blur', 'no artifacts', 'no distortion',
  ];

  /**
   * Build comprehensive negative prompt with deduplication
   */
  private buildNegativePrompt(bible: BrandBible, options: PromptEnhancementOptions): string {
    // Use Set to prevent duplicates
    const negativeSet = new Set<string>();
    
    // 1. Add critical safety terms first (guaranteed to be present)
    this.CRITICAL_SAFETY_TERMS.forEach(term => negativeSet.add(term));
    
    // 2. Add brand bible negative prompts
    bible.negativePrompts.forEach(term => negativeSet.add(term));
    
    // 3. Add scene-type specific exclusions
    if (['hook', 'testimonial', 'story'].includes(options.sceneType)) {
      negativeSet.add('no stock photo feel');
      negativeSet.add('no corporate sterile look');
      negativeSet.add('no fake smile');
      negativeSet.add('no posed feeling');
    }
    
    if (options.sceneType === 'product') {
      negativeSet.add('no cluttered background');
      negativeSet.add('no distracting elements');
      negativeSet.add('no harsh shadows');
    }
    
    if (options.sceneType === 'problem') {
      negativeSet.add('no overly dramatic');
      negativeSet.add('no unrealistic portrayal');
    }
    
    // 4. Add content-type specific exclusions
    if (options.contentType === 'person') {
      negativeSet.add('no deformed faces');
      negativeSet.add('no extra limbs');
      negativeSet.add('no unnatural proportions');
      negativeSet.add('no distorted features');
    }
    
    if (options.contentType === 'product') {
      negativeSet.add('no floating objects');
      negativeSet.add('no unrealistic reflections');
    }
    
    // 5. Add any custom exclusions passed in options
    if (options.excludeElements && options.excludeElements.length > 0) {
      options.excludeElements.forEach(e => negativeSet.add(`no ${e}`));
    }
    
    // Convert to array and join
    return Array.from(negativeSet).join(', ');
  }

  /**
   * Build safe negative prompt with critical terms (shared helper for all prompt types)
   * Ensures all AI generations have anti-hallucination protection
   */
  private buildSafeNegativePrompt(bible: BrandBible, additionalTerms?: string[]): string {
    const negativeSet = new Set<string>();
    
    // Always include critical safety terms first
    this.CRITICAL_SAFETY_TERMS.forEach(term => negativeSet.add(term));
    
    // Add brand bible negative prompts
    bible.negativePrompts.forEach(term => negativeSet.add(term));
    
    // Add any additional terms
    if (additionalTerms) {
      additionalTerms.forEach(term => negativeSet.add(term));
    }
    
    return Array.from(negativeSet).join(', ');
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
    
    // Use safe negative prompt with critical terms
    const negativePrompt = this.buildSafeNegativePrompt(bible);
    
    console.log(`[PromptEnhance] Enhanced image prompt for ${imageType}`);
    
    return {
      prompt: enhancedPrompt,
      negativePrompt,
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
