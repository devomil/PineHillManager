# Phase 16 Addendum: Intelligent Motion Control & Provider Optimization

## Overview

This addendum enhances the AI video generation step (BEFORE Remotion rendering) by adding intelligent motion control based on scene type, mood, and content. This ensures the raw footage from Kling/Veo has appropriate camera movement that matches the narrative.

---

## The Gap

Currently, prompts are sent to video providers without camera direction:

```
CURRENT (No Motion Control):
Prompt: "Woman walking through organic farm at sunset"
Result: Random camera movement (or static) - unpredictable
```

```
AFTER (Intelligent Motion Control):
Prompt: "Woman walking through organic farm at sunset"
Motion: "slow_push_in" + intensity 0.6
Result: Cinematic push toward subject - intentional, professional
```

---

## Motion Control by Scene Type

```typescript
// shared/config/motion-control.ts

export interface MotionControlConfig {
  camera_movement: CameraMovement;
  intensity: number;        // 0.0 to 1.0
  description: string;
  rationale: string;
}

export type CameraMovement = 
  | 'static'           // Locked off, no movement
  | 'push_in'          // Slow zoom toward subject
  | 'pull_out'         // Slow zoom away from subject
  | 'pan_left'         // Horizontal pan left
  | 'pan_right'        // Horizontal pan right
  | 'tilt_up'          // Vertical tilt upward
  | 'tilt_down'        // Vertical tilt downward
  | 'orbit_left'       // Circle around subject (left)
  | 'orbit_right'      // Circle around subject (right)
  | 'tracking'         // Follow moving subject
  | 'crane_up'         // Vertical rise
  | 'crane_down'       // Vertical descent
  | 'dolly_in'         // Physical move toward (parallax)
  | 'dolly_out'        // Physical move away (parallax)
  | 'handheld'         // Subtle organic shake
  | 'steadicam';       // Smooth floating movement

/**
 * Motion control presets by scene type
 */
export const SCENE_TYPE_MOTION: Record<string, MotionControlConfig> = {
  
  // ═══════════════════════════════════════════════════════════════
  // HOOK / OPENING - Draw viewer in, create intrigue
  // ═══════════════════════════════════════════════════════════════
  
  'hook': {
    camera_movement: 'push_in',
    intensity: 0.6,
    description: 'Slow push in to draw viewer into the scene',
    rationale: 'Creates immediate engagement, pulls viewer into the story',
  },
  
  'intro': {
    camera_movement: 'crane_down',
    intensity: 0.5,
    description: 'Descending reveal of the scene',
    rationale: 'Establishes setting with cinematic grandeur',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // PROBLEM / TENSION - Stable, serious, grounded
  // ═══════════════════════════════════════════════════════════════
  
  'problem': {
    camera_movement: 'static',
    intensity: 0.0,
    description: 'Locked off, stable shot',
    rationale: 'Stability during problem statement builds trust and seriousness',
  },
  
  'pain-point': {
    camera_movement: 'handheld',
    intensity: 0.3,
    description: 'Subtle handheld shake',
    rationale: 'Slight unease mirrors the discomfort being discussed',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // SOLUTION / DISCOVERY - Reveal, opening up
  // ═══════════════════════════════════════════════════════════════
  
  'solution': {
    camera_movement: 'orbit_left',
    intensity: 0.5,
    description: 'Slow orbit revealing new perspective',
    rationale: 'Orbiting suggests discovery, seeing from new angle',
  },
  
  'reveal': {
    camera_movement: 'pull_out',
    intensity: 0.6,
    description: 'Pull back to reveal the full picture',
    rationale: 'Reveals scope and possibility',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // BENEFIT / FEATURE - Focus on detail
  // ═══════════════════════════════════════════════════════════════
  
  'benefit': {
    camera_movement: 'dolly_in',
    intensity: 0.5,
    description: 'Dolly in to highlight benefit',
    rationale: 'Moving closer emphasizes importance of the benefit',
  },
  
  'feature': {
    camera_movement: 'orbit_right',
    intensity: 0.4,
    description: 'Gentle orbit to show different angles',
    rationale: 'Shows product/feature from multiple perspectives',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // PRODUCT / SHOWCASE - Hero treatment
  // ═══════════════════════════════════════════════════════════════
  
  'product': {
    camera_movement: 'orbit_left',
    intensity: 0.4,
    description: 'Slow orbit around product',
    rationale: 'Classic product hero shot, shows all angles',
  },
  
  'product-detail': {
    camera_movement: 'push_in',
    intensity: 0.7,
    description: 'Push in to detail/texture',
    rationale: 'Highlights quality and craftsmanship',
  },
  
  'product-lifestyle': {
    camera_movement: 'tracking',
    intensity: 0.5,
    description: 'Track with product in use',
    rationale: 'Shows product in context, in motion',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // PROOF / TESTIMONIAL - Authentic, human
  // ═══════════════════════════════════════════════════════════════
  
  'proof': {
    camera_movement: 'static',
    intensity: 0.0,
    description: 'Stable, trustworthy framing',
    rationale: 'Stability conveys authenticity and trust',
  },
  
  'testimonial': {
    camera_movement: 'push_in',
    intensity: 0.3,
    description: 'Very slow push toward speaker',
    rationale: 'Subtle intimacy, drawing closer to the person',
  },
  
  'social-proof': {
    camera_movement: 'pan_right',
    intensity: 0.4,
    description: 'Pan across multiple elements',
    rationale: 'Shows breadth of proof/reviews/testimonials',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // CTA / CLOSING - Expansive, inviting
  // ═══════════════════════════════════════════════════════════════
  
  'cta': {
    camera_movement: 'pull_out',
    intensity: 0.5,
    description: 'Pull out to wider view',
    rationale: 'Opens up, inviting viewer to take action',
  },
  
  'outro': {
    camera_movement: 'crane_up',
    intensity: 0.6,
    description: 'Rise up and away',
    rationale: 'Cinematic ending, sense of completion and aspiration',
  },
  
  'closing': {
    camera_movement: 'dolly_out',
    intensity: 0.4,
    description: 'Gentle dolly back',
    rationale: 'Graceful exit, leaving space for reflection',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // B-ROLL / ATMOSPHERE - Cinematic filler
  // ═══════════════════════════════════════════════════════════════
  
  'b-roll': {
    camera_movement: 'steadicam',
    intensity: 0.5,
    description: 'Smooth floating movement',
    rationale: 'Cinematic, professional atmosphere shots',
  },
  
  'atmosphere': {
    camera_movement: 'pan_left',
    intensity: 0.3,
    description: 'Slow environmental pan',
    rationale: 'Establishes mood and setting',
  },
  
  'transition': {
    camera_movement: 'tracking',
    intensity: 0.6,
    description: 'Following movement through space',
    rationale: 'Creates visual bridge between scenes',
  },
  
  // ═══════════════════════════════════════════════════════════════
  // DEFAULT
  // ═══════════════════════════════════════════════════════════════
  
  'default': {
    camera_movement: 'push_in',
    intensity: 0.4,
    description: 'Subtle push in',
    rationale: 'Safe default that adds cinematic quality',
  },
};
```

