import {
  ImageToVideoRequest,
  ImageToVideoResult,
  MotionStyle,
} from '../../shared/types/brand-video-types';
import { selectI2VProvider, I2V_PROVIDER_CAPABILITIES } from './i2v-provider-capabilities';
import { piapiVideoService } from './piapi-video-service';
import { runwayVideoService } from './runway-video-service';

class ImageToVideoService {
  
  async generate(request: ImageToVideoRequest): Promise<ImageToVideoResult> {
    console.log(`[I2V] Generating video for scene ${request.sceneId}`);
    console.log(`[I2V] Motion style: ${request.motion.style}, Duration: ${request.motion.duration}s`);
    console.log(`[I2V] Source image: ${request.sourceImageUrl.substring(0, 80)}...`);
    
    try {
      const providerId = selectI2VProvider(
        request.motion.style,
        request.motion.duration,
        true
      );
      
      console.log(`[I2V] Selected provider: ${providerId}`);
      
      const motionPrompt = this.buildMotionPrompt(request);
      console.log(`[I2V] Motion prompt: ${motionPrompt.substring(0, 100)}...`);
      
      const result = await this.executeGeneration(providerId, request, motionPrompt);
      
      if (!result.success) {
        return {
          success: false,
          videoUrl: '',
          duration: 0,
          quality: { motionSmoothness: 0, productStability: 0, overallScore: 0 },
          error: result.error,
          provider: providerId,
        };
      }
      
      const quality = this.assessQuality(request);
      
      return {
        success: true,
        videoUrl: result.videoUrl,
        duration: result.duration,
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
  
  private buildMotionPrompt(request: ImageToVideoRequest): string {
    const { motion, visualDirection } = request;
    
    let prompt = '';
    
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
        prompt = 'Slow, smooth zoom in toward center of frame, maintaining sharp focus';
        if (motion.intensity === 'minimal') {
          prompt += ', very subtle almost imperceptible movement';
        }
        break;
        
      case 'zoom-out':
        prompt = 'Gentle pull back revealing full scene, smooth cinematic motion';
        break;
        
      case 'pan':
        const dir = motion.cameraMovement?.direction || 'right';
        const movement = dir === 'left' || dir === 'right' ? 'horizontal' : 'vertical';
        prompt = `Slow ${movement} pan ${dir}, cinematic camera movement, steady and smooth`;
        break;
        
      case 'static':
        prompt = 'Completely static frame, no movement, still image';
        break;
        
      default:
        prompt = 'Subtle atmospheric motion, gentle and professional';
    }
    
    if (request.productRegions && request.productRegions.length > 0) {
      prompt += ', keeping central product elements sharp and perfectly stable';
    }
    
    switch (motion.intensity) {
      case 'minimal':
        prompt += ', barely perceptible motion, almost still';
        break;
      case 'low':
        prompt += ', gentle subtle movement';
        break;
      case 'medium':
        prompt += ', moderate smooth movement';
        break;
    }
    
    prompt += ', professional quality, smooth motion, no artifacts, no morphing, no distortion';
    
    if (visualDirection && visualDirection.length > 10) {
      const contextWords = visualDirection.split(' ').slice(0, 10).join(' ');
      prompt += `, ${contextWords}`;
    }
    
    return prompt;
  }
  
  private buildEnvironmentalPrompt(motion: ImageToVideoRequest['motion']): string {
    const effects: string[] = [];
    
    if (motion.environmentalEffects?.plantMovement) {
      effects.push('leaves gently swaying in a soft breeze');
    }
    if (motion.environmentalEffects?.lightFlicker) {
      effects.push('soft natural light shifting subtly');
    }
    if (motion.environmentalEffects?.particleDust) {
      effects.push('subtle dust particles floating in light beams');
    }
    
    if (effects.length === 0) {
      effects.push('subtle ambient movement in background elements');
    }
    
    return `Products remain perfectly still and sharp, ${effects.join(', ')}, atmospheric and peaceful scene`;
  }
  
  private buildSubtleMotionPrompt(motion: ImageToVideoRequest['motion']): string {
    const direction = motion.cameraMovement?.direction || 'push';
    const distance = motion.cameraMovement?.distance || 'subtle';
    
    const directionMap: Record<string, string> = {
      left: 'slight gentle drift to the left',
      right: 'slight gentle drift to the right',
      up: 'gentle upward tilt movement',
      down: 'soft downward movement',
      push: 'almost imperceptible push forward toward subject',
      pull: 'very gentle pull back from subject',
    };
    
    return `Smooth ${distance} camera movement, ${directionMap[direction]}, keeping subject perfectly in focus, cinematic`;
  }
  
  private buildRevealPrompt(motion: ImageToVideoRequest['motion']): string {
    const direction = motion.revealDirection || 'center';
    
    const directionMap: Record<string, string> = {
      left: 'subject smoothly enters from left side of frame',
      right: 'subject elegantly slides in from right',
      bottom: 'subject rises gracefully into view from bottom',
      top: 'subject descends smoothly into frame from top',
      center: 'subject fades in with gentle scale animation from center',
    };
    
    return `${directionMap[direction]}, professional reveal animation, cinematic timing, smooth motion`;
  }
  
  private async executeGeneration(
    providerId: string,
    request: ImageToVideoRequest,
    motionPrompt: string
  ): Promise<{ success: boolean; videoUrl: string; duration: number; error?: string }> {
    
    const caps = I2V_PROVIDER_CAPABILITIES[providerId];
    console.log(`[I2V] Executing with ${caps?.name || providerId}`);
    
    const aspectRatio = this.getAspectRatio(request.output.width, request.output.height);
    const duration = Math.min(request.motion.duration, caps?.maxDuration || 10);
    
    if (providerId === 'runway-gen3') {
      return this.generateWithRunway(request, motionPrompt, duration, aspectRatio);
    }
    
    return this.generateWithPiAPI(providerId, request, motionPrompt, duration, aspectRatio);
  }
  
  private async generateWithRunway(
    request: ImageToVideoRequest,
    motionPrompt: string,
    duration: number,
    aspectRatio: '16:9' | '9:16' | '1:1'
  ): Promise<{ success: boolean; videoUrl: string; duration: number; error?: string }> {
    
    console.log(`[I2V][Runway] Generating with Gen-3 Alpha...`);
    
    if (!runwayVideoService.isAvailable()) {
      console.warn(`[I2V][Runway] Not available, falling back to Kling`);
      return this.generateWithPiAPI('kling-2.6', request, motionPrompt, duration, aspectRatio);
    }
    
    try {
      const result = await runwayVideoService.generateVideo({
        prompt: motionPrompt,
        duration,
        aspectRatio,
        imageUrl: request.sourceImageUrl,
      });
      
      if (result.success && result.videoUrl) {
        return {
          success: true,
          videoUrl: result.s3Url || result.videoUrl,
          duration: result.duration || duration,
        };
      }
      
      console.warn(`[I2V][Runway] Failed: ${result.error}, falling back to Kling`);
      return this.generateWithPiAPI('kling-2.6', request, motionPrompt, duration, aspectRatio);
      
    } catch (error) {
      console.error(`[I2V][Runway] Error:`, error);
      return this.generateWithPiAPI('kling-2.6', request, motionPrompt, duration, aspectRatio);
    }
  }
  
  private async generateWithPiAPI(
    providerId: string,
    request: ImageToVideoRequest,
    motionPrompt: string,
    duration: number,
    aspectRatio: '16:9' | '9:16' | '1:1'
  ): Promise<{ success: boolean; videoUrl: string; duration: number; error?: string }> {
    
    console.log(`[I2V][PiAPI] Generating with ${providerId}...`);
    
    if (!piapiVideoService.isAvailable()) {
      return {
        success: false,
        videoUrl: '',
        duration: 0,
        error: 'PiAPI not configured',
      };
    }
    
    try {
      const result = await piapiVideoService.generateImageToVideo({
        imageUrl: request.sourceImageUrl,
        prompt: motionPrompt,
        duration,
        aspectRatio,
        model: this.mapProviderToModel(providerId),
      });
      
      if (result.success && result.videoUrl) {
        return {
          success: true,
          videoUrl: result.s3Url || result.videoUrl,
          duration: result.duration || duration,
        };
      }
      
      return {
        success: false,
        videoUrl: '',
        duration: 0,
        error: result.error || 'Generation failed',
      };
      
    } catch (error) {
      return {
        success: false,
        videoUrl: '',
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  private mapProviderToModel(providerId: string): string {
    const modelMap: Record<string, string> = {
      'kling-2.6': 'kling-v2.6',
      'kling-2.5': 'kling-v2.5',
      'kling-2.1': 'kling-v2.1',
      'kling-1.6': 'kling-v1.6',
      'luma-dream-machine': 'luma-dream-machine',
      'hailuo-minimax': 'hailuo-minimax',
      'veo-2': 'veo-2',
      'veo-3.1': 'veo-3.1-quality',
    };
    return modelMap[providerId] || 'kling-v2.6';
  }
  
  private getAspectRatio(width: number, height: number): '16:9' | '9:16' | '1:1' {
    const ratio = width / height;
    if (ratio > 1.5) return '16:9';
    if (ratio < 0.7) return '9:16';
    if (ratio > 1.2) return '16:9';
    if (ratio < 0.85) return '9:16';
    return '1:1';
  }
  
  private assessQuality(request: ImageToVideoRequest): ImageToVideoResult['quality'] {
    let motionSmoothness = 0.9;
    let productStability = 0.95;
    
    if (request.motion.intensity === 'minimal') {
      productStability = 0.98;
      motionSmoothness = 0.85;
    } else if (request.motion.intensity === 'medium') {
      productStability = 0.88;
      motionSmoothness = 0.92;
    }
    
    if (request.productRegions && request.productRegions.length > 0) {
      productStability = Math.min(productStability + 0.02, 1.0);
    }
    
    if (request.motion.style === 'static') {
      productStability = 1.0;
      motionSmoothness = 1.0;
    }
    
    const overallScore = (motionSmoothness + productStability) / 2;
    
    return {
      motionSmoothness,
      productStability,
      overallScore,
    };
  }
  
  async generateFromComposedImage(
    sceneId: string,
    visualDirection: string,
    composedImageUrl: string,
    productRegions: Array<{ bounds: { x: number; y: number; width: number; height: number } }>,
    sceneDuration: number,
    motionConfig: {
      style: MotionStyle;
      intensity: 'minimal' | 'low' | 'medium';
      cameraMovement?: { direction: 'left' | 'right' | 'up' | 'down' | 'push' | 'pull'; distance: 'subtle' | 'moderate' };
      environmentalEffects?: { lightFlicker: boolean; plantMovement: boolean; particleDust: boolean };
      revealDirection?: 'left' | 'right' | 'bottom' | 'top' | 'center';
    }
  ): Promise<ImageToVideoResult> {
    
    const request: ImageToVideoRequest = {
      sourceImageUrl: composedImageUrl,
      sourceType: 'composed',
      sceneId,
      visualDirection,
      motion: {
        style: motionConfig.style,
        intensity: motionConfig.intensity,
        duration: Math.min(sceneDuration, 10),
        cameraMovement: motionConfig.cameraMovement,
        environmentalEffects: motionConfig.environmentalEffects,
        revealDirection: motionConfig.revealDirection,
      },
      productRegions: productRegions.map(r => ({
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
    
    return this.generate(request);
  }
}

export const imageToVideoService = new ImageToVideoService();
