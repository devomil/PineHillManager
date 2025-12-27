# Phase 1C: Professional Sound Design with Kling Sound

## Objective
Add professional sound design using Kling Sound via PiAPI. This includes transition sound effects (whooshes), ambient soundscapes, and audio branding elements that separate amateur videos from TV-commercial quality.

## Prerequisites
- Phase 1A complete (Runway integration)
- Phase 1B complete (PiAPI multi-provider working)
- PIAPI_API_KEY configured

## What Success Looks Like
- Scene transitions have professional "whoosh" sounds
- Ambient audio matches scene mood (nature sounds, subtle tones)
- Audio layers properly mixed (voice > music > SFX > ambience)
- Consistent audio branding (optional sonic logo)

---

## Why Sound Design Matters

TV commercials have **layers** of audio:

```
Layer 1: Voiceover (loudest, -6dB)
Layer 2: Sound Effects (transitions, emphasis, -12dB)
Layer 3: Background Music (-18dB, ducked during voice)
Layer 4: Ambient Sound (subtle atmosphere, -24dB)
```

Current system only has Layer 1 and Layer 3. Adding Layers 2 and 4 creates professional polish.

---

## Step 1: Create Sound Design Service

Create `server/services/sound-design-service.ts`:

```typescript
// server/services/sound-design-service.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export interface SoundEffect {
  type: 'whoosh' | 'transition' | 'impact' | 'sparkle' | 'ambient' | 'notification' | 'success';
  url: string;
  duration: number;
  volume: number;  // 0-1
}

export interface SceneSoundDesign {
  sceneId: string;
  transitionIn?: SoundEffect;
  transitionOut?: SoundEffect;
  ambience?: SoundEffect;
  emphasis?: SoundEffect[];  // Sound effects synced to specific moments
}

interface SoundGenerationOptions {
  type: 'sfx' | 'ambient';
  prompt: string;
  duration: number;
  mood?: string;
}

class SoundDesignService {
  private s3Client: S3Client;
  private bucket = process.env.REMOTION_AWS_BUCKET || 'remotionlambda-useast1-refjo5giq5';
  private apiKey = process.env.PIAPI_API_KEY || '';
  private baseUrl = 'https://api.piapi.ai/api/v1';

  // Pre-defined sound effect prompts for consistency
  private soundPrompts = {
    whoosh: {
      soft: 'Soft whoosh sound effect, gentle air movement, subtle transition',
      medium: 'Medium whoosh sound effect, smooth transition, cinematic',
      dramatic: 'Dramatic whoosh sound effect, powerful air sweep, impactful',
    },
    transition: {
      fade: 'Gentle fade transition sound, soft tonal shift',
      reveal: 'Reveal sound effect, magical shimmer, unveiling',
      cut: 'Clean cut transition sound, subtle click',
    },
    ambient: {
      nature: 'Peaceful nature ambience, gentle breeze, birds distant, wellness spa atmosphere',
      wellness: 'Calm wellness spa ambient sound, soft tones, relaxing atmosphere',
      morning: 'Morning ambience, soft sunlight feeling, peaceful awakening',
      energy: 'Subtle energetic ambient tone, positive vibes, uplifting',
    },
    emphasis: {
      sparkle: 'Magical sparkle sound effect, twinkling, highlight moment',
      success: 'Success chime, achievement sound, positive confirmation',
      notification: 'Soft notification sound, gentle alert, attention',
    },
  };

  constructor() {
    this.s3Client = new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Generate sound design for all scenes in a project
   */
  async generateProjectSoundDesign(
    scenes: Array<{
      id: string;
      type: string;
      duration: number;
      mood?: string;
      isFirst?: boolean;
      isLast?: boolean;
    }>
  ): Promise<Map<string, SceneSoundDesign>> {
    const soundDesigns = new Map<string, SceneSoundDesign>();

    if (!this.isAvailable()) {
      console.warn('[SoundDesign] PiAPI not configured, skipping sound design');
      return soundDesigns;
    }

    console.log(`[SoundDesign] Generating sound design for ${scenes.length} scenes...`);

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const isFirst = i === 0;
      const isLast = i === scenes.length - 1;

      const design = await this.generateSceneSoundDesign(scene, isFirst, isLast);
      soundDesigns.set(scene.id, design);

      console.log(`[SoundDesign] Scene ${i + 1}/${scenes.length} complete`);
    }

    return soundDesigns;
  }

  /**
   * Generate sound design for a single scene
   */
  async generateSceneSoundDesign(
    scene: { id: string; type: string; duration: number; mood?: string },
    isFirst: boolean,
    isLast: boolean
  ): Promise<SceneSoundDesign> {
    const design: SceneSoundDesign = {
      sceneId: scene.id,
    };

    try {
      // Transition sounds (not for first scene's in or last scene's out)
      if (!isFirst) {
        design.transitionIn = await this.generateTransitionSound(scene.type, scene.mood, 'in');
      }

      if (!isLast) {
        design.transitionOut = await this.generateTransitionSound(scene.type, scene.mood, 'out');
      }

      // Ambient sound for certain scene types
      if (this.shouldHaveAmbience(scene.type)) {
        design.ambience = await this.generateAmbientSound(scene.type, scene.mood, scene.duration);
      }

      // Emphasis sounds for specific scene types
      if (scene.type === 'cta' || scene.type === 'product') {
        const emphasis = await this.generateEmphasisSound(scene.type);
        if (emphasis) {
          design.emphasis = [emphasis];
        }
      }

    } catch (error: any) {
      console.error(`[SoundDesign] Error generating sounds for scene ${scene.id}:`, error.message);
    }

    return design;
  }

  /**
   * Generate transition sound effect
   */
  private async generateTransitionSound(
    sceneType: string,
    mood: string | undefined,
    direction: 'in' | 'out'
  ): Promise<SoundEffect | undefined> {
    // Select appropriate whoosh intensity based on scene type
    let intensity: 'soft' | 'medium' | 'dramatic' = 'medium';
    
    if (sceneType === 'hook' || sceneType === 'cta') {
      intensity = 'dramatic';
    } else if (sceneType === 'explanation' || sceneType === 'broll') {
      intensity = 'soft';
    }

    const prompt = this.soundPrompts.whoosh[intensity];
    
    const result = await this.generateSound({
      type: 'sfx',
      prompt,
      duration: 0.8,  // Short transition sound
      mood,
    });

    if (result) {
      return {
        type: 'whoosh',
        url: result.url,
        duration: result.duration,
        volume: 0.6,  // -6dB below full
      };
    }

    return undefined;
  }

  /**
   * Generate ambient background sound
   */
  private async generateAmbientSound(
    sceneType: string,
    mood: string | undefined,
    duration: number
  ): Promise<SoundEffect | undefined> {
    // Select ambient type based on scene
    let ambientType: keyof typeof this.soundPrompts.ambient = 'wellness';
    
    if (sceneType === 'hook' && mood === 'negative') {
      ambientType = 'morning';  // Subtle, not distracting
    } else if (sceneType === 'testimonial' || sceneType === 'story') {
      ambientType = 'wellness';
    } else if (sceneType === 'benefit' || sceneType === 'explanation') {
      ambientType = 'nature';
    } else if (sceneType === 'cta') {
      ambientType = 'energy';
    }

    const prompt = this.soundPrompts.ambient[ambientType];
    
    const result = await this.generateSound({
      type: 'ambient',
      prompt,
      duration: Math.min(duration, 30),  // Cap at 30 seconds
      mood,
    });

    if (result) {
      return {
        type: 'ambient',
        url: result.url,
        duration: result.duration,
        volume: 0.15,  // Very subtle, -18dB
      };
    }

    return undefined;
  }

  /**
   * Generate emphasis sound effect
   */
  private async generateEmphasisSound(
    sceneType: string
  ): Promise<SoundEffect | undefined> {
    let emphasisType: keyof typeof this.soundPrompts.emphasis = 'sparkle';
    
    if (sceneType === 'cta') {
      emphasisType = 'success';
    } else if (sceneType === 'product') {
      emphasisType = 'sparkle';
    }

    const prompt = this.soundPrompts.emphasis[emphasisType];
    
    const result = await this.generateSound({
      type: 'sfx',
      prompt,
      duration: 1.5,
    });

    if (result) {
      return {
        type: emphasisType as SoundEffect['type'],
        url: result.url,
        duration: result.duration,
        volume: 0.5,
      };
    }

    return undefined;
  }

  /**
   * Generate sound using Kling Sound via PiAPI
   */
  private async generateSound(
    options: SoundGenerationOptions
  ): Promise<{ url: string; duration: number } | null> {
    try {
      console.log(`[SoundDesign] Generating ${options.type}: "${options.prompt.substring(0, 50)}..."`);

      // Create task
      const response = await fetch(`${this.baseUrl}/task`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'kling-sound',  // Kling Sound model
          task_type: 'text_to_audio',
          input: {
            prompt: options.prompt,
            duration: options.duration,
            // Add mood context if available
            style: options.mood || 'cinematic',
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SoundDesign] API error: ${response.status} - ${errorText}`);
        return null;
      }

      const data = await response.json();
      const taskId = data.data?.task_id || data.task_id;

      if (!taskId) {
        console.error('[SoundDesign] No task ID in response');
        return null;
      }

      // Poll for completion
      const result = await this.pollForCompletion(taskId);
      
      if (result.success && result.audioUrl) {
        // Upload to S3
        const s3Url = await this.uploadToS3(result.audioUrl, options.type);
        return {
          url: s3Url,
          duration: options.duration,
        };
      }

      return null;

    } catch (error: any) {
      console.error(`[SoundDesign] Generation failed:`, error.message);
      return null;
    }
  }

  /**
   * Poll for task completion
   */
  private async pollForCompletion(
    taskId: string
  ): Promise<{ success: boolean; audioUrl?: string }> {
    const maxAttempts = 60;
    const pollInterval = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(pollInterval);

      try {
        const response = await fetch(`${this.baseUrl}/task/${taskId}`, {
          headers: { 'X-API-Key': this.apiKey },
        });

        if (!response.ok) continue;

        const data = await response.json();
        const status = data.data?.status || data.status;

        if (status === 'completed' || status === 'success' || status === 'SUCCESS') {
          const audioUrl = data.data?.output?.audio_url || 
                          data.data?.output?.audio ||
                          data.data?.audio_url;
          
          if (audioUrl) {
            return { success: true, audioUrl };
          }
        }

        if (status === 'failed' || status === 'error') {
          return { success: false };
        }

      } catch (error) {
        // Continue polling
      }
    }

    return { success: false };
  }

  /**
   * Upload audio to S3
   */
  private async uploadToS3(audioUrl: string, type: string): Promise<string> {
    try {
      const response = await fetch(audioUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      
      const key = `sound-design/${type}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;

      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'audio/mpeg',
      }));

      return `https://${this.bucket}.s3.us-east-1.amazonaws.com/${key}`;

    } catch (error: any) {
      console.warn(`[SoundDesign] S3 upload failed:`, error.message);
      return audioUrl;
    }
  }

  /**
   * Determine if scene type should have ambient sound
   */
  private shouldHaveAmbience(sceneType: string): boolean {
    const ambientScenes = ['hook', 'testimonial', 'story', 'benefit', 'cta'];
    return ambientScenes.includes(sceneType);
  }

  /**
   * Get pre-made transition sound (fallback)
   * In case AI generation fails, use stock sounds
   */
  getStockTransitionSound(intensity: 'soft' | 'medium' | 'dramatic'): SoundEffect {
    // These would be pre-uploaded stock sounds in S3
    const stockSounds: Record<string, string> = {
      soft: `https://${this.bucket}.s3.us-east-1.amazonaws.com/stock-sounds/whoosh-soft.mp3`,
      medium: `https://${this.bucket}.s3.us-east-1.amazonaws.com/stock-sounds/whoosh-medium.mp3`,
      dramatic: `https://${this.bucket}.s3.us-east-1.amazonaws.com/stock-sounds/whoosh-dramatic.mp3`,
    };

    return {
      type: 'whoosh',
      url: stockSounds[intensity],
      duration: 0.8,
      volume: 0.6,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const soundDesignService = new SoundDesignService();
```

---

## Step 2: Integrate with Universal Video Service

Update `server/services/universal-video-service.ts`:

### Add import:
```typescript
import { soundDesignService, SceneSoundDesign } from './sound-design-service';
```

### Add sound design generation after video/image generation:

```typescript
// After video and image generation, add sound design

console.log(`[Assets] Generating sound design...`);

if (updatedProject.progress?.steps) {
  updatedProject.progress.currentStep = 'sound-design';
  // Add sound-design step if not exists
  if (!updatedProject.progress.steps['sound-design']) {
    updatedProject.progress.steps['sound-design'] = {
      status: 'in-progress',
      progress: 0,
      message: 'Generating sound effects...',
    };
  }
}

try {
  const scenesForSound = updatedProject.scenes.map((scene, index) => ({
    id: scene.id,
    type: scene.type,
    duration: scene.duration,
    mood: scene.analysis?.mood,
    isFirst: index === 0,
    isLast: index === updatedProject.scenes.length - 1,
  }));

  const soundDesigns = await soundDesignService.generateProjectSoundDesign(scenesForSound);

  // Attach sound design to each scene
  for (const [sceneId, design] of soundDesigns) {
    const sceneIndex = updatedProject.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex >= 0) {
      updatedProject.scenes[sceneIndex].soundDesign = design;
    }
  }

  console.log(`[Assets] Sound design complete for ${soundDesigns.size} scenes`);

  if (updatedProject.progress?.steps?.['sound-design']) {
    updatedProject.progress.steps['sound-design'].status = 'complete';
    updatedProject.progress.steps['sound-design'].progress = 100;
  }

} catch (error: any) {
  console.error(`[Assets] Sound design failed:`, error.message);
  // Continue without sound design - it's an enhancement
  if (updatedProject.progress?.steps?.['sound-design']) {
    updatedProject.progress.steps['sound-design'].status = 'skipped';
    updatedProject.progress.steps['sound-design'].message = 'Sound design skipped';
  }
}
```

---

## Step 3: Update Remotion Composition for Sound

Update `remotion/UniversalVideoComposition.tsx`:

### Add audio component for sound effects:

```tsx
import { Audio, Sequence, interpolate } from 'remotion';

interface SceneSoundDesign {
  transitionIn?: { url: string; duration: number; volume: number };
  transitionOut?: { url: string; duration: number; volume: number };
  ambience?: { url: string; duration: number; volume: number };
  emphasis?: Array<{ url: string; duration: number; volume: number; timestamp?: number }>;
}

const SceneSoundEffects: React.FC<{
  soundDesign: SceneSoundDesign | undefined;
  sceneStartFrame: number;
  sceneDuration: number;
  fps: number;
}> = ({ soundDesign, sceneStartFrame, sceneDuration, fps }) => {
  if (!soundDesign) return null;

  const sceneFrames = sceneDuration * fps;

  return (
    <>
      {/* Transition In Sound */}
      {soundDesign.transitionIn && (
        <Sequence from={sceneStartFrame} durationInFrames={Math.ceil(soundDesign.transitionIn.duration * fps)}>
          <Audio
            src={soundDesign.transitionIn.url}
            volume={soundDesign.transitionIn.volume}
          />
        </Sequence>
      )}

      {/* Ambient Sound (loops through scene) */}
      {soundDesign.ambience && (
        <Sequence from={sceneStartFrame} durationInFrames={sceneFrames}>
          <Audio
            src={soundDesign.ambience.url}
            volume={soundDesign.ambience.volume}
            loop
          />
        </Sequence>
      )}

      {/* Transition Out Sound */}
      {soundDesign.transitionOut && (
        <Sequence 
          from={sceneStartFrame + sceneFrames - Math.ceil(soundDesign.transitionOut.duration * fps)} 
          durationInFrames={Math.ceil(soundDesign.transitionOut.duration * fps)}
        >
          <Audio
            src={soundDesign.transitionOut.url}
            volume={soundDesign.transitionOut.volume}
          />
        </Sequence>
      )}

      {/* Emphasis Sounds */}
      {soundDesign.emphasis?.map((effect, index) => {
        const emphasisFrame = sceneStartFrame + (effect.timestamp || sceneDuration * 0.5) * fps;
        return (
          <Sequence 
            key={`emphasis-${index}`}
            from={Math.floor(emphasisFrame)} 
            durationInFrames={Math.ceil(effect.duration * fps)}
          >
            <Audio
              src={effect.url}
              volume={effect.volume}
            />
          </Sequence>
        );
      })}
    </>
  );
};
```

### Use in main composition:

```tsx
// In your main composition, add sound effects for each scene

{scenes.map((scene, index) => {
  const sceneStartFrame = calculateSceneStartFrame(scenes, index, fps);
  
  return (
    <React.Fragment key={scene.id}>
      {/* Visual content */}
      <Sequence from={sceneStartFrame} durationInFrames={scene.duration * fps}>
        {renderSceneContent(scene)}
      </Sequence>
      
      {/* Sound effects */}
      <SceneSoundEffects
        soundDesign={scene.soundDesign}
        sceneStartFrame={sceneStartFrame}
        sceneDuration={scene.duration}
        fps={fps}
      />
    </React.Fragment>
  );
})}
```

---

## Step 4: Audio Mixing Considerations

### Volume Levels (Industry Standard)
```
Voiceover:     -6dB  (1.0 volume, reference level)
Sound Effects: -12dB (0.5 volume)
Music:         -18dB (0.25 volume, ducked to -24dB during voice)
Ambience:      -24dB (0.15 volume)
```

### Audio Ducking (Music during voiceover)
Update your music component to duck when voiceover is playing:

```tsx
const BackgroundMusicWithDucking: React.FC<{
  musicUrl: string;
  voiceoverRanges: Array<{ start: number; end: number }>;  // in frames
  fps: number;
}> = ({ musicUrl, voiceoverRanges, fps }) => {
  const frame = useCurrentFrame();
  
  // Check if current frame is during voiceover
  const isDuringVoiceover = voiceoverRanges.some(
    range => frame >= range.start && frame <= range.end
  );
  
  // Duck music during voiceover
  const volume = isDuringVoiceover ? 0.15 : 0.25;  // -18dB to -24dB
  
  return (
    <Audio
      src={musicUrl}
      volume={volume}
      loop
    />
  );
};
```

---

## Step 5: Test Sound Design

1. Create a new video project
2. Generate assets (should now include sound design step)
3. Watch console for:
   ```
   [Assets] Generating sound design...
   [SoundDesign] Generating sound design for 4 scenes...
   [SoundDesign] Generating sfx: "Medium whoosh sound effect..."
   [SoundDesign] Generating ambient: "Peaceful nature ambience..."
   [SoundDesign] Scene 1/4 complete
   [SoundDesign] Scene 2/4 complete
   [SoundDesign] Scene 3/4 complete
   [SoundDesign] Scene 4/4 complete
   [Assets] Sound design complete for 4 scenes
   ```
4. Render the video
5. Listen for:
   - Whoosh sounds between scenes
   - Subtle ambient audio
   - Proper audio mixing (voice clear above everything)

---

## Verification Checklist

- [ ] `sound-design-service.ts` created and exports service
- [ ] `universal-video-service.ts` imports and calls sound design
- [ ] Remotion composition has `SceneSoundEffects` component
- [ ] Sound design data stored in `scene.soundDesign`
- [ ] Transition sounds generated for scene changes
- [ ] Ambient sounds generated for appropriate scenes
- [ ] Audio volumes properly set for mixing
- [ ] Sound effects audible in rendered video
- [ ] Voiceover remains clear and prominent

---

## Fallback Strategy

If Kling Sound fails or is unavailable:

1. **Skip sound design** - Video still works, just without SFX
2. **Use stock sounds** - Pre-upload standard whoosh sounds to S3
3. **Generate with alternative** - Try MMAudio or other audio model

```typescript
// Fallback in sound-design-service.ts
if (!result) {
  console.warn('[SoundDesign] AI generation failed, using stock sound');
  return this.getStockTransitionSound(intensity);
}
```

---

## Cost Estimate

| Sound Type | Count per Video | Cost Each | Total |
|------------|-----------------|-----------|-------|
| Whoosh transitions | 6-8 | ~$0.02 | ~$0.14 |
| Ambient sounds | 3-4 | ~$0.03 | ~$0.12 |
| Emphasis sounds | 1-2 | ~$0.02 | ~$0.04 |
| **Total** | | | **~$0.30** |

---

## Next Phase

Once sound design is working, proceed to **Phase 1D: Custom AI Music with Udio** for mood-matched background music.
