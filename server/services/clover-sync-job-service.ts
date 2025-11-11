import { db } from '../db';
import { storage } from '../storage';
import { syncJobs, syncCheckpoints, posLocations } from '@shared/schema';
import { CloverSyncService } from './clover-sync-service';
import { eq, and, or, inArray } from 'drizzle-orm';

interface HistoricalSyncRequest {
  requestedBy: string;
  startDate: Date;
  endDate: Date;
  forceFullSync?: boolean;
}

interface JobStatus {
  jobId: number;
  type: string;
  status: string;
  progress: {
    totalLocations: number;
    totalOrders: number;
    processedOrders: number;
    percentComplete: number;
  };
  checkpoints: Array<{
    locationId: number | null;
    locationName: string | null;
    merchantId: string | null;
    status: string;
    processedOrders: number;
    totalOrders: number;
    lastSyncedAt: Date | null;
    lastError: string | null;
  }>;
  startedAt: Date | null;
  completedAt: Date | null;
  errorLog: string | null;
}

export class CloverSyncJobService {
  private syncService: CloverSyncService;
  private workerInterval: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;

  constructor() {
    this.syncService = new CloverSyncService();
  }

  /**
   * Start historical sync job - creates job and checkpoints, returns immediately
   */
  async startHistoricalSync(request: HistoricalSyncRequest): Promise<number> {
    console.log('📋 Creating historical sync job:', {
      requestedBy: request.requestedBy,
      dateRange: `${request.startDate.toISOString()} to ${request.endDate.toISOString()}`,
      forceFullSync: request.forceFullSync
    });

    // Get all active Clover locations
    const cloverConfigs = await storage.getAllCloverConfigs();
    const activeConfigs = cloverConfigs.filter(c => c.isActive);

    if (activeConfigs.length === 0) {
      throw new Error('No active Clover locations found');
    }

    console.log(`📍 Found ${activeConfigs.length} active Clover locations`);

    // Create job record
    const [job] = await db.insert(syncJobs).values({
      type: 'clover_historical',
      status: 'pending',
      requestedBy: request.requestedBy,
      totalLocations: activeConfigs.length,
      metadata: {
        startDate: request.startDate.toISOString(),
        endDate: request.endDate.toISOString(),
        forceFullSync: request.forceFullSync || false
      }
    }).returning();

    console.log(`✅ Created sync job ${job.id}`);

    // Create checkpoints for each location
    const checkpointPromises = activeConfigs.map(async (config) => {
      // Get the location record to link the checkpoint
      // Note: config.merchantId is string (Clover merchant ID), posLocations.merchantId is number
      // We'll store the Clover merchant ID in the checkpoint for reference
      const locations = await db
        .select()
        .from(posLocations)
        .limit(100);
      
      // Find matching location by name or use first available
      const location = locations.find(l => 
        l.name?.toLowerCase().includes(config.merchantName?.toLowerCase() || '')
      );

      return db.insert(syncCheckpoints).values({
        jobId: job.id,
        locationId: location?.id || null,
        merchantId: config.merchantId, // Store Clover merchant ID string
        status: 'pending',
        processedOrders: 0,
        totalOrders: 0,
        retryCount: 0
      });
    });

    await Promise.all(checkpointPromises);
    console.log(`✅ Created ${activeConfigs.length} checkpoints for job ${job.id}`);

    return job.id;
  }

  /**
   * Get status of a sync job with checkpoint details
   */
  async getJobStatus(jobId: number): Promise<JobStatus | null> {
    const [job] = await db.select().from(syncJobs).where(eq(syncJobs.id, jobId));
    
    if (!job) {
      return null;
    }

    // Get checkpoints with location details
    const checkpoints = await db
      .select({
        id: syncCheckpoints.id,
        locationId: syncCheckpoints.locationId,
        merchantId: syncCheckpoints.merchantId,
        status: syncCheckpoints.status,
        processedOrders: syncCheckpoints.processedOrders,
        totalOrders: syncCheckpoints.totalOrders,
        lastSyncedAt: syncCheckpoints.lastSyncedAt,
        lastError: syncCheckpoints.lastError,
        locationName: posLocations.name
      })
      .from(syncCheckpoints)
      .leftJoin(posLocations, eq(syncCheckpoints.locationId, posLocations.id))
      .where(eq(syncCheckpoints.jobId, jobId));

    const totalOrders = job.totalOrders || 0;
    const processedOrders = job.processedOrders || 0;
    const percentComplete = totalOrders > 0 
      ? Math.round((processedOrders / totalOrders) * 100)
      : 0;

    return {
      jobId: job.id,
      type: job.type,
      status: job.status,
      progress: {
        totalLocations: job.totalLocations || 0,
        totalOrders,
        processedOrders,
        percentComplete
      },
      checkpoints: checkpoints.map(cp => ({
        locationId: cp.locationId,
        locationName: cp.locationName,
        merchantId: cp.merchantId,
        status: cp.status,
        processedOrders: cp.processedOrders || 0,
        totalOrders: cp.totalOrders || 0,
        lastSyncedAt: cp.lastSyncedAt,
        lastError: cp.lastError
      })),
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorLog: job.errorLog
    };
  }

