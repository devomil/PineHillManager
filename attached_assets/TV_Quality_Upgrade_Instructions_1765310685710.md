# Upgrade to TV-Quality Video Production

## CURRENT PROBLEM

The video producer is creating slideshow-style videos with:
- Static AI images with Ken Burns effect
- Basic text overlays
- No video footage (B-roll)
- No background music
- Voiceover not synced to scene timing

## TARGET: TV COMMERCIAL QUALITY

A TV-quality video includes:
- **B-roll video clips** mixed with product shots
- **Smooth motion graphics** (animated text, transitions)
- **Background music** that sets emotional tone
- **Voiceover perfectly synced** to visual beats
- **Product reveals** with professional animations
- **Dynamic pacing** that holds attention

---

## PART 1: Enable Video/B-Roll Generation

### 1a. Update Scene Type Detection

The current code skips video generation for product videos. We need to fetch B-roll for scenes that would benefit from motion.

In `universal-video-service.ts`, update `generateProjectAssets`:

```typescript
// VIDEOS STEP - Fetch B-roll for ALL video types, not just script-based
updatedProject.progress.currentStep = 'videos';
updatedProject.progress.steps.videos.status = 'in-progress';

// Determine which scenes should have video vs static images
const scenesNeedingVideo: string[] = [];
const videoSceneTypes = ['hook', 'benefit', 'story', 'testimonial', 'lifestyle'];

for (const scene of project.scenes) {
  // Hook scenes and benefit scenes benefit most from video
  if (videoSceneTypes.includes(scene.type) || scene.type === 'hook') {
    scenesNeedingVideo.push(scene.id);
  }
}

console.log(`[UniversalVideoService] Scenes needing B-roll: ${scenesNeedingVideo.length}`);

let videosGenerated = 0;
for (let i = 0; i < project.scenes.length; i++) {
  const scene = project.scenes[i];
  
  // Fetch video for scenes that benefit from motion
  if (scenesNeedingVideo.includes(scene.id)) {
    const videoQuery = this.buildVideoSearchQuery(scene);
    console.log(`[UniversalVideoService] Searching B-roll for scene ${scene.id}: ${videoQuery}`);
    
    const videoResult = await this.getStockVideo(videoQuery);
    if (videoResult) {
      updatedProject.assets.videos.push({
        sceneId: scene.id,
        url: videoResult.url,
        source: 'pexels',
      });
      
      // Update scene to use video instead of image
      if (!updatedProject.scenes[i].assets) {
        updatedProject.scenes[i].assets = {};
      }
      updatedProject.scenes[i].assets!.videoUrl = videoResult.url;
      updatedProject.scenes[i].background.type = 'video';
      
      videosGenerated++;
      console.log(`[UniversalVideoService] B-roll found for scene ${scene.id}`);
    }
  }
  
  updatedProject.progress.steps.videos.progress = Math.round(((i + 1) / project.scenes.length) * 100);
}

if (videosGenerated > 0) {
  updatedProject.progress.steps.videos.status = 'complete';
  updatedProject.progress.steps.videos.message = `Fetched ${videosGenerated} B-roll clips`;
} else {
  updatedProject.progress.steps.videos.status = 'complete';
  updatedProject.progress.steps.videos.message = 'Using AI images (no suitable B-roll found)';
}
```

### 1b. Add Smart Video Search Query Builder

