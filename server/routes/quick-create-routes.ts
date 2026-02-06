// server/routes/quick-create-routes.ts

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { documentUploadService } from '../services/document-upload-service';
import { universalVideoService } from '../services/universal-video-service';
import { isAuthenticated } from '../auth';
import { 
  VideoProject, 
  PINE_HILL_FARM_BRAND, 
  OUTPUT_FORMATS,
  createEmptyVideoProject,
} from '../../shared/video-types';
import { db } from '../db';
import { universalVideoProjects } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Secure document registry - stores metadata with owner validation
interface DocumentRegistryEntry {
  documentId: string;
  ownerId: string;
  filepath: string;
  filename: string;
  uploadedAt: Date;
  preview: any;
}
const documentRegistry = new Map<string, DocumentRegistryEntry>();

// Cleanup old documents after 24 hours
setInterval(() => {
  const now = Date.now();
  const expiry = 24 * 60 * 60 * 1000; // 24 hours
  const entries = Array.from(documentRegistry.entries());
  for (const [id, entry] of entries) {
    if (now - entry.uploadedAt.getTime() > expiry) {
      try { fs.unlinkSync(entry.filepath); } catch {}
      documentRegistry.delete(id);
    }
  }
}, 60 * 60 * 1000); // Check every hour

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/pdf',
      'text/plain',
    ];
    const allowedExtensions = ['.docx', '.pdf', '.txt'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload .docx, .pdf, or .txt files.'));
    }
  }
});

/**
 * POST /api/quick-create/upload
 * Upload document and extract content preview
 */
