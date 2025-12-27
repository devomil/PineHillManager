# Phase 2A: Claude Vision Scene Analysis

## Objective
Add intelligent scene analysis using Claude Vision. Before rendering, Claude will analyze each scene's video/image to detect faces, focal points, and safe zones for text placement. This prevents text overlays from blocking faces.

## Prerequisites
- Phase 1A or 1B complete (AI video generation working)
- ANTHROPIC_API_KEY already configured (used for script parsing)

## What Success Looks Like
- Each scene is analyzed before rendering
- Faces are detected with bounding box positions
- Safe zones for text are identified
- Analysis results are logged and stored with scene data
- Text placement recommendations are generated

---

## Step 1: Create Scene Analysis Service

Create a new file `server/services/scene-analysis-service.ts`:

```typescript
// server/services/scene-analysis-service.ts

import Anthropic from '@anthropic-ai/sdk';

export interface FaceDetection {
  x: number;      // 0-100 percentage from left
  y: number;      // 0-100 percentage from top
  width: number;  // 0-100 percentage
  height: number; // 0-100 percentage
}

export interface SafeZones {
  topLeft: boolean;
  topCenter: boolean;
  topRight: boolean;
  middleLeft: boolean;
  middleCenter: boolean;
  middleRight: boolean;
  bottomLeft: boolean;
  bottomCenter: boolean;
  bottomRight: boolean;
}

export interface SceneAnalysis {
  // Face detection
  faces: {
    detected: boolean;
    count: number;
    positions: FaceDetection[];
  };
  
  // Composition
  composition: {
    focalPoint: { x: number; y: number };
    brightness: 'dark' | 'normal' | 'bright';
    dominantColors: string[];
  };
  
  // Where text can safely go
  safeZones: SafeZones;
  
  // Recommendations
  recommendations: {
    textPosition: {
      vertical: 'top' | 'center' | 'lower-third';
      horizontal: 'left' | 'center' | 'right';
    };
    textColor: string;
    needsTextShadow: boolean;
    needsTextBackground: boolean;
    productOverlayPosition: {
      x: 'left' | 'center' | 'right';
      y: 'top' | 'center' | 'bottom';
    };
    productOverlaySafe: boolean;
  };
  
  // Content type
  contentType: 'person' | 'product' | 'nature' | 'abstract' | 'mixed';
  mood: 'positive' | 'neutral' | 'serious' | 'dramatic';
}

class SceneAnalysisService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }

  /**
   * Analyze an image/video frame using Claude Vision
   */
  async analyzeScene(
    imageUrl: string,
    context: {
      sceneType: string;
      narration: string;
      hasTextOverlays: boolean;
      hasProductOverlay: boolean;
    }
  ): Promise<SceneAnalysis> {
    console.log(`[SceneAnalysis] Analyzing scene: ${context.sceneType}`);
    
    try {
      // Fetch and encode image
      const imageData = await this.fetchAndEncodeImage(imageUrl);
      
      if (!imageData) {
        console.warn(`[SceneAnalysis] Could not fetch image, using defaults`);
        return this.getDefaultAnalysis();
      }

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageData.mediaType,
                  data: imageData.base64,
                },
              },
              {
                type: 'text',
                text: this.buildAnalysisPrompt(context),
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      // Parse JSON from response
      const analysis = this.parseAnalysisResponse(content.text);
      
      console.log(`[SceneAnalysis] Complete:`, {
        faces: analysis.faces.count,
        focalPoint: analysis.composition.focalPoint,
        recommendedTextPos: analysis.recommendations.textPosition,
        contentType: analysis.contentType,
      });

      return analysis;

    } catch (error: any) {
      console.error(`[SceneAnalysis] Failed:`, error.message);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Analyze multiple scenes in batch
   */
  async analyzeScenes(
    scenes: Array<{
      id: string;
      imageUrl: string;
      sceneType: string;
      narration: string;
      hasTextOverlays: boolean;
      hasProductOverlay: boolean;
    }>
  ): Promise<Map<string, SceneAnalysis>> {
    const results = new Map<string, SceneAnalysis>();
    
    console.log(`[SceneAnalysis] Analyzing ${scenes.length} scenes...`);
    
    for (const scene of scenes) {
      const analysis = await this.analyzeScene(scene.imageUrl, {
        sceneType: scene.sceneType,
        narration: scene.narration,
        hasTextOverlays: scene.hasTextOverlays,
        hasProductOverlay: scene.hasProductOverlay,
      });
      
      results.set(scene.id, analysis);
      
      // Small delay to avoid rate limiting
      await this.sleep(500);
    }
    
    return results;
  }

  private async fetchAndEncodeImage(
    imageUrl: string
  ): Promise<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' } | null> {
    try {
      // For video URLs, we'd need to extract a frame
      // For now, handle images directly
      if (imageUrl.includes('.mp4') || imageUrl.includes('.webm')) {
        console.log(`[SceneAnalysis] Video URL detected, skipping (frame extraction not implemented)`);
        return null;
      }

      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const base64 = buffer.toString('base64');
      
      // Determine media type
      let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg';
      if (imageUrl.includes('.png')) mediaType = 'image/png';
      else if (imageUrl.includes('.webp')) mediaType = 'image/webp';
      else if (imageUrl.includes('.gif')) mediaType = 'image/gif';

      return { base64, mediaType };

    } catch (error: any) {
      console.error(`[SceneAnalysis] Image fetch failed:`, error.message);
      return null;
    }
  }

  private buildAnalysisPrompt(context: {
    sceneType: string;
    narration: string;
    hasTextOverlays: boolean;
    hasProductOverlay: boolean;
  }): string {
    return `Analyze this image for professional video composition.

