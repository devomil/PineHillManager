interface RunwayVideoRequest {
  promptText: string;
  model: 'veo3.1' | 'gen4_turbo';
  ratio: string;
  duration: number;
  seed?: number;
  promptImage?: { uri: string; position: 'first' | 'last' }[];
}

interface RunwayVideoResult {
  success: boolean;
  videoUrl?: string;
  taskId?: string;
  status?: string;
  error?: string;
  estimatedTime?: number;
}

interface RunwayTaskStatus {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  progress?: number;
  output?: string[];
  failure?: string;
}

export class RunwayVideoService {
  private isAvailable = false;
  private configLoaded = false;

  constructor() {
    this.checkAvailability();
  }

  private async checkAvailability(): Promise<void> {
    if (this.configLoaded) return;
    
    try {
      const response = await fetch('/api/runway/status');
      if (response.ok) {
        const data = await response.json();
        this.isAvailable = data.available === true;
        console.log('Runway API availability:', this.isAvailable);
      }
      this.configLoaded = true;
    } catch (error) {
      console.warn('Failed to check Runway availability:', error);
      this.configLoaded = true;
    }
  }

  async isServiceAvailable(): Promise<boolean> {
    await this.checkAvailability();
    return this.isAvailable;
  }

  async generateTextToVideo(
    promptText: string,
    options: {
      model?: 'veo3.1' | 'gen4_turbo';
      ratio?: string;
      duration?: number;
      seed?: number;
    } = {}
  ): Promise<RunwayVideoResult> {
    await this.checkAvailability();
    
    if (!this.isAvailable) {
      return {
        success: false,
        error: 'Runway API is not available. Please check API key configuration.'
      };
    }

    try {
      const response = await fetch('/api/runway/text-to-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText,
          model: options.model || 'gen4_turbo',
          ratio: options.ratio || '1920:1080',
          duration: options.duration || 4,
          seed: options.seed
        })
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to start video generation'
        };
      }

      const result = await response.json();
      return {
        success: true,
        taskId: result.taskId,
        status: result.status,
        estimatedTime: result.estimatedTime
      };
    } catch (error) {
      console.error('Runway text-to-video error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async generateImageToVideo(
    promptText: string,
    imageUrl: string,
    options: {
      model?: 'gen4_turbo';
      ratio?: string;
      duration?: number;
      seed?: number;
      imagePosition?: 'first' | 'last';
    } = {}
  ): Promise<RunwayVideoResult> {
    await this.checkAvailability();
    
    if (!this.isAvailable) {
      return {
        success: false,
        error: 'Runway API is not available. Please check API key configuration.'
      };
    }

    try {
      const response = await fetch('/api/runway/image-to-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText,
          promptImage: [{
            uri: imageUrl,
            position: options.imagePosition || 'first'
          }],
          model: options.model || 'gen4_turbo',
          ratio: options.ratio || '1280:720',
          duration: options.duration || 4,
          seed: options.seed
        })
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to start video generation'
        };
      }

      const result = await response.json();
      return {
        success: true,
        taskId: result.taskId,
        status: result.status,
        estimatedTime: result.estimatedTime
      };
    } catch (error) {
      console.error('Runway image-to-video error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkTaskStatus(taskId: string): Promise<RunwayTaskStatus | null> {
    try {
      const response = await fetch(`/api/runway/task/${taskId}`);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to check task status:', error);
      return null;
    }
  }

  async waitForCompletion(
    taskId: string,
    onProgress?: (progress: number, status: string) => void,
    maxWaitMs: number = 300000
  ): Promise<RunwayVideoResult> {
    const startTime = Date.now();
    const pollInterval = 5000;

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.checkTaskStatus(taskId);
      
      if (!status) {
        return { success: false, error: 'Failed to get task status' };
      }

      if (onProgress) {
        onProgress(status.progress || 0, status.status);
      }

      if (status.status === 'SUCCEEDED' && status.output && status.output.length > 0) {
        return {
          success: true,
          videoUrl: status.output[0],
          taskId,
          status: status.status
        };
      }

      if (status.status === 'FAILED') {
        return {
          success: false,
          error: status.failure || 'Video generation failed',
          taskId,
          status: status.status
        };
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    return {
      success: false,
      error: 'Video generation timed out',
      taskId
    };
  }

  getModelSpecs() {
    return {
      'veo3.1': {
        name: 'VEO 3.1',
        description: 'High-quality AI video generation',
        maxDuration: 8,
        supportedRatios: ['1920:1080', '1080:1920', '1280:720'],
        supportsTextToVideo: true,
        supportsImageToVideo: false
      },
      'gen4_turbo': {
        name: 'Gen-4 Turbo',
        description: 'Fast AI video generation with image input',
        maxDuration: 4,
        supportedRatios: ['1920:1080', '1280:720', '1080:1920'],
        supportsTextToVideo: true,
        supportsImageToVideo: true
      }
    };
  }

  getSuggestedPromptsForMarketing(): string[] {
    return [
      'Gentle zoom on a peaceful farm landscape at golden hour',
      'Camera slowly pans across rows of healthy organic vegetables',
      'Soft focus on herbal supplements with natural lighting',
      'Slow motion of fresh produce being harvested',
      'Cinematic aerial view of sustainable farmland',
      'Close-up of hands carefully selecting premium products',
      'Time-lapse of plants growing in natural sunlight',
      'Smooth dolly shot through a wellness product display'
    ];
  }
}

export const runwayVideoService = new RunwayVideoService();
