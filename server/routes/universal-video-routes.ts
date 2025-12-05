import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { isAuthenticated, requireRole } from '../auth';
import { universalVideoService } from '../services/universal-video-service';
import { remotionLambdaService } from '../services/remotion-lambda-service';
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
});

const scriptVideoInputSchema = z.object({
  title: z.string().min(1),
  script: z.string().min(10),
  platform: z.enum(['youtube', 'tiktok', 'instagram', 'facebook', 'website']),
  style: z.enum(['professional', 'casual', 'energetic', 'calm', 'cinematic', 'documentary']),
  targetDuration: z.number().optional(),
});

function dbRowToVideoProject(row: any): VideoProject & { renderId?: string; bucketName?: string; outputUrl?: string | null } {
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
  };
}

async function saveProjectToDb(project: VideoProject, ownerId: string, renderId?: string, bucketName?: string, outputUrl?: string) {
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
      renderId,
      bucketName,
      outputUrl,
    });
  }
}

async function getProjectFromDb(projectId: string): Promise<(VideoProject & { ownerId: string; renderId?: string; bucketName?: string; outputUrl?: string | null }) | null> {
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

router.post('/projects/product', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const validatedInput = productVideoInputSchema.parse(req.body);
    
    console.log('[UniversalVideo] Creating product video project:', validatedInput.productName);
    
    const project = await universalVideoService.createProductVideoProject(validatedInput);
    
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

router.post('/projects/:projectId/generate-assets', isAuthenticated, async (req: Request, res: Response) => {
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
    
    console.log('[UniversalVideo] Generating assets for project:', projectId);
    
    universalVideoService.clearNotifications();
    const updatedProject = await universalVideoService.generateProjectAssets(projectData);
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
    
    if (projectData.status !== 'ready') {
      return res.status(400).json({ 
        success: false, 
        error: 'Project must be ready before rendering. Generate assets first.' 
      });
    }
    
    console.log('[UniversalVideo] Starting render for project:', projectId);
    
    projectData.status = 'rendering';
    projectData.progress.currentStep = 'rendering';
    projectData.progress.steps.rendering.status = 'in-progress';
    projectData.updatedAt = new Date().toISOString();
    
    const compositionId = getCompositionId(projectData.outputFormat.aspectRatio);
    
    const inputProps = {
      scenes: projectData.scenes,
      voiceoverUrl: projectData.assets.voiceover.fullTrackUrl || null,
      musicUrl: projectData.assets.music.url || null,
      musicVolume: projectData.assets.music.volume,
      brand: projectData.brand,
      outputFormat: projectData.outputFormat,
    };
    
    try {
      const renderResult = await remotionLambdaService.startRender({
        compositionId,
        inputProps,
      });
      
      renderBuckets.set(renderResult.renderId, renderResult.bucketName);
      
      // Store render start time in progress object (persists to DB for timeout detection)
      (projectData.progress as any).renderStartedAt = Date.now();
      projectData.progress.steps.rendering.message = `Render started: ${renderResult.renderId}`;
      
      await saveProjectToDb(projectData, projectData.ownerId, renderResult.renderId, renderResult.bucketName);
      
      res.json({
        success: true,
        renderId: renderResult.renderId,
        bucketName: renderResult.bucketName,
        message: 'Render started on AWS Lambda',
      });
    } catch (renderError: any) {
      projectData.status = 'error';
      projectData.progress.steps.rendering.status = 'error';
      projectData.progress.steps.rendering.message = renderError.message || 'Render failed';
      projectData.progress.errors.push(`Render failed: ${renderError.message}`);
      
      projectData.progress.serviceFailures.push({
        service: 'remotion-lambda',
        timestamp: new Date().toISOString(),
        error: renderError.message || 'Unknown error',
      });
      
      await saveProjectToDb(projectData, projectData.ownerId);
      
      res.status(500).json({
        success: false,
        error: renderError.message || 'Failed to start render',
      });
    }
  } catch (error: any) {
    console.error('[UniversalVideo] Error starting render:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const LAMBDA_TIMEOUT_MS = 240000; // 4 minutes - matches Lambda function timeout
const RENDER_TIMEOUT_MS = 600000; // 10 minutes - max time we wait for any render

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
    
    if (!renderId || typeof renderId !== 'string') {
      return res.status(400).json({ success: false, error: 'Render ID required' });
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
        projectData.progress.steps.rendering.progress = Math.round(statusResult.overallProgress * 100);
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

export default router;
