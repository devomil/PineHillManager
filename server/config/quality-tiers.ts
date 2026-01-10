export type QualityTier = 'ultra' | 'premium' | 'standard';

export interface QualityTierConfig {
  tier: QualityTier;
  label: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  
  minMotionQuality: 'basic' | 'good' | 'excellent' | 'cinematic';
  minTemporalConsistency: 'low' | 'medium' | 'high';
  minResolution: '720p' | '1080p' | '4k';
  
  maxCostMultiplier: number;
  
  preferredVideoProviders: string[];
  preferredImageProviders: string[];
  preferredVoiceProviders: string[];
  preferredMusicProviders: string[];
  
  enableMultiPassGeneration?: boolean;
  enableAIUpscaling?: boolean;
  enableColorGrading?: boolean;
  enableFrameInterpolation?: boolean;
  enableAudioEnhancement?: boolean;
}

export const QUALITY_TIERS: Record<QualityTier, QualityTierConfig> = {
  ultra: {
    tier: 'ultra',
    label: 'Ultra Premium',
    description: 'Cinema-grade quality with multi-pass generation, 4K upscaling, and AI color grading',
    badge: 'Best Quality',
    badgeColor: 'bg-purple-100 text-purple-800',
    
    minMotionQuality: 'cinematic',
    minTemporalConsistency: 'high',
    minResolution: '1080p',
    maxCostMultiplier: 20,
    
    preferredVideoProviders: [
      'kling-2.6-motion-control-pro',
      'veo-3.1',
      'kling-2.6-pro',
      'runway-gen3',
      'kling-2.6',
      'kling-2.6-motion-control',
    ],
    
    preferredImageProviders: [
      'midjourney-v7',
      'midjourney-v6',
      'flux-1.1-pro',
      'flux-kontext',
      'gpt-image-1.5',
    ],
    
    preferredVoiceProviders: [
      'elevenlabs-multilingual-v2',
      'elevenlabs-turbo-v2.5',
    ],
    
    preferredMusicProviders: [
      'udio-v1.5',
      'suno-v4',
    ],
    
    enableMultiPassGeneration: true,
    enableAIUpscaling: true,
    enableColorGrading: true,
    enableFrameInterpolation: true,
    enableAudioEnhancement: true,
  },
  
  premium: {
    tier: 'premium',
    label: 'Premium',
    description: 'Broadcast quality for TV commercials, streaming ads, professional production',
    badge: 'Recommended',
    badgeColor: 'bg-amber-100 text-amber-800',
    
    minMotionQuality: 'cinematic',
    minTemporalConsistency: 'high',
    minResolution: '1080p',
    maxCostMultiplier: 10,
    
    preferredVideoProviders: [
      'veo-3.1',
      'kling-2.6-pro',
      'kling-2.6-motion-control-pro',
      'runway-gen3',
      'kling-2.6',
      'kling-2.5',
      'luma-dream-machine',
    ],
    
    preferredImageProviders: [
      'flux-1.1-pro',
      'midjourney-v6',
      'gpt-image-1.5',
      'flux-kontext',
    ],
    
    preferredVoiceProviders: [
      'elevenlabs-multilingual-v2',
      'elevenlabs-turbo-v2.5',
    ],
    
    preferredMusicProviders: [
      'udio-v1.5',
      'suno-v4',
    ],
    
    enableMultiPassGeneration: false,
    enableAIUpscaling: false,
    enableColorGrading: false,
    enableFrameInterpolation: false,
    enableAudioEnhancement: false,
  },
  
  standard: {
    tier: 'standard',
    label: 'Standard',
    description: 'Good quality for social media, internal videos, quick turnaround',
    
    minMotionQuality: 'good',
    minTemporalConsistency: 'medium',
    minResolution: '720p',
    maxCostMultiplier: 3,
    
    preferredVideoProviders: [
      'kling-2.6',
      'kling-2.5',
      'wan-2.6',
      'hailuo-minimax',
      'luma-dream-machine',
    ],
    
    preferredImageProviders: [
      'flux-schnell',
      'qwen-image',
      'seedream-4',
      'gpt-image-1',
    ],
    
    preferredVoiceProviders: [
      'elevenlabs-turbo-v2.5',
    ],
    
    preferredMusicProviders: [
      'suno-v4',
    ],
    
    enableMultiPassGeneration: false,
    enableAIUpscaling: false,
    enableColorGrading: false,
    enableFrameInterpolation: false,
    enableAudioEnhancement: false,
  },
};

export const DEFAULT_QUALITY_TIER: QualityTier = 'premium';

export interface TierCostConfig {
  videoPer10s: number;
  imagePer: number;
  voicePer30s: number;
  musicPer30s: number;
  soundfxPer: number;
  sceneAnalysis: number;
  qa: number;
  multiPassMultiplier?: number;
  upscalePer?: number;
  colorGradePer?: number;
  interpolatePer?: number;
  audioEnhancePer?: number;
}

export const TIER_COSTS: Record<QualityTier, TierCostConfig> = {
  ultra: {
    videoPer10s: 0.80,
    imagePer: 0.10,
    voicePer30s: 0.35,
    musicPer30s: 0.15,
    soundfxPer: 0.08,
    sceneAnalysis: 0.02,
    qa: 0.03,
    multiPassMultiplier: 3,
    upscalePer: 0.10,
    colorGradePer: 0.15,
    interpolatePer: 0.10,
    audioEnhancePer: 0.05,
  },
  premium: {
    videoPer10s: 0.65,
    imagePer: 0.05,
    voicePer30s: 0.30,
    musicPer30s: 0.12,
    soundfxPer: 0.06,
    sceneAnalysis: 0.02,
    qa: 0.02,
  },
  standard: {
    videoPer10s: 0.30,
    imagePer: 0.03,
    voicePer30s: 0.20,
    musicPer30s: 0.08,
    soundfxPer: 0.04,
    sceneAnalysis: 0.01,
    qa: 0.01,
  },
};

export function getQualityTierConfig(tier: QualityTier): QualityTierConfig {
  return QUALITY_TIERS[tier] || QUALITY_TIERS.premium;
}

export function getTierCosts(tier: QualityTier): TierCostConfig {
  return TIER_COSTS[tier] || TIER_COSTS.premium;
}
