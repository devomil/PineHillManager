# Replit Agent Instructions: Fix Lambda Video Rendering

## CRITICAL ISSUES TO FIX

The video production system has the following issues preventing successful Lambda rendering:

---

## ISSUE 1: Audio URLs Are Base64 Data URLs (Lambda Can't Use These)

**Problem:** Voiceover and music are stored as `data:audio/mpeg;base64,...` strings. Remotion Lambda cannot render videos with base64 data URLs - it needs publicly accessible HTTP URLs.

**Solution:** Upload audio to S3 after generation.

### Fix in `server/services/universal-video-service.ts`:

```typescript
// Add this import at the top
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Add S3 client initialization in constructor
private s3Client: S3Client | null = null;
private bucketName = 'remotionlambda-useast1-refjo5giq5'; // Use existing bucket

constructor() {
  if (process.env.ANTHROPIC_API_KEY) {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  // Initialize S3 client for asset uploads
  if (process.env.REMOTION_AWS_ACCESS_KEY_ID && process.env.REMOTION_AWS_SECRET_ACCESS_KEY) {
    this.s3Client = new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY,
      },
    });
  }
}

// Add this new method to upload assets to S3
async uploadAssetToS3(
  base64Data: string, 
  fileName: string, 
  contentType: string
): Promise<string | null> {
  if (!this.s3Client) {
    console.warn('[UniversalVideoService] S3 client not configured - cannot upload asset');
    return null;
  }

  try {
    // Remove data URL prefix if present
    const base64Content = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Content, 'base64');

    const key = `assets/${Date.now()}-${fileName}`;

    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    }));

    const publicUrl = `https://${this.bucketName}.s3.us-east-1.amazonaws.com/${key}`;
    console.log(`[UniversalVideoService] Uploaded asset to S3: ${publicUrl}`);
    return publicUrl;
  } catch (error: any) {
    console.error('[UniversalVideoService] S3 upload failed:', error.message);
    return null;
  }
}
```

### Update the `generateVoiceover` method to upload to S3:

```typescript
async generateVoiceover(text: string, voiceId?: string): Promise<VoiceoverResult> {
  // ... existing ElevenLabs API call code ...

  if (response.ok) {
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    // Upload to S3 for Lambda access
    const s3Url = await this.uploadAssetToS3(
      base64Audio,
      `voiceover-${Date.now()}.mp3`,
      'audio/mpeg'
    );

    // Use S3 URL if available, otherwise fall back to base64 (won't work in Lambda)
    const audioUrl = s3Url || `data:audio/mpeg;base64,${base64Audio}`;

    const wordCount = text.split(/\s+/).length;
    const estimatedDuration = Math.ceil(wordCount / 2.5);

    console.log(`[UniversalVideoService] Voiceover generated successfully (${estimatedDuration}s)`);
    console.log(`[UniversalVideoService] Audio URL type: ${s3Url ? 'S3' : 'base64'}`);

    return {
      url: audioUrl,
      duration: estimatedDuration,
      success: true,
    };
  }
  // ... rest of error handling ...
}
```

---

## ISSUE 2: Music Service Returns Video URLs, Not Audio

**Problem:** `getBackgroundMusic()` searches Pexels for videos containing music keywords. This returns video files, not audio tracks that Remotion can use.

**Solution:** Use a proper royalty-free music API or embed music files. For now, let's use Pixabay's audio API or generate with ElevenLabs.

### Replace `getBackgroundMusic` method:

```typescript
async getBackgroundMusic(duration: number, style?: string): Promise<{ url: string; duration: number; source: string } | null> {
  // Option 1: Try ElevenLabs music generation (if available on your plan)
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (elevenLabsKey) {
    try {
      console.log('[UniversalVideoService] Generating background music with ElevenLabs...');

      const musicPrompt = this.getMusicPromptForStyle(style);
      const durationMs = Math.min(duration * 1000, 120000); // Max 2 minutes

      const response = await fetch(
        'https://api.elevenlabs.io/v1/sound-generation',
        {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: musicPrompt,
            duration_seconds: Math.min(duration, 22), // ElevenLabs limit
            prompt_influence: 0.3,
          }),
        }
      );

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');

        // Upload to S3
        const s3Url = await this.uploadAssetToS3(
          base64Audio,
          `music-${Date.now()}.mp3`,
          'audio/mpeg'
        );

        if (s3Url) {
          console.log('[UniversalVideoService] Background music generated and uploaded');
          return {
            url: s3Url,
            duration: duration,
            source: 'elevenlabs',
          };
        }
      }
    } catch (e) {
      console.warn('[UniversalVideoService] ElevenLabs music generation failed:', e);
    }
  }

  // Option 2: Use Pixabay audio API (free, royalty-free)
  const pixabayKey = process.env.PIXABAY_API_KEY;
  if (pixabayKey) {
    try {
      const searchTerms = this.getMusicSearchTerms(style);
      const response = await fetch(
        `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(searchTerms)}&media_type=music&per_page=5`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.hits && data.hits.length > 0) {
          // Find a track with suitable duration
          const suitable = data.hits.find((hit: any) => hit.duration >= duration * 0.8) || data.hits[0];
          if (suitable?.audio) {
            console.log('[UniversalVideoService] Found Pixabay music track');
            return {
              url: suitable.audio,
              duration: suitable.duration,
              source: 'pixabay',
            };
          }
        }
      }
    } catch (e) {
      console.warn('[UniversalVideoService] Pixabay music search failed:', e);
    }
  }

  // Option 3: Use a bundled default track (upload a royalty-free track to S3)
  console.log('[UniversalVideoService] No music API available - video will render without background music');
  return null;
}

