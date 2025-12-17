# Video Studio Enhancement Plan: Regeneration & Long-Form Support

## Overview

This document provides implementation instructions for two major enhancements:
1. **Asset Regeneration System** - Allow users to regenerate individual scenes, images, videos, and music
2. **Long-Form Video Support** - Extend the system to handle 10-15 minute script-based documentaries

---

## PART 1: ASSET REGENERATION SYSTEM

### 1.1 Database/Storage Updates

First, update the `VideoProject` type to track regeneration history:

```typescript
// In shared/video-types.ts

export interface RegenerationRecord {
  id: string;
  sceneId?: string;
  assetType: 'image' | 'video' | 'voiceover' | 'music' | 'text';
  previousUrl?: string;
  newUrl?: string;
  prompt?: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface VideoProject {
  // ... existing fields ...
  
  // Add regeneration tracking
  regenerationHistory?: RegenerationRecord[];
  
  // Add per-scene voiceover support for long-form videos
  usePerSceneVoiceover?: boolean;
}

// Update SceneAssets to track alternatives
export interface SceneAssets {
  // ... existing fields ...
  
  // Alternative assets for user selection
  alternativeImages?: { url: string; prompt: string; source: string }[];
  alternativeVideos?: { url: string; query: string; source: string }[];
  
  // User preferences
  preferVideo?: boolean;  // User explicitly wants video over image
  preferImage?: boolean;  // User explicitly wants image over video
  
  // Per-scene voiceover for long-form
  sceneVoiceoverUrl?: string;
  sceneVoiceoverDuration?: number;
}
```

---

### 1.2 API Endpoints

Add these endpoints to your Express routes file (likely `server/routes/video-routes.ts` or similar):

