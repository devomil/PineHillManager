# Phase 8D: Mood-Matched Transitions

## Objective

Implement intelligent transition selection that analyzes the emotional flow between scenes and selects appropriate transition types, durations, and effects to create smooth, professional video flow.

## What This Phase Creates

- `server/services/transition-service.ts` - Transition selection logic
- Audio crossfade integration
- Remotion transition configuration

---

## Transition Service

Create `server/services/transition-service.ts`:

```typescript
// server/services/transition-service.ts

import { SceneAnalysisResult } from './scene-analysis-service';

// ============================================
// TYPES
// ============================================

export type TransitionType = 
  | 'cut'
  | 'fade'
  | 'dissolve'
  | 'wipe-left'
  | 'wipe-right'
  | 'wipe-up'
  | 'wipe-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'slide-left'
  | 'slide-right'
  | 'blur';

export interface TransitionConfig {
  type: TransitionType;
  duration: number;           // seconds
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  audioCrossfade: boolean;
  audioCrossfadeDuration: number;
}

export interface SceneTransition {
  fromSceneIndex: number;
  toSceneIndex: number;
  config: TransitionConfig;
  moodFlow: string;           // e.g., "struggle → hope"
  reason: string;
  confidence: number;
}

export interface TransitionPlan {
  transitions: SceneTransition[];
  summary: {
    totalTransitions: number;
    byType: Record<TransitionType, number>;
    averageDuration: number;
  };
}

// ============================================
// MOOD AND SCENE TYPE MAPPING
// ============================================

const SCENE_TYPE_MOODS: Record<string, string> = {
  hook: 'attention',
  problem: 'concern',
  agitation: 'frustration',
  solution: 'hope',
  benefit: 'optimism',
  explanation: 'learning',
  testimonial: 'trust',
  product: 'interest',
  cta: 'action',
  outro: 'closure',
};

const MOOD_TRANSITIONS: Record<string, Record<string, TransitionConfig>> = {
  // From attention (hook)
  'attention→concern': {
    type: 'dissolve',
    duration: 0.8,
    easing: 'ease-in-out',
    audioCrossfade: true,
    audioCrossfadeDuration: 0.6,
  },
  'attention→learning': {
    type: 'fade',
    duration: 0.6,
    easing: 'ease-out',
    audioCrossfade: true,
    audioCrossfadeDuration: 0.4,
  },
  
  // From concern/frustration (problem/agitation)
  'concern→hope': {
    type: 'dissolve',
    duration: 1.2,
    easing: 'ease-in-out',
    audioCrossfade: true,
    audioCrossfadeDuration: 1.0,
  },
  'frustration→hope': {
    type: 'fade',
    duration: 1.0,
    easing: 'ease-out',
    audioCrossfade: true,
    audioCrossfadeDuration: 0.8,
  },
  'concern→frustration': {
    type: 'cut',
    duration: 0.1,
    easing: 'linear',
    audioCrossfade: false,
    audioCrossfadeDuration: 0,
  },
  
  // From hope/optimism (solution/benefit)
  'hope→optimism': {
    type: 'dissolve',
    duration: 0.6,
    easing: 'ease-in-out',
    audioCrossfade: true,
    audioCrossfadeDuration: 0.4,
  },
  'optimism→optimism': {
    type: 'dissolve',
    duration: 0.5,
    easing: 'ease-in-out',
    audioCrossfade: true,
    audioCrossfadeDuration: 0.3,
  },
  'hope→action': {
    type: 'zoom-in',
    duration: 0.8,
    easing: 'ease-in',
    audioCrossfade: true,
    audioCrossfadeDuration: 0.6,
  },
  
  // From learning (explanation)
  'learning→learning': {
    type: 'cut',
    duration: 0.15,
    easing: 'linear',
    audioCrossfade: true,
    audioCrossfadeDuration: 0.1,
  },
  'learning→hope': {
    type: 'fade',
    duration: 0.8,
    easing: 'ease-out',
    audioCrossfade: true,
    audioCrossfadeDuration: 0.6,
  },
  
  // From trust (testimonial)
  'trust→action': {
    type: 'dissolve',
    duration: 0.8,
    easing: 'ease-in-out',
    audioCrossfade: true,
    audioCrossfadeDuration: 0.6,
  },
  
  // From interest (product)
  'interest→action': {
    type: 'slide-right',
    duration: 0.6,
    easing: 'ease-in-out',
    audioCrossfade: true,
    audioCrossfadeDuration: 0.4,
  },
  
  // To closure (outro)
  'action→closure': {
    type: 'fade',
    duration: 1.5,
    easing: 'ease-out',
    audioCrossfade: true,
    audioCrossfadeDuration: 1.2,
  },
};

// Default transition when no specific mapping exists
const DEFAULT_TRANSITION: TransitionConfig = {
  type: 'dissolve',
  duration: 0.5,
  easing: 'ease-in-out',
  audioCrossfade: true,
  audioCrossfadeDuration: 0.3,
};

// ============================================
// VISUAL STYLE TRANSITION PREFERENCES
// ============================================

const STYLE_PREFERENCES: Record<string, Partial<TransitionConfig>> = {
  professional: {
    type: 'dissolve',
    duration: 0.5,
    easing: 'ease-in-out',
  },
  cinematic: {
    type: 'fade',
    duration: 1.0,
    easing: 'ease-in-out',
  },
  energetic: {
    type: 'cut',
    duration: 0.2,
    easing: 'linear',
  },
  calm: {
    type: 'dissolve',
    duration: 1.2,
    easing: 'ease-out',
  },
  documentary: {
    type: 'fade',
    duration: 0.6,
    easing: 'ease-in-out',
  },
  luxury: {
    type: 'fade',
    duration: 1.0,
    easing: 'ease-in-out',
  },
  minimal: {
    type: 'cut',
    duration: 0.1,
    easing: 'linear',
  },
  casual: {
    type: 'dissolve',
    duration: 0.4,
    easing: 'ease-out',
  },
};

// ============================================
// TRANSITION SERVICE
// ============================================

class TransitionService {
  
  /**
   * Plan all transitions for a project
   */
  planTransitions(
    scenes: Array<{
      sceneIndex: number;
      sceneType: string;
      duration: number;
      analysisResult?: SceneAnalysisResult;
    }>,
    visualStyle: string
  ): TransitionPlan {
    const transitions: SceneTransition[] = [];
    const typeCount: Record<TransitionType, number> = {} as Record<TransitionType, number>;
    let totalDuration = 0;
    
    for (let i = 0; i < scenes.length - 1; i++) {
      const fromScene = scenes[i];
      const toScene = scenes[i + 1];
      
      const transition = this.selectTransition(
        fromScene,
        toScene,
        visualStyle
      );
      
      transitions.push(transition);
      
      // Track stats
      typeCount[transition.config.type] = (typeCount[transition.config.type] || 0) + 1;
      totalDuration += transition.config.duration;
    }
    
    console.log(`[Transitions] Planned ${transitions.length} transitions`);
    
    return {
      transitions,
      summary: {
        totalTransitions: transitions.length,
        byType: typeCount,
        averageDuration: transitions.length > 0 
          ? totalDuration / transitions.length 
          : 0,
      },
    };
  }
  
  /**
   * Select optimal transition between two scenes
   */
  private selectTransition(
    fromScene: {
      sceneIndex: number;
      sceneType: string;
      duration: number;
      analysisResult?: SceneAnalysisResult;
    },
    toScene: {
      sceneIndex: number;
      sceneType: string;
      duration: number;
      analysisResult?: SceneAnalysisResult;
    },
    visualStyle: string
  ): SceneTransition {
    // Get moods
    const fromMood = SCENE_TYPE_MOODS[fromScene.sceneType] || 'neutral';
    const toMood = SCENE_TYPE_MOODS[toScene.sceneType] || 'neutral';
    const moodFlow = `${fromMood}→${toMood}`;
    
    // Try to find specific mood transition
    let config = MOOD_TRANSITIONS[moodFlow];
    let reason = `Mood flow: ${moodFlow}`;
    
    if (!config) {
      // Fall back to style preference
      config = {
        ...DEFAULT_TRANSITION,
        ...STYLE_PREFERENCES[visualStyle],
      };
      reason = `Style preference: ${visualStyle}`;
    }
    
    // Adjust based on scene content analysis
    config = this.adjustForContent(config, fromScene, toScene);
    
    // Ensure transition doesn't exceed scene duration
    const maxDuration = Math.min(fromScene.duration, toScene.duration) * 0.3;
    if (config.duration > maxDuration) {
      config = { ...config, duration: maxDuration };
    }
    
    return {
      fromSceneIndex: fromScene.sceneIndex,
      toSceneIndex: toScene.sceneIndex,
      config,
      moodFlow,
      reason,
      confidence: this.calculateConfidence(config, fromScene, toScene),
    };
  }
  
  /**
   * Adjust transition based on visual content
   */
  private adjustForContent(
    baseConfig: TransitionConfig,
    fromScene: { analysisResult?: SceneAnalysisResult },
    toScene: { analysisResult?: SceneAnalysisResult }
  ): TransitionConfig {
    const config = { ...baseConfig };
    
    // If both scenes have similar color palettes, use dissolve
    if (fromScene.analysisResult && toScene.analysisResult) {
      const fromColors = fromScene.analysisResult.frameAnalysis.dominantColors;
      const toColors = toScene.analysisResult.frameAnalysis.dominantColors;
      
      const similarColors = fromColors.some(fc => 
        toColors.some(tc => this.colorsAreSimilar(fc, tc))
      );
      
      if (similarColors && config.type === 'cut') {
        // Upgrade cut to dissolve for visual continuity
        config.type = 'dissolve';
        config.duration = 0.4;
      }
    }
    
    // If lighting changes dramatically, use longer transition
    if (fromScene.analysisResult && toScene.analysisResult) {
      const fromLighting = fromScene.analysisResult.frameAnalysis.lightingType;
      const toLighting = toScene.analysisResult.frameAnalysis.lightingType;
      
      if (fromLighting !== toLighting) {
        config.duration = Math.max(config.duration, 0.8);
      }
    }
    
    return config;
  }
  
  /**
   * Check if two colors are similar (simple heuristic)
   */
  private colorsAreSimilar(color1: string, color2: string): boolean {
    // Simple string matching - could be improved with actual color distance
    return color1.toLowerCase() === color2.toLowerCase();
  }
  
  /**
   * Calculate confidence in transition selection
   */
  private calculateConfidence(
    config: TransitionConfig,
    fromScene: { sceneType: string },
    toScene: { sceneType: string }
  ): number {
    const fromMood = SCENE_TYPE_MOODS[fromScene.sceneType];
    const toMood = SCENE_TYPE_MOODS[toScene.sceneType];
    const moodFlow = `${fromMood}→${toMood}`;
    
    // High confidence if we have a specific mapping
    if (MOOD_TRANSITIONS[moodFlow]) {
      return 90;
    }
    
    // Medium confidence for style-based selection
    return 70;
  }
  
  /**
   * Get Remotion transition component name
   */
  getRemotionTransition(type: TransitionType): string {
    const mapping: Record<TransitionType, string> = {
      'cut': 'none',
      'fade': 'fade',
      'dissolve': 'fade', // Remotion uses fade for dissolve
      'wipe-left': 'wipe',
      'wipe-right': 'wipe',
      'wipe-up': 'wipe',
      'wipe-down': 'wipe',
      'zoom-in': 'zoom',
      'zoom-out': 'zoom',
      'slide-left': 'slide',
      'slide-right': 'slide',
      'blur': 'fade', // Custom implementation needed
    };
    
    return mapping[type] || 'fade';
  }
  
  /**
   * Generate Remotion transition props
   */
  getRemotionTransitionProps(transition: SceneTransition, fps: number): object {
    const durationFrames = Math.round(transition.config.duration * fps);
    
    const baseProps = {
      durationInFrames: durationFrames,
      timing: transition.config.easing,
    };
    
    // Add type-specific props
    switch (transition.config.type) {
      case 'wipe-left':
        return { ...baseProps, direction: 'from-left' };
      case 'wipe-right':
        return { ...baseProps, direction: 'from-right' };
      case 'wipe-up':
        return { ...baseProps, direction: 'from-top' };
      case 'wipe-down':
        return { ...baseProps, direction: 'from-bottom' };
      case 'slide-left':
        return { ...baseProps, direction: 'from-right' };
      case 'slide-right':
        return { ...baseProps, direction: 'from-left' };
      case 'zoom-in':
        return { ...baseProps, zoom: 'in' };
      case 'zoom-out':
        return { ...baseProps, zoom: 'out' };
      default:
        return baseProps;
    }
  }
  
  /**
   * Generate audio crossfade configuration
   */
  getAudioCrossfadeConfig(transition: SceneTransition): {
    enabled: boolean;
    duration: number;
    curve: 'linear' | 'exponential';
  } {
    return {
      enabled: transition.config.audioCrossfade,
      duration: transition.config.audioCrossfadeDuration,
      curve: 'exponential', // Sounds more natural
    };
  }
}

export const transitionService = new TransitionService();
```

