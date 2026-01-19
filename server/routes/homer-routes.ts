import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { isAuthenticated, requireRole } from '../auth';
import { homerAIService } from '../services/homer-ai-service';
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
  res.json({
    available: homerAIService.isAvailable(),
    voiceEnabled: !!process.env.ELEVENLABS_API_KEY,
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

export default router;