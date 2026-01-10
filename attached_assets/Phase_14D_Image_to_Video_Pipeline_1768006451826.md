# Phase 14D: Image-to-Video Pipeline

## Objective

Animate composed images (from Phase 14C) or raw brand assets with appropriate motion styles. This phase handles the transition from static branded images to broadcast-quality video with environmental motion, subtle camera movement, and product-appropriate animation.

## Motion Style Philosophy

Based on user requirements:
- **Environmental motion**: Products stay static, background has subtle life (plants swaying, light shifting)
- **Subtle motion**: Products remain stable, camera has gentle drift/push
- **Reveal animation**: Products emerge into frame or camera reveals detail

These approaches keep the **product perfectly sharp and recognizable** while adding cinematic life to the frame.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Image-to-Video Pipeline                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: Composed Image (from 14C) or Brand Asset                │
│                        │                                         │
│                        ▼                                         │
│  ┌──────────────────────────────────────────┐                   │
│  │         Motion Style Router               │                   │
│  │  ├─ Environmental: Kling/Luma (low motion)│                   │
│  │  ├─ Subtle: Runway Gen-3 (camera motion) │                   │
│  │  └─ Reveal: Kling (subject motion)       │                   │
│  └──────────────────────────────────────────┘                   │
│                        │                                         │
│                        ▼                                         │
│  ┌──────────────────────────────────────────┐                   │
│  │         Provider-Specific Handler         │                   │
│  │  - Build optimal prompt for motion style │                   │
│  │  - Set motion intensity parameters       │                   │
│  │  - Execute image-to-video generation     │                   │
│  └──────────────────────────────────────────┘                   │
│                        │                                         │
│                        ▼                                         │
│  ┌──────────────────────────────────────────┐                   │
│  │         Post-Processing                   │                   │
│  │  - Quality verification                  │                   │
│  │  - Logo/watermark addition (Remotion)    │                   │
│  │  - Duration trimming                     │                   │
│  └──────────────────────────────────────────┘                   │
│                        │                                         │
│                        ▼                                         │
│                  Output: Video URL                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Define Video Generation Types

```typescript
// shared/types/brand-video-types.ts

export type MotionStyle = 
  | 'environmental'  // Background has life, product static
  | 'subtle'         // Gentle camera drift, everything stable
  | 'reveal'         // Product/element emerges or is revealed
  | 'zoom-in'        // Slow zoom toward product/detail
  | 'zoom-out'       // Pull back to show context
  | 'pan'            // Horizontal camera movement
  | 'static';        // No motion (for comparison/fallback)

export interface ImageToVideoRequest {
  // Source
  sourceImageUrl: string;
  sourceType: 'composed' | 'brand-asset' | 'product-photo';
  
  // Scene context
  sceneId: string;
  visualDirection: string;
  
  // Motion configuration
  motion: {
    style: MotionStyle;
    intensity: 'minimal' | 'low' | 'medium';  // Never high for brand content
    duration: number;  // Seconds
    
    // Style-specific options
    cameraMovement?: {
      direction: 'left' | 'right' | 'up' | 'down' | 'push' | 'pull';
      distance: 'subtle' | 'moderate';
    };
    
    environmentalEffects?: {
      lightFlicker: boolean;
      plantMovement: boolean;
      particleDust: boolean;
    };
    
    revealDirection?: 'left' | 'right' | 'bottom' | 'top' | 'center';
  };
  
  // Product protection (regions to keep stable)
  productRegions?: Array<{
    bounds: { x: number; y: number; width: number; height: number };
    importance: 'critical' | 'high' | 'medium';
  }>;
  
  // Output settings
  output: {
    width: number;
    height: number;
    fps: 24 | 30;
    format: 'mp4' | 'webm';
  };
}

export interface ImageToVideoResult {
  success: boolean;
  videoUrl: string;
  duration: number;
  
  // Quality metrics
  quality: {
    motionSmoothness: number;  // 0-1
    productStability: number;  // 0-1, how well products stayed sharp
    overallScore: number;
  };
  
  error?: string;
  provider: string;
}

// Provider capabilities for image-to-video
export interface I2VProviderCapabilities {
  name: string;
  supportedMotionStyles: MotionStyle[];
  maxDuration: number;
  motionControl: 'prompt-only' | 'basic' | 'advanced';
  bestFor: string[];
}
```

