# Replit Agent Prompt: Fix PiAPI Storage Upload

## Problem

The `uploadImageToPiAPIStorage` function is NOT using multipart/form-data correctly. It imports `FormData` but never uses it, instead trying:
1. JSON with base64 (wrong)
2. Raw binary body (wrong)

PiAPI's upload endpoint expects **multipart/form-data**.

## File: `server/routes/universal-video-routes.ts`

## Replace the entire `uploadImageToPiAPIStorage` function (lines 77-163) with:

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
    console.log(`[PiAPI Upload] Uploading ${filename} (${imageBuffer.length} bytes) to PiAPI storage...`);
    
    // Use the form-data package for proper multipart/form-data upload
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    // Append the image buffer as a file
    formData.append('file', imageBuffer, {
      filename: filename,
      contentType: filename.endsWith('.jpg') || filename.endsWith('.jpeg') 
        ? 'image/jpeg' 
        : 'image/png',
    });
    
    // Make the request with form-data headers
    const response = await fetch('https://upload.theapi.app/api/ephemeral_resource', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        ...formData.getHeaders(),  // This adds the correct Content-Type with boundary
      },
      body: formData as any,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PiAPI Upload] Failed: ${response.status} - ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`[PiAPI Upload] Response:`, JSON.stringify(data));
    
    // Extract URL from response
    const imageUrl = data.url || data.data?.url || data.image_url || data.data?.image_url || data.file_url;
    
    if (imageUrl) {
      console.log(`[PiAPI Upload] Success! URL: ${imageUrl}`);
      return imageUrl;
    }
    
    console.log('[PiAPI Upload] No URL in response:', JSON.stringify(data));
    return null;
    
  } catch (error: any) {
    console.error('[PiAPI Upload] Error:', error.message);
    return null;
  }
}
```

## Why This Works

The `form-data` package (already imported at line 4) properly handles multipart/form-data encoding:

1. `formData.append('file', buffer, options)` - Adds the file with correct metadata
2. `formData.getHeaders()` - Returns the correct `Content-Type: multipart/form-data; boundary=...` header

## Key Differences

| Before (Wrong) | After (Correct) |
|----------------|-----------------|
| JSON body with base64 | multipart/form-data |
| `Content-Type: application/json` | `Content-Type: multipart/form-data; boundary=...` |
| FormData imported but unused | FormData actually used |

## Expected Log Output After Fix

```
[PiAPI Upload] Uploading brand_asset_123_1705432100000.png (245632 bytes) to PiAPI storage...
[PiAPI Upload] Response: {"url":"https://storage.theapi.app/images/..."}
[PiAPI Upload] Success! URL: https://storage.theapi.app/images/playground/20260117/abc123.png
```