router.post('/upload', isAuthenticated, upload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const userId = (req.user as any)?.id;
    console.log(`[QuickCreate] File uploaded: ${req.file.originalname} by user ${userId}`);
    
    // Extract document content
    const extracted = await documentUploadService.extractContent(
      req.file.path,
      req.file.mimetype
    );
    
    // Generate secure document ID and register in registry
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const preview = {
      title: extracted.title,
      sectionCount: extracted.sections.length,
      estimatedDuration: extracted.estimatedReadingTimeMinutes,
      sections: extracted.sections.map(s => ({
        heading: s.heading,
        contentPreview: s.content.substring(0, 100) + (s.content.length > 100 ? '...' : ''),
        bulletCount: s.bulletPoints.length,
      })),
    };
    
    documentRegistry.set(documentId, {
      documentId,
      ownerId: userId,
      filepath: req.file.path,
      filename: req.file.originalname,
      uploadedAt: new Date(),
      preview,
    });
    
    console.log(`[QuickCreate] Registered document ${documentId} for user ${userId}`);
    
    res.json({
      success: true,
      document: {
        documentId,
        filename: req.file.originalname,
        title: extracted.title,
        sectionCount: extracted.sections.length,
        estimatedDuration: extracted.estimatedReadingTimeMinutes,
        sections: preview.sections,
      },
    });
    
  } catch (error: any) {
    console.error('[QuickCreate] Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/quick-create/generate
 * Generate video from uploaded document
 */
router.post('/generate', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const {
      documentId,
      targetDuration = 4,
      visualStyle = 'educational',
      platform = 'youtube',
      voiceId,
      voiceName,
      brandSettings = {
        includeIntroLogo: true,
        includeWatermark: true,
        includeCTAOutro: true,
      },
    } = req.body;
    
    if (!documentId) {
      return res.status(400).json({ success: false, error: 'No document ID provided' });
    }
    
    // Validate document exists and belongs to user
    const docEntry = documentRegistry.get(documentId);
    if (!docEntry) {
      return res.status(404).json({ success: false, error: 'Document not found or expired' });
    }
    if (docEntry.ownerId !== userId) {
      console.warn(`[QuickCreate] User ${userId} attempted to access document ${documentId} owned by ${docEntry.ownerId}`);
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const { filepath, filename } = docEntry;
    console.log(`[QuickCreate] Generating ${targetDuration} minute video from ${filename}`);
    
    // Step 1: Extract document content (using validated filepath from registry)
    const extracted = await documentUploadService.extractContent(filepath, '');
    
    // Step 2: Convert to video script format
    const script = documentUploadService.formatAsVideoScript(extracted, targetDuration);
    
    console.log(`[QuickCreate] Generated script with ${script.length} characters`);
    
    // Step 3: Parse script to scenes using existing service
    const scenes = await universalVideoService.parseScript({
      title: extracted.title || filename.replace(/\.[^.]+$/, ''),
      script,
      targetDuration: targetDuration * 60,
      platform,
      style: visualStyle,
    });
    
    // Step 4: Create project
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const project: VideoProject = {
      id: projectId,
      type: 'script-based',
      title: extracted.title || filename.replace(/\.[^.]+$/, ''),
      description: `Quick Create from ${filename}`,
      createdAt: now,
      updatedAt: now,
      fps: 30,
      totalDuration: scenes.reduce((acc, s) => acc + s.duration, 0),
      outputFormat: OUTPUT_FORMATS[platform as keyof typeof OUTPUT_FORMATS] || OUTPUT_FORMATS.youtube,
      brand: PINE_HILL_FARM_BRAND,
      scenes,
      voiceId: voiceId || '21m00Tcm4TlvDq8ikWAM',
      voiceName: voiceName || 'Rachel',
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
        overallPercent: 10,
        errors: [],
        serviceFailures: [],
        steps: {
          script: { status: 'complete', progress: 100, message: `Parsed ${scenes.length} scenes` },
          voiceover: { status: 'pending', progress: 0 },
          images: { status: 'pending', progress: 0 },
          videos: { status: 'pending', progress: 0 },
          music: { status: 'pending', progress: 0 },
          assembly: { status: 'pending', progress: 0 },
          rendering: { status: 'pending', progress: 0 },
        },
      },
    };
    
    // Apply brand settings
    (project as any).brandSettings = brandSettings;
    (project as any).qualityTier = 'standard'; // T2V only
    (project as any).visualStyle = visualStyle;
    (project as any).generationMode = 't2v'; // Explicitly enforce T2V mode
    
    // Ensure all scenes use T2V mode
    scenes.forEach(scene => {
      (scene as any).videoGenMode = 't2v';
    });
    
    console.log(`[QuickCreate] Created project ${project.id} with ${project.scenes.length} scenes`);
    
    // Step 5: Store project in database with correct schema
    await db.insert(universalVideoProjects).values({
      projectId: projectId,
      ownerId: userId,
      title: project.title,
      type: 'script-based',
      description: project.description || '',
      totalDuration: project.totalDuration,
      fps: project.fps,
      outputFormat: project.outputFormat,
      brand: project.brand,
      scenes: project.scenes,
      assets: project.assets,
      progress: project.progress as any,
      status: 'generating',
      qualityTier: 'standard',
    });
    
    // Step 6: Trigger asset generation (async - don't wait)
    setImmediate(async () => {
      try {
        console.log(`[QuickCreate] Starting asset generation for ${projectId}`);
        await universalVideoService.generateProjectAssets(project, { skipMusic: false });
        console.log(`[QuickCreate] Asset generation complete for ${projectId}`);
      } catch (err) {
        console.error(`[QuickCreate] Asset generation failed for ${projectId}:`, err);
      }
    });
    
    res.json({
      success: true,
      project: {
        id: project.id,
        title: project.title,
        sceneCount: project.scenes.length,
        estimatedDuration: project.totalDuration,
        status: 'generating',
      },
      message: 'Video generation started. You will be notified when ready.',
    });
    
  } catch (error: any) {
    console.error('[QuickCreate] Generation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/quick-create/status/:projectId
 * Check generation status
 */
router.get('/status/:projectId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    
    // Get project from database
    const results = await db.select()
      .from(universalVideoProjects)
      .where(eq(universalVideoProjects.projectId, projectId))
      .limit(1);
    
    if (results.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    const projectRow = results[0];
    // Reconstruct project from stored columns
    const project = {
      id: projectRow.projectId,
      scenes: projectRow.scenes as any[],
      progress: projectRow.progress as any,
      status: projectRow.status,
      finalVideoUrl: projectRow.outputUrl,
    };
    
    // Calculate progress
    const progress = project.progress || { steps: {}, overallProgress: 0 };
    const steps = ['script', 'voiceover', 'images', 'videos', 'music', 'assembly'];
    const completedSteps = steps.filter(step => 
      (progress.steps as any)?.[step]?.status === 'complete'
    ).length;
    const progressPercent = Math.round((completedSteps / steps.length) * 100);
    
    const currentStep = steps.find(step => 
      (progress.steps as any)?.[step]?.status === 'in-progress'
    ) || progress.currentStep || 'pending';
    
    const isStalled = projectRow.status === 'generating' && 
      projectRow.updatedAt && 
      (Date.now() - new Date(projectRow.updatedAt).getTime()) > 180000;

    res.json({
      success: true,
      status: projectRow.status,
      progress: progressPercent,
      currentStep,
      isStalled,
      downloadUrl: projectRow.status === 'complete' ? (project as any).finalVideoUrl : null,
      scenes: project.scenes?.map((s: any) => ({
        id: s.id,
        type: s.type,
        hasVideo: !!(s.assets?.videoUrl || s.videoUrl),
        hasVoiceover: !!(s.assets?.voiceoverUrl || s.voiceoverUrl),
      })) || [],
    });
    
  } catch (error: any) {
    console.error('[QuickCreate] Status check error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/retry/:projectId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    
    const results = await db.select()
      .from(universalVideoProjects)
      .where(eq(universalVideoProjects.projectId, projectId))
      .limit(1);
    
    if (results.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    const projectRow = results[0];
    if (projectRow.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    if (projectRow.status !== 'generating' && projectRow.status !== 'error') {
      return res.status(400).json({ success: false, error: 'Project is not in a retryable state' });
    }
    
    const project = {
      id: projectRow.projectId,
      type: projectRow.type,
      title: projectRow.title,
      description: projectRow.description,
      fps: projectRow.fps,
      totalDuration: projectRow.totalDuration,
      outputFormat: projectRow.outputFormat,
      brand: projectRow.brand,
      scenes: projectRow.scenes,
      assets: projectRow.assets,
      status: 'generating',
      progress: {
        currentStep: 'script',
        overallPercent: 10,
        errors: [],
        serviceFailures: [],
        steps: {
          script: { status: 'complete', progress: 100, message: `Parsed ${(projectRow.scenes as any[])?.length || 0} scenes` },
          voiceover: { status: 'pending', progress: 0 },
          images: { status: 'pending', progress: 0 },
          videos: { status: 'pending', progress: 0 },
          music: { status: 'pending', progress: 0 },
          assembly: { status: 'pending', progress: 0 },
          rendering: { status: 'pending', progress: 0 },
        },
      },
    } as any;

    const raw = projectRow as any;
    if (raw.qualityTier) project.qualityTier = raw.qualityTier;
    if (raw.visualStyle) project.visualStyle = raw.visualStyle;
    if (raw.generationMode) project.generationMode = raw.generationMode;
    if (raw.voiceId) project.voiceId = raw.voiceId;
    if (raw.voiceName) project.voiceName = raw.voiceName;
    if (raw.brandSettings) project.brandSettings = raw.brandSettings;
    
    await db.update(universalVideoProjects)
      .set({
        status: 'generating',
        progress: project.progress,
        updatedAt: new Date(),
      })
      .where(eq(universalVideoProjects.projectId, projectId));
    
    console.log(`[QuickCreate] Retrying asset generation for ${projectId}`);
    
    setImmediate(async () => {
      try {
        console.log(`[QuickCreate] Retry: Starting asset generation for ${projectId}`);
        await universalVideoService.generateProjectAssets(project, { skipMusic: false });
        console.log(`[QuickCreate] Retry: Asset generation complete for ${projectId}`);
      } catch (err) {
        console.error(`[QuickCreate] Retry: Asset generation failed for ${projectId}:`, err);
      }
    });
    
    res.json({
      success: true,
      message: 'Generation restarted. Progress will update shortly.',
    });
    
  } catch (error: any) {
    console.error('[QuickCreate] Retry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
