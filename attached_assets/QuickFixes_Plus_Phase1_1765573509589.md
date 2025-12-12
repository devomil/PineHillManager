# Quick Fixes + Phase 1: Regeneration Feature

## Overview

This document combines:
1. **Quick Fixes** (15-30 min) - Fix pronunciation, reduce B-roll repetition
2. **Phase 1** (2-3 hours) - Add scene regeneration so users can fix issues themselves

The duplicate text issue requires more investigation - we'll address it after Phase 1.

---

# PART A: Quick Fixes (Do First)

## Quick Fix 1: Pronunciation - Remove Hyphens

**Problem:** ElevenLabs reads hyphens as pauses, so "koh-hosh" becomes "koh...hosh"

**File:** `server/services/universal-video-service.ts`

**Find the `preprocessNarrationForTTS` function (around line 917) and REPLACE the pronunciationMap:**

```typescript
private preprocessNarrationForTTS(text: string): string {
  // FIXED: Use spaces instead of hyphens - ElevenLabs reads hyphens as pauses
  const pronunciationMap: Record<string, string> = {
    // Herbs - smooth phonetic spelling with spaces
    'cohosh': 'KOH hosh',
    'Cohosh': 'KOH hosh',
    'ashwagandha': 'ahsh wah GAHN dah',
    'Ashwagandha': 'Ahsh wah GAHN dah',
    'chasteberry': 'CHAYST berry',
    'Chasteberry': 'CHAYST berry',
    'dong quai': 'dong KWAY',
    'Dong Quai': 'Dong KWAY',
    
    // Scientific terms
    'isoflavone': 'EYE so flay vone',
    'isoflavones': 'EYE so flay vones',
    'phytoestrogen': 'FY toe ESS tro jen',
    'phytoestrogens': 'FY toe ESS tro jens',
    'formononetin': 'for MON oh neh tin',
    
    // Medical terms  
    'luteinizing': 'LOO tin eye zing',
    'hypothalamus': 'HY poe THAL uh mus',
    'endocrine': 'EN doe krin',
    'bioavailable': 'BY oh uh VALE uh bul',
    'adaptogen': 'uh DAP toh jen',
    'adaptogens': 'uh DAP toh jens',
  };
  
  let processedText = text;
  const sortedKeys = Object.keys(pronunciationMap).sort((a, b) => b.length - a.length);
  
  for (const word of sortedKeys) {
    const phonetic = pronunciationMap[word];
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    processedText = processedText.replace(regex, phonetic);
  }
  
  return processedText;
}
```

## Quick Fix 2: Track Used Videos to Avoid Repetition

**File:** `server/services/universal-video-service.ts`

**Step 2A: Add class property (near line 45, after other properties):**

```typescript
private usedVideoUrls: Set<string> = new Set();
```

**Step 2B: Add reset method (anywhere in the class):**

```typescript
private resetUsedVideos(): void {
  this.usedVideoUrls.clear();
  console.log('[UniversalVideoService] Reset used videos tracker');
}
```

**Step 2C: Update `getStockVideo` to track and skip used URLs:**

Find the `getStockVideo` method and modify it:

```typescript
async getStockVideo(
  query: string,
  targetAudience?: string
): Promise<{ url: string; duration: number; source: string; tags?: string } | null> {
  console.log(`[StockVideo] Searching: "${query}" (${this.usedVideoUrls.size} already used)`);
  
  // Try Pexels - get multiple results
  const pexelsResult = await this.getPexelsVideo(query);
  if (pexelsResult) {
    // Check if already used
    if (this.usedVideoUrls.has(pexelsResult.url)) {
      console.log(`[StockVideo] Pexels result already used, trying different query...`);
      // Try with modified query
      const altResult = await this.getPexelsVideo(query + ' lifestyle');
      if (altResult && !this.usedVideoUrls.has(altResult.url)) {
        if (!targetAudience || this.validateVideoForAudience(altResult, targetAudience)) {
          this.usedVideoUrls.add(altResult.url);
          return altResult;
        }
      }
    } else {
      // Validate and use
      if (!targetAudience || this.validateVideoForAudience(pexelsResult, targetAudience)) {
        this.usedVideoUrls.add(pexelsResult.url);
        return pexelsResult;
      }
    }
  }

  // Try Pixabay as fallback
  const pixabayResult = await this.getPixabayVideo(query);
  if (pixabayResult && !this.usedVideoUrls.has(pixabayResult.url)) {
    if (!targetAudience || this.validateVideoForAudience(pixabayResult, targetAudience)) {
      this.usedVideoUrls.add(pixabayResult.url);
      return pixabayResult;
    }
  }

  console.log(`[StockVideo] No unused valid videos found for: "${query}"`);
  return null;
}
```