```typescript
// In server/routes/video-routes.ts (or wherever your video routes are)

import express from 'express';
import { universalVideoService } from '../services/universal-video-service';

const router = express.Router();

// ============================================================
// REGENERATION ENDPOINTS
// ============================================================

/**
 * Regenerate image for a specific scene
 * POST /api/video-projects/:projectId/scenes/:sceneId/regenerate-image
 */
router.post('/:projectId/scenes/:sceneId/regenerate-image', async (req, res) => {
  try {
    const { projectId, sceneId } = req.params;
    const { prompt, style } = req.body;
    
    // Load project from your storage (adjust based on your storage method)
    const project = await loadProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const result = await universalVideoService.regenerateSceneImage(
      project,
      sceneId,
      prompt,
      { style, targetAudience: project.targetAudience }
    );
    
    if (result.success) {
      // Update project with new image
      const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
      if (sceneIndex >= 0) {
        // Store old URL in alternatives
        const oldUrl = project.scenes[sceneIndex].assets?.imageUrl;
        if (oldUrl) {
          if (!project.scenes[sceneIndex].assets!.alternativeImages) {
            project.scenes[sceneIndex].assets!.alternativeImages = [];
          }
          project.scenes[sceneIndex].assets!.alternativeImages!.push({
            url: oldUrl,
            prompt: project.scenes[sceneIndex].visualDirection || '',
            source: 'previous'
          });
        }
        
        // Set new image
        project.scenes[sceneIndex].assets!.imageUrl = result.newImageUrl;
        project.scenes[sceneIndex].assets!.backgroundUrl = result.newImageUrl;
        
        // If scene was using video, switch to image
        if (project.scenes[sceneIndex].background?.type === 'video') {
          project.scenes[sceneIndex].background!.type = 'image';
          project.scenes[sceneIndex].assets!.preferImage = true;
        }
        
        // Track regeneration
        if (!project.regenerationHistory) project.regenerationHistory = [];
        project.regenerationHistory.push({
          id: `regen_${Date.now()}`,
          sceneId,
          assetType: 'image',
          previousUrl: oldUrl,
          newUrl: result.newImageUrl,
          prompt: prompt || project.scenes[sceneIndex].visualDirection,
          timestamp: new Date().toISOString(),
          success: true
        });
        
        await saveProject(project);
      }
      
      return res.json({ 
        success: true, 
        newImageUrl: result.newImageUrl,
        source: result.source 
      });
    } else {
      return res.status(400).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    console.error('Regenerate image error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Regenerate B-roll video for a specific scene
 * POST /api/video-projects/:projectId/scenes/:sceneId/regenerate-video
 */
router.post('/:projectId/scenes/:sceneId/regenerate-video', async (req, res) => {
  try {
    const { projectId, sceneId } = req.params;
    const { searchQuery } = req.body;
    
    const project = await loadProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const result = await universalVideoService.regenerateSceneVideo(
      project,
      sceneId,
      searchQuery,
      project.targetAudience
    );
    
    if (result.success) {
      const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
      if (sceneIndex >= 0) {
        // Store old video in alternatives
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
        project.scenes[sceneIndex].assets!.preferVideo = true;
        
        // Track regeneration
        if (!project.regenerationHistory) project.regenerationHistory = [];
        project.regenerationHistory.push({
          id: `regen_${Date.now()}`,
          sceneId,
          assetType: 'video',
          previousUrl: oldUrl,
          newUrl: result.newVideoUrl,
          prompt: searchQuery,
          timestamp: new Date().toISOString(),
          success: true
        });
        
        await saveProject(project);
      }
      
      return res.json({ 
        success: true, 
        newVideoUrl: result.newVideoUrl,
        duration: result.duration,
        source: result.source 
      });
    } else {
      return res.status(400).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    console.error('Regenerate video error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Regenerate voiceover - entire project or single scene
 * POST /api/video-projects/:projectId/regenerate-voiceover
 */
router.post('/:projectId/regenerate-voiceover', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { sceneId, voiceId, voiceSettings } = req.body;
    
    const project = await loadProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (sceneId) {
      // Regenerate single scene voiceover
      const result = await universalVideoService.regenerateSceneVoiceover(
        project,
        sceneId,
        voiceId || project.voiceId,
        voiceSettings
      );
      
      if (result.success) {
        const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
        if (sceneIndex >= 0) {
          project.scenes[sceneIndex].assets!.sceneVoiceoverUrl = result.url;
          project.scenes[sceneIndex].assets!.sceneVoiceoverDuration = result.duration;
          project.scenes[sceneIndex].duration = result.duration;
          
          // Recalculate total duration
          project.totalDuration = project.scenes.reduce((acc, s) => acc + (s.duration || 5), 0);
          
          await saveProject(project);
        }
        
        return res.json({ success: true, url: result.url, duration: result.duration });
      } else {
        return res.status(400).json({ success: false, error: result.error });
      }
    } else {
      // Regenerate entire project voiceover
      const result = await universalVideoService.regenerateFullVoiceover(
        project,
        voiceId || project.voiceId,
        voiceSettings
      );
      
      if (result.success) {
        project.assets.voiceover.fullTrackUrl = result.url;
        project.assets.voiceover.duration = result.duration;
        if (voiceId) {
          project.voiceId = voiceId;
        }
        
        await saveProject(project);
        
        return res.json({ success: true, url: result.url, duration: result.duration });
      } else {
        return res.status(400).json({ success: false, error: result.error });
      }
    }
  } catch (error: any) {
    console.error('Regenerate voiceover error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Regenerate background music
 * POST /api/video-projects/:projectId/regenerate-music
 */
router.post('/:projectId/regenerate-music', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { style, mood, tempo } = req.body;
    
    const project = await loadProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const result = await universalVideoService.regenerateBackgroundMusic(
      project,
      { style, mood, tempo }
    );
    
    if (result.success) {
      // Store old music URL
      const oldUrl = project.assets.music?.url;
      
      project.assets.music = {
        url: result.url,
        duration: result.duration,
        volume: project.assets.music?.volume || 0.15
      };
      
      // Track regeneration
      if (!project.regenerationHistory) project.regenerationHistory = [];
      project.regenerationHistory.push({
        id: `regen_${Date.now()}`,
        assetType: 'music',
        previousUrl: oldUrl,
        newUrl: result.url,
        prompt: `${style || 'wellness'} ${mood || ''} ${tempo || ''}`.trim(),
        timestamp: new Date().toISOString(),
        success: true
      });
      
      await saveProject(project);
      
      return res.json({ success: true, url: result.url, duration: result.duration });
    } else {
      return res.status(400).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    console.error('Regenerate music error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Update product overlay position/animation for a scene
 * PATCH /api/video-projects/:projectId/scenes/:sceneId/product-overlay
 */
router.patch('/:projectId/scenes/:sceneId/product-overlay', async (req, res) => {
  try {
    const { projectId, sceneId } = req.params;
    const { position, enabled } = req.body;
    
    const project = await loadProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex < 0) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    
    if (!project.scenes[sceneIndex].assets) {
      project.scenes[sceneIndex].assets = {};
    }
    
    if (position) {
      project.scenes[sceneIndex].assets!.productOverlayPosition = position;
    }
    
    if (enabled !== undefined) {
      project.scenes[sceneIndex].assets!.useProductOverlay = enabled;
    }
    
    await saveProject(project);
    
    return res.json({ success: true, scene: project.scenes[sceneIndex] });
  } catch (error: any) {
    console.error('Update product overlay error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Update scene text overlay
 * PATCH /api/video-projects/:projectId/scenes/:sceneId/text-overlay
 */
router.patch('/:projectId/scenes/:sceneId/text-overlay', async (req, res) => {
  try {
    const { projectId, sceneId } = req.params;
    const { textOverlays, narration } = req.body;
    
    const project = await loadProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex < 0) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    
    if (textOverlays) {
      project.scenes[sceneIndex].textOverlays = textOverlays;
    }
    
    if (narration !== undefined) {
      project.scenes[sceneIndex].narration = narration;
      
      // Recalculate duration based on new narration
      const wordCount = narration.trim().split(/\s+/).filter(Boolean).length;
      const newDuration = Math.max(5, Math.ceil((wordCount / 2.5) + 1.5));
      project.scenes[sceneIndex].duration = newDuration;
      
      // Recalculate total duration
      project.totalDuration = project.scenes.reduce((acc, s) => acc + (s.duration || 5), 0);
    }
    
    await saveProject(project);
    
    return res.json({ success: true, scene: project.scenes[sceneIndex] });
  } catch (error: any) {
    console.error('Update text overlay error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Swap to an alternative asset (previous image/video)
 * POST /api/video-projects/:projectId/scenes/:sceneId/swap-asset
 */
router.post('/:projectId/scenes/:sceneId/swap-asset', async (req, res) => {
  try {
    const { projectId, sceneId } = req.params;
    const { assetType, assetIndex } = req.body; // 'image' or 'video', index in alternatives array
    
    const project = await loadProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex < 0) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    
    const scene = project.scenes[sceneIndex];
    
    if (assetType === 'image') {
      const alternatives = scene.assets?.alternativeImages || [];
      if (assetIndex >= 0 && assetIndex < alternatives.length) {
        const selectedAlt = alternatives[assetIndex];
        const currentUrl = scene.assets?.imageUrl;
        
        // Swap current with selected alternative
        project.scenes[sceneIndex].assets!.imageUrl = selectedAlt.url;
        project.scenes[sceneIndex].assets!.backgroundUrl = selectedAlt.url;
        
        // Move current to alternatives
        if (currentUrl) {
          project.scenes[sceneIndex].assets!.alternativeImages![assetIndex] = {
            url: currentUrl,
            prompt: 'previous',
            source: 'swapped'
          };
        }
        
        // Update background type
        project.scenes[sceneIndex].background!.type = 'image';
      }
    } else if (assetType === 'video') {
      const alternatives = scene.assets?.alternativeVideos || [];
      if (assetIndex >= 0 && assetIndex < alternatives.length) {
        const selectedAlt = alternatives[assetIndex];
        const currentUrl = scene.assets?.videoUrl;
        
        // Swap
        project.scenes[sceneIndex].assets!.videoUrl = selectedAlt.url;
        
        if (currentUrl) {
          project.scenes[sceneIndex].assets!.alternativeVideos![assetIndex] = {
            url: currentUrl,
            query: 'previous',
            source: 'swapped'
          };
        }
        
        // Update background type
        project.scenes[sceneIndex].background!.type = 'video';
      }
    }
    
    await saveProject(project);
    
    return res.json({ success: true, scene: project.scenes[sceneIndex] });
  } catch (error: any) {
    console.error('Swap asset error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Generate multiple image options for a scene
 * POST /api/video-projects/:projectId/scenes/:sceneId/generate-options
 */
router.post('/:projectId/scenes/:sceneId/generate-options', async (req, res) => {
  try {
    const { projectId, sceneId } = req.params;
    const { count = 3, assetType = 'image' } = req.body;
    
    const project = await loadProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex < 0) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    
    const scene = project.scenes[sceneIndex];
    const results: any[] = [];
    
    if (assetType === 'image') {
      // Generate multiple image options
      for (let i = 0; i < count; i++) {
        const result = await universalVideoService.regenerateSceneImage(
          project, sceneId, undefined, 
          { targetAudience: project.targetAudience, variation: i }
        );
        if (result.success) {
          results.push({ url: result.newImageUrl, source: result.source });
        }
      }
      
      // Store as alternatives
      if (!project.scenes[sceneIndex].assets!.alternativeImages) {
        project.scenes[sceneIndex].assets!.alternativeImages = [];
      }
      project.scenes[sceneIndex].assets!.alternativeImages!.push(...results.map(r => ({
        url: r.url,
        prompt: scene.visualDirection || '',
        source: r.source
      })));
      
    } else if (assetType === 'video') {
      // Search for multiple video options
      const videos = await universalVideoService.searchMultipleVideos(
        scene, project.targetAudience, count
      );
      results.push(...videos);
      
      // Store as alternatives
      if (!project.scenes[sceneIndex].assets!.alternativeVideos) {
        project.scenes[sceneIndex].assets!.alternativeVideos = [];
      }
      project.scenes[sceneIndex].assets!.alternativeVideos!.push(...videos.map(v => ({
        url: v.url,
        query: v.query,
        source: v.source
      })));
    }
    
    await saveProject(project);
    
    return res.json({ success: true, options: results });
  } catch (error: any) {
    console.error('Generate options error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

### 1.3 Service Methods for Regeneration

Add these methods to `universal-video-service.ts`:

```typescript
// In server/services/universal-video-service.ts