CONTEXT:
- Scene type: ${context.sceneType}
- Has text overlays: ${context.hasTextOverlays}
- Has product overlay: ${context.hasProductOverlay}
- Narration: "${context.narration.substring(0, 150)}..."

Respond with a JSON object in this EXACT format:
{
  "faces": {
    "detected": true/false,
    "count": number,
    "positions": [
      {"x": 0-100, "y": 0-100, "width": 0-100, "height": 0-100}
    ]
  },
  "composition": {
    "focalPoint": {"x": 0-100, "y": 0-100},
    "brightness": "dark" | "normal" | "bright",
    "dominantColors": ["#hex1", "#hex2", "#hex3"]
  },
  "safeZones": {
    "topLeft": true/false,
    "topCenter": true/false,
    "topRight": true/false,
    "middleLeft": true/false,
    "middleCenter": true/false,
    "middleRight": true/false,
    "bottomLeft": true/false,
    "bottomCenter": true/false,
    "bottomRight": true/false
  },
  "recommendations": {
    "textPosition": {
      "vertical": "top" | "center" | "lower-third",
      "horizontal": "left" | "center" | "right"
    },
    "textColor": "#ffffff" or "#000000",
    "needsTextShadow": true/false,
    "needsTextBackground": true/false,
    "productOverlayPosition": {
      "x": "left" | "center" | "right",
      "y": "top" | "center" | "bottom"
    },
    "productOverlaySafe": true/false
  },
  "contentType": "person" | "product" | "nature" | "abstract" | "mixed",
  "mood": "positive" | "neutral" | "serious" | "dramatic"
}

