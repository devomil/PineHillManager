import { storage } from '../storage';

// Clover API Configuration
interface CloverConfig {
  merchantId: string;
  accessToken: string;
  baseUrl: string;
}

// Clover API Response Types
interface CloverOrder {
  id: string;
  total: number;
  currency: string;
  createdTime: number;
  modifiedTime: number;
  state: string;
  paymentState: string;
  lineItems: CloverLineItem[];
  payments?: CloverPayment[];
}

interface CloverLineItem {
  id: string;
  orderRef: { id: string };
  item: { id: string; name: string; price: number };
  name: string;
  price: number;
  unitQty: number;
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
  cardTransaction?: {
    type: string;
    first6: string;
    last4: string;
  };
}

interface CloverItem {
  id: string;
  name: string;
  price: number;
  priceType: string;
  defaultTaxRates: boolean;
  unitName?: string;
  cost?: number;
  isRevenue: boolean;
  stockCount?: number;
}

export class CloverIntegration {
  private config: CloverConfig;

  constructor() {
    this.config = {
      merchantId: process.env.CLOVER_MERCHANT_ID || '',
      accessToken: process.env.CLOVER_ACCESS_TOKEN || '',
      baseUrl: process.env.CLOVER_BASE_URL || 'https://api.clover.com'
    };
  }

  // Make authenticated API calls to Clover
  private async makeCloverAPICall(endpoint: string, method: 'GET' | 'POST' = 'GET'): Promise<any> {
    try {
      const config = await storage.getCloverConfig();
      if (!config || !config.accessToken) {
        throw new Error('Clover not configured');
      }

      const url = `${this.config.baseUrl}/v3/merchants/${config.merchantId}/${endpoint}`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Clover API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Clover API call error:', error);
      throw error;
    }
  }

