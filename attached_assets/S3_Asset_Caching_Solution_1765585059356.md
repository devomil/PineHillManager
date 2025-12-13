# Asset Pre-Download Solution: S3-First Architecture

## Overview

**Problem:** Lambda spends most of its render time downloading external videos from Pexels/Pixabay CDNs, which are slow and unreliable.

**Solution:** Pre-download ALL external assets to S3 during asset generation. Lambda then only fetches from S3 (same AWS region = blazing fast).

```
BEFORE (Slow):
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Lambda    │────▶│   Pexels    │────▶│  Download   │  (20-50MB, 30-120s per video)
│  (Render)   │     │   Pixabay   │     │   Video     │
└─────────────┘     └─────────────┘     └─────────────┘

AFTER (Fast):
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Asset     │────▶│   Pexels    │────▶│  Upload to  │  (During generation, not render)
│ Generation  │     │   Pixabay   │     │     S3      │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Lambda    │────▶│     S3      │────▶│   Render    │  (Same region = <1s per video)
│  (Render)   │     │  (us-east-1)│     │   Video     │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## Implementation

### Step 1: Add Asset Download & Upload Methods

**File:** `server/services/universal-video-service.ts`

Add these methods to the `UniversalVideoService` class:

```typescript
/**
 * Download a file from external URL and return as Buffer
 */
private async downloadExternalFile(
  url: string, 
  timeoutMs: number = 60000
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!url || !url.startsWith('http')) {
    console.warn(`[AssetDownload] Invalid URL: ${url}`);
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    console.log(`[AssetDownload] Downloading: ${url.substring(0, 80)}...`);
    const startTime = Date.now();

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PineHillFarm-VideoProducer/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[AssetDownload] Failed (${response.status}): ${url}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    const downloadTime = Date.now() - startTime;
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
    console.log(`[AssetDownload] Complete: ${sizeMB}MB in ${downloadTime}ms`);

    return { buffer, contentType };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`[AssetDownload] Timeout after ${timeoutMs}ms: ${url}`);
    } else {
      console.warn(`[AssetDownload] Error: ${error.message}`);
    }
    return null;
  }
}

/**
 * Download external video and upload to S3
 * Returns S3 URL or null if failed
 */
private async cacheVideoToS3(
  externalUrl: string,
  sceneId: string
): Promise<string | null> {
  if (!externalUrl || !this.s3Client) {
    return null;
  }

  // Skip if already an S3 URL
  if (externalUrl.includes('s3.') && externalUrl.includes('amazonaws.com')) {
    console.log(`[CacheVideo] Already S3 URL: ${externalUrl.substring(0, 60)}`);
    return externalUrl;
  }

  try {
    console.log(`[CacheVideo] Caching video for scene ${sceneId}...`);
    const downloadResult = await this.downloadExternalFile(externalUrl, 90000); // 90s timeout for videos

    if (!downloadResult) {
      console.warn(`[CacheVideo] Download failed for scene ${sceneId}`);
      return null;
    }

    // Determine file extension from content type
    let extension = 'mp4';
    if (downloadResult.contentType.includes('webm')) {
      extension = 'webm';
    } else if (downloadResult.contentType.includes('quicktime') || downloadResult.contentType.includes('mov')) {
      extension = 'mov';
    }

    const fileName = `broll/${sceneId}_${Date.now()}.${extension}`;
    const s3Url = await this.uploadToS3(
      downloadResult.buffer,
      fileName,
      downloadResult.contentType
    );

    if (s3Url) {
      console.log(`[CacheVideo] Cached to S3: ${s3Url}`);
      return s3Url;
    }

    return null;
  } catch (error: any) {
    console.error(`[CacheVideo] Error caching video for ${sceneId}:`, error.message);
    return null;
  }
}

/**
 * Download external image and upload to S3
 * Returns S3 URL or null if failed
 */