---

## Step 2: Provider Capabilities Map

```typescript
// server/services/i2v-provider-capabilities.ts

import { I2VProviderCapabilities, MotionStyle } from '../../shared/types/brand-video-types';

export const I2V_PROVIDER_CAPABILITIES: Record<string, I2VProviderCapabilities> = {
  'kling-1.6': {
    name: 'Kling 1.6',
    supportedMotionStyles: ['environmental', 'subtle', 'reveal', 'zoom-in', 'pan'],
    maxDuration: 10,
    motionControl: 'advanced',
    bestFor: [
      'Product shots with environmental motion',
      'Lifestyle scenes with subtle movement',
      'Reveal animations',
    ],
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
  },
};

/**
 * Select best provider for motion style
 */
export function selectI2VProvider(
  motionStyle: MotionStyle,
  duration: number,
  preferQuality: boolean = true
): string {
  
  // Filter providers that support the motion style
  const compatible = Object.entries(I2V_PROVIDER_CAPABILITIES)
    .filter(([_, caps]) => 
      caps.supportedMotionStyles.includes(motionStyle) &&
      caps.maxDuration >= duration
    );
  
  if (compatible.length === 0) {
    // Fallback to Kling as most versatile
    return 'kling-1.6';
  }
  
  // Prefer providers with advanced motion control for brand content
  if (preferQuality) {
    const advanced = compatible.find(([_, caps]) => caps.motionControl === 'advanced');
    if (advanced) return advanced[0];
  }
  
  // Motion style specific preferences
  switch (motionStyle) {
    case 'environmental':
      // Luma is great for organic environmental motion
      const luma = compatible.find(([name]) => name === 'luma-dream-machine');
      if (luma) return luma[0];
      break;
      
    case 'subtle':
    case 'zoom-in':
    case 'zoom-out':
      // Runway excels at controlled camera movement
      const runway = compatible.find(([name]) => name === 'runway-gen3');
      if (runway) return runway[0];
      break;
      
    case 'reveal':
      // Kling handles reveals well
      const kling = compatible.find(([name]) => name === 'kling-1.6');
      if (kling) return kling[0];
      break;
  }
  
  // Default to first compatible
  return compatible[0][0];
}
```

---

## Step 3: Image-to-Video Service

