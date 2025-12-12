# Video Studio - Backend Data Flow Fixes

## Problem Summary

The Remotion composition has the correct logic, but the **backend isn't populating the fields** that control behavior:

| Issue | Frontend Expects | Backend Provides | Result |
|-------|------------------|------------------|--------|
| Product position | `scene.assets.productOverlayPosition` | Nothing (undefined) | Defaults to CENTER |
| Video vs Image | `scene.background.type = 'image'` | Always sets `'video'` | AI images ignored |
| Gender validation | N/A | Demographics in query only | Wrong gender returned |
| Music mood | Uplifting params | Default/sad params | Wrong mood |

---

## Fix 1: Set Product Overlay Position in Backend

**File: `server/services/universal-video-service.ts`**

Find where scenes are created/populated (likely in a function like `generateSceneAssets`, `populateSceneAssets`, `buildScene`, or similar). Search for where `scene.assets` is set.

```bash
grep -n "scene.assets\s*=" server/services/universal-video-service.ts | head -20
grep -n "assets.*imageUrl\|assets.*videoUrl" server/services/universal-video-service.ts | head -20
```

**Add this function** (if it doesn't exist):

```typescript
private getProductOverlayPosition(sceneType: string): {
  x: 'left' | 'center' | 'right';
  y: 'top' | 'center' | 'bottom';
  scale: number;
  animation: 'fade' | 'zoom' | 'slide' | 'none';
} {
  // Position products in corners to avoid blocking faces
  switch (sceneType) {
    case 'hook':
      return { x: 'right', y: 'bottom', scale: 0.25, animation: 'fade' };
    case 'intro':
      // Intro typically has product-focused background, center is OK
      return { x: 'center', y: 'center', scale: 0.45, animation: 'zoom' };
    case 'feature':
      return { x: 'left', y: 'bottom', scale: 0.30, animation: 'slide' };
    case 'benefit':
      return { x: 'right', y: 'bottom', scale: 0.25, animation: 'fade' };
    case 'cta':
      return { x: 'center', y: 'center', scale: 0.50, animation: 'zoom' };
    case 'testimonial':
      return { x: 'left', y: 'bottom', scale: 0.20, animation: 'fade' };
    default:
      return { x: 'right', y: 'bottom', scale: 0.25, animation: 'fade' };
  }
}
```

**Then, where scene assets are populated, ADD:**

```typescript
// After setting other scene.assets properties:
scene.assets.productOverlayPosition = this.getProductOverlayPosition(scene.type);
```

Look for code like this and add the position:

```typescript
// FIND code that looks like:
scene.assets = {
  imageUrl: result.imageUrl,
  videoUrl: result.videoUrl,
  // ... other properties
};

// CHANGE TO:
scene.assets = {
  imageUrl: result.imageUrl,
  videoUrl: result.videoUrl,
  productOverlayPosition: this.getProductOverlayPosition(scene.type),  // ADD THIS
  // ... other properties
};
```

---

## Fix 2: Control Video vs Image Selection

The backend is setting `scene.background.type = 'video'` for all scenes. We need to be smarter about when to use video vs AI images.

**Find where `background.type` is set:**

```bash
grep -n "background.type\|background.*type" server/services/universal-video-service.ts | head -20
grep -n "type.*video\|type.*image" server/services/universal-video-service.ts | head -30
```

**Replace the logic with this smarter approach:**

```typescript
/**
 * Determine whether to use video or image for a scene
 * Returns 'image' for scenes where AI image quality is better than random B-roll
 */
private shouldUseVideoBackground(
  scene: Scene, 
  videoResult: { url: string; tags?: string; description?: string } | null,
  targetAudience?: string
): boolean {
  // No video available - use image
  if (!videoResult || !videoResult.url) {
    console.log(`[Background] Scene ${scene.id}: No video available, using image`);
    return false;
  }
  
  // Validate video content matches target audience
  if (targetAudience) {
    const isWomensProduct = targetAudience.toLowerCase().includes('women') || 
                            targetAudience.toLowerCase().includes('female');
    
    if (isWomensProduct && videoResult.tags) {
      const tags = videoResult.tags.toLowerCase();
      // Reject if video shows wrong gender
      if (tags.includes('man') || tags.includes('male') || tags.includes('boy')) {
        console.log(`[Background] Scene ${scene.id}: Rejected video - wrong gender for women's product`);
        return false;
      }
    }
  }
  
  // For certain scene types, prefer curated AI images over random B-roll
  const preferImageSceneTypes = ['intro', 'cta'];  // Product-focused scenes
  if (preferImageSceneTypes.includes(scene.type)) {
    console.log(`[Background] Scene ${scene.id}: Prefer image for ${scene.type} scene`);
    return false;
  }
  
  // Video passed validation
  console.log(`[Background] Scene ${scene.id}: Using validated video`);
  return true;
}
```

**Then update where background type is set:**

```typescript
// FIND code like:
scene.background = {
  type: 'video',
  source: videoUrl
};

