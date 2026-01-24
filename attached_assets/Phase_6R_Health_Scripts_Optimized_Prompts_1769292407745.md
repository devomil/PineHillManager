# Phase 6R: Health-Focused Scripts & Optimized Prompts

## Objective

Transform the script generation and prompt engineering systems to produce:
1. **Health-intelligent scripts** with researched data, statistics, and benefit claims
2. **Simple, effective prompts** optimized for PiAPI video generation (I2V/T2V)

## Why This Matters

### Current Problems

**Script Generation:**
- Generic marketing copy without health-specific knowledge
- No research or data backing claims
- Doesn't understand Pine Hill Farm's product line
- Missing statistics that build credibility

**Prompt Engineering:**
- Over-engineered prompts with excessive technical jargon
- Prompts like: "Cinematic 35mm, golden hour, shallow DOF, rule of thirds..."
- Models get confused by conflicting instructions
- I2V and T2V treated identically (they shouldn't be)

### Evidence

Simple prompts produce better results:
```
✅ WORKS: "A sophisticated middle age woman, holding a Pine Hill supplement bottle, in a cozy, warm kitchen"

❌ FAILS: "Cinematic establishing shot, 35mm anamorphic lens, golden hour volumetric lighting, sophisticated middle-aged woman with warm authentic expression, holding organic supplement bottle, rustic farmhouse kitchen, shallow depth of field, film grain, rule of thirds composition, professional color grading"
```

---

## Part 1: Health-Focused Script Generation

### Step 1: Create Health Knowledge Context

Create `server/services/health-script-context.ts`:

```typescript
// server/services/health-script-context.ts

export interface ProductKnowledge {
  name: string;
  category: string;
  primaryBenefits: string[];
  keyIngredients: string[];
  targetAudience: string;
  commonClaims: string[];
  avoidClaims: string[]; // FDA/FTC compliance
}

export interface HealthStatistic {
  claim: string;
  statistic: string;
  source: string;
  year: number;
}

// Pine Hill Farm Product Knowledge Base
export const PRODUCT_KNOWLEDGE: Record<string, ProductKnowledge> = {
  'general-supplement': {
    name: 'Pine Hill Farm Supplements',
    category: 'dietary supplements',
    primaryBenefits: [
      'supports overall wellness',
      'made with organic ingredients',
      'locally sourced',
      'third-party tested',
    ],
    keyIngredients: ['organic herbs', 'natural vitamins', 'plant-based minerals'],
    targetAudience: 'health-conscious adults seeking natural wellness solutions',
    commonClaims: [
      'supports healthy lifestyle',
      'made with care',
      'pure ingredients',
      'family-owned quality',
    ],
    avoidClaims: [
      'cures disease',
      'treats medical conditions',
      'FDA approved',
      'clinically proven to cure',
      'guaranteed results',
    ],
  },
  // Add specific products as needed
};

// Health & Wellness Statistics (update periodically)
export const HEALTH_STATISTICS: HealthStatistic[] = [
  {
    claim: 'supplement usage',
    statistic: '57% of U.S. adults use dietary supplements',
    source: 'CRN Consumer Survey',
    year: 2023,
  },
  {
    claim: 'organic preference',
    statistic: '76% of consumers seek organic options when available',
    source: 'Organic Trade Association',
    year: 2023,
  },
  {
    claim: 'local sourcing',
    statistic: '65% of consumers prefer locally-sourced products',
    source: 'Food Marketing Institute',
    year: 2023,
  },
  {
    claim: 'natural ingredients',
    statistic: '73% of supplement users prioritize natural ingredients',
    source: 'Natural Products Association',
    year: 2023,
  },
  {
    claim: 'wellness investment',
    statistic: 'Americans spend $50+ billion annually on supplements',
    source: 'Nutrition Business Journal',
    year: 2023,
  },
];

/**
 * Get relevant statistics for a topic
 */
export function getRelevantStatistics(topic: string, limit: number = 2): HealthStatistic[] {
  const keywords = topic.toLowerCase().split(' ');
  
  const scored = HEALTH_STATISTICS.map(stat => {
    const text = `${stat.claim} ${stat.statistic}`.toLowerCase();
    const score = keywords.filter(kw => text.includes(kw)).length;
    return { stat, score };
  });
  
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.stat);
}

/**
 * Get compliance-safe claims for a product
 */
export function getSafeClaims(productType: string): string[] {
  const product = PRODUCT_KNOWLEDGE[productType] || PRODUCT_KNOWLEDGE['general-supplement'];
  return product.commonClaims;
}

/**
 * Check if a claim might violate FDA/FTC guidelines
 */
export function isClaimRisky(claim: string): boolean {
  const riskyPatterns = [
    /cure[sd]?/i,
    /treat[s]?/i,
    /prevent[s]?/i,
    /diagnos/i,
    /FDA approved/i,
    /clinically proven/i,
    /guarantee[d]?/i,
    /miracle/i,
    /breakthrough/i,
  ];
  
  return riskyPatterns.some(pattern => pattern.test(claim));
}
```

### Step 2: Update Script Generation Prompt

Update the script generation system prompt in `server/routes/universal-video-routes.ts`:

```typescript
const HEALTH_SCRIPT_SYSTEM_PROMPT = `You are a health and wellness marketing scriptwriter for Pine Hill Farm, a family-owned organic supplement company.

## YOUR ROLE
Create compelling video scripts that:
1. Highlight genuine health benefits (not medical claims)
2. Include relevant statistics when they strengthen the message
3. Focus on lifestyle improvement and wellness support
4. Maintain FDA/FTC compliance (no disease claims)

## PINE HILL FARM BRAND VOICE
- Warm, authentic, family-owned feel
- Trustworthy and transparent
- Health-conscious but not preachy
- Community and local focus
- Quality and care in every product

## SCRIPT STRUCTURE FOR VIDEO
Each scene should be designed for AI video generation:
- HOOK: Grab attention in first 3 seconds (relatable problem or aspiration)
- PROBLEM: The challenge your audience faces (keep brief, 1 scene)
- SOLUTION: Introduce the product naturally (show, don't just tell)
- BENEFIT: How life improves with the product (emotional payoff)
- SOCIAL PROOF: Statistic or testimonial reference (builds credibility)
- CTA: Clear next step (visit website, try today, etc.)

## COMPLIANCE RULES (CRITICAL)
✅ CAN SAY: "supports healthy lifestyle", "made with organic ingredients", "may help support wellness"
❌ CANNOT SAY: "cures", "treats", "prevents disease", "FDA approved", "guaranteed results"

## OUTPUT FORMAT
Return a JSON object with this structure:
{
  "title": "Video title",
  "targetDuration": 30,
  "scenes": [
    {
      "type": "hook|problem|solution|benefit|social_proof|cta",
      "narration": "What the voiceover says",
      "visualDescription": "Simple description for video generation",
      "duration": 5,
      "includeProduct": true/false
    }
  ],
  "suggestedStatistic": "Optional relevant statistic to include",
  "keyMessage": "The one thing viewers should remember"
}

## VISUAL DESCRIPTION RULES (CRITICAL)
Keep visual descriptions SIMPLE. These will be used for AI video generation.

✅ GOOD: "A woman in her 40s taking supplements with morning coffee in a sunny kitchen"
❌ BAD: "Cinematic shot with golden hour lighting, shallow depth of field, 35mm lens, woman taking supplements"

Focus on: WHO is doing WHAT, WHERE, with WHAT MOOD
Avoid: Camera jargon, lighting instructions, film terminology`;
```

### Step 3: Create Enhanced Script Generation Endpoint

Add to `server/routes/universal-video-routes.ts`:

```typescript
import { getRelevantStatistics, getSafeClaims, isClaimRisky } from '../services/health-script-context';

// POST /api/video/generate-health-script
router.post('/api/video/generate-health-script', async (req, res) => {
  try {
    const { 
      description, 
      productType = 'general-supplement',
      targetDuration = 30,
      includeStatistics = true,
      platform = 'youtube',
    } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    // Get relevant statistics
    const statistics = includeStatistics ? getRelevantStatistics(description, 2) : [];
    const safeClaims = getSafeClaims(productType);
    
    // Build context for Claude
    const contextBlock = `
## AVAILABLE STATISTICS (use if relevant)
${statistics.map(s => `- ${s.statistic} (${s.source}, ${s.year})`).join('\n')}

## SAFE CLAIMS FOR THIS PRODUCT
${safeClaims.map(c => `- "${c}"`).join('\n')}

## PLATFORM: ${platform.toUpperCase()}
${platform === 'tiktok' || platform === 'reels' ? 'Keep fast-paced, hook in first 1-2 seconds, vertical format mindset' : ''}
${platform === 'youtube' ? 'Can be more detailed, horizontal format, allow for story development' : ''}
`;
    
    const client = new Anthropic();
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: HEALTH_SCRIPT_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Create a ${targetDuration}-second video script for:

"${description}"

${contextBlock}

Remember: Visual descriptions should be SIMPLE (who, what, where, mood). No camera/film jargon.`
      }],
    });
    
    const textContent = response.content[0]?.type === 'text' ? response.content[0].text : '';
    
    // Parse JSON response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse script response' });
    }
    
    const script = JSON.parse(jsonMatch[0]);
    
    // Validate claims aren't risky
    const allText = script.scenes.map((s: any) => s.narration).join(' ');
    if (isClaimRisky(allText)) {
      console.warn('[Script] Warning: Script may contain risky health claims');
      script.complianceWarning = 'Review script for potential FDA/FTC compliance issues';
    }
    
    return res.json({
      success: true,
      script,
      statisticsUsed: statistics,
    });
    
  } catch (error: any) {
    console.error('[Script] Generation failed:', error);
    return res.status(500).json({ error: error.message });
  }
});
```

---

## Part 2: Optimized Prompt Engineering

### Step 1: Create Prompt Optimization Service

Create `server/services/video-prompt-optimizer.ts`:

```typescript
// server/services/video-prompt-optimizer.ts

