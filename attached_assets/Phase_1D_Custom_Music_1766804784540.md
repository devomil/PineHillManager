# Phase 1D: Custom AI Music with Udio

## Objective
Replace generic background music with custom AI-generated tracks using Udio via PiAPI. Music will be specifically generated to match the mood, tempo, and duration of each video, creating a cohesive audio experience.

## Prerequisites
- Phase 1A complete (Runway integration)
- Phase 1B complete (PiAPI multi-provider)
- Phase 1C complete (Sound design) - recommended but not required
- PIAPI_API_KEY configured

## What Success Looks Like
- Background music generated to match video mood
- Music duration matches video length
- Proper genre/style for wellness content
- Music mixed correctly with voiceover (ducking)
- Option to regenerate music if not suitable

---

## Why Custom Music Matters

**Generic stock music:**
- May not match video mood
- Fixed duration (awkward loops/cuts)
- Used by thousands of other videos
- Limited genre options

**Custom AI music:**
- Perfectly matches your video's emotional arc
- Exact duration needed
- Unique to your brand
- Wellness-specific styles

---

## Step 1: Create AI Music Service

Create `server/services/ai-music-service.ts`:

```typescript
// server/services/ai-music-service.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export interface MusicGenerationOptions {
  duration: number;  // seconds
  mood: 'uplifting' | 'calm' | 'dramatic' | 'inspirational' | 'energetic' | 'emotional';
  style: 'wellness' | 'corporate' | 'cinematic' | 'ambient' | 'acoustic';
  tempo?: 'slow' | 'medium' | 'fast';
  instruments?: string[];  // e.g., ['piano', 'strings', 'acoustic guitar']
  customPrompt?: string;  // Override with specific prompt
}

export interface GeneratedMusic {
  url: string;
  s3Url: string;
  duration: number;
  mood: string;
  style: string;
  cost: number;
}

// Pre-defined music prompts for wellness videos
const WELLNESS_MUSIC_PROMPTS = {
  uplifting: {
    wellness: 'Uplifting wellness music, gentle piano, soft strings, hopeful melody, spa-like atmosphere, positive energy, no vocals',
    corporate: 'Uplifting corporate background music, inspiring, professional, gentle build, no vocals',
    cinematic: 'Uplifting cinematic score, emotional crescendo, inspiring strings, heroic undertones, no vocals',
  },
  calm: {
    wellness: 'Calm peaceful wellness music, ambient pads, gentle nature sounds, meditation style, relaxing, no vocals',
    ambient: 'Calm ambient soundscape, ethereal tones, peaceful atmosphere, zen-like, no vocals',
    acoustic: 'Calm acoustic guitar melody, gentle fingerpicking, peaceful, intimate, no vocals',
  },
  dramatic: {
    wellness: 'Dramatic wellness transformation music, building intensity, emotional piano, inspiring strings, no vocals',
    cinematic: 'Dramatic cinematic music, tension building, orchestral, powerful resolution, no vocals',
  },
  inspirational: {
    wellness: 'Inspirational wellness journey music, hopeful piano melody, gentle strings, empowering feel, no vocals',
    corporate: 'Inspirational corporate music, motivational, professional, uplifting crescendo, no vocals',
  },
  emotional: {
    wellness: 'Emotional wellness music, touching piano melody, heartfelt strings, journey of healing, no vocals',
    cinematic: 'Emotional cinematic score, moving melody, orchestral depth, bittersweet beauty, no vocals',
  },
  energetic: {
    wellness: 'Energetic wellness music, positive vibes, upbeat tempo, motivational, healthy lifestyle, no vocals',
    corporate: 'Energetic corporate music, dynamic, professional energy, driving rhythm, no vocals',
  },
};

class AIMusicService {
  private s3Client: S3Client;
  private bucket = process.env.REMOTION_AWS_BUCKET || 'remotionlambda-useast1-refjo5giq5';
  private apiKey = process.env.PIAPI_API_KEY || '';
  private baseUrl = 'https://api.piapi.ai/api/v1';

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
   * Generate custom music for a video
   */
  async generateMusic(options: MusicGenerationOptions): Promise<GeneratedMusic | null> {
    if (!this.isAvailable()) {
      console.warn('[AIMusic] PiAPI not configured');
      return null;
    }

    const startTime = Date.now();
    
    // Build prompt
    const prompt = options.customPrompt || this.buildMusicPrompt(options);
    
    console.log(`[AIMusic] Generating ${options.duration}s ${options.mood} ${options.style} music...`);
    console.log(`[AIMusic] Prompt: "${prompt.substring(0, 100)}..."`);

    try {
      // Create generation task
      const taskResponse = await this.createMusicTask(prompt, options.duration);
      
      if (!taskResponse.success || !taskResponse.taskId) {
        console.error('[AIMusic] Failed to create task:', taskResponse.error);
        return null;
      }

      console.log(`[AIMusic] Task created: ${taskResponse.taskId}`);

      // Poll for completion
      const result = await this.pollForCompletion(taskResponse.taskId);
      
      if (!result.success || !result.audioUrl) {
        console.error('[AIMusic] Generation failed:', result.error);
        return null;
      }

      // Upload to S3
      const s3Url = await this.uploadToS3(result.audioUrl);
      
      const generationTime = Date.now() - startTime;
      const cost = this.estimateCost(options.duration);

      console.log(`[AIMusic] Complete! Time: ${(generationTime / 1000).toFixed(1)}s, Cost: $${cost.toFixed(3)}`);

      return {
        url: result.audioUrl,
        s3Url,
        duration: options.duration,
        mood: options.mood,
        style: options.style,
        cost,
      };

    } catch (error: any) {
      console.error('[AIMusic] Generation failed:', error.message);
      return null;
    }
  }

  /**
   * Generate music based on video analysis
   */
  async generateMusicForVideo(
    videoDuration: number,
    scenes: Array<{ type: string; mood?: string; duration: number }>
  ): Promise<GeneratedMusic | null> {
    // Analyze scenes to determine overall mood
    const overallMood = this.analyzeSceneMoods(scenes);
    
    // Determine style based on content
    const style = this.determineStyle(scenes);
    
    // Determine tempo based on scene pacing
    const tempo = this.determineTempo(scenes);

    return this.generateMusic({
      duration: videoDuration + 3,  // Add 3 seconds for fade out
      mood: overallMood,
      style,
      tempo,
    });
  }

  /**
   * Build music generation prompt
   */
  private buildMusicPrompt(options: MusicGenerationOptions): string {
    // Try to get pre-defined prompt
    const moodPrompts = WELLNESS_MUSIC_PROMPTS[options.mood];
    if (moodPrompts && moodPrompts[options.style as keyof typeof moodPrompts]) {
      let prompt = moodPrompts[options.style as keyof typeof moodPrompts];
      
      // Add duration hint
      prompt += `, ${options.duration} seconds long`;
      
      // Add tempo if specified
      if (options.tempo) {
        prompt += `, ${options.tempo} tempo`;
      }
      
      // Add instruments if specified
      if (options.instruments && options.instruments.length > 0) {
        prompt += `, featuring ${options.instruments.join(', ')}`;
      }
      
      return prompt;
    }

    // Fallback to generic prompt construction
    return `${options.mood} ${options.style} background music, ` +
           `${options.tempo || 'medium'} tempo, ` +
           `professional quality, ${options.duration} seconds, ` +
           `suitable for wellness and health content, no vocals`;
  }

  /**
   * Create music generation task via Udio
   */
  private async createMusicTask(
    prompt: string,
    duration: number
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/task`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'udio',  // Udio model for music generation
          task_type: 'text_to_music',
          input: {
            prompt: prompt,
            duration: Math.min(duration, 300),  // Max 5 minutes
            instrumental: true,  // No vocals
            quality: 'high',
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `API error: ${response.status} - ${errorText}` };
      }

      const data = await response.json();
      const taskId = data.data?.task_id || data.task_id;

      if (!taskId) {
        return { success: false, error: 'No task ID in response' };
      }

      return { success: true, taskId };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Poll for task completion
   */
  private async pollForCompletion(
    taskId: string
  ): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
    const maxAttempts = 120;  // 10 minutes max (music can take a while)
    const pollInterval = 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(pollInterval);

      try {
        const response = await fetch(`${this.baseUrl}/task/${taskId}`, {
          headers: { 'X-API-Key': this.apiKey },
        });

        if (!response.ok) continue;

        const data = await response.json();
        const status = data.data?.status || data.status;

        console.log(`[AIMusic] Status: ${status} (attempt ${attempt + 1}/${maxAttempts})`);

        if (status === 'completed' || status === 'success' || status === 'SUCCESS') {
          // Extract audio URL from various possible response formats
          const audioUrl = this.extractAudioUrl(data);
          
          if (audioUrl) {
            return { success: true, audioUrl };
          }
          return { success: false, error: 'No audio URL in response' };
        }

        if (status === 'failed' || status === 'error' || status === 'FAILED') {
          return { success: false, error: data.data?.error || 'Generation failed' };
        }

      } catch (error: any) {
        // Continue polling despite transient errors
      }
    }

    return { success: false, error: 'Generation timed out' };
  }

  /**
   * Extract audio URL from response
   */
  private extractAudioUrl(data: any): string | null {
    const possiblePaths = [
      data.data?.output?.audio_url,
      data.data?.output?.audio,
      data.data?.output?.music_url,
      data.data?.audio_url,
      data.data?.result?.audio_url,
      data.output?.audio_url,
      data.audio_url,
    ];

    for (const path of possiblePaths) {
      if (path && typeof path === 'string' && path.startsWith('http')) {
        return path;
      }
    }

    // Check for array of outputs
    if (Array.isArray(data.data?.output)) {
      const audio = data.data.output.find((o: any) => o.audio_url || o.url);
      return audio?.audio_url || audio?.url || null;
    }

    return null;
  }

  /**
   * Upload to S3
   */
  private async uploadToS3(audioUrl: string): Promise<string> {
    try {
      const response = await fetch(audioUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      
      const key = `music/udio/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;

      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'audio/mpeg',
      }));

      return `https://${this.bucket}.s3.us-east-1.amazonaws.com/${key}`;

    } catch (error: any) {
      console.warn('[AIMusic] S3 upload failed:', error.message);
      return audioUrl;
    }
  }

  /**
   * Analyze scene moods to determine overall music mood
   */
  private analyzeSceneMoods(
    scenes: Array<{ type: string; mood?: string }>
  ): MusicGenerationOptions['mood'] {
    const moodCounts: Record<string, number> = {
      uplifting: 0,
      calm: 0,
      dramatic: 0,
      inspirational: 0,
      emotional: 0,
      energetic: 0,
    };

    for (const scene of scenes) {
      // Map scene types to music moods
      switch (scene.type) {
        case 'hook':
          moodCounts.dramatic += 1;
          moodCounts.emotional += 1;
          break;
        case 'testimonial':
        case 'story':
          moodCounts.emotional += 2;
          moodCounts.inspirational += 1;
          break;
        case 'benefit':
        case 'explanation':
          moodCounts.uplifting += 1;
          moodCounts.calm += 1;
          break;
        case 'cta':
          moodCounts.inspirational += 2;
          moodCounts.energetic += 1;
          break;
        case 'broll':
          moodCounts.calm += 1;
          break;
      }

      // Also consider scene's detected mood
      if (scene.mood) {
        const moodMapping: Record<string, keyof typeof moodCounts> = {
          positive: 'uplifting',
          negative: 'emotional',
          neutral: 'calm',
          dramatic: 'dramatic',
          serious: 'emotional',
        };
        const mappedMood = moodMapping[scene.mood];
        if (mappedMood) {
          moodCounts[mappedMood] += 1;
        }
      }
    }

    // Find dominant mood
    let maxMood: MusicGenerationOptions['mood'] = 'inspirational';
    let maxCount = 0;

    for (const [mood, count] of Object.entries(moodCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxMood = mood as MusicGenerationOptions['mood'];
      }
    }

    return maxMood;
  }

  /**
   * Determine music style based on content
   */
  private determineStyle(
    scenes: Array<{ type: string }>
  ): MusicGenerationOptions['style'] {
    // For Pine Hill Farm, default to wellness
    // Could be made more sophisticated based on scene content
    return 'wellness';
  }

  /**
   * Determine tempo based on scene pacing
   */
  private determineTempo(
    scenes: Array<{ duration: number }>
  ): MusicGenerationOptions['tempo'] {
    const avgDuration = scenes.reduce((sum, s) => sum + s.duration, 0) / scenes.length;

    if (avgDuration < 10) return 'fast';
    if (avgDuration > 20) return 'slow';
    return 'medium';
  }

  /**
   * Estimate cost for music generation
   */
  private estimateCost(duration: number): number {
    // Udio pricing estimate: ~$0.01 per second
    return duration * 0.01;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const aiMusicService = new AIMusicService();
```

---

## Step 2: Integrate with Universal Video Service

Update `server/services/universal-video-service.ts`:

### Add import:
```typescript
import { aiMusicService, GeneratedMusic } from './ai-music-service';
```

### Replace or enhance existing music generation:

```typescript
// In generateProjectAssets, update the music generation section:

console.log(`[Assets] Generating background music...`);

if (updatedProject.progress?.steps?.music) {
  updatedProject.progress.steps.music.status = 'in-progress';
  updatedProject.progress.steps.music.message = 'Creating custom AI music...';
}

try {
  // Calculate total video duration
  const totalDuration = updatedProject.scenes.reduce((sum, s) => sum + s.duration, 0);
  
  // Prepare scene data for music generation
  const scenesForMusic = updatedProject.scenes.map(s => ({
    type: s.type,
    mood: s.analysis?.mood,
    duration: s.duration,
  }));

  // Try AI music generation first
  const aiMusic = await aiMusicService.generateMusicForVideo(totalDuration, scenesForMusic);
  
  if (aiMusic) {
    updatedProject.music = {
      url: aiMusic.s3Url,
      source: 'udio',
      duration: aiMusic.duration,
      mood: aiMusic.mood,
      style: aiMusic.style,
    };
    
    console.log(`[Assets] AI music generated: ${aiMusic.mood} ${aiMusic.style}, ${aiMusic.duration}s`);
  } else {
    // Fall back to ElevenLabs music if Udio fails
    console.log(`[Assets] AI music failed, falling back to ElevenLabs...`);
    
    const elevenlabsMusic = await this.generateElevenLabsMusic(totalDuration);
    if (elevenlabsMusic) {
      updatedProject.music = {
        url: elevenlabsMusic.url,
        source: 'elevenlabs',
        duration: totalDuration,
      };
    }
  }

  if (updatedProject.progress?.steps?.music) {
    updatedProject.progress.steps.music.status = 'complete';
    updatedProject.progress.steps.music.progress = 100;
  }

} catch (error: any) {
  console.error(`[Assets] Music generation failed:`, error.message);
  if (updatedProject.progress?.steps?.music) {
    updatedProject.progress.steps.music.status = 'error';
    updatedProject.progress.steps.music.message = error.message;
  }
}
```

---

## Step 3: Add Music Regeneration Endpoint

Add to `server/routes/universal-video-routes.ts`:

```typescript
// POST regenerate music for a project
router.post('/projects/:projectId/regenerate-music', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { mood, style, customPrompt } = req.body;
    
    const project = await storage.getItem(`project:${projectId}`);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Calculate duration
    const totalDuration = project.scenes.reduce((sum: number, s: any) => sum + s.duration, 0);

    // Generate new music
    const music = await aiMusicService.generateMusic({
      duration: totalDuration + 3,
      mood: mood || 'inspirational',
      style: style || 'wellness',
      customPrompt,
    });

    if (!music) {
      return res.status(500).json({ error: 'Music generation failed' });
    }

    // Update project
    project.music = {
      url: music.s3Url,
      source: 'udio',
      duration: music.duration,
      mood: music.mood,
      style: music.style,
    };

    await storage.setItem(`project:${projectId}`, project);

    res.json({
      success: true,
      music: project.music,
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Step 4: Update Remotion for Music Integration

The existing music component should work, but ensure it supports the new music data structure:

```tsx
// In UniversalVideoComposition.tsx

interface ProjectMusic {
  url: string;
  source: 'udio' | 'elevenlabs' | 'stock';
  duration: number;
  mood?: string;
  style?: string;
}

const BackgroundMusic: React.FC<{
  music: ProjectMusic | undefined;
  totalDuration: number;
  voiceoverRanges: Array<{ start: number; end: number }>;
  fps: number;
}> = ({ music, totalDuration, voiceoverRanges, fps }) => {
  const frame = useCurrentFrame();
  
  if (!music?.url) return null;

  // Check if current frame is during voiceover
  const isDuringVoiceover = voiceoverRanges.some(
    range => frame >= range.start && frame <= range.end
  );
  
  // Duck music during voiceover (reduce to 40% of normal volume)
  const baseVolume = 0.25;  // -12dB
  const duckedVolume = 0.10;  // -20dB during voiceover
  const volume = isDuringVoiceover ? duckedVolume : baseVolume;
  
  // Fade out at the end
  const totalFrames = totalDuration * fps;
  const fadeOutStart = totalFrames - (2 * fps);  // Start fade 2 seconds before end
  
  let finalVolume = volume;
  if (frame > fadeOutStart) {
    const fadeProgress = (frame - fadeOutStart) / (2 * fps);
    finalVolume = volume * (1 - fadeProgress);
  }
  
  return (
    <Audio
      src={music.url}
      volume={finalVolume}
      loop={music.duration < totalDuration}  // Loop if music is shorter than video
    />
  );
};
```

---

## Step 5: Frontend Music Controls (Optional)

Add music controls to `client/src/components/universal-video-producer.tsx`:

```tsx
const MusicControls: React.FC<{
  project: any;
  onRegenerateMusic: (options: any) => void;
}> = ({ project, onRegenerateMusic }) => {
  const [mood, setMood] = useState(project.music?.mood || 'inspirational');
  const [style, setStyle] = useState(project.music?.style || 'wellness');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    await onRegenerateMusic({ mood, style });
    setIsRegenerating(false);
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-3">Background Music</h3>
      
      {project.music?.url && (
        <div className="mb-3">
          <audio controls src={project.music.url} className="w-full" />
          <p className="text-sm text-gray-500 mt-1">
            {project.music.source} • {project.music.mood} • {project.music.style}
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm font-medium mb-1">Mood</label>
          <select 
            value={mood} 
            onChange={(e) => setMood(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="uplifting">Uplifting</option>
            <option value="calm">Calm</option>
            <option value="dramatic">Dramatic</option>
            <option value="inspirational">Inspirational</option>
            <option value="emotional">Emotional</option>
            <option value="energetic">Energetic</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Style</label>
          <select 
            value={style} 
            onChange={(e) => setStyle(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="wellness">Wellness</option>
            <option value="corporate">Corporate</option>
            <option value="cinematic">Cinematic</option>
            <option value="ambient">Ambient</option>
            <option value="acoustic">Acoustic</option>
          </select>
        </div>
      </div>
      
      <button
        onClick={handleRegenerate}
        disabled={isRegenerating}
        className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {isRegenerating ? 'Generating...' : 'Regenerate Music'}
      </button>
    </div>
  );
};
```

---

## Step 6: Test Music Generation

1. Create a new video project
2. Generate assets
3. Watch console for:
   ```
   [Assets] Generating background music...
   [AIMusic] Generating 95s inspirational wellness music...
   [AIMusic] Prompt: "Inspirational wellness journey music, hopeful piano melody..."
   [AIMusic] Task created: task_abc123
   [AIMusic] Status: processing (attempt 1/120)
   [AIMusic] Status: completed (attempt 15/120)
   [AIMusic] Complete! Time: 75.2s, Cost: $0.950
   [Assets] AI music generated: inspirational wellness, 95s
   ```
4. Preview the video and listen to the music
5. Test regeneration with different moods

---

## Verification Checklist

- [ ] `ai-music-service.ts` created and exports service
- [ ] `universal-video-service.ts` imports and uses AI music
- [ ] Music regeneration endpoint added to routes
- [ ] Music data stored in `project.music`
- [ ] Remotion renders with new music
- [ ] Music mood matches video content
- [ ] Music duration matches video length
- [ ] Music ducks properly during voiceover
- [ ] Fallback to ElevenLabs works if Udio fails

---

## Fallback Strategy

```
1. Try Udio (PiAPI) - Custom AI music
   ↓ (if fails)
2. Try ElevenLabs Music API - Generic stock music
   ↓ (if fails)
3. Use pre-uploaded stock music from S3
   ↓ (if fails)
4. Render without music (voiceover only)
```

---

## Cost Estimate

| Duration | Udio Cost | ElevenLabs Cost |
|----------|-----------|-----------------|
| 60 seconds | ~$0.60 | ~$0.30 |
| 90 seconds | ~$0.90 | ~$0.45 |
| 180 seconds | ~$1.80 | ~$0.90 |

Custom Udio music costs more but provides unique, mood-matched tracks.

---

## Music Style Guide for Pine Hill Farm

| Video Topic | Recommended Mood | Recommended Style |
|-------------|------------------|-------------------|
| Weight Loss | inspirational | wellness |
| Detox | calm | ambient |
| Menopause | emotional, calm | wellness |
| Energy/Vitality | energetic | wellness |
| Sleep | calm | ambient |
| General Health | uplifting | wellness |
| Testimonials | emotional | acoustic |
| Product Launch | dramatic | cinematic |

---

## Next Phase

Once music generation is working, proceed to **Phase 1E: Product Image Generation with Flux.1** for perfect product shots.
