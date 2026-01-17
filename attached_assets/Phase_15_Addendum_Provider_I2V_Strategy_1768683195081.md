# Phase 15 Addendum: Provider-Specific I2V Prompt Strategy

## Problem

When using the same prompt in the PiAPI Playground vs. the application, PiAPI Playground produces better results. This is because the application wraps/modifies the user's prompt with animation style instructions, which confuses some providers (especially Veo).

**Current behavior (broken):**
```
User prompt: "Warm sunlit wellness space with natural wooden surfaces..."

What gets sent to Veo:
"Cinematic product shot. Animate this exact product image with gentle, smooth 
camera motion. Preserve all product details... Warm sunlit wellness space..."
```

**Expected behavior (fixed):**
```
User prompt: "Warm sunlit wellness space with natural wooden surfaces..."

What gets sent to Veo:
"Warm sunlit wellness space with natural wooden surfaces..."
```

---

## Solution: Provider-Specific Prompt Handling

Different AI video providers work best with different prompt strategies:

| Group | Strategy | Providers |
|-------|----------|-----------|
| **Group 1** | Send prompt AS-IS | Veo, Runway, Pika, Genmo, Hunyuan, Skyreels, Seedance |
| **Group 2** | Add light camera hint | Luma, Hailuo/MiniMax, Wan |
| **Group 3** | Full animation style modification | All Kling versions |

---

## Provider Classification

### Group 1: Send Prompt AS-IS (No Modification)

These providers work best with natural, unmodified prompts:

| Provider | Model String | Notes |
|----------|--------------|-------|
| Google Veo 3.1 | `veo-3.1`, `veo3.1` | Best with natural prompts |
| Google Veo 3.0 | `veo-3`, `veo3`, `veo` | Best with natural prompts |
| Google Veo 2 | `veo-2`, `veo2` | Best with natural prompts |
| Runway Gen-3 | `runway`, `runway-gen3` | Simple prompt interface |
| Pika Labs | `pika`, `pika-labs` | Simple prompt interface |
| Genmo | `genmo` | Simple prompt interface |
| Hunyuan | `hunyuan` | Best with natural prompts |
| Skyreels | `skyreels` | Simple prompt interface |
| Seedance 1.0 | `seedance`, `seedance-1.0` | Simple prompt interface |

**Action:** Send `sanitizedPrompt` exactly as provided. Do NOT wrap with animation instructions.

### Group 2: Light Modification (Camera Hint Only)

These providers benefit from a simple camera movement hint appended to the prompt:

| Provider | Model String | Notes |
|----------|--------------|-------|
| Luma Dream Machine | `luma`, `luma-dream-machine` | Uses keyframes for I2V |
| Hailuo MiniMax | `hailuo`, `hailuo-minimax`, `minimax` | Has camera_motion param |
| Wan 2.6 | `wan-2.6`, `wan26` | Has shot_type param |
| Wan 2.1 | `wan-2.1`, `wan21` | Has shot_type param |

**Action:** Append a simple camera hint based on animation style:
```typescript
const prompt = `${sanitizedPrompt}. Camera: ${cameraHint}`;
```

### Group 3: Full Animation Style Modification (Kling Only)

Kling benefits from the full animation style prompt modification and additional parameters:

| Provider | Model String | Notes |
|----------|--------------|-------|
| Kling 2.6 Master | `kling-2.6-master` | Pro mode, cfg_scale |
| Kling 2.6 Pro | `kling-2.6-pro` | Pro mode, cfg_scale |
| Kling 2.6 Standard | `kling-2.6` | Std mode, cfg_scale |
| Kling 2.5 Turbo | `kling-2.5-turbo` | Turbo mode |
| Kling 2.5 | `kling-2.5` | Std mode |
| Kling 2.1 Master | `kling-2.1-master` | Pro mode |
| Kling 2.1 | `kling-2.1` | Std mode |
| Kling 2.0 | `kling-2.0` | Std mode |
| Kling 1.6 | `kling-1.6`, `kling` | Uses elements array |

**Action:** Keep the existing animation style prompt modification logic for Kling.

---

## Code Implementation

### Updated `buildI2VRequestBody` Function

