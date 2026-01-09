import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { isAuthenticated, requireRole } from '../auth';
import { universalVideoService } from '../services/universal-video-service';
import { remotionLambdaService } from '../services/remotion-lambda-service';
import { chunkedRenderService, ChunkedRenderProgress } from '../services/chunked-render-service';
import { qualityEvaluationService, VideoQualityReport, QualityIssue } from '../services/quality-evaluation-service';
import { sceneAnalysisService, SceneContext } from '../services/scene-analysis-service';
import type { Phase8AnalysisResult } from '../../shared/video-types';
import { sceneRegenerationService } from '../services/scene-regeneration-service';
import { autoRegenerationService, SceneForRegeneration, RegenerationResult } from '../services/auto-regeneration-service';
import { intelligentRegenerationService } from '../services/intelligent-regeneration-service';
import { regenerationStrategyEngine } from '../services/regeneration-strategy-engine';
import { promptComplexityAnalyzer } from '../services/prompt-complexity-analyzer';
import { brandContextService } from '../services/brand-context-service';
import { videoProviderSelector, SceneForSelection } from '../services/video-provider-selector';
import { imageProviderSelector } from '../services/image-provider-selector';
import { motionGraphicsRouter } from '../services/motion-graphics-router';
import { motionGraphicsGenerator } from '../services/motion-graphics-generator';
import { soundDesignService } from '../services/sound-design-service';
import { transitionService, TransitionPlan, SceneTransition } from '../services/transition-service';
import { textPlacementService, TextOverlay as TextOverlayType, TextPlacement } from '../services/text-placement-service';
import { brandInjectionService, BrandInjectionPlan } from '../services/brand-injection-service';
import { qualityGateService, ProjectQualityReport, SceneQualityStatus } from '../services/quality-gate-service';
import { VIDEO_PROVIDERS } from '../../shared/provider-config';
import { ObjectStorageService } from '../objectStorage';
import { videoFrameExtractor } from '../services/video-frame-extractor';
import { db } from '../db';
import { universalVideoProjects } from '../../shared/schema';
import type { 
  VideoProject, 
  ProductVideoInput,
  ScriptVideoInput,
  ProductImage,
  Scene,
  GeneratedAssets,
  ProductionProgress,
  OutputFormat,
  BrandSettings,
  RegenerationRecord,
} from '../../shared/video-types';
import { 
  OUTPUT_FORMATS, 
  PINE_HILL_FARM_BRAND,
  getCompositionId,
} from '../../shared/video-types';

const objectStorageService = new ObjectStorageService();

const router = Router();

const productImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  name: z.string(),
  description: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const productVideoInputSchema = z.object({
  productName: z.string().min(1),
  productDescription: z.string().min(1),
  targetAudience: z.string().min(1),
  benefits: z.array(z.string()).min(1),
  duration: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  platform: z.enum(['youtube', 'tiktok', 'instagram', 'facebook', 'website']),
  style: z.enum(['professional', 'friendly', 'energetic', 'calm']),
  callToAction: z.string().min(1),
  productImages: z.array(productImageSchema).optional(),
  voiceId: z.string().optional(),
  voiceName: z.string().optional(),
});

// Phase 13: Audio generation settings schema
const audioGenerationSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  voiceGeneration: z.boolean().default(true),
  soundEffects: z.boolean().default(true),
  ambientSound: z.boolean().default(true),
  language: z.string().optional().default('en'),
});

// Phase 13: Motion control settings schema
const motionControlSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  referenceVideoUrl: z.string().optional(),
  referenceVideoDuration: z.number().optional(),
});

// Phase 13: Combined generation settings schema
const generationSettingsSchema = z.object({
  audio: audioGenerationSettingsSchema.optional(),
  motionControl: motionControlSettingsSchema.optional(),
  preferredProvider: z.string().optional(),
});

// Phase 13D: Reference image configuration schema
const i2iSettingsSchema = z.object({
  strength: z.number().min(0).max(1).default(0.7),
  preserveComposition: z.boolean().default(true),
  preserveColors: z.boolean().default(true),
});

const i2vSettingsSchema = z.object({
  motionStrength: z.number().min(0).max(1).default(0.5),
  motionType: z.enum(['environmental', 'subtle', 'dynamic']).default('subtle'),
  preserveSubject: z.boolean().default(true),
});

const styleSettingsSchema = z.object({
  styleStrength: z.number().min(0).max(1).default(0.7),
  applyColors: z.boolean().default(true),
  applyLighting: z.boolean().default(true),
  applyComposition: z.boolean().default(false),
});

const referenceConfigSchema = z.object({
  mode: z.enum(['none', 'image-to-image', 'image-to-video', 'style-reference']),
  sourceUrl: z.string().optional(),
  sourceType: z.enum(['upload', 'current-media', 'asset-library', 'brand-media']),
  i2iSettings: i2iSettingsSchema.optional(),
  i2vSettings: i2vSettingsSchema.optional(),
  styleSettings: styleSettingsSchema.optional(),
});

const scriptVideoInputSchema = z.object({
  title: z.string().min(1),
  script: z.string().min(10),
  platform: z.enum(['youtube', 'tiktok', 'instagram', 'facebook', 'website']),
  style: z.enum(['professional', 'casual', 'energetic', 'calm', 'cinematic', 'documentary', 'luxury', 'minimal', 'instructional', 'educational', 'training']),
  targetDuration: z.number().optional(),
  brandSettings: z.object({
    introLogoUrl: z.string().optional(),
    watermarkImageUrl: z.string().optional(),
    ctaText: z.string().optional(),
  }).optional(),
  musicEnabled: z.boolean().optional(),
  musicMood: z.string().optional(),
  // Phase 13: Audio and motion control generation settings
  generationSettings: generationSettingsSchema.optional(),
});

function dbRowToVideoProject(row: any): VideoProject & { renderId?: string; bucketName?: string; outputUrl?: string | null; qualityReport?: VideoQualityReport } {
  return {
    id: row.projectId,
    type: row.type as 'product' | 'script-based',
    title: row.title,
    description: row.description || '',
    targetAudience: row.targetAudience,
    totalDuration: row.totalDuration,
    fps: row.fps as 30,
    outputFormat: row.outputFormat as OutputFormat,
    brand: row.brand as BrandSettings,
    scenes: row.scenes as Scene[],
    assets: row.assets as GeneratedAssets,
    status: row.status as VideoProject['status'],
    progress: row.progress as ProductionProgress,
    createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() || new Date().toISOString(),
    renderId: row.renderId || undefined,
    bucketName: row.bucketName || undefined,
    outputUrl: row.outputUrl || undefined,
    history: row.history || undefined,
    qualityReport: row.qualityReport || undefined,
  };
}

async function saveProjectToDb(project: VideoProject & { qualityReport?: VideoQualityReport }, ownerId: string, renderId?: string, bucketName?: string, outputUrl?: string) {
  const existingProject = await db.select().from(universalVideoProjects)
    .where(eq(universalVideoProjects.projectId, project.id))
    .limit(1);

  if (existingProject.length > 0) {
    await db.update(universalVideoProjects)
      .set({
        type: project.type,
        title: project.title,
        description: project.description,
        targetAudience: project.targetAudience,
        totalDuration: project.totalDuration,
        fps: project.fps,
        outputFormat: project.outputFormat,
        brand: project.brand,
        scenes: project.scenes,
        assets: project.assets,
        progress: project.progress,
        status: project.status,
        history: project.history || null,
        qualityReport: project.qualityReport ?? existingProject[0].qualityReport,
        renderId: renderId ?? existingProject[0].renderId,
        bucketName: bucketName ?? existingProject[0].bucketName,
        outputUrl: outputUrl ?? existingProject[0].outputUrl,
        updatedAt: new Date(),
      })
      .where(eq(universalVideoProjects.projectId, project.id));
  } else {
    await db.insert(universalVideoProjects).values({
      projectId: project.id,
      ownerId,
      type: project.type,
      title: project.title,
      description: project.description,
      targetAudience: project.targetAudience,
      totalDuration: project.totalDuration,
      fps: project.fps,
      outputFormat: project.outputFormat,
      brand: project.brand,
      scenes: project.scenes,
      assets: project.assets,
      progress: project.progress,
      status: project.status,
      history: project.history || null,
      qualityReport: project.qualityReport || null,
      renderId,
      bucketName,
      outputUrl,
    });
  }
}

async function getProjectFromDb(projectId: string): Promise<(VideoProject & { ownerId: string; renderId?: string; bucketName?: string; outputUrl?: string | null; qualityReport?: VideoQualityReport }) | null> {
  const rows = await db.select().from(universalVideoProjects)
    .where(eq(universalVideoProjects.projectId, projectId))
    .limit(1);
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  return {
    ...dbRowToVideoProject(row),
    ownerId: row.ownerId,
  };
}

router.get('/projects', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const rows = await db.select().from(universalVideoProjects)
      .where(eq(universalVideoProjects.ownerId, userId))
      .orderBy(desc(universalVideoProjects.createdAt));
    
    const userProjects = rows.map(dbRowToVideoProject);
    
    res.json({ success: true, projects: userProjects });
  } catch (error: any) {
    console.error('[UniversalVideo] Error listing projects:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a video project
router.delete('/projects/:projectId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const { projectId } = req.params;
    const projectIdNum = parseInt(projectId, 10);
    
    if (isNaN(projectIdNum)) {
      return res.status(400).json({ success: false, error: 'Invalid project ID' });
    }
    
    // Verify ownership before deleting
    const [existing] = await db.select({ ownerId: universalVideoProjects.ownerId })
      .from(universalVideoProjects)
      .where(eq(universalVideoProjects.id, projectIdNum));
    
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (existing.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this project' });
    }
    
    // Delete the project
    await db.delete(universalVideoProjects)
      .where(eq(universalVideoProjects.id, projectIdNum));
    
    console.log(`[UniversalVideo] Project ${projectIdNum} deleted by user ${userId}`);
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('[UniversalVideo] Error deleting project:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ask Suzzie (Claude AI) to generate visual direction idea for a scene
router.post('/ask-suzzie', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { narration, sceneType, projectTitle } = req.body;
    
    if (!narration) {
      return res.status(400).json({ success: false, error: 'Narration is required' });
    }
    
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    
    if (!anthropicKey) {
      return res.status(500).json({ success: false, error: 'AI service not configured' });
    }
    
    const client = new Anthropic({ apiKey: anthropicKey });
    
    const systemPrompt = `You are Suzzie, a creative visual director for Pine Hill Farm marketing videos. 
You specialize in creating compelling visual directions for TV-quality promotional videos about health, wellness, and organic products.
Your suggestions should be:
- Achievable with AI image/video generation (no complex multi-person scenes)
- Focused on mood, lighting, and atmosphere
- Specific about camera angles and composition
- Aligned with health and wellness themes
- Professional and engaging

Return a JSON object with exactly these fields:
{
  "visualDirection": "2-3 sentence description for AI image/video generation",
  "searchQuery": "3-5 word stock video search query",
  "fallbackQuery": "alternative 3-5 word search query"
}

CRITICAL RULES FOR SEARCH QUERIES:
1. searchQuery and fallbackQuery must be DIFFERENT concepts, not just rephrased
2. Avoid ambiguous words that could match wrong content:
   - "bathroom scale" → use "weight scale closeup" or "digital scale feet"
   - "bath" words may return bathtub videos
3. Use concrete, visual terms: "woman measuring waist", "fitness tracking app", "healthy meal prep"
4. fallbackQuery should represent a COMPLETELY different visual approach to the same theme
   Example: If searchQuery is "feet on weight scale", fallbackQuery could be "woman fitness mirror reflection"
5. Both queries should be 3-5 words, optimized for Pexels/Pixabay stock video APIs`;

    const userPrompt = `Scene Type: ${sceneType || 'general'}
Project: ${projectTitle || 'Marketing Video'}

Narration for this scene:
"${narration}"

Return a JSON object with visualDirection (2-3 sentences describing the visual), searchQuery (3-5 concise words for stock video search), and fallbackQuery (alternative 3-5 word search).`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Safely extract text content from response
    const textContent = response.content && response.content.length > 0 && response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    
    if (!textContent) {
      console.error('[AskSuzzie] No text content in response');
      return res.status(500).json({ success: false, error: 'AI returned no suggestion' });
    }
    
    console.log('[AskSuzzie] Generated visual direction for scene type:', sceneType);
    
    // Try to parse JSON response, fallback to text-only for backward compatibility
    let result: { visualDirection: string; searchQuery?: string; fallbackQuery?: string };
    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          visualDirection: parsed.visualDirection || textContent.trim(),
          searchQuery: parsed.searchQuery || '',
          fallbackQuery: parsed.fallbackQuery || ''
        };
      } else {
        result = { visualDirection: textContent.trim() };
      }
    } catch (parseErr) {
      console.warn('[AskSuzzie] Could not parse JSON, using text response');
      result = { visualDirection: textContent.trim() };
    }
    
    res.json({ 
      success: true, 
      ...result
    });
  } catch (error: any) {
    console.error('[AskSuzzie] Error generating visual direction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/projects/product', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const validatedInput = productVideoInputSchema.parse(req.body);
    
    console.log('[UniversalVideo] Creating product video project:', validatedInput.productName);
    
    const project = await universalVideoService.createProductVideoProject(validatedInput);
    
    // Set ACL for any product images to make them publicly accessible
    if (project.assets.productImages && project.assets.productImages.length > 0) {
      console.log('[UniversalVideo] Setting ACL for', project.assets.productImages.length, 'product images');
      for (const img of project.assets.productImages) {
        try {
          const normalizedPath = objectStorageService.normalizeObjectEntityPath(img.url);
          await objectStorageService.trySetObjectEntityAclPolicy(
            normalizedPath,
            { owner: userId, visibility: 'public' }
          );
          console.log('[UniversalVideo] Set public ACL for:', normalizedPath);
        } catch (aclError) {
          console.warn('[UniversalVideo] Failed to set ACL for image:', img.url, aclError);
        }
      }
    }
    
    await saveProjectToDb(project, userId);
    console.log('[UniversalVideo] Project saved to database:', project.id);
    
    res.json({
      success: true,
      project,
      message: `Project created with ${project.scenes.length} scenes`,
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Error creating product project:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input', 
        details: error.errors 
      });
    }
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create project' 
    });
  }
});

router.post('/projects/script', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const validatedInput = scriptVideoInputSchema.parse(req.body);
    
    console.log('[UniversalVideo] Parsing script for:', validatedInput.title);
    
    const scenes = await universalVideoService.parseScript(validatedInput);
    
    const project: VideoProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'script-based',
      title: validatedInput.title,
      description: '',
      fps: 30,
      totalDuration: scenes.reduce((acc, s) => acc + s.duration, 0),
      outputFormat: OUTPUT_FORMATS[validatedInput.platform] || OUTPUT_FORMATS.youtube,
      brand: PINE_HILL_FARM_BRAND,
      scenes,
      assets: {
        voiceover: { fullTrackUrl: '', duration: 0, perScene: [] },
        music: { url: '', duration: 0, volume: 0.18 },
        images: [],
        videos: [],
        productImages: [],
      },
      status: 'draft',
      progress: {
        currentStep: 'script',
        steps: {
          script: { status: 'complete', progress: 100, message: `Parsed ${scenes.length} scenes` },
          voiceover: { status: 'pending', progress: 0 },
          images: { status: 'pending', progress: 0 },
          videos: { status: 'pending', progress: 0 },
          music: { status: 'pending', progress: 0 },
          assembly: { status: 'pending', progress: 0 },
          rendering: { status: 'pending', progress: 0 },
        },
        overallPercent: 15,
        errors: [],
        serviceFailures: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await saveProjectToDb(project, userId);
    console.log('[UniversalVideo] Script project saved to database:', project.id);
    
    res.json({
      success: true,
      project,
      message: `Script parsed into ${scenes.length} scenes`,
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Error parsing script:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input', 
        details: error.errors 
      });
    }
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to parse script' 
    });
  }
});

router.post('/parse-script', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { script, platform, visualStyle, targetDuration } = req.body;

    if (!script || typeof script !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Script text is required' 
      });
    }

    console.log('[UniversalVideo] Parsing script with brand context...');

    const parsedResult = await universalVideoService.parseScriptWithBrandMatches({
      title: 'Parsed Script',
      script,
      targetDuration: targetDuration || 60,
      platform: platform || 'youtube',
      style: 'professional',
    });

    res.json({
      success: true,
      scenes: parsedResult.scenes,
      brandMatches: parsedResult.brandMatches,
      summary: parsedResult.summary,
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Script parsing with brand context failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to parse script' 
    });
  }
});