// Add to the UniversalVideoService class:

/**
 * Regenerate image for a single scene
 */
async regenerateSceneImage(
  project: VideoProject,
  sceneId: string,
  customPrompt?: string,
  options?: { 
    style?: string; 
    targetAudience?: string;
    variation?: number;
  }
): Promise<{ success: boolean; newImageUrl?: string; source?: string; error?: string }> {
  const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
  if (sceneIndex < 0) {
    return { success: false, error: 'Scene not found' };
  }
  
  const scene = project.scenes[sceneIndex];
  let prompt = customPrompt || scene.visualDirection || scene.background?.source || '';
  
  // Add demographic context from target audience
  if (options?.targetAudience) {
    const demographicPrefix = this.getDemographicPrefix(options.targetAudience);
    prompt = `${demographicPrefix}${prompt}`;
  }
  
  // Add variation modifier to get different results
  if (options?.variation !== undefined && options.variation > 0) {
    const variations = [
      ', alternative angle, different lighting',
      ', different composition, varied perspective',
      ', new setting, fresh atmosphere',
    ];
    prompt += variations[options.variation % variations.length];
  }
  
  console.log(`[UniversalVideoService] Regenerating image for scene ${sceneId}: ${prompt.substring(0, 100)}...`);
  
  // Check if this is a content scene or product scene
  const isContent = this.isContentScene(scene.type);
  
  if (isContent) {
    const result = await this.generateContentImage(scene, project.title);
    if (result.imageUrl) {
      return { success: true, newImageUrl: result.imageUrl, source: result.source };
    }
  } else {
    const result = await this.generateAIBackground(prompt, scene.type);
    if (result.backgroundUrl) {
      return { success: true, newImageUrl: result.backgroundUrl, source: result.source };
    }
  }
  
  // Fallback to general image generation
  const fallbackResult = await this.generateImage(prompt, sceneId);
  if (fallbackResult.success) {
    return { success: true, newImageUrl: fallbackResult.url, source: fallbackResult.source };
  }
  
  return { success: false, error: fallbackResult.error || 'Image generation failed' };
}

/**
 * Regenerate B-roll video for a single scene
 */
async regenerateSceneVideo(
  project: VideoProject,
  sceneId: string,
  customQuery?: string,
  targetAudience?: string
): Promise<{ success: boolean; newVideoUrl?: string; duration?: number; source?: string; error?: string }> {
  const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
  if (sceneIndex < 0) {
    return { success: false, error: 'Scene not found' };
  }
  
  const scene = project.scenes[sceneIndex];
  let query = customQuery || this.buildVideoSearchQuery(scene, targetAudience);
  
  console.log(`[UniversalVideoService] Regenerating video for scene ${sceneId}: ${query}`);
  
  const result = await this.getStockVideo(query);
  
  if (result) {
    return { 
      success: true, 
      newVideoUrl: result.url, 
      duration: result.duration,
      source: result.source 
    };
  }
  
  return { success: false, error: 'No suitable video found for query: ' + query };
}

/**
 * Search for multiple video options (for user selection)
 */
async searchMultipleVideos(
  scene: Scene,
  targetAudience?: string,
  count: number = 5
): Promise<{ url: string; duration: number; query: string; source: string }[]> {
  const results: { url: string; duration: number; query: string; source: string }[] = [];
  
  // Generate multiple search queries
  const baseQuery = this.buildVideoSearchQuery(scene, targetAudience);
  const queries = [
    baseQuery,
    baseQuery.split(' ').slice(0, 3).join(' '), // Shorter version
    `${this.getDemographicPrefix(targetAudience || '')} wellness lifestyle`,
    `${this.getDemographicPrefix(targetAudience || '')} health nature`,
    'peaceful relaxation calm'
  ];
  
  for (const query of queries.slice(0, count)) {
    const result = await this.getStockVideo(query);
    if (result && !results.find(r => r.url === result.url)) {
      results.push({ ...result, query });
    }
    if (results.length >= count) break;
  }
  
  return results;
}

