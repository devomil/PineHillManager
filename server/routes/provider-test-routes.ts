import { Router, Request, Response } from 'express';
import { requireAdmin } from '../auth';
import { IMAGE_PROVIDERS } from '../config/image-providers';
import { piapiVideoService } from '../services/piapi-video-service';
import { runwayVideoService } from '../services/runway-video-service';
import { imageGenerationService } from '../services/image-generation-service';

const router = Router();

interface VideoProvider {
  id: string;
  name: string;
  category: 'video';
  capabilities: {
    t2v: boolean;
    i2v: boolean;
    v2v: boolean;
  };
  supportedAspectRatios: string[];
  maxDuration: number;
  costPerSecond: number;
}

interface ImageProviderInfo {
  id: string;
  name: string;
  category: 'image';
  capabilities: {
    t2i: boolean;
    i2i: boolean;
  };
  supportedAspectRatios: string[];
  costPerImage: number;
}

const VIDEO_PROVIDERS_CONFIG: VideoProvider[] = [
  {
    id: 'veo-3.1',
    name: 'Veo 3.1 (Google)',
    category: 'video',
    capabilities: { t2v: true, i2v: true, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 8,
    costPerSecond: 0.06,
  },
  {
    id: 'veo-3',
    name: 'Veo 3 (Google)',
    category: 'video',
    capabilities: { t2v: true, i2v: true, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 8,
    costPerSecond: 0.05,
  },
  {
    id: 'kling-2.1',
    name: 'Kling 2.1',
    category: 'video',
    capabilities: { t2v: true, i2v: true, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    costPerSecond: 0.03,
  },
  {
    id: 'kling-2.0',
    name: 'Kling 2.0',
    category: 'video',
    capabilities: { t2v: true, i2v: true, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    costPerSecond: 0.03,
  },
  {
    id: 'kling-1.6',
    name: 'Kling 1.6',
    category: 'video',
    capabilities: { t2v: true, i2v: true, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    costPerSecond: 0.025,
  },
  {
    id: 'luma',
    name: 'Luma Dream Machine',
    category: 'video',
    capabilities: { t2v: true, i2v: true, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 5,
    costPerSecond: 0.04,
  },
  {
    id: 'hailuo',
    name: 'Hailuo (Minimax)',
    category: 'video',
    capabilities: { t2v: true, i2v: false, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 6,
    costPerSecond: 0.02,
  },
  {
    id: 'hunyuan',
    name: 'Hunyuan',
    category: 'video',
    capabilities: { t2v: true, i2v: false, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 5,
    costPerSecond: 0.025,
  },
  {
    id: 'wan-2.1',
    name: 'Wan 2.1',
    category: 'video',
    capabilities: { t2v: true, i2v: true, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 5,
    costPerSecond: 0.03,
  },
  {
    id: 'runway',
    name: 'Runway Gen-3 Alpha',
    category: 'video',
    capabilities: { t2v: true, i2v: true, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    costPerSecond: 0.05,
  },
];

const taskStore = new Map<string, {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  provider: string;
  taskType: string;
  prompt: string;
  startTime: number;
  result?: {
    url?: string;
    thumbnailUrl?: string;
    duration?: number;
    cost?: number;
  };
  error?: string;
  logs: string[];
}>();

router.get('/providers', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const imageProviders: ImageProviderInfo[] = Object.entries(IMAGE_PROVIDERS).map(([id, provider]) => ({
      id,
      name: provider.name,
      category: 'image' as const,
      capabilities: {
        t2i: provider.capabilities.textToImage,
        i2i: provider.capabilities.imageToImage,
      },
      supportedAspectRatios: provider.capabilities.supportedAspectRatios,
      costPerImage: provider.costPerImage,
    }));

    res.json({
      video: VIDEO_PROVIDERS_CONFIG,
      image: imageProviders,
    });
  } catch (error: any) {
    console.error('[ProviderTest] Error fetching providers:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      provider,
      taskType,
      prompt,
      imageUrl,
      videoUrl,
      aspectRatio = '16:9',
      duration = 5,
      resolution = '720p',
      generateAudio = false,
    } = req.body;

    if (!provider || !taskType || !prompt) {
      return res.status(400).json({ error: 'Missing required fields: provider, taskType, prompt' });
    }

    const taskId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    taskStore.set(taskId, {
      id: taskId,
      status: 'pending',
      provider,
      taskType,
      prompt,
      startTime: Date.now(),
      logs: [`[${new Date().toISOString()}] Task created`],
    });

    res.json({ taskId, status: 'pending' });

    processTask(taskId, {
      provider,
      taskType,
      prompt,
      imageUrl,
      videoUrl,
      aspectRatio,
      duration,
      resolution,
      generateAudio,
    });
  } catch (error: any) {
    console.error('[ProviderTest] Error creating task:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/task/:taskId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = taskStore.get(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error: any) {
    console.error('[ProviderTest] Error fetching task:', error);
    res.status(500).json({ error: error.message });
  }
});

async function processTask(taskId: string, options: {
  provider: string;
  taskType: string;
  prompt: string;
  imageUrl?: string;
  videoUrl?: string;
  aspectRatio: string;
  duration: number;
  resolution: string;
  generateAudio: boolean;
}) {
  const task = taskStore.get(taskId);
  if (!task) return;

  task.status = 'processing';
  task.logs.push(`[${new Date().toISOString()}] Starting ${options.taskType} with ${options.provider}`);

  try {
    const isVideoProvider = VIDEO_PROVIDERS_CONFIG.some(p => p.id === options.provider);
    
    if (isVideoProvider) {
      task.logs.push(`[${new Date().toISOString()}] Calling video provider: ${options.provider}`);
      
      if (options.provider === 'runway') {
        const result = await runwayVideoService.generateVideo({
          prompt: options.prompt,
          duration: options.duration,
          aspectRatio: options.aspectRatio as '16:9' | '9:16' | '1:1',
        });
        
        if (result.success && result.videoUrl) {
          task.status = 'completed';
          task.result = {
            url: result.videoUrl,
            duration: options.duration,
            cost: result.cost,
          };
          task.logs.push(`[${new Date().toISOString()}] Generation complete! Cost: $${result.cost?.toFixed(4)}`);
        } else {
          task.status = 'failed';
          task.error = result.error || 'Unknown error';
          task.logs.push(`[${new Date().toISOString()}] Generation failed: ${task.error}`);
        }
      } else {
        const isI2V = options.taskType === 'i2v' && options.imageUrl;
        
        let result;
        if (isI2V) {
          result = await piapiVideoService.generateImageToVideo({
            prompt: options.prompt,
            imageUrl: options.imageUrl!,
            duration: options.duration,
            aspectRatio: options.aspectRatio as '16:9' | '9:16' | '1:1',
            model: options.provider,
          });
        } else {
          result = await piapiVideoService.generateVideo({
            prompt: options.prompt,
            duration: options.duration,
            aspectRatio: options.aspectRatio as '16:9' | '9:16' | '1:1',
            model: options.provider,
          });
        }
        
        if (result.success && result.videoUrl) {
          task.status = 'completed';
          task.result = {
            url: result.videoUrl,
            duration: options.duration,
            cost: result.generationTimeMs ? (result.generationTimeMs / 1000) * 0.001 : undefined,
          };
          task.logs.push(`[${new Date().toISOString()}] Generation complete! Time: ${(result.generationTimeMs! / 1000).toFixed(1)}s`);
        } else {
          task.status = 'failed';
          task.error = result.error || 'Unknown error';
          task.logs.push(`[${new Date().toISOString()}] Generation failed: ${task.error}`);
        }
      }
    } else {
      const isI2I = options.taskType === 'i2i' && options.imageUrl;
      task.logs.push(`[${new Date().toISOString()}] Calling image provider: ${options.provider} (${isI2I ? 'i2i' : 't2i'})`);
      
      try {
        const result = await imageGenerationService.generateImage({
          prompt: options.prompt,
          aspectRatio: options.aspectRatio,
          provider: options.provider,
          ...(isI2I ? { imageUrl: options.imageUrl } : {}),
        });
        
        task.status = 'completed';
        task.result = {
          url: result.url,
          cost: result.cost,
        };
        task.logs.push(`[${new Date().toISOString()}] Generation complete! Cost: $${result.cost?.toFixed(4)}`);
      } catch (imageError: any) {
        task.status = 'failed';
        task.error = imageError.message || 'Unknown error';
        task.logs.push(`[${new Date().toISOString()}] Generation failed: ${task.error}`);
      }
    }
  } catch (error: any) {
    task.status = 'failed';
    task.error = error.message;
    task.logs.push(`[${new Date().toISOString()}] Error: ${error.message}`);
    console.error('[ProviderTest] Task processing error:', error);
  }
}

export default router;
