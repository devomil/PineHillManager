import { storage } from '../storage';
import { aiVideoService } from './ai-video-service';
import { nanoid } from 'nanoid';
import type { VideoGenerationJob } from '@shared/schema';
import { createLogger } from '../utils/logger';

const log = createLogger('VideoWorker');

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
        log.error(' Error in job update callback:', error);
      }
    }
  }

  async createJob(request: VideoGenerationRequest): Promise<VideoGenerationJob> {
    const jobId = `vj_${nanoid(16)}`;
    
    log.debug(` Creating job ${jobId} for scene ${request.sceneId}`);
    
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
    
    log.debug(` Job ${jobId} created successfully`);
    
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
      log.debug('Worker already running');
      return;
    }

    log.debug(`🎬 [VideoWorker] Starting video generation worker (interval: ${intervalMs}ms)`);

    this.workerInterval = setInterval(async () => {
      await this.processNextJob();
    }, intervalMs);

    storage.recoverStuckVideoGenerationJobs(10).then(recovered => {
      if (recovered > 0) {
        log.debug(` Recovered ${recovered} stuck jobs`);
      }
    }).catch(error => {
      log.error(' Error recovering stuck jobs:', error);
    });
  }

  stopWorker() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
      log.debug('Worker stopped');
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
      log.debug(` Processing job ${job.jobId} for scene ${job.sceneId}`);

      await this.processJob(job);

    } catch (error) {
      log.error(' Error in worker loop:', error);
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

      log.debug(` Starting video generation for job ${job.jobId}`);
      log.debug(` Provider: ${job.provider}, Duration: ${job.duration}s, Aspect: ${job.aspectRatio}`);

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

        // Log which provider actually fulfilled the request
        const actualProvider = result.provider || provider;
        log.debug(` Job ${job.jobId} fulfilled by provider: ${actualProvider}`);

        if (result.success && result.videoUrl) {
          videoUrl = result.videoUrl;
        } else if (result.success && result.s3Url) {
          videoUrl = result.s3Url;
        }

        // Update job with actual provider used (for tracking/debugging)
        const progressJob2 = await storage.updateVideoGenerationJob(job.jobId, { 
          progress: 90,
          provider: actualProvider,
        });
        this.notifyJobUpdate(progressJob2);

      } catch (genError: any) {
        log.error(`Video generation error for job ${job.jobId}:`, genError);
        
        if (job.retryCount !== null && job.maxRetries !== null && job.retryCount < job.maxRetries) {
          const retryJob = await storage.updateVideoGenerationJob(job.jobId, {
            status: 'pending',
            retryCount: (job.retryCount || 0) + 1,
            errorMessage: genError.message || 'Generation failed, will retry',
          });
          this.notifyJobUpdate(retryJob);
          log.debug(` Job ${job.jobId} will retry (attempt ${(job.retryCount || 0) + 1}/${job.maxRetries})`);
        } else {
          const failedJob = await storage.updateVideoGenerationJob(job.jobId, {
            status: 'failed',
            completedAt: new Date(),
            progress: 0,
            errorMessage: genError.message || 'Video generation failed after max retries',
          });
          this.notifyJobUpdate(failedJob);
          log.debug(` Job ${job.jobId} failed permanently`);
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
        log.debug(` Job ${job.jobId} completed successfully: ${videoUrl}`);
      } else {
        const failedJob = await storage.updateVideoGenerationJob(job.jobId, {
          status: 'failed',
          completedAt: new Date(),
          progress: 0,
          errorMessage: 'No video URL returned from generation',
        });
        this.notifyJobUpdate(failedJob);
        log.debug(` Job ${job.jobId} failed - no video URL returned`);
      }

    } catch (error: any) {
      log.error(`Error processing job ${job.jobId}:`, error);
      
      try {
        const failedJob = await storage.updateVideoGenerationJob(job.jobId, {
          status: 'failed',
          completedAt: new Date(),
          progress: 0,
          errorMessage: error.message || 'Unknown error during job processing',
        });
        this.notifyJobUpdate(failedJob);
      } catch (updateError) {
        log.error(`Failed to update job status:`, updateError);
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
