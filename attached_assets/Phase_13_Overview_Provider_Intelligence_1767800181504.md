# Phase 13: Provider Intelligence & Regeneration System

## Executive Summary

This phase addresses critical gaps in the video generation pipeline:
1. **Missing providers** - Kling 2.5, Wan 2.6, Veo 3.1, Seedance, etc.
2. **Prompt-provider mismatch** - Complex visual directions failing on all providers
3. **No reference image support** - Can't use image-to-image or image-to-video from UI
4. **Ineffective regeneration** - Retrying with "improved prompt" doesn't fix fundamental mismatches

## The Pizza Dough Problem

The screenshot shows a perfect example of the current system's limitation:

**Visual Direction:**
> "Hands gently stretching pizza dough on natural wood surface"

**Claude Vision Suggested Improvement:**
> "Close-up of hands actively stretching thin pizza dough on natural wood surface, dough should be translucent and being pulled/stretched outward, not thick bread dough being shaped"

**Why This Keeps Failing:**
1. AI video models don't understand "translucent dough"
2. "Stretching" vs "kneading" is too nuanced for current models
3. More detailed prompts often make results WORSE (model confusion)
4. The provider selected may not be capable of this specific motion

**The Real Solution:**
- Detect that this prompt has HIGH specificity requirements
- Either simplify the prompt OR use reference image approach
- Route to providers best suited for food/hand content
- Offer stock footage as alternative for highly specific shots

---

## Sub-Phases

| Phase | Name | Purpose |
|-------|------|---------|
| 13A | Provider Registry Update | Add missing providers with capabilities |
| 13B | Prompt Complexity Analyzer | Detect when prompts are too specific |
| 13C | Smart Provider Routing | Match prompt needs to provider strengths |
| 13D | Reference Image UI | Add image-to-image and image-to-video to scene editor |
| 13E | Intelligent Regeneration | Smarter retry with automatic adjustments |
| 13F | Stock Footage Fallback | Offer alternatives for impossible shots |

---

## Phase 13A: Provider Registry Update

### New Providers to Add

```typescript
// shared/types/video-providers.ts

export interface VideoProvider {
  id: string;
  name: string;
  version: string;
  
  // Capabilities
  capabilities: {
    imageToVideo: boolean;
    textToVideo: boolean;
    imageToImage: boolean;
    
    // Quality tiers
    maxResolution: '720p' | '1080p' | '4k';
    maxFps: 24 | 30 | 48 | 60;
    maxDuration: number; // seconds
    
    // Strengths
    strengths: ProviderStrength[];
    weaknesses: ProviderWeakness[];
    
    // Motion quality
    motionQuality: 'basic' | 'good' | 'excellent' | 'cinematic';
    temporalConsistency: 'low' | 'medium' | 'high';
    
    // Special features
    nativeAudio: boolean;
    lipSync: boolean;
    effectsPresets: string[];
  };
  
  // Cost
  costPer10Seconds: number; // USD
  
  // API details
  apiProvider: 'piapi' | 'runway' | 'direct';
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
  | 'physics-accuracy';
```

### Updated Provider Registry

