# Phase 1B: PiAPI Multi-Provider Integration

## Objective
Integrate PiAPI to access multiple AI video models (Kling, Luma, Hailuo, and more) through a single unified API. Combined with your existing Runway subscription, this gives you a complete AI video generation arsenal with automatic provider selection.

## Prerequisites
- Phase 1A complete (Runway integration working)
- PiAPI account created at https://piapi.ai
- PIAPI_API_KEY from your PiAPI dashboard

## What Success Looks Like
- Multiple video providers available through single service
- Automatic provider selection based on scene type
- Fallback chain if primary provider fails
- Cost tracking per provider

---

## Step 1: Update Provider Configuration

Replace `server/config/ai-video-providers.ts` with expanded configuration:

```typescript
// server/config/ai-video-providers.ts

export interface AIVideoProvider {
  name: string;
  type: 'direct' | 'piapi';  // Direct API or via PiAPI
  apiKey: string;
  endpoint: string;
  model?: string;  // For PiAPI, the model identifier
  maxDuration: number;
  costPerSecond: number;
  strengths: string[];
  priority: number;  // Lower = higher priority for matching scenes
}

export const AI_VIDEO_PROVIDERS: Record<string, AIVideoProvider> = {
  // Direct Runway API (your subscription)
  runway: {
    name: 'Runway Gen-3 Alpha',
    type: 'direct',
    apiKey: process.env.RUNWAY_API_KEY || '',
    endpoint: 'https://api.runwayml.com/v1',
    maxDuration: 10,
    costPerSecond: 0.05,
    strengths: ['hook', 'cta', 'cinematic', 'dramatic', 'emotional'],
    priority: 1,
  },
  
  // PiAPI Providers
  kling: {
    name: 'Kling AI',
    type: 'piapi',
    apiKey: process.env.PIAPI_API_KEY || '',
    endpoint: 'https://api.piapi.ai/api/v1/task',
    model: 'kling',
    maxDuration: 10,
    costPerSecond: 0.03,
    strengths: ['testimonial', 'lifestyle', 'human', 'expressions', 'story', 'face'],
    priority: 1,
  },
  
  luma: {
    name: 'Luma Dream Machine',
    type: 'piapi',
    apiKey: process.env.PIAPI_API_KEY || '',
    endpoint: 'https://api.piapi.ai/api/v1/task',
    model: 'luma',
    maxDuration: 5,
    costPerSecond: 0.04,
    strengths: ['product', 'reveal', 'camera-motion', 'dynamic', 'brand'],
    priority: 2,
  },
  
  hailuo: {
    name: 'Hailuo (Minimax)',
    type: 'piapi',
    apiKey: process.env.PIAPI_API_KEY || '',
    endpoint: 'https://api.piapi.ai/api/v1/task',
    model: 'hailuo',
    maxDuration: 6,
    costPerSecond: 0.02,
    strengths: ['broll', 'nature', 'abstract', 'supplementary', 'explanation'],
    priority: 3,
  },
  
  hunyuan: {
    name: 'Hunyuan',
    type: 'piapi',
    apiKey: process.env.PIAPI_API_KEY || '',
    endpoint: 'https://api.piapi.ai/api/v1/task',
    model: 'hunyuan',
    maxDuration: 5,
    costPerSecond: 0.025,
    strengths: ['broll', 'nature', 'abstract'],
    priority: 4,
  },
  
  veo: {
    name: 'Veo 3.1 (Google)',
    type: 'piapi',
    apiKey: process.env.PIAPI_API_KEY || '',
    endpoint: 'https://api.piapi.ai/api/v1/task',
    model: 'veo3.1',
    maxDuration: 8,
    costPerSecond: 0.06,
    strengths: ['cinematic', 'high-quality', 'dramatic'],
    priority: 2,
  },
};

export function isProviderConfigured(providerKey: string): boolean {
  const provider = AI_VIDEO_PROVIDERS[providerKey];
  return provider && provider.apiKey.length > 0;
}

export function getConfiguredProviders(): string[] {
  return Object.keys(AI_VIDEO_PROVIDERS).filter(isProviderConfigured);
}

/**
 * Select the best providers for a scene type (returns ranked list)
 */
export function selectProvidersForScene(
  sceneType: string, 
  visualPrompt: string
): string[] {
  const configuredProviders = getConfiguredProviders();
  
  if (configuredProviders.length === 0) {
    return [];
  }

  // Score each provider
  const scores: Array<{ key: string; score: number }> = [];
  
  for (const providerKey of configuredProviders) {
    const provider = AI_VIDEO_PROVIDERS[providerKey];
    let score = 100 - (provider.priority * 10); // Base score from priority
    
    // Scene type matching (big bonus)
    if (provider.strengths.includes(sceneType)) {
      score += 50;
    }
    
    // Content analysis from prompt
    const promptLower = visualPrompt.toLowerCase();
    
    // Human subjects → Kling
    if (promptLower.match(/person|woman|man|face|expression|talking|smiling|people/)) {
      if (providerKey === 'kling') score += 30;
    }
    
    // Cinematic/dramatic → Runway or Veo
    if (promptLower.match(/cinematic|dramatic|camera|slow.motion|sweeping|epic/)) {
      if (providerKey === 'runway' || providerKey === 'veo') score += 30;
    }
    
    // Product/reveal → Luma
    if (promptLower.match(/product|reveal|bottle|package|zoom|showcase/)) {
      if (providerKey === 'luma') score += 30;
    }
    
    // Nature/abstract → Hailuo (cost-effective)
    if (promptLower.match(/nature|forest|sky|abstract|background|environment/)) {
      if (providerKey === 'hailuo' || providerKey === 'hunyuan') score += 20;
    }
    
    scores.push({ key: providerKey, score });
  }
  
  // Sort by score (highest first) and return keys
  const sorted = scores.sort((a, b) => b.score - a.score);
  
  console.log(`[ProviderSelect] Scene: ${sceneType}`);
  console.log(`[ProviderSelect] Scores:`, sorted.map(s => `${s.key}:${s.score}`).join(', '));
  
  return sorted.map(s => s.key);
}
```

