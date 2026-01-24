# Phase 5B-R: Visual Style System Revision

## Objective

Replace the current 12-style visual system with a streamlined 6-style purpose-driven system. Each style maps directly to campaign goals and provider routing logic.

## Why This Change

The current system mixes production quality, emotional tone, and use-case into 12 overlapping options:
- Professional, Cinematic, Energetic, Calm & Peaceful
- Casual, Documentary, Luxury & Premium, Minimal & Modern
- Instructional, Educational, Training

**Problems:**
1. Redundant styles route to same providers with similar prompts
2. Style names don't communicate marketing purpose
3. Decision paralysis for users
4. Training/Instructional/Educational are distribution contexts, not visual styles

## New 6-Style System

| Style ID | Display Name | Primary Use Case | Provider Priority |
|----------|--------------|------------------|-------------------|
| `hero` | Hero (Cinematic) | Brand anthems, emotional storytelling | Runway → Kling |
| `lifestyle` | Lifestyle | Customer scenarios, testimonials | Kling → Runway |
| `product` | Product Showcase | Product reveals, features, I2V | Luma → Runway |
| `educational` | Educational | How-to, explainers, health benefits | Kling → Hailuo |
| `social` | Social (Energetic) | TikTok/Reels, fast-paced promos | Hailuo → Kling |
| `premium` | Premium | Luxury positioning, high-end retail | Runway → Luma |

---

## Step 1: Update Visual Style Configuration

Replace the contents of `shared/visual-style-config.ts`:

```typescript
// shared/visual-style-config.ts

export interface VisualStyleConfig {
  id: string;
  name: string;
  description: string;
  
  // Provider preferences (order matters - first is most preferred)
  preferredVideoProviders: string[];
  preferredImageProviders: string[];
  
  // Prompt enhancement settings
  promptModifiers: {
    mood: string;
    lighting: string;
    cameraWork: string;
    colorGrade: string;
    pacing: string;
  };
  
  // Content type defaults by scene type
  defaultContentTypes: {
    hook: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
    problem: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
    solution: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
    benefit: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
    cta: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
  };
  
  // Music preferences
  musicStyle: {
    genre: string;
    mood: string;
    tempo: 'slow' | 'medium' | 'fast';
    energy: 'low' | 'medium' | 'high';
  };
  
  // Transition preferences
  transitions: {
    defaultType: 'cut' | 'fade' | 'dissolve' | 'wipe' | 'zoom';
    defaultDuration: number;
  };
  
  // Prompt additions
  stylePromptSuffix: string;
  negativePromptAdditions: string[];
}

export const VISUAL_STYLES: Record<string, VisualStyleConfig> = {
  
  // ============================================
  // HERO (CINEMATIC) - Brand anthems, emotional storytelling
  // ============================================
  hero: {
    id: 'hero',
    name: 'Hero (Cinematic)',
    description: 'Dramatic, film-quality visuals for brand anthems and emotional storytelling',
    
    preferredVideoProviders: ['runway', 'kling', 'luma'],
    preferredImageProviders: ['flux', 'ideogram'],
    
    promptModifiers: {
      mood: 'dramatic, emotional, inspiring, epic',
      lighting: 'cinematic lighting, dramatic shadows, golden hour, volumetric light',
      cameraWork: 'sweeping camera movements, depth of field, wide establishing shots, slow motion',
      colorGrade: 'cinematic color grading, teal and orange, rich contrast, film look',
      pacing: 'deliberate pacing, dramatic pauses, building tension, emotional beats',
    },
    
    defaultContentTypes: {
      hook: 'nature',
      problem: 'person',
      solution: 'lifestyle',
      benefit: 'lifestyle',
      cta: 'person',
    },
    
    musicStyle: {
      genre: 'orchestral cinematic',
      mood: 'epic, emotional, inspiring',
      tempo: 'slow',
      energy: 'high',
    },
    
    transitions: {
      defaultType: 'fade',
      defaultDuration: 1.0,
    },
    
    stylePromptSuffix: 'cinematic quality, film grain, anamorphic lens feel, movie-like production value',
    negativePromptAdditions: ['flat lighting', 'static camera', 'boring composition', 'amateur', 'stock footage feel'],
  },

  // ============================================
  // LIFESTYLE - Customer scenarios, testimonials
  // ============================================
  lifestyle: {
    id: 'lifestyle',
    name: 'Lifestyle',
    description: 'Warm, relatable visuals for customer-facing content and testimonials',
    
    preferredVideoProviders: ['kling', 'runway', 'hailuo'],
    preferredImageProviders: ['flux', 'ideogram'],
    
    promptModifiers: {
      mood: 'warm, authentic, relatable, inviting',
      lighting: 'natural soft lighting, warm tones, window light, golden hour',
      cameraWork: 'steady handheld feel, eye-level angles, intimate framing, natural movement',
      colorGrade: 'warm color palette, natural skin tones, soft contrast',
      pacing: 'conversational pacing, natural rhythm, comfortable flow',
    },
    
    defaultContentTypes: {
      hook: 'person',
      problem: 'person',
      solution: 'lifestyle',
      benefit: 'lifestyle',
      cta: 'person',
    },
    
    musicStyle: {
      genre: 'acoustic folk indie',
      mood: 'warm, hopeful, authentic',
      tempo: 'medium',
      energy: 'medium',
    },
    
    transitions: {
      defaultType: 'dissolve',
      defaultDuration: 0.6,
    },
    
    stylePromptSuffix: 'authentic lifestyle photography, real moments, natural and unposed feel',
    negativePromptAdditions: ['staged', 'corporate', 'clinical', 'cold lighting', 'stock photo feel'],
  },

  // ============================================
  // PRODUCT SHOWCASE - Product reveals, features, I2V
  // ============================================
  product: {
    id: 'product',
    name: 'Product Showcase',
    description: 'Clean, focused visuals for product reveals and feature highlights',
    
    preferredVideoProviders: ['luma', 'runway', 'kling'],
    preferredImageProviders: ['flux', 'ideogram'],
    
    promptModifiers: {
      mood: 'clean, premium, focused, confident',
      lighting: 'studio lighting, soft shadows, product lighting, clean highlights',
      cameraWork: 'smooth orbits, slow reveals, macro details, turntable motion',
      colorGrade: 'clean whites, accurate colors, subtle contrast, premium feel',
      pacing: 'measured reveals, deliberate focus, detail moments',
    },
    
    defaultContentTypes: {
      hook: 'product',
      problem: 'lifestyle',
      solution: 'product',
      benefit: 'product',
      cta: 'product',
    },
    
    musicStyle: {
      genre: 'minimal electronic ambient',
      mood: 'modern, clean, sophisticated',
      tempo: 'slow',
      energy: 'low',
    },
    
    transitions: {
      defaultType: 'fade',
      defaultDuration: 0.8,
    },
    
    stylePromptSuffix: 'product photography, studio quality, clean background, professional commercial',
    negativePromptAdditions: ['cluttered', 'busy background', 'poor lighting', 'amateur product shot'],
  },

  // ============================================
  // EDUCATIONAL - How-to, explainers, health benefits
  // ============================================
  educational: {
    id: 'educational',
    name: 'Educational',
    description: 'Clear, informative visuals for tutorials and health benefit content',
    
    preferredVideoProviders: ['kling', 'hailuo', 'runway'],
    preferredImageProviders: ['flux', 'ideogram'],
    
    promptModifiers: {
      mood: 'clear, trustworthy, informative, helpful',
      lighting: 'bright, even lighting, well-lit, clear visibility',
      cameraWork: 'steady shots, clear framing, demonstration angles, step-by-step views',
      colorGrade: 'natural colors, good contrast, clear and readable',
      pacing: 'instructional pacing, clear beats, time for comprehension',
    },
    
    defaultContentTypes: {
      hook: 'person',
      problem: 'lifestyle',
      solution: 'product',
      benefit: 'lifestyle',
      cta: 'person',
    },
    
    musicStyle: {
      genre: 'light corporate ambient',
      mood: 'friendly, supportive, encouraging',
      tempo: 'medium',
      energy: 'medium',
    },
    
    transitions: {
      defaultType: 'dissolve',
      defaultDuration: 0.5,
    },
    
    stylePromptSuffix: 'educational content, clear demonstration, helpful visual guide',
    negativePromptAdditions: ['confusing', 'cluttered', 'dark', 'unclear', 'distracting background'],
  },

  // ============================================
  // SOCIAL (ENERGETIC) - TikTok/Reels, fast-paced promos
  // ============================================
  social: {
    id: 'social',
    name: 'Social (Energetic)',
    description: 'Fast-paced, attention-grabbing visuals for social media and promos',
    
    preferredVideoProviders: ['hailuo', 'kling', 'runway'],
    preferredImageProviders: ['ideogram', 'flux'],
    
    promptModifiers: {
      mood: 'energetic, exciting, bold, attention-grabbing',
      lighting: 'bright, high-key, punchy, vibrant colors',
      cameraWork: 'dynamic angles, quick movements, trendy shots, POV moments',
      colorGrade: 'saturated colors, high vibrance, bold contrast, pop',
      pacing: 'fast cuts, quick rhythm, punchy timing, scroll-stopping',
    },
    
    defaultContentTypes: {
      hook: 'lifestyle',
      problem: 'person',
      solution: 'product',
      benefit: 'lifestyle',
      cta: 'person',
    },
    
    musicStyle: {
      genre: 'upbeat electronic pop',
      mood: 'energetic, fun, trending',
      tempo: 'fast',
      energy: 'high',
    },
    
    transitions: {
      defaultType: 'cut',
      defaultDuration: 0.2,
    },
    
    stylePromptSuffix: 'social media style, trending aesthetic, scroll-stopping, viral potential',
    negativePromptAdditions: ['boring', 'slow', 'static', 'corporate', 'dated'],
  },

  // ============================================
  // PREMIUM - Luxury positioning, high-end retail
  // ============================================
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'Luxurious, sophisticated visuals for high-end positioning',
    
    preferredVideoProviders: ['runway', 'luma', 'kling'],
    preferredImageProviders: ['flux', 'midjourney'],
    
    promptModifiers: {
      mood: 'luxurious, sophisticated, elegant, exclusive',
      lighting: 'dramatic studio lighting, rim lights, elegant shadows, glamour lighting',
      cameraWork: 'slow, deliberate movements, elegant framing, refined composition',
      colorGrade: 'rich deep tones, subtle desaturation, luxury color palette, refined contrast',
      pacing: 'slow, luxurious pacing, breathing room, elegant timing',
    },
    
    defaultContentTypes: {
      hook: 'abstract',
      problem: 'lifestyle',
      solution: 'product',
      benefit: 'lifestyle',
      cta: 'product',
    },
    
    musicStyle: {
      genre: 'elegant orchestral ambient',
      mood: 'sophisticated, refined, aspirational',
      tempo: 'slow',
      energy: 'medium',
    },
    
    transitions: {
      defaultType: 'fade',
      defaultDuration: 1.2,
    },
    
    stylePromptSuffix: 'luxury brand aesthetic, high-end commercial, premium quality, sophisticated',
    negativePromptAdditions: ['cheap', 'budget', 'amateur', 'cluttered', 'busy', 'garish colors'],
  },
};

// Legacy style mapping for backward compatibility
const LEGACY_STYLE_MAP: Record<string, string> = {
  'professional': 'lifestyle',
  'cinematic': 'hero',
  'energetic': 'social',
  'calm': 'lifestyle',
  'casual': 'lifestyle',
  'documentary': 'educational',
  'luxury': 'premium',
  'minimal': 'product',
  'instructional': 'educational',
  'educational': 'educational',
  'training': 'educational',
  'warm': 'lifestyle',
};

/**
 * Get visual style configuration by ID
 * Handles legacy style IDs by mapping to new system
 */
export function getVisualStyleConfig(styleId: string): VisualStyleConfig {
  // Check if it's a new style ID
  if (VISUAL_STYLES[styleId]) {
    return VISUAL_STYLES[styleId];
  }
  
  // Check legacy mapping
  const mappedId = LEGACY_STYLE_MAP[styleId.toLowerCase()];
  if (mappedId && VISUAL_STYLES[mappedId]) {
    console.log(`[VisualStyle] Mapped legacy style "${styleId}" to "${mappedId}"`);
    return VISUAL_STYLES[mappedId];
  }
  
  // Default to lifestyle
  console.log(`[VisualStyle] Unknown style "${styleId}", defaulting to "lifestyle"`);
  return VISUAL_STYLES.lifestyle;
}

/**
 * Get all available styles for UI dropdown
 */
export function getAvailableStyles(): Array<{ id: string; name: string; description: string }> {
  return Object.values(VISUAL_STYLES).map(style => ({
    id: style.id,
    name: style.name,
    description: style.description,
  }));
}

/**
 * Apply style modifiers to a base prompt
 */
export function applyStyleToPrompt(basePrompt: string, styleId: string): string {
  const style = getVisualStyleConfig(styleId);
  const modifiers = style.promptModifiers;
  
  const enhancedParts = [
    basePrompt,
    modifiers.mood,
    modifiers.lighting,
    modifiers.cameraWork,
    modifiers.colorGrade,
    style.stylePromptSuffix,
  ].filter(Boolean);
  
  return enhancedParts.join(', ');
}

/**
 * Get negative prompt additions for a style
 */
export function getStyleNegativePrompt(styleId: string): string {
  const style = getVisualStyleConfig(styleId);
  const baseNegatives = [
    'blurry', 'low quality', 'distorted', 'ugly', 'deformed',
    'text overlay', 'watermark', 'logo', 'border', 'frame',
  ];
  
  return [...baseNegatives, ...style.negativePromptAdditions].join(', ');
}
```

