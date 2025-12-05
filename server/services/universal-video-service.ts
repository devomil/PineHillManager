import Anthropic from "@anthropic-ai/sdk";
import { fal } from "@fal-ai/client";
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
} from "../../shared/video-types";

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

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
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
        type: index === 0 ? 'fade' : 'crossfade',
        duration: 0.5,
        easing: 'ease-in-out',
      },
      transitionOut: {
        type: 'crossfade',
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

  private async generateProductImageWithBackground(
    productImageUrl: string,
    backgroundPrompt: string,
    productName: string
  ): Promise<ImageGenerationResult> {
    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      console.log('[UniversalVideoService] FAL_KEY not available - using original product image');
      return { url: productImageUrl, source: 'uploaded (original)', success: true };
    }

    try {
      console.log(`[UniversalVideoService] Creating composite with product image and AI background...`);
      console.log(`[UniversalVideoService] Product image URL: ${productImageUrl}`);
      console.log(`[UniversalVideoService] Background prompt: ${backgroundPrompt}`);

      // Handle various object storage URL formats:
      // - http/https URLs: use as-is
      // - /objects/replit-objstore-xxx/... : convert to GCS URL
      // - /replit-objstore-xxx/... : convert to GCS URL (newer format)
      let resolvedImageUrl = productImageUrl;
      if (productImageUrl.startsWith('http')) {
        resolvedImageUrl = productImageUrl;
      } else if (productImageUrl.startsWith('/objects/')) {
        resolvedImageUrl = `https://storage.googleapis.com/repl-default-bucket-${process.env.REPL_ID}${productImageUrl.replace('/objects', '')}`;
      } else if (productImageUrl.startsWith('/replit-objstore-')) {
        // Extract bucket ID and path from /replit-objstore-{bucketId}/.private/uploads/{fileId}
        const match = productImageUrl.match(/^\/replit-objstore-([a-f0-9-]+)\/(.+)$/);
        if (match) {
          const [, bucketId, filePath] = match;
          resolvedImageUrl = `https://storage.googleapis.com/replit-objstore-${bucketId}/${filePath}`;
        }
      }

      console.log(`[UniversalVideoService] Resolved image URL: ${resolvedImageUrl}`);

      const backgroundResult = await fal.subscribe("fal-ai/flux-pro/v1.1", {
        input: {
          prompt: `Professional product photography background, ${backgroundPrompt}, studio lighting, soft gradient background, clean and minimal, no product, just background scenery, 4K, high quality`,
          image_size: "landscape_16_9",
          num_images: 1,
          safety_tolerance: "2",
          enable_safety_checker: true,
        },
        logs: true,
        onQueueUpdate: (update: any) => {
          if (update.status === "IN_PROGRESS") {
            console.log(`[UniversalVideoService] Background generation in progress...`);
          }
        },
      });

      if (backgroundResult.data?.images?.[0]?.url) {
        console.log('[UniversalVideoService] AI background generated, now attempting to composite...');
        
        try {
          const compositeResult = await fal.subscribe("fal-ai/image-to-image", {
            input: {
              image_url: resolvedImageUrl,
              prompt: `${productName} product placed on ${backgroundPrompt}, professional product photography, studio lighting, high quality, the product from the image placed naturally in the scene`,
              strength: 0.35,
              num_images: 1,
            },
            logs: true,
          });

          if (compositeResult.data?.images?.[0]?.url) {
            console.log('[UniversalVideoService] Composite image created successfully');
            return {
              url: compositeResult.data.images[0].url,
              source: 'fal.ai (product + AI background composite)',
              success: true,
            };
          }
        } catch (compositeError: any) {
          console.warn('[UniversalVideoService] Composite failed, using original with background URL:', compositeError.message);
        }

        return {
          url: productImageUrl,
          source: 'uploaded (composite failed - using original)',
          success: true,
        };
      }
    } catch (error: any) {
      console.warn('[UniversalVideoService] Background generation failed:', error.message);
    }

    console.log('[UniversalVideoService] All AI enhancement attempts failed, using original product image');
    return { url: productImageUrl, source: 'uploaded (original)', success: true };
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

  async generateVoiceover(text: string, voiceId?: string): Promise<VoiceoverResult> {
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) {
      this.addNotification({
        type: 'error',
        service: 'ElevenLabs',
        message: 'ELEVENLABS_API_KEY not configured - voiceover generation unavailable',
      });
      return { url: '', duration: 0, success: false, error: 'API key not configured' };
    }

    const selectedVoiceId = voiceId || 'EXAVITQu4vr4xnSDxMaL'; // Sarah - professional female voice

    try {
      console.log(`[UniversalVideoService] Generating voiceover with ElevenLabs...`);

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
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString("base64");
        const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

        const wordCount = text.split(/\s+/).length;
        const estimatedDuration = Math.ceil(wordCount / 2.5);

        console.log(`[UniversalVideoService] Voiceover generated successfully (${estimatedDuration}s)`);
        return {
          url: audioUrl,
          duration: estimatedDuration,
          success: true,
        };
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

  async getStockVideo(query: string): Promise<{ url: string; duration: number; source: string } | null> {
    const pexelsKey = process.env.PEXELS_API_KEY;
    if (pexelsKey) {
      try {
        const response = await fetch(
          `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
          { headers: { Authorization: pexelsKey } }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.videos && data.videos[0]) {
            const video = data.videos[0];
            const hdFile = video.video_files?.find((f: any) => f.quality === 'hd') || video.video_files?.[0];
            if (hdFile?.link) {
              return {
                url: hdFile.link,
                duration: video.duration,
                source: 'pexels',
              };
            }
          }
        }
      } catch (e) {
        console.warn("[UniversalVideoService] Pexels video error:", e);
      }
    }
    return null;
  }

  async createProductVideoProject(input: ProductVideoInput): Promise<VideoProject> {
    const project = createEmptyVideoProject('product', input.productName, input.platform);
    project.description = input.productDescription;
    project.targetAudience = input.targetAudience;
    project.totalDuration = input.duration;
    
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
    
    updatedProject.progress.currentStep = 'voiceover';
    updatedProject.progress.steps.voiceover.status = 'in-progress';
    updatedProject.status = 'generating';

    const fullNarration = project.scenes.map(s => s.narration).join(' ... ');
    const voiceoverResult = await this.generateVoiceover(fullNarration);

    if (voiceoverResult.success) {
      updatedProject.assets.voiceover.fullTrackUrl = voiceoverResult.url;
      updatedProject.assets.voiceover.duration = voiceoverResult.duration;
      updatedProject.progress.steps.voiceover.status = 'complete';
      updatedProject.progress.steps.voiceover.progress = 100;
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
        
        // Default: Always composite product onto AI-generated background for professional look
        // User can opt-out by setting enhanceWithAIBackground to false explicitly
        const shouldEnhanceBackground = scene.assets?.enhanceWithAIBackground !== false;
        
        if (shouldEnhanceBackground) {
          console.log(`[UniversalVideoService] Compositing product onto AI background for ${scene.type} scene: ${scene.id}`);
          const enhancedResult = await this.generateProductImageWithBackground(
            productImage.url,
            scene.background.source,
            project.title
          );
          
          // Map source to proper type: AI-generated composites count as 'ai'
          const sourceType: 'ai' | 'uploaded' | 'stock' = enhancedResult.source.includes('fal.ai') ? 'ai' : 'uploaded';
          
          updatedProject.assets.images.push({
            sceneId: scene.id,
            url: enhancedResult.url,
            prompt: scene.background.source,
            source: sourceType,
          });
          updatedProject.scenes[i].assets!.imageUrl = enhancedResult.url;
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

    // VIDEOS STEP - Fetch B-roll for script-based videos > 60 seconds
    updatedProject.progress.currentStep = 'videos';
    updatedProject.progress.steps.videos.status = 'in-progress';
    
    if (project.type === 'script-based' && project.totalDuration > 60) {
      console.log('[UniversalVideoService] Fetching B-roll videos for script-based video...');
      let videosGenerated = 0;
      
      for (let i = 0; i < project.scenes.length; i++) {
        const scene = project.scenes[i];
        // Fetch video for every other scene to add variety
        if (i % 2 === 0) {
          const videoResult = await this.getStockVideo(scene.background.source);
          if (videoResult) {
            updatedProject.assets.videos.push({
              sceneId: scene.id,
              url: videoResult.url,
              source: 'pexels',
            });
            videosGenerated++;
            console.log(`[UniversalVideoService] B-roll fetched for scene ${scene.id}`);
          }
        }
        updatedProject.progress.steps.videos.progress = Math.round(((i + 1) / project.scenes.length) * 100);
      }
      
      updatedProject.progress.steps.videos.status = 'complete';
      updatedProject.progress.steps.videos.message = `Fetched ${videosGenerated} B-roll clips`;
    } else {
      updatedProject.progress.steps.videos.status = 'skipped';
      updatedProject.progress.steps.videos.message = 'Using images for this video type';
      console.log('[UniversalVideoService] Videos step skipped - product video uses images');
    }

    // MUSIC STEP - Fetch background music from Pexels
    updatedProject.progress.currentStep = 'music';
    updatedProject.progress.steps.music.status = 'in-progress';
    
    const musicResult = await this.getBackgroundMusic(project.totalDuration);
    if (musicResult) {
      updatedProject.assets.music = {
        url: musicResult.url,
        duration: musicResult.duration,
        volume: 0.18,
      };
      updatedProject.progress.steps.music.status = 'complete';
      updatedProject.progress.steps.music.progress = 100;
      updatedProject.progress.steps.music.message = `Background music selected (${musicResult.duration}s)`;
      console.log(`[UniversalVideoService] Background music selected: ${musicResult.source}`);
    } else {
      updatedProject.progress.steps.music.status = 'skipped';
      updatedProject.progress.steps.music.message = 'No suitable music found - video will render without background music';
      console.log('[UniversalVideoService] Music step skipped - no suitable music found');
    }

    updatedProject.progress.currentStep = 'assembly';
    updatedProject.progress.steps.assembly.status = 'complete';
    updatedProject.progress.steps.assembly.progress = 100;

    updatedProject.status = 'ready';
    updatedProject.progress.overallPercent = 85;
    updatedProject.updatedAt = new Date().toISOString();

    return updatedProject;
  }

  async getBackgroundMusic(duration: number): Promise<{ url: string; duration: number; source: string } | null> {
    const pexelsKey = process.env.PEXELS_API_KEY;
    if (!pexelsKey) {
      console.log('[UniversalVideoService] Pexels API key not configured for music');
      return null;
    }

    try {
      // Search for ambient/corporate music videos that could be used as audio background
      const musicKeywords = ['ambient music', 'corporate background', 'calm instrumental', 'meditation music'];
      const keyword = musicKeywords[Math.floor(Math.random() * musicKeywords.length)];
      
      const response = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(keyword)}&per_page=5&orientation=landscape&size=small`,
        { headers: { Authorization: pexelsKey } }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.videos && data.videos.length > 0) {
          // Find a video with appropriate duration
          const suitableVideo = data.videos.find((v: any) => v.duration >= duration * 0.8) || data.videos[0];
          const audioFile = suitableVideo.video_files?.find((f: any) => f.quality === 'sd') || suitableVideo.video_files?.[0];
          
          if (audioFile?.link) {
            return {
              url: audioFile.link,
              duration: suitableVideo.duration,
              source: 'pexels',
            };
          }
        }
      }
    } catch (e) {
      console.warn("[UniversalVideoService] Pexels music search error:", e);
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
}

export const universalVideoService = new UniversalVideoService();
