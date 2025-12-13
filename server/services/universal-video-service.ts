import Anthropic from "@anthropic-ai/sdk";
import { fal } from "@fal-ai/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  VideoProject,
  Scene,
  ProductVideoInput,
  ScriptVideoInput,
  ProductionProgress,
  ServiceFailure,
  TextOverlay,
  createEmptyVideoProject,
  calculateTotalDuration,
  PINE_HILL_FARM_BRAND,
  OUTPUT_FORMATS,
  SCENE_OVERLAY_DEFAULTS,
} from "../../shared/video-types";

const AWS_REGION = "us-east-1";
const REMOTION_BUCKET = "remotionlambda-useast1-refjo5giq5";

interface ImageGenerationResult {
  url: string;
  source: string;
  success: boolean;
  error?: string;
}

interface VoiceoverResult {
  url: string;
  duration: number;
  success: boolean;
  error?: string;
}

interface ServiceNotification {
  type: 'error' | 'warning' | 'info';
  service: string;
  message: string;
  timestamp: string;
  fallbackUsed?: string;
}

class UniversalVideoService {
  private anthropic: Anthropic | null = null;
  private notifications: ServiceNotification[] = [];
  private projectCallbacks: Map<string, (progress: ProductionProgress) => void> = new Map();
  private s3Client: S3Client | null = null;
  private usedVideoUrls: Set<string> = new Set();

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    
    const accessKeyId = process.env.REMOTION_AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.REMOTION_AWS_SECRET_ACCESS_KEY;
    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: AWS_REGION,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
  }

  private async uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string | null> {
    if (!this.s3Client) {
      console.error('[UniversalVideoService] S3 client not configured');
      return null;
    }

    try {
      const command = new PutObjectCommand({
        Bucket: REMOTION_BUCKET,
        Key: `video-assets/${key}`,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
      });

      await this.s3Client.send(command);
      
      const publicUrl = `https://${REMOTION_BUCKET}.s3.${AWS_REGION}.amazonaws.com/video-assets/${key}`;
      console.log(`[UniversalVideoService] Uploaded to S3: ${publicUrl}`);
      return publicUrl;
    } catch (error: any) {
      console.error('[UniversalVideoService] S3 upload failed:', error.message);
      return null;
    }
  }

  /**
   * Download a file from external URL and return as Buffer
   */
  private async downloadExternalFile(
    url: string, 
    timeoutMs: number = 60000
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    if (!url || !url.startsWith('http')) {
      console.warn(`[AssetDownload] Invalid URL: ${url}`);
      return null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      console.log(`[AssetDownload] Downloading: ${url.substring(0, 80)}...`);
      const startTime = Date.now();

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'PineHillFarm-VideoProducer/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[AssetDownload] Failed (${response.status}): ${url}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      
      const downloadTime = Date.now() - startTime;
      const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
      console.log(`[AssetDownload] Complete: ${sizeMB}MB in ${downloadTime}ms`);

      return { buffer, contentType };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn(`[AssetDownload] Timeout after ${timeoutMs}ms: ${url}`);
      } else {
        console.warn(`[AssetDownload] Error: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Download external video and upload to S3
   * Returns S3 URL or null if failed
   */
  private async cacheVideoToS3(
    externalUrl: string,
    sceneId: string
  ): Promise<string | null> {
    if (!externalUrl || !this.s3Client) {
      return null;
    }

    // Skip if already an S3 URL
    if (externalUrl.includes('s3.') && externalUrl.includes('amazonaws.com')) {
      console.log(`[CacheVideo] Already S3 URL: ${externalUrl.substring(0, 60)}`);
      return externalUrl;
    }

    try {
      console.log(`[CacheVideo] Caching video for scene ${sceneId}...`);
      const downloadResult = await this.downloadExternalFile(externalUrl, 90000); // 90s timeout for videos

      if (!downloadResult) {
        console.warn(`[CacheVideo] Download failed for scene ${sceneId}`);
        return null;
      }

      // Determine file extension from content type
      let extension = 'mp4';
      if (downloadResult.contentType.includes('webm')) {
        extension = 'webm';
      } else if (downloadResult.contentType.includes('quicktime') || downloadResult.contentType.includes('mov')) {
        extension = 'mov';
      }

      const fileName = `broll/${sceneId}_${Date.now()}.${extension}`;
      const s3Url = await this.uploadToS3(
        downloadResult.buffer,
        fileName,
        downloadResult.contentType
      );

      if (s3Url) {
        console.log(`[CacheVideo] Cached to S3: ${s3Url}`);
        return s3Url;
      }

      return null;
    } catch (error: any) {
      console.error(`[CacheVideo] Error caching video for ${sceneId}:`, error.message);
      return null;
    }
  }

  /**
   * Download external image and upload to S3
   * Returns S3 URL or null if failed
   */
  private async cacheImageToS3(
    externalUrl: string,
    sceneId: string,
    imageType: 'background' | 'content' | 'stock' = 'background'
  ): Promise<string | null> {
    if (!externalUrl || !this.s3Client) {
      return null;
    }

    // Skip if already an S3 URL
    if (externalUrl.includes('s3.') && externalUrl.includes('amazonaws.com')) {
      console.log(`[CacheImage] Already S3 URL: ${externalUrl.substring(0, 60)}`);
      return externalUrl;
    }

    // Skip data URLs (need different handling)
    if (externalUrl.startsWith('data:')) {
      return null; // Will be handled by existing base64 upload logic
    }

    try {
      console.log(`[CacheImage] Caching ${imageType} image for scene ${sceneId}...`);
      const downloadResult = await this.downloadExternalFile(externalUrl, 30000); // 30s timeout for images

      if (!downloadResult) {
        console.warn(`[CacheImage] Download failed for scene ${sceneId}`);
        return null;
      }

      // Determine file extension
      let extension = 'jpg';
      if (downloadResult.contentType.includes('png')) {
        extension = 'png';
      } else if (downloadResult.contentType.includes('webp')) {
        extension = 'webp';
      }

      const fileName = `images/${imageType}_${sceneId}_${Date.now()}.${extension}`;
      const s3Url = await this.uploadToS3(
        downloadResult.buffer,
        fileName,
        downloadResult.contentType
      );

      if (s3Url) {
        console.log(`[CacheImage] Cached to S3: ${s3Url}`);
        return s3Url;
      }

      return null;
    } catch (error: any) {
      console.error(`[CacheImage] Error caching image for ${sceneId}:`, error.message);
      return null;
    }
  }

  /**
   * Cache all external assets to S3 for a project
   * Call this AFTER asset generation but BEFORE rendering
   */
  async cacheAllAssetsToS3(project: VideoProject): Promise<{
    success: boolean;
    cachedCount: number;
    failedCount: number;
    details: string[];
  }> {
    const details: string[] = [];
    let cachedCount = 0;
    let failedCount = 0;

    console.log('[CacheAssets] Starting S3 asset caching...');
    const startTime = Date.now();

    // Cache voiceover (usually already S3, but verify)
    if (project.assets.voiceover.fullTrackUrl) {
      const url = project.assets.voiceover.fullTrackUrl;
      if (!url.includes('s3.amazonaws.com') && !url.startsWith('data:') && url.startsWith('http')) {
        const downloadResult = await this.downloadExternalFile(url, 30000);
        if (downloadResult) {
          const s3Url = await this.uploadToS3(
            downloadResult.buffer,
            `voiceover/${project.id}_${Date.now()}.mp3`,
            'audio/mpeg'
          );
          if (s3Url) {
            project.assets.voiceover.fullTrackUrl = s3Url;
            cachedCount++;
            details.push(`✓ Voiceover cached to S3`);
          }
        }
      }
    }

    // Cache music
    if (project.assets.music?.url) {
      const url = project.assets.music.url;
      if (!url.includes('s3.amazonaws.com') && !url.startsWith('data:') && url.startsWith('http')) {
        const downloadResult = await this.downloadExternalFile(url, 60000);
        if (downloadResult) {
          const s3Url = await this.uploadToS3(
            downloadResult.buffer,
            `music/${project.id}_${Date.now()}.mp3`,
            'audio/mpeg'
          );
          if (s3Url) {
            project.assets.music.url = s3Url;
            cachedCount++;
            details.push(`✓ Music cached to S3`);
          }
        }
      }
    }

    // Cache scene assets (images and videos)
    for (let i = 0; i < project.scenes.length; i++) {
      const scene = project.scenes[i];
      
      // Cache B-roll video
      if (scene.assets?.videoUrl && scene.background?.type === 'video') {
        const s3VideoUrl = await this.cacheVideoToS3(scene.assets.videoUrl, scene.id);
        if (s3VideoUrl) {
          project.scenes[i].assets!.videoUrl = s3VideoUrl;
          cachedCount++;
          details.push(`✓ Scene ${i} video cached`);
        } else {
          // Video cache failed - fall back to image
          console.warn(`[CacheAssets] Scene ${i} video cache failed, switching to image`);
          project.scenes[i].background!.type = 'image';
          project.scenes[i].assets!.videoUrl = undefined;
          failedCount++;
          details.push(`✗ Scene ${i} video failed - using image`);
        }
      }

      // Cache background image
      if (scene.assets?.backgroundUrl) {
        const s3ImageUrl = await this.cacheImageToS3(
          scene.assets.backgroundUrl,
          scene.id,
          'background'
        );
        if (s3ImageUrl) {
          project.scenes[i].assets!.backgroundUrl = s3ImageUrl;
          project.scenes[i].assets!.imageUrl = s3ImageUrl;
          cachedCount++;
          details.push(`✓ Scene ${i} background cached`);
        } else if (!scene.assets.backgroundUrl.startsWith('data:') && !scene.assets.backgroundUrl.includes('s3.amazonaws.com')) {
          failedCount++;
          details.push(`✗ Scene ${i} background cache failed`);
        }
      }

      // Cache standalone image (if different from background)
      if (scene.assets?.imageUrl && scene.assets.imageUrl !== scene.assets.backgroundUrl) {
        const s3ImageUrl = await this.cacheImageToS3(
          scene.assets.imageUrl,
          scene.id,
          'content'
        );
        if (s3ImageUrl) {
          project.scenes[i].assets!.imageUrl = s3ImageUrl;
          cachedCount++;
          details.push(`✓ Scene ${i} image cached`);
        }
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[CacheAssets] Complete: ${cachedCount} cached, ${failedCount} failed in ${totalTime}s`);

    return {
      success: failedCount === 0,
      cachedCount,
      failedCount,
      details,
    };
  }

  private addNotification(notification: Omit<ServiceNotification, 'timestamp'>) {
    const fullNotification = {
      ...notification,
      timestamp: new Date().toISOString(),
    };
    this.notifications.push(fullNotification);
    console.log(`[UniversalVideoService] ${notification.type.toUpperCase()}: ${notification.service} - ${notification.message}`);
  }

  getNotifications(): ServiceNotification[] {
    return this.notifications;
  }

  clearNotifications() {
    this.notifications = [];
  }

  async generateProductScript(input: ProductVideoInput): Promise<Scene[]> {
    if (!this.anthropic) {
      throw new Error("Anthropic API not configured");
    }

    const prompt = `Create a ${input.duration}-second video script for:
Product: ${input.productName}
Description: ${input.productDescription}
Target Audience: ${input.targetAudience}
Key Benefits: ${input.benefits.join(', ')}
Style: ${input.style}
CTA: ${input.callToAction}

Return a JSON array of scenes with this exact structure (no markdown, just pure JSON):
{
  "scenes": [
    {
      "type": "hook|benefit|feature|intro|cta",
      "duration": number,
      "narration": "voiceover text for this scene",
      "visualDirection": "detailed description for AI image generation - be specific about what to show",
      "textOverlays": [
        {
          "text": "on-screen text",
          "style": "title|subtitle|headline|bullet|cta",
          "timing": { "startAt": 0, "duration": 3 }
        }
      ]
    }
  ]
}

Guidelines for ${input.duration}-second video:
${input.duration === 30 ? `
- Hook scene: 6 seconds, grab attention with a compelling question or statement
- 2 benefit scenes: 8 seconds each
- CTA scene: 8 seconds with clear call to action
Total: 30 seconds` : ''}
${input.duration === 60 ? `
- Hook scene: 8 seconds, grab attention
- Intro scene: 10 seconds, introduce the product
- 3 benefit scenes: 10 seconds each
- CTA scene: 12 seconds
Total: 60 seconds` : ''}
${input.duration === 90 ? `
- Hook scene: 10 seconds
- Problem scene: 15 seconds
- Solution intro: 10 seconds
- 3 benefit scenes: 12 seconds each
- Brand scene: 8 seconds
- CTA scene: 11 seconds
Total: 90 seconds` : ''}

- Narration should be conversational and ${input.style.toLowerCase()}
- Visual directions should be specific and descriptive for AI image generation
- Include text overlays that reinforce key points
- Make sure durations add up exactly to ${input.duration} seconds`;

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type");
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const rawScenes = parsed.scenes || [];

      return rawScenes.map((s: any, index: number) => this.createSceneFromRaw(s, index));
    } catch (error: any) {
      console.error("[UniversalVideoService] Script generation failed:", error);
      throw error;
    }
  }

  async parseScript(input: ScriptVideoInput): Promise<Scene[]> {
    if (!this.anthropic) {
      throw new Error("Anthropic API not configured");
    }

    const prompt = `Parse this video script into structured scenes:

"""
${input.script}
"""

Return JSON with this exact structure (no markdown, just pure JSON):
{
  "scenes": [
    {
      "type": "hook|intro|explanation|process|brand|cta|benefit|feature",
      "narration": "exact voiceover text for this scene",
      "visualDirection": "specific description for AI image generation",
      "estimatedDuration": number (based on ~2.5 words per second speaking rate),
      "keyPoints": ["main point for text overlay"]
    }
  ]
}

Guidelines:
- Identify natural scene breaks (topic changes, new sections)
- "Opening Scene" or "Hook" patterns → type: "hook"
- "Scene X: TITLE" patterns indicate new scenes
- Closing/CTA content → type: "cta"
- Process/steps content → type: "process"
- Brand mentions → type: "brand"
- Calculate duration: ~2.5 words per second for narration
- Visual directions should be specific and descriptive`;

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type");
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const rawScenes = parsed.scenes || [];

      return rawScenes.map((s: any, index: number) => this.createSceneFromRaw({
        ...s,
        duration: s.estimatedDuration || Math.ceil((s.narration?.split(' ').length || 0) / 2.5),
        textOverlays: s.keyPoints ? s.keyPoints.map((kp: string, i: number) => ({
          text: kp,
          style: i === 0 ? 'title' : 'subtitle',
          timing: { startAt: i * 3, duration: 4 }
        })) : [],
      }, index));
    } catch (error: any) {
      console.error("[UniversalVideoService] Script parsing failed:", error);
      throw error;
    }
  }

  private getTransitionTypeForScene(sceneType: string, index: number, direction: 'in' | 'out'): 'fade' | 'zoom' | 'crossfade' | 'none' | 'slide' | 'wipe' {
    // First scene always fades in
    if (index === 0 && direction === 'in') return 'fade';
    
    // Choose transitions based on scene type for visual variety
    switch (sceneType) {
      case 'hook':
        return direction === 'in' ? 'zoom' : 'fade';
      case 'intro':
        return direction === 'in' ? 'fade' : 'slide';
      case 'benefit':
      case 'feature':
        // Alternate between slide for feature scenes
        return direction === 'in' ? 'slide' : 'fade';
      case 'cta':
        return direction === 'in' ? 'zoom' : 'fade';
      case 'outro':
        return 'fade';
      case 'testimonial':
        return direction === 'in' ? 'fade' : 'fade';
      default:
        // Default to crossfade for smooth transitions
        return 'crossfade';
    }
  }

  private createSceneFromRaw(raw: any, index: number): Scene {
    const id = `scene_${String(index + 1).padStart(3, '0')}_${raw.type || 'content'}`;
    const duration = raw.duration || 10;

    const textOverlays: TextOverlay[] = (raw.textOverlays || []).map((to: any, i: number) => ({
      id: `text_${id}_${i}`,
      text: to.text || '',
      style: to.style || 'subtitle',
      position: {
        vertical: to.style === 'title' ? 'center' : 'lower-third',
        horizontal: 'center',
        padding: 60,
      },
      timing: {
        startAt: to.timing?.startAt || 0,
        duration: to.timing?.duration || 4,
      },
      animation: {
        enter: to.style === 'title' ? 'fade' : 'slide-up',
        exit: 'fade',
        duration: 0.5,
      },
    }));

    return {
      id,
      order: index + 1,
      type: raw.type || 'content',
      duration,
      narration: raw.narration || '',
      textOverlays,
      background: {
        type: 'image',
        source: raw.visualDirection || '',
        effect: {
          type: 'ken-burns',
          intensity: 'subtle',
          direction: index % 2 === 0 ? 'in' : 'out',
        },
        overlay: {
          type: 'gradient',
          color: '#000000',
          opacity: 0.4,
        },
      },
      transitionIn: {
        type: this.getTransitionTypeForScene(raw.type || 'content', index, 'in'),
        duration: 0.6,
        easing: 'ease-in-out',
      },
      transitionOut: {
        type: this.getTransitionTypeForScene(raw.type || 'content', index, 'out'),
        duration: 0.5,
        easing: 'ease-in-out',
      },
    };
  }

  async generateImage(prompt: string, sceneId: string): Promise<ImageGenerationResult> {
    const falKey = process.env.FAL_KEY;
    
    const enhancedPrompt = this.enhanceImagePrompt(prompt);

    if (falKey) {
      const falResult = await this.generateImageWithFalPrimary(enhancedPrompt, falKey);
      if (falResult.success) {
        return falResult;
      }
      
      this.addNotification({
        type: 'error',
        service: 'fal.ai',
        message: `Primary image generation failed for scene ${sceneId}: ${falResult.error}`,
        fallbackUsed: 'Hugging Face SDXL',
      });
    } else {
      this.addNotification({
        type: 'warning',
        service: 'fal.ai',
        message: 'FAL_KEY not configured - using fallback services',
      });
    }

    const hfResult = await this.generateImageWithHuggingFace(enhancedPrompt);
    if (hfResult.success) {
      this.addNotification({
        type: 'info',
        service: 'Hugging Face',
        message: `Fallback image generated for scene ${sceneId}`,
      });
      return hfResult;
    }

    this.addNotification({
      type: 'warning',
      service: 'Hugging Face',
      message: `Fallback image generation failed: ${hfResult.error}. Using stock images.`,
    });

    const stockResult = await this.getStockImage(prompt);
    if (stockResult.success) {
      return stockResult;
    }

    return {
      url: '',
      source: 'none',
      success: false,
      error: 'All image generation methods failed',
    };
  }

  private enhanceImagePrompt(prompt: string): string {
    const styleModifiers = [
      'professional photography',
      'warm natural lighting',
      'health and wellness aesthetic',
      'clean composition',
      '4K ultra detailed',
      'soft color palette',
    ];
    return `${prompt}, ${styleModifiers.join(', ')}`;
  }

  private async generateImageWithFalPrimary(prompt: string, falKey: string): Promise<ImageGenerationResult> {
    fal.config({ credentials: falKey });

    const models = [
      {
        id: "fal-ai/flux-pro/v1.1",
        name: "FLUX-Pro-1.1",
        params: {
          prompt,
          image_size: { width: 1920, height: 1080 },
          num_inference_steps: 28,
          guidance_scale: 3.5,
        },
      },
      {
        id: "fal-ai/flux/dev",
        name: "FLUX-Dev",
        params: {
          prompt,
          image_size: { width: 1920, height: 1080 },
          num_inference_steps: 28,
        },
      },
      {
        id: "fal-ai/flux/schnell",
        name: "FLUX-Schnell",
        params: {
          prompt,
          image_size: { width: 1920, height: 1080 },
          num_inference_steps: 4,
        },
      },
    ];

    for (const model of models) {
      try {
        console.log(`[UniversalVideoService] Generating image with fal.ai ${model.name}...`);

        const result = await fal.subscribe(model.id, {
          input: model.params,
          logs: false,
        }) as any;

        const imageUrl =
          result?.data?.images?.[0]?.url ||
          result?.images?.[0]?.url ||
          result?.data?.image?.url ||
          result?.image?.url;

        if (imageUrl) {
          console.log(`[UniversalVideoService] ${model.name} generated image successfully`);
          return {
            url: imageUrl,
            source: `fal.ai ${model.name}`,
            success: true,
          };
        }
      } catch (e: any) {
        const errorMessage = e.message || String(e);
        console.warn(`[UniversalVideoService] ${model.name} error:`, errorMessage.substring(0, 200));

        if (
          errorMessage.includes("payment") ||
          errorMessage.includes("quota") ||
          errorMessage.includes("billing")
        ) {
          return {
            url: '',
            source: `fal.ai ${model.name}`,
            success: false,
            error: `Billing issue: ${errorMessage}`,
          };
        }
      }
    }

    return {
      url: '',
      source: 'fal.ai',
      success: false,
      error: 'All fal.ai models failed',
    };
  }

  private async generateImageWithHuggingFace(prompt: string): Promise<ImageGenerationResult> {
    const hfToken = process.env.HUGGINGFACE_API_TOKEN;
    if (!hfToken) {
      return { url: '', source: 'huggingface', success: false, error: 'No API token' };
    }

    const models = [
      { id: "stabilityai/stable-diffusion-xl-base-1.0", name: "SDXL" },
      { id: "black-forest-labs/FLUX.1-schnell", name: "FLUX-Schnell" },
    ];

    for (const model of models) {
      try {
        console.log(`[UniversalVideoService] Trying Hugging Face ${model.name}...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);

        const response = await fetch(
          `https://router.huggingface.co/hf-inference/models/${model.id}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${hfToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                negative_prompt: "blurry, low quality, distorted, ugly, bad anatomy",
                num_inference_steps: 25,
                guidance_scale: 7.5,
              },
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("image")) {
            const blob = await response.blob();
            const buffer = await blob.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");
            const mimeType = contentType.includes("jpeg") ? "image/jpeg" : "image/png";

            return {
              url: `data:${mimeType};base64,${base64}`,
              source: `Hugging Face ${model.name}`,
              success: true,
            };
          }
        }
      } catch (e: any) {
        console.warn(`[UniversalVideoService] HF ${model.name} error:`, e.message || e);
      }
    }

    return { url: '', source: 'huggingface', success: false, error: 'All models failed' };
  }

  private getBackgroundEnvironmentPrompt(sceneType: string): string {
    const environments: Record<string, string> = {
      hook: 'dramatic lighting with soft shadows, elegant minimalist setting',
      intro: 'clean white studio environment with subtle reflections on surface',
      benefit: 'natural setting with soft morning light, serene peaceful atmosphere',
      feature: 'modern clean laboratory or wellness space with professional lighting',
      explanation: 'educational setting with soft gradient background and subtle textures',
      process: 'clean production environment with professional studio lighting',
      testimonial: 'warm inviting home-like environment with natural window light',
      social_proof: 'professional office or wellness center setting',
      story: 'cinematic atmospheric background with bokeh lighting effects',
      cta: 'premium studio setting with spotlight and elegant backdrop',
      outro: 'soft gradient background transitioning to brand colors',
    };
    return environments[sceneType] || 'professional studio environment with clean composition';
  }

  private async generateAIBackground(
    backgroundPrompt: string,
    sceneType: string
  ): Promise<{ backgroundUrl: string | null; source: string }> {
    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      console.log('[UniversalVideoService] FAL_KEY not available - cannot generate AI background');
      return { backgroundUrl: null, source: 'none' };
    }

    try {
      console.log(`[UniversalVideoService] Generating AI background for ${sceneType} scene...`);
      
      const environmentContext = this.getBackgroundEnvironmentPrompt(sceneType);
      
      const cleanedPrompt = backgroundPrompt
        .replace(/product\s*(shot|image|photo|photography)?/gi, '')
        .replace(/bottle/gi, '')
        .replace(/packaging/gi, '')
        .replace(/label/gi, '')
        .replace(/(Black Cohosh|Extract|Plus)/gi, '')
        .trim();

      const environmentOnlyPrompt = `Empty background scene for product photography: ${environmentContext}. ${cleanedPrompt}. IMPORTANT: No products, no bottles, no packaging, no text, no labels, no logos - ONLY the background environment and setting. Empty clean surface ready for product placement. Professional studio lighting, high quality, 4K, photorealistic background plate.`;
      
      console.log(`[UniversalVideoService] Environment-only prompt: ${environmentOnlyPrompt}`);

      const backgroundResult = await fal.subscribe("fal-ai/flux-pro/v1.1", {
        input: {
          prompt: environmentOnlyPrompt,
          image_size: "landscape_16_9",
          num_images: 1,
          safety_tolerance: "2",
          enable_safety_checker: true,
        },
        logs: true,
        onQueueUpdate: (update: any) => {
          if (update.status === "IN_PROGRESS") {
            console.log(`[UniversalVideoService] Background generation in progress for ${sceneType}...`);
          }
        },
      });

      if (backgroundResult.data?.images?.[0]?.url) {
        console.log(`[UniversalVideoService] AI background generated successfully for ${sceneType}`);
        return {
          backgroundUrl: backgroundResult.data.images[0].url,
          source: 'fal.ai/flux-pro',
        };
      }
    } catch (error: any) {
      console.warn('[UniversalVideoService] Background generation failed:', error.message);
    }

    return { backgroundUrl: null, source: 'failed' };
  }

  private isContentScene(sceneType: string): boolean {
    const contentScenes = ['hook', 'benefit', 'story', 'explanation', 'process', 'testimonial', 'social_proof', 'problem'];
    return contentScenes.includes(sceneType);
  }

  private async generateContentImage(
    scene: Scene,
    productName: string
  ): Promise<{ imageUrl: string | null; source: string }> {
    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      console.log('[UniversalVideoService] FAL_KEY not available - trying stock images');
      return this.getContentStockImage(scene);
    }

    try {
      console.log(`[UniversalVideoService] Generating content image for ${scene.type} scene...`);
      
      const contentPrompt = this.buildContentPrompt(scene, productName);
      console.log(`[UniversalVideoService] Content prompt: ${contentPrompt}`);

      const result = await fal.subscribe("fal-ai/flux-pro/v1.1", {
        input: {
          prompt: contentPrompt,
          image_size: "landscape_16_9",
          num_images: 1,
          safety_tolerance: "2",
          enable_safety_checker: true,
        },
        logs: true,
        onQueueUpdate: (update: any) => {
          if (update.status === "IN_PROGRESS") {
            console.log(`[UniversalVideoService] Content image generation in progress for ${scene.type}...`);
          }
        },
      });

      if (result.data?.images?.[0]?.url) {
        console.log(`[UniversalVideoService] Content image generated successfully for ${scene.type}`);
        return {
          imageUrl: result.data.images[0].url,
          source: 'fal.ai/flux-pro (content)',
        };
      }
    } catch (error: any) {
      console.warn('[UniversalVideoService] Content image generation failed:', error.message);
    }

    return this.getContentStockImage(scene);
  }

  private buildContentPrompt(scene: Scene, productName: string): string {
    const sceneType = scene.type;
    const visualDirection = scene.visualDirection || '';
    const narration = scene.narration || '';
    
    // Get demographic context from scene or infer from product
    let demographicContext = '';
    const lowerNarration = narration.toLowerCase();
    const lowerProduct = productName.toLowerCase();
    
    // Infer demographics from product/narration content
    if (lowerProduct.includes('menopause') || lowerNarration.includes('menopause') ||
        lowerProduct.includes('hormone') || lowerNarration.includes('hot flash')) {
      demographicContext = 'mature woman in her 40s-60s, graceful confident, healthy glowing, ';
    } else if (lowerProduct.includes('senior') || lowerNarration.includes('elderly')) {
      demographicContext = 'senior woman, dignified healthy, active lifestyle, ';
    } else if (lowerNarration.includes('woman') || lowerNarration.includes('female') || lowerNarration.includes('women')) {
      demographicContext = 'adult woman, healthy natural, ';
    }
    
    let baseContext = '';
    
    switch (sceneType) {
      case 'hook':
        baseContext = `${demographicContext}Emotional cinematic scene showing the problem or challenge. Person experiencing discomfort or frustration. Realistic lifestyle photography, dramatic lighting, evocative mood.`;
        break;
      case 'benefit':
        baseContext = `${demographicContext}Positive transformation scene showing wellness and relief. Person feeling happy, healthy, and vibrant. Bright natural lighting, optimistic mood, lifestyle photography.`;
        break;
      case 'story':
        baseContext = `${demographicContext}Authentic storytelling scene with emotional depth. Real-life moment captured naturally. Documentary style, warm tones, genuine expression.`;
        break;
      case 'explanation':
      case 'process':
        baseContext = `${demographicContext}Educational visual showing scientific or natural process. Clean informational style, subtle medical/botanical elements, professional presentation.`;
        break;
      case 'testimonial':
      case 'social_proof':
        baseContext = `${demographicContext}Happy satisfied person in natural home or lifestyle setting. Genuine smile, warm inviting atmosphere, trustworthy and relatable.`;
        break;
      case 'problem':
        baseContext = `${demographicContext}Person dealing with challenge or discomfort. Empathetic perspective, muted colors, realistic portrayal of struggle before solution.`;
        break;
      default:
        baseContext = `${demographicContext}Professional lifestyle photography with natural lighting.`;
    }
    
    const extractedConcepts = this.extractVisualConcepts(visualDirection, narration);
    
    const fullPrompt = `${baseContext} ${extractedConcepts}. High quality, 4K, photorealistic, professional commercial photography. NO text, NO logos, NO product shots, NO bottles, NO packaging. IMPORTANT: Show ADULTS only, no children or teenagers.`;
    
    return fullPrompt;
  }

  private extractVisualConcepts(visualDirection: string, narration: string): string {
    const combined = `${visualDirection} ${narration}`.toLowerCase();
    
    const concepts: string[] = [];
    
    // Specify adult/mature for menopause content
    if (combined.includes('menopause') || combined.includes('hot flash') || combined.includes('hormonal')) {
      concepts.push('mature woman in her 50s, wellness journey, natural health, serene confident expression');
    }
    // Specify adult for sleep content
    if (combined.includes('sleep') || combined.includes('restful') || combined.includes('night')) {
      concepts.push('adult peaceful sleep, comfortable bedroom, restful atmosphere');
    }
    if (combined.includes('energy') || combined.includes('vitality') || combined.includes('active')) {
      concepts.push('energetic adult, active lifestyle, vibrant health');
    }
    if (combined.includes('stress') || combined.includes('anxiety') || combined.includes('mood')) {
      concepts.push('calm relaxed adult, peaceful moment, stress relief');
    }
    if (combined.includes('natural') || combined.includes('herb') || combined.includes('botanical')) {
      concepts.push('natural herbs, botanical elements, organic wellness');
    }
    // Ensure woman means adult woman
    if (combined.includes('woman') || combined.includes('female') || combined.includes('her')) {
      concepts.push('adult woman in natural setting, feminine wellness');
    }
    if (combined.includes('science') || combined.includes('study') || combined.includes('research') || combined.includes('clinical')) {
      concepts.push('scientific visualization, research imagery, medical illustration style');
    }
    
    if (concepts.length === 0) {
      concepts.push('adult wellness lifestyle, healthy living, natural setting');
    }
    
    return concepts.join(', ');
  }

  private async getContentStockImage(scene: Scene): Promise<{ imageUrl: string | null; source: string }> {
    const searchQuery = this.buildStockSearchQuery(scene);
    console.log(`[UniversalVideoService] Searching stock images for: ${searchQuery}`);
    
    const result = await this.getStockImage(searchQuery);
    if (result.success) {
      return { imageUrl: result.url, source: result.source };
    }
    
    return { imageUrl: null, source: 'failed' };
  }

  private buildStockSearchQuery(scene: Scene): string {
    const sceneType = scene.type;
    const narration = (scene.narration || '').toLowerCase();
    
    if (narration.includes('menopause') || narration.includes('hot flash')) {
      return 'woman wellness health natural';
    }
    if (narration.includes('sleep') || narration.includes('restful')) {
      return 'peaceful sleep relaxation bedroom';
    }
    if (narration.includes('energy') || narration.includes('vitality')) {
      return 'active healthy lifestyle energy';
    }
    if (narration.includes('hormone') || narration.includes('estrogen')) {
      return 'woman health wellness botanical';
    }
    
    const stockQueries: Record<string, string> = {
      hook: 'woman wellness challenge lifestyle',
      benefit: 'happy healthy woman nature',
      story: 'authentic lifestyle moment',
      explanation: 'natural herbs botanical wellness',
      process: 'science nature botanical',
      testimonial: 'happy satisfied customer portrait',
      social_proof: 'people wellness community',
      problem: 'woman stress health concern',
    };
    
    return stockQueries[sceneType] || 'wellness lifestyle health';
  }

  private resolveProductImageUrl(url: string): string {
    if (!url) return '';
    
    if (url.startsWith('http')) return url;
    
    if (url.startsWith('/objects/')) {
      return url;
    }
    
    if (url.startsWith('public/') || url.startsWith('/public/')) {
      return `/objects/${url.replace(/^\//, '')}`;
    }
    
    return `/objects/${url.replace(/^\//, '')}`;
  }

  private async getStockImage(query: string): Promise<ImageGenerationResult> {
    const pexelsKey = process.env.PEXELS_API_KEY;
    if (pexelsKey) {
      try {
        const response = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
          { headers: { Authorization: pexelsKey } }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.photos && data.photos[0]) {
            return {
              url: data.photos[0].src.large2x || data.photos[0].src.large,
              source: 'Pexels Stock',
              success: true,
            };
          }
        }
      } catch (e) {
        console.warn("[UniversalVideoService] Pexels error:", e);
      }
    }

    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (unsplashKey) {
      try {
        const response = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
          { headers: { Authorization: `Client-ID ${unsplashKey}` } }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results[0]) {
            return {
              url: data.results[0].urls.regular,
              source: 'Unsplash Stock',
              success: true,
            };
          }
        }
      } catch (e) {
        console.warn("[UniversalVideoService] Unsplash error:", e);
      }
    }

    return { url: '', source: 'stock', success: false, error: 'No stock images found' };
  }

  /**
   * Pre-process narration text to help TTS pronounce specialty words correctly
   * Uses phonetic hints that ElevenLabs can interpret better
   */
  private preprocessNarrationForTTS(text: string): string {
    // Pronunciation dictionary for health/wellness terms
    // Format: exact word -> phonetic pronunciation
    // FIXED: Use spaces instead of hyphens - ElevenLabs reads hyphens as pauses
    const pronunciationMap: Record<string, string> = {
      // Herbs - smooth phonetic spelling with spaces
      'cohosh': 'KOH hosh',
      'Cohosh': 'KOH hosh',
      'ashwagandha': 'ahsh wah GAHN dah',
      'Ashwagandha': 'Ahsh wah GAHN dah',
      'chasteberry': 'CHAYST berry',
      'Chasteberry': 'CHAYST berry',
      'dong quai': 'dong KWAY',
      'Dong Quai': 'Dong KWAY',
      'Dong quai': 'Dong kway',
      
      // Scientific terms
      'isoflavone': 'EYE so flay vone',
      'isoflavones': 'EYE so flay vones',
      'Isoflavone': 'EYE so flay vone',
      'Isoflavones': 'EYE so flay vones',
      'phytoestrogen': 'FY toe ESS tro jen',
      'phytoestrogens': 'FY toe ESS tro jens',
      'Phytoestrogen': 'FY toe ESS tro jen',
      'formononetin': 'for MON oh neh tin',
      'Formononetin': 'For MON oh neh tin',
      
      // Medical terms
      'luteinizing': 'LOO tin eye zing',
      'Luteinizing': 'LOO tin eye zing',
      'hypothalamus': 'HY poe THAL uh mus',
      'Hypothalamus': 'HY poe THAL uh mus',
      'endocrine': 'EN doe krin',
      'Endocrine': 'EN doe krin',
      'bioavailable': 'BY oh uh VALE uh bul',
      'Bioavailable': 'BY oh uh VALE uh bul',
      'adaptogen': 'uh DAP toh jen',
      'Adaptogen': 'uh DAP toh jen',
      'adaptogens': 'uh DAP toh jens',
      'Adaptogens': 'uh DAP toh jens',
      
      // Brand/product names
      'PineHillFarm': 'Pine Hill Farm',
      'pinehillfarm': 'Pine Hill Farm',
      'Pinehillfarm': 'Pine Hill Farm',
    };
    
    let processedText = text;
    
    // Replace each word with its phonetic version
    // Process longer phrases first to avoid partial replacements
    const sortedKeys = Object.keys(pronunciationMap).sort((a, b) => b.length - a.length);
    
    for (const word of sortedKeys) {
      const phonetic = pronunciationMap[word];
      // Use word boundary matching to avoid partial replacements
      const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      processedText = processedText.replace(regex, phonetic);
    }
    
    return processedText;
  }

  async generateVoiceover(
    text: string, 
    voiceId?: string,
    options?: {
      stability?: number;
      similarityBoost?: number;
      style?: number;
    }
  ): Promise<VoiceoverResult> {
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) {
      this.addNotification({
        type: 'error',
        service: 'ElevenLabs',
        message: 'ELEVENLABS_API_KEY not configured - voiceover generation unavailable',
      });
      return { url: '', duration: 0, success: false, error: 'API key not configured' };
    }

    // FIX 6: Preprocess text for better pronunciation with VERBOSE logging
    const processedText = this.preprocessNarrationForTTS(text);
    console.log('='.repeat(60));
    console.log('[TTS] PRONUNCIATION PREPROCESSING');
    console.log('[TTS] Original (first 150 chars):', text.substring(0, 150));
    console.log('[TTS] Processed (first 150 chars):', processedText.substring(0, 150));
    console.log('[TTS] Contains "cohosh"?:', text.toLowerCase().includes('cohosh'));
    console.log('[TTS] After processing contains "KOH hosh"?:', processedText.includes('KOH hosh'));
    console.log('[TTS] Contains "ashwagandha"?:', text.toLowerCase().includes('ashwagandha'));
    console.log('[TTS] After processing contains "ahsh wah GAHN dah"?:', processedText.includes('ahsh wah GAHN dah'));
    console.log('[TTS] Text changed?:', text !== processedText);
    console.log('='.repeat(60));

    // RECOMMENDED VOICES FOR HEALTH/WELLNESS:
    // - Rachel (21m00Tcm4TlvDq8ikWAM) - Warm, calm, American female - BEST for wellness
    // - Sarah (EXAVITQu4vr4xnSDxMaL) - Soft, friendly female
    // - Charlotte (XB0fDUnXU5powFXDhCwa) - Warm British female
    // - Matilda (XrExE9yKIg1WjnnlVkGX) - Warm, friendly female
    // - Thomas (GBv7mTt0atIp3Br8iCZE) - Calm, professional male
    const selectedVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel - best for wellness

    // IMPROVED VOICE SETTINGS for natural sound:
    const voiceSettings = {
      stability: options?.stability ?? 0.50,        // Lower = more expressive/natural
      similarity_boost: options?.similarityBoost ?? 0.75,
      style: options?.style ?? 0.40,                // Higher = more emotional delivery
      use_speaker_boost: true,                       // Improves clarity
    };

    try {
      console.log(`[UniversalVideoService] Generating voiceover with voice: ${selectedVoiceId}`);
      console.log(`[UniversalVideoService] Voice settings:`, voiceSettings);

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenLabsKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: processedText,
            // USE THE BEST MODEL - eleven_multilingual_v2 is highest quality
            model_id: "eleven_multilingual_v2",
            voice_settings: voiceSettings,
          }),
        }
      );

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(audioBuffer);
        
        const wordCount = text.split(/\s+/).length;
        const estimatedDuration = Math.ceil(wordCount / 2.5);
        
        const fileName = `voiceover_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
        const s3Url = await this.uploadToS3(buffer, fileName, 'audio/mpeg');
        
        if (s3Url) {
          console.log(`[UniversalVideoService] Voiceover uploaded to S3: ${s3Url} (${estimatedDuration}s)`);
          return {
            url: s3Url,
            duration: estimatedDuration,
            success: true,
          };
        } else {
          console.warn('[UniversalVideoService] S3 upload failed, using base64 fallback');
          const base64Audio = buffer.toString("base64");
          const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
          return {
            url: audioUrl,
            duration: estimatedDuration,
            success: true,
          };
        }
      } else {
        const errorText = await response.text();
        console.error(`[UniversalVideoService] ElevenLabs error: ${response.status}`, errorText);

        this.addNotification({
          type: 'error',
          service: 'ElevenLabs',
          message: `Voiceover generation failed: ${response.status} - ${errorText.substring(0, 100)}`,
        });

        return {
          url: '',
          duration: 0,
          success: false,
          error: `API error: ${response.status}`,
        };
      }
    } catch (e: any) {
      console.error("[UniversalVideoService] ElevenLabs error:", e);
      
      this.addNotification({
        type: 'error',
        service: 'ElevenLabs',
        message: `Voiceover generation failed: ${e.message || e}`,
      });

      return { url: '', duration: 0, success: false, error: e.message || 'Unknown error' };
    }
  }

  private buildVideoSearchQuery(scene: Scene, targetAudience?: string): string {
    const narration = (scene.narration || '').toLowerCase();
    
    // Get demographic prefix based on target audience
    let demographicTerms = '';
    if (targetAudience) {
      const audience = targetAudience.toLowerCase();
      
      // Age-based keywords - CRITICAL for correct visuals
      if (audience.includes('40') || audience.includes('50') || audience.includes('60') || 
          audience.includes('mature') || audience.includes('middle') || audience.includes('menopause')) {
        demographicTerms = 'mature middle-aged adult ';
      } else if (audience.includes('senior') || audience.includes('elderly') || audience.includes('65+') || audience.includes('70')) {
        demographicTerms = 'senior elderly older adult ';
      } else if (audience.includes('young') || audience.includes('20') || audience.includes('millennial')) {
        demographicTerms = 'young adult ';
      }
      // Default to adult if no age specified (never show children for health products)
      if (!demographicTerms && (audience.includes('women') || audience.includes('men'))) {
        demographicTerms = 'adult ';
      }
      
      // Gender-based keywords
      if (audience.includes('women') || audience.includes('female') || audience.includes('woman')) {
        demographicTerms += 'woman female ';
      } else if (audience.includes('men') || audience.includes('male') || audience.includes('man')) {
        demographicTerms += 'man male ';
      }
    }
    
    // Health/wellness specific keywords WITH demographics
    if (narration.includes('menopause')) return `${demographicTerms}wellness relaxation health`;
    if (narration.includes('hot flash')) return `${demographicTerms}cooling relief comfort relaxed`;
    if (narration.includes('sleep') || narration.includes('restful')) return `${demographicTerms}peaceful sleep relaxation bedroom`;
    if (narration.includes('energy') || narration.includes('vitality')) return `${demographicTerms}active healthy lifestyle energetic`;
    if (narration.includes('hormone')) return `${demographicTerms}wellness nature botanical healthy`;
    if (narration.includes('natural') || narration.includes('herbal')) return `${demographicTerms}herbs botanical plants nature`;
    if (narration.includes('relief') || narration.includes('comfort')) return `${demographicTerms}relaxed peaceful happy comfortable`;
    if (narration.includes('stress') || narration.includes('anxiety')) return `${demographicTerms}calm meditation relaxation peaceful`;
    
    // Scene type defaults WITH demographics
    const defaults: Record<string, string> = {
      hook: `${demographicTerms}concerned thinking wellness health`,
      benefit: `${demographicTerms}happy smiling healthy lifestyle`,
      testimonial: `${demographicTerms}satisfied happy smiling portrait`,
      story: `${demographicTerms}transformation journey wellness`,
      intro: `${demographicTerms}wellness morning routine healthy`,
      cta: `${demographicTerms}confident smiling action positive`,
      feature: `${demographicTerms}healthy lifestyle wellness`,
      explanation: `${demographicTerms}learning understanding wellness`,
    };
    
    return defaults[scene.type] || `${demographicTerms}wellness healthy lifestyle`;
  }

  /**
   * FIX 1: Get product overlay position based on scene type
   * Places products in corners to avoid blocking faces in B-roll
   */
  private getProductOverlayPosition(sceneType: string): {
    x: 'left' | 'center' | 'right';
    y: 'top' | 'center' | 'bottom';
    scale: number;
    animation: 'fade' | 'zoom' | 'slide' | 'none';
  } {
    console.log(`[ProductPosition] Getting position for scene type: ${sceneType}`);
    switch (sceneType) {
      case 'hook':
        return { x: 'right', y: 'bottom', scale: 0.25, animation: 'fade' };
      case 'intro':
        return { x: 'center', y: 'center', scale: 0.45, animation: 'zoom' };
      case 'feature':
        return { x: 'left', y: 'bottom', scale: 0.30, animation: 'slide' };
      case 'benefit':
        return { x: 'right', y: 'bottom', scale: 0.25, animation: 'fade' };
      case 'cta':
        return { x: 'center', y: 'center', scale: 0.50, animation: 'zoom' };
      case 'testimonial':
        return { x: 'left', y: 'bottom', scale: 0.20, animation: 'fade' };
      default:
        return { x: 'right', y: 'bottom', scale: 0.25, animation: 'fade' };
    }
  }

  /**
   * FIX 2: Determine whether to use video or image for a scene
   * Returns false (use image) for scenes where AI image quality is better than random B-roll
   */
  private shouldUseVideoBackground(
    scene: Scene,
    videoResult: { url: string; tags?: string; description?: string } | null,
    targetAudience?: string
  ): boolean {
    if (!videoResult || !videoResult.url) {
      console.log(`[Background] Scene ${scene.id}: No video available, using image`);
      return false;
    }
    
    if (targetAudience) {
      const isWomensProduct = targetAudience.toLowerCase().includes('women') || 
                              targetAudience.toLowerCase().includes('female');
      
      if (isWomensProduct && videoResult.tags) {
        const tags = videoResult.tags.toLowerCase();
        if (tags.includes('man') || tags.includes('male') || tags.includes('boy')) {
          console.log(`[Background] Scene ${scene.id}: Rejected video - wrong gender for women's product`);
          return false;
        }
      }
    }
    
    const preferImageSceneTypes = ['intro', 'cta'];
    if (preferImageSceneTypes.includes(scene.type)) {
      console.log(`[Background] Scene ${scene.id}: Prefer image for ${scene.type} scene`);
      return false;
    }
    
    console.log(`[Background] Scene ${scene.id}: Using validated video`);
    return true;
  }

  /**
   * FIX 3: Validate that video content matches target audience
   */
  private validateVideoForAudience(
    video: { tags?: string; description?: string; url: string },
    targetAudience: string
  ): boolean {
    const audience = targetAudience.toLowerCase();
    const tags = (video.tags || '').toLowerCase();
    const desc = (video.description || '').toLowerCase();
    const combined = `${tags} ${desc}`;
    
    if (audience.includes('women') || audience.includes('female')) {
      if (combined.includes(' man ') || combined.includes(' male ') || 
          combined.includes(' boy ') || combined.includes('businessman')) {
        console.log(`[Validation] Rejected: Male content for women's product`);
        return false;
      }
      
      if (!combined.includes('woman') && !combined.includes('female') && 
          !combined.includes('girl') && !combined.includes('lady')) {
        console.log(`[Validation] Warning: No female indicators, but allowing abstract/nature content`);
      }
    }
    
    if (audience.includes('40') || audience.includes('50') || audience.includes('mature') ||
        audience.includes('menopause')) {
      if (combined.includes('child') || combined.includes('kid') || 
          combined.includes('teen') || combined.includes('baby')) {
        console.log(`[Validation] Rejected: Youth content for mature audience`);
        return false;
      }
    }
    
    return true;
  }

  private resetUsedVideos(): void {
    this.usedVideoUrls.clear();
    console.log('[UniversalVideoService] Reset used videos tracker');
  }

  async getStockVideo(
    query: string,
    targetAudience?: string
  ): Promise<{ url: string; duration: number; source: string; tags?: string } | null> {
    console.log(`[StockVideo] Searching: "${query}" (${this.usedVideoUrls.size} already used)`);
    
    // Try Pexels - get multiple results
    const pexelsResult = await this.getPexelsVideo(query);
    if (pexelsResult) {
      // Check if already used
      if (this.usedVideoUrls.has(pexelsResult.url)) {
        console.log(`[StockVideo] Pexels result already used, trying different query...`);
        // Try with modified query
        const altResult = await this.getPexelsVideo(query + ' lifestyle');
        if (altResult && !this.usedVideoUrls.has(altResult.url)) {
          if (!targetAudience || this.validateVideoForAudience(altResult, targetAudience)) {
            this.usedVideoUrls.add(altResult.url);
            return altResult;
          }
        }
      } else {
        // Validate and use
        if (!targetAudience || this.validateVideoForAudience(pexelsResult, targetAudience)) {
          this.usedVideoUrls.add(pexelsResult.url);
          return pexelsResult;
        }
      }
    }

    // Try Pixabay as fallback
    const pixabayResult = await this.getPixabayVideo(query);
    if (pixabayResult && !this.usedVideoUrls.has(pixabayResult.url)) {
      if (!targetAudience || this.validateVideoForAudience(pixabayResult, targetAudience)) {
        this.usedVideoUrls.add(pixabayResult.url);
        return pixabayResult;
      }
    }

    console.log(`[StockVideo] No unused valid videos found for: "${query}"`);
    return null;
  }

  private async getPexelsVideo(query: string): Promise<{ url: string; duration: number; source: string } | null> {
    const pexelsKey = process.env.PEXELS_API_KEY;
    if (!pexelsKey) {
      console.log('[UniversalVideoService] No PEXELS_API_KEY configured');
      return null;
    }

    // Use official Pexels client library for proper video API access
    const { createClient } = await import('pexels');
    const client = createClient(pexelsKey);

    // Try multiple search strategies
    const searchQueries = [query];
    const words = query.split(' ');
    if (words.length > 2) {
      searchQueries.push(words.slice(0, 2).join(' '));
    }
    searchQueries.push('nature', 'wellness', 'relaxation');

    for (const searchQuery of searchQueries) {
      try {
        console.log(`[UniversalVideoService] Pexels video search (official client): "${searchQuery}"`);
        
        const result = await client.videos.search({ 
          query: searchQuery, 
          per_page: 5, 
          orientation: 'landscape' 
        });

        // Type guard for error response
        if ('error' in result) {
          console.warn(`[UniversalVideoService] Pexels API error: ${result.error}`);
          continue;
        }

        const videos = result.videos;
        console.log(`[UniversalVideoService] Pexels returned ${videos?.length || 0} videos for "${searchQuery}"`);

        if (videos && videos.length > 0) {
          for (const video of videos) {
            const hdFile = video.video_files?.find((f: any) => f.quality === 'hd') || video.video_files?.[0];
            if (hdFile?.link && video.duration >= 5 && video.duration <= 60) {
              console.log(`[UniversalVideoService] Selected Pexels video: ${hdFile.link} (${video.duration}s)`);
              return { url: hdFile.link, duration: video.duration, source: 'pexels' };
            }
          }
          const firstVideo = videos[0];
          const hdFile = firstVideo.video_files?.find((f: any) => f.quality === 'hd') || firstVideo.video_files?.[0];
          if (hdFile?.link) {
            return { url: hdFile.link, duration: firstVideo.duration, source: 'pexels' };
          }
        }
      } catch (e: any) {
        console.warn(`[UniversalVideoService] Pexels error: ${e.message}`);
      }
    }
    return null;
  }

  private async getPixabayVideo(query: string): Promise<{ url: string; duration: number; source: string } | null> {
    const pixabayKey = process.env.PIXABAY_API_KEY;
    if (!pixabayKey) {
      console.log('[UniversalVideoService] No PIXABAY_API_KEY configured for video fallback');
      return null;
    }

    const searchQueries = [query, 'nature', 'wellness', 'peaceful'];
    
    for (const searchQuery of searchQueries) {
      try {
        const url = `https://pixabay.com/api/videos/?key=${pixabayKey}&q=${encodeURIComponent(searchQuery)}&per_page=5`;
        console.log(`[UniversalVideoService] Pixabay video search: "${searchQuery}"`);
        
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`[UniversalVideoService] Pixabay API error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        if (data.hits && data.hits.length > 0) {
          console.log(`[UniversalVideoService] Pixabay found ${data.hits.length} videos`);
          for (const video of data.hits) {
            const videoFile = video.videos?.large || video.videos?.medium || video.videos?.small;
            if (videoFile?.url && video.duration >= 5 && video.duration <= 60) {
              console.log(`[UniversalVideoService] Selected Pixabay video: ${videoFile.url} (${video.duration}s)`);
              return { url: videoFile.url, duration: video.duration, source: 'pixabay' };
            }
          }
          const firstVideo = data.hits[0];
          const videoFile = firstVideo.videos?.large || firstVideo.videos?.medium || firstVideo.videos?.small;
          if (videoFile?.url) {
            return { url: videoFile.url, duration: firstVideo.duration, source: 'pixabay' };
          }
        }
      } catch (e: any) {
        console.warn(`[UniversalVideoService] Pixabay error: ${e.message}`);
      }
    }
    return null;
  }

  /**
   * Generate background music using ElevenLabs Music API
   * Uses the same ELEVENLABS_API_KEY as voiceover generation
   */
  async generateBackgroundMusic(
    duration: number,
    style: string = 'professional',
    productName?: string
  ): Promise<{ url: string; duration: number; source: string } | null> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      console.warn('[UniversalVideoService] No ELEVENLABS_API_KEY for music generation');
      this.addNotification({
        type: 'warning',
        service: 'Music',
        message: 'ElevenLabs API key required for music generation',
      });
      return null;
    }

    const musicPrompt = this.buildMusicPrompt(style, productName, duration);
    
    // Ensure duration is within API limits (10s - 5min)
    const durationMs = Math.max(10000, Math.min(duration * 1000, 300000));
    
    console.log(`[UniversalVideoService] Generating ElevenLabs music: "${musicPrompt.substring(0, 80)}..." (${duration}s)`);

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/music/compose', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: musicPrompt,
          duration_ms: durationMs,
          instrumental: true,
          output_format: 'mp3_44100_128',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[UniversalVideoService] ElevenLabs Music API error:', response.status, errorText);
        
        if (response.status === 401) {
          this.addNotification({
            type: 'error',
            service: 'Music',
            message: 'ElevenLabs API key invalid or expired',
          });
        } else if (response.status === 402) {
          this.addNotification({
            type: 'error',
            service: 'Music',
            message: 'Insufficient ElevenLabs credits for music generation',
          });
        }
        return null;
      }

      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      
      // Upload to S3 for Lambda access
      const s3Url = await this.uploadToS3(
        Buffer.from(audioBuffer),
        `music-${Date.now()}.mp3`,
        'audio/mpeg'
      );

      if (s3Url) {
        console.log(`[UniversalVideoService] Music generated and uploaded to S3: ${s3Url}`);
        return {
          url: s3Url,
          duration: duration,
          source: 'elevenlabs-music',
        };
      }

      // Fallback: return as data URL (works for local preview only)
      console.warn('[UniversalVideoService] S3 upload failed, using data URL (local preview only)');
      return {
        url: `data:audio/mpeg;base64,${base64Audio}`,
        duration: duration,
        source: 'elevenlabs-music',
      };

    } catch (error: any) {
      console.error('[UniversalVideoService] Music generation error:', error.message);
      this.addNotification({
        type: 'error',
        service: 'Music',
        message: `Music generation failed: ${error.message}`,
      });
      return null;
    }
  }

  /**
   * FIX 5: Build an effective music prompt - ALWAYS UPLIFTING for health products
   */
  private buildMusicPrompt(style: string, productName?: string, duration?: number): string {
    // FIX 5: All health products MUST have uplifting, hopeful music
    const stylePrompts: Record<string, string> = {
      professional: 
        'Uplifting inspiring corporate background music, positive hopeful energy, ' +
        'gentle piano and warm strings, encouraging and optimistic tone',
      
      friendly: 
        'Warm uplifting acoustic background music, hopeful fingerpicked guitar, ' +
        'welcoming and positive, joyful gentle feeling',
      
      energetic: 
        'Upbeat motivational background music, inspiring positive sound, ' +
        'building hopeful energy, optimistic and dynamic, confident',
      
      calm: 
        'Peaceful uplifting ambient music, soft hopeful piano, ' +
        'serene and positive, calming but optimistic',
      
      documentary: 
        'Inspiring documentary background music, hopeful emotional strings, ' +
        'uplifting storytelling feel, positive journey',
      
      wellness: 
        'Uplifting wellness music, hopeful piano with warm ambient pads, ' +
        'nurturing and positive, healing optimistic atmosphere',
      
      health: 
        'Hopeful healthcare background music, uplifting and reassuring, ' +
        'positive gentle strings and piano, trustworthy optimistic tone',
    };

    console.log(`[Music] Building prompt for style: ${style}, product: ${productName}`);
    let prompt = stylePrompts[style] || stylePrompts.professional;

    // FIX 5: Product-specific prompts - ALL MUST BE UPLIFTING AND HOPEFUL
    if (productName) {
      const lowerName = productName.toLowerCase();
      
      if (lowerName.includes('menopause') || lowerName.includes('hormone') || lowerName.includes('women') || lowerName.includes('cohosh')) {
        prompt = 
          'Uplifting empowering women\'s wellness music, hopeful piano with warm positive strings, ' +
          'nurturing and inspiring, spa-like serenity with optimistic energy, ' +
          'celebrating strength and vitality, NOT sad or melancholic';
      } else if (lowerName.includes('sleep') || lowerName.includes('relax') || lowerName.includes('rest')) {
        prompt = 
          'Peaceful serene ambient music, soft gentle tempo with hopeful undertones, ' +
          'dreamy but positive, calming optimism, restful contentment';
      } else if (lowerName.includes('energy') || lowerName.includes('vitality') || lowerName.includes('boost')) {
        prompt = 
          'Uplifting energizing wellness music, bright and motivating, ' +
          'morning sunshine optimism, joyful acoustic guitar and light percussion';
      } else if (lowerName.includes('natural') || lowerName.includes('herbal') || lowerName.includes('botanical')) {
        prompt = 
          'Uplifting nature-inspired background music, hopeful acoustic instruments, ' +
          'fresh and positive, botanical garden joy, pure and optimistic';
      } else if (lowerName.includes('stress') || lowerName.includes('anxiety') || lowerName.includes('calm')) {
        prompt = 
          'Calming hopeful background music, steady positive tempo, ' +
          'gentle reassuring piano, peaceful optimism, NOT melancholic';
      }
      console.log(`[Music] Product-specific prompt applied for: ${productName}`);
    }

    // Add duration guidance for better pacing
    if (duration && duration <= 30) {
      prompt += ', short form, consistent energy throughout, no dramatic builds';
    } else if (duration && duration > 60 && duration <= 120) {
      prompt += ', subtle variations to maintain interest, gentle progression';
    } else if (duration && duration > 120) {
      prompt += ', gradual build with subtle variations, maintains interest over time, evolving texture';
    }

    // Always ensure it works as background under voiceover
    prompt += ', suitable as background music under spoken voiceover, not overpowering, subtle and supportive';

    return prompt;
  }

  /**
   * Infer appropriate music style from product name and video type
   */
  private inferMusicStyle(title: string, videoType: string): string {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('menopause') || 
        lowerTitle.includes('hormone') || 
        lowerTitle.includes('women') ||
        lowerTitle.includes('botanical') ||
        lowerTitle.includes('herbal') ||
        lowerTitle.includes('natural')) {
      return 'wellness';
    }
    
    if (lowerTitle.includes('sleep') || 
        lowerTitle.includes('relax') || 
        lowerTitle.includes('calm')) {
      return 'calm';
    }
    
    if (lowerTitle.includes('energy') || 
        lowerTitle.includes('vitality') || 
        lowerTitle.includes('boost')) {
      return 'energetic';
    }
    
    if (videoType === 'script-based' || videoType === 'documentary') {
      return 'documentary';
    }
    
    return 'wellness';
  }

  /**
   * Calculate scene duration based on voiceover text word count
   * Uses speaking rate of approximately 150 words per minute (2.5 words/second)
   * Adds buffer time for transitions and visual comprehension
   */
  calculateSceneDuration(voiceoverText: string, minDuration: number = 4, maxDuration: number = 15): number {
    if (!voiceoverText || voiceoverText.trim().length === 0) {
      return minDuration;
    }
    
    const words = voiceoverText.trim().split(/\s+/).length;
    const speakingRate = 2.5; // words per second (150 WPM)
    const bufferTime = 0.8; // extra time for transitions
    
    const baseDuration = (words / speakingRate) + bufferTime;
    
    // Clamp to min/max
    const duration = Math.max(minDuration, Math.min(maxDuration, Math.ceil(baseDuration)));
    
    console.log(`[UniversalVideoService] Scene duration: ${words} words → ${duration}s`);
    return duration;
  }

  async createProductVideoProject(input: ProductVideoInput): Promise<VideoProject> {
    const project = createEmptyVideoProject('product', input.productName, input.platform);
    project.description = input.productDescription;
    project.targetAudience = input.targetAudience;
    project.totalDuration = input.duration;
    
    if (input.voiceId) {
      project.voiceId = input.voiceId;
      project.voiceName = input.voiceName;
      console.log(`[UniversalVideoService] Using voice: ${input.voiceName} (${input.voiceId})`);
    }
    
    if (input.productImages && input.productImages.length > 0) {
      project.assets.productImages = input.productImages;
      console.log(`[UniversalVideoService] Attached ${input.productImages.length} product images to project`);
    }

    project.progress.currentStep = 'script';
    project.progress.steps.script.status = 'in-progress';
    project.status = 'generating';

    try {
      const scenes = await this.generateProductScript(input);
      project.scenes = scenes;
      project.totalDuration = calculateTotalDuration(scenes);
      project.progress.steps.script.status = 'complete';
      project.progress.steps.script.progress = 100;
      project.progress.steps.script.message = `Generated ${scenes.length} scenes`;
      project.status = 'draft';
    } catch (error: any) {
      project.progress.steps.script.status = 'error';
      project.progress.steps.script.message = error.message;
      project.progress.errors.push(`Script generation failed: ${error.message}`);
      project.status = 'error';
    }

    project.updatedAt = new Date().toISOString();
    return project;
  }

  async generateProjectAssets(project: VideoProject): Promise<VideoProject> {
    const updatedProject = { ...project };
    
    // Reset video tracking for new project
    this.resetUsedVideos();
    
    updatedProject.progress.currentStep = 'voiceover';
    updatedProject.progress.steps.voiceover.status = 'in-progress';
    updatedProject.status = 'generating';

    const fullNarration = project.scenes.map(s => s.narration).join(' ... ');
    const voiceoverResult = await this.generateVoiceover(fullNarration, project.voiceId);

    if (voiceoverResult.success) {
      updatedProject.assets.voiceover.fullTrackUrl = voiceoverResult.url;
      updatedProject.assets.voiceover.duration = voiceoverResult.duration;
      updatedProject.progress.steps.voiceover.status = 'complete';
      updatedProject.progress.steps.voiceover.progress = 100;
      
      // ===== SYNC SCENE DURATIONS WITH VOICEOVER =====
      // Calculate scene durations based on narration word count for proper audio sync
      console.log('[UniversalVideoService] Syncing scene durations with voiceover...');
      
      // Scene pacing multipliers by type
      const SCENE_PACING: Record<string, number> = {
        hook: 1.0,        // Standard - grab attention quickly
        intro: 1.2,       // Slightly longer - establish context
        benefit: 1.1,     // Key selling points - give time to absorb
        feature: 1.0,     // Technical details - keep moving
        testimonial: 1.3, // Social proof - let it breathe
        cta: 1.4,         // Call to action - give time to act
        explanation: 1.1,
        process: 1.1,
        brand: 1.2,
        outro: 1.3,
      };
      
      let totalCalculatedDuration = 0;
      
      for (let i = 0; i < updatedProject.scenes.length; i++) {
        const scene = updatedProject.scenes[i];
        const narration = scene.narration || '';
        const wordCount = narration.trim().split(/\s+/).filter(Boolean).length;
        
        // Speaking rate: ~2.5 words/second (150 WPM)
        // Add 1.5 second buffer for transitions and breathing room
        const baseDuration = (wordCount / 2.5) + 1.5;
        const pacingMultiplier = SCENE_PACING[scene.type] || 1.0;
        const sceneDuration = Math.max(5, Math.ceil(baseDuration * pacingMultiplier));
        
        updatedProject.scenes[i].duration = sceneDuration;
        totalCalculatedDuration += sceneDuration;
        
        console.log(`  Scene ${i} (${scene.type}): ${wordCount} words → ${sceneDuration}s (x${pacingMultiplier})`);
      }
      
      // Add 2 seconds to final scene for clean ending
      const lastIndex = updatedProject.scenes.length - 1;
      if (lastIndex >= 0) {
        updatedProject.scenes[lastIndex].duration += 2;
        totalCalculatedDuration += 2;
        console.log(`  Added 2s buffer to final scene`);
      }
      
      updatedProject.totalDuration = totalCalculatedDuration;
      console.log(`[UniversalVideoService] Total video duration: ${totalCalculatedDuration}s`);
      // ===== END VOICEOVER SYNC =====
    } else {
      updatedProject.progress.steps.voiceover.status = 'error';
      updatedProject.progress.steps.voiceover.message = voiceoverResult.error;
      updatedProject.progress.errors.push(`Voiceover failed: ${voiceoverResult.error}`);
      
      updatedProject.progress.serviceFailures.push({
        service: 'elevenlabs',
        timestamp: new Date().toISOString(),
        error: voiceoverResult.error || 'Unknown error',
      });
    }

    updatedProject.progress.currentStep = 'images';
    updatedProject.progress.steps.images.status = 'in-progress';

    const productImages = project.assets.productImages || [];
    const primaryImage = productImages.find(img => img.isPrimary);
    
    console.log(`[UniversalVideoService] Product images available: ${productImages.length}`);
    if (productImages.length > 0) {
      console.log(`[UniversalVideoService] Product image URLs: ${productImages.map(img => img.url).join(', ')}`);
      console.log(`[UniversalVideoService] Primary image: ${primaryImage?.url || 'none'}`);
    }
    
    const productSceneTypes = ['hook', 'feature', 'benefit', 'cta', 'intro'];
    const lifestyleSceneTypes = ['explanation', 'process', 'testimonial', 'brand', 'outro'];

    for (let i = 0; i < project.scenes.length; i++) {
      const scene = project.scenes[i];
      console.log(`[UniversalVideoService] Processing scene ${i}: type=${scene.type}, isProductScene=${productSceneTypes.includes(scene.type)}, useAIImage=${scene.assets?.useAIImage}`);
      
      if (!updatedProject.scenes[i].assets) {
        updatedProject.scenes[i].assets = {};
      }

      if (scene.assets?.assignedProductImageId) {
        const assignedImage = productImages.find(img => img.id === scene.assets?.assignedProductImageId);
        if (assignedImage) {
          updatedProject.assets.images.push({
            sceneId: scene.id,
            url: assignedImage.url,
            prompt: scene.background.source,
            source: 'uploaded',
          });
          updatedProject.scenes[i].assets!.imageUrl = assignedImage.url;
          updatedProject.progress.steps.images.progress = Math.round(((i + 1) / project.scenes.length) * 100);
          continue;
        }
      }

      if (scene.assets?.useAIImage === false && productImages.length > 0) {
        const imageToUse = primaryImage || productImages[0];
        updatedProject.assets.images.push({
          sceneId: scene.id,
          url: imageToUse.url,
          prompt: scene.background.source,
          source: 'uploaded',
        });
        updatedProject.scenes[i].assets!.imageUrl = imageToUse.url;
        updatedProject.progress.steps.images.progress = Math.round(((i + 1) / project.scenes.length) * 100);
        continue;
      }

      if (productImages.length > 0 && productSceneTypes.includes(scene.type) && !scene.assets?.useAIImage) {
        const imageIndex = i % productImages.length;
        const productImage = productImages[imageIndex];
        
        // Determine if product overlay should be shown based on scene type or explicit user choice
        const useProductOverlay = scene.assets?.useProductOverlay !== undefined
          ? scene.assets.useProductOverlay
          : (SCENE_OVERLAY_DEFAULTS[scene.type] ?? true);
        
        // For content scenes (hook, benefit, story, etc.) - generate script-relevant imagery
        // For product overlay scenes (intro, feature, cta) - generate empty backgrounds for product overlay
        const isContent = this.isContentScene(scene.type);
        
        if (isContent && !useProductOverlay) {
          // CONTENT SCENE: Generate imagery that matches the script content
          console.log(`[UniversalVideoService] Generating CONTENT image for ${scene.type} scene: ${scene.id}`);
          const contentResult = await this.generateContentImage(scene, project.title);
          
          if (contentResult.imageUrl) {
            updatedProject.assets.images.push({
              sceneId: scene.id,
              url: contentResult.imageUrl,
              prompt: scene.visualDirection || scene.background.source,
              source: contentResult.source.includes('fal.ai') ? 'ai' : 'stock',
            });
            
            updatedProject.scenes[i].assets!.imageUrl = contentResult.imageUrl;
            updatedProject.scenes[i].assets!.backgroundUrl = contentResult.imageUrl;
            updatedProject.scenes[i].assets!.useProductOverlay = false;
            console.log(`[UniversalVideoService] Content image generated for ${scene.type}: ${contentResult.source}`);
          } else {
            // Fallback to stock image search based on script content
            const stockResult = await this.getContentStockImage(scene);
            if (stockResult.imageUrl) {
              updatedProject.assets.images.push({
                sceneId: scene.id,
                url: stockResult.imageUrl,
                prompt: scene.visualDirection || scene.background.source,
                source: 'stock',
              });
              updatedProject.scenes[i].assets!.imageUrl = stockResult.imageUrl;
              updatedProject.scenes[i].assets!.backgroundUrl = stockResult.imageUrl;
              updatedProject.scenes[i].assets!.useProductOverlay = false;
              console.log(`[UniversalVideoService] Stock content image used for ${scene.type}: ${stockResult.source}`);
            }
          }
        } else {
          // PRODUCT OVERLAY SCENE: Generate empty background and layer product on top
          const shouldEnhanceBackground = scene.assets?.enhanceWithAIBackground !== false;
          
          if (shouldEnhanceBackground) {
            console.log(`[UniversalVideoService] Generating AI background for ${scene.type} scene: ${scene.id}`);
            const backgroundResult = await this.generateAIBackground(
              scene.background.source,
              scene.type
            );
            
            // Resolve product image URL for browser access - ensure proper public path
            const resolvedProductUrl = this.resolveProductImageUrl(productImage.url);
            
            if (backgroundResult.backgroundUrl) {
              // Store both AI background and product overlay for Remotion compositing
              updatedProject.assets.images.push({
                sceneId: scene.id,
                url: backgroundResult.backgroundUrl,
                prompt: scene.background.source,
                source: 'ai',
              });
              
              // Set up scene assets for Remotion layered compositing
              updatedProject.scenes[i].assets!.imageUrl = backgroundResult.backgroundUrl;
              updatedProject.scenes[i].assets!.backgroundUrl = backgroundResult.backgroundUrl;
              updatedProject.scenes[i].assets!.useProductOverlay = useProductOverlay;
              
              // Only set product overlay if enabled for this scene type
              if (useProductOverlay) {
                updatedProject.scenes[i].assets!.productOverlayUrl = resolvedProductUrl;
                updatedProject.scenes[i].assets!.productOverlayPosition = this.getProductOverlayPosition(scene.type);
                console.log(`[UniversalVideoService] Product overlay ENABLED for ${scene.type}: ${resolvedProductUrl}`);
              } else {
                console.log(`[UniversalVideoService] Product overlay DISABLED for ${scene.type} (background only)`);
              }
              
              console.log(`[UniversalVideoService] AI background: ${backgroundResult.backgroundUrl}`);
            } else {
              // Fallback: use product image with gradient background
              console.log(`[UniversalVideoService] AI background failed, using product image with gradient for ${scene.type} scene`);
              updatedProject.assets.images.push({
                sceneId: scene.id,
                url: resolvedProductUrl,
                prompt: scene.background.source,
                source: 'uploaded',
              });
              updatedProject.scenes[i].assets!.imageUrl = resolvedProductUrl;
            }
          } else {
            // Only use raw product image if explicitly requested
            const resolvedUrl = this.resolveProductImageUrl(productImage.url);
            updatedProject.assets.images.push({
              sceneId: scene.id,
              url: resolvedUrl,
              prompt: scene.background.source,
              source: 'uploaded',
            });
            updatedProject.scenes[i].assets!.imageUrl = resolvedUrl;
            console.log(`[UniversalVideoService] Using raw product image (no AI background) for ${scene.type} scene: ${scene.id}`);
          }
        }
      } else {
        const imageResult = await this.generateImage(scene.background.source, scene.id);

        if (imageResult.success) {
          updatedProject.assets.images.push({
            sceneId: scene.id,
            url: imageResult.url,
            prompt: scene.background.source,
            source: imageResult.source.includes('fal.ai') ? 'ai' : 'stock',
          });
          updatedProject.scenes[i].assets!.imageUrl = imageResult.url;
        } else {
          if (imageResult.source === 'fal.ai') {
            updatedProject.progress.serviceFailures.push({
              service: 'fal.ai',
              timestamp: new Date().toISOString(),
              error: imageResult.error || 'Unknown error',
              fallbackUsed: 'stock images',
            });
          }
        }
      }

      updatedProject.progress.steps.images.progress = Math.round(((i + 1) / project.scenes.length) * 100);
    }

    updatedProject.progress.steps.images.status = 'complete';

    // VIDEOS STEP - Fetch B-roll for hook and benefit scenes in ALL video types
    updatedProject.progress.currentStep = 'videos';
    updatedProject.progress.steps.videos.status = 'in-progress';
    
    // Always try to get B-roll for hook and benefit scenes (they benefit most from motion)
    const videoSceneTypes = ['hook', 'benefit', 'story', 'testimonial'];
    const scenesNeedingVideo = project.scenes.filter(s => videoSceneTypes.includes(s.type));
    
    if (scenesNeedingVideo.length > 0) {
      console.log(`[UniversalVideoService] Fetching B-roll for ${scenesNeedingVideo.length} scenes (types: ${videoSceneTypes.join(', ')})...`);
      console.log(`[UniversalVideoService] Target audience for video search: ${project.targetAudience || 'not specified'}`);
      let videosGenerated = 0;
      
      for (const scene of scenesNeedingVideo) {
        const searchQuery = this.buildVideoSearchQuery(scene, project.targetAudience);
        console.log(`[UniversalVideoService] Searching B-roll for scene ${scene.id} (${scene.type}): ${searchQuery}`);
        
        // FIX 4: Pass targetAudience to getStockVideo for validation
        const videoResult = await this.getStockVideo(searchQuery, project.targetAudience);
        
        // FIX 2: Use smart video vs image decision
        const useVideo = this.shouldUseVideoBackground(scene, videoResult, project.targetAudience);
        
        // Update scene index and initialize assets
        const sceneIndex = updatedProject.scenes.findIndex(s => s.id === scene.id);
        if (sceneIndex >= 0) {
          if (!updatedProject.scenes[sceneIndex].assets) {
            updatedProject.scenes[sceneIndex].assets = {};
          }
          
          // FIX 1: Always set product overlay position
          const productPosition = this.getProductOverlayPosition(scene.type);
          updatedProject.scenes[sceneIndex].assets!.productOverlayPosition = productPosition;
          console.log(`[UniversalVideoService] Scene ${scene.id} product position: ${JSON.stringify(productPosition)}`);
          
          if (useVideo && videoResult && videoResult.url) {
            updatedProject.assets.videos.push({
              sceneId: scene.id,
              url: videoResult.url,
              source: videoResult.source as 'pexels' | 'pixabay' | 'generated',
            });
            
            if (!updatedProject.scenes[sceneIndex].background) {
              updatedProject.scenes[sceneIndex].background = {
                type: 'video',
                source: scene.background?.source || '',
              };
            } else {
              updatedProject.scenes[sceneIndex].background.type = 'video';
            }
            updatedProject.scenes[sceneIndex].assets!.videoUrl = videoResult.url;
            videosGenerated++;
            console.log(`[UniversalVideoService] B-roll APPROVED for scene ${scene.id}: ${videoResult.url}`);
          } else {
            // Keep using AI image - ensure background type is 'image'
            if (updatedProject.scenes[sceneIndex].background) {
              updatedProject.scenes[sceneIndex].background.type = 'image';
            }
            console.log(`[UniversalVideoService] Using AI image for scene ${scene.id} - B-roll rejected or not found`);
          }
        }
      }
      
      updatedProject.progress.steps.videos.progress = 100;
      updatedProject.progress.steps.videos.status = 'complete';
      updatedProject.progress.steps.videos.message = videosGenerated > 0 
        ? `Fetched ${videosGenerated} B-roll clips`
        : 'No suitable B-roll found - using AI images';
    } else {
      updatedProject.progress.steps.videos.status = 'skipped';
      updatedProject.progress.steps.videos.message = 'No scenes require B-roll';
      console.log('[UniversalVideoService] Videos step skipped - no hook/benefit scenes');
    }

    // MUSIC STEP - Generate background music with ElevenLabs (with Pixabay fallback)
    updatedProject.progress.currentStep = 'music';
    updatedProject.progress.steps.music.status = 'in-progress';
    updatedProject.progress.steps.music.message = 'Generating background music with ElevenLabs...';
    
    // Calculate total video duration
    const totalDuration = project.scenes.reduce((acc, s) => acc + (s.duration || 5), 0);
    
    // Determine music style from project settings or infer from product type
    const musicStyle = this.inferMusicStyle(project.title, project.type);
    
    console.log(`[UniversalVideoService] Generating ${totalDuration}s music, style: ${musicStyle}`);
    
    // Try ElevenLabs music generation first
    let musicResult = await this.generateBackgroundMusic(
      totalDuration,
      musicStyle,
      project.title
    );
    
    // Fallback to Pixabay if ElevenLabs fails
    if (!musicResult) {
      console.log('[UniversalVideoService] ElevenLabs music failed, trying Pixabay fallback...');
      const style = (project as any).style || 'professional';
      musicResult = await this.getBackgroundMusic(project.totalDuration, style);
    }
    
    if (musicResult) {
      updatedProject.assets.music = {
        url: musicResult.url,
        duration: musicResult.duration,
        volume: 0.15, // Background music should be subtle
      };
      updatedProject.progress.steps.music.status = 'complete';
      updatedProject.progress.steps.music.progress = 100;
      updatedProject.progress.steps.music.message = `Generated ${musicResult.duration}s background music (${musicResult.source})`;
      console.log(`[UniversalVideoService] Music URL: ${musicResult.url}`);
    } else {
      updatedProject.progress.steps.music.status = 'skipped';
      updatedProject.progress.steps.music.message = 'Music generation unavailable - video will have voiceover only';
      console.log('[UniversalVideoService] Music step skipped - no suitable music found');
    }

    // ========== S3 ASSET CACHING ==========
    // Cache all external assets to S3 for fast Lambda access
    updatedProject.progress.currentStep = 'assembly';
    updatedProject.progress.steps.assembly.status = 'in-progress';
    updatedProject.progress.steps.assembly.message = 'Caching assets to cloud storage...';
    
    console.log('[UniversalVideoService] Caching all external assets to S3...');
    const cacheResult = await this.cacheAllAssetsToS3(updatedProject);
    
    if (cacheResult.cachedCount > 0) {
      console.log(`[UniversalVideoService] Cached ${cacheResult.cachedCount} assets to S3`);
    }
    
    if (cacheResult.failedCount > 0) {
      console.warn(`[UniversalVideoService] ${cacheResult.failedCount} assets failed to cache`);
      updatedProject.progress.errors.push(
        `${cacheResult.failedCount} assets couldn't be cached - render may be slower`
      );
    }
    
    updatedProject.progress.steps.assembly.status = 'complete';
    updatedProject.progress.steps.assembly.progress = 100;
    updatedProject.progress.steps.assembly.message = 
      `Cached ${cacheResult.cachedCount} assets to S3`;
    // ========== END S3 CACHING ==========

    updatedProject.status = 'ready';
    updatedProject.progress.overallPercent = 85;
    updatedProject.updatedAt = new Date().toISOString();

    return updatedProject;
  }

  async getBackgroundMusic(duration: number, style?: string): Promise<{ url: string; duration: number; source: string } | null> {
    // Use Jamendo API for free Creative Commons music
    const jamendoClientId = process.env.JAMENDO_CLIENT_ID;
    
    // If no Jamendo key, inform user and skip
    if (!jamendoClientId) {
      console.log('[UniversalVideoService] No JAMENDO_CLIENT_ID - skipping music fallback');
      console.log('[UniversalVideoService] To enable background music, get a free Jamendo API key at: https://developer.jamendo.com/v3.0');
      this.addNotification({
        type: 'info',
        service: 'Music',
        message: 'Video will render with voiceover only. For background music, add a Jamendo API key.',
      });
      return null;
    }

    // Search terms based on video style for Jamendo's tag system
    const searchTerms: Record<string, string[]> = {
      professional: ['ambient', 'corporate', 'background'],
      friendly: ['happy', 'acoustic', 'positive'],
      energetic: ['upbeat', 'energetic', 'motivational'],
      calm: ['relaxing', 'meditation', 'calm'],
      documentary: ['cinematic', 'emotional', 'documentary'],
      wellness: ['spa', 'relaxing', 'meditation', 'peaceful'],
      health: ['calm', 'peaceful', 'soft'],
    };
    
    const tags = searchTerms[style || 'professional'] || ['ambient'];
    const query = tags[0]; // Use primary tag for search

    try {
      console.log(`[UniversalVideoService] Searching Jamendo API for music: ${query} (style: ${style})`);
      
      // Jamendo API - search for instrumental tracks
      // audiodownload_allowed=true ensures we can download the MP3
      const jamendoUrl = `https://api.jamendo.com/v3.0/tracks/?client_id=${jamendoClientId}&format=json&limit=10&fuzzytags=${encodeURIComponent(query)}&include=musicinfo&audioformat=mp32&audiodownload_allowed=true&vocalinstrumental=instrumental`;
      
      console.log(`[UniversalVideoService] Jamendo API URL: ${jamendoUrl.replace(jamendoClientId, 'CLIENT_ID')}`);
      
      const response = await fetch(jamendoUrl);
      
      if (!response.ok) {
        console.warn('[UniversalVideoService] Jamendo API error:', response.status);
        return null;
      }
      
      const data = await response.json();
      console.log(`[UniversalVideoService] Jamendo returned ${data.results?.length || 0} tracks`);
      
      // Check if we got any results with audio download
      if (data.results && data.results.length > 0) {
        // Filter for tracks that allow audio download
        const downloadableTracks = data.results.filter((track: any) => track.audiodownload_allowed && track.audio);
        console.log(`[UniversalVideoService] Found ${downloadableTracks.length} downloadable tracks`);
        
        if (downloadableTracks.length > 0) {
          // Select best track based on duration
          const selectedTrack = this.selectBestJamendoTrack(downloadableTracks, duration);
          if (selectedTrack) {
            return selectedTrack;
          }
        }
      }
      
      // If no results with current query, try fallback tags
      console.log('[UniversalVideoService] No suitable tracks, trying broader search...');
      const fallbackTags = ['ambient', 'background', 'soft', 'calm'];
      
      for (const fallbackTag of fallbackTags) {
        if (fallbackTag === query) continue; // Skip if same as original
        
        console.log(`[UniversalVideoService] Trying Jamendo fallback tag: ${fallbackTag}`);
        const fallbackUrl = `https://api.jamendo.com/v3.0/tracks/?client_id=${jamendoClientId}&format=json&limit=10&fuzzytags=${encodeURIComponent(fallbackTag)}&include=musicinfo&audioformat=mp32&audiodownload_allowed=true&vocalinstrumental=instrumental`;
        
        const fallbackResponse = await fetch(fallbackUrl);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log(`[UniversalVideoService] Fallback '${fallbackTag}' returned ${fallbackData.results?.length || 0} tracks`);
          
          if (fallbackData.results?.length > 0) {
            const downloadable = fallbackData.results.filter((t: any) => t.audiodownload_allowed && t.audio);
            if (downloadable.length > 0) {
              const track = this.selectBestJamendoTrack(downloadable, duration);
              if (track) return track;
            }
          }
        }
      }
      
      console.log('[UniversalVideoService] No music found after all Jamendo attempts');
      return null;
    } catch (e: any) {
      console.error('[UniversalVideoService] Jamendo music search error:', e.message);
      return null;
    }
  }

  private selectBestJamendoTrack(tracks: any[], targetDuration: number): { url: string; duration: number; source: string } | null {
    // Find a track with suitable duration (at least 80% of video length)
    const minDuration = targetDuration * 0.8;
    let selectedTrack = tracks.find((track: any) => track.duration >= minDuration);
    
    // If no long enough track, just use the longest one
    if (!selectedTrack) {
      selectedTrack = tracks.sort((a: any, b: any) => b.duration - a.duration)[0];
    }
    
    // Jamendo API returns 'audio' field for streaming URL and 'audiodownload' for download
    if (selectedTrack?.audio) {
      const audioUrl = selectedTrack.audiodownload || selectedTrack.audio;
      console.log(`[UniversalVideoService] Selected Jamendo track: "${selectedTrack.name}" by ${selectedTrack.artist_name} (${selectedTrack.duration}s)`);
      console.log(`[UniversalVideoService] Audio URL: ${audioUrl}`);
      return {
        url: audioUrl,
        duration: selectedTrack.duration,
        source: 'jamendo',
      };
    }
    
    return null;
  }

  getServiceFailures(project: VideoProject): ServiceFailure[] {
    return project.progress.serviceFailures;
  }

  hasPaidServiceFailures(project: VideoProject): boolean {
    return project.progress.serviceFailures.some(
      f => f.service === 'fal.ai' || f.service === 'elevenlabs'
    );
  }

  private isValidHttpsUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    return url.startsWith('https://');
  }

  async prepareAssetsForLambda(project: VideoProject): Promise<{
    valid: boolean;
    issues: string[];
    preparedProject: VideoProject;
  }> {
    const issues: string[] = [];
    const preparedProject = JSON.parse(JSON.stringify(project)) as VideoProject;

    console.log('[UniversalVideoService] Preparing assets for Lambda render...');

    // Validate brand logo - must be valid HTTPS URL for Lambda
    if (preparedProject.brand?.logoUrl && !this.isValidHttpsUrl(preparedProject.brand.logoUrl)) {
      console.log(`[UniversalVideoService] Invalid logo URL (not HTTPS): ${preparedProject.brand.logoUrl} - disabling watermark`);
      preparedProject.brand.logoUrl = ''; // Empty string will cause Watermark to skip rendering
    }

    if (preparedProject.assets.voiceover.fullTrackUrl) {
      const voiceoverUrl = preparedProject.assets.voiceover.fullTrackUrl;
      if (!this.isValidHttpsUrl(voiceoverUrl)) {
        if (voiceoverUrl.startsWith('data:')) {
          const match = voiceoverUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const [, contentType, base64Data] = match;
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `voiceover_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
            const s3Url = await this.uploadToS3(buffer, fileName, contentType);
            
            if (s3Url) {
              preparedProject.assets.voiceover.fullTrackUrl = s3Url;
              console.log(`[UniversalVideoService] Uploaded voiceover to S3: ${s3Url}`);
            } else {
              issues.push('Failed to upload voiceover to S3');
              preparedProject.assets.voiceover.fullTrackUrl = '';
            }
          }
        } else {
          issues.push(`Invalid voiceover URL format: ${voiceoverUrl.substring(0, 50)}...`);
          preparedProject.assets.voiceover.fullTrackUrl = '';
        }
      }
    }

    if (preparedProject.assets.music?.url) {
      if (!this.isValidHttpsUrl(preparedProject.assets.music.url)) {
        issues.push(`Invalid music URL: ${preparedProject.assets.music.url.substring(0, 50)}...`);
        preparedProject.assets.music = { url: '', duration: 0, volume: 0 };
      }
    }

    for (let i = 0; i < preparedProject.scenes.length; i++) {
      const scene = preparedProject.scenes[i];
      
      if (scene.assets?.imageUrl && !this.isValidHttpsUrl(scene.assets.imageUrl)) {
        if (scene.assets.imageUrl.startsWith('data:')) {
          const match = scene.assets.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const [, contentType, base64Data] = match;
            const buffer = Buffer.from(base64Data, 'base64');
            const ext = contentType.includes('png') ? 'png' : 'jpg';
            const fileName = `scene_${i}_image_${Date.now()}.${ext}`;
            const s3Url = await this.uploadToS3(buffer, fileName, contentType);
            
            if (s3Url) {
              preparedProject.scenes[i].assets!.imageUrl = s3Url;
              console.log(`[UniversalVideoService] Uploaded scene ${i} image to S3: ${s3Url}`);
            } else {
              issues.push(`Failed to upload scene ${i} image to S3`);
              preparedProject.scenes[i].assets!.imageUrl = undefined;
            }
          }
        } else {
          issues.push(`Scene ${i} has invalid image URL`);
          preparedProject.scenes[i].assets!.imageUrl = undefined;
        }
      }
      
      if (scene.assets?.backgroundUrl && !this.isValidHttpsUrl(scene.assets.backgroundUrl)) {
        preparedProject.scenes[i].assets!.backgroundUrl = undefined;
      }
      
      // ===== PRODUCT OVERLAY S3 UPLOAD =====
      // Upload local product overlay images to S3 for Lambda access
      if (scene.assets?.productOverlayUrl && !this.isValidHttpsUrl(scene.assets.productOverlayUrl)) {
        const originalProductUrl = scene.assets.productOverlayUrl;
        console.log(`[UniversalVideoService] Scene ${i} product overlay needs S3 upload: ${originalProductUrl}`);
        
        try {
          let buffer: Buffer | null = null;
          let contentType = 'image/png';
          
          // Handle different URL formats
          if (originalProductUrl.startsWith('/objects/')) {
            // Replit Object Storage path - fetch via local server
            const localUrl = `http://localhost:5000${originalProductUrl}`;
            console.log(`[UniversalVideoService] Fetching product image from: ${localUrl}`);
            const response = await fetch(localUrl);
            if (response.ok) {
              buffer = Buffer.from(await response.arrayBuffer());
              contentType = response.headers.get('content-type') || 'image/png';
            }
          } else if (originalProductUrl.startsWith('/uploads/') || originalProductUrl.startsWith('/')) {
            // Local uploads path
            const localUrl = `http://localhost:5000${originalProductUrl}`;
            console.log(`[UniversalVideoService] Fetching product image from: ${localUrl}`);
            const response = await fetch(localUrl);
            if (response.ok) {
              buffer = Buffer.from(await response.arrayBuffer());
              contentType = response.headers.get('content-type') || 'image/png';
            }
          } else if (originalProductUrl.startsWith('data:')) {
            // Base64 data URL
            const match = originalProductUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              contentType = match[1];
              buffer = Buffer.from(match[2], 'base64');
            }
          }
          
          if (buffer) {
            const ext = contentType.includes('png') ? 'png' : 'jpg';
            const fileName = `product_scene_${i}_${Date.now()}.${ext}`;
            const s3Url = await this.uploadToS3(buffer, fileName, contentType);
            
            if (s3Url) {
              preparedProject.scenes[i].assets!.productOverlayUrl = s3Url;
              console.log(`[UniversalVideoService] Scene ${i} product uploaded to S3: ${s3Url}`);
            } else {
              console.warn(`[UniversalVideoService] Scene ${i} product S3 upload failed - disabling overlay`);
              preparedProject.scenes[i].assets!.productOverlayUrl = undefined;
              preparedProject.scenes[i].assets!.useProductOverlay = false;
              issues.push(`Failed to upload product image for scene ${i}`);
            }
          } else {
            console.warn(`[UniversalVideoService] Scene ${i} product image fetch failed - disabling overlay`);
            preparedProject.scenes[i].assets!.productOverlayUrl = undefined;
            preparedProject.scenes[i].assets!.useProductOverlay = false;
          }
        } catch (e: any) {
          console.error(`[UniversalVideoService] Scene ${i} product upload error:`, e.message);
          preparedProject.scenes[i].assets!.productOverlayUrl = undefined;
          preparedProject.scenes[i].assets!.useProductOverlay = false;
          issues.push(`Product image upload error for scene ${i}: ${e.message}`);
        }
      }
      // ===== END PRODUCT OVERLAY S3 UPLOAD =====
      
      // Log and validate videoUrl for B-roll scenes
      if (scene.assets?.videoUrl) {
        if (this.isValidHttpsUrl(scene.assets.videoUrl)) {
          console.log(`[UniversalVideoService] Scene ${i} has video B-roll: ${scene.assets.videoUrl}`);
          console.log(`[UniversalVideoService] Scene ${i} background.type: ${scene.background?.type}`);
        } else {
          console.warn(`[UniversalVideoService] Scene ${i} has invalid videoUrl: ${scene.assets.videoUrl} - clearing`);
          preparedProject.scenes[i].assets!.videoUrl = undefined;
          if (preparedProject.scenes[i].background?.type === 'video') {
            preparedProject.scenes[i].background!.type = 'image';
          }
        }
      }
    }

    // Count scenes with valid video B-roll
    const videoScenes = preparedProject.scenes.filter(
      s => s.assets?.videoUrl && s.background?.type === 'video'
    );
    
    const validScenes = preparedProject.scenes.filter(
      s => s.assets?.imageUrl || s.assets?.backgroundUrl || s.assets?.videoUrl
    ).length;
    
    console.log(`[UniversalVideoService] Asset preparation complete:`);
    console.log(`  - Valid scenes: ${validScenes}/${preparedProject.scenes.length}`);
    console.log(`  - Scenes with video B-roll: ${videoScenes.length}`);
    if (videoScenes.length > 0) {
      videoScenes.forEach((s, idx) => {
        console.log(`    - ${s.id}: videoUrl=${s.assets?.videoUrl?.substring(0, 60)}... background.type=${s.background?.type}`);
      });
    }
    console.log(`  - Voiceover: ${this.isValidHttpsUrl(preparedProject.assets.voiceover.fullTrackUrl) ? 'OK' : 'Missing/Invalid'}`);
    console.log(`  - Music: ${this.isValidHttpsUrl(preparedProject.assets.music?.url) ? 'OK' : 'None'}`);
    console.log(`  - Issues: ${issues.length}`);
    
    if (issues.length > 0) {
      console.log(`  - Issue details: ${issues.join('; ')}`);
    }

    return {
      valid: validScenes > 0,
      issues,
      preparedProject,
    };
  }

  /**
   * Regenerate the background image for a specific scene
   */
  async regenerateSceneImage(
    project: VideoProject,
    sceneId: string,
    customPrompt?: string
  ): Promise<{ success: boolean; newImageUrl?: string; source?: string; error?: string }> {
    const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex < 0) {
      return { success: false, error: 'Scene not found' };
    }
    
    const scene = project.scenes[sceneIndex];
    const prompt = customPrompt || scene.visualDirection || scene.background?.source || 'wellness lifestyle';
    
    console.log(`[Regenerate] Image for scene ${sceneId} with prompt: ${prompt.substring(0, 60)}...`);
    
    // Try content image generation first
    if (this.isContentScene(scene.type)) {
      const result = await this.generateContentImage(scene, project.title);
      if (result.imageUrl) {
        return { success: true, newImageUrl: result.imageUrl, source: result.source };
      }
    }
    
    // Try AI background generation
    const bgResult = await this.generateAIBackground(prompt, scene.type);
    if (bgResult.backgroundUrl) {
      return { success: true, newImageUrl: bgResult.backgroundUrl, source: bgResult.source };
    }
    
    // Fallback to stock image
    const stockResult = await this.getStockImage(prompt);
    if (stockResult.success) {
      return { success: true, newImageUrl: stockResult.url, source: stockResult.source };
    }
    
    return { success: false, error: 'All image generation methods failed' };
  }

  /**
   * Regenerate the B-roll video for a specific scene
   */
  async regenerateSceneVideo(
    project: VideoProject,
    sceneId: string,
    customQuery?: string
  ): Promise<{ success: boolean; newVideoUrl?: string; duration?: number; source?: string; error?: string }> {
    const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex < 0) {
      return { success: false, error: 'Scene not found' };
    }
    
    const scene = project.scenes[sceneIndex];
    const query = customQuery || this.buildVideoSearchQuery(scene, project.targetAudience);
    
    console.log(`[Regenerate] Video for scene ${sceneId} with query: ${query}`);
    
    // Don't use the duplicate tracking for regeneration - user wants a NEW video
    const pexelsResult = await this.getPexelsVideo(query + ' ' + Date.now()); // Add timestamp to vary results
    if (pexelsResult) {
      if (!project.targetAudience || this.validateVideoForAudience(pexelsResult, project.targetAudience)) {
        return { 
          success: true, 
          newVideoUrl: pexelsResult.url, 
          duration: pexelsResult.duration,
          source: pexelsResult.source 
        };
      }
    }
    
    // Try Pixabay
    const pixabayResult = await this.getPixabayVideo(query);
    if (pixabayResult) {
      return { 
        success: true, 
        newVideoUrl: pixabayResult.url, 
        duration: pixabayResult.duration,
        source: pixabayResult.source 
      };
    }
    
    return { success: false, error: 'No suitable video found' };
  }

  /**
   * Switch a scene between using video background and image background
   */
  async switchSceneBackgroundType(
    project: VideoProject,
    sceneId: string,
    preferVideo: boolean
  ): Promise<{ success: boolean; error?: string }> {
    const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex < 0) {
      return { success: false, error: 'Scene not found' };
    }
    
    const scene = project.scenes[sceneIndex];
    
    if (preferVideo) {
      // Switch to video - need a video URL
      if (!scene.assets?.videoUrl) {
        // Generate one
        const videoResult = await this.regenerateSceneVideo(project, sceneId);
        if (!videoResult.success) {
          return { success: false, error: 'Could not find suitable video' };
        }
        scene.assets = scene.assets || {};
        scene.assets.videoUrl = videoResult.newVideoUrl;
      }
      scene.background = scene.background || { type: 'video', source: '' };
      scene.background.type = 'video';
      scene.assets!.preferVideo = true;
      scene.assets!.preferImage = false;
    } else {
      // Switch to image
      if (!scene.assets?.imageUrl && !scene.assets?.backgroundUrl) {
        // Generate one
        const imageResult = await this.regenerateSceneImage(project, sceneId);
        if (!imageResult.success) {
          return { success: false, error: 'Could not generate image' };
        }
        scene.assets = scene.assets || {};
        scene.assets.imageUrl = imageResult.newImageUrl;
        scene.assets.backgroundUrl = imageResult.newImageUrl;
      }
      scene.background = scene.background || { type: 'image', source: '' };
      scene.background.type = 'image';
      scene.assets!.preferVideo = false;
      scene.assets!.preferImage = true;
    }
    
    return { success: true };
  }
}

export const universalVideoService = new UniversalVideoService();
