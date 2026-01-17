# FIX: PiAPI Veo 3.1 I2V - Model Name and Task Type Correction

## The Problem

The I2V is not using the image because of incorrect `model` and `task_type` values for Veo.

## Current Code (WRONG)

```typescript
// Lines 917-944 in buildI2VRequestBody
if (options.model.includes('veo')) {
  let veoModel = 'veo3.1';        // ❌ WRONG
  let taskType = 'veo3.1-video';  // ❌ WRONG
  
  // ...
  
  return {
    model: veoModel,              // Sends 'veo3.1' 
    task_type: taskType,          // Sends 'veo3.1-video'
    // ...
  };
}
```

## What PiAPI Actually Expects

According to the PiAPI documentation:

```yaml
model: veo3          # NOT 'veo3.1' - the model name is just 'veo3'
task_type: veo3-video  # NOT 'veo3.1-video' - no dot in task_type
```

The API version (3.1 vs 3.0) is handled internally by PiAPI - you just specify `veo3`.

## The Fix

Replace lines 915-945 with:

```typescript
// Veo Family (Google) - I2V format per documentation
// Uses same task_type as T2V but adds image_url parameter
if (options.model.includes('veo')) {
  // PiAPI model names don't include the minor version
  // veo-3.1, veo3.1, veo-3, veo3 all map to model: 'veo3', task_type: 'veo3-video'
  // veo-2, veo2 maps to model: 'veo2', task_type: 'veo2-video'
  
  let veoModel = 'veo3';
  let taskType = 'veo3-video';
  
  if (options.model === 'veo-2' || options.model === 'veo2') {
    veoModel = 'veo2';
    taskType = 'veo2-video';
  }
  
  // For fast generation, use the fast task type
  if (options.model.includes('fast')) {
    taskType = `${veoModel}-video-fast`;
  }
  
  console.log(`[PiAPI I2V] Using Veo model: ${veoModel}, task_type: ${taskType}`);
  console.log(`[PiAPI I2V] Image URL: ${options.imageUrl}`);
  console.log(`[PiAPI I2V] Prompt: ${baseInput.prompt.substring(0, 100)}...`);
  
  return {
    model: veoModel,
    task_type: taskType,
    input: {
      prompt: baseInput.prompt,
      image_url: options.imageUrl,  // This makes it I2V instead of T2V
      aspect_ratio: options.aspectRatio || '16:9',
      duration: `${Math.min(options.duration, 8)}s`,
      resolution: '1080p',
      generate_audio: false,
    },
  };
}
```

## Also Fix T2V (for consistency)

The T2V section (lines 393-425) has the same issue. Fix it too:

```typescript
// Veo Family (Google)
case 'veo':
case 'veo-3':
case 'veo-3.1':
case 'veo3':
case 'veo3.1':
  console.log(`[PiAPI T2V] Using Veo 3`);
  return {
    ...baseRequest,
    model: 'veo3',           // ✅ Correct
    task_type: 'veo3-video', // ✅ Correct
    input: {
      prompt: baseRequest.input.prompt,
      negative_prompt: baseRequest.input.negative_prompt,
      aspect_ratio: baseRequest.input.aspect_ratio,
      duration: `${Math.min(baseRequest.input.duration, 8)}s`,
      resolution: '1080p',
      generate_audio: false,
    },
  };

case 'veo-2':
case 'veo2':
  console.log(`[PiAPI T2V] Using Veo 2`);
  return {
    ...baseRequest,
    model: 'veo2',           // ✅ Correct
    task_type: 'veo2-video', // ✅ Correct
    input: {
      prompt: baseRequest.input.prompt,
      negative_prompt: baseRequest.input.negative_prompt,
      aspect_ratio: baseRequest.input.aspect_ratio,
      duration: `${Math.min(baseRequest.input.duration, 8)}s`,
      resolution: '1080p',
      generate_audio: false,
    },
  };
```

## Quick Reference: Correct PiAPI Values

| User Selection | model | task_type | Notes |
|---------------|-------|-----------|-------|
| veo-3.1, veo3.1, veo-3, veo3, veo | `veo3` | `veo3-video` | Standard quality |
| veo-3.1-fast, veo3-fast | `veo3` | `veo3-video-fast` | Faster, cheaper |
| veo-2, veo2 | `veo2` | `veo2-video` | Older model |

## Verify the Fix

After applying the fix, the console should log:

```
[PiAPI I2V] Using Veo model: veo3, task_type: veo3-video
[PiAPI I2V] Image URL: https://your-bucket.s3.amazonaws.com/brand-asset.jpg
[PiAPI I2V] Prompt: Cinematic product shot...
```

And the request body should be:

```json
{
  "model": "veo3",
  "task_type": "veo3-video",
  "input": {
    "prompt": "Cinematic product shot...",
    "image_url": "https://your-bucket.s3.amazonaws.com/brand-asset.jpg",
    "aspect_ratio": "16:9",
    "duration": "8s",
    "resolution": "1080p",
    "generate_audio": false
  }
}
```

The presence of `image_url` in the input automatically makes it I2V mode - no separate task_type needed!
