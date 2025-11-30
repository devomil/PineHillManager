interface SDImageRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
}

interface SDImageResult {
  success: boolean;
  image?: string;
  error?: string;
}

export class StableDiffusionService {
  private isAvailable = false;
  private configLoaded = false;

  constructor() {
    this.checkAvailability();
  }

  private async checkAvailability(): Promise<void> {
    if (this.configLoaded) return;
    
    try {
      const response = await fetch('/api/stable-diffusion/status');
      if (response.ok) {
        const data = await response.json();
        this.isAvailable = data.available === true;
        console.log('Stable Diffusion availability:', this.isAvailable);
      }
      this.configLoaded = true;
    } catch (error) {
      console.warn('Failed to check Stable Diffusion availability:', error);
      this.configLoaded = true;
    }
  }

  async isServiceAvailable(): Promise<boolean> {
    await this.checkAvailability();
    return this.isAvailable;
  }

  async generateImage(options: SDImageRequest): Promise<SDImageResult> {
    await this.checkAvailability();

    if (!this.isAvailable) {
      return {
        success: false,
        error: 'Stable Diffusion is not available. Please check API key configuration.'
      };
    }

    try {
      const response = await fetch('/api/stable-diffusion/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: options.prompt,
          negativePrompt: options.negativePrompt || 'blurry, low quality, distorted, text, watermark',
          width: options.width || 1024,
          height: options.height || 1024,
          steps: options.steps || 30
        })
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to generate image'
        };
      }

      const result = await response.json();
      return {
        success: true,
        image: result.image
      };
    } catch (error) {
      console.error('Stable Diffusion generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async generateMarketingImage(
    productType: string,
    style: 'photorealistic' | 'artistic' | 'minimal' | 'professional' = 'professional'
  ): Promise<SDImageResult> {
    const stylePrompts = {
      photorealistic: 'photorealistic, 8k uhd, professional photography, studio lighting',
      artistic: 'artistic, stylized, modern digital art, vibrant colors',
      minimal: 'minimalist, clean design, simple composition, white background',
      professional: 'professional product photography, commercial quality, clean background'
    };

    const prompt = `${productType}, ${stylePrompts[style]}, health and wellness, organic natural products, Pine Hill Farm branding`;
    
    return this.generateImage({
      prompt,
      negativePrompt: 'text, watermark, logo, blurry, distorted, low quality, ugly, deformed',
      width: 1024,
      height: 1024
    });
  }

  async generateVideoThumbnail(
    topic: string,
    platform: 'youtube' | 'tiktok' | 'instagram' | 'linkedin'
  ): Promise<SDImageResult> {
    const platformSpecs = {
      youtube: { width: 1280, height: 720, style: 'eye-catching youtube thumbnail, bold text space' },
      tiktok: { width: 1080, height: 1920, style: 'trendy tiktok cover, vertical format' },
      instagram: { width: 1080, height: 1080, style: 'instagram aesthetic, clean feed style' },
      linkedin: { width: 1200, height: 627, style: 'professional linkedin post, corporate style' }
    };

    const spec = platformSpecs[platform];
    const prompt = `${topic}, ${spec.style}, marketing material, Pine Hill Farm wellness brand`;

    return this.generateImage({
      prompt,
      negativePrompt: 'text, watermark, blurry, low quality',
      width: spec.width,
      height: spec.height
    });
  }

  getPromptSuggestions(): string[] {
    return [
      'Organic herbal supplements in glass bottles on natural wood surface',
      'Fresh herbs and plants with morning dew, wellness concept',
      'Happy healthy family enjoying outdoor activities',
      'Natural ingredients arrangement, botanical flat lay',
      'Peaceful farm landscape at golden hour',
      'Premium wellness products with elegant packaging',
      'Person practicing yoga in nature, wellness lifestyle',
      'Close-up of healing herbs and natural remedies'
    ];
  }
}

export const stableDiffusionService = new StableDiffusionService();
