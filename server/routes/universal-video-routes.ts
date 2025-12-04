import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { isAuthenticated, requireRole } from '../auth';
import { universalVideoService } from '../services/universal-video-service';
import { remotionLambdaService } from '../services/remotion-lambda-service';
import type { 
  VideoProject, 
  ProductVideoInput,
  ScriptVideoInput,
} from '../../shared/video-types';
import { 
  OUTPUT_FORMATS, 
  PINE_HILL_FARM_BRAND,
  getCompositionId,
} from '../../shared/video-types';

const router = Router();

const productVideoInputSchema = z.object({
  productName: z.string().min(1),
  productDescription: z.string().min(1),
  targetAudience: z.string().min(1),
  benefits: z.array(z.string()).min(1),
  duration: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  platform: z.enum(['youtube', 'tiktok', 'instagram', 'facebook', 'website']),
  style: z.enum(['professional', 'friendly', 'energetic', 'calm']),
  callToAction: z.string().min(1),
});

const scriptVideoInputSchema = z.object({
  title: z.string().min(1),
  script: z.string().min(10),
  platform: z.enum(['youtube', 'tiktok', 'instagram', 'facebook', 'website']),
  style: z.enum(['professional', 'casual', 'energetic', 'calm', 'cinematic', 'documentary']),
  targetDuration: z.number().optional(),
});

const videoProjects: Map<string, VideoProject> = new Map();

router.post('/projects/product', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validatedInput = productVideoInputSchema.parse(req.body);
    
    console.log('[UniversalVideo] Creating product video project:', validatedInput.productName);
    
    const project = await universalVideoService.createProductVideoProject(validatedInput);
    videoProjects.set(project.id, project);
    
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
    
    videoProjects.set(project.id, project);
    
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
    const { projectId } = req.params;
    const project = videoProjects.get(projectId);
    
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    res.json({ success: true, project });
  } catch (error: any) {
    console.error('[UniversalVideo] Error getting project:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/projects/:projectId/scenes', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { scenes } = req.body;
    
    const project = videoProjects.get(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    project.scenes = scenes;
    project.totalDuration = scenes.reduce((acc: number, s: any) => acc + s.duration, 0);
    project.updatedAt = new Date().toISOString();
    
    videoProjects.set(projectId, project);
    
    res.json({ success: true, project });
  } catch (error: any) {
    console.error('[UniversalVideo] Error updating scenes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/projects/:projectId/generate-assets', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    const project = videoProjects.get(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    console.log('[UniversalVideo] Generating assets for project:', projectId);
    
    universalVideoService.clearNotifications();
    const updatedProject = await universalVideoService.generateProjectAssets(project);
    videoProjects.set(projectId, updatedProject);
    
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
    const { projectId } = req.params;
    
    const project = videoProjects.get(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (project.status !== 'ready') {
      return res.status(400).json({ 
        success: false, 
        error: 'Project must be ready before rendering. Generate assets first.' 
      });
    }
    
    console.log('[UniversalVideo] Starting render for project:', projectId);
    
    project.status = 'rendering';
    project.progress.currentStep = 'rendering';
    project.progress.steps.rendering.status = 'in-progress';
    project.updatedAt = new Date().toISOString();
    
    const compositionId = getCompositionId(project.outputFormat.aspectRatio);
    
    const inputProps = {
      scenes: project.scenes,
      voiceoverUrl: project.assets.voiceover.fullTrackUrl || null,
      musicUrl: project.assets.music.url || null,
      musicVolume: project.assets.music.volume,
      brand: project.brand,
      outputFormat: project.outputFormat,
    };
    
    try {
      const renderResult = await remotionLambdaService.startRender({
        compositionId,
        inputProps,
      });
      
      renderBuckets.set(renderResult.renderId, renderResult.bucketName);
      project.progress.steps.rendering.message = `Render started: ${renderResult.renderId}`;
      videoProjects.set(projectId, project);
      
      res.json({
        success: true,
        renderId: renderResult.renderId,
        bucketName: renderResult.bucketName,
        message: 'Render started on AWS Lambda',
      });
    } catch (renderError: any) {
      project.status = 'error';
      project.progress.steps.rendering.status = 'error';
      project.progress.steps.rendering.message = renderError.message || 'Render failed';
      project.progress.errors.push(`Render failed: ${renderError.message}`);
      
      project.progress.serviceFailures.push({
        service: 'remotion-lambda',
        timestamp: new Date().toISOString(),
        error: renderError.message || 'Unknown error',
      });
      
      videoProjects.set(projectId, project);
      
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

router.get('/projects/:projectId/render-status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { renderId, bucketName } = req.query;
    
    const project = videoProjects.get(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (!renderId || typeof renderId !== 'string') {
      return res.status(400).json({ success: false, error: 'Render ID required' });
    }
    
    const bucket = (typeof bucketName === 'string' ? bucketName : null) || 
                   renderBuckets.get(renderId) || 
                   'remotionlambda-useast1-refjo5giq5';
    
    try {
      const statusResult = await remotionLambdaService.getRenderProgress(renderId, bucket);
      
      if (statusResult.done) {
        project.status = 'complete';
        project.progress.steps.rendering.status = 'complete';
        project.progress.steps.rendering.progress = 100;
        project.progress.overallPercent = 100;
        project.updatedAt = new Date().toISOString();
        videoProjects.set(projectId, project);
      } else {
        project.progress.steps.rendering.progress = Math.round(statusResult.overallProgress * 100);
        project.progress.overallPercent = 85 + Math.round(statusResult.overallProgress * 15);
        videoProjects.set(projectId, project);
      }
      
      res.json({
        success: true,
        done: statusResult.done,
        progress: statusResult.overallProgress,
        outputUrl: statusResult.outputFile,
        errors: statusResult.errors,
        project,
      });
    } catch (progressError: any) {
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

export default router;