```typescript
// server/services/image-to-video-service.ts

import {
  ImageToVideoRequest,
  ImageToVideoResult,
  MotionStyle,
} from '../../shared/types/brand-video-types';
import { selectI2VProvider, I2V_PROVIDER_CAPABILITIES } from './i2v-provider-capabilities';

class ImageToVideoService {
  
  /**
   * Generate video from image with specified motion style
   */
  async generate(request: ImageToVideoRequest): Promise<ImageToVideoResult> {
    console.log(`[I2V] Generating video for scene ${request.sceneId}`);
    console.log(`[I2V] Motion style: ${request.motion.style}, Duration: ${request.motion.duration}s`);
    
    try {
      // Select optimal provider
      const providerId = selectI2VProvider(
        request.motion.style,
        request.motion.duration,
        true // Prefer quality for brand content
      );
      
      console.log(`[I2V] Selected provider: ${providerId}`);
      
      // Build motion prompt
      const motionPrompt = this.buildMotionPrompt(request);
      
      // Execute generation with selected provider
      const result = await this.executeGeneration(providerId, request, motionPrompt);
      
      // Verify quality
      const quality = await this.assessQuality(result.videoUrl, request);
      
      return {
        ...result,
        quality,
        provider: providerId,
      };
      
    } catch (error) {
      console.error(`[I2V] Generation failed:`, error);
      return {
        success: false,
        videoUrl: '',
        duration: 0,
        quality: { motionSmoothness: 0, productStability: 0, overallScore: 0 },
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: '',
      };
    }
  }
  
  /**
   * Build optimized prompt for motion style
   */
  private buildMotionPrompt(request: ImageToVideoRequest): string {
    const { motion, visualDirection } = request;
    
    let prompt = '';
    
    // Base motion style prompts
    switch (motion.style) {
      case 'environmental':
        prompt = this.buildEnvironmentalPrompt(motion);
        break;
        
      case 'subtle':
        prompt = this.buildSubtleMotionPrompt(motion);
        break;
        
      case 'reveal':
        prompt = this.buildRevealPrompt(motion);
        break;
        
      case 'zoom-in':
        prompt = 'Slow, smooth zoom in toward center of frame, maintaining focus';
        if (motion.intensity === 'minimal') {
          prompt += ', very subtle movement';
        }
        break;
        
      case 'zoom-out':
        prompt = 'Gentle pull back revealing full scene, smooth motion';
        break;
        
      case 'pan':
        const dir = motion.cameraMovement?.direction || 'right';
        prompt = `Slow ${dir === 'left' || dir === 'right' ? 'horizontal' : 'vertical'} pan, cinematic movement`;
        break;
        
      case 'static':
        prompt = 'Completely static, no movement';
        break;
    }
    
    // Add product stability instructions
    if (request.productRegions && request.productRegions.length > 0) {
      prompt += ', keeping central product elements sharp and stable';
    }
    
    // Add intensity modifier
    if (motion.intensity === 'minimal') {
      prompt += ', barely perceptible motion';
    } else if (motion.intensity === 'low') {
      prompt += ', gentle subtle movement';
    }
    
    // Add quality modifiers
    prompt += ', professional quality, smooth motion, no artifacts';
    
    return prompt;
  }
  
  /**
   * Build environmental motion prompt
   */
  private buildEnvironmentalPrompt(motion: ImageToVideoRequest['motion']): string {
    const effects: string[] = [];
    
    if (motion.environmentalEffects?.plantMovement) {
      effects.push('leaves gently swaying');
    }
    if (motion.environmentalEffects?.lightFlicker) {
      effects.push('soft natural light shifting');
    }
    if (motion.environmentalEffects?.particleDust) {
      effects.push('subtle dust particles floating in light');
    }
    
    if (effects.length === 0) {
      effects.push('subtle ambient movement in background');
    }
    
    return `Products remain perfectly still, ${effects.join(', ')}, atmospheric scene`;
  }
  
  /**
   * Build subtle camera motion prompt
   */
  private buildSubtleMotionPrompt(motion: ImageToVideoRequest['motion']): string {
    const direction = motion.cameraMovement?.direction || 'push';
    const distance = motion.cameraMovement?.distance || 'subtle';
    
    const directionMap: Record<string, string> = {
      left: 'slight drift to the left',
      right: 'slight drift to the right',
      up: 'gentle upward tilt',
      down: 'soft downward movement',
      push: 'almost imperceptible push forward',
      pull: 'very gentle pull back',
    };
    
    return `Smooth ${distance} camera movement, ${directionMap[direction]}, keeping subject in focus`;
  }
  
  /**
   * Build reveal animation prompt
   */
  private buildRevealPrompt(motion: ImageToVideoRequest['motion']): string {
    const direction = motion.revealDirection || 'center';
    
    const directionMap: Record<string, string> = {
      left: 'product smoothly enters from left side of frame',
      right: 'product elegantly slides in from right',
      bottom: 'product rises into view from bottom',
      top: 'product descends gracefully into frame',
      center: 'product fades in with gentle scale animation',
    };
    
    return `${directionMap[direction]}, professional reveal animation, cinematic timing`;
  }
  
  /**
   * Execute generation with specific provider
   */
  private async executeGeneration(
    providerId: string,
    request: ImageToVideoRequest,
    motionPrompt: string
  ): Promise<Omit<ImageToVideoResult, 'quality' | 'provider'>> {
    
    // Get provider capabilities
    const caps = I2V_PROVIDER_CAPABILITIES[providerId];
    
    console.log(`[I2V] Executing with ${caps.name}`);
    console.log(`[I2V] Motion prompt: ${motionPrompt}`);
    
    // Provider-specific API calls would go here
    // This integrates with existing provider infrastructure
    
    switch (providerId) {
      case 'kling-1.6':
        return this.generateWithKling(request, motionPrompt);
        
      case 'runway-gen3':
        return this.generateWithRunway(request, motionPrompt);
        
      case 'luma-dream-machine':
        return this.generateWithLuma(request, motionPrompt);
        
      case 'hailuo-minimax':
        return this.generateWithHailuo(request, motionPrompt);
        
      case 'veo-2':
        return this.generateWithVeo(request, motionPrompt);
        
      default:
        throw new Error(`Unknown provider: ${providerId}`);
    }
  }
  
  /**
   * Generate with Kling 1.6
   */
  private async generateWithKling(
    request: ImageToVideoRequest,
    motionPrompt: string
  ): Promise<Omit<ImageToVideoResult, 'quality' | 'provider'>> {
    
    // Kling API call via PiAPI or direct
    // Uses existing kling provider infrastructure
    
    const klingRequest = {
      image: request.sourceImageUrl,
      prompt: motionPrompt,
      duration: Math.min(request.motion.duration, 10),
      mode: request.motion.intensity === 'minimal' ? 'std' : 'pro',
      aspect_ratio: '16:9',
    };
    
    console.log(`[I2V][Kling] Request:`, klingRequest);
    
    // TODO: Replace with actual Kling API call
    // const response = await klingProvider.imageToVideo(klingRequest);
    
    // Placeholder response
    return {
      success: true,
      videoUrl: `https://example.com/generated-video-${request.sceneId}.mp4`,
      duration: request.motion.duration,
    };
  }
  
  /**
   * Generate with Runway Gen-3
   */
  private async generateWithRunway(
    request: ImageToVideoRequest,
    motionPrompt: string
  ): Promise<Omit<ImageToVideoResult, 'quality' | 'provider'>> {
    
    // Runway has excellent camera motion control
    const runwayRequest = {
      promptImage: request.sourceImageUrl,
      promptText: motionPrompt,
      seed: Math.floor(Math.random() * 1000000),
      duration: Math.min(request.motion.duration, 10),
      watermark: false,
    };
    
    console.log(`[I2V][Runway] Request:`, runwayRequest);
    
    // TODO: Replace with actual Runway API call
    
    return {
      success: true,
      videoUrl: `https://example.com/runway-video-${request.sceneId}.mp4`,
      duration: request.motion.duration,
    };
  }
  
  /**
   * Generate with Luma Dream Machine
   */
  private async generateWithLuma(
    request: ImageToVideoRequest,
    motionPrompt: string
  ): Promise<Omit<ImageToVideoResult, 'quality' | 'provider'>> {
    
    const lumaRequest = {
      imageUrl: request.sourceImageUrl,
      prompt: motionPrompt,
      aspectRatio: '16:9',
      loop: false,
    };
    
    console.log(`[I2V][Luma] Request:`, lumaRequest);
    
    // TODO: Replace with actual Luma API call
    
    return {
      success: true,
      videoUrl: `https://example.com/luma-video-${request.sceneId}.mp4`,
      duration: Math.min(request.motion.duration, 5),
    };
  }
  
  /**
   * Generate with Hailuo MiniMax
   */
  private async generateWithHailuo(
    request: ImageToVideoRequest,
    motionPrompt: string
  ): Promise<Omit<ImageToVideoResult, 'quality' | 'provider'>> {
    
    const hailuoRequest = {
      image: request.sourceImageUrl,
      prompt: motionPrompt,
      duration: Math.min(request.motion.duration, 6),
    };
    
    console.log(`[I2V][Hailuo] Request:`, hailuoRequest);
    
    return {
      success: true,
      videoUrl: `https://example.com/hailuo-video-${request.sceneId}.mp4`,
      duration: request.motion.duration,
    };
  }
  
  /**
   * Generate with Google Veo 2
   */
  private async generateWithVeo(
    request: ImageToVideoRequest,
    motionPrompt: string
  ): Promise<Omit<ImageToVideoResult, 'quality' | 'provider'>> {
    
    const veoRequest = {
      image: request.sourceImageUrl,
      prompt: motionPrompt,
      duration: Math.min(request.motion.duration, 8),
      aspectRatio: '16:9',
    };
    
    console.log(`[I2V][Veo] Request:`, veoRequest);
    
    return {
      success: true,
      videoUrl: `https://example.com/veo-video-${request.sceneId}.mp4`,
      duration: request.motion.duration,
    };
  }
  
  /**
   * Assess quality of generated video
   */
  private async assessQuality(
    videoUrl: string,
    request: ImageToVideoRequest
  ): Promise<ImageToVideoResult['quality']> {
    
    // In production, this would analyze the video for:
    // - Motion smoothness (frame interpolation quality)
    // - Product stability (how well branded elements stayed sharp)
    // - Overall visual quality
    
    // For now, return optimistic defaults
    // Real implementation would use Claude vision or specialized analysis
    
    return {
      motionSmoothness: 0.9,
      productStability: 0.95,
      overallScore: 0.92,
    };
  }
}