---

## Motion Control by Content Analysis

```typescript
// shared/config/motion-control.ts (continued)

/**
 * Analyze visual direction for motion hints
 */
export function analyzeMotionFromContent(visualDirection: string): Partial<MotionControlConfig> | null {
  const lower = visualDirection.toLowerCase();
  
  // Check for explicit camera directions in the prompt
  const explicitMotions: Array<{ keywords: string[]; config: Partial<MotionControlConfig> }> = [
    {
      keywords: ['push in', 'zoom in', 'move closer', 'approach'],
      config: { camera_movement: 'push_in', intensity: 0.6 },
    },
    {
      keywords: ['pull out', 'zoom out', 'pull back', 'reveal wide'],
      config: { camera_movement: 'pull_out', intensity: 0.6 },
    },
    {
      keywords: ['pan left', 'move left', 'look left'],
      config: { camera_movement: 'pan_left', intensity: 0.5 },
    },
    {
      keywords: ['pan right', 'move right', 'look right'],
      config: { camera_movement: 'pan_right', intensity: 0.5 },
    },
    {
      keywords: ['orbit', 'circle around', 'rotate around', '360'],
      config: { camera_movement: 'orbit_left', intensity: 0.5 },
    },
    {
      keywords: ['tracking', 'follow', 'following'],
      config: { camera_movement: 'tracking', intensity: 0.5 },
    },
    {
      keywords: ['crane up', 'rise', 'ascending', 'lift up'],
      config: { camera_movement: 'crane_up', intensity: 0.5 },
    },
    {
      keywords: ['crane down', 'descend', 'lower', 'drop down'],
      config: { camera_movement: 'crane_down', intensity: 0.5 },
    },
    {
      keywords: ['static', 'locked', 'still', 'no movement'],
      config: { camera_movement: 'static', intensity: 0.0 },
    },
    {
      keywords: ['handheld', 'documentary', 'organic movement'],
      config: { camera_movement: 'handheld', intensity: 0.4 },
    },
    {
      keywords: ['dolly', 'parallax'],
      config: { camera_movement: 'dolly_in', intensity: 0.5 },
    },
    {
      keywords: ['steadicam', 'smooth', 'floating', 'glide'],
      config: { camera_movement: 'steadicam', intensity: 0.5 },
    },
  ];
  
  for (const motion of explicitMotions) {
    if (motion.keywords.some(kw => lower.includes(kw))) {
      return motion.config;
    }
  }
  
  // Content-based inference
  if (lower.includes('walking') || lower.includes('moving') || lower.includes('running')) {
    return { camera_movement: 'tracking', intensity: 0.5 };
  }
  
  if (lower.includes('product') && (lower.includes('table') || lower.includes('display'))) {
    return { camera_movement: 'orbit_left', intensity: 0.4 };
  }
  
  if (lower.includes('landscape') || lower.includes('wide shot') || lower.includes('establishing')) {
    return { camera_movement: 'pan_right', intensity: 0.3 };
  }
  
  if (lower.includes('detail') || lower.includes('close-up') || lower.includes('macro')) {
    return { camera_movement: 'push_in', intensity: 0.5 };
  }
  
  return null;  // No specific motion detected
}

/**
 * Get motion control for a scene
 */
export function getMotionControl(
  sceneType: string,
  visualDirection: string,
  overrideConfig?: Partial<MotionControlConfig>
): MotionControlConfig {
  
  // Check for explicit motion in visual direction
  const contentMotion = analyzeMotionFromContent(visualDirection);
  
  // Get scene type default
  const sceneTypeMotion = SCENE_TYPE_MOTION[sceneType] || SCENE_TYPE_MOTION['default'];
  
  // Priority: Override > Content Analysis > Scene Type Default
  return {
    ...sceneTypeMotion,
    ...contentMotion,
    ...overrideConfig,
  };
}
```

