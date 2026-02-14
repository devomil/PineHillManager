import { Router, Request, Response } from 'express';
import { requireAdmin } from '../auth';
import { IMAGE_PROVIDERS } from '../config/image-providers';
import { piapiVideoService } from '../services/piapi-video-service';
import { runwayVideoService } from '../services/runway-video-service';
import { imageGenerationService } from '../services/image-generation-service';
import { db } from '../db';
import { mediaAssets, brandAssets } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import path from 'path';

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
    id: 'wan-2.6',
    name: 'Wan 2.6',
    category: 'video',
    capabilities: { t2v: true, i2v: true, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 5,
    costPerSecond: 0.035,
  },
  {
    id: 'runway',
    name: 'Runway Gen-4 Turbo',
    category: 'video',
    capabilities: { t2v: true, i2v: true, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    costPerSecond: 0.05,
  },
  {
    id: 'runway-gen3',
    name: 'Runway Gen-3',
    category: 'video',
    capabilities: { t2v: true, i2v: true, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    costPerSecond: 0.04,
  },
  {
    id: 'kling-2.6',
    name: 'Kling 2.6',
    category: 'video',
    capabilities: { t2v: true, i2v: true, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    costPerSecond: 0.035,
  },
  {
    id: 'kling-2.6-pro',
    name: 'Kling 2.6 Pro',
    category: 'video',
    capabilities: { t2v: true, i2v: true, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    costPerSecond: 0.045,
  },
  {
    id: 'kling-2.6-motion-pro',
    name: 'Kling 2.6 Motion Pro',
    category: 'video',
    capabilities: { t2v: true, i2v: true, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    costPerSecond: 0.05,
  },
  {
    id: 'kling-2.5-turbo',
    name: 'Kling 2.5 Turbo',
    category: 'video',
    capabilities: { t2v: true, i2v: true, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    costPerSecond: 0.02,
  },
  {
    id: 'veo-2',
    name: 'Google Veo 2',
    category: 'video',
    capabilities: { t2v: true, i2v: false, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 8,
    costPerSecond: 0.04,
  },
  {
    id: 'pika',
    name: 'Pika Labs',
    category: 'video',
    capabilities: { t2v: true, i2v: true, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 5,
    costPerSecond: 0.03,
  },
  {
    id: 'genmo',
    name: 'Genmo',
    category: 'video',
    capabilities: { t2v: true, i2v: false, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 4,
    costPerSecond: 0.02,
  },
  {
    id: 'skyreels',
    name: 'Skyreels',
    category: 'video',
    capabilities: { t2v: true, i2v: false, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 5,
    costPerSecond: 0.02,
  },
  {
    id: 'seedance-1.0',
    name: 'Seedance 1.0',
    category: 'video',
    capabilities: { t2v: true, i2v: true, v2v: false },
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 5,
    costPerSecond: 0.025,
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

function convertToAbsoluteUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : 'http://localhost:5000';
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
}

function stringifyError(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error) return stringifyError(error.error);
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

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

  const absoluteImageUrl = convertToAbsoluteUrl(options.imageUrl);

  try {
    const isVideoProvider = VIDEO_PROVIDERS_CONFIG.some(p => p.id === options.provider);
    
    if (isVideoProvider) {
      task.logs.push(`[${new Date().toISOString()}] Calling video provider: ${options.provider}`);
      
      if (options.provider === 'runway') {
        const isRunwayI2V = options.taskType === 'i2v' && absoluteImageUrl;
        
        if (isRunwayI2V) {
          task.logs.push(`[${new Date().toISOString()}] Runway I2V mode with image: ${absoluteImageUrl}`);
        }
        
        const result = await runwayVideoService.generateVideo({
          prompt: options.prompt,
          duration: options.duration,
          aspectRatio: options.aspectRatio as '16:9' | '9:16' | '1:1',
          imageUrl: isRunwayI2V ? absoluteImageUrl : undefined,
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
          task.error = stringifyError(result.error) || 'Unknown error';
          task.logs.push(`[${new Date().toISOString()}] Generation failed: ${task.error}`);
        }
      } else {
        const isI2V = options.taskType === 'i2v' && absoluteImageUrl;
        
        if (isI2V) {
          task.logs.push(`[${new Date().toISOString()}] Using absolute image URL: ${absoluteImageUrl}`);
        }
        
        let result;
        if (isI2V) {
          result = await piapiVideoService.generateImageToVideo({
            prompt: options.prompt,
            imageUrl: absoluteImageUrl!,
            duration: options.duration,
            aspectRatio: options.aspectRatio as '16:9' | '9:16' | '1:1',
            model: options.provider,
            generateAudio: options.generateAudio,
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
          task.error = stringifyError(result.error) || 'Unknown error';
          task.logs.push(`[${new Date().toISOString()}] Generation failed: ${task.error}`);
        }
      }
    } else {
      const isI2I = options.taskType === 'i2i' && absoluteImageUrl;
      task.logs.push(`[${new Date().toISOString()}] Calling image provider: ${options.provider} (${isI2I ? 'i2i' : 't2i'})`);
      
      try {
        const result = await imageGenerationService.generateImage({
          prompt: options.prompt,
          aspectRatio: options.aspectRatio,
          provider: options.provider,
          ...(isI2I ? { imageUrl: absoluteImageUrl } : {}),
        });
        
        task.status = 'completed';
        task.result = {
          url: result.url,
          cost: result.cost,
        };
        task.logs.push(`[${new Date().toISOString()}] Generation complete! Cost: $${result.cost?.toFixed(4)}`);
      } catch (imageError: any) {
        task.status = 'failed';
        task.error = stringifyError(imageError);
        task.logs.push(`[${new Date().toISOString()}] Generation failed: ${task.error}`);
      }
    }
  } catch (error: any) {
    task.status = 'failed';
    task.error = stringifyError(error);
    task.logs.push(`[${new Date().toISOString()}] Error: ${task.error}`);
    console.error('[ProviderTest] Task processing error:', error);
  }
}

const saveAssetSchema = z.object({
  url: z.string().min(1),
  name: z.string().min(1).max(255),
  type: z.enum(['image', 'video']),
  provider: z.string().optional(),
  prompt: z.string().optional(),
  duration: z.number().optional(),
  cost: z.number().optional(),
});

router.post('/save-asset', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const parsed = saveAssetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors });
    }

    const { url, name, type, provider, prompt, duration } = parsed.data;

    const publicPaths = process.env.PUBLIC_OBJECT_SEARCH_PATHS || '';
    const firstPath = publicPaths.split(',')[0]?.trim();

    let finalUrl = url;
    let brandAssetId: number | undefined;
    let fileSize: number | undefined;
    let mimeType: string | undefined;

    if (firstPath) {
      const pathParts = firstPath.startsWith('/') ? firstPath.slice(1).split('/') : firstPath.split('/');
      const bucketName = pathParts[0];

      if (bucketName) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            const contentType = response.headers.get('content-type') || (type === 'video' ? 'video/mp4' : 'image/png');
            mimeType = contentType;
            fileSize = buffer.length;
            const ext = type === 'video' ? '.mp4' : (contentType.includes('png') ? '.png' : '.jpg');
            const timestamp = Date.now();
            const uniqueId = Math.random().toString(36).substring(2, 8);
            const filename = `public/media-assets/${timestamp}-${uniqueId}${ext}`;

            const { objectStorageClient } = await import('../objectStorage');
            const bucket = objectStorageClient.bucket(bucketName);
            const fileRef = bucket.file(filename);
            await fileRef.save(buffer, {
              metadata: { contentType },
            });

            const [ba] = await db.insert(brandAssets).values({
              name,
              type: type === 'video' ? 'video' : 'image',
              url: '',
              thumbnailUrl: '',
              fileSize: buffer.length,
              mimeType: contentType,
              isDefault: false,
              uploadedBy: user.id,
              settings: {
                storagePath: `${bucketName}|${filename}`,
              },
            }).returning();

            brandAssetId = ba.id;
            const proxyUrl = `/api/brand-assets/file/${ba.id}`;
            await db.update(brandAssets)
              .set({ url: proxyUrl, thumbnailUrl: proxyUrl })
              .where(eq(brandAssets.id, ba.id));
            finalUrl = proxyUrl;
          }
        } catch (storageError) {
          console.error('[ProviderTest] Storage upload failed, saving with original URL:', storageError);
        }
      }
    }

    const [asset] = await db.insert(mediaAssets).values({
      name,
      type,
      source: provider || 'ai_generated',
      url: finalUrl,
      thumbnailUrl: finalUrl,
      classification: 'uncategorized',
      prompt: prompt || null,
      duration: duration || null,
      fileSize: fileSize || null,
      mimeType: mimeType || (type === 'video' ? 'video/mp4' : 'image/png'),
      category: 'ai_generated',
      keywords: prompt ? prompt.split(/\s+/).slice(0, 10) : [],
      description: prompt ? `Generated by ${provider || 'AI'}: ${prompt.substring(0, 200)}` : null,
      isPublic: true,
      uploadedBy: user.id,
    }).returning();

    if (brandAssetId) {
      const existingBa = await db.select().from(brandAssets).where(eq(brandAssets.id, brandAssetId));
      const storagePath = (existingBa[0]?.settings as any)?.storagePath;
      await db.update(brandAssets)
        .set({ settings: { storagePath, mediaAssetId: asset.id } as any })
        .where(eq(brandAssets.id, brandAssetId));
    }

    res.json({ success: true, asset });
  } catch (error: any) {
    console.error('[ProviderTest] Save asset error:', error);
    res.status(500).json({ error: error.message || 'Failed to save asset' });
  }
});

export default router;
