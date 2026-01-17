# PiAPI Image-to-Video (I2V) - Correct Implementation

## The Problem

The Replit agent is struggling to send images to PiAPI for I2V generation. 

## The Solution

**PiAPI expects a publicly accessible image URL** - NOT a file upload, NOT base64, NOT a local file path.

```
✅ CORRECT: "https://your-bucket.s3.amazonaws.com/image.jpg"
✅ CORRECT: "https://your-app.com/uploads/brand-asset-123.png"

❌ WRONG: Base64 encoded image
❌ WRONG: Local file path "/uploads/image.jpg"
❌ WRONG: File upload/multipart form data
❌ WRONG: Blob or Buffer
```

---

## Correct API Request Format

### For Veo 3.1 I2V:

```typescript
const response = await fetch('https://api.piapi.ai/api/v1/task', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.PIAPI_API_KEY,
  },
  body: JSON.stringify({
    model: 'veo3',
    task_type: 'veo3-video',  // or 'veo3-video-fast'
    input: {
      prompt: 'Gentle camera push in, soft morning light, product in focus',
      image_url: 'https://your-public-url.com/image.jpg',  // <-- MUST BE PUBLIC URL
      aspect_ratio: '16:9',
      duration: '8s',
      resolution: '1080p',
      generate_audio: false,
    },
  }),
});
```

### For Kling I2V:

```typescript
const response = await fetch('https://api.piapi.ai/api/v1/task', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.PIAPI_API_KEY,
  },
  body: JSON.stringify({
    model: 'kling',
    task_type: 'video_generation',
    input: {
      prompt: 'Gentle camera movement, cinematic lighting',
      image_url: 'https://your-public-url.com/image.jpg',  // <-- MUST BE PUBLIC URL
      duration: '5',
      aspect_ratio: '16:9',
    },
  }),
});
```

---

## How to Get a Public URL for Brand Assets

### Option 1: Use Existing Cloud Storage URL (RECOMMENDED)

If brand assets are already stored in cloud storage (S3, Cloudflare R2, etc.), they already have public URLs:

```typescript
// Brand asset from database already has a public URL
const brandAsset = await db.query.brandAssets.findFirst({
  where: eq(brandAssets.id, assetId),
});

// Use the fileUrl directly - it's already a public URL
const imageUrl = brandAsset.fileUrl;
// Example: "https://your-bucket.s3.amazonaws.com/brand-assets/black-cohosh.jpg"

// Send to PiAPI
const response = await fetch('https://api.piapi.ai/api/v1/task', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.PIAPI_API_KEY,
  },
  body: JSON.stringify({
    model: 'veo3',
    task_type: 'veo3-video',
    input: {
      prompt: motionPrompt,
      image_url: imageUrl,  // Already a public URL!
      duration: '8s',
    },
  }),
});
```

### Option 2: Upload to Cloud Storage First

If the image is local or from a non-public source, upload it first:

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

async function uploadImageToS3(imageBuffer: Buffer, filename: string): Promise<string> {
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const key = `i2v-inputs/${Date.now()}-${filename}`;
  
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: imageBuffer,
    ContentType: 'image/jpeg',
    ACL: 'public-read',  // IMPORTANT: Make it publicly accessible
  }));

  // Return the public URL
  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

// Usage
const publicUrl = await uploadImageToS3(imageBuffer, 'brand-asset.jpg');
// Now use publicUrl in PiAPI request
```

### Option 3: Use Cloudflare R2 (if that's your storage)

```typescript
async function getPublicR2Url(objectKey: string): Promise<string> {
  // If using Cloudflare R2 with public bucket
  return `https://${process.env.R2_PUBLIC_DOMAIN}/${objectKey}`;
}
```

---

## Complete I2V Service Implementation

```typescript
// server/services/i2v-generation-service.ts

interface I2VRequest {
  imageUrl: string;        // MUST be a publicly accessible URL
  prompt: string;
  duration?: number;
  provider?: 'veo3' | 'kling';
  aspectRatio?: '16:9' | '9:16';
}

interface I2VResponse {
  taskId: string;
  status: string;
  videoUrl?: string;
}

class I2VGenerationService {
  private apiKey: string;
  private baseUrl = 'https://api.piapi.ai/api/v1/task';

  constructor() {
    this.apiKey = process.env.PIAPI_API_KEY!;
  }

  /**
   * Generate video from image using PiAPI
   */
  async generateI2V(request: I2VRequest): Promise<I2VResponse> {
    // Validate that imageUrl is a proper URL
    if (!request.imageUrl.startsWith('http')) {
      throw new Error(
        `Invalid image URL: "${request.imageUrl}". ` +
        `PiAPI requires a publicly accessible HTTP/HTTPS URL, not a local path or base64.`
      );
    }

    console.log(`[I2V] Starting generation with image: ${request.imageUrl}`);
    console.log(`[I2V] Prompt: ${request.prompt}`);
    console.log(`[I2V] Provider: ${request.provider || 'veo3'}`);

    const body = this.buildRequestBody(request);
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[I2V] PiAPI error: ${response.status} - ${errorText}`);
      throw new Error(`PiAPI I2V request failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`[I2V] Task created: ${result.data?.task_id}`);

