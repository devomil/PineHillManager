# Replit Agent Instructions: Universal TV-Quality Video Production System

## PROJECT OVERVIEW

Build a **universal video production system** for Pine Hill Farm that handles TWO distinct workflows through a single, intelligent pipeline:

1. **Product Videos** (30-90 seconds) — Quick marketing videos from form inputs
2. **Script-Based Videos** (2-10 minutes) — Longer educational/documentary content from scripts

Both workflows must produce **TV-commercial quality output** suitable for a nationally-recognized health brand.

---

## PAID SERVICES AVAILABLE

| Service | Plan | Purpose |
|---------|------|---------|
| ElevenLabs | Creator ($11/mo) | Professional voiceover |
| fal.ai | Pro + Auto-replenish ($30/mo) | AI image generation |
| AWS Lambda | Pay-per-use (~$0.20/video) | Remotion cloud rendering |

**Already Deployed:**
- Lambda Function: `remotion-render-4-0-382-mem2048mb-disk2048mb-240sec`
- S3 Bucket: `remotionlambda-useast1-refjo5giq5`
- Region: `us-east-1`

---

## CORE ARCHITECTURE

### Universal Video Schema

Both workflows ultimately produce the same data structure for Remotion:

```typescript
// This is THE universal format that Remotion compositions consume
interface VideoProject {
  id: string;
  type: 'product' | 'script-based';

  // Metadata
  title: string;
  description: string;
  targetAudience?: string;

  // Timing
  totalDuration: number; // calculated from scenes
  fps: 30;

  // Output settings
  outputFormat: {
    aspectRatio: '16:9' | '9:16' | '1:1';
    resolution: { width: number; height: number };
    platform: 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'website';
  };

  // Brand settings (defaults can be overridden)
  brand: BrandSettings;

  // The actual content
  scenes: Scene[];

  // Generated assets (populated during production)
  assets: GeneratedAssets;

  // Production state
  status: 'draft' | 'generating' | 'ready' | 'rendering' | 'complete' | 'error';
  progress: ProductionProgress;
}

interface BrandSettings {
  name: string;
  logoUrl: string;
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  watermarkOpacity: number; // 0.1 - 0.5
  colors: {
    primary: string;    // #1a4480 (deep blue)
    secondary: string;  // #f5f0e6 (warm cream)
    accent: string;     // #c9a227 (natural gold)
    text: string;       // #1a1a1a (near black)
    textLight: string;  // #ffffff
  };
  fonts: {
    heading: string;    // 'Inter', 'Montserrat', etc.
    body: string;
    weight: {
      heading: 600 | 700 | 800;
      body: 400 | 500;
    };
  };
}

interface Scene {
  id: string;
  order: number;
  type: SceneType;
  duration: number; // seconds

  // Content
  narration: string;
  textOverlays: TextOverlay[];

  // Visuals
  background: BackgroundConfig;

  // Transitions
  transitionIn: TransitionConfig;
  transitionOut: TransitionConfig;

  // Generated assets for this scene
  assets?: SceneAssets;
}

type SceneType = 
  | 'hook'           // Attention-grabbing opener
  | 'intro'          // Introduction/setup
  | 'benefit'        // Single benefit highlight
  | 'feature'        // Product feature showcase
  | 'explanation'    // Educational content
  | 'process'        // Step-by-step or list
  | 'testimonial'    // Quote or social proof
  | 'brand'          // Company/brand showcase
  | 'cta'            // Call to action
  | 'outro';         // Closing

interface TextOverlay {
  id: string;
  text: string;
  style: 'title' | 'subtitle' | 'headline' | 'body' | 'bullet' | 'caption' | 'cta' | 'quote';
  position: TextPosition;
  timing: {
    startAt: number;  // seconds from scene start
    duration: number; // how long visible
  };
  animation: {
    enter: 'fade' | 'slide-up' | 'slide-left' | 'scale' | 'typewriter';
    exit: 'fade' | 'slide-down' | 'scale';
    duration: number; // animation duration in seconds
  };
}

interface TextPosition {
  vertical: 'top' | 'center' | 'bottom' | 'lower-third';
  horizontal: 'left' | 'center' | 'right';
  padding: number; // pixels from edge
}

interface BackgroundConfig {
  type: 'image' | 'video' | 'gradient' | 'solid';
  source: string; // URL or gradient definition
  effect?: {
    type: 'ken-burns' | 'parallax' | 'zoom' | 'pan' | 'none';
    intensity: 'subtle' | 'medium' | 'dramatic';
    direction?: 'in' | 'out' | 'left' | 'right';
  };
  overlay?: {
    type: 'gradient' | 'solid' | 'vignette';
    color: string;
    opacity: number;
  };
}

interface TransitionConfig {
  type: 'none' | 'fade' | 'crossfade' | 'slide' | 'zoom' | 'wipe';
  duration: number; // seconds
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

interface GeneratedAssets {
  voiceover: {
    fullTrackUrl: string;
    duration: number;
    perScene: { sceneId: string; url: string; duration: number }[];
  };
  music: {
    url: string;
    duration: number;
    volume: number; // 0.15 - 0.25 recommended
  };
  images: { sceneId: string; url: string; prompt: string }[];
  videos: { sceneId: string; url: string; source: 'pexels' | 'generated' }[];
}

interface ProductionProgress {
  currentStep: 'idle' | 'script' | 'voiceover' | 'images' | 'videos' | 'music' | 'assembly' | 'rendering';
  steps: {
    script: StepStatus;
    voiceover: StepStatus;
    images: StepStatus;
    videos: StepStatus;
    music: StepStatus;
    assembly: StepStatus;
    rendering: StepStatus;
  };
  overallPercent: number;
  errors: string[];
}

interface StepStatus {
  status: 'pending' | 'in-progress' | 'complete' | 'error' | 'skipped';
  progress: number; // 0-100
  message?: string;
}
```

