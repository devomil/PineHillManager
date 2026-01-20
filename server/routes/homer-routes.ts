import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { isAuthenticated, requireRole } from '../auth';
import { homerAIService } from '../services/homer-ai-service';
import { homerMemoryService, MAX_MEMORIES_PER_USER, MAX_GLOBAL_MEMORIES } from '../services/homer-memory-service';
import { homerFileService } from '../services/homer-file-service';
import { randomUUID } from 'crypto';
import { db } from '../db';
import { homerMemories } from '@shared/schema';
import { eq, and, lte } from 'drizzle-orm';
import multer from 'multer';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

const querySchema = z.object({
  question: z.string().min(1, 'Question is required'),
  sessionId: z.string().optional(),
  inputMethod: z.enum(['text', 'voice']).default('text'),
  generateVoice: z.boolean().default(false),
});

router.post('/query', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const { question, sessionId, inputMethod, generateVoice } = querySchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!homerAIService.isAvailable()) {
      return res.status(503).json({ 
        error: 'Homer AI is not available',
        message: 'The AI service is not configured. Please check API keys.'
      });
    }

    const activeSessionId = sessionId || randomUUID();

    const response = await homerAIService.processQuery(
      userId,
      activeSessionId,
      question,
      inputMethod
    );

    let audioUrl: string | undefined;
    console.log('[Homer Routes] Voice generation requested:', generateVoice);
    console.log('[Homer Routes] Response text available:', !!response.text, 'length:', response.text?.length || 0);
    
    if (generateVoice && response.text) {
      console.log('[Homer Routes] Starting voice generation for response...');
      try {
        const audio = await homerAIService.generateVoiceResponse(response.text);
        console.log('[Homer Routes] Voice generation result:', !!audio, audio ? `base64 length: ${audio.length}` : 'no audio');
        if (audio) {
          audioUrl = audio;
          console.log('[Homer Routes] Audio URL set successfully');
        } else {
          console.warn('[Homer Routes] Voice generation returned null');
        }
      } catch (voiceError: any) {
        console.error('[Homer Routes] Voice generation failed:', voiceError.message);
      }
    } else {
      console.log('[Homer Routes] Skipping voice generation - generateVoice:', generateVoice, 'hasText:', !!response.text);
    }

    res.json({
      success: true,
      sessionId: activeSessionId,
      response: {
        ...response,
        audioUrl,
      },
    });

  } catch (error: any) {
    console.error('[Homer Routes] Query error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    
    res.status(500).json({ 
      error: 'Failed to process query',
      message: error.message 
    });
  }
});

router.get('/status', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  const piapiAvailable = !!process.env.PIAPI_API_KEY;
  const elevenLabsAvailable = !!process.env.ELEVENLABS_API_KEY;
  console.log('[Homer Status] PiAPI:', piapiAvailable, 'ElevenLabs:', elevenLabsAvailable);
  res.json({
    available: homerAIService.isAvailable(),
    voiceEnabled: piapiAvailable || elevenLabsAvailable,
    voiceProvider: piapiAvailable ? 'PiAPI F5-TTS' : (elevenLabsAvailable ? 'ElevenLabs' : 'None'),
    aiModel: 'Claude Sonnet 4',
  });
});

router.get('/history', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.query.sessionId as string;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const history = await homerAIService.getConversationHistory(userId, sessionId);
    
    res.json({
      success: true,
      history: history.reverse(),
    });

  } catch (error: any) {
    console.error('[Homer Routes] History error:', error);
    res.status(500).json({ error: 'Failed to get conversation history' });
  }
});

router.get('/sessions', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const sessions = await homerAIService.getRecentSessions(userId);
    
    res.json({
      success: true,
      sessions,
    });

  } catch (error: any) {
    console.error('[Homer Routes] Sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

router.post('/voice-to-text', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Voice recognition is handled client-side using Web Speech API',
  });
});

// ============================================
// MEMORY ENDPOINTS
// ============================================

router.get('/memories', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const category = req.query.category as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    let memories;
    if (category) {
      memories = await homerMemoryService.getMemoriesByCategory(userId, category);
    } else {
      memories = await homerMemoryService.getMemoriesForUser(userId, { limit });
    }

    res.json({
      success: true,
      memories,
      count: memories.length,
    });

  } catch (error: any) {
    console.error('[Homer Routes] Get memories error:', error);
    res.status(500).json({ error: 'Failed to get memories' });
  }
});

router.post('/memories', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { category, subject, content, importance, tags, isGlobal } = req.body;

    if (!category || !subject || !content) {
      return res.status(400).json({ error: 'Category, subject, and content are required' });
    }

    const memory = await homerMemoryService.createMemory({
      userId: isGlobal ? null : userId,
      category,
      subject,
      content,
      importance: importance || 5,
      tags: tags || [],
    });

    res.json({
      success: true,
      memory,
    });

  } catch (error: any) {
    console.error('[Homer Routes] Create memory error:', error);
    res.status(500).json({ error: 'Failed to create memory' });
  }
});

router.get('/memories/search', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const memories = await homerMemoryService.searchMemories(userId, query);

    res.json({
      success: true,
      memories,
      count: memories.length,
    });

  } catch (error: any) {
    console.error('[Homer Routes] Search memories error:', error);
    res.status(500).json({ error: 'Failed to search memories' });
  }
});