    return {
      taskId: result.data?.task_id,
      status: result.data?.status,
    };
  }

  /**
   * Build request body based on provider
   */
  private buildRequestBody(request: I2VRequest): object {
    if (request.provider === 'kling') {
      return {
        model: 'kling',
        task_type: 'video_generation',
        input: {
          prompt: request.prompt,
          image_url: request.imageUrl,
          duration: String(request.duration || 5),
          aspect_ratio: request.aspectRatio || '16:9',
          mode: 'pro',  // Use pro mode for better quality
        },
      };
    }

    // Default: Veo 3
    return {
      model: 'veo3',
      task_type: 'veo3-video',
      input: {
        prompt: request.prompt,
        image_url: request.imageUrl,
        aspect_ratio: request.aspectRatio || '16:9',
        duration: `${request.duration || 8}s`,
        resolution: '1080p',
        generate_audio: false,
      },
    };
  }

  /**
   * Poll for task completion
   */
  async waitForCompletion(taskId: string, maxWaitMs: number = 300000): Promise<string> {
    const startTime = Date.now();
    const pollInterval = 5000;  // 5 seconds

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getTaskStatus(taskId);

      if (status.status === 'completed') {
        console.log(`[I2V] Task ${taskId} completed!`);
        return status.videoUrl!;
      }

      if (status.status === 'failed') {
        throw new Error(`I2V generation failed: ${status.error}`);
      }

      console.log(`[I2V] Task ${taskId} status: ${status.status}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`I2V generation timed out after ${maxWaitMs}ms`);
  }

  /**
   * Get task status from PiAPI
   */
  async getTaskStatus(taskId: string): Promise<{
    status: string;
    videoUrl?: string;
    error?: string;
  }> {
    const response = await fetch(`https://api.piapi.ai/api/v1/task/${taskId}`, {
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    const result = await response.json();
    
    return {
      status: result.data?.status,
      videoUrl: result.data?.output?.video_url,
      error: result.data?.error?.message,
    };
  }
}

export const i2vGenerationService = new I2VGenerationService();
```

---

## Using with Brand Assets

```typescript
// In your scene generation service

async function generateSceneWithBrandAsset(
  scene: Scene,
  brandAsset: BrandAsset
): Promise<string> {
  
  // Brand asset fileUrl should already be a public URL from your storage
  const imageUrl = brandAsset.fileUrl;
  
  // Validate it's a proper URL
  if (!imageUrl || !imageUrl.startsWith('http')) {
    throw new Error(
      `Brand asset ${brandAsset.id} does not have a valid public URL. ` +
      `Got: "${imageUrl}". Ensure assets are stored in cloud storage with public access.`
    );
  }

  // Build motion prompt
  const motionPrompt = buildMotionPrompt(scene.visualDirection, brandAsset.assetType);

  // Generate I2V
  const result = await i2vGenerationService.generateI2V({
    imageUrl: imageUrl,  // The public URL
    prompt: motionPrompt,
    duration: scene.duration,
    provider: 'veo3',
  });

  // Wait for completion
  const videoUrl = await i2vGenerationService.waitForCompletion(result.taskId);
  
  return videoUrl;
}

function buildMotionPrompt(visualDirection: string, assetType: string): string {
  // Extract motion hints from visual direction
  const hasMotionKeywords = /pan|zoom|dolly|orbit|track|push|pull/i.test(visualDirection);
  
  if (hasMotionKeywords) {
    // Use explicit motion from visual direction
    return visualDirection;
  }
  
  // Add appropriate motion based on asset type
  const motionByType: Record<string, string> = {
    'product-hero-single': 'slow cinematic push in, product in sharp focus, soft background blur',
    'product-lifestyle': 'gentle camera movement, natural lighting shifts',
    'location-interior': 'slow pan across space, revealing details, warm ambient light',
    'location-exterior': 'gentle dolly movement, golden hour lighting',
    'service-equipment': 'orbit around equipment, professional demonstration feel',
  };
  
  const defaultMotion = motionByType[assetType] || 'subtle camera movement, cinematic feel';
  
  return `${visualDirection}. ${defaultMotion}`;
}
```

---

## Debugging Checklist

If I2V is not working, check:

1. **Is the image URL public?**
   ```bash
   # Test in terminal - should download the image
   curl -I "https://your-url.com/image.jpg"
   # Should return 200 OK
   ```

2. **Is the URL accessible from outside your network?**
   - Don't use `localhost` URLs
   - Don't use internal/private IPs
   - Don't use authenticated URLs without proper signing

3. **Is the image format correct?**
   - JPG or PNG
   - 720p or higher resolution
   - 16:9 aspect ratio (or it will be cropped)

4. **Check the console logs:**
   ```typescript
   console.log('[I2V] Image URL being sent:', imageUrl);
   ```

5. **Test with a known working image:**
   ```typescript
   // Test with a public image
   const testUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920';
   ```

---

## Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Invalid image URL" | URL is not public | Upload to S3/R2 with public access |
| "Failed to fetch image" | URL requires auth | Make bucket/file public |
| "Image too small" | Resolution < 720p | Upload higher resolution image |
| 403 Forbidden | Bucket not public | Set ACL to public-read |
| Connection timeout | URL not accessible | Check firewall/CORS settings |

---

## Summary

**The key point:** PiAPI's `image_url` parameter requires a **publicly accessible HTTP/HTTPS URL**.

Your brand assets should already have public URLs if they're stored in cloud storage. Just use `brandAsset.fileUrl` directly - no need to upload to "PiAPI storage" (there is no such thing).

```typescript
// This is all you need:
const response = await fetch('https://api.piapi.ai/api/v1/task', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.PIAPI_API_KEY,
  },
  body: JSON.stringify({
    model: 'veo3',
    task_type: 'veo3-video',
    input: {
      prompt: 'Your motion prompt here',
      image_url: brandAsset.fileUrl,  // Already a public URL!
      duration: '8s',
    },
  }),
});
```
