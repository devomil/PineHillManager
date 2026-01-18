# Replit Agent Prompt: Fix PiAPI Upload (Use Axios)

## Problem

The `form-data` package isn't setting the Content-Type header correctly with `fetch()` or `https.request()`. PiAPI receives the multipart data but tries to parse it as JSON because the header is wrong.

Error: `SyntaxError: No number after minus sign in JSON at position 1`
This means PiAPI received `--` (multipart boundary) but expected JSON.

## Solution: Use Axios

Axios handles `form-data` correctly out of the box.

### Step 1: Install axios (if not already installed)

```bash
npm install axios
```

### Step 2: Replace `uploadImageToPiAPIStorage` function

In `server/routes/universal-video-routes.ts`, replace the entire function with:

```typescript
import axios from 'axios';
import FormData from 'form-data';

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
    console.log(`[PiAPI Upload] Uploading ${filename} (${imageBuffer.length} bytes)...`);
    
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: filename,
      contentType: filename.endsWith('.jpg') || filename.endsWith('.jpeg') 
        ? 'image/jpeg' 
        : 'image/png',
    });
    
    const response = await axios.post(
      'https://upload.theapi.app/api/ephemeral_resource',
      formData,
      {
        headers: {
          'x-api-key': apiKey,
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );
    
    console.log(`[PiAPI Upload] Response:`, JSON.stringify(response.data));
    
    const imageUrl = response.data?.url || 
                     response.data?.data?.url || 
                     response.data?.image_url ||
                     response.data?.file_url;
    
    if (imageUrl) {
      console.log(`[PiAPI Upload] Success! URL: ${imageUrl}`);
      return imageUrl;
    }
    
    console.log('[PiAPI Upload] No URL in response');
    return null;
    
  } catch (error: any) {
    if (error.response) {
      console.error(`[PiAPI Upload] HTTP ${error.response.status}:`, error.response.data);
    } else {
      console.error('[PiAPI Upload] Error:', error.message);
    }
    return null;
  }
}
```

### Step 3: Add import at top of file

Make sure these imports are at the top:

```typescript
import axios from 'axios';
import FormData from 'form-data';
```

## Why Axios Works

1. Axios automatically detects `FormData` and sets correct headers
2. `formData.getHeaders()` returns `Content-Type: multipart/form-data; boundary=----xxx`
3. Axios properly streams the form data body

## Alternative: Node 18+ Native FormData

If you don't want to add axios, use Node's built-in FormData with Blob:

```typescript
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
    console.log(`[PiAPI Upload] Uploading ${filename} (${imageBuffer.length} bytes)...`);
    
    const mimeType = filename.endsWith('.jpg') || filename.endsWith('.jpeg') 
      ? 'image/jpeg' 
      : 'image/png';
    
    // Use native FormData (Node 18+)
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: mimeType });
    formData.append('file', blob, filename);
    
    const response = await fetch('https://upload.theapi.app/api/ephemeral_resource', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        // DO NOT set Content-Type - fetch will set it automatically with boundary
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PiAPI Upload] Failed: ${response.status} - ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`[PiAPI Upload] Response:`, JSON.stringify(data));
    
    const imageUrl = data?.url || data?.data?.url || data?.image_url || data?.file_url;
    
    if (imageUrl) {
      console.log(`[PiAPI Upload] Success! URL: ${imageUrl}`);
      return imageUrl;
    }
    
    return null;
    
  } catch (error: any) {
    console.error('[PiAPI Upload] Error:', error.message);
    return null;
  }
}
```

**Important:** With native FormData + fetch, do NOT manually set Content-Type header. Fetch will set it automatically with the correct boundary.

## Test After Fix

Look for these logs:
```
[PiAPI Upload] Uploading brand_asset_123_xxx.png (245632 bytes)...
[PiAPI Upload] Response: {"url":"https://storage.theapi.app/..."}
[PiAPI Upload] Success! URL: https://storage.theapi.app/images/...
```

Then verify the I2V video uses your actual product image (white bottle with "cultivating wellness" label).