---

## WORKFLOW 1: PRODUCT VIDEO

### Input Interface (Already exists in UI)

The current UI collects:
- Product Name
- Product Description
- Target Audience
- Key Benefits (one per line)
- Duration (30s, 60s, 90s)
- Platform (YouTube, TikTok, Instagram, etc.)
- Style (Professional, Friendly, Energetic, Calm)
- Call to Action

### Auto-Generation Logic

When user clicks "Start AI Production", the system should:

#### Step 1: Generate Script from Inputs

```typescript
async function generateProductScript(input: ProductVideoInput): Promise<Scene[]> {
  // Use Claude API to generate a structured script
  const prompt = `
    Create a ${input.duration}-second video script for:
    Product: ${input.productName}
    Description: ${input.productDescription}
    Target Audience: ${input.targetAudience}
    Key Benefits: ${input.benefits.join(', ')}
    Style: ${input.style}
    CTA: ${input.callToAction}

    Return a JSON array of scenes with this structure:
    {
      "scenes": [
        {
          "type": "hook|benefit|feature|cta",
          "duration": number,
          "narration": "voiceover text",
          "visualDirection": "description for AI image generation",
          "textOverlays": [
            {
              "text": "on-screen text",
              "style": "title|subtitle|bullet|cta",
              "timing": { "startAt": 0, "duration": 3 }
            }
          ]
        }
      ]
    }

    Guidelines:
    - Hook scene: 5-8 seconds, grab attention
    - Each benefit: 8-12 seconds
    - CTA: 8-10 seconds
    - Total must equal ${input.duration} seconds
    - Narration should be conversational and ${input.style.toLowerCase()}
    - Visual directions should be specific and descriptive
  `;

  const response = await callClaudeAPI(prompt);
  return parseScenes(response);
}
```

#### Step 2: Scene Structure Templates

**30-Second Product Video:**
```
[Hook: 6s] → [Benefit 1: 8s] → [Benefit 2: 8s] → [CTA: 8s]
```

**60-Second Product Video:**
```
[Hook: 8s] → [Intro: 10s] → [Benefit 1: 10s] → [Benefit 2: 10s] → [Benefit 3: 10s] → [CTA: 12s]
```