```typescript
private buildVideoSearchQuery(scene: Scene): string {
  const narration = (scene.narration || '').toLowerCase();
  const sceneType = scene.type;
  
  // Extract keywords from narration
  const keywords: string[] = [];
  
  // Health/wellness specific
  if (narration.includes('menopause') || narration.includes('hormone')) {
    keywords.push('woman wellness relaxation');
  }
  if (narration.includes('hot flash') || narration.includes('night sweat')) {
    keywords.push('woman cooling relief comfort');
  }
  if (narration.includes('sleep') || narration.includes('restful')) {
    keywords.push('peaceful sleep bedroom night');
  }
  if (narration.includes('energy') || narration.includes('vitality')) {
    keywords.push('active woman exercise healthy lifestyle');
  }
  if (narration.includes('natural') || narration.includes('botanical') || narration.includes('herbal')) {
    keywords.push('herbs botanical plants nature');
  }
  if (narration.includes('relief') || narration.includes('comfort')) {
    keywords.push('woman relaxed peaceful happy');
  }
  
  // Scene type fallbacks
  const typeQueries: Record<string, string> = {
    hook: 'woman thinking concerned wellness',
    benefit: 'happy woman healthy lifestyle',
    feature: 'natural supplements herbs botanical',
    intro: 'woman wellness morning routine',
    cta: 'confident woman smiling wellness',
    testimonial: 'happy customer testimonial woman',
    story: 'woman journey transformation wellness',
  };
  
  if (keywords.length === 0) {
    return typeQueries[sceneType] || 'woman wellness healthy lifestyle';
  }
  
  return keywords[0];
}
```

### 1c. Improve Stock Video Fetching

```typescript
async getStockVideo(query: string): Promise<{ url: string; duration: number; source: string } | null> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (!pexelsKey) {
    console.log('[UniversalVideoService] No PEXELS_API_KEY - cannot fetch B-roll');
    return null;
  }

  try {
    console.log(`[UniversalVideoService] Searching Pexels videos: ${query}`);
    
    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&size=medium`,
      { headers: { Authorization: pexelsKey } }
    );

    if (!response.ok) {
      console.warn('[UniversalVideoService] Pexels video API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data.videos || data.videos.length === 0) {
      console.log('[UniversalVideoService] No videos found for query:', query);
      return null;
    }

    // Find the best quality video (prefer HD)
    for (const video of data.videos) {
      // Get HD file first, then SD as fallback
      const hdFile = video.video_files?.find((f: any) => 
        f.quality === 'hd' && f.width >= 1280
      );
      const sdFile = video.video_files?.find((f: any) => 
        f.quality === 'sd' && f.width >= 960
      );
      const bestFile = hdFile || sdFile || video.video_files?.[0];
      
      if (bestFile?.link) {
        console.log(`[UniversalVideoService] Found video: ${bestFile.link} (${video.duration}s)`);
        return {
          url: bestFile.link,
          duration: video.duration,
          source: 'pexels',
        };
      }
    }

    return null;
  } catch (e: any) {
    console.error('[UniversalVideoService] Pexels video search error:', e.message);
    return null;
  }
}
```

---

## PART 2: Generate Background Music with ElevenLabs

Use the **ElevenLabs Eleven Music API** to generate custom background music. This uses your existing ElevenLabs API key - no additional subscriptions needed!

### 2a. API Overview

| Feature | Details |
|---------|---------|
| **Endpoint** | `POST https://api.elevenlabs.io/v1/music/compose` |
| **Duration** | 10 seconds to 5 minutes (10,000ms - 300,000ms) |
| **Output** | MP3 (44.1kHz, 128-192kbps professional quality) |
| **Cost** | Uses your existing ElevenLabs credits |
| **Commercial** | ✅ Cleared for commercial use on paid plans |

### 2b. Add Music Generation Method

Add this method to `universal-video-service.ts`:

```typescript
/**
 * Generate background music using ElevenLabs Music API
 * Uses the same ELEVENLABS_API_KEY as voiceover generation
 */
async generateBackgroundMusic(
  duration: number,
  style: string = 'professional',
  productName?: string
): Promise<{ url: string; duration: number; source: string } | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    console.warn('[UniversalVideoService] No ELEVENLABS_API_KEY for music generation');
    this.addNotification({
      type: 'warning',
      service: 'Music',
      message: 'ElevenLabs API key required for music generation',
    });
    return null;
  }

  // Build a prompt based on video style and product
  const musicPrompt = this.buildMusicPrompt(style, productName, duration);
  
  // Ensure duration is within API limits (10s - 5min)
  const durationMs = Math.max(10000, Math.min(duration * 1000, 300000));
  
  console.log(`[UniversalVideoService] Generating ElevenLabs music: "${musicPrompt}" (${duration}s)`);

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/music/compose', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: musicPrompt,
        duration_ms: durationMs,
        instrumental: true, // No vocals - background music only
        output_format: 'mp3_44100_128', // Professional quality MP3
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[UniversalVideoService] ElevenLabs Music API error:', response.status, errorText);
      
      // Provide helpful error message
      if (response.status === 401) {
        this.addNotification({
          type: 'error',
          service: 'Music',
          message: 'ElevenLabs API key invalid or expired',
        });
      } else if (response.status === 402) {
        this.addNotification({
          type: 'error',
          service: 'Music',
          message: 'Insufficient ElevenLabs credits for music generation',
        });
      }
      return null;
    }

    // The API returns audio data directly as a stream
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    // Upload to S3 for Lambda access (Lambda cannot use base64 data URLs)
    const s3Url = await this.uploadToS3(
      base64Audio,
      `music-${Date.now()}.mp3`,
      'audio/mpeg'
    );

    if (s3Url) {
      console.log(`[UniversalVideoService] Music generated and uploaded to S3: ${s3Url}`);
      return {
        url: s3Url,
        duration: duration,
        source: 'elevenlabs-music',
      };
    }

    // Fallback: return as data URL (works for local preview only, not Lambda)
    console.warn('[UniversalVideoService] S3 upload failed, using data URL (local preview only)');
    return {
      url: `data:audio/mpeg;base64,${base64Audio}`,
      duration: duration,
      source: 'elevenlabs-music',
    };

  } catch (error: any) {
    console.error('[UniversalVideoService] Music generation error:', error.message);
    this.addNotification({
      type: 'error',
      service: 'Music',
      message: `Music generation failed: ${error.message}`,
    });
    return null;
  }
}
```

### 2c. Add Music Prompt Builder

Add this method to build effective music prompts based on video style:

```typescript
/**
 * Build an effective music prompt based on video style and product context
 */
private buildMusicPrompt(style: string, productName?: string, duration?: number): string {
  // Base prompts optimized for different video styles
  const stylePrompts: Record<string, string> = {
    professional: 
      'Soft ambient corporate background music, gentle piano and light strings, ' +
      'calm and reassuring, professional tone, suitable under voiceover',
    
    friendly: 
      'Warm acoustic background music, gentle fingerpicked guitar and soft percussion, ' +
      'welcoming and approachable, positive feeling',
    
    energetic: 
      'Upbeat motivational background music, inspiring corporate sound, ' +
      'building energy, positive and dynamic, confident',
    
    calm: 
      'Peaceful ambient music, soft piano with nature-inspired textures, ' +
      'meditation-like, soothing and deeply relaxing',
    
    documentary: 
      'Cinematic documentary background music, emotional strings, ' +
      'thoughtful and reflective mood, storytelling feel',
    
    wellness: 
      'Gentle wellness spa music, soft piano with ambient pads, ' +
      'calming and nurturing, natural and organic feeling, healing atmosphere',
    
    health: 
      'Soothing healthcare background music, reassuring and hopeful, ' +
      'gentle strings and piano, professional medical tone, trustworthy',
  };

  let prompt = stylePrompts[style] || stylePrompts.professional;

  // Add product-specific context for health/wellness products
  if (productName) {
    const lowerName = productName.toLowerCase();
    
    if (lowerName.includes('menopause') || lowerName.includes('hormone') || lowerName.includes('women')) {
      prompt = 
        'Gentle nurturing background music for women\'s wellness, ' +
        'soft piano with warm strings, calming and supportive, ' +
        'empowering yet soothing, spa-like tranquility';
    } else if (lowerName.includes('sleep') || lowerName.includes('relax') || lowerName.includes('rest')) {
      prompt = 
        'Peaceful sleep-inducing ambient music, very soft and slow tempo, ' +
        'dreamy pads and gentle piano, lullaby-like, deeply calming';
    } else if (lowerName.includes('energy') || lowerName.includes('vitality') || lowerName.includes('boost')) {
      prompt = 
        'Uplifting wellness music, gentle but energizing, ' +
        'morning sunshine feeling, optimistic acoustic guitar and light percussion';
    } else if (lowerName.includes('natural') || lowerName.includes('herbal') || lowerName.includes('botanical')) {
      prompt = 
        'Organic nature-inspired background music, soft acoustic instruments, ' +
        'earthy and grounded, botanical garden atmosphere, gentle and pure';
    } else if (lowerName.includes('stress') || lowerName.includes('anxiety') || lowerName.includes('calm')) {
      prompt = 
        'Calming anti-anxiety background music, slow tempo, ' +
        'gentle piano and soft ambient textures, peaceful and reassuring';
    }
  }

  // Add duration guidance for better pacing
  if (duration && duration <= 30) {
    prompt += ', short form, consistent energy throughout, no dramatic builds';
  } else if (duration && duration > 60 && duration <= 120) {
    prompt += ', subtle variations to maintain interest, gentle progression';
  } else if (duration && duration > 120) {
    prompt += ', gradual build with subtle variations, maintains interest over time, evolving texture';
  }

  // Always ensure it works as background under voiceover
  prompt += ', suitable as background music under spoken voiceover, not overpowering, subtle and supportive';

  return prompt;
}
```

