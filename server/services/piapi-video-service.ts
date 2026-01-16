// server/services/piapi-video-service.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AI_VIDEO_PROVIDERS } from '../config/ai-video-providers';
import { sanitizePromptForAI, enhancePromptForProvider } from './prompt-sanitizer';

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
    
    // Phase 11A: Sanitize prompt to remove text/logo requests before video generation
    const sanitized = sanitizePromptForAI(options.prompt, 'video');
    const sanitizedPrompt = enhancePromptForProvider(sanitized.cleanPrompt, options.model);
    
    console.log(`[PiAPI:${options.model}] Starting generation...`);
    console.log(`[PiAPI:${options.model}] Original prompt: ${options.prompt.substring(0, 80)}...`);
    console.log(`[PiAPI:${options.model}] Sanitized prompt: ${sanitizedPrompt.substring(0, 80)}...`);
    console.log(`[PiAPI:${options.model}] Removed ${sanitized.removedElements.length} elements`);
    if (sanitized.extractedText.length > 0) {
      console.log(`[PiAPI:${options.model}] Extracted text for overlays: ${sanitized.extractedText.join(', ')}`);
    }
    
    // Use sanitized prompt for generation
    const sanitizedOptions = { ...options, prompt: sanitizedPrompt };

    try {
      const taskResponse = await this.createTask(sanitizedOptions, modelConfig);
      
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
      // Kling 1.6 (legacy)
      case 'kling':
      case 'kling-1.6':
        console.log(`[PiAPI T2V] Using Kling 1.6 (version 1.6, std mode)`);
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
      
      // Kling 2.0
      case 'kling-2.0':
        console.log(`[PiAPI T2V] Using Kling 2.0 (version 2.0, std mode)`);
        return {
          ...baseRequest,
          model: 'kling',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
            mode: 'std',
            version: '2.0',
          },
        };
        
      // Kling 2.1 variants
      case 'kling-2.1':
        console.log(`[PiAPI T2V] Using Kling 2.1 (version 2.1, std mode)`);
        return {
          ...baseRequest,
          model: 'kling',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
            mode: 'std',
            version: '2.1',
          },
        };
        
      case 'kling-2.1-master':
        console.log(`[PiAPI T2V] Using Kling 2.1 Master (version 2.1, pro mode)`);
        return {
          ...baseRequest,
          model: 'kling',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
            mode: 'pro',
            version: '2.1',
          },
        };
        
      // Kling 2.5 variants
      case 'kling-2.5':
        console.log(`[PiAPI T2V] Using Kling 2.5 (version 2.5, std mode)`);
        return {
          ...baseRequest,
          model: 'kling',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
            mode: 'std',
            version: '2.5',
          },
        };
        
      case 'kling-2.5-turbo':
        console.log(`[PiAPI T2V] Using Kling 2.5 Turbo (version 2.5, turbo mode)`);
        return {
          ...baseRequest,
          model: 'kling',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
            mode: 'turbo',
            version: '2.5',
          },
        };
        
      // Kling 2.6 variants
      case 'kling-2.6':
        console.log(`[PiAPI T2V] Using Kling 2.6 (version 2.6, std mode)`);
        return {
          ...baseRequest,
          model: 'kling',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
            mode: 'std',
            version: '2.6',
          },
        };
        
      case 'kling-2.6-pro':
        console.log(`[PiAPI T2V] Using Kling 2.6 Pro (version 2.6, pro mode)`);
        return {
          ...baseRequest,
          model: 'kling',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
            mode: 'pro',
            version: '2.6',
          },
        };
        
      // Kling Avatar (talking head specialized)
      case 'kling-avatar':
        console.log(`[PiAPI T2V] Using Kling Avatar (version 2.0, avatar mode)`);
        return {
          ...baseRequest,
          model: 'kling',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
            mode: 'std',
            version: '2.0',
          },
        };
        
      // Kling Effects (VFX specialized)
      case 'kling-effects':
        console.log(`[PiAPI T2V] Using Kling Effects (version 1.6, std mode)`);
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
        
      // Luma variants
      case 'luma':
      case 'luma-dream-machine':
        return {
          ...baseRequest,
          model: 'luma',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
            loop: false,
          },
        };
        
      // Hailuo/Minimax Family
      case 'hailuo':
      case 'hailuo-minimax':
        console.log(`[PiAPI T2V] Using Hailuo (t2v-01)`);
        return {
          ...baseRequest,
          model: 'hailuo',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
            model: 't2v-01',
          },
        };
        
      case 'seedance-1.0':
        console.log(`[PiAPI T2V] Using Seedance 1.0`);
        return {
          ...baseRequest,
          model: 'hailuo',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
            model: 'seedance-1.0',
          },
        };
      
      // Wan Family (Alibaba - via Hailuo API)
      case 'wan-2.1':
        console.log(`[PiAPI T2V] Using Wan 2.1`);
        return {
          ...baseRequest,
          model: 'hailuo',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
            model: 'wan-2.1',
          },
        };
        
      case 'wan-2.6':
        console.log(`[PiAPI T2V] Using Wan 2.6`);
        return {
          ...baseRequest,
          model: 'hailuo',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
            model: 'wan-2.6',
          },
        };
        
      // Hunyuan
      case 'hunyuan':
        console.log(`[PiAPI T2V] Using Hunyuan`);
        return {
          ...baseRequest,
          model: 'hunyuan',
          task_type: 'txt2video',
        };
        
      // Veo Family (Google)
      case 'veo':
        console.log(`[PiAPI T2V] Using Veo 3`);
        return {
          ...baseRequest,
          model: 'veo-3',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
          },
        };
        
      case 'veo-2':
        console.log(`[PiAPI T2V] Using Veo 2`);
        return {
          ...baseRequest,
          model: 'veo-2',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
          },
        };
        
      case 'veo-3.1':
        console.log(`[PiAPI T2V] Using Veo 3.1`);
        return {
          ...baseRequest,
          model: 'veo-3.1',
          task_type: 'video_generation',
          input: {
            ...baseRequest.input,
          },
        };
        
      default:
        console.log(`[PiAPI T2V] Using default model: ${options.model}`);
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
        ACL: 'public-read',
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
      // Kling Family (12 variants)
      'kling': { modelId: 'kling', maxDuration: 10 },
      'kling-1.6': { modelId: 'kling', maxDuration: 10 },
      'kling-2.0': { modelId: 'kling', maxDuration: 10 },
      'kling-2.1': { modelId: 'kling', maxDuration: 10 },
      'kling-2.1-master': { modelId: 'kling', maxDuration: 10 },
      'kling-2.5': { modelId: 'kling', maxDuration: 10 },
      'kling-2.5-turbo': { modelId: 'kling', maxDuration: 10 },
      'kling-2.6': { modelId: 'kling', maxDuration: 10 },
      'kling-2.6-pro': { modelId: 'kling', maxDuration: 10 },
      'kling-2.6-motion-control': { modelId: 'kling', maxDuration: 30 },
      'kling-2.6-motion-control-pro': { modelId: 'kling', maxDuration: 30 },
      'kling-avatar': { modelId: 'kling', maxDuration: 60 },
      'kling-effects': { modelId: 'kling', maxDuration: 5 },
      // Luma Family
      'luma': { modelId: 'luma', maxDuration: 5 },
      'luma-dream-machine': { modelId: 'luma', maxDuration: 5 },
      // Hailuo/Minimax Family
      'hailuo': { modelId: 'hailuo', maxDuration: 6 },
      'hailuo-minimax': { modelId: 'hailuo', maxDuration: 6 },
      'seedance-1.0': { modelId: 'hailuo', maxDuration: 6 },
      // Wan Family (Alibaba via PiAPI)
      'wan-2.1': { modelId: 'hailuo', maxDuration: 5 },
      'wan-2.6': { modelId: 'hailuo', maxDuration: 5 },
      // Hunyuan
      'hunyuan': { modelId: 'hunyuan', maxDuration: 5 },
      // Veo Family (Google)
      'veo': { modelId: 'veo-3', maxDuration: 8 },
      'veo-2': { modelId: 'veo-2', maxDuration: 8 },
      'veo-3.1': { modelId: 'veo-3.1', maxDuration: 8 },
    };
    return configs[model] || { modelId: model, maxDuration: 5 };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async generateImageToVideo(options: {
    imageUrl: string;
    prompt: string;
    duration: number;
    aspectRatio: '16:9' | '9:16' | '1:1';
    model: string;
    negativePrompt?: string;
    i2vSettings?: {
      imageControlStrength?: number;
      animationStyle?: 'product-hero' | 'product-static' | 'subtle-motion' | 'dynamic';
      motionStrength?: number;
    };
  }): Promise<PiAPIGenerationResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'PiAPI key not configured' };
    }

    const startTime = Date.now();
    
    const sanitized = sanitizePromptForAI(options.prompt, 'video');
    const sanitizedPrompt = enhancePromptForProvider(sanitized.cleanPrompt, options.model);
    
    console.log(`[PiAPI:${options.model}] Starting image-to-video generation...`);
    console.log(`[PiAPI:${options.model}] Source image: ${options.imageUrl.substring(0, 50)}...`);
    console.log(`[PiAPI:${options.model}] Prompt: ${sanitizedPrompt.substring(0, 80)}...`);

    try {
      const requestBody = this.buildI2VRequestBody(options, sanitizedPrompt);
      
      // Log full request body for debugging I2V issues
      console.log(`[PiAPI:${options.model}] I2V Request body:`, JSON.stringify(requestBody, null, 2).substring(0, 1500));
      
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
        console.error(`[PiAPI:${options.model}] I2V API error: ${response.status} - ${errorText}`);
        return { success: false, error: `API error: ${response.status}`, generationTimeMs: Date.now() - startTime };
      }

      const data = await response.json();
      const taskId = data.data?.task_id || data.task_id;
      
      if (!taskId) {
        return { success: false, error: 'No task ID in I2V response', generationTimeMs: Date.now() - startTime };
      }

      console.log(`[PiAPI:${options.model}] I2V task created: ${taskId}`);

      const result = await this.pollForCompletion(taskId, options.model);
      
      if (!result.success || !result.videoUrl) {
        return {
          ...result,
          generationTimeMs: Date.now() - startTime,
        };
      }

      console.log(`[PiAPI:${options.model}] I2V complete, uploading to S3...`);
      const s3Url = await this.uploadToS3(result.videoUrl, options.model);

      const generationTimeMs = Date.now() - startTime;
      const provider = AI_VIDEO_PROVIDERS[options.model];
      const cost = options.duration * (provider?.costPerSecond || 0.03);

      console.log(`[PiAPI:${options.model}] I2V complete! Time: ${(generationTimeMs / 1000).toFixed(1)}s, Cost: $${cost.toFixed(3)}`);

      return {
        success: true,
        videoUrl: result.videoUrl,
        s3Url,
        duration: options.duration,
        cost,
        generationTimeMs,
        taskId,
      };

    } catch (error: any) {
      console.error(`[PiAPI:${options.model}] I2V generation failed:`, error.message);
      return {
        success: false,
        error: error.message,
        generationTimeMs: Date.now() - startTime,
      };
    }
  }
  
  private buildI2VRequestBody(options: {
    imageUrl: string;
    prompt: string;
    duration: number;
    aspectRatio: '16:9' | '9:16' | '1:1';
    model: string;
    i2vSettings?: {
      imageControlStrength?: number;
      animationStyle?: 'product-hero' | 'product-static' | 'subtle-motion' | 'dynamic';
      motionStrength?: number;
    };
  }, sanitizedPrompt: string): any {
    // For I2V: Use a minimal prompt that emphasizes source image preservation
    // Too much prompt direction causes the AI to generate new content instead of animating the source
    const animationStyle = options.i2vSettings?.animationStyle ?? 'product-hero';
    
    // Different prompt styles based on animation intention
    let i2vPrompt: string;
    if (animationStyle === 'product-static') {
      // Maximum fidelity - minimal animation directive
      i2vPrompt = `Gently animate this exact product image. Preserve all details, labels, and text exactly as shown. Subtle ambient motion only.`;
    } else if (animationStyle === 'product-hero') {
      // Gentle cinematic treatment while preserving source
      i2vPrompt = `Cinematic product shot. Animate this exact product image with gentle, smooth camera motion. Preserve all product details, labels, and text exactly as shown. ${sanitizedPrompt.substring(0, 100)}`;
    } else if (animationStyle === 'subtle-motion') {
      // Subtle environmental motion
      i2vPrompt = `Animate this image with subtle environmental motion. Preserve the product exactly as shown. Gentle lighting shifts and ambient movement. ${sanitizedPrompt.substring(0, 80)}`;
    } else {
      // Dynamic - more creative freedom but still source-based
      i2vPrompt = `Dynamic product animation. Animate from this exact image with energetic camera motion. Preserve product appearance and labels. ${sanitizedPrompt.substring(0, 100)}`;
    }
    
    // I2V-specific negative prompt: DO NOT include "text" as we want to preserve label text
    const i2vNegativePrompt = 'blurry, low quality, distorted, morphing face, warping, watermark, dramatic camera movement, aggressive zoom, black screen, fade from black, altered text on products, changed labels, different product, new objects appearing, scene change';
    
    const baseInput = {
      prompt: i2vPrompt,
      image_url: options.imageUrl,
      duration: options.duration,
      aspect_ratio: options.aspectRatio,
      negative_prompt: i2vNegativePrompt,
    };
    
    if (options.model.startsWith('kling')) {
      let version = '2.6';
      let mode = 'pro';
      
      // Kling 1.6 (legacy)
      if (options.model === 'kling' || options.model === 'kling-1.6') {
        version = '1.6';
        mode = 'std';
        console.log(`[PiAPI I2V] Using Kling 1.6 (version 1.6, std mode)`);
      }
      // Kling 2.0
      else if (options.model === 'kling-2.0') {
        version = '2.0';
        mode = 'std';
        console.log(`[PiAPI I2V] Using Kling 2.0 (version 2.0, std mode)`);
      }
      // Kling 2.1 variants
      else if (options.model === 'kling-2.1') {
        version = '2.1';
        mode = 'std';
        console.log(`[PiAPI I2V] Using Kling 2.1 (version 2.1, std mode)`);
      }
      else if (options.model === 'kling-2.1-master') {
        version = '2.1';
        mode = 'pro';
        console.log(`[PiAPI I2V] Using Kling 2.1 Master (version 2.1, pro mode)`);
      }
      // Kling 2.5 variants
      else if (options.model === 'kling-2.5') {
        version = '2.5';
        mode = 'std';
        console.log(`[PiAPI I2V] Using Kling 2.5 (version 2.5, std mode)`);
      }
      else if (options.model === 'kling-2.5-turbo') {
        version = '2.5';
        mode = 'turbo';
        console.log(`[PiAPI I2V] Using Kling 2.5 Turbo (version 2.5, turbo mode)`);
      }
      // Kling 2.6 variants
      else if (options.model === 'kling-2.6') {
        version = '2.6';
        mode = 'pro';
        console.log(`[PiAPI I2V] Using Kling 2.6 (version 2.6, pro mode)`);
      }
      else if (options.model === 'kling-2.6-pro') {
        version = '2.6';
        mode = 'pro';
        console.log(`[PiAPI I2V] Using Kling 2.6 Pro (version 2.6, pro mode)`);
      }
      // Kling Avatar
      else if (options.model === 'kling-avatar') {
        version = '2.0';
        mode = 'std';
        console.log(`[PiAPI I2V] Using Kling Avatar (version 2.0, std mode)`);
      }
      // Kling Effects
      else if (options.model === 'kling-effects') {
        version = '1.6';
        mode = 'std';
        console.log(`[PiAPI I2V] Using Kling Effects (version 1.6, std mode)`);
      }
      // Default fallback
      else {
        const extractedVersion = options.model.replace('kling-v', '').replace('kling-', '').split('-')[0];
        version = extractedVersion || '2.6';
        console.log(`[PiAPI I2V] Using Kling ${version} (extracted, pro mode)`);
      }
      
      // Apply user I2V settings for Kling
      // PiAPI Kling I2V parameters:
      // - cfg_scale: 0.0-1.0, controls prompt vs source image balance (lower = more source fidelity)
      // - static_mask: controls what parts of image to animate (we want full frame)
      const imageControlStrength = options.i2vSettings?.imageControlStrength ?? 1.0;
      const motionStrength = options.i2vSettings?.motionStrength ?? 0.3;
      const animationStyle = options.i2vSettings?.animationStyle ?? 'product-hero';
      
      // Map user's Image Fidelity slider (0-1 where 1 = max fidelity) to cfg_scale
      // Higher fidelity = lower cfg (more source preservation)
      // cfg_scale range: 0.0 (full source) to 1.0 (full prompt)
      const cfgScale = Math.max(0.1, 1.0 - imageControlStrength * 0.8); // Invert: high fidelity = low cfg
      
      // Map motion strength to animation intensity
      // Kling uses a subtle approach - lower values mean less dramatic motion
      // The prompt-based approach is our primary control since Kling I2V has limited motion params
      
      // Different camera/animation directive for each style
      const motionDirectiveMap: Record<string, string> = {
        'product-hero': 'slow smooth push towards product, steady focus',
        'product-static': 'static camera, minimal ambient motion only',
        'subtle-motion': 'very gentle pan, subtle lighting shift',
        'dynamic': 'energetic camera movement, engaging motion',
      };
      const motionDirective = motionDirectiveMap[animationStyle] || 'gentle camera motion';
      
      console.log(`[PiAPI I2V] Kling settings: fidelity=${imageControlStrength} → cfg=${cfgScale.toFixed(2)}, motion=${motionStrength}, style=${animationStyle}`);
      
      // Append motion directive to prompt for better control
      const klingI2vPrompt = `${baseInput.prompt}. Camera: ${motionDirective}.`;
      
      // For Kling I2V: use both image_url AND first_frame_image for compatibility
      // Also use elements array for Kling 1.6+ which prefers that format
      return {
        model: 'kling',
        task_type: 'video_generation',
        input: {
          prompt: klingI2vPrompt,
          image_url: options.imageUrl,
          first_frame_image: options.imageUrl, // Some Kling versions use this
          duration: options.duration,
          aspect_ratio: options.aspectRatio,
          negative_prompt: baseInput.negative_prompt,
          mode,
          version,
          cfg_scale: cfgScale,
          // Elements array is preferred for Kling 1.6+
          elements: [{ image_url: options.imageUrl }],
        },
      };
    }
    
    // Luma Family - uses video_generation task_type with keyframes for I2V
    if (options.model.includes('luma') || options.model === 'luma-dream-machine') {
      console.log(`[PiAPI I2V] Using Luma Dream Machine with high fidelity`);
      return {
        model: 'luma',
        task_type: 'video_generation',
        input: {
          prompt: baseInput.prompt,
          aspect_ratio: baseInput.aspect_ratio,
          loop: false,
          keyframes: { 
            frame0: { type: 'image', url: options.imageUrl }
          },
        },
      };
    }
    
    // Hailuo/Minimax Family - uses video_generation task_type
    if (options.model.includes('hailuo') || options.model.includes('minimax')) {
      const imageControlStrength = options.i2vSettings?.imageControlStrength ?? 1.0;
      const motionStrength = options.i2vSettings?.motionStrength ?? 0.3;
      const animationStyle = options.i2vSettings?.animationStyle ?? 'product-hero';
      
      const cameraMotionMap: Record<string, string> = {
        'product-hero': 'push',
        'product-static': 'static',
        'subtle-motion': 'pan_left',
        'dynamic': 'zoom_in',
      };
      const cameraMotion = cameraMotionMap[animationStyle] || 'static';
      
      console.log(`[PiAPI I2V] Using Hailuo (i2v-01) with settings: fidelity=${imageControlStrength}, motion=${motionStrength}, style=${animationStyle} → camera=${cameraMotion}`);
      return {
        model: 'hailuo',
        task_type: 'video_generation',
        input: {
          prompt: baseInput.prompt,
          model: 'i2v-01',
          image_url: options.imageUrl,
          expand_prompt: true,
        },
      };
    }
    
    // Wan Family (Alibaba) - uses wan26-img2video task_type
    if (options.model.includes('wan')) {
      console.log(`[PiAPI I2V] Using Wan 2.6 I2V`);
      return {
        model: 'Wan',
        task_type: 'wan26-img2video',
        input: {
          prompt: baseInput.prompt,
          negative_prompt: baseInput.negative_prompt,
          image: options.imageUrl,
          prompt_extend: true,
          shot_type: 'single',
          resolution: '720p',
          duration: Math.min(options.duration, 5),
          watermark: false,
        },
      };
    }
    
    // Seedance
    if (options.model.includes('seedance')) {
      console.log(`[PiAPI I2V] Using Seedance 1.0 I2V`);
      return {
        model: 'hailuo',
        task_type: 'video_generation',
        input: {
          prompt: baseInput.prompt,
          model: 'seedance-1.0-i2v',
          image_url: options.imageUrl,
        },
      };
    }
    
    // Veo Family (Google) - uses veo3-video-fast or veo3.1-video-fast task_type
    if (options.model.includes('veo')) {
      let veoModel = 'veo3';
      let taskType = 'veo3-video-fast';
      if (options.model === 'veo-3.1' || options.model === 'veo3.1') {
        veoModel = 'veo3.1';
        taskType = 'veo3.1-video-fast';
      }
      console.log(`[PiAPI I2V] Using ${veoModel} with task_type: ${taskType}`);
      return {
        model: veoModel,
        task_type: taskType,
        input: {
          image_url: options.imageUrl,
          prompt: baseInput.prompt,
          aspect_ratio: 'auto',
          duration: `${Math.min(options.duration, 8)}s`,
          resolution: '720p',
          generate_audio: false,
        },
      };
    }
    
    // Hunyuan - uses video_generation task_type
    if (options.model === 'hunyuan') {
      console.log(`[PiAPI I2V] Using Hunyuan`);
      return {
        model: 'hunyuan',
        task_type: 'video_generation',
        input: {
          ...baseInput,
        },
      };
    }
    
    // Default to Kling with video_generation
    return {
      model: 'kling',
      task_type: 'video_generation',
      input: {
        ...baseInput,
        mode: 'pro',
        version: '2.6',
      },
    };
  }
}

export const piapiVideoService = new PiAPIVideoService();
