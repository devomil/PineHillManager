# Phase 14 Addendum D: LegNext Midjourney Integration

## Purpose

Add LegNext.ai as an image generation provider to access Midjourney v6, v7, and Niji 6 models. This provides best-in-class aesthetic quality for the Ultra tier at exceptional value.

## Provider Overview

### LegNext.ai

| Feature | Details |
|---------|---------|
| **Website** | https://legnext.ai |
| **API Type** | REST API |
| **Models** | Midjourney v6, v7, Niji 6 |
| **Modes** | Turbo (fast), Fast (balanced), Relax (slow) |
| **Auth** | API Key |

### Pricing

| Plan | Points/Month | Cost | Per Image (Fast) |
|------|--------------|------|------------------|
| Free | 200 | $0 | $0 (limited) |
| Pro | 30,000 | $30 | ~$0.004 |

### Point Usage

| Mode | Points/Image | Speed | Quality |
|------|--------------|-------|---------|
| Turbo | ~2 | Fastest | Good |
| Fast | ~4 | Balanced | Best |
| Relax | ~1 | Slow | Good |

---

## Image Provider Registry Update

```typescript
// server/config/image-providers.ts

export interface ImageProvider {
  id: string;
  name: string;
  version: string;
  apiProvider: 'piapi' | 'legnext' | 'replicate' | 'direct';
  
  capabilities: {
    textToImage: boolean;
    imageToImage: boolean;
    inpainting: boolean;
    outpainting: boolean;
    upscaling: boolean;
    
    maxResolution: { width: number; height: number };
    supportedAspectRatios: string[];
    
    strengths: ImageStrength[];
    weaknesses: ImageWeakness[];
  };
  
  // Cost (normalized to per-image)
  costPerImage: number;
  
  // Quality rating
  qualityTier: 'premium' | 'standard' | 'budget';
  aestheticScore: number; // 1-10
  photorealismScore: number; // 1-10
  
  // API details
  modelId: string;
  defaultParams?: Record<string, any>;
}

export type ImageStrength = 
  | 'aesthetics'
  | 'photorealism'
  | 'composition'
  | 'text-rendering'
  | 'products'
  | 'people'
  | 'landscapes'
  | 'artistic'
  | 'anime'
  | 'speed';

export type ImageWeakness =
  | 'text-rendering'
  | 'hands'
  | 'specific-details'
  | 'consistency'
  | 'speed';

export const IMAGE_PROVIDERS: Record<string, ImageProvider> = {
  
  // ═══════════════════════════════════════════════════════════════
  // LEGNEXT - MIDJOURNEY FAMILY (NEW)
  // ═══════════════════════════════════════════════════════════════
  
  'midjourney-v7': {
    id: 'midjourney-v7',
    name: 'Midjourney v7',
    version: '7.0',
    apiProvider: 'legnext',
    
    capabilities: {
      textToImage: true,
      imageToImage: true,
      inpainting: false,
      outpainting: false,
      upscaling: true,
      
      maxResolution: { width: 2048, height: 2048 },
      supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3'],
      
      strengths: ['aesthetics', 'composition', 'artistic', 'people', 'landscapes'],
      weaknesses: ['text-rendering', 'specific-details'],
    },
    
    costPerImage: 0.004, // ~4 points at $30/30000
    qualityTier: 'premium',
    aestheticScore: 10,      // Best in class
    photorealismScore: 8,
    
    modelId: 'midjourney-v7',
    defaultParams: {
      mode: 'fast',          // fast | turbo | relax
      stylize: 100,          // 0-1000
      chaos: 0,              // 0-100
      quality: 1,            // 0.25, 0.5, 1
    },
  },
  
  'midjourney-v6': {
    id: 'midjourney-v6',
    name: 'Midjourney v6',
    version: '6.0',
    apiProvider: 'legnext',
    
    capabilities: {
      textToImage: true,
      imageToImage: true,
      inpainting: false,
      outpainting: false,
      upscaling: true,
      
      maxResolution: { width: 2048, height: 2048 },
      supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3'],
      
      strengths: ['aesthetics', 'composition', 'artistic', 'people'],
      weaknesses: ['text-rendering', 'specific-details'],
    },
    
    costPerImage: 0.004,
    qualityTier: 'premium',
    aestheticScore: 9,
    photorealismScore: 8,
    
    modelId: 'midjourney-v6',
    defaultParams: {
      mode: 'fast',
      stylize: 100,
      chaos: 0,
      quality: 1,
    },
  },
  
  'midjourney-niji6': {
    id: 'midjourney-niji6',
    name: 'Midjourney Niji 6',
    version: '6.0',
    apiProvider: 'legnext',
    
    capabilities: {
      textToImage: true,
      imageToImage: true,
      inpainting: false,
      outpainting: false,
      upscaling: true,
      
      maxResolution: { width: 2048, height: 2048 },
      supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3'],
      
      strengths: ['anime', 'artistic', 'aesthetics', 'composition'],
      weaknesses: ['photorealism', 'products'],
    },
    
    costPerImage: 0.004,
    qualityTier: 'premium',
    aestheticScore: 9,
    photorealismScore: 3, // Not designed for photorealism
    
    modelId: 'niji-6',
    defaultParams: {
      mode: 'fast',
      stylize: 100,
    },
  },
  
  // ═══════════════════════════════════════════════════════════════
  // PIAPI - FLUX FAMILY
  // ═══════════════════════════════════════════════════════════════
  
  'flux-1.1-pro': {
    id: 'flux-1.1-pro',
    name: 'Flux 1.1 Pro',
    version: '1.1',
    apiProvider: 'piapi',
    
    capabilities: {
      textToImage: true,
      imageToImage: true,
      inpainting: true,
      outpainting: false,
      upscaling: false,
      
      maxResolution: { width: 2048, height: 2048 },
      supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      
      strengths: ['photorealism', 'products', 'text-rendering', 'specific-details'],
      weaknesses: ['artistic'],
    },
    
    costPerImage: 0.05,
    qualityTier: 'premium',
    aestheticScore: 7,
    photorealismScore: 10, // Best for photorealism
    
    modelId: 'flux-1.1-pro',
  },
  
  'flux-kontext': {
    id: 'flux-kontext',
    name: 'Flux Kontext',
    version: '1.0',
    apiProvider: 'piapi',
    
    capabilities: {
      textToImage: true,
      imageToImage: true,
      inpainting: true,
      outpainting: true,
      upscaling: false,
      
      maxResolution: { width: 2048, height: 2048 },
      supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      
      strengths: ['specific-details', 'consistency', 'products'],
      weaknesses: ['speed'],
    },
    
    costPerImage: 0.06,
    qualityTier: 'premium',
    aestheticScore: 7,
    photorealismScore: 9,
    
    modelId: 'flux-kontext',
  },
  
  'flux-schnell': {
    id: 'flux-schnell',
    name: 'Flux Schnell',
    version: '1.0',
    apiProvider: 'piapi',
    
    capabilities: {
      textToImage: true,
      imageToImage: false,
      inpainting: false,
      outpainting: false,
      upscaling: false,
      
      maxResolution: { width: 1024, height: 1024 },
      supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      
      strengths: ['speed', 'photorealism'],
      weaknesses: ['artistic', 'text-rendering'],
    },
    
    costPerImage: 0.02,
    qualityTier: 'standard',
    aestheticScore: 6,
    photorealismScore: 7,
    
    modelId: 'flux-schnell',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // PIAPI - GPT IMAGE FAMILY
  // ═══════════════════════════════════════════════════════════════
  
  'gpt-image-1.5': {
    id: 'gpt-image-1.5',
    name: 'GPT Image 1.5',
    version: '1.5',
    apiProvider: 'piapi',
    
    capabilities: {
      textToImage: true,
      imageToImage: true,
      inpainting: true,
      outpainting: true,
      upscaling: false,
      
      maxResolution: { width: 1792, height: 1792 },
      supportedAspectRatios: ['1:1', '16:9', '9:16'],
      
      strengths: ['text-rendering', 'specific-details', 'consistency'],
      weaknesses: ['artistic'],
    },
    
    costPerImage: 0.04,
    qualityTier: 'premium',
    aestheticScore: 7,
    photorealismScore: 8,
    
    modelId: 'gpt-image-1.5',
  },
  
  'gpt-image-1': {
    id: 'gpt-image-1',
    name: 'GPT Image 1',
    version: '1.0',
    apiProvider: 'piapi',
    
    capabilities: {
      textToImage: true,
      imageToImage: true,
      inpainting: true,
      outpainting: true,
      upscaling: false,
      
      maxResolution: { width: 1792, height: 1792 },
      supportedAspectRatios: ['1:1', '16:9', '9:16'],
      
      strengths: ['text-rendering', 'specific-details'],
      weaknesses: ['artistic'],
    },
    
    costPerImage: 0.04,
    qualityTier: 'premium',
    aestheticScore: 6,
    photorealismScore: 7,
    
    modelId: 'gpt-image-1',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // PIAPI - OTHER PROVIDERS
  // ═══════════════════════════════════════════════════════════════
  
  'qwen-image': {
    id: 'qwen-image',
    name: 'Qwen Image',
    version: '1.0',
    apiProvider: 'piapi',
    
    capabilities: {
      textToImage: true,
      imageToImage: false,
      inpainting: false,
      outpainting: false,
      upscaling: false,
      
      maxResolution: { width: 1024, height: 1024 },
      supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      
      strengths: ['speed', 'people'],
      weaknesses: ['specific-details', 'text-rendering'],
    },
    
    costPerImage: 0.02,
    qualityTier: 'standard',
    aestheticScore: 6,
    photorealismScore: 6,
    
    modelId: 'qwen-image',
  },
  
  'seedream-4': {
    id: 'seedream-4',
    name: 'Seedream 4.0',
    version: '4.0',
    apiProvider: 'piapi',
    
    capabilities: {
      textToImage: true,
      imageToImage: false,
      inpainting: false,
      outpainting: false,
      upscaling: false,
      
      maxResolution: { width: 1024, height: 1024 },
      supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      
      strengths: ['artistic', 'aesthetics'],
      weaknesses: ['photorealism', 'specific-details'],
    },
    
    costPerImage: 0.02,
    qualityTier: 'standard',
    aestheticScore: 7,
    photorealismScore: 5,
    
    modelId: 'seedream-4',
  },
  
  'nano-banana-pro': {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    version: '1.0',
    apiProvider: 'piapi',
    
    capabilities: {
      textToImage: true,
      imageToImage: false,
      inpainting: false,
      outpainting: false,
      upscaling: false,
      
      maxResolution: { width: 1024, height: 1024 },
      supportedAspectRatios: ['1:1', '4:3', '16:9'],
      
      strengths: ['speed'],
      weaknesses: ['specific-details', 'text-rendering'],
    },
    
    costPerImage: 0.01,
    qualityTier: 'budget',
    aestheticScore: 5,
    photorealismScore: 5,
    
    modelId: 'nano-banana-pro',
  },
  
  'z-image-turbo': {
    id: 'z-image-turbo',
    name: 'Z-Image Turbo',
    version: '1.0',
    apiProvider: 'piapi',
    
    capabilities: {
      textToImage: true,
      imageToImage: false,
      inpainting: false,
      outpainting: false,
      upscaling: false,
      
      maxResolution: { width: 1024, height: 1024 },
      supportedAspectRatios: ['1:1', '4:3', '16:9'],
      
      strengths: ['speed'],
      weaknesses: ['specific-details', 'text-rendering', 'artistic'],
    },
    
    costPerImage: 0.01,
    qualityTier: 'budget',
    aestheticScore: 4,
    photorealismScore: 5,
    
    modelId: 'z-image-turbo',
  },
};
```

