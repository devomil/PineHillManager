# Master Fix: Lambda Video Rendering

## Overview

This document provides the complete fix for Lambda video rendering issues. There are **3 files** to update/replace:

1. **UniversalVideoComposition.tsx** - Replace with robust version
2. **universal-video-service.ts** - Add S3 upload + fix music
3. **universal-video-routes.ts** - Add asset preparation step

---

## STEP 1: Replace Remotion Composition

Replace `remotion/UniversalVideoComposition.tsx` with the new robust version.

**Key improvements:**
- `SafeAudio` component - skips invalid audio URLs instead of crashing
- `SafeImage` component - shows gradient fallback for missing images
- `getAssetStatus()` - validates URLs before using them
- `AssetValidationSummary` - logs all asset statuses to console
- `GradientFallback` - branded backgrounds when images fail
- Debug mode toggle for troubleshooting

**Why this helps:** Instead of Lambda silently failing or producing black frames, you'll see exactly which assets are problematic and the video will still render (just with fallbacks).

---

## STEP 2: Update universal-video-service.ts

Add these capabilities:

### 2a. Install AWS SDK
```bash
npm install @aws-sdk/client-s3
```

### 2b. Add S3 Upload Method

```typescript
// Add at top of file
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Add to class properties
private s3Client: S3Client | null = null;
private s3BucketName = 'remotionlambda-useast1-refjo5giq5';

// Add to constructor
if (process.env.REMOTION_AWS_ACCESS_KEY_ID && process.env.REMOTION_AWS_SECRET_ACCESS_KEY) {
  this.s3Client = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY,
    },
  });
}

// Add new method
async uploadToS3(base64Data: string, filename: string, contentType: string): Promise<string | null> {
  if (!this.s3Client) {
    console.warn('[UniversalVideoService] S3 not configured');
    return null;
  }

  try {
    const buffer = Buffer.from(base64Data.replace(/^data:[^;]+;base64,/, ''), 'base64');
    const key = `assets/${Date.now()}-${filename}`;

    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.s3BucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    }));

    return `https://${this.s3BucketName}.s3.us-east-1.amazonaws.com/${key}`;
  } catch (error: any) {
    console.error('[UniversalVideoService] S3 upload failed:', error.message);
    return null;
  }
}
```

### 2c. Update generateVoiceover to Upload to S3

Find the line where voiceover is returned and change:
```typescript
// BEFORE
const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

// AFTER
const s3Url = await this.uploadToS3(base64Audio, `voiceover-${Date.now()}.mp3`, 'audio/mpeg');
const audioUrl = s3Url || `data:audio/mpeg;base64,${base64Audio}`;
console.log(`[UniversalVideoService] Voiceover URL type: ${s3Url ? 'S3' : 'base64 (will fail in Lambda)'}`);
```

### 2d. Fix getBackgroundMusic

Replace the method to use Pixabay's audio API:

```typescript
async getBackgroundMusic(duration: number): Promise<{ url: string; duration: number; source: string } | null> {
  const pixabayKey = process.env.PIXABAY_API_KEY;
  if (!pixabayKey) {
    console.log('[UniversalVideoService] No Pixabay key - skipping music');
    return null;
  }

  try {
    // Use Pixabay's MUSIC API, not videos
    const response = await fetch(
      `https://pixabay.com/api/?key=${pixabayKey}&q=corporate+ambient&media_type=music&per_page=5`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.hits?.length > 0) {
        // Find suitable track
        const track = data.hits.find((h: any) => h.duration >= duration * 0.8) || data.hits[0];
        if (track?.audio) {
          return {
            url: track.audio, // This is already a valid HTTPS URL
            duration: track.duration,
            source: 'pixabay',
          };
        }
      }
    }
  } catch (e) {
    console.warn('[UniversalVideoService] Pixabay music search failed:', e);
  }

  return null;
}
```

### 2e. Add Asset Preparation Method

```typescript
async prepareAssetsForLambda(project: VideoProject): Promise<VideoProject> {
  console.log('[UniversalVideoService] Preparing assets for Lambda...');
  const updated = { ...project };

  // Check voiceover
  if (updated.assets.voiceover.fullTrackUrl?.startsWith('data:')) {
    console.log('[UniversalVideoService] Re-uploading voiceover to S3...');
    const s3Url = await this.uploadToS3(
      updated.assets.voiceover.fullTrackUrl,
      'voiceover.mp3',
      'audio/mpeg'
    );
    if (s3Url) {
      updated.assets.voiceover.fullTrackUrl = s3Url;
    }
  }

  // Check scene images
  for (let i = 0; i < updated.scenes.length; i++) {
    const scene = updated.scenes[i];
    const urls = [
      { key: 'backgroundUrl', value: scene.assets?.backgroundUrl },
      { key: 'imageUrl', value: scene.assets?.imageUrl },
      { key: 'productOverlayUrl', value: scene.assets?.productOverlayUrl },
    ];

    for (const { key, value } of urls) {
      if (value && !value.startsWith('http')) {
        console.log(`[UniversalVideoService] Scene ${i} ${key} needs upload: ${value.substring(0, 40)}`);
        // Attempt to fetch and re-upload local assets
        const publicUrl = await this.uploadLocalAssetToS3(value);
        if (publicUrl && updated.scenes[i].assets) {
          (updated.scenes[i].assets as any)[key] = publicUrl;
        }
      }
    }
  }

  console.log('[UniversalVideoService] Asset preparation complete');
  return updated;
}