export const imageToVideoService = new ImageToVideoService();
```

---

## Step 4: Motion Style Detector

```typescript
// server/services/motion-style-detector.ts

import { MotionStyle } from '../../shared/types/brand-video-types';
import { BrandRequirementAnalysis } from '../../shared/types/brand-asset-types';

class MotionStyleDetector {
  
  /**
   * Determine optimal motion style from visual direction and analysis
   */
  detect(
    visualDirection: string,
    analysis: BrandRequirementAnalysis
  ): {
    style: MotionStyle;
    intensity: 'minimal' | 'low' | 'medium';
    cameraMovement?: {
      direction: 'left' | 'right' | 'up' | 'down' | 'push' | 'pull';
      distance: 'subtle' | 'moderate';
    };
    environmentalEffects?: {
      lightFlicker: boolean;
      plantMovement: boolean;
      particleDust: boolean;
    };
    revealDirection?: 'left' | 'right' | 'bottom' | 'top' | 'center';
  } {
    const lower = visualDirection.toLowerCase();
    
    // Default configuration
    let style: MotionStyle = 'subtle';
    let intensity: 'minimal' | 'low' | 'medium' = 'low';
    let cameraMovement: any = undefined;
    let environmentalEffects: any = undefined;
    let revealDirection: any = undefined;
    
    // Detect explicit motion cues
    if (lower.includes('zoom in') || lower.includes('zooming into')) {
      style = 'zoom-in';
      intensity = 'low';
    } else if (lower.includes('zoom out') || lower.includes('pull back') || lower.includes('reveal full')) {
      style = 'zoom-out';
      intensity = 'low';
    } else if (lower.includes('pan') || lower.includes('tracking')) {
      style = 'pan';
      const direction = lower.includes('left') ? 'left' : 'right';
      cameraMovement = { direction, distance: 'subtle' };
    } else if (lower.includes('reveal') || lower.includes('emerges') || lower.includes('appears')) {
      style = 'reveal';
      revealDirection = this.detectRevealDirection(lower);
    } else if (lower.includes('static') || lower.includes('still')) {
      style = 'static';
    }
    
    // For product scenes, prefer environmental or subtle motion
    if (analysis.requirements.productMentioned && style === 'subtle') {
      // Check for environmental cues
      if (lower.includes('plant') || lower.includes('nature') || lower.includes('organic')) {
        style = 'environmental';
        environmentalEffects = {
          plantMovement: lower.includes('plant'),
          lightFlicker: lower.includes('light') || lower.includes('sun'),
          particleDust: lower.includes('dust') || lower.includes('particles'),
        };
      } else {
        // Default to subtle camera drift
        cameraMovement = {
          direction: 'push',
          distance: 'subtle',
        };
      }
    }
    
    // Featured products should have minimal motion to keep focus
    if (analysis.requirements.productVisibility === 'featured') {
      intensity = 'minimal';
      if (style === 'environmental') {
        style = 'subtle'; // Even more controlled for hero shots
      }
    }
    
    return {
      style,
      intensity,
      cameraMovement,
      environmentalEffects,
      revealDirection,
    };
  }
  
