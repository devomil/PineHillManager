import { storage } from '../storage';
import { CloverIntegration } from '../integrations/clover';

class InventorySyncScheduler {
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private isSyncing: boolean = false;
  private intervalMinutes: number = 15;
  private lastSyncTime: Date | null = null;

  constructor() {
    this.intervalMinutes = parseInt(process.env.INVENTORY_SYNC_INTERVAL_MINUTES || '15');
  }

  start(): void {
    if (this.isRunning) {
      console.log('📦 Inventory sync scheduler already running');
      return;
    }

    this.isRunning = true;
    const intervalMs = this.intervalMinutes * 60 * 1000;
    console.log(`📦 Starting inventory sync scheduler (every ${this.intervalMinutes} minutes)`);

    // Run initial sync after 30 seconds to allow server to fully start
    setTimeout(() => {
      this.performSync();
    }, 30000);

    // Schedule recurring syncs
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, intervalMs);

    console.log(`⏰ Inventory sync scheduled every ${this.intervalMinutes} minutes`);
  }

  stop(): void {
    if (!this.isRunning) {
      console.log('📦 Inventory sync scheduler is not running');
      return;
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.isRunning = false;
    console.log('🛑 Inventory sync scheduler stopped');
  }

  async performSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('⏭️ Skipping inventory sync - previous sync still in progress');
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      console.log('📦 Starting automated inventory sync...');
      const allCloverConfigs = await storage.getAllCloverConfigs();
      const activeConfigs = allCloverConfigs.filter(config => config.isActive);

      if (activeConfigs.length === 0) {
        console.log('⚠️ No active Clover configurations found for inventory sync');
        return;
      }

      console.log(`📍 Syncing inventory for ${activeConfigs.length} Clover locations`);

      let totalSuccess = 0;
      let totalErrors = 0;

      for (const config of activeConfigs) {
        try {
          console.log(`🔄 Syncing inventory for ${config.merchantName}...`);
          const cloverIntegration = new CloverIntegration(config);
          await cloverIntegration.syncInventoryItems();
          
          totalSuccess++;
          console.log(`✅ Inventory sync completed for ${config.merchantName}`);
        } catch (error) {
          totalErrors++;
          console.error(`❌ Inventory sync failed for ${config.merchantName}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      this.lastSyncTime = new Date();
      console.log(`📦 Inventory sync completed: ${totalSuccess} successful, ${totalErrors} errors in ${Math.round(duration / 1000)}s`);

    } catch (error) {
      console.error('❌ Inventory sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  async triggerManualSync(): Promise<{ success: boolean; message: string }> {
    if (this.isSyncing) {
      return { success: false, message: 'Inventory sync already in progress' };
    }

    try {
      await this.performSync();
      return { success: true, message: 'Manual inventory sync completed successfully' };
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to trigger manual sync: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isSyncing: this.isSyncing,
      intervalMinutes: this.intervalMinutes,
      lastSyncTime: this.lastSyncTime,
      nextSyncTime: this.lastSyncTime && this.isRunning 
        ? new Date(this.lastSyncTime.getTime() + this.intervalMinutes * 60 * 1000)
        : null
    };
  }
}

export const inventorySyncScheduler = new InventorySyncScheduler();
export const startInventorySyncScheduler = () => inventorySyncScheduler.start();
export const stopInventorySyncScheduler = () => inventorySyncScheduler.stop();