/**
 * Regenerate voiceover for a single scene (for long-form videos)
 */
async regenerateSceneVoiceover(
  project: VideoProject,
  sceneId: string,
  voiceId?: string,
  voiceSettings?: { stability?: number; similarityBoost?: number; style?: number }
): Promise<{ success: boolean; url?: string; duration?: number; error?: string }> {
  const scene = project.scenes.find(s => s.id === sceneId);
  if (!scene) {
    return { success: false, error: 'Scene not found' };
  }
  
  const narration = scene.narration;
  if (!narration) {
    return { success: false, error: 'Scene has no narration' };
  }
  
  console.log(`[UniversalVideoService] Regenerating voiceover for scene ${sceneId}`);
  
  const result = await this.generateVoiceover(narration, voiceId, voiceSettings);
  
  if (result.success) {
    return { success: true, url: result.url, duration: result.duration };
  }
  
  return { success: false, error: result.error };
}

/**
 * Regenerate full project voiceover
 */
async regenerateFullVoiceover(
  project: VideoProject,
  voiceId?: string,
  voiceSettings?: { stability?: number; similarityBoost?: number; style?: number }
): Promise<{ success: boolean; url?: string; duration?: number; error?: string }> {
  const fullNarration = project.scenes.map(s => s.narration).join(' ... ');
  
  console.log(`[UniversalVideoService] Regenerating full voiceover (${fullNarration.length} chars)`);
  
  const result = await this.generateVoiceover(fullNarration, voiceId, voiceSettings);
  
  return {
    success: result.success,
    url: result.url,
    duration: result.duration,
    error: result.error
  };
}

/**
 * Regenerate background music with different style
 */
async regenerateBackgroundMusic(
  project: VideoProject,
  options?: { style?: string; mood?: string; tempo?: string }
): Promise<{ success: boolean; url?: string; duration?: number; error?: string }> {
  const totalDuration = project.scenes.reduce((acc, s) => acc + (s.duration || 5), 0);
  const style = options?.style || this.inferMusicStyle(project.title, project.type);
  
  // Build enhanced prompt with mood/tempo
  let prompt = style;
  if (options?.mood) prompt += `, ${options.mood} mood`;
  if (options?.tempo) prompt += `, ${options.tempo} tempo`;
  
  console.log(`[UniversalVideoService] Regenerating music: ${prompt} (${totalDuration}s)`);
  
  const result = await this.generateBackgroundMusic(totalDuration, style, project.title);
  
  if (result) {
    return { success: true, url: result.url, duration: result.duration };
  }
  
  // Fallback to Pixabay/Jamendo
  const fallbackResult = await this.getBackgroundMusic(totalDuration, style);
  if (fallbackResult) {
    return { success: true, url: fallbackResult.url, duration: fallbackResult.duration };
  }
  
  return { success: false, error: 'Music generation failed' };
}

/**
 * Get demographic prefix for search queries based on target audience
 */
private getDemographicPrefix(targetAudience: string): string {
  if (!targetAudience) return '';
  
  const audience = targetAudience.toLowerCase();
  let prefix = '';
  
  // Age
  if (audience.includes('40') || audience.includes('50') || audience.includes('60') ||
      audience.includes('mature') || audience.includes('middle') || audience.includes('menopause')) {
    prefix += 'mature middle-aged ';
  } else if (audience.includes('senior') || audience.includes('elderly') || audience.includes('65+')) {
    prefix += 'senior elderly ';
  } else if (audience.includes('young') || audience.includes('20') || audience.includes('30')) {
    prefix += 'young adult ';
  }
  
  // Gender
  if (audience.includes('women') || audience.includes('female') || audience.includes('woman')) {
    prefix += 'woman ';
  } else if (audience.includes('men') || audience.includes('male') || audience.includes('man')) {
    prefix += 'man ';
  }
  
  return prefix;
}
```

---

### 1.4 Frontend Components

Create these React components for the regeneration UI:

```tsx
// In client/src/components/video-studio/SceneEditor.tsx

import React, { useState } from 'react';
import { Scene, ProductOverlayPosition } from '@shared/video-types';

interface SceneEditorProps {
  scene: Scene;
  projectId: string;
  targetAudience?: string;
  onSceneUpdate: (updatedScene: Scene) => void;
}

export const SceneEditor: React.FC<SceneEditorProps> = ({
  scene,
  projectId,
  targetAudience,
  onSceneUpdate
}) => {
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [customVideoQuery, setCustomVideoQuery] = useState('');
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleRegenerateImage = async () => {
    setIsRegenerating('image');
    setError(null);
    
    try {
      const response = await fetch(
        `/api/video-projects/${projectId}/scenes/${scene.id}/regenerate-image`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: customPrompt || undefined })
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        onSceneUpdate({
          ...scene,
          assets: {
            ...scene.assets,
            imageUrl: result.newImageUrl,
            backgroundUrl: result.newImageUrl
          },
          background: { ...scene.background, type: 'image' }
        });
        setCustomPrompt('');
      } else {
        setError(result.error || 'Failed to regenerate image');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsRegenerating(null);
    }
  };
  
  const handleRegenerateVideo = async () => {
    setIsRegenerating('video');
    setError(null);
    
    try {
      const response = await fetch(
        `/api/video-projects/${projectId}/scenes/${scene.id}/regenerate-video`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ searchQuery: customVideoQuery || undefined })
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        onSceneUpdate({
          ...scene,
          assets: {
            ...scene.assets,
            videoUrl: result.newVideoUrl
          },
          background: { ...scene.background, type: 'video' }
        });
        setCustomVideoQuery('');
      } else {
        setError(result.error || 'Failed to find video');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsRegenerating(null);
    }
  };
  
  const handleGenerateOptions = async (assetType: 'image' | 'video') => {
    setIsRegenerating(`options-${assetType}`);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/video-projects/${projectId}/scenes/${scene.id}/generate-options`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assetType, count: 4 })
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        // Update scene with new alternatives
        const updatedAssets = { ...scene.assets };
        if (assetType === 'image') {
          updatedAssets.alternativeImages = [
            ...(scene.assets?.alternativeImages || []),
            ...result.options.map((o: any) => ({ url: o.url, prompt: '', source: o.source }))
          ];
        } else {
          updatedAssets.alternativeVideos = [
            ...(scene.assets?.alternativeVideos || []),
            ...result.options.map((o: any) => ({ url: o.url, query: o.query, source: o.source }))
          ];
        }
        
        onSceneUpdate({ ...scene, assets: updatedAssets });
        setShowAlternatives(true);
      } else {
        setError(result.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsRegenerating(null);
    }
  };
  
  const handleSelectAlternative = async (assetType: 'image' | 'video', index: number) => {
    try {
      const response = await fetch(
        `/api/video-projects/${projectId}/scenes/${scene.id}/swap-asset`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assetType, assetIndex: index })
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        onSceneUpdate(result.scene);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };
  
  const currentAssetType = scene.background?.type || 'image';
  const hasVideo = !!scene.assets?.videoUrl;
  const hasImage = !!scene.assets?.imageUrl;
  
  return (
    <div className="scene-editor p-4 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Scene {scene.order}: {scene.type}
        </h3>
        <span className={`px-2 py-1 rounded text-sm ${
          currentAssetType === 'video' ? 'bg-purple-600' : 'bg-blue-600'
        }`}>
          {currentAssetType === 'video' ? '🎬 Video' : '🖼️ Image'}
        </span>
      </div>
      
      {/* Current Asset Preview */}
      <div className="mb-4 relative aspect-video bg-gray-900 rounded overflow-hidden">
        {currentAssetType === 'video' && hasVideo ? (
          <video 
            src={scene.assets?.videoUrl} 
            className="w-full h-full object-cover"
            muted 
            loop 
            autoPlay
          />
        ) : hasImage ? (
          <img 
            src={scene.assets?.imageUrl} 
            className="w-full h-full object-cover"
            alt={`Scene ${scene.order}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            No asset
          </div>
        )}
        
        {isRegenerating && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-white flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Regenerating {isRegenerating}...
            </div>
          </div>
        )}
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
          {error}
        </div>
      )}
      
      {/* Regeneration Controls */}
      <div className="space-y-3">
        {/* Image Controls */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Custom image prompt (optional)"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          />
          <button
            onClick={handleRegenerateImage}
            disabled={!!isRegenerating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-white text-sm whitespace-nowrap"
          >
            🔄 New Image
          </button>
        </div>
        
        {/* Video Controls */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Custom video search (optional)"
            value={customVideoQuery}
            onChange={(e) => setCustomVideoQuery(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          />
          <button
            onClick={handleRegenerateVideo}
            disabled={!!isRegenerating}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded text-white text-sm whitespace-nowrap"
          >
            🎬 Find Video
          </button>
        </div>
        
        {/* Generate Multiple Options */}
        <div className="flex gap-2">
          <button
            onClick={() => handleGenerateOptions('image')}
            disabled={!!isRegenerating}
            className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded text-white text-sm"
          >
            Generate 4 Image Options
          </button>
          <button
            onClick={() => handleGenerateOptions('video')}
            disabled={!!isRegenerating}
            className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded text-white text-sm"
          >
            Find 4 Video Options
          </button>
        </div>
      </div>
      
      {/* Alternative Assets Gallery */}
      {showAlternatives && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-300">Alternative Options</h4>
            <button 
              onClick={() => setShowAlternatives(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          {/* Alternative Images */}
          {scene.assets?.alternativeImages && scene.assets.alternativeImages.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-1">Images:</p>
              <div className="grid grid-cols-4 gap-2">
                {scene.assets.alternativeImages.map((alt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectAlternative('image', idx)}
                    className="aspect-video bg-gray-900 rounded overflow-hidden hover:ring-2 hover:ring-blue-500"
                  >
                    <img src={alt.url} className="w-full h-full object-cover" alt={`Option ${idx + 1}`} />
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Alternative Videos */}
          {scene.assets?.alternativeVideos && scene.assets.alternativeVideos.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Videos:</p>
              <div className="grid grid-cols-4 gap-2">
                {scene.assets.alternativeVideos.map((alt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectAlternative('video', idx)}
                    className="aspect-video bg-gray-900 rounded overflow-hidden hover:ring-2 hover:ring-purple-500"
                  >
                    <video src={alt.url} className="w-full h-full object-cover" muted />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Product Overlay Controls */}
      {scene.assets?.useProductOverlay && (
        <ProductOverlayEditor
          projectId={projectId}
          sceneId={scene.id}
          position={scene.assets.productOverlayPosition}
          onUpdate={(position) => onSceneUpdate({
            ...scene,
            assets: { ...scene.assets, productOverlayPosition: position }
          })}
        />
      )}
    </div>
  );
};

// Product Overlay Position Editor Component
interface ProductOverlayEditorProps {
  projectId: string;
  sceneId: string;
  position?: ProductOverlayPosition;
  onUpdate: (position: ProductOverlayPosition) => void;
}

const ProductOverlayEditor: React.FC<ProductOverlayEditorProps> = ({
  projectId,
  sceneId,
  position = { x: 'center', y: 'center', scale: 0.4, animation: 'fade' },
  onUpdate
}) => {
  const [localPosition, setLocalPosition] = useState(position);
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/video-projects/${projectId}/scenes/${sceneId}/product-overlay`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: localPosition })
        }
      );
      
      const result = await response.json();
      if (result.success) {
        onUpdate(localPosition);
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  const positionChanged = JSON.stringify(localPosition) !== JSON.stringify(position);
  
  return (
    <div className="mt-4 p-3 bg-gray-700/50 rounded">
      <h4 className="text-sm font-medium text-gray-300 mb-3">Product Overlay Position</h4>
      
      {/* 3x3 Position Grid */}
      <div className="flex justify-center mb-3">
        <div className="grid grid-cols-3 gap-1">
          {(['top', 'center', 'bottom'] as const).map(y => (
            <React.Fragment key={y}>
              {(['left', 'center', 'right'] as const).map(x => (
                <button
                  key={`${x}-${y}`}
                  onClick={() => setLocalPosition({ ...localPosition, x, y })}
                  className={`w-10 h-10 rounded flex items-center justify-center text-lg
                    ${localPosition.x === x && localPosition.y === y 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-600 text-gray-400 hover:bg-gray-500'
                    }`}
                >
                  {localPosition.x === x && localPosition.y === y ? '📦' : '○'}
                </button>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Scale Slider */}
      <div className="mb-3">
        <label className="flex items-center justify-between text-sm text-gray-400 mb-1">
          <span>Size</span>
          <span>{Math.round(localPosition.scale * 100)}%</span>
        </label>
        <input
          type="range"
          min="15"
          max="70"
          value={localPosition.scale * 100}
          onChange={(e) => setLocalPosition({ ...localPosition, scale: Number(e.target.value) / 100 })}
          className="w-full"
        />
      </div>
      
      {/* Animation Select */}
      <div className="mb-3">
        <label className="block text-sm text-gray-400 mb-1">Animation</label>
        <select
          value={localPosition.animation || 'fade'}
          onChange={(e) => setLocalPosition({ ...localPosition, animation: e.target.value as any })}
          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
        >
          <option value="fade">Fade In</option>
          <option value="zoom">Zoom In</option>
          <option value="slide">Slide In</option>
          <option value="none">No Animation</option>
        </select>
      </div>
      
      {/* Save Button */}
      {positionChanged && (
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-white text-sm"
        >
          {isSaving ? 'Saving...' : 'Save Position'}
        </button>
      )}
    </div>
  );
};

export default SceneEditor;
```

---

## PART 2: LONG-FORM VIDEO SUPPORT (10-15 Minutes)

### 2.1 Challenges for Long-Form Videos

| Challenge | Solution |
|-----------|----------|
| ElevenLabs voiceover limit | Per-scene voiceover generation, then concatenate |
| Lambda render timeout (600s) | Chunk rendering + stitching |
| Memory usage | Streaming audio/video assembly |
| B-roll variety | Multiple video sources per scene |
| Music continuity | Multiple music segments or longer generation |
| User attention | Chapters, varied pacing, visual variety |

### 2.2 Per-Scene Voiceover System

For videos longer than ~2 minutes, generate voiceover per-scene:

```typescript
// In universal-video-service.ts

/**
 * Generate per-scene voiceovers for long-form videos
 * Recommended for videos > 2 minutes
 */
async generatePerSceneVoiceovers(
  project: VideoProject,
  voiceId?: string,
  voiceSettings?: { stability?: number; similarityBoost?: number; style?: number }
): Promise<{
  success: boolean;
  scenes: { sceneId: string; url: string; duration: number }[];
  totalDuration: number;
  errors: string[];
}> {
  const results: { sceneId: string; url: string; duration: number }[] = [];
  const errors: string[] = [];
  let totalDuration = 0;
  
  console.log(`[UniversalVideoService] Generating per-scene voiceovers for ${project.scenes.length} scenes`);
  
  for (let i = 0; i < project.scenes.length; i++) {
    const scene = project.scenes[i];
    
    if (!scene.narration || scene.narration.trim().length === 0) {
      console.log(`[UniversalVideoService] Scene ${i} has no narration, skipping`);
      continue;
    }
    
    console.log(`[UniversalVideoService] Generating voiceover for scene ${i + 1}/${project.scenes.length}`);
    
    const result = await this.generateVoiceover(
      scene.narration,
      voiceId || project.voiceId,
      voiceSettings
    );
    
    if (result.success) {
      results.push({
        sceneId: scene.id,
        url: result.url,
        duration: result.duration
      });
      totalDuration += result.duration;
      
      // Update scene with its specific voiceover
      project.scenes[i].assets = {
        ...project.scenes[i].assets,
        sceneVoiceoverUrl: result.url,
        sceneVoiceoverDuration: result.duration
      };
      project.scenes[i].duration = result.duration;
    } else {
      errors.push(`Scene ${i + 1}: ${result.error}`);
    }
    
    // Rate limiting pause between API calls
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`[UniversalVideoService] Per-scene voiceover complete: ${results.length} scenes, ${totalDuration}s total`);
  
  return {
    success: errors.length === 0,
    scenes: results,
    totalDuration,
    errors
  };
}

/**
 * Generate long-form video assets with chunked processing
 */
async generateLongFormAssets(project: VideoProject): Promise<VideoProject> {
  const updatedProject = { ...project };
  updatedProject.usePerSceneVoiceover = true;
  
  // Step 1: Generate per-scene voiceovers
  updatedProject.progress.currentStep = 'voiceover';
  updatedProject.progress.steps.voiceover.status = 'in-progress';
  updatedProject.progress.steps.voiceover.message = 'Generating voiceover for each scene...';
  
  const voiceoverResult = await this.generatePerSceneVoiceovers(
    updatedProject,
    project.voiceId
  );
  
  if (voiceoverResult.success) {
    updatedProject.assets.voiceover.perScene = voiceoverResult.scenes;
    updatedProject.assets.voiceover.duration = voiceoverResult.totalDuration;
    updatedProject.totalDuration = voiceoverResult.totalDuration;
    updatedProject.progress.steps.voiceover.status = 'complete';
    updatedProject.progress.steps.voiceover.progress = 100;
    updatedProject.progress.steps.voiceover.message = 
      `Generated ${voiceoverResult.scenes.length} scene voiceovers (${Math.round(voiceoverResult.totalDuration / 60)}min total)`;
  } else {
    updatedProject.progress.steps.voiceover.status = 'error';
    updatedProject.progress.steps.voiceover.message = voiceoverResult.errors.join('; ');
  }
  
  // Step 2: Generate images/videos with more variety for long-form
  // (Use existing generateProjectAssets logic but with enhanced variety)
  
  // Step 3: Generate multiple music segments for variety
  updatedProject.progress.currentStep = 'music';
  updatedProject.progress.steps.music.status = 'in-progress';
  
  // For long-form, generate music in segments (ElevenLabs max is 5 min)
  const totalDuration = voiceoverResult.totalDuration;
  const musicSegments: { url: string; duration: number }[] = [];
  
  if (totalDuration > 300) { // > 5 minutes
    const segmentCount = Math.ceil(totalDuration / 300);
    const segmentDuration = Math.ceil(totalDuration / segmentCount);
    
    for (let i = 0; i < segmentCount; i++) {
      const duration = Math.min(segmentDuration, 300);
      const style = this.inferMusicStyle(project.title, project.type);
      
      const musicResult = await this.generateBackgroundMusic(duration, style, project.title);
      if (musicResult) {
        musicSegments.push({ url: musicResult.url, duration: musicResult.duration });
      }
      
      // Pause between generations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Store segments (Remotion composition will loop/concatenate)
    (updatedProject.assets.music as any).segments = musicSegments;
  } else {
    // Single music track for shorter videos
    const musicResult = await this.generateBackgroundMusic(
      totalDuration,
      this.inferMusicStyle(project.title, project.type),
      project.title
    );
    
    if (musicResult) {
      updatedProject.assets.music = {
        url: musicResult.url,
        duration: musicResult.duration,
        volume: 0.12 // Slightly lower for long-form to not fatigue listeners
      };
    }
  }
  
  updatedProject.progress.steps.music.status = 'complete';
  
  return updatedProject;
}
```

### 2.3 Chunked Lambda Rendering

For videos > 5 minutes, render in chunks and stitch:

```typescript
// In remotion-lambda-service.ts

/**
 * Render long-form video in chunks to avoid Lambda timeout
 */
async renderLongFormVideo(params: {
  compositionId: string;
  inputProps: Record<string, any>;
  totalDuration: number; // in seconds
}): Promise<string> {
  const { totalDuration } = params;
  
  // If under 5 minutes, render normally
  if (totalDuration <= 300) {
    return this.renderVideo(params);
  }
  
  console.log(`[Remotion Lambda] Long-form video detected (${totalDuration}s) - using chunked rendering`);
  
  // Calculate chunk boundaries (aim for 3-4 minute chunks)
  const chunkDuration = 180; // 3 minutes per chunk
  const chunkCount = Math.ceil(totalDuration / chunkDuration);
  const chunkUrls: string[] = [];
  
  for (let i = 0; i < chunkCount; i++) {
    const startFrame = i * chunkDuration * 30; // 30 fps
    const endFrame = Math.min((i + 1) * chunkDuration * 30, totalDuration * 30);
    
    console.log(`[Remotion Lambda] Rendering chunk ${i + 1}/${chunkCount} (frames ${startFrame}-${endFrame})`);
    
    // Render this chunk
    const chunkUrl = await this.renderVideoChunk({
      ...params,
      startFrame,
      endFrame,
      chunkIndex: i
    });
    
    chunkUrls.push(chunkUrl);
  }
  
  // Stitch chunks together using FFmpeg on Lambda or server
  console.log(`[Remotion Lambda] Stitching ${chunkUrls.length} chunks...`);
  const finalUrl = await this.stitchVideoChunks(chunkUrls);
  
  return finalUrl;
}

/**
 * Render a specific chunk of the video
 */
private async renderVideoChunk(params: {
  compositionId: string;
  inputProps: Record<string, any>;
  startFrame: number;
  endFrame: number;
  chunkIndex: number;
}): Promise<string> {
  // Use Remotion's frameRange parameter
  const result = await renderMediaOnLambda({
    region: REGION,
    functionName: this.functionName,
    serveUrl: this.serveUrl,
    composition: params.compositionId,
    inputProps: params.inputProps,
    codec: 'h264',
    imageFormat: 'jpeg',
    maxRetries: 2,
    privacy: 'public',
    frameRange: [params.startFrame, params.endFrame],
    downloadBehavior: {
      type: 'download',
      fileName: `chunk_${params.chunkIndex}_${Date.now()}.mp4`,
    },
  });
  
  // Wait for chunk to complete
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const progress = await this.getRenderProgress(result.renderId, result.bucketName);
    
    if (progress.errors.length > 0) {
      throw new Error(`Chunk ${params.chunkIndex} failed: ${progress.errors.join(', ')}`);
    }
    
    if (progress.done && progress.outputFile) {
      return progress.outputFile;
    }
  }
}

/**
 * Stitch video chunks together
 * This could use FFmpeg on your server or a separate Lambda function
 */
private async stitchVideoChunks(chunkUrls: string[]): Promise<string> {
  // Option 1: Use FFmpeg on your server
  // Option 2: Use a dedicated Lambda for stitching
  // Option 3: Use AWS Elemental MediaConvert
  
  // For now, we'll return a placeholder - implement based on your infrastructure
  console.log(`[Remotion Lambda] Stitching ${chunkUrls.length} chunks`);
  
  // Simple implementation using server-side FFmpeg:
  const { execSync } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  
  // Download chunks to temp directory
  const tempDir = `/tmp/video_stitch_${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });
  
  const localPaths: string[] = [];
  for (let i = 0; i < chunkUrls.length; i++) {
    const response = await fetch(chunkUrls[i]);
    const buffer = await response.arrayBuffer();
    const localPath = path.join(tempDir, `chunk_${i}.mp4`);
    fs.writeFileSync(localPath, Buffer.from(buffer));
    localPaths.push(localPath);
  }
  
  // Create concat file
  const concatFile = path.join(tempDir, 'concat.txt');
  const concatContent = localPaths.map(p => `file '${p}'`).join('\n');
  fs.writeFileSync(concatFile, concatContent);
  
  // Run FFmpeg concat
  const outputPath = path.join(tempDir, 'final.mp4');
  execSync(`ffmpeg -f concat -safe 0 -i "${concatFile}" -c copy "${outputPath}"`);
  
  // Upload final video to S3
  const finalBuffer = fs.readFileSync(outputPath);
  const fileName = `long-form-video-${Date.now()}.mp4`;
  const s3Url = await this.uploadToS3(finalBuffer, fileName, 'video/mp4');
  
  // Cleanup temp files
  fs.rmSync(tempDir, { recursive: true, force: true });
  
  return s3Url || chunkUrls[0]; // Fallback to first chunk if upload fails
}
```

### 2.4 Updated Remotion Composition for Long-Form

```tsx
// In UniversalVideoComposition.tsx

// Update SafeAudio to support per-scene voiceovers
const PerSceneAudio: React.FC<{
  scenes: Scene[];
  fps: number;
}> = ({ scenes, fps }) => {
  let currentFrame = 0;
  
  return (
    <>
      {scenes.map((scene, index) => {
        const voiceoverUrl = scene.assets?.sceneVoiceoverUrl;
        const durationInFrames = (scene.duration || 5) * fps;
        
        const sequence = voiceoverUrl ? (
          <Sequence
            key={`audio-${scene.id}`}
            from={currentFrame}
            durationInFrames={durationInFrames}
          >
            <SafeAudio
              src={voiceoverUrl}
              volume={1}
              label={`Voiceover scene ${index}`}
            />
          </Sequence>
        ) : null;
        
        currentFrame += durationInFrames;
        return sequence;
      })}
    </>
  );
};

// Update main composition to handle both single and per-scene voiceover
export const UniversalVideoComposition: React.FC<UniversalVideoProps> = ({
  scenes,
  voiceoverUrl,
  musicUrl,
  musicVolume = 0.18,
  brand,
  outputFormat,
}) => {
  const { fps } = useVideoConfig();
  
  // Check if using per-scene voiceovers
  const usePerSceneVoiceover = scenes.some(s => s.assets?.sceneVoiceoverUrl);
  
  // ... existing scene rendering code ...
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* ... scene sequences ... */}
      
      {/* Background Music */}
      <SafeAudio 
        src={musicUrl} 
        volume={musicVolume} 
        label="Background music"
      />
      
      {/* Voiceover - either single track or per-scene */}
      {usePerSceneVoiceover ? (
        <PerSceneAudio scenes={scenes} fps={fps} />
      ) : (
        <SafeAudio 
          src={voiceoverUrl} 
          volume={1} 
          label="Voiceover"
        />
      )}
    </AbsoluteFill>
  );
};
```

---

## PART 3: IMPLEMENTATION CHECKLIST

### Phase 1: Core Regeneration (Week 1)

- [ ] Update `video-types.ts` with regeneration tracking fields
- [ ] Add regeneration API endpoints to routes
- [ ] Implement `regenerateSceneImage()` service method
- [ ] Implement `regenerateSceneVideo()` service method
- [ ] Create `SceneEditor` React component
- [ ] Add alternative asset storage and swap functionality
- [ ] Test image regeneration end-to-end
- [ ] Test video regeneration end-to-end

### Phase 2: Advanced Regeneration (Week 2)

- [ ] Add product overlay position editor UI
- [ ] Implement `regenerateSceneVoiceover()` for single scenes
- [ ] Implement `regenerateBackgroundMusic()` with style options
- [ ] Add "Generate Multiple Options" functionality
- [ ] Create alternative assets gallery UI
- [ ] Add regeneration history tracking
- [ ] Test voiceover regeneration
- [ ] Test music regeneration

### Phase 3: Long-Form Support (Week 3)

- [ ] Implement `generatePerSceneVoiceovers()` 
- [ ] Update Remotion composition for per-scene audio
- [ ] Implement chunked Lambda rendering
- [ ] Add video stitching functionality
- [ ] Test 5-minute video end-to-end
- [ ] Test 10-minute video end-to-end
- [ ] Optimize memory usage for long videos

### Phase 4: Polish & UX (Week 4)

- [ ] Add loading states and progress indicators
- [ ] Improve error handling and user feedback
- [ ] Add undo/redo for regeneration
- [ ] Create batch regeneration option
- [ ] Add export/import project functionality
- [ ] Performance optimization
- [ ] Documentation and help tooltips

---

## Quick Start Commands for Replit Agent

Copy and paste these instructions to your Replit agent:

```
Please implement the Video Studio regeneration feature as follows:

1. **Add Types** (shared/video-types.ts):
   - Add `RegenerationRecord` interface
   - Add `regenerationHistory` to VideoProject
   - Add `alternativeImages` and `alternativeVideos` to SceneAssets
   - Add `sceneVoiceoverUrl` and `sceneVoiceoverDuration` to SceneAssets

2. **Add API Endpoints** (server/routes/):
   - POST /:projectId/scenes/:sceneId/regenerate-image
   - POST /:projectId/scenes/:sceneId/regenerate-video
   - POST /:projectId/regenerate-voiceover
   - POST /:projectId/regenerate-music
   - PATCH /:projectId/scenes/:sceneId/product-overlay
   - POST /:projectId/scenes/:sceneId/generate-options
   - POST /:projectId/scenes/:sceneId/swap-asset

3. **Add Service Methods** (universal-video-service.ts):
   - regenerateSceneImage()
   - regenerateSceneVideo()
   - searchMultipleVideos()
   - regenerateSceneVoiceover()
   - regenerateFullVoiceover()
   - regenerateBackgroundMusic()
   - getDemographicPrefix()

4. **Create Frontend Components**:
   - SceneEditor component with regeneration controls
   - ProductOverlayEditor component with position grid
   - Alternative assets gallery with selection

See the attached implementation plan document for detailed code.
```
