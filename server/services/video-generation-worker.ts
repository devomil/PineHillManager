import { storage } from '../storage';
import { aiVideoService } from './ai-video-service';
import { nanoid } from 'nanoid';
import type { VideoGenerationJob } from '@shared/schema';

interface VideoGenerationRequest {
  projectId: string;
  sceneId: string;
  provider: string;
  prompt: string;
  fallbackPrompt?: string;
  duration?: number;
  aspectRatio?: string;
  negativePrompt?: string;
  style?: string;
  triggeredBy?: string;
}

type JobUpdateCallback = (job: VideoGenerationJob) => void;

class VideoGenerationWorker {
  private workerInterval: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;
  private jobUpdateCallbacks: JobUpdateCallback[] = [];
  private processingJobIds: Set<string> = new Set();
  
  constructor() {}

  onJobUpdate(callback: JobUpdateCallback) {
    this.jobUpdateCallbacks.push(callback);
    return () => {
      const index = this.jobUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.jobUpdateCallbacks.splice(index, 1);
      }
    };
  }

  private notifyJobUpdate(job: VideoGenerationJob) {
    for (const callback of this.jobUpdateCallbacks) {
      try {
        callback(job);
      } catch (error) {
        console.error('[VideoWorker] Error in job update callback:', error);
      }
    }
  }

  async createJob(request: VideoGenerationRequest): Promise<VideoGenerationJob> {
    const jobId = `vj_${nanoid(16)}`;
    
    console.log(`[VideoWorker] Creating job ${jobId} for scene ${request.sceneId}`);
    
    const job = await storage.createVideoGenerationJob({
      jobId,
      projectId: request.projectId,
      sceneId: request.sceneId,
      provider: request.provider,
      status: 'pending',
      progress: 0,
      prompt: request.prompt,
      fallbackPrompt: request.fallbackPrompt || null,
      duration: request.duration || 6,
      aspectRatio: request.aspectRatio || '16:9',
      negativePrompt: request.negativePrompt || null,
      style: request.style || null,
      triggeredBy: request.triggeredBy || null,
      retryCount: 0,
      maxRetries: 3,
    });
    
    console.log(`[VideoWorker] Job ${jobId} created successfully`);
    
    this.notifyJobUpdate(job);
    
    return job;
  }

  async getJob(jobId: string): Promise<VideoGenerationJob | undefined> {
    return storage.getVideoGenerationJob(jobId);
  }

  async getJobsByScene(projectId: string, sceneId: string): Promise<VideoGenerationJob[]> {
    return storage.getVideoGenerationJobsByScene(projectId, sceneId);
  }

  async getActiveJobForScene(projectId: string, sceneId: string): Promise<VideoGenerationJob | undefined> {
    const jobs = await this.getJobsByScene(projectId, sceneId);
    return jobs.find(j => j.status === 'pending' || j.status === 'running');
  }

  startWorker(intervalMs: number = 3000) {
    if (this.workerInterval) {
      console.log('[VideoWorker] Worker already running');
      return;
    }

    console.log(`🎬 [VideoWorker] Starting video generation worker (interval: ${intervalMs}ms)`);

    this.workerInterval = setInterval(async () => {
      await this.processNextJob();
    }, intervalMs);

    storage.recoverStuckVideoGenerationJobs(10).then(recovered => {
      if (recovered > 0) {
        console.log(`[VideoWorker] Recovered ${recovered} stuck jobs`);
      }
    }).catch(error => {
      console.error('[VideoWorker] Error recovering stuck jobs:', error);
    });
  }

  stopWorker() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
      console.log('[VideoWorker] Worker stopped');
    }
  }

  private async processNextJob() {
    if (this.isProcessing) {
      return;
    }

    try {
      this.isProcessing = true;

      const pendingJobs = await storage.getPendingVideoGenerationJobs();
      
      if (pendingJobs.length === 0) {
        return;
      }

      const job = pendingJobs.find(j => !this.processingJobIds.has(j.jobId));
      if (!job) {
        return;
      }

      this.processingJobIds.add(job.jobId);
      console.log(`[VideoWorker] Processing job ${job.jobId} for scene ${job.sceneId}`);

      await this.processJob(job);

    } catch (error) {
      console.error('[VideoWorker] Error in worker loop:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processJob(job: VideoGenerationJob) {
    try {
      const updatedJob = await storage.updateVideoGenerationJob(job.jobId, {
        status: 'running',
        startedAt: new Date(),
        progress: 10,
      });
      this.notifyJobUpdate(updatedJob);

      console.log(`[VideoWorker] Starting video generation for job ${job.jobId}`);
      console.log(`[VideoWorker] Provider: ${job.provider}, Duration: ${job.duration}s, Aspect: ${job.aspectRatio}`);

      const provider = job.provider as 'runway' | 'kling' | 'luma' | 'hailuo' | 'hunyuan' | 'veo';
      
      let videoUrl: string | null = null;
      
      try {
        const progressJob1 = await storage.updateVideoGenerationJob(job.jobId, { progress: 30 });
        this.notifyJobUpdate(progressJob1);

        const aspectRatio = (job.aspectRatio === '16:9' || job.aspectRatio === '9:16' || job.aspectRatio === '1:1') 
          ? job.aspectRatio 
          : '16:9';
        
        const result = await aiVideoService.generateVideo({
          prompt: job.prompt || '',
          duration: job.duration || 6,
          aspectRatio,
          sceneType: 'hook',
          preferredProvider: provider,
          negativePrompt: job.negativePrompt || undefined,
          visualStyle: job.style || 'professional',
        });

        if (result.success && result.videoUrl) {
          videoUrl = result.videoUrl;
        } else if (result.success && result.s3Url) {
          videoUrl = result.s3Url;
        }

        const progressJob2 = await storage.updateVideoGenerationJob(job.jobId, { progress: 90 });
        this.notifyJobUpdate(progressJob2);

      } catch (genError: any) {
        console.error(`[VideoWorker] Video generation error for job ${job.jobId}:`, genError);
        
        if (job.retryCount !== null && job.maxRetries !== null && job.retryCount < job.maxRetries) {
          const retryJob = await storage.updateVideoGenerationJob(job.jobId, {
            status: 'pending',
            retryCount: (job.retryCount || 0) + 1,
            errorMessage: genError.message || 'Generation failed, will retry',
          });
          this.notifyJobUpdate(retryJob);
          console.log(`[VideoWorker] Job ${job.jobId} will retry (attempt ${(job.retryCount || 0) + 1}/${job.maxRetries})`);
        } else {
          const failedJob = await storage.updateVideoGenerationJob(job.jobId, {
            status: 'failed',
            completedAt: new Date(),
            progress: 0,
            errorMessage: genError.message || 'Video generation failed after max retries',
          });
          this.notifyJobUpdate(failedJob);
          console.log(`[VideoWorker] Job ${job.jobId} failed permanently`);
        }
        
        return;
      }

      if (videoUrl) {
        const completedJob = await storage.updateVideoGenerationJob(job.jobId, {
          status: 'succeeded',
          completedAt: new Date(),
          progress: 100,
          videoUrl,
        });
        this.notifyJobUpdate(completedJob);
        console.log(`[VideoWorker] Job ${job.jobId} completed successfully: ${videoUrl}`);
      } else {
        const failedJob = await storage.updateVideoGenerationJob(job.jobId, {
          status: 'failed',
          completedAt: new Date(),
          progress: 0,
          errorMessage: 'No video URL returned from generation',
        });
        this.notifyJobUpdate(failedJob);
        console.log(`[VideoWorker] Job ${job.jobId} failed - no video URL returned`);
      }

    } catch (error: any) {
      console.error(`[VideoWorker] Error processing job ${job.jobId}:`, error);
      
      try {
        const failedJob = await storage.updateVideoGenerationJob(job.jobId, {
          status: 'failed',
          completedAt: new Date(),
          progress: 0,
          errorMessage: error.message || 'Unknown error during job processing',
        });
        this.notifyJobUpdate(failedJob);
      } catch (updateError) {
        console.error(`[VideoWorker] Failed to update job status:`, updateError);
      }
    } finally {
      this.processingJobIds.delete(job.jobId);
    }
  }

  async cancelJob(jobId: string): Promise<VideoGenerationJob | undefined> {
    const job = await storage.getVideoGenerationJob(jobId);
    if (!job) {
      return undefined;
    }

    if (job.status === 'pending') {
      const cancelledJob = await storage.updateVideoGenerationJob(jobId, {
        status: 'cancelled',
        completedAt: new Date(),
      });
      this.notifyJobUpdate(cancelledJob);
      return cancelledJob;
    }

    return job;
  }
}

export const videoGenerationWorker = new VideoGenerationWorker();