private async cacheImageToS3(
  externalUrl: string,
  sceneId: string,
  imageType: 'background' | 'content' | 'stock' = 'background'
): Promise<string | null> {
  if (!externalUrl || !this.s3Client) {
    return null;
  }

  // Skip if already an S3 URL
  if (externalUrl.includes('s3.') && externalUrl.includes('amazonaws.com')) {
    console.log(`[CacheImage] Already S3 URL: ${externalUrl.substring(0, 60)}`);
    return externalUrl;
  }

  // Skip data URLs (need different handling)
  if (externalUrl.startsWith('data:')) {
    return null; // Will be handled by existing base64 upload logic
  }

  try {
    console.log(`[CacheImage] Caching ${imageType} image for scene ${sceneId}...`);
    const downloadResult = await this.downloadExternalFile(externalUrl, 30000); // 30s timeout for images

    if (!downloadResult) {
      console.warn(`[CacheImage] Download failed for scene ${sceneId}`);
      return null;
    }

    // Determine file extension
    let extension = 'jpg';
    if (downloadResult.contentType.includes('png')) {
      extension = 'png';
    } else if (downloadResult.contentType.includes('webp')) {
      extension = 'webp';
    }

    const fileName = `images/${imageType}_${sceneId}_${Date.now()}.${extension}`;
    const s3Url = await this.uploadToS3(
      downloadResult.buffer,
      fileName,
      downloadResult.contentType
    );

    if (s3Url) {
      console.log(`[CacheImage] Cached to S3: ${s3Url}`);
      return s3Url;
    }

    return null;
  } catch (error: any) {
    console.error(`[CacheImage] Error caching image for ${sceneId}:`, error.message);
    return null;
  }
}

/**
 * Cache all external assets to S3 for a project
 * Call this AFTER asset generation but BEFORE rendering
 */