  /**
   * Detect reveal direction from visual direction text
   */
  private detectRevealDirection(text: string): 'left' | 'right' | 'bottom' | 'top' | 'center' {
    if (text.includes('from left') || text.includes('from the left')) return 'left';
    if (text.includes('from right') || text.includes('from the right')) return 'right';
    if (text.includes('from bottom') || text.includes('from below')) return 'bottom';
    if (text.includes('from top') || text.includes('from above')) return 'top';
    return 'center'; // Default fade-in
  }
}

export const motionStyleDetector = new MotionStyleDetector();
```

---

## Step 5: Integration with Main Pipeline

```typescript
// Addition to brand-workflow-orchestrator.ts

import { imageToVideoService } from './image-to-video-service';
import { motionStyleDetector } from './motion-style-detector';
import { CompositionResult } from '../../shared/types/image-composition-types';

/**
 * Handle video generation from composed image
 */
async function generateVideoFromComposedImage(
  sceneId: string,
  visualDirection: string,
  compositionResult: CompositionResult,
  analysis: BrandRequirementAnalysis,
  sceneDuration: number
): Promise<{ videoUrl: string }> {
  
  // Detect optimal motion style
  const motionConfig = motionStyleDetector.detect(visualDirection, analysis);
  
  // Build image-to-video request
  const i2vRequest: ImageToVideoRequest = {
    sourceImageUrl: compositionResult.imageUrl,
    sourceType: 'composed',
    sceneId,
    visualDirection,
    motion: {
      style: motionConfig.style,
      intensity: motionConfig.intensity,
      duration: Math.min(sceneDuration, 10), // Cap at 10s for I2V
      cameraMovement: motionConfig.cameraMovement,
      environmentalEffects: motionConfig.environmentalEffects,
      revealDirection: motionConfig.revealDirection,
    },
    productRegions: compositionResult.compositionData.productRegions.map(r => ({
      bounds: r.bounds,
      importance: 'critical' as const,
    })),
    output: {
      width: 1920,
      height: 1080,
      fps: 30,
      format: 'mp4',
    },
  };
  
  // Generate video
  const result = await imageToVideoService.generate(i2vRequest);
  
  if (!result.success) {
    throw new Error(`Video generation failed: ${result.error}`);
  }
  
  console.log(`[Workflow] Video generated with ${result.provider}`);
  console.log(`[Workflow] Quality scores - Motion: ${result.quality.motionSmoothness}, Product: ${result.quality.productStability}`);
  
  return { videoUrl: result.videoUrl };
}
```

---

## Verification Checklist

Phase 14D is complete when:

- [ ] Motion style detection works from visual directions
- [ ] Provider selection chooses optimal I2V provider
- [ ] Environmental motion keeps products static
- [ ] Subtle camera movement is smooth and minimal
- [ ] Reveal animations work correctly
- [ ] Product regions are protected from motion artifacts
- [ ] Quality assessment returns meaningful scores
- [ ] Integration with composition pipeline works end-to-end

---

## Testing

Test environmental motion:
```typescript
const request: ImageToVideoRequest = {
  sourceImageUrl: 'https://example.com/composed-products.png',
  sourceType: 'composed',
  sceneId: 'test-env-001',
  visualDirection: 'Products on desk with plants in background, warm afternoon light',
  motion: {
    style: 'environmental',
    intensity: 'low',
    duration: 5,
    environmentalEffects: {
      plantMovement: true,
      lightFlicker: true,
      particleDust: false,
    },
  },
  output: { width: 1920, height: 1080, fps: 30, format: 'mp4' },
};

const result = await imageToVideoService.generate(request);
```

Test subtle camera motion:
```typescript
const request: ImageToVideoRequest = {
  sourceImageUrl: 'https://example.com/product-hero.png',
  sourceType: 'brand-asset',
  sceneId: 'test-subtle-001',
  visualDirection: 'Close-up of Deep Sleep product, professional lighting',
  motion: {
    style: 'subtle',
    intensity: 'minimal',
    duration: 4,
    cameraMovement: {
      direction: 'push',
      distance: 'subtle',
    },
  },
  productRegions: [
    { bounds: { x: 400, y: 300, width: 400, height: 500 }, importance: 'critical' },
  ],
  output: { width: 1920, height: 1080, fps: 30, format: 'mp4' },
};

const result = await imageToVideoService.generate(request);
```

---

## Next Phase

Proceed to **Phase 14E: Logo Composition System** for broadcast-quality logo placement that never relies on AI generation.
