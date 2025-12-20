import { db } from '../db';
import { sql } from 'drizzle-orm';
import { BigCommerceIntegration } from '../integrations/bigcommerce';
import { AmazonIntegration } from '../integrations/amazon';

class MarketplaceSyncScheduler {
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private isSyncing: boolean = false;
  private intervalMinutes: number = 15;
  private lastSyncTime: Date | null = null;
  private lastSyncResults: Map<number, { success: boolean; ordersProcessed: number; error?: string }> = new Map();

  constructor() {
    this.intervalMinutes = parseInt(process.env.MARKETPLACE_SYNC_INTERVAL_MINUTES || '15');
  }

  start(): void {
    if (this.isRunning) {
      console.log('🛒 Marketplace sync scheduler already running');
      return;
    }

    this.isRunning = true;
    const intervalMs = this.intervalMinutes * 60 * 1000;
    console.log(`🛒 Starting marketplace sync scheduler (every ${this.intervalMinutes} minutes)`);

    setTimeout(() => {
      this.performSync();
    }, 60000);

    this.syncInterval = setInterval(() => {
      this.performSync();
    }, intervalMs);

    console.log(`⏰ Marketplace sync scheduled every ${this.intervalMinutes} minutes`);
  }

  stop(): void {
    if (!this.isRunning) {
      console.log('🛒 Marketplace sync scheduler is not running');
      return;
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.isRunning = false;
    console.log('🛑 Marketplace sync scheduler stopped');
  }

  async performSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('⏭️ Skipping marketplace sync - previous sync still in progress');
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      console.log('🛒 Starting automated marketplace order sync...');
      
      const channelsResult = await db.execute(sql`
        SELECT * FROM marketplace_channels WHERE is_active = true
      `);
      
      const activeChannels = channelsResult.rows as any[];

      if (activeChannels.length === 0) {
        console.log('⚠️ No active marketplace channels found for sync');
        return;
      }

      console.log(`📍 Syncing orders for ${activeChannels.length} marketplace channels`);

      let totalSuccess = 0;
      let totalErrors = 0;
      let totalOrdersProcessed = 0;

      for (const channel of activeChannels) {
        try {
          console.log(`🔄 Syncing orders for ${channel.name} (${channel.type})...`);
          const result = await this.syncChannel(channel);
          
          this.lastSyncResults.set(channel.id, {
            success: true,
            ordersProcessed: result.ordersProcessed
          });
          
          totalSuccess++;
          totalOrdersProcessed += result.ordersProcessed;
          console.log(`✅ Sync completed for ${channel.name}: ${result.ordersProcessed} orders processed`);
        } catch (error) {
          totalErrors++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.lastSyncResults.set(channel.id, {
            success: false,
            ordersProcessed: 0,
            error: errorMessage
          });
          console.error(`❌ Sync failed for ${channel.name}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      this.lastSyncTime = new Date();
      console.log(`🛒 Marketplace sync completed: ${totalSuccess} channels successful, ${totalErrors} errors, ${totalOrdersProcessed} orders in ${Math.round(duration / 1000)}s`);

    } catch (error) {
      console.error('❌ Marketplace sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncChannel(channel: any): Promise<{ ordersProcessed: number }> {
    let ordersProcessed = 0;

    if (channel.type === 'bigcommerce') {
      const bigCommerce = new BigCommerceIntegration();
      const orders = await bigCommerce.getOrders(channel);
      
      for (const order of orders) {
        await this.upsertOrder(channel, order, 'bigcommerce');
        ordersProcessed++;
      }
    } else if (channel.type === 'amazon') {
      const amazon = new AmazonIntegration();
      const orders = await amazon.getOrders(channel);
      
      for (const order of orders) {
        await this.upsertOrder(channel, order, 'amazon');
        ordersProcessed++;
      }
    }

    await db.execute(sql`
      UPDATE marketplace_channels 
      SET last_sync_at = NOW() 
      WHERE id = ${channel.id}
    `);

    return { ordersProcessed };
  }

  private async upsertOrder(channel: any, order: any, type: string): Promise<void> {
    const existingOrder = await db.execute(sql`
      SELECT id FROM marketplace_orders 
      WHERE channel_id = ${channel.id} AND external_order_id = ${order.externalOrderId}
    `);

    if (existingOrder.rows.length > 0) {
      await db.execute(sql`
        UPDATE marketplace_orders SET
          status = ${order.status},
          payment_status = ${order.paymentStatus || 'unknown'},
          total_amount = ${order.totalAmount},
          currency = ${order.currency || 'USD'},
          updated_at = NOW()
        WHERE channel_id = ${channel.id} AND external_order_id = ${order.externalOrderId}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO marketplace_orders (
          channel_id, external_order_id, external_order_number, status, payment_status,
          customer_name, customer_email, shipping_address, billing_address,
          total_amount, subtotal, tax_amount, shipping_amount, discount_amount,
          currency, shipping_method, order_placed_at, created_at, updated_at
        ) VALUES (
          ${channel.id}, ${order.externalOrderId}, ${order.externalOrderNumber || order.externalOrderId},
          ${order.status}, ${order.paymentStatus || 'pending'},
          ${order.customerName}, ${order.customerEmail},
          ${JSON.stringify(order.shippingAddress || {})}, ${JSON.stringify(order.billingAddress || {})},
          ${order.totalAmount}, ${order.subtotal || order.totalAmount}, ${order.taxAmount || 0},
          ${order.shippingAmount || 0}, ${order.discountAmount || 0},
          ${order.currency || 'USD'}, ${order.shippingMethod || 'Standard'},
          ${order.orderPlacedAt || new Date().toISOString()}, NOW(), NOW()
        )
      `);

      if (order.items && order.items.length > 0) {
        const newOrderResult = await db.execute(sql`
          SELECT id FROM marketplace_orders 
          WHERE channel_id = ${channel.id} AND external_order_id = ${order.externalOrderId}
        `);
        
        if (newOrderResult.rows.length > 0) {
          const orderId = (newOrderResult.rows[0] as any).id;
          
          for (const item of order.items) {
            await db.execute(sql`
              INSERT INTO marketplace_order_items (
                order_id, external_item_id, sku, name, quantity, unit_price, total_price,
                created_at, updated_at
              ) VALUES (
                ${orderId}, ${item.externalItemId || item.sku}, ${item.sku}, ${item.name},
                ${item.quantity}, ${item.unitPrice}, ${item.totalPrice || item.unitPrice * item.quantity},
                NOW(), NOW()
              )
            `);
          }
        }
      }
    }
  }

  async triggerManualSync(channelId?: number): Promise<{ success: boolean; message: string }> {
    if (this.isSyncing) {
      return { success: false, message: 'Marketplace sync already in progress' };
    }

    try {
      if (channelId) {
        const channelResult = await db.execute(sql`
          SELECT * FROM marketplace_channels WHERE id = ${channelId}
        `);
        
        if (channelResult.rows.length === 0) {
          return { success: false, message: 'Channel not found' };
        }
        
        const channel = channelResult.rows[0];
        this.isSyncing = true;
        const result = await this.syncChannel(channel);
        this.isSyncing = false;
        this.lastSyncTime = new Date();
        
        return { success: true, message: `Synced ${result.ordersProcessed} orders from ${(channel as any).name}` };
      } else {
        await this.performSync();
        return { success: true, message: 'Manual marketplace sync completed successfully' };
      }
    } catch (error) {
      this.isSyncing = false;
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
        : null,
      channelResults: Object.fromEntries(this.lastSyncResults)
    };
  }
}

export const marketplaceSyncScheduler = new MarketplaceSyncScheduler();
export const startMarketplaceSyncScheduler = () => marketplaceSyncScheduler.start();
export const stopMarketplaceSyncScheduler = () => marketplaceSyncScheduler.stop();