```typescript
// server/config/video-providers.ts

export const VIDEO_PROVIDERS: Record<string, VideoProvider> = {
  
  // ═══════════════════════════════════════════════════════════════
  // KLING FAMILY
  // ═══════════════════════════════════════════════════════════════
  
  'kling-1.6': {
    id: 'kling-1.6',
    name: 'Kling 1.6',
    version: '1.6',
    capabilities: {
      imageToVideo: true,
      textToVideo: true,
      imageToImage: false,
      maxResolution: '1080p',
      maxFps: 30,
      maxDuration: 10,
      strengths: ['human-faces', 'human-motion', 'nature-scenes'],
      weaknesses: ['specific-actions', 'text-in-video', 'fine-details'],
      motionQuality: 'good',
      temporalConsistency: 'medium',
      nativeAudio: false,
      lipSync: false,
      effectsPresets: [],
    },
    costPer10Seconds: 0.30,
    apiProvider: 'piapi',
    modelId: 'kling-v1.6',
  },
  
  'kling-2.0': {
    id: 'kling-2.0',
    name: 'Kling 2.0',
    version: '2.0',
    capabilities: {
      imageToVideo: true,
      textToVideo: true,
      imageToImage: false,
      maxResolution: '1080p',
      maxFps: 30,
      maxDuration: 10,
      strengths: ['human-faces', 'human-motion', 'cinematic', 'camera-movement'],
      weaknesses: ['specific-actions', 'text-in-video'],
      motionQuality: 'excellent',
      temporalConsistency: 'high',
      nativeAudio: false,
      lipSync: false,
      effectsPresets: [],
    },
    costPer10Seconds: 0.35,
    apiProvider: 'piapi',
    modelId: 'kling-v2',
  },
  
  'kling-2.1': {
    id: 'kling-2.1',
    name: 'Kling 2.1',
    version: '2.1',
    capabilities: {
      imageToVideo: true,
      textToVideo: true,
      imageToImage: false,
      maxResolution: '1080p',
      maxFps: 30,
      maxDuration: 10,
      strengths: ['human-faces', 'human-motion', 'cinematic', 'product-shots'],
      weaknesses: ['specific-actions', 'text-in-video'],
      motionQuality: 'excellent',
      temporalConsistency: 'high',
      nativeAudio: false,
      lipSync: false,
      effectsPresets: [],
    },
    costPer10Seconds: 0.40,
    apiProvider: 'piapi',
    modelId: 'kling-v2.1',
  },
  
  'kling-2.5-turbo': {
    id: 'kling-2.5-turbo',
    name: 'Kling 2.5 Turbo',
    version: '2.5',
    capabilities: {
      imageToVideo: true,
      textToVideo: true,
      imageToImage: false,
      maxResolution: '1080p',
      maxFps: 30,
      maxDuration: 10,
      strengths: ['human-faces', 'human-motion', 'cinematic', 'product-shots', 'camera-movement'],
      weaknesses: ['text-in-video'],
      motionQuality: 'excellent',
      temporalConsistency: 'high', // Improved!
      nativeAudio: false,
      lipSync: false,
      effectsPresets: [],
    },
    costPer10Seconds: 0.45,
    apiProvider: 'piapi',
    modelId: 'kling-v2.5-turbo',
  },
  
  'kling-effects': {
    id: 'kling-effects',
    name: 'Kling Effects',
    version: '1.0',
    capabilities: {
      imageToVideo: true,
      textToVideo: false,
      imageToImage: false,
      maxResolution: '1080p',
      maxFps: 30,
      maxDuration: 5,
      strengths: ['stylized', 'animated'],
      weaknesses: ['specific-actions', 'cinematic'],
      motionQuality: 'good',
      temporalConsistency: 'high',
      nativeAudio: false,
      lipSync: false,
      effectsPresets: ['squish', 'rocket', 'heart', 'inflate', 'melt', 'explode', 'levitate'],
    },
    costPer10Seconds: 0.25,
    apiProvider: 'piapi',
    modelId: 'kling-effects',
  },
  
  'kling-avatar': {
    id: 'kling-avatar',
    name: 'Kling AI Avatar',
    version: '1.0',
    capabilities: {
      imageToVideo: true,
      textToVideo: false,
      imageToImage: false,
      maxResolution: '1080p',
      maxFps: 48,
      maxDuration: 60,
      strengths: ['talking-heads', 'human-faces'],
      weaknesses: ['nature-scenes', 'product-shots'],
      motionQuality: 'excellent',
      temporalConsistency: 'high',
      nativeAudio: true,
      lipSync: true,
      effectsPresets: [],
    },
    costPer10Seconds: 0.50,
    apiProvider: 'piapi',
    modelId: 'kling-avatar',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // WAN FAMILY (Alibaba)
  // ═══════════════════════════════════════════════════════════════
  
  'wan-2.1': {
    id: 'wan-2.1',
    name: 'Wan 2.1',
    version: '2.1',
    capabilities: {
      imageToVideo: true,
      textToVideo: true,
      imageToImage: true,
      maxResolution: '720p',
      maxFps: 30,
      maxDuration: 5,
      strengths: ['stylized', 'animated', 'fast-motion'],
      weaknesses: ['cinematic', 'fine-details'],
      motionQuality: 'good',
      temporalConsistency: 'medium',
      nativeAudio: false,
      lipSync: false,
      effectsPresets: [],
    },
    costPer10Seconds: 0.15,
    apiProvider: 'piapi',
    modelId: 'wan-2.1',
  },
  
  'wan-2.6': {
    id: 'wan-2.6',
    name: 'Wan 2.6',
    version: '2.6',
    capabilities: {
      imageToVideo: true,
      textToVideo: true,
      imageToImage: true,
      maxResolution: '1080p',
      maxFps: 30,
      maxDuration: 8,
      strengths: ['stylized', 'animated', 'fast-motion', 'camera-movement'],
      weaknesses: ['fine-details', 'translucent-materials'],
      motionQuality: 'good',
      temporalConsistency: 'medium',
      nativeAudio: false,
      lipSync: false,
      effectsPresets: [],
    },
    costPer10Seconds: 0.20,
    apiProvider: 'piapi',
    modelId: 'wan-2.6',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // GOOGLE VEO FAMILY
  // ═══════════════════════════════════════════════════════════════
  
  'veo-2': {
    id: 'veo-2',
    name: 'Veo 2',
    version: '2.0',
    capabilities: {
      imageToVideo: true,
      textToVideo: true,
      imageToImage: false,
      maxResolution: '1080p',
      maxFps: 30,
      maxDuration: 8,
      strengths: ['cinematic', 'nature-scenes', 'camera-movement'],
      weaknesses: ['text-in-video', 'specific-actions'],
      motionQuality: 'excellent',
      temporalConsistency: 'high',
      nativeAudio: false,
      lipSync: false,
      effectsPresets: [],
    },
    costPer10Seconds: 0.50,
    apiProvider: 'piapi',
    modelId: 'veo-2',
  },
  
  'veo-3.1': {
    id: 'veo-3.1',
    name: 'Veo 3.1 Quality',
    version: '3.1',
    capabilities: {
      imageToVideo: true,
      textToVideo: true,
      imageToImage: false,
      maxResolution: '4k',
      maxFps: 30,
      maxDuration: 10,
      strengths: ['cinematic', 'nature-scenes', 'camera-movement', 'product-shots'],
      weaknesses: ['text-in-video'],
      motionQuality: 'cinematic',
      temporalConsistency: 'high',
      nativeAudio: true, // Native audio generation!
      lipSync: false,
      effectsPresets: [],
    },
    costPer10Seconds: 0.75,
    apiProvider: 'piapi',
    modelId: 'veo-3.1-quality',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // OTHER PROVIDERS
  // ═══════════════════════════════════════════════════════════════
  
  'seedance-1.0': {
    id: 'seedance-1.0',
    name: 'Seedance 1.0',
    version: '1.0',
    capabilities: {
      imageToVideo: true,
      textToVideo: true,
      imageToImage: false,
      maxResolution: '720p',
      maxFps: 30,
      maxDuration: 5,
      strengths: ['stylized', 'animated', 'human-motion'],
      weaknesses: ['cinematic', 'fine-details', 'product-shots'],
      motionQuality: 'good',
      temporalConsistency: 'medium',
      nativeAudio: false,
      lipSync: false,
      effectsPresets: [],
    },
    costPer10Seconds: 0.20,
    apiProvider: 'piapi',
    modelId: 'seedance-1.0',
  },
  
  'hailuo-minimax': {
    id: 'hailuo-minimax',
    name: 'Hailuo MiniMax',
    version: '1.0',
    capabilities: {
      imageToVideo: true,
      textToVideo: true,
      imageToImage: false,
      maxResolution: '1080p',
      maxFps: 30,
      maxDuration: 6,
      strengths: ['b-roll', 'nature-scenes', 'fast-motion'],
      weaknesses: ['human-faces', 'fine-details', 'specific-actions'],
      motionQuality: 'good',
      temporalConsistency: 'medium',
      nativeAudio: false,
      lipSync: false,
      effectsPresets: [],
    },
    costPer10Seconds: 0.15,
    apiProvider: 'piapi',
    modelId: 'hailuo-minimax',
  },
  
  'runway-gen3': {
    id: 'runway-gen3',
    name: 'Runway Gen-3 Alpha',
    version: '3.0',
    capabilities: {
      imageToVideo: true,
      textToVideo: true,
      imageToImage: false,
      maxResolution: '1080p',
      maxFps: 30,
      maxDuration: 10,
      strengths: ['cinematic', 'camera-movement', 'human-faces'],
      weaknesses: ['text-in-video', 'specific-actions'],
      motionQuality: 'excellent',
      temporalConsistency: 'high',
      nativeAudio: false,
      lipSync: false,
      effectsPresets: [],
    },
    costPer10Seconds: 0.60,
    apiProvider: 'runway',
    modelId: 'gen3-alpha',
  },
  
  'luma-dream-machine': {
    id: 'luma-dream-machine',
    name: 'Luma Dream Machine',
    version: '1.0',
    capabilities: {
      imageToVideo: true,
      textToVideo: true,
      imageToImage: false,
      maxResolution: '1080p',
      maxFps: 30,
      maxDuration: 5,
      strengths: ['product-shots', 'slow-motion', 'nature-scenes'],
      weaknesses: ['human-faces', 'specific-actions', 'fast-motion'],
      motionQuality: 'excellent',
      temporalConsistency: 'high',
      nativeAudio: false,
      lipSync: false,
      effectsPresets: [],
    },
    costPer10Seconds: 0.40,
    apiProvider: 'piapi',
    modelId: 'luma-dream-machine',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // IMAGE-TO-IMAGE PROVIDERS
  // ═══════════════════════════════════════════════════════════════
  
  'flux-1-dev': {
    id: 'flux-1-dev',
    name: 'Flux.1 Dev',
    version: '1.0',
    capabilities: {
      imageToVideo: false,
      textToVideo: false,
      imageToImage: true,
      maxResolution: '1080p',
      maxFps: 0,
      maxDuration: 0,
      strengths: ['product-shots', 'food-content', 'fine-details'],
      weaknesses: ['human-faces'],
      motionQuality: 'basic',
      temporalConsistency: 'high',
      nativeAudio: false,
      lipSync: false,
      effectsPresets: [],
    },
    costPer10Seconds: 0.05, // Per image
    apiProvider: 'piapi',
    modelId: 'flux-1-dev',
  },
  
  'stable-diffusion-3': {
    id: 'stable-diffusion-3',
    name: 'Stable Diffusion 3',
    version: '3.0',
    capabilities: {
      imageToVideo: false,
      textToVideo: false,
      imageToImage: true,
      maxResolution: '1080p',
      maxFps: 0,
      maxDuration: 0,
      strengths: ['stylized', 'animated', 'text-rendering'],
      weaknesses: ['human-faces', 'fine-details'],
      motionQuality: 'basic',
      temporalConsistency: 'high',
      nativeAudio: false,
      lipSync: false,
      effectsPresets: [],
    },
    costPer10Seconds: 0.03,
    apiProvider: 'piapi',
    modelId: 'sd3',
  },
};

// Helper to get providers by capability
export function getProvidersByCapability(
  capability: 'imageToVideo' | 'textToVideo' | 'imageToImage'
): VideoProvider[] {
  return Object.values(VIDEO_PROVIDERS).filter(p => p.capabilities[capability]);
}

// Helper to get providers by strength
export function getProvidersByStrength(strength: ProviderStrength): VideoProvider[] {
  return Object.values(VIDEO_PROVIDERS).filter(p => 
    p.capabilities.strengths.includes(strength)
  );
}
```