router.patch('/memories/:id/importance', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const memoryId = parseInt(req.params.id);
    const { importance } = req.body;

    if (isNaN(memoryId) || importance === undefined) {
      return res.status(400).json({ error: 'Memory ID and importance required' });
    }

    await homerMemoryService.updateImportance(memoryId, importance);

    res.json({
      success: true,
      message: 'Memory importance updated',
    });

  } catch (error: any) {
    console.error('[Homer Routes] Update importance error:', error);
    res.status(500).json({ error: 'Failed to update memory' });
  }
});

router.delete('/memories/:id', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const memoryId = parseInt(req.params.id);

    if (isNaN(memoryId)) {
      return res.status(400).json({ error: 'Valid memory ID required' });
    }

    await homerMemoryService.deactivateMemory(memoryId);

    res.json({
      success: true,
      message: 'Memory deleted',
    });

  } catch (error: any) {
    console.error('[Homer Routes] Delete memory error:', error);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

router.get('/memories/stats', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const counts = await homerMemoryService.getMemoryCount(userId);
    
    res.json({
      success: true,
      stats: {
        personal: counts.personal,
        global: counts.global,
        total: counts.total,
        limits: {
          maxPersonal: MAX_MEMORIES_PER_USER,
          maxGlobal: MAX_GLOBAL_MEMORIES,
        },
        usage: {
          personalPercent: Math.round((counts.personal / MAX_MEMORIES_PER_USER) * 100),
          globalPercent: Math.round((counts.global / MAX_GLOBAL_MEMORIES) * 100),
        },
      },
    });

  } catch (error: any) {
    console.error('[Homer Routes] Memory stats error:', error);
    res.status(500).json({ error: 'Failed to get memory stats' });
  }
});

router.post('/memories/prune', isAuthenticated, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const prunedCount = await homerMemoryService.pruneMemories(userId);
    
    res.json({
      success: true,
      prunedCount,
      message: `Pruned ${prunedCount} old or low-importance memories`,
    });

  } catch (error: any) {
    console.error('[Homer Routes] Prune error:', error);
    res.status(500).json({ error: 'Failed to prune memories' });
  }
});

router.delete('/memories/bulk', isAuthenticated, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { category, olderThanDays, importance } = req.body;
    
    let conditions = [eq(homerMemories.isActive, true)];
    
    if (category) {
      conditions.push(eq(homerMemories.category, category));
    }
    
    if (olderThanDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - olderThanDays);
      conditions.push(lte(homerMemories.createdAt, cutoff));
    }
    
    if (importance) {
      conditions.push(lte(homerMemories.importance, importance));
    }
    
    await db.update(homerMemories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(...conditions));
    
    res.json({
      success: true,
      message: 'Memories deleted',
    });

  } catch (error: any) {
    console.error('[Homer Routes] Bulk delete error:', error);
    res.status(500).json({ error: 'Failed to delete memories' });
  }
});

// ============================================
// FILE ENDPOINTS
// ============================================

router.post('/files/upload', isAuthenticated, requireRole(['admin', 'manager']), upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { description, tags, isShared, conversationId, messageId } = req.body;

    const file = await homerFileService.uploadFile({
      userId,
      file: {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
      description,
      tags: tags ? JSON.parse(tags) : [],
      isShared: isShared === 'true',
      conversationId,
      messageId,
    });

    res.json({
      success: true,
      file: {
        fileId: file.fileId,
        originalName: file.originalName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        url: homerFileService.getFileUrl(file.fileId),
      },
    });

  } catch (error: any) {
    console.error('[Homer Routes] Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file' });
  }
});

router.get('/files', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const files = await homerFileService.getFilesForUser(userId, limit);

    res.json({
      success: true,
      files: files.map(f => ({
        ...f,
        url: homerFileService.getFileUrl(f.fileId),
      })),
    });

  } catch (error: any) {
    console.error('[Homer Routes] Get files error:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
});

router.get('/files/:fileId', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const file = await homerFileService.getFile(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (file.uploadedBy !== userId && !file.isShared) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const buffer = await homerFileService.getFileBuffer(fileId);
    if (!buffer) {
      return res.status(404).json({ error: 'File data not found' });
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);

  } catch (error: any) {
    console.error('[Homer Routes] Get file error:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

router.get('/files/:fileId/info', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const file = await homerFileService.getFile(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (file.uploadedBy !== userId && !file.isShared) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      file: {
        ...file,
        url: homerFileService.getFileUrl(file.fileId),
      },
    });

  } catch (error: any) {
    console.error('[Homer Routes] Get file info error:', error);
    res.status(500).json({ error: 'Failed to get file info' });
  }
});

router.post('/files/:fileId/share', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const success = await homerFileService.shareFile(fileId, userId);
    if (!success) {
      return res.status(403).json({ error: 'Cannot share this file' });
    }

    res.json({
      success: true,
      message: 'File shared with all Homer users',
    });

  } catch (error: any) {
    console.error('[Homer Routes] Share file error:', error);
    res.status(500).json({ error: 'Failed to share file' });
  }
});

router.delete('/files/:fileId', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const success = await homerFileService.deleteFile(fileId, userId);
    if (!success) {
      return res.status(403).json({ error: 'Cannot delete this file' });
    }

    res.json({
      success: true,
      message: 'File deleted',
    });

  } catch (error: any) {
    console.error('[Homer Routes] Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;