### 2d. Update Music Step in generateProjectAssets

Replace the current music generation code in `generateProjectAssets`:

```typescript
// MUSIC STEP - Generate background music with ElevenLabs
updatedProject.progress.currentStep = 'music';
updatedProject.progress.steps.music.status = 'in-progress';
updatedProject.progress.steps.music.message = 'Generating background music with ElevenLabs...';

// Calculate total video duration
const totalDuration = project.scenes.reduce((acc, s) => acc + (s.duration || 5), 0);

// Determine music style from project settings or infer from product type
const musicStyle = project.settings?.musicStyle || 
                   this.inferMusicStyle(project.title, project.type);

console.log(`[UniversalVideoService] Generating ${totalDuration}s music, style: ${musicStyle}`);

const musicResult = await this.generateBackgroundMusic(
  totalDuration,
  musicStyle,
  project.title // Pass product name for context-aware prompts
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
  
  console.log(`[UniversalVideoService] Music complete: ${musicResult.url}`);
} else {
  updatedProject.progress.steps.music.status = 'complete';
  updatedProject.progress.steps.music.progress = 100;
  updatedProject.progress.steps.music.message = 'Music generation unavailable - video will have voiceover only';
  
  console.warn('[UniversalVideoService] Music generation failed or unavailable');
}
```

### 2e. Add Music Style Inference Helper

```typescript
/**
 * Infer appropriate music style from product name and video type
 */
private inferMusicStyle(title: string, videoType: string): string {
  const lowerTitle = title.toLowerCase();
  
  // Health/wellness product detection
  if (lowerTitle.includes('menopause') || 
      lowerTitle.includes('hormone') || 
      lowerTitle.includes('women') ||
      lowerTitle.includes('botanical') ||
      lowerTitle.includes('herbal') ||
      lowerTitle.includes('natural')) {
    return 'wellness';
  }
  
  if (lowerTitle.includes('sleep') || 
      lowerTitle.includes('relax') || 
      lowerTitle.includes('calm')) {
    return 'calm';
  }
  
  if (lowerTitle.includes('energy') || 
      lowerTitle.includes('vitality') || 
      lowerTitle.includes('boost')) {
    return 'energetic';
  }
  
  // Video type fallbacks
  if (videoType === 'script-based' || videoType === 'documentary') {
    return 'documentary';
  }
  
  // Default for product videos
  return 'wellness';
}
```

### 2f. Music Prompt Examples for Pine Hill Farm Products

