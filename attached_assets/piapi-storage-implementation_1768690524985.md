# Replit Agent Prompt: Implement PiAPI Storage Upload for I2V

## Overview

Upload brand asset images to PiAPI's ephemeral storage to get `storage.theapi.app` URLs. This matches how PiAPI Workspace handles images and produces better I2V video integration.

**PiAPI Upload Endpoint:** `https://upload.theapi.app/api/ephemeral_resource`
**Auth:** `x-api-key` header with `PIAPI_API_KEY`
**Files expire:** 24 hours (fine for I2V since videos generate immediately)

---

## File: `server/routes/universal-video-routes.ts`

### Step 1: Add the PiAPI Upload Function

Add this function after the imports (around line 30):

```typescript
/**
 * Upload image to PiAPI's ephemeral storage.
 * Returns a storage.theapi.app URL (same as PiAPI Workspace uses).
 * Files are automatically deleted after 24 hours.
 */
async function uploadImageToPiAPIStorage(
  imageBuffer: Buffer,
  filename: string
): Promise<string | null> {
  const apiKey = process.env.PIAPI_API_KEY;
  
  if (!apiKey) {
    console.log('[PiAPI Upload] No PIAPI_API_KEY configured');
    return null;
  }
  
  try {
    const uploadUrl = 'https://upload.theapi.app/api/ephemeral_resource';
    
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('file', blob, filename);
    
    console.log(`[PiAPI Upload] Uploading ${filename} to PiAPI storage...`);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PiAPI Upload] Failed: ${response.status} - ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    const imageUrl = data.url || data.data?.url || data.image_url || data.data?.image_url;
    
    if (imageUrl && (imageUrl.includes('theapi.app') || imageUrl.includes('storage'))) {
      console.log(`[PiAPI Upload] Success! URL: ${imageUrl}`);
      return imageUrl;
    }
    
    console.log('[PiAPI Upload] Unexpected response format:', JSON.stringify(data));
    return null;
    
  } catch (error: any) {
    console.error('[PiAPI Upload] Error:', error.message);
    return null;
  }
}
```

### Step 2: Replace `getPublicUrlForBrandAsset` Function

Replace the entire function (around line 72) with:

```typescript
/**
 * Convert relative brand asset URL to public URL for external video providers.
 * Uses PiAPI's ephemeral storage to get storage.theapi.app URLs.
 * Falls back to direct GCS URL if PiAPI upload fails.
 */
async function getPublicUrlForBrandAsset(relativeUrl: string): Promise<string | null> {
  if (!relativeUrl || !relativeUrl.startsWith('/api/brand-assets/file/')) {
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
    
    const [asset] = await db.select().from(brandAssets).where(eq(brandAssets.id, assetId));
    if (!asset) {
      console.log('[PublicURL] Asset not found for ID:', assetId);
      return null;
    }
    
    const settings = asset.settings as any;
    const storagePath = settings?.storagePath;
    if (!storagePath) {
      console.log('[PublicURL] No storage path for asset:', assetId);
      return null;
    }
    
    const [bucketName, objectPath] = storagePath.split('|');
    if (!bucketName || !objectPath) {
      console.log('[PublicURL] Invalid storage path format:', storagePath);
      return null;
    }
    
    console.log('[PublicURL] Reading asset', assetId, 'from storage:', objectPath);
    
    // Read file from Replit Object Storage
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectPath);
    const [fileBuffer] = await file.download();
    
    // Upload to PiAPI storage
    const ext = objectPath.split('.').pop() || 'png';
    const filename = `brand_asset_${assetId}_${Date.now()}.${ext}`;
    
    const piapiUrl = await uploadImageToPiAPIStorage(fileBuffer, filename);
    
    if (piapiUrl) {
      console.log('[PublicURL] Using PiAPI storage URL:', piapiUrl);
      return piapiUrl;
    }
    
    // Fallback to direct GCS URL
    console.log('[PublicURL] PiAPI upload failed, using GCS fallback...');
    const gcsUrl = `https://storage.googleapis.com/${bucketName}/${objectPath}`;
    console.log('[PublicURL] Fallback GCS URL:', gcsUrl);
    return gcsUrl;
    
  } catch (error) {
    console.error('[PublicURL] Error generating public URL:', error);
    return null;
  }
}
```

### Step 3: Remove Old S3 Upload Code

Delete the S3-related code that was in the old `getPublicUrlForBrandAsset` function:
- Remove S3Client import if no longer used elsewhere
- Remove PutObjectCommand usage
- Remove AWS credential handling for this function

---

## Expected Log Output

```
[PublicURL] Reading asset 123 from storage: public/uploads/1768606259330_high_res_black.png
[PiAPI Upload] Uploading brand_asset_123_1705432100000.png to PiAPI storage...
[PiAPI Upload] Success! URL: https://storage.theapi.app/images/playground/20260117/abc123.png
[PublicURL] Using PiAPI storage URL: https://storage.theapi.app/images/playground/20260117/abc123.png
```
