# URGENT FIX: Veo I2V Broken - Wrong Model & Task Type

## Critical Issues Found

The recent changes broke Veo I2V. Here are the problems:

### ❌ Problem 1: Wrong Task Type (Using `-fast` suffix)

**Current code (BROKEN):**
```typescript
// Lines 699-716 in buildI2VRequestBody
let taskType = 'veo3-video-fast';     // ❌ WRONG!
taskType = 'veo3.1-video-fast';       // ❌ WRONG!
taskType = 'veo2-video-fast';         // ❌ WRONG!
```

**The `-fast` suffix is for CHEAPER/FASTER T2V generation, NOT for I2V!**

Per PiAPI documentation, I2V uses the SAME task_type as T2V:
```typescript
task_type: 'veo3-video'   // ✅ CORRECT for both T2V and I2V
```

### ❌ Problem 2: Wrong Model Name (Has a dot)

**Current code (BROKEN):**
```typescript
veoModel = 'veo3.1';   // ❌ WRONG - PiAPI doesn't recognize this
```

**Correct:**
```typescript
veoModel = 'veo3';     // ✅ CORRECT - no dot, no minor version
```

### ❌ Problem 3: Negative Prompt Still Has Black/Fade Terms

**Current code (Line 899):**
```typescript
const i2vNegativePrompt = '... black screen, fade from black, ...';
```

This causes the black fade-in issue we discussed earlier.

---

## The Fix

Replace lines 698-735 with:

```typescript
// Veo Family (Google) - sends prompt AS-IS
// IMPORTANT: 
// - Model name has NO dot: 'veo3' not 'veo3.1'
// - Task type has NO '-fast' suffix for I2V: 'veo3-video' not 'veo3-video-fast'
// - The presence of image_url automatically makes it I2V
if (options.model.includes('veo')) {
  // PiAPI model names don't include minor versions or dots
  // veo-3.1, veo3.1, veo-3, veo3 all map to model: 'veo3'
  let veoModel = 'veo3';
  let taskType = 'veo3-video';
  
  // Veo 2
  if (options.model.includes('veo-2') || options.model.includes('veo2')) {
    veoModel = 'veo2';
    taskType = 'veo2-video';
  }
  
  console.log(`[PiAPI I2V] Veo: Sending prompt AS-IS`);
  console.log(`[PiAPI I2V] Model: ${veoModel}, Task type: ${taskType}`);
  console.log(`[PiAPI I2V] Image URL: ${options.imageUrl}`);
  console.log(`[PiAPI I2V] Prompt: ${sanitizedPrompt}`);
  
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
      // NO negative_prompt - Veo doesn't need it
    },
  };
}
```

Also fix the Kling negative prompt (around line 899):

```typescript
// BEFORE (causes black fade-in)
const i2vNegativePrompt = 'blurry, low quality, distorted, morphing face, warping, watermark, dramatic camera movement, aggressive zoom, black screen, fade from black, altered text on products, changed labels, different product, new objects appearing, scene change';

// AFTER (simplified - no black/fade references)
const i2vNegativePrompt = 'blurry, low quality, distorted, warping, watermark';
```

---

## Quick Reference: Correct Values

| Provider Selection | model | task_type | Notes |
|-------------------|-------|-----------|-------|
| veo-3.1, veo3.1, veo-3, veo3, veo | `veo3` | `veo3-video` | No dot, no -fast |
| veo-2, veo2 | `veo2` | `veo2-video` | No -fast |

---

## What Went Wrong

The Replit agent incorrectly assumed:
1. That Veo 3.1 needs `veo3.1` as the model name (it doesn't - just `veo3`)
2. That I2V needs a different task_type like `-fast` (it doesn't - same task_type, presence of `image_url` determines I2V mode)

**The PiAPI Playground works because it sends:**
```json
{
  "model": "veo3",
  "task_type": "veo3-video",
  "input": {
    "prompt": "Your prompt here",
    "image_url": "https://your-image.jpg"
  }
}
```

**Your app was sending:**
```json
{
  "model": "veo3.1",           // ❌ Wrong model name
  "task_type": "veo3.1-video-fast",  // ❌ Wrong task type
  "input": {
    "prompt": "Your prompt here",
    "image_url": "https://your-image.jpg"
  }
}
```

---

## Verification After Fix

Console should show:
```
[PiAPI I2V] Veo: Sending prompt AS-IS
[PiAPI I2V] Model: veo3, Task type: veo3-video
[PiAPI I2V] Image URL: https://...
[PiAPI I2V] Prompt: Warm sunlit wellness space...
```

Request body should be:
```json
{
  "model": "veo3",
  "task_type": "veo3-video",
  "input": {
    "prompt": "Warm sunlit wellness space with natural wooden surfaces...",
    "image_url": "https://your-bucket.s3.amazonaws.com/brand-asset.jpg",
    "aspect_ratio": "16:9",
    "duration": "8s",
    "resolution": "1080p",
    "generate_audio": false
  }
}
```

**No `negative_prompt` field, no `-fast` suffix, no dots in model name!**
