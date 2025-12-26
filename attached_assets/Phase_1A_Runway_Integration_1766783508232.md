# Phase 1A: Runway Gen-3 AI Video Integration

## Objective
Replace Pexels stock video with AI-generated video from Runway Gen-3 for hero scenes (hook, cta, testimonial). This is the first step toward cinematic-quality video that matches our visual directions.

## Prerequisites
- RUNWAY_API_KEY added to Replit Secrets (get from https://runwayml.com)
- Existing universal-video-service.ts working

## What Success Looks Like
- Hero scenes use Runway-generated video instead of stock footage
- B-roll scenes continue using Pexels as fallback
- Console logs show "[Runway] Task created" and "[Runway] Generation complete"
- Generated videos are cached to S3

---

## Step 1: Create Provider Configuration

Create a new file `server/config/ai-video-providers.ts`:

```typescript
// server/config/ai-video-providers.ts

export interface AIVideoProvider {
  name: string;
  apiKey: string;
  endpoint: string;
  maxDuration: number;
  costPerSecond: number;
  strengths: string[];
}

export const AI_VIDEO_PROVIDERS: Record<string, AIVideoProvider> = {
  runway: {
    name: 'Runway Gen-3 Alpha',
    apiKey: process.env.RUNWAY_API_KEY || '',
    endpoint: 'https://api.runwayml.com/v1',
    maxDuration: 10,
    costPerSecond: 0.05,
    strengths: ['hook', 'cta', 'emotional', 'cinematic', 'testimonial'],
  },
};

export function isProviderConfigured(providerKey: string): boolean {
  const provider = AI_VIDEO_PROVIDERS[providerKey];
  return provider && provider.apiKey.length > 0;
}

export function getConfiguredProviders(): string[] {
  return Object.keys(AI_VIDEO_PROVIDERS).filter(isProviderConfigured);
}
```

---

## Step 2: Create Runway Video Service

Create a new file `server/services/runway-video-service.ts`:

```typescript
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
  private s3Client: S3Client;
  private bucket = process.env.REMOTION_AWS_BUCKET || 'remotionlambda-useast1-refjo5giq5';
  private provider = AI_VIDEO_PROVIDERS.runway;

  constructor() {
    this.s3Client = new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  /**
   * Check if Runway is configured and available
   */
  isAvailable(): boolean {
    return this.provider.apiKey.length > 0;
  }

  /**
   * Generate video using Runway Gen-3 Alpha
   */
  async generateVideo(options: RunwayGenerationOptions): Promise<RunwayGenerationResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Runway API key not configured' };
    }

    const startTime = Date.now();
    console.log(`[Runway] Starting generation...`);
    console.log(`[Runway] Prompt: ${options.prompt.substring(0, 100)}...`);

    try {
      // Step 1: Create generation task
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

      // Step 2: Poll for completion
      const result = await this.pollForCompletion(taskId);
      
      if (!result.success || !result.videoUrl) {
        return {
          ...result,
          generationTimeMs: Date.now() - startTime,
        };
      }

      // Step 3: Upload to S3 for consistent access
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

  /**
   * Poll Runway API until generation completes
   */
  private async pollForCompletion(taskId: string): Promise<{ success: boolean; videoUrl?: string; error?: string }> {
    const maxAttempts = 60; // 5 minutes max
    const pollInterval = 5000; // 5 seconds

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

        // PENDING, RUNNING, etc. - continue polling

      } catch (error: any) {
        console.warn(`[Runway] Poll error:`, error.message);
        // Continue polling despite transient errors
      }
    }

    return { success: false, error: 'Generation timed out after 5 minutes' };
  }

  /**
   * Upload video to S3 for consistent Lambda access
   */
  private async uploadToS3(videoUrl: string): Promise<string> {
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

  /**
   * Format prompt for optimal Runway results
   */
  private formatPrompt(prompt: string): string {
    // Runway works best with concise, clear prompts
    // Remove overly cinematic language and focus on visual content
    
    let formatted = prompt
      .replace(/\bcaptured from\b/gi, '')
      .replace(/\bthe camera\b/gi, '')
      .replace(/\bcamera slowly\b/gi, 'slowly')
      .replace(/\bcreating an?\b/gi, '')
      .trim();

    // Ensure it's not too long (Runway has limits)
    if (formatted.length > 500) {
      formatted = formatted.substring(0, 497) + '...';
    }

    return formatted;
  }

  /**
   * Format aspect ratio for Runway API
   */
  private formatAspectRatio(ratio: string): string {
    // Runway uses format like "16:9" or "1280:768"
    return ratio; // Already in correct format
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const runwayVideoService = new RunwayVideoService();
```

---

## Step 3: Integrate with Universal Video Service

Modify `server/services/universal-video-service.ts`:

### Add import at top of file:
```typescript
import { runwayVideoService } from './runway-video-service';
```

### Find the video generation section in generateProjectAssets() and modify:

Look for where videos are generated for scenes (likely searching Pexels). Replace or wrap that logic with:

```typescript
// In generateProjectAssets method, find the video generation loop

// Define which scene types should use AI video generation
const heroSceneTypes = ['hook', 'cta', 'testimonial', 'story'];

for (let i = 0; i < updatedProject.scenes.length; i++) {
  const scene = updatedProject.scenes[i];
  const isHeroScene = heroSceneTypes.includes(scene.type);
  
  let videoResult: { url: string; source: string } | null = null;

  // Try AI generation for hero scenes if Runway is available
  if (isHeroScene && runwayVideoService.isAvailable()) {
    console.log(`[Assets] Using Runway AI for ${scene.type} scene...`);
    
    const visualPrompt = scene.visualDirection || 
                         scene.background?.source || 
                         `Professional wellness video for: ${scene.narration?.substring(0, 100)}`;
    
    const runwayResult = await runwayVideoService.generateVideo({
      prompt: visualPrompt,
      duration: Math.min(scene.duration || 5, 10),
      aspectRatio: (project.outputFormat?.aspectRatio as '16:9' | '9:16' | '1:1') || '16:9',
    });
    
    if (runwayResult.success && runwayResult.s3Url) {
      videoResult = { 
        url: runwayResult.s3Url, 
        source: 'runway' 
      };
      console.log(`[Assets] Runway video ready: ${runwayResult.s3Url}`);
    } else {
      console.warn(`[Assets] Runway failed for ${scene.type}, falling back to stock: ${runwayResult.error}`);
    }
  }
  
  // Fall back to stock video (Pexels) if AI generation failed or not applicable
  if (!videoResult) {
    console.log(`[Assets] Using stock video for ${scene.type} scene...`);
    
    // Your existing Pexels search logic here
    const searchQuery = this.buildVideoSearchQuery(scene, project.targetAudience);
    const stockResult = await this.getStockVideo(searchQuery, project.targetAudience);
    
    if (stockResult?.url) {
      videoResult = { 
        url: stockResult.url, 
        source: 'pexels' 
      };
    }
  }
  
  // Apply video result to scene
  if (videoResult) {
    updatedProject.scenes[i].assets = updatedProject.scenes[i].assets || {};
    updatedProject.scenes[i].assets!.videoUrl = videoResult.url;
    updatedProject.scenes[i].assets!.videoSource = videoResult.source;
    
    if (updatedProject.scenes[i].background) {
      updatedProject.scenes[i].background!.type = 'video';
      updatedProject.scenes[i].background!.videoUrl = videoResult.url;
    }
  }
  
  // Update progress
  if (updatedProject.progress?.steps?.videos) {
    updatedProject.progress.steps.videos.progress = Math.round(((i + 1) / updatedProject.scenes.length) * 100);
  }
}
```

---

## Step 4: Add Environment Variable

In Replit Secrets, add:
- **Key:** `RUNWAY_API_KEY`
- **Value:** Your Runway API key from https://runwayml.com/api

---

## Step 5: Test the Integration

1. Create a new Script-Based video project
2. Use a simple test script with a hook scene
3. Watch the console for:
   - `[Assets] Using Runway AI for hook scene...`
   - `[Runway] Starting generation...`
   - `[Runway] Task created: xxx`
   - `[Runway] Status: RUNNING`
   - `[Runway] Generation complete`
   - `[Runway] Uploaded to S3`
4. Verify the rendered video uses AI-generated content (not stock footage of random people)

---

## Verification Checklist

Before moving to Phase 1B, confirm:

- [ ] `server/config/ai-video-providers.ts` exists and exports configuration
- [ ] `server/services/runway-video-service.ts` exists and exports `runwayVideoService`
- [ ] `universal-video-service.ts` imports and uses `runwayVideoService`
- [ ] RUNWAY_API_KEY is set in Replit Secrets
- [ ] Console shows Runway generation logs during asset creation
- [ ] Hero scenes (hook, cta, testimonial) attempt AI generation
- [ ] Non-hero scenes still use Pexels fallback
- [ ] Generated videos are uploaded to S3

---

## Troubleshooting

### "Runway API key not configured"
- Check Replit Secrets for RUNWAY_API_KEY
- Restart the Replit server after adding secrets

### "Runway API error: 401"
- Invalid API key - regenerate from Runway dashboard

### "Runway API error: 429"
- Rate limited - wait a few minutes before retrying

### "Generation timed out"
- Runway can take 1-3 minutes per video
- Check Runway dashboard for queue status

### Videos not appearing in final render
- Check S3 upload succeeded
- Verify the S3 URL is accessible
- Check Lambda logs for download errors

---

## Next Phase

Once this is working, proceed to **Phase 1B: Add Kling AI** for better human subject generation.