async cacheAllAssetsToS3(project: VideoProject): Promise<{
  success: boolean;
  cachedCount: number;
  failedCount: number;
  details: string[];
}> {
  const details: string[] = [];
  let cachedCount = 0;
  let failedCount = 0;

  console.log('[CacheAssets] Starting S3 asset caching...');
  const startTime = Date.now();

  // Cache voiceover (usually already S3, but verify)
  if (project.assets.voiceover.fullTrackUrl) {
    const url = project.assets.voiceover.fullTrackUrl;
    if (!url.includes('s3.amazonaws.com') && !url.startsWith('data:')) {
      // External voiceover URL - cache it
      const downloadResult = await this.downloadExternalFile(url, 30000);
      if (downloadResult) {
        const s3Url = await this.uploadToS3(
          downloadResult.buffer,
          `voiceover/${project.id}_${Date.now()}.mp3`,
          'audio/mpeg'
        );
        if (s3Url) {
          project.assets.voiceover.fullTrackUrl = s3Url;
          cachedCount++;
          details.push(`✓ Voiceover cached to S3`);
        }
      }
    }
  }

  // Cache music
  if (project.assets.music?.url) {
    const url = project.assets.music.url;
    if (!url.includes('s3.amazonaws.com') && !url.startsWith('data:')) {
      const downloadResult = await this.downloadExternalFile(url, 60000);
      if (downloadResult) {
        const s3Url = await this.uploadToS3(
          downloadResult.buffer,
          `music/${project.id}_${Date.now()}.mp3`,
          'audio/mpeg'
        );
        if (s3Url) {
          project.assets.music.url = s3Url;
          cachedCount++;
          details.push(`✓ Music cached to S3`);
        }
      }
    }
  }

  // Cache scene assets (images and videos)
  for (let i = 0; i < project.scenes.length; i++) {
    const scene = project.scenes[i];
    
    // Cache B-roll video
    if (scene.assets?.videoUrl && scene.background?.type === 'video') {
      const s3VideoUrl = await this.cacheVideoToS3(scene.assets.videoUrl, scene.id);
      if (s3VideoUrl) {
        project.scenes[i].assets!.videoUrl = s3VideoUrl;
        cachedCount++;
        details.push(`✓ Scene ${i} video cached`);
      } else {
        // Video cache failed - fall back to image
        console.warn(`[CacheAssets] Scene ${i} video cache failed, switching to image`);
        project.scenes[i].background!.type = 'image';
        project.scenes[i].assets!.videoUrl = undefined;
        failedCount++;
        details.push(`✗ Scene ${i} video failed - using image`);
      }
    }

    // Cache background image
    if (scene.assets?.backgroundUrl) {
      const s3ImageUrl = await this.cacheImageToS3(
        scene.assets.backgroundUrl,
        scene.id,
        'background'
      );
      if (s3ImageUrl) {
        project.scenes[i].assets!.backgroundUrl = s3ImageUrl;
        project.scenes[i].assets!.imageUrl = s3ImageUrl;
        cachedCount++;
        details.push(`✓ Scene ${i} background cached`);
      } else if (!scene.assets.backgroundUrl.startsWith('data:')) {
        failedCount++;
        details.push(`✗ Scene ${i} background cache failed`);
      }
    }

    // Cache standalone image (if different from background)
    if (scene.assets?.imageUrl && scene.assets.imageUrl !== scene.assets.backgroundUrl) {
      const s3ImageUrl = await this.cacheImageToS3(
        scene.assets.imageUrl,
        scene.id,
        'content'
      );
      if (s3ImageUrl) {
        project.scenes[i].assets!.imageUrl = s3ImageUrl;
        cachedCount++;
        details.push(`✓ Scene ${i} image cached`);
      }
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[CacheAssets] Complete: ${cachedCount} cached, ${failedCount} failed in ${totalTime}s`);

  return {
    success: failedCount === 0,
    cachedCount,
    failedCount,
    details,
  };
}
```

---

### Step 2: Update Asset Generation to Include Caching

**File:** `server/services/universal-video-service.ts`

Modify `generateProjectAssets` to cache assets at the end:

```typescript
async generateProjectAssets(project: VideoProject): Promise<VideoProject> {
  const updatedProject = { ...project };
  
  // Reset video tracking for new project
  this.resetUsedVideos();
  
  // ... [ALL EXISTING ASSET GENERATION CODE STAYS THE SAME] ...
  
  // ========== NEW: CACHE ALL ASSETS TO S3 ==========
  // This happens AFTER all assets are generated but BEFORE marking ready
  console.log('[UniversalVideoService] Caching all external assets to S3...');
  updatedProject.progress.steps.assembly.status = 'in-progress';
  updatedProject.progress.steps.assembly.message = 'Caching assets to cloud storage...';
  
  const cacheResult = await this.cacheAllAssetsToS3(updatedProject);
  
  if (cacheResult.cachedCount > 0) {
    console.log(`[UniversalVideoService] Cached ${cacheResult.cachedCount} assets to S3`);
  }
  
  if (cacheResult.failedCount > 0) {
    console.warn(`[UniversalVideoService] ${cacheResult.failedCount} assets failed to cache`);
    // Add to progress warnings but don't fail the whole project
    updatedProject.progress.errors.push(
      `${cacheResult.failedCount} assets couldn't be cached - render may be slower`
    );
  }
  
  updatedProject.progress.steps.assembly.status = 'complete';
  updatedProject.progress.steps.assembly.progress = 100;
  updatedProject.progress.steps.assembly.message = 
    `Cached ${cacheResult.cachedCount} assets to S3`;
  // ========== END NEW CACHING CODE ==========

  updatedProject.status = 'ready';
  updatedProject.progress.overallPercent = 85;
  updatedProject.updatedAt = new Date().toISOString();

  return updatedProject;
}
```

---

### Step 3: Simplify `prepareAssetsForLambda`

Now that assets are pre-cached, `prepareAssetsForLambda` becomes simpler - just validation:

**File:** `server/services/universal-video-service.ts`

Update the method to just validate (remove redundant S3 upload logic since it's done during generation):

```typescript
async prepareAssetsForLambda(project: VideoProject): Promise<{
  valid: boolean;
  issues: string[];
  preparedProject: VideoProject;
}> {
  const issues: string[] = [];
  const preparedProject = JSON.parse(JSON.stringify(project)) as VideoProject;

  console.log('[UniversalVideoService] Validating assets for Lambda render...');

  // Validate brand logo
  if (preparedProject.brand?.logoUrl && !this.isValidHttpsUrl(preparedProject.brand.logoUrl)) {
    console.log(`[Validation] Invalid logo URL - disabling watermark`);
    preparedProject.brand.logoUrl = '';
  }

  // Validate voiceover
  if (!this.isValidHttpsUrl(preparedProject.assets.voiceover.fullTrackUrl)) {
    if (preparedProject.assets.voiceover.fullTrackUrl?.startsWith('data:')) {
      // Handle base64 voiceover (upload to S3)
      const match = preparedProject.assets.voiceover.fullTrackUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const buffer = Buffer.from(match[2], 'base64');
        const s3Url = await this.uploadToS3(buffer, `voiceover_${Date.now()}.mp3`, match[1]);
        if (s3Url) {
          preparedProject.assets.voiceover.fullTrackUrl = s3Url;
        } else {
          issues.push('Failed to upload voiceover');
          preparedProject.assets.voiceover.fullTrackUrl = '';
        }
      }
    } else if (preparedProject.assets.voiceover.fullTrackUrl) {
      issues.push('Invalid voiceover URL');
      preparedProject.assets.voiceover.fullTrackUrl = '';
    }
  }

  // Validate music
  if (preparedProject.assets.music?.url && !this.isValidHttpsUrl(preparedProject.assets.music.url)) {
    issues.push('Invalid music URL');
    preparedProject.assets.music = { url: '', duration: 0, volume: 0 };
  }

  // Validate scene assets
  let validScenes = 0;
  let videoSceneCount = 0;

  for (let i = 0; i < preparedProject.scenes.length; i++) {
    const scene = preparedProject.scenes[i];
    let hasValidAsset = false;

    // Check video URL
    if (scene.assets?.videoUrl) {
      if (this.isValidHttpsUrl(scene.assets.videoUrl)) {
        hasValidAsset = true;
        videoSceneCount++;
        console.log(`[Validation] Scene ${i}: Valid S3 video ✓`);
      } else {
        console.warn(`[Validation] Scene ${i}: Invalid video URL, clearing`);
        preparedProject.scenes[i].assets!.videoUrl = undefined;
        if (preparedProject.scenes[i].background?.type === 'video') {
          preparedProject.scenes[i].background!.type = 'image';
        }
      }
    }

    // Check image URLs
    if (scene.assets?.backgroundUrl && this.isValidHttpsUrl(scene.assets.backgroundUrl)) {
      hasValidAsset = true;
    }
    if (scene.assets?.imageUrl && this.isValidHttpsUrl(scene.assets.imageUrl)) {
      hasValidAsset = true;
    }

    // Check product overlay
    if (scene.assets?.productOverlayUrl) {
      if (!this.isValidHttpsUrl(scene.assets.productOverlayUrl)) {
        // Try to upload local product image
        const uploaded = await this.uploadLocalProductImage(
          scene.assets.productOverlayUrl,
          i
        );
        if (uploaded) {
          preparedProject.scenes[i].assets!.productOverlayUrl = uploaded;
        } else {
          preparedProject.scenes[i].assets!.productOverlayUrl = undefined;
          preparedProject.scenes[i].assets!.useProductOverlay = false;
        }
      }
    }

    if (hasValidAsset) {
      validScenes++;
    }
  }

  console.log(`[Validation] Results:`);
  console.log(`  - Valid scenes: ${validScenes}/${preparedProject.scenes.length}`);
  console.log(`  - Video B-roll scenes: ${videoSceneCount}`);
  console.log(`  - Voiceover: ${this.isValidHttpsUrl(preparedProject.assets.voiceover.fullTrackUrl) ? '✓' : '✗'}`);
  console.log(`  - Music: ${this.isValidHttpsUrl(preparedProject.assets.music?.url) ? '✓' : 'None'}`);
  console.log(`  - Issues: ${issues.length}`);

  return {
    valid: validScenes > 0,
    issues,
    preparedProject,
  };
}