| Product | Generated Prompt |
|---------|------------------|
| **Black Cohosh Extract Plus** | "Gentle nurturing background music for women's wellness, soft piano with warm strings, calming and supportive, empowering yet soothing, spa-like tranquility, suitable as background music under spoken voiceover, not overpowering, subtle and supportive" |
| **Sleep Support Formula** | "Peaceful sleep-inducing ambient music, very soft and slow tempo, dreamy pads and gentle piano, lullaby-like, deeply calming, suitable as background music under spoken voiceover, not overpowering, subtle and supportive" |
| **Energy & Vitality Blend** | "Uplifting wellness music, gentle but energizing, morning sunshine feeling, optimistic acoustic guitar and light percussion, suitable as background music under spoken voiceover, not overpowering, subtle and supportive" |

---

## PART 3: Update Remotion to Handle Video Backgrounds

### 3a. Update UniversalVideoComposition.tsx

Add video background support in the SceneRenderer:

```tsx
// Add Video import
import {
  AbsoluteFill,
  Audio,
  Img,
  Video,  // ADD THIS
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

// Update SceneRenderer to handle video backgrounds
const SceneRenderer: React.FC<{
  scene: Scene;
  brand: BrandSettings;
  isFirst: boolean;
  isLast: boolean;
  showDebugInfo?: boolean;
}> = ({ scene, brand, isFirst, isLast, showDebugInfo }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const durationInFrames = (scene.duration || 5) * fps;

  // ... existing transition code ...

  // Determine if using video or image
  const useVideo = scene.background.type === 'video' && scene.assets?.videoUrl;
  const imageUrl = scene.assets?.backgroundUrl || scene.assets?.imageUrl;
  const videoUrl = scene.assets?.videoUrl;

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Background Layer - Video or Image */}
      <AbsoluteFill>
        {useVideo && videoUrl ? (
          // VIDEO BACKGROUND
          <Video
            src={videoUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            volume={0} // Mute video audio (we have voiceover)
            playbackRate={1}
            startFrom={0}
          />
        ) : imageUrl ? (
          // IMAGE BACKGROUND with Ken Burns
          <Img
            src={imageUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
            }}
          />
        ) : (
          // FALLBACK GRADIENT
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${brand.colors.primary} 0%, ${brand.colors.secondary} 100%)`,
            }}
          />
        )}
      </AbsoluteFill>

      {/* Rest of overlay, product, text code... */}
    </AbsoluteFill>
  );
};
```

---

## PART 4: Add Motion Graphics to Text

### 4a. Enhanced Text Animations

Update the TextOverlayComponent with more dynamic animations:

```tsx
const TextOverlayComponent: React.FC<{
  overlay: TextOverlay;
  brand: BrandSettings;
  sceneFrame: number;
  fps: number;
}> = ({ overlay, brand, sceneFrame, fps }) => {
  const startFrame = (overlay.timing.startAt || 0) * fps;
  const durationFrames = (overlay.timing.duration || 3) * fps;
  const endFrame = startFrame + durationFrames;
  const animDuration = (overlay.animation?.duration || 0.5) * fps;

  if (sceneFrame < startFrame || sceneFrame > endFrame) {
    return null;
  }

  const localFrame = sceneFrame - startFrame;

  let opacity = 1;
  let translateY = 0;
  let translateX = 0;
  let scale = 1;
  let blur = 0;

  // ENHANCED ENTER ANIMATIONS
  if (localFrame < animDuration) {
    const progress = localFrame / animDuration;
    const eased = easeOutCubic(progress);
    
    switch (overlay.animation?.enter || 'fade') {
      case 'fade':
        opacity = eased;
        scale = interpolate(eased, [0, 1], [0.95, 1]);
        break;
        
      case 'slide-up':
        opacity = eased;
        translateY = interpolate(eased, [0, 1], [60, 0]);
        break;
        
      case 'slide-left':
        opacity = eased;
        translateX = interpolate(eased, [0, 1], [100, 0]);
        break;
        
      case 'scale':
        opacity = eased;
        scale = interpolate(eased, [0, 1], [0.3, 1]);
        blur = interpolate(eased, [0, 1], [10, 0]);
        break;
        
      case 'typewriter':
        opacity = 1;
        // Handled separately in text rendering
        break;
        
      // NEW: More dynamic animations
      case 'pop':
        opacity = eased;
        scale = spring({
          frame: localFrame,
          fps,
          config: { damping: 10, stiffness: 200 },
        });
        break;
        
      case 'blur-in':
        opacity = eased;
        blur = interpolate(eased, [0, 1], [20, 0]);
        break;
    }
  }

  // EXIT ANIMATIONS
  const exitStart = durationFrames - animDuration;
  if (localFrame > exitStart) {
    const exitProgress = (localFrame - exitStart) / animDuration;
    const eased = easeInCubic(exitProgress);
    
    switch (overlay.animation?.exit || 'fade') {
      case 'fade':
        opacity = 1 - eased;
        break;
      case 'slide-down':
        opacity = 1 - eased;
        translateY = interpolate(eased, [0, 1], [0, 40]);
        break;
      case 'scale':
        opacity = 1 - eased;
        scale = interpolate(eased, [0, 1], [1, 0.9]);
        break;
      case 'blur-out':
        opacity = 1 - eased;
        blur = interpolate(eased, [0, 1], [0, 15]);
        break;
    }
  }

  // ... rest of styling code ...

  return (
    <div
      style={{
        ...getPosition(),
        opacity,
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        willChange: 'transform, opacity, filter',
      }}
    >
      <div style={getStyleByType()}>
        {displayText}
      </div>
    </div>
  );
};