---

## Step 2: Create PiAPI Video Service

Create `server/services/piapi-video-service.ts`:

```typescript
// server/services/piapi-video-service.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AI_VIDEO_PROVIDERS, AIVideoProvider } from '../config/ai-video-providers';

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
  model: string;  // kling, luma, hailuo, etc.
  negativePrompt?: string;
}

class PiAPIVideoService {
  private s3Client: S3Client;
  private bucket = process.env.REMOTION_AWS_BUCKET || 'remotionlambda-useast1-refjo5giq5';
  private apiKey = process.env.PIAPI_API_KEY || '';
  private baseUrl = 'https://api.piapi.ai/api/v1';

  constructor() {
    this.s3Client = new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Generate video using any PiAPI-supported model
   */
  async generateVideo(options: PiAPIGenerationOptions): Promise<PiAPIGenerationResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'PiAPI key not configured' };
    }

    const startTime = Date.now();
    const modelConfig = this.getModelConfig(options.model);
    
    console.log(`[PiAPI:${options.model}] Starting generation...`);
    console.log(`[PiAPI:${options.model}] Prompt: ${options.prompt.substring(0, 100)}...`);

    try {
      // Step 1: Create generation task
      const taskResponse = await this.createTask(options, modelConfig);
      
      if (!taskResponse.success || !taskResponse.taskId) {
        return {
          success: false,
          error: taskResponse.error || 'Failed to create task',
          generationTimeMs: Date.now() - startTime,
        };
      }

      console.log(`[PiAPI:${options.model}] Task created: ${taskResponse.taskId}`);

      // Step 2: Poll for completion
      const result = await this.pollForCompletion(taskResponse.taskId, options.model);
      
      if (!result.success || !result.videoUrl) {
        return {
          ...result,
          generationTimeMs: Date.now() - startTime,
        };
      }

      // Step 3: Upload to S3
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

  /**
   * Create a video generation task
   */
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
      
      // PiAPI returns task_id in the response
      const taskId = data.data?.task_id || data.task_id;
      
      if (!taskId) {
        return { success: false, error: 'No task ID in response' };
      }

      return { success: true, taskId };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Build request body based on model type
   */
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

    // Model-specific adjustments
    switch (options.model) {
      case 'kling':
        return {
          ...baseRequest,
          model: 'kling-video',
          input: {
            ...baseRequest.input,
            mode: 'high_quality',  // or 'standard' for faster
            version: '1.6',  // Latest Kling version
          },
        };
        
      case 'luma':
        return {
          ...baseRequest,
          model: 'luma-video',
          input: {
            ...baseRequest.input,
            loop: false,
          },
        };
        
      case 'hailuo':
        return {
          ...baseRequest,
          model: 'hailuo-video',
          input: {
            ...baseRequest.input,
          },
        };
        
      case 'hunyuan':
        return {
          ...baseRequest,
          model: 'hunyuan-video',
        };
        
      case 'veo':
        return {
          ...baseRequest,
          model: 'veo-video',
          input: {
            ...baseRequest.input,
          },
        };
        
      default:
        return baseRequest;
    }
  }

  /**
   * Poll for task completion
   */
  private async pollForCompletion(
    taskId: string,
    model: string
  ): Promise<{ success: boolean; videoUrl?: string; error?: string }> {
    const maxAttempts = 120;  // 10 minutes max
    const pollInterval = 5000;  // 5 seconds

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
          // Extract video URL from response
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

        // Still processing - continue polling

      } catch (error: any) {
        console.warn(`[PiAPI:${model}] Poll error:`, error.message);
        // Continue polling despite transient errors
      }
    }

    return { success: false, error: 'Generation timed out after 10 minutes' };
  }

  /**
   * Extract video URL from various response formats
   */
  private extractVideoUrl(data: any): string | null {
    // PiAPI response formats vary by model
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

    // Check for array of outputs
    if (Array.isArray(data.data?.output)) {
      const video = data.data.output.find((o: any) => o.video_url || o.url);
      return video?.video_url || video?.url || null;
    }

    return null;
  }

  /**
   * Upload video to S3
   */
  private async uploadToS3(videoUrl: string, model: string): Promise<string> {
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
      kling: { modelId: 'kling-video', maxDuration: 10 },
      luma: { modelId: 'luma-video', maxDuration: 5 },
      hailuo: { modelId: 'hailuo-video', maxDuration: 6 },
      hunyuan: { modelId: 'hunyuan-video', maxDuration: 5 },
      veo: { modelId: 'veo-video', maxDuration: 8 },
    };
    return configs[model] || { modelId: model, maxDuration: 5 };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface ModelConfig {
  modelId: string;
  maxDuration: number;
}

export const piapiVideoService = new PiAPIVideoService();
```

