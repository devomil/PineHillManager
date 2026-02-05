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
  originalPrompt: string;
  cleanupApplied: string[];
}

export interface PromptAnalysis {
  score: number;
  issues: string[];
  suggestions: string[];
}

export function optimizePrompt(context: PromptContext): OptimizedPrompt {
  const { visualDescription, sceneType, includeProduct, productName, visualStyle, generationMode, provider } = context;
  
  const cleanupApplied: string[] = [];
  
  let prompt = cleanDescription(visualDescription, cleanupApplied);
  
  if (includeProduct && productName) {
    prompt = injectProduct(prompt, productName);
  }
  
  prompt = applyStyleHints(prompt, visualStyle);
  
  prompt = adjustForProvider(prompt, provider, generationMode);
  
  const negativePrompt = buildNegativePrompt(generationMode);
  
  return {
    prompt: prompt.trim(),
    negativePrompt,
    provider,
    mode: generationMode,
    originalPrompt: visualDescription,
    cleanupApplied,
  };
}

function cleanDescription(description: string, cleanupApplied: string[]): string {
  const jargonPatterns: Array<{ pattern: RegExp; name: string }> = [
    { pattern: /\b(cinematic|filmic|anamorphic)\b/gi, name: 'cinematic jargon' },
    { pattern: /\b(35mm|50mm|85mm|24mm|70mm)\s*(lens|mm)?\b/gi, name: 'lens specs' },
    { pattern: /\b(shallow|deep)\s*depth\s*of\s*field\b/gi, name: 'DOF terminology' },
    { pattern: /\b(DOF|bokeh)\b/gi, name: 'technical terms' },
    { pattern: /\brule\s*of\s*thirds\b/gi, name: 'composition rules' },
    { pattern: /\b(establishing|tracking|dolly|crane|steadicam)\s*shot\b/gi, name: 'shot types' },
    { pattern: /\bgolden\s*hour\b/gi, name: 'golden hour' },
    { pattern: /\bcolor\s*grad(e|ing)\b/gi, name: 'color grading' },
    { pattern: /\bfilm\s*grain\b/gi, name: 'film grain' },
    { pattern: /\b(high|low)\s*key\s*lighting\b/gi, name: 'lighting terminology' },
    { pattern: /\bvolumetric\s*(lighting|fog)?\b/gi, name: 'volumetric effects' },
    { pattern: /\bteal\s*and\s*orange\b/gi, name: 'color schemes' },
    { pattern: /\b4K\s*(quality|resolution)?\b/gi, name: '4K reference' },
    { pattern: /\bprofessional\s*(grade|quality|color)\b/gi, name: 'professional qualifiers' },
    { pattern: /\bRAW\s*(footage|format)?\b/gi, name: 'RAW format' },
    { pattern: /\bmotion\s*blur\b/gi, name: 'motion blur' },
    { pattern: /\b(f\/\d+\.?\d*|f-stop|aperture)\b/gi, name: 'aperture settings' },
    { pattern: /\bISO\s*\d+\b/gi, name: 'ISO settings' },
    { pattern: /\bshutter\s*speed\b/gi, name: 'shutter speed' },
  ];
  
  let cleaned = description;
  for (const { pattern, name } of jargonPatterns) {
    if (pattern.test(cleaned)) {
      cleanupApplied.push(name);
      cleaned = cleaned.replace(pattern, '');
    }
  }
  
  cleaned = cleaned.replace(/,\s*,/g, ',');
  cleaned = cleaned.replace(/,\s*$/g, '');
  cleaned = cleaned.replace(/^\s*,/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

function injectProduct(prompt: string, productName: string): string {
  const promptLower = prompt.toLowerCase();
  const productLower = productName.toLowerCase();
  
  if (promptLower.includes(productLower) || 
      promptLower.includes('pine hill') || 
      promptLower.includes('supplement bottle') ||
      promptLower.includes('product')) {
    return prompt;
  }
  
  if (/holding\s+(a\s+)?(\w+\s+){0,2}(bottle|container|product)/i.test(prompt)) {
    return prompt.replace(
      /holding\s+(a\s+)?(\w+\s+){0,2}(bottle|container|product)/i, 
      `holding a ${productName} bottle`
    );
  }
  
  if (/with\s+(a\s+)?(\w+\s+){0,2}(bottle|product|supplement)/i.test(prompt)) {
    return prompt.replace(
      /with\s+(a\s+)?(\w+\s+){0,2}(bottle|product|supplement)/i,
      `with a ${productName}`
    );
  }
  
  if (prompt.includes('holding')) {
    return prompt.replace(/holding\s+\w+/i, `holding a ${productName}`);
  }
  
  return `${prompt}, featuring ${productName}`;
}

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
  
  const promptLower = prompt.toLowerCase();
  const newHints = hints.filter(h => !promptLower.includes(h));
  
  if (newHints.length > 0) {
    return `${prompt}, ${newHints.slice(0, 2).join(', ')}`;
  }
  
  return prompt;
}

function adjustForProvider(prompt: string, provider: string, mode: 'i2v' | 't2v'): string {
  if (mode === 'i2v') {
    // =============================================================
    // CRITICAL FIX: Do NOT strip I2V prompts to motion keywords
    // =============================================================
    // Veo 3.1 and other modern I2V providers support COMPOSITE mode
    // where the prompt describes NEW content to generate (people, scenes)
    // while using the source image as reference/product placement.
    // 
    // Old behavior: "A woman holding the bottle" -> "holding, subtle motion"
    // New behavior: Preserve full prompt for AI to understand the scene
    // =============================================================
    console.log('[PromptOptimizer] I2V: Preserving FULL prompt for composite generation');
    return prompt;
  }
  
  switch (provider) {
    case 'runway':
      return prompt;
      
    case 'kling':
      return prompt;
      
    case 'luma':
      if (!prompt.toLowerCase().includes('camera') && !prompt.toLowerCase().includes('motion')) {
        return `${prompt}, smooth gentle motion`;
      }
      return prompt;
      
    case 'hailuo':
      const parts = prompt.split(',').map(p => p.trim()).filter(p => p.length > 0);
      return parts.slice(0, 4).join(', ');
      
    case 'veo':
    case 'piapi':
    default:
      return prompt;
  }
}

function convertToMotionPrompt(scenePrompt: string): string {
  const actionPatterns = [
    /(\w+ing)\b/g,
    /(smile[sd]?|laugh[sd]?|walk[sd]?|run[sd]?|look[sd]?|turn[sd]?|hold[sd]?|pick[sd]?\s*up|pour[sd]?|open[sd]?|reach(es)?)/gi,
  ];
  
  const actions: string[] = [];
  for (const pattern of actionPatterns) {
    const matches = scenePrompt.match(pattern) || [];
    actions.push(...matches.filter(m => !['being', 'having', 'during', 'using'].includes(m.toLowerCase())));
  }
  
  if (actions.length > 0) {
    const uniqueActions = Array.from(new Set(actions.map(a => a.toLowerCase()))).slice(0, 3);
    return `${uniqueActions.join(', ')}, subtle natural movement, gentle motion`;
  }
  
  return 'subtle natural movement, gentle breathing motion, soft ambient movement';
}

function buildNegativePrompt(mode: 'i2v' | 't2v'): string {
  const base = [
    'blurry',
    'distorted',
    'ugly',
    'deformed',
    'watermark',
    'text overlay',
    'logo',
    'low quality',
    'pixelated',
  ];
  
  if (mode === 'i2v') {
    base.push('morphing', 'dramatic change', 'different person', 'face swap');
  }
  
  return base.join(', ');
}

export function analyzePrompt(prompt: string): PromptAnalysis {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;
  
  const jargonWords = ['cinematic', 'anamorphic', 'bokeh', 'DOF', '35mm', 'establishing shot', 'volumetric', 'film grain'];
  for (const word of jargonWords) {
    if (prompt.toLowerCase().includes(word.toLowerCase())) {
      issues.push(`Contains jargon: "${word}"`);
      score -= 10;
    }
  }
  
  const wordCount = prompt.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount > 40) {
    issues.push('Prompt too long (over 40 words)');
    suggestions.push('Shorten to 15-30 words');
    score -= 15;
  } else if (wordCount < 5) {
    issues.push('Prompt too short (under 5 words)');
    suggestions.push('Add more descriptive context');
    score -= 10;
  }
  
  const hasSubject = /\b(woman|man|person|people|hands?|child|family|customer|mom|dad|adult)\b/i.test(prompt);
  const hasSetting = /\b(kitchen|room|outdoor|garden|office|home|studio|table|counter|background)\b/i.test(prompt);
  const hasAction = /\b(\w+ing|smile|hold|take|open|pour|reach)\b/i.test(prompt);
  
  if (!hasSubject && !hasSetting) {
    suggestions.push('Add a clear subject or setting');
    score -= 10;
  }
  
  if (!hasAction) {
    suggestions.push('Consider adding an action for more dynamic visuals');
    score -= 5;
  }
  
  score = Math.max(0, Math.min(100, score));
  
  return { score, issues, suggestions };
}

export function logPromptOptimization(original: string, optimized: OptimizedPrompt): void {
  console.log(`[PromptOptimizer] Mode: ${optimized.mode}, Provider: ${optimized.provider}`);
  console.log(`[PromptOptimizer] Original (${original.split(/\s+/).length} words): "${original.substring(0, 100)}${original.length > 100 ? '...' : ''}"`);
  console.log(`[PromptOptimizer] Optimized (${optimized.prompt.split(/\s+/).length} words): "${optimized.prompt.substring(0, 100)}${optimized.prompt.length > 100 ? '...' : ''}"`);
  if (optimized.cleanupApplied.length > 0) {
    console.log(`[PromptOptimizer] Cleaned: ${optimized.cleanupApplied.join(', ')}`);
  }
}
