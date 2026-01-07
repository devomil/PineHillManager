export interface VideoProvider {
  id: string;
  name: string;
  version: string;
  
  capabilities: {
    imageToVideo: boolean;
    textToVideo: boolean;
    imageToImage: boolean;
    
    maxResolution: '720p' | '1080p' | '4k';
    maxFps: number;
    maxDuration: number;
    
    strengths: ProviderStrength[];
    weaknesses: ProviderWeakness[];
    
    motionQuality: 'basic' | 'good' | 'excellent' | 'cinematic';
    temporalConsistency: 'low' | 'medium' | 'high';
    
    nativeAudio: boolean;
    lipSync: boolean;
    effectsPresets: string[];
  };
  
  costPer10Seconds: number;
  
  apiProvider: 'piapi' | 'runway' | 'direct' | 'remotion';
  modelId: string;
}

export type ProviderStrength = 
  | 'human-faces'
  | 'human-motion'
  | 'hand-actions'
  | 'food-content'
  | 'product-shots'
  | 'nature-scenes'
  | 'cinematic'
  | 'stylized'
  | 'animated'
  | 'b-roll'
  | 'talking-heads'
  | 'text-rendering'
  | 'fast-motion'
  | 'slow-motion'
  | 'camera-movement';

export type ProviderWeakness =
  | 'specific-actions'
  | 'text-in-video'
  | 'complex-motion'
  | 'multiple-subjects'
  | 'fine-details'
  | 'translucent-materials'
  | 'physics-accuracy'
  | 'fast-motion'
  | 'cinematic';

export interface ComplexityAnalysis {
  score: number;
  category: 'simple' | 'moderate' | 'complex' | 'impossible';
  
  factors: {
    specificAction: {
      detected: boolean;
      description: string;
      difficulty: 'easy' | 'hard' | 'very-hard';
    };
    
    materialProperties: {
      detected: boolean;
      properties: string[];
      difficulty: 'easy' | 'hard' | 'very-hard';
    };
    
    motionRequirements: {
      detected: boolean;
      type: string;
      difficulty: 'easy' | 'hard' | 'very-hard';
    };
    
    elementCount: number;
    temporalSequence: boolean;
  };
  
  recommendations: {
    simplifiedPrompt?: string;
    alternativeApproach?: 'reference-image' | 'stock-footage' | 'motion-graphics';
    bestProviders: string[];
    avoidProviders: string[];
  };
  
  userWarning?: string;
}

export interface RoutingDecision {
  recommendedProvider: string;
  confidence: number;
  reasoning: string[];
  
  alternatives: Array<{
    provider: string;
    reason: string;
  }>;
  
  warnings: string[];
  complexity: ComplexityAnalysis;
}