private getMusicPromptForStyle(style?: string): string {
  const prompts: Record<string, string> = {
    professional: 'calm corporate background music, ambient, no vocals',
    friendly: 'uplifting acoustic guitar, warm, friendly background music',
    energetic: 'upbeat electronic music, motivational, energetic',
    calm: 'peaceful ambient music, meditation, relaxing piano',
    cinematic: 'epic cinematic orchestral music, inspiring',
    documentary: 'thoughtful documentary background music, subtle strings',
  };
  return prompts[style || 'professional'] || prompts.professional;
}

private getMusicSearchTerms(style?: string): string {
  const terms: Record<string, string> = {
    professional: 'corporate ambient background',
    friendly: 'uplifting acoustic happy',
    energetic: 'upbeat electronic motivational',
    calm: 'relaxing meditation piano',
    cinematic: 'cinematic epic orchestral',
    documentary: 'documentary thoughtful background',
  };
  return terms[style || 'professional'] || 'ambient background corporate';
}
```

---

## ISSUE 3: Product Images Use Local Paths

**Problem:** Product images uploaded to Replit's object storage have paths like `/objects/replit-objstore-...` which aren't accessible from AWS Lambda.

**Solution:** Re-upload product images to S3 before rendering, or ensure they have public URLs.

### Add method to ensure assets are Lambda-accessible:

```typescript
async ensureAssetsAccessibleFromLambda(project: VideoProject): Promise<VideoProject> {
  const updatedProject = { ...project };

  // Process all scene images
  for (let i = 0; i < updatedProject.scenes.length; i++) {
    const scene = updatedProject.scenes[i];

    // Check background image
    if (scene.assets?.backgroundUrl && !scene.assets.backgroundUrl.startsWith('http')) {
      const publicUrl = await this.uploadLocalAssetToS3(scene.assets.backgroundUrl, 'image');
      if (publicUrl) {
        updatedProject.scenes[i].assets!.backgroundUrl = publicUrl;
      }
    }

    // Check product overlay
    if (scene.assets?.productOverlayUrl && !scene.assets.productOverlayUrl.startsWith('http')) {
      const publicUrl = await this.uploadLocalAssetToS3(scene.assets.productOverlayUrl, 'image');
      if (publicUrl) {
        updatedProject.scenes[i].assets!.productOverlayUrl = publicUrl;
      }
    }

    // Check image URL
    if (scene.assets?.imageUrl && !scene.assets.imageUrl.startsWith('http')) {
      const publicUrl = await this.uploadLocalAssetToS3(scene.assets.imageUrl, 'image');
      if (publicUrl) {
        updatedProject.scenes[i].assets!.imageUrl = publicUrl;
      }
    }
  }

  // Process product images in assets
  for (let i = 0; i < updatedProject.assets.productImages.length; i++) {
    const img = updatedProject.assets.productImages[i];
    if (!img.url.startsWith('http')) {
      const publicUrl = await this.uploadLocalAssetToS3(img.url, 'image');
      if (publicUrl) {
        updatedProject.assets.productImages[i].url = publicUrl;
      }
    }
  }

  console.log('[UniversalVideoService] Assets prepared for Lambda rendering');
  return updatedProject;
}

