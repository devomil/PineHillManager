# Video Production System: Complete Implementation Guide

## Overview

This document provides:
1. **Phase 2**: Product overlay editor, voiceover regeneration, music controls
2. **Phase 3**: Chunked rendering for long-form videos (SOLVES TIMEOUT ISSUES)
3. **Phase 4**: Polish, UX improvements, optimization
4. **AWS Best-in-Class Architecture**: Future-proof video pipeline

---

# PHASE 2: Enhanced User Controls

## 2.1 Product Overlay Editor

Allow users to control product overlay position, size, and visibility per scene.

### Backend Updates

**File:** `server/services/universal-video-service.ts`

```typescript
/**
 * Update product overlay settings for a scene
 */
async updateProductOverlay(
  project: VideoProject,
  sceneId: string,
  settings: {
    position?: { x: 'left' | 'center' | 'right'; y: 'top' | 'center' | 'bottom' };
    scale?: number;
    animation?: 'fade' | 'zoom' | 'slide' | 'none';
    enabled?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
  if (sceneIndex < 0) {
    return { success: false, error: 'Scene not found' };
  }
  
  const scene = project.scenes[sceneIndex];
  if (!scene.assets) {
    scene.assets = {};
  }
  
  if (settings.enabled !== undefined) {
    scene.assets.useProductOverlay = settings.enabled;
  }
  
  if (settings.position || settings.scale || settings.animation) {
    scene.assets.productOverlayPosition = {
      x: settings.position?.x || scene.assets.productOverlayPosition?.x || 'center',
      y: settings.position?.y || scene.assets.productOverlayPosition?.y || 'center',
      scale: settings.scale || scene.assets.productOverlayPosition?.scale || 0.4,
      animation: settings.animation || scene.assets.productOverlayPosition?.animation || 'fade',
    };
  }
  
  return { success: true };
}
```

### API Endpoint

```typescript
app.patch('/api/universal-video/projects/:projectId/scenes/:sceneId/product-overlay', async (req, res) => {
  const { projectId, sceneId } = req.params;
  const { position, scale, animation, enabled } = req.body;
  
  const project = await storage.getVideoProject(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const result = await universalVideoService.updateProductOverlay(project, sceneId, {
    position, scale, animation, enabled
  });
  
  if (result.success) {
    await storage.saveVideoProject(project);
    return res.json({ success: true, project });
  }
  
  return res.status(400).json(result);
});
```

### Frontend Component