---

## Phase 13B: Prompt Complexity Analyzer

The pizza dough example shows why we need this - the prompt is too specific for any AI video model.

### Complexity Factors

```typescript
// server/services/prompt-complexity-analyzer.ts

export interface ComplexityAnalysis {
  score: number;           // 0-1, higher = more complex
  category: 'simple' | 'moderate' | 'complex' | 'impossible';
  
  factors: {
    // Specific action requirements
    specificAction: {
      detected: boolean;
      description: string;
      difficulty: 'easy' | 'hard' | 'very-hard';
    };
    
    // Material/physical properties
    materialProperties: {
      detected: boolean;
      properties: string[]; // ['translucent', 'stretchy', 'liquid']
      difficulty: 'easy' | 'hard' | 'very-hard';
    };
    
    // Motion direction/type
    motionRequirements: {
      detected: boolean;
      type: string; // 'stretching outward', 'precise hand movement'
      difficulty: 'easy' | 'hard' | 'very-hard';
    };
    
    // Multiple specific elements
    elementCount: number;
    
    // Temporal requirements
    temporalSequence: boolean; // Does it require specific sequence?
  };
  
  // Recommendations
  recommendations: {
    simplifiedPrompt?: string;
    alternativeApproach?: 'reference-image' | 'stock-footage' | 'motion-graphics';
    bestProviders: string[];
    avoidProviders: string[];
  };
  
  // Warning message for user
  userWarning?: string;
}
```

