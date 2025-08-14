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

  // Test API connection
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.makeCloverAPICallWithConfig('orders?limit=1', this.config);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  constructor(dbConfig?: any) {
    if (dbConfig) {
      this.config = {
        merchantId: dbConfig.merchantId,
        accessToken: dbConfig.apiToken,
        baseUrl: dbConfig.baseUrl || 'https://api.clover.com'
      };
    } else {
      this.config = {
        merchantId: process.env.CLOVER_MERCHANT_ID || '',
        accessToken: process.env.CLOVER_ACCESS_TOKEN || '',
        baseUrl: process.env.CLOVER_BASE_URL || 'https://api.clover.com'
      };
    }
  }

  // Make authenticated API calls to Clover with specific config
  private async makeCloverAPICallWithConfig(endpoint: string, config: any, method: 'GET' | 'POST' = 'GET'): Promise<any> {
    try {
      
      if (!config || !config.apiToken) {
        throw new Error('Clover not configured');
      }

      const baseUrl = config.baseUrl || 'https://api.clover.com';
      const url = `${baseUrl}/v3/merchants/${config.merchantId}/${endpoint}`;
      
      console.log(`Making Clover API call to: ${url}`);
      console.log(`Using merchant ID: ${config.merchantId}`);
      console.log(`Using base URL: ${baseUrl}`);
      console.log(`Using API token: ${config.apiToken?.substring(0, 8)}...${config.apiToken?.slice(-4)}`);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${config.apiToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Clover API error details:`, {
          status: response.status,
          statusText: response.statusText,
          url,
          body: errorBody
        });
        throw new Error(`Clover API error: ${response.status} ${response.statusText} - ${errorBody}`);
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

      await storage.createIntegrationLog({
        system: 'clover',
        operation: 'sync_daily_sales',
        status: 'in_progress',
        message: `Starting daily sales sync for ${targetDate.toDateString()}`
      });

      // Fetch orders for the specified date range using Clover's orders API
      const ordersResponse = await this.makeCloverAPICall(
        `orders?filter=createdTime>=${startTimestamp}&createdTime<=${endTimestamp}&expand=lineItems,payments`
      );

      if (!ordersResponse || !ordersResponse.elements) {
        throw new Error('Invalid response from Clover API');
      }

      const orders = ordersResponse.elements;
      let processedCount = 0;

      for (const order of orders) {
        // Check if this order is already synced
        const existingSale = await storage.getPosSaleByCloverOrderId(order.id);
        if (existingSale) {
          console.log(`Order ${order.id} already synced, skipping...`);
          continue;
        }

        // Process the order and create POS sale record
        const totalAmount = parseFloat(order.total) / 100; // Clover amounts are in cents
        const taxAmount = parseFloat(order.taxAmount || '0') / 100;
        const tipAmount = parseFloat(order.tipAmount || '0') / 100;

        const saleData = {
          saleDate: targetDate.toISOString().split('T')[0],
          saleTime: new Date(order.createdTime),
          totalAmount: totalAmount.toString(),
          taxAmount: taxAmount.toString(),
          tipAmount: tipAmount.toString(),
          paymentMethod: order.payType || 'unknown',
          cloverOrderId: order.id,
          locationId: 1 // Default location
        };

        const createdSale = await storage.createPosSale(saleData);

        // Process line items if they exist
        if (order.lineItems && order.lineItems.elements) {
          for (const lineItem of order.lineItems.elements) {
            const itemAmount = parseFloat(lineItem.price) / 100;
            const quantity = lineItem.quantity || 1;
            const lineTotal = itemAmount * quantity;
            
            const itemData = {
              saleId: createdSale.id,
              itemName: lineItem.name,
              quantity: quantity.toString(),
              unitPrice: itemAmount.toString(),
              lineTotal: lineTotal.toString(),
              discountAmount: lineItem.discountAmount ? (parseFloat(lineItem.discountAmount) / 100).toString() : '0.00'
            };

            await storage.createPosSaleItem(itemData);
          }
        }

        processedCount++;
        console.log(`Successfully synced order ${order.id} with total ${totalAmount}`);
      }

      // Log successful completion
      await storage.createIntegrationLog({
        system: 'clover',
        operation: 'sync_daily_sales',
        status: 'success',
        message: `Successfully synced ${processedCount} orders for ${targetDate.toDateString()}`
      });

      console.log(`Clover daily sales sync completed. Processed ${processedCount} orders.`);

    } catch (error) {
      console.error('Error syncing Clover sales:', error);
      
      // Log the error
      await storage.createIntegrationLog({
        system: 'clover',
        operation: 'sync_daily_sales',
        status: 'error',
        message: `Failed to sync daily sales: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      throw error;
    }
  }

  // Sync daily sales with specific merchant config
  async syncDailySalesWithConfig(date: Date, config: any): Promise<void> {
    try {
      const targetDate = date || new Date();
      const startTime = new Date(targetDate);
      startTime.setHours(0, 0, 0, 0);
      
      const endTime = new Date(targetDate);
      endTime.setHours(23, 59, 59, 999);

      const startTimestamp = startTime.getTime();
      const endTimestamp = endTime.getTime();

      console.log(`Syncing sales for merchant: ${config.merchantName} (${config.merchantId})`);
      console.log(`Date range: ${startTime.toISOString()} to ${endTime.toISOString()}`);
      console.log(`Timestamp range: ${startTimestamp} to ${endTimestamp}`);

      await storage.createIntegrationLog({
        system: 'clover',
        operation: 'sync_daily_sales',
        status: 'in_progress',
        message: `Starting daily sales sync for ${config.merchantName} - ${targetDate.toDateString()}`
      });

      // Fetch orders for the specified date range using merchant-specific config
      const ordersResponse = await this.makeCloverAPICallWithConfig(
        `orders?filter=createdTime>=${startTimestamp}&createdTime<=${endTimestamp}&expand=lineItems,payments`,
        config
      );

      console.log(`Orders response for ${config.merchantName}:`, {
        hasResponse: !!ordersResponse,
        hasElements: !!(ordersResponse && ordersResponse.elements),
        elementCount: ordersResponse?.elements?.length || 0,
        href: ordersResponse?.href
      });

      if (!ordersResponse || !ordersResponse.elements) {
        console.log(`No orders found for merchant ${config.merchantId} on ${targetDate.toDateString()}`);
        await storage.createIntegrationLog({
          system: 'clover',
          operation: 'sync_daily_sales',
          status: 'success',
          message: `No orders found for ${config.merchantName} on ${targetDate.toDateString()}`
        });
        return;
      }

      const orders = ordersResponse.elements;
      let processedCount = 0;

      for (const order of orders) {
        // Check if this order is already synced
        const existingSale = await storage.getPosSaleByCloverOrderId(order.id);
        if (existingSale) {
          console.log(`Order ${order.id} already synced, skipping...`);
          continue;
        }

        // Process the order and create POS sale record
        const totalAmount = parseFloat(order.total) / 100; // Clover amounts are in cents
        const taxAmount = parseFloat(order.taxAmount || '0') / 100;
        const tipAmount = parseFloat(order.tipAmount || '0') / 100;

        const saleData = {
          saleDate: targetDate.toISOString().split('T')[0],
          saleTime: new Date(order.createdTime),
          totalAmount: totalAmount.toString(),
          taxAmount: taxAmount.toString(),
          tipAmount: tipAmount.toString(),
          paymentMethod: order.payType || 'unknown',
          cloverOrderId: order.id,
          locationId: config.id || 1 // Use config ID as location identifier
        };

        const createdSale = await storage.createPosSale(saleData);

        // Process line items if they exist
        if (order.lineItems && order.lineItems.elements) {
          for (const lineItem of order.lineItems.elements) {
            const itemAmount = parseFloat(lineItem.price) / 100;
            const quantity = lineItem.quantity || 1;
            const lineTotal = itemAmount * quantity;
            
            const itemData = {
              saleId: createdSale.id,
              itemName: lineItem.name,
              quantity: quantity.toString(),
              unitPrice: itemAmount.toString(),
              lineTotal: lineTotal.toString(),
              discountAmount: lineItem.discountAmount ? (parseFloat(lineItem.discountAmount) / 100).toString() : '0.00'
            };

            await storage.createPosSaleItem(itemData);
          }
        }

        processedCount++;
        console.log(`Successfully synced order ${order.id} for ${config.merchantName} with total ${totalAmount}`);
      }

      // Log successful completion
      await storage.createIntegrationLog({
        system: 'clover',
        operation: 'sync_daily_sales',
        status: 'success',
        message: `Successfully synced ${processedCount} orders for ${config.merchantName} - ${targetDate.toDateString()}`
      });

      console.log(`Clover sync for ${config.merchantName} completed. Processed ${processedCount} orders.`);

    } catch (error) {
      console.error(`Error syncing Clover sales for ${config.merchantName}:`, error);
      
      // Log the error
      await storage.createIntegrationLog({
        system: 'clover',
        operation: 'sync_daily_sales',
        status: 'error',
        message: `Failed to sync daily sales for ${config.merchantName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      throw error;
    }
  }

  // Test connection to Clover
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Use merchant endpoint to test connection and get merchant info
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
}

export const cloverIntegration = new CloverIntegration();