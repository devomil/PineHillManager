// server/services/piapi-video-service.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AI_VIDEO_PROVIDERS } from '../config/ai-video-providers';

interface PiAPIGenerationResult {
  success: boolean;
  videoUrl?: string;
  s3Url?: string;
  duration?: number;
  cost?: number;
  error?: string;
  generationTimeMs?: number;
  taskId?: string;
}

interface PiAPIGenerationOptions {
  prompt: string;
  duration: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  model: string;
  negativePrompt?: string;
}

interface ModelConfig {
  modelId: string;
  maxDuration: number;
}

class PiAPIVideoService {
  private s3Client: S3Client | null = null;
  private bucket = process.env.REMOTION_AWS_BUCKET || 'remotionlambda-useast1-refjo5giq5';
  private apiKey = process.env.PIAPI_API_KEY || '';
  private baseUrl = 'https://api.piapi.ai/api/v1';

  constructor() {
    const accessKeyId = process.env.REMOTION_AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.REMOTION_AWS_SECRET_ACCESS_KEY;
    
    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: 'us-east-1',
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      console.log('[PiAPI] S3 client configured for video caching');
    } else {
      console.warn('[PiAPI] S3 client not configured - videos will use original URLs');
    }
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  async generateVideo(options: PiAPIGenerationOptions): Promise<PiAPIGenerationResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'PiAPI key not configured' };
    }

    const startTime = Date.now();
    const modelConfig = this.getModelConfig(options.model);
    
    console.log(`[PiAPI:${options.model}] Starting generation...`);
    console.log(`[PiAPI:${options.model}] Prompt: ${options.prompt.substring(0, 100)}...`);

    try {
      const taskResponse = await this.createTask(options, modelConfig);
      
      if (!taskResponse.success || !taskResponse.taskId) {
        return {
          success: false,
          error: taskResponse.error || 'Failed to create task',
          generationTimeMs: Date.now() - startTime,
        };
      }

      console.log(`[PiAPI:${options.model}] Task created: ${taskResponse.taskId}`);

      const result = await this.pollForCompletion(taskResponse.taskId, options.model);
      
      if (!result.success || !result.videoUrl) {
        return {
          ...result,
          generationTimeMs: Date.now() - startTime,
        };
      }

      console.log(`[PiAPI:${options.model}] Generation complete, uploading to S3...`);
      const s3Url = await this.uploadToS3(result.videoUrl, options.model);

      const generationTimeMs = Date.now() - startTime;
      const provider = AI_VIDEO_PROVIDERS[options.model];
      const cost = options.duration * (provider?.costPerSecond || 0.03);

      console.log(`[PiAPI:${options.model}] Complete! Time: ${(generationTimeMs / 1000).toFixed(1)}s, Cost: $${cost.toFixed(3)}`);

      return {
        success: true,
        videoUrl: result.videoUrl,
        s3Url,
        duration: options.duration,
        cost,
        generationTimeMs,
        taskId: taskResponse.taskId,
      };

    } catch (error: any) {
      console.error(`[PiAPI:${options.model}] Generation failed:`, error.message);
      return {
        success: false,
        error: error.message,
        generationTimeMs: Date.now() - startTime,
      };
    }
  }

  private async createTask(
    options: PiAPIGenerationOptions,
    modelConfig: ModelConfig
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      const requestBody = this.buildRequestBody(options, modelConfig);
      
      const response = await fetch(`${this.baseUrl}/task`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[PiAPI] API error: ${response.status} - ${errorText}`);
        return { success: false, error: `API error: ${response.status}` };
      }

      const data = await response.json();
      const taskId = data.data?.task_id || data.task_id;
      
      if (!taskId) {
        return { success: false, error: 'No task ID in response' };
      }

      return { success: true, taskId };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private buildRequestBody(options: PiAPIGenerationOptions, modelConfig: ModelConfig): any {
    const baseRequest = {
      model: modelConfig.modelId,
      task_type: 'text_to_video',
      input: {
        prompt: options.prompt,
        negative_prompt: options.negativePrompt || 'blurry, low quality, distorted, ugly, watermark, text',
        duration: Math.min(options.duration, modelConfig.maxDuration),
        aspect_ratio: options.aspectRatio,
      },
    };

    switch (options.model) {
      case 'kling':
        return {
          ...baseRequest,
          model: 'kling',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
            mode: 'std',
            version: '1.6',
          },
        };
        
      case 'luma':
        return {
          ...baseRequest,
          model: 'luma',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
            loop: false,
          },
        };
        
      case 'hailuo':
        return {
          ...baseRequest,
          model: 'hailuo',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
            model: 't2v-01',
          },
        };
        
      case 'hunyuan':
        return {
          ...baseRequest,
          model: 'hunyuan',
          task_type: 'txt2video',
        };
        
      case 'veo':
        return {
          ...baseRequest,
          model: 'veo-3',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
          },
        };
        
      default:
        return baseRequest;
    }
  }

  private async pollForCompletion(
    taskId: string,
    model: string
  ): Promise<{ success: boolean; videoUrl?: string; error?: string }> {
    const maxAttempts = 120;
    const pollInterval = 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(pollInterval);

      try {
        const response = await fetch(`${this.baseUrl}/task/${taskId}`, {
          headers: {
            'X-API-Key': this.apiKey,
          },
        });

        if (!response.ok) {
          console.warn(`[PiAPI:${model}] Status check failed: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const status = data.data?.status || data.status;
        
        console.log(`[PiAPI:${model}] Status: ${status} (attempt ${attempt + 1}/${maxAttempts})`);

        if (status === 'completed' || status === 'success' || status === 'SUCCESS') {
          const videoUrl = this.extractVideoUrl(data);
          
          if (videoUrl) {
            return { success: true, videoUrl };
          }
          return { success: false, error: 'No video URL in completed response' };
        }

        if (status === 'failed' || status === 'error' || status === 'FAILED') {
          const errorMsg = data.data?.error || data.error || 'Generation failed';
          return { success: false, error: errorMsg };
        }

      } catch (error: any) {
        console.warn(`[PiAPI:${model}] Poll error:`, error.message);
      }
    }

    return { success: false, error: 'Generation timed out after 10 minutes' };
  }

  private extractVideoUrl(data: any): string | null {
    const possiblePaths = [
      data.data?.output?.video_url,
      data.data?.output?.video,
      data.data?.video_url,
      data.data?.result?.video_url,
      data.output?.video_url,
      data.video_url,
    ];

    for (const path of possiblePaths) {
      if (path && typeof path === 'string' && path.startsWith('http')) {
        return path;
      }
    }

    if (Array.isArray(data.data?.output)) {
      const video = data.data.output.find((o: any) => o.video_url || o.url);
      return video?.video_url || video?.url || null;
    }

    return null;
  }

  private async uploadToS3(videoUrl: string, model: string): Promise<string> {
    if (!this.s3Client) {
      return videoUrl;
    }

    try {
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const key = `ai-videos/${model}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`;

      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'video/mp4',
      }));

      const s3Url = `https://${this.bucket}.s3.us-east-1.amazonaws.com/${key}`;
      console.log(`[PiAPI:${model}] Uploaded to S3: ${key}`);
      
      return s3Url;

    } catch (error: any) {
      console.warn(`[PiAPI:${model}] S3 upload failed, using original URL:`, error.message);
      return videoUrl;
    }
  }

  private getModelConfig(model: string): ModelConfig {
    const configs: Record<string, ModelConfig> = {
      kling: { modelId: 'kling', maxDuration: 10 },
      luma: { modelId: 'luma', maxDuration: 5 },
      hailuo: { modelId: 'hailuo', maxDuration: 6 },
      hunyuan: { modelId: 'hunyuan', maxDuration: 5 },
      veo: { modelId: 'veo-3', maxDuration: 8 },
    };
    return configs[model] || { modelId: model, maxDuration: 5 };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const piapiVideoService = new PiAPIVideoService();