### Complexity Detection

```typescript
// server/services/prompt-complexity-analyzer.ts

class PromptComplexityAnalyzer {
  
  // Words that indicate hard-to-achieve specificity
  private readonly SPECIFIC_ACTION_KEYWORDS = [
    'stretching', 'pulling', 'kneading', 'folding', 'twisting',
    'pouring', 'dripping', 'splashing', 'melting', 'freezing',
    'cracking', 'breaking', 'tearing', 'cutting', 'slicing',
    'threading', 'weaving', 'sewing', 'typing', 'writing',
  ];
  
  private readonly MATERIAL_PROPERTY_KEYWORDS = [
    'translucent', 'transparent', 'opaque', 'glossy', 'matte',
    'liquid', 'viscous', 'stretchy', 'elastic', 'rigid',
    'soft', 'fluffy', 'crispy', 'crunchy', 'smooth',
    'wet', 'dry', 'steaming', 'bubbling', 'fizzing',
  ];
  
  private readonly PRECISE_MOTION_KEYWORDS = [
    'outward', 'inward', 'clockwise', 'counter-clockwise',
    'slowly', 'quickly', 'precisely', 'carefully',
    'from left to right', 'from top to bottom',
    'in circular motion', 'back and forth',
  ];
  
  /**
   * Analyze visual direction for complexity
   */
  analyze(visualDirection: string): ComplexityAnalysis {
    const lower = visualDirection.toLowerCase();
    
    // Analyze specific actions
    const specificAction = this.analyzeSpecificActions(lower);
    
    // Analyze material properties
    const materialProperties = this.analyzeMaterialProperties(lower);
    
    // Analyze motion requirements
    const motionRequirements = this.analyzeMotionRequirements(lower);
    
    // Count specific elements
    const elementCount = this.countSpecificElements(lower);
    
    // Check for temporal sequence
    const temporalSequence = this.hasTemporalSequence(lower);
    
    // Calculate overall score
    const score = this.calculateScore({
      specificAction,
      materialProperties,
      motionRequirements,
      elementCount,
      temporalSequence,
    });
    
    // Determine category
    const category = this.categorize(score);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      visualDirection,
      { specificAction, materialProperties, motionRequirements },
      category
    );
    
    // Generate user warning if needed
    const userWarning = this.generateWarning(category, { specificAction, materialProperties, motionRequirements });
    
    return {
      score,
      category,
      factors: {
        specificAction,
        materialProperties,
        motionRequirements,
        elementCount,
        temporalSequence,
      },
      recommendations,
      userWarning,
    };
  }
  
  private analyzeSpecificActions(text: string): ComplexityAnalysis['factors']['specificAction'] {
    const found = this.SPECIFIC_ACTION_KEYWORDS.filter(k => text.includes(k));
    
    if (found.length === 0) {
      return { detected: false, description: '', difficulty: 'easy' };
    }
    
    // Hand-related actions are especially hard
    const isHandAction = text.includes('hand') && found.length > 0;
    const difficulty = isHandAction ? 'very-hard' : (found.length > 1 ? 'hard' : 'easy');
    
    return {
      detected: true,
      description: found.join(', '),
      difficulty,
    };
  }
  
  private analyzeMaterialProperties(text: string): ComplexityAnalysis['factors']['materialProperties'] {
    const found = this.MATERIAL_PROPERTY_KEYWORDS.filter(k => text.includes(k));
    
    if (found.length === 0) {
      return { detected: false, properties: [], difficulty: 'easy' };
    }
    
    // Translucent/transparent are especially hard
    const hasHardProperty = found.some(p => ['translucent', 'transparent', 'liquid', 'viscous'].includes(p));
    const difficulty = hasHardProperty ? 'very-hard' : (found.length > 1 ? 'hard' : 'easy');
    
    return {
      detected: true,
      properties: found,
      difficulty,
    };
  }
  
  private analyzeMotionRequirements(text: string): ComplexityAnalysis['factors']['motionRequirements'] {
    const found = this.PRECISE_MOTION_KEYWORDS.filter(k => text.includes(k));
    
    if (found.length === 0) {
      return { detected: false, type: '', difficulty: 'easy' };
    }
    
    return {
      detected: true,
      type: found.join(', '),
      difficulty: found.length > 1 ? 'very-hard' : 'hard',
    };
  }
  
  private countSpecificElements(text: string): number {
    // Count nouns that are specific requirements
    const specificElements = [
      'pizza dough', 'bread dough', 'pasta', 'rolling pin',
      'wooden spoon', 'chef knife', 'cutting board',
      // Add more as needed
    ];
    return specificElements.filter(e => text.includes(e)).length;
  }
  
  private hasTemporalSequence(text: string): boolean {
    const sequenceKeywords = ['then', 'after', 'before', 'while', 'during', 'until', 'as soon as'];
    return sequenceKeywords.some(k => text.includes(k));
  }
  
  private calculateScore(factors: any): number {
    let score = 0;
    
    // Specific action adds 0.2-0.4
    if (factors.specificAction.detected) {
      score += factors.specificAction.difficulty === 'very-hard' ? 0.4 : 
               factors.specificAction.difficulty === 'hard' ? 0.3 : 0.2;
    }
    
    // Material properties add 0.2-0.4
    if (factors.materialProperties.detected) {
      score += factors.materialProperties.difficulty === 'very-hard' ? 0.4 :
               factors.materialProperties.difficulty === 'hard' ? 0.3 : 0.2;
    }
    
    // Motion requirements add 0.1-0.3
    if (factors.motionRequirements.detected) {
      score += factors.motionRequirements.difficulty === 'very-hard' ? 0.3 :
               factors.motionRequirements.difficulty === 'hard' ? 0.2 : 0.1;
    }
    
    // Element count adds up to 0.2
    score += Math.min(factors.elementCount * 0.05, 0.2);
    
    // Temporal sequence adds 0.1
    if (factors.temporalSequence) score += 0.1;
    
    return Math.min(score, 1);
  }
  
  private categorize(score: number): ComplexityAnalysis['category'] {
    if (score >= 0.8) return 'impossible';
    if (score >= 0.5) return 'complex';
    if (score >= 0.3) return 'moderate';
    return 'simple';
  }
  
  private generateRecommendations(
    originalPrompt: string,
    factors: any,
    category: string
  ): ComplexityAnalysis['recommendations'] {
    
    const recommendations: ComplexityAnalysis['recommendations'] = {
      bestProviders: [],
      avoidProviders: [],
    };
    
    // For complex/impossible, suggest simplification
    if (category === 'complex' || category === 'impossible') {
      recommendations.simplifiedPrompt = this.simplifyPrompt(originalPrompt, factors);
      
      // Suggest alternative approaches
      if (factors.specificAction.difficulty === 'very-hard') {
        recommendations.alternativeApproach = 'stock-footage';
      } else if (factors.materialProperties.difficulty === 'very-hard') {
        recommendations.alternativeApproach = 'reference-image';
      }
    }
    
    // Provider recommendations based on content type
    if (originalPrompt.includes('hand')) {
      recommendations.bestProviders = ['kling-2.5-turbo', 'runway-gen3'];
      recommendations.avoidProviders = ['hailuo-minimax', 'wan-2.1'];
    }
    
    if (originalPrompt.includes('food') || originalPrompt.includes('dough')) {
      recommendations.bestProviders = ['kling-2.5-turbo', 'luma-dream-machine'];
    }
    
    return recommendations;
  }
  
  private simplifyPrompt(original: string, factors: any): string {
    let simplified = original;
    
    // Remove material property requirements
    for (const prop of factors.materialProperties.properties || []) {
      simplified = simplified.replace(new RegExp(prop, 'gi'), '').trim();
    }
    
    // Simplify motion requirements
    for (const motion of this.PRECISE_MOTION_KEYWORDS) {
      simplified = simplified.replace(new RegExp(motion, 'gi'), '').trim();
    }
    
    // Clean up
    simplified = simplified.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();
    
    return simplified || original;
  }
  
  private generateWarning(
    category: string,
    factors: any
  ): string | undefined {
    
    if (category === 'impossible') {
      return '⚠️ This visual direction is extremely specific and may be impossible for current AI video models. Consider using stock footage or simplifying the requirements.';
    }
    
    if (category === 'complex') {
      const issues: string[] = [];
      
      if (factors.specificAction.difficulty === 'very-hard') {
        issues.push('specific hand/body actions');
      }
      if (factors.materialProperties.difficulty === 'very-hard') {
        issues.push('material properties (translucent, liquid, etc.)');
      }
      if (factors.motionRequirements.difficulty === 'very-hard') {
        issues.push('precise motion direction');
      }
      
      return `⚠️ This prompt has complex requirements (${issues.join(', ')}) that AI video models struggle with. Results may not match expectations. Consider simplifying or using a reference image.`;
    }
    
    return undefined;
  }
}

export const promptComplexityAnalyzer = new PromptComplexityAnalyzer();
```