---

## Updated Quality Tier Image Preferences

```typescript
// Update in server/config/quality-tiers.ts

export const QUALITY_TIERS = {
  ultra: {
    // ... other config ...
    
    preferredImageProviders: [
      'midjourney-v7',        // $0.004/img - Best aesthetics (LegNext)
      'midjourney-v6',        // $0.004/img - Excellent aesthetics (LegNext)
      'flux-1.1-pro',         // $0.05/img - Best photorealism (PiAPI)
      'flux-kontext',         // $0.06/img - Best for editing (PiAPI)
      'gpt-image-1.5',        // $0.04/img - Good all-around (PiAPI)
    ],
    
    // Use Midjourney for artistic/lifestyle, Flux for products
    imageProviderRouting: {
      'lifestyle': 'midjourney-v7',
      'hero-shot': 'midjourney-v7',
      'artistic': 'midjourney-v7',
      'product-photo': 'flux-1.1-pro',
      'product-detail': 'flux-kontext',
      'text-heavy': 'gpt-image-1.5',
      'default': 'midjourney-v7',
    },
  },
  
  premium: {
    // ... other config ...
    
    preferredImageProviders: [
      'flux-1.1-pro',         // $0.05/img - Best photorealism
      'midjourney-v6',        // $0.004/img - Great aesthetics
      'gpt-image-1.5',        // $0.04/img - Good all-around
      'flux-kontext',         // $0.06/img - For editing
    ],
    
    imageProviderRouting: {
      'lifestyle': 'midjourney-v6',
      'hero-shot': 'midjourney-v6',
      'product-photo': 'flux-1.1-pro',
      'text-heavy': 'gpt-image-1.5',
      'default': 'flux-1.1-pro',
    },
  },
  
  standard: {
    // ... other config ...
    
    preferredImageProviders: [
      'flux-schnell',         // $0.02/img - Fast, decent quality
      'qwen-image',           // $0.02/img - Fast
      'seedream-4',           // $0.02/img - Stylized
      'gpt-image-1',          // $0.04/img - Reliable
    ],
    
    imageProviderRouting: {
      'default': 'flux-schnell',
    },
  },
};
```

