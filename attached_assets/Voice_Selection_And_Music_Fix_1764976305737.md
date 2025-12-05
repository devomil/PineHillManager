# Add Voice Selection & Fix Background Music

## PART 1: Add Voice Selection to Product Video Form

### 1a. Update shared/video-types.ts

Add voice configuration to the input types:

```typescript
// Add this interface
export interface VoiceOption {
  voice_id: string;
  name: string;
  category: 'premade' | 'cloned' | 'generated';
  description: string;
  preview_url: string;
  labels: {
    accent?: string;
    age?: string;
    gender?: string;
    use_case?: string;
  };
}

// Update ProductVideoInput to include voice selection
export interface ProductVideoInput {
  productName: string;
  productDescription: string;
  targetAudience: string;
  benefits: string[];
  duration: 30 | 60 | 90;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'website';
  style: 'professional' | 'friendly' | 'energetic' | 'calm';
  callToAction: string;
  productImages?: ProductImage[];
  // NEW: Voice selection
  voiceId?: string;
  voiceName?: string;
}
```

### 1b. Add Voice Fetching Endpoint

Add to `server/routes/universal-video-routes.ts`:

```typescript
// Get available ElevenLabs voices
router.get('/voices', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) {
      return res.status(500).json({ success: false, error: 'ElevenLabs not configured' });
    }

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': elevenLabsKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }

    const data = await response.json();
    
    // Filter and format voices - prioritize natural-sounding voices
    const voices = (data.voices || [])
      .filter((v: any) => v.category === 'premade' || v.category === 'professional')
      .map((v: any) => ({
        voice_id: v.voice_id,
        name: v.name,
        category: v.category,
        description: v.description || '',
        preview_url: v.preview_url || '',
        labels: {
          accent: v.labels?.accent || '',
          age: v.labels?.age || '',
          gender: v.labels?.gender || '',
          use_case: v.labels?.use_case || v.labels?.['use case'] || '',
        },
      }))
      // Sort with best voices first
      .sort((a: any, b: any) => {
        // These are ElevenLabs' most natural-sounding voices
        const priority = ['Rachel', 'Drew', 'Clyde', 'Paul', 'Domi', 'Dave', 'Fin', 'Sarah', 'Antoni', 'Thomas', 'Charlotte', 'Alice', 'Matilda'];
        const aIndex = priority.indexOf(a.name);
        const bIndex = priority.indexOf(b.name);
        if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
        if (aIndex >= 0) return -1;
        if (bIndex >= 0) return 1;
        return a.name.localeCompare(b.name);
      });

    res.json({ success: true, voices });
  } catch (error: any) {
    console.error('[UniversalVideo] Error fetching voices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### 1c. Update generateVoiceover in universal-video-service.ts

The current voice sounds robotic because:
1. Wrong model might be used
2. Voice settings are too "stable" (not expressive enough)
3. Default voice may not suit health/wellness content

```typescript
async generateVoiceover(
  text: string, 
  voiceId?: string,
  options?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
  }
): Promise<VoiceoverResult> {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenLabsKey) {
    this.addNotification({
      type: 'error',
      service: 'ElevenLabs',
      message: 'ELEVENLABS_API_KEY not configured',
    });
    return { url: '', duration: 0, success: false, error: 'API key not configured' };
  }

  // RECOMMENDED VOICES FOR HEALTH/WELLNESS:
  // - Rachel (21m00Tcm4TlvDq8ikWAM) - Warm, calm, American female - BEST for wellness
  // - Sarah (EXAVITQu4vr4xnSDxMaL) - Soft, friendly female
  // - Charlotte (XB0fDUnXU5powFXDhCwa) - Warm British female
  // - Matilda (XrExE9yKIg1WjnnlVkGX) - Warm, friendly female
  // - Thomas (GBv7mTt0atIp3Br8iCZE) - Calm, professional male
  
  const selectedVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel - best for wellness
  
  // IMPROVED VOICE SETTINGS for natural sound:
  const voiceSettings = {
    stability: options?.stability ?? 0.50,        // Lower = more expressive/natural
    similarity_boost: options?.similarityBoost ?? 0.75,
    style: options?.style ?? 0.40,                // Higher = more emotional delivery
    use_speaker_boost: true,                       // Improves clarity
  };

  try {
    console.log(`[UniversalVideoService] Generating voiceover with voice: ${selectedVoiceId}`);
    console.log(`[UniversalVideoService] Voice settings:`, voiceSettings);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          // USE THE BEST MODEL - eleven_multilingual_v2 is highest quality
          model_id: "eleven_multilingual_v2",
          voice_settings: voiceSettings,
        }),
      }
    );

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString("base64");
      
      // Upload to S3 for Lambda access
      const s3Url = await this.uploadToS3(
        base64Audio,
        `voiceover-${Date.now()}.mp3`,
        'audio/mpeg'
      );
      
      const audioUrl = s3Url || `data:audio/mpeg;base64,${base64Audio}`;

      const wordCount = text.split(/\s+/).length;
      const estimatedDuration = Math.ceil(wordCount / 2.5);

      console.log(`[UniversalVideoService] Voiceover generated (${estimatedDuration}s)`);
      
      return {
        url: audioUrl,
        duration: estimatedDuration,
        success: true,
      };
    } else {
      const errorText = await response.text();
      console.error(`[UniversalVideoService] ElevenLabs error: ${response.status}`, errorText);
      return { url: '', duration: 0, success: false, error: `API error: ${response.status}` };
    }
  } catch (e: any) {
    console.error("[UniversalVideoService] ElevenLabs error:", e);
    return { url: '', duration: 0, success: false, error: e.message || 'Unknown error' };
  }
}
```

---

## PART 2: Voice Selector Component

Create `client/src/components/voice-selector.tsx`:

```tsx
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Play, Pause, Check, Volume2 } from "lucide-react";

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
  preview_url: string;
  labels: {
    accent?: string;
    age?: string;
    gender?: string;
    use_case?: string;
  };
}