  // Sync daily sales data from Clover POS
  async syncDailySales(date?: Date): Promise<void> {
    try {
      const targetDate = date || new Date();
      const startTime = new Date(targetDate);
      startTime.setHours(0, 0, 0, 0);
      
      const endTime = new Date(targetDate);
      endTime.setHours(23, 59, 59, 999);

      const startTimestamp = startTime.getTime();
      const endTimestamp = endTime.getTime();

      // Fetch orders for the specified date range
      const response = await this.makeCloverAPICall(
        `orders?filter=createdTime>=${startTimestamp}&createdTime<=${endTimestamp}&expand=lineItems,payments`
      );

      const orders: CloverOrder[] = response.elements || [];
      let totalSales = 0;
      let totalTransactions = 0;

      for (const order of orders) {
        if (order.state === 'open' || order.paymentState !== 'PAID') {
          continue; // Skip unpaid orders
        }

        totalSales += order.total;
        totalTransactions += 1;

        // Store individual sale in POS sales table
        const saleData = {
          externalId: order.id,
          saleDate: new Date(order.createdTime),
          totalAmount: (order.total / 100).toString(), // Clover amounts are in cents
          taxAmount: this.calculateTaxFromOrder(order).toString(),
          tipAmount: this.calculateTipFromOrder(order).toString(),
          paymentMethod: this.determinePaymentMethod(order),
          source: 'clover' as const
        };

        await storage.createPosSale(saleData);

        // Store line items
        if (order.lineItems) {
          for (const lineItem of order.lineItems) {
            const itemData = {
              posSaleId: order.id,
              itemName: lineItem.name,
              quantity: lineItem.unitQty || 1,
              unitPrice: (lineItem.price / 100).toString(),
              totalPrice: ((lineItem.price * (lineItem.unitQty || 1)) / 100).toString()
            };

            await storage.createPosSaleItem(itemData);
          }
        }
      }

      // Create financial transaction for daily sales summary
      if (totalSales > 0) {
        const salesAccount = await storage.getFinancialAccountByName('Sales Revenue');
        const bankAccount = await storage.getFinancialAccountByName('Checking Account');

        if (salesAccount && bankAccount) {
          const transactionData = {
            transactionDate: targetDate,
            description: `Daily Sales - Clover POS (${totalTransactions} transactions)`,
            reference: `CLOVER-${targetDate.toISOString().split('T')[0]}`,
            totalAmount: (totalSales / 100).toString(),
            source: 'clover' as const
          };

          const transaction = await storage.createFinancialTransaction(transactionData);

          // Credit sales revenue
          await storage.createTransactionLine({
            transactionId: transaction.id,
            accountId: salesAccount.id,
            description: 'Daily sales revenue',
            debitAmount: null,
            creditAmount: (totalSales / 100).toString()
          });

          // Debit bank account
          await storage.createTransactionLine({
            transactionId: transaction.id,
            accountId: bankAccount.id,
            description: 'Cash/card deposits',
            debitAmount: (totalSales / 100).toString(),
            creditAmount: null
          });
        }
      }

      // Log successful sync
      await storage.createIntegrationLog({
        integration: 'clover',
        operation: 'sync_daily_sales',
        status: 'success',
        details: `Synced ${orders.length} orders, $${(totalSales / 100).toFixed(2)} in sales`,
        timestamp: new Date()
      });

    } catch (error) {
      await storage.createIntegrationLog({
        integration: 'clover',
        operation: 'sync_daily_sales',
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      throw error;
    }
  }

  // Sync inventory items from Clover
  async syncInventory(): Promise<void> {
    try {
      const response = await this.makeCloverAPICall('items');
      const items: CloverItem[] = response.elements || [];

      for (const cloverItem of items) {
        const inventoryData = {
          externalId: cloverItem.id,
          itemName: cloverItem.name,
          sku: cloverItem.id, // Use Clover ID as SKU if no specific SKU
          currentQuantity: cloverItem.stockCount || 0,
          unitCost: cloverItem.cost ? (cloverItem.cost / 100).toString() : '0.00',
          unitPrice: (cloverItem.price / 100).toString(),
          reorderLevel: 10, // Default reorder level
          isActive: true,
          source: 'clover' as const
        };

        await storage.upsertInventoryItem(inventoryData);
      }

      // Log successful sync
      await storage.createIntegrationLog({
        integration: 'clover',
        operation: 'sync_inventory',
        status: 'success',
        details: `Synced ${items.length} inventory items`,
        timestamp: new Date()
      });

    } catch (error) {
      await storage.createIntegrationLog({
        integration: 'clover',
        operation: 'sync_inventory',
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      throw error;
    }
  }

  // Test connection to Clover
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeCloverAPICall('');
      
      return {
        success: true,
        message: `Connected to Clover merchant: ${response.name || 'Unknown'}`
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  // Helper function to calculate tax from order
  private calculateTaxFromOrder(order: CloverOrder): number {
    if (!order.payments) return 0;
    
    return order.payments.reduce((total, payment) => {
      return total + (payment.taxAmount || 0);
    }, 0) / 100; // Convert from cents
  }

  // Helper function to calculate tip from order
  private calculateTipFromOrder(order: CloverOrder): number {
    if (!order.payments) return 0;
    
    return order.payments.reduce((total, payment) => {
      return total + (payment.tipAmount || 0);
    }, 0) / 100; // Convert from cents
  }

  // Helper function to determine primary payment method
  private determinePaymentMethod(order: CloverOrder): string {
    if (!order.payments || order.payments.length === 0) {
      return 'unknown';
    }

    const payment = order.payments[0];
    if (payment.cardTransaction) {
      return 'card';
    }
    
    // Check if it's a cash payment (no card transaction)
    return payment.cardTransaction ? 'card' : 'cash';
  }

  // Load configuration from database
  async loadConfig(): Promise<void> {
    const config = await storage.getCloverConfig();
    if (config) {
      this.config.merchantId = config.merchantId || '';
      this.config.accessToken = config.accessToken || '';
    }
  }

  // Schedule automatic daily sales sync
  async scheduleAutomaticSync(): Promise<void> {
    // This would typically use a job scheduler like node-cron
    // For now, we'll just sync yesterday's sales
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    try {
      await this.syncDailySales(yesterday);
      console.log('Automatic Clover sync completed successfully');
    } catch (error) {
      console.error('Automatic Clover sync failed:', error);
    }
  }
}

export const cloverIntegration = new CloverIntegration();