// Easing functions for smoother motion
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}
```

---

## PART 5: Add Lower Third Graphics

Create an animated lower third for scene titles:

```tsx
const LowerThird: React.FC<{
  title: string;
  subtitle?: string;
  brand: BrandSettings;
  startFrame: number;
  durationFrames: number;
}> = ({ title, subtitle, brand, startFrame, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  
  const localFrame = frame - startFrame;
  if (localFrame < 0 || localFrame > durationFrames) return null;
  
  const animIn = 15; // frames
  const animOut = 15;
  
  // Slide in animation
  let barWidth = 0;
  let textOpacity = 0;
  let translateX = -50;
  
  if (localFrame < animIn) {
    const progress = localFrame / animIn;
    barWidth = interpolate(progress, [0, 1], [0, 100]);
    textOpacity = interpolate(progress, [0.5, 1], [0, 1], { extrapolateLeft: 'clamp' });
    translateX = interpolate(progress, [0, 1], [-50, 0]);
  } else if (localFrame > durationFrames - animOut) {
    const progress = (localFrame - (durationFrames - animOut)) / animOut;
    barWidth = interpolate(progress, [0, 1], [100, 0]);
    textOpacity = interpolate(progress, [0, 0.5], [1, 0], { extrapolateRight: 'clamp' });
    translateX = interpolate(progress, [0, 1], [0, 50]);
  } else {
    barWidth = 100;
    textOpacity = 1;
    translateX = 0;
  }
  
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        left: 60,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          width: `${barWidth}%`,
          maxWidth: 400,
          height: 4,
          backgroundColor: brand.colors.accent,
          marginBottom: 12,
        }}
      />
      
      {/* Title */}
      <div
        style={{
          opacity: textOpacity,
          transform: `translateX(${translateX}px)`,
          color: brand.colors.textLight,
          fontSize: 36,
          fontWeight: 700,
          fontFamily: brand.fonts.heading,
          textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
        }}
      >
        {title}
      </div>
      
      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            opacity: textOpacity * 0.9,
            transform: `translateX(${translateX + 10}px)`,
            color: brand.colors.textLight,
            fontSize: 20,
            fontWeight: 400,
            fontFamily: brand.fonts.body,
            textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
            marginTop: 4,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};