private async uploadLocalAssetToS3(localPath: string): Promise<string | null> {
  if (!this.s3Client) return null;

  try {
    // Try to fetch from local server
    const normalizedPath = localPath.startsWith('/') ? localPath : `/${localPath}`;
    const response = await fetch(`http://localhost:5000${normalizedPath}`);

    if (!response.ok) {
      console.warn(`[UniversalVideoService] Could not fetch local asset: ${localPath}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/png';
    const ext = contentType.includes('jpeg') ? 'jpg' : 'png';
    const key = `assets/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;

    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.s3BucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    }));

    return `https://${this.s3BucketName}.s3.us-east-1.amazonaws.com/${key}`;
  } catch (error: any) {
    console.error('[UniversalVideoService] Local asset upload failed:', error.message);
    return null;
  }
}
```

---

## STEP 3: Update universal-video-routes.ts

In the render endpoint, add asset preparation before starting the render:

```typescript
router.post('/projects/:projectId/render', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // ... existing validation code ...

    // IMPORTANT: Prepare assets for Lambda
    console.log('[UniversalVideo] Preparing assets for Lambda...');
    const preparedProject = await universalVideoService.prepareAssetsForLambda(projectData);

    // Save the prepared project
    await saveProjectToDb(preparedProject, preparedProject.ownerId);

    // Use prepared project for render
    const compositionId = getCompositionId(preparedProject.outputFormat.aspectRatio);

    const inputProps = {
      scenes: preparedProject.scenes,
      voiceoverUrl: preparedProject.assets.voiceover.fullTrackUrl || null,
      musicUrl: preparedProject.assets.music.url || null,
      musicVolume: preparedProject.assets.music.volume,
      brand: preparedProject.brand,
      outputFormat: preparedProject.outputFormat,
    };

    // Log what we're sending to Lambda
    console.log('[UniversalVideo] Render input props:');
    console.log('  - Voiceover:', inputProps.voiceoverUrl?.substring(0, 50));
    console.log('  - Music:', inputProps.musicUrl?.substring(0, 50));
    console.log('  - Scenes:', inputProps.scenes.length);

    // ... rest of existing render code ...
  }
});
```

---

## TESTING

After making these changes:

1. **Create a new 30-second product video** (shorter = faster to test)
2. **Upload a product image**
3. **Generate assets** - check console for S3 upload messages
4. **Before clicking Render**, check the console logs:
   - Voiceover URL should start with `https://remotionlambda-...`
   - Music URL should start with `https://` (Pixabay)
   - Scene images should all start with `https://`
5. **Click Render** - should complete successfully
6. **Download and verify** the video has:
   - Visible images in each scene
   - Audible voiceover
   - Background music
   - Text overlays
   - Transitions

---

## Common Issues After Fix

| Symptom | Cause | Solution |
|---------|-------|----------|
| S3 upload fails | IAM permissions | Add `s3:PutObject` and `s3:PutObjectAcl` to IAM policy |
| No music in video | Pixabay API not configured | Add `PIXABAY_API_KEY` to env |
| Local assets still failing | Server not accessible | Check `localhost:5000` is running |
| Black frames | Image URL still local | Check S3 upload logs |

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `remotion/UniversalVideoComposition.tsx` | Replace | Error handling, fallbacks |
| `server/services/universal-video-service.ts` | Modify | S3 upload, fix music |
| `server/routes/universal-video-routes.ts` | Modify | Asset preparation |
| `package.json` | Add dep | `@aws-sdk/client-s3` |
