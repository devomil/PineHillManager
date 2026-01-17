# Phase 15 Fix: Black Fade-In Issue in I2V Videos

## Problem

Videos generated via I2V (Image-to-Video) are starting with a black screen that fades into the content, instead of starting directly with the image.

**Expected:** Video starts immediately showing the source image with animation
**Actual:** Video starts black, then fades in to the content

---

## Root Cause

The issue is caused by the `negative_prompt` in the I2V request. The current code includes:

```typescript
const i2vNegativePrompt = 'blurry, low quality, distorted, morphing face, warping, watermark, 
  dramatic camera movement, aggressive zoom, black screen, fade from black, ...';
//                                           ^^^^^^^^^^^^  ^^^^^^^^^^^^^^^
//                                           PROBLEM: Mentioning these can cause the opposite effect!
```

**Why this happens:** AI models sometimes interpret negative prompts paradoxically. By explicitly mentioning "black screen" and "fade from black", the model becomes "aware" of these concepts and may inadvertently produce them.

Additionally, the `cfg_scale` manipulation for Kling may be causing the model to deviate from the source image at the start of generation.

---

## Solution

### Fix 1: Remove Problematic Negative Prompt Terms

For **ALL providers**, simplify the negative prompt and remove references to black/fade:

```typescript
// BEFORE (problematic)
const i2vNegativePrompt = 'blurry, low quality, distorted, morphing face, warping, watermark, dramatic camera movement, aggressive zoom, black screen, fade from black, altered text on products, changed labels, different product, new objects appearing, scene change';

// AFTER (fixed)
const i2vNegativePrompt = 'blurry, low quality, distorted, warping, watermark';
```

### Fix 2: Remove Negative Prompt Entirely for Veo

Veo doesn't handle negative prompts well. Remove it completely:

```typescript
// For Veo - NO negative prompt
if (options.model.includes('veo')) {
  return {
    model: 'veo3',
    task_type: 'veo3-video',
    input: {
      prompt: sanitizedPrompt,
      image_url: options.imageUrl,
      aspect_ratio: options.aspectRatio || '16:9',
      duration: `${Math.min(options.duration, 8)}s`,
      resolution: '1080p',
      generate_audio: false,
      // NO negative_prompt field at all!
    },
  };
}
```

### Fix 3: Simplify Negative Prompt for Kling

For Kling, keep a minimal negative prompt:

```typescript
// For Kling - minimal negative prompt
if (options.model.includes('kling')) {
  return {
    model: 'kling',
    task_type: 'video_generation',
    input: {
      prompt: klingI2vPrompt,
      image_url: options.imageUrl,
      duration: options.duration,
      aspect_ratio: options.aspectRatio,
      negative_prompt: 'blurry, low quality, distorted',  // Keep it simple!
      mode,
      version,
      // ... rest of Kling config
    },
  };
}
```

### Fix 4: Remove cfg_scale for I2V (Kling)

The `cfg_scale` parameter can cause issues with I2V. The source image should be the primary guidance:

```typescript
// BEFORE
return {
  model: 'kling',
  task_type: 'video_generation',
  input: {
    // ...
    cfg_scale: cfgScale,  // REMOVE THIS for I2V
  },
};

// AFTER
return {
  model: 'kling',
  task_type: 'video_generation',
  input: {
    // ...
    // cfg_scale removed - let the model use default behavior with source image
  },
};
```

---

## Complete Fix for `buildI2VRequestBody`

### Veo (Group 1 - No negative prompt)

```typescript
if (options.model.includes('veo')) {
  let veoModel = 'veo3';
  let taskType = 'veo3-video';
  
  if (options.model.includes('veo-2') || options.model.includes('veo2')) {
    veoModel = 'veo2';
    taskType = 'veo2-video';
  }
  
  console.log(`[PiAPI I2V] ${veoModel}: Sending prompt AS-IS, no negative prompt`);
  
  return {
    model: veoModel,
    task_type: taskType,
    input: {
      prompt: sanitizedPrompt,
      image_url: options.imageUrl,
      aspect_ratio: options.aspectRatio || '16:9',
      duration: `${Math.min(options.duration, 8)}s`,
      resolution: '1080p',
      generate_audio: false,
      // NO negative_prompt - Veo doesn't need it and it can cause issues
    },
  };
}
```

### Kling (Group 3 - Minimal negative prompt, no cfg_scale)

```typescript
if (options.model.includes('kling')) {
  // ... version and mode selection ...
  
  // Simple negative prompt - don't mention black/fade
  const negativePrompt = 'blurry, low quality, distorted, warping';
  
  return {
    model: 'kling',
    task_type: 'video_generation',
    input: {
      prompt: klingI2vPrompt,
      image_url: options.imageUrl,
      first_frame_image: options.imageUrl,
      duration: options.duration,
      aspect_ratio: options.aspectRatio,
      negative_prompt: negativePrompt,  // Simplified!
      mode,
      version,
      elements: [{ image_url: options.imageUrl }],
      // cfg_scale REMOVED - causes black fade issues
    },
  };
}
```

### Other Providers (Group 1 & 2 - No negative prompt)

```typescript
// Luma, Hailuo, Wan, Runway, Pika, etc.
// Don't include negative_prompt at all

return {
  model: 'luma',
  task_type: 'video_generation',
  input: {
    prompt: prompt,
    keyframes: {
      frame0: { type: 'image', url: options.imageUrl }
    },
    aspect_ratio: options.aspectRatio || '16:9',
    loop: false,
    // NO negative_prompt
  },
};
```

---

## Summary of Changes

| Provider | negative_prompt | cfg_scale |
|----------|-----------------|-----------|
| **Veo 2, 3, 3.1** | ❌ Remove entirely | N/A |
| **Runway** | ❌ Remove entirely | N/A |
| **Luma** | ❌ Remove entirely | N/A |
| **Hailuo/MiniMax** | ❌ Remove entirely | N/A |
| **Wan** | ❌ Remove entirely | N/A |
| **Pika** | ❌ Remove entirely | N/A |
| **Genmo** | ❌ Remove entirely | N/A |
| **Hunyuan** | ❌ Remove entirely | N/A |
| **Skyreels** | ❌ Remove entirely | N/A |
| **Seedance** | ❌ Remove entirely | N/A |
| **Kling (all versions)** | ✅ Keep but simplify | ❌ Remove |

---

## Negative Prompt Reference

### ❌ DON'T USE (causes issues):
```
black screen, fade from black, fade to black, dark intro, 
black background, fade in, fade out, transition from black
```

### ✅ SAFE TO USE (if needed):
```
blurry, low quality, distorted, warping, watermark
```

### 🎯 BEST PRACTICE:
For I2V, **don't use negative prompts at all** unless the provider specifically benefits from them (only Kling).

---

## Verification

After applying the fix:

1. Generate an I2V video with Veo
2. The video should start **immediately** with the source image visible
3. There should be **no black frame** at the beginning
4. The animation should begin from frame 1

**Console should NOT show any negative_prompt for Veo:**
```
[PiAPI I2V] veo3: Sending prompt AS-IS, no negative prompt
[PiAPI I2V] Request body: {
  "model": "veo3",
  "task_type": "veo3-video",
  "input": {
    "prompt": "Warm sunlit wellness space...",
    "image_url": "https://...",
    "aspect_ratio": "16:9",
    "duration": "8s",
    "resolution": "1080p",
    "generate_audio": false
  }
}
```

Note: No `negative_prompt` field in the request body!
