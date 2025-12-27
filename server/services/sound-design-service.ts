// server/services/sound-design-service.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export interface SoundEffect {
  type: 'whoosh' | 'transition' | 'impact' | 'sparkle' | 'ambient' | 'notification' | 'success';
  url: string;
  duration: number;
  volume: number;
}

export interface SceneSoundDesign {
  sceneId: string;
  transitionIn?: SoundEffect;
  transitionOut?: SoundEffect;
  ambience?: SoundEffect;
  emphasis?: SoundEffect[];
}

interface SoundGenerationOptions {
  type: 'sfx' | 'ambient';
  prompt: string;
  duration: number;
  mood?: string;
}

class SoundDesignService {
  private s3Client: S3Client | null = null;
  private bucket = process.env.REMOTION_AWS_BUCKET || 'remotionlambda-useast1-refjo5giq5';
  private apiKey = process.env.PIAPI_API_KEY || '';
  private baseUrl = 'https://api.piapi.ai/api/v1';

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
    if (process.env.REMOTION_AWS_ACCESS_KEY_ID && process.env.REMOTION_AWS_SECRET_ACCESS_KEY) {
      this.s3Client = new S3Client({
        region: 'us-east-1',
        credentials: {
          accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY,
        },
      });
      console.log('[SoundDesign] S3 client configured for audio caching');
    } else {
      console.warn('[SoundDesign] S3 client not configured - audio will use original URLs');
    }
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

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

  async generateSceneSoundDesign(
    scene: { id: string; type: string; duration: number; mood?: string },
    isFirst: boolean,
    isLast: boolean
  ): Promise<SceneSoundDesign> {
    const design: SceneSoundDesign = {
      sceneId: scene.id,
    };

    try {
      if (!isFirst) {
        design.transitionIn = await this.generateTransitionSound(scene.type, scene.mood, 'in');
      }

      if (!isLast) {
        design.transitionOut = await this.generateTransitionSound(scene.type, scene.mood, 'out');
      }

      if (this.shouldHaveAmbience(scene.type)) {
        design.ambience = await this.generateAmbientSound(scene.type, scene.mood, scene.duration);
      }

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

  private async generateTransitionSound(
    sceneType: string,
    mood: string | undefined,
    direction: 'in' | 'out'
  ): Promise<SoundEffect | undefined> {
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
      duration: 0.8,
      mood,
    });

    if (result) {
      return {
        type: 'whoosh',
        url: result.url,
        duration: result.duration,
        volume: 0.6,
      };
    }

    console.warn(`[SoundDesign] Transition sound failed, using stock fallback`);
    return this.getStockTransitionSound(intensity);
  }

  private async generateAmbientSound(
    sceneType: string,
    mood: string | undefined,
    duration: number
  ): Promise<SoundEffect | undefined> {
    let ambientType: keyof typeof this.soundPrompts.ambient = 'wellness';
    
    if (sceneType === 'hook' && mood === 'negative') {
      ambientType = 'morning';
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
      duration: Math.min(duration, 30),
      mood,
    });

    if (result) {
      return {
        type: 'ambient',
        url: result.url,
        duration: result.duration,
        volume: 0.15,
      };
    }

    return undefined;
  }

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
        volume: 0.6,
      };
    }

    return undefined;
  }

  private async generateSound(
    options: SoundGenerationOptions
  ): Promise<{ url: string; duration: number } | null> {
    try {
      console.log(`[SoundDesign] Generating ${options.type}: "${options.prompt.substring(0, 50)}..."`);

      const response = await fetch(`${this.baseUrl}/task`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'kling-sound',
          task_type: 'text_to_audio',
          input: {
            prompt: options.prompt,
            duration: options.duration,
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

      const result = await this.pollForCompletion(taskId);
      
      if (result.success && result.audioUrl) {
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

  private async uploadToS3(audioUrl: string, type: string): Promise<string> {
    if (!this.s3Client) {
      return audioUrl;
    }

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

      const s3Url = `https://${this.bucket}.s3.us-east-1.amazonaws.com/${key}`;
      console.log(`[SoundDesign] Uploaded to S3: ${key}`);
      return s3Url;

    } catch (error: any) {
      console.warn(`[SoundDesign] S3 upload failed:`, error.message);
      return audioUrl;
    }
  }

  private shouldHaveAmbience(sceneType: string): boolean {
    const ambientScenes = ['hook', 'testimonial', 'story', 'benefit', 'cta'];
    return ambientScenes.includes(sceneType);
  }

  getStockTransitionSound(intensity: 'soft' | 'medium' | 'dramatic'): SoundEffect {
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

  getStockAmbientSound(type: 'nature' | 'wellness' | 'energy'): SoundEffect {
    const stockSounds: Record<string, string> = {
      nature: `https://${this.bucket}.s3.us-east-1.amazonaws.com/stock-sounds/ambient-nature.mp3`,
      wellness: `https://${this.bucket}.s3.us-east-1.amazonaws.com/stock-sounds/ambient-wellness.mp3`,
      energy: `https://${this.bucket}.s3.us-east-1.amazonaws.com/stock-sounds/ambient-energy.mp3`,
    };

    return {
      type: 'ambient',
      url: stockSounds[type],
      duration: 30,
      volume: 0.15,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const soundDesignService = new SoundDesignService();