---

## LegNext API Client

```typescript
// server/services/legnext-client.ts

interface LegNextConfig {
  apiKey: string;
  baseUrl: string;
}

interface MidjourneyGenerateRequest {
  prompt: string;
  model: 'midjourney-v7' | 'midjourney-v6' | 'niji-6';
  mode: 'turbo' | 'fast' | 'relax';
  aspectRatio?: string;
  stylize?: number;      // 0-1000
  chaos?: number;        // 0-100
  quality?: number;      // 0.25, 0.5, 1
  seed?: number;
  referenceImage?: string; // URL for image-to-image
  referenceStrength?: number; // 0-1
}

interface MidjourneyGenerateResponse {
  success: boolean;
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  thumbnailUrl?: string;
  pointsUsed: number;
  error?: string;
}

class LegNextClient {
  private config: LegNextConfig;
  
  constructor() {
    this.config = {
      apiKey: process.env.LEGNEXT_API_KEY!,
      baseUrl: 'https://api.legnext.ai/v1',
    };
  }
  
  /**
   * Generate image using Midjourney models
   */
  async generateImage(request: MidjourneyGenerateRequest): Promise<MidjourneyGenerateResponse> {
    console.log(`[LegNext] Generating with ${request.model}, mode: ${request.mode}`);
    
    // Start generation
    const response = await fetch(`${this.config.baseUrl}/midjourney/imagine`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: this.formatPrompt(request),
        model: request.model,
        mode: request.mode,
        aspect_ratio: request.aspectRatio || '16:9',
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LegNext API error: ${error}`);
    }
    
    const result = await response.json();
    
    // Poll for completion
    return this.pollForCompletion(result.taskId);
  }
  
  /**
   * Format prompt with Midjourney parameters
   */
  private formatPrompt(request: MidjourneyGenerateRequest): string {
    let prompt = request.prompt;
    
    // Add aspect ratio
    if (request.aspectRatio) {
      prompt += ` --ar ${request.aspectRatio}`;
    }
    
    // Add stylize
    if (request.stylize !== undefined) {
      prompt += ` --stylize ${request.stylize}`;
    }
    
    // Add chaos
    if (request.chaos !== undefined && request.chaos > 0) {
      prompt += ` --chaos ${request.chaos}`;
    }
    
    // Add quality
    if (request.quality !== undefined && request.quality !== 1) {
      prompt += ` --quality ${request.quality}`;
    }
    
    // Add seed for reproducibility
    if (request.seed !== undefined) {
      prompt += ` --seed ${request.seed}`;
    }
    
    // Add version flag for v6
    if (request.model === 'midjourney-v6') {
      prompt += ' --v 6';
    } else if (request.model === 'niji-6') {
      prompt += ' --niji 6';
    }
    // v7 is default, no flag needed
    
    return prompt;
  }
  
  /**
   * Poll for task completion
   */
  private async pollForCompletion(
    taskId: string,
    maxAttempts: number = 60,
    intervalMs: number = 2000
  ): Promise<MidjourneyGenerateResponse> {
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`${this.config.baseUrl}/midjourney/task/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });
      
      const result = await response.json();
      
      if (result.status === 'completed') {
        return {
          success: true,
          taskId,
          status: 'completed',
          imageUrl: result.imageUrl,
          thumbnailUrl: result.thumbnailUrl,
          pointsUsed: result.pointsUsed || 4,
        };
      }
      
      if (result.status === 'failed') {
        return {
          success: false,
          taskId,
          status: 'failed',
          pointsUsed: 0,
          error: result.error || 'Generation failed',
        };
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    throw new Error('Generation timed out');
  }
  
  /**
   * Check remaining balance
   */
  async getBalance(): Promise<{ points: number; plan: string }> {
    const response = await fetch(`${this.config.baseUrl}/account/balance`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });
    
    const result = await response.json();
    return {
      points: result.points || result.balance,
      plan: result.plan || 'free',
    };
  }
  
  /**
   * Upscale an existing image
   */
  async upscaleImage(taskId: string, index: number = 1): Promise<MidjourneyGenerateResponse> {
    const response = await fetch(`${this.config.baseUrl}/midjourney/upscale`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        index, // 1-4 for the four generated images
      }),
    });
    
    const result = await response.json();
    return this.pollForCompletion(result.taskId);
  }
}

export const legNextClient = new LegNextClient();
```

---

## Image Generation Service Update

```typescript
// server/services/image-generation-service.ts

import { legNextClient } from './legnext-client';
import { piapiClient } from './piapi-client';
import { IMAGE_PROVIDERS } from '../config/image-providers';
import { QUALITY_TIERS } from '../config/quality-tiers';

interface ImageGenerationRequest {
  prompt: string;
  aspectRatio: string;
  style?: 'lifestyle' | 'hero-shot' | 'artistic' | 'product-photo' | 'product-detail' | 'text-heavy';
  qualityTier: 'ultra' | 'premium' | 'standard';
  preferredProvider?: string;
}

interface ImageGenerationResult {
  success: boolean;
  imageUrl: string;
  thumbnailUrl?: string;
  provider: string;
  cost: number;
  metadata: {
    width: number;
    height: number;
    model: string;
  };
}

class ImageGenerationService {
  
  /**
   * Generate an image using the best provider for the request
   */
  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    // Get tier config
    const tierConfig = QUALITY_TIERS[request.qualityTier];
    
    // Determine provider based on style and tier
    let providerId = request.preferredProvider;
    
    if (!providerId && tierConfig.imageProviderRouting) {
      providerId = tierConfig.imageProviderRouting[request.style || 'default'] 
                || tierConfig.imageProviderRouting['default'];
    }
    
    if (!providerId) {
      providerId = tierConfig.preferredImageProviders[0];
    }
    
    const provider = IMAGE_PROVIDERS[providerId];
    
    console.log(`[ImageGen] Using ${provider.name} for ${request.style || 'default'} (${request.qualityTier} tier)`);
    
    // Route to appropriate API client
    if (provider.apiProvider === 'legnext') {
      return this.generateWithLegNext(request, provider);
    } else if (provider.apiProvider === 'piapi') {
      return this.generateWithPiAPI(request, provider);
    }
    
    throw new Error(`Unknown API provider: ${provider.apiProvider}`);
  }
  
  /**
   * Generate using LegNext (Midjourney)
   */
  private async generateWithLegNext(
    request: ImageGenerationRequest,
    provider: typeof IMAGE_PROVIDERS[string]
  ): Promise<ImageGenerationResult> {
    
    // Check balance first
    const balance = await legNextClient.getBalance();
    
    if (balance.points < 4) {
      console.warn('[ImageGen] LegNext points low, falling back to PiAPI');
      // Fallback to Flux
      return this.generateWithPiAPI(request, IMAGE_PROVIDERS['flux-1.1-pro']);
    }
    
    // Enhance prompt for Midjourney
    const enhancedPrompt = this.enhancePromptForMidjourney(request.prompt, request.style);
    
    const result = await legNextClient.generateImage({
      prompt: enhancedPrompt,
      model: provider.modelId as any,
      mode: 'fast', // Best quality/speed balance
      aspectRatio: request.aspectRatio,
      stylize: 100,
    });
    
    if (!result.success) {
      throw new Error(`Midjourney generation failed: ${result.error}`);
    }
    
    return {
      success: true,
      imageUrl: result.imageUrl!,
      thumbnailUrl: result.thumbnailUrl,
      provider: provider.id,
      cost: provider.costPerImage,
      metadata: {
        width: 1920,
        height: 1080,
        model: provider.modelId,
      },
    };
  }
  
  /**
   * Generate using PiAPI (Flux, GPT Image, etc.)
   */
  private async generateWithPiAPI(
    request: ImageGenerationRequest,
    provider: typeof IMAGE_PROVIDERS[string]
  ): Promise<ImageGenerationResult> {
    
    const result = await piapiClient.generateImage({
      prompt: request.prompt,
      model: provider.modelId,
      aspectRatio: request.aspectRatio,
    });
    
    return {
      success: true,
      imageUrl: result.imageUrl,
      thumbnailUrl: result.thumbnailUrl,
      provider: provider.id,
      cost: provider.costPerImage,
      metadata: {
        width: result.width,
        height: result.height,
        model: provider.modelId,
      },
    };
  }
  
  /**
   * Enhance prompt for Midjourney's style
   */
  private enhancePromptForMidjourney(prompt: string, style?: string): string {
    // Midjourney responds well to certain keywords
    let enhanced = prompt;
    
    // Add quality boosters if not present
    const qualityTerms = ['high quality', '8k', 'detailed', 'professional'];
    const hasQualityTerm = qualityTerms.some(term => prompt.toLowerCase().includes(term));
    
    if (!hasQualityTerm) {
      enhanced += ', high quality, professional photography';
    }
    
    // Add style-specific enhancements
    switch (style) {
      case 'lifestyle':
        enhanced += ', natural lighting, candid, authentic';
        break;
      case 'hero-shot':
        enhanced += ', dramatic lighting, cinematic composition';
        break;
      case 'product-photo':
        enhanced += ', studio lighting, clean background, commercial photography';
        break;
      case 'artistic':
        enhanced += ', artistic, creative, visually striking';
        break;
    }
    
    return enhanced;
  }
}

export const imageGenerationService = new ImageGenerationService();
```

---

## Environment Variables

```bash
# .env

# LegNext API (Midjourney)
LEGNEXT_API_KEY=your_legnext_api_key_here

# PiAPI (Flux, GPT Image, etc.)
PIAPI_API_KEY=your_piapi_api_key_here
```

---

## Provider Comparison Summary

| Provider | API | Cost/Image | Aesthetics | Photorealism | Best For |
|----------|-----|------------|------------|--------------|----------|
| **Midjourney v7** | LegNext | $0.004 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Lifestyle, hero shots |
| **Midjourney v6** | LegNext | $0.004 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Artistic, people |
| **Niji 6** | LegNext | $0.004 | ⭐⭐⭐⭐⭐ | ⭐⭐ | Anime, stylized |
| **Flux 1.1 Pro** | PiAPI | $0.05 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Products, accuracy |
| **Flux Kontext** | PiAPI | $0.06 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Editing, refinement |
| **GPT Image 1.5** | PiAPI | $0.04 | ⭐⭐⭐ | ⭐⭐⭐⭐ | Text in images |
| **Flux Schnell** | PiAPI | $0.02 | ⭐⭐⭐ | ⭐⭐⭐ | Speed, budget |

---

## Verification Checklist

- [ ] LegNext API key stored in environment
- [ ] LegNextClient handles auth, polling, errors
- [ ] IMAGE_PROVIDERS includes all Midjourney models
- [ ] IMAGE_PROVIDERS includes all PiAPI models
- [ ] Quality tiers route to appropriate providers
- [ ] Style-based routing (lifestyle→MJ, product→Flux)
- [ ] Fallback to PiAPI if LegNext points exhausted
- [ ] Prompt enhancement for Midjourney style
- [ ] Balance checking before generation
- [ ] Cost tracking per provider
