# Quick Fix: Enable Videos & Music

## ROOT CAUSE

Looking at your `universal-video-service.ts`, I found these issues:

### Issue 1: Videos Are Skipped for Product Videos
```typescript
// Current code (line ~470):
if (project.type === 'script-based' && project.totalDuration > 60) {
  // ... fetch videos
} else {
  updatedProject.progress.steps.videos.status = 'skipped';
}
```
**This skips video fetching for ALL product videos!**

### Issue 2: Music Uses Wrong API
```typescript
// Current code - searches for VIDEOS with music keywords:
const response = await fetch(
  `https://api.pexels.com/videos/search?query=${encodeURIComponent(keyword)}...`
);
```
**Pexels videos ≠ audio files. This returns video URLs, not music.**

---

## QUICK FIXES

### Fix 1: Enable B-Roll for Product Videos

Find this code block in `generateProjectAssets`:

```typescript
// VIDEOS STEP - Fetch B-roll for script-based videos > 60 seconds
updatedProject.progress.currentStep = 'videos';
updatedProject.progress.steps.videos.status = 'in-progress';

if (project.type === 'script-based' && project.totalDuration > 60) {
```

**REPLACE WITH:**

```typescript
// VIDEOS STEP - Fetch B-roll for scenes that benefit from motion
updatedProject.progress.currentStep = 'videos';
updatedProject.progress.steps.videos.status = 'in-progress';

// Always try to get B-roll for hook and benefit scenes
const scenesNeedingVideo = project.scenes.filter(s => 
  ['hook', 'benefit', 'story', 'testimonial'].includes(s.type)
);

if (scenesNeedingVideo.length > 0) {
  console.log(`[UniversalVideoService] Fetching B-roll for ${scenesNeedingVideo.length} scenes...`);
  let videosGenerated = 0;
  
  for (const scene of scenesNeedingVideo) {
    const searchQuery = this.buildVideoSearchQuery(scene);
    const videoResult = await this.getStockVideo(searchQuery);
    
    if (videoResult) {
      updatedProject.assets.videos.push({
        sceneId: scene.id,
        url: videoResult.url,
        source: 'pexels',
      });
      
      // Update scene to use video
      const sceneIndex = updatedProject.scenes.findIndex(s => s.id === scene.id);
      if (sceneIndex >= 0) {
        if (!updatedProject.scenes[sceneIndex].assets) {
          updatedProject.scenes[sceneIndex].assets = {};
        }
        updatedProject.scenes[sceneIndex].assets!.videoUrl = videoResult.url;
        updatedProject.scenes[sceneIndex].background.type = 'video';
      }
      videosGenerated++;
    }
  }
  
  updatedProject.progress.steps.videos.status = 'complete';
  updatedProject.progress.steps.videos.progress = 100;
  updatedProject.progress.steps.videos.message = videosGenerated > 0 
    ? `Fetched ${videosGenerated} B-roll clips`
    : 'No suitable B-roll found - using AI images';
} else {
  updatedProject.progress.steps.videos.status = 'skipped';
  updatedProject.progress.steps.videos.message = 'No scenes require B-roll';
}
```

### Fix 2: Add Video Search Query Builder

Add this method to the class:

```typescript
private buildVideoSearchQuery(scene: Scene): string {
  const narration = (scene.narration || '').toLowerCase();
  
  // Health/wellness keywords
  if (narration.includes('menopause')) return 'mature woman wellness relaxation';
  if (narration.includes('hot flash')) return 'woman cooling relief';
  if (narration.includes('sleep')) return 'peaceful sleep relaxation';
  if (narration.includes('energy')) return 'active woman healthy';
  if (narration.includes('hormone')) return 'woman wellness nature';
  if (narration.includes('natural')) return 'herbs botanical nature';
  
  // Scene type defaults
  const defaults: Record<string, string> = {
    hook: 'woman concerned thinking',
    benefit: 'happy woman smiling wellness',
    testimonial: 'satisfied customer woman',
    story: 'woman transformation journey',
  };
  
  return defaults[scene.type] || 'woman wellness lifestyle';
}
```

### Fix 3: Replace Music Fetching

**DELETE the current `getBackgroundMusic` method and REPLACE WITH:**

```typescript
async getBackgroundMusic(duration: number, style?: string): Promise<{ url: string; duration: number; source: string } | null> {
  // Option 1: Use Pixabay audio API (requires PIXABAY_API_KEY)
  const pixabayKey = process.env.PIXABAY_API_KEY;
  
  if (pixabayKey) {
    try {
      const queries: Record<string, string> = {
        professional: 'corporate ambient calm',
        friendly: 'uplifting happy acoustic',
        energetic: 'upbeat motivational',
        calm: 'relaxing peaceful meditation',
      };
      
      const query = queries[style || 'professional'] || 'ambient background';
      console.log(`[UniversalVideoService] Searching Pixabay audio: ${query}`);
      
      const response = await fetch(
        `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query)}&category=music`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.hits && data.hits.length > 0) {
          // Find track with suitable duration
          const track = data.hits.find((h: any) => h.duration >= duration * 0.7) || data.hits[0];
          
          if (track && track.previewURL) {
            console.log(`[UniversalVideoService] Found music: ${track.previewURL}`);
            return {
              url: track.previewURL,
              duration: track.duration,
              source: 'pixabay',
            };
          }
        }
      }
    } catch (e) {
      console.warn('[UniversalVideoService] Pixabay music error:', e);
    }
  }
  
  // Option 2: Use free royalty-free tracks from reliable CDNs
  // These are example URLs - you should replace with actual licensed tracks
  const fallbackTracks = [
    {
      url: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_58d93274f4.mp3',
      duration: 147,
      name: 'Corporate Ambient',
    },
    {
      url: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_946bc3eb42.mp3',
      duration: 126,
      name: 'Inspiring Corporate',
    },
  ];
  
  // For now, log that music is unavailable
  console.log('[UniversalVideoService] No PIXABAY_API_KEY - music unavailable');
  this.addNotification({
    type: 'warning',
    service: 'Music',
    message: 'Add PIXABAY_API_KEY to enable background music. Get free key at pixabay.com/api/docs/',
  });
  
  return null;
}
```

---

## Fix 4: Update Remotion to Handle Video Backgrounds

In `remotion/UniversalVideoComposition.tsx`, find the SceneRenderer and update the background rendering:

```tsx
// Add Video import at top
import {
  AbsoluteFill,
  Audio,
  Img,
  Video,  // <-- ADD THIS
  Sequence,
  // ...
} from "remotion";

