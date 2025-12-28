# Phase 4D: Pipeline Integration

## Objective

Connect the brand services (4A, 4B, 4C) to the existing video generation pipeline. This phase modifies existing services to use enhanced prompts and brand instructions.

## Prerequisites

- Phase 4A complete (`brand-bible-service.ts` exists)
- Phase 4B complete (`prompt-enhancement-service.ts` exists)
- Phase 4C complete (`brand-injection-service.ts` exists)
- Existing services working: `ai-video-service.ts`, `runway-video-service.ts`, `piapi-video-service.ts`, `universal-video-service.ts`

## What This Phase Modifies

- `server/services/ai-video-service.ts` - Use enhanced prompts
- `server/services/runway-video-service.ts` - Pass negative prompts to API
- `server/services/piapi-video-service.ts` - Pass negative prompts to API
- `server/services/universal-video-service.ts` - Load brand bible, generate brand instructions

## What Success Looks Like

```
[Assets] Loading brand bible...
[Assets] Brand loaded: Pine Hill Farm, 5 assets
[PromptEnhance] Enhancing prompt for hook scene
[Runway] Starting generation with negative prompt...
[Assets] Generating brand overlay instructions...
[BrandInject] Intro animation configured
[BrandInject] Watermark overlay configured
[Assets] Brand instructions complete for 4 scenes
```

---

## Step 1: Update AI Video Service

Modify `server/services/ai-video-service.ts`:

### Add imports at the top:
```typescript
import { promptEnhancementService } from './prompt-enhancement-service';
```

### Update the AIVideoOptions interface to include optional negative prompt:
```typescript
export interface AIVideoOptions {
  prompt: string;
  duration: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  sceneType: string;
  narration?: string;
  mood?: string;
  contentType?: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
  negativePrompt?: string;  // ADD THIS
}
```

### Update the generateVideo method to enhance prompts:

Find the `generateVideo` method and add prompt enhancement at the beginning:

```typescript
async generateVideo(options: AIVideoOptions): Promise<AIVideoResult> {
  // ENHANCE PROMPT WITH BRAND CONTEXT AND SAFETY
  const enhanced = await promptEnhancementService.enhanceVideoPrompt(
    options.prompt,
    {
      sceneType: options.sceneType,
      narration: options.narration,
      mood: options.mood,
      contentType: options.contentType,
    }
  );
  
  console.log(`[AIVideo] Enhanced prompt for ${options.sceneType} scene`);
  
  // Create enhanced options with brand context and negative prompt
  const enhancedOptions: AIVideoOptions = {
    ...options,
    prompt: enhanced.prompt,
    negativePrompt: enhanced.negativePrompt,
  };
  
  // Continue with existing provider selection logic using enhancedOptions
  const providerOrder = selectProvidersForScene(options.sceneType, enhanced.prompt);
  
  // ... rest of existing method, but use enhancedOptions instead of options
}
```

---

## Step 2: Update Runway Video Service

Modify `server/services/runway-video-service.ts`:

### Update the RunwayGenerationOptions interface:
```typescript
interface RunwayGenerationOptions {
  prompt: string;
  duration: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  negativePrompt?: string;  // ADD THIS
}
```

### Update the API call in generateVideo to include negative prompt:

Find the fetch call to create a generation and update the body:

```typescript
const createResponse = await fetch(`${this.provider.endpoint}/generations`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${this.provider.apiKey}`,
    'Content-Type': 'application/json',
    'X-Runway-Version': '2024-11-06',
  },
  body: JSON.stringify({
    promptText: this.formatPrompt(options.prompt),
    model: 'gen3a_turbo',
    duration: Math.min(options.duration, this.provider.maxDuration),
    ratio: this.formatAspectRatio(options.aspectRatio),
    // ADD NEGATIVE PROMPT
    ...(options.negativePrompt && { 
      negativePromptText: options.negativePrompt.substring(0, 500)  // Runway has 500 char limit
    }),
  }),
});
```

### Add logging for negative prompt:
```typescript
console.log(`[Runway] Starting generation...`);
console.log(`[Runway] Prompt: ${options.prompt.substring(0, 100)}...`);
if (options.negativePrompt) {
  console.log(`[Runway] Negative prompt applied (${options.negativePrompt.split(',').length} terms)`);
}
```

---

## Step 3: Update PiAPI Video Service

Modify `server/services/piapi-video-service.ts`:

### Update the PiAPIGenerationOptions interface:
```typescript
interface PiAPIGenerationOptions {
  prompt: string;
  duration: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  model: string;
  negativePrompt?: string;  // ADD THIS
}
```

### Update the createTask method to include negative prompt:

Find the API call body and add negative prompt:

```typescript
body: JSON.stringify({
  model: modelConfig.model,
  task_type: modelConfig.taskType,
  input: {
    prompt: options.prompt,
    duration: Math.min(options.duration, modelConfig.maxDuration || 10),
    aspect_ratio: this.formatAspectRatio(options.aspectRatio, options.model),
    // ADD NEGATIVE PROMPT
    ...(options.negativePrompt && { 
      negative_prompt: options.negativePrompt 
    }),
  },
}),
```

### Add logging:
```typescript
console.log(`[PiAPI:${options.model}] Starting generation...`);
console.log(`[PiAPI:${options.model}] Prompt: ${options.prompt.substring(0, 100)}...`);
if (options.negativePrompt) {
  console.log(`[PiAPI:${options.model}] Negative prompt applied`);
}
```

---

## Step 4: Update Universal Video Service

Modify `server/services/universal-video-service.ts`:

### Add imports at the top:
```typescript
import { brandBibleService } from './brand-bible-service';
import { brandInjectionService, VideoBrandInstructions } from './brand-injection-service';
```

### Update generateProjectAssets method:

Add brand bible loading at the START of the method:

```typescript
async generateProjectAssets(projectId: string): Promise<UpdatedProject> {
  // ... existing initial code ...

  // LOAD BRAND BIBLE AT START
  console.log(`[Assets] Loading brand bible...`);
  const brandBible = await brandBibleService.getBrandBible();
  console.log(`[Assets] Brand loaded: ${brandBible.brandName}, ${brandBible.assets.length} assets`);

  // ... existing asset generation code (videos, audio, images) ...
```

After all video/audio/image assets are generated, add brand instructions generation:

```typescript
  // ... after existing asset generation completes ...

  // GENERATE BRAND OVERLAY INSTRUCTIONS
  console.log(`[Assets] Generating brand overlay instructions...`);
  
  const scenesForBrand = updatedProject.scenes.map((scene: any, index: number) => ({
    id: scene.id,
    type: scene.type,
    duration: scene.duration || 5,
    isFirst: index === 0,
    isLast: index === updatedProject.scenes.length - 1,
  }));
  
  try {
    const brandInstructions = await brandInjectionService.generateBrandInstructions(scenesForBrand);
    
    // Store brand instructions with project (serialize Map to object)
    updatedProject.brandInstructions = {
      introAnimation: brandInstructions.introAnimation,
      watermark: brandInstructions.watermark,
      outroSequence: brandInstructions.outroSequence,
      colors: brandInstructions.colors,
      typography: brandInstructions.typography,
      callToAction: brandInstructions.callToAction,
    };
    
    // Store per-scene brand overlays
    for (const [sceneId, overlays] of brandInstructions.sceneOverlays) {
      const sceneIndex = updatedProject.scenes.findIndex((s: any) => s.id === sceneId);
      if (sceneIndex >= 0) {
        updatedProject.scenes[sceneIndex].brandOverlays = overlays;
      }
    }
    
    console.log(`[Assets] Brand instructions complete`);
    
  } catch (error: any) {
    console.error(`[Assets] Brand instructions failed:`, error.message);
    // Continue without brand instructions - video still works
  }

  // ... rest of existing method ...
}
```

### Ensure video generation passes scene context:

When calling AI video generation, include scene type and mood:

```typescript
// In the video generation loop, update the call to include context:
const videoResult = await aiVideoService.generateVideo({
  prompt: visualPrompt,
  duration: Math.min(scene.duration || 5, 10),
  aspectRatio: aspectRatio,
  sceneType: scene.type,           // ADD THIS
  narration: scene.narration,      // ADD THIS
  mood: scene.analysis?.mood,      // ADD THIS
  contentType: scene.analysis?.contentType,  // ADD THIS if available
});
```

---

## Step 5: Update Project Type Definition

Ensure your project type includes brand instructions. Add to your types file or inline:

```typescript
interface ProjectBrandInstructions {
  introAnimation?: BrandOverlay;
  watermark?: BrandOverlay;
  outroSequence?: BrandOverlay[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  callToAction: {
    text: string;
    subtext?: string;
    url: string;
  };
}

// Add to Scene type:
interface Scene {
  // ... existing fields ...
  brandOverlays?: SceneBrandOverlays;
}

// Add to Project type:
interface Project {
  // ... existing fields ...
  brandInstructions?: ProjectBrandInstructions;
}
```

---

## Verification Checklist

Before moving to Phase 4E, confirm:

- [ ] `ai-video-service.ts` imports and uses `promptEnhancementService`
- [ ] `runway-video-service.ts` passes `negativePromptText` to API
- [ ] `piapi-video-service.ts` passes `negative_prompt` to API
- [ ] `universal-video-service.ts` loads brand bible at start
- [ ] `universal-video-service.ts` generates brand instructions after assets
- [ ] Brand instructions stored in `project.brandInstructions`
- [ ] Per-scene overlays stored in `scene.brandOverlays`
- [ ] Console logs show brand loading and enhancement
- [ ] Video generation works with enhanced prompts

---

## Testing the Integration

1. Create a new video project with a test script
2. Start asset generation
3. Watch console for:
   ```
   [Assets] Loading brand bible...
   [Assets] Brand loaded: Pine Hill Farm, 5 assets
   [Assets] Using AI video for hook scene...
   [PromptEnhance] Enhancing prompt for hook scene
   [AIVideo] Enhanced prompt for hook scene
   [Runway] Starting generation with negative prompt...
   [Runway] Negative prompt applied (45 terms)
   ...
   [Assets] Generating brand overlay instructions...
   [BrandInject] Intro animation configured
   [BrandInject] Watermark overlay configured
   [Assets] Brand instructions complete
   ```
4. Verify the generated video has no garbled AI text

---

## Troubleshooting

### "promptEnhancementService is not defined"
- Check import path is correct
- Verify Phase 4B is complete and service is exported

### "Brand bible not loading"
- Check database connection
- Verify Phase 4A is complete
- Check for assets with `isActive = true`

### "Negative prompt not being applied"
- Check API response for errors
- Runway has 500 char limit on negative prompt
- Verify the negativePrompt field name matches API spec

### "Brand instructions not in project"
- Check that brandInstructions object is being set
- Verify the project is being saved after adding instructions

---

## Next Phase

Once pipeline integration is complete, proceed to **Phase 4E: Remotion Brand Components** to render the brand overlays in the video.