/**
 * Helper to upload local product images to S3
 */
private async uploadLocalProductImage(localUrl: string, sceneIndex: number): Promise<string | null> {
  try {
    let buffer: Buffer | null = null;
    let contentType = 'image/png';
    
    if (localUrl.startsWith('/objects/') || localUrl.startsWith('/')) {
      const fetchUrl = `http://localhost:5000${localUrl.startsWith('/') ? localUrl : '/' + localUrl}`;
      const response = await fetch(fetchUrl);
      if (response.ok) {
        buffer = Buffer.from(await response.arrayBuffer());
        contentType = response.headers.get('content-type') || 'image/png';
      }
    } else if (localUrl.startsWith('data:')) {
      const match = localUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        contentType = match[1];
        buffer = Buffer.from(match[2], 'base64');
      }
    }
    
    if (buffer) {
      const ext = contentType.includes('png') ? 'png' : 'jpg';
      return await this.uploadToS3(buffer, `product_${sceneIndex}_${Date.now()}.${ext}`, contentType);
    }
  } catch (e: any) {
    console.error(`[UploadProduct] Scene ${sceneIndex} error:`, e.message);
  }
  return null;
}
```

---

### Step 4: Update Remotion Video Timeout (Safety Measure)

Even with S3 caching, reduce the timeout as a safety net:

**File:** `remotion/UniversalVideoComposition.tsx`

Find the `<Video>` component and update:

```typescript
{hasValidVideo ? (
  <Video
    src={videoUrl!}
    style={{
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    }}
    volume={0}
    startFrom={0}
    loop
    // REDUCED TIMEOUTS - S3 is fast, don't need long waits
    delayRenderTimeoutInMilliseconds={15000}  // 15 seconds (S3 is fast)
    delayRenderRetries={1}                     // 1 retry only
    pauseWhenBuffering={false}
  />
) : /* ... */}
```

---

### Step 5: Add Progress Feedback for Caching

**File:** Update the API route to include caching status

In your routes file, update the generate-assets endpoint:

```typescript
app.post('/api/universal-video/projects/:projectId/generate-assets', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const project = await storage.getVideoProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Generate assets (now includes S3 caching)
    const updatedProject = await universalVideoService.generateProjectAssets(project);
    
    // Save updated project
    await storage.saveVideoProject(updatedProject);
    
    // Return with caching info
    const paidServiceFailures = universalVideoService.getServiceFailures(updatedProject);
    
    return res.json({
      success: true,
      project: updatedProject,
      paidServiceFailures: paidServiceFailures.length > 0 ? paidServiceFailures : undefined,
      assetsCached: true, // Indicate assets are cached to S3
    });
  } catch (error: any) {
    console.error('[API] Generate assets error:', error);
    return res.status(500).json({ error: error.message });
  }
});
```

---

## Expected Performance Improvement

| Metric | Before (External CDN) | After (S3 Cache) |
|--------|----------------------|------------------|
| Video download during render | 30-120s per video | 1-3s per video |
| 5 B-roll videos total time | 2.5-10 minutes | 5-15 seconds |
| 44s video total render | 8+ minutes | **~1-2 minutes** |
| 90s video total render | 15+ minutes | **~2-3 minutes** |
| Render reliability | Flaky (CDN timeouts) | Stable (S3 same region) |

---

## Summary of Changes

| File | Change |
|------|--------|
| `universal-video-service.ts` | Add `downloadExternalFile`, `cacheVideoToS3`, `cacheImageToS3`, `cacheAllAssetsToS3` methods |
| `universal-video-service.ts` | Update `generateProjectAssets` to call `cacheAllAssetsToS3` at the end |
| `universal-video-service.ts` | Simplify `prepareAssetsForLambda` (now just validation) |
| `UniversalVideoComposition.tsx` | Reduce video timeout to 15s, retries to 1 |
| API routes | Return `assetsCached: true` flag |

---

## Message for Replit Agent

> "Please implement the S3 asset caching solution from the attached document. The key changes are:
>
> 1. Add new methods to `universal-video-service.ts`:
>    - `downloadExternalFile()` - downloads any URL to buffer
>    - `cacheVideoToS3()` - downloads video and uploads to S3
>    - `cacheImageToS3()` - downloads image and uploads to S3
>    - `cacheAllAssetsToS3()` - caches all project assets before render
>
> 2. Update `generateProjectAssets()` to call `cacheAllAssetsToS3()` at the end (before marking 'ready')
>
> 3. Simplify `prepareAssetsForLambda()` to just validation
>
> 4. In `UniversalVideoComposition.tsx`, reduce video timeout from 120000 to 15000ms and retries from 3 to 1
>
> This pre-downloads all external videos/images to S3 during asset generation, so Lambda only fetches from fast S3 URLs during render."
