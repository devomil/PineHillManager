import { storage } from '../storage';

// Clover API Configuration
interface CloverConfig {
  id?: number;
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
  async testConnectionWithConfig(): Promise<{ success: boolean; error?: string }> {
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

  // Fetch orders from Clover API
  async fetchOrders(options: {
    limit?: number;
    offset?: number;
    filter?: string;
    expand?: string;
    orderBy?: string;
    modifiedTime?: string;
    modifiedTimeMin?: number;
    modifiedTimeMax?: number;
    createdTimeMin?: number;
    createdTimeMax?: number;
  } = {}): Promise<{ elements: CloverOrder[]; href: string }> {
    const params = new URLSearchParams();
    
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.filter) params.append('filter', options.filter);
    if (options.expand) params.append('expand', options.expand);
    if (options.orderBy) params.append('orderBy', options.orderBy);
    if (options.modifiedTime) params.append('modifiedTime', options.modifiedTime);
    if (options.modifiedTimeMin) params.append('modifiedTime.min', options.modifiedTimeMin.toString());
    if (options.modifiedTimeMax) params.append('modifiedTime.max', options.modifiedTimeMax.toString());
    // Convert millisecond timestamps to Unix seconds for Clover API
    if (options.createdTimeMin) {
      const unixSeconds = Math.floor(options.createdTimeMin / 1000);
      params.append('createdTime.min', unixSeconds.toString());
      console.log('🔧 [CLOVER API] Converting createdTimeMin:', { 
        milliseconds: options.createdTimeMin, 
        unixSeconds, 
        isoDate: new Date(options.createdTimeMin).toISOString() 
      });
    }
    if (options.createdTimeMax) {
      const unixSeconds = Math.floor(options.createdTimeMax / 1000);
      params.append('createdTime.max', unixSeconds.toString());
      console.log('🔧 [CLOVER API] Converting createdTimeMax:', { 
        milliseconds: options.createdTimeMax, 
        unixSeconds, 
        isoDate: new Date(options.createdTimeMax).toISOString() 
      });
    }

    const queryString = params.toString();
    const endpoint = queryString ? `orders?${queryString}` : 'orders';
    
    return await this.makeCloverAPICallWithConfig(endpoint, this.config);
  }

  // Get single order details
  async getOrderDetails(orderId: string, expand?: string): Promise<CloverOrder> {
    const params = expand ? `?expand=${expand}` : '';
    return await this.makeCloverAPICallWithConfig(`orders/${orderId}${params}`, this.config);
  }

  // Set config for the integration
  setConfig(config: CloverConfig): void {
    this.config = config;
  }

  constructor(dbConfig?: any) {
    if (dbConfig) {
      // Debug configuration mapping
      console.log(`🔧 CloverIntegration constructor received config:`, {
        merchantId: dbConfig.merchantId,
        merchant_id: dbConfig.merchant_id,
        apiToken: dbConfig.apiToken,
        api_token: dbConfig.api_token,
        merchantName: dbConfig.merchantName
      });
      
      this.config = {
        merchantId: dbConfig.merchantId || dbConfig.merchant_id,
        accessToken: dbConfig.apiToken || dbConfig.api_token,
        baseUrl: dbConfig.baseUrl || dbConfig.base_url || 'https://api.clover.com'
      };
      
      console.log(`🔧 Final config created:`, {
        merchantId: this.config.merchantId,
        accessToken: this.config.accessToken ? `${this.config.accessToken.substring(0, 8)}...${this.config.accessToken.slice(-4)}` : 'MISSING',
        baseUrl: this.config.baseUrl
      });
    } else {
      this.config = {
        merchantId: process.env.CLOVER_MERCHANT_ID || '',
        accessToken: process.env.CLOVER_ACCESS_TOKEN || '',
        baseUrl: process.env.CLOVER_BASE_URL || 'https://api.clover.com'
      };
    }
  }