---

## Step 3: Update AI Video Service

Update `server/services/ai-video-service.ts` to use both Runway and PiAPI:

```typescript
// server/services/ai-video-service.ts

import { runwayVideoService } from './runway-video-service';
import { piapiVideoService } from './piapi-video-service';
import { 
  AI_VIDEO_PROVIDERS, 
  selectProvidersForScene, 
  getConfiguredProviders 
} from '../config/ai-video-providers';

interface AIVideoResult {
  success: boolean;
  videoUrl?: string;
  s3Url?: string;
  provider?: string;
  duration?: number;
  cost?: number;
  error?: string;
  generationTimeMs?: number;
}

interface AIVideoOptions {
  prompt: string;
  duration: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  sceneType: string;
  preferredProvider?: string;
  negativePrompt?: string;
}

class AIVideoService {
  
  isAvailable(): boolean {
    return getConfiguredProviders().length > 0;
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): string[] {
    return getConfiguredProviders();
  }

  /**
   * Generate video using the best available provider
   */
  async generateVideo(options: AIVideoOptions): Promise<AIVideoResult> {
    const configuredProviders = getConfiguredProviders();
    
    if (configuredProviders.length === 0) {
      return { success: false, error: 'No AI video providers configured' };
    }

    // Get ranked list of providers for this scene
    const providerOrder = options.preferredProvider 
      ? [options.preferredProvider, ...configuredProviders.filter(p => p !== options.preferredProvider)]
      : selectProvidersForScene(options.sceneType, options.prompt);

    console.log(`[AIVideo] Scene: ${options.sceneType}`);
    console.log(`[AIVideo] Provider order: ${providerOrder.join(' → ')}`);

    // Try each provider until success
    for (const providerKey of providerOrder) {
      const provider = AI_VIDEO_PROVIDERS[providerKey];
      
      if (!provider) continue;
      
      console.log(`[AIVideo] Trying ${provider.name}...`);
      
      try {
        const result = await this.generateWithProvider(providerKey, provider, options);
        
        if (result.success && result.s3Url) {
          console.log(`[AIVideo] ✓ Success with ${provider.name}`);
          return {
            ...result,
            provider: providerKey,
          };
        }
        
        console.warn(`[AIVideo] ✗ ${provider.name} failed: ${result.error}`);
        
      } catch (error: any) {
        console.warn(`[AIVideo] ✗ ${provider.name} error: ${error.message}`);
      }
      
      // Continue to next provider
    }

    return { 
      success: false, 
      error: `All providers failed for ${options.sceneType} scene` 
    };
  }

  /**
   * Generate with a specific provider
   */
  private async generateWithProvider(
    providerKey: string,
    provider: typeof AI_VIDEO_PROVIDERS[string],
    options: AIVideoOptions
  ): Promise<AIVideoResult> {
    
    // Route to appropriate service based on provider type
    if (provider.type === 'direct') {
      // Direct API (Runway)
      return this.generateDirect(providerKey, options);
    } else {
      // PiAPI
      return this.generateViaPiAPI(providerKey, options);
    }
  }

  /**
   * Generate using direct API (Runway)
   */
  private async generateDirect(
    providerKey: string,
    options: AIVideoOptions
  ): Promise<AIVideoResult> {
    if (providerKey === 'runway') {
      if (!runwayVideoService.isAvailable()) {
        return { success: false, error: 'Runway not configured' };
      }
      
      const result = await runwayVideoService.generateVideo({
        prompt: options.prompt,
        duration: options.duration,
        aspectRatio: options.aspectRatio,
      });
      
      return {
        success: result.success,
        videoUrl: result.videoUrl,
        s3Url: result.s3Url,
        duration: result.duration,
        cost: result.cost,
        error: result.error,
        generationTimeMs: result.generationTimeMs,
      };
    }
    
    return { success: false, error: `Unknown direct provider: ${providerKey}` };
  }

  /**
   * Generate using PiAPI
   */
  private async generateViaPiAPI(
    providerKey: string,
    options: AIVideoOptions
  ): Promise<AIVideoResult> {
    if (!piapiVideoService.isAvailable()) {
      return { success: false, error: 'PiAPI not configured' };
    }
    
    const result = await piapiVideoService.generateVideo({
      prompt: options.prompt,
      duration: options.duration,
      aspectRatio: options.aspectRatio,
      model: providerKey,  // kling, luma, hailuo, etc.
      negativePrompt: options.negativePrompt,
    });
    
    return {
      success: result.success,
      videoUrl: result.videoUrl,
      s3Url: result.s3Url,
      duration: result.duration,
      cost: result.cost,
      error: result.error,
      generationTimeMs: result.generationTimeMs,
    };
  }

  /**
   * Estimate cost for generating a video
   */
  estimateCost(duration: number, providerKey?: string): number {
    if (providerKey && AI_VIDEO_PROVIDERS[providerKey]) {
      return duration * AI_VIDEO_PROVIDERS[providerKey].costPerSecond;
    }
    // Average cost across providers
    return duration * 0.04;
  }
}

export const aiVideoService = new AIVideoService();
```

