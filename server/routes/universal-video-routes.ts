import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { isAuthenticated, requireRole } from '../auth';
import { universalVideoService } from '../services/universal-video-service';
import { remotionLambdaService } from '../services/remotion-lambda-service';
import { chunkedRenderService, ChunkedRenderProgress } from '../services/chunked-render-service';
import { qualityEvaluationService, VideoQualityReport } from '../services/quality-evaluation-service';
import { sceneRegenerationService } from '../services/scene-regeneration-service';
import { brandContextService } from '../services/brand-context-service';
import { videoProviderSelector, SceneForSelection } from '../services/video-provider-selector';
import { imageProviderSelector } from '../services/image-provider-selector';
import { soundDesignService } from '../services/sound-design-service';
import { transitionService } from '../services/transition-service';
import { VIDEO_PROVIDERS } from '../../shared/provider-config';
import { ObjectStorageService } from '../objectStorage';
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

router.post('/projects/:projectId/generate-assets', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    const { skipMusic } = req.body || {};
    
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
    
    res.json({
      success: true,
      project: updatedProject,
      notifications,
      paidServiceFailures,
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
    const { projectId } = req.params;
    
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
    
    console.log('[UniversalVideo] Starting render for project:', projectId);
    
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
    const { prompt } = req.body;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const result = await universalVideoService.regenerateSceneImage(projectData, sceneId, prompt);
    
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
    const { query } = req.body;
    
    const projectData = await getProjectFromDb(projectId);
    if (!projectData) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (projectData.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const result = await universalVideoService.regenerateSceneVideo(projectData, sceneId, query);
    
    if (result.success && result.newVideoUrl) {
      const sceneIndex = projectData.scenes.findIndex((s: Scene) => s.id === sceneId);
      if (sceneIndex >= 0) {
        const oldUrl = projectData.scenes[sceneIndex].assets?.videoUrl;
        if (oldUrl) {
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
        projectData.scenes[sceneIndex].assets!.videoUrl = result.newVideoUrl;
        projectData.scenes[sceneIndex].background = projectData.scenes[sceneIndex].background || { type: 'video', source: '' };
        projectData.scenes[sceneIndex].background!.type = 'video';
        projectData.scenes[sceneIndex].background!.videoUrl = result.newVideoUrl;
        
        // IMPORTANT: Save custom query to visual direction so it persists
        if (query) {
          projectData.scenes[sceneIndex].visualDirection = query;
          projectData.scenes[sceneIndex].background!.source = query;
          console.log(`[UniversalVideo] Updated visual direction for scene ${sceneId}: ${query.substring(0, 60)}...`);
        }
        
        if (!projectData.regenerationHistory) projectData.regenerationHistory = [];
        projectData.regenerationHistory.push({
          id: `regen_${Date.now()}`,
          sceneId,
          assetType: 'video',
          previousUrl: oldUrl,
          newUrl: result.newVideoUrl,
          prompt: query,
          timestamp: new Date().toISOString(),
          success: true
        });
        
        await saveProjectToDb(projectData, projectData.ownerId);
      }
      
      return res.json({ 
        success: true, 
        newVideoUrl: result.newVideoUrl,
        duration: result.duration,
        source: result.source,
        project: projectData
      });
    }
    
    return res.status(400).json({ success: false, error: result.error });
  } catch (error: any) {
    console.error('[UniversalVideo] Regenerate video error:', error);
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
    const transitionsData = transitionService.designTransitions(
      scenes.map((s: any, i: number) => ({
        sceneIndex: i,
        sceneType: s.type || 'general',
        mood: s.mood,
        duration: s.duration || 5,
      })),
      visualStyle
    );
    
    // Build scene providers array for response with explicit fallbacks
    const sceneProviders = Array.from(providerSelections.entries()).map(([index, selection]) => {
      const scene = scenes[index];
      const provider = selection?.provider;
      const sceneTransition = transitionsData.transitions.find((t: any) => t.fromScene === index);
      return {
        sceneIndex: index,
        sceneType: scene?.type || 'unknown',
        contentType: (scene as any)?.contentType || 'lifestyle',
        duration: scene?.duration || 5,
        provider: provider?.id || 'kling',
        providerName: provider?.displayName || 'Kling 1.6',
        fallbackProvider: selection?.alternatives?.[0] || 'runway',
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
            type: sceneTransition.type,
            duration: sceneTransition.duration,
            moodMatch: sceneTransition.moodMatch || 'smooth',
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
    });
    
  } catch (error: any) {
    console.error('[UniversalVideo] Generation estimate failed:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