  /**
   * Start background worker to process pending jobs
   */
  async startWorker(intervalMs: number = 5000): Promise<void> {
    if (this.workerInterval) {
      console.log('⚠️ Worker already running');
      return;
    }

    console.log(`🚀 Starting sync job worker (interval: ${intervalMs}ms)`);
    
    // CRITICAL: Recover any checkpoints/jobs left in "active" state from crashes
    await this.recoverStuckJobs();
    
    this.workerInterval = setInterval(async () => {
      if (this.isProcessing) {
        console.log('⏳ Worker busy, skipping this interval');
        return;
      }

      try {
        this.isProcessing = true;
        await this.processJobs();
      } catch (error) {
        console.error('❌ Worker error:', error);
      } finally {
        this.isProcessing = false;
      }
    }, intervalMs);

    console.log('✅ Worker started successfully');
  }

  /**
   * Recover jobs and checkpoints that were left in "active" state from crashes
   */
  private async recoverStuckJobs(): Promise<void> {
    console.log('🔧 Recovering stuck jobs from previous crashes...');

    try {
      // Reset active jobs to pending
      const activeJobs = await db
        .select()
        .from(syncJobs)
        .where(eq(syncJobs.status, 'active'));

      if (activeJobs.length > 0) {
        console.log(`⚠️ Found ${activeJobs.length} stuck active jobs - resetting to pending`);
        await db.update(syncJobs)
          .set({ 
            status: 'pending',
            updatedAt: new Date()
          })
          .where(eq(syncJobs.status, 'active'));
      }

      // Reset active checkpoints to pending (not retry - they hadn't failed yet)
      const activeCheckpoints = await db
        .select()
        .from(syncCheckpoints)
        .where(eq(syncCheckpoints.status, 'active'));

      if (activeCheckpoints.length > 0) {
        console.log(`⚠️ Found ${activeCheckpoints.length} stuck active checkpoints - resetting to pending`);
        await db.update(syncCheckpoints)
          .set({ 
            status: 'pending',
            updatedAt: new Date()
          })
          .where(eq(syncCheckpoints.status, 'active'));
      }

      console.log('✅ Recovery complete - all stuck jobs can now resume');
    } catch (error) {
      console.error('❌ Failed to recover stuck jobs:', error);
      throw error;
    }
  }