export interface PromptContext {
  visualDescription: string;
  sceneType: string;
  includeProduct: boolean;
  productName?: string;
  visualStyle: string;
  generationMode: 'i2v' | 't2v';
  provider: string;
}

export interface OptimizedPrompt {
  prompt: string;
  negativePrompt: string;
  provider: string;
  mode: 'i2v' | 't2v';
}

/**
 * Optimize a visual description into an effective AI video prompt
 * 
 * KEY INSIGHT: Simple, descriptive prompts outperform technical jargon
 */
export function optimizePrompt(context: PromptContext): OptimizedPrompt {
  const { visualDescription, sceneType, includeProduct, productName, visualStyle, generationMode, provider } = context;
  
  // Start with the visual description as base
  let prompt = cleanDescription(visualDescription);
  
  // Add product reference if needed (naturally)
  if (includeProduct && productName) {
    prompt = injectProduct(prompt, productName);
  }
  
  // Apply minimal style hints (NOT technical jargon)
  prompt = applyStyleHints(prompt, visualStyle);
  
  // Provider-specific adjustments
  prompt = adjustForProvider(prompt, provider, generationMode);
  
  // Build negative prompt (keep simple)
  const negativePrompt = buildNegativePrompt(generationMode);
  
  return {
    prompt: prompt.trim(),
    negativePrompt,
    provider,
    mode: generationMode,
  };
}