---

## Provider-Specific Motion Implementation

### Kling Motion Control

```typescript
// server/services/providers/kling-provider.ts

import { MotionControlConfig, CameraMovement } from '@/shared/config/motion-control';

/**
 * Map our motion control to Kling's API format
 */
function mapToKlingMotion(config: MotionControlConfig): object {
  // Kling uses different parameter names
  const klingCameraMap: Record<CameraMovement, string> = {
    'static': 'none',
    'push_in': 'zoom_in',
    'pull_out': 'zoom_out',
    'pan_left': 'pan_left',
    'pan_right': 'pan_right',
    'tilt_up': 'tilt_up',
    'tilt_down': 'tilt_down',
    'orbit_left': 'rotate_left',
    'orbit_right': 'rotate_right',
    'tracking': 'tracking',
    'crane_up': 'crane_up',
    'crane_down': 'crane_down',
    'dolly_in': 'zoom_in',      // Kling doesn't have true dolly
    'dolly_out': 'zoom_out',
    'handheld': 'none',          // Kling doesn't support handheld
    'steadicam': 'tracking',
  };
  
  return {
    camera_control: {
      type: klingCameraMap[config.camera_movement] || 'none',
      config: {
        intensity: config.intensity,
      },
    },
  };
}

/**
 * Generate video with Kling including motion control
 */
export async function generateWithKling(
  prompt: string,
  options: {
    imageUrl?: string;
    duration?: number;
    motionControl?: MotionControlConfig;
    aspectRatio?: string;
  }
): Promise<{ taskId: string }> {
  
  const motionParams = options.motionControl 
    ? mapToKlingMotion(options.motionControl)
    : {};
  
  const isI2V = !!options.imageUrl;
  
  const body = {
    model: 'kling',
    task_type: isI2V ? 'video_generation' : 'text2video',
    input: {
      prompt: prompt,
      ...(isI2V && { image_url: options.imageUrl }),
      duration: String(options.duration || 5),
      aspect_ratio: options.aspectRatio || '16:9',
      mode: 'pro',
      ...motionParams,
    },
  };
  
  console.log(`[Kling] Request with motion: ${options.motionControl?.camera_movement || 'none'}`);
  
  const response = await fetch('https://api.piapi.ai/api/v1/task', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.PIAPI_API_KEY!,
    },
    body: JSON.stringify(body),
  });
  
  const result = await response.json();
  return { taskId: result.data?.task_id };
}
```

