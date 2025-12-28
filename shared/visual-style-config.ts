// shared/visual-style-config.ts - Phase 5B: Visual Style Provider Mapping

export interface VisualStyleConfig {
  id: string;
  name: string;
  description: string;
  
  preferredVideoProviders: string[];
  preferredImageProviders: string[];
  
  promptModifiers: {
    mood: string;
    lighting: string;
    cameraWork: string;
    colorGrade: string;
    pacing: string;
  };
  
  defaultContentTypes: {
    hook: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
    problem: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
    solution: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
    benefit: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
    cta: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
  };
  
  musicStyle: {
    genre: string;
    mood: string;
    tempo: 'slow' | 'medium' | 'fast';
    energy: 'low' | 'medium' | 'high';
  };
  
  transitions: {
    defaultType: 'cut' | 'fade' | 'dissolve' | 'wipe' | 'zoom';
    defaultDuration: number;
    betweenSceneTypes?: Record<string, string>;
  };
  
  stylePromptSuffix: string;
  negativePromptAdditions: string[];
}

export const VISUAL_STYLES: Record<string, VisualStyleConfig> = {
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Clean, corporate-friendly visuals with balanced composition',
    
    preferredVideoProviders: ['runway', 'kling', 'hailuo'],
    preferredImageProviders: ['ideogram', 'flux'],
    
    promptModifiers: {
      mood: 'professional, trustworthy, confident',
      lighting: 'soft professional lighting, well-lit',
      cameraWork: 'steady shots, smooth movements, eye-level angles',
      colorGrade: 'natural colors, balanced exposure',
      pacing: 'measured pacing, clear focus',
    },
    
    defaultContentTypes: {
      hook: 'person',
      problem: 'lifestyle',
      solution: 'product',
      benefit: 'lifestyle',
      cta: 'person',
    },
    
    musicStyle: {
      genre: 'corporate ambient',
      mood: 'uplifting, confident',
      tempo: 'medium',
      energy: 'medium',
    },
    
    transitions: {
      defaultType: 'dissolve',
      defaultDuration: 0.5,
    },
    
    stylePromptSuffix: 'professional quality, commercial grade, clean aesthetic',
    negativePromptAdditions: ['amateur', 'low budget', 'grainy'],
  },

  cinematic: {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Film-quality visuals with dramatic lighting and composition',
    
    preferredVideoProviders: ['runway', 'kling'],
    preferredImageProviders: ['midjourney', 'flux'],
    
    promptModifiers: {
      mood: 'dramatic, emotional, impactful',
      lighting: 'cinematic lighting, dramatic shadows, golden hour',
      cameraWork: 'dynamic camera movements, depth of field, wide establishing shots',
      colorGrade: 'cinematic color grading, teal and orange, high contrast',
      pacing: 'deliberate pacing, dramatic pauses, building tension',
    },
    
    defaultContentTypes: {
      hook: 'nature',
      problem: 'person',
      solution: 'abstract',
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
      betweenSceneTypes: {
        'hook-to-problem': 'dissolve',
        'solution-to-benefit': 'fade',
      },
    },
    
    stylePromptSuffix: 'cinematic quality, film grain, anamorphic lens, 2.39:1 aspect feel, movie-like',
    negativePromptAdditions: ['flat lighting', 'static camera', 'boring composition'],
  },

  energetic: {
    id: 'energetic',
    name: 'Energetic',
    description: 'Fast-paced, vibrant visuals with dynamic movement',
    
    preferredVideoProviders: ['kling', 'hailuo', 'runway'],
    preferredImageProviders: ['ideogram', 'flux'],
    
    promptModifiers: {
      mood: 'energetic, exciting, vibrant, dynamic',
      lighting: 'bright, high-key lighting, punchy colors',
      cameraWork: 'fast cuts, dynamic angles, tracking shots, movement',
      colorGrade: 'saturated colors, high vibrance, bold contrast',
      pacing: 'fast pacing, quick transitions, energetic rhythm',
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
      mood: 'energetic, motivating, exciting',
      tempo: 'fast',
      energy: 'high',
    },
    
    transitions: {
      defaultType: 'cut',
      defaultDuration: 0.3,
    },
    
    stylePromptSuffix: 'dynamic, vibrant, energetic motion, action-packed',
    negativePromptAdditions: ['static', 'boring', 'slow', 'dull'],
  },

  calm: {
    id: 'calm',
    name: 'Calm & Peaceful',
    description: 'Serene, relaxing visuals with gentle movement',
    
    preferredVideoProviders: ['runway', 'kling', 'hailuo'],
    preferredImageProviders: ['flux', 'ideogram'],
    
    promptModifiers: {
      mood: 'calm, peaceful, serene, tranquil',
      lighting: 'soft natural lighting, diffused, gentle',
      cameraWork: 'slow, gentle movements, static shots, wide angles',
      colorGrade: 'soft muted tones, pastel colors, low contrast',
      pacing: 'slow, relaxed pacing, breathing room',
    },
    
    defaultContentTypes: {
      hook: 'nature',
      problem: 'person',
      solution: 'lifestyle',
      benefit: 'nature',
      cta: 'person',
    },
    
    musicStyle: {
      genre: 'ambient meditation',
      mood: 'calm, peaceful, soothing',
      tempo: 'slow',
      energy: 'low',
    },
    
    transitions: {
      defaultType: 'dissolve',
      defaultDuration: 1.0,
    },
    
    stylePromptSuffix: 'peaceful, calming, serene atmosphere, gentle',
    negativePromptAdditions: ['chaotic', 'busy', 'harsh', 'aggressive'],
  },

  casual: {
    id: 'casual',
    name: 'Casual',
    description: 'Relaxed, authentic visuals with an approachable feel',
    
    preferredVideoProviders: ['kling', 'hailuo', 'runway'],
    preferredImageProviders: ['flux', 'ideogram'],
    
    promptModifiers: {
      mood: 'casual, relaxed, friendly, authentic',
      lighting: 'natural daylight, warm ambient lighting',
      cameraWork: 'handheld feel, intimate framing, casual angles',
      colorGrade: 'warm natural colors, slightly desaturated',
      pacing: 'natural pacing, conversational rhythm',
    },
    
    defaultContentTypes: {
      hook: 'person',
      problem: 'lifestyle',
      solution: 'product',
      benefit: 'person',
      cta: 'person',
    },
    
    musicStyle: {
      genre: 'indie acoustic',
      mood: 'friendly, casual, warm',
      tempo: 'medium',
      energy: 'medium',
    },
    
    transitions: {
      defaultType: 'cut',
      defaultDuration: 0.4,
    },
    
    stylePromptSuffix: 'authentic, natural, casual vibe, approachable',
    negativePromptAdditions: ['overly polished', 'staged', 'corporate'],
  },

  documentary: {
    id: 'documentary',
    name: 'Documentary',
    description: 'Authentic, story-driven visuals with journalistic quality',
    
    preferredVideoProviders: ['runway', 'kling'],
    preferredImageProviders: ['flux', 'midjourney'],
    
    promptModifiers: {
      mood: 'authentic, informative, engaging, real',
      lighting: 'natural lighting, documentary style, available light',
      cameraWork: 'observational, steady with occasional handheld, close-ups',
      colorGrade: 'natural, slightly desaturated, realistic',
      pacing: 'narrative pacing, story-driven, thoughtful',
    },
    
    defaultContentTypes: {
      hook: 'person',
      problem: 'person',
      solution: 'lifestyle',
      benefit: 'person',
      cta: 'person',
    },
    
    musicStyle: {
      genre: 'documentary ambient',
      mood: 'thoughtful, engaging, authentic',
      tempo: 'medium',
      energy: 'medium',
    },
    
    transitions: {
      defaultType: 'cut',
      defaultDuration: 0.3,
      betweenSceneTypes: {
        'problem-to-solution': 'dissolve',
      },
    },
    
    stylePromptSuffix: 'documentary style, authentic, real, journalistic quality',
    negativePromptAdditions: ['overly stylized', 'artificial', 'staged'],
  },

  luxury: {
    id: 'luxury',
    name: 'Luxury & Premium',
    description: 'High-end, sophisticated visuals with rich details',
    
    preferredVideoProviders: ['runway'],
    preferredImageProviders: ['midjourney', 'flux'],
    
    promptModifiers: {
      mood: 'luxurious, premium, sophisticated, exclusive',
      lighting: 'dramatic accent lighting, rich shadows, spotlighting',
      cameraWork: 'elegant slow motion, smooth dolly shots, revealing angles',
      colorGrade: 'rich deep colors, gold accents, high contrast, moody',
      pacing: 'slow, luxurious, lingering shots',
    },
    
    defaultContentTypes: {
      hook: 'product',
      problem: 'lifestyle',
      solution: 'product',
      benefit: 'lifestyle',
      cta: 'product',
    },
    
    musicStyle: {
      genre: 'elegant orchestral',
      mood: 'sophisticated, luxurious, premium',
      tempo: 'slow',
      energy: 'medium',
    },
    
    transitions: {
      defaultType: 'fade',
      defaultDuration: 1.2,
    },
    
    stylePromptSuffix: 'luxury, premium quality, high-end, sophisticated, elegant, exclusive',
    negativePromptAdditions: ['cheap', 'budget', 'mass market', 'generic'],
  },

  minimal: {
    id: 'minimal',
    name: 'Minimal & Modern',
    description: 'Clean, minimalist aesthetic with focus on simplicity',
    
    preferredVideoProviders: ['runway', 'kling'],
    preferredImageProviders: ['midjourney', 'flux'],
    
    promptModifiers: {
      mood: 'clean, minimal, modern, sophisticated',
      lighting: 'clean even lighting, no harsh shadows, bright',
      cameraWork: 'static or slow pan, centered composition, negative space',
      colorGrade: 'desaturated, monochromatic, clean whites',
      pacing: 'slow, deliberate, breathing room',
    },
    
    defaultContentTypes: {
      hook: 'abstract',
      problem: 'lifestyle',
      solution: 'product',
      benefit: 'abstract',
      cta: 'product',
    },
    
    musicStyle: {
      genre: 'minimal electronic ambient',
      mood: 'calm, clean, modern',
      tempo: 'slow',
      energy: 'low',
    },
    
    transitions: {
      defaultType: 'fade',
      defaultDuration: 0.8,
    },
    
    stylePromptSuffix: 'minimalist, clean background, negative space, modern design, simple',
    negativePromptAdditions: ['cluttered', 'busy', 'complex', 'messy'],
  },
};

export function getVisualStyleConfig(styleId: string): VisualStyleConfig {
  return VISUAL_STYLES[styleId] || VISUAL_STYLES.professional;
}

export function getAvailableStyles(): Array<{ id: string; name: string; description: string }> {
  return Object.values(VISUAL_STYLES).map(style => ({
    id: style.id,
    name: style.name,
    description: style.description,
  }));
}
