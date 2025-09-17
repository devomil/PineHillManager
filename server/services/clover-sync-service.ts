import { storage } from '../storage';
import { CloverIntegration } from '../integrations/clover';
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
        accessToken: merchantConfig.apiToken,
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
            await this.processOrder(order, merchantDbId, merchantConfig);
            result.ordersProcessed++;
            
            // Track the latest modified time for cursor updates
            if (order.modifiedTime > maxModifiedTime) {
              maxModifiedTime = order.modifiedTime;
            }
            
            // Count line items and payments processed
            if (order.lineItems?.elements) {
              result.lineItemsProcessed += order.lineItems.elements.length;
            }
            if (order.payments?.elements) {
              result.paymentsProcessed += order.payments.elements.length;
            }
            
          } catch (orderError) {
            console.error(`❌ Error processing order ${order.id}:`, orderError);
            result.errors.push({
              orderId: order.id,
              error: orderError instanceof Error ? orderError.message : 'Unknown error'
            });
          }
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
          errorCount: 0,
          nextSyncCursor: maxModifiedTime.toString()
        });
      }

      // Generate daily sales aggregations for the sync period
      await this.aggregateDailySales(merchantDbId, new Date(startTimestamp), new Date(endTimestamp));

      result.success = true;
      result.duration = Date.now() - startTime;

      console.log(`✅ Sync completed for merchant ${merchantConfig.merchantName}: ${result.ordersProcessed} orders processed in ${result.duration}ms`);

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
   * Process a single order with idempotent upserts
   */
  private async processOrder(cloverOrder: CloverOrder, merchantDbId: number, merchantConfig: any): Promise<void> {
    console.log(`🔄 Processing order ${cloverOrder.id}`);

    // Check if order already exists
    const existingOrder = await storage.getOrderByExternalId(cloverOrder.id, 'clover');
    
    // Map Clover order to our schema
    const orderData: InsertOrder = {
      merchantId: merchantDbId,
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
      note: cloverOrder.note || null,
      testMode: cloverOrder.testMode || false
    };

    let orderId: number;
    let isNewOrder = false;

    if (existingOrder) {
      // Update existing order
      const updatedOrder = await storage.updateOrder(existingOrder.id, orderData);
      orderId = updatedOrder.id;
      console.log(`🔄 Updated existing order ${cloverOrder.id}`);
    } else {
      // Create new order
      const newOrder = await storage.createOrder(orderData);
      orderId = newOrder.id;
      isNewOrder = true;
      console.log(`➕ Created new order ${cloverOrder.id}`);
    }

    // Process line items
    if (cloverOrder.lineItems?.elements) {
      await this.processLineItems(cloverOrder.lineItems.elements, orderId, merchantDbId);
    }

    // Process payments
    if (cloverOrder.payments?.elements) {
      await this.processPayments(cloverOrder.payments.elements, orderId, merchantDbId);
    }

    // Process discounts
    if (cloverOrder.discounts?.elements) {
      await this.processDiscounts(cloverOrder.discounts.elements, orderId, merchantDbId);
    }

    // Process refunds
    if (cloverOrder.refunds?.elements) {
      await this.processRefunds(cloverOrder.refunds.elements, orderId, merchantDbId);
    }

    // Calculate and update financial totals
    await this.calculateOrderFinancials(orderId);

    if (isNewOrder) {
      // Update result counter in parent scope would go here
      // This is handled in the calling method
    }
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
        
        const lineItemData: InsertOrderLineItem = {
          orderId,
          externalLineItemId: lineItem.id,
          itemId: lineItem.item?.id || null,
          itemName: lineItem.name,
          quantity: lineItem.unitQty || 1,
          unitPrice: (lineItem.price / 100).toFixed(2),
          lineTotal: ((lineItem.price * (lineItem.unitQty || 1)) / 100).toFixed(2),
          unitCostAtSale: unitCostAtSale,
          lineCogs: ((parseFloat(unitCostAtSale) * (lineItem.unitQty || 1))).toFixed(2),
          discountAmount: lineItem.discountAmount ? (lineItem.discountAmount / 100).toFixed(2) : '0.00',
          isRevenue: lineItem.isRevenue !== false,
          note: lineItem.note || null,
          userData: lineItem.userData || null
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
        const existingPayment = await storage.getPaymentByExternalId(payment.id);
        
        const paymentData: InsertPayment = {
          orderId,
          externalPaymentId: payment.id,
          amount: (payment.amount / 100).toFixed(2),
          tipAmount: payment.tipAmount ? (payment.tipAmount / 100).toFixed(2) : '0.00',
          taxAmount: payment.taxAmount ? (payment.taxAmount / 100).toFixed(2) : '0.00',
          cashbackAmount: payment.cashbackAmount ? (payment.cashbackAmount / 100).toFixed(2) : '0.00',
          paymentMethod: payment.tender?.labelKey || payment.tender?.label || 'unknown',
          result: payment.result,
          createdTime: new Date(payment.createdTime),
          employeeId: payment.employee?.id || null,
          cardType: payment.cardTransaction?.type || null,
          last4: payment.cardTransaction?.last4 || null,
          authCode: payment.cardTransaction?.authCode || null,
          externalPaymentId: payment.externalPaymentId || null
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
          externalDiscountId: discount.id,
          name: discount.name,
          discountType: discount.discType || 'unknown',
          percentage: discount.percentage || null,
          amount: discount.amount ? (discount.amount / 100).toFixed(2) : '0.00'
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
          amount: (refund.amount / 100).toFixed(2),
          createdTime: new Date(refund.createdTime),
          employeeId: refund.employee?.id || null,
          paymentId: refund.payment?.id || null
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
        totalDiscounts += parseFloat(discount.amount || '0');
      }

      // Get refunds
      const refunds = await storage.getOrderRefunds(orderId);
      let totalRefunds = 0;
      for (const refund of refunds) {
        totalRefunds += parseFloat(refund.amount || '0');
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
      const costHistoryData: InsertItemCostHistory = {
        itemId,
        merchantId: merchantDbId,
        unitCost,
        effectiveDate: new Date(),
        source: 'sync',
        notes: 'Recorded during order sync'
      };

      await storage.createItemCostHistory(costHistoryData);
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
    for (const [dateKey, dayOrders] of ordersByDate) {
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
        refundAmount += parseFloat(refund.amount);
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
   * Calculate sync time range based on cursor and options
   */
  private calculateSyncTimeRange(syncCursor: any, options: SyncOptions): { startTimestamp: number; endTimestamp: number } {
    const now = Date.now();
    let startTimestamp: number;
    let endTimestamp = now;

    if (options.forceFullSync || !syncCursor.lastModifiedMs) {
      // Full sync - start from configured start date or 30 days ago
      startTimestamp = options.startDate?.getTime() || (now - (30 * 24 * 60 * 60 * 1000));
    } else {
      // Incremental sync - start from last modified time
      startTimestamp = parseInt(syncCursor.lastModifiedMs);
    }

    if (options.endDate) {
      endTimestamp = options.endDate.getTime();
    }

    return { startTimestamp, endTimestamp };
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
        merchantName: merchant.merchantName,
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