**90-Second Product Video:**
```
[Hook: 10s] → [Problem: 15s] → [Solution Intro: 10s] → [Benefit 1: 12s] → [Benefit 2: 12s] → [Benefit 3: 12s] → [Brand: 8s] → [CTA: 11s]
```

---

## WORKFLOW 2: SCRIPT-BASED VIDEO

### Input Interface

The "Script-Based" tab should allow:
- Upload .docx/.txt file OR paste script text
- Script is parsed into scenes automatically
- User can edit/reorder scenes
- User can adjust visual directions
- User sets total duration target

### Script Parsing Logic

```typescript
async function parseScriptIntoScenes(rawScript: string): Promise<Scene[]> {
  // Use Claude to intelligently parse the script
  const prompt = `
    Parse this video script into structured scenes:

    """
    ${rawScript}
    """

    Return JSON:
    {
      "scenes": [
        {
          "type": "hook|intro|explanation|process|brand|cta",
          "narration": "exact text for this scene",
          "visualDirection": "suggested visuals for this scene",
          "estimatedDuration": number (based on ~150 words per minute speaking rate),
          "keyPoints": ["main point 1", "main point 2"] // for text overlays
        }
      ]
    }

    Guidelines:
    - Identify natural scene breaks (topic changes, new sections)
    - "Opening Scene" or "Hook" → type: "hook"
    - "Scene X: TITLE" patterns indicate new scenes
    - Closing/CTA content → type: "cta"
    - Process/steps content → type: "process"
    - Brand mentions → type: "brand"
    - Calculate duration: ~2.5 words per second for narration
  `;

  const response = await callClaudeAPI(prompt);
  return parseAndEnrichScenes(response);
}
```

---

## ASSET GENERATION PIPELINE

### This runs for BOTH workflows

```typescript
async function generateAllAssets(project: VideoProject): Promise<GeneratedAssets> {
  const assets: GeneratedAssets = {
    voiceover: { fullTrackUrl: '', duration: 0, perScene: [] },
    music: { url: '', duration: 0, volume: 0.18 },
    images: [],
    videos: []
  };

  // Update progress
  updateProgress(project.id, 'voiceover', 'in-progress');

  // 1. GENERATE VOICEOVER
  // Combine all narration, send to ElevenLabs
  const fullNarration = project.scenes
    .map(s => s.narration)
    .join(' ... '); // Pauses between scenes

  assets.voiceover = await generateVoiceover(fullNarration, project.scenes);
  updateProgress(project.id, 'voiceover', 'complete');

  // 2. GENERATE IMAGES
  updateProgress(project.id, 'images', 'in-progress');

  for (const scene of project.scenes) {
    const imagePrompt = enhancePromptForBrand(
      scene.background.source, // This is the visual direction
      project.brand,
      project.type
    );

    const imageUrl = await generateImage(imagePrompt);
    assets.images.push({
      sceneId: scene.id,
      url: imageUrl,
      prompt: imagePrompt
    });

    // Update per-scene progress
    updateSceneProgress(project.id, scene.id, 'image', 'complete');
  }
  updateProgress(project.id, 'images', 'complete');

  // 3. FETCH B-ROLL (optional, for longer videos)
  if (project.type === 'script-based' && project.totalDuration > 60) {
    updateProgress(project.id, 'videos', 'in-progress');

    for (const scene of project.scenes) {
      if (scene.background.type === 'video') {
        const videoUrl = await fetchPexelsVideo(scene.background.source);
        assets.videos.push({
          sceneId: scene.id,
          url: videoUrl,
          source: 'pexels'
        });
      }
    }
    updateProgress(project.id, 'videos', 'complete');
  } else {
    updateProgress(project.id, 'videos', 'skipped');
  }

  // 4. SELECT MUSIC
  updateProgress(project.id, 'music', 'in-progress');
  assets.music = await selectBackgroundMusic(
    project.type,
    project.totalDuration,
    getStyleFromProject(project)
  );
  updateProgress(project.id, 'music', 'complete');

  return assets;
}

function enhancePromptForBrand(
  visualDirection: string,
  brand: BrandSettings,
  videoType: 'product' | 'script-based'
): string {
  const styleModifiers = [
    'professional photography',
    'warm natural lighting',
    'health and wellness aesthetic',
    'clean composition',
    '4K ultra detailed',
    'soft color palette',
    videoType === 'product' ? 'product showcase style' : 'documentary style'
  ];

  return `${visualDirection}, ${styleModifiers.join(', ')}`;
}
```

---

## REMOTION COMPOSITIONS

### Universal Video Composition

```typescript
// src/remotion/compositions/UniversalVideo.tsx

import { AbsoluteFill, Audio, Sequence, useVideoConfig, Img, Video } from 'remotion';
import { SceneRenderer } from '../components/SceneRenderer';
import { Watermark } from '../components/Watermark';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';

interface UniversalVideoProps {
  project: VideoProject;
}

export const UniversalVideo: React.FC<UniversalVideoProps> = ({ project }) => {
  const { fps, width, height } = useVideoConfig();

  // Calculate cumulative start frames for each scene
  const sceneTimings = calculateSceneTimings(project.scenes, fps);

  return (
    <AbsoluteFill style={{ backgroundColor: project.brand.colors.secondary }}>

      {/* Background Music - full duration */}
      {project.assets.music.url && (
        <Audio
          src={project.assets.music.url}
          volume={(f) => {
            // Fade in first 2 seconds, fade out last 2 seconds
            const totalFrames = project.totalDuration * fps;
            const fadeFrames = 2 * fps;
            if (f < fadeFrames) return (f / fadeFrames) * project.assets.music.volume;
            if (f > totalFrames - fadeFrames) {
              return ((totalFrames - f) / fadeFrames) * project.assets.music.volume;
            }
            return project.assets.music.volume;
          }}
        />
      )}

      {/* Full Voiceover Track */}
      {project.assets.voiceover.fullTrackUrl && (
        <Audio src={project.assets.voiceover.fullTrackUrl} volume={1.0} />
      )}

      {/* Render Scenes with Transitions */}
      <TransitionSeries>
        {project.scenes.map((scene, index) => {
          const sceneAssets = {
            image: project.assets.images.find(i => i.sceneId === scene.id),
            video: project.assets.videos.find(v => v.sceneId === scene.id),
          };

          return (
            <TransitionSeries.Sequence
              key={scene.id}
              durationInFrames={scene.duration * fps}
            >
              <SceneRenderer
                scene={scene}
                assets={sceneAssets}
                brand={project.brand}
                videoType={project.type}
              />
            </TransitionSeries.Sequence>
          );

          // Add transition after each scene (except last)
          if (index < project.scenes.length - 1) {
            return (
              <TransitionSeries.Transition
                key={`transition-${scene.id}`}
                presentation={fade()}
                timing={linearTiming({ durationInFrames: fps * 0.5 })}
              />
            );
          }
        })}
      </TransitionSeries>

      {/* Persistent Watermark */}
      <Watermark
        logoUrl={project.brand.logoUrl}
        position={project.brand.watermarkPosition}
        opacity={project.brand.watermarkOpacity}
      />

    </AbsoluteFill>
  );
};
```

### Scene Renderer Component