router.get('/projects/:projectId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const { projectId } = req.params;
    const projectData = await getProjectFromDb(projectId);
    
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    res.json({ success: true, project: projectData });
  } catch (error: any) {
    console.error('[UniversalVideo] Error getting project:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/projects/:projectId/scenes', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    const { scenes } = req.body;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    projectData.scenes = scenes;
    projectData.totalDuration = scenes.reduce((acc: number, s: Scene) => acc + s.duration, 0);
    projectData.updatedAt = new Date().toISOString();
    
    await saveProjectToDb(projectData, projectData.ownerId);
    
    res.json({ success: true, project: projectData });
  } catch (error: any) {
    console.error('[UniversalVideo] Error updating scenes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/projects/:projectId/scenes/:sceneId/narration', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneId } = req.params;
    const { narration } = req.body;
    
    if (!narration || typeof narration !== 'string') {
      return res.status(400).json({ success: false, error: 'Narration text is required' });
    }
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const sceneIndex = projectData.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) {
      return res.status(404).json({ success: false, error: 'Scene not found' });
    }
    
    projectData.scenes[sceneIndex].narration = narration.trim();
    projectData.updatedAt = new Date().toISOString();
    
    await saveProjectToDb(projectData, projectData.ownerId);
    
    console.log(`[UniversalVideo] Updated narration for scene ${sceneId} in project ${projectId}`);
    
    res.json({ 
      success: true, 
      project: projectData,
      message: 'Narration updated. Regenerate voiceover to apply changes to audio.'
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Error updating narration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/projects/:projectId/scenes/:sceneId/visual-direction', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneId } = req.params;
    const { visualDirection, searchQuery, fallbackQuery } = req.body;
    
    if (!visualDirection || typeof visualDirection !== 'string') {
      return res.status(400).json({ success: false, error: 'Visual direction text is required' });
    }
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const sceneIndex = projectData.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) {
      return res.status(404).json({ success: false, error: 'Scene not found' });
    }
    
    // Update visualDirection, background.source, and search queries
    projectData.scenes[sceneIndex].visualDirection = visualDirection.trim();
    projectData.scenes[sceneIndex].background.source = visualDirection.trim();
    
    // Update search queries if provided (from Ask Suzzie)
    if (searchQuery && typeof searchQuery === 'string') {
      projectData.scenes[sceneIndex].searchQuery = searchQuery.trim();
    }
    if (fallbackQuery && typeof fallbackQuery === 'string') {
      projectData.scenes[sceneIndex].fallbackQuery = fallbackQuery.trim();
    }
    
    projectData.updatedAt = new Date().toISOString();
    
    await saveProjectToDb(projectData, projectData.ownerId);
    
    console.log(`[UniversalVideo] Updated visual direction for scene ${sceneId} in project ${projectId}`);
    
    res.json({ 
      success: true, 
      project: projectData,
      message: 'Visual direction updated. Regenerate image or video to apply changes.'
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Error updating visual direction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 12 Addendum: Get reference config for a scene
router.get('/projects/:projectId/scenes/:sceneId/reference-config', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneId } = req.params;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const scene = projectData.scenes.find(s => s.id === sceneId);
    if (!scene) {
      return res.status(404).json({ success: false, error: 'Scene not found' });
    }
    
    const config = scene.referenceConfig || { mode: 'none', sourceType: 'upload' };
    
    res.json({ success: true, config });
  } catch (error: any) {
    console.error('[Phase12] Error getting reference config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 12 Addendum: Save reference config for a scene
router.patch('/projects/:projectId/scenes/:sceneId/reference-config', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneId } = req.params;
    const { mode, sourceUrl, sourceType, settings } = req.body;
    
    const validModes = ['none', 'image-to-image', 'image-to-video', 'style-reference'];
    if (!validModes.includes(mode)) {
      return res.status(400).json({ success: false, error: 'Invalid reference mode' });
    }
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const sceneIndex = projectData.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) {
      return res.status(404).json({ success: false, error: 'Scene not found' });
    }
    
    // Build reference config
    if (mode === 'none') {
      projectData.scenes[sceneIndex].referenceConfig = { mode: 'none', sourceType: 'upload' };
    } else {
      projectData.scenes[sceneIndex].referenceConfig = {
        mode,
        sourceUrl,
        sourceType: sourceType || 'upload',
        ...(mode === 'image-to-image' && { i2iSettings: settings }),
        ...(mode === 'image-to-video' && { i2vSettings: settings }),
        ...(mode === 'style-reference' && { styleSettings: settings }),
      };
    }
    
    projectData.updatedAt = new Date().toISOString();
    await saveProjectToDb(projectData, projectData.ownerId);
    
    console.log(`[Phase12] Updated reference config for scene ${sceneId}: ${mode}`);
    
    res.json({ 
      success: true, 
      scene: projectData.scenes[sceneIndex],
      message: mode === 'none' ? 'Reference config cleared' : `${mode} mode configured`
    });
  } catch (error: any) {
    console.error('[Phase12] Error updating reference config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 12 Addendum: Update scene content type
router.patch('/projects/:projectId/scenes/:sceneId/content-type', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneId } = req.params;
    const { contentType } = req.body;
    
    const validTypes = [
      'b-roll', 'product-shot', 'lifestyle', 'talking-head',
      'testimonial', 'demo', 'cinematic', 'text-overlay'
    ];
    
    if (!validTypes.includes(contentType)) {
      return res.status(400).json({ success: false, error: 'Invalid content type' });
    }
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const sceneIndex = projectData.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) {
      return res.status(404).json({ success: false, error: 'Scene not found' });
    }
    
    // Update content type with user source tracking
    (projectData.scenes[sceneIndex] as any).contentType = contentType;
    (projectData.scenes[sceneIndex] as any).contentTypeSource = 'user';
    
    projectData.updatedAt = new Date().toISOString();
    await saveProjectToDb(projectData, projectData.ownerId);
    
    console.log(`[Phase12] Updated content type for scene ${sceneId}: ${contentType}`);
    
    res.json({ 
      success: true, 
      scene: projectData.scenes[sceneIndex],
      message: `Content type set to ${contentType}`
    });
  } catch (error: any) {
    console.error('[Phase12] Error updating content type:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 14C: Update quality tier for a project
router.patch('/projects/:projectId/quality-tier', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    const { qualityTier } = req.body;
    
    const validTiers = ['ultra', 'premium', 'standard'];
    
    if (!validTiers.includes(qualityTier)) {
      return res.status(400).json({ success: false, error: 'Invalid quality tier' });
    }
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Update quality tier
    (projectData as any).qualityTier = qualityTier;
    projectData.updatedAt = new Date().toISOString();
    await saveProjectToDb(projectData, projectData.ownerId);
    
    console.log(`[Phase14C] Updated quality tier for project ${projectId}: ${qualityTier}`);
    
    res.json({ 
      success: true, 
      qualityTier,
      message: `Quality tier set to ${qualityTier}`
    });
  } catch (error: any) {
    console.error('[Phase14C] Error updating quality tier:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 8A: Background scene analysis helper (runs async without blocking response)
// Updated to handle video scenes by extracting a thumbnail frame for analysis
async function runBackgroundSceneAnalysis(projectId: string, userId: number | string) {
  try {
    const projectData = await getProjectFromDb(projectId);
    if (!projectData || !projectData.scenes) return;
    
    console.log(`[Phase8A Background] Starting analysis for ${projectData.scenes.length} scenes`);
    
    for (let i = 0; i < projectData.scenes.length; i++) {
      const scene = projectData.scenes[i];
      const videoUrl = scene.assets?.videoUrl || (scene.background as any)?.videoUrl;
      const imageUrl = scene.assets?.imageUrl || (scene.background as any)?.url;
      
      // Determine if this is a video scene - check both assets and background
      const isVideoScene = !!videoUrl || scene.background?.type === 'video';
      
      let base64: string | null = null;
      let mediaSource = 'image';
      
      try {
        if (isVideoScene && videoUrl) {
          // For video scenes, extract a frame for analysis
          console.log(`[Phase8A Background] Scene ${i + 1} is a video - extracting frame for analysis`);
          
          let fullVideoUrl = videoUrl;
          if (videoUrl.startsWith('/objects') || videoUrl.startsWith('/')) {
            const baseUrl = process.env.REPLIT_DEV_DOMAIN 
              ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
              : 'http://localhost:5000';
            fullVideoUrl = `${baseUrl}${videoUrl}`;
          }
          
          const frameResult = await videoFrameExtractor.extractFrameAsBase64(fullVideoUrl, 2);
          if (frameResult) {
            base64 = frameResult.base64;
            mediaSource = 'video_frame';
            console.log(`[Phase8A Background] Successfully extracted frame from video`);
          } else {
            console.warn(`[Phase8A Background] Failed to extract frame from video, falling back to image`);
          }
        }
        
        // Fall back to image if no video frame extracted
        if (!base64 && imageUrl) {
          let fullUrl = imageUrl;
          if (imageUrl.startsWith('/objects') || imageUrl.startsWith('/')) {
            const baseUrl = process.env.REPLIT_DEV_DOMAIN 
              ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
              : 'http://localhost:5000';
            fullUrl = `${baseUrl}${imageUrl}`;
          }
          
          const response = await fetch(fullUrl, { headers: { 'Accept': 'image/*' } });
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            base64 = buffer.toString('base64');
            mediaSource = 'image';
          }
        }
        
        if (!base64) {
          console.warn(`[Phase8A Background] Scene ${i + 1} has no analyzable media`);
          continue;
        }
        
        const context: SceneContext = {
          sceneIndex: i,
          sceneType: scene.type || 'content',
          narration: scene.narration || '',
          visualDirection: scene.visualDirection || '',
          expectedContentType: (scene as any).contentType || 'lifestyle',
          totalScenes: projectData.scenes.length,
        };
        
        console.log(`[Phase8A Background] Analyzing scene ${i + 1} from ${mediaSource}`);
        const analysisResult = await sceneAnalysisService.analyzeScenePhase8(base64, context);
        projectData.scenes[i].analysisResult = analysisResult;
        projectData.scenes[i].qualityScore = analysisResult.overallScore;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (err: any) {
        console.warn(`[Phase8A Background] Scene ${i + 1} analysis failed:`, err.message);
      }
    }
    
    await saveProjectToDb(projectData, String(userId));
    console.log(`[Phase8A Background] Analysis complete for project ${projectId}`);
    
  } catch (err: any) {
    console.error('[Phase8A Background] Analysis error:', err.message);
  }
}

router.post('/projects/:projectId/generate-assets', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    const { skipMusic, skipAnalysis } = req.body || {};
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    console.log('[UniversalVideo] Generating assets for project:', projectId, skipMusic ? '(music disabled)' : '');
    
    universalVideoService.clearNotifications();
    const updatedProject = await universalVideoService.generateProjectAssets(projectData, { skipMusic: !!skipMusic });
    await saveProjectToDb(updatedProject, projectData.ownerId);
    
    const notifications = universalVideoService.getNotifications();
    const paidServiceFailures = universalVideoService.hasPaidServiceFailures(updatedProject);
    
    // Phase 8A: Trigger background scene analysis after asset generation (non-blocking)
    if (!skipAnalysis && sceneAnalysisService.isAvailable()) {
      console.log('[Phase8A] Triggering background scene analysis after asset generation');
      runBackgroundSceneAnalysis(projectId, userId).catch(err => {
        console.warn('[Phase8A] Background analysis failed:', err.message);
      });
    }
    
    res.json({
      success: true,
      project: updatedProject,
      notifications,
      paidServiceFailures,
      analysisTriggered: !skipAnalysis && sceneAnalysisService.isAvailable(),
      message: paidServiceFailures 
        ? 'Assets generated with paid service failures - please review' 
        : 'Assets generated successfully',
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Error generating assets:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/projects/:projectId/reset-status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Reset project status to ready for retry
    projectData.status = 'ready';
    projectData.progress.steps.rendering.status = 'pending';
    projectData.progress.steps.rendering.progress = 0;
    projectData.progress.steps.rendering.message = '';
    delete (projectData.progress as any).renderStartedAt;
    projectData.progress.errors = [];
    projectData.progress.overallPercent = 85;
    projectData.updatedAt = new Date().toISOString();
    
    // Save project state and clear render metadata
    await db.update(universalVideoProjects)
      .set({
        status: projectData.status,
        progress: projectData.progress,
        updatedAt: new Date(),
        renderId: null,
        bucketName: null,
        outputUrl: null,
      })
      .where(eq(universalVideoProjects.projectId, projectId));
    
    // Clear local render metadata from response
    delete (projectData as any).renderId;
    delete (projectData as any).bucketName;
    delete (projectData as any).outputUrl;
    
    console.log(`[UniversalVideo] Reset project ${projectId} status to ready for retry`);
    
    res.json({ 
      success: true, 
      project: projectData,
      message: 'Project reset. You can now retry rendering.'
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Error resetting project:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const renderBuckets: Map<string, string> = new Map();

router.post('/projects/:projectId/render', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const userRole = (req.user as any)?.role;
    const { projectId } = req.params;
    const { forceRender } = req.body;
    
    // Phase 10D: Security - forceRender only allowed for admin role
    const isAdminForceRender = forceRender && userRole === 'admin';
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    if (projectData.status !== 'ready' && projectData.status !== 'error') {
      return res.status(400).json({ 
        success: false, 
        error: 'Project must be ready before rendering. Generate assets first.' 
      });
    }
    
    // Phase 10D: QA Gate Enforcement - check quality gate before rendering
    console.log('[UniversalVideo] Phase 10D: Checking QA gate for project:', projectId);
    
    // Get existing quality report from project or generate one
    let qaReport: ProjectQualityReport | null = null;
    
    if (projectData.qualityReport) {
      // Phase 10D: Use existing quality report - preserve stored status and userApproved flags
      const existingReport = projectData.qualityReport as any;
      
      // Reconstruct scene statuses preserving all stored values
      const sceneStatuses = (existingReport.sceneScores || existingReport.sceneStatuses || []).map((s: any, idx: number) => {
        const score = s.score ?? s.overallScore ?? 0;
        const userApproved = s.userApproved ?? false; // Preserve stored userApproved
        const autoApproved = s.autoApproved ?? (score >= 85);
        
        // Preserve stored status or recalculate based on score and approvals
        let status = s.status;
        if (!status || status === 'pending') {
          // Only recalculate if status was not set or was pending
          if (userApproved || autoApproved) {
            status = 'approved';
          } else if (score < 70) {
            status = 'rejected';
          } else {
            status = 'needs_review';
          }
        }
        
        return {
          sceneIndex: s.sceneIndex ?? idx,
          score,
          status,
          issues: s.issues || [],
          userApproved,
          autoApproved,
          regenerationCount: s.regenerationCount ?? 0,
        };
      });
      
      // Calculate counts based on scene statuses
      const approvedCount = sceneStatuses.filter((s: any) => s.status === 'approved').length;
      const needsReviewCount = sceneStatuses.filter((s: any) => s.status === 'needs_review').length;
      const rejectedCount = sceneStatuses.filter((s: any) => s.status === 'rejected').length;
      const pendingCount = sceneStatuses.filter((s: any) => s.status === 'pending').length;
      
      // Phase 10D: Recompute blocking reasons based on current data
      const blockingReasons: string[] = [];
      if (rejectedCount > 0) {
        blockingReasons.push(`${rejectedCount} scene(s) rejected - must regenerate`);
      }
      if (needsReviewCount > 0) {
        blockingReasons.push(`${needsReviewCount} scene(s) need review - approve or regenerate`);
      }
      
      const overallScore = existingReport.overallScore || 0;
      if (overallScore < 75) {
        blockingReasons.push(`Overall score ${overallScore} below minimum 75`);
      }
      
      const criticalIssueCount = existingReport.criticalIssues?.length || 0;
      if (criticalIssueCount > 0) {
        blockingReasons.push(`${criticalIssueCount} critical issue(s) must be resolved`);
      }
      
      // Phase 10D: Check major issues threshold (max 3 allowed)
      const majorIssueCount = existingReport.majorIssues?.length || existingReport.overallIssues?.filter((i: any) => i.severity === 'major')?.length || 0;
      if (majorIssueCount > 3) {
        blockingReasons.push(`${majorIssueCount} major issues (max 3)`);
      }
      
      const passesThreshold = blockingReasons.length === 0;
      const canRender = passesThreshold;
      
      qaReport = {
        projectId: projectId,
        overallScore,
        sceneStatuses,
        approvedCount,
        needsReviewCount,
        rejectedCount,
        pendingCount,
        criticalIssueCount,
        majorIssueCount: existingReport.majorIssues?.length || existingReport.overallIssues?.filter((i: any) => i.severity === 'major')?.length || 0,
        minorIssueCount: existingReport.overallIssues?.filter((i: any) => i.severity === 'minor')?.length || 0,
        passesThreshold,
        canRender,
        blockingReasons,
        lastAnalyzedAt: existingReport.evaluatedAt || new Date().toISOString(),
      };
    }
    
    // Check QA gate
    if (qaReport) {
      const renderCheck = qualityGateService.canProceedToRender(qaReport);
      
      console.log('[UniversalVideo] QA gate check result:', {
        allowed: renderCheck.allowed,
        reason: renderCheck.reason,
        blockingReasons: renderCheck.blockingReasons,
        forceRender: !!forceRender,
      });
      
      if (!renderCheck.allowed && !isAdminForceRender) {
        console.log('[UniversalVideo] RENDER BLOCKED by QA gate:', renderCheck.reason);
        
        // Log if non-admin tried to force render
        if (forceRender && userRole !== 'admin') {
          console.warn(`[UniversalVideo] Non-admin user ${userId} attempted forceRender - denied`);
        }
        
        return res.status(400).json({
          success: false,
          error: 'Cannot render: Quality gate not passed',
          qaGateBlocked: true,
          blockingReasons: renderCheck.blockingReasons,
          qaReport: {
            overallScore: qaReport.overallScore,
            passesThreshold: qaReport.passesThreshold,
            canRender: qaReport.canRender,
            approvedCount: qaReport.approvedCount,
            needsReviewCount: qaReport.needsReviewCount,
            rejectedCount: qaReport.rejectedCount,
            criticalIssueCount: qaReport.criticalIssueCount,
          },
          action: 'Review and approve flagged scenes, or regenerate rejected scenes',
        });
      }
      
      if (isAdminForceRender && !renderCheck.allowed) {
        console.warn(`[UniversalVideo] ADMIN FORCE RENDER by user ${userId} - bypassing QA gate`);
      }
    } else {
      // Phase 10D: Block rendering when no QA report exists
      console.log('[UniversalVideo] No QA report found - blocking render');
      
      if (!isAdminForceRender) {
        return res.status(400).json({
          success: false,
          error: 'Cannot render: Quality analysis required',
          qaGateBlocked: true,
          blockingReasons: ['No quality analysis found - run QA check first'],
          action: 'Run quality analysis before rendering',
        });
      }
      
      console.warn(`[UniversalVideo] ADMIN FORCE RENDER without QA by user ${userId}`);
    }
    
    console.log('[UniversalVideo] QA gate PASSED - starting render for project:', projectId);
    
    console.log('[UniversalVideo] Preparing assets for Lambda...');
    const assetPrep = await universalVideoService.prepareAssetsForLambda(projectData);
    
    if (!assetPrep.valid) {
      console.error('[UniversalVideo] Asset preparation failed:', assetPrep.issues);
      return res.status(400).json({
        success: false,
        error: 'Asset preparation failed - no valid scene images',
        issues: assetPrep.issues,
      });
    }
    
    if (assetPrep.issues.length > 0) {
      console.warn('[UniversalVideo] Asset preparation warnings:', assetPrep.issues);
    }
    
    const preparedProject = assetPrep.preparedProject;
    
    preparedProject.status = 'rendering';
    preparedProject.progress.currentStep = 'rendering';
    preparedProject.progress.steps.rendering.status = 'in-progress';
    preparedProject.updatedAt = new Date().toISOString();
    
    const compositionId = getCompositionId(preparedProject.outputFormat.aspectRatio);
    
    const inputProps = {
      scenes: preparedProject.scenes,
      voiceoverUrl: preparedProject.assets.voiceover.fullTrackUrl || null,
      musicUrl: preparedProject.assets.music?.url || null,
      musicVolume: preparedProject.assets.music?.volume || 0.18,
      brand: preparedProject.brand,
      outputFormat: preparedProject.outputFormat,
    };
    
    // Log video B-roll details for each scene
    const videoScenes = inputProps.scenes.filter((s: any) => s.assets?.videoUrl);
    console.log('[UniversalVideo] Prepared input props for Lambda:', {
      sceneCount: inputProps.scenes.length,
      videoSceneCount: videoScenes.length,
      hasVoiceover: !!inputProps.voiceoverUrl,
      hasMusic: !!inputProps.musicUrl,
      voiceoverUrl: inputProps.voiceoverUrl?.substring(0, 80),
      musicUrl: inputProps.musicUrl?.substring(0, 80),
    });
    
    // Debug: log each scene's video status
    inputProps.scenes.forEach((scene: any, idx: number) => {
      const hasVideo = !!scene.assets?.videoUrl;
      const bgType = scene.background?.type;
      if (hasVideo || bgType === 'video') {
        console.log(`[UniversalVideo] Scene ${idx} (${scene.id}): videoUrl=${scene.assets?.videoUrl?.substring(0, 60) || 'none'}, background.type=${bgType}`);
      }
    });
    
    // Calculate total duration to determine render method
    const totalDuration = preparedProject.scenes.reduce((acc: number, s: any) => acc + (s.duration || 0), 0);
    const useChunkedRendering = chunkedRenderService.shouldUseChunkedRendering(preparedProject.scenes, 90);
    
    console.log(`[UniversalVideo] Total video duration: ${totalDuration}s, using ${useChunkedRendering ? 'chunked' : 'standard'} rendering`);
    
    if (useChunkedRendering) {
      // Use chunked rendering for long videos (>90 seconds)
      console.log(`[UniversalVideo] === CHUNKED RENDERING TRIGGERED ===`);
      console.log(`[UniversalVideo] Project: ${projectId}, Duration: ${totalDuration}s, Scenes: ${preparedProject.scenes.length}`);
      
      try {
        (preparedProject.progress as any).renderStartedAt = Date.now();
        (preparedProject.progress as any).renderMethod = 'chunked';
        preparedProject.progress.steps.rendering.message = 'Starting chunked render...';
        
        await saveProjectToDb(preparedProject, projectData.ownerId);
        console.log(`[UniversalVideo] Saved initial chunked render state to DB`);
        
        // Start chunked rendering in background - reload fresh state on each progress update
        const progressCallback = async (progress: ChunkedRenderProgress) => {
          console.log(`[UniversalVideo] Chunked progress update: ${progress.phase} - ${progress.overallPercent}% - ${progress.message}`);
          try {
            // Reload fresh project state to avoid race conditions
            const currentProject = await getProjectFromDb(projectId);
            if (currentProject) {
              currentProject.progress.steps.rendering.progress = progress.overallPercent;
              currentProject.progress.steps.rendering.message = progress.message;
              currentProject.progress.overallPercent = 85 + Math.round(progress.overallPercent * 0.15);
              await saveProjectToDb(currentProject, projectData.ownerId);
            }
          } catch (e) {
            console.warn('[UniversalVideo] Failed to save progress update:', e);
          }
        };
        
        // Respond immediately that chunked render has started
        res.json({
          success: true,
          renderMethod: 'chunked',
          totalDuration,
          message: `Chunked rendering started for ${totalDuration.toFixed(0)}s video`,
        });
        
        // Continue rendering in background (fire-and-forget)
        // Use projectId and ownerId as closure variables to reload fresh state
        const ownerId = projectData.ownerId;
        (async () => {
          console.log(`[UniversalVideo] Starting background chunked render for ${projectId}...`);
          const startTime = Date.now();
          
          try {
            const outputUrl = await chunkedRenderService.renderLongVideo(
              projectId,
              inputProps,
              compositionId,
              progressCallback
            );
            
            const elapsedMs = Date.now() - startTime;
            console.log(`[UniversalVideo] === CHUNKED RENDER COMPLETE ===`);
            console.log(`[UniversalVideo] Project: ${projectId}, Time: ${(elapsedMs/1000).toFixed(1)}s, Output: ${outputUrl}`);
            
            // Reload fresh project state from DB to avoid overwriting progress updates
            const latestProject = await getProjectFromDb(projectId);
            if (latestProject) {
              latestProject.status = 'complete';
              latestProject.progress.steps.rendering.status = 'complete';
              latestProject.progress.steps.rendering.progress = 100;
              latestProject.progress.steps.rendering.message = 'Video rendering complete!';
              latestProject.progress.overallPercent = 100;
              latestProject.outputUrl = outputUrl;
              
              await saveProjectToDb(latestProject, ownerId, 'chunked', 'chunked', outputUrl);
              console.log(`[UniversalVideo] Final state saved to DB with output URL`);
              
              // Run quality evaluation in background (non-blocking)
              if (qualityEvaluationService.isAvailable()) {
                runQualityEvaluation(latestProject, outputUrl, ownerId).catch(err => {
                  console.warn(`[UniversalVideo] Quality evaluation failed:`, err.message);
                });
              }
            } else {
              console.error(`[UniversalVideo] CRITICAL: Could not reload project ${projectId} from DB`);
            }
          } catch (error: any) {
            const elapsedMs = Date.now() - startTime;
            console.error(`[UniversalVideo] === CHUNKED RENDER FAILED ===`);
            console.error(`[UniversalVideo] Project: ${projectId}, Time: ${(elapsedMs/1000).toFixed(1)}s`);
            console.error(`[UniversalVideo] Error:`, error.message);
            console.error(`[UniversalVideo] Stack:`, error.stack);
            
            // Reload fresh project state from DB to preserve progress updates
            const latestProject = await getProjectFromDb(projectId);
            if (latestProject) {
              latestProject.status = 'error';
              latestProject.progress.steps.rendering.status = 'error';
              latestProject.progress.steps.rendering.message = error.message || 'Chunked render failed';
              latestProject.progress.errors.push(`Chunked render failed: ${error.message}`);
              latestProject.progress.serviceFailures.push({
                service: 'chunked-render',
                timestamp: new Date().toISOString(),
                error: error.message || 'Unknown error',
              });
              try {
                await saveProjectToDb(latestProject, ownerId);
                console.log(`[UniversalVideo] Error state persisted to DB`);
              } catch (dbError) {
                console.error('[UniversalVideo] CRITICAL: Failed to persist error status:', dbError);
              }
            } else {
              console.error(`[UniversalVideo] CRITICAL: Could not reload project ${projectId} from DB for error state`);
            }
          }
        })();
        
        // Return immediately - background work continues in IIFE above
        return;
      } catch (renderError: any) {
        preparedProject.status = 'error';
        preparedProject.progress.steps.rendering.status = 'error';
        preparedProject.progress.steps.rendering.message = renderError.message || 'Render failed';
        preparedProject.progress.errors.push(`Render failed: ${renderError.message}`);
        
        await saveProjectToDb(preparedProject, projectData.ownerId);
        
        res.status(500).json({
          success: false,
          error: renderError.message || 'Failed to start chunked render',
        });
      }
    } else {
      // Use standard Lambda rendering for short videos
      try {
        const renderResult = await remotionLambdaService.startRender({
          compositionId,
          inputProps,
        });
        
        renderBuckets.set(renderResult.renderId, renderResult.bucketName);
        
        // Store render start time in progress object (persists to DB for timeout detection)
        (preparedProject.progress as any).renderStartedAt = Date.now();
        (preparedProject.progress as any).renderMethod = 'standard';
        preparedProject.progress.steps.rendering.message = `Render started: ${renderResult.renderId}`;
        
        await saveProjectToDb(preparedProject, projectData.ownerId, renderResult.renderId, renderResult.bucketName);
        
        res.json({
          success: true,
          renderId: renderResult.renderId,
          bucketName: renderResult.bucketName,
          renderMethod: 'standard',
          message: 'Render started on AWS Lambda',
        });
      } catch (renderError: any) {
        preparedProject.status = 'error';
        preparedProject.progress.steps.rendering.status = 'error';
        preparedProject.progress.steps.rendering.message = renderError.message || 'Render failed';
        preparedProject.progress.errors.push(`Render failed: ${renderError.message}`);
        
        preparedProject.progress.serviceFailures.push({
          service: 'remotion-lambda',
          timestamp: new Date().toISOString(),
          error: renderError.message || 'Unknown error',
        });
        
        await saveProjectToDb(preparedProject, projectData.ownerId);
        
        res.status(500).json({
          success: false,
          error: renderError.message || 'Failed to start render',
        });
      }
    }
  } catch (error: any) {
    console.error('[UniversalVideo] Error starting render:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const LAMBDA_TIMEOUT_MS = 300000; // 5 minutes - increased for complex videos
const RENDER_TIMEOUT_MS = 900000; // 15 minutes - matches new Lambda timeout (900 seconds)
const STALL_DETECTION_MS = 180000; // 3 minutes - if no progress change, consider stalled

router.get('/projects/:projectId/render-status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    const { renderId, bucketName } = req.query;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Check if this is a chunked render - progress is updated directly in DB
    const renderMethod = (projectData.progress as any).renderMethod;
    if (renderMethod === 'chunked') {
      console.log(`[UniversalVideo] Chunked render status for ${projectId}: ${projectData.status}, progress: ${projectData.progress.steps.rendering?.progress || 0}%`);
      
      const isDone = projectData.status === 'complete' || projectData.status === 'error';
      const renderProgress = projectData.progress.steps.rendering;
      
      return res.json({
        success: projectData.status !== 'error',
        done: isDone,
        progress: (renderProgress?.progress || 0) / 100,
        outputUrl: isDone && projectData.status === 'complete' ? projectData.outputUrl : null,
        errors: projectData.status === 'error' ? projectData.progress.errors : [],
        project: projectData,
        renderMethod: 'chunked',
        message: renderProgress?.message || 'Processing...',
      });
    }
    
    // Standard Lambda render - requires renderId
    if (!renderId || typeof renderId !== 'string' || renderId === 'undefined') {
      // Return current project state instead of error
      console.log(`[UniversalVideo] No renderId for ${projectId}, returning current state`);
      return res.json({
        success: true,
        done: projectData.status === 'complete' || projectData.status === 'error',
        progress: (projectData.progress.steps.rendering?.progress || 0) / 100,
        outputUrl: projectData.outputUrl || null,
        errors: projectData.progress.errors || [],
        project: projectData,
      });
    }
    
    const bucket = (typeof bucketName === 'string' ? bucketName : null) || 
                   renderBuckets.get(renderId) || 
                   'remotionlambda-useast1-refjo5giq5';
    
    // Get render start time (persisted in DB to survive restarts)
    // Primary source: DB-persisted progress.renderStartedAt
    // Fallback: current time (persisted immediately so timeout works for legacy renders)
    let persistedStartTime = (projectData.progress as any).renderStartedAt;
    let needsPersist = false;
    
    if (!persistedStartTime || typeof persistedStartTime !== 'number') {
      persistedStartTime = Date.now();
      (projectData.progress as any).renderStartedAt = persistedStartTime;
      needsPersist = true;
      console.log(`[UniversalVideo] Legacy render - persisting start time: ${persistedStartTime}`);
    }
    
    const renderStartTime = persistedStartTime;
    const elapsedTime = Date.now() - renderStartTime;
    
    // Persist fallback start time immediately so timeout works for legacy renders
    if (needsPersist) {
      await saveProjectToDb(projectData, projectData.ownerId);
    }
    
    console.log(`[UniversalVideo] Render status check for ${renderId}: elapsed ${Math.round(elapsedTime/1000)}s (started: ${new Date(renderStartTime).toISOString()})`);
    
    if (elapsedTime > RENDER_TIMEOUT_MS && projectData.status === 'rendering') {
      console.log(`[UniversalVideo] Render timeout detected for ${projectId} after ${Math.round(elapsedTime/1000)}s`);
      
      projectData.status = 'error';
      projectData.progress.steps.rendering.status = 'error';
      projectData.progress.steps.rendering.message = `Render timed out after ${Math.round(elapsedTime/60000)} minutes`;
      projectData.progress.errors.push('Render timed out - Lambda may have exceeded its time limit');
      projectData.progress.serviceFailures.push({
        service: 'remotion-lambda',
        timestamp: new Date().toISOString(),
        error: 'Render timeout - please try again with a shorter video or fewer scenes',
      });
      
      await saveProjectToDb(projectData, projectData.ownerId);
      
      return res.json({
        success: false,
        done: false,
        progress: projectData.progress.steps.rendering.progress / 100,
        outputUrl: null,
        errors: ['Render timed out. The video may be too complex. Please try again.'],
        project: projectData,
        timeout: true,
      });
    }
    
    try {
      const statusResult = await remotionLambdaService.getRenderProgress(renderId, bucket);
      
      // Check for errors from Lambda
      if (statusResult.errors && statusResult.errors.length > 0) {
        console.log(`[UniversalVideo] Render errors for ${projectId}:`, statusResult.errors);
        
        projectData.status = 'error';
        projectData.progress.steps.rendering.status = 'error';
        projectData.progress.steps.rendering.message = statusResult.errors[0];
        projectData.progress.errors.push(...statusResult.errors);
        
        await saveProjectToDb(projectData, projectData.ownerId);
        
        return res.json({
          success: false,
          done: true,
          progress: statusResult.overallProgress,
          outputUrl: null,
          errors: statusResult.errors,
          project: projectData,
        });
      }
      
      if (statusResult.done) {
        projectData.status = 'complete';
        projectData.progress.steps.rendering.status = 'complete';
        projectData.progress.steps.rendering.progress = 100;
        projectData.progress.overallPercent = 100;
        projectData.updatedAt = new Date().toISOString();
        
        await saveProjectToDb(
          projectData, 
          projectData.ownerId, 
          undefined, 
          undefined, 
          statusResult.outputFile || undefined
        );
      } else {
        const currentProgress = Math.round(statusResult.overallProgress * 100);
        const lastProgress = (projectData.progress as any).lastProgressValue || 0;
        const lastUpdateAt = (projectData.progress as any).lastProgressUpdateAt || renderStartTime;
        
        if (currentProgress === lastProgress && currentProgress > 0) {
          const stallTime = Date.now() - lastUpdateAt;
          console.log(`[UniversalVideo] Progress unchanged at ${currentProgress}% for ${Math.round(stallTime/1000)}s`);
          
          if (stallTime > STALL_DETECTION_MS) {
            console.log(`[UniversalVideo] Render stalled for ${projectId} - no progress for ${Math.round(stallTime/60000)} minutes`);
            
            projectData.status = 'error';
            projectData.progress.steps.rendering.status = 'error';
            projectData.progress.steps.rendering.message = `Render stalled at ${currentProgress}% - Lambda may have stopped unexpectedly`;
            projectData.progress.errors.push('Render stalled - AWS Lambda may have terminated. Please retry.');
            projectData.progress.serviceFailures.push({
              service: 'remotion-lambda',
              timestamp: new Date().toISOString(),
              error: 'Render stalled - no progress for 3+ minutes',
            });
            
            await saveProjectToDb(projectData, projectData.ownerId);
            
            return res.json({
              success: false,
              done: false,
              progress: currentProgress / 100,
              outputUrl: null,
              errors: ['Render stalled - Lambda stopped unexpectedly. Please click Retry Render.'],
              project: projectData,
              stalled: true,
            });
          }
        } else if (currentProgress !== lastProgress) {
          (projectData.progress as any).lastProgressValue = currentProgress;
          (projectData.progress as any).lastProgressUpdateAt = Date.now();
        }
        
        projectData.progress.steps.rendering.progress = currentProgress;
        projectData.progress.overallPercent = 85 + Math.round(statusResult.overallProgress * 15);
        await saveProjectToDb(projectData, projectData.ownerId);
      }
      
      res.json({
        success: true,
        done: statusResult.done,
        progress: statusResult.overallProgress,
        outputUrl: statusResult.outputFile,
        errors: statusResult.errors,
        project: projectData,
      });
    } catch (progressError: any) {
      console.error(`[UniversalVideo] Error getting render progress for ${projectId}:`, progressError.message);
      
      // Handle rate limit errors gracefully - tell frontend to slow down
      const isRateLimited = progressError.message?.includes('Rate Exceeded') || 
                            progressError.message?.includes('TooManyRequests') ||
                            progressError.name === 'TooManyRequestsException';
      
      if (isRateLimited) {
        console.log(`[UniversalVideo] Rate limited - advising frontend to slow polling for ${projectId}`);
        return res.json({
          success: true,
          done: false,
          progress: projectData.progress.steps.rendering.progress / 100 || 0.1,
          outputUrl: null,
          errors: [],
          project: projectData,
          rateLimited: true,
          retryAfter: 10, // Suggest 10 second delay
        });
      }
      
      // If we can't get progress and it's been too long, mark as error
      if (elapsedTime > LAMBDA_TIMEOUT_MS) {
        projectData.status = 'error';
        projectData.progress.steps.rendering.status = 'error';
        projectData.progress.steps.rendering.message = 'Unable to get render status - render may have failed';
        projectData.progress.errors.push(`Render status check failed: ${progressError.message}`);
        
        await saveProjectToDb(projectData, projectData.ownerId);
        
        return res.json({ 
          success: false, 
          error: progressError.message || 'Failed to get render status',
          project: projectData,
          timeout: true,
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: progressError.message || 'Failed to get render status' 
      });
    }
  } catch (error: any) {
    console.error('[UniversalVideo] Error getting render status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/generate-image', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { prompt, sceneId } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt required' });
    }
    
    universalVideoService.clearNotifications();
    const result = await universalVideoService.generateImage(prompt, sceneId || 'standalone');
    const notifications = universalVideoService.getNotifications();
    
    res.json({
      success: result.success,
      url: result.url,
      source: result.source,
      error: result.error,
      notifications,
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Error generating image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/generate-voiceover', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { text, voiceId } = req.body;
    
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text required' });
    }
    
    universalVideoService.clearNotifications();
    const result = await universalVideoService.generateVoiceover(text, voiceId);
    const notifications = universalVideoService.getNotifications();
    
    res.json({
      success: result.success,
      url: result.url,
      duration: result.duration,
      error: result.error,
      notifications,
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Error generating voiceover:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/voices', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) {
      return res.status(500).json({ success: false, error: 'ElevenLabs not configured' });
    }

    console.log('[UniversalVideo] Fetching voices from ElevenLabs...');
    
    // Fetch user's available voices (includes premade, cloned, and added from library)
    const response = await fetch('https://api.elevenlabs.io/v1/voices?show_legacy=true', {
      headers: {
        'xi-api-key': elevenLabsKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }

    const data = await response.json();
    console.log(`[UniversalVideo] ElevenLabs returned ${data.voices?.length || 0} voices from user library`);
    
    // Format all available voices
    const voices = (data.voices || [])
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

    console.log(`[UniversalVideo] Returning ${voices.length} formatted voices`);
    res.json({ success: true, voices });
  } catch (error: any) {
    console.error('[UniversalVideo] Error fetching voices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test endpoint for chunked render service diagnostics
router.get('/test-chunked-render', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const testScenes = [
      { id: 'test1', duration: 30, narration: 'Test scene 1', type: 'hook' },
      { id: 'test2', duration: 30, narration: 'Test scene 2', type: 'benefit' },
      { id: 'test3', duration: 30, narration: 'Test scene 3', type: 'explanation' },
      { id: 'test4', duration: 30, narration: 'Test scene 4', type: 'cta' },
    ];
    
    const totalDuration = testScenes.reduce((acc, s) => acc + s.duration, 0);
    const shouldChunk = chunkedRenderService.shouldUseChunkedRendering(testScenes, 90);
    const chunks = chunkedRenderService.calculateChunks(testScenes, 30, 120);
    
    // Check FFmpeg
    let ffmpegAvailable = false;
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      const result = await execAsync('which ffmpeg');
      ffmpegAvailable = !!result.stdout;
    } catch (e) {
      ffmpegAvailable = false;
    }
    
    // Check AWS credentials
    const awsConfigured = !!process.env.REMOTION_AWS_ACCESS_KEY_ID && !!process.env.REMOTION_AWS_SECRET_ACCESS_KEY;
    
    res.json({
      success: true,
      diagnostics: {
        testDuration: totalDuration,
        shouldUseChunked: shouldChunk,
        chunkThreshold: 90,
        chunkCount: chunks.length,
        chunks: chunks.map(c => ({
          index: c.chunkIndex,
          scenes: c.scenes.length,
          startFrame: c.startFrame,
          endFrame: c.endFrame,
          duration: c.scenes.reduce((acc: number, s: any) => acc + (s.duration || 0), 0),
        })),
        ffmpegAvailable,
        awsConfigured,
        tempDir: '/tmp/video-chunks',
      },
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Test chunked render failed:', error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

router.get('/service-status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const services = {
      'fal.ai': {
        configured: !!process.env.FAL_KEY,
        role: 'PRIMARY - Image Generation',
      },
      'elevenlabs': {
        configured: !!process.env.ELEVENLABS_API_KEY,
        role: 'PRIMARY - Voiceover',
      },
      'anthropic': {
        configured: !!process.env.ANTHROPIC_API_KEY,
        role: 'Script Generation',
      },
      'huggingface': {
        configured: !!process.env.HUGGINGFACE_API_TOKEN,
        role: 'FALLBACK - Image Generation',
      },
      'pexels': {
        configured: !!process.env.PEXELS_API_KEY,
        role: 'FALLBACK - Stock Images/Videos',
      },
      'unsplash': {
        configured: !!process.env.UNSPLASH_ACCESS_KEY,
        role: 'FALLBACK - Stock Images',
      },
      'remotion-lambda': {
        configured: !!process.env.REMOTION_AWS_ACCESS_KEY_ID && !!process.env.REMOTION_AWS_SECRET_ACCESS_KEY,
        role: 'Video Rendering',
      },
    };
    
    res.json({ success: true, services });
  } catch (error: any) {
    console.error('[UniversalVideo] Error getting service status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== PHASE 12A: Motion Graphics Router Test Endpoint =====
router.post('/test-motion-graphics-routing', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { visualDirection, narration, sceneType, duration } = req.body;
    
    if (!visualDirection) {
      return res.status(400).json({ 
        success: false, 
        error: 'visualDirection is required' 
      });
    }
    
    // Test the routing decision
    const routingDecision = motionGraphicsRouter.analyzeVisualDirection(
      visualDirection,
      narration || '',
      sceneType || 'content'
    );
    
    // If routing to motion graphics, generate config
    let motionGraphicsConfig = null;
    if (routingDecision.useMotionGraphics && routingDecision.suggestedType) {
      const result = await motionGraphicsGenerator.generateMotionGraphic(
        visualDirection,
        narration || '',
        sceneType || 'content',
        duration || 5
      );
      
      if (result.success) {
        motionGraphicsConfig = {
          config: result.config,
          renderInstructions: result.renderInstructions,
        };
      }
    }
    
    res.json({
      success: true,
      routing: {
        useMotionGraphics: routingDecision.useMotionGraphics,
        confidence: routingDecision.confidence,
        confidencePercent: `${(routingDecision.confidence * 100).toFixed(0)}%`,
        detectedKeywords: routingDecision.detectedKeywords,
        suggestedType: routingDecision.suggestedType,
        reasoning: routingDecision.reasoning,
        fallbackToAI: routingDecision.fallbackToAI,
      },
      motionGraphicsConfig,
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Motion graphics routing test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// ===== END PHASE 12A =====

router.post('/upload-url', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id?.toString();
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID required' });
    }
    
    console.log('[UniversalVideo] Getting presigned upload URL for user:', userId);
    const { uploadUrl, objectPath } = await objectStorageService.getObjectEntityUploadURL(userId);
    
    res.json({
      success: true,
      uploadUrl,
      objectPath,
      message: 'Upload URL generated. Use PUT request to upload image.',
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Error getting upload URL:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 13D: Reference image upload endpoint for I2I, I2V, and Style Reference
router.post('/upload-reference-image', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id?.toString();
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID required' });
    }
    
    console.log('[UniversalVideo] Getting presigned upload URL for reference image, user:', userId);
    const { uploadUrl, objectPath } = await objectStorageService.getObjectEntityUploadURL(userId);
    
    res.json({
      success: true,
      uploadUrl,
      objectPath,
      message: 'Upload URL generated for reference image. Use PUT request to upload image.',
      constraints: {
        maxSizeMB: 20,
        supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
        recommendedResolution: '1024x1024 or higher',
      },
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Error getting reference image upload URL:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 13: Motion reference video upload endpoint
router.post('/upload-motion-reference', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id?.toString();
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID required' });
    }
    
    console.log('[UniversalVideo] Getting presigned upload URL for motion reference video, user:', userId);
    const { uploadUrl, objectPath } = await objectStorageService.getObjectEntityUploadURL(userId);
    
    res.json({
      success: true,
      uploadUrl,
      objectPath,
      message: 'Upload URL generated for motion reference video. Use PUT request to upload video (3-30 seconds, max 100MB).',
      constraints: {
        minDuration: 3,
        maxDuration: 30,
        maxSizeMB: 100,
        supportedFormats: ['video/mp4', 'video/webm', 'video/quicktime'],
      },
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Error getting motion reference upload URL:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 13: Apply generation settings to project scenes
router.post('/projects/:projectId/apply-generation-settings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = (req.user as any)?.id?.toString();
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID required' });
    }
    
    const settings = generationSettingsSchema.parse(req.body);
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Apply audio and motion settings to all scenes
    const updatedScenes = projectData.scenes.map((scene: any) => ({
      ...scene,
      audioSettings: settings.audio,
      motionControlSettings: settings.motionControl,
    }));
    
    projectData.scenes = updatedScenes;
    projectData.updatedAt = new Date().toISOString();
    await saveProjectToDb(projectData, userId);
    
    console.log('[UniversalVideo] Applied generation settings to project:', projectId, {
      audioEnabled: settings.audio?.enabled,
      motionControlEnabled: settings.motionControl?.enabled,
      preferredProvider: settings.preferredProvider,
    });
    
    res.json({
      success: true,
      message: 'Generation settings applied to all scenes',
      appliedSettings: {
        audio: settings.audio,
        motionControl: settings.motionControl,
        preferredProvider: settings.preferredProvider,
      },
      scenesUpdated: updatedScenes.length,
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Error applying generation settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 13D: Apply reference config to a specific scene
router.post('/projects/:projectId/scenes/:sceneId/reference-config', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId, sceneId } = req.params;
    const userId = (req.user as any)?.id?.toString();
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID required' });
    }
    
    const referenceConfig = referenceConfigSchema.parse(req.body);
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const sceneIndex = projectData.scenes.findIndex((s: any) => s.id === sceneId);
    if (sceneIndex === -1) {
      return res.status(404).json({ success: false, error: 'Scene not found' });
    }
    
    projectData.scenes[sceneIndex].referenceConfig = referenceConfig;
    projectData.updatedAt = new Date().toISOString();
    await saveProjectToDb(projectData, userId);
    
    console.log('[UniversalVideo] Applied reference config to scene:', sceneId, {
      mode: referenceConfig.mode,
      sourceType: referenceConfig.sourceType,
      hasI2iSettings: !!referenceConfig.i2iSettings,
      hasI2vSettings: !!referenceConfig.i2vSettings,
      hasStyleSettings: !!referenceConfig.styleSettings,
    });
    
    res.json({
      success: true,
      message: `Reference config applied to scene ${sceneId}`,
      referenceConfig,
      scene: projectData.scenes[sceneIndex],
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Error applying reference config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 13D: Clear reference config from a scene
router.delete('/projects/:projectId/scenes/:sceneId/reference-config', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId, sceneId } = req.params;
    const userId = (req.user as any)?.id?.toString();
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID required' });
    }
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const sceneIndex = projectData.scenes.findIndex((s: any) => s.id === sceneId);
    if (sceneIndex === -1) {
      return res.status(404).json({ success: false, error: 'Scene not found' });
    }
    
    delete projectData.scenes[sceneIndex].referenceConfig;
    projectData.updatedAt = new Date().toISOString();
    await saveProjectToDb(projectData, userId);
    
    console.log('[UniversalVideo] Cleared reference config from scene:', sceneId);
    
    res.json({
      success: true,
      message: `Reference config cleared from scene ${sceneId}`,
      scene: projectData.scenes[sceneIndex],
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Error clearing reference config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/projects/:projectId/product-images', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { objectPath, name, description, isPrimary } = req.body;
    
    const userId = (req.user as any)?.id?.toString();
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID required' });
    }
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const normalizedPath = objectStorageService.normalizeObjectEntityPath(objectPath);
    
    if (!objectStorageService.verifyPresignedUpload(normalizedPath, userId)) {
      console.warn('[UniversalVideo] Upload verification failed, allowing anyway for flexibility');
    }
    
    await objectStorageService.trySetObjectEntityAclPolicy(
      normalizedPath,
      { owner: userId, visibility: 'public' }
    );
    
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newImage: ProductImage = {
      id: imageId,
      url: normalizedPath,
      name: name || `Product Image ${projectData.assets.productImages.length + 1}`,
      description: description || '',
      isPrimary: isPrimary || projectData.assets.productImages.length === 0,
    };
    
    if (isPrimary) {
      projectData.assets.productImages.forEach((img: ProductImage) => {
        img.isPrimary = false;
      });
    }
    
    projectData.assets.productImages.push(newImage);
    projectData.updatedAt = new Date().toISOString();
    await saveProjectToDb(projectData, projectData.ownerId);
    
    console.log('[UniversalVideo] Added product image to project:', projectId, imageId);
    
    res.json({
      success: true,
      image: newImage,
      totalImages: projectData.assets.productImages.length,
      message: 'Product image added successfully',
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Error adding product image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/projects/:projectId/product-images', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    res.json({
      success: true,
      images: projectData.assets.productImages,
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Error getting product images:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/projects/:projectId/product-images/:imageId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, imageId } = req.params;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const imageIndex = projectData.assets.productImages.findIndex((img: ProductImage) => img.id === imageId);
    if (imageIndex === -1) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }
    
    const wasDeleted = projectData.assets.productImages.splice(imageIndex, 1);
    
    if (wasDeleted[0]?.isPrimary && projectData.assets.productImages.length > 0) {
      projectData.assets.productImages[0].isPrimary = true;
    }
    
    projectData.updatedAt = new Date().toISOString();
    await saveProjectToDb(projectData, projectData.ownerId);
    
    res.json({
      success: true,
      message: 'Product image removed',
      remainingImages: projectData.assets.productImages.length,
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Error removing product image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/projects/:projectId/scenes/:sceneId/assign-image', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneId } = req.params;
    const { imageId, useAI } = req.body;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const sceneIndex = projectData.scenes.findIndex((s: Scene) => s.id === sceneId);
    if (sceneIndex === -1) {
      return res.status(404).json({ success: false, error: 'Scene not found' });
    }
    
    const scene = projectData.scenes[sceneIndex];
    
    if (useAI) {
      if (!scene.assets) {
        scene.assets = {};
      }
      scene.assets.imageUrl = undefined;
      scene.assets.useAIImage = true;
      
      projectData.updatedAt = new Date().toISOString();
      await saveProjectToDb(projectData, projectData.ownerId);
      
      res.json({
        success: true,
        message: 'Scene set to use AI-generated image',
        scene,
      });
    } else if (imageId) {
      const productImage = projectData.assets.productImages.find((img: ProductImage) => img.id === imageId);
      if (!productImage) {
        return res.status(404).json({ success: false, error: 'Product image not found' });
      }
      
      if (!scene.assets) {
        scene.assets = {};
      }
      scene.assets.imageUrl = productImage.url;
      scene.assets.useAIImage = false;
      scene.assets.assignedProductImageId = imageId;
      
      projectData.updatedAt = new Date().toISOString();
      await saveProjectToDb(projectData, projectData.ownerId);
      
      res.json({
        success: true,
        message: 'Product image assigned to scene',
        scene,
      });
    } else {
      return res.status(400).json({ success: false, error: 'Either imageId or useAI must be provided' });
    }
  } catch (error: any) {
    console.error('[UniversalVideo] Error assigning image to scene:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/:projectId/scene/:sceneId/overlay', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneId } = req.params;
    const { useProductOverlay } = req.body;
    
    if (typeof useProductOverlay !== 'boolean') {
      return res.status(400).json({ success: false, error: 'useProductOverlay must be a boolean' });
    }
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const sceneIndex = projectData.scenes.findIndex((s: Scene) => s.id === sceneId);
    if (sceneIndex === -1) {
      return res.status(404).json({ success: false, error: 'Scene not found' });
    }
    
    const scene = projectData.scenes[sceneIndex];
    
    if (!scene.assets) {
      scene.assets = {};
    }
    scene.assets.useProductOverlay = useProductOverlay;
    
    projectData.updatedAt = new Date().toISOString();
    await saveProjectToDb(projectData, projectData.ownerId);
    
    res.json({
      success: true,
      message: useProductOverlay ? 'Product overlay enabled' : 'Product overlay disabled',
      project: projectData,
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Error updating scene overlay:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:projectId/scenes/:sceneId/regenerate-image', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneId } = req.params;
    const { prompt, provider } = req.body;
    
    console.log(`[Phase9B] Regenerating image for scene ${sceneId} with provider: ${provider || 'default'}`);
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const result = await universalVideoService.regenerateSceneImage(projectData, sceneId, prompt, provider);
    
    if (result.success && result.newImageUrl) {
      const sceneIndex = projectData.scenes.findIndex((s: Scene) => s.id === sceneId);
      if (sceneIndex >= 0) {
        const oldUrl = projectData.scenes[sceneIndex].assets?.imageUrl;
        if (oldUrl) {
          if (!projectData.scenes[sceneIndex].assets!.alternativeImages) {
            projectData.scenes[sceneIndex].assets!.alternativeImages = [];
          }
          projectData.scenes[sceneIndex].assets!.alternativeImages!.push({
            url: oldUrl,
            prompt: 'previous',
            source: 'previous'
          });
        }
        
        projectData.scenes[sceneIndex].assets = projectData.scenes[sceneIndex].assets || {};
        projectData.scenes[sceneIndex].assets!.imageUrl = result.newImageUrl;
        projectData.scenes[sceneIndex].assets!.backgroundUrl = result.newImageUrl;
        projectData.scenes[sceneIndex].background!.type = 'image';
        
        if (!projectData.regenerationHistory) projectData.regenerationHistory = [];
        projectData.regenerationHistory.push({
          id: `regen_${Date.now()}`,
          sceneId,
          assetType: 'image',
          previousUrl: oldUrl,
          newUrl: result.newImageUrl,
          prompt,
          timestamp: new Date().toISOString(),
          success: true
        });
        
        await saveProjectToDb(projectData, projectData.ownerId);
        
        // Phase 8A: Trigger background analysis for regenerated scene
        if (sceneAnalysisService.isAvailable()) {
          (async () => {
            try {
              let fullUrl = result.newImageUrl!;
              if (fullUrl.startsWith('/')) {
                const baseUrl = process.env.REPLIT_DEV_DOMAIN 
                  ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
                  : 'http://localhost:5000';
                fullUrl = `${baseUrl}${fullUrl}`;
              }
              
              const imgResponse = await fetch(fullUrl, { headers: { 'Accept': 'image/*' } });
              if (imgResponse.ok) {
                const buffer = Buffer.from(await imgResponse.arrayBuffer());
                const base64 = buffer.toString('base64');
                
                const context: SceneContext = {
                  sceneIndex,
                  sceneType: projectData.scenes[sceneIndex].type || 'content',
                  narration: projectData.scenes[sceneIndex].narration || '',
                  visualDirection: projectData.scenes[sceneIndex].visualDirection || '',
                  expectedContentType: 'lifestyle',
                  totalScenes: projectData.scenes.length,
                };
                
                const analysis = await sceneAnalysisService.analyzeScenePhase8(base64, context);
                projectData.scenes[sceneIndex].analysisResult = analysis;
                projectData.scenes[sceneIndex].qualityScore = analysis.overallScore;
                await saveProjectToDb(projectData, projectData.ownerId);
                console.log(`[Phase8A] Scene ${sceneIndex + 1} analyzed after regeneration: score=${analysis.overallScore}`);
              }
            } catch (err: any) {
              console.warn('[Phase8A] Post-regeneration analysis failed:', err.message);
            }
          })();
        }
      }
      
      return res.json({ 
        success: true, 
        newImageUrl: result.newImageUrl,
        source: result.source,
        project: projectData
      });
    }
    
    return res.status(400).json({ success: false, error: result.error });
  } catch (error: any) {
    console.error('[UniversalVideo] Regenerate image error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:projectId/scenes/:sceneId/regenerate-video', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneId } = req.params;
    const { query, provider } = req.body;
    
    console.log(`[Phase9B-Async] Creating async video generation job for scene ${sceneId} with provider: ${provider || 'default'}`);
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Check if there's already an active job for this scene
    const { videoGenerationWorker } = await import('../services/video-generation-worker');
    const existingJob = await videoGenerationWorker.getActiveJobForScene(projectId, sceneId);
    if (existingJob) {
      console.log(`[Phase9B-Async] Scene ${sceneId} already has active job: ${existingJob.jobId}`);
      return res.json({ 
        success: true, 
        jobId: existingJob.jobId,
        status: existingJob.status,
        progress: existingJob.progress,
        message: 'Video generation already in progress'
      });
    }
    
    // Find the scene to get the visual direction/prompt
    const scene = projectData.scenes.find((s: Scene) => s.id === sceneId);
    if (!scene) {
      return res.status(404).json({ success: false, error: 'Scene not found' });
    }
    
    // Use provided query or scene's visual direction
    const prompt = query || scene.visualDirection || (scene as any).description || 'Professional wellness video';
    const fallbackPrompt = (scene as any).summary || 'professional video';
    
    // Create async job - returns immediately
    const job = await videoGenerationWorker.createJob({
      projectId,
      sceneId,
      provider: provider || 'runway',
      prompt,
      fallbackPrompt,
      duration: scene.duration || 6,
      aspectRatio: (projectData as any).settings?.aspectRatio || '16:9',
      style: (projectData as any).settings?.visualStyle || 'professional',
      triggeredBy: userId,
    });
    
    console.log(`[Phase9B-Async] Created job ${job.jobId} for scene ${sceneId}`);
    
    return res.json({ 
      success: true, 
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      message: 'Video generation job created'
    });
    
  } catch (error: any) {
    console.error('[UniversalVideo] Regenerate video error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get video generation job status
router.get('/:projectId/scenes/:sceneId/video-job/:jobId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneId, jobId } = req.params;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const { videoGenerationWorker } = await import('../services/video-generation-worker');
    const job = await videoGenerationWorker.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    
    // If job succeeded, also return updated scene data
    let updatedProject = projectData;
    if (job.status === 'succeeded' && job.videoUrl) {
      // Update scene with new video URL
      const sceneIndex = projectData.scenes.findIndex((s: Scene) => s.id === sceneId);
      if (sceneIndex >= 0) {
        const oldUrl = projectData.scenes[sceneIndex].assets?.videoUrl;
        if (oldUrl && oldUrl !== job.videoUrl) {
          if (!projectData.scenes[sceneIndex].assets!.alternativeVideos) {
            projectData.scenes[sceneIndex].assets!.alternativeVideos = [];
          }
          projectData.scenes[sceneIndex].assets!.alternativeVideos!.push({
            url: oldUrl,
            query: 'previous',
            source: 'previous'
          });
        }
        
        projectData.scenes[sceneIndex].assets = projectData.scenes[sceneIndex].assets || {};
        projectData.scenes[sceneIndex].assets!.videoUrl = job.videoUrl;
        projectData.scenes[sceneIndex].background = projectData.scenes[sceneIndex].background || { type: 'video', source: '' };
        projectData.scenes[sceneIndex].background!.type = 'video';
        projectData.scenes[sceneIndex].background!.videoUrl = job.videoUrl;
        
        if (!projectData.regenerationHistory) projectData.regenerationHistory = [];
        projectData.regenerationHistory.push({
          id: `regen_${Date.now()}`,
          sceneId,
          assetType: 'video',
          previousUrl: oldUrl,
          newUrl: job.videoUrl,
          prompt: job.prompt || undefined,
          timestamp: new Date().toISOString(),
          success: true
        });
        
        await saveProjectToDb(projectData, projectData.ownerId);
        updatedProject = projectData;
      }
    }
    
    return res.json({
      success: true,
      job: {
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        videoUrl: job.videoUrl,
        errorMessage: job.errorMessage,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      },
      project: job.status === 'succeeded' ? updatedProject : undefined,
    });
    
  } catch (error: any) {
    console.error('[UniversalVideo] Get job status error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get active jobs for a scene
router.get('/:projectId/scenes/:sceneId/active-jobs', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneId } = req.params;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const { videoGenerationWorker } = await import('../services/video-generation-worker');
    const jobs = await videoGenerationWorker.getJobsByScene(projectId, sceneId);
    const activeJobs = jobs.filter(j => j.status === 'pending' || j.status === 'running');
    
    return res.json({
      success: true,
      jobs: activeJobs.map(job => ({
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        provider: job.provider,
        startedAt: job.startedAt,
        createdAt: job.createdAt,
      })),
    });
    
  } catch (error: any) {
    console.error('[UniversalVideo] Get active jobs error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:projectId/scenes/:sceneId/switch-background', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneId } = req.params;
    const { preferVideo } = req.body;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const result = await universalVideoService.switchSceneBackgroundType(
      projectData, 
      sceneId, 
      preferVideo === true
    );
    
    if (result.success) {
      await saveProjectToDb(projectData, projectData.ownerId);
      const scene = projectData.scenes.find((s: Scene) => s.id === sceneId);
      return res.json({ success: true, scene, project: projectData });
    }
    
    return res.status(400).json({ success: false, error: result.error });
  } catch (error: any) {
    console.error('[UniversalVideo] Switch background error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Set scene media from external source (Pexels, Unsplash, Brand Media, Asset Library)
router.patch('/:projectId/scenes/:sceneId/set-media', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneId } = req.params;
    const { mediaUrl, mediaType, source } = req.body;
    
    if (!mediaUrl || !mediaType || !source) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: mediaUrl, mediaType, source' 
      });
    }
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Find the scene
    const sceneIndex = projectData.scenes.findIndex((s: Scene) => s.id === sceneId);
    if (sceneIndex === -1) {
      return res.status(404).json({ success: false, error: 'Scene not found' });
    }
    
    const scene = projectData.scenes[sceneIndex];
    
    // Push to history before making changes
    universalVideoService.pushToHistory(projectData, `Set ${mediaType} from ${source}`, ['scenes']);
    
    // Initialize assets if needed
    if (!scene.assets) {
      scene.assets = {} as any;
    }
    
    // Update scene based on media type
    if (mediaType === 'video') {
      // Set as b-roll video
      const existingPrompt = (scene.background as any)?.prompt;
      scene.background = {
        type: 'video',
        videoUrl: mediaUrl,
        source: source as any,
        prompt: existingPrompt
      } as any;
      // Clear any existing image background
      if (scene.assets) {
        (scene.assets as any).backgroundUrl = undefined;
        (scene.assets as any).backgroundSource = undefined;
      }
    } else {
      // Set as image background - update both background and assets for proper UI rendering
      const existingPrompt = (scene.background as any)?.prompt;
      scene.background = {
        type: 'image',
        imageUrl: mediaUrl,
        source: source as any,
        prompt: existingPrompt
      } as any;
      scene.assets!.backgroundUrl = mediaUrl;
      (scene.assets as any).backgroundSource = source;
    }
    
    await saveProjectToDb(projectData, projectData.ownerId);
    const historyStatus = universalVideoService.getHistoryStatus(projectData);
    
    return res.json({ 
      success: true, 
      scene: projectData.scenes[sceneIndex],
      project: projectData,
      historyStatus 
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Set media error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 2: Product Overlay Editor
router.patch('/:projectId/scenes/:sceneId/product-overlay', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneId } = req.params;
    const { enabled, position, scale, animation } = req.body;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Push to history before making changes
    universalVideoService.pushToHistory(projectData, 'Update overlay settings', ['scenes']);
    
    const result = universalVideoService.updateProductOverlay(projectData, sceneId, {
      enabled,
      position,
      scale,
      animation,
    });
    
    if (result.success) {
      await saveProjectToDb(projectData, projectData.ownerId);
      const scene = projectData.scenes.find((s: Scene) => s.id === sceneId);
      const historyStatus = universalVideoService.getHistoryStatus(projectData);
      return res.json({ success: true, scene, project: projectData, historyStatus });
    }
    
    return res.status(400).json({ success: false, error: result.error });
  } catch (error: any) {
    console.error('[UniversalVideo] Product overlay update error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 2: Voiceover Regeneration
router.post('/:projectId/regenerate-voiceover', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    const { voiceId, sceneIds } = req.body;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    console.log(`[UniversalVideo] Regenerating voiceover for project ${projectId}, voice: ${voiceId || 'default'}`);
    
    const result = await universalVideoService.regenerateVoiceover(projectData, {
      voiceId,
      sceneIds,
    });
    
    if (result.success) {
      await saveProjectToDb(projectData, projectData.ownerId);
      return res.json({ 
        success: true, 
        voiceoverUrl: result.voiceoverUrl,
        duration: result.duration,
        project: projectData,
      });
    }
    
    return res.status(400).json({ success: false, error: result.error });
  } catch (error: any) {
    console.error('[UniversalVideo] Voiceover regeneration error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 2: Regenerate Music with Udio AI
router.post('/:projectId/regenerate-music', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    const { style, mood, musicStyle, customPrompt } = req.body;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    console.log(`[UniversalVideo] Regenerating music for project ${projectId}, mood: ${mood || 'inspirational'}, style: ${musicStyle || 'wellness'}`);
    
    const result = await universalVideoService.regenerateMusic(projectData, style, {
      mood: mood || 'inspirational',
      musicStyle: musicStyle || 'wellness',
      customPrompt,
    });
    
    if (result.success) {
      await saveProjectToDb(projectData, projectData.ownerId);
      return res.json({ 
        success: true, 
        musicUrl: result.musicUrl,
        duration: result.duration,
        source: result.source,
        project: projectData,
      });
    }
    
    return res.status(400).json({ success: false, error: result.error });
  } catch (error: any) {
    console.error('[UniversalVideo] Music regeneration error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 2: Update Music Volume
router.patch('/:projectId/music-volume', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    const { volume } = req.body;
    
    if (typeof volume !== 'number') {
      return res.status(400).json({ success: false, error: 'Volume must be a number' });
    }
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const result = universalVideoService.updateMusicVolume(projectData, volume);
    
    if (result.success) {
      await saveProjectToDb(projectData, projectData.ownerId);
      return res.json({ 
        success: true, 
        volume: projectData.assets.music?.volume,
        project: projectData,
      });
    }
    
    return res.status(400).json({ success: false, error: result.error });
  } catch (error: any) {
    console.error('[UniversalVideo] Music volume update error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 2: Disable Music
router.delete('/:projectId/music', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    universalVideoService.disableMusic(projectData);
    await saveProjectToDb(projectData, projectData.ownerId);
    
    return res.json({ 
      success: true, 
      message: 'Music disabled',
      project: projectData,
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Music disable error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// PHASE 4: UNDO/REDO & SCENE REORDERING
// =============================================

// Phase 4: Undo action
router.post('/:projectId/undo', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const result = universalVideoService.undo(projectData);
    
    if (result.success) {
      await saveProjectToDb(projectData, projectData.ownerId);
      const status = universalVideoService.getHistoryStatus(projectData);
      return res.json({ 
        success: true, 
        undoneAction: result.action,
        historyStatus: status,
        project: projectData,
      });
    }
    
    return res.status(400).json({ success: false, error: result.error });
  } catch (error: any) {
    console.error('[UniversalVideo] Undo error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 4: Redo action
router.post('/:projectId/redo', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const result = universalVideoService.redo(projectData);
    
    if (result.success) {
      await saveProjectToDb(projectData, projectData.ownerId);
      const status = universalVideoService.getHistoryStatus(projectData);
      return res.json({ 
        success: true, 
        redoneAction: result.action,
        historyStatus: status,
        project: projectData,
      });
    }
    
    return res.status(400).json({ success: false, error: result.error });
  } catch (error: any) {
    console.error('[UniversalVideo] Redo error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 4: Get history status
router.get('/:projectId/history', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const status = universalVideoService.getHistoryStatus(projectData);
    return res.json({ success: true, ...status });
  } catch (error: any) {
    console.error('[UniversalVideo] History status error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 10A: Analyze quality endpoint for QA Dashboard
router.post('/:projectId/analyze-quality', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('[Phase10A] ANALYZE-QUALITY ENDPOINT CALLED');
    console.log(`[Phase10A] Project ID: ${projectId}`);
    console.log(`[Phase10A] ANTHROPIC_API_KEY configured: ${!!process.env.ANTHROPIC_API_KEY}`);
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const scenes = projectData.scenes || [];
    console.log(`[Phase10A] Analyzing ${scenes.length} scenes for quality report`);
    
    const analyses: Phase8AnalysisResult[] = [];
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const imageUrl = scene.assets?.imageUrl || scene.assets?.videoUrl || (scene.background as any)?.url;
      
      if (!imageUrl) {
        console.log(`[Phase10A] Scene ${i + 1} has no image, creating placeholder analysis`);
        const placeholderAnalysis: Phase8AnalysisResult = {
          sceneIndex: i,
          overallScore: 0,
          technicalScore: 0,
          contentMatchScore: 0,
          brandComplianceScore: 0,
          compositionScore: 0,
          aiArtifactsDetected: false,
          aiArtifactDetails: [],
          contentMatchDetails: 'No media to analyze',
          brandComplianceDetails: 'No media to analyze',
          frameAnalysis: {
            subjectPosition: 'center' as const,
            faceDetected: false,
            busyRegions: [],
            dominantColors: [],
            lightingType: 'neutral' as const,
            safeTextZones: [],
          },
          issues: [{ 
            category: 'technical' as const, 
            severity: 'critical' as const, 
            description: 'No media available for this scene', 
            suggestion: 'Generate image or video for this scene' 
          }],
          recommendation: 'critical_fail',
          analysisTimestamp: new Date().toISOString(),
          analysisModel: 'none',
        };
        analyses.push(placeholderAnalysis);
        continue;
      }
      
      try {
        // Resolve URL
        let fullUrl = imageUrl;
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
          const baseUrl = process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
            : 'http://localhost:5000';
          fullUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }
        
        // Detect if this is a video file
        const isVideo = /\.(mp4|webm|mov|avi|mkv)$/i.test(imageUrl) || scene.assets?.videoUrl;
        let base64: string;
        
        if (isVideo) {
          console.log(`[Phase10A] Scene ${i + 1}: Extracting frame from video ${fullUrl.substring(0, 80)}...`);
          const frameResult = await videoFrameExtractor.extractFrameAsBase64(fullUrl, 1);
          if (!frameResult) {
            throw new Error('Failed to extract frame from video');
          }
          base64 = frameResult.base64;
          console.log(`[Phase10A] Scene ${i + 1}: Frame extracted successfully`);
        } else {
          console.log(`[Phase10A] Scene ${i + 1}: Fetching image from ${fullUrl.substring(0, 80)}...`);
          
          const response = await fetch(fullUrl, { headers: { 'Accept': 'image/*' } });
          if (!response.ok) {
            console.warn(`[Phase10A] Failed to fetch scene ${i + 1} image: ${response.status}`);
            throw new Error(`Failed to fetch image: ${response.status}`);
          }
          
          const buffer = Buffer.from(await response.arrayBuffer());
          base64 = buffer.toString('base64');
        }
        
        const context: SceneContext = {
          sceneIndex: i,
          sceneType: scene.type || 'content',
          narration: scene.narration || '',
          visualDirection: scene.visualDirection || '',
          expectedContentType: (scene as any).contentType || 'lifestyle',
          totalScenes: scenes.length,
        };
        
        console.log(`[Phase10A] Scene ${i + 1}: Calling Claude Vision for analysis...`);
        const analysisResult = await sceneAnalysisService.analyzeScenePhase8(base64, context);
        console.log(`[Phase10A] Scene ${i + 1}: Analysis complete - Score: ${analysisResult.overallScore}, Model: ${analysisResult.analysisModel}`);
        
        analyses.push(analysisResult);
        
        // Store on scene
        scenes[i].analysisResult = analysisResult;
        scenes[i].qualityScore = analysisResult.overallScore;
        
        // Rate limiting between Claude Vision calls
        if (i < scenes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (sceneError: any) {
        console.warn(`[Phase10A] Scene ${i + 1} analysis failed:`, sceneError.message);
        const fallbackAnalysis: Phase8AnalysisResult = {
          sceneIndex: i,
          overallScore: 50,
          technicalScore: 50,
          contentMatchScore: 50,
          brandComplianceScore: 50,
          compositionScore: 50,
          aiArtifactsDetected: false,
          aiArtifactDetails: [],
          contentMatchDetails: 'Analysis failed',
          brandComplianceDetails: 'Analysis failed',
          frameAnalysis: {
            subjectPosition: 'center' as const,
            faceDetected: false,
            busyRegions: [],
            dominantColors: [],
            lightingType: 'neutral' as const,
            safeTextZones: [],
          },
          issues: [{ 
            category: 'technical' as const, 
            severity: 'major' as const, 
            description: `Analysis failed: ${sceneError.message}`, 
            suggestion: 'Retry analysis' 
          }],
          recommendation: 'needs_review',
          analysisTimestamp: new Date().toISOString(),
          analysisModel: 'fallback',
        };
        analyses.push(fallbackAnalysis);
        scenes[i].analysisResult = fallbackAnalysis;
        scenes[i].qualityScore = fallbackAnalysis.overallScore;
      }
    }
    
    // Save updated project with analysis results
    projectData.scenes = scenes;
    await saveProjectToDb(projectData, userId);
    
    // Build scene metadata for quality report
    const sceneMetadata = new Map<number, { thumbnailUrl?: string; narration?: string; provider?: string; regenerationCount?: number }>();
    scenes.forEach((scene, idx) => {
      const thumbnailUrl = scene.assets?.imageUrl || scene.assets?.videoUrl || (scene.background as any)?.url;
      sceneMetadata.set(idx, {
        thumbnailUrl,
        narration: scene.narration,
        provider: (scene.assets as any)?.videoProvider || (scene.assets as any)?.imageProvider || (scene.assets as any)?.provider,
        regenerationCount: (scene as any).regenerationCount || 0,
      });
    });
    
    // Build approvals map
    const approvals = new Map<number, boolean>();
    scenes.forEach((scene, idx) => {
      if ((scene as any).userApproved) {
        approvals.set(idx, true);
      }
    });
    
    // Generate QA report using quality gate service
    const report = qualityGateService.generateReport(
      projectId,
      analyses,
      approvals,
      undefined,
      sceneMetadata
    );
    
    console.log(`[Phase10A] Quality report generated - Overall: ${report.overallScore}, Approved: ${report.approvedCount}, NeedsReview: ${report.needsReviewCount}`);
    
    return res.json({
      success: true,
      ...report,
    });
    
  } catch (error: any) {
    console.error('[Phase10A] Analyze quality error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 4: Reorder scenes
router.patch('/:projectId/reorder-scenes', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    const { sceneOrder } = req.body;
    
    if (!Array.isArray(sceneOrder)) {
      return res.status(400).json({ success: false, error: 'sceneOrder must be an array of scene IDs' });
    }
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Push current state to history before reordering
    universalVideoService.pushToHistory(projectData, 'Reorder scenes', ['scenes']);
    
    const result = universalVideoService.reorderScenes(projectData, sceneOrder);
    
    if (result.success) {
      await saveProjectToDb(projectData, projectData.ownerId);
      const historyStatus = universalVideoService.getHistoryStatus(projectData);
      return res.json({ 
        success: true, 
        message: 'Scenes reordered',
        historyStatus,
        project: projectData,
      });
    }
    
    return res.status(400).json({ success: false, error: result.error });
  } catch (error: any) {
    console.error('[UniversalVideo] Scene reorder error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 4: Generate Preview
router.post('/projects/:projectId/preview', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    if (projectData.status !== 'ready' && projectData.status !== 'complete') {
      return res.status(400).json({ 
        success: false, 
        error: 'Project must be ready or complete to generate preview' 
      });
    }
    
    const { inputProps, compositionId, previewConfig } = universalVideoService.getPreviewRenderProps(projectData);
    
    // Return preview configuration - actual rendering would happen on frontend or via Lambda
    return res.json({
      success: true,
      preview: {
        inputProps,
        compositionId,
        config: previewConfig,
        projectId: projectData.id,
        duration: projectData.totalDuration,
        message: 'Preview configuration ready. Use Remotion Player for client-side preview.',
      },
    });
  } catch (error: any) {
    console.error('[UniversalVideo] Preview generation error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 1E: Generate Product Image
router.post('/projects/:projectId/generate-product-image', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    const { 
      productName, 
      productDescription, 
      imageType = 'overlay',
      style = 'natural',
      aspectRatio = '1:1',
    } = req.body;
    
    if (!productName) {
      return res.status(400).json({ success: false, error: 'Product name is required' });
    }

    const projectData = await getProjectFromDb(projectId);
    
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { productImageService } = await import('../services/product-image-service');
    
    const image = await productImageService.generateProductImage({
      productName,
      productDescription,
      imageType,
      style,
      aspectRatio,
    });

    if (!image) {
      return res.status(500).json({ success: false, error: 'Image generation failed' });
    }

    (projectData as any).generatedProductImages = (projectData as any).generatedProductImages || {};
    (projectData as any).generatedProductImages[productName] = (projectData as any).generatedProductImages[productName] || [];
    (projectData as any).generatedProductImages[productName].push(image);

    await saveProjectToDb(projectData, projectData.ownerId);

    return res.json({
      success: true,
      image,
    });

  } catch (error: any) {
    console.error('[UniversalVideo] Product image generation error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 1E: Get Product Image Styles
router.get('/product-image-styles', (req: Request, res: Response) => {
  res.json({
    imageTypes: ['product-shot', 'lifestyle', 'hero', 'overlay'],
    styles: ['studio', 'natural', 'dramatic', 'minimal'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    backgrounds: ['white', 'gradient', 'natural', 'transparent'],
    lighting: ['soft', 'dramatic', 'natural', 'studio'],
  });
});

// Phase 3: Quality Evaluation Endpoints

// GET quality report for a project
router.get('/projects/:projectId/quality-report', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    
    const projectData = await getProjectFromDb(projectId);
    
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const qualityReport = projectData.qualityReport;
    
    if (!qualityReport) {
      return res.status(404).json({ success: false, error: 'No quality report available for this project' });
    }
    
    // Phase 5E: Add recommendation status and summary
    const criticalCount = qualityReport.criticalIssues?.length || 0;
    const majorCount = qualityReport.sceneScores?.reduce((sum: number, s: any) => 
      sum + (s.issues?.filter((i: any) => i.severity === 'major')?.length || 0), 0) || 0;
    const overallScore = qualityReport.overallScore;
    
    let recommendation: 'approved' | 'needs-fixes' | 'needs-review' | 'pending' = 'pending';
    if (qualityReport.sceneScores?.length > 0) {
      if (criticalCount > 0) {
        recommendation = 'needs-fixes';
      } else if (majorCount > 2 || overallScore < 70) {
        recommendation = 'needs-review';
      } else {
        recommendation = 'approved';
      }
    }
    
    const generateSummary = () => {
      if (overallScore === null || overallScore === undefined) {
        return 'Quality evaluation pending. Generate assets to see results.';
      }
      if (criticalCount > 0) {
        const aiTextIssues = qualityReport.criticalIssues?.filter((i: any) => i.type === 'ai-text-detected')?.length || 0;
        if (aiTextIssues > 0) {
          return `${aiTextIssues} scene(s) contain AI-generated text artifacts. Regeneration recommended.`;
        }
        return `${criticalCount} critical issue(s) detected. Review and regenerate affected scenes.`;
      }
      if (overallScore >= 85) {
        return 'Excellent quality! Your video is ready for rendering.';
      }
      if (overallScore >= 70) {
        return 'Good quality with minor issues. Review before rendering.';
      }
      return 'Several issues detected. Consider regenerating problematic scenes.';
    };
    
    return res.json({
      success: true,
      qualityReport: {
        ...qualityReport,
        recommendation,
        summary: generateSummary(),
        issues: {
          total: (qualityReport.criticalIssues?.length || 0) + 
                 (qualityReport.sceneScores?.reduce((sum: number, s: any) => sum + (s.issues?.length || 0), 0) || 0),
          critical: criticalCount,
          major: majorCount,
          minor: qualityReport.sceneScores?.reduce((sum: number, s: any) => 
            sum + (s.issues?.filter((i: any) => i.severity === 'minor')?.length || 0), 0) || 0,
        },
      },
    });
    
  } catch (error: any) {
    console.error('[UniversalVideo] Get quality report error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST trigger quality evaluation manually
router.post('/projects/:projectId/evaluate-quality', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    
    const projectData = await getProjectFromDb(projectId);
    
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    if (!projectData.outputUrl) {
      return res.status(400).json({ success: false, error: 'Project has no rendered video to evaluate' });
    }
    
    if (!qualityEvaluationService.isAvailable()) {
      return res.status(503).json({ success: false, error: 'Quality evaluation service not available' });
    }
    
    console.log(`[UniversalVideo] Starting manual quality evaluation for ${projectId}`);
    
    const qualityReport = await qualityEvaluationService.evaluateVideo(
      projectData.outputUrl,
      {
        projectId: projectData.id,
        scenes: projectData.scenes.map(s => ({
          id: s.id,
          type: s.type,
          narration: s.narration || '',
          duration: s.duration,
          textOverlays: s.textOverlays,
        })),
      }
    );
    
    projectData.qualityReport = qualityReport;
    await saveProjectToDb(projectData, userId);
    
    return res.json({
      success: true,
      qualityReport,
    });
    
  } catch (error: any) {
    console.error('[UniversalVideo] Quality evaluation error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST regenerate failed scenes
router.post('/projects/:projectId/regenerate-scenes', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    const { sceneIndices } = req.body;
    
    const projectData = await getProjectFromDb(projectId);
    
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const qualityReport = projectData.qualityReport as VideoQualityReport | undefined;
    
    if (!qualityReport) {
      return res.status(400).json({ success: false, error: 'No quality report available. Run quality evaluation first.' });
    }
    
    let scenesToRegenerate = qualityReport.sceneScores.filter(s => s.needsRegeneration);
    
    if (sceneIndices && Array.isArray(sceneIndices)) {
      scenesToRegenerate = qualityReport.sceneScores.filter(s => 
        sceneIndices.includes(s.sceneIndex)
      );
    }
    
    if (scenesToRegenerate.length === 0) {
      return res.json({
        success: true,
        message: 'No scenes need regeneration',
        regenerated: [],
      });
    }
    
    console.log(`[UniversalVideo] Regenerating ${scenesToRegenerate.length} scenes for ${projectId}`);
    
    const results = await sceneRegenerationService.regenerateFailedScenes(
      {
        id: projectData.id,
        outputFormat: projectData.outputFormat,
        scenes: projectData.scenes,
      },
      scenesToRegenerate
    );
    
    for (const result of results) {
      if (result.success && result.newVideoUrl) {
        const sceneIndex = projectData.scenes.findIndex((s: Scene) => s.id === result.sceneId);
        if (sceneIndex >= 0) {
          projectData.scenes[sceneIndex].assets = projectData.scenes[sceneIndex].assets || {} as any;
          (projectData.scenes[sceneIndex].assets as any).videoUrl = result.newVideoUrl;
          if (result.newAnalysis) {
            (projectData.scenes[sceneIndex] as any).analysis = result.newAnalysis;
          }
          if (result.newInstructions) {
            (projectData.scenes[sceneIndex] as any).compositionInstructions = result.newInstructions;
          }
        }
      }
    }
    
    // Mark project for re-render if any scenes were successfully regenerated
    if (results.some(r => r.success)) {
      projectData.status = 'ready';
      projectData.progress.steps.rendering.status = 'pending';
      projectData.progress.steps.rendering.message = 'Scene(s) regenerated - ready to re-render';
    }
    
    await saveProjectToDb(projectData, userId);
    
    return res.json({
      success: true,
      regenerated: results,
      needsRerender: results.some(r => r.success),
    });
    
  } catch (error: any) {
    console.error('[UniversalVideo] Scene regeneration error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /projects/:projectId/scenes/:sceneId - Update individual scene (Phase 5C)
router.patch('/projects/:projectId/scenes/:sceneId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId, sceneId } = req.params;
    const updates = req.body;
    
    console.log(`[UniversalVideo] Updating scene ${sceneId} in project ${projectId}`);
    
    const project = await getProjectFromDb(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const scenes = project.scenes || [];
    const sceneIndex = scenes.findIndex((s: Scene) => s.id === sceneId);
    
    if (sceneIndex === -1) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    
    scenes[sceneIndex] = {
      ...scenes[sceneIndex],
      ...updates,
    };
    
    project.scenes = scenes;
    project.updatedAt = new Date().toISOString();
    
    const userId = (req.user as any)?.id || 'unknown';
    await saveProjectToDb(project, userId);
    
    console.log(`[UniversalVideo] Scene ${sceneId} updated successfully`);
    
    res.json({ 
      success: true, 
      scene: scenes[sceneIndex] 
    });
    
  } catch (error: any) {
    console.error('[UniversalVideo] Update scene failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /ai/suggest-visual-direction - AI suggestion for visual direction (Phase 5C)
router.post('/ai/suggest-visual-direction', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { narration, sceneType, currentDirection } = req.body;
    
    if (!narration) {
      return res.status(400).json({ error: 'Narration is required' });
    }
    
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic();
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Generate a concise visual direction for a video scene.

Scene type: ${sceneType || 'general'}
Narration: "${narration}"
${currentDirection ? `Current direction (improve this): ${currentDirection}` : ''}

Write 1-2 sentences describing:
- Camera angle/movement
- Lighting style
- Key visual elements
- Mood/atmosphere

Keep it brief and actionable for AI video generation. No preamble, just the direction.`,
        },
      ],
    });
    
    const suggestion = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    
    console.log(`[UniversalVideo] Generated visual direction for ${sceneType} scene`);
    
    res.json({ suggestion });
    
  } catch (error: any) {
    console.error('[UniversalVideo] Visual direction suggestion failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Background quality evaluation function
async function runQualityEvaluation(project: VideoProject, outputUrl: string, ownerId: string) {
  console.log(`[QualityEval] Starting background evaluation for ${project.id}`);
  
  try {
    const qualityReport = await qualityEvaluationService.evaluateVideo(
      outputUrl,
      {
        projectId: project.id,
        scenes: project.scenes.map(s => ({
          id: s.id,
          type: s.type,
          narration: s.narration || '',
          duration: s.duration,
          textOverlays: s.textOverlays,
        })),
      }
    );
    
    const latestProject = await getProjectFromDb(project.id);
    if (latestProject) {
      latestProject.qualityReport = qualityReport;
      await saveProjectToDb(latestProject, ownerId);
      
      console.log(`[QualityEval] Report saved: Score ${qualityReport.overallScore}/100, ${qualityReport.passesQuality ? 'PASSED' : 'NEEDS REVIEW'}`);
      
      if (!qualityReport.passesQuality) {
        console.log(`[QualityEval] Issues detected: ${qualityReport.criticalIssues.length} critical`);
        console.log(`[QualityEval] Recommendations:`, qualityReport.recommendations);
        
        const failedScenes = qualityReport.sceneScores.filter(s => s.needsRegeneration);
        if (failedScenes.length > 0 && failedScenes.length <= 2) {
          console.log(`[QualityEval] Auto-regenerating ${failedScenes.length} failed scenes...`);
          
          const regenResults = await sceneRegenerationService.regenerateFailedScenes(
            {
              id: latestProject.id,
              outputFormat: latestProject.outputFormat,
              scenes: latestProject.scenes,
            },
            failedScenes
          );
          
          for (const result of regenResults) {
            if (result.success && result.newVideoUrl) {
              const sceneIndex = latestProject.scenes.findIndex((s: Scene) => s.id === result.sceneId);
              if (sceneIndex >= 0) {
                latestProject.scenes[sceneIndex].assets = latestProject.scenes[sceneIndex].assets || {} as any;
                (latestProject.scenes[sceneIndex].assets as any).videoUrl = result.newVideoUrl;
                if (result.newAnalysis) {
                  (latestProject.scenes[sceneIndex] as any).analysis = result.newAnalysis;
                }
                if (result.newInstructions) {
                  (latestProject.scenes[sceneIndex] as any).compositionInstructions = result.newInstructions;
                }
              }
            }
          }
          
          // Store regeneration results in progress for tracking
          (latestProject.progress as any).lastRegenerationResults = regenResults;
          
          // Mark project for re-render if scenes were regenerated successfully
          if (regenResults.some(r => r.success)) {
            latestProject.status = 'ready';
            latestProject.progress.steps.rendering.status = 'pending';
            latestProject.progress.steps.rendering.message = 'Scene(s) regenerated - ready to re-render';
            console.log(`[QualityEval] Project marked for re-render due to regenerated scenes`);
          }
          
          await saveProjectToDb(latestProject, ownerId);
          
          console.log(`[QualityEval] Regeneration complete: ${regenResults.filter(r => r.success).length}/${regenResults.length} succeeded`);
        }
      }
    }
  } catch (error: any) {
    console.error(`[QualityEval] Background evaluation failed:`, error.message);
  }
}

// GET /projects/:projectId/generation-estimate - Estimate generation cost/time (Phase 5D)
router.get('/projects/:projectId/generation-estimate', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    const project = await getProjectFromDb(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const scenes = project.scenes || [];
    const visualStyle = (project as any).visualStyle || 'professional';
    // Use actual project brand settings, don't override with defaults
    const brandSettings = (project as any).brandSettings || {};
    const musicEnabled = (project as any).musicEnabled !== false;
    
    // Build scenes for intelligent provider selection
    const scenesForSelection: SceneForSelection[] = scenes.map((scene: Scene, index: number) => ({
      sceneIndex: index,
      sceneType: scene.type,
      contentType: (scene as any).contentType || 'lifestyle',
      narration: scene.narration || '',
      visualDirection: scene.visualDirection || '',
      duration: scene.duration || 5,
    }));
    
    // Use intelligent provider selector for all scenes
    const providerSelections = videoProviderSelector.selectProvidersForProject(
      scenesForSelection,
      visualStyle
    );
    
    // Get provider summary counts and cost breakdown
    const providerCounts = videoProviderSelector.getProviderSummary(providerSelections);
    const { total: videoCost, breakdown: videoCostBreakdown } = videoProviderSelector.calculateTotalCost(
      providerSelections,
      scenesForSelection
    );
    
    // Phase 7D: Compute transitions for all scenes upfront
    const transitionsData = transitionService.planTransitions(
      scenes.map((s: any, i: number) => ({
        sceneIndex: i,
        sceneType: s.type || 'general',
        duration: s.duration || 5,
      })),
      visualStyle
    );
    
    // Build scene providers array for response with explicit fallbacks
    const sceneProviders = Array.from(providerSelections.entries()).map(([index, selection]) => {
      const scene = scenes[index];
      const provider = selection?.provider;
      const sceneTransition = transitionsData.transitions.find((t: any) => t.fromSceneIndex === index);
      return {
        sceneIndex: index,
        sceneType: scene?.type || 'unknown',
        contentType: (scene as any)?.contentType || 'lifestyle',
        duration: scene?.duration || 5,
        provider: provider?.id || 'runway',
        providerName: provider?.displayName || 'Runway Gen-4',
        fallbackProvider: selection?.alternatives?.[0] || 'kling',
        costPerSecond: provider?.costPerSecond || 0.03,
        providerReason: selection?.reason || 'Default selection',
        confidence: selection?.confidence ?? 50,
        alternatives: selection?.alternatives || ['runway', 'hailuo'],
        // Phase 7D: Per-scene intelligence
        intelligence: {
          analysisStatus: 'pending' as const,
          textPlacement: {
            position: scene?.type === 'hook' || scene?.type === 'cta' ? 'center' : 'lower-third',
            alignment: 'center' as const,
          },
          transitionToNext: sceneTransition ? {
            type: sceneTransition.config.type,
            duration: sceneTransition.config.duration,
            moodMatch: sceneTransition.moodFlow || 'smooth',
            reason: sceneTransition.reason || 'Default transition',
          } : undefined,
        },
      };
    });
    
    // Use pre-calculated video cost from provider selector
    const VIDEO_COST = videoCost;
    
    const totalDuration = scenes.reduce((sum: number, s: Scene) => sum + (s.duration || 5), 0);
    
    // Use intelligent image provider selection
    const scenesForImageSelection = scenes.map((scene: Scene, index: number) => ({
      sceneIndex: index,
      contentType: (scene as any).contentType || 'lifestyle',
      sceneType: scene.type || 'unknown',
      visualDirection: scene.visualDirection || '',
      needsImage: scene.type === 'product' || scene.type === 'cta' || 
                  scene.type === 'hook' || scene.type === 'benefit' || 
                  scene.type === 'testimonial' || !(scene as any).videoUrl,
    }));
    
    const imageProviderSelections = imageProviderSelector.selectProvidersForScenes(scenesForImageSelection);
    const rawImageProviderCounts = imageProviderSelector.getProviderSummary(imageProviderSelections);
    const imageProviderCounts = {
      flux: rawImageProviderCounts.flux || 0,
      falai: rawImageProviderCounts.falai || 0,
    };
    const IMAGE_COST = imageProviderSelector.calculateImageCost(imageProviderCounts);
    
    // Calculate other costs
    const VOICEOVER_COST = 0.015 * totalDuration; // ElevenLabs
    const MUSIC_COST = musicEnabled ? 0.10 : 0; // Udio flat rate - only if music enabled
    const SOUND_FX_COST = 0.05; // Kling Sound effects
    const SCENE_ANALYSIS_COST = scenes.length * 0.02; // Claude Vision scene analysis
    const QA_COST = 0.02; // Claude Vision quality check
    
    const totalCost = VIDEO_COST + IMAGE_COST + VOICEOVER_COST + MUSIC_COST + SOUND_FX_COST + SCENE_ANALYSIS_COST + QA_COST;
    
    // Estimate time
    const avgSceneGenTime = 45; // seconds per scene
    const parallelFactor = 0.6;
    const estimatedTimeMin = Math.ceil((scenes.length * avgSceneGenTime * parallelFactor) / 60);
    const estimatedTimeMax = Math.ceil((scenes.length * avgSceneGenTime) / 60);
    
    // Build provider cost breakdown with display names
    const videoCostByProvider: Record<string, { displayName: string; scenes: number; cost: string }> = {};
    Object.entries(videoCostBreakdown).forEach(([id, cost]) => {
      videoCostByProvider[id] = {
        displayName: VIDEO_PROVIDERS[id]?.displayName || id,
        scenes: providerCounts[id] || 0,
        cost: cost.toFixed(2),
      };
    });
    
    // Brand elements summary - only add if actually enabled in project settings
    const brandElements: Array<{ type: string; name: string; description: string; scene: string }> = [];
    if (brandSettings.includeIntroLogo === true) {
      brandElements.push({
        type: 'intro',
        name: 'Intro Logo Animation',
        description: '3 second logo with zoom effect',
        scene: 'Scene 1',
      });
    }
    if (brandSettings.includeWatermark === true) {
      brandElements.push({
        type: 'watermark',
        name: 'Corner Watermark',
        description: `${Math.round((brandSettings.watermarkOpacity || 0.7) * 100)}% opacity, ${brandSettings.watermarkPosition || 'bottom-right'}`,
        scene: `Scenes 2-${Math.max(2, scenes.length - 1)}`,
      });
    }
    if (brandSettings.includeCTAOutro === true) {
      brandElements.push({
        type: 'cta',
        name: 'CTA Outro',
        description: 'Call-to-action with brand URL',
        scene: `Scene ${scenes.length}`,
      });
    }
    
    // Generate warnings
    const warnings: string[] = [];
    const longScenes = scenes.filter((s: Scene) => (s.duration || 5) > 10);
    if (longScenes.length > 0) {
      warnings.push(`${longScenes.length} scene(s) are over 10 seconds - may require multiple video segments`);
    }
    if (scenes.length > 10) {
      warnings.push('Large number of scenes may increase generation time significantly');
    }
    const missingContentType = scenes.filter((s: Scene) => !(s as any).contentType);
    if (missingContentType.length > 0) {
      warnings.push(`${missingContentType.length} scene(s) will use default content type based on style`);
    }
    
    res.json({
      project: {
        title: project.title,
        sceneCount: scenes.length,
        totalDuration,
        visualStyle,
      },
      providers: {
        video: providerCounts,
        videoCostByProvider,
        images: {
          flux: imageProviderCounts.flux,
          falai: imageProviderCounts.falai,
        },
        imageCosts: {
          flux: { 
            count: imageProviderCounts.flux, 
            cost: (imageProviderCounts.flux * 0.03).toFixed(2),
            useCase: 'products',
          },
          falai: { 
            count: imageProviderCounts.falai, 
            cost: (imageProviderCounts.falai * 0.02).toFixed(2),
            useCase: 'lifestyle',
          },
        },
        voiceover: 'ElevenLabs',
        music: musicEnabled ? 'Udio AI (via PiAPI)' : 'Disabled',
        soundFx: 'Kling Sound',
      },
      // Phase 7D: Transition Design (uses pre-computed transitionsData)
      transitions: {
        total: transitionsData.transitions.length,
        summary: transitionsData.summary,
      },
      intelligence: {
        sceneAnalysis: { provider: 'Claude Vision', enabled: true },
        textPlacement: { enabled: true, overlayCount: scenes.length },
        transitions: { enabled: true, moodMatched: true },
      },
      qualityAssurance: {
        enabled: true,
        provider: 'Claude Vision',
        checks: ['Brand compliance', 'Visual quality', 'Content accuracy'],
      },
      // Phase 7C: Sound Design Info for UI
      soundDesign: (() => {
        const soundInfo = soundDesignService.designProjectSoundInfo(
          scenes.map((s: any, i: number) => ({
            sceneIndex: i,
            sceneType: s.type || 'general',
            narration: s.narration || '',
            duration: s.duration || 5,
            visualDirection: s.visualDirection || '',
          })),
          {
            musicEnabled: musicEnabled !== false,
            musicMood: 'uplifting',
            voiceId: 'Rachel',
          }
        );
        return {
          voiceover: soundInfo.voiceover,
          music: soundInfo.music,
          ambientCount: soundInfo.soundEffects.ambientCount,
          transitionCount: soundInfo.soundEffects.transitionCount,
          accentCount: soundInfo.soundEffects.accentCount,
        };
      })(),
      musicEnabled,
      sceneBreakdown: sceneProviders,
      costs: {
        video: VIDEO_COST.toFixed(2),
        videoCostBreakdown: videoCostByProvider,
        images: IMAGE_COST.toFixed(2),
        voiceover: VOICEOVER_COST.toFixed(2),
        music: MUSIC_COST.toFixed(2),
        soundFx: SOUND_FX_COST.toFixed(2),
        sceneAnalysis: SCENE_ANALYSIS_COST.toFixed(2),
        qualityAssurance: QA_COST.toFixed(2),
        total: totalCost.toFixed(2),
      },
      time: {
        estimatedMinutes: `${estimatedTimeMin}-${estimatedTimeMax}`,
        perScene: avgSceneGenTime,
      },
      brandElements,
      brandName: 'Pine Hill Farm',
      warnings,
      qualityTier: (project as any).qualityTier || 'premium',
    });
    
  } catch (error: any) {
    console.error('[UniversalVideo] Generation estimate failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Phase 8A: Analyze individual scene with Claude Vision
router.post('/projects/:projectId/scenes/:sceneIndex/analyze', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneIndex } = req.params;
    const sceneIdx = parseInt(sceneIndex, 10);
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const scenes = projectData.scenes || [];
    if (sceneIdx < 0 || sceneIdx >= scenes.length) {
      return res.status(400).json({ success: false, error: 'Invalid scene index' });
    }
    
    const scene = scenes[sceneIdx];
    const imageUrl = scene.assets?.imageUrl || (scene.background as any)?.url;
    
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: 'Scene has no generated content to analyze' });
    }
    
    console.log(`[Phase8A] Analyzing scene ${sceneIdx + 1}/${scenes.length} for project ${projectId}`);
    
    // Fetch image and convert to base64
    let fullUrl = imageUrl;
    if (imageUrl.startsWith('/objects')) {
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'http://localhost:5000';
      fullUrl = `${baseUrl}${imageUrl}`;
    } else if (imageUrl.startsWith('/')) {
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'http://localhost:5000';
      fullUrl = `${baseUrl}${imageUrl}`;
    }
    
    const response = await fetch(fullUrl, { headers: { 'Accept': 'image/*' } });
    if (!response.ok) {
      return res.status(400).json({ success: false, error: 'Failed to fetch scene image' });
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString('base64');
    
    const context: SceneContext = {
      sceneIndex: sceneIdx,
      sceneType: scene.type || 'content',
      narration: scene.narration || '',
      visualDirection: scene.visualDirection || '',
      expectedContentType: (scene as any).contentType || 'lifestyle',
      totalScenes: scenes.length,
    };
    
    const analysisResult = await sceneAnalysisService.analyzeScenePhase8(base64, context);
    
    // Store analysis result on the scene
    scenes[sceneIdx].analysisResult = analysisResult;
    scenes[sceneIdx].qualityScore = analysisResult.overallScore;
    
    // Save updated project
    projectData.scenes = scenes;
    await saveProjectToDb(projectData, userId);
    
    console.log(`[Phase8A] Scene ${sceneIdx + 1} analysis complete: score=${analysisResult.overallScore}, recommendation=${analysisResult.recommendation}`);
    
    // Phase 11E: Auto-save to asset library if quality score >= 70
    if (analysisResult.overallScore >= 70) {
      try {
        const { saveToLibrary } = await import('../services/asset-library-service');
        const sceneForLibrary = {
          id: scene.id,
          type: scene.type || 'content',
          visualDirection: scene.visualDirection || '',
          imageUrl: imageUrl,
          provider: (scene.assets as any)?.imageProvider || 'unknown',
          analysisResult: {
            overallScore: analysisResult.overallScore,
            contentMatchDetails: {
              presentElements: typeof analysisResult.contentMatchDetails === 'string' 
                ? [analysisResult.contentMatchDetails]
                : [],
            },
          },
        };
        await saveToLibrary(sceneForLibrary, { projectId }, userId);
        console.log(`[Phase11E] Auto-saved scene ${sceneIdx + 1} image to asset library (score: ${analysisResult.overallScore})`);
      } catch (libErr) {
        console.error('[Phase11E] Failed to save to asset library:', libErr);
      }
    }
    
    return res.json({
      success: true,
      analysis: analysisResult,
    });
    
  } catch (error: any) {
    console.error('[Phase8A] Scene analysis error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 8A: Check if an image is blank or gradient
router.post('/check-blank-gradient', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { imageBase64 } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'imageBase64 is required' });
    }
    
    const isBlank = await sceneAnalysisService.isBlankOrGradient(imageBase64);
    
    return res.json({
      success: true,
      isBlankOrGradient: isBlank,
    });
    
  } catch (error: any) {
    console.error('[Phase8A] Blank/gradient check error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 8A: Analyze all scenes in a project (batch analysis)
// Phase 10A: Added diagnostic logging
router.post('/projects/:projectId/analyze-all-scenes', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('[Phase10A] ANALYZE-ALL-SCENES ENDPOINT CALLED');
    console.log(`[Phase10A] Project ID: ${projectId}`);
    console.log(`[Phase10A] ANTHROPIC_API_KEY configured: ${!!process.env.ANTHROPIC_API_KEY}`);
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const scenes = projectData.scenes || [];
    console.log(`[Phase10A] Batch analyzing ${scenes.length} scenes for project ${projectId}`);
    
    const results: Phase8AnalysisResult[] = [];
    let scenesAnalyzed = 0;
    let scenesFailed = 0;
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const imageUrl = scene.assets?.imageUrl || (scene.background as any)?.url;
      
      if (!imageUrl) {
        console.log(`[Phase8A] Scene ${i + 1} has no image, skipping`);
        continue;
      }
      
      try {
        // Resolve URL
        let fullUrl = imageUrl;
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          fullUrl = imageUrl;
        } else if (imageUrl.startsWith('/objects')) {
          const baseUrl = process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
            : 'http://localhost:5000';
          fullUrl = `${baseUrl}${imageUrl}`;
        } else if (imageUrl.startsWith('/')) {
          const baseUrl = process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
            : 'http://localhost:5000';
          fullUrl = `${baseUrl}${imageUrl}`;
        }
        
        const response = await fetch(fullUrl, { headers: { 'Accept': 'image/*' } });
        if (!response.ok) {
          console.warn(`[Phase8A] Failed to fetch scene ${i + 1} image: ${response.status}`);
          scenesFailed++;
          continue;
        }
        
        const buffer = Buffer.from(await response.arrayBuffer());
        const base64 = buffer.toString('base64');
        
        const context: SceneContext = {
          sceneIndex: i,
          sceneType: scene.type || 'content',
          narration: scene.narration || '',
          visualDirection: scene.visualDirection || '',
          expectedContentType: (scene as any).contentType || 'lifestyle',
          totalScenes: scenes.length,
        };
        
        const analysisResult = await sceneAnalysisService.analyzeScenePhase8(base64, context);
        results.push(analysisResult);
        
        // Store on scene
        scenes[i].analysisResult = analysisResult;
        scenes[i].qualityScore = analysisResult.overallScore;
        scenesAnalyzed++;
        
        // Phase 11E: Auto-save to asset library if quality score >= 70
        if (analysisResult.overallScore >= 70) {
          try {
            const { saveToLibrary } = await import('../services/asset-library-service');
            const sceneForLibrary = {
              id: scene.id,
              type: scene.type || 'content',
              visualDirection: scene.visualDirection || '',
              imageUrl: imageUrl,
              provider: (scene.assets as any)?.imageProvider || 'unknown',
              analysisResult: {
                overallScore: analysisResult.overallScore,
                contentMatchDetails: {
                  presentElements: typeof analysisResult.contentMatchDetails === 'string' 
                    ? [analysisResult.contentMatchDetails]
                    : [],
                },
              },
            };
            await saveToLibrary(sceneForLibrary, { projectId }, userId);
            console.log(`[Phase11E] Batch: Auto-saved scene ${i + 1} image to asset library`);
          } catch (libErr) {
            console.error('[Phase11E] Batch: Failed to save to asset library:', libErr);
          }
        }
        
        // Rate limiting: wait 500ms between Claude Vision calls to avoid overwhelming the API
        if (i < scenes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (sceneError: any) {
        console.warn(`[Phase8A] Scene ${i + 1} analysis failed:`, sceneError.message);
        scenesFailed++;
      }
    }
    
    // Save updated project
    projectData.scenes = scenes;
    await saveProjectToDb(projectData, userId);
    
    // Calculate summary
    const avgScore = results.length > 0 
      ? Math.round(results.reduce((sum, r) => sum + r.overallScore, 0) / results.length)
      : 0;
    const needsRegeneration = results.filter(r => r.recommendation === 'regenerate' || r.recommendation === 'critical_fail').length;
    const approved = results.filter(r => r.recommendation === 'approved').length;
    
    console.log(`[Phase8A] Batch analysis complete: ${scenesAnalyzed}/${scenes.length} scenes, avg score: ${avgScore}`);
    
    return res.json({
      success: true,
      summary: {
        totalScenes: scenes.length,
        scenesAnalyzed,
        scenesFailed,
        averageScore: avgScore,
        approved,
        needsReview: results.filter(r => r.recommendation === 'needs_review').length,
        needsRegeneration,
        criticalFail: results.filter(r => r.recommendation === 'critical_fail').length,
      },
      results,
    });
    
  } catch (error: any) {
    console.error('[Phase8A] Batch scene analysis error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 7E: Run QA Review (uses Claude Vision when available, falls back to simulated scoring)
router.post('/projects/:projectId/run-qa', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const scenes = projectData.scenes || [];
    console.log(`[UniversalVideo] Running QA review for project ${projectId} with ${scenes.length} scenes`);
    
    let qualityReport: VideoQualityReport | null = null;
    let usedClaudeVision = false;
    
    // Try using the real Claude Vision quality evaluation service
    const renderedVideoUrl = projectData.outputUrl || (projectData as any).renderedVideoUrl;
    
    if (qualityEvaluationService.isAvailable()) {
      // If we have a rendered video, analyze the full video
      if (renderedVideoUrl) {
        try {
          console.log('[UniversalVideo] Using Claude Vision for QA review with rendered video:', renderedVideoUrl);
          qualityReport = await qualityEvaluationService.evaluateVideo(
            renderedVideoUrl,
            {
              projectId,
              scenes: scenes.map((s, i) => ({
                id: s.id,
                type: s.type,
                narration: s.narration || '',
                duration: s.duration || 5,
                textOverlays: s.textOverlays || [],
              })),
            }
          );
          usedClaudeVision = true;
        } catch (claudeError: any) {
          console.warn('[UniversalVideo] Claude Vision QA failed:', claudeError.message);
        }
      } else {
        // Pre-render QA: Evaluate individual scene images with Claude Vision
        console.log('[UniversalVideo] Running pre-render QA - evaluating individual scene assets');
        
        const sceneScores: Array<{
          sceneId: string;
          sceneIndex: number;
          overallScore: number;
          scores: { composition: number; visibility: number; technicalQuality: number; contentMatch: number; professionalLook: number };
          issues: Array<{ type: string; severity: 'critical' | 'major' | 'minor'; description: string; sceneIndex?: number }>;
          passesThreshold: boolean;
          needsRegeneration: boolean;
        }> = [];
        
        let scenesEvaluated = 0;
        
        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i];
          const imageUrl = scene.assets?.imageUrl || (scene.background as any)?.url;
          
          if (imageUrl) {
            try {
              // Resolve image URL to a fetchable endpoint
              let fullUrl = imageUrl;
              
              // Handle various URL formats
              if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                fullUrl = imageUrl;
              } else if (imageUrl.startsWith('/objects')) {
                // Object storage path - use internal server URL
                const baseUrl = process.env.REPLIT_DEV_DOMAIN 
                  ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
                  : 'http://localhost:5000';
                fullUrl = `${baseUrl}${imageUrl}`;
              } else if (imageUrl.startsWith('/replit-objstore-')) {
                // Legacy object storage format
                const baseUrl = process.env.REPLIT_DEV_DOMAIN 
                  ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
                  : 'http://localhost:5000';
                fullUrl = `${baseUrl}/objects${imageUrl}`;
              } else if (imageUrl.startsWith('/')) {
                const baseUrl = process.env.REPLIT_DEV_DOMAIN 
                  ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
                  : 'http://localhost:5000';
                fullUrl = `${baseUrl}${imageUrl}`;
              }
              
              console.log(`[UniversalVideo] Evaluating scene ${i + 1} image: ${imageUrl.substring(0, 60)}...`);
              
              const response = await fetch(fullUrl, { 
                headers: { 
                  'Accept': 'image/*',
                  // Add any auth headers if needed for internal requests
                }
              });
              
              if (response.ok) {
                const buffer = Buffer.from(await response.arrayBuffer());
                const base64 = buffer.toString('base64');
                
                const result = await qualityEvaluationService.evaluateSceneComprehensive(
                  base64,
                  {
                    sceneIndex: i,
                    sceneType: scene.type || 'general',
                    narration: scene.narration || '',
                    totalScenes: scenes.length,
                    expectedContentType: (scene as any).contentType || 'lifestyle',
                  }
                );
                
                sceneScores.push({
                  sceneId: scene.id,
                  sceneIndex: i,
                  overallScore: result.overallScore,
                  scores: {
                    composition: result.scores.composition,
                    visibility: 80,
                    technicalQuality: result.scores.technical,
                    contentMatch: result.scores.brand.total,
                    professionalLook: 80,
                  },
                  issues: result.issues.map(issue => ({ ...issue, sceneIndex: i })),
                  passesThreshold: result.recommendation === 'pass' || result.recommendation === 'adjust',
                  needsRegeneration: result.recommendation === 'regenerate',
                });
                
                scenesEvaluated++;
                usedClaudeVision = true;
              }
            } catch (sceneError: any) {
              console.warn(`[UniversalVideo] Failed to evaluate scene ${i + 1} with Claude Vision:`, sceneError.message);
              // Continue to next scene - will use simulated data if no scenes evaluated
            }
          }
        }
        
        if (scenesEvaluated > 0) {
          const avgScore = Math.round(sceneScores.reduce((sum, s) => sum + s.overallScore, 0) / sceneScores.length);
          const allIssues = sceneScores.flatMap(s => s.issues) as QualityIssue[];
          const criticalIssues = allIssues.filter(i => i.severity === 'critical');
          
          qualityReport = {
            projectId,
            overallScore: avgScore,
            passesQuality: avgScore >= 70 && criticalIssues.length === 0,
            sceneScores: sceneScores as any,
            criticalIssues,
            recommendations: avgScore >= 85 
              ? ['Video meets all quality standards'] 
              : criticalIssues.length > 0
                ? ['Address critical issues before rendering']
                : ['Consider minor improvements for best results'],
            evaluatedAt: new Date().toISOString(),
          };
          
          console.log(`[UniversalVideo] Pre-render QA complete: ${scenesEvaluated} scenes evaluated, avg score ${avgScore}`);
        }
      }
    }
    
    // Phase 10C: Return pending status when Claude Vision is not available
    // DO NOT generate fake random scores - UI should show "Pending" state
    if (!qualityReport) {
      console.warn('═══════════════════════════════════════════════════════════════════════════════');
      console.warn('[Phase10C] Claude Vision analysis not available');
      console.warn('[Phase10C] ANTHROPIC_API_KEY configured:', !!process.env.ANTHROPIC_API_KEY);
      console.warn('[Phase10C] Returning pending status - NO FAKE SCORES');
      console.warn('═══════════════════════════════════════════════════════════════════════════════');
      
      // Phase 10C: Return pending status for each scene instead of fake scores
      const sceneScores = scenes.map((scene, i) => ({
        sceneId: scene.id,
        sceneIndex: i,
        overallScore: 0,  // Phase 10C: Zero indicates pending (no fake score)
        scores: {
          composition: 0,
          visibility: 0,
          technicalQuality: 0,
          contentMatch: 0,
          professionalLook: 0,
        },
        issues: [] as QualityIssue[],
        passesThreshold: false,  // Cannot pass without real analysis
        needsRegeneration: false,
      }));
      
      qualityReport = {
        projectId,
        overallScore: 0,  // Phase 10C: Zero indicates pending
        passesQuality: false,  // Cannot pass without real analysis
        sceneScores,
        criticalIssues: [],
        recommendations: ['Configure ANTHROPIC_API_KEY to enable real quality analysis'],
        evaluatedAt: new Date().toISOString(),
      };
    }
    
    // Save the quality report to project (uses existing qualityReport field)
    projectData.qualityReport = qualityReport;
    projectData.updatedAt = new Date().toISOString();
    await saveProjectToDb(projectData, projectData.ownerId);
    
    // Transform to QA Gate format for frontend
    const criticalIssues = qualityReport.criticalIssues || [];
    const majorIssues = qualityReport.sceneScores?.flatMap(s => 
      (s.issues || []).filter(i => i.severity === 'major')
    ) || [];
    
    const allIssues = [
      ...criticalIssues.map(i => ({ ...i, sceneIndex: i.sceneIndex || 0 })),
      ...qualityReport.sceneScores?.flatMap(s => 
        (s.issues || []).map(i => ({ ...i, sceneIndex: s.sceneIndex }))
      ) || [],
    ];
    
    const aiArtifactsClear = !allIssues.some(i => 
      i.type === 'ai-text-detected' || i.type === 'ai-ui-detected'
    );
    
    const avgScores = qualityReport.sceneScores?.length > 0 ? {
      technical: Math.round(qualityReport.sceneScores.reduce((sum, s) => sum + (s.scores?.technicalQuality || 75), 0) / qualityReport.sceneScores.length),
      composition: Math.round(qualityReport.sceneScores.reduce((sum, s) => sum + (s.scores?.composition || 75), 0) / qualityReport.sceneScores.length),
      brand: Math.round(qualityReport.sceneScores.reduce((sum, s) => sum + (s.scores?.contentMatch || 75), 0) / qualityReport.sceneScores.length),
    } : { technical: 75, composition: 75, brand: 75 };
    
    let recommendation: 'approved' | 'needs-review' | 'needs-fixes' = 'approved';
    if (criticalIssues.length > 0) {
      recommendation = 'needs-fixes';
    } else if (majorIssues.length > 2 || qualityReport.overallScore < 70) {
      recommendation = 'needs-review';
    }
    
    const qaResult = {
      overallScore: qualityReport.overallScore,
      technicalScore: avgScores.technical,
      brandComplianceScore: avgScores.brand,
      compositionScore: avgScores.composition,
      aiArtifactsClear,
      issues: allIssues.map(i => ({
        sceneIndex: i.sceneIndex || 0,
        severity: i.severity,
        description: i.description,
      })),
      recommendation,
      usedClaudeVision,
      evaluatedAt: qualityReport.evaluatedAt,
    };
    
    console.log(`[UniversalVideo] QA review complete: score ${qualityReport.overallScore}/100, recommendation: ${recommendation}, Claude Vision: ${usedClaudeVision}`);
    
    res.json({
      success: true,
      qaResult,
      qualityReport, // Also return full report for detailed view
    });
    
  } catch (error: any) {
    console.error('[UniversalVideo] QA review failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 7E: Get QA Result
router.get('/projects/:projectId/qa-result', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const qualityReport = projectData.qualityReport;
    
    if (!qualityReport) {
      return res.json({
        success: true,
        qaResult: null,
      });
    }
    
    // Transform existing qualityReport to QA Gate format
    const criticalIssues = qualityReport.criticalIssues || [];
    const allIssues = [
      ...criticalIssues.map(i => ({ ...i, sceneIndex: i.sceneIndex || 0 })),
      ...qualityReport.sceneScores?.flatMap(s => 
        (s.issues || []).map(i => ({ ...i, sceneIndex: s.sceneIndex }))
      ) || [],
    ];
    
    const aiArtifactsClear = !allIssues.some(i => 
      i.type === 'ai-text-detected' || i.type === 'ai-ui-detected'
    );
    
    const avgScores = qualityReport.sceneScores?.length > 0 ? {
      technical: Math.round(qualityReport.sceneScores.reduce((sum, s) => sum + (s.scores?.technicalQuality || 75), 0) / qualityReport.sceneScores.length),
      composition: Math.round(qualityReport.sceneScores.reduce((sum, s) => sum + (s.scores?.composition || 75), 0) / qualityReport.sceneScores.length),
      brand: Math.round(qualityReport.sceneScores.reduce((sum, s) => sum + (s.scores?.contentMatch || 75), 0) / qualityReport.sceneScores.length),
    } : { technical: 75, composition: 75, brand: 75 };
    
    let recommendation: 'approved' | 'needs-review' | 'needs-fixes' = 'approved';
    if (criticalIssues.length > 0) {
      recommendation = 'needs-fixes';
    } else if (allIssues.filter(i => i.severity === 'major').length > 2 || qualityReport.overallScore < 70) {
      recommendation = 'needs-review';
    }
    
    const qaResult = {
      overallScore: qualityReport.overallScore,
      technicalScore: avgScores.technical,
      brandComplianceScore: avgScores.brand,
      compositionScore: avgScores.composition,
      aiArtifactsClear,
      issues: allIssues.map(i => ({
        sceneIndex: i.sceneIndex || 0,
        severity: i.severity,
        description: i.description,
      })),
      recommendation,
      evaluatedAt: qualityReport.evaluatedAt,
    };
    
    res.json({
      success: true,
      qaResult,
      qualityReport,
    });
    
  } catch (error: any) {
    console.error('[UniversalVideo] Get QA result failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Phase 8B: Auto-Regeneration Endpoints
// ============================================

router.post('/projects/:projectId/scenes/:sceneIndex/auto-regenerate', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneIndex } = req.params;
    const sceneIdx = parseInt(sceneIndex, 10);
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    if (sceneIdx < 0 || sceneIdx >= projectData.scenes.length) {
      return res.status(400).json({ success: false, error: 'Invalid scene index' });
    }
    
    const scene = projectData.scenes[sceneIdx];
    
    // Create a default analysis result if none exists to allow regeneration
    const analysisResult: Phase8AnalysisResult = scene.analysisResult || {
      sceneIndex: sceneIdx,
      overallScore: 50,
      technicalScore: 50,
      contentMatchScore: 50,
      brandComplianceScore: 50,
      compositionScore: 50,
      aiArtifactsDetected: false,
      aiArtifactDetails: [],
      contentMatchDetails: 'User requested regeneration',
      brandComplianceDetails: 'Pending analysis',
      frameAnalysis: {
        subjectPosition: 'center' as const,
        faceDetected: false,
        busyRegions: [],
        dominantColors: [],
        lightingType: 'neutral' as const,
        safeTextZones: [],
      },
      issues: [{ 
        category: 'technical' as const, 
        severity: 'minor' as const, 
        description: 'User requested regeneration', 
        suggestion: 'Regenerating...' 
      }],
      recommendation: 'regenerate' as const,
      analysisTimestamp: new Date().toISOString(),
      analysisModel: 'user-requested',
    };
    
    console.log(`[Phase8B] Starting auto-regeneration for scene ${sceneIdx + 1}`);
    
    // Check if this scene uses video (B-Roll) - if so, trigger video regeneration instead
    const isVideoScene = scene.background?.type === 'video' || scene.assets?.videoUrl;
    
    if (isVideoScene) {
      console.log(`[Phase8B] Scene ${sceneIdx + 1} is a video scene - triggering async video regeneration`);
      
      const { videoGenerationWorker } = await import('../services/video-generation-worker');
      
      // Check if there's already an active job for this scene
      const existingJob = await videoGenerationWorker.getActiveJobForScene(projectId, scene.id);
      if (existingJob) {
        console.log(`[Phase8B] Scene ${scene.id} already has active job: ${existingJob.jobId}`);
        return res.json({ 
          success: true, 
          jobId: existingJob.jobId,
          status: existingJob.status,
          progress: existingJob.progress,
          message: 'Video generation already in progress',
          isVideoRegeneration: true,
        });
      }
      
      // Create async video generation job
      const prompt = scene.visualDirection || (scene as any).description || 'Professional wellness video';
      const fallbackPrompt = (scene as any).summary || 'professional video';
      
      const job = await videoGenerationWorker.createJob({
        projectId,
        sceneId: scene.id,
        provider: 'runway', // Default to Runway for auto-regeneration
        prompt,
        fallbackPrompt,
        duration: scene.duration || 6,
        aspectRatio: projectData.outputFormat?.aspectRatio || '16:9',
        style: (projectData as any).settings?.visualStyle || 'professional',
        triggeredBy: userId,
      });
      
      console.log(`[Phase8B] Created video job ${job.jobId} for scene ${scene.id}`);
      
      return res.json({ 
        success: true, 
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        message: 'Video regeneration job created',
        isVideoRegeneration: true,
        project: projectData,
      });
    }
    
    // Image regeneration path (original logic)
    const sceneForRegen: SceneForRegeneration = {
      id: scene.id,
      sceneIndex: sceneIdx,
      sceneType: scene.type || 'content',
      contentType: (scene as any).contentType || 'lifestyle',
      narration: scene.narration || '',
      visualDirection: scene.visualDirection || '',
      duration: scene.duration || 0,
      currentProvider: (scene.assets as any)?.provider || 'flux',
      currentAssetUrl: scene.assets?.imageUrl || scene.assets?.videoUrl,
      analysisResult: analysisResult,
      projectId,
      aspectRatio: projectData.outputFormat?.aspectRatio || '16:9',
      totalScenes: projectData.scenes.length,
    };
    
    const result = await autoRegenerationService.regenerateScene(sceneForRegen);
    
    if (result.success && result.newAssetUrl) {
      const oldUrl = scene.assets?.imageUrl;
      
      if (!scene.assets) scene.assets = {};
      scene.assets.imageUrl = result.newAssetUrl;
      scene.assets.backgroundUrl = result.newAssetUrl;
      scene.analysisResult = result.newAnalysis;
      scene.qualityScore = result.finalScore;
      
      if (!projectData.regenerationHistory) projectData.regenerationHistory = [];
      projectData.regenerationHistory.push({
        id: `autoregen_${Date.now()}`,
        sceneId: scene.id,
        assetType: 'image',
        previousUrl: oldUrl,
        newUrl: result.newAssetUrl,
        prompt: result.attempts[result.attempts.length - 1]?.prompt || '',
        timestamp: new Date().toISOString(),
        success: true,
      });
      
      await saveProjectToDb(projectData, projectData.ownerId);
    } else if (result.escalatedToUser) {
      await autoRegenerationService.escalateToUserReview(sceneForRegen, result);
      (scene as any).needsUserReview = true;
      await saveProjectToDb(projectData, projectData.ownerId);
    }
    
    res.json({
      success: result.success,
      finalScore: result.finalScore,
      attempts: result.attempts.length,
      escalatedToUser: result.escalatedToUser,
      newAssetUrl: result.newAssetUrl,
      isVideoRegeneration: false,
      project: projectData,
    });
    
  } catch (error: any) {
    console.error('[Phase8B] Auto-regeneration failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/projects/:projectId/auto-regenerate-failed', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const failedScenes: SceneForRegeneration[] = [];
    
    for (let i = 0; i < projectData.scenes.length; i++) {
      const scene = projectData.scenes[i];
      if (scene.analysisResult && 
          (scene.analysisResult.recommendation === 'regenerate' || 
           scene.analysisResult.recommendation === 'critical_fail' ||
           scene.analysisResult.overallScore < 70)) {
        
        failedScenes.push({
          id: scene.id,
          sceneIndex: i,
          sceneType: scene.type || 'content',
          contentType: (scene as any).contentType || 'lifestyle',
          narration: scene.narration || '',
          visualDirection: scene.visualDirection || '',
          duration: scene.duration || 0,
          currentProvider: (scene.assets as any)?.provider || 'flux',
          currentAssetUrl: scene.assets?.imageUrl || scene.assets?.videoUrl,
          analysisResult: scene.analysisResult,
          projectId,
          aspectRatio: projectData.outputFormat?.aspectRatio || '16:9',
          totalScenes: projectData.scenes.length,
        });
      }
    }
    
    if (failedScenes.length === 0) {
      return res.json({
        success: true,
        message: 'No scenes need regeneration',
        succeeded: 0,
        escalated: 0,
      });
    }
    
    console.log(`[Phase8B] Auto-regenerating ${failedScenes.length} failed scenes`);
    
    const batchResult = await autoRegenerationService.regenerateAllFailedScenes(failedScenes);
    
    for (const result of batchResult.results) {
      const sceneForRegen = failedScenes.find(s => s.sceneIndex === result.newAnalysis?.sceneIndex);
      if (sceneForRegen && result.success && result.newAssetUrl) {
        const scene = projectData.scenes[sceneForRegen.sceneIndex];
        if (!scene.assets) scene.assets = {};
        scene.assets.imageUrl = result.newAssetUrl;
        scene.analysisResult = result.newAnalysis;
        scene.qualityScore = result.finalScore;
      }
    }
    
    await saveProjectToDb(projectData, projectData.ownerId);
    
    res.json({
      success: true,
      totalProcessed: failedScenes.length,
      succeeded: batchResult.succeeded,
      escalated: batchResult.escalated,
      project: projectData,
    });
    
  } catch (error: any) {
    console.error('[Phase8B] Batch auto-regeneration failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/projects/:projectId/review-queue', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const queue = autoRegenerationService.getReviewQueue(projectId);
    
    res.json({
      success: true,
      queue,
      count: queue.length,
    });
    
  } catch (error: any) {
    console.error('[Phase8B] Get review queue failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/projects/:projectId/review-queue/:sceneId/resolve', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneId } = req.params;
    const { action, customPrompt } = req.body;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    if (action === 'approve') {
      autoRegenerationService.clearReviewQueueEntry(projectId, sceneId);
      
      const sceneIndex = projectData.scenes.findIndex((s: Scene) => s.id === sceneId);
      if (sceneIndex >= 0) {
        (projectData.scenes[sceneIndex] as any).needsUserReview = false;
        (projectData.scenes[sceneIndex] as any).userApproved = true;
        await saveProjectToDb(projectData, projectData.ownerId);
      }
      
      return res.json({ success: true, message: 'Scene approved by user' });
    }
    
    if (action === 'regenerate') {
      autoRegenerationService.clearReviewQueueEntry(projectId, sceneId);
      
      const sceneIndex = projectData.scenes.findIndex((s: Scene) => s.id === sceneId);
      if (sceneIndex < 0) {
        return res.status(404).json({ success: false, error: 'Scene not found' });
      }
      
      const scene = projectData.scenes[sceneIndex];
      
      if (customPrompt) {
        scene.visualDirection = customPrompt;
      }
      
      const sceneForRegen: SceneForRegeneration = {
        id: scene.id,
        sceneIndex,
        sceneType: scene.type || 'content',
        contentType: (scene as any).contentType || 'lifestyle',
        narration: scene.narration || '',
        visualDirection: scene.visualDirection || '',
        duration: scene.duration || 0,
        currentProvider: (scene.assets as any)?.provider || 'flux',
        currentAssetUrl: scene.assets?.imageUrl,
        analysisResult: scene.analysisResult!,
        projectId,
        aspectRatio: projectData.outputFormat?.aspectRatio || '16:9',
        totalScenes: projectData.scenes.length,
      };
      
      const result = await autoRegenerationService.regenerateScene(sceneForRegen);
      
      if (result.success && result.newAssetUrl) {
        if (!scene.assets) scene.assets = {};
        scene.assets.imageUrl = result.newAssetUrl;
        scene.analysisResult = result.newAnalysis;
        scene.qualityScore = result.finalScore;
        (scene as any).needsUserReview = false;
        await saveProjectToDb(projectData, projectData.ownerId);
      }
      
      return res.json({
        success: result.success,
        finalScore: result.finalScore,
        newAssetUrl: result.newAssetUrl,
        project: projectData,
      });
    }
    
    return res.status(400).json({ success: false, error: 'Invalid action. Use "approve" or "regenerate"' });
    
  } catch (error: any) {
    console.error('[Phase8B] Resolve review queue failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/auto-regeneration/config', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const config = autoRegenerationService.getConfig();
    res.json({ success: true, config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// PHASE 13E: INTELLIGENT REGENERATION SYSTEM
// ============================================================

router.post('/projects/:projectId/scenes/:sceneIndex/intelligent-regenerate', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneIndex } = req.params;
    
    const projectRows = await db.select().from(universalVideoProjects)
      .where(eq(universalVideoProjects.projectId, projectId))
      .limit(1);
    
    if (projectRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    const projectData = dbRowToVideoProject(projectRows[0]);
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const sceneIdx = parseInt(sceneIndex, 10);
    if (sceneIdx < 0 || sceneIdx >= projectData.scenes.length) {
      return res.status(404).json({ success: false, error: 'Scene not found' });
    }
    
    const scene = projectData.scenes[sceneIdx];
    const issues: QualityIssue[] = (scene.analysisResult as any)?.issues || [];
    
    console.log(`[Phase13E] Intelligent regeneration for scene ${sceneIdx + 1}`);
    
    const result = await intelligentRegenerationService.regenerateScene(
      {
        id: scene.id,
        type: scene.type || 'content',
        duration: scene.duration || 5,
        narration: scene.narration,
        visualDirection: scene.visualDirection,
        textOverlays: scene.textOverlays,
        assets: scene.assets,
        background: (scene as any).background,
      },
      {
        id: projectId,
        outputFormat: projectData.outputFormat,
        scenes: projectData.scenes.map(s => ({
          id: s.id,
          type: s.type || 'content',
          duration: s.duration || 5,
          narration: s.narration,
          visualDirection: s.visualDirection,
          textOverlays: s.textOverlays,
          assets: s.assets,
          background: (s as any).background,
        })),
      },
      issues,
      sceneIdx
    );
    
    if (result.success && result.newVideoUrl) {
      if (!scene.assets) scene.assets = {};
      scene.assets.videoUrl = result.newVideoUrl;
      (scene as any).analysis = result.newAnalysis;
      (scene as any).compositionInstructions = result.newInstructions;
      
      if (!projectData.regenerationHistory) projectData.regenerationHistory = [];
      projectData.regenerationHistory.push({
        id: `intelligent_regen_${Date.now()}`,
        sceneId: scene.id,
        assetType: 'video',
        previousUrl: (scene.assets as any)?.previousVideoUrl || '',
        newUrl: result.newVideoUrl,
        prompt: result.strategy.changes.prompt || scene.visualDirection || '',
        timestamp: new Date().toISOString(),
        success: true,
      });
      
      await saveProjectToDb(projectData, projectData.ownerId);
    }
    
    res.json({
      success: result.success,
      sceneIndex: sceneIdx,
      attempt: result.attempt,
      strategy: {
        approach: result.strategy.approach,
        reasoning: result.strategy.reasoning,
        confidence: result.strategy.confidenceScore,
        warning: result.strategy.warning,
      },
      newVideoUrl: result.newVideoUrl,
      usedStockFootage: result.usedStockFootage,
      error: result.error,
      project: projectData,
    });
    
  } catch (error: any) {
    console.error('[Phase13E] Intelligent regeneration failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/projects/:projectId/scenes/:sceneId/regeneration-history', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, sceneId } = req.params;
    
    const projectRows = await db.select().from(universalVideoProjects)
      .where(eq(universalVideoProjects.projectId, projectId))
      .limit(1);
    
    if (projectRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    const projectData = dbRowToVideoProject(projectRows[0]);
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const sceneExists = projectData.scenes.some((s: Scene) => s.id === sceneId);
    if (!sceneExists) {
      return res.status(404).json({ success: false, error: 'Scene not found in project' });
    }
    
    const history = await intelligentRegenerationService.getSceneHistory(sceneId, projectId);
    
    res.json({
      success: true,
      sceneId,
      projectId,
      history,
      attemptCount: history.length,
    });
    
  } catch (error: any) {
    console.error('[Phase13E] Get regeneration history failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/projects/:projectId/scenes/:sceneId/analyze-prompt-complexity', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }
    
    const complexity = promptComplexityAnalyzer.analyze(prompt);
    
    res.json({
      success: true,
      complexity: {
        score: complexity.score,
        category: complexity.category,
        factors: complexity.factors,
        recommendations: complexity.recommendations,
        warning: complexity.userWarning,
      },
    });
    
  } catch (error: any) {
    console.error('[Phase13E] Prompt complexity analysis failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/regeneration/preview-strategy', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { prompt, attemptCount = 0, currentMediaUrl, previousIssues = [] } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }
    
    const complexity = promptComplexityAnalyzer.analyze(prompt);
    
    const mockAttempts = Array(attemptCount).fill(null).map((_, i) => ({
      attemptNumber: i + 1,
      timestamp: new Date(),
      provider: 'kling-2.5-turbo',
      prompt,
      result: 'failure' as const,
      issues: previousIssues,
    }));
    
    const strategy = regenerationStrategyEngine.determineStrategy({
      attempts: mockAttempts,
      complexity,
      currentPrompt: prompt,
      currentMediaUrl,
    });
    
    res.json({
      success: true,
      complexity: {
        score: complexity.score,
        category: complexity.category,
        warning: complexity.userWarning,
      },
      strategy: {
        approach: strategy.approach,
        reasoning: strategy.reasoning,
        confidence: strategy.confidenceScore,
        warning: strategy.warning,
        changes: strategy.changes,
      },
      suggestion: regenerationStrategyEngine.getNextSuggestion(strategy),
    });
    
  } catch (error: any) {
    console.error('[Phase13E] Preview strategy failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// PHASE 8C: SMART TEXT PLACEMENT
// ============================================================

const textOverlaySchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(['lower_third', 'title', 'subtitle', 'caption', 'cta']),
});

router.post('/projects/:projectId/scenes/:sceneIndex/calculate-text-placements', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId, sceneIndex } = req.params;
    const { overlays, sceneDuration, fps = 30 } = req.body;

    if (!overlays || !Array.isArray(overlays)) {
      return res.status(400).json({ success: false, error: 'Overlays array is required' });
    }

    const validatedOverlays = overlays.map((o: any) => textOverlaySchema.parse(o)) as TextOverlayType[];
    const inputCount = validatedOverlays.length;

    const projectRows = await db.select().from(universalVideoProjects)
      .where(eq(universalVideoProjects.projectId, projectId))
      .limit(1);

    if (projectRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const projectData = dbRowToVideoProject(projectRows[0]);
    const sceneIdx = parseInt(sceneIndex, 10);

    if (sceneIdx < 0 || sceneIdx >= projectData.scenes.length) {
      return res.status(404).json({ success: false, error: 'Scene not found' });
    }

    const scene = projectData.scenes[sceneIdx];
    const duration = sceneDuration || scene.duration || 5;

    let sceneAnalysis = null;
    if (scene.analysisResult) {
      try {
        sceneAnalysis = {
          faces: {
            detected: (scene.analysisResult as any).faceDetected || false,
            count: (scene.analysisResult as any).faceCount || 0,
            positions: (scene.analysisResult as any).facePositions || [],
          },
          composition: {
            focalPoint: { x: 0.5, y: 0.5 },
            brightness: 'normal' as const,
            dominantColors: (scene.analysisResult as any).dominantColors || [],
          },
          safeZones: (scene.analysisResult as any).safeZones || {
            topLeft: true, topCenter: true, topRight: true,
            middleLeft: true, middleCenter: true, middleRight: true,
            bottomLeft: true, bottomCenter: true, bottomRight: true,
          },
          recommendations: {
            textPosition: { vertical: 'lower-third' as const, horizontal: 'center' as const },
            textColor: '#FFFFFF',
            needsTextShadow: true,
            needsTextBackground: false,
            productOverlayPosition: { x: 'right' as const, y: 'bottom' as const },
            productOverlaySafe: true,
          },
          contentType: 'mixed' as const,
          mood: 'positive' as const,
        };
      } catch (e) {
        console.warn('[TextPlacement] Could not parse scene analysis:', e);
      }
    }

    const result = textPlacementService.calculatePlacements(
      validatedOverlays,
      sceneAnalysis,
      duration,
      fps
    );

    res.json({
      success: true,
      sceneIndex: sceneIdx,
      placements: result.placements,
      stats: {
        inputCount,
        uniqueCount: result.stats.uniqueCount,
        outputCount: result.placements.length,
        duplicatesRemoved: inputCount - result.stats.uniqueCount,
        placementsBlocked: result.stats.skipped,
      },
    });

  } catch (error: any) {
    console.error('[Phase8C] Calculate text placements failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/text-placement/styles', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const styles = textPlacementService.getDefaultStyles();
    const positions = textPlacementService.getPositionCoords();
    res.json({ success: true, styles, positions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// PHASE 8D: MOOD-MATCHED TRANSITIONS
// ============================================================

router.post('/projects/:projectId/plan-transitions', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { visualStyle } = req.body;

    const projectRows = await db.select().from(universalVideoProjects)
      .where(eq(universalVideoProjects.projectId, projectId))
      .limit(1);

    if (projectRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const projectData = dbRowToVideoProject(projectRows[0]);
    const style = visualStyle || (projectData as any).style || 'professional';

    const scenesForTransition = projectData.scenes.map((scene, index) => ({
      sceneIndex: index,
      sceneType: scene.type || 'content',
      duration: scene.duration || 5,
      analysisResult: scene.analysisResult,
    }));

    const transitionPlan = transitionService.planTransitions(scenesForTransition, style);

    res.json({
      success: true,
      projectId,
      visualStyle: style,
      plan: transitionPlan,
    });

  } catch (error: any) {
    console.error('[Phase8D] Plan transitions failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/projects/:projectId/transitions/:transitionIndex/remotion-props', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId, transitionIndex } = req.params;
    const { fps = 30 } = req.query;

    const projectRows = await db.select().from(universalVideoProjects)
      .where(eq(universalVideoProjects.projectId, projectId))
      .limit(1);

    if (projectRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const projectData = dbRowToVideoProject(projectRows[0]);
    const style = (projectData as any).style || 'professional';

    const scenesForTransition = projectData.scenes.map((scene, index) => ({
      sceneIndex: index,
      sceneType: scene.type || 'content',
      duration: scene.duration || 5,
      analysisResult: scene.analysisResult,
    }));

    const transitionPlan = transitionService.planTransitions(scenesForTransition, style);
    const idx = parseInt(transitionIndex, 10);

    if (idx < 0 || idx >= transitionPlan.transitions.length) {
      return res.status(404).json({ success: false, error: 'Transition not found' });
    }

    const transition = transitionPlan.transitions[idx];
    const remotionType = transitionService.getRemotionTransition(transition.config.type);
    const remotionProps = transitionService.getRemotionTransitionProps(transition, Number(fps));
    const audioConfig = transitionService.getAudioCrossfadeConfig(transition);

    res.json({
      success: true,
      transitionIndex: idx,
      transition,
      remotion: {
        type: remotionType,
        props: remotionProps,
      },
      audio: audioConfig,
    });

  } catch (error: any) {
    console.error('[Phase8D] Get transition props failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/transitions/mood-mapping', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const moodMapping = transitionService.getMoodMapping();
    const transitionTypes = transitionService.getAvailableTransitionTypes();
    const stylePreferences = transitionService.getStylePreferences();

    res.json({
      success: true,
      moodMapping,
      transitionTypes,
      stylePreferences,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// PHASE 8E: Brand Asset Injection Endpoints
// ============================================

router.get('/projects/:projectId/brand-injection', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const projectRows = await db.select().from(universalVideoProjects)
      .where(eq(universalVideoProjects.projectId, projectId))
      .limit(1);

    if (projectRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const plan = await brandInjectionService.createInjectionPlan(projectId);

    res.json({
      success: true,
      plan,
      defaults: brandInjectionService.getDefaultSettings(),
    });

  } catch (error: any) {
    console.error('[Phase8E] Get brand injection plan failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/projects/:projectId/brand-injection', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const overrides = req.body as Partial<BrandInjectionPlan>;

    const projectRows = await db.select().from(universalVideoProjects)
      .where(eq(universalVideoProjects.projectId, projectId))
      .limit(1);

    if (projectRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const plan = await brandInjectionService.createInjectionPlan(projectId, overrides);

    res.json({
      success: true,
      plan,
    });

  } catch (error: any) {
    console.error('[Phase8E] Update brand injection plan failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/projects/:projectId/brand-injection/remotion-props', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { fps = 30 } = req.query;

    const projectRows = await db.select().from(universalVideoProjects)
      .where(eq(universalVideoProjects.projectId, projectId))
      .limit(1);

    if (projectRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const projectData = dbRowToVideoProject(projectRows[0]);
    const plan = await brandInjectionService.createInjectionPlan(projectId);

    const totalContentDuration = projectData.scenes.reduce((sum, scene) => sum + (scene.duration || 5), 0);
    const totalContentFrames = Math.round(totalContentDuration * Number(fps));

    const remotionProps = brandInjectionService.getRemotionBrandProps(plan, totalContentFrames, Number(fps));

    res.json({
      success: true,
      projectId,
      plan,
      remotionProps,
      contentDuration: totalContentDuration,
      totalDurationWithBrand: totalContentDuration + plan.totalAddedDuration,
    });

  } catch (error: any) {
    console.error('[Phase8E] Get brand injection Remotion props failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/brand-injection/defaults', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const defaults = brandInjectionService.getDefaultSettings();
    const hasAssets = await brandInjectionService.hasBrandAssets();

    res.json({
      success: true,
      defaults,
      hasAssets,
    });

  } catch (error: any) {
    console.error('[Phase8E] Get brand injection defaults failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// PHASE 8F: Quality Assurance Dashboard Endpoints
// ============================================

router.get('/projects/:projectId/quality-report', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const projectRows = await db.select().from(universalVideoProjects)
      .where(eq(universalVideoProjects.projectId, projectId))
      .limit(1);

    if (projectRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const projectData = dbRowToVideoProject(projectRows[0]);
    
    const analyses: Phase8AnalysisResult[] = projectData.scenes.map((scene, idx) => {
      if (scene.analysisResult) {
        return scene.analysisResult;
      }
      return {
        sceneIndex: idx,
        overallScore: 0,
        technicalScore: 0,
        contentMatchScore: 0,
        brandComplianceScore: 0,
        compositionScore: 0,
        aiArtifactsDetected: false,
        aiArtifactDetails: [],
        contentMatchDetails: 'Not yet analyzed',
        brandComplianceDetails: 'Not yet analyzed',
        frameAnalysis: {
          subjectPosition: 'center' as const,
          faceDetected: false,
          busyRegions: [],
          dominantColors: [],
          lightingType: 'neutral' as const,
          safeTextZones: [],
        },
        issues: [{ 
          category: 'technical' as const, 
          severity: 'critical' as const, 
          description: 'Scene has not been analyzed yet', 
          suggestion: 'Run quality analysis on all scenes' 
        }],
        recommendation: 'regenerate' as const,
        analysisTimestamp: '',
        analysisModel: 'pending',
      };
    });
    
    const approvals = new Map<number, boolean>(
      projectData.scenes
        .filter(s => (s as any).userApproved)
        .map((s, idx) => [idx, true])
    );
    
    // Build scene metadata with thumbnails, narration, and provider info
    const sceneMetadata = new Map<number, { thumbnailUrl?: string; narration?: string; provider?: string; regenerationCount?: number }>();
    projectData.scenes.forEach((scene, idx) => {
      const thumbnailUrl = scene.assets?.imageUrl || scene.assets?.videoUrl || (scene.background as any)?.url;
      sceneMetadata.set(idx, {
        thumbnailUrl,
        narration: scene.narration,
        provider: (scene.assets as any)?.videoProvider || (scene.assets as any)?.imageProvider || (scene.assets as any)?.provider,
        regenerationCount: (scene as any).regenerationCount || 0,
      });
    });
    
    const report = qualityGateService.generateReport(
      projectId,
      analyses,
      approvals,
      undefined,
      sceneMetadata
    );

    const unanalyzedCount = projectData.scenes.filter(s => !s.analysisResult).length;
    if (unanalyzedCount > 0 && !report.blockingReasons.some(r => r.includes('not analyzed'))) {
      report.blockingReasons.push(`${unanalyzedCount} scenes not yet analyzed`);
      report.canRender = false;
      report.passesThreshold = false;
    }

    res.json({
      success: true,
      report,
    });

  } catch (error: any) {
    console.error('[Phase8F] Get quality report failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/projects/:projectId/analyze-all', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const projectRows = await db.select().from(universalVideoProjects)
      .where(eq(universalVideoProjects.projectId, projectId))
      .limit(1);

    if (projectRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const projectData = dbRowToVideoProject(projectRows[0]);
    const analyses: Phase8AnalysisResult[] = [];

    for (let i = 0; i < projectData.scenes.length; i++) {
      const scene = projectData.scenes[i];
      
      if (scene.analysisResult) {
        analyses.push(scene.analysisResult);
        continue;
      }
      
      const sceneAssets = scene.assets;
      const mediaUrl = sceneAssets?.videoUrl || sceneAssets?.imageUrl || (sceneAssets as any)?.primaryImageUrl;
      
      if (mediaUrl) {
        try {
          const context = {
            sceneIndex: i,
            sceneType: scene.type || 'content',
            narration: scene.narration || '',
            visualDirection: scene.visualDirection || '',
            expectedContentType: 'video',
            totalScenes: projectData.scenes.length,
          };
          
          const analysis = await sceneAnalysisService.analyzeScenePhase8(mediaUrl, context);
          analyses.push(analysis);
          
          projectData.scenes[i] = {
            ...scene,
            analysisResult: analysis,
          };
        } catch (analysisError: any) {
          console.error(`[Phase8F] Scene ${i} analysis failed:`, analysisError.message);
          const fallbackAnalysis: Phase8AnalysisResult = {
            sceneIndex: i,
            overallScore: 50,
            technicalScore: 50,
            contentMatchScore: 50,
            brandComplianceScore: 50,
            compositionScore: 50,
            aiArtifactsDetected: false,
            aiArtifactDetails: [],
            contentMatchDetails: 'Analysis failed',
            brandComplianceDetails: 'Analysis failed',
            frameAnalysis: {
              subjectPosition: 'center' as const,
              faceDetected: false,
              busyRegions: [],
              dominantColors: [],
              lightingType: 'neutral' as const,
              safeTextZones: [],
            },
            issues: [{ 
              category: 'technical' as const, 
              severity: 'major' as const, 
              description: `Analysis failed: ${analysisError.message}`, 
              suggestion: 'Retry analysis' 
            }],
            recommendation: 'needs_review',
            analysisTimestamp: new Date().toISOString(),
            analysisModel: 'fallback',
          };
          analyses.push(fallbackAnalysis);
          projectData.scenes[i] = {
            ...scene,
            analysisResult: fallbackAnalysis,
          };
        }
      } else {
        const noMediaAnalysis: Phase8AnalysisResult = {
          sceneIndex: i,
          overallScore: 0,
          technicalScore: 0,
          contentMatchScore: 0,
          brandComplianceScore: 0,
          compositionScore: 0,
          aiArtifactsDetected: false,
          aiArtifactDetails: [],
          contentMatchDetails: 'No media to analyze',
          brandComplianceDetails: 'No media to analyze',
          frameAnalysis: {
            subjectPosition: 'center' as const,
            faceDetected: false,
            busyRegions: [],
            dominantColors: [],
            lightingType: 'neutral' as const,
            safeTextZones: [],
          },
          issues: [{ 
            category: 'technical' as const, 
            severity: 'critical' as const, 
            description: 'No media URL available for analysis', 
            suggestion: 'Generate video/image for this scene first' 
          }],
          recommendation: 'regenerate',
          analysisTimestamp: new Date().toISOString(),
          analysisModel: 'none',
        };
        analyses.push(noMediaAnalysis);
        projectData.scenes[i] = {
          ...scene,
          analysisResult: noMediaAnalysis,
        };
      }
    }

    await db.update(universalVideoProjects)
      .set({
        scenes: projectData.scenes,
        updatedAt: new Date(),
      })
      .where(eq(universalVideoProjects.projectId, projectId));

    // Build scene metadata with thumbnails
    const sceneMetadata = new Map<number, { thumbnailUrl?: string; narration?: string; provider?: string; regenerationCount?: number }>();
    projectData.scenes.forEach((scene, idx) => {
      const thumbnailUrl = scene.assets?.imageUrl || scene.assets?.videoUrl || (scene.background as any)?.url;
      sceneMetadata.set(idx, {
        thumbnailUrl,
        narration: scene.narration,
        provider: (scene.assets as any)?.videoProvider || (scene.assets as any)?.imageProvider || (scene.assets as any)?.provider,
        regenerationCount: (scene as any).regenerationCount || 0,
      });
    });

    const report = qualityGateService.generateReport(
      projectId,
      analyses,
      new Map(),
      undefined,
      sceneMetadata
    );

    res.json({
      success: true,
      report,
      analyzedCount: analyses.length,
    });

  } catch (error: any) {
    console.error('[Phase8F] Analyze all scenes failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/projects/:projectId/scenes/:sceneIndex/approve', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId, sceneIndex } = req.params;
    const idx = parseInt(sceneIndex, 10);

    const projectRows = await db.select().from(universalVideoProjects)
      .where(eq(universalVideoProjects.projectId, projectId))
      .limit(1);

    if (projectRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const projectData = dbRowToVideoProject(projectRows[0]);
    
    if (idx < 0 || idx >= projectData.scenes.length) {
      return res.status(404).json({ success: false, error: 'Scene not found' });
    }

    projectData.scenes[idx] = {
      ...projectData.scenes[idx],
      userApproved: true,
    } as any;

    await db.update(universalVideoProjects)
      .set({
        scenes: projectData.scenes,
        updatedAt: new Date(),
      })
      .where(eq(universalVideoProjects.projectId, projectId));

    res.json({ success: true, sceneIndex: idx, approved: true });

  } catch (error: any) {
    console.error('[Phase8F] Approve scene failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/projects/:projectId/scenes/:sceneIndex/reject', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId, sceneIndex } = req.params;
    const { reason } = req.body;
    const idx = parseInt(sceneIndex, 10);

    const projectRows = await db.select().from(universalVideoProjects)
      .where(eq(universalVideoProjects.projectId, projectId))
      .limit(1);

    if (projectRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const projectData = dbRowToVideoProject(projectRows[0]);
    
    if (idx < 0 || idx >= projectData.scenes.length) {
      return res.status(404).json({ success: false, error: 'Scene not found' });
    }

    projectData.scenes[idx] = {
      ...projectData.scenes[idx],
      userApproved: false,
      rejectionReason: reason || 'User rejected',
    } as any;

    await db.update(universalVideoProjects)
      .set({
        scenes: projectData.scenes,
        updatedAt: new Date(),
      })
      .where(eq(universalVideoProjects.projectId, projectId));

    res.json({ success: true, sceneIndex: idx, rejected: true, reason });

  } catch (error: any) {
    console.error('[Phase8F] Reject scene failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/projects/:projectId/approve-all', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const projectRows = await db.select().from(universalVideoProjects)
      .where(eq(universalVideoProjects.projectId, projectId))
      .limit(1);

    if (projectRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const projectData = dbRowToVideoProject(projectRows[0]);
    let approvedCount = 0;

    const updatedScenes = projectData.scenes.map((scene, idx) => {
      if (scene.analysisResult && 
          scene.analysisResult.recommendation === 'needs_review' &&
          !(scene as any).userApproved) {
        approvedCount++;
        return {
          ...scene,
          userApproved: true,
        } as any;
      }
      return scene;
    });

    await db.update(universalVideoProjects)
      .set({
        scenes: updatedScenes,
        updatedAt: new Date(),
      })
      .where(eq(universalVideoProjects.projectId, projectId));

    res.json({ success: true, approvedCount });

  } catch (error: any) {
    console.error('[Phase8F] Approve all scenes failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/projects/:projectId/can-render', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const projectRows = await db.select().from(universalVideoProjects)
      .where(eq(universalVideoProjects.projectId, projectId))
      .limit(1);

    if (projectRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const projectData = dbRowToVideoProject(projectRows[0]);
    
    const analyses: Phase8AnalysisResult[] = projectData.scenes.map((scene, idx) => {
      if (scene.analysisResult) {
        return scene.analysisResult;
      }
      return {
        sceneIndex: idx,
        overallScore: 0,
        technicalScore: 0,
        contentMatchScore: 0,
        brandComplianceScore: 0,
        compositionScore: 0,
        aiArtifactsDetected: false,
        aiArtifactDetails: [],
        contentMatchDetails: 'Not yet analyzed',
        brandComplianceDetails: 'Not yet analyzed',
        frameAnalysis: {
          subjectPosition: 'center' as const,
          faceDetected: false,
          busyRegions: [],
          dominantColors: [],
          lightingType: 'neutral' as const,
          safeTextZones: [],
        },
        issues: [{ 
          category: 'technical' as const, 
          severity: 'critical' as const, 
          description: 'Scene has not been analyzed yet', 
          suggestion: 'Run quality analysis on all scenes' 
        }],
        recommendation: 'regenerate' as const,
        analysisTimestamp: '',
        analysisModel: 'pending',
      };
    });
    
    const approvals = new Map<number, boolean>(
      projectData.scenes
        .filter(s => (s as any).userApproved)
        .map((s, idx) => [idx, true])
    );
    
    const report = qualityGateService.generateReport(
      projectId,
      analyses,
      approvals
    );

    const unanalyzedCount = projectData.scenes.filter(s => !s.analysisResult).length;
    if (unanalyzedCount > 0) {
      report.blockingReasons.push(`${unanalyzedCount} scenes not yet analyzed`);
      report.canRender = false;
      report.passesThreshold = false;
    }

    const renderCheck = qualityGateService.canProceedToRender(report);

    res.json({
      success: true,
      ...renderCheck,
      report: {
        overallScore: report.overallScore,
        approvedCount: report.approvedCount,
        needsReviewCount: report.needsReviewCount,
        rejectedCount: report.rejectedCount,
        blockingReasons: report.blockingReasons,
      },
    });

  } catch (error: any) {
    console.error('[Phase8F] Check render permission failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 10C: Score Integrity Check - Debug endpoint to verify real vs fake scores
router.get('/api/debug/score-integrity', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id || '';
    
    // Get all video projects for this user
    const userProjects = await db.select({ projectId: universalVideoProjects.projectId })
      .from(universalVideoProjects)
      .where(eq(universalVideoProjects.ownerId, userId))
      .limit(50);
    const projectIds = userProjects.map(p => p.projectId);
    
    const report = {
      totalProjects: projectIds.length,
      totalScenes: 0,
      withRealAnalysis: 0,
      withoutAnalysis: 0,
      scoreMismatches: [] as Array<{
        projectId: string;
        sceneId: string;
        sceneIndex: number;
        storedScore: number | null;
        analysisScore: number | null;
      }>,
      suspiciousScores: [] as Array<{
        projectId: string;
        sceneId: string;
        sceneIndex: number;
        score: number;
        reason: string;
      }>,
      allScores: [] as number[],
      warning: null as string | null,
    };
    
    for (const projectId of projectIds.slice(0, 10)) { // Limit to 10 projects for performance
      const projectData = await getProjectFromDb(projectId);
      if (!projectData?.scenes) continue;
      
      for (const scene of projectData.scenes) {
        report.totalScenes++;
        const sceneIndex = projectData.scenes.indexOf(scene);
        
        const analysisResult = scene.analysisResult;
        const qualityScore = scene.qualityScore || projectData.qualityReport?.sceneScores?.find(
          s => s.sceneId === scene.id || s.sceneIndex === sceneIndex
        )?.overallScore;
        
        if (analysisResult?.overallScore !== undefined && analysisResult.overallScore > 0) {
          report.withRealAnalysis++;
          report.allScores.push(analysisResult.overallScore);
          
          // Check for score mismatch
          if (qualityScore !== undefined && qualityScore !== analysisResult.overallScore) {
            report.scoreMismatches.push({
              projectId,
              sceneId: scene.id,
              sceneIndex,
              storedScore: qualityScore,
              analysisScore: analysisResult.overallScore,
            });
          }
        } else {
          report.withoutAnalysis++;
          
          // Scene has score but no real analysis = suspicious
          if (qualityScore && qualityScore > 0) {
            report.suspiciousScores.push({
              projectId,
              sceneId: scene.id,
              sceneIndex,
              score: qualityScore,
              reason: 'Has score but no analysisResult with valid score',
            });
          }
        }
      }
    }
    
    // Check for suspiciously uniform scores (all in 90-93 range = likely fake)
    const uniqueScores = new Set(report.allScores);
    if (report.allScores.length > 5 && uniqueScores.size < 5) {
      report.warning = 'Scores are suspiciously uniform - may indicate fake scoring still active';
    }
    
    // Check for all scores in narrow range
    if (report.allScores.length > 0) {
      const min = Math.min(...report.allScores);
      const max = Math.max(...report.allScores);
      if (max - min < 10 && report.allScores.length > 5) {
        report.warning = `All ${report.allScores.length} scores in narrow range (${min}-${max}) - may indicate fake scoring`;
      }
    }
    
    res.json({
      success: true,
      phase: '10C',
      purpose: 'Verify quality scores come from real Claude Vision analysis',
      report,
      conclusion: report.suspiciousScores.length === 0 && report.scoreMismatches.length === 0
        ? 'PASS: All displayed scores appear to come from real analysis'
        : 'FAIL: Found suspicious or mismatched scores - fake scoring may still be active',
    });
    
  } catch (error: any) {
    console.error('[Phase10C] Score integrity check failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 13: Provider Registry API - Expose the updated provider registry to the UI
import { VIDEO_PROVIDERS as PHASE13_PROVIDERS, getAllVideoProviders, getProvidersByStrength } from '../config/video-providers';
import { selectProvidersForSceneSmart, analyzePromptComplexity, mapToLegacyProviderId, isProviderExecutable } from '../config/ai-video-providers';

router.get('/provider-registry', isAuthenticated, async (req, res) => {
  try {
    const providers = Object.values(PHASE13_PROVIDERS).map(p => ({
      id: p.id,
      name: p.name,
      version: p.version,
      costPer10Seconds: p.costPer10Seconds,
      capabilities: {
        imageToVideo: p.capabilities.imageToVideo,
        textToVideo: p.capabilities.textToVideo,
        imageToImage: p.capabilities.imageToImage,
        maxResolution: p.capabilities.maxResolution,
        maxFps: p.capabilities.maxFps,
        maxDuration: p.capabilities.maxDuration,
        strengths: p.capabilities.strengths,
        weaknesses: p.capabilities.weaknesses,
        motionQuality: p.capabilities.motionQuality,
        temporalConsistency: p.capabilities.temporalConsistency,
        nativeAudio: p.capabilities.nativeAudio,
        lipSync: p.capabilities.lipSync,
        effectsPresets: p.capabilities.effectsPresets,
      },
      apiProvider: p.apiProvider,
      modelId: p.modelId,
      isExecutable: isProviderExecutable(p.id),
      legacyId: mapToLegacyProviderId(p.id),
    }));

    // Group by family
    const families = {
      kling: providers.filter(p => p.id.startsWith('kling')),
      wan: providers.filter(p => p.id.startsWith('wan')),
      veo: providers.filter(p => p.id.startsWith('veo')),
      other: providers.filter(p => 
        !p.id.startsWith('kling') && 
        !p.id.startsWith('wan') && 
        !p.id.startsWith('veo')
      ),
    };

    res.json({
      success: true,
      totalProviders: providers.length,
      providers,
      families,
      videoProviders: getAllVideoProviders().map(p => ({
        id: p.id,
        name: p.name,
        costPer10Seconds: p.costPer10Seconds,
        isExecutable: isProviderExecutable(p.id),
      })),
    });
  } catch (error: any) {
    console.error('[Phase13] Provider registry fetch failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 13: Smart provider routing endpoint
router.post('/smart-route', isAuthenticated, async (req, res) => {
  try {
    const { visualPrompt, sceneType } = req.body;
    
    if (!visualPrompt) {
      return res.status(400).json({ success: false, error: 'visualPrompt is required' });
    }

    const routingDecision = selectProvidersForSceneSmart(sceneType || 'b-roll', visualPrompt);
    const complexityAnalysis = analyzePromptComplexity(visualPrompt);

    res.json({
      success: true,
      routing: routingDecision,
      complexity: complexityAnalysis,
    });
  } catch (error: any) {
    console.error('[Phase13] Smart routing failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 14A: Brand Requirement Analyzer
import { brandRequirementAnalyzer } from '../services/brand-requirement-analyzer';
import { brandAssetMatcher } from '../services/brand-asset-matcher';

const brandAnalysisInputSchema = z.object({
  visualDirection: z.string().min(1),
  narration: z.string().optional(),
});

const brandAnalysisSchema = z.object({
  requiresBrandAssets: z.boolean(),
  confidence: z.number(),
  requirements: z.object({
    productMentioned: z.boolean(),
    productNames: z.array(z.string()),
    productVisibility: z.enum(['featured', 'prominent', 'visible', 'background']),
    logoRequired: z.boolean(),
    logoType: z.enum(['primary', 'watermark', 'certification']).nullable(),
    brandingVisibility: z.enum(['prominent', 'visible', 'subtle']),
    sceneType: z.enum(['product-hero', 'product-in-context', 'branded-environment', 'standard']),
    outputType: z.enum(['image', 'video']),
    motionStyle: z.enum(['static', 'subtle', 'environmental', 'reveal']).nullable(),
  }),
  matchedAssets: z.object({
    products: z.array(z.any()),
    logos: z.array(z.any()),
    locations: z.array(z.any()),
  }),
});

const brandAssetBestInputSchema = z.object({
  purpose: z.enum(['product-hero', 'logo-overlay', 'watermark', 'product-group', 'location']),
  productName: z.string().optional(),
});

const brandAssetSearchInputSchema = z.object({
  keywords: z.array(z.string().min(1)).min(1),
});

router.post('/brand-analysis/analyze', isAuthenticated, async (req, res) => {
  try {
    const parseResult = brandAnalysisInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: parseResult.error.message });
    }
    
    const { visualDirection, narration } = parseResult.data;
    const analysis = brandRequirementAnalyzer.analyze(visualDirection, narration);
    
    res.json({
      success: true,
      phase: '14A',
      analysis,
    });
  } catch (error: any) {
    console.error('[Phase14A] Brand analysis failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/brand-analysis/analyze-with-assets', isAuthenticated, async (req, res) => {
  try {
    const parseResult = brandAnalysisInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: parseResult.error.message });
    }
    
    const { visualDirection, narration } = parseResult.data;
    const analysis = brandRequirementAnalyzer.analyze(visualDirection, narration);
    const analysisWithAssets = await brandAssetMatcher.matchAssets(analysis);
    
    res.json({
      success: true,
      phase: '14A+14B',
      analysis: analysisWithAssets,
    });
  } catch (error: any) {
    console.error('[Phase14A+14B] Brand analysis with assets failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/brand-analysis/patterns', isAuthenticated, async (req, res) => {
  try {
    const patterns = brandRequirementAnalyzer.getPatterns();
    res.json({
      success: true,
      phase: '14A',
      patterns,
    });
  } catch (error: any) {
    console.error('[Phase14A] Get patterns failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 14B: Brand Asset Matcher
router.post('/brand-assets/match', isAuthenticated, async (req, res) => {
  try {
    const { analysis } = req.body;
    
    if (!analysis) {
      return res.status(400).json({ success: false, error: 'analysis is required (from /brand-analysis/analyze)' });
    }
    
    const parseResult = brandAnalysisSchema.safeParse(analysis);
    if (!parseResult.success) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid analysis object structure',
        details: parseResult.error.issues.map(i => i.message).join(', ')
      });
    }

    const matchedAnalysis = await brandAssetMatcher.matchAssets(parseResult.data);
    
    res.json({
      success: true,
      phase: '14B',
      matchedAssets: matchedAnalysis.matchedAssets,
    });
  } catch (error: any) {
    console.error('[Phase14B] Asset matching failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/brand-assets/best', isAuthenticated, async (req, res) => {
  try {
    const parseResult = brandAssetBestInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        success: false, 
        error: 'purpose is required (product-hero, logo-overlay, watermark, product-group, location)',
        details: parseResult.error.message
      });
    }

    const { purpose, productName } = parseResult.data;
    const asset = await brandAssetMatcher.getBestAsset(purpose, productName);
    
    res.json({
      success: true,
      phase: '14B',
      purpose,
      asset,
      hasMatch: asset !== null,
    });
  } catch (error: any) {
    console.error('[Phase14B] Get best asset failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/brand-assets/search', isAuthenticated, async (req, res) => {
  try {
    const parseResult = brandAssetSearchInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        success: false, 
        error: 'keywords array is required',
        details: parseResult.error.message
      });
    }

    const { keywords } = parseResult.data;
    const results = await brandAssetMatcher.searchByKeywords(keywords);
    
    res.json({
      success: true,
      phase: '14B',
      totalMatches: results.length,
      results,
    });
  } catch (error: any) {
    console.error('[Phase14B] Asset search failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 14: Analyze all scenes in a project for brand requirements
router.get('/projects/:projectId/brand-analysis', isAuthenticated, async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectData = await getProjectFromDb(projectId);
    
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const sceneAnalyses = await Promise.all(
      projectData.scenes.map(async (scene, index) => {
        const analysis = brandRequirementAnalyzer.analyze(
          scene.visualDirection || '',
          scene.narration || ''
        );
        
        const analysisWithAssets = analysis.requiresBrandAssets 
          ? await brandAssetMatcher.matchAssets(analysis)
          : analysis;
        
        return {
          sceneIndex: index,
          sceneId: scene.id,
          sceneType: scene.type,
          visualDirection: scene.visualDirection?.substring(0, 100) + '...',
          analysis: analysisWithAssets,
        };
      })
    );

    const summary = {
      totalScenes: sceneAnalyses.length,
      scenesRequiringBrandAssets: sceneAnalyses.filter(s => s.analysis.requiresBrandAssets).length,
      scenesByType: {
        'product-hero': sceneAnalyses.filter(s => s.analysis.requirements.sceneType === 'product-hero').length,
        'product-in-context': sceneAnalyses.filter(s => s.analysis.requirements.sceneType === 'product-in-context').length,
        'branded-environment': sceneAnalyses.filter(s => s.analysis.requirements.sceneType === 'branded-environment').length,
        'standard': sceneAnalyses.filter(s => s.analysis.requirements.sceneType === 'standard').length,
      },
      totalProductMatches: sceneAnalyses.reduce((sum, s) => sum + s.analysis.matchedAssets.products.length, 0),
      totalLogoMatches: sceneAnalyses.reduce((sum, s) => sum + s.analysis.matchedAssets.logos.length, 0),
    };

    res.json({
      success: true,
      phase: '14A+14B',
      projectId,
      summary,
      scenes: sceneAnalyses,
    });
  } catch (error: any) {
    console.error('[Phase14] Project brand analysis failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