**Step 2D: Call reset at start of `generateProjectAssets`:**

Find `generateProjectAssets` and add at the very beginning:

```typescript
async generateProjectAssets(project: VideoProject): Promise<VideoProject> {
  const updatedProject = { ...project };
  
  // Reset video tracking for new project
  this.resetUsedVideos();
  
  // ... rest of existing code
```

---

# PART B: Phase 1 - Scene Regeneration Feature

This allows users to regenerate individual scenes when they're not happy with the results.

## Step 1: Update Type Definitions

**File:** `shared/video-types.ts`

Add these new fields to existing interfaces:

```typescript
// ADD to SceneAssets interface (find it and add these fields):
export interface SceneAssets {
  // ... existing fields ...
  
  // NEW: Track alternative assets for regeneration
  alternativeImages?: { url: string; prompt: string; source: string }[];
  alternativeVideos?: { url: string; query: string; source: string }[];
  preferVideo?: boolean;
  preferImage?: boolean;
}

// ADD new interface for tracking regenerations:
export interface RegenerationRecord {
  id: string;
  sceneId: string;
  assetType: 'image' | 'video' | 'voiceover';
  previousUrl?: string;
  newUrl?: string;
  prompt?: string;
  timestamp: string;
  success: boolean;
}

// ADD to VideoProject interface:
export interface VideoProject {
  // ... existing fields ...
  
  regenerationHistory?: RegenerationRecord[];
}
```

## Step 2: Add Regeneration Service Methods

**File:** `server/services/universal-video-service.ts`

Add these new methods to the `UniversalVideoService` class:

```typescript
/**
 * Regenerate the background image for a specific scene
 */
async regenerateSceneImage(
  project: VideoProject,
  sceneId: string,
  customPrompt?: string
): Promise<{ success: boolean; newImageUrl?: string; source?: string; error?: string }> {
  const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
  if (sceneIndex < 0) {
    return { success: false, error: 'Scene not found' };
  }
  
  const scene = project.scenes[sceneIndex];
  const prompt = customPrompt || scene.visualDirection || scene.background?.source || 'wellness lifestyle';
  
  console.log(`[Regenerate] Image for scene ${sceneId} with prompt: ${prompt.substring(0, 60)}...`);
  
  // Try content image generation first
  if (this.isContentScene(scene.type)) {
    const result = await this.generateContentImage(scene, project.title);
    if (result.imageUrl) {
      return { success: true, newImageUrl: result.imageUrl, source: result.source };
    }
  }
  
  // Try AI background generation
  const bgResult = await this.generateAIBackground(prompt, scene.type);
  if (bgResult.backgroundUrl) {
    return { success: true, newImageUrl: bgResult.backgroundUrl, source: bgResult.source };
  }
  
  // Fallback to stock image
  const stockResult = await this.getStockImage(prompt);
  if (stockResult.success) {
    return { success: true, newImageUrl: stockResult.url, source: stockResult.source };
  }
  
  return { success: false, error: 'All image generation methods failed' };
}

/**
 * Regenerate the B-roll video for a specific scene
 */
async regenerateSceneVideo(
  project: VideoProject,
  sceneId: string,
  customQuery?: string
): Promise<{ success: boolean; newVideoUrl?: string; duration?: number; source?: string; error?: string }> {
  const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
  if (sceneIndex < 0) {
    return { success: false, error: 'Scene not found' };
  }
  
  const scene = project.scenes[sceneIndex];
  const query = customQuery || this.buildVideoSearchQuery(scene, project.targetAudience);
  
  console.log(`[Regenerate] Video for scene ${sceneId} with query: ${query}`);
  
  // Don't use the duplicate tracking for regeneration - user wants a NEW video
  const pexelsResult = await this.getPexelsVideo(query + ' ' + Date.now()); // Add timestamp to vary results
  if (pexelsResult) {
    if (!project.targetAudience || this.validateVideoForAudience(pexelsResult, project.targetAudience)) {
      return { 
        success: true, 
        newVideoUrl: pexelsResult.url, 
        duration: pexelsResult.duration,
        source: pexelsResult.source 
      };
    }
  }
  
  // Try Pixabay
  const pixabayResult = await this.getPixabayVideo(query);
  if (pixabayResult) {
    return { 
      success: true, 
      newVideoUrl: pixabayResult.url, 
      duration: pixabayResult.duration,
      source: pixabayResult.source 
    };
  }
  
  return { success: false, error: 'No suitable video found' };
}

/**
 * Switch a scene between using video background and image background
 */
async switchSceneBackgroundType(
  project: VideoProject,
  sceneId: string,
  preferVideo: boolean
): Promise<{ success: boolean; error?: string }> {
  const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
  if (sceneIndex < 0) {
    return { success: false, error: 'Scene not found' };
  }
  
  const scene = project.scenes[sceneIndex];
  
  if (preferVideo) {
    // Switch to video - need a video URL
    if (!scene.assets?.videoUrl) {
      // Generate one
      const videoResult = await this.regenerateSceneVideo(project, sceneId);
      if (!videoResult.success) {
        return { success: false, error: 'Could not find suitable video' };
      }
      scene.assets = scene.assets || {};
      scene.assets.videoUrl = videoResult.newVideoUrl;
    }
    scene.background = scene.background || { type: 'video', source: '' };
    scene.background.type = 'video';
    scene.assets!.preferVideo = true;
    scene.assets!.preferImage = false;
  } else {
    // Switch to image
    if (!scene.assets?.imageUrl && !scene.assets?.backgroundUrl) {
      // Generate one
      const imageResult = await this.regenerateSceneImage(project, sceneId);
      if (!imageResult.success) {
        return { success: false, error: 'Could not generate image' };
      }
      scene.assets = scene.assets || {};
      scene.assets.imageUrl = imageResult.newImageUrl;
      scene.assets.backgroundUrl = imageResult.newImageUrl;
    }
    scene.background = scene.background || { type: 'image', source: '' };
    scene.background.type = 'image';
    scene.assets!.preferVideo = false;
    scene.assets!.preferImage = true;
  }
  
  return { success: true };
}
```

## Step 3: Add API Endpoints

**File:** `server/routes.ts` (or wherever your video API routes are defined)

Add these endpoints:

```typescript
/**
 * Regenerate image for a specific scene
 * POST /api/video-projects/:projectId/scenes/:sceneId/regenerate-image
 */
app.post('/api/video-projects/:projectId/scenes/:sceneId/regenerate-image', async (req, res) => {
  try {
    const { projectId, sceneId } = req.params;
    const { prompt } = req.body;
    
    const project = await storage.getVideoProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const result = await universalVideoService.regenerateSceneImage(project, sceneId, prompt);
    
    if (result.success && result.newImageUrl) {
      // Update the scene
      const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
      if (sceneIndex >= 0) {
        // Store old image as alternative
        const oldUrl = project.scenes[sceneIndex].assets?.imageUrl;
        if (oldUrl) {
          if (!project.scenes[sceneIndex].assets!.alternativeImages) {
            project.scenes[sceneIndex].assets!.alternativeImages = [];
          }
          project.scenes[sceneIndex].assets!.alternativeImages!.push({
            url: oldUrl,
            prompt: 'previous',
            source: 'previous'
          });
        }
        
        // Set new image
        project.scenes[sceneIndex].assets!.imageUrl = result.newImageUrl;
        project.scenes[sceneIndex].assets!.backgroundUrl = result.newImageUrl;
        project.scenes[sceneIndex].background!.type = 'image';
        
        // Track regeneration
        if (!project.regenerationHistory) project.regenerationHistory = [];
        project.regenerationHistory.push({
          id: `regen_${Date.now()}`,
          sceneId,
          assetType: 'image',
          previousUrl: oldUrl,
          newUrl: result.newImageUrl,
          prompt,
          timestamp: new Date().toISOString(),
          success: true
        });
        
        await storage.saveVideoProject(project);
      }
      
      return res.json({ 
        success: true, 
        newImageUrl: result.newImageUrl,
        source: result.source
      });
    }
    
    return res.status(400).json({ success: false, error: result.error });
  } catch (error: any) {
    console.error('[API] Regenerate image error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Regenerate video for a specific scene
 * POST /api/video-projects/:projectId/scenes/:sceneId/regenerate-video
 */
app.post('/api/video-projects/:projectId/scenes/:sceneId/regenerate-video', async (req, res) => {
  try {
    const { projectId, sceneId } = req.params;
    const { query } = req.body;
    
    const project = await storage.getVideoProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const result = await universalVideoService.regenerateSceneVideo(project, sceneId, query);
    
    if (result.success && result.newVideoUrl) {
      const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
      if (sceneIndex >= 0) {
        // Store old video as alternative
        const oldUrl = project.scenes[sceneIndex].assets?.videoUrl;
        if (oldUrl) {
          if (!project.scenes[sceneIndex].assets!.alternativeVideos) {
            project.scenes[sceneIndex].assets!.alternativeVideos = [];
          }
          project.scenes[sceneIndex].assets!.alternativeVideos!.push({
            url: oldUrl,
            query: 'previous',
            source: 'previous'
          });
        }
        
        // Set new video
        project.scenes[sceneIndex].assets!.videoUrl = result.newVideoUrl;
        project.scenes[sceneIndex].background!.type = 'video';
        
        // Track regeneration
        if (!project.regenerationHistory) project.regenerationHistory = [];
        project.regenerationHistory.push({
          id: `regen_${Date.now()}`,
          sceneId,
          assetType: 'video',
          previousUrl: oldUrl,
          newUrl: result.newVideoUrl,
          prompt: query,
          timestamp: new Date().toISOString(),
          success: true
        });
        
        await storage.saveVideoProject(project);
      }
      
      return res.json({ 
        success: true, 
        newVideoUrl: result.newVideoUrl,
        duration: result.duration,
        source: result.source
      });
    }
    
    return res.status(400).json({ success: false, error: result.error });
  } catch (error: any) {
    console.error('[API] Regenerate video error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Switch scene between video and image background
 * POST /api/video-projects/:projectId/scenes/:sceneId/switch-background
 */
app.post('/api/video-projects/:projectId/scenes/:sceneId/switch-background', async (req, res) => {
  try {
    const { projectId, sceneId } = req.params;
    const { preferVideo } = req.body;
    
    const project = await storage.getVideoProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const result = await universalVideoService.switchSceneBackgroundType(
      project, 
      sceneId, 
      preferVideo === true
    );
    
    if (result.success) {
      await storage.saveVideoProject(project);
      const scene = project.scenes.find(s => s.id === sceneId);
      return res.json({ success: true, scene });
    }
    
    return res.status(400).json({ success: false, error: result.error });
  } catch (error: any) {
    console.error('[API] Switch background error:', error);
    return res.status(500).json({ error: error.message });
  }
});
```

## Step 4: Add UI Controls to Scene Cards

**File:** Update your scene preview/card component in the frontend