```typescript
// src/remotion/components/SceneRenderer.tsx

import { AbsoluteFill, Img, Video, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AnimatedText } from './AnimatedText';

interface SceneRendererProps {
  scene: Scene;
  assets: { image?: ImageAsset; video?: VideoAsset };
  brand: BrandSettings;
  videoType: 'product' | 'script-based';
}

export const SceneRenderer: React.FC<SceneRendererProps> = ({
  scene,
  assets,
  brand,
  videoType
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Ken Burns effect calculation
  const kenBurnsScale = interpolate(
    frame,
    [0, scene.duration * fps],
    [1, 1.12],
    { extrapolateRight: 'clamp' }
  );

  const kenBurnsPan = interpolate(
    frame,
    [0, scene.duration * fps],
    [0, 20],
    { extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill>
      {/* Background Layer */}
      {scene.background.type === 'image' && assets.image && (
        <AbsoluteFill>
          <Img
            src={assets.image.url}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: scene.background.effect?.type === 'ken-burns'
                ? `scale(${kenBurnsScale}) translateX(${kenBurnsPan}px)`
                : undefined,
            }}
          />
        </AbsoluteFill>
      )}

      {scene.background.type === 'video' && assets.video && (
        <AbsoluteFill>
          <Video
            src={assets.video.url}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </AbsoluteFill>
      )}

      {/* Overlay for text readability */}
      {scene.background.overlay && (
        <AbsoluteFill
          style={{
            background: scene.background.overlay.type === 'gradient'
              ? `linear-gradient(to top, rgba(0,0,0,${scene.background.overlay.opacity}) 0%, transparent 50%)`
              : `rgba(0,0,0,${scene.background.overlay.opacity})`,
          }}
        />
      )}

      {/* Text Overlays */}
      {scene.textOverlays.map((overlay) => (
        <AnimatedText
          key={overlay.id}
          config={overlay}
          brand={brand}
          sceneType={scene.type}
        />
      ))}
    </AbsoluteFill>
  );
};
```

### Animated Text Component

```typescript
// src/remotion/components/AnimatedText.tsx

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface AnimatedTextProps {
  config: TextOverlay;
  brand: BrandSettings;
  sceneType: SceneType;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({ config, brand, sceneType }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = config.timing.startAt * fps;
  const endFrame = (config.timing.startAt + config.timing.duration) * fps;
  const animDuration = config.animation.duration * fps;

  // Don't render if outside timing window
  if (frame < startFrame || frame > endFrame) return null;

  // Calculate animation progress
  const enterProgress = interpolate(
    frame,
    [startFrame, startFrame + animDuration],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );

  const exitProgress = interpolate(
    frame,
    [endFrame - animDuration, endFrame],
    [1, 0],
    { extrapolateRight: 'clamp' }
  );

  const opacity = Math.min(enterProgress, exitProgress);

  // Animation transforms
  let transform = '';
  if (config.animation.enter === 'slide-up') {
    const slideY = interpolate(enterProgress, [0, 1], [30, 0]);
    transform = `translateY(${slideY}px)`;
  } else if (config.animation.enter === 'scale') {
    const scale = interpolate(enterProgress, [0, 1], [0.8, 1]);
    transform = `scale(${scale})`;
  }

  // Style based on text type
  const styles = getTextStyles(config.style, brand);

  // Position
  const positionStyles = getPositionStyles(config.position);

  return (
    <div
      style={{
        ...positionStyles,
        ...styles,
        opacity,
        transform,
        transition: 'none', // Remotion handles transitions
      }}
    >
      {config.text}
    </div>
  );
};

function getTextStyles(style: TextOverlay['style'], brand: BrandSettings) {
  const baseStyles = {
    fontFamily: brand.fonts.heading,
    color: brand.colors.textLight,
    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
  };

  switch (style) {
    case 'title':
      return { ...baseStyles, fontSize: 72, fontWeight: brand.fonts.weight.heading };
    case 'subtitle':
      return { ...baseStyles, fontSize: 48, fontWeight: brand.fonts.weight.body };
    case 'headline':
      return { ...baseStyles, fontSize: 56, fontWeight: brand.fonts.weight.heading };
    case 'body':
      return { ...baseStyles, fontSize: 32, fontWeight: brand.fonts.weight.body, fontFamily: brand.fonts.body };
    case 'bullet':
      return { ...baseStyles, fontSize: 36, fontWeight: brand.fonts.weight.body };
    case 'caption':
      return { ...baseStyles, fontSize: 24, fontWeight: brand.fonts.weight.body };
    case 'cta':
      return {
        ...baseStyles,
        fontSize: 48,
        fontWeight: brand.fonts.weight.heading,
        backgroundColor: brand.colors.accent,
        padding: '16px 32px',
        borderRadius: 8,
      };
    case 'quote':
      return { ...baseStyles, fontSize: 40, fontStyle: 'italic', fontWeight: brand.fonts.weight.body };
    default:
      return baseStyles;
  }
}

function getPositionStyles(position: TextPosition) {
  const styles: React.CSSProperties = {
    position: 'absolute',
    padding: position.padding,
  };

  // Vertical
  if (position.vertical === 'top') {
    styles.top = position.padding;
  } else if (position.vertical === 'center') {
    styles.top = '50%';
    styles.transform = 'translateY(-50%)';
  } else if (position.vertical === 'bottom') {
    styles.bottom = position.padding;
  } else if (position.vertical === 'lower-third') {
    styles.bottom = '20%';
  }

  // Horizontal
  if (position.horizontal === 'left') {
    styles.left = position.padding;
    styles.textAlign = 'left';
  } else if (position.horizontal === 'center') {
    styles.left = '50%';
    styles.transform = (styles.transform || '') + ' translateX(-50%)';
    styles.textAlign = 'center';
  } else if (position.horizontal === 'right') {
    styles.right = position.padding;
    styles.textAlign = 'right';
  }

  return styles;
}
```