### Veo 3 Motion Control

```typescript
// server/services/providers/veo-provider.ts

import { MotionControlConfig } from '@/shared/config/motion-control';

/**
 * For Veo, motion is controlled via prompt engineering
 * Veo doesn't have explicit motion parameters like Kling
 */
function buildVeoMotionPrompt(
  basePrompt: string,
  motionConfig: MotionControlConfig
): string {
  
  const motionDescriptions: Record<string, string> = {
    'static': 'locked off camera, no movement',
    'push_in': 'slow cinematic push in toward subject',
    'pull_out': 'gradual pull back revealing wider scene',
    'pan_left': 'smooth horizontal pan to the left',
    'pan_right': 'smooth horizontal pan to the right',
    'tilt_up': 'gentle tilt upward',
    'tilt_down': 'gentle tilt downward',
    'orbit_left': 'camera slowly orbits around subject to the left',
    'orbit_right': 'camera slowly orbits around subject to the right',
    'tracking': 'camera smoothly tracks with moving subject',
    'crane_up': 'camera rises smoothly upward',
    'crane_down': 'camera descends smoothly',
    'dolly_in': 'camera dollies forward with parallax',
    'dolly_out': 'camera dollies backward with parallax',
    'handheld': 'subtle organic handheld movement',
    'steadicam': 'smooth floating steadicam movement',
  };
  
  const motionDescription = motionDescriptions[motionConfig.camera_movement] || '';
  
  // Add intensity modifier
  const intensityModifier = motionConfig.intensity > 0.7 
    ? 'pronounced' 
    : motionConfig.intensity > 0.4 
      ? 'gentle' 
      : 'subtle';
  
  if (motionConfig.camera_movement === 'static') {
    return `${basePrompt}. Static shot, locked off camera, no movement.`;
  }
  
  return `${basePrompt}. Camera: ${intensityModifier} ${motionDescription}.`;
}

/**
 * Generate video with Veo 3 including motion control
 */
export async function generateWithVeo(
  prompt: string,
  options: {
    imageUrl?: string;
    duration?: number;
    motionControl?: MotionControlConfig;
    aspectRatio?: string;
    generateAudio?: boolean;
  }
): Promise<{ taskId: string }> {
  
  // Build prompt with motion instructions
  const enhancedPrompt = options.motionControl
    ? buildVeoMotionPrompt(prompt, options.motionControl)
    : prompt;
  
  console.log(`[Veo] Enhanced prompt: ${enhancedPrompt}`);
  
  const isI2V = !!options.imageUrl;
  
  const body = {
    model: 'veo3',
    task_type: 'veo3-video',
    input: {
      prompt: enhancedPrompt,
      ...(isI2V && { image_url: options.imageUrl }),
      aspect_ratio: options.aspectRatio || '16:9',
      duration: `${options.duration || 8}s`,
      resolution: '1080p',
      generate_audio: options.generateAudio || false,
    },
  };
  
  const response = await fetch('https://api.piapi.ai/api/v1/task', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.PIAPI_API_KEY!,
    },
    body: JSON.stringify(body),
  });
  
  const result = await response.json();
  return { taskId: result.data?.task_id };
}
```

