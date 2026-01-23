import { db } from '../db';
import { eq, and, or, sql, desc, isNotNull } from 'drizzle-orm';
import { 
  inventoryItems, 
  marketplaceSyncJobs,
  bigcommerceProductMappings,
  bigcommerceInventorySyncConfig
} from '@shared/schema';
import { BigCommerceIntegration } from '../integrations/bigcommerce';
import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface SyncResult {
  success: boolean;
  totalItems: number;
  processedItems: number;
  successCount: number;
  errorCount: number;
  errors: string[];
  skippedNoMapping: number;
}

interface InventoryUpdate {
  sku: string;
  productId: number;
  variantId?: number;
  cloverQuantity: number;
  adjustedQuantity: number;
  productName: string;
}

export class BigCommerceInventorySyncService {
  private bigcommerce: BigCommerceIntegration;
  private scheduledJob: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.bigcommerce = new BigCommerceIntegration();
  }

  async getSyncConfig() {
    const configs = await db.select().from(bigcommerceInventorySyncConfig).limit(1);
    return configs[0] || null;
  }

  async createDefaultConfig(createdBy?: string) {
    const existing = await this.getSyncConfig();
    if (existing) return existing;

    const [config] = await db.insert(bigcommerceInventorySyncConfig).values({
      name: 'Watertown → BigCommerce Sync',
      sourceMerchantId: 'QGFXZQXYG8M31',
      sourceLocationName: 'Watertown Retail',
      channelId: 1,
      percentageAllocation: 80,
      minimumStock: 0,
      syncEnabled: false,
      syncTimeLocal: '20:00',
      timezone: 'America/Chicago',
      alertOnFailure: true,
      alertInApp: true,
      createdBy: createdBy || null,
    }).returning();

    return config;
  }

  async updateConfig(updates: Partial<typeof bigcommerceInventorySyncConfig.$inferInsert>) {
    const config = await this.getSyncConfig();
    if (!config) {
      throw new Error('No sync configuration found');
    }

    const [updated] = await db.update(bigcommerceInventorySyncConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bigcommerceInventorySyncConfig.id, config.id))
      .returning();

    return updated;
  }

  async getProductMappings() {
    return db.select().from(bigcommerceProductMappings).where(eq(bigcommerceProductMappings.isActive, true));
  }

  async addProductMapping(mapping: {
    sku: string;
    bigcommerceProductId: number;
    bigcommerceVariantId?: number;
    productName?: string;
    inventoryItemId?: number;
  }) {
    const [result] = await db.insert(bigcommerceProductMappings)
      .values(mapping)
      .onConflictDoUpdate({
        target: bigcommerceProductMappings.sku,
        set: {
          bigcommerceProductId: mapping.bigcommerceProductId,
          bigcommerceVariantId: mapping.bigcommerceVariantId,
          productName: mapping.productName,
          inventoryItemId: mapping.inventoryItemId,
          updatedAt: new Date(),
        }
      })
      .returning();
    return result;
  }

  async updateMappingCloverSku(mappingId: number, cloverSku: string | null) {
    const [result] = await db.update(bigcommerceProductMappings)
      .set({ 
        cloverSku: cloverSku || null,
        updatedAt: new Date() 
      })
      .where(eq(bigcommerceProductMappings.id, mappingId))
      .returning();
    return result;
  }

  async getAllMappingsWithCloverInfo(merchantId: string) {
    // Get all BigCommerce mappings with their linked Clover item info
    const mappings = await db.select({
      id: bigcommerceProductMappings.id,
      sku: bigcommerceProductMappings.sku,
      cloverSku: bigcommerceProductMappings.cloverSku,
      bigcommerceProductId: bigcommerceProductMappings.bigcommerceProductId,
      bigcommerceVariantId: bigcommerceProductMappings.bigcommerceVariantId,
      productName: bigcommerceProductMappings.productName,
      isActive: bigcommerceProductMappings.isActive,
    })
    .from(bigcommerceProductMappings)
    .where(eq(bigcommerceProductMappings.isActive, true))
    .orderBy(bigcommerceProductMappings.productName);
    
    // Get Clover items for lookup
    const cloverItems = await db.select({
      sku: inventoryItems.sku,
      itemName: inventoryItems.itemName,
      quantityOnHand: inventoryItems.quantityOnHand,
    })
    .from(inventoryItems)
    .where(and(
      eq(inventoryItems.cloverMerchantId, merchantId),
      eq(inventoryItems.isActive, true),
      isNotNull(inventoryItems.sku)
    ));
    
    const cloverBySku = new Map(cloverItems.map(i => [i.sku, i]));
    
    // Enrich mappings with Clover item info
    return mappings.map(m => {
      const linkedSku = m.cloverSku || m.sku;
      const cloverItem = cloverBySku.get(linkedSku);
      return {
        ...m,
        cloverItemName: cloverItem?.itemName || null,
        cloverQuantity: cloverItem ? Math.floor(parseFloat(cloverItem.quantityOnHand?.toString() || '0')) : null,
        isLinked: !!cloverItem,
      };
    });
  }

  async searchCloverItems(merchantId: string, query: string) {
    const items = await db.select({
      sku: inventoryItems.sku,
      itemName: inventoryItems.itemName,
      quantityOnHand: inventoryItems.quantityOnHand,
    })
    .from(inventoryItems)
    .where(and(
      eq(inventoryItems.cloverMerchantId, merchantId),
      eq(inventoryItems.isActive, true),
      isNotNull(inventoryItems.sku),
      or(
        sql`${inventoryItems.itemName} ILIKE ${'%' + query + '%'}`,
        sql`${inventoryItems.sku} ILIKE ${'%' + query + '%'}`
      )
    ))
    .limit(20);
    
    return items;
  }

  async importMappingsFromBigCommerce() {
    console.log('📦 [BC Sync] Importing product mappings from BigCommerce...');
    
    const products = await this.bigcommerce.getProducts();
    let imported = 0;
    let skipped = 0;

    for (const product of products) {
      // Get all variants for this product (BigCommerce tracks inventory on variants)
      const variants = await this.bigcommerce.getProductVariants(product.id);
      
      if (variants.length === 0) {
        // No variants - use product-level SKU if available
        if (product.sku) {
          await this.addProductMapping({
            sku: product.sku,
            bigcommerceProductId: product.id,
            productName: product.name,
          });
          imported++;
          console.log(`📦 [BC Sync] Mapped: ${product.sku} → Product ${product.id} (no variants)`);
        } else {
          skipped++;
        }
      } else if (variants.length === 1) {
        // Single variant - use variant SKU if available, fallback to product SKU
        const variant = variants[0];
        const sku = variant.sku || product.sku;
        if (sku) {
          await this.addProductMapping({
            sku: sku,
            bigcommerceProductId: product.id,
            bigcommerceVariantId: variant.id,
            productName: product.name,
          });
          imported++;
          console.log(`📦 [BC Sync] Mapped: ${sku} → Product ${product.id}, Variant ${variant.id}`);
        } else {
          skipped++;
        }
      } else {
        // Multiple variants - import EACH variant with its own SKU
        for (const variant of variants) {
          if (variant.sku) {
            await this.addProductMapping({
              sku: variant.sku,
              bigcommerceProductId: product.id,
              bigcommerceVariantId: variant.id,
              productName: `${product.name} (${variant.sku})`,
            });
            imported++;
            console.log(`📦 [BC Sync] Mapped variant: ${variant.sku} → Product ${product.id}, Variant ${variant.id}`);
          } else {
            skipped++;
          }
        }
      }
    }

    console.log(`✅ [BC Sync] Imported ${imported} mappings, skipped ${skipped} (no SKU)`);
    return { imported, skipped };
  }

  async getWatertownInventory(merchantId: string) {
    const items = await db.select()
      .from(inventoryItems)
      .where(and(
        eq(inventoryItems.cloverMerchantId, merchantId),
        eq(inventoryItems.isActive, true),
        isNotNull(inventoryItems.sku)
      ));

    return items;
  }

  async buildInventoryUpdates(
    inventory: typeof inventoryItems.$inferSelect[],
    mappings: typeof bigcommerceProductMappings.$inferSelect[],
    percentageAllocation: number,
    minimumStock: number
  ): Promise<{ updates: InventoryUpdate[]; unmapped: string[] }> {
    // Build lookup maps: by BigCommerce SKU and by Clover SKU (for manual overrides)
    // Note: Multiple BC variants can share the same Clover SKU (e.g., Shipping vs Store Pickup)
    const mappingByBcSku = new Map(mappings.map(m => [m.sku, m]));
    const mappingsByCloverSku = new Map<string, (typeof mappings[0])[]>();
    
    // Build Clover SKU lookup for mappings with manual overrides
    // Store as arrays since multiple BC variants can share one Clover inventory item
    for (const m of mappings) {
      if (m.cloverSku) {
        const existing = mappingsByCloverSku.get(m.cloverSku) || [];
        existing.push(m);
        mappingsByCloverSku.set(m.cloverSku, existing);
      }
    }
    
    const updates: InventoryUpdate[] = [];
    const unmapped: string[] = [];
    const processedMappings = new Set<number>(); // Track which mappings we've used

    for (const item of inventory) {
      if (!item.sku) continue;

      const cloverQty = Math.floor(parseFloat(item.quantityOnHand?.toString() || '0'));
      
      if (cloverQty < minimumStock) {
        continue;
      }

      const adjustedQty = Math.floor(cloverQty * (percentageAllocation / 100));

      // First check if this Clover SKU is manually mapped to BigCommerce variant(s)
      const cloverMappings = mappingsByCloverSku.get(item.sku);
      
      if (cloverMappings && cloverMappings.length > 0) {
        // Create updates for ALL BigCommerce variants that share this Clover inventory
        for (const mapping of cloverMappings) {
          if (processedMappings.has(mapping.id)) continue;
          
          updates.push({
            sku: mapping.sku, // Use BC SKU for the update
            productId: mapping.bigcommerceProductId,
            variantId: mapping.bigcommerceVariantId || undefined,
            cloverQuantity: cloverQty,
            adjustedQuantity: adjustedQty,
            productName: `${item.itemName} → ${mapping.productName}`,
          });
          
          processedMappings.add(mapping.id);
          console.log(`📦 [BC Sync] Mapped Clover ${item.sku} (qty:${cloverQty}) → BC ${mapping.sku} (adjusted:${adjustedQty})`);
        }
        continue;
      }
      
      // Fallback to BigCommerce SKU match (SKUs match between systems)
      const bcMapping = mappingByBcSku.get(item.sku);
      
      if (!bcMapping) {
        unmapped.push(item.sku);
        continue;
      }
      
      if (processedMappings.has(bcMapping.id)) {
        continue;
      }

      updates.push({
        sku: item.sku,
        productId: bcMapping.bigcommerceProductId,
        variantId: bcMapping.bigcommerceVariantId || undefined,
        cloverQuantity: cloverQty,
        adjustedQuantity: adjustedQty,
        productName: item.itemName,
      });
      
      processedMappings.add(bcMapping.id);
    }

    return { updates, unmapped };
  }

  async performSync(triggeredBy?: string, testItemIds?: number[]): Promise<SyncResult> {
    const config = await this.getSyncConfig();
    if (!config) {
      throw new Error('No sync configuration found. Please configure the sync first.');
    }

    console.log(`📦 [BC Sync] Starting inventory sync from ${config.sourceLocationName}...`);

    const job = await db.insert(marketplaceSyncJobs).values({
      channelId: config.channelId,
      jobType: 'inventory_export',
      status: 'running',
      triggeredBy: triggeredBy || null,
      startedAt: new Date(),
    }).returning();

    const jobId = job[0].id;

    try {
      let inventory = await this.getWatertownInventory(config.sourceMerchantId);
      
      if (testItemIds && testItemIds.length > 0) {
        inventory = inventory.filter(item => testItemIds.includes(item.id));
        console.log(`🧪 [BC Sync] Test mode: syncing ${inventory.length} items`);
      }

      const mappings = await this.getProductMappings();
      const { updates, unmapped } = await this.buildInventoryUpdates(
        inventory,
        mappings,
        config.percentageAllocation,
        config.minimumStock || 0
      );

      console.log(`📦 [BC Sync] Found ${updates.length} items to sync, ${unmapped.length} unmapped`);

      await db.update(marketplaceSyncJobs)
        .set({ totalItems: updates.length })
        .where(eq(marketplaceSyncJobs.id, jobId));

      const errors: string[] = [];
      let successCount = 0;
      let errorCount = 0;

      // Rate limiting: BigCommerce allows ~150 requests per 30 seconds
      // Adding 250ms delay between calls to stay safely under the limit
      const DELAY_BETWEEN_CALLS_MS = 250;
      const MAX_RETRIES = 3;
      const INITIAL_RETRY_DELAY_MS = 2000;

      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      const updateWithRetry = async (update: InventoryUpdate, retryCount = 0): Promise<boolean> => {
        try {
          if (update.variantId) {
            await this.bigcommerce.updateVariantInventory(
              update.productId,
              update.variantId,
              update.adjustedQuantity
            );
          } else {
            await this.bigcommerce.updateProductInventory(
              update.productId,
              update.adjustedQuantity
            );
          }
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Check for rate limit error (429)
          if (errorMessage.includes('429') && retryCount < MAX_RETRIES) {
            const backoffDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
            console.log(`⏳ [BC Sync] Rate limited on ${update.sku}, waiting ${backoffDelay}ms before retry ${retryCount + 1}/${MAX_RETRIES}`);
            await delay(backoffDelay);
            return updateWithRetry(update, retryCount + 1);
          }
          
          throw error;
        }
      };

      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        try {
          const success = await updateWithRetry(update);
          if (success) {
            successCount++;
            await db.update(bigcommerceProductMappings)
              .set({ lastSyncedAt: new Date() })
              .where(eq(bigcommerceProductMappings.sku, update.sku));
          }
          
          // Add delay between calls to prevent rate limiting
          if (i < updates.length - 1) {
            await delay(DELAY_BETWEEN_CALLS_MS);
          }
        } catch (error) {
          errorCount++;
          const errorMsg = `${update.sku}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          console.error(`❌ [BC Sync] Error updating ${update.sku}:`, error);
        }
      }

      const status = errorCount === 0 ? 'completed' : (successCount > 0 ? 'partial' : 'failed');

      await db.update(marketplaceSyncJobs)
        .set({
          status,
          processedItems: successCount + errorCount,
          successCount,
          errorCount,
          completedAt: new Date(),
          results: { updates: updates.length, unmapped: unmapped.length },
          errors: errors.length > 0 ? errors : null,
          updatedAt: new Date(),
        })
        .where(eq(marketplaceSyncJobs.id, jobId));

      await db.update(bigcommerceInventorySyncConfig)
        .set({
          lastSyncAt: new Date(),
          lastSyncStatus: status,
          lastSyncJobId: jobId,
          updatedAt: new Date(),
        })
        .where(eq(bigcommerceInventorySyncConfig.id, config.id));

      const result: SyncResult = {
        success: status !== 'failed',
        totalItems: updates.length,
        processedItems: successCount + errorCount,
        successCount,
        errorCount,
        errors,
        skippedNoMapping: unmapped.length,
      };

      if (status === 'failed' && config.alertOnFailure) {
        await this.sendFailureAlert(config, result);
      }

      console.log(`✅ [BC Sync] Sync completed: ${successCount} success, ${errorCount} errors`);
      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      await db.update(marketplaceSyncJobs)
        .set({
          status: 'failed',
          completedAt: new Date(),
          errors: [errorMsg],
          updatedAt: new Date(),
        })
        .where(eq(marketplaceSyncJobs.id, jobId));

      await db.update(bigcommerceInventorySyncConfig)
        .set({
          lastSyncAt: new Date(),
          lastSyncStatus: 'failed',
          lastSyncJobId: jobId,
          updatedAt: new Date(),
        })
        .where(eq(bigcommerceInventorySyncConfig.id, config.id));

      if (config.alertOnFailure) {
        await this.sendFailureAlert(config, {
          success: false,
          totalItems: 0,
          processedItems: 0,
          successCount: 0,
          errorCount: 1,
          errors: [errorMsg],
          skippedNoMapping: 0,
        });
      }

      throw error;
    }
  }

  async sendFailureAlert(
    config: typeof bigcommerceInventorySyncConfig.$inferSelect, 
    result: SyncResult
  ) {
    console.log('🚨 [BC Sync] Sending failure alert...');

    if (config.alertEmail && process.env.SENDGRID_API_KEY) {
      try {
        await sgMail.send({
          to: config.alertEmail,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@pinehillfarm.co',
          subject: `⚠️ BigCommerce Inventory Sync Failed - ${config.sourceLocationName}`,
          html: `
            <h2>BigCommerce Inventory Sync Alert</h2>
            <p>The scheduled inventory sync from <strong>${config.sourceLocationName}</strong> to BigCommerce has failed.</p>
            <h3>Summary:</h3>
            <ul>
              <li>Total items: ${result.totalItems}</li>
              <li>Successful: ${result.successCount}</li>
              <li>Failed: ${result.errorCount}</li>
            </ul>
            ${result.errors.length > 0 ? `
              <h3>Errors:</h3>
              <ul>
                ${result.errors.slice(0, 10).map(e => `<li>${e}</li>`).join('')}
                ${result.errors.length > 10 ? `<li>... and ${result.errors.length - 10} more</li>` : ''}
              </ul>
            ` : ''}
            <p>Please check the admin dashboard for more details.</p>
          `,
        });
        console.log('✅ [BC Sync] Email alert sent');
      } catch (error) {
        console.error('❌ [BC Sync] Failed to send email alert:', error);
      }
    }
  }

  async getSyncHistory(limit: number = 20) {
    const jobs = await db.select()
      .from(marketplaceSyncJobs)
      .where(eq(marketplaceSyncJobs.jobType, 'inventory_export'))
      .orderBy(desc(marketplaceSyncJobs.createdAt))
      .limit(limit);

    return jobs;
  }

  startScheduledSync() {
    if (this.isRunning) {
      console.log('📦 [BC Sync] Scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log('📦 [BC Sync] Starting scheduled sync service...');

    const checkAndSync = async () => {
      try {
        const config = await this.getSyncConfig();
        if (!config?.syncEnabled) return;

        const now = new Date();
        const timezone = config.timezone || 'America/Chicago';
        const [targetHours, targetMinutes] = (config.syncTimeLocal || '20:00').split(':').map(Number);
        
        // Get current time in the configured timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          minute: 'numeric',
          hour12: false
        });
        const parts = formatter.formatToParts(now);
        const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
        
        console.log(`📦 [BC Sync] Checking: Current time ${currentHour}:${String(currentMinute).padStart(2, '0')} ${timezone}, target ${targetHours}:${String(targetMinutes).padStart(2, '0')}`);

        if (currentHour === targetHours && currentMinute >= targetMinutes && currentMinute < targetMinutes + 5) {
          console.log('📦 [BC Sync] Scheduled sync time reached, starting sync...');
          await this.performSync();
          
          const nextSync = new Date();
          nextSync.setDate(nextSync.getDate() + 1);
          nextSync.setHours(targetHours, targetMinutes, 0, 0);
          
          await this.updateConfig({ nextScheduledSync: nextSync });
        }
      } catch (error) {
        console.error('❌ [BC Sync] Scheduled sync error:', error);
      }
    };

    this.scheduledJob = setInterval(checkAndSync, 5 * 60 * 1000);

    checkAndSync();
  }

  stopScheduledSync() {
    if (this.scheduledJob) {
      clearInterval(this.scheduledJob);
      this.scheduledJob = null;
    }
    this.isRunning = false;
    console.log('📦 [BC Sync] Scheduler stopped');
  }
}

export const bigcommerceInventorySyncService = new BigCommerceInventorySyncService();