```

---

## PART 6: Voiceover Sync

The voiceover needs to be timed to scene transitions. Currently, it's one long audio track.

### Option A: Generate Per-Scene Voiceovers

```typescript
async generateSceneVoiceovers(scenes: Scene[], voiceId?: string): Promise<{
  perScene: { sceneId: string; url: string; duration: number }[];
  fullTrackUrl: string;
  totalDuration: number;
}> {
  const perScene: { sceneId: string; url: string; duration: number }[] = [];
  
  for (const scene of scenes) {
    if (!scene.narration || scene.narration.trim() === '') continue;
    
    const result = await this.generateVoiceover(scene.narration, voiceId);
    if (result.success && result.url) {
      perScene.push({
        sceneId: scene.id,
        url: result.url,
        duration: result.duration,
      });
    }
  }
  
  // Also generate full track for fallback
  const fullNarration = scenes.map(s => s.narration).join(' ... ');
  const fullResult = await this.generateVoiceover(fullNarration, voiceId);
  
  return {
    perScene,
    fullTrackUrl: fullResult.url,
    totalDuration: perScene.reduce((acc, s) => acc + s.duration, 0),
  };
}
```

### Option B: Adjust Scene Durations to Match Voiceover

After generating voiceover, update scene durations:

```typescript
// Calculate actual duration from word count
function calculateSceneDuration(narration: string, minDuration: number = 4): number {
  const wordCount = narration.split(/\s+/).filter(Boolean).length;
  const speakingRate = 2.5; // words per second
  const calculatedDuration = Math.ceil(wordCount / speakingRate);
  return Math.max(calculatedDuration, minDuration);
}

// Update scenes after voiceover generation
for (let i = 0; i < project.scenes.length; i++) {
  const scene = project.scenes[i];
  const actualDuration = calculateSceneDuration(scene.narration, 4);
  project.scenes[i].duration = actualDuration;
}
```

---

## IMPLEMENTATION PRIORITY

1. **FIRST:** Implement ElevenLabs music generation (uses existing API key)
2. **SECOND:** Enable B-roll video fetching for hook/benefit scenes (requires PEXELS_API_KEY)
3. **THIRD:** Update Remotion to render Video backgrounds
4. **FOURTH:** Improve text animations
5. **FIFTH:** Add voiceover sync

---

## REQUIRED API KEYS

| Key | Purpose | How to Get |
|-----|---------|------------|
| `ELEVENLABS_API_KEY` | Voiceover + Music | Already configured ✅ |
| `PEXELS_API_KEY` | B-roll video clips | https://www.pexels.com/api/ (free) |

**Note:** No separate music API key needed - ElevenLabs Music uses your existing API key!

---

## TESTING CHECKLIST

After implementing:

- [ ] Music step shows "Generated Xs background music" (not "skipped")
- [ ] Videos step shows "Fetched X B-roll clips" (not "skipped")
- [ ] Hook scene uses video background (not static image)
- [ ] Background music plays in final video at low volume
- [ ] Music doesn't overpower voiceover
- [ ] Text animations are smooth (not jarring)
- [ ] Voiceover timing feels natural with scene changes
- [ ] Video feels dynamic, not like a slideshow

---

## QUICK DIAGNOSTIC

Check your server logs for these messages:

```
# Good signs:
[UniversalVideoService] Generating ElevenLabs music: "Gentle nurturing background music..." (30s)
[UniversalVideoService] Music generated and uploaded to S3: https://remotionlambda-useast1-xxx.s3.amazonaws.com/assets/music-xxx.mp3
[UniversalVideoService] Searching Pexels videos: woman wellness...
[UniversalVideoService] Found video: https://player.vimeo.com/...

# Bad signs:
[UniversalVideoService] No ELEVENLABS_API_KEY for music generation
[UniversalVideoService] ElevenLabs Music API error: 402
[UniversalVideoService] No PEXELS_API_KEY - cannot fetch B-roll
[UniversalVideoService] Videos step skipped
```

---

## ELEVENLABS AUDIO CONSOLIDATION

With this implementation, your entire audio pipeline uses **one service**:

| Audio Type | ElevenLabs API | Endpoint |
|------------|----------------|----------|
| Voiceover | Text-to-Speech | `/v1/text-to-speech/{voice_id}` |
| Background Music | Eleven Music | `/v1/music/compose` |
| Sound Effects (optional) | Sound Effects | `/v1/sound-generation` |

Benefits:
- Single API key for all audio
- Consistent quality across audio types
- One billing relationship
- Custom-generated music that fits your content perfectly
