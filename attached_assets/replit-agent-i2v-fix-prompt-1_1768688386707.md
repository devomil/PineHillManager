# Replit Agent Prompt: Fix PiAPI I2V Image Fidelity Issue

## Problem Statement

Our I2V (image-to-video) generations have poor image fidelity compared to PiAPI Workspace. The product bottle gets distorted/regenerated instead of being preserved exactly as the source image.

**Root Cause Analysis:**

The `sanitizePromptForAI()` function in `prompt-sanitizer.ts` does TWO things that destroy I2V fidelity:

1. **Replaces brand names:** `"pine hill farm"` → `"wellness center"`
2. **Adds destructive suffix:** `"IMPORTANT: Do not include any text, words, letters, numbers, logos, watermarks..."`

**Why this breaks I2V:**
- The source image ALREADY contains the product label with text/logos
- When we tell Veo "do not include text/logos", it tries to REMOVE them from the source image
- This causes the model to regenerate the product instead of animating it

**Additional issues:**
- Veo parameters don't match PiAPI Workspace (we use 1080p, workspace uses 720p)
- I2V Settings (Image Fidelity slider at 95%) are ignored for Veo

## PiAPI Workspace Request (Works Perfectly)
```json
{
  "model": "veo3.1",
  "task_type": "veo3.1-video",
  "input": {
    "aspect_ratio": "16:9",
    "duration": "8s",
    "generate_audio": true,
    "image_url": "https://...",
    "prompt": "Warm sunlit wellness space with natural wooden surfaces and flowing white linen curtains, soft golden morning light streaming through windows, creating gentle rim lighting around the pine hill farm Black Cohosh supplement on a table.",
    "resolution": "720p"
  }
}
```

## What Our App Sends (Poor Fidelity)
```json
{
  "model": "veo3.1",
  "task_type": "veo3.1-video",
  "input": {
    "prompt": "Warm sunlit wellness space with natural wooden surfaces and flowing white linen curtains, soft golden morning light streaming through windows, creating gentle rim lighting around the wellness center Black Cohosh supplement on a table. IMPORTANT: Do not include any text, words, letters, numbers, logos, watermarks, labels, buttons, badges, banners, or UI elements in the image. Generate only the pure visual scene without any overlaid text or graphics.",
    "image_url": "https://...",
    "resolution": "1080p",
    "generate_audio": false
  }
}
```

### Key Differences:
| Parameter | PiAPI Workspace ✅ | Our App ❌ |
|-----------|-------------------|-------------|
| `prompt` | Original with "pine hill farm" | "wellness center" + "no text" suffix |
| `resolution` | `720p` | `1080p` |
| `generate_audio` | `true` | `false` |

## Required Changes

### 1. Update `server/services/piapi-video-service.ts` - `generateImageToVideo()` method

**Find this code (around line 618):**
```typescript
const sanitized = sanitizePromptForAI(options.prompt, 'video');
const sanitizedPrompt = enhancePromptForProvider(sanitized.cleanPrompt, options.model);
```

**Replace with:**
```typescript
// ============================================================
// CRITICAL FIX: DO NOT SANITIZE PROMPT FOR I2V
// ============================================================
// 
// For T2V: Sanitization prevents AI from rendering text (good)
// For I2V: The image ALREADY contains text/logos (product labels)
//
// The sanitizer:
// 1. Replaces "pine hill farm" with "wellness center" 
// 2. Adds "Do not include any text, logos, watermarks..."
//
// This causes the model to try to REMOVE existing content!
// For I2V, use ORIGINAL prompt - the image defines the content.
// ============================================================

const promptForI2V = options.prompt.trim();

console.log(`[PiAPI:${options.model}] ========== I2V GENERATION ==========`);
console.log(`[PiAPI:${options.model}] SKIPPING SANITIZATION (I2V preserves source)`);
console.log(`[PiAPI:${options.model}] Original prompt: ${promptForI2V}`);
console.log(`[PiAPI:${options.model}] Image URL: ${options.imageUrl}`);
```