RULES:
1. A zone is NOT safe if a face or important subject occupies it
2. Text should NEVER overlap faces
3. Product overlays should not block faces or focal points
4. Use white text (#ffffff) on dark backgrounds, black (#000000) on light
5. Add text shadow if background has mixed brightness
6. Lower-third is usually safest for text if faces are present
7. Positions are percentages (0=left/top, 100=right/bottom)

Return ONLY the JSON object.`;
  }

  private parseAnalysisResponse(text: string): SceneAnalysis {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize the response
      return {
        faces: {
          detected: parsed.faces?.detected || false,
          count: parsed.faces?.count || 0,
          positions: parsed.faces?.positions || [],
        },
        composition: {
          focalPoint: parsed.composition?.focalPoint || { x: 50, y: 50 },
          brightness: parsed.composition?.brightness || 'normal',
          dominantColors: parsed.composition?.dominantColors || ['#808080'],
        },
        safeZones: {
          topLeft: parsed.safeZones?.topLeft ?? true,
          topCenter: parsed.safeZones?.topCenter ?? true,
          topRight: parsed.safeZones?.topRight ?? true,
          middleLeft: parsed.safeZones?.middleLeft ?? true,
          middleCenter: parsed.safeZones?.middleCenter ?? false,
          middleRight: parsed.safeZones?.middleRight ?? true,
          bottomLeft: parsed.safeZones?.bottomLeft ?? true,
          bottomCenter: parsed.safeZones?.bottomCenter ?? true,
          bottomRight: parsed.safeZones?.bottomRight ?? true,
        },
        recommendations: {
          textPosition: {
            vertical: parsed.recommendations?.textPosition?.vertical || 'lower-third',
            horizontal: parsed.recommendations?.textPosition?.horizontal || 'center',
          },
          textColor: parsed.recommendations?.textColor || '#FFFFFF',
          needsTextShadow: parsed.recommendations?.needsTextShadow ?? true,
          needsTextBackground: parsed.recommendations?.needsTextBackground ?? false,
          productOverlayPosition: {
            x: parsed.recommendations?.productOverlayPosition?.x || 'right',
            y: parsed.recommendations?.productOverlayPosition?.y || 'bottom',
          },
          productOverlaySafe: parsed.recommendations?.productOverlaySafe ?? true,
        },
        contentType: parsed.contentType || 'mixed',
        mood: parsed.mood || 'neutral',
      };

    } catch (error: any) {
      console.error(`[SceneAnalysis] Parse error:`, error.message);
      return this.getDefaultAnalysis();
    }
  }

  private getDefaultAnalysis(): SceneAnalysis {
    return {
      faces: {
        detected: false,
        count: 0,
        positions: [],
      },
      composition: {
        focalPoint: { x: 50, y: 50 },
        brightness: 'normal',
        dominantColors: ['#2D5A27', '#F5F5DC'],
      },
      safeZones: {
        topLeft: true,
        topCenter: true,
        topRight: true,
        middleLeft: true,
        middleCenter: false,
        middleRight: true,
        bottomLeft: true,
        bottomCenter: true,
        bottomRight: true,
      },
      recommendations: {
        textPosition: {
          vertical: 'lower-third',
          horizontal: 'center',
        },
        textColor: '#FFFFFF',
        needsTextShadow: true,
        needsTextBackground: false,
        productOverlayPosition: {
          x: 'right',
          y: 'bottom',
        },
        productOverlaySafe: true,
      },
      contentType: 'mixed',
      mood: 'positive',
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const sceneAnalysisService = new SceneAnalysisService();
```

---

## Step 2: Create Video Frame Extractor (Optional Enhancement)

For analyzing videos, we need to extract a representative frame. Create `server/services/video-frame-extractor.ts`:

```typescript
// server/services/video-frame-extractor.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

class VideoFrameExtractor {
  
  /**
   * Check if FFmpeg is available
   */
  async isFFmpegAvailable(): Promise<boolean> {
    try {
      await execAsync('which ffmpeg');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract a frame from a video at a specific timestamp
   */
  async extractFrame(
    videoUrl: string,
    timestampSeconds: number = 1
  ): Promise<string | null> {
    const hasFFmpeg = await this.isFFmpegAvailable();
    
    if (!hasFFmpeg) {
      console.warn(`[FrameExtractor] FFmpeg not available`);
      return null;
    }

    const tempDir = os.tmpdir();
    const outputPath = path.join(tempDir, `frame_${Date.now()}.jpg`);

    try {
      // FFmpeg command to extract a single frame
      const command = `ffmpeg -ss ${timestampSeconds} -i "${videoUrl}" -vframes 1 -q:v 2 "${outputPath}" -y 2>/dev/null`;
      
      await execAsync(command, { timeout: 30000 });
      
      if (fs.existsSync(outputPath)) {
        // Read and return as data URL
        const buffer = fs.readFileSync(outputPath);
        const base64 = buffer.toString('base64');
        
        // Clean up
        fs.unlinkSync(outputPath);
        
        return `data:image/jpeg;base64,${base64}`;
      }
      
      return null;

    } catch (error: any) {
      console.error(`[FrameExtractor] Failed:`, error.message);
      
      // Clean up on error
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      
      return null;
    }
  }

  /**
   * Extract frame and convert to base64 for Claude Vision
   */
  async extractFrameAsBase64(
    videoUrl: string,
    timestampSeconds: number = 1
  ): Promise<{ base64: string; mediaType: 'image/jpeg' } | null> {
    const dataUrl = await this.extractFrame(videoUrl, timestampSeconds);
    
    if (!dataUrl) {
      return null;
    }

    // Extract base64 from data URL
    const base64Match = dataUrl.match(/base64,(.+)$/);
    if (!base64Match) {
      return null;
    }

    return {
      base64: base64Match[1],
      mediaType: 'image/jpeg',
    };
  }
}

export const videoFrameExtractor = new VideoFrameExtractor();
```

---

## Step 3: Update Scene Analysis to Handle Videos

Modify `server/services/scene-analysis-service.ts` to use the frame extractor:

Add import at top:
```typescript
import { videoFrameExtractor } from './video-frame-extractor';
```

Update the `fetchAndEncodeImage` method:
```typescript
private async fetchAndEncodeImage(
  imageUrl: string
): Promise<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' } | null> {
  try {
    // For video URLs, extract a frame
    if (imageUrl.includes('.mp4') || imageUrl.includes('.webm') || imageUrl.includes('video')) {
      console.log(`[SceneAnalysis] Extracting frame from video...`);
      
      const frameData = await videoFrameExtractor.extractFrameAsBase64(imageUrl, 2);
      
      if (frameData) {
        return frameData;
      }
      
      console.warn(`[SceneAnalysis] Frame extraction failed, skipping analysis`);
      return null;
    }

    // Handle images directly
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString('base64');
    
    let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg';
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('png')) mediaType = 'image/png';
    else if (contentType?.includes('webp')) mediaType = 'image/webp';
    else if (contentType?.includes('gif')) mediaType = 'image/gif';
    else if (imageUrl.includes('.png')) mediaType = 'image/png';
    else if (imageUrl.includes('.webp')) mediaType = 'image/webp';

    return { base64, mediaType };

  } catch (error: any) {
    console.error(`[SceneAnalysis] Image fetch failed:`, error.message);
    return null;
  }
}
```

---

## Step 4: Integrate with Asset Generation

Modify `server/services/universal-video-service.ts`:

### Add import:
```typescript
import { sceneAnalysisService, SceneAnalysis } from './scene-analysis-service';
```

### Add analysis step after video generation:

Find the end of the video generation loop and add:

```typescript
// After all videos are generated, analyze scenes for composition

console.log(`[Assets] Analyzing scenes for optimal composition...`);

if (updatedProject.progress?.steps?.assembly) {
  updatedProject.progress.steps.assembly.status = 'in-progress';
  updatedProject.progress.steps.assembly.message = 'Analyzing scenes with AI vision...';
}

for (let i = 0; i < updatedProject.scenes.length; i++) {
  const scene = updatedProject.scenes[i];
  
  // Get the visual asset URL (prefer video thumbnail or image)
  const assetUrl = scene.assets?.imageUrl || 
                   scene.assets?.videoUrl || 
                   scene.background?.imageUrl ||
                   scene.background?.videoUrl;
  
  if (!assetUrl) {
    console.log(`[Assets] Scene ${scene.id} has no visual asset to analyze`);
    continue;
  }
  
  try {
    const analysis = await sceneAnalysisService.analyzeScene(assetUrl, {
      sceneType: scene.type,
      narration: scene.narration || '',
      hasTextOverlays: (scene.textOverlays?.length || 0) > 0,
      hasProductOverlay: scene.assets?.useProductOverlay || false,
    });
    
    // Store analysis with the scene
    updatedProject.scenes[i].analysis = analysis;
    
    console.log(`[Assets] Scene ${i + 1} analyzed:`, {
      faces: analysis.faces.count,
      textPosition: analysis.recommendations.textPosition,
      productSafe: analysis.recommendations.productOverlaySafe,
    });
    
  } catch (error: any) {
    console.warn(`[Assets] Analysis failed for scene ${scene.id}:`, error.message);
    // Continue without analysis - will use default positioning
  }
  
  if (updatedProject.progress?.steps?.assembly) {
    updatedProject.progress.steps.assembly.progress = Math.round(((i + 1) / updatedProject.scenes.length) * 100);
  }
}

console.log(`[Assets] Scene analysis complete`);
```

---

## Step 5: Update Scene Type Definition

Add analysis field to the Scene type. In your shared types file (e.g., `shared/video-types.ts`):

```typescript
import { SceneAnalysis } from '../server/services/scene-analysis-service';

export interface Scene {
  // ... existing fields ...
  
  // AI composition analysis
  analysis?: SceneAnalysis;
}
```

Or if you can't modify the shared types, store it in the assets:

```typescript
updatedProject.scenes[i].assets = updatedProject.scenes[i].assets || {};
(updatedProject.scenes[i].assets as any).analysis = analysis;
```

---

## Step 6: Test the Analysis

1. Create a new video project
2. Generate assets (including AI videos or images)
3. Watch console for:
   - `[SceneAnalysis] Analyzing scene: hook`
   - `[SceneAnalysis] Complete: { faces: 1, focalPoint: {x: 45, y: 30}, ... }`
4. Verify analysis is stored with each scene

---

## Verification Checklist

Before moving to Phase 2B, confirm:

- [ ] `scene-analysis-service.ts` exists and exports `sceneAnalysisService`
- [ ] `video-frame-extractor.ts` exists for video analysis (optional)
- [ ] `universal-video-service.ts` imports and calls scene analysis
- [ ] Console shows analysis results for each scene
- [ ] Scene analysis data is stored in project (scene.analysis or scene.assets.analysis)
- [ ] Face detection provides positions when faces are present
- [ ] Safe zones are correctly identified

---

## Troubleshooting

### "Could not fetch image"
- Check if the S3 URL is accessible
- Verify the asset exists in S3

### "No JSON found in response"
- Claude Vision API may have returned an error
- Check ANTHROPIC_API_KEY is valid
- Check rate limits

### Frame extraction fails
- FFmpeg may not be installed in Replit
- Add `pkgs.ffmpeg` to replit.nix

### Analysis is slow
- Each scene takes 2-5 seconds to analyze
- Consider caching analysis results
- Skip re-analysis if assets haven't changed

---

## Cost Estimate

Scene analysis cost per video:
- 6 scenes × ~$0.02 per analysis = ~$0.12 per video
- This is very cost-effective for the quality improvement

---

## Next Phase

Once analysis is working, proceed to **Phase 2B: Intelligent Text Placement** to use the analysis data for smart text positioning.
