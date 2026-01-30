export interface SoundEffect {
  file: string;
  volume: number;
  duration?: number;
  category: 'transition' | 'impact' | 'ambient' | 'rise';
}

export const SOUND_EFFECTS: Record<string, SoundEffect> = {
  'whoosh-light': {
    file: '/audio/sfx/whoosh-light.mp3',
    volume: 0.3,
    duration: 0.5,
    category: 'transition',
  },
  'whoosh-heavy': {
    file: '/audio/sfx/whoosh-heavy.mp3',
    volume: 0.35,
    duration: 0.6,
    category: 'transition',
  },
  'whoosh-soft': {
    file: '/audio/sfx/whoosh-soft.mp3',
    volume: 0.25,
    duration: 0.4,
    category: 'transition',
  },
  'impact-deep': {
    file: '/audio/sfx/impact-deep.mp3',
    volume: 0.4,
    duration: 0.3,
    category: 'impact',
  },
  'impact-soft': {
    file: '/audio/sfx/impact-soft.mp3',
    volume: 0.25,
    duration: 0.25,
    category: 'impact',
  },
  'logo-reveal': {
    file: '/audio/sfx/logo-reveal.mp3',
    volume: 0.5,
    duration: 1.5,
    category: 'impact',
  },
  'rise-swell': {
    file: '/audio/sfx/rise-swell.mp3',
    volume: 0.35,
    duration: 3.0,
    category: 'rise',
  },
  'rise-tension': {
    file: '/audio/sfx/rise-tension.mp3',
    volume: 0.3,
    duration: 2.5,
    category: 'rise',
  },
  'room-tone-warm': {
    file: '/audio/sfx/room-tone-warm.mp3',
    volume: 0.08,
    category: 'ambient',
  },
  'room-tone-nature': {
    file: '/audio/sfx/room-tone-nature.mp3',
    volume: 0.1,
    category: 'ambient',
  },
  'shimmer': {
    file: '/audio/sfx/shimmer.mp3',
    volume: 0.2,
    duration: 1.0,
    category: 'transition',
  },
};

export type TransitionType = 
  | 'cut'
  | 'fade'
  | 'dissolve'
  | 'wipe'
  | 'slide'
  | 'zoom'
  | 'light-leak'
  | 'film-burn'
  | 'whip-pan';

const transitionSoundMap: Record<TransitionType, string | null> = {
  'cut': null,
  'fade': 'whoosh-soft',
  'dissolve': 'shimmer',
  'wipe': 'whoosh-light',
  'slide': 'whoosh-light',
  'zoom': 'whoosh-heavy',
  'light-leak': 'shimmer',
  'film-burn': 'whoosh-soft',
  'whip-pan': 'whoosh-heavy',
};

export function getSoundForTransition(transitionType: string): SoundEffect | null {
  const soundKey = transitionSoundMap[transitionType as TransitionType];
  if (!soundKey) return null;
  return SOUND_EFFECTS[soundKey] || null;
}

export interface TransitionConfig {
  type: TransitionType;
  duration: number;
  easing?: string;
  direction?: 'left' | 'right' | 'up' | 'down';
}

export interface SoundDesignConfig {
  enabled: boolean;
  transitionSounds: boolean;
  impactSounds: boolean;
  ambientLayer: boolean;
  ambientType: 'warm' | 'nature' | 'none';
  masterVolume: number;
  // Phase 18D: Audio ducking configuration (optional for backward compatibility)
  audioDucking?: {
    enabled: boolean;
    baseVolume: number;
    duckLevel: number;
    fadeFrames: number;
  };
}

export const DEFAULT_SOUND_DESIGN_CONFIG: SoundDesignConfig = {
  enabled: true,
  transitionSounds: true,
  impactSounds: true,
  ambientLayer: true,
  ambientType: 'warm',
  masterVolume: 1.0,
};

export const PINE_HILL_FARM_SOUND_CONFIG: SoundDesignConfig = {
  enabled: true,
  transitionSounds: true,
  impactSounds: true,
  ambientLayer: true,
  ambientType: 'nature',
  masterVolume: 1.0,
};