interface VoiceSelectorProps {
  selectedVoiceId: string | undefined;
  onSelect: (voiceId: string, voiceName: string) => void;
}

// Curated list of best voices for health/wellness content
const RECOMMENDED_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', reason: 'Warm & calm - ideal for wellness' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', reason: 'Soft & friendly' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', reason: 'Warm British accent' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', reason: 'Deep & trustworthy male' },
  { id: 'GBv7mTt0atIp3Br8iCZE', name: 'Thomas', reason: 'Calm & professional male' },
];

export function VoiceSelector({ selectedVoiceId, onSelect }: VoiceSelectorProps) {
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: voicesData, isLoading } = useQuery<{ success: boolean; voices: Voice[] }>({
    queryKey: ['/api/universal-video/voices'],
  });

  const voices = voicesData?.voices || [];

  const playPreview = (voice: Voice) => {
    if (!voice.preview_url) return;

    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingVoiceId === voice.voice_id) {
      setPlayingVoiceId(null);
      return;
    }

    const audio = new Audio(voice.preview_url);
    audioRef.current = audio;
    setPlayingVoiceId(voice.voice_id);

    audio.onended = () => {
      setPlayingVoiceId(null);
      audioRef.current = null;
    };

    audio.onerror = () => {
      setPlayingVoiceId(null);
      audioRef.current = null;
    };

    audio.play().catch(() => {
      setPlayingVoiceId(null);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading voices...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Volume2 className="w-4 h-4" />
        Voiceover Voice
      </Label>
      
      {/* Recommended voices */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Recommended for Health & Wellness:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {RECOMMENDED_VOICES.map((rec) => {
            const voice = voices.find(v => v.voice_id === rec.id);
            const isSelected = selectedVoiceId === rec.id;
            const isPlaying = playingVoiceId === rec.id;
            
            return (
              <div
                key={rec.id}
                className={`
                  flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors
                  ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                `}
                onClick={() => onSelect(rec.id, rec.name)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rec.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.reason}</p>
                </div>
                {voice?.preview_url && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      playPreview(voice);
                    }}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* All voices */}
      <details className="group">
        <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
          Show all {voices.length} voices...
        </summary>
        <ScrollArea className="h-48 mt-2 rounded-lg border p-2">
          <div className="space-y-1">
            {voices.map((voice) => {
              const isSelected = selectedVoiceId === voice.voice_id;
              const isPlaying = playingVoiceId === voice.voice_id;
              
              return (
                <div
                  key={voice.voice_id}
                  className={`
                    flex items-center justify-between p-2 rounded cursor-pointer transition-colors
                    ${isSelected ? 'bg-primary/10' : 'hover:bg-muted'}
                  `}
                  onClick={() => onSelect(voice.voice_id, voice.name)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{voice.name}</span>
                    {voice.labels.gender && (
                      <Badge variant="outline" className="text-xs">
                        {voice.labels.gender}
                      </Badge>
                    )}
                    {voice.labels.accent && (
                      <Badge variant="outline" className="text-xs">
                        {voice.labels.accent}
                      </Badge>
                    )}
                    {isSelected && <Check className="w-3 h-3 text-primary" />}
                  </div>
                  {voice.preview_url && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        playPreview(voice);
                      }}
                    >
                      {isPlaying ? (
                        <Pause className="w-3 h-3" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </details>
    </div>
  );
}
```

---

## PART 3: Integrate Voice Selector into ProductVideoForm

Update `client/src/components/universal-video-producer.tsx`:

```tsx
// Add import at top
import { VoiceSelector } from "./voice-selector";

// Update ProductFormData interface
interface ProductFormData {
  productName: string;
  productDescription: string;
  targetAudience: string;
  benefits: string[];
  duration: 30 | 60 | 90;
  platform: "youtube" | "tiktok" | "instagram" | "facebook" | "website";
  style: "professional" | "friendly" | "energetic" | "calm";
  callToAction: string;
  voiceId?: string;      // ADD
  voiceName?: string;    // ADD
}

// Update useState initial state in ProductVideoForm
const [formData, setFormData] = useState<ProductFormData>({
  productName: "",
  productDescription: "",
  targetAudience: "",
  benefits: [""],
  duration: 60,
  platform: "youtube",
  style: "professional",
  callToAction: "Visit pinehillfarm.com",
  voiceId: "21m00Tcm4TlvDq8ikWAM",  // Rachel - default
  voiceName: "Rachel",
});

// Add VoiceSelector in the form JSX (after Call to Action input):

<Separator className="my-4" />

<VoiceSelector
  selectedVoiceId={formData.voiceId}
  onSelect={(voiceId, voiceName) => 
    setFormData(prev => ({ ...prev, voiceId, voiceName }))
  }
/>

<Separator className="my-4" />

<ProductImageUpload
  // ... existing props
/>
```

---

## PART 4: Fix Background Music

The music is missing because the current implementation searches Pexels for videos, not audio.

### Option A: Use Pixabay Audio API (Recommended - Free)

Update `getBackgroundMusic` in `universal-video-service.ts`:

```typescript
async getBackgroundMusic(duration: number, style?: string): Promise<{ url: string; duration: number; source: string } | null> {
  const pixabayKey = process.env.PIXABAY_API_KEY;
  
  if (!pixabayKey) {
    console.log('[UniversalVideoService] No PIXABAY_API_KEY - skipping music');
    this.addNotification({
      type: 'warning',
      service: 'Music',
      message: 'No Pixabay API key configured - video will render without background music',
    });
    return null;
  }

  // Search terms based on video style
  const searchTerms: Record<string, string> = {
    professional: 'corporate ambient calm',
    friendly: 'uplifting happy acoustic',
    energetic: 'upbeat motivational electronic',
    calm: 'relaxing meditation peaceful',
    documentary: 'cinematic documentary emotional',
  };
  
  const query = searchTerms[style || 'professional'] || 'ambient corporate background';

  try {
    console.log(`[UniversalVideoService] Searching Pixabay for music: ${query}`);
    
    // IMPORTANT: Use &media_type=music for audio, not videos
    const response = await fetch(
      `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query)}&media_type=music&per_page=10`
    );
    
    if (!response.ok) {
      console.warn('[UniversalVideoService] Pixabay API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.hits || data.hits.length === 0) {
      console.log('[UniversalVideoService] No music found for query:', query);
      // Try a fallback query
      const fallbackResponse = await fetch(
        `https://pixabay.com/api/?key=${pixabayKey}&q=background+music&media_type=music&per_page=10`
      );
      const fallbackData = await fallbackResponse.json();
      if (!fallbackData.hits?.length) return null;
      data.hits = fallbackData.hits;
    }
    
    // Find a track with suitable duration (at least 80% of video length)
    const minDuration = duration * 0.8;
    let selectedTrack = data.hits.find((hit: any) => hit.duration >= minDuration);
    
    // If no long enough track, just use the longest one
    if (!selectedTrack) {
      selectedTrack = data.hits.sort((a: any, b: any) => b.duration - a.duration)[0];
    }
    
    if (selectedTrack?.audio) {
      console.log(`[UniversalVideoService] Selected music track: ${selectedTrack.audio} (${selectedTrack.duration}s)`);
      return {
        url: selectedTrack.audio,  // This is already a valid HTTPS URL
        duration: selectedTrack.duration,
        source: 'pixabay',
      };
    }
    
    return null;
  } catch (e: any) {
    console.error('[UniversalVideoService] Pixabay music search error:', e.message);
    return null;
  }
}
```

### Option B: Use Pre-uploaded Royalty-Free Tracks

If Pixabay doesn't work well, you can:

1. Download royalty-free tracks from Pixabay/Uppbeat/Artlist
2. Upload them to your S3 bucket
3. Reference them directly:

```typescript
async getBackgroundMusic(duration: number, style?: string): Promise<{ url: string; duration: number; source: string } | null> {
  // Pre-uploaded tracks in S3
  const tracks: Record<string, { url: string; duration: number }> = {
    professional: {
      url: 'https://remotionlambda-useast1-refjo5giq5.s3.us-east-1.amazonaws.com/music/corporate-ambient.mp3',
      duration: 180,
    },
    friendly: {
      url: 'https://remotionlambda-useast1-refjo5giq5.s3.us-east-1.amazonaws.com/music/uplifting-acoustic.mp3',
      duration: 150,
    },
    calm: {
      url: 'https://remotionlambda-useast1-refjo5giq5.s3.us-east-1.amazonaws.com/music/peaceful-ambient.mp3',
      duration: 200,
    },
    energetic: {
      url: 'https://remotionlambda-useast1-refjo5giq5.s3.us-east-1.amazonaws.com/music/upbeat-corporate.mp3',
      duration: 120,
    },
  };
  
  const track = tracks[style || 'professional'] || tracks.professional;
  return { ...track, source: 's3-library' };
}
```

---

## PART 5: Ensure Music Gets Passed to Lambda

In `generateProjectAssets`, make sure music is being fetched with the style:

```typescript
// MUSIC STEP
updatedProject.progress.currentStep = 'music';
updatedProject.progress.steps.music.status = 'in-progress';

// Get style from project or default
const style = (project as any).style || 'professional';
const musicResult = await this.getBackgroundMusic(project.totalDuration, style);

if (musicResult) {
  updatedProject.assets.music = {
    url: musicResult.url,
    duration: musicResult.duration,
    volume: 0.15, // Background music should be subtle
  };
  updatedProject.progress.steps.music.status = 'complete';
  updatedProject.progress.steps.music.progress = 100;
  updatedProject.progress.steps.music.message = `Background music selected (${musicResult.duration}s from ${musicResult.source})`;
  console.log(`[UniversalVideoService] Music URL: ${musicResult.url}`);
} else {
  updatedProject.progress.steps.music.status = 'skipped';
  updatedProject.progress.steps.music.message = 'No suitable music found';
}
```

---

## TESTING CHECKLIST

After implementing:

1. [ ] Voice selector appears in the form
2. [ ] Can preview voices by clicking play button
3. [ ] Selected voice is highlighted
4. [ ] Console shows correct voice ID when generating voiceover
5. [ ] Voiceover sounds natural (not robotic)
6. [ ] Console shows "Music URL: https://..." 
7. [ ] Final video has background music playing
8. [ ] Music volume is subtle (doesn't overpower voiceover)

---

## Quick Fixes Without UI Changes

If you just want to improve the current video quality immediately:

### Fix 1: Change default voice to Rachel
In `universal-video-service.ts`, change:
```typescript
const selectedVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel
```

### Fix 2: Adjust voice settings for more natural sound
```typescript
voice_settings: {
  stability: 0.50,          // Was 0.5, keep or lower slightly
  similarity_boost: 0.75,   // Keep
  style: 0.40,              // ADD this - adds emotional expression
  use_speaker_boost: true,  // ADD this - improves clarity
},
```

### Fix 3: Use best model
```typescript
model_id: "eleven_multilingual_v2",  // Best quality, most natural
```

### Fix 4: Add PIXABAY_API_KEY to environment
Get a free API key from https://pixabay.com/api/docs/ and add to your environment.
