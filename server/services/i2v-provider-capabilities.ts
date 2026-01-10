import { I2VProviderCapabilities, MotionStyle } from '../../shared/types/brand-video-types';

export const I2V_PROVIDER_CAPABILITIES: Record<string, I2VProviderCapabilities> = {
  'kling-2.6': {
    name: 'Kling 2.6',
    supportedMotionStyles: ['environmental', 'subtle', 'reveal', 'zoom-in', 'pan'],
    maxDuration: 10,
    motionControl: 'advanced',
    bestFor: [
      'Product shots with environmental motion',
      'Lifestyle scenes with subtle movement',
      'Reveal animations',
      'Native audio generation',
    ],
    costPer10Seconds: 0.39,
  },
  
  'kling-2.5': {
    name: 'Kling 2.5',
    supportedMotionStyles: ['environmental', 'subtle', 'reveal', 'zoom-in', 'pan'],
    maxDuration: 10,
    motionControl: 'advanced',
    bestFor: [
      'Product shots with environmental motion',
      'Lifestyle scenes with subtle movement',
      'Reveal animations',
    ],
    costPer10Seconds: 0.39,
  },
  
  'kling-2.1': {
    name: 'Kling 2.1',
    supportedMotionStyles: ['environmental', 'subtle', 'reveal', 'zoom-in', 'pan'],
    maxDuration: 10,
    motionControl: 'advanced',
    bestFor: [
      'Product shots with environmental motion',
      'Lifestyle scenes with subtle movement',
      'Reveal animations',
    ],
    costPer10Seconds: 0.40,
  },
  
  'runway-gen3': {
    name: 'Runway Gen-3 Alpha',
    supportedMotionStyles: ['subtle', 'zoom-in', 'zoom-out', 'pan'],
    maxDuration: 10,
    motionControl: 'advanced',
    bestFor: [
      'Cinematic camera movements',
      'Precise motion control',
      'Professional quality output',
    ],
    costPer10Seconds: 0.60,
  },
  
  'luma-dream-machine': {
    name: 'Luma Dream Machine',
    supportedMotionStyles: ['environmental', 'subtle', 'reveal'],
    maxDuration: 5,
    motionControl: 'basic',
    bestFor: [
      'Smooth organic motion',
      'Product reveals',
      'Nature/environmental scenes',
    ],
    costPer10Seconds: 0.40,
  },
  
  'hailuo-minimax': {
    name: 'Hailuo MiniMax',
    supportedMotionStyles: ['environmental', 'subtle'],
    maxDuration: 6,
    motionControl: 'prompt-only',
    bestFor: [
      'B-roll footage',
      'Background plates',
      'Atmospheric scenes',
    ],
    costPer10Seconds: 0.15,
  },
  
  'veo-2': {
    name: 'Google Veo 2',
    supportedMotionStyles: ['environmental', 'subtle', 'zoom-in', 'zoom-out', 'pan', 'reveal'],
    maxDuration: 8,
    motionControl: 'advanced',
    bestFor: [
      'High quality output',
      'Complex motion',
      'Cinematic results',
    ],
    costPer10Seconds: 0.50,
  },
  
  'veo-3.1': {
    name: 'Google Veo 3.1',
    supportedMotionStyles: ['environmental', 'subtle', 'zoom-in', 'zoom-out', 'pan', 'reveal'],
    maxDuration: 10,
    motionControl: 'advanced',
    bestFor: [
      'Premium quality output',
      'Complex motion',
      'Cinematic results',
      'Native audio',
    ],
    costPer10Seconds: 0.75,
  },
};

type QualityTier = 'ultra' | 'premium' | 'standard';

const TIER_PROVIDER_PRIORITY: Record<QualityTier, string[]> = {
  ultra: ['veo-3.1', 'runway-gen3', 'kling-2.6', 'veo-2'],
  premium: ['kling-2.6', 'runway-gen3', 'veo-3.1', 'kling-2.5'],
  standard: ['kling-2.5', 'kling-2.1', 'luma-dream-machine', 'hailuo-minimax'],
};

export function selectI2VProvider(
  motionStyle: MotionStyle,
  duration: number,
  preferQuality: boolean = true,
  qualityTier: QualityTier = 'premium'
): string {
  
  const compatible = Object.entries(I2V_PROVIDER_CAPABILITIES)
    .filter(([_, caps]) => 
      caps.supportedMotionStyles.includes(motionStyle) &&
      caps.maxDuration >= duration
    );
  
  if (compatible.length === 0) {
    return TIER_PROVIDER_PRIORITY[qualityTier][0] || 'kling-2.6';
  }
  
  const tierPriority = TIER_PROVIDER_PRIORITY[qualityTier];
  for (const preferredProvider of tierPriority) {
    const match = compatible.find(([id]) => id === preferredProvider);
    if (match) {
      console.log(`[I2V] Selected ${match[0]} for ${qualityTier} tier (motion: ${motionStyle})`);
      return match[0];
    }
  }
  
  if (preferQuality) {
    const advanced = compatible.find(([_, caps]) => caps.motionControl === 'advanced');
    if (advanced) return advanced[0];
  }
  
  switch (motionStyle) {
    case 'environmental':
      const luma = compatible.find(([name]) => name === 'luma-dream-machine');
      if (luma) return luma[0];
      const kling = compatible.find(([name]) => name.startsWith('kling-2'));
      if (kling) return kling[0];
      break;
      
    case 'subtle':
    case 'zoom-in':
    case 'zoom-out':
      const runway = compatible.find(([name]) => name === 'runway-gen3');
      if (runway) return runway[0];
      break;
      
    case 'reveal':
      const klingReveal = compatible.find(([name]) => name.startsWith('kling-2'));
      if (klingReveal) return klingReveal[0];
      break;
      
    case 'pan':
      const runwayPan = compatible.find(([name]) => name === 'runway-gen3');
      if (runwayPan) return runwayPan[0];
      break;
  }
  
  return compatible[0][0];
}

export function getProviderCapabilities(providerId: string): I2VProviderCapabilities | undefined {
  return I2V_PROVIDER_CAPABILITIES[providerId];
}

export function getAllI2VProviders(): string[] {
  return Object.keys(I2V_PROVIDER_CAPABILITIES);
}

export function getProvidersForMotionStyle(style: MotionStyle): string[] {
  return Object.entries(I2V_PROVIDER_CAPABILITIES)
    .filter(([_, caps]) => caps.supportedMotionStyles.includes(style))
    .map(([id]) => id);
}
