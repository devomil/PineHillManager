# ElevenLabs Music API Integration

Since you're already paying for ElevenLabs, you can use their **Eleven Music API** for background music generation - no additional subscriptions needed!

## API Overview

| Feature | Details |
|---------|---------|
| Endpoint | `POST https://api.elevenlabs.io/v1/music/compose` |
| Duration | 10 seconds to 5 minutes |
| Output | MP3 (44.1kHz, 128-192kbps) |
| Commercial Use | ✅ Included with paid plans |
| Cost | Uses your existing ElevenLabs credits |

---

## Implementation

### Add to `universal-video-service.ts`

```typescript
/**
 * Generate background music using ElevenLabs Music API
 * Uses the same API key as voiceover generation
 */
async generateBackgroundMusic(
  duration: number,
  style: string = 'professional',
  productName?: string
): Promise<{ url: string; duration: number; source: string } | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    console.warn('[UniversalVideoService] No ELEVENLABS_API_KEY for music generation');
    return null;
  }

  // Build a prompt based on video style and product
  const musicPrompt = this.buildMusicPrompt(style, productName, duration);
  
  console.log(`[UniversalVideoService] Generating music: "${musicPrompt}" (${duration}s)`);

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/music/compose', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: musicPrompt,
        duration_ms: Math.min(duration * 1000, 300000), // Max 5 minutes
        instrumental: true, // No vocals - just background music
        output_format: 'mp3_44100_128', // Good quality MP3
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[UniversalVideoService] ElevenLabs Music API error:', response.status, error);
      return null;
    }

    // The API returns the audio directly as a stream
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    // Upload to S3 for Lambda access
    const s3Url = await this.uploadToS3(
      base64Audio,
      `music-${Date.now()}.mp3`,
      'audio/mpeg'
    );

    if (s3Url) {
      console.log(`[UniversalVideoService] Music generated and uploaded: ${s3Url}`);
      return {
        url: s3Url,
        duration: duration,
        source: 'elevenlabs-music',
      };
    }

    // Fallback: return as data URL (works for local preview, not Lambda)
    return {
      url: `data:audio/mpeg;base64,${base64Audio}`,
      duration: duration,
      source: 'elevenlabs-music',
    };

  } catch (error: any) {
    console.error('[UniversalVideoService] Music generation error:', error.message);
    return null;
  }
}

/**
 * Build an effective music prompt based on video style
 */
private buildMusicPrompt(style: string, productName?: string, duration?: number): string {
  // Base prompts for different video styles
  const stylePrompts: Record<string, string> = {
    professional: 'Soft ambient corporate background music, gentle piano and strings, calm and reassuring, professional tone',
    
    friendly: 'Warm acoustic background music, gentle guitar and soft percussion, welcoming and approachable feel',
    
    energetic: 'Upbeat motivational background music, inspiring corporate sound, building energy, positive and dynamic',
    
    calm: 'Peaceful ambient music, soft piano with nature-inspired textures, meditation-like, soothing and relaxing',
    
    documentary: 'Cinematic documentary background music, emotional strings, thoughtful and reflective mood',
    
    wellness: 'Gentle wellness music, soft piano with ambient pads, calming and nurturing, spa-like atmosphere, natural and organic feeling',
    
    health: 'Soothing healthcare background music, reassuring and hopeful, gentle strings and piano, professional medical tone',
  };

  let prompt = stylePrompts[style] || stylePrompts.professional;

  // Add product-specific context for health/wellness products
  if (productName) {
    const lowerName = productName.toLowerCase();
    
    if (lowerName.includes('menopause') || lowerName.includes('hormone') || lowerName.includes('women')) {
      prompt = 'Gentle, nurturing background music for women\'s wellness, soft piano with warm strings, calming and supportive, empowering yet soothing';
    } else if (lowerName.includes('sleep') || lowerName.includes('relax')) {
      prompt = 'Peaceful sleep-inducing ambient music, very soft and slow, dreamy pads, gentle lullaby feel';
    } else if (lowerName.includes('energy') || lowerName.includes('vitality')) {
      prompt = 'Uplifting wellness music, gentle but energizing, morning sunshine feeling, optimistic acoustic guitar';
    } else if (lowerName.includes('natural') || lowerName.includes('herbal') || lowerName.includes('botanical')) {
      prompt = 'Organic nature-inspired background music, soft acoustic instruments, earthy and grounded, botanical garden atmosphere';
    }
  }

  // Add duration guidance
  if (duration && duration <= 30) {
    prompt += ', short form, no build-up, consistent energy throughout';
  } else if (duration && duration > 120) {
    prompt += ', gradual build with subtle variations, maintains interest over time';
  }

  // Always ensure it's suitable as background
  prompt += ', suitable as background music under voiceover, not overpowering, subtle and supportive';

  return prompt;
}
```

---

## Update Music Step in `generateProjectAssets`

Replace the current music generation code:

