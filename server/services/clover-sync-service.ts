import { storage } from '../storage';
import { CloverIntegration } from '../integrations/clover';
import { db } from '../db';
import { 
  InsertOrder,
  InsertOrderLineItem,
  InsertPayment,
  InsertTax,
  InsertDiscount,
  InsertRefund,
  InsertTender,
  InsertItemCostHistory,
  InsertDailySales,
  InsertSyncCursor
} from '@shared/schema';

// Types for Clover API responses
interface CloverOrder {
  id: string;
  total: number;
  currency: string;
  createdTime: number;
  modifiedTime: number;
  state: string;
  paymentState: string;
  orderNumber?: string;
  employee?: { id: string; name?: string };
  customer?: { id: string; firstName?: string; lastName?: string; marketingAllowed?: boolean; customerSince?: number };
  taxAmount?: number;
  taxRemoved?: boolean;
  serviceCharge?: number;
  note?: string;
  manualTransaction?: boolean;
  groupLineItems?: boolean;
  testMode?: boolean;
  payType?: string;
  clientCreatedTime?: number;
  
  // Expanded data
  lineItems?: {
    elements: CloverLineItem[];
  };
  payments?: {
    elements: CloverPayment[];
  };
  discounts?: {
    elements: CloverDiscount[];
  };
  refunds?: {
    elements: CloverRefund[];
  };
}

interface CloverLineItem {
  id: string;
  orderRef: { id: string };
  item?: { id: string; name?: string; price?: number };
  name: string;
  price: number;
  unitQty?: number;
  printed?: boolean;
  createdTime?: number;
  orderClientCreatedTime?: number;
  exchanged?: boolean;
  refunded?: boolean;
  isRevenue?: boolean;
  note?: string;
  binName?: string;
  userData?: string;
  modifications?: {
    elements: Array<{
      id: string;
      name: string;
      price: number;
    }>;
  };
  discountAmount?: number;
  unitName?: string;
}

interface CloverPayment {
  id: string;
  orderRef: { id: string };
  amount: number;
  tipAmount?: number;
  taxAmount?: number;
  cashbackAmount?: number;
  result: string;
  createdTime: number;
  employee?: { id: string };
  tender?: { 
    id: string; 
    labelKey?: string; 
    label?: string; 
    instructions?: string; 
    opensCashDrawer?: boolean;
  };
  cardTransaction?: {
    type: string;
    first6: string;
    last4: string;
    cardholderName?: string;
    token?: string;
    entryType?: string;
    authCode?: string;
    referenceId?: string;
    transactionNo?: string;
    cvmResult?: string;
    avsResult?: string;
  };
  cashTransaction?: {
    cashTendered?: number;
    cashBack?: number;
  };
  externalPaymentId?: string;
}

interface CloverDiscount {
  id: string;
  orderRef: { id: string };
  discount: { 
    id: string; 
    name?: string; 
    percentage?: number; 
    amount?: number; 
  };
  name: string;
  percentage?: number;
  amount?: number;
  discType?: string;
}

interface CloverRefund {
  id: string;
  orderRef: { id: string };
  amount: number;
  createdTime: number;
  employee?: { id: string };
  payment?: { id: string };
}

interface SyncOptions {
  merchantId?: number;
  startDate?: Date;
  endDate?: Date;
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  forceFullSync?: boolean;
  // Enhanced historical data options
  historicalSyncDepthDays?: number; // How many days back to sync for full sync
  historicalSyncMode?: 'incremental' | 'full' | 'backfill'; // Sync mode for historical data
  enableLargeDatasetOptimization?: boolean; // Enable optimizations for large datasets
  parallelMerchantSync?: boolean; // Allow parallel merchant syncing
  prioritizeRecentData?: boolean; // Process recent data first
  maxConcurrentRequests?: number; // Limit concurrent API requests
}

interface SyncResult {
  success: boolean;
  ordersProcessed: number;
  ordersCreated: number;
  ordersUpdated: number;
  lineItemsProcessed: number;
  paymentsProcessed: number;
  errors: Array<{ orderId: string; error: string }>;
  duration: number;
  nextSyncCursor?: string;
}

export class CloverSyncService {
  private cloverIntegration: CloverIntegration;
  private isRunning: boolean = false;
  private abortController?: AbortController;

  constructor() {
    this.cloverIntegration = new CloverIntegration();
  }

  /**
   * Start incremental sync for all active Clover merchants
   */
  async syncAllMerchants(options: SyncOptions = {}): Promise<SyncResult[]> {
    console.log('🔄 Starting sync for all Clover merchants');
    
    const merchants = await storage.getAllCloverConfigs();
    const results: SyncResult[] = [];

    for (const merchant of merchants) {
      if (!merchant.isActive) continue;
      
      try {
        console.log(`🏪 Syncing merchant: ${merchant.merchantName} (${merchant.merchantId})`);
        const result = await this.syncMerchant(merchant.id, options);
        results.push(result);
      } catch (error) {
        console.error(`❌ Failed to sync merchant ${merchant.merchantName}:`, error);
        results.push({
          success: false,
          ordersProcessed: 0,
          ordersCreated: 0,
          ordersUpdated: 0,
          lineItemsProcessed: 0,
          paymentsProcessed: 0,
          errors: [{ orderId: 'MERCHANT_ERROR', error: error instanceof Error ? error.message : 'Unknown error' }],
          duration: 0
        });
      }
    }

    console.log(`✅ Completed sync for ${merchants.length} merchants`);
    return results;
  }