---

## Step 2: Update UI Style Selector

Update the style selector in `client/src/components/universal-video-producer.tsx`:

Find the Visual Style selector section and replace with:

```tsx
{/* Visual Style */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Visual Style
  </label>
  <select
    value={visualStyle}
    onChange={(e) => setVisualStyle(e.target.value)}
    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
  >
    <option value="hero">Hero (Cinematic) - Brand anthems, emotional storytelling</option>
    <option value="lifestyle">Lifestyle - Customer scenarios, testimonials</option>
    <option value="product">Product Showcase - Product reveals, features</option>
    <option value="educational">Educational - How-to, explainers, health benefits</option>
    <option value="social">Social (Energetic) - TikTok/Reels, fast-paced promos</option>
    <option value="premium">Premium - Luxury positioning, high-end retail</option>
  </select>
  <p className="mt-1 text-xs text-gray-500">
    Style affects AI provider selection, prompt enhancement, and transitions
  </p>
</div>
```

---

## Step 3: Update Default Style

Find where the default visual style is set (likely in state initialization) and change from `'professional'` to `'lifestyle'`:

```tsx
const [visualStyle, setVisualStyle] = useState('lifestyle');
```

---

## Step 4: Remove Legacy Style Grid (If Present)

If there's a visual grid of 12 style cards (as shown in the screenshot), replace it with either:

**Option A: Simple dropdown (recommended for clean UI)**
Use the select element from Step 2.

**Option B: 6-card grid (if visual selection preferred)**

```tsx
const STYLE_OPTIONS = [
  { id: 'hero', name: 'Hero (Cinematic)', description: 'Brand anthems, emotional storytelling', icon: '🎬' },
  { id: 'lifestyle', name: 'Lifestyle', description: 'Customer scenarios, testimonials', icon: '🏡' },
  { id: 'product', name: 'Product Showcase', description: 'Product reveals, features', icon: '📦' },
  { id: 'educational', name: 'Educational', description: 'How-to, explainers', icon: '📚' },
  { id: 'social', name: 'Social (Energetic)', description: 'TikTok/Reels, promos', icon: '⚡' },
  { id: 'premium', name: 'Premium', description: 'Luxury positioning', icon: '✨' },
];

{/* Visual Style Grid */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Visual Style
  </label>
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    {STYLE_OPTIONS.map((style) => (
      <button
        key={style.id}
        type="button"
        onClick={() => setVisualStyle(style.id)}
        className={`p-4 rounded-lg border-2 text-left transition-all ${
          visualStyle === style.id
            ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
            : 'border-gray-200 hover:border-gray-300 bg-white'
        }`}
      >
        <div className="text-2xl mb-1">{style.icon}</div>
        <div className="font-medium text-gray-900">{style.name}</div>
        <div className="text-xs text-gray-500 mt-1">{style.description}</div>
      </button>
    ))}
  </div>
</div>
```

---

## Verification Checklist

- [ ] `shared/visual-style-config.ts` updated with 6 new styles
- [ ] `getVisualStyleConfig()` correctly returns style config
- [ ] Legacy style IDs map to new styles (backward compatibility)
- [ ] UI shows 6 style options instead of 12
- [ ] Default style is `lifestyle` (not `professional`)
- [ ] Style selection updates project correctly
- [ ] Provider priority logged in console during generation
- [ ] Music style matches selected visual style

---

## Testing

1. Create a new video project
2. Verify only 6 styles appear in selector
3. Select "Hero (Cinematic)" → check console logs show `runway` as first provider
4. Select "Social (Energetic)" → check console logs show `hailuo` as first provider
5. Select "Product Showcase" → check console logs show `luma` as first provider
6. Test with existing project that has `professional` style → should map to `lifestyle`

---

## Style Quick Reference

| Style | Best For | Primary Provider | Music |
|-------|----------|------------------|-------|
| Hero | Brand films, emotional | Runway | Orchestral |
| Lifestyle | Testimonials, relatable | Kling | Acoustic |
| Product | Features, reveals | Luma | Minimal electronic |
| Educational | How-to, benefits | Kling | Light corporate |
| Social | TikTok, promos | Hailuo | Upbeat electronic |
| Premium | Luxury, high-end | Runway | Elegant orchestral |