```typescript
private buildI2VRequestBody(
  options: {
    imageUrl: string;
    prompt: string;
    duration: number;
    aspectRatio: '16:9' | '9:16' | '1:1';
    model: string;
    i2vSettings?: {
      imageControlStrength?: number;
      animationStyle?: 'product-hero' | 'product-static' | 'subtle-motion' | 'dynamic';
      motionStrength?: number;
    };
  },
  sanitizedPrompt: string
): any {
  const animationStyle = options.i2vSettings?.animationStyle ?? 'product-hero';
  
  // ===========================================
  // GROUP 1: Send prompt AS-IS (no modification)
  // Providers that work best with natural prompts
  // ===========================================
  
  // Veo Family (Google)
  if (options.model.includes('veo')) {
    let veoModel = 'veo3';
    let taskType = 'veo3-video';
    
    if (options.model.includes('veo-2') || options.model.includes('veo2')) {
      veoModel = 'veo2';
      taskType = 'veo2-video';
    }
    
    console.log(`[PiAPI I2V] ${veoModel}: Sending prompt AS-IS (no animation style modification)`);
    console.log(`[PiAPI I2V] Prompt: ${sanitizedPrompt}`);
    
    return {
      model: veoModel,
      task_type: taskType,
      input: {
        prompt: sanitizedPrompt,  // SEND AS-IS!
        image_url: options.imageUrl,
        aspect_ratio: options.aspectRatio || '16:9',
        duration: `${Math.min(options.duration, 8)}s`,
        resolution: '1080p',
        generate_audio: false,
      },
    };
  }
  
  // Runway Gen-3
  if (options.model.includes('runway')) {
    console.log(`[PiAPI I2V] Runway: Sending prompt AS-IS`);
    return {
      model: 'runway',
      task_type: 'video_generation',
      input: {
        prompt: sanitizedPrompt,  // SEND AS-IS!
        image_url: options.imageUrl,
        duration: Math.min(options.duration, 10),
        aspect_ratio: options.aspectRatio || '16:9',
      },
    };
  }
  
  // Pika Labs
  if (options.model.includes('pika')) {
    console.log(`[PiAPI I2V] Pika: Sending prompt AS-IS`);
    return {
      model: 'pika',
      task_type: 'video_generation',
      input: {
        prompt: sanitizedPrompt,  // SEND AS-IS!
        image_url: options.imageUrl,
      },
    };
  }
  
  // Genmo
  if (options.model.includes('genmo')) {
    console.log(`[PiAPI I2V] Genmo: Sending prompt AS-IS`);
    return {
      model: 'genmo',
      task_type: 'video_generation',
      input: {
        prompt: sanitizedPrompt,  // SEND AS-IS!
        image_url: options.imageUrl,
      },
    };
  }
  
  // Hunyuan
  if (options.model.includes('hunyuan')) {
    console.log(`[PiAPI I2V] Hunyuan: Sending prompt AS-IS`);
    return {
      model: 'hunyuan',
      task_type: 'video_generation',
      input: {
        prompt: sanitizedPrompt,  // SEND AS-IS!
        image_url: options.imageUrl,
        duration: Math.min(options.duration, 5),
        aspect_ratio: options.aspectRatio || '16:9',
      },
    };
  }
  
  // Skyreels
  if (options.model.includes('skyreels')) {
    console.log(`[PiAPI I2V] Skyreels: Sending prompt AS-IS`);
    return {
      model: 'skyreels',
      task_type: 'video_generation',
      input: {
        prompt: sanitizedPrompt,  // SEND AS-IS!
        image_url: options.imageUrl,
        duration: Math.min(options.duration, 5),
      },
    };
  }
  
  // Seedance
  if (options.model.includes('seedance')) {
    console.log(`[PiAPI I2V] Seedance: Sending prompt AS-IS`);
    return {
      model: 'hailuo',
      task_type: 'video_generation',
      input: {
        prompt: sanitizedPrompt,  // SEND AS-IS!
        model: 'seedance-1.0-i2v',
        image_url: options.imageUrl,
      },
    };
  }
  
  // ===========================================
  // GROUP 2: Light modification (camera hint only)
  // Providers that benefit from simple camera direction
  // ===========================================
  
  const cameraHintMap: Record<string, string> = {
    'product-hero': 'gentle push in',
    'product-static': 'static camera',
    'subtle-motion': 'subtle pan',
    'dynamic': 'dynamic camera movement',
  };
  const cameraHint = cameraHintMap[animationStyle] || 'gentle movement';
  
  // Luma Dream Machine
  if (options.model.includes('luma')) {
    const prompt = `${sanitizedPrompt}. Camera: ${cameraHint}`;
    console.log(`[PiAPI I2V] Luma: Adding light camera hint`);
    console.log(`[PiAPI I2V] Prompt: ${prompt}`);
    
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
      },
    };
  }
  
  // Hailuo / MiniMax
  if (options.model.includes('hailuo') || options.model.includes('minimax')) {
    const prompt = `${sanitizedPrompt}. Camera: ${cameraHint}`;
    console.log(`[PiAPI I2V] Hailuo: Adding light camera hint`);
    
    return {
      model: 'hailuo',
      task_type: 'video_generation',
      input: {
        prompt: prompt,
        model: 'i2v-01',
        image_url: options.imageUrl,
        expand_prompt: true,
      },
    };
  }
  
  // Wan Family
  if (options.model.includes('wan')) {
    const prompt = `${sanitizedPrompt}. Camera: ${cameraHint}`;
    console.log(`[PiAPI I2V] Wan: Adding light camera hint`);
    
    return {
      model: 'Wan',
      task_type: 'wan26-img2video',
      input: {
        prompt: prompt,
        image: options.imageUrl,
        prompt_extend: true,
        shot_type: 'single',
        resolution: '720p',
        duration: Math.min(options.duration, 5),
        watermark: false,
      },
    };
  }
  
  // ===========================================
  // GROUP 3: Full animation style modification (Kling)
  // Keep existing logic for Kling providers
  // ===========================================
  
  if (options.model.includes('kling')) {
    // ... KEEP THE EXISTING KLING LOGIC ...
    // The current animation style prompt modification works well for Kling
    // Including: cfg_scale, elements array, motion directives, etc.
    
    return this.buildKlingI2VRequest(options, sanitizedPrompt, animationStyle);
  }
  
  // ===========================================
  // DEFAULT: Send as-is
  // ===========================================
  console.log(`[PiAPI I2V] ${options.model}: Using default (sending as-is)`);
  return {
    model: options.model,
    task_type: 'video_generation',
    input: {
      prompt: sanitizedPrompt,
      image_url: options.imageUrl,
      duration: options.duration,
      aspect_ratio: options.aspectRatio,
    },
  };
}

/**
 * Build Kling-specific I2V request with full animation style support
 * Extract this from the existing buildI2VRequestBody Kling section
 */
private buildKlingI2VRequest(
  options: any,
  sanitizedPrompt: string,
  animationStyle: string
): any {
  // KEEP ALL EXISTING KLING LOGIC HERE
  // Including:
  // - Animation style prompt building (product-hero, product-static, etc.)
  // - cfg_scale calculation based on imageControlStrength
  // - Version and mode selection
  // - elements array for v1.6+
  // - Motion directives
  
  // ... existing Kling code from lines 718-835 ...
}
```

