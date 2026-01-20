import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { isAuthenticated, requireRole } from '../auth';
import { homerAIService } from '../services/homer-ai-service';
import { homerMemoryService } from '../services/homer-memory-service';
import { randomUUID } from 'crypto';

const router = Router();

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
    console.log('[Homer Routes] generateVoice:', generateVoice, 'response.text length:', response.text?.length);
    if (generateVoice && response.text) {
      console.log('[Homer Routes] Generating voice response...');
      const audio = await homerAIService.generateVoiceResponse(response.text);
      console.log('[Homer Routes] Audio generated:', !!audio, audio ? `${audio.substring(0, 50)}...` : 'null');
      if (audio) {
        audioUrl = audio;
      }
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

export default router;