---

## Step 4: Add Environment Variables

In Replit Secrets, add:
- **Key:** `PIAPI_API_KEY`
- **Value:** Your API key from PiAPI dashboard (Settings → API Keys)

You should already have:
- `RUNWAY_API_KEY` (from Phase 1A)

---

## Step 5: Test Multi-Provider Selection

Create a test project with different scene types to verify provider selection:

| Scene Type | Expected Primary Provider | Fallback |
|------------|--------------------------|----------|
| hook | Runway (cinematic) | Veo, Kling |
| testimonial | Kling (human subjects) | Runway |
| cta | Runway (dramatic) | Luma |
| product | Luma (reveals) | Runway |
| explanation | Hailuo (cost-effective) | Hunyuan |
| broll | Hailuo or Hunyuan | Any |

Watch console for:
```
[AIVideo] Scene: testimonial
[ProviderSelect] Scores: kling:130, runway:90, luma:70, hailuo:50
[AIVideo] Provider order: kling → runway → luma → hailuo
[AIVideo] Trying Kling AI...
[PiAPI:kling] Starting generation...
[PiAPI:kling] Task created: task_abc123
[PiAPI:kling] Status: processing (attempt 1/120)
[PiAPI:kling] Status: completed (attempt 12/120)
[PiAPI:kling] Complete! Time: 62.3s, Cost: $0.150
[AIVideo] ✓ Success with Kling AI
```