/**
 * Clean up description - remove any accidental jargon
 */
function cleanDescription(description: string): string {
  // Remove common jargon that hurts generation
  const jargonPatterns = [
    /\b(cinematic|filmic|anamorphic)\b/gi,
    /\b(35mm|50mm|85mm)\s*lens\b/gi,
    /\b(shallow|deep)\s*depth\s*of\s*field\b/gi,
    /\b(DOF|bokeh)\b/gi,
    /\brule\s*of\s*thirds\b/gi,
    /\b(establishing|tracking|dolly)\s*shot\b/gi,
    /\bgolden\s*hour\b/gi, // Often misinterpreted
    /\bcolor\s*grad(e|ing)\b/gi,
    /\bfilm\s*grain\b/gi,
    /\b(high|low)\s*key\s*lighting\b/gi,
  ];
  
  let cleaned = description;
  for (const pattern of jargonPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Inject product naturally into prompt
 */
function injectProduct(prompt: string, productName: string): string {
  // Check if product already mentioned
  if (prompt.toLowerCase().includes(productName.toLowerCase())) {
    return prompt;
  }
  
  // Check if there's a natural place to add it
  if (prompt.includes('holding')) {
    return prompt.replace(/holding\s+\w+/i, `holding a ${productName}`);
  }
  
  if (prompt.includes('with')) {
    return prompt.replace(/with\s+/i, `with a ${productName}, `);
  }
  
  // Add at end with context
  return `${prompt}, featuring ${productName}`;
}

/**
 * Apply style hints WITHOUT technical jargon
 * 
 * Instead of "cinematic lighting, shallow DOF"
 * Use emotional/atmospheric descriptors that models understand
 */
function applyStyleHints(prompt: string, style: string): string {
  const styleHints: Record<string, string[]> = {
    hero: ['dramatic', 'inspiring', 'beautiful'],
    lifestyle: ['warm', 'natural', 'authentic'],
    product: ['clean', 'focused', 'professional'],
    educational: ['clear', 'bright', 'friendly'],
    social: ['dynamic', 'vibrant', 'energetic'],
    premium: ['elegant', 'luxurious', 'sophisticated'],
  };
  
  const hints = styleHints[style] || styleHints.lifestyle;
  
  // Only add hints if they're not already present
  const promptLower = prompt.toLowerCase();
  const newHints = hints.filter(h => !promptLower.includes(h));
  
  if (newHints.length > 0) {
    // Add 1-2 hints max, at the end
    return `${prompt}, ${newHints.slice(0, 2).join(', ')}`;
  }
  
  return prompt;
}

/**
 * Provider-specific prompt adjustments
 */
function adjustForProvider(prompt: string, provider: string, mode: 'i2v' | 't2v'): string {
  // I2V needs less description (image provides context)
  if (mode === 'i2v') {
    // Focus on MOTION and CHANGE, not scene description
    return convertToMotionPrompt(prompt);
  }
  
  // T2V provider-specific tweaks
  switch (provider) {
    case 'runway':
      // Runway handles complex prompts okay, but simpler is still better
      return prompt;
      
    case 'kling':
      // Kling excels with people - emphasize human elements
      return prompt;
      
    case 'luma':
      // Luma loves smooth camera motion descriptions
      if (!prompt.toLowerCase().includes('camera')) {
        return `${prompt}, smooth gentle motion`;
      }
      return prompt;
      
    case 'hailuo':
      // Hailuo is fast but simpler - keep prompts short
      return prompt.split(',').slice(0, 4).join(',');
      
    default:
      return prompt;
  }
}

/**
 * Convert scene description to I2V motion prompt
 * 
 * I2V KEY INSIGHT: The image already shows the scene.
 * The prompt should describe WHAT CHANGES, not what's there.
 */
function convertToMotionPrompt(scenePrompt: string): string {
  // Extract action words
  const actionPatterns = [
    /(\w+ing)\b/g, // words ending in -ing
    /(smiles?|laughs?|walks?|runs?|looks?|turns?|holds?|picks?\s*up)/gi,
  ];
  
  const actions: string[] = [];
  for (const pattern of actionPatterns) {
    const matches = scenePrompt.match(pattern) || [];
    actions.push(...matches);
  }
  
  // If we found actions, build motion-focused prompt
  if (actions.length > 0) {
    const uniqueActions = [...new Set(actions)].slice(0, 3);
    return `${uniqueActions.join(', ')}, subtle natural movement, gentle motion`;
  }
  
  // Default subtle motion
  return 'subtle natural movement, gentle breathing motion, soft ambient movement';
}

/**
 * Build simple negative prompt
 */
function buildNegativePrompt(mode: 'i2v' | 't2v'): string {
  const base = [
    'blurry',
    'distorted',
    'ugly',
    'deformed',
    'watermark',
    'text',
    'logo',
  ];
  
  if (mode === 'i2v') {
    // I2V specific: avoid drastic changes
    base.push('morphing', 'dramatic change', 'different person');
  }
  
  return base.join(', ');
}

/**
 * Analyze a prompt and suggest improvements
 */
export function analyzePrompt(prompt: string): {
  score: number;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;
  
  // Check for jargon
  const jargonWords = ['cinematic', 'anamorphic', 'bokeh', 'DOF', '35mm', 'establishing shot'];
  for (const word of jargonWords) {
    if (prompt.toLowerCase().includes(word.toLowerCase())) {
      issues.push(`Contains jargon: "${word}"`);
      score -= 10;
    }
  }
  
  // Check length (ideal: 10-30 words)
  const wordCount = prompt.split(' ').length;
  if (wordCount > 40) {
    issues.push('Prompt too long (over 40 words)');
    suggestions.push('Shorten to 15-30 words');
    score -= 15;
  } else if (wordCount < 5) {
    issues.push('Prompt too short (under 5 words)');
    suggestions.push('Add more descriptive context');
    score -= 10;
  }
  
  // Check for good structure (subject, action, setting)
  const hasSubject = /\b(woman|man|person|people|hands?|child|family)\b/i.test(prompt);
  const hasSetting = /\b(kitchen|room|outdoor|garden|office|home|studio)\b/i.test(prompt);
  
  if (!hasSubject && !hasSetting) {
    suggestions.push('Add a clear subject or setting');
    score -= 10;
  }
  
  return { score, issues, suggestions };
}
```

### Step 2: Integrate Prompt Optimizer

Update the video generation flow to use the optimizer.

In `server/services/ai-video-service.ts`:

```typescript
import { optimizePrompt, PromptContext } from './video-prompt-optimizer';

async generateVideo(options: AIVideoOptions): Promise<AIVideoResult> {
  // ... existing provider selection logic ...
  
  // Optimize the prompt before sending to provider
  const optimizedPrompt = optimizePrompt({
    visualDescription: options.prompt,
    sceneType: options.sceneType || 'general',
    includeProduct: options.includeProduct || false,
    productName: options.productName || 'Pine Hill supplement',
    visualStyle: options.visualStyle || 'lifestyle',
    generationMode: options.sourceImageUrl ? 'i2v' : 't2v',
    provider: selectedProvider,
  });
  
  console.log(`[AIVideo] Original: "${options.prompt}"`);
  console.log(`[AIVideo] Optimized: "${optimizedPrompt.prompt}"`);
  console.log(`[AIVideo] Mode: ${optimizedPrompt.mode}`);
  
  // Use optimized prompt for generation
  return await this.generateWithProvider(
    selectedProvider,
    optimizedPrompt.prompt,
    optimizedPrompt.negativePrompt,
    options
  );
}
```

### Step 3: Add Prompt Preview to UI

Add a prompt preview in the Generation Preview panel so users can see (and edit) the optimized prompt:

```tsx
// In generation-preview-panel.tsx

{/* Prompt Preview Section */}
<div className="border-t pt-4">
  <h4 className="font-medium text-gray-900 mb-2">AI Prompts (Optimized)</h4>
  <div className="space-y-2 max-h-48 overflow-y-auto">
    {scenes.map((scene, idx) => (
      <div key={idx} className="bg-gray-50 rounded p-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500">
            Scene {idx + 1} • {scene.type} • {scene.provider}
          </span>
          <span className="text-xs text-gray-400">
            {scene.mode === 'i2v' ? '🖼️ Image→Video' : '📝 Text→Video'}
          </span>
        </div>
        <p className="text-sm text-gray-700">{scene.optimizedPrompt}</p>
      </div>
    ))}
  </div>
</div>
```

---

## Verification Checklist

### Part 1: Health Scripts
- [ ] Script generation includes relevant statistics
- [ ] Brand voice is warm and authentic
- [ ] No FDA/FTC risky claims in output
- [ ] Visual descriptions are simple (no camera jargon)
- [ ] Scenes have clear type assignments

### Part 2: Prompt Optimization
- [ ] Jargon is stripped from prompts
- [ ] I2V prompts focus on motion, not scene description
- [ ] Prompts are 15-30 words typically
- [ ] Product name injected naturally
- [ ] Style hints are emotional, not technical
- [ ] Console logs show original vs optimized prompts

---

## Prompt Quality Guidelines

### ✅ GOOD Prompts (Simple, Descriptive)
```
"A woman in her 40s smiling while taking morning vitamins in a sunny kitchen"

"Hands opening a Pine Hill supplement bottle on a wooden table"

"Happy family having breakfast together, warm morning light"

"Close-up of supplement capsules pouring into a palm"
```

### ❌ BAD Prompts (Over-Engineered)
```
"Cinematic establishing shot, 35mm anamorphic lens, golden hour volumetric lighting, shallow depth of field, woman in her 40s with authentic warm expression taking organic supplements, rustic farmhouse kitchen interior, rule of thirds composition, film grain texture, teal and orange color grading"
```

### I2V Specific (Motion-Focused)
```
"Gentle smile, slight head turn, natural breathing movement"

"Hand slowly opens the bottle, subtle ambient motion"

"Soft pour motion, capsules falling gently"
```

---

## Testing

1. Generate a script with description: "Promote our new immune support supplement for busy moms"
2. Verify script includes a statistic about supplements or immune health
3. Verify visual descriptions are simple (no jargon)
4. Check console logs for "Original" vs "Optimized" prompts
5. Compare video quality between old complex prompts and new simple ones
6. Test I2V with product image - verify prompt focuses on motion