```typescript
// MUSIC STEP - Generate background music with ElevenLabs
updatedProject.progress.currentStep = 'music';
updatedProject.progress.steps.music.status = 'in-progress';
updatedProject.progress.steps.music.message = 'Generating background music...';

const totalDuration = project.scenes.reduce((acc, s) => acc + (s.duration || 5), 0);

// Determine music style from project settings or default
const musicStyle = project.settings?.musicStyle || 
                   (project.type === 'product' ? 'wellness' : 'professional');

const musicResult = await this.generateBackgroundMusic(
  totalDuration,
  musicStyle,
  project.title // Product name for context
);

if (musicResult) {
  updatedProject.assets.music = {
    url: musicResult.url,
    source: musicResult.source,
    duration: musicResult.duration,
    volume: 0.15, // Low volume to not overpower voiceover
  };
  updatedProject.progress.steps.music.status = 'complete';
  updatedProject.progress.steps.music.progress = 100;
  updatedProject.progress.steps.music.message = `Generated ${musicResult.duration}s background music`;
} else {
  updatedProject.progress.steps.music.status = 'complete';
  updatedProject.progress.steps.music.progress = 100;
  updatedProject.progress.steps.music.message = 'Music generation unavailable';
  
  this.addNotification({
    type: 'warning',
    service: 'Music',
    message: 'Background music could not be generated. Video will have voiceover only.',
  });
}
```

---

## Streaming Version (More Efficient)

For larger files, use the streaming endpoint:

```typescript
async generateBackgroundMusicStream(
  duration: number,
  style: string = 'professional',
  productName?: string
): Promise<{ url: string; duration: number; source: string } | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  const musicPrompt = this.buildMusicPrompt(style, productName, duration);

  try {
    // Use streaming endpoint for efficiency
    const response = await fetch('https://api.elevenlabs.io/v1/music/stream', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: musicPrompt,
        duration_ms: Math.min(duration * 1000, 300000),
        instrumental: true,
        output_format: 'mp3_44100_128',
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    // Stream directly to S3
    const chunks: Buffer[] = [];
    const reader = response.body?.getReader();
    
    if (!reader) throw new Error('No response body');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }

    const audioBuffer = Buffer.concat(chunks);
    const base64Audio = audioBuffer.toString('base64');
    
    const s3Url = await this.uploadToS3(
      base64Audio,
      `music-${Date.now()}.mp3`,
      'audio/mpeg'
    );

    return s3Url ? {
      url: s3Url,
      duration: duration,
      source: 'elevenlabs-music',
    } : null;

  } catch (error: any) {
    console.error('[UniversalVideoService] Music stream error:', error.message);
    return null;
  }
}
```

---

## Music Prompts for Pine Hill Farm Products

Here are optimized prompts for your health/wellness products:

| Product Type | Music Prompt |
|--------------|--------------|
| **Menopause Support** | "Gentle nurturing background music for women's wellness, soft piano with warm strings, calming and supportive, empowering yet soothing, spa-like atmosphere" |
| **Sleep Aid** | "Peaceful ambient sleep music, very soft piano, dreamy pads, slow tempo, lullaby-like, deeply relaxing" |
| **Energy/Vitality** | "Uplifting acoustic wellness music, gentle guitar, optimistic morning feeling, warm and energizing without being intense" |
| **Herbal/Botanical** | "Organic nature-inspired ambient music, soft acoustic instruments, earthy textures, botanical garden atmosphere, grounded and natural" |
| **General Wellness** | "Soft ambient wellness background music, gentle piano and strings, calm and reassuring, professional healthcare tone, subtle and supportive" |

---

## Cost Considerations

ElevenLabs Music uses your existing credits. Approximate costs:

| Duration | Approximate Credits |
|----------|---------------------|
| 30 seconds | ~500-1000 credits |
| 1 minute | ~1000-2000 credits |
| 3 minutes | ~3000-5000 credits |

*Note: Exact costs vary by plan. Check your ElevenLabs dashboard for current pricing.*

For a 30-second product video, the music generation should be very affordable within your $11/mo plan.

---

## Testing

After implementing, verify:

```bash
# Check server logs for:
[UniversalVideoService] Generating music: "Gentle nurturing background music..." (30s)
[UniversalVideoService] Music generated and uploaded: https://remotionlambda-useast1-xxx.s3.amazonaws.com/assets/music-xxx.mp3

# NOT:
[UniversalVideoService] Music generation unavailable
```

---

## Full Integration Summary

With this implementation, your video production pipeline uses **only ElevenLabs** for all audio:

| Audio Type | ElevenLabs API | Status |
|------------|----------------|--------|
| Voiceover | Text-to-Speech | ✅ Already working |
| Background Music | Eleven Music | 🆕 Add this |
| Sound Effects | Sound Effects API | Optional future addition |

No need for Pixabay, Pexels audio, or any other music service!