---

## UI Changes (Optional but Recommended)

### Hide Animation Style for Providers That Don't Use It

```typescript
// Constants
const ANIMATION_STYLE_PROVIDERS = [
  'kling', 'kling-1.6', 'kling-2.0', 'kling-2.1', 'kling-2.1-master',
  'kling-2.5', 'kling-2.5-turbo', 'kling-2.6', 'kling-2.6-pro', 'kling-2.6-master',
  'luma', 'luma-dream-machine',
  'hailuo', 'hailuo-minimax', 'minimax',
  'wan-2.1', 'wan-2.6',
];

// In the Scene Editor UI component
const showAnimationStyle = ANIMATION_STYLE_PROVIDERS.some(
  p => selectedVideoProvider.toLowerCase().includes(p.toLowerCase())
);

// JSX
{showAnimationStyle && (
  <div className="space-y-3">
    <h4 className="text-sm font-medium">I2V Settings</h4>
    
    <div>
      <label>Image Fidelity</label>
      <Slider value={imageFidelity} ... />
    </div>
    
    <div>
      <label>Animation Style</label>
      <Select value={animationStyle} ...>
        <SelectItem value="product-hero">Product Hero</SelectItem>
        <SelectItem value="product-static">Product Static</SelectItem>
        <SelectItem value="subtle-motion">Subtle Motion</SelectItem>
        <SelectItem value="dynamic">Dynamic</SelectItem>
      </Select>
    </div>
  </div>
)}
```

---

## Verification

After implementing these changes, verify:

### For Veo (Group 1):
```
Console should show:
[PiAPI I2V] veo3: Sending prompt AS-IS (no animation style modification)
[PiAPI I2V] Prompt: Warm sunlit wellness space with natural wooden surfaces...

Request body should be:
{
  "model": "veo3",
  "task_type": "veo3-video",
  "input": {
    "prompt": "Warm sunlit wellness space with natural wooden surfaces...",
    "image_url": "https://...",
    "aspect_ratio": "16:9",
    "duration": "8s",
    "resolution": "1080p",
    "generate_audio": false
  }
}
```

### For Luma (Group 2):
```
Console should show:
[PiAPI I2V] Luma: Adding light camera hint
[PiAPI I2V] Prompt: Warm sunlit wellness space... Camera: gentle push in
```

### For Kling (Group 3):
```
Console should show:
[PiAPI I2V] Using Kling 2.6 (version 2.6, pro mode)
[PiAPI I2V] Kling settings: fidelity=1 → cfg=0.20, motion=0.3, style=product-hero
```

---

## Summary

| Provider | Animation Style UI | Prompt Modification |
|----------|-------------------|---------------------|
| Veo 2, 3, 3.1 | Hide | None - send as-is |
| Runway Gen-3 | Hide | None - send as-is |
| Pika Labs | Hide | None - send as-is |
| Genmo | Hide | None - send as-is |
| Hunyuan | Hide | None - send as-is |
| Skyreels | Hide | None - send as-is |
| Seedance 1.0 | Hide | None - send as-is |
| Luma | Show | Light - append camera hint |
| Hailuo/MiniMax | Show | Light - append camera hint |
| Wan 2.1, 2.6 | Show | Light - append camera hint |
| All Kling versions | Show | Full - existing logic |

This ensures each provider receives prompts in the format they work best with, matching the behavior of PiAPI Playground.