// CHANGE TO:
const useVideo = this.shouldUseVideoBackground(scene, videoResult, project.targetAudience);
scene.background = {
  type: useVideo ? 'video' : 'image',
  source: useVideo ? videoResult.url : scene.assets?.imageUrl || scene.assets?.backgroundUrl
};

// Also set the preference flag for Remotion
scene.assets.preferVideo = useVideo;
scene.assets.preferImage = !useVideo;
```

---

## Fix 3: Validate Stock Video Results

The demographics are in the query, but Pexels/Pixabay might ignore them. Add validation AFTER getting results.

**Find the `getStockVideo` function and add validation:**

```typescript
async getStockVideo(
  query: string, 
  targetAudience?: string  // ADD this parameter
): Promise<{ url: string; duration: number; source: string; tags?: string } | null> {
  
  // ... existing search code ...
  
  // AFTER getting results, before returning:
  if (result && targetAudience) {
    const isValid = this.validateVideoForAudience(result, targetAudience);
    if (!isValid) {
      console.log(`[StockVideo] Result rejected for audience mismatch, trying next...`);
      // Try to get next result, or return null
      return null;
    }
  }
  
  return result;
}

/**
 * Validate that video content matches target audience
 */
private validateVideoForAudience(
  video: { tags?: string; description?: string; url: string },
  targetAudience: string
): boolean {
  const audience = targetAudience.toLowerCase();
  const tags = (video.tags || '').toLowerCase();
  const desc = (video.description || '').toLowerCase();
  const combined = `${tags} ${desc}`;
  
  // For women's health products
  if (audience.includes('women') || audience.includes('female')) {
    // REJECT if clearly shows men/boys
    if (combined.includes(' man ') || combined.includes(' male ') || 
        combined.includes(' boy ') || combined.includes('businessman')) {
      console.log(`[Validation] Rejected: Male content for women's product`);
      return false;
    }
    
    // WARN if no indication of woman (but don't reject - might be nature/abstract)
    if (!combined.includes('woman') && !combined.includes('female') && 
        !combined.includes('girl') && !combined.includes('lady')) {
      console.log(`[Validation] Warning: No female indicators, but allowing`);
    }
  }
  
  // For mature audience
  if (audience.includes('40') || audience.includes('50') || audience.includes('mature')) {
    // REJECT if clearly shows children/teens
    if (combined.includes('child') || combined.includes('kid') || 
        combined.includes('teen') || combined.includes('baby')) {
      console.log(`[Validation] Rejected: Youth content for mature audience`);
      return false;
    }
  }
  
  return true;
}
```

**IMPORTANT:** Update all calls to `getStockVideo` to pass `targetAudience`:

```bash
# Find all calls to getStockVideo
grep -n "getStockVideo(" server/services/universal-video-service.ts
```

Change from:
```typescript
const video = await this.getStockVideo(query);
```

To:
```typescript
const video = await this.getStockVideo(query, project.targetAudience);
```

---

## Fix 4: Music Mood Parameters

Find where music is generated and ensure uplifting parameters:

```bash
grep -n "generateMusic\|elevenlabs.*music\|music.*prompt" server/services/universal-video-service.ts | head -20
```

**Update the music generation to specify mood:**

```typescript
async generateBackgroundMusic(
  durationSeconds: number,
  style?: string,
  productName?: string
): Promise<{ url: string; duration: number }> {
  
  // Build an uplifting, positive prompt
  const musicPrompt = `
    uplifting inspiring wellness commercial music,
    positive hopeful energy,
    modern light corporate,
    gentle motivational,
    ${style || 'soft piano and strings'},
    ${productName ? `for ${productName} advertisement` : 'health product commercial'}
  `.trim().replace(/\s+/g, ' ');
  
  console.log(`[Music] Generating with prompt: ${musicPrompt.substring(0, 80)}...`);
  
  // ... rest of API call with this prompt
}
```

---

## Fix 5: Verify Pronunciation Fix is Actually Called

The preprocessing function exists, but we need to verify it's being called. Add prominent logging:

**Find line ~999 where it's supposedly called:**

```typescript
// Should look like:
const processedText = this.preprocessNarrationForTTS(fullNarration);