Add buttons to each scene card:

```tsx
// Add to your existing scene card/preview component

interface SceneActionsProps {
  scene: Scene;
  projectId: string;
  onUpdate: (updatedScene: Scene) => void;
}

const SceneActions: React.FC<SceneActionsProps> = ({ scene, projectId, onUpdate }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const regenerateImage = async () => {
    setLoading('image');
    try {
      const res = await fetch(`/api/video-projects/${projectId}/scenes/${scene.id}/regenerate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: customPrompt || undefined })
      });
      const data = await res.json();
      if (data.success) {
        // Refresh scene data
        onUpdate({ ...scene, assets: { ...scene.assets, imageUrl: data.newImageUrl } });
      }
    } finally {
      setLoading(null);
    }
  };

  const regenerateVideo = async () => {
    setLoading('video');
    try {
      const res = await fetch(`/api/video-projects/${projectId}/scenes/${scene.id}/regenerate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: customPrompt || undefined })
      });
      const data = await res.json();
      if (data.success) {
        onUpdate({ ...scene, assets: { ...scene.assets, videoUrl: data.newVideoUrl } });
      }
    } finally {
      setLoading(null);
    }
  };

  const switchToImage = async () => {
    setLoading('switch');
    try {
      const res = await fetch(`/api/video-projects/${projectId}/scenes/${scene.id}/switch-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferVideo: false })
      });
      const data = await res.json();
      if (data.success) {
        onUpdate(data.scene);
      }
    } finally {
      setLoading(null);
    }
  };

  const switchToVideo = async () => {
    setLoading('switch');
    try {
      const res = await fetch(`/api/video-projects/${projectId}/scenes/${scene.id}/switch-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferVideo: true })
      });
      const data = await res.json();
      if (data.success) {
        onUpdate(data.scene);
      }
    } finally {
      setLoading(null);
    }
  };

  const isVideo = scene.background?.type === 'video';

  return (
    <div className="scene-actions p-2 border-t">
      {/* Custom prompt input */}
      <input
        type="text"
        placeholder="Custom prompt/query (optional)"
        value={customPrompt}
        onChange={e => setCustomPrompt(e.target.value)}
        className="w-full px-2 py-1 text-sm border rounded mb-2"
      />
      
      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={regenerateImage}
          disabled={!!loading}
          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading === 'image' ? '...' : '🔄 New Image'}
        </button>
        
        <button
          onClick={regenerateVideo}
          disabled={!!loading}
          className="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {loading === 'video' ? '...' : '🎬 New Video'}
        </button>
        
        <button
          onClick={isVideo ? switchToImage : switchToVideo}
          disabled={!!loading}
          className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
        >
          {loading === 'switch' ? '...' : isVideo ? '🖼️ Use Image' : '🎬 Use Video'}
        </button>
      </div>
      
      {/* Current type indicator */}
      <div className="mt-2 text-xs text-gray-500">
        Current: {isVideo ? '🎬 Video' : '🖼️ Image'}
      </div>
    </div>
  );
};
```

---

## Testing Checklist

### Quick Fixes
- [ ] Generate new video - pronunciation should be smooth (no pauses in "cohosh")
- [ ] Check logs for "already used" messages showing video tracking works
- [ ] Different B-roll videos for different scenes

### Phase 1 Features
- [ ] Click "New Image" on a scene - new AI image generates
- [ ] Click "New Video" on a scene - new B-roll video is found
- [ ] Click "Use Image" / "Use Video" - scene switches background type
- [ ] Custom prompt field works for targeted regeneration
- [ ] Scene preview updates after regeneration

---

## Summary

| Part | Time | What It Does |
|------|------|--------------|
| Quick Fix 1 | 5 min | Fix pronunciation (remove hyphens) |
| Quick Fix 2 | 10 min | Track used videos to reduce repetition |
| Phase 1 | 1-2 hr | Add regeneration UI for user control |

After these changes, users can fix most issues themselves by regenerating scenes they don't like!