```tsx
const ProductOverlayEditor: React.FC<{
  scene: Scene;
  projectId: string;
  onUpdate: () => void;
}> = ({ scene, projectId, onUpdate }) => {
  const [settings, setSettings] = useState({
    enabled: scene.assets?.useProductOverlay ?? true,
    x: scene.assets?.productOverlayPosition?.x || 'center',
    y: scene.assets?.productOverlayPosition?.y || 'center',
    scale: scene.assets?.productOverlayPosition?.scale || 0.4,
    animation: scene.assets?.productOverlayPosition?.animation || 'fade',
  });
  const [saving, setSaving] = useState(false);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch(`/api/universal-video/projects/${projectId}/scenes/${scene.id}/product-overlay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: settings.enabled,
          position: { x: settings.x, y: settings.y },
          scale: settings.scale,
          animation: settings.animation,
        }),
      });
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <Label>Show Product Overlay</Label>
        <Switch checked={settings.enabled} onCheckedChange={v => setSettings(s => ({ ...s, enabled: v }))} />
      </div>
      
      {settings.enabled && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Horizontal Position</Label>
              <Select value={settings.x} onValueChange={v => setSettings(s => ({ ...s, x: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vertical Position</Label>
              <Select value={settings.y} onValueChange={v => setSettings(s => ({ ...s, y: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label>Size: {Math.round(settings.scale * 100)}%</Label>
            <Slider
              value={[settings.scale * 100]}
              onValueChange={([v]) => setSettings(s => ({ ...s, scale: v / 100 }))}
              min={10}
              max={80}
              step={5}
            />
          </div>
          
          <div>
            <Label>Animation</Label>
            <Select value={settings.animation} onValueChange={v => setSettings(s => ({ ...s, animation: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fade">Fade In</SelectItem>
                <SelectItem value="zoom">Zoom In</SelectItem>
                <SelectItem value="slide">Slide In</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      
      <Button onClick={saveSettings} disabled={saving} className="w-full">
        {saving ? 'Saving...' : 'Save Overlay Settings'}
      </Button>
    </div>
  );
};
```

---

## 2.2 Voiceover Regeneration

Allow users to regenerate voiceover with different voice or modified narration.

### Backend Method

```typescript
/**
 * Regenerate voiceover for the entire project or specific scenes
 */
async regenerateVoiceover(
  project: VideoProject,
  options?: {
    voiceId?: string;
    sceneIds?: string[];  // If not provided, regenerate all
  }
): Promise<{ success: boolean; newVoiceoverUrl?: string; duration?: number; error?: string }> {
  const voiceId = options?.voiceId || project.voiceId;
  
  // Collect narration text
  let scenes = project.scenes;
  if (options?.sceneIds && options.sceneIds.length > 0) {
    scenes = project.scenes.filter(s => options.sceneIds!.includes(s.id));
  }
  
  const fullNarration = scenes.map(s => s.narration).join(' ... ');
  
  console.log(`[RegenerateVoiceover] Regenerating for ${scenes.length} scenes with voice ${voiceId}`);
  
  const result = await this.generateVoiceover(fullNarration, voiceId);
  
  if (result.success) {
    return {
      success: true,
      newVoiceoverUrl: result.url,
      duration: result.duration,
    };
  }
  
  return { success: false, error: result.error };
}
```

### API Endpoint

```typescript
app.post('/api/universal-video/projects/:projectId/regenerate-voiceover', async (req, res) => {
  const { projectId } = req.params;
  const { voiceId, sceneIds } = req.body;
  
  const project = await storage.getVideoProject(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const result = await universalVideoService.regenerateVoiceover(project, { voiceId, sceneIds });
  
  if (result.success) {
    project.assets.voiceover.fullTrackUrl = result.newVoiceoverUrl!;
    project.assets.voiceover.duration = result.duration!;
    if (voiceId) {
      project.voiceId = voiceId;
    }
    await storage.saveVideoProject(project);
    return res.json({ success: true, project });
  }
  
  return res.status(400).json(result);
});
```

---

## 2.3 Music Controls

Allow users to change music style, regenerate music, or disable it.

### Backend Method

```typescript
/**
 * Regenerate background music with different style
 */
async regenerateMusic(
  project: VideoProject,
  style: string
): Promise<{ success: boolean; newMusicUrl?: string; duration?: number; error?: string }> {
  const totalDuration = project.scenes.reduce((acc, s) => acc + (s.duration || 5), 0);
  
  console.log(`[RegenerateMusic] Generating ${totalDuration}s music with style: ${style}`);
  
  const result = await this.generateBackgroundMusic(totalDuration, style, project.title);
  
  if (result) {
    return {
      success: true,
      newMusicUrl: result.url,
      duration: result.duration,
    };
  }
  
  return { success: false, error: 'Music generation failed' };
}

/**
 * Update music volume
 */
updateMusicVolume(project: VideoProject, volume: number): void {
  if (project.assets.music) {
    project.assets.music.volume = Math.max(0, Math.min(1, volume));
  }
}

/**
 * Disable music entirely
 */
disableMusic(project: VideoProject): void {
  project.assets.music = { url: '', duration: 0, volume: 0 };
}
```

---

# PHASE 3: Chunked Rendering (CRITICAL FOR LONG VIDEOS)

This phase implements chunked rendering to solve timeout issues and enable long-form videos.

## 3.1 Chunked Render Service

**File:** `server/services/chunked-render-service.ts`

```typescript
import { remotionLambdaService } from './remotion-lambda-service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const execAsync = promisify(exec);

interface ChunkConfig {
  chunkIndex: number;
  startFrame: number;
  endFrame: number;
  scenes: any[];  // Scenes included in this chunk
}

interface ChunkResult {
  chunkIndex: number;
  s3Url: string;
  success: boolean;
  error?: string;
  renderTimeMs?: number;
}

interface ChunkedRenderProgress {
  phase: 'preparing' | 'rendering' | 'downloading' | 'concatenating' | 'uploading' | 'complete' | 'error';
  totalChunks: number;
  completedChunks: number;
  currentChunk?: number;
  overallPercent: number;
  message: string;
  error?: string;
}

export class ChunkedRenderService {
  private s3Client: S3Client;
  private bucketName = 'remotionlambda-useast1-refjo5giq5';
  private tempDir = '/tmp/video-chunks';
  
  constructor() {
    this.s3Client = new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY!,
      },
    });
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Calculate optimal chunk configuration based on video duration
   */
  calculateChunks(
    scenes: any[],
    fps: number = 30,
    maxChunkDurationSec: number = 120  // 2 minutes per chunk (safe for Lambda)
  ): ChunkConfig[] {
    const chunks: ChunkConfig[] = [];
    let currentChunk: ChunkConfig = {
      chunkIndex: 0,
      startFrame: 0,
      endFrame: 0,
      scenes: [],
    };
    let currentChunkDuration = 0;
    let totalFrames = 0;

    for (const scene of scenes) {
      const sceneDuration = scene.duration || 5;
      const sceneFrames = sceneDuration * fps;

      // Check if adding this scene exceeds chunk limit
      if (currentChunkDuration + sceneDuration > maxChunkDurationSec && currentChunk.scenes.length > 0) {
        // Finalize current chunk
        currentChunk.endFrame = totalFrames;
        chunks.push(currentChunk);

        // Start new chunk
        currentChunk = {
          chunkIndex: chunks.length,
          startFrame: totalFrames,
          endFrame: 0,
          scenes: [],
        };
        currentChunkDuration = 0;
      }

      currentChunk.scenes.push(scene);
      currentChunkDuration += sceneDuration;
      totalFrames += sceneFrames;
    }

    // Add final chunk
    if (currentChunk.scenes.length > 0) {
      currentChunk.endFrame = totalFrames;
      chunks.push(currentChunk);
    }

    console.log(`[ChunkedRender] Calculated ${chunks.length} chunks for ${scenes.length} scenes`);
    chunks.forEach((c, i) => {
      const duration = (c.endFrame - c.startFrame) / fps;
      console.log(`  Chunk ${i}: frames ${c.startFrame}-${c.endFrame} (${duration.toFixed(1)}s, ${c.scenes.length} scenes)`);
    });

    return chunks;
  }

  /**
   * Render a single chunk using Lambda
   */
  async renderChunk(
    chunk: ChunkConfig,
    inputProps: Record<string, any>,
    compositionId: string
  ): Promise<ChunkResult> {
    const startTime = Date.now();

    try {
      console.log(`[ChunkedRender] Rendering chunk ${chunk.chunkIndex} (frames ${chunk.startFrame}-${chunk.endFrame})...`);

      // Create modified input props for this chunk
      const chunkProps = {
        ...inputProps,
        scenes: chunk.scenes,  // Only include scenes for this chunk
      };

      // Render using Lambda
      const { renderId, bucketName } = await remotionLambdaService.startRender({
        compositionId,
        inputProps: chunkProps,
        codec: 'h264',
      });

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 180;  // 15 minutes max (5s intervals)

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;

        const progress = await remotionLambdaService.getRenderProgress(renderId, bucketName);

        if (progress.errors.length > 0) {
          throw new Error(`Chunk ${chunk.chunkIndex} render error: ${progress.errors.join(', ')}`);
        }

        if (progress.done && progress.outputFile) {
          const renderTime = Date.now() - startTime;
          console.log(`[ChunkedRender] Chunk ${chunk.chunkIndex} complete in ${(renderTime / 1000).toFixed(1)}s: ${progress.outputFile}`);
          
          return {
            chunkIndex: chunk.chunkIndex,
            s3Url: progress.outputFile,
            success: true,
            renderTimeMs: renderTime,
          };
        }

        if (progress.done && !progress.outputFile) {
          throw new Error(`Chunk ${chunk.chunkIndex} completed but no output file`);
        }
      }

      throw new Error(`Chunk ${chunk.chunkIndex} timed out after ${maxAttempts * 5} seconds`);

    } catch (error: any) {
      console.error(`[ChunkedRender] Chunk ${chunk.chunkIndex} failed:`, error.message);
      return {
        chunkIndex: chunk.chunkIndex,
        s3Url: '',
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Download a chunk video from S3 to local temp storage
   */
  async downloadChunk(s3Url: string, chunkIndex: number): Promise<string> {
    const localPath = path.join(this.tempDir, `chunk_${chunkIndex}.mp4`);

    console.log(`[ChunkedRender] Downloading chunk ${chunkIndex} to ${localPath}...`);

    const response = await fetch(s3Url);
    if (!response.ok) {
      throw new Error(`Failed to download chunk ${chunkIndex}: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(localPath, buffer);

    console.log(`[ChunkedRender] Chunk ${chunkIndex} downloaded (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
    return localPath;
  }

  /**
   * Concatenate all chunk videos using FFmpeg
   */
  async concatenateChunks(chunkPaths: string[], outputPath: string): Promise<void> {
    console.log(`[ChunkedRender] Concatenating ${chunkPaths.length} chunks...`);

    // Create FFmpeg concat list file
    const listPath = path.join(this.tempDir, `concat_list_${Date.now()}.txt`);
    const listContent = chunkPaths.map(p => `file '${p}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    // Run FFmpeg
    const command = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`;
    
    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 300000 }); // 5 min timeout
      console.log(`[ChunkedRender] FFmpeg concatenation complete`);
      if (stderr && !stderr.includes('frame=')) {
        console.log(`[ChunkedRender] FFmpeg stderr: ${stderr.substring(0, 500)}`);
      }
    } catch (error: any) {
      console.error(`[ChunkedRender] FFmpeg error:`, error.message);
      throw new Error(`FFmpeg concatenation failed: ${error.message}`);
    } finally {
      // Cleanup list file
      if (fs.existsSync(listPath)) {
        fs.unlinkSync(listPath);
      }
    }
  }

  /**
   * Upload final concatenated video to S3
   */
  async uploadFinalVideo(localPath: string, projectId: string): Promise<string> {
    console.log(`[ChunkedRender] Uploading final video to S3...`);

    const fileBuffer = fs.readFileSync(localPath);
    const key = `rendered-videos/${projectId}_final_${Date.now()}.mp4`;

    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: 'video/mp4',
      ACL: 'public-read',
    }));

    const publicUrl = `https://${this.bucketName}.s3.us-east-1.amazonaws.com/${key}`;
    console.log(`[ChunkedRender] Final video uploaded: ${publicUrl}`);

    return publicUrl;
  }

  /**
   * Clean up temporary files
   */
  cleanupTempFiles(paths: string[]): void {
    for (const filePath of paths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[ChunkedRender] Cleaned up: ${filePath}`);
        }
      } catch (e) {
        console.warn(`[ChunkedRender] Failed to cleanup: ${filePath}`);
      }
    }
  }

  /**
   * Main entry point: Render a long video using chunked approach
   */
  async renderLongVideo(
    projectId: string,
    inputProps: Record<string, any>,
    compositionId: string = 'UniversalVideo',
    onProgress?: (progress: ChunkedRenderProgress) => void
  ): Promise<{ success: boolean; outputUrl?: string; error?: string }> {
    const scenes = inputProps.scenes || [];
    const fps = 30;

    console.log(`[ChunkedRender] Starting chunked render for project ${projectId}`);
    console.log(`[ChunkedRender] Total scenes: ${scenes.length}`);

    // Phase 1: Calculate chunks
    onProgress?.({
      phase: 'preparing',
      totalChunks: 0,
      completedChunks: 0,
      overallPercent: 5,
      message: 'Calculating render chunks...',
    });

    const chunks = this.calculateChunks(scenes, fps);
    const totalChunks = chunks.length;

    if (totalChunks === 0) {
      return { success: false, error: 'No scenes to render' };
    }

    // Phase 2: Render each chunk
    const chunkResults: ChunkResult[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      onProgress?.({
        phase: 'rendering',
        totalChunks,
        completedChunks: i,
        currentChunk: i,
        overallPercent: 10 + Math.round((i / totalChunks) * 60),
        message: `Rendering chunk ${i + 1} of ${totalChunks}...`,
      });

      const result = await this.renderChunk(chunks[i], inputProps, compositionId);
      chunkResults.push(result);

      if (!result.success) {
        onProgress?.({
          phase: 'error',
          totalChunks,
          completedChunks: i,
          overallPercent: 0,
          message: `Chunk ${i + 1} failed`,
          error: result.error,
        });
        return { success: false, error: `Chunk ${i + 1} failed: ${result.error}` };
      }
    }

    // Phase 3: Download all chunks
    onProgress?.({
      phase: 'downloading',
      totalChunks,
      completedChunks: totalChunks,
      overallPercent: 75,
      message: 'Downloading rendered chunks...',
    });

    const localChunkPaths: string[] = [];
    for (const result of chunkResults) {
      const localPath = await this.downloadChunk(result.s3Url, result.chunkIndex);
      localChunkPaths.push(localPath);
    }

    // Phase 4: Concatenate chunks
    onProgress?.({
      phase: 'concatenating',
      totalChunks,
      completedChunks: totalChunks,
      overallPercent: 85,
      message: 'Stitching video chunks together...',
    });

    const outputPath = path.join(this.tempDir, `${projectId}_final_${Date.now()}.mp4`);
    await this.concatenateChunks(localChunkPaths, outputPath);

    // Phase 5: Upload final video
    onProgress?.({
      phase: 'uploading',
      totalChunks,
      completedChunks: totalChunks,
      overallPercent: 95,
      message: 'Uploading final video...',
    });

    const finalUrl = await this.uploadFinalVideo(outputPath, projectId);

    // Cleanup
    this.cleanupTempFiles([...localChunkPaths, outputPath]);

    onProgress?.({
      phase: 'complete',
      totalChunks,
      completedChunks: totalChunks,
      overallPercent: 100,
      message: 'Video rendering complete!',
    });

    console.log(`[ChunkedRender] Complete! Final URL: ${finalUrl}`);
    return { success: true, outputUrl: finalUrl };
  }

  /**
   * Determine if a project should use chunked rendering
   */
  shouldUseChunkedRendering(scenes: any[], thresholdSeconds: number = 120): boolean {
    const totalDuration = scenes.reduce((acc, s) => acc + (s.duration || 5), 0);
    return totalDuration > thresholdSeconds;
  }
}

export const chunkedRenderService = new ChunkedRenderService();
```

---

## 3.2 Update Render Route to Use Chunked Rendering

**File:** `server/routes.ts`

```typescript
import { chunkedRenderService } from './services/chunked-render-service';

app.post('/api/universal-video/projects/:projectId/render', async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await storage.getVideoProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Prepare assets for Lambda
    const { valid, issues, preparedProject } = await universalVideoService.prepareAssetsForLambda(project);
    if (!valid) {
      return res.status(400).json({ error: 'Asset preparation failed', issues });
    }

    // Build input props
    const inputProps = {
      scenes: preparedProject.scenes,
      voiceoverUrl: preparedProject.assets.voiceover.fullTrackUrl || null,
      musicUrl: preparedProject.assets.music?.url || null,
      musicVolume: preparedProject.assets.music?.volume || 0.15,
      brand: preparedProject.brand,
      outputFormat: preparedProject.outputFormat,
    };

    // Determine render method based on duration
    const totalDuration = preparedProject.scenes.reduce((acc, s) => acc + (s.duration || 5), 0);
    const useChunked = chunkedRenderService.shouldUseChunkedRendering(preparedProject.scenes, 90);

    console.log(`[Render] Project ${projectId}: ${totalDuration}s, chunked=${useChunked}`);

    // Update project status
    project.status = 'rendering';
    project.progress.currentStep = 'rendering';
    project.progress.steps.rendering.status = 'in-progress';
    await storage.saveVideoProject(project);

    if (useChunked) {
      // Use chunked rendering for long videos
      console.log(`[Render] Using CHUNKED rendering for ${totalDuration}s video`);
      
      const result = await chunkedRenderService.renderLongVideo(
        projectId,
        inputProps,
        'UniversalVideo',
        (progress) => {
          // Update project progress
          project.progress.steps.rendering.progress = progress.overallPercent;
          project.progress.steps.rendering.message = progress.message;
          storage.saveVideoProject(project);
        }
      );

      if (result.success && result.outputUrl) {
        project.status = 'complete';
        project.progress.steps.rendering.status = 'complete';
        project.progress.steps.rendering.progress = 100;
        project.progress.overallPercent = 100;
        await storage.saveVideoProject(project);
        
        return res.json({
          success: true,
          outputUrl: result.outputUrl,
          method: 'chunked',
          duration: totalDuration,
        });
      } else {
        project.status = 'error';
        project.progress.steps.rendering.status = 'error';
        project.progress.steps.rendering.message = result.error;
        await storage.saveVideoProject(project);
        
        return res.status(500).json({ error: result.error });
      }
    } else {
      // Use standard single-Lambda rendering for short videos
      console.log(`[Render] Using STANDARD rendering for ${totalDuration}s video`);
      
      const { renderId, bucketName } = await remotionLambdaService.startRender({
        compositionId: 'UniversalVideo',
        inputProps,
      });

      // Store render ID for polling
      (project as any).renderId = renderId;
      (project as any).bucketName = bucketName;
      await storage.saveVideoProject(project);

      return res.json({
        success: true,
        renderId,
        bucketName,
        method: 'standard',
        duration: totalDuration,
      });
    }
  } catch (error: any) {
    console.error('[Render] Error:', error);
    return res.status(500).json({ error: error.message });
  }
});
```

---

# PHASE 4: Polish & Optimization

## 4.1 Undo/Redo System

Track changes and allow users to revert.

```typescript
// Add to video-types.ts
interface ProjectHistoryEntry {
  id: string;
  timestamp: string;
  action: string;
  previousState: Partial<VideoProject>;
}

// Add to VideoProject
interface VideoProject {
  // ... existing fields ...
  history?: ProjectHistoryEntry[];
  historyIndex?: number;
}
```

## 4.2 Scene Reordering

Allow drag-and-drop scene reordering:

```typescript
app.patch('/api/universal-video/projects/:projectId/reorder-scenes', async (req, res) => {
  const { projectId } = req.params;
  const { sceneOrder } = req.body;  // Array of scene IDs in new order
  
  const project = await storage.getVideoProject(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  // Reorder scenes
  const reorderedScenes = sceneOrder.map((id: string, index: number) => {
    const scene = project.scenes.find(s => s.id === id);
    if (scene) {
      return { ...scene, order: index + 1 };
    }
    return null;
  }).filter(Boolean);
  
  project.scenes = reorderedScenes;
  await storage.saveVideoProject(project);
  
  return res.json({ success: true, project });
});
```

## 4.3 Preview Generation

Generate low-quality preview before full render:

```typescript
async generatePreview(project: VideoProject): Promise<string> {
  // Render at 480p, 15fps for fast preview
  const previewProps = {
    ...this.buildRenderInputProps(project),
    previewMode: true,
  };
  
  // Use smaller Lambda or local render
  // Return preview URL
}
```

---

# AWS BEST-IN-CLASS ARCHITECTURE

## Current Architecture (Lambda-Only)

```
┌──────────────────────────────────────────────────────────────┐
│                        Current Flow                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   User Request → API Server → Lambda (Render) → S3 Output   │
│                                                              │
│   Problems:                                                  │
│   • 15 min timeout limit                                     │
│   • Memory constraints (10GB max)                            │
│   • Cold starts add latency                                  │
│   • No parallel processing                                   │
│   • External asset downloads during render                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Recommended: AWS Step Functions + Fargate Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      Best-in-Class Architecture                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────┐    ┌─────────────┐    ┌────────────────────────────────┐  │
│   │   API   │───▶│    SQS      │───▶│       Step Functions           │  │
│   │ Server  │    │   Queue     │    │      (Orchestration)           │  │
│   └─────────┘    └─────────────┘    └────────────────────────────────┘  │
│                                               │                          │
│                         ┌─────────────────────┼─────────────────────┐   │
│                         ▼                     ▼                     ▼   │
│              ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│              │  Lambda          │  │  Fargate         │  │  Lambda   │ │
│              │  (Asset Gen)     │  │  (Remotion       │  │  (Notify) │ │
│              │                  │  │   Render)        │  │           │ │
│              └────────┬─────────┘  └────────┬─────────┘  └───────────┘ │
│                       │                     │                          │
│                       ▼                     ▼                          │
│              ┌──────────────────┐  ┌──────────────────┐               │
│              │       S3         │  │  MediaConvert    │               │
│              │  (Asset Cache)   │  │  (Transcode)     │               │
│              └──────────────────┘  └────────┬─────────┘               │
│                                             │                          │
│                                             ▼                          │
│                                    ┌──────────────────┐               │
│                                    │   CloudFront     │               │
│                                    │   (CDN Output)   │               │
│                                    └──────────────────┘               │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Amazon SQS (Simple Queue Service)
- **Purpose:** Decouple API from processing
- **Benefit:** Handle burst traffic, retry failed jobs
- **Cost:** ~$0.40 per million requests

### 2. AWS Step Functions
- **Purpose:** Orchestrate multi-step video pipeline
- **Benefit:** Visual workflow, automatic retries, parallel execution
- **Cost:** ~$25 per million state transitions

```json
{
  "StartAt": "PrepareAssets",
  "States": {
    "PrepareAssets": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:prepare-assets",
      "Next": "CacheToS3"
    },
    "CacheToS3": {
      "Type": "Task", 
      "Resource": "arn:aws:lambda:...:cache-assets",
      "Next": "CalculateChunks"
    },
    "CalculateChunks": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:calculate-chunks",
      "Next": "RenderChunks"
    },
    "RenderChunks": {
      "Type": "Map",
      "ItemsPath": "$.chunks",
      "Iterator": {
        "StartAt": "RenderSingleChunk",
        "States": {
          "RenderSingleChunk": {
            "Type": "Task",
            "Resource": "arn:aws:ecs:...:render-task",
            "End": true
          }
        }
      },
      "Next": "ConcatenateChunks"
    },
    "ConcatenateChunks": {
      "Type": "Task",
      "Resource": "arn:aws:mediaconvert:...",
      "Next": "NotifyComplete"
    },
    "NotifyComplete": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:notify",
      "End": true
    }
  }
}
```

### 3. AWS Fargate (ECS)
- **Purpose:** Run Remotion render in containers
- **Benefit:** No timeout limit, configurable CPU/memory, auto-scaling
- **Cost:** ~$0.04/vCPU/hour + $0.004/GB/hour

```dockerfile
# Dockerfile for Remotion render container
FROM node:18-slim

# Install Chrome for Remotion
RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

ENV CHROMIUM_PATH=/usr/bin/chromium

CMD ["node", "render-worker.js"]
```

### 4. AWS MediaConvert
- **Purpose:** Professional video transcoding
- **Benefit:** Multiple output formats, HLS/DASH streaming, thumbnails
- **Cost:** ~$0.015 per minute of output

```typescript
// MediaConvert job for final processing
const mediaConvertJob = {
  Role: "arn:aws:iam::...:role/MediaConvertRole",
  Settings: {
    Inputs: [{
      FileInput: "s3://bucket/concatenated-video.mp4",
    }],
    OutputGroups: [{
      Name: "File Group",
      Outputs: [{
        VideoDescription: {
          CodecSettings: {
            Codec: "H_264",
            H264Settings: {
              RateControlMode: "QVBR",
              MaxBitrate: 8000000,
            }
          }
        },
        AudioDescriptions: [{
          CodecSettings: {
            Codec: "AAC",
            AacSettings: {
              Bitrate: 128000,
            }
          }
        }],
        ContainerSettings: {
          Container: "MP4",
        }
      }],
      OutputGroupSettings: {
        Type: "FILE_GROUP_SETTINGS",
        FileGroupSettings: {
          Destination: "s3://bucket/final-output/"
        }
      }
    }]
  }
};
```

### 5. Amazon CloudFront
- **Purpose:** CDN for fast video delivery
- **Benefit:** Global edge caching, HTTPS, signed URLs
- **Cost:** ~$0.085 per GB (first 10TB)

---

## Migration Path

### Phase A: Current → Chunked Lambda (Immediate)
- Implement chunked rendering as described in Phase 3
- Keeps current Lambda infrastructure
- Solves timeout issues for videos up to ~20 minutes

### Phase B: Add SQS + Step Functions (1-2 weeks)
- Decouple API from rendering
- Add proper job queue and orchestration
- Enable retry logic and monitoring

### Phase C: Add Fargate for Rendering (2-3 weeks)  
- Move Remotion render to containers
- Remove all timeout constraints
- Enable true parallel chunk rendering

### Phase D: Add MediaConvert (Optional)
- Professional output encoding
- Multiple format support
- Streaming-ready output (HLS)

---

## Cost Comparison

| Architecture | 100 Videos/Month (60s each) | 1000 Videos/Month |
|--------------|----------------------------|-------------------|
| Current Lambda-only | ~$15-20 | ~$150-200 |
| Chunked Lambda | ~$20-30 | ~$200-300 |
| Fargate + Step Functions | ~$40-60 | ~$300-500 |
| Full AWS Pipeline | ~$60-100 | ~$400-700 |

The full AWS pipeline costs more but provides:
- No timeout limits
- Better reliability
- Professional output quality
- Scalability to thousands of videos

---

## Message for Replit Agent

> "Please implement the phases in this order:
>
> **Phase 3 FIRST (Critical):** Implement the chunked rendering service as specified. This will solve our timeout issues by breaking long videos into 2-minute chunks that Lambda can handle.
>
> Key files to create/modify:
> 1. Create `server/services/chunked-render-service.ts` with the ChunkedRenderService class
> 2. Update the render route to detect video duration and use chunked rendering for videos over 90 seconds
> 3. Ensure FFmpeg is available (check `replit.nix` or install)
>
> **Then Phase 2:** Add the product overlay editor, voiceover regeneration, and music controls
>
> **Then Phase 4:** Add polish features like scene reordering
>
> The chunked rendering is the most important - it will allow any video length to render successfully."
