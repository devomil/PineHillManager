import { cloverSyncService } from './clover-sync-service';
import { storage } from '../storage';

interface SchedulerConfig {
  enabled: boolean;
  incrementalIntervalMinutes: number;
  fullSyncHour: number; // 24-hour format (0-23)
  businessStartHour: number;
  businessEndHour: number;
  timezone: string;
  skipWeekends: boolean;
}

class SyncScheduler {
  private incrementalInterval: NodeJS.Timeout | null = null;
  private dailyCheckInterval: NodeJS.Timeout | null = null;
  private lastFullSyncDate: string | null = null;
  private isRunning: boolean = false;
  private config: SchedulerConfig;

  constructor() {
    // Default configuration - can be overridden by environment variables
    this.config = {
      enabled: process.env.AUTO_SYNC_ENABLED?.toLowerCase() === 'true' || false,
      incrementalIntervalMinutes: parseInt(process.env.INCREMENTAL_SYNC_INTERVAL_MINUTES || '15'),
      fullSyncHour: parseInt(process.env.FULL_SYNC_HOUR || '3'), // 3 AM
      businessStartHour: parseInt(process.env.BUSINESS_START_HOUR || '6'), // 6 AM
      businessEndHour: parseInt(process.env.BUSINESS_END_HOUR || '22'), // 10 PM
      timezone: process.env.BUSINESS_TIMEZONE || 'America/Chicago',
      skipWeekends: process.env.SKIP_WEEKEND_SYNC?.toLowerCase() === 'true' || false
    };
  }

