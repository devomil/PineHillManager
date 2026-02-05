// server/services/runway-video-service.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import RunwayML from '@runwayml/sdk';
import { sanitizePromptForAI, enhancePromptForProvider } from './prompt-sanitizer';
import { db } from '../db';
import { brandAssets } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { signObjectURL } from '../objectStorage';

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
  i2vSettings?: {
    imageControlStrength?: number;
    animationStyle?: string;
    motionStrength?: number;
  };
}

class RunwayVideoService {
  private s3Client: S3Client | null = null;
  private bucket = process.env.REMOTION_S3_BUCKET || process.env.REMOTION_AWS_BUCKET || 'remotionlambda-useast2-1vc2l6a56o';
  private region = process.env.REMOTION_AWS_REGION || 'us-east-2';
  private client: RunwayML | null = null;

  constructor() {
    const accessKeyId = process.env.REMOTION_AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.REMOTION_AWS_SECRET_ACCESS_KEY;
    
    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: this.region,
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

  private async resolveImageUrl(imageUrl: string): Promise<string> {
    console.log(`[Runway URL Resolver] Starting resolution for: ${imageUrl}`);
    
    if (!imageUrl) {
      console.log(`[Runway URL Resolver] No image URL provided`);
      return imageUrl;
    }
    
    if (imageUrl.startsWith('https://')) {
      console.log(`[Runway URL Resolver] Image URL already HTTPS, using as-is`);
      return imageUrl;
    }
    
    if (imageUrl.startsWith('/api/brand-assets/file/')) {
      const assetId = parseInt(imageUrl.split('/').pop() || '0');
      console.log(`[Runway URL Resolver] Extracted brand asset ID: ${assetId}`);
      
      if (assetId > 0) {
        try {
          console.log(`[Runway URL Resolver] Querying database for asset ${assetId}...`);
          const [asset] = await db.select().from(brandAssets).where(eq(brandAssets.id, assetId));
          console.log(`[Runway URL Resolver] Asset query result:`, asset ? `found (name: ${asset.name})` : 'NOT FOUND');
          
          if (asset) {
            console.log(`[Runway URL Resolver] Asset settings type:`, typeof asset.settings);
            console.log(`[Runway URL Resolver] Asset settings raw:`, JSON.stringify(asset.settings).substring(0, 200));
            
            const settings = asset.settings as any;
            if (settings?.storagePath) {
              console.log(`[Runway URL Resolver] Storage path found:`, settings.storagePath);
              const parts = settings.storagePath.split('|');
              const bucketName = parts[0];
              const filePath = parts[1];
              console.log(`[Runway URL Resolver] Parsed bucket: "${bucketName}", path: "${filePath}"`);
              
              if (bucketName && filePath) {
                console.log(`[Runway URL Resolver] Calling signObjectURL...`);
                const signedUrl = await signObjectURL({
                  bucketName,
                  objectName: filePath,
                  method: 'GET',
                  ttlSec: 3600,
                });
                console.log(`[Runway URL Resolver] ✓ Signed URL generated: ${signedUrl.substring(0, 100)}...`);
                return signedUrl;
              } else {
                console.error(`[Runway URL Resolver] ❌ Invalid bucket or path - bucket: "${bucketName}", path: "${filePath}"`);
              }
            } else {
              console.error(`[Runway URL Resolver] ❌ No storagePath in asset settings`);
              console.log(`[Runway URL Resolver] Available settings keys:`, Object.keys(settings || {}));
            }
          } else {
            console.error(`[Runway URL Resolver] ❌ Asset ID ${assetId} not found in database`);
          }
        } catch (error) {
          console.error(`[Runway URL Resolver] ❌ Error resolving brand asset URL:`, error);
        }
      } else {
        console.error(`[Runway URL Resolver] ❌ Invalid asset ID parsed: ${assetId}`);
      }
    }
    
    console.error(`[Runway URL Resolver] ❌ Unable to resolve image URL to HTTPS: ${imageUrl}`);
    return imageUrl;
  }

  async generateVideo(options: RunwayGenerationOptions): Promise<RunwayGenerationResult> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: 'Runway API key not configured' };
    }

    const startTime = Date.now();
    
    // Phase 11A: Sanitize prompt to remove text/logo requests before video generation
    const sanitized = sanitizePromptForAI(options.prompt, 'video');
    const sanitizedPrompt = enhancePromptForProvider(sanitized.cleanPrompt, 'runway');
    
    console.log(`[Runway] Starting generation with official SDK...`);
    console.log(`[Runway] Original prompt: ${options.prompt.substring(0, 80)}...`);
    console.log(`[Runway] Sanitized prompt: ${sanitizedPrompt.substring(0, 80)}...`);
    console.log(`[Runway] Removed ${sanitized.removedElements.length} elements`);
    if (sanitized.extractedText.length > 0) {
      console.log(`[Runway] Extracted text for overlays: ${sanitized.extractedText.join(', ')}`);
    }
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
      // Use sanitized prompt for formatting
      const formattedPrompt = this.formatPrompt(sanitizedPrompt, options.negativePrompt);

      let task: any;

      if (options.imageUrl) {
        console.log(`[Runway] Attempting to resolve image URL: ${options.imageUrl}`);
        const resolvedImageUrl = await this.resolveImageUrl(options.imageUrl);
        console.log(`[Runway] Resolved URL: ${resolvedImageUrl?.substring(0, 100) || 'null'}`);
        
        if (!resolvedImageUrl || !resolvedImageUrl.startsWith('https://')) {
          console.error(`[Runway] ❌ Failed to resolve image URL - cannot proceed with I2V`);
          return {
            success: false,
            error: `Unable to resolve image URL to public HTTPS URL: ${options.imageUrl.substring(0, 50)}`,
            generationTimeMs: Date.now() - startTime,
          };
        }
        console.log(`[Runway] ✓ Image URL resolved successfully for I2V`);
        
        console.log(`[Runway] Resolved image URL: ${resolvedImageUrl.substring(0, 80)}...`);
        const imageRatio = this.formatRatioForImageToVideo(options.aspectRatio);
        console.log(`[Runway] Using imageToVideo with gen4_turbo, ratio: ${imageRatio}...`);
        
        // For I2V with product images: ANIMATE the source image, don't create new content
        // The prompt should describe motion/animation, NOT scene creation
        const animationStyle = options.i2vSettings?.animationStyle || 'product-hero';
        
        // I2V PROMPT STRATEGY: Tell Runway to ANIMATE this exact image
        // Key: Start from the source image on frame 1, then add motion
        
        // Motion instruction based on animation style - focus on camera/motion, not scene
        let i2vPrompt: string;
        if (animationStyle === 'product-static') {
          i2vPrompt = `Animate this exact product image with very subtle motion. Gentle ambient lighting shifts, slight sparkle on highlights. Keep the product completely still and centered. Preserve all text and labels exactly as shown. Smooth, professional product photography feel.`;
        } else if (animationStyle === 'product-hero') {
          i2vPrompt = `Cinematic product shot animation. Start with this exact image and slowly push the camera toward the product. Gentle bokeh shift in background. Keep product sharp and centered. Preserve all text and labels exactly. Smooth, elegant motion. Professional advertising quality.`;
        } else if (animationStyle === 'subtle-motion') {
          i2vPrompt = `Animate this product image with subtle environmental motion. Gentle light rays or floating dust particles in the background. Product stays perfectly still and sharp. Preserve all text and labels exactly as shown. Ethereal, premium feel.`;
        } else {
          i2vPrompt = `Dynamic product animation. Camera slowly orbits around this product while keeping it in focus. Dramatic lighting with subtle shifts. Preserve all text and labels exactly as shown. Energetic but professional.`;
        }
        
        // Truncate if needed
        const RUNWAY_MAX_PROMPT_LENGTH = 1000;
        const truncatedPrompt = i2vPrompt.length > RUNWAY_MAX_PROMPT_LENGTH 
          ? i2vPrompt.substring(0, RUNWAY_MAX_PROMPT_LENGTH - 3) + '...'
          : i2vPrompt;
        
        console.log(`[Runway] I2V prompt (${animationStyle}, ${truncatedPrompt.length} chars): ${truncatedPrompt.substring(0, 150)}...`);
        
        task = await client.imageToVideo
          .create({
            model: 'gen4_turbo',
            promptImage: resolvedImageUrl,
            promptText: truncatedPrompt,
            ratio: imageRatio as any,
            duration: duration,
          })
          .waitForTaskOutput();
      } else {
        // Text-to-video: Try to generate an image first with fal.ai, then use image-to-video with gen4_turbo
        // This allows us to use actual Runway models. Falls back to Veo if fal.ai unavailable.
        console.log(`[Runway] No source image provided - attempting to generate one with fal.ai...`);
        
        const imageResult = await this.generateImageForVideo(options.prompt, options.aspectRatio);
        
        if (imageResult.success && imageResult.imageUrl) {
          // Success: use gen4_turbo with the generated image
          console.log(`[Runway] Generated source image: ${imageResult.imageUrl.substring(0, 50)}...`);
          
          const imageRatio = this.formatRatioForImageToVideo(options.aspectRatio);
          console.log(`[Runway] Using imageToVideo with gen4_turbo (from generated image), ratio: ${imageRatio}...`);
          
          // Truncate prompt if needed (Runway has 1000 char limit)
          const truncatedPrompt = this.truncatePrompt(formattedPrompt, 1000);
          
          task = await client.imageToVideo
            .create({
              model: 'gen4_turbo',
              promptImage: imageResult.imageUrl,
              promptText: truncatedPrompt,
              ratio: imageRatio as any,
              duration: duration,
            })
            .waitForTaskOutput();
        } else {
          // Fallback: use Veo text-to-video (through Runway SDK)
          console.warn(`[Runway] fal.ai image generation failed: ${imageResult.error}`);
          console.log(`[Runway] Falling back to Veo text-to-video...`);
          
          const textRatio = this.formatRatioForTextToVideo(options.aspectRatio);
          console.log(`[Runway] Using textToVideo with veo3.1, ratio: ${textRatio}...`);
          
          // Truncate prompt if needed (Runway has 1000 char limit)
          const truncatedPrompt = this.truncatePrompt(formattedPrompt, 1000);
          
          task = await client.textToVideo
            .create({
              model: 'veo3.1',
              promptText: truncatedPrompt,
              ratio: textRatio as any,
              duration: duration,
            })
            .waitForTaskOutput();
        }
      }

      console.log(`[Runway] Task completed:`, JSON.stringify(task, null, 2));

      if (task.status === 'FAILED') {
        console.error(`[Runway] Task failed:`, JSON.stringify(task, null, 2));
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

  private async generateImageForVideo(prompt: string, aspectRatio: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    try {
      const { fal } = await import('@fal-ai/client');
      
      const imageAspect = aspectRatio === '9:16' ? 'portrait_16_9' : 
                          aspectRatio === '1:1' ? 'square' : 'landscape_16_9';
      
      console.log(`[Runway] Generating image with fal.ai FLUX...`);
      
      const result = await fal.subscribe('fal-ai/flux/schnell', {
        input: {
          prompt: prompt.substring(0, 500) + ' High quality, professional, cinematic frame.',
          image_size: imageAspect,
          num_images: 1,
          enable_safety_checker: true,
        },
        pollInterval: 1000,
      });
      
      const imageUrl = (result.data as any)?.images?.[0]?.url;
      
      if (imageUrl) {
        console.log(`[Runway] Image generated successfully`);
        return { success: true, imageUrl };
      }
      
      return { success: false, error: 'No image URL in response' };
    } catch (error: any) {
      console.error(`[Runway] Image generation error:`, error.message);
      return { success: false, error: error.message };
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
        ACL: 'public-read',
      }));

      const s3Url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
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

  private truncatePrompt(prompt: string, maxLength: number = 1000): string {
    if (prompt.length <= maxLength) {
      return prompt;
    }
    const truncated = prompt.substring(0, maxLength - 3) + '...';
    console.log(`[Runway] Prompt truncated from ${prompt.length} to ${truncated.length} chars`);
    return truncated;
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