---

## Integration with Scene Generation

```typescript
// server/services/scene-video-generation-service.ts

import { getMotionControl, MotionControlConfig } from '@/shared/config/motion-control';
import { generateWithKling } from './providers/kling-provider';
import { generateWithVeo } from './providers/veo-provider';

interface SceneGenerationRequest {
  scene: Scene;
  brandAsset?: BrandAsset;
  provider: 'kling' | 'veo3';
  qualityTier: 'standard' | 'premium' | 'ultra';
}

/**
 * Generate video for a scene with intelligent motion control
 */
export async function generateSceneVideo(request: SceneGenerationRequest): Promise<string> {
  const { scene, brandAsset, provider, qualityTier } = request;
  
  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Determine motion control
  // ═══════════════════════════════════════════════════════════════
  
  const motionControl = getMotionControl(
    scene.sceneType,
    scene.visualDirection,
    scene.motionOverride  // Optional manual override from UI
  );
  
  console.log(`[SceneGen] Scene ${scene.id} (${scene.sceneType})`);
  console.log(`[SceneGen] Motion: ${motionControl.camera_movement} @ ${motionControl.intensity}`);
  console.log(`[SceneGen] Rationale: ${motionControl.rationale}`);
  
  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Determine if I2V or T2V
  // ═══════════════════════════════════════════════════════════════
  
  const useI2V = brandAsset && shouldUseI2V(brandAsset, scene);
  const imageUrl = useI2V ? brandAsset.fileUrl : undefined;
  
  if (useI2V) {
    console.log(`[SceneGen] Using I2V with asset: ${brandAsset.name}`);
  } else {
    console.log(`[SceneGen] Using T2V (text-to-video)`);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Generate with appropriate provider
  // ═══════════════════════════════════════════════════════════════
  
  let taskId: string;
  
  if (provider === 'veo3') {
    const result = await generateWithVeo(scene.visualDirection, {
      imageUrl,
      duration: scene.duration,
      motionControl,
      aspectRatio: '16:9',
      generateAudio: false,
    });
    taskId = result.taskId;
  } else {
    const result = await generateWithKling(scene.visualDirection, {
      imageUrl,
      duration: scene.duration,
      motionControl,
      aspectRatio: '16:9',
    });
    taskId = result.taskId;
  }
  
  console.log(`[SceneGen] Task created: ${taskId}`);
  
  // ═══════════════════════════════════════════════════════════════
  // STEP 4: Wait for completion and return video URL
  // ═══════════════════════════════════════════════════════════════
  
  const videoUrl = await waitForVideoCompletion(taskId, provider);
  
  // Save motion control used (for debugging/analytics)
  await saveSceneMetadata(scene.id, {
    motionControl,
    provider,
    usedI2V: useI2V,
    brandAssetId: brandAsset?.id,
  });
  
  return videoUrl;
}

/**
 * Determine if scene should use I2V based on asset type
 */
function shouldUseI2V(asset: BrandAsset, scene: Scene): boolean {
  const i2vAssetTypes = [
    'location-interior',
    'location-exterior',
    'location-farm',
    'product-lifestyle',
    'product-hero',
    'service-equipment',
    'people-founder',
    'people-team',
  ];
  
  // Check if asset type supports I2V
  if (!asset.assetType || !i2vAssetTypes.some(t => asset.assetType.startsWith(t))) {
    return false;
  }
  
  // Check if scene visual direction mentions the asset
  const assetKeywords = asset.name.toLowerCase().split(' ');
  const visualLower = scene.visualDirection.toLowerCase();
  
  return assetKeywords.some(kw => visualLower.includes(kw));
}
```