private async uploadLocalAssetToS3(localPath: string, type: 'image' | 'audio'): Promise<string | null> {
  if (!this.s3Client) {
    console.warn('[UniversalVideoService] S3 not configured - cannot upload local asset');
    return null;
  }

  try {
    // Fetch the asset from local storage
    const normalizedPath = localPath.startsWith('/') ? localPath : `/${localPath}`;
    const localUrl = `http://localhost:5000${normalizedPath}`;

    const response = await fetch(localUrl);
    if (!response.ok) {
      console.warn(`[UniversalVideoService] Failed to fetch local asset: ${localPath}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 
                       (type === 'image' ? 'image/png' : 'audio/mpeg');

    const extension = contentType.includes('jpeg') ? 'jpg' : 
                     contentType.includes('png') ? 'png' : 
                     contentType.includes('mp3') ? 'mp3' : 'bin';

    const key = `assets/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${extension}`;

    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    }));

    const publicUrl = `https://${this.bucketName}.s3.us-east-1.amazonaws.com/${key}`;
    console.log(`[UniversalVideoService] Uploaded local asset to S3: ${publicUrl}`);
    return publicUrl;
  } catch (error: any) {
    console.error('[UniversalVideoService] Failed to upload local asset:', error.message);
    return null;
  }
}
```

### Call this before rendering in `universal-video-routes.ts`:

```typescript
router.post('/projects/:projectId/render', isAuthenticated, async (req: Request, res: Response) => {
  // ... existing validation code ...

  // IMPORTANT: Prepare assets for Lambda before rendering
  console.log('[UniversalVideo] Preparing assets for Lambda rendering...');
  const preparedProject = await universalVideoService.ensureAssetsAccessibleFromLambda(projectData);

  // Update the project with Lambda-accessible URLs
  await saveProjectToDb(preparedProject, preparedProject.ownerId);

  // Now start the render with the prepared project
  const compositionId = getCompositionId(preparedProject.outputFormat.aspectRatio);

  const inputProps = {
    scenes: preparedProject.scenes,
    voiceoverUrl: preparedProject.assets.voiceover.fullTrackUrl || null,
    musicUrl: preparedProject.assets.music.url || null,
    musicVolume: preparedProject.assets.music.volume,
    brand: preparedProject.brand,
    outputFormat: preparedProject.outputFormat,
  };

  // ... rest of render code ...
});
```

---

## ISSUE 4: Add Better Error Logging for Lambda Renders

**Problem:** When Lambda fails, we don't get detailed error information.

### Update `remotion-lambda-service.ts` to capture more details:

```typescript
async startRender(params: {
  compositionId: string;
  inputProps: Record<string, any>;
  codec?: "h264" | "h265" | "vp8" | "vp9";
  imageFormat?: "jpeg" | "png";
}): Promise<RenderResult> {
  this.getAwsCredentials();

  console.log(`[Remotion Lambda] Starting render for ${params.compositionId}...`);
  console.log(`[Remotion Lambda] Function: ${this.functionName}`);
  console.log(`[Remotion Lambda] ServeUrl: ${this.serveUrl}`);

  // Log asset URLs for debugging
  const props = params.inputProps;
  console.log(`[Remotion Lambda] Voiceover URL: ${props.voiceoverUrl ? 'provided' : 'none'}`);
  console.log(`[Remotion Lambda] Music URL: ${props.musicUrl ? 'provided' : 'none'}`);
  console.log(`[Remotion Lambda] Scene count: ${props.scenes?.length || 0}`);

  // Validate URLs before sending to Lambda
  if (props.voiceoverUrl && props.voiceoverUrl.startsWith('data:')) {
    console.error('[Remotion Lambda] ERROR: Voiceover is still a data URL - Lambda cannot render this!');
    throw new Error('Voiceover must be uploaded to S3 before rendering. Data URLs are not supported by Lambda.');
  }

  if (props.musicUrl && props.musicUrl.startsWith('data:')) {
    console.error('[Remotion Lambda] ERROR: Music is still a data URL - Lambda cannot render this!');
    throw new Error('Music must be uploaded to S3 before rendering. Data URLs are not supported by Lambda.');
  }

  // Check scene images
  for (const scene of props.scenes || []) {
    const imageUrl = scene.assets?.backgroundUrl || scene.assets?.imageUrl;
    if (imageUrl && !imageUrl.startsWith('http')) {
      console.error(`[Remotion Lambda] ERROR: Scene ${scene.id} has non-HTTP image URL: ${imageUrl}`);
      throw new Error(`Scene images must be publicly accessible URLs. Scene ${scene.id} has invalid URL.`);
    }
  }

  try {
    const result = await renderMediaOnLambda({
      region: REGION,
      functionName: this.functionName,
      serveUrl: this.serveUrl,
      composition: params.compositionId,
      inputProps: params.inputProps,
      codec: params.codec || "h264",
      imageFormat: params.imageFormat || "jpeg",
      maxRetries: 2,
      privacy: "public",
      framesPerLambda: 40, // Reduced for better reliability
      concurrencyPerLambda: 1,
      timeoutInMilliseconds: 180000, // 3 minute timeout
      downloadBehavior: {
        type: "download",
        fileName: `${params.compositionId}-${Date.now()}.mp4`,
      },
    });

    console.log(`[Remotion Lambda] Render started: ${result.renderId}`);
    return {
      renderId: result.renderId,
      bucketName: result.bucketName,
    };
  } catch (error: any) {
    console.error("[Remotion Lambda] Render failed to start:", error);
    console.error("[Remotion Lambda] Error details:", JSON.stringify(error, null, 2));
    throw error;
  }
}
```

---

## ISSUE 5: Add npm Package for S3

You need to install the AWS SDK for S3 operations:

```bash
npm install @aws-sdk/client-s3
```

---

## TESTING CHECKLIST

After implementing these fixes:

1. [ ] Create a new product video project
2. [ ] Upload a product image
3. [ ] Generate assets - check logs for "Uploaded to S3" messages
4. [ ] Verify voiceover URL starts with `https://` not `data:`
5. [ ] Verify all scene image URLs start with `https://`
6. [ ] Start render - should not fail with data URL errors
7. [ ] Monitor render progress - should complete within 2-3 minutes for 60s video
8. [ ] Download and verify final video has:
   - [ ] All scene images
   - [ ] Voiceover audio
   - [ ] Background music (if available)
   - [ ] Text overlays
   - [ ] Smooth transitions

---

## PRIORITY ORDER

1. **First:** Install `@aws-sdk/client-s3` and add S3 upload methods
2. **Second:** Update voiceover generation to upload to S3
3. **Third:** Add asset preparation before rendering
4. **Fourth:** Add validation in Lambda service to catch data URLs early
5. **Fifth:** Fix music selection to use proper audio API
6. **Sixth:** Test end-to-end with a simple 30-second product video

Start with a 30-second video to test the pipeline before attempting longer videos.