// In SceneRenderer, update the background rendering section:

// Determine background type
const useVideo = scene.background?.type === 'video' && 
                 scene.assets?.videoUrl && 
                 isValidHttpUrl(scene.assets.videoUrl);

const imageUrl = scene.assets?.backgroundUrl || scene.assets?.imageUrl;
const videoUrl = scene.assets?.videoUrl;

return (
  <AbsoluteFill style={{ opacity }}>
    {/* Background Layer */}
    <AbsoluteFill>
      {useVideo ? (
        // VIDEO BACKGROUND
        <Video
          src={videoUrl!}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          volume={0}
        />
      ) : hasValidImage ? (
        // IMAGE BACKGROUND
        <SafeImage
          src={imageUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          }}
          fallback={<GradientFallback brand={brand} sceneType={scene.type} />}
        />
      ) : (
        <GradientFallback brand={brand} sceneType={scene.type} />
      )}
    </AbsoluteFill>
    
    {/* ... rest unchanged ... */}
  </AbsoluteFill>
);
```

---

## REQUIRED API KEYS

You need these environment variables:

| Key | Purpose | Get It From |
|-----|---------|-------------|
| `PEXELS_API_KEY` | B-roll videos | https://www.pexels.com/api/ (free) |
| `PIXABAY_API_KEY` | Background music | https://pixabay.com/api/docs/ (free) |

Both are **free** - just sign up and get the key.

---

## VERIFICATION

After implementing, check your server logs:

**Before (current):**
```
[UniversalVideoService] Videos step skipped - product video uses images
```

**After (fixed):**
```
[UniversalVideoService] Fetching B-roll for 2 scenes...
[UniversalVideoService] Searching Pexels videos: woman concerned thinking
[UniversalVideoService] Found video: https://player.vimeo.com/external/...
[UniversalVideoService] Searching Pixabay audio: corporate ambient calm
[UniversalVideoService] Found music: https://cdn.pixabay.com/audio/...
```

---

## EXPECTED RESULT

After these fixes, your 30-second Black Cohosh video should have:

| Scene | Current | After Fix |
|-------|---------|-----------|
| Hook | Static image + Ken Burns | B-roll video of woman |
| Benefit 1 | Static image | B-roll video |
| Benefit 2 | Static image | AI image (variety) |
| CTA | Static image + product | AI background + product overlay |
| Audio | Voiceover only | Voiceover + background music |