---

## API ENDPOINTS

```typescript
// server/routes/video-production.ts

import express from 'express';

const router = express.Router();

// ============ WORKFLOW INITIATION ============

// Product Video: Start from form inputs
router.post('/api/video/product/start', async (req, res) => {
  const input: ProductVideoInput = req.body;

  // 1. Generate script from inputs
  const scenes = await generateProductScript(input);

  // 2. Create project
  const project = await createVideoProject({
    type: 'product',
    title: input.productName,
    outputFormat: getFormatForPlatform(input.platform),
    brand: getDefaultBrand(),
    scenes,
  });

  // 3. Start asset generation (async)
  startAssetGeneration(project.id);

  res.json({ projectId: project.id, status: 'generating' });
});

// Script-Based: Start from uploaded/pasted script
router.post('/api/video/script/start', async (req, res) => {
  const { script, options } = req.body;

  // 1. Parse script into scenes
  const scenes = await parseScriptIntoScenes(script);

  // 2. Create project
  const project = await createVideoProject({
    type: 'script-based',
    title: options.title || 'Untitled Video',
    outputFormat: getFormatForPlatform(options.platform || 'youtube'),
    brand: getDefaultBrand(),
    scenes,
  });

  res.json({ projectId: project.id, scenes, status: 'draft' });
});

// ============ SCENE EDITING ============

// Update a scene (for manual edits)
router.put('/api/video/:projectId/scene/:sceneId', async (req, res) => {
  const { projectId, sceneId } = req.params;
  const updates = req.body;

  const project = await updateScene(projectId, sceneId, updates);
  res.json(project);
});

// Reorder scenes
router.post('/api/video/:projectId/reorder', async (req, res) => {
  const { projectId } = req.params;
  const { sceneOrder } = req.body; // array of scene IDs in new order

  const project = await reorderScenes(projectId, sceneOrder);
  res.json(project);
});

// ============ ASSET GENERATION ============

// Trigger asset generation (or regeneration)
router.post('/api/video/:projectId/generate-assets', async (req, res) => {
  const { projectId } = req.params;
  const { regenerate } = req.body; // which assets to regenerate

  startAssetGeneration(projectId, regenerate);
  res.json({ status: 'generating' });
});

// Regenerate single scene's image
router.post('/api/video/:projectId/scene/:sceneId/regenerate-image', async (req, res) => {
  const { projectId, sceneId } = req.params;
  const { newPrompt } = req.body; // optional new prompt

  const imageUrl = await regenerateSceneImage(projectId, sceneId, newPrompt);
  res.json({ imageUrl });
});

// ============ PROGRESS & STATUS ============

// Get project with full status
router.get('/api/video/:projectId', async (req, res) => {
  const project = await getProject(req.params.projectId);
  res.json(project);
});

// Get real-time progress (for polling)
router.get('/api/video/:projectId/progress', async (req, res) => {
  const progress = await getProgress(req.params.projectId);
  res.json(progress);
});

// ============ RENDERING ============

// Start final render
router.post('/api/video/:projectId/render', async (req, res) => {
  const { projectId } = req.params;
  const { format } = req.body; // optional format override

  const renderId = await startRender(projectId, format);
  res.json({ renderId, status: 'rendering' });
});

// Get render progress
router.get('/api/video/:projectId/render/:renderId/progress', async (req, res) => {
  const { renderId } = req.params;
  const progress = await getRenderProgress(renderId);
  res.json(progress);
});

// Get download URL
router.get('/api/video/:projectId/render/:renderId/download', async (req, res) => {
  const { renderId } = req.params;
  const downloadUrl = await getDownloadUrl(renderId);
  res.json({ downloadUrl });
});

export default router;
```