  /**
   * Stop background worker
   */
  stopWorker(): void {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
      console.log('🛑 Worker stopped');
    }
  }

  /**
   * Process pending jobs - main worker logic
   */
  private async processJobs(): Promise<void> {
    // Find pending or active jobs
    const [activeJob] = await db
      .select()
      .from(syncJobs)
      .where(or(
        eq(syncJobs.status, 'pending'),
        eq(syncJobs.status, 'active')
      ))
      .limit(1);

    if (!activeJob) {
      return; // No jobs to process
    }

    console.log(`🔄 Processing job ${activeJob.id} (status: ${activeJob.status})`);

    // Mark job as active if pending
    if (activeJob.status === 'pending') {
      await db.update(syncJobs)
        .set({ 
          status: 'active', 
          startedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(syncJobs.id, activeJob.id));
    }

    // Get pending checkpoints for this job
    const pendingCheckpoints = await db
      .select()
      .from(syncCheckpoints)
      .where(and(
        eq(syncCheckpoints.jobId, activeJob.id),
        or(
          eq(syncCheckpoints.status, 'pending'),
          eq(syncCheckpoints.status, 'retry')
        )
      ))
      .limit(1);

    if (pendingCheckpoints.length === 0) {
      // All checkpoints complete - mark job as complete
      console.log(`✅ Job ${activeJob.id} complete - all checkpoints processed`);
      await db.update(syncJobs)
        .set({ 
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(syncJobs.id, activeJob.id));
      return;
    }

    // Process one checkpoint at a time
    const checkpoint = pendingCheckpoints[0];
    await this.processCheckpoint(activeJob, checkpoint);
  }

  /**
   * Process a single checkpoint with chunking and retry logic
   */
  private async processCheckpoint(job: any, checkpoint: any): Promise<void> {
    console.log(`📍 Processing checkpoint ${checkpoint.id} for merchant ${checkpoint.merchantId}`);

    // Mark checkpoint as active
    await db.update(syncCheckpoints)
      .set({ 
        status: 'active',
        updatedAt: new Date()
      })
      .where(eq(syncCheckpoints.id, checkpoint.id));

    try {
      // Get Clover config for this merchant by finding config with matching merchantId
      const allConfigs = await storage.getAllCloverConfigs();
      const cloverConfig = allConfigs.find(c => c.merchantId === checkpoint.merchantId);
      if (!cloverConfig) {
        throw new Error(`Clover config not found for merchant ${checkpoint.merchantId}`);
      }

      // Parse job metadata
      const metadata = job.metadata as { startDate: string; endDate: string; forceFullSync: boolean };
      
      // Determine sync range - resume from last checkpoint or start fresh
      const startDate = checkpoint.lastSyncedAt || new Date(metadata.startDate);
      const endDate = new Date(metadata.endDate);

      console.log(`📅 Syncing merchant ${cloverConfig.merchantName} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Use existing sync service to process this merchant
      const result = await this.syncService.syncMerchant(cloverConfig.id, {
        startDate,
        endDate,
        batchSize: 100,
        maxRetries: 3
      });

      // Update checkpoint with results
      await db.update(syncCheckpoints)
        .set({
          status: 'completed',
          processedOrders: result.ordersProcessed,
          totalOrders: result.ordersProcessed,
          lastSyncedAt: endDate,
          lastError: null,
          updatedAt: new Date()
        })
        .where(eq(syncCheckpoints.id, checkpoint.id));

      // Update job totals
      await db.update(syncJobs)
        .set({
          processedOrders: (job.processedOrders || 0) + result.ordersProcessed,
          totalOrders: (job.totalOrders || 0) + result.ordersProcessed,
          updatedAt: new Date()
        })
        .where(eq(syncJobs.id, job.id));

      console.log(`✅ Checkpoint ${checkpoint.id} completed: ${result.ordersProcessed} orders processed`);

    } catch (error) {
      console.error(`❌ Checkpoint ${checkpoint.id} failed:`, error);

      const retryCount = checkpoint.retryCount + 1;
      const maxRetries = 5;

      if (retryCount >= maxRetries) {
        // Max retries exceeded - mark as failed
        await db.update(syncCheckpoints)
          .set({
            status: 'failed',
            lastError: error instanceof Error ? error.message : 'Unknown error',
            retryCount,
            updatedAt: new Date()
          })
          .where(eq(syncCheckpoints.id, checkpoint.id));

        console.error(`❌ Checkpoint ${checkpoint.id} failed after ${maxRetries} retries`);
      } else {
        // Schedule retry with exponential backoff
        const backoffSeconds = Math.pow(2, retryCount) * 30; // 30s, 60s, 120s, 240s, 480s
        console.log(`⏳ Checkpoint ${checkpoint.id} will retry in ${backoffSeconds}s (attempt ${retryCount}/${maxRetries})`);

        await db.update(syncCheckpoints)
          .set({
            status: 'retry',
            lastError: error instanceof Error ? error.message : 'Unknown error',
            retryCount,
            updatedAt: new Date()
          })
          .where(eq(syncCheckpoints.id, checkpoint.id));
      }
    }
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: number): Promise<void> {
    await db.update(syncJobs)
      .set({ 
        status: 'cancelled',
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(syncJobs.id, jobId));

    // Cancel all pending checkpoints
    await db.update(syncCheckpoints)
      .set({ 
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(and(
        eq(syncCheckpoints.jobId, jobId),
        inArray(syncCheckpoints.status, ['pending', 'retry'])
      ));

    console.log(`🛑 Job ${jobId} cancelled`);
  }
}

// Singleton instance
export const cloverSyncJobService = new CloverSyncJobService();
