// shared/provider-config.ts - Phase 7A: Multi-Provider Video Selection

export interface VideoProvider {
  id: string;
  name: string;
  displayName: string;
  costPerSecond: number;
  maxDuration: number;
  strengths: string[];
  weaknesses: string[];
  bestFor: string[];
}

export const VIDEO_PROVIDERS: Record<string, VideoProvider> = {
  runway: {
    id: 'runway',
    name: 'runway',
    displayName: 'Runway Gen-3',
    costPerSecond: 0.05,
    maxDuration: 10,
    strengths: [
      'Cinematic quality',
      'Dramatic lighting',
      'Smooth motion',
      'Professional grade',
    ],
    weaknesses: [
      'Higher cost',
      'Slower generation',
    ],
    bestFor: [
      'cinematic',
      'dramatic',
      'hero-shots',
      'product-premium',
      'emotional',
      'hook',
      'cta',
    ],
  },
  
  kling: {
    id: 'kling',
    name: 'kling',
    displayName: 'Kling AI',
    costPerSecond: 0.03,
    maxDuration: 10,
    strengths: [
      'Excellent human rendering',
      'Natural expressions',
      'Good motion physics',
      'Cost effective',
    ],
    weaknesses: [
      'Less cinematic than Runway',
    ],
    bestFor: [
      'person',
      'human-subject',
      'face-closeup',
      'conversation',
      'testimonial',
      'lifestyle',
      'story',
    ],
  },
  
  luma: {
    id: 'luma',
    name: 'luma',
    displayName: 'Luma Dream Machine',
    costPerSecond: 0.04,
    maxDuration: 5,
    strengths: [
      'Smooth reveals',
      'Product animations',
      'Clean transitions',
      '3D-like quality',
    ],
    weaknesses: [
      'Shorter max duration',
      'Less natural for people',
    ],
    bestFor: [
      'product-reveal',
      'product-shot',
      'object-focus',
      'reveal-animation',
      'tech-demo',
      'product',
      'brand',
    ],
  },
  
  hailuo: {
    id: 'hailuo',
    name: 'hailuo',
    displayName: 'Hailuo MiniMax',
    costPerSecond: 0.02,
    maxDuration: 6,
    strengths: [
      'Cost effective',
      'Good for B-roll',
      'Nature scenes',
      'Fast generation',
    ],
    weaknesses: [
      'Less detailed than premium',
      'Simpler motion',
    ],
    bestFor: [
      'broll',
      'b-roll',
      'nature',
      'landscape',
      'ambient',
      'background',
      'establishing',
      'explanation',
    ],
  },
  
  hunyuan: {
    id: 'hunyuan',
    name: 'hunyuan',
    displayName: 'Hunyuan',
    costPerSecond: 0.025,
    maxDuration: 5,
    strengths: [
      'Good for nature',
      'Abstract scenes',
      'Cost effective',
    ],
    weaknesses: [
      'Limited duration',
      'Less versatile',
    ],
    bestFor: [
      'broll',
      'nature',
      'abstract',
      'supplementary',
    ],
  },
  
  veo: {
    id: 'veo',
    name: 'veo',
    displayName: 'Veo 3.1',
    costPerSecond: 0.06,
    maxDuration: 8,
    strengths: [
      'High quality output',
      'Cinematic results',
      'Good motion',
    ],
    weaknesses: [
      'Higher cost',
    ],
    bestFor: [
      'cinematic',
      'high-quality',
      'dramatic',
      'hook',
    ],
  },
};

export interface ImageProvider {
  id: string;
  name: string;
  displayName: string;
  costPerImage: number;
  strengths: string[];
  bestFor: string[];
}

export const IMAGE_PROVIDERS: Record<string, ImageProvider> = {
  flux: {
    id: 'flux',
    name: 'flux',
    displayName: 'Flux.1',
    costPerImage: 0.03,
    strengths: ['Product shots', 'Clean compositions', 'Commercial quality'],
    bestFor: ['product', 'food', 'object', 'still-life'],
  },
  
  falai: {
    id: 'falai',
    name: 'fal.ai',
    displayName: 'fal.ai',
    costPerImage: 0.02,
    strengths: ['Lifestyle images', 'Natural feel', 'People'],
    bestFor: ['lifestyle', 'person', 'scene', 'environment'],
  },
};

export interface SoundProvider {
  id: string;
  name: string;
  displayName: string;
  type: 'voiceover' | 'music' | 'sfx';
  costPerSecond?: number;
  costPerTrack?: number;
  costPerEffect?: number;
}

export const SOUND_PROVIDERS: Record<string, SoundProvider> = {
  elevenlabs: {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    displayName: 'ElevenLabs',
    type: 'voiceover',
    costPerSecond: 0.015,
  },
  
  udio: {
    id: 'udio',
    name: 'Udio',
    displayName: 'Udio AI (via PiAPI)',
    type: 'music',
    costPerTrack: 0.10,
  },
  
  kling_sound: {
    id: 'kling_sound',
    name: 'Kling Sound',
    displayName: 'Kling Sound',
    type: 'sfx',
    costPerEffect: 0.01,
  },
};

export function getVideoProvider(id: string): VideoProvider | undefined {
  return VIDEO_PROVIDERS[id];
}

export function getAllVideoProviders(): VideoProvider[] {
  return Object.values(VIDEO_PROVIDERS);
}

export function getImageProvider(id: string): ImageProvider | undefined {
  return IMAGE_PROVIDERS[id];
}

export function getSoundProvider(id: string): SoundProvider | undefined {
  return SOUND_PROVIDERS[id];
}