---

## UI UPDATES REQUIRED

### 1. Production Workflow Panel (Right Side)

The workflow visualization should update in real-time:

```typescript
// components/ProductionWorkflow.tsx

const ProductionWorkflow: React.FC<{ project: VideoProject }> = ({ project }) => {
  const steps = [
    { key: 'script', label: 'Analyze', description: 'Script breakdown & scene planning' },
    { key: 'voiceover', label: 'Generate', description: 'Create voiceover audio' },
    { key: 'images', label: 'Generate', description: 'Create images & video' },
    { key: 'music', label: 'Audio', description: 'Select background music' },
    { key: 'assembly', label: 'Evaluate', description: 'AI quality assessment' },
    { key: 'rendering', label: 'Assemble', description: 'Final video composition' },
  ];

  return (
    <div className="workflow-container">
      <h2>✨ Production Workflow</h2>

      {/* Step indicators */}
      <div className="steps-row">
        {steps.map((step, i) => (
          <StepIndicator
            key={step.key}
            label={step.label}
            description={step.description}
            status={project.progress.steps[step.key].status}
            progress={project.progress.steps[step.key].progress}
          />
        ))}
      </div>

      {/* Progress breadcrumb */}
      <div className="progress-breadcrumb">
        Script Input → Scene Manifest → Asset Requirements → Generated Assets → Final Video
      </div>

      {/* Production Log / Preview */}
      <div className="production-log">
        {project.status === 'generating' && (
          <AssetGenerationLog project={project} />
        )}
        {project.status === 'ready' && (
          <RemotionPreview project={project} />
        )}
        {project.status === 'rendering' && (
          <RenderProgress project={project} />
        )}
        {project.status === 'complete' && (
          <DownloadPanel project={project} />
        )}
      </div>

      {/* Service indicators */}
      <div className="service-status">
        <ServiceBadge name="fal.ai FLUX Pro" type="Primary" category="Image Generation" />
        <ServiceBadge name="Hugging Face SDXL" type="Fallback" category="Image Generation" />
        <ServiceBadge name="Pexels/Unsplash" type="Stock" category="Image Generation" />

        <ServiceBadge name="fal.ai LongCat-Video" type="Primary" category="Video Generation" />
        <ServiceBadge name="Pexels Video" type="B-Roll" category="Video Generation" />

        <ServiceBadge name="ElevenLabs" type="Voiceover" category="Audio Generation" />
        <ServiceBadge name="Music Library" type="BGM" category="Audio Generation" />
      </div>
    </div>
  );
};
```

### 2. Scene Editor Component

