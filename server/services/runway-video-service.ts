// server/services/runway-video-service.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AI_VIDEO_PROVIDERS } from '../config/ai-video-providers';

interface RunwayGenerationResult {
  success: boolean;
  videoUrl?: string;
  s3Url?: string;
  duration?: number;
  cost?: number;
  error?: string;
  generationTimeMs?: number;
}

interface RunwayGenerationOptions {
  prompt: string;
  duration: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  negativePrompt?: string;
}

class RunwayVideoService {
  private s3Client: S3Client | null = null;
  private bucket = process.env.REMOTION_AWS_BUCKET || 'remotionlambda-useast1-refjo5giq5';
  private provider = AI_VIDEO_PROVIDERS.runway;

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
      console.log('[Runway] S3 client configured for video caching');
    } else {
      console.warn('[Runway] S3 client not configured - videos will use original URLs');
    }
  }

  isAvailable(): boolean {
    return this.provider.apiKey.length > 0;
  }

  async generateVideo(options: RunwayGenerationOptions): Promise<RunwayGenerationResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Runway API key not configured' };
    }

    const startTime = Date.now();
    console.log(`[Runway] Starting generation...`);
    console.log(`[Runway] Prompt: ${options.prompt.substring(0, 100)}...`);
    if (options.negativePrompt) {
      console.log(`[Runway] Negative prompt applied (${options.negativePrompt.split(',').length} terms)`);
    }

    try {
      const createResponse = await fetch(`${this.provider.endpoint}/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.provider.apiKey}`,
          'Content-Type': 'application/json',
          'X-Runway-Version': '2024-11-06',
        },
        body: JSON.stringify({
          promptText: this.formatPrompt(options.prompt),
          model: 'gen3a_turbo',
          duration: Math.min(options.duration, this.provider.maxDuration),
          ratio: this.formatAspectRatio(options.aspectRatio),
          ...(options.negativePrompt && { 
            negativePromptText: options.negativePrompt.substring(0, 500)
          }),
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error(`[Runway] API error: ${createResponse.status} - ${errorText}`);
        return { 
          success: false, 
          error: `Runway API error: ${createResponse.status}`,
          generationTimeMs: Date.now() - startTime,
        };
      }

      const task = await createResponse.json();
      const taskId = task.id;
      console.log(`[Runway] Task created: ${taskId}`);

      const result = await this.pollForCompletion(taskId);
      
      if (!result.success || !result.videoUrl) {
        return {
          ...result,
          generationTimeMs: Date.now() - startTime,
        };
      }

      console.log(`[Runway] Generation complete, uploading to S3...`);
      const s3Url = await this.uploadToS3(result.videoUrl);

      const generationTimeMs = Date.now() - startTime;
      const cost = options.duration * this.provider.costPerSecond;

      console.log(`[Runway] Complete! Time: ${(generationTimeMs / 1000).toFixed(1)}s, Cost: $${cost.toFixed(3)}`);

      return {
        success: true,
        videoUrl: result.videoUrl,
        s3Url,
        duration: options.duration,
        cost,
        generationTimeMs,
      };

    } catch (error: any) {
      console.error(`[Runway] Generation failed:`, error.message);
      return {
        success: false,
        error: error.message,
        generationTimeMs: Date.now() - startTime,
      };
    }
  }

  private async pollForCompletion(taskId: string): Promise<{ success: boolean; videoUrl?: string; error?: string }> {
    const maxAttempts = 60;
    const pollInterval = 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(pollInterval);

      try {
        const statusResponse = await fetch(`${this.provider.endpoint}/generations/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${this.provider.apiKey}`,
            'X-Runway-Version': '2024-11-06',
          },
        });

        if (!statusResponse.ok) {
          console.warn(`[Runway] Status check failed: ${statusResponse.status}`);
          continue;
        }

        const status = await statusResponse.json();
        console.log(`[Runway] Status: ${status.status} (attempt ${attempt + 1}/${maxAttempts})`);

        if (status.status === 'SUCCEEDED') {
          const videoUrl = status.output?.[0] || status.artifacts?.[0]?.url;
          if (videoUrl) {
            return { success: true, videoUrl };
          }
          return { success: false, error: 'No video URL in response' };
        }

        if (status.status === 'FAILED') {
          return { 
            success: false, 
            error: status.failure || status.failureCode || 'Generation failed' 
          };
        }

      } catch (error: any) {
        console.warn(`[Runway] Poll error:`, error.message);
      }
    }

    return { success: false, error: 'Generation timed out after 5 minutes' };
  }

  private async uploadToS3(videoUrl: string): Promise<string> {
    if (!this.s3Client) {
      console.warn('[Runway] S3 client not configured, using original URL');
      return videoUrl;
    }

    try {
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const key = `ai-videos/runway/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`;

      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'video/mp4',
      }));

      const s3Url = `https://${this.bucket}.s3.us-east-1.amazonaws.com/${key}`;
      console.log(`[Runway] Uploaded to S3: ${key}`);
      
      return s3Url;

    } catch (error: any) {
      console.warn(`[Runway] S3 upload failed, using original URL:`, error.message);
      return videoUrl;
    }
  }

  private formatPrompt(prompt: string): string {
    let formatted = prompt
      .replace(/\bcaptured from\b/gi, '')
      .replace(/\bthe camera\b/gi, '')
      .replace(/\bcamera slowly\b/gi, 'slowly')
      .replace(/\bcreating an?\b/gi, '')
      .trim();

    if (formatted.length > 500) {
      formatted = formatted.substring(0, 497) + '...';
    }

    return formatted;
  }

  private formatAspectRatio(ratio: string): string {
    return ratio;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const runwayVideoService = new RunwayVideoService();
