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
    
    let baseContext = '';
    
    switch (sceneType) {
      case 'hook':
        baseContext = `Emotional cinematic scene showing the problem or challenge. Person experiencing discomfort or frustration. Realistic lifestyle photography, dramatic lighting, evocative mood.`;
        break;
      case 'benefit':
        baseContext = `Positive transformation scene showing wellness and relief. Person feeling happy, healthy, and vibrant. Bright natural lighting, optimistic mood, lifestyle photography.`;
        break;
      case 'story':
        baseContext = `Authentic storytelling scene with emotional depth. Real-life moment captured naturally. Documentary style, warm tones, genuine expression.`;
        break;
      case 'explanation':
      case 'process':
        baseContext = `Educational visual showing scientific or natural process. Clean informational style, subtle medical/botanical elements, professional presentation.`;
        break;
      case 'testimonial':
      case 'social_proof':
        baseContext = `Happy satisfied person in natural home or lifestyle setting. Genuine smile, warm inviting atmosphere, trustworthy and relatable.`;
        break;
      case 'problem':
        baseContext = `Person dealing with challenge or discomfort. Empathetic perspective, muted colors, realistic portrayal of struggle before solution.`;
        break;
      default:
        baseContext = `Professional lifestyle photography with natural lighting.`;
    }
    
    const extractedConcepts = this.extractVisualConcepts(visualDirection, narration);
    
    const fullPrompt = `${baseContext} ${extractedConcepts}. High quality, 4K, photorealistic, professional commercial photography. NO text, NO logos, NO product shots, NO bottles, NO packaging.`;
    
    return fullPrompt;
  }

  private extractVisualConcepts(visualDirection: string, narration: string): string {
    const combined = `${visualDirection} ${narration}`.toLowerCase();
    
    const concepts: string[] = [];
    
    if (combined.includes('menopause') || combined.includes('hot flash') || combined.includes('hormonal')) {
      concepts.push('middle-aged woman, wellness journey, natural health, serene expression');
    }
    if (combined.includes('sleep') || combined.includes('restful') || combined.includes('night')) {
      concepts.push('peaceful sleep, comfortable bedroom, restful atmosphere');
    }
    if (combined.includes('energy') || combined.includes('vitality') || combined.includes('active')) {
      concepts.push('energetic person, active lifestyle, vibrant health');
    }
    if (combined.includes('stress') || combined.includes('anxiety') || combined.includes('mood')) {
      concepts.push('calm relaxed person, peaceful moment, stress relief');
    }
    if (combined.includes('natural') || combined.includes('herb') || combined.includes('botanical')) {
      concepts.push('natural herbs, botanical elements, organic wellness');
    }
    if (combined.includes('woman') || combined.includes('female') || combined.includes('her')) {
      concepts.push('woman in natural setting, feminine wellness');
    }
    if (combined.includes('science') || combined.includes('study') || combined.includes('research') || combined.includes('clinical')) {
      concepts.push('scientific visualization, research imagery, medical illustration style');
    }
    
    if (concepts.length === 0) {
      concepts.push('wellness lifestyle, healthy living, natural setting');
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

  private getProductOverlayPosition(sceneType: string): { x: 'left' | 'center' | 'right'; y: 'top' | 'center' | 'bottom'; scale: number; animation: 'fade' | 'zoom' | 'slide' | 'none' } {
    switch (sceneType) {
      case 'hook':
        return { x: 'right', y: 'center', scale: 0.4, animation: 'slide' };
      case 'intro':
        return { x: 'center', y: 'center', scale: 0.5, animation: 'zoom' };
      case 'feature':
        return { x: 'left', y: 'center', scale: 0.45, animation: 'slide' };
      case 'benefit':
        return { x: 'right', y: 'bottom', scale: 0.35, animation: 'fade' };
      case 'cta':
        return { x: 'center', y: 'center', scale: 0.55, animation: 'zoom' };
      default:
        return { x: 'center', y: 'center', scale: 0.4, animation: 'fade' };
    }
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
            text,
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

  private buildVideoSearchQuery(scene: Scene): string {
    const narration = (scene.narration || '').toLowerCase();
    
    // Health/wellness specific keywords
    if (narration.includes('menopause')) return 'mature woman wellness relaxation';
    if (narration.includes('hot flash')) return 'woman cooling relief comfort';
    if (narration.includes('sleep')) return 'peaceful sleep relaxation bedroom';
    if (narration.includes('energy') || narration.includes('vitality')) return 'active woman healthy lifestyle';
    if (narration.includes('hormone')) return 'woman wellness nature botanical';
    if (narration.includes('natural') || narration.includes('herbal')) return 'herbs botanical plants nature';
    if (narration.includes('relief') || narration.includes('comfort')) return 'woman relaxed peaceful happy';
    if (narration.includes('weight') || narration.includes('metabolism')) return 'woman fitness healthy active';
    if (narration.includes('stress') || narration.includes('anxiety')) return 'calm woman meditation relaxation';
    
    // Scene type defaults
    const defaults: Record<string, string> = {
      hook: 'woman concerned thinking wellness',
      benefit: 'happy woman smiling healthy lifestyle',
      testimonial: 'satisfied customer woman smiling',
      story: 'woman transformation journey wellness',
      intro: 'woman wellness morning routine',
      cta: 'confident woman smiling action',
    };
    
    return defaults[scene.type] || 'woman wellness healthy lifestyle';
  }

  async getStockVideo(query: string): Promise<{ url: string; duration: number; source: string } | null> {
    // Try Pexels first
    const pexelsResult = await this.getPexelsVideo(query);
    if (pexelsResult) return pexelsResult;

    // Fallback to Pixabay
    const pixabayResult = await this.getPixabayVideo(query);
    if (pixabayResult) return pixabayResult;

    console.log(`[UniversalVideoService] No stock videos found for: "${query}"`);
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
   * Build an effective music prompt based on video style and product context
   */
  private buildMusicPrompt(style: string, productName?: string, duration?: number): string {
    const stylePrompts: Record<string, string> = {
      professional: 
        'Soft ambient corporate background music, gentle piano and light strings, ' +
        'calm and reassuring, professional tone, suitable under voiceover',
      
      friendly: 
        'Warm acoustic background music, gentle fingerpicked guitar and soft percussion, ' +
        'welcoming and approachable, positive feeling',
      
      energetic: 
        'Upbeat motivational background music, inspiring corporate sound, ' +
        'building energy, positive and dynamic, confident',
      
      calm: 
        'Peaceful ambient music, soft piano with nature-inspired textures, ' +
        'meditation-like, soothing and deeply relaxing',
      
      documentary: 
        'Cinematic documentary background music, emotional strings, ' +
        'thoughtful and reflective mood, storytelling feel',
      
      wellness: 
        'Gentle wellness spa music, soft piano with ambient pads, ' +
        'calming and nurturing, natural and organic feeling, healing atmosphere',
      
      health: 
        'Soothing healthcare background music, reassuring and hopeful, ' +
        'gentle strings and piano, professional medical tone, trustworthy',
    };

    let prompt = stylePrompts[style] || stylePrompts.professional;

    // Add product-specific context for health/wellness products
    if (productName) {
      const lowerName = productName.toLowerCase();
      
      if (lowerName.includes('menopause') || lowerName.includes('hormone') || lowerName.includes('women')) {
        prompt = 
          'Gentle nurturing background music for women\'s wellness, ' +
          'soft piano with warm strings, calming and supportive, ' +
          'empowering yet soothing, spa-like tranquility';
      } else if (lowerName.includes('sleep') || lowerName.includes('relax') || lowerName.includes('rest')) {
        prompt = 
          'Peaceful sleep-inducing ambient music, very soft and slow tempo, ' +
          'dreamy pads and gentle piano, lullaby-like, deeply calming';
      } else if (lowerName.includes('energy') || lowerName.includes('vitality') || lowerName.includes('boost')) {
        prompt = 
          'Uplifting wellness music, gentle but energizing, ' +
          'morning sunshine feeling, optimistic acoustic guitar and light percussion';
      } else if (lowerName.includes('natural') || lowerName.includes('herbal') || lowerName.includes('botanical')) {
        prompt = 
          'Organic nature-inspired background music, soft acoustic instruments, ' +
          'earthy and grounded, botanical garden atmosphere, gentle and pure';
      } else if (lowerName.includes('stress') || lowerName.includes('anxiety') || lowerName.includes('calm')) {
        prompt = 
          'Calming anti-anxiety background music, slow tempo, ' +
          'gentle piano and soft ambient textures, peaceful and reassuring';
      }
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
      let videosGenerated = 0;
      
      for (const scene of scenesNeedingVideo) {
        const searchQuery = this.buildVideoSearchQuery(scene);
        console.log(`[UniversalVideoService] Searching B-roll for scene ${scene.id} (${scene.type}): ${searchQuery}`);
        
        const videoResult = await this.getStockVideo(searchQuery);
        
        if (videoResult && videoResult.url) {
          updatedProject.assets.videos.push({
            sceneId: scene.id,
            url: videoResult.url,
            source: 'pexels',
          });
          
          // Update scene to use video instead of image
          const sceneIndex = updatedProject.scenes.findIndex(s => s.id === scene.id);
          if (sceneIndex >= 0) {
            // Initialize assets if needed
            if (!updatedProject.scenes[sceneIndex].assets) {
              updatedProject.scenes[sceneIndex].assets = {};
            }
            // Initialize background if needed
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
            console.log(`[UniversalVideoService] B-roll found for scene ${scene.id}: ${videoResult.url}`);
          }
        } else {
          console.log(`[UniversalVideoService] No B-roll found for scene ${scene.id} - will use AI image`);
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

    updatedProject.progress.currentStep = 'assembly';
    updatedProject.progress.steps.assembly.status = 'complete';
    updatedProject.progress.steps.assembly.progress = 100;

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
      
      if (scene.assets?.productOverlayUrl && !this.isValidHttpsUrl(scene.assets.productOverlayUrl)) {
        preparedProject.scenes[i].assets!.productOverlayUrl = undefined;
        preparedProject.scenes[i].assets!.useProductOverlay = false;
      }
      
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
}

export const universalVideoService = new UniversalVideoService();