  // Make authenticated API calls to Clover with specific config
  private async makeCloverAPICallWithConfig(endpoint: string, config: any, method: 'GET' | 'POST' | 'PUT' = 'GET', body?: any): Promise<any> {
    try {
      
      if (!config || !config.accessToken) {
        throw new Error('Clover not configured');
      }

      const baseUrl = config.baseUrl || 'https://api.clover.com';
      const url = `${baseUrl}/v3/merchants/${config.merchantId}/${endpoint}`;
      
      console.log(`Making Clover API call to: ${url}`);
      console.log(`Using merchant ID: ${config.merchantId}`);
      console.log(`Using base URL: ${baseUrl}`);
      console.log(`Using API token: ${config.accessToken?.substring(0, 8)}...${config.accessToken?.slice(-4)}`);
      
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };

      // Add body for POST/PUT requests
      if (body && (method === 'POST' || method === 'PUT')) {
        requestOptions.body = JSON.stringify(body);
        console.log(`Request body:`, JSON.stringify(body, null, 2));
      }
      
      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Clover API error details:`, {
          status: response.status,
          statusText: response.statusText,
          url,
          method,
          requestBody: body,
          responseBody: errorBody
        });
        throw new Error(`Clover API error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Clover API call error:', error);
      throw error;
    }
  }

  // Helper method for API calls with current config
  private async makeCloverAPICall(endpoint: string): Promise<any> {
    return this.makeCloverAPICallWithConfig(endpoint, this.config);
  }

  // Inventory Management Methods
  async fetchItems(params: {
    limit?: number;
    offset?: number;
    filter?: string;
  } = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.filter) queryParams.append('filter', params.filter);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `items?${queryString}` : 'items';
    
    console.log(`📦 Fetching inventory items for merchant ${this.config.merchantId}`);
    return await this.makeCloverAPICall(endpoint);
  }

  // Get inventory items using dedicated inventory endpoints (more accurate cost data)
  async fetchInventoryItems(options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<{ elements: any[]; href?: string }> {
    const params = new URLSearchParams();
    
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `inventory/items?${queryString}` : 'inventory/items';
    
    console.log(`📦 Fetching inventory items from: ${endpoint}`);
    return await this.makeCloverAPICallWithConfig(endpoint, this.config);
  }

  // Get inventory item stocks for cost tracking
  async fetchInventoryItemStocks(itemId: string): Promise<any> {
    console.log(`📊 Fetching stock data for item: ${itemId}`);
    return await this.makeCloverAPICallWithConfig(`inventory/items/${itemId}/stock`, this.config);
  }

  // Get all inventory items with their stock data using proper inventory endpoints  
  async fetchAllInventoryItemsWithStocks(): Promise<any[]> {
    const inventoryItems = [];
    let offset = 0;
    const limit = 100;
    let hasMoreData = true;

    console.log(`🔄 Using Clover Inventory API endpoints for accurate cost data...`);

    while (hasMoreData) {
      console.log(`📦 Fetching inventory items: offset=${offset}, limit=${limit}`);
      
      try {
        const itemsResponse = await this.fetchInventoryItems({ limit, offset });
        
        if (!itemsResponse || !itemsResponse.elements || itemsResponse.elements.length === 0) {
          hasMoreData = false;
          break;
        }

        // Fetch stock data for each item to get accurate costs
        for (const item of itemsResponse.elements) {
          try {
            const stockData = await this.fetchInventoryItemStocks(item.id);
            item.stockInfo = stockData;
            
            const cost = stockData?.cost ? (parseFloat(stockData.cost) / 100).toFixed(2) : '0.00';
            const stock = stockData?.quantity || 0;
            
            console.log(`📊 Item ${item.name}: Cost=$${cost}, Stock=${stock}`);
          } catch (error) {
            console.warn(`⚠️ Could not fetch stock data for item ${item.id}:`, error);
            item.stockInfo = null;
          }
          
          // Rate limiting between stock requests
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        inventoryItems.push(...itemsResponse.elements);
        console.log(`✅ Fetched ${itemsResponse.elements.length} inventory items, total so far: ${inventoryItems.length}`);

        if (itemsResponse.elements.length < limit) {
          hasMoreData = false;
        } else {
          offset += limit;
        }
      } catch (error) {
        console.error(`❌ Error fetching inventory batch at offset ${offset}:`, error);
        hasMoreData = false;
      }

      // Rate limiting between batches
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`🔄 Total inventory items fetched with cost data: ${inventoryItems.length}`);
    return inventoryItems;
  }

  // Sync inventory items with cost data to database (Enhanced with inventory endpoints)
  async syncInventoryItems(config?: any): Promise<void> {
    try {
      console.log(`🏪 Starting inventory sync for merchant ${this.config.merchantId}`);
      
      await storage.createIntegrationLog({
        system: 'clover',
        operation: 'sync_inventory',
        status: 'in_progress',
        message: `Starting enhanced inventory sync with cost data for merchant ${this.config.merchantId}`
      });

      // Use enhanced inventory endpoints for accurate cost data
      console.log(`🔄 Using Clover Inventory API (not basic items) for accurate COGS data...`);
      const allItems = await this.fetchAllInventoryItemsWithStocks();

      console.log(`📦 Total items fetched with cost data: ${allItems.length}`);

      let syncedCount = 0;
      let updatedCount = 0;

      for (const item of allItems) {
        try {
          // Check if item already exists in inventory
          const existingItems = await storage.getInventoryItemsBySKU(item.id);
          const existingItem = existingItems.length > 0 ? existingItems[0] : null;

          // Use stock info for accurate cost data (from inventory/items/{id}/stock endpoint)
          const stockInfo = item.stockInfo;
          const accurateCost = stockInfo?.cost ? (parseFloat(stockInfo.cost) / 100).toString() : 
                              item.cost ? (parseFloat(item.cost) / 100).toString() : '0.00';
          const stockQuantity = stockInfo?.quantity || item.stockCount || 0;

          const itemData = {
            sku: item.id,
            itemName: item.name,
            description: item.description || '',
            category: item.categories?.elements?.[0]?.name || 'Uncategorized',
            unitCost: accurateCost,  // 👈 Enhanced cost from inventory endpoints
            unitPrice: item.price ? (parseFloat(item.price) / 100).toString() : '0.00',
            quantityOnHand: stockQuantity.toString(),
            isActive: !item.hidden,
            lastSyncAt: new Date()
          };

          if (existingItem) {
            // Update existing item
            await storage.updateInventoryItem(existingItem.id, itemData);
            updatedCount++;
            console.log(`✅ Updated item: ${item.name} (Enhanced Cost: $${itemData.unitCost})`);
          } else {
            // Create new item
            await storage.createInventoryItem(itemData);
            syncedCount++;
            console.log(`✅ Created item: ${item.name} (Enhanced Cost: $${itemData.unitCost})`);
          }
        } catch (itemError) {
          console.error(`❌ Error processing item ${item.id}:`, itemError);
        }
      }

      await storage.createIntegrationLog({
        system: 'clover',
        operation: 'sync_inventory',
        status: 'success',
        message: `Inventory sync completed: ${syncedCount} new items, ${updatedCount} updated items`
      });

      console.log(`✅ Inventory sync completed: ${syncedCount} new, ${updatedCount} updated`);

    } catch (error) {
      console.error('Error syncing inventory:', error);
      
      await storage.createIntegrationLog({
        system: 'clover',
        operation: 'sync_inventory',
        status: 'error',
        message: `Failed to sync inventory: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      throw error;
    }
  }

  async fetchItemStocks(params: {
    limit?: number;
    offset?: number;
  } = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    const endpoint = queryString ? `item_stocks?${queryString}` : 'item_stocks';
    
    console.log(`📊 Fetching item stocks for merchant ${this.config.merchantId}`);
    return await this.makeCloverAPICall(endpoint);
  }

  async fetchItemStock(itemId: string) {
    console.log(`🔍 Fetching stock for item ${itemId} in merchant ${this.config.merchantId}`);
    return await this.makeCloverAPICall(`items/${itemId}/stock`);
  }

  // Update item stock quantity via Clover API
  async updateItemStock(itemId: string, newQuantity: number): Promise<any> {
    console.log(`📦 Updating stock for item ${itemId} to ${newQuantity} units`);
    
    const requestBody = {
      item: { id: itemId },
      quantity: newQuantity
    };

    return await this.makeCloverAPICallWithConfig(
      `item_stocks/${itemId}`, 
      this.config, 
      'POST',
      requestBody
    );
  }

  // Update inventory item stock via inventory endpoints (alternative method)
  async updateInventoryItemStock(itemId: string, newQuantity: number): Promise<any> {
    console.log(`📊 Updating inventory stock for item ${itemId} to ${newQuantity} units via inventory endpoint`);
    
    const requestBody = {
      quantity: newQuantity
    };

    return await this.makeCloverAPICallWithConfig(
      `inventory/items/${itemId}/stock`, 
      this.config, 
      'PUT',
      requestBody
    );
  }

  async fetchCategories(params: {
    limit?: number;
    offset?: number;
  } = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    const endpoint = queryString ? `categories?${queryString}` : 'categories';
    
    console.log(`🏷️ Fetching categories for merchant ${this.config.merchantId}`);
    return await this.makeCloverAPICall(endpoint);
  }

  async fetchOptions(params: {
    limit?: number;
    offset?: number;
  } = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    const endpoint = queryString ? `options?${queryString}` : 'options';
    
    console.log(`⚙️ Fetching options for merchant ${this.config.merchantId}`);
    return await this.makeCloverAPICall(endpoint);
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
            
            // Try to link to inventory item for cost tracking
            let inventoryItemId = null;
            try {
              const inventoryItems = await storage.getInventoryItemsBySKU(lineItem.item?.id || lineItem.id);
              const inventoryItem = inventoryItems.length > 0 ? inventoryItems[0] : null;
              if (inventoryItem) {
                inventoryItemId = inventoryItem.id;
                console.log(`🔗 Linked sale item "${lineItem.name}" to inventory item ${inventoryItemId} (Cost: $${inventoryItem.unitCost})`);
              }
            } catch (error) {
              console.log(`No inventory match for item: ${lineItem.name}`);
            }
            
            const itemData = {
              saleId: createdSale.id,
              inventoryItemId,
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
            
            // Try to link to inventory item for cost tracking
            let inventoryItemId = null;
            try {
              const inventoryItems = await storage.getInventoryItemsBySKU(lineItem.item?.id || lineItem.id);
              const inventoryItem = inventoryItems.length > 0 ? inventoryItems[0] : null;
              if (inventoryItem) {
                inventoryItemId = inventoryItem.id;
                console.log(`🔗 Linked sale item "${lineItem.name}" to inventory item ${inventoryItemId} (Cost: $${inventoryItem.unitCost})`);
              }
            } catch (error) {
              console.log(`No inventory match for item: ${lineItem.name}`);
            }
            
            const itemData = {
              saleId: createdSale.id,
              inventoryItemId,
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

  // Sync comprehensive historical sales data for a merchant
  async syncHistoricalSales(config: any, startDate?: Date, endDate?: Date): Promise<void> {
    try {
      // Default to syncing from January 1, 2025 to today
      const defaultStartDate = new Date('2025-01-01');
      const actualStartDate = startDate || defaultStartDate;
      const actualEndDate = endDate || new Date();

      console.log(`Starting comprehensive historical sync for ${config.merchantName}`);
      console.log(`Date range: ${actualStartDate.toISOString()} to ${actualEndDate.toISOString()}`);

      await storage.createIntegrationLog({
        system: 'clover',
        operation: 'sync_historical_sales',
        status: 'in_progress',
        message: `Starting historical sales sync for ${config.merchantName} from ${actualStartDate.toDateString()} to ${actualEndDate.toDateString()}`
      });

      const startTimestamp = actualStartDate.getTime();
      const endTimestamp = actualEndDate.getTime();

      // Fetch all orders in the date range with pagination
      let allOrders = [];
      let offset = 0;
      const limit = 1000; // Maximum allowed by Clover API
      let hasMoreData = true;

      while (hasMoreData) {
        console.log(`Fetching orders batch: offset=${offset}, limit=${limit} for ${config.merchantName}`);
        
        const ordersResponse = await this.makeCloverAPICallWithConfig(
          `orders?filter=createdTime>=${startTimestamp}&createdTime<=${endTimestamp}&expand=lineItems,payments&limit=${limit}&offset=${offset}`,
          config
        );

        if (!ordersResponse || !ordersResponse.elements || ordersResponse.elements.length === 0) {
          hasMoreData = false;
          break;
        }

        allOrders.push(...ordersResponse.elements);
        console.log(`Fetched ${ordersResponse.elements.length} orders for ${config.merchantName}, total so far: ${allOrders.length}`);

        // Check if we have more data to fetch
        if (ordersResponse.elements.length < limit) {
          hasMoreData = false;
        } else {
          offset += limit;
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`Total orders fetched for ${config.merchantName}: ${allOrders.length}`);

      let processedCount = 0;
      let skippedCount = 0;

      for (const order of allOrders) {
        try {
          // Check if this order is already synced
          const existingSale = await storage.getPosSaleByCloverOrderId(order.id);
          if (existingSale) {
            skippedCount++;
            continue;
          }

          // Process the order and create POS sale record
          const totalAmount = parseFloat(order.total) / 100; // Clover amounts are in cents
          const taxAmount = parseFloat(order.taxAmount || '0') / 100;
          const tipAmount = parseFloat(order.tipAmount || '0') / 100;
          const orderDate = new Date(order.createdTime);

          const saleData = {
            saleDate: orderDate.toISOString().split('T')[0],
            saleTime: orderDate,
            totalAmount: totalAmount.toString(),
            taxAmount: taxAmount.toString(),
            tipAmount: tipAmount.toString(),
            paymentMethod: order.payType || 'unknown',
            cloverOrderId: order.id,
            locationId: config.id || 1
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
          if (processedCount % 50 === 0) {
            console.log(`Historical sync progress for ${config.merchantName}: ${processedCount} orders processed`);
          }
        } catch (orderError) {
          console.error(`Error processing order ${order.id} for ${config.merchantName}:`, orderError);
          // Continue with next order instead of failing the entire sync
        }
      }

      // Log successful completion
      await storage.createIntegrationLog({
        system: 'clover',
        operation: 'sync_historical_sales',
        status: 'success',
        message: `Historical sync completed for ${config.merchantName}: ${processedCount} new orders processed, ${skippedCount} orders already existed`
      });

      console.log(`Historical sync for ${config.merchantName} completed: ${processedCount} new orders, ${skippedCount} skipped`);

    } catch (error) {
      console.error(`Error in historical sync for ${config.merchantName}:`, error);
      
      await storage.createIntegrationLog({
        system: 'clover',
        operation: 'sync_historical_sales',
        status: 'error',
        message: `Historical sync failed for ${config.merchantName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      throw error;
    }
  }

  // Test connection to Clover
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Use merchant endpoint to test connection and get merchant info
      const response = await this.makeCloverAPICallWithConfig('', this.config);
      
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

  // Comprehensive order sync with line items, payments, and discounts
  async syncOrdersComprehensive(options: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    newOrders: number;
    updatedOrders: number;
    totalProcessed: number;
  }> {
    try {
      const startDate = options.startDate ? new Date(options.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days ago
      const endDate = options.endDate ? new Date(options.endDate) : new Date();
      
      console.log(`Starting comprehensive order sync for ${this.config.merchantId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      const startTimestamp = startDate.getTime();
      const endTimestamp = endDate.getTime();

      // Fetch all orders in the date range with pagination
      let allOrders = [];
      let offset = 0;
      const limit = 1000; // Maximum allowed by Clover API
      let hasMoreData = true;

      while (hasMoreData) {
        console.log(`Fetching orders batch: offset=${offset}, limit=${limit}`);
        
        const ordersResponse = await this.makeCloverAPICallWithConfig(
          `orders?filter=createdTime>=${startTimestamp}&createdTime<=${endTimestamp}&expand=lineItems,payments,discounts&limit=${limit}&offset=${offset}`,
          this.config
        );

        if (!ordersResponse || !ordersResponse.elements || ordersResponse.elements.length === 0) {
          hasMoreData = false;
          break;
        }

        allOrders.push(...ordersResponse.elements);
        console.log(`Fetched ${ordersResponse.elements.length} orders, total so far: ${allOrders.length}`);

        // Check if we have more data to fetch
        if (ordersResponse.elements.length < limit) {
          hasMoreData = false;
        } else {
          offset += limit;
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`Total orders fetched: ${allOrders.length}`);

      let newOrders = 0;
      let updatedOrders = 0;
      let totalProcessed = 0;

      for (const order of allOrders) {
        try {
          // Check if this order is already synced
          const existingSale = await storage.getPosSaleByCloverOrderId(order.id);
          
          if (existingSale) {
            // Update existing order if needed
            const modifiedTime = new Date(order.modifiedTime);
            const existingModifiedTime = new Date(existingSale.saleTime);
            
            if (modifiedTime > existingModifiedTime) {
              // Update existing order
              const totalAmount = parseFloat(order.total) / 100;
              const taxAmount = parseFloat(order.taxAmount || '0') / 100;
              const tipAmount = parseFloat(order.tipAmount || '0') / 100;

              await storage.updatePosSale(existingSale.id, {
                totalAmount: totalAmount.toString(),
                taxAmount: taxAmount.toString(),
                tipAmount: tipAmount.toString(),
                paymentMethod: order.payType || 'unknown',
                saleTime: new Date(order.modifiedTime)
              });

              updatedOrders++;
            }
          } else {
            // Create new order
            const totalAmount = parseFloat(order.total) / 100;
            const taxAmount = parseFloat(order.taxAmount || '0') / 100;
            const tipAmount = parseFloat(order.tipAmount || '0') / 100;
            const orderDate = new Date(order.createdTime);

            const saleData = {
              saleDate: orderDate.toISOString().split('T')[0],
              saleTime: orderDate,
              totalAmount: totalAmount.toString(),
              taxAmount: taxAmount.toString(),
              tipAmount: tipAmount.toString(),
              paymentMethod: order.payType || 'unknown',
              cloverOrderId: order.id,
              locationId: this.config.id || 1
            };

            const createdSale = await storage.createPosSale(saleData);

            // Process line items if they exist
            if (order.lineItems && order.lineItems.elements) {
              for (const lineItem of order.lineItems.elements) {
                const itemAmount = parseFloat(lineItem.price) / 100;
                const quantity = lineItem.quantity || 1;
                const lineTotal = itemAmount * quantity;
                
                // CRITICAL FIX: Try to link to inventory item for COGS calculation
                let inventoryItemId = null;
                let costBasis = '0.00';
                
                try {
                  // Map Clover line item to inventory item by SKU (Clover item ID)
                  const cloverItemId = lineItem.item?.id || lineItem.id;
                  if (cloverItemId) {
                    const inventoryItems = await storage.getInventoryItemsBySKU(cloverItemId);
                    const inventoryItem = inventoryItems.length > 0 ? inventoryItems[0] : null;
                    
                    if (inventoryItem) {
                      inventoryItemId = inventoryItem.id;
                      // Use standard cost for COGS, fallback to unit cost
                      costBasis = inventoryItem.standardCost || inventoryItem.unitCost || '0.00';
                      console.log(`🔗 COGS: Linked "${lineItem.name}" to inventory item ${inventoryItemId} (Cost: $${costBasis})`);
                    } else {
                      console.log(`⚠️ COGS: No inventory match for item "${lineItem.name}" (SKU: ${cloverItemId})`);
                    }
                  }
                } catch (error) {
                  console.log(`❌ COGS: Error linking item "${lineItem.name}":`, error);
                }
                
                const itemData = {
                  saleId: createdSale.id,
                  inventoryItemId: inventoryItemId, // FIXED: Include inventory item ID for COGS
                  itemName: lineItem.name,
                  quantity: quantity.toString(),
                  unitPrice: itemAmount.toString(),
                  lineTotal: lineTotal.toString(),
                  costBasis: costBasis, // FIXED: Include cost for COGS calculation
                  discountAmount: lineItem.discountAmount ? (parseFloat(lineItem.discountAmount) / 100).toString() : '0.00'
                };

                await storage.createPosSaleItem(itemData);
              }
            }

            newOrders++;
          }

          totalProcessed++;
          
          if (totalProcessed % 100 === 0) {
            console.log(`Order sync progress: ${totalProcessed} orders processed`);
          }
        } catch (orderError) {
          console.error(`Error processing order ${order.id}:`, orderError);
          // Continue with next order instead of failing the entire sync
        }
      }

      // Log successful completion
      await storage.createIntegrationLog({
        system: 'clover',
        operation: 'sync_orders_comprehensive',
        status: 'success',
        message: `Comprehensive order sync completed: ${newOrders} new orders, ${updatedOrders} updated orders, ${totalProcessed} total processed`
      });

      console.log(`Comprehensive order sync completed: ${newOrders} new orders, ${updatedOrders} updated orders, ${totalProcessed} total processed`);

      return {
        newOrders,
        updatedOrders,
        totalProcessed
      };

    } catch (error) {
      console.error('Error in comprehensive order sync:', error);
      
      await storage.createIntegrationLog({
        system: 'clover',
        operation: 'sync_orders_comprehensive',
        status: 'error',
        message: `Comprehensive order sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      throw error;
    }
  }
}

export const cloverIntegration = new CloverIntegration();