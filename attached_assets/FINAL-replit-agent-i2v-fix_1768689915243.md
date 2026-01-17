# Replit Agent Prompt: Fix I2V Video Quality

## Problem

I2V (image-to-video) generations have two issues:
1. Product labels get distorted (poor fidelity)
2. Product appears "pasted on" instead of naturally integrated (overlay effect)

## Root Causes

1. **Prompt sanitization** adds "Do not include any text, logos..." which tells the AI to remove existing content from the source image
2. **Veo parameters** don't match PiAPI Workspace (we use 1080p, workspace uses 720p)
3. **Unnecessary S3 re-upload** - Replit storage already has public GCS URLs

---

## CHANGE 1: Skip Prompt Sanitization for I2V

**File:** `server/services/piapi-video-service.ts`

**Find the `generateImageToVideo` method (around line 618) and look for:**
```typescript
const sanitized = sanitizePromptForAI(options.prompt, 'video');
const sanitizedPrompt = enhancePromptForProvider(sanitized.cleanPrompt, options.model);
```

**Replace with:**
```typescript
// ============================================================
// CRITICAL: DO NOT sanitize prompt for I2V
// ============================================================
// For I2V, the image ALREADY contains text/logos (product labels).
// The sanitizer adds "Do not include any text, logos..." which
// causes the AI to try to REMOVE existing content from the image!
//
// Sanitization is only needed for T2V (text-to-video) where we
// want to prevent the AI from rendering text poorly.
// ============================================================

const promptForI2V = options.prompt.trim();

console.log(`[PiAPI:${options.model}] ========== I2V GENERATION ==========`);
console.log(`[PiAPI:${options.model}] Using ORIGINAL prompt (no sanitization)`);
console.log(`[PiAPI:${options.model}] Prompt: ${promptForI2V.substring(0, 100)}...`);
```

**Then update the `buildI2VRequestBody` call to pass the original prompt:**
```typescript
const requestBody = this.buildI2VRequestBody(options, promptForI2V);
```

---

## CHANGE 2: Fix Veo Parameters

**File:** `server/services/piapi-video-service.ts`

**In the `buildI2VRequestBody` method, find the Veo section (around line 720):**

```typescript
if (options.model.includes('veo')) {
```

**Update the return statement to match PiAPI Workspace:**
```typescript
if (options.model.includes('veo')) {
  let veoModel = 'veo3';
  let taskType = 'veo3-video';

  if (options.model.includes('veo-3.1') || options.model.includes('veo3.1')) {
    veoModel = 'veo3.1';
    taskType = 'veo3.1-video';
  } else if (options.model.includes('veo-2') || options.model.includes('veo2')) {
    veoModel = 'veo2';
    taskType = 'veo2-video';
  }

  console.log(`[PiAPI I2V] Veo ${veoModel}: Using workspace-matched parameters`);
  console.log(`[PiAPI I2V] resolution=720p, generate_audio=true`);

  return {
    model: veoModel,
    task_type: taskType,
    input: {
      prompt: sanitizedPrompt,      // This is now the ORIGINAL prompt
      image_url: options.imageUrl,
      aspect_ratio: options.aspectRatio || '16:9',
      duration: `${Math.min(options.duration, 8)}s`,
      resolution: '720p',           // ← CHANGED from 1080p
      generate_audio: true,         // ← CHANGED from false
    },
  };
}
```

---

## CHANGE 3: Use Direct GCS URL (Simplify Image URL)

**File:** `server/routes/universal-video-routes.ts`

**Find the `getPublicUrlForBrandAsset` function (around line 72) and replace it entirely:**

```typescript
/**
 * Convert relative brand asset URL to public URL for external video providers.
 * 
 * SIMPLIFIED: Replit Object Storage buckets are publicly accessible via
 * Google Cloud Storage URLs. No need to re-upload to S3!
 */
async function getPublicUrlForBrandAsset(relativeUrl: string): Promise<string | null> {
  if (!relativeUrl || !relativeUrl.startsWith('/api/brand-assets/file/')) {
    // Already a public URL or invalid
    if (relativeUrl?.startsWith('http')) {
      return relativeUrl;
    }
    return null;
  }
  
  try {
    const assetId = parseInt(relativeUrl.split('/').pop() || '0');
    if (isNaN(assetId) || assetId <= 0) {
      console.log('[PublicURL] Invalid asset ID from URL:', relativeUrl);
      return null;
    }
    
    // Get brand asset from database
    const [asset] = await db.select().from(brandAssets).where(eq(brandAssets.id, assetId));
    if (!asset) {
      console.log('[PublicURL] Asset not found for ID:', assetId);
      return null;
    }
    
    // Get storage path from settings
    const settings = asset.settings as any;
    const storagePath = settings?.storagePath;
    if (!storagePath) {
      console.log('[PublicURL] No storage path for asset:', assetId);
      return null;
    }
    
    // Parse storage path: "bucketName|objectPath"
    // Example: "replit-objstore-e7608b42-dd17-4fa0-b91a-353d6c8006bd|public/uploads/1768606259330_high_res_black.png"
    const [bucketName, objectPath] = storagePath.split('|');
    if (!bucketName || !objectPath) {
      console.log('[PublicURL] Invalid storage path format:', storagePath);
      return null;
    }
    
    // Construct direct GCS public URL (no upload needed!)
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectPath}`;
    console.log('[PublicURL] Using direct GCS URL:', publicUrl);
    return publicUrl;
    
  } catch (error) {
    console.error('[PublicURL] Error generating public URL:', error);
    return null;
  }
}
```

**You can now DELETE the S3 upload code** that was in this function (the S3Client, PutObjectCommand, etc.) since it's no longer needed.

---

## CHANGE 4: Add Request Logging (Optional but Helpful)

**File:** `server/services/piapi-video-service.ts`

**After building the request body in `generateImageToVideo`, add logging:**

```typescript
const requestBody = this.buildI2VRequestBody(options, promptForI2V);

// Log full request for debugging
console.log(`[PiAPI:${options.model}] ====== I2V REQUEST BODY ======`);
console.log(JSON.stringify(requestBody, null, 2));
console.log(`[PiAPI:${options.model}] ==============================`);
```

---

## Testing After Implementation

1. Go to Scene Editor with a product image selected
2. Click "Generate with Google Veo 3.1"
3. Check server logs for:
   ```
   [PiAPI:veo3.1] ========== I2V GENERATION ==========
   [PiAPI:veo3.1] Using ORIGINAL prompt (no sanitization)
   [PiAPI:veo3.1] Prompt: Warm sunlit wellness space...pine hill farm...
   [PublicURL] Using direct GCS URL: https://storage.googleapis.com/replit-objstore-...
   [PiAPI I2V] Veo veo3.1: resolution=720p, generate_audio=true
   ```
4. Verify the generated video:
   - ✅ Product labels are readable and preserved
   - ✅ Product is naturally integrated into the scene

---

## Summary of Changes

| File | Change |
|------|--------|
| `piapi-video-service.ts` | Skip prompt sanitization for I2V |
| `piapi-video-service.ts` | Update Veo params: 720p, generate_audio=true |
| `universal-video-routes.ts` | Use direct GCS URL instead of S3 upload |

---

## If Results Still Have Overlay Effect

If after these changes the product still appears "overlaid" instead of naturally integrated, we may need to upload to PiAPI's storage. Let me know and I'll provide the additional code to:

1. Upload images to `https://upload.theapi.app/api/ephemeral_resource`
2. Get back a `storage.theapi.app` URL (same as PiAPI Workspace uses)

But try the simpler GCS URL approach first!