---

## Step 6: Verify Universal Video Service Integration

The `universal-video-service.ts` from Phase 1A should already be using `aiVideoService`. Verify it's working by checking the console during asset generation:

```
[Assets] Using AI video for hook scene...
[AIVideo] Scene: hook
[AIVideo] Provider order: runway → veo → kling → luma → hailuo
[AIVideo] Trying Runway Gen-3 Alpha...
[Assets] AI video ready (runway): https://s3...

[Assets] Using AI video for testimonial scene...
[AIVideo] Scene: testimonial  
[AIVideo] Provider order: kling → runway → luma → hailuo
[AIVideo] Trying Kling AI...
[Assets] AI video ready (kling): https://s3...
```

---

## Provider Selection Logic Summary

```
Scene Type → Content Analysis → Provider Scores → Ranked List → Try Until Success

Example for "testimonial" scene with prompt "Woman smiling, discussing her wellness journey":

1. Base scores from priority:
   - runway: 90, kling: 90, luma: 80, hailuo: 70

2. Scene type matching (+50):
   - kling has "testimonial" in strengths → +50 = 140
   
3. Content analysis (+30):
   - Prompt contains "woman", "smiling" 
   - kling has "human", "expressions" → +30 = 170
   
4. Final order: kling (170) → runway (90) → luma (80) → hailuo (70)

5. Try kling first, if fails try runway, etc.
```

---

## Verification Checklist

- [ ] `ai-video-providers.ts` has all providers configured (Runway + PiAPI models)
- [ ] `piapi-video-service.ts` created and exports service
- [ ] `ai-video-service.ts` routes to correct service based on provider type
- [ ] PIAPI_API_KEY set in Replit Secrets
- [ ] Provider selection chooses appropriate provider per scene type
- [ ] Fallback works when primary provider fails
- [ ] Console shows which provider is being used
- [ ] Generated videos uploaded to S3

---

## Troubleshooting

### "PiAPI key not configured"
- Check PIAPI_API_KEY in Replit Secrets
- Verify key is correct in PiAPI dashboard

### "No task ID in response"
- Check PiAPI account has credits
- Verify model name is correct
- Check API response format

### Wrong provider selected
- Check scene type is set correctly
- Verify prompt content matches provider strengths
- Check provider priority values

### Video generation times out
- PiAPI models can take 2-5 minutes
- Increase maxAttempts if needed
- Check PiAPI dashboard for queue status

### S3 upload fails
- Verify AWS credentials are set
- Check bucket permissions
- Original URL will be used as fallback

---

## Cost Tracking (Optional Enhancement)

Add to `ai-video-service.ts` for cost tracking:

```typescript
interface GenerationStats {
  provider: string;
  sceneType: string;
  duration: number;
  cost: number;
  generationTimeMs: number;
  timestamp: Date;
}

class AIVideoService {
  private stats: GenerationStats[] = [];
  
  // After successful generation, log stats
  private logStats(result: AIVideoResult, options: AIVideoOptions): void {
    if (result.success) {
      this.stats.push({
        provider: result.provider!,
        sceneType: options.sceneType,
        duration: result.duration!,
        cost: result.cost!,
        generationTimeMs: result.generationTimeMs!,
        timestamp: new Date(),
      });
    }
  }
  
  getStats(): { totalCost: number; byProvider: Record<string, number> } {
    const byProvider: Record<string, number> = {};
    let totalCost = 0;
    
    for (const stat of this.stats) {
      totalCost += stat.cost;
      byProvider[stat.provider] = (byProvider[stat.provider] || 0) + stat.cost;
    }
    
    return { totalCost, byProvider };
  }
}
```

---

## Next Phase

Once multi-provider selection is working reliably, proceed to **Phase 2A: Claude Vision Scene Analysis** for intelligent composition.
