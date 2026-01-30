export type TransitionType = 
  | 'cut'
  | 'fade'
  | 'dissolve'
  | 'elegant-dissolve'
  | 'light-leak'
  | 'light-leak-golden'
  | 'light-leak-warm'
  | 'film-burn'
  | 'film-burn-classic'
  | 'whip-pan'
  | 'whip-pan-left'
  | 'whip-pan-up'
  | 'whip-pan-down';

export const STYLE_TRANSITION_MAP: Record<string, TransitionType> = {
  'hero': 'light-leak-golden',
  'Hero (Cinematic)': 'light-leak-golden',
  'cinematic': 'light-leak-golden',
  
  'lifestyle': 'elegant-dissolve',
  'Lifestyle': 'elegant-dissolve',
  
  'product': 'fade',
  'Product Showcase': 'fade',
  
  'educational': 'dissolve',
  'Educational': 'dissolve',
  'training': 'dissolve',
  'instructional': 'dissolve',
  
  'social': 'whip-pan',
  'Social (Energetic)': 'whip-pan',
  'energetic': 'whip-pan',
  
  'premium': 'light-leak-golden',
  'Premium': 'light-leak-golden',
  'luxury': 'light-leak-golden',
  
  'documentary': 'film-burn',
  'professional': 'elegant-dissolve',
};

export const TRANSITION_DEFAULTS: Record<TransitionType, { duration: number }> = {
  'cut': { duration: 0 },
  'fade': { duration: 0.5 },
  'dissolve': { duration: 0.8 },
  'elegant-dissolve': { duration: 1.0 },
  'light-leak': { duration: 1.2 },
  'light-leak-golden': { duration: 1.2 },
  'light-leak-warm': { duration: 1.2 },
  'film-burn': { duration: 1.0 },
  'film-burn-classic': { duration: 1.0 },
  'whip-pan': { duration: 0.6 },
  'whip-pan-left': { duration: 0.6 },
  'whip-pan-up': { duration: 0.6 },
  'whip-pan-down': { duration: 0.6 },
};

export function getTransitionForStyle(visualStyle: string): TransitionType {
  const normalized = visualStyle.toLowerCase();
  return STYLE_TRANSITION_MAP[visualStyle] || STYLE_TRANSITION_MAP[normalized] || 'elegant-dissolve';
}

export function getTransitionConfig(visualStyle: string, customDuration?: number): {
  type: TransitionType;
  duration: number;
} {
  const type = getTransitionForStyle(visualStyle);
  const duration = customDuration ?? TRANSITION_DEFAULTS[type].duration;
  return { type, duration };
}