---

## UI: Motion Control Override

```typescript
// Add to scene editor UI

interface MotionControlSelectorProps {
  sceneType: string;
  visualDirection: string;
  value?: MotionControlConfig;
  onChange: (config: MotionControlConfig) => void;
}

const MOTION_OPTIONS = [
  { value: 'auto', label: 'Auto (Recommended)', description: 'AI selects based on scene type' },
  { value: 'static', label: 'Static', description: 'No camera movement' },
  { value: 'push_in', label: 'Push In', description: 'Zoom toward subject' },
  { value: 'pull_out', label: 'Pull Out', description: 'Zoom away from subject' },
  { value: 'orbit_left', label: 'Orbit Left', description: 'Circle around subject' },
  { value: 'orbit_right', label: 'Orbit Right', description: 'Circle around subject' },
  { value: 'pan_left', label: 'Pan Left', description: 'Horizontal pan' },
  { value: 'pan_right', label: 'Pan Right', description: 'Horizontal pan' },
  { value: 'tracking', label: 'Tracking', description: 'Follow moving subject' },
  { value: 'crane_up', label: 'Crane Up', description: 'Rise upward' },
  { value: 'crane_down', label: 'Crane Down', description: 'Descend' },
  { value: 'steadicam', label: 'Steadicam', description: 'Smooth floating movement' },
  { value: 'handheld', label: 'Handheld', description: 'Organic, documentary feel' },
];

export function MotionControlSelector({
  sceneType,
  visualDirection,
  value,
  onChange,
}: MotionControlSelectorProps) {
  const autoConfig = getMotionControl(sceneType, visualDirection);
  
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Camera Motion</label>
      
      <Select
        value={value?.camera_movement || 'auto'}
        onValueChange={(movement) => {
          if (movement === 'auto') {
            onChange(autoConfig);
          } else {
            onChange({
              camera_movement: movement as CameraMovement,
              intensity: 0.5,
              description: '',
              rationale: 'Manual override',
            });
          }
        }}
      >
        {MOTION_OPTIONS.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            <div className="flex flex-col">
              <span>{opt.label}</span>
              <span className="text-xs text-muted-foreground">{opt.description}</span>
            </div>
          </SelectItem>
        ))}
      </Select>
      
      {/* Intensity slider */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Intensity</label>
        <Slider
          value={[value?.intensity || autoConfig.intensity]}
          min={0}
          max={1}
          step={0.1}
          onValueChange={([intensity]) => {
            onChange({
              ...(value || autoConfig),
              intensity,
            });
          }}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Subtle</span>
          <span>Pronounced</span>
        </div>
      </div>
      
      {/* Preview */}
      <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
        <strong>Preview:</strong> {value?.camera_movement || autoConfig.camera_movement} 
        @ {((value?.intensity || autoConfig.intensity) * 100).toFixed(0)}% intensity
        <br />
        <em>{autoConfig.rationale}</em>
      </div>
    </div>
  );
}
```

---

## Summary: Motion Control by Scene Type

| Scene Type | Default Motion | Intensity | Rationale |
|------------|----------------|-----------|-----------|
| **Hook** | Push In | 60% | Draw viewer in |
| **Problem** | Static | 0% | Stability = trust |
| **Solution** | Orbit Left | 50% | Discovery, new angle |
| **Benefit** | Dolly In | 50% | Emphasize importance |
| **Product** | Orbit Left | 40% | Classic hero shot |
| **Proof** | Static | 0% | Authenticity |
| **CTA** | Pull Out | 50% | Open, inviting |
| **B-Roll** | Steadicam | 50% | Cinematic atmosphere |

---

## Verification Checklist

- [ ] Motion control config created for all scene types
- [ ] Content analysis detects explicit motion keywords
- [ ] Kling provider maps motion to API parameters
- [ ] Veo provider builds motion-enhanced prompts
- [ ] Scene generation uses appropriate motion control
- [ ] UI allows manual motion override
- [ ] Console logs show motion decisions
- [ ] Different scene types produce different camera movements