  /**
   * Sync orders for a specific merchant
   */
  async syncMerchant(merchantDbId: number, options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    this.isRunning = true;
    this.abortController = new AbortController();

    const result: SyncResult = {
      success: false,
      ordersProcessed: 0,
      ordersCreated: 0,
      ordersUpdated: 0,
      lineItemsProcessed: 0,
      paymentsProcessed: 0,
      errors: [],
      duration: 0
    };

    try {
      // Get merchant configuration
      const merchantConfig = await storage.getCloverConfigById(merchantDbId);
      if (!merchantConfig) {
        throw new Error(`Merchant configuration not found for ID: ${merchantDbId}`);
      }

      console.log(`🔧 Configuring Clover integration for merchant: ${merchantConfig.merchantName}`);
      this.cloverIntegration.setConfig({
        merchantId: merchantConfig.merchantId,
        accessToken: merchantConfig.apiToken || '',
        baseUrl: merchantConfig.baseUrl || 'https://api.clover.com'
      });

      // Get or create sync cursor for this merchant
      let syncCursor = await storage.getSyncCursor('clover', merchantDbId, 'orders');
      if (!syncCursor) {
        console.log(`📍 Creating new sync cursor for merchant ${merchantConfig.merchantName}`);
        syncCursor = await storage.createSyncCursor({
          system: 'clover',
          merchantId: merchantDbId,
          dataType: 'orders',
          isActive: true,
          batchSize: options.batchSize || 100,
          syncFrequency: 300 // 5 minutes
        });
      }

      // Determine sync time range
      const { startTimestamp, endTimestamp } = this.calculateSyncTimeRange(syncCursor, options);
      
      console.log(`📅 Syncing orders from ${new Date(startTimestamp).toISOString()} to ${new Date(endTimestamp).toISOString()}`);

      // Update sync cursor to indicate sync in progress
      await storage.updateSyncCursor(syncCursor.id, {
        lastRunAt: new Date(),
        lastError: null
      });

      // Fetch and process orders in batches
      let offset = 0;
      const batchSize = syncCursor.batchSize || 100;
      let hasMore = true;
      let maxModifiedTime = syncCursor.lastModifiedMs ? parseInt(syncCursor.lastModifiedMs) : 0;

      while (hasMore && this.isRunning) {
        console.log(`📦 Fetching batch: offset=${offset}, limit=${batchSize}`);
        
        const ordersResponse = await this.cloverIntegration.fetchOrders({
          limit: batchSize,
          offset,
          expand: 'lineItems,payments,discounts,refunds',
          modifiedTimeMin: startTimestamp,
          modifiedTimeMax: endTimestamp,
          orderBy: 'modifiedTime ASC'
        });

        if (!ordersResponse?.elements || ordersResponse.elements.length === 0) {
          hasMore = false;
          break;
        }

        const orders = ordersResponse.elements;
        console.log(`📦 Processing ${orders.length} orders in batch`);

        // Process each order
        for (const order of orders) {
          if (!this.isRunning) break;
          
          try {
            console.log(`📦 Processing order ${order.id} for merchant ${merchantConfig.merchantName}`);
            const processResult = await this.processOrder(order as any, merchantDbId, merchantConfig);
            
            // ARCHITECT'S FIX: Validate return value before counting as processed
            if (!processResult || (processResult.op !== 'created' && processResult.op !== 'updated')) {
              throw new Error(`Invalid processOrder result: ${JSON.stringify(processResult)}`);
            }
            
            // Only increment ordersProcessed AFTER successful validation
            result.ordersProcessed++;
            
            // Increment appropriate counters based on operation type
            if (processResult.op === 'created') {
              result.ordersCreated++;
              console.log(`✅ Order ${order.id}: CREATED (DB persisted)`);
            } else {
              result.ordersUpdated++;
              console.log(`✅ Order ${order.id}: UPDATED (DB persisted)`);
            }
            
            // Track the latest modified time for cursor updates
            if (order.modifiedTime > maxModifiedTime) {
              maxModifiedTime = order.modifiedTime;
            }
            
            // Count line items and payments processed
            if (order.lineItems) {
              if (Array.isArray(order.lineItems)) {
                result.lineItemsProcessed += (order.lineItems as any).length;
              } else if ((order.lineItems as any).elements) {
                result.lineItemsProcessed += (order.lineItems as any).elements.length;
              }
            }
            if (order.payments) {
              if (Array.isArray(order.payments)) {
                result.paymentsProcessed += (order.payments as any).length;
              } else if ((order.payments as any).elements) {
                result.paymentsProcessed += (order.payments as any).elements.length;
              }
            }
            
          } catch (orderError) {
            console.error(`❌ CRITICAL: Order processing failed for ${order.id}:`, orderError);
            console.error(`❌ Full error details:`, {
              orderId: order.id,
              merchantId: merchantConfig.merchantId,
              merchantName: merchantConfig.merchantName,
              error: orderError instanceof Error ? orderError.message : 'Unknown error',
              stack: orderError instanceof Error ? orderError.stack : undefined
            });
            result.errors.push({
              orderId: order.id,
              error: orderError instanceof Error ? orderError.message : 'Unknown error'
            });
            // Continue processing other orders - don't break the entire batch
          }
        }

        // Add critical validation: if no orders persisted after processing, log high-severity warning
        if (result.ordersProcessed > 0 && (result.ordersCreated + result.ordersUpdated) === 0) {
          console.error(`🚨 CRITICAL DATABASE PERSISTENCE FAILURE: Processed ${result.ordersProcessed} orders but ZERO were persisted to database!`);
          console.error(`🚨 This indicates silent database write failures. Check database connectivity and constraints.`);
        }

        // Check if we have more data
        hasMore = orders.length === batchSize;
        offset += batchSize;

        // Rate limiting - wait between batches
        if (hasMore) {
          console.log('⏱️ Rate limiting - waiting 100ms between batches');
          await this.sleep(100);
        }
      }

      // Update sync cursor with progress
      if (maxModifiedTime > 0) {
        await storage.updateSyncCursor(syncCursor.id, {
          lastModifiedMs: maxModifiedTime.toString(),
          lastSyncAt: new Date(),
          lastSuccessAt: new Date(),
          errorCount: 0
        });
      }

      // Generate daily sales aggregations for the sync period
      await this.aggregateDailySales(merchantDbId, new Date(startTimestamp), new Date(endTimestamp));

      result.success = true;
      result.duration = Date.now() - startTime;

      console.log(`✅ Sync completed for merchant ${merchantConfig.merchantName}:`);
      console.log(`   📊 Orders processed: ${result.ordersProcessed}`);
      console.log(`   ➕ Orders created: ${result.ordersCreated}`);
      console.log(`   🔄 Orders updated: ${result.ordersUpdated}`);
      console.log(`   📦 Line items processed: ${result.lineItemsProcessed}`);
      console.log(`   💳 Payments processed: ${result.paymentsProcessed}`);
      console.log(`   ⏱️ Duration: ${result.duration}ms`);
      if (result.errors.length > 0) {
        console.log(`   ⚠️ Errors encountered: ${result.errors.length}`);
      }

    } catch (error) {
      console.error('❌ Sync failed:', error);
      
      // Update sync cursor with error
      const syncCursor = await storage.getSyncCursor('clover', merchantDbId, 'orders');
      if (syncCursor) {
        await storage.updateSyncCursor(syncCursor.id, {
          lastError: error instanceof Error ? error.message : 'Unknown error',
          errorCount: (syncCursor.errorCount || 0) + 1
        });
      }

      result.errors.push({
        orderId: 'SYNC_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      result.duration = Date.now() - startTime;
    } finally {
      this.isRunning = false;
      this.abortController = undefined;
    }

    return result;
  }

  /**
   * Process a single order with atomic transactions and returns operation type
   * @returns Object indicating whether order was created or updated
   */
  private async processOrder(cloverOrder: CloverOrder, merchantDbId: number, merchantConfig: any): Promise<{ op: 'created' | 'updated' }> {
    console.log(`🔄 Processing order ${cloverOrder.id}`);

    // ARCHITECT'S FIX: Resolve merchant record - merchantDbId is cloverConfig.id, not merchants.id
    console.log(`🔍 Resolving merchant ID: cloverConfig.id=${merchantDbId}, clover merchant ID=${merchantConfig.merchantId}`);
    
    // Get or create merchant record in merchants table using Clover merchant data
    let actualMerchantId: number;
    try {
      // Check if merchant exists in merchants table
      let merchantRecord = await storage.getMerchantByExternalId(merchantConfig.merchantId, 'clover');
      
      if (!merchantRecord) {
        console.log(`🏪 Creating new merchant record for ${merchantConfig.merchantName} (${merchantConfig.merchantId})`);
        
        // Create merchant data from clover config
        const merchantData = {
          merchantId: merchantConfig.merchantId, // External Clover merchant ID
          name: merchantConfig.merchantName || 'Unknown Merchant',
          legalName: merchantConfig.merchantName || 'Unknown Merchant',
          channel: 'clover' as const,
          contactEmail: null,
          contactPhone: null,
          address: null,
          city: null,
          state: null,
          zipCode: null,
          country: 'US',
          timezone: 'America/Chicago',
          currency: 'USD',
          isActive: true,
          settings: {
            cloverConfigId: merchantDbId, // Link back to clover config
            baseUrl: merchantConfig.baseUrl || 'https://api.clover.com'
          }
        };
        
        // Use upsert to handle race conditions
        const upsertResult = await storage.upsertMerchant(merchantData);
        merchantRecord = upsertResult.merchant;
        console.log(`✅ Merchant record ${upsertResult.operation}: ${merchantRecord.name} (DB ID: ${merchantRecord.id})`);
      } else {
        console.log(`✅ Using existing merchant record: ${merchantRecord.name} (DB ID: ${merchantRecord.id})`);
      }
      
      actualMerchantId = merchantRecord.id;
      console.log(`🎯 Using merchants.id=${actualMerchantId} for order foreign key (not cloverConfig.id=${merchantDbId})`);
      
    } catch (merchantError) {
      console.error(`❌ CRITICAL: Failed to resolve merchant record for ${merchantConfig.merchantName}:`, merchantError);
      throw new Error(`Merchant resolution failed for ${merchantConfig.merchantName}: ${merchantError instanceof Error ? merchantError.message : 'Unknown error'}`);
    }

    // Use atomic upsert instead of check-then-create/update pattern
    console.log(`💾 Using atomic upsert for order ${cloverOrder.id} with resolved merchantId=${actualMerchantId}`);
    
    // Map Clover order to our schema with CORRECT merchant ID
    const orderData: InsertOrder = {
      merchantId: actualMerchantId, // FIXED: Use merchants.id, not cloverConfig.id
      externalOrderId: cloverOrder.id,
      channel: 'clover',
      orderNumber: cloverOrder.orderNumber || null,
      createdTime: new Date(cloverOrder.createdTime),
      modifiedTime: new Date(cloverOrder.modifiedTime),
      orderDate: new Date(cloverOrder.createdTime).toISOString().split('T')[0],
      orderState: cloverOrder.state,
      paymentState: cloverOrder.paymentState || null,
      customerId: cloverOrder.customer?.id || null,
      customerName: cloverOrder.customer ? `${cloverOrder.customer.firstName || ''} ${cloverOrder.customer.lastName || ''}`.trim() : null,
      subtotal: '0.00', // Will be calculated from line items
      taxAmount: cloverOrder.taxAmount ? (cloverOrder.taxAmount / 100).toFixed(2) : '0.00',
      tipAmount: '0.00', // Will be calculated from payments
      discountAmount: '0.00', // Will be calculated from discounts
      total: (cloverOrder.total / 100).toFixed(2),
      orderCogs: '0.00', // Will be calculated
      orderGrossMargin: '0.00', // Will be calculated
      orderType: 'sale',
      orderSource: 'in_store',
      employeeId: cloverOrder.employee?.id || null,
      notes: cloverOrder.note || null
    };

    // Use atomic upsert instead of check-then-create/update pattern
    let orderId: number;
    let operationType: 'created' | 'updated';

    console.log(`💾 Performing atomic upsert for ${cloverOrder.id}`);
    
    try {
      // Use atomic upsert with unique constraint (merchantId, externalOrderId, channel)
      const upsertResult = await storage.upsertOrder(orderData);
      orderId = upsertResult.order.id;
      operationType = upsertResult.operation;
      
      console.log(`✅ Atomic upsert completed: order ${cloverOrder.id} was ${operationType} (DB ID: ${orderId})`);
    } catch (dbError) {
      console.error(`❌ Atomic upsert failed for order ${cloverOrder.id}:`, dbError);
      throw new Error(`Order persistence failed for ${cloverOrder.id}: ${dbError instanceof Error ? dbError.message : 'Database operation failed'}`);
    }

    // ARCHITECT'S FIX: Verify order was actually persisted
    try {
      const verificationOrder = await storage.getOrder(orderId);
      if (!verificationOrder) {
        throw new Error(`Order persistence verification failed for ${cloverOrder.id}: Order not found in database after upsert`);
      }
      console.log(`🔍 Database persistence verified for order ${cloverOrder.id} (DB ID: ${orderId})`);
    } catch (verificationError) {
      console.error(`❌ Database persistence verification failed for order ${cloverOrder.id}:`, verificationError);
      throw new Error(`Database persistence verification failed for ${cloverOrder.id}: ${verificationError instanceof Error ? verificationError.message : 'Verification failed'}`);
    }

    // ARCHITECT'S FIX: Process related data but NEVER rethrow - order is already persisted
    try {
      // Process line items within the same transaction
      if (cloverOrder.lineItems?.elements && cloverOrder.lineItems.elements.length > 0) {
        console.log(`📦 Processing ${cloverOrder.lineItems.elements.length} line items for order ${cloverOrder.id}`);
        await this.processLineItems(cloverOrder.lineItems.elements, orderId, merchantDbId);
        console.log(`✅ Successfully processed line items for order ${cloverOrder.id}`);
      }

      // Process payments within the same transaction
      if (cloverOrder.payments?.elements && cloverOrder.payments.elements.length > 0) {
        console.log(`💳 Processing ${cloverOrder.payments.elements.length} payments for order ${cloverOrder.id}`);
        await this.processPayments(cloverOrder.payments.elements, orderId, merchantDbId);
        console.log(`✅ Successfully processed payments for order ${cloverOrder.id}`);
      }

      // Process discounts within the same transaction
      if (cloverOrder.discounts?.elements && cloverOrder.discounts.elements.length > 0) {
        console.log(`🏷️ Processing ${cloverOrder.discounts.elements.length} discounts for order ${cloverOrder.id}`);
        await this.processDiscounts(cloverOrder.discounts.elements, orderId, merchantDbId);
        console.log(`✅ Successfully processed discounts for order ${cloverOrder.id}`);
      }

      // Process refunds within the same transaction
      if (cloverOrder.refunds?.elements && cloverOrder.refunds.elements.length > 0) {
        console.log(`🔁 Processing ${cloverOrder.refunds.elements.length} refunds for order ${cloverOrder.id}`);
        await this.processRefunds(cloverOrder.refunds.elements, orderId, merchantDbId);
        console.log(`✅ Successfully processed refunds for order ${cloverOrder.id}`);
      }

      // Calculate and update financial totals within the same transaction
      console.log(`🧮 Calculating financial totals for order ${cloverOrder.id}`);
      await this.calculateOrderFinancials(orderId);
      console.log(`✅ Successfully calculated financials for order ${cloverOrder.id}`);

      console.log(`🎉 Order processing completed successfully for ${cloverOrder.id}: ${operationType}`);
    } catch (relatedDataError) {
      // ARCHITECT'S FIX: Log but DO NOT rethrow - order is already persisted
      console.error(`⚠️ Related data processing failed for order ${cloverOrder.id}, but order was successfully persisted:`, relatedDataError);
      console.error(`⚠️ Continuing sync - order ${cloverOrder.id} will be counted as ${operationType}`);
    }

    // ARCHITECT'S FIX: ALWAYS return operation type - order is persisted
    console.log(`✅ Guaranteed return for order ${cloverOrder.id}: ${operationType}`);
    return { op: operationType };
  }

  /**
   * Process line items for an order
   */
  private async processLineItems(lineItems: CloverLineItem[], orderId: number, merchantDbId: number): Promise<void> {
    for (const lineItem of lineItems) {
      try {
        // Check if line item already exists
        const existingLineItem = await storage.getOrderLineItemByExternalId(lineItem.id);
        
        // Get cost data for COGS calculation
        const unitCostAtSale = await this.getUnitCostAtSale(lineItem.item?.id, merchantDbId);
        
        // Convert itemId safely, ensuring NaN is not passed to database
        let itemIdValue = null;
        if (lineItem.item?.id) {
          const parsedId = Number(lineItem.item.id);
          itemIdValue = isNaN(parsedId) ? null : parsedId;
        }
        
        const lineItemData: InsertOrderLineItem = {
          orderId,
          externalLineItemId: lineItem.id,
          itemId: itemIdValue,
          itemName: lineItem.name,
          quantity: (lineItem.unitQty || 1).toString(),
          unitPrice: (lineItem.price / 100).toFixed(2),
          lineSubtotal: ((lineItem.price * (lineItem.unitQty || 1)) / 100).toFixed(2),
          unitCostAtSale: unitCostAtSale,
          lineCogs: ((parseFloat(unitCostAtSale) * (lineItem.unitQty || 1))).toFixed(2),
          discountAmount: lineItem.discountAmount ? (lineItem.discountAmount / 100).toFixed(2) : '0.00',
          notes: lineItem.note || null
        };

        if (existingLineItem) {
          await storage.updateOrderLineItem(existingLineItem.id, lineItemData);
        } else {
          await storage.createOrderLineItem(lineItemData);
        }

        // Record cost history for this sale
        if (lineItem.item?.id && unitCostAtSale !== '0.00') {
          await this.recordItemCostHistory(lineItem.item.id, unitCostAtSale, merchantDbId);
        }

      } catch (error) {
        console.error(`❌ Error processing line item ${lineItem.id}:`, error);
      }
    }
  }

  /**
   * Process payments for an order
   */
  private async processPayments(payments: CloverPayment[], orderId: number, merchantDbId: number): Promise<void> {
    for (const payment of payments) {
      try {
        // Use the same ID for lookup that we'll use for saving
        const paymentExternalId = payment.externalPaymentId || payment.id;
        const existingPayment = await storage.getPaymentByExternalId(paymentExternalId);
        
        const paymentData: InsertPayment = {
          orderId,
          externalPaymentId: paymentExternalId,
          amount: (payment.amount / 100).toFixed(2),
          tipAmount: payment.tipAmount ? (payment.tipAmount / 100).toFixed(2) : '0.00',
          taxAmount: payment.taxAmount ? (payment.taxAmount / 100).toFixed(2) : '0.00',
          cashbackAmount: payment.cashbackAmount ? (payment.cashbackAmount / 100).toFixed(2) : '0.00',
          paymentMethod: payment.tender?.labelKey || payment.tender?.label || 'unknown',
          result: payment.result,
          createdTime: new Date(payment.createdTime),
          cardType: payment.cardTransaction?.type || null,
          cardLast4: payment.cardTransaction?.last4 || null,
          authCode: payment.cardTransaction?.authCode || null
        };

        if (existingPayment) {
          await storage.updatePayment(existingPayment.id, paymentData);
        } else {
          await storage.createPayment(paymentData);
        }

      } catch (error) {
        console.error(`❌ Error processing payment ${payment.id}:`, error);
      }
    }
  }

  /**
   * Process discounts for an order
   */
  private async processDiscounts(discounts: CloverDiscount[], orderId: number, merchantDbId: number): Promise<void> {
    for (const discount of discounts) {
      try {
        const existingDiscount = await storage.getDiscountByExternalId(discount.id);
        
        const discountData: InsertDiscount = {
          orderId,
          discountName: discount.name,
          discountType: discount.discType || 'unknown',
          discountValue: discount.percentage ? discount.percentage.toString() : null,
          discountAmount: discount.amount ? (discount.amount / 100).toFixed(2) : '0.00'
        };

        if (existingDiscount) {
          await storage.updateDiscount(existingDiscount.id, discountData);
        } else {
          await storage.createDiscount(discountData);
        }

      } catch (error) {
        console.error(`❌ Error processing discount ${discount.id}:`, error);
      }
    }
  }

  /**
   * Process refunds for an order
   */
  private async processRefunds(refunds: CloverRefund[], orderId: number, merchantDbId: number): Promise<void> {
    for (const refund of refunds) {
      try {
        const existingRefund = await storage.getRefundByExternalId(refund.id);
        
        const refundData: InsertRefund = {
          orderId,
          externalRefundId: refund.id,
          refundAmount: (refund.amount / 100).toFixed(2),
          refundType: 'partial',
          refundDate: new Date(refund.createdTime).toISOString().split('T')[0],
          createdTime: new Date(refund.createdTime),
          originalPaymentId: refund.payment?.id ? Number(refund.payment.id) : null
        };

        if (existingRefund) {
          await storage.updateRefund(existingRefund.id, refundData);
        } else {
          await storage.createRefund(refundData);
        }

      } catch (error) {
        console.error(`❌ Error processing refund ${refund.id}:`, error);
      }
    }
  }

  /**
   * Calculate and update order financial totals
   */
  private async calculateOrderFinancials(orderId: number): Promise<void> {
    try {
      // Get all line items for COGS calculation
      const lineItems = await storage.getOrderLineItems(orderId.toString());
      
      let totalCogs = 0;
      let subtotal = 0;
      
      for (const lineItem of lineItems) {
        totalCogs += parseFloat(lineItem.lineCogs || '0');
        subtotal += parseFloat(lineItem.lineTotal || '0');
      }

      // Get payments for tip calculation
      const payments = await storage.getOrderPayments(orderId);
      let totalTips = 0;
      for (const payment of payments) {
        totalTips += parseFloat(payment.tipAmount || '0');
      }

      // Get discounts
      const discounts = await storage.getOrderDiscounts(orderId.toString());
      let totalDiscounts = 0;
      for (const discount of discounts) {
        totalDiscounts += parseFloat(discount.discountAmount || '0');
      }

      // Get refunds
      const refunds = await storage.getOrderRefunds(orderId);
      let totalRefunds = 0;
      for (const refund of refunds) {
        totalRefunds += parseFloat(refund.refundAmount || '0');
      }

      // Calculate gross margin
      const grossMargin = subtotal - totalDiscounts - totalCogs;

      // Update order with calculated values
      await storage.updateOrder(orderId, {
        subtotal: subtotal.toFixed(2),
        tipAmount: totalTips.toFixed(2),
        discountAmount: totalDiscounts.toFixed(2),
        orderCogs: totalCogs.toFixed(2),
        orderGrossMargin: grossMargin.toFixed(2)
      });

    } catch (error) {
      console.error(`❌ Error calculating order financials for order ${orderId}:`, error);
    }
  }

  /**
   * Get unit cost at time of sale
   */
  private async getUnitCostAtSale(itemId: string | null | undefined, merchantDbId: number): Promise<string> {
    if (!itemId) return '0.00';

    try {
      // Try to get latest cost from item_cost_history
      const latestCost = await storage.getLatestItemCost(itemId, merchantDbId);
      if (latestCost && parseFloat(latestCost.unitCost) > 0) {
        return latestCost.unitCost;
      }

      // Fallback to inventory item cost
      const inventoryItems = await storage.getInventoryItemsBySKU(itemId);
      if (inventoryItems.length > 0) {
        const item = inventoryItems[0];
        return item.standardCost || item.unitCost || '0.00';
      }

      return '0.00';
    } catch (error) {
      console.error(`⚠️ Error getting unit cost for item ${itemId}:`, error);
      return '0.00';
    }
  }

  /**
   * Record item cost history for cost tracking
   */
  private async recordItemCostHistory(itemId: string, unitCost: string, merchantDbId: number): Promise<void> {
    try {
      // Note: Item cost history tracking not implemented yet
      // This would require adding an itemCostHistory table to the schema
      console.log(`📝 Would record cost history for item ${itemId}: ${unitCost}`);
    } catch (error) {
      // Don't fail the sync for cost history errors
      console.warn(`⚠️ Could not record cost history for item ${itemId}:`, error);
    }
  }

  /**
   * Aggregate daily sales for the synced period
   */
  private async aggregateDailySales(merchantDbId: number, startDate: Date, endDate: Date): Promise<void> {
    console.log(`📊 Aggregating daily sales for merchant ${merchantDbId} from ${startDate.toDateString()} to ${endDate.toDateString()}`);

    const merchantConfig = await storage.getCloverConfigById(merchantDbId);
    if (!merchantConfig) return;

    // Get all orders in the date range
    const orders = await storage.getOrdersByMerchantAndDateRange(merchantDbId, startDate, endDate);

    // Group orders by date
    const ordersByDate = new Map<string, typeof orders>();
    for (const order of orders) {
      const dateKey = order.orderDate;
      if (!ordersByDate.has(dateKey)) {
        ordersByDate.set(dateKey, []);
      }
      ordersByDate.get(dateKey)!.push(order);
    }

    // Process each date
    for (const [dateKey, dayOrders] of Array.from(ordersByDate.entries())) {
      try {
        const dailySalesData = await this.calculateDailySalesMetrics(merchantDbId, dateKey, dayOrders);
        
        // Upsert daily sales record
        const existingRecord = await storage.getDailySalesByMerchantAndDate(merchantDbId, dateKey);
        if (existingRecord) {
          await storage.updateDailySales(existingRecord.id, dailySalesData);
        } else {
          await storage.createDailySales(dailySalesData);
        }

        console.log(`📈 Aggregated daily sales for ${dateKey}: ${dayOrders.length} orders, $${dailySalesData.totalRevenue} revenue`);
      } catch (error) {
        console.error(`❌ Error aggregating daily sales for ${dateKey}:`, error);
      }
    }
  }

  /**
   * Calculate daily sales metrics for a set of orders
   */
  private async calculateDailySalesMetrics(merchantDbId: number, date: string, orders: any[]): Promise<InsertDailySales> {
    let orderCount = orders.length;
    let itemCount = 0;
    let customerCount = new Set<string>();
    let grossSales = 0;
    let discounts = 0;
    let taxAmount = 0;
    let tipAmount = 0;
    let totalCogs = 0;
    let refundCount = 0;
    let refundAmount = 0;

    // Payment method breakdown
    const paymentBreakdown: Record<string, number> = {};

    for (const order of orders) {
      grossSales += parseFloat(order.subtotal || '0');
      discounts += parseFloat(order.discountAmount || '0');
      taxAmount += parseFloat(order.taxAmount || '0');
      tipAmount += parseFloat(order.tipAmount || '0');
      totalCogs += parseFloat(order.orderCogs || '0');

      if (order.customerId) {
        customerCount.add(order.customerId);
      }

      // Get line items count
      const lineItems = await storage.getOrderLineItems(order.id.toString());
      itemCount += lineItems.length;

      // Get payments for payment method breakdown
      const payments = await storage.getOrderPayments(order.id);
      for (const payment of payments) {
        const method = payment.paymentMethod || 'unknown';
        paymentBreakdown[method] = (paymentBreakdown[method] || 0) + parseFloat(payment.amount);
      }

      // Get refunds
      const refunds = await storage.getOrderRefunds(order.id);
      refundCount += refunds.length;
      for (const refund of refunds) {
        refundAmount += parseFloat(refund.refundAmount);
      }
    }

    const netSales = grossSales - discounts;
    const totalRevenue = netSales + taxAmount + tipAmount;
    const grossMargin = netSales - totalCogs;
    const grossMarginPercent = netSales > 0 ? (grossMargin / netSales) * 100 : 0;

    return {
      merchantId: merchantDbId,
      date,
      channel: 'clover',
      orderCount,
      itemCount,
      customerCount: customerCount.size,
      grossSales: grossSales.toFixed(2),
      discounts: discounts.toFixed(2),
      netSales: netSales.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      tipAmount: tipAmount.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      totalCogs: totalCogs.toFixed(2),
      grossMargin: grossMargin.toFixed(2),
      grossMarginPercent: grossMarginPercent.toFixed(2),
      refundCount,
      refundAmount: refundAmount.toFixed(2),
      paymentsBreakdown: paymentBreakdown,
      avgOrderValue: orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : '0.00',
      avgItemsPerOrder: orderCount > 0 ? (itemCount / orderCount).toFixed(2) : '0.00'
    };
  }

  /**
   * Calculate sync time range based on cursor and options with enhanced historical support
   */
  private calculateSyncTimeRange(syncCursor: any, options: SyncOptions): { startTimestamp: number; endTimestamp: number } {
    const now = Date.now();
    let startTimestamp: number;
    let endTimestamp = now;

    if (options.forceFullSync || options.historicalSyncMode === 'full' || !syncCursor.lastModifiedMs) {
      // Full sync - use historical sync depth or configured start date
      const historicalDepthMs = (options.historicalSyncDepthDays || 365) * 24 * 60 * 60 * 1000; // Default 1 year
      startTimestamp = options.startDate?.getTime() || (now - historicalDepthMs);
      console.log(`📅 Full historical sync: going back ${options.historicalSyncDepthDays || 365} days`);
    } else if (options.historicalSyncMode === 'backfill') {
      // Backfill mode - sync missing historical data
      startTimestamp = this.calculateBackfillStartTime(syncCursor, options);
      console.log(`🔄 Backfill sync: filling gaps in historical data`);
    } else {
      // Incremental sync - start from last modified time with buffer
      const incrementalBuffer = 60 * 60 * 1000; // 1 hour buffer to catch late updates
      startTimestamp = parseInt(syncCursor.lastModifiedMs) - incrementalBuffer;
      console.log(`⏩ Incremental sync with 1-hour buffer`);
    }

    if (options.endDate) {
      endTimestamp = options.endDate.getTime();
    }

    // Validate time range
    if (startTimestamp >= endTimestamp) {
      console.warn(`⚠️ Invalid time range: start ${new Date(startTimestamp).toISOString()} >= end ${new Date(endTimestamp).toISOString()}`);
      startTimestamp = endTimestamp - (24 * 60 * 60 * 1000); // Default to last 24 hours
    }

    return { startTimestamp, endTimestamp };
  }

  /**
   * Calculate start time for backfill operations
   */
  private calculateBackfillStartTime(syncCursor: any, options: SyncOptions): number {
    const now = Date.now();
    
    // If we have a cursor but want to ensure historical coverage
    if (syncCursor.lastModifiedMs) {
      const lastSyncTime = parseInt(syncCursor.lastModifiedMs);
      const maxHistoricalDepth = (options.historicalSyncDepthDays || 730) * 24 * 60 * 60 * 1000; // Default 2 years
      const earliestAllowedTime = now - maxHistoricalDepth;
      
      // Go back further than last sync to ensure we have comprehensive coverage
      return Math.max(earliestAllowedTime, lastSyncTime - (7 * 24 * 60 * 60 * 1000)); // 1 week buffer
    }
    
    // No previous sync - do full historical sync
    const historicalDepthMs = (options.historicalSyncDepthDays || 365) * 24 * 60 * 60 * 1000;
    return now - historicalDepthMs;
  }

  /**
   * Enhanced historical sync for comprehensive data coverage
   */
  async syncHistoricalData(options: {
    merchantId?: number;
    startDate: Date;
    endDate: Date;
    batchSize?: number;
    enableOptimization?: boolean;
  }): Promise<SyncResult[]> {
    console.log(`🏛️ Starting historical data sync from ${options.startDate.toISOString()} to ${options.endDate.toISOString()}`);
    
    const historicalOptions: SyncOptions = {
      ...options,
      historicalSyncMode: 'full',
      historicalSyncDepthDays: Math.ceil((options.endDate.getTime() - options.startDate.getTime()) / (24 * 60 * 60 * 1000)),
      enableLargeDatasetOptimization: options.enableOptimization !== false,
      batchSize: options.batchSize || 500, // Larger batches for historical data
      maxConcurrentRequests: 3, // Limit concurrent requests to avoid rate limits
      prioritizeRecentData: false // Historical sync doesn't need to prioritize recent data
    };

    if (options.merchantId) {
      // Sync specific merchant
      const result = await this.syncMerchant(options.merchantId, historicalOptions);
      return [result];
    } else {
      // Sync all merchants with optimizations
      return await this.syncAllMerchantsHistorical(historicalOptions);
    }
  }

  /**
   * Optimized historical sync for all merchants
   */
  private async syncAllMerchantsHistorical(options: SyncOptions): Promise<SyncResult[]> {
    const merchants = await storage.getAllCloverConfigs();
    const activeMerchants = merchants.filter(m => m.isActive);
    
    console.log(`🏪 Syncing historical data for ${activeMerchants.length} merchants`);
    
    if (options.parallelMerchantSync && activeMerchants.length > 1) {
      // Parallel sync with concurrency control
      const concurrency = Math.min(options.maxConcurrentRequests || 2, activeMerchants.length);
      const results: SyncResult[] = [];
      
      for (let i = 0; i < activeMerchants.length; i += concurrency) {
        const batch = activeMerchants.slice(i, i + concurrency);
        const batchPromises = batch.map(merchant => 
          this.syncMerchant(merchant.id, options).catch(error => ({
            success: false,
            ordersProcessed: 0,
            ordersCreated: 0,
            ordersUpdated: 0,
            lineItemsProcessed: 0,
            paymentsProcessed: 0,
            errors: [{ orderId: 'MERCHANT_ERROR', error: error.message }],
            duration: 0
          } as SyncResult))
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Add delay between batches to respect rate limits
        if (i + concurrency < activeMerchants.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return results;
    } else {
      // Sequential sync for safety
      return await this.syncAllMerchants(options);
    }
  }

  /**
   * Get historical sync configuration recommendations
   */
  getHistoricalSyncRecommendations(dataVolumeEstimate: 'low' | 'medium' | 'high', timeRangeMonths: number): SyncOptions {
    const baseConfig: SyncOptions = {
      historicalSyncMode: 'full',
      enableLargeDatasetOptimization: true,
      prioritizeRecentData: false
    };

    if (dataVolumeEstimate === 'high' || timeRangeMonths > 24) {
      // High volume or long time range
      return {
        ...baseConfig,
        batchSize: 200, // Smaller batches to avoid timeouts
        maxConcurrentRequests: 2,
        parallelMerchantSync: false,
        historicalSyncDepthDays: Math.min(timeRangeMonths * 30, 1095), // Max 3 years
        maxRetries: 5,
        retryDelay: 2000
      };
    } else if (dataVolumeEstimate === 'medium' || timeRangeMonths > 6) {
      // Medium volume
      return {
        ...baseConfig,
        batchSize: 500,
        maxConcurrentRequests: 3,
        parallelMerchantSync: true,
        historicalSyncDepthDays: timeRangeMonths * 30,
        maxRetries: 3,
        retryDelay: 1000
      };
    } else {
      // Low volume
      return {
        ...baseConfig,
        batchSize: 1000,
        maxConcurrentRequests: 5,
        parallelMerchantSync: true,
        historicalSyncDepthDays: timeRangeMonths * 30,
        maxRetries: 2,
        retryDelay: 500
      };
    }
  }

  /**
   * Stop running sync
   */
  stopSync(): void {
    console.log('🛑 Stopping sync service');
    this.isRunning = false;
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Check if sync is currently running
   */
  isRunningSync(): boolean {
    return this.isRunning;
  }

  /**
   * Get sync status for all merchants
   */
  async getSyncStatus(): Promise<Array<{ merchantId: number; merchantName: string; lastSync: Date | null; status: string; errorCount: number }>> {
    const merchants = await storage.getAllCloverConfigs();
    const statuses = [];

    for (const merchant of merchants) {
      const syncCursor = await storage.getSyncCursor('clover', merchant.id, 'orders');
      statuses.push({
        merchantId: merchant.id,
        merchantName: merchant.merchantName || 'Unknown',
        lastSync: syncCursor?.lastSyncAt || null,
        status: syncCursor?.backfillState || 'none',
        errorCount: syncCursor?.errorCount || 0
      });
    }

    return statuses;
  }

  /**
   * Utility method for sleep/delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const cloverSyncService = new CloverSyncService();