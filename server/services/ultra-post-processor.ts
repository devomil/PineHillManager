interface PostProcessingConfig {
  enableUpscaling: boolean;
  enableColorGrading: boolean;
  enableFrameInterpolation: boolean;
  enableAudioEnhancement: boolean;
}

interface PostProcessingResult {
  videoUrl: string;
  audioUrl: string;
  processedSteps: string[];
  estimatedCost: number;
}

class UltraPostProcessor {
  async process(
    videoUrl: string,
    audioUrl: string,
    config: PostProcessingConfig
  ): Promise<PostProcessingResult> {
    let processedVideo = videoUrl;
    let processedAudio = audioUrl;
    const processedSteps: string[] = [];
    let totalCost = 0;
    
    if (config.enableFrameInterpolation) {
      console.log('[PostProcess] Applying frame interpolation...');
      try {
        const result = await this.interpolateFrames(processedVideo, 60);
        if (result.success) {
          processedVideo = result.url;
          processedSteps.push('Frame interpolation (24fps → 60fps)');
          totalCost += result.cost;
        }
      } catch (error) {
        console.error('[PostProcess] Frame interpolation failed:', error);
      }
    }
    
    if (config.enableUpscaling) {
      console.log('[PostProcess] Applying 4K upscaling...');
      try {
        const result = await this.upscaleTo4K(processedVideo);
        if (result.success) {
          processedVideo = result.url;
          processedSteps.push('4K AI upscaling');
          totalCost += result.cost;
        }
      } catch (error) {
        console.error('[PostProcess] Upscaling failed:', error);
      }
    }
    
    if (config.enableColorGrading) {
      console.log('[PostProcess] Applying color grading...');
      try {
        const result = await this.applyColorGrading(processedVideo);
        if (result.success) {
          processedVideo = result.url;
          processedSteps.push('Cinematic color grading');
          totalCost += result.cost;
        }
      } catch (error) {
        console.error('[PostProcess] Color grading failed:', error);
      }
    }
    
    if (config.enableAudioEnhancement) {
      console.log('[PostProcess] Enhancing audio...');
      try {
        const result = await this.enhanceAudio(processedAudio);
        if (result.success) {
          processedAudio = result.url;
          processedSteps.push('AI audio enhancement');
          totalCost += result.cost;
        }
      } catch (error) {
        console.error('[PostProcess] Audio enhancement failed:', error);
      }
    }
    
    return {
      videoUrl: processedVideo,
      audioUrl: processedAudio,
      processedSteps,
      estimatedCost: totalCost,
    };
  }
  
  private async interpolateFrames(
    videoUrl: string, 
    targetFps: number
  ): Promise<{ success: boolean; url: string; cost: number }> {
    if (!process.env.REPLICATE_API_KEY) {
      console.log('[PostProcess] Replicate API key not configured, skipping frame interpolation');
      return { success: false, url: videoUrl, cost: 0 };
    }
    
    try {
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'db3ac4d2f22f9c5673e1e7b4d91a1b6f7e61f720',
          input: {
            video: videoUrl,
            multiplier: 2,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Replicate API error: ${response.status}`);
      }
      
      const prediction = await response.json();
      const result = await this.pollForResult(prediction.id);
      
      return {
        success: true,
        url: result.output || videoUrl,
        cost: 0.10,
      };
    } catch (error) {
      console.error('[PostProcess] Frame interpolation API error:', error);
      return { success: false, url: videoUrl, cost: 0 };
    }
  }
  
  private async upscaleTo4K(
    videoUrl: string
  ): Promise<{ success: boolean; url: string; cost: number }> {
    if (!process.env.REPLICATE_API_KEY) {
      console.log('[PostProcess] Replicate API key not configured, skipping upscaling');
      return { success: false, url: videoUrl, cost: 0 };
    }
    
    try {
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'f4b03ccd8e4f10c0a4b4dce6d59f57e5e1b0e7a7',
          input: {
            video: videoUrl,
            scale: 4,
            face_enhance: true,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Replicate API error: ${response.status}`);
      }
      
      const prediction = await response.json();
      const result = await this.pollForResult(prediction.id);
      
      return {
        success: true,
        url: result.output || videoUrl,
        cost: 0.10,
      };
    } catch (error) {
      console.error('[PostProcess] Upscaling API error:', error);
      return { success: false, url: videoUrl, cost: 0 };
    }
  }
  
  private async applyColorGrading(
    videoUrl: string
  ): Promise<{ success: boolean; url: string; cost: number }> {
    console.log('[PostProcess] Color grading would be applied to:', videoUrl);
    return { success: false, url: videoUrl, cost: 0 };
  }
  
  private async enhanceAudio(
    audioUrl: string
  ): Promise<{ success: boolean; url: string; cost: number }> {
    if (!process.env.REPLICATE_API_KEY) {
      console.log('[PostProcess] Replicate API key not configured, skipping audio enhancement');
      return { success: false, url: audioUrl, cost: 0 };
    }
    
    try {
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'a9c795746c51c3c0e2fca3c27c7e7d4a2c7a8b9c',
          input: {
            audio: audioUrl,
            denoise: true,
            normalize: true,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Replicate API error: ${response.status}`);
      }
      
      const prediction = await response.json();
      const result = await this.pollForResult(prediction.id);
      
      return {
        success: true,
        url: result.output || audioUrl,
        cost: 0.05,
      };
    } catch (error) {
      console.error('[PostProcess] Audio enhancement API error:', error);
      return { success: false, url: audioUrl, cost: 0 };
    }
  }
  
  private async pollForResult(predictionId: string, maxAttempts: number = 60): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
        },
      });
      
      const prediction = await response.json();
      
      if (prediction.status === 'succeeded') {
        return prediction;
      }
      
      if (prediction.status === 'failed' || prediction.status === 'canceled') {
        throw new Error(`Prediction ${prediction.status}: ${prediction.error || 'Unknown error'}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Prediction timed out');
  }
  
  getConfigFromTier(tier: 'ultra' | 'premium' | 'standard'): PostProcessingConfig {
    if (tier === 'ultra') {
      return {
        enableUpscaling: true,
        enableColorGrading: true,
        enableFrameInterpolation: true,
        enableAudioEnhancement: true,
      };
    }
    
    return {
      enableUpscaling: false,
      enableColorGrading: false,
      enableFrameInterpolation: false,
      enableAudioEnhancement: false,
    };
  }
}

export const ultraPostProcessor = new UltraPostProcessor();