---

## Integration with Remotion

```typescript
// In Remotion video composition:

import { TransitionSeries } from '@remotion/transitions';
import { fade, slide, wipe } from '@remotion/transitions/effects';

const VideoComposition: React.FC<{ transitions: SceneTransition[] }> = ({ transitions }) => {
  return (
    <TransitionSeries>
      {scenes.map((scene, index) => {
        const transition = transitions.find(t => t.fromSceneIndex === index);
        
        return (
          <>
            <TransitionSeries.Sequence durationInFrames={scene.durationFrames}>
              <SceneComponent scene={scene} />
            </TransitionSeries.Sequence>
            
            {transition && (
              <TransitionSeries.Transition
                timing={transition.config.easing}
                presentation={getTransitionEffect(transition)}
              />
            )}
          </>
        );
      })}
    </TransitionSeries>
  );
};

function getTransitionEffect(transition: SceneTransition) {
  switch (transition.config.type) {
    case 'fade':
    case 'dissolve':
      return fade();
    case 'slide-left':
      return slide({ direction: 'from-left' });
    case 'slide-right':
      return slide({ direction: 'from-right' });
    case 'wipe-left':
      return wipe({ direction: 'from-left' });
    // ... etc
    default:
      return fade();
  }
}
```

---

## Verification Checklist

- [ ] Transition service created
- [ ] Mood mapping for all scene types
- [ ] Mood-based transition selection working
- [ ] Visual style preferences applied
- [ ] Content-based adjustments (color, lighting)
- [ ] Audio crossfade configuration generated
- [ ] Remotion transition props exported
- [ ] Transition duration respects scene length
- [ ] Confidence scores calculated

---

## Next Phase

Once Mood-Matched Transitions is working, proceed to **Phase 8E: Brand Asset Injection** which automatically adds logo intros, watermarks, and CTA outros.
