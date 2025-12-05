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

## PART 2: Fix Background Music

The music step is being skipped. We need to properly implement Pixabay's audio API.

### 2a. Get Pixabay API Key

1. Go to https://pixabay.com/api/docs/
2. Create a free account
3. Copy your API key
4. Add to environment: `PIXABAY_API_KEY=your_key_here`

### 2b. Update Music Fetching

```typescript
async getBackgroundMusic(duration: number, style?: string): Promise<{ url: string; duration: number; source: string } | null> {
  const pixabayKey = process.env.PIXABAY_API_KEY;
  
  if (!pixabayKey) {
    console.warn('[UniversalVideoService] No PIXABAY_API_KEY configured');
    this.addNotification({
      type: 'warning',
      service: 'Music',
      message: 'Add PIXABAY_API_KEY to enable background music',
    });
    return null;
  }

  // Music search terms based on video style
  const musicQueries: Record<string, string[]> = {
    professional: ['corporate ambient', 'business background', 'calm corporate'],
    friendly: ['uplifting acoustic', 'happy background', 'cheerful'],
    energetic: ['upbeat motivational', 'energetic corporate', 'inspiring'],
    calm: ['relaxing piano', 'meditation ambient', 'peaceful'],
  };
  
  const queries = musicQueries[style || 'professional'] || musicQueries.professional;

  for (const query of queries) {
    try {
      console.log(`[UniversalVideoService] Searching Pixabay music: ${query}`);
      
      // IMPORTANT: Use category=music for audio files
      const response = await fetch(
        `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query)}&category=music&per_page=10`
      );
      
      if (!response.ok) {
        console.warn('[UniversalVideoService] Pixabay API error:', response.status);
        continue;
      }
      
      const data = await response.json();
      
      if (data.hits && data.hits.length > 0) {
        // Find a track with appropriate duration
        const minDuration = Math.max(duration * 0.8, 30);
        let selectedTrack = data.hits.find((hit: any) => 
          hit.duration >= minDuration && hit.downloads > 100
        );
        
        // Fallback to longest track if no perfect match
        if (!selectedTrack) {
          selectedTrack = data.hits
            .sort((a: any, b: any) => b.duration - a.duration)[0];
        }
        
        if (selectedTrack) {
          // Pixabay audio URL is in previewURL for free tier
          // For full tracks, you need the pageURL and extract
          const audioUrl = selectedTrack.previewURL || selectedTrack.webformatURL;
          
          if (audioUrl) {
            console.log(`[UniversalVideoService] Selected music: ${audioUrl} (${selectedTrack.duration}s)`);
            return {
              url: audioUrl,
              duration: selectedTrack.duration,
              source: 'pixabay',
            };
          }
        }
      }
    } catch (e: any) {
      console.warn('[UniversalVideoService] Pixabay music error:', e.message);
    }
  }

  // Alternative: Use free music from other sources
  return this.getFallbackMusic(duration);
}

private async getFallbackMusic(duration: number): Promise<{ url: string; duration: number; source: string } | null> {
  // You can add royalty-free tracks to S3 and reference them here
  // These would be pre-uploaded tracks you've licensed
  
  const fallbackTracks = [
    {
      url: 'https://cdn.pixabay.com/audio/2024/11/29/audio_73a907580e.mp3', // Example
      duration: 120,
      style: 'ambient',
    },
  ];
  
  const track = fallbackTracks[0];
  if (track) {
    console.log('[UniversalVideoService] Using fallback music track');
    return {
      url: track.url,
      duration: track.duration,
      source: 'fallback',
    };
  }
  
  return null;
}
```

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

1. **FIRST:** Add PIXABAY_API_KEY and fix music fetching
2. **SECOND:** Enable B-roll video fetching for hook/benefit scenes
3. **THIRD:** Update Remotion to render Video backgrounds
4. **FOURTH:** Improve text animations
5. **FIFTH:** Add voiceover sync

---

## TESTING CHECKLIST

After implementing:

- [ ] Music step shows "complete" with duration (not "skipped")
- [ ] Videos step shows "Fetched X B-roll clips" (not "skipped")
- [ ] Hook scene uses video background (not static image)
- [ ] Background music plays in final video
- [ ] Text animations are smooth (not jarring)
- [ ] Voiceover timing feels natural with scene changes
- [ ] Video feels dynamic, not like a slideshow

---

## QUICK DIAGNOSTIC

Check your server logs for these messages:

```
# Good signs:
[UniversalVideoService] Searching Pexels videos: woman wellness...
[UniversalVideoService] Found video: https://player.vimeo.com/...
[UniversalVideoService] Searching Pixabay music: corporate ambient
[UniversalVideoService] Selected music: https://cdn.pixabay.com/audio/...

# Bad signs:
[UniversalVideoService] No PEXELS_API_KEY - cannot fetch B-roll
[UniversalVideoService] No PIXABAY_API_KEY configured
[UniversalVideoService] Videos step skipped - product video uses images
```
