# CRITICAL: I2V Not Using Image - Diagnostic Guide

## The Problem

The video shows a **completely different scene** (man smiling, generic bottles, misspelled "BLACK COOSH") instead of animating the actual product image. This means **I2V is not working at all** - it's falling back to T2V (text-to-video).

## Most Likely Causes

### 1. Image URL Not Being Passed

Check if `options.imageUrl` actually contains a value when `generateImageToVideo` is called.

**Add this debug logging at the START of `generateImageToVideo`:**

```typescript
async generateImageToVideo(options: {
  imageUrl: string;
  // ...
}): Promise<PiAPIGenerationResult> {
  
  // ============ ADD THIS DEBUG BLOCK ============
  console.log('========== I2V DEBUG ==========');
  console.log(`[I2V DEBUG] imageUrl provided: ${!!options.imageUrl}`);
  console.log(`[I2V DEBUG] imageUrl value: ${options.imageUrl}`);
  console.log(`[I2V DEBUG] imageUrl length: ${options.imageUrl?.length || 0}`);
  console.log(`[I2V DEBUG] imageUrl starts with http: ${options.imageUrl?.startsWith('http')}`);
  console.log('================================');
  // ============================================
  
  if (!this.isAvailable()) {
    return { success: false, error: 'PiAPI key not configured' };
  }
  // ... rest of function
}
```

### 2. Image URL Being Stripped by Sanitizer

The `sanitizePromptForAI` function might be doing something unexpected. But more importantly, check if the image URL is even reaching the request body.

**Add this BEFORE the fetch call:**

```typescript
const requestBody = this.buildI2VRequestBody(options, sanitizedPrompt);

// ============ ADD THIS DEBUG BLOCK ============
console.log('========== REQUEST BODY DEBUG ==========');
console.log(`[I2V DEBUG] Full request body:`);
console.log(JSON.stringify(requestBody, null, 2));
console.log(`[I2V DEBUG] image_url in body: ${requestBody.input?.image_url}`);
console.log('=========================================');
// ============================================

const response = await fetch(`${this.baseUrl}/task`, {
```

### 3. The Caller Is NOT Using `generateImageToVideo`

The most likely issue: **The scene generation code might be calling `generateVideo` (T2V) instead of `generateImageToVideo` (I2V)!**

Search the codebase for where video generation is triggered. Look for:
- Which function is called when you click "Generate with Google Veo 3.1"
- Is it calling `piapiVideoService.generateVideo()` or `piapiVideoService.generateImageToVideo()`?

**The UI shows "high res black cohosh" is selected, but is that selection actually being passed to the generation function?**

## Quick Fix Check

In the code that calls the PiAPI service (probably in a route handler or another service), add logging:

```typescript
// Wherever video generation is triggered
console.log('[VideoGen] Selected brand asset:', selectedAsset?.name);
console.log('[VideoGen] Asset file URL:', selectedAsset?.fileUrl);
console.log('[VideoGen] Calling I2V:', !!selectedAsset?.fileUrl);

if (selectedAsset?.fileUrl) {
  // Should call generateImageToVideo
  const result = await piapiVideoService.generateImageToVideo({
    imageUrl: selectedAsset.fileUrl,  // <-- Is this actually being passed?
    prompt: visualDirection,
    duration: sceneDuration,
    aspectRatio: '16:9',
    model: selectedProvider,
  });
} else {
  // Falls back to T2V - this is probably what's happening!
  const result = await piapiVideoService.generateVideo({
    prompt: visualDirection,
    duration: sceneDuration,
    aspectRatio: '16:9',
    model: selectedProvider,
  });
}
```

## What The Logs Should Show

### If I2V is working correctly:
```
[I2V DEBUG] imageUrl provided: true
[I2V DEBUG] imageUrl value: https://bucket.s3.amazonaws.com/brand-assets/black-cohosh.jpg
[I2V DEBUG] imageUrl starts with http: true

[I2V DEBUG] Full request body:
{
  "model": "veo3",
  "task_type": "veo3-video",
  "input": {
    "prompt": "Warm sunlit wellness space...",
    "image_url": "https://bucket.s3.amazonaws.com/brand-assets/black-cohosh.jpg",  <-- MUST BE HERE
    "aspect_ratio": "16:9",
    "duration": "8s",
    "resolution": "1080p",
    "generate_audio": false
  }
}
```

### If I2V is NOT working (the bug):
```
[I2V DEBUG] imageUrl provided: false
[I2V DEBUG] imageUrl value: undefined
```

OR the function isn't even being called - you see T2V logs instead:
```
[PiAPI T2V] Using Veo 3
```

## The Fix

Once you identify WHERE the image URL is being lost, fix it there. The `buildI2VRequestBody` function looks correct now - the issue is upstream.

**Most likely fix needed:**

In the scene generation route/service, ensure the brand asset URL is being passed:

```typescript
// Find the code that handles "Generate with Google Veo 3.1" button click

// It probably looks something like this (BROKEN):
const result = await piapiVideoService.generateVideo({
  prompt: scene.visualDirection,
  // ... missing imageUrl!
});

// It SHOULD look like this (FIXED):
const selectedAsset = scene.selectedBrandAsset || matchedBrandAssets[0];

if (selectedAsset?.fileUrl) {
  const result = await piapiVideoService.generateImageToVideo({
    imageUrl: selectedAsset.fileUrl,  // <-- CRITICAL!
    prompt: scene.visualDirection,
    duration: scene.duration,
    aspectRatio: '16:9',
    model: selectedProvider,
    i2vSettings: {
      animationStyle: scene.animationStyle || 'product-hero',
      imageControlStrength: scene.imageFidelity || 1.0,
    },
  });
}
```

## Summary

The `piapi-video-service.ts` code looks correct. The problem is likely:

1. **The caller is using `generateVideo()` instead of `generateImageToVideo()`**, OR
2. **The `imageUrl` parameter is not being passed to `generateImageToVideo()`**

Add the debug logging above to identify exactly where the image URL is being lost.