Then update the `buildI2VRequestBody` call to use `promptForI2V`:
```typescript
const requestBody = this.buildI2VRequestBody(options, promptForI2V);
```

### 2. Update `buildI2VRequestBody()` method for Veo

**Find the Veo section (around line 720):**

```typescript
if (options.model.includes('veo')) {
  // ...existing version detection code...
  
  return {
    model: veoModel,
    task_type: taskType,
    input: {
      prompt: sanitizedPrompt,
      image_url: options.imageUrl,
      aspect_ratio: options.aspectRatio || '16:9',
      duration: `${Math.min(options.duration, 8)}s`,
      resolution: '1080p',        // ❌ CHANGE THIS
      generate_audio: false,      // ❌ CHANGE THIS
    },
  };
}
```

**Replace with:**
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

  console.log(`[PiAPI I2V] Veo ${veoModel}: Matching PiAPI Workspace parameters`);
  console.log(`[PiAPI I2V] resolution=720p, generate_audio=true`);
  
  return {
    model: veoModel,
    task_type: taskType,
    input: {
      prompt: sanitizedPrompt,      // Now this is ORIGINAL (unsanitized)
      image_url: options.imageUrl,
      aspect_ratio: options.aspectRatio || '16:9',
      duration: `${Math.min(options.duration, 8)}s`,
      resolution: '720p',           // ✅ Match workspace (was 1080p)
      generate_audio: true,         // ✅ Match workspace (was false)
    },
  };
}
```

### 3. Add Request Logging for Debugging

After building the request body, add:

```typescript
// Log full request for debugging - compare to PiAPI Workspace
console.log(`[PiAPI:${options.model}] ====== I2V REQUEST BODY ======`);
console.log(JSON.stringify(requestBody, null, 2));
console.log(`[PiAPI:${options.model}] ==============================`);
```

## Testing Instructions

After implementing:

1. Go to a scene with a product image matched
2. Open Scene Editor, ensure "high res black cohosh" product is selected
3. Set I2V Settings:
   - Image Fidelity: 95%
   - Animation Style: Product Hero
4. Click "Generate with Google Veo 3.1"
5. **Check server logs for these CRITICAL lines:**
   ```
   [PiAPI:veo3.1] ========== I2V GENERATION ==========
   [PiAPI:veo3.1] SKIPPING SANITIZATION (I2V preserves source)
   [PiAPI:veo3.1] Original prompt: Warm sunlit wellness space...pine hill farm Black Cohosh...
   ```
6. **Verify the logged request body:**
   - Prompt should contain "pine hill farm" (NOT "wellness center")
   - Prompt should NOT contain "IMPORTANT: Do not include any text..."
   - `resolution` should be `720p`
   - `generate_audio` should be `true`
7. Compare output video to PiAPI Workspace - product should be IDENTICAL

## Expected Outcome

The generated video should look identical to PiAPI Workspace output:
- ✅ Product bottle preserved **exactly** as source image
- ✅ "cultivating wellness" text readable on label
- ✅ "Black Cohosh Extract Plus" text preserved
- ✅ Pine Hill Farm branding intact
- ✅ Only the environment/lighting animated around the static product

## Files Modified

- `server/services/piapi-video-service.ts`
  - `generateImageToVideo()` method - **skip prompt sanitization for I2V**
  - `buildI2VRequestBody()` method - **match Veo workspace parameters (720p, audio=true)**

## Why This Works

| Generation Type | Prompt Handling | Reason |
|-----------------|-----------------|--------|
| **T2V** | Sanitize (remove text requests) | AI renders text poorly - prevent it |
| **I2V** | Original prompt | Image ALREADY has text/logos - preserve them |

The key insight: **For I2V, the source image IS the content. The prompt describes the animation, not what to generate. Telling the model "no text/logos" when the image has text/logos causes regeneration instead of animation.**
