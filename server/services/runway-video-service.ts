// server/services/runway-video-service.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import RunwayML from '@runwayml/sdk';

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
  imageUrl?: string;
}

class RunwayVideoService {
  private s3Client: S3Client | null = null;
  private bucket = process.env.REMOTION_AWS_BUCKET || 'remotionlambda-useast1-refjo5giq5';
  private client: RunwayML | null = null;

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

  private getClient(): RunwayML | null {
    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) {
      return null;
    }
    if (!this.client) {
      this.client = new RunwayML({ apiKey });
    }
    return this.client;
  }

  isAvailable(): boolean {
    const apiKey = process.env.RUNWAY_API_KEY;
    const available = !!apiKey && apiKey.length > 0;
    console.log(`[Runway] isAvailable check: ${available} (API key ${apiKey ? 'present' : 'missing'})`);
    return available;
  }

  async generateVideo(options: RunwayGenerationOptions): Promise<RunwayGenerationResult> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: 'Runway API key not configured' };
    }

    const startTime = Date.now();
    console.log(`[Runway] Starting generation with official SDK...`);
    console.log(`[Runway] Prompt: ${options.prompt.substring(0, 100)}...`);
    console.log(`[Runway] Duration: ${options.duration}s, Aspect: ${options.aspectRatio}`);
    if (options.imageUrl) {
      console.log(`[Runway] Source image provided: ${options.imageUrl.substring(0, 50)}...`);
    }

    try {
      const validDurations: (4 | 6 | 8)[] = [4, 6, 8];
      const closestDuration = validDurations.reduce((prev, curr) => 
        Math.abs(curr - options.duration) < Math.abs(prev - options.duration) ? curr : prev
      );
      const duration = closestDuration;
      const formattedPrompt = this.formatPrompt(options.prompt, options.negativePrompt);

      let task: any;

      if (options.imageUrl) {
        const imageRatio = this.formatRatioForImageToVideo(options.aspectRatio);
        console.log(`[Runway] Using imageToVideo with gen4_turbo, ratio: ${imageRatio}...`);
        task = await client.imageToVideo
          .create({
            model: 'gen4_turbo',
            promptImage: options.imageUrl,
            promptText: formattedPrompt,
            ratio: imageRatio as any,
            duration: duration,
          })
          .waitForTaskOutput();
      } else {
        const textRatio = this.formatRatioForTextToVideo(options.aspectRatio);
        console.log(`[Runway] Using textToVideo with veo3.1, ratio: ${textRatio}...`);
        task = await client.textToVideo
          .create({
            model: 'veo3.1',
            promptText: formattedPrompt,
            ratio: textRatio as any,
            duration: duration,
          })
          .waitForTaskOutput();
      }

      console.log(`[Runway] Task completed:`, JSON.stringify(task, null, 2));

      if (task.status === 'FAILED') {
        return {
          success: false,
          error: task.failure || task.failureCode || 'Generation failed',
          generationTimeMs: Date.now() - startTime,
        };
      }

      const videoUrl = task.output?.[0] || task.artifacts?.[0]?.url;
      if (!videoUrl) {
        return {
          success: false,
          error: 'No video URL in response',
          generationTimeMs: Date.now() - startTime,
        };
      }

      console.log(`[Runway] Generation complete, uploading to S3...`);
      const s3Url = await this.uploadToS3(videoUrl);

      const generationTimeMs = Date.now() - startTime;
      const costPerSecond = options.imageUrl ? 0.05 : 0.10;
      const cost = duration * costPerSecond;

      console.log(`[Runway] Complete! Time: ${(generationTimeMs / 1000).toFixed(1)}s, Cost: $${cost.toFixed(3)}`);

      return {
        success: true,
        videoUrl: videoUrl,
        s3Url,
        duration: duration,
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

  private formatPrompt(prompt: string, negativePrompt?: string): string {
    let formatted = prompt
      .replace(/\bcaptured from\b/gi, '')
      .replace(/\bthe camera\b/gi, '')
      .replace(/\bcamera slowly\b/gi, 'slowly')
      .replace(/\bcreating an?\b/gi, '')
      .trim();

    if (negativePrompt) {
      console.log(`[Runway] Negative prompt applied (${negativePrompt.split(',').length} terms)`);
    }

    if (formatted.length > 1000) {
      formatted = formatted.substring(0, 997) + '...';
    }

    return formatted;
  }

  private formatRatioForTextToVideo(aspectRatio: string): string {
    const ratioMap: Record<string, string> = {
      '16:9': '1280:720',
      '9:16': '720:1280',
      '1:1': '1280:720',
    };
    return ratioMap[aspectRatio] || '1280:720';
  }

  private formatRatioForImageToVideo(aspectRatio: string): string {
    const ratioMap: Record<string, string> = {
      '16:9': '1280:720',
      '9:16': '720:1280',
      '1:1': '960:960',
    };
    return ratioMap[aspectRatio] || '1280:720';
  }
}

export const runwayVideoService = new RunwayVideoService();