---

## Phase 13C: Smart Provider Routing

Route to the best provider based on prompt analysis.

```typescript
// server/services/smart-provider-router.ts

import { VIDEO_PROVIDERS, VideoProvider } from '../config/video-providers';
import { promptComplexityAnalyzer, ComplexityAnalysis } from './prompt-complexity-analyzer';

interface RoutingDecision {
  recommendedProvider: string;
  confidence: number;
  reasoning: string[];
  
  // Alternatives in order of preference
  alternatives: Array<{
    provider: string;
    reason: string;
  }>;
  
  // Warnings
  warnings: string[];
  
  // Complexity info
  complexity: ComplexityAnalysis;
}

class SmartProviderRouter {
  
  /**
   * Route visual direction to best provider
   */
  route(
    visualDirection: string,
    sceneType: 'b-roll' | 'talking-head' | 'product' | 'lifestyle' | 'cinematic',
    preferredProvider?: string
  ): RoutingDecision {
    
    // Analyze prompt complexity
    const complexity = promptComplexityAnalyzer.analyze(visualDirection);
    
    // Get candidate providers
    const candidates = this.getCandidates(sceneType, complexity);
    
    // Score candidates
    const scored = this.scoreCandidates(candidates, visualDirection, complexity);
    
    // Build decision
    const best = scored[0];
    const alternatives = scored.slice(1, 4);
    
    const reasoning = this.buildReasoning(best.provider, visualDirection, complexity);
    const warnings = this.buildWarnings(complexity, best.provider);
    
    return {
      recommendedProvider: best.provider.id,
      confidence: best.score,
      reasoning,
      alternatives: alternatives.map(a => ({
        provider: a.provider.id,
        reason: a.reason,
      })),
      warnings,
      complexity,
    };
  }
  
  private getCandidates(
    sceneType: string,
    complexity: ComplexityAnalysis
  ): VideoProvider[] {
    
    // Filter to video-capable providers
    const videoProviders = Object.values(VIDEO_PROVIDERS).filter(
      p => p.capabilities.textToVideo || p.capabilities.imageToVideo
    );
    
    // If complexity is impossible, limit to best providers only
    if (complexity.category === 'impossible') {
      return videoProviders.filter(p => 
        p.capabilities.motionQuality === 'excellent' || 
        p.capabilities.motionQuality === 'cinematic'
      );
    }
    
    return videoProviders;
  }
  
  private scoreCandidates(
    candidates: VideoProvider[],
    visualDirection: string,
    complexity: ComplexityAnalysis
  ): Array<{ provider: VideoProvider; score: number; reason: string }> {
    
    const lower = visualDirection.toLowerCase();
    
    return candidates.map(provider => {
      let score = 0.5; // Base score
      let reason = '';
      
      // Boost for relevant strengths
      for (const strength of provider.capabilities.strengths) {
        if (this.strengthMatchesContent(strength, lower)) {
          score += 0.15;
          reason = `Good for ${strength}`;
        }
      }
      
      // Penalty for weaknesses
      for (const weakness of provider.capabilities.weaknesses) {
        if (this.weaknessMatchesContent(weakness, lower)) {
          score -= 0.2;
        }
      }
      
      // Boost for high quality on complex prompts
      if (complexity.category === 'complex' || complexity.category === 'impossible') {
        if (provider.capabilities.motionQuality === 'cinematic') score += 0.2;
        if (provider.capabilities.motionQuality === 'excellent') score += 0.1;
        if (provider.capabilities.temporalConsistency === 'high') score += 0.1;
      }
      
      // Boost for recommended providers from complexity analysis
      if (complexity.recommendations.bestProviders.includes(provider.id)) {
        score += 0.25;
        reason = 'Recommended for this content type';
      }
      
      // Penalty for avoided providers
      if (complexity.recommendations.avoidProviders.includes(provider.id)) {
        score -= 0.3;
      }
      
      return { provider, score: Math.max(0, Math.min(1, score)), reason };
    }).sort((a, b) => b.score - a.score);
  }
  
  private strengthMatchesContent(strength: string, content: string): boolean {
    const strengthKeywords: Record<string, string[]> = {
      'human-faces': ['face', 'person', 'people', 'man', 'woman', 'portrait'],
      'human-motion': ['walking', 'running', 'dancing', 'moving', 'gesture'],
      'hand-actions': ['hand', 'hands', 'finger', 'holding', 'touching'],
      'food-content': ['food', 'cooking', 'kitchen', 'recipe', 'ingredient', 'dough', 'pizza'],
      'product-shots': ['product', 'bottle', 'package', 'item', 'display'],
      'nature-scenes': ['nature', 'forest', 'ocean', 'mountain', 'landscape', 'outdoor'],
      'cinematic': ['cinematic', 'dramatic', 'epic', 'film'],
      'b-roll': ['b-roll', 'background', 'ambient', 'establishing'],
      'camera-movement': ['pan', 'zoom', 'dolly', 'tracking', 'orbit'],
    };
    
    const keywords = strengthKeywords[strength] || [];
    return keywords.some(k => content.includes(k));
  }
  
  private weaknessMatchesContent(weakness: string, content: string): boolean {
    const weaknessKeywords: Record<string, string[]> = {
      'specific-actions': ['stretching', 'pulling', 'kneading', 'precise', 'exactly'],
      'text-in-video': ['text', 'title', 'subtitle', 'logo', 'writing'],
      'complex-motion': ['complex', 'intricate', 'detailed motion'],
      'translucent-materials': ['translucent', 'transparent', 'see-through', 'glass'],
      'fine-details': ['detail', 'intricate', 'precise', 'exact'],
    };
    
    const keywords = weaknessKeywords[weakness] || [];
    return keywords.some(k => content.includes(k));
  }
  
  private buildReasoning(
    provider: VideoProvider,
    visualDirection: string,
    complexity: ComplexityAnalysis
  ): string[] {
    const reasons: string[] = [];
    
    reasons.push(`${provider.name} selected as best match`);
    
    if (complexity.category !== 'simple') {
      reasons.push(`Prompt complexity: ${complexity.category}`);
    }
    
    const matchingStrengths = provider.capabilities.strengths.filter(s =>
      this.strengthMatchesContent(s, visualDirection.toLowerCase())
    );
    if (matchingStrengths.length > 0) {
      reasons.push(`Strengths match: ${matchingStrengths.join(', ')}`);
    }
    
    return reasons;
  }
  
  private buildWarnings(
    complexity: ComplexityAnalysis,
    provider: VideoProvider
  ): string[] {
    const warnings: string[] = [];
    
    if (complexity.userWarning) {
      warnings.push(complexity.userWarning);
    }
    
    if (complexity.category === 'impossible') {
      warnings.push(`Even ${provider.name} may struggle with this prompt. Consider simplifying.`);
    }
    
    return warnings;
  }
}

export const smartProviderRouter = new SmartProviderRouter();
```

---

## Summary

Phase 13 addresses your critical issues:

1. **Provider Registry** - All missing providers added (Kling 2.5, Wan 2.6, Veo 3.1, etc.)
2. **Complexity Analysis** - Detects when prompts are too specific (like pizza dough)
3. **Smart Routing** - Routes to providers best suited for content type
4. **Warnings** - Tells user when prompt is too complex
5. **Recommendations** - Suggests simplified prompts or alternative approaches

The next phases (13D, 13E, 13F) will cover:
- UI for reference images (image-to-image, image-to-video)
- Intelligent regeneration workflow
- Stock footage fallback

Shall I continue with those phases?
