export interface SoundEffect {
  file: string;
  volume: number;
  duration?: number;
  category: 'transition' | 'impact' | 'ambient' | 'rise';
}

export const SOUND_EFFECTS_BASE_URL = process.env.SOUND_EFFECTS_URL || 
  'https://remotionlambda-useast2-1vc2l6a56o.s3.us-east-2.amazonaws.com/audio/sfx';

export function getSoundEffectUrl(filename: string): string {
  return `${SOUND_EFFECTS_BASE_URL}/${filename}`;
}

export const SOUND_EFFECTS: Record<string, SoundEffect> = {
  'whoosh-light': {
    file: 'whoosh-light.mp3',
    volume: 0.3,
    duration: 0.5,
    category: 'transition',
  },
  'whoosh-heavy': {
    file: 'whoosh-heavy.mp3',
    volume: 0.35,
    duration: 0.6,
    category: 'transition',
  },
  'whoosh-soft': {
    file: 'whoosh-soft.mp3',
    volume: 0.25,
    duration: 0.4,
    category: 'transition',
  },
  'impact-deep': {
    file: 'impact-deep.mp3',
    volume: 0.4,
    duration: 0.3,
    category: 'impact',
  },
  'impact-soft': {
    file: 'impact-soft.mp3',
    volume: 0.25,
    duration: 0.25,
    category: 'impact',
  },
  'logo-reveal': {
    file: 'logo-reveal.mp3',
    volume: 0.5,
    duration: 1.5,
    category: 'impact',
  },
  'rise-swell': {
    file: 'rise-swell.mp3',
    volume: 0.35,
    duration: 3.0,
    category: 'rise',
  },
  'rise-tension': {
    file: 'rise-tension.mp3',
    volume: 0.3,
    duration: 2.5,
    category: 'rise',
  },
  'room-tone-warm': {
    file: 'room-tone-warm.mp3',
    volume: 0.08,
    category: 'ambient',
  },
  'room-tone-nature': {
    file: 'room-tone-nature.mp3',
    volume: 0.1,
    category: 'ambient',
  },
  'shimmer': {
    file: 'shimmer.mp3',
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

export function getSoundForTransition(transitionType: string): (SoundEffect & { url: string }) | null {
  const soundKey = transitionSoundMap[transitionType as TransitionType];
  if (!soundKey) return null;
  const effect = SOUND_EFFECTS[soundKey];
  if (!effect) return null;
  return {
    ...effect,
    url: getSoundEffectUrl(effect.file),
  };
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
  enabled: false, // Disabled until sound effect files are uploaded to S3
  transitionSounds: false,
  impactSounds: false,
  ambientLayer: false,
  ambientType: 'warm',
  masterVolume: 1.0,
};

export const PINE_HILL_FARM_SOUND_CONFIG: SoundDesignConfig = {
  enabled: false, // Disabled until sound effect files are uploaded to S3
  transitionSounds: false,
  impactSounds: false,
  ambientLayer: false,
  ambientType: 'nature',
  masterVolume: 1.0,
};
