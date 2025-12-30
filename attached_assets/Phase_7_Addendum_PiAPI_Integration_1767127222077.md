# Phase 7 Addendum: PiAPI Integration Architecture

## Purpose

This addendum clarifies the API routing architecture for all AI providers. The Replit agent must understand that most providers are accessed through PiAPI, not direct APIs.

## API Routing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    API ROUTING ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DIRECT API ACCESS:                                            │
│  ├── ElevenLabs (voiceover)     → api.elevenlabs.io           │
│  └── Runway (video generation)  → api.runwayml.com            │
│                                                                 │
│  VIA PIAPI (piapi.ai):                                         │
│  ├── Kling 1.6 (video)          → piapi.ai/kling              │
│  ├── Luma (video)               → piapi.ai/luma               │
│  ├── Hailuo/MiniMax (video)     → piapi.ai/hailuo             │
│  ├── Udio (music)               → piapi.ai/udio               │
│  ├── Flux.1 (images)            → piapi.ai/flux               │
│  └── Kling Sound (SFX)          → piapi.ai/kling-sound        │
│                                                                 │
│  ANTHROPIC DIRECT:                                             │
│  └── Claude Vision (analysis)   → api.anthropic.com           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Environment Variables Required

```bash
# Direct APIs
ELEVENLABS_API_KEY=your_elevenlabs_key
RUNWAY_API_KEY=your_runway_key
ANTHROPIC_API_KEY=your_anthropic_key

# PiAPI - Single key for multiple providers
PIAPI_API_KEY=your_piapi_key
PIAPI_BASE_URL=https://api.piapi.ai
```

## PiAPI Service Implementation

Create `server/services/piapi-service.ts`:

```typescript
// server/services/piapi-service.ts

interface PiAPIConfig {
  baseUrl: string;
  apiKey: string;
}

interface PiAPIRequest {
  provider: 'kling' | 'luma' | 'hailuo' | 'udio' | 'flux' | 'kling-sound';
  endpoint: string;
  payload: Record<string, any>;
}

interface PiAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  taskId?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}

class PiAPIService {
  private config: PiAPIConfig;
  
  constructor() {
    this.config = {
      baseUrl: process.env.PIAPI_BASE_URL || 'https://api.piapi.ai',
      apiKey: process.env.PIAPI_API_KEY || '',
    };
    
    if (!this.config.apiKey) {
      console.warn('[PiAPI] Warning: PIAPI_API_KEY not set');
    }
  }
  
  /**
   * Make a request to PiAPI
   */
  async request<T>(req: PiAPIRequest): Promise<PiAPIResponse<T>> {
    const url = `${this.config.baseUrl}/${req.provider}/${req.endpoint}`;
    
    console.log(`[PiAPI] ${req.provider}/${req.endpoint}`);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'X-API-Version': '1',
        },
        body: JSON.stringify(req.payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[PiAPI] Error ${response.status}: ${errorText}`);
        return {
          success: false,
          error: `PiAPI error: ${response.status} - ${errorText}`,
        };
      }
      
      const data = await response.json();
      return {
        success: true,
        data: data as T,
        taskId: data.task_id,
        status: data.status,
      };
      
    } catch (error: any) {
      console.error(`[PiAPI] Request failed:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  /**
   * Poll for task completion (PiAPI uses async task model)
   */
  async pollTask<T>(
    provider: PiAPIRequest['provider'],
    taskId: string,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<PiAPIResponse<T>> {
    console.log(`[PiAPI] Polling task ${taskId} for ${provider}`);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await this.request<T>({
        provider,
        endpoint: `task/${taskId}`,
        payload: {},
      });
      
      if (!result.success) {
        return result;
      }
      
      if (result.status === 'completed') {
        console.log(`[PiAPI] Task ${taskId} completed`);
        return result;
      }
      
      if (result.status === 'failed') {
        console.error(`[PiAPI] Task ${taskId} failed`);
        return {
          success: false,
          error: 'Task failed',
        };
      }
      
      // Still processing, wait and retry
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    return {
      success: false,
      error: 'Task timed out',
    };
  }
  
  // ============================================
  // VIDEO GENERATION
  // ============================================
  
  /**
   * Generate video with Kling 1.6
   */
  async generateKlingVideo(
    prompt: string,
    options: {
      duration?: number;
      aspectRatio?: '16:9' | '9:16' | '1:1';
      mode?: 'standard' | 'professional';
    } = {}
  ): Promise<{ url: string; taskId: string } | null> {
    const result = await this.request<{ task_id: string }>({
      provider: 'kling',
      endpoint: 'generate',
      payload: {
        prompt,
        duration: options.duration || 5,
        aspect_ratio: options.aspectRatio || '16:9',
        mode: options.mode || 'standard',
      },
    });
    
    if (!result.success || !result.data?.task_id) {
      console.error('[PiAPI] Kling generation failed:', result.error);
      return null;
    }
    
    // Poll for completion
    const completed = await this.pollTask<{ video_url: string }>(
      'kling',
      result.data.task_id
    );
    
    if (!completed.success || !completed.data?.video_url) {
      return null;
    }
    
    return {
      url: completed.data.video_url,
      taskId: result.data.task_id,
    };
  }
  
  /**
   * Generate video with Luma Dream Machine
   */
  async generateLumaVideo(
    prompt: string,
    options: {
      duration?: number;
      aspectRatio?: '16:9' | '9:16' | '1:1';
    } = {}
  ): Promise<{ url: string; taskId: string } | null> {
    const result = await this.request<{ task_id: string }>({
      provider: 'luma',
      endpoint: 'generate',
      payload: {
        prompt,
        duration: options.duration || 5,
        aspect_ratio: options.aspectRatio || '16:9',
      },
    });
    
    if (!result.success || !result.data?.task_id) {
      console.error('[PiAPI] Luma generation failed:', result.error);
      return null;
    }
    
    const completed = await this.pollTask<{ video_url: string }>(
      'luma',
      result.data.task_id
    );
    
    if (!completed.success || !completed.data?.video_url) {
      return null;
    }
    
    return {
      url: completed.data.video_url,
      taskId: result.data.task_id,
    };
  }
  
  /**
   * Generate video with Hailuo/MiniMax
   */
  async generateHailuoVideo(
    prompt: string,
    options: {
      duration?: number;
    } = {}
  ): Promise<{ url: string; taskId: string } | null> {
    const result = await this.request<{ task_id: string }>({
      provider: 'hailuo',
      endpoint: 'generate',
      payload: {
        prompt,
        duration: options.duration || 5,
      },
    });
    
    if (!result.success || !result.data?.task_id) {
      console.error('[PiAPI] Hailuo generation failed:', result.error);
      return null;
    }
    
    const completed = await this.pollTask<{ video_url: string }>(
      'hailuo',
      result.data.task_id
    );
    
    if (!completed.success || !completed.data?.video_url) {
      return null;
    }
    
    return {
      url: completed.data.video_url,
      taskId: result.data.task_id,
    };
  }
  
  // ============================================
  // IMAGE GENERATION
  // ============================================
  
  /**
   * Generate image with Flux.1
   */
  async generateFluxImage(
    prompt: string,
    options: {
      width?: number;
      height?: number;
      model?: 'schnell' | 'dev' | 'pro';
    } = {}
  ): Promise<{ url: string } | null> {
    const result = await this.request<{ task_id: string }>({
      provider: 'flux',
      endpoint: 'generate',
      payload: {
        prompt,
        width: options.width || 1280,
        height: options.height || 720,
        model: options.model || 'schnell',
      },
    });
    
    if (!result.success || !result.data?.task_id) {
      console.error('[PiAPI] Flux generation failed:', result.error);
      return null;
    }
    
    const completed = await this.pollTask<{ image_url: string }>(
      'flux',
      result.data.task_id
    );
    
    if (!completed.success || !completed.data?.image_url) {
      return null;
    }
    
    return {
      url: completed.data.image_url,
    };
  }
  
  // ============================================
  // AUDIO GENERATION
  // ============================================
  
  /**
   * Generate music with Udio
   */
  async generateUdioMusic(
    prompt: string,
    options: {
      duration?: number;
      style?: string;
    } = {}
  ): Promise<{ url: string } | null> {
    const result = await this.request<{ task_id: string }>({
      provider: 'udio',
      endpoint: 'generate',
      payload: {
        prompt,
        duration: options.duration || 60,
        style: options.style || 'ambient',
      },
    });
    
    if (!result.success || !result.data?.task_id) {
      console.error('[PiAPI] Udio generation failed:', result.error);
      return null;
    }
    
    const completed = await this.pollTask<{ audio_url: string }>(
      'udio',
      result.data.task_id,
      120, // Music takes longer
      10000
    );
    
    if (!completed.success || !completed.data?.audio_url) {
      return null;
    }
    
    return {
      url: completed.data.audio_url,
    };
  }
  
  /**
   * Generate sound effect with Kling Sound
   */
  async generateKlingSound(
    type: string,
    options: {
      duration?: number;
      description?: string;
    } = {}
  ): Promise<{ url: string } | null> {
    const result = await this.request<{ task_id: string }>({
      provider: 'kling-sound',
      endpoint: 'generate',
      payload: {
        type,
        duration: options.duration || 2,
        description: options.description || '',
      },
    });
    
    if (!result.success || !result.data?.task_id) {
      console.error('[PiAPI] Kling Sound generation failed:', result.error);
      return null;
    }
    
    const completed = await this.pollTask<{ audio_url: string }>(
      'kling-sound',
      result.data.task_id
    );
    
    if (!completed.success || !completed.data?.audio_url) {
      return null;
    }
    
    return {
      url: completed.data.audio_url,
    };
  }
}

export const piapiService = new PiAPIService();
```

---

## Update Provider Services to Use PiAPI

### Update Video Provider Selector

In `server/services/video-provider-selector.ts`, update the generation methods:

```typescript
import { piapiService } from './piapi-service';

// In the video generation method:
async generateVideo(
  provider: string,
  prompt: string,
  duration: number
): Promise<{ url: string } | null> {
  switch (provider) {
    case 'runway':
      // Direct API - keep existing implementation
      return this.generateWithRunway(prompt, duration);
      
    case 'kling':
      // Via PiAPI
      return piapiService.generateKlingVideo(prompt, { duration });
      
    case 'luma':
      // Via PiAPI
      return piapiService.generateLumaVideo(prompt, { duration });
      
    case 'hailuo':
      // Via PiAPI
      return piapiService.generateHailuoVideo(prompt, { duration });
      
    default:
      console.error(`Unknown video provider: ${provider}`);
      return null;
  }
}
```

### Update Image Generation Service

In `server/services/image-generation-service.ts`:

```typescript
import { piapiService } from './piapi-service';

async generateImage(options: ImageGenerationOptions): Promise<GeneratedImage> {
  const provider = options.provider || 'falai';
  
  if (provider === 'flux') {
    // Via PiAPI
    const result = await piapiService.generateFluxImage(options.prompt, {
      width: options.width,
      height: options.height,
    });
    
    if (!result) {
      throw new Error('Flux image generation failed');
    }
    
    return {
      url: result.url,
      provider: 'flux',
      prompt: options.prompt,
      width: options.width || 1280,
      height: options.height || 720,
    };
  }
  
  // fal.ai - keep existing direct implementation
  return this.generateWithFalAI(options);
}
```

### Update Sound Design Service

In `server/services/sound-design-service.ts`:

```typescript
import { piapiService } from './piapi-service';

async generateSoundEffect(
  type: string,
  duration: number
): Promise<{ url: string; type: string }> {
  // Via PiAPI
  const result = await piapiService.generateKlingSound(type, { duration });
  
  if (!result) {
    throw new Error('Kling Sound generation failed');
  }
  
  return {
    url: result.url,
    type,
  };
}

async generateMusic(
  prompt: string,
  duration: number,
  style: string
): Promise<{ url: string }> {
  // Via PiAPI
  const result = await piapiService.generateUdioMusic(prompt, {
    duration,
    style,
  });
  
  if (!result) {
    throw new Error('Udio music generation failed');
  }
  
  return {
    url: result.url,
  };
}
```

---

## API Routing Summary Table

| Provider | Service | API Route | Auth |
|----------|---------|-----------|------|
| ElevenLabs | Voiceover | Direct: api.elevenlabs.io | ELEVENLABS_API_KEY |
| Runway | Video | Direct: api.runwayml.com | RUNWAY_API_KEY |
| Claude | Vision/Analysis | Direct: api.anthropic.com | ANTHROPIC_API_KEY |
| Kling 1.6 | Video | PiAPI: api.piapi.ai/kling | PIAPI_API_KEY |
| Luma | Video | PiAPI: api.piapi.ai/luma | PIAPI_API_KEY |
| Hailuo | Video | PiAPI: api.piapi.ai/hailuo | PIAPI_API_KEY |
| Udio | Music | PiAPI: api.piapi.ai/udio | PIAPI_API_KEY |
| Flux.1 | Images | PiAPI: api.piapi.ai/flux | PIAPI_API_KEY |
| Kling Sound | SFX | PiAPI: api.piapi.ai/kling-sound | PIAPI_API_KEY |

---

## Verification Checklist

- [ ] PIAPI_API_KEY environment variable set
- [ ] piapi-service.ts created with all provider methods
- [ ] Video generation routes through PiAPI for Kling, Luma, Hailuo
- [ ] Image generation routes through PiAPI for Flux
- [ ] Music generation routes through PiAPI for Udio
- [ ] Sound effects route through PiAPI for Kling Sound
- [ ] Direct API maintained for ElevenLabs, Runway, Claude
- [ ] Task polling implemented for async PiAPI operations
- [ ] Error handling and fallbacks in place

---

## Note for Replit Agent

When implementing provider integrations:

1. **Always check which API to use** - see routing table above
2. **PiAPI uses async task model** - must poll for completion
3. **Single API key for PiAPI** - covers all PiAPI providers
4. **Direct APIs have their own keys** - ElevenLabs, Runway, Anthropic
5. **fal.ai is also direct** - not through PiAPI (existing implementation)