  /**
   * Start the sync scheduler with incremental and daily sync timers
   */
  start(): void {
    if (this.isRunning) {
      console.log('🔄 Sync scheduler already running');
      return;
    }

    if (!this.config.enabled) {
      console.log('🔄 Sync scheduler is disabled via configuration');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting automatic sync scheduler');
    console.log(`📋 Config: Incremental every ${this.config.incrementalIntervalMinutes}min, Full sync at ${this.config.fullSyncHour}:00, Business hours: ${this.config.businessStartHour}:00-${this.config.businessEndHour}:00 ${this.config.timezone}`);

    // Schedule incremental syncs
    this.scheduleIncrementalSyncs();
    
    // Schedule daily sync checks (check every hour for full sync time)
    this.scheduleDailySyncChecks();

    // Run an initial sync check
    this.performScheduledSync('startup');
  }

  /**
   * Stop the sync scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('🔄 Sync scheduler is not running');
      return;
    }

    if (this.incrementalInterval) {
      clearInterval(this.incrementalInterval);
      this.incrementalInterval = null;
    }

    if (this.dailyCheckInterval) {
      clearInterval(this.dailyCheckInterval);
      this.dailyCheckInterval = null;
    }

    this.isRunning = false;
    console.log('🛑 Sync scheduler stopped');
  }

  /**
   * Get current scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      lastFullSyncDate: this.lastFullSyncDate,
      cloverSyncRunning: cloverSyncService.isRunningSync(),
      nextIncrementalSync: this.incrementalInterval ? new Date(Date.now() + this.config.incrementalIntervalMinutes * 60 * 1000) : null,
      businessHoursActive: this.isBusinessHours()
    };
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(updates: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (this.isRunning) {
      console.log('🔧 Restarting scheduler with new configuration');
      this.stop();
      this.start();
    }
  }

  /**
   * Manually trigger a sync (respects running sync check)
   */
  async triggerManualSync(type: 'incremental' | 'full' = 'incremental'): Promise<{ success: boolean; message: string }> {
    if (cloverSyncService.isRunningSync()) {
      return { success: false, message: 'Sync already in progress' };
    }

    try {
      await this.performScheduledSync('manual', type === 'full');
      return { success: true, message: `Manual ${type} sync triggered successfully` };
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to trigger manual sync: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Schedule incremental syncs at regular intervals
   */
  private scheduleIncrementalSyncs(): void {
    const intervalMs = this.config.incrementalIntervalMinutes * 60 * 1000;
    
    this.incrementalInterval = setInterval(async () => {
      await this.performScheduledSync('incremental');
    }, intervalMs);

    console.log(`⏰ Scheduled incremental syncs every ${this.config.incrementalIntervalMinutes} minutes`);
  }

  /**
   * Schedule daily sync checks (runs every hour to check for full sync time)
   */
  private scheduleDailySyncChecks(): void {
    // Check every hour for full sync time
    this.dailyCheckInterval = setInterval(async () => {
      await this.checkForFullSync();
    }, 60 * 60 * 1000); // Every hour

    console.log(`⏰ Scheduled daily sync checks (full sync at ${this.config.fullSyncHour}:00)`);
  }

  /**
   * Check if it's time for a full daily sync
   */
  private async checkForFullSync(): Promise<void> {
    const now = new Date();
    const currentHour = parseInt(now.toLocaleString('en-US', { 
      hour: '2-digit', 
      hour12: false,
      timeZone: this.config.timezone 
    }));
    
    const today = now.toLocaleDateString('en-US', { timeZone: this.config.timezone });

    // Check if it's the right hour and we haven't done a full sync today
    if (currentHour === this.config.fullSyncHour && this.lastFullSyncDate !== today) {
      console.log(`🌅 Daily full sync time reached (${this.config.fullSyncHour}:00 ${this.config.timezone})`);
      await this.performScheduledSync('daily', true);
      this.lastFullSyncDate = today;
    }
  }

  /**
   * Check if current time is within business hours
   */
  private isBusinessHours(): boolean {
    const now = new Date();
    const currentHour = parseInt(now.toLocaleString('en-US', { 
      hour: '2-digit', 
      hour12: false,
      timeZone: this.config.timezone 
    }));
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Check weekend skip
    if (this.config.skipWeekends && (currentDay === 0 || currentDay === 6)) {
      return false;
    }

    // Check business hours
    return currentHour >= this.config.businessStartHour && currentHour < this.config.businessEndHour;
  }

  /**
   * Perform the actual sync with business rules
   */
  private async performScheduledSync(trigger: 'startup' | 'incremental' | 'daily' | 'manual', isFullSync = false): Promise<void> {
    try {
      // Skip if sync is already running
      if (cloverSyncService.isRunningSync()) {
        console.log(`⏭️ Skipping ${trigger} sync - another sync is already in progress`);
        return;
      }

      // For incremental syncs, check business hours
      if (trigger === 'incremental' && !this.isBusinessHours()) {
        console.log(`🕐 Skipping ${trigger} sync - outside business hours (${this.config.businessStartHour}:00-${this.config.businessEndHour}:00 ${this.config.timezone})`);
        return;
      }

      const syncType = isFullSync ? 'full' : 'incremental';
      const currentTime = new Date().toLocaleString('en-US', { 
        timeZone: this.config.timezone,
        dateStyle: 'short',
        timeStyle: 'medium'
      });

      console.log(`🔄 Starting scheduled ${syncType} sync (${trigger}) at ${currentTime} ${this.config.timezone}`);

      // Perform the sync
      const options = {
        forceFullSync: isFullSync,
        batchSize: 100,
        maxRetries: 3
      };

      const results = await cloverSyncService.syncAllMerchants(options);
      
      // Log summary
      const totalOrders = results.reduce((sum, r) => sum + r.ordersProcessed, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
      const avgDuration = results.length > 0 ? results.reduce((sum, r) => sum + r.duration, 0) / results.length : 0;

      console.log(`✅ Scheduled ${syncType} sync completed: ${totalOrders} orders processed across ${results.length} merchants in ${Math.round(avgDuration)}ms avg`);
      
      if (totalErrors > 0) {
        console.warn(`⚠️ Sync completed with ${totalErrors} errors - check individual merchant sync logs`);
      }

      // Store sync statistics for analytics
      await this.storeSyncStats(trigger, syncType, {
        merchantCount: results.length,
        ordersProcessed: totalOrders,
        errorCount: totalErrors,
        avgDuration: avgDuration,
        timestamp: new Date()
      });

    } catch (error) {
      console.error(`❌ Scheduled sync failed (${trigger}):`, error);
      
      // Store error for analytics
      await this.storeSyncStats(trigger, isFullSync ? 'full' : 'incremental', {
        merchantCount: 0,
        ordersProcessed: 0,
        errorCount: 1,
        avgDuration: 0,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Store sync statistics for monitoring and analytics
   */
  private async storeSyncStats(trigger: string, syncType: string, stats: any): Promise<void> {
    try {
      // You can extend the schema to store sync statistics if needed
      // For now, we'll just log detailed stats for monitoring
      console.log(`📊 Sync Stats [${trigger}/${syncType}]:`, {
        merchants: stats.merchantCount,
        orders: stats.ordersProcessed,
        errors: stats.errorCount,
        duration: `${Math.round(stats.avgDuration)}ms`,
        timestamp: stats.timestamp.toISOString()
      });
    } catch (error) {
      console.error('Failed to store sync statistics:', error);
    }
  }
}

// Create and export the singleton instance
export const syncScheduler = new SyncScheduler();

// Export start/stop functions for easy integration
export const startSyncScheduler = () => syncScheduler.start();
export const stopSyncScheduler = () => syncScheduler.stop();