```typescript
// components/SceneEditor.tsx

const SceneEditor: React.FC<{ project: VideoProject, onUpdate: Function }> = ({ project, onUpdate }) => {
  const [selectedScene, setSelectedScene] = useState(project.scenes[0]);

  return (
    <div className="scene-editor">
      {/* Scene List (draggable for reordering) */}
      <DragDropContext onDragEnd={handleReorder}>
        <Droppable droppableId="scenes">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="scene-list">
              {project.scenes.map((scene, index) => (
                <Draggable key={scene.id} draggableId={scene.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`scene-item ${selectedScene.id === scene.id ? 'selected' : ''}`}
                      onClick={() => setSelectedScene(scene)}
                    >
                      <span className="scene-number">{index + 1}</span>
                      <span className="scene-type">{scene.type}</span>
                      <span className="scene-duration">{scene.duration}s</span>
                      {scene.assets?.image && <img src={scene.assets.image} className="scene-thumb" />}
                    </div>
                  )}
                </Draggable>
              ))}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Selected Scene Details */}
      <div className="scene-details">
        <h3>Scene {project.scenes.indexOf(selectedScene) + 1}: {selectedScene.type}</h3>

        <label>Duration (seconds)</label>
        <input
          type="number"
          value={selectedScene.duration}
          onChange={(e) => updateScene({ duration: parseInt(e.target.value) })}
        />

        <label>Narration</label>
        <textarea
          value={selectedScene.narration}
          onChange={(e) => updateScene({ narration: e.target.value })}
        />

        <label>Visual Direction (for AI image generation)</label>
        <textarea
          value={selectedScene.background.source}
          onChange={(e) => updateScene({ background: { ...selectedScene.background, source: e.target.value } })}
        />

        <label>Text Overlays</label>
        {selectedScene.textOverlays.map((overlay, i) => (
          <TextOverlayEditor
            key={overlay.id}
            overlay={overlay}
            onUpdate={(updates) => updateOverlay(i, updates)}
            onDelete={() => deleteOverlay(i)}
          />
        ))}
        <button onClick={addOverlay}>+ Add Text Overlay</button>

        {/* Generated Image Preview */}
        {selectedScene.assets?.image && (
          <div className="generated-preview">
            <img src={selectedScene.assets.image} />
            <button onClick={() => regenerateImage(selectedScene.id)}>
              🔄 Regenerate Image
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## TESTING CHECKLIST

### Product Video Workflow
- [ ] Form inputs generate valid script
- [ ] Script correctly creates scene structure
- [ ] Asset generation completes for all scenes
- [ ] Preview shows correct timing and visuals
- [ ] Final render matches preview
- [ ] Download works for all formats

### Script-Based Workflow
- [ ] Script parser identifies scenes correctly
- [ ] Scene editing UI works (edit, reorder, delete)
- [ ] Visual direction prompts generate good images
- [ ] Voiceover timing syncs with scenes
- [ ] Long videos (3+ minutes) render successfully

### Quality Checks
- [ ] Audio levels are balanced (voiceover clear, music subtle)
- [ ] Text is readable on all backgrounds
- [ ] Transitions are smooth
- [ ] Logo watermark is visible but not distracting
- [ ] No visual artifacts or glitches

---

## BRAND DEFAULTS

```typescript
// config/brand-defaults.ts

export const PINE_HILL_FARM_BRAND: BrandSettings = {
  name: 'Pine Hill Farm',
  logoUrl: '/assets/pine-hill-farm-logo.png', // Update with actual path
  watermarkPosition: 'bottom-right',
  watermarkOpacity: 0.3,
  colors: {
    primary: '#1a4480',    // Deep blue
    secondary: '#f5f0e6',  // Warm cream
    accent: '#c9a227',     // Natural gold
    text: '#1a1a1a',       // Near black
    textLight: '#ffffff',  // White
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter',
    weight: {
      heading: 700,
      body: 400,
    },
  },
};
```

---

## PRIORITY IMPLEMENTATION ORDER

1. **Universal Schema** — Implement the TypeScript interfaces
2. **Script Parser** — Parse scripts into scenes (Claude API)
3. **Product Script Generator** — Generate scripts from form inputs (Claude API)
4. **Asset Generation** — ElevenLabs voiceover + fal.ai images
5. **Remotion Compositions** — Universal video + scene renderer
6. **Progress Tracking** — Real-time status updates
7. **Preview Player** — Remotion Player integration
8. **Render Pipeline** — Lambda render + download
9. **Scene Editor** — Manual editing capabilities
10. **Polish** — Transitions, animations, music selection

Start with the Product Video workflow as it's simpler, then extend to Script-Based.