// Add VERY visible logging:
console.log('='.repeat(60));
console.log('[TTS] PRONUNCIATION PREPROCESSING');
console.log('[TTS] Original (first 100 chars):', fullNarration.substring(0, 100));
console.log('[TTS] Processed (first 100 chars):', processedText.substring(0, 100));
console.log('[TTS] Contains "cohosh"?:', fullNarration.includes('cohosh'));
console.log('[TTS] After processing contains "koh-hosh"?:', processedText.includes('koh-hosh'));
console.log('='.repeat(60));
```

After generating a new video, check the server logs for this output. If you don't see it, the function isn't being called.

---

## Fix 6: Clear Cache and Force Regeneration

The old video may be cached. To ensure fresh generation:

1. **Delete any cached video files** related to this project
2. **Clear the project's `scenes` array** and regenerate
3. **Restart the server** to ensure new code is loaded

```bash
# Restart the server
npm run dev
# or
pkill node && npm run dev
```

---

## Testing Checklist

After applying fixes, generate a **NEW** video project (don't reuse old one):

### Product Position
- [ ] Check server logs for: `getProductOverlayPosition` being called
- [ ] Verify `scene.assets.productOverlayPosition` is set (not undefined)
- [ ] In rendered video: products appear in corners, not center

### Video vs Image
- [ ] Check logs for: `[Background] Scene X: Using validated video` or `using image`
- [ ] Scenes with people show correct demographic (women for menopause)
- [ ] AI-generated images are used for intro/CTA scenes

### Stock Video Validation
- [ ] Check logs for: `[Validation] Rejected:` when wrong content found
- [ ] No male subjects in women's health videos
- [ ] No children in mature audience videos

### Music
- [ ] Check logs for music prompt containing "uplifting"
- [ ] Listen to output - should be positive/hopeful, not sad

### Pronunciation
- [ ] Check logs for the `=====` separator and preprocessing output
- [ ] Verify "cohosh" → "koh-hosh" in processed text
- [ ] Listen to voiceover - should pronounce correctly

---

## Summary of Changes

| File | Line(s) | Change |
|------|---------|--------|
| `universal-video-service.ts` | New function | Add `getProductOverlayPosition()` |
| `universal-video-service.ts` | Where assets are set | Add `productOverlayPosition` to scene.assets |
| `universal-video-service.ts` | New function | Add `shouldUseVideoBackground()` |
| `universal-video-service.ts` | Where background is set | Use smart video/image selection |
| `universal-video-service.ts` | `getStockVideo()` | Add `targetAudience` param + validation |
| `universal-video-service.ts` | New function | Add `validateVideoForAudience()` |
| `universal-video-service.ts` | All `getStockVideo` calls | Pass `targetAudience` |
| `universal-video-service.ts` | Music generation | Update prompt to "uplifting" |
| `universal-video-service.ts` | TTS preprocessing | Add verbose logging |

---

## After Applying Fixes

1. Restart the server
2. Create a NEW video project (don't reuse existing)
3. Check server logs during generation
4. Watch the rendered video
5. Report back with:
   - Any error messages
   - Whether logs show the new functions being called
   - Screenshots of the new video
