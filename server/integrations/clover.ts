import { storage } from '../storage';

// Clover API Configuration
interface CloverConfig {
  id?: number;
  merchantId: string;
  merchantName?: string;
  locationId?: number; // REQUIRED: Maps to locations table
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
        id: dbConfig.id,
        merchantId: dbConfig.merchantId,
        merchant_id: dbConfig.merchant_id,
        merchantName: dbConfig.merchantName,
        locationId: dbConfig.locationId,
        apiToken: dbConfig.apiToken ? 'HAS_TOKEN' : 'MISSING',
        api_token: dbConfig.api_token ? 'HAS_TOKEN' : 'MISSING'
      });
      
      // CRITICAL: Pass through ALL fields from database config
      this.config = {
        id: dbConfig.id,
        merchantId: dbConfig.merchantId || dbConfig.merchant_id,
        merchantName: dbConfig.merchantName || dbConfig.merchant_name, // Required for error messages
        locationId: dbConfig.locationId || dbConfig.location_id, // REQUIRED: Maps to locations table
        accessToken: dbConfig.apiToken || dbConfig.api_token,
        baseUrl: dbConfig.baseUrl || dbConfig.base_url || 'https://api.clover.com'
      };
      
      console.log(`🔧 Final config created:`, {
        id: this.config.id,
        merchantId: this.config.merchantId,
        merchantName: this.config.merchantName,
        locationId: this.config.locationId,
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

  // Make authenticated API calls to Clover with specific config (with retry logic)
  private async makeCloverAPICallWithConfig(endpoint: string, config: any, method: 'GET' | 'POST' | 'PUT' = 'GET', body?: any, retries = 3): Promise<any> {
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
        },
        // Add timeout: 60 seconds for large responses
        signal: AbortSignal.timeout(60000)
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
      // Retry logic for network errors and timeouts
      if (retries > 0 && (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('fetch failed')))) {
        console.warn(`⚠️ API call failed (${error.message}), retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        return this.makeCloverAPICallWithConfig(endpoint, config, method, body, retries - 1);
      }
      
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
    
    // Properly encode the filter parameter
    if (params.filter) {
      queryParams.append('filter', params.filter);
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `items?${queryString}` : 'items';
    
    console.log(`📦 Fetching inventory items for merchant ${this.config.merchantId} with filter: ${params.filter || 'none'}`);
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
    
    // Expand to include categories, tags, AND code (UPC barcode) in response
    params.append('expand', 'categories,tags,code');
    
    const queryString = params.toString();
    // Use /items endpoint instead of /inventory/items to get UPC codes
    const endpoint = queryString ? `items?${queryString}` : 'items';
    
    console.log(`📦 Fetching inventory items from: ${endpoint}`);
    return await this.makeCloverAPICallWithConfig(endpoint, this.config);
  }

  // Get inventory item stocks in bulk using supported endpoint
  async fetchAllItemStocks(): Promise<Map<string, any>> {
    const stockMap = new Map<string, any>();
    let offset = 0;
    const limit = 1000;
    let hasMoreData = true;

    console.log(`📊 Fetching stock data using /item_stocks endpoint...`);

    while (hasMoreData) {
      try {
        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        params.append('offset', offset.toString());
        params.append('expand', 'item');

        const endpoint = `item_stocks?${params.toString()}`;
        const stockResponse = await this.makeCloverAPICallWithConfig(endpoint, this.config);
        
        if (!stockResponse || !stockResponse.elements || stockResponse.elements.length === 0) {
          hasMoreData = false;
          break;
        }

        // Map stock data by item ID
        for (const stockData of stockResponse.elements) {
          if (stockData.item && stockData.item.id) {
            stockMap.set(stockData.item.id, stockData);
          }
        }

        console.log(`📊 Fetched ${stockResponse.elements.length} stock records, total so far: ${stockMap.size}`);

        if (stockResponse.elements.length < limit) {
          hasMoreData = false;
        } else {
          offset += limit;
        }
      } catch (error) {
        console.warn(`⚠️ Could not fetch stock data batch at offset ${offset}:`, error);
        hasMoreData = false;
      }

      // Rate limiting between batches
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`✅ Total stock records fetched: ${stockMap.size}`);
    return stockMap;
  }

  // Get all inventory items with their stock data using proper inventory endpoints  
  async fetchAllInventoryItemsWithStocks(): Promise<any[]> {
    const inventoryItems = [];
    let offset = 0;
    const limit = 100;
    let hasMoreData = true;

    console.log(`🔄 Using Clover Inventory API endpoints for accurate cost data...`);

    // Fetch all stock data in bulk first
    const stockMap = await this.fetchAllItemStocks();

    while (hasMoreData) {
      console.log(`📦 Fetching inventory items: offset=${offset}, limit=${limit}`);
      
      try {
        const itemsResponse = await this.fetchInventoryItems({ limit, offset });
        
        if (!itemsResponse || !itemsResponse.elements || itemsResponse.elements.length === 0) {
          hasMoreData = false;
          break;
        }

        // Merge stock data with items
        for (const item of itemsResponse.elements) {
          const stockData = stockMap.get(item.id);
          
          if (stockData) {
            item.stockInfo = stockData;
            const cost = stockData?.cost ? (parseFloat(stockData.cost) / 100).toFixed(2) : '0.00';
            const stock = stockData?.quantity || 0;
            console.log(`📊 Item ${item.name}: Cost=$${cost}, Stock=${stock}`);
          } else {
            // Use stockCount from item if available, otherwise mark as unavailable
            item.stockInfo = null;
            item.stockSyncStatus = 'no_stock_record';
            if (item.stockCount !== undefined) {
              console.log(`📊 Item ${item.name}: Using stockCount=${item.stockCount} (no detailed stock record)`);
            } else {
              console.log(`📊 Item ${item.name}: No stock data available`);
            }
          }
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

    console.log(`🔄 Total inventory items fetched: ${inventoryItems.length}, with stock data: ${stockMap.size}`);
    return inventoryItems;
  }

  // Fetch credit refunds from Clover API
  async fetchCreditRefunds(options: {
    createdTimeMin?: number;
    createdTimeMax?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ elements: any[]; href?: string }> {
    const params = new URLSearchParams();
    
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    
    // Convert millisecond timestamps to Unix seconds for Clover API
    if (options.createdTimeMin) {
      const unixSeconds = Math.floor(options.createdTimeMin / 1000);
      params.append('createdTime.min', unixSeconds.toString());
      console.log('💸 [CLOVER REFUNDS API] Converting createdTimeMin:', { 
        milliseconds: options.createdTimeMin, 
        unixSeconds, 
        isoDate: new Date(options.createdTimeMin).toISOString() 
      });
    }
    if (options.createdTimeMax) {
      const unixSeconds = Math.floor(options.createdTimeMax / 1000);
      params.append('createdTime.max', unixSeconds.toString());
      console.log('💸 [CLOVER REFUNDS API] Converting createdTimeMax:', { 
        milliseconds: options.createdTimeMax, 
        unixSeconds, 
        isoDate: new Date(options.createdTimeMax).toISOString() 
      });
    }

    const queryString = params.toString();
    const endpoint = queryString ? `credit_refunds?${queryString}` : 'credit_refunds';
    
    console.log(`💸 [CLOVER REFUNDS] Fetching credit refunds from: ${endpoint}`);
    return await this.makeCloverAPICallWithConfig(endpoint, this.config);
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
          // Check if item already exists by Clover ID AND location ID
          const existingItems = await storage.getInventoryItemsByCloverItemId(item.id);
          const existingItem = existingItems.find(i => i.locationId === this.config.id) || null;

          // Use stock info for accurate cost data (from inventory/items/{id}/stock endpoint)
          const stockInfo = item.stockInfo;
          const accurateCost = stockInfo?.cost ? (parseFloat(stockInfo.cost) / 100).toString() : 
                              item.cost ? (parseFloat(item.cost) / 100).toString() : '0.00';
          const stockQuantity = stockInfo?.quantity || item.stockCount || 0;

          // Extract categories and tags
          const category = item.categories?.elements?.[0]?.name || 'Uncategorized';
          const tags = item.tags?.elements?.map((tag: any) => tag.name) || [];

          const itemData = {
            cloverItemId: item.id,                    // Clover's internal ID
            locationId: this.config.id,                // Clover config ID for multi-location tracking
            cloverMerchantId: this.config.merchantId,  // Clover merchant ID
            sku: item.sku || null,                     // SKU from Clover
            upc: item.code || null,                    // UPC barcode from item.code
            itemName: item.name,
            description: item.description || '',
            category: category,
            tags: tags.length > 0 ? tags : null,       // Array of tag names
            unitCost: accurateCost,                    // Enhanced cost from inventory endpoints
            unitPrice: item.price ? (parseFloat(item.price) / 100).toString() : '0.00',
            quantityOnHand: stockQuantity.toString(),
            isActive: !item.hidden,
            lastSyncAt: new Date()
          };

          if (existingItem) {
            // Update existing item
            await storage.updateInventoryItem(existingItem.id, itemData);
            updatedCount++;
            console.log(`✅ Updated: ${item.name} | UPC: ${itemData.upc || 'N/A'} | SKU: ${itemData.sku || 'N/A'} | Cost: $${itemData.unitCost}`);
          } else {
            // Create new item
            await storage.createInventoryItem(itemData);
            syncedCount++;
            console.log(`✅ Created: ${item.name} | UPC: ${itemData.upc || 'N/A'} | SKU: ${itemData.sku || 'N/A'} | Cost: $${itemData.unitCost}`);
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
    
    try {
      // Use the working item_stocks endpoint instead of the broken items/{id}/stock endpoint
      const allStocks = await this.makeCloverAPICall('item_stocks?limit=1000');
      
      if (allStocks && allStocks.elements) {
        // Find the stock data for this specific item
        const itemStock = allStocks.elements.find((stock: any) => stock.item?.id === itemId);
        
        if (itemStock) {
          console.log(`✅ Found stock data for item ${itemId}: ${itemStock.quantity} units`);
          return itemStock;
        } else {
          console.log(`📦 No stock data found for item ${itemId}`);
          return { quantity: 0, item: { id: itemId } };
        }
      }
      
      // Fallback - return zero stock
      return { quantity: 0, item: { id: itemId } };
      
    } catch (error) {
      console.log(`❌ Error fetching stock for item ${itemId}:`, error);
      return { quantity: 0, item: { id: itemId } };
    }
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

  // ================================
  // COMPREHENSIVE REPORTING METHODS
  // ================================

  // Fetch voided order line items for comprehensive reporting
  async fetchVoidedOrderLineItems(params: {
    orderId: string;
    limit?: number;
    offset?: number;
  }) {
    console.log(`🗑️ Fetching voided line items for order ${params.orderId}`);
    
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    const endpoint = queryString 
      ? `orders/${params.orderId}/line_items/voided?${queryString}` 
      : `orders/${params.orderId}/line_items/voided`;
    
    return await this.makeCloverAPICall(endpoint);
  }

  // Fetch order discounts for detailed discount tracking
  async fetchOrderDiscounts(orderId: string) {
    console.log(`💰 Fetching discounts for order ${orderId}`);
    return await this.makeCloverAPICall(`orders/${orderId}/discounts`);
  }

  // Fetch voided line items totals for accurate void reporting
  async fetchVoidedLineItemsTotals(params: {
    startDate?: string;
    endDate?: string;
    employee?: string;
  } = {}) {
    console.log(`📊 Fetching voided line items totals`);
    
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('filter', `modifiedTime>=${new Date(params.startDate).getTime()}`);
    if (params.endDate) queryParams.append('filter', `modifiedTime<=${new Date(params.endDate).getTime()}`);
    if (params.employee) queryParams.append('filter', `employee.id=${params.employee}`);

    const queryString = queryParams.toString();
    const endpoint = queryString 
      ? `line_items/voided/totals?${queryString}` 
      : `line_items/voided/totals`;
    
    return await this.makeCloverAPICall(endpoint);
  }

  // Enhanced order details fetching with complete structure
  async fetchOrderDetails(orderId: string, expand?: string[]) {
    console.log(`📋 Fetching detailed order information for ${orderId}`);
    
    const queryParams = new URLSearchParams();
    if (expand && expand.length > 0) {
      queryParams.append('expand', expand.join(','));
    } else {
      // Default comprehensive expand for single source of truth
      queryParams.append('expand', 'lineItems,payments,refunds,credits,voids,discounts,serviceCharge,lineItems.discounts,lineItems.modifications');
    }

    const queryString = queryParams.toString();
    const endpoint = `orders/${orderId}?${queryString}`;
    
    return await this.makeCloverAPICall(endpoint);
  }

  // Fetch comprehensive order line items
  async fetchOrderLineItems(orderId: string, params: {
    limit?: number;
    offset?: number;
    expand?: string[];
  } = {}) {
    console.log(`📝 Fetching line items for order ${orderId}`);
    
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.expand && params.expand.length > 0) {
      queryParams.append('expand', params.expand.join(','));
    } else {
      queryParams.append('expand', 'discounts,modifications,item');
    }

    const queryString = queryParams.toString();
    const endpoint = `orders/${orderId}/line_items?${queryString}`;
    
    return await this.makeCloverAPICall(endpoint);
  }

  // Fetch employee payment data for staff sales reporting
  async fetchEmployeePayments(params: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    console.log(`👥 Fetching employee payments`);
    
    const queryParams = new URLSearchParams();
    if (params.employeeId) queryParams.append('filter', `employee.id=${params.employeeId}`);
    if (params.startDate) queryParams.append('filter', `modifiedTime>=${new Date(params.startDate).getTime()}`);
    if (params.endDate) queryParams.append('filter', `modifiedTime<=${new Date(params.endDate).getTime()}`);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    const endpoint = queryString ? `payments?${queryString}` : 'payments';
    
    return await this.makeCloverAPICall(endpoint);
  }

  // Get revenue for a date range
  async getRevenue(startDate: Date, endDate: Date): Promise<number> {
    try {
      const startMs = startDate.getTime();
      const endMs = endDate.getTime();
      
      // Fetch all orders in the date range with payments expanded
      const ordersResponse = await this.fetchOrders({
        createdTimeMin: startMs,
        createdTimeMax: endMs,
        expand: 'lineItems,payments,discounts',
        limit: 1000
      });
      
      const orders = ordersResponse?.elements || [];
      let totalRevenue = 0;
      
      for (const order of orders) {
        // Skip voided or refunded orders
        if (order.state === 'open' || order.paymentState !== 'PAID') {
          continue;
        }
        
        // Sum all payments for this order (amounts are in cents)
        if (order.payments && Array.isArray(order.payments)) {
          for (const payment of order.payments) {
            if (payment.result === 'SUCCESS') {
              totalRevenue += (payment.amount || 0) / 100; // Convert cents to dollars
            }
          }
        }
      }
      
      // Fetch and subtract refunds
      const refundsResponse = await this.fetchCreditRefunds({
        createdTimeMin: startMs,
        createdTimeMax: endMs,
        limit: 1000
      });
      
      const refunds = refundsResponse?.elements || [];
      for (const refund of refunds) {
        totalRevenue -= (refund.amount || 0) / 100; // Convert cents to dollars and subtract
      }
      
      return totalRevenue;
    } catch (error) {
      console.error(`Error getting revenue:`, error);
      return 0;
    }
  }

  // Comprehensive order data aggregation for single source of truth
  async fetchComprehensiveOrderData(orderId: string) {
    console.log(`🎯 Fetching comprehensive order data for ${orderId}`);
    
    try {
      const [
        orderDetails,
        lineItems,
        discounts,
        voidedItems,
        refunds
      ] = await Promise.allSettled([
        this.fetchOrderDetails(orderId),
        this.fetchOrderLineItems(orderId),
        this.fetchOrderDiscounts(orderId),
        this.fetchVoidedOrderLineItems({ orderId }),
        this.fetchCreditRefunds({})
      ]);

      return {
        orderDetails: orderDetails.status === 'fulfilled' ? orderDetails.value : null,
        lineItems: lineItems.status === 'fulfilled' ? lineItems.value : null,
        discounts: discounts.status === 'fulfilled' ? discounts.value : null,
        voidedItems: voidedItems.status === 'fulfilled' ? voidedItems.value : null,
        refunds: refunds.status === 'fulfilled' ? refunds.value : null,
        errors: {
          orderDetails: orderDetails.status === 'rejected' ? orderDetails.reason : null,
          lineItems: lineItems.status === 'rejected' ? lineItems.reason : null,
          discounts: discounts.status === 'rejected' ? discounts.reason : null,
          voidedItems: voidedItems.status === 'rejected' ? voidedItems.reason : null,
          refunds: refunds.status === 'rejected' ? refunds.reason : null
        }
      };
    } catch (error) {
      console.error(`❌ Error fetching comprehensive order data for ${orderId}:`, error);
      throw error;
    }
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
            
            // Try to link to inventory item for cost tracking and COGS
            let inventoryItemId = null;
            let costBasis = null;
            
            if (lineItem.item && lineItem.item.id) {
              try {
                const inventoryItems = await storage.getInventoryItemsByCloverItemId(lineItem.item.id);
                // Filter by location if we have multiple items with same Clover ID
                const inventoryItem = inventoryItems.find(item => item.locationId === config.id) || inventoryItems[0];
                if (inventoryItem) {
                  inventoryItemId = inventoryItem.id;
                  // Use standardCost first, fallback to unitCost - explicit positive value check
                  const standardCost = parseFloat(inventoryItem.standardCost || '0');
                  const unitCost = parseFloat(inventoryItem.unitCost || '0');
                  const finalCost = standardCost > 0 ? standardCost : unitCost;
                  if (finalCost > 0) {
                    costBasis = finalCost.toFixed(2);
                    console.log(`🔗 Linked sale item "${lineItem.name}" to inventory item ${inventoryItemId} (Cost: $${costBasis})`);
                  } else {
                    console.log(`🔗 Linked sale item "${lineItem.name}" to inventory item ${inventoryItemId} but no cost data`);
                  }
                }
              } catch (error) {
                console.log(`No inventory match for item: ${lineItem.name}`);
              }
            }
            
            const itemData = {
              saleId: createdSale.id,
              inventoryItemId,
              itemName: lineItem.name,
              quantity: quantity.toString(),
              unitPrice: itemAmount.toString(),
              lineTotal: lineTotal.toString(),
              costBasis,
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
          this.config
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
              
              // Try to match this line item to inventory for COGS
              let inventoryItemId = null;
              let costBasis = null;
              
              if (lineItem.item && lineItem.item.id) {
                const inventoryItems = await storage.getInventoryItemsByCloverItemId(lineItem.item.id);
                // Filter by location if we have multiple items with same Clover ID
                const inventoryItem = inventoryItems.find(item => item.locationId === config.id) || inventoryItems[0];
                if (inventoryItem) {
                  inventoryItemId = inventoryItem.id;
                  // Use standardCost first, fallback to unitCost - explicit positive value check
                  const standardCost = parseFloat(inventoryItem.standardCost || '0');
                  const unitCost = parseFloat(inventoryItem.unitCost || '0');
                  const finalCost = standardCost > 0 ? standardCost : unitCost;
                  if (finalCost > 0) {
                    costBasis = finalCost.toFixed(2);
                  }
                }
              }
              
              const itemData = {
                saleId: createdSale.id,
                inventoryItemId,
                itemName: lineItem.name,
                quantity: quantity.toString(),
                unitPrice: itemAmount.toString(),
                lineTotal: lineTotal.toString(),
                costBasis,
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

      // Aggregate daily sales data for the synced date range
      console.log(`Starting daily aggregation for ${config.merchantName}...`);
      await this.aggregateHistoricalDailySales(config, actualStartDate, actualEndDate);
      console.log(`Daily aggregation completed for ${config.merchantName}`);

      // Log successful completion
      await storage.createIntegrationLog({
        system: 'clover',
        operation: 'sync_historical_sales',
        status: 'success',
        message: `Historical sync completed for ${config.merchantName}: ${processedCount} new orders processed, ${skippedCount} orders already existed, daily sales aggregated`
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

  // Aggregate historical daily sales data for a date range
  private async aggregateHistoricalDailySales(config: any, startDate: Date, endDate: Date): Promise<void> {
    try {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log(`Aggregating daily sales for ${config.merchantName} from ${startDateStr} to ${endDateStr}`);
      
      // Get all pos_sales for this location in the date range
      const posSalesData = await storage.getPosSalesByLocationAndDateRange(
        config.id,
        startDateStr,
        endDateStr
      );
      
      if (!posSalesData || posSalesData.length === 0) {
        console.log(`No sales data found for aggregation for ${config.merchantName}`);
        return;
      }
      
      // Group sales by date
      const salesByDate = new Map<string, typeof posSalesData>();
      posSalesData.forEach((sale: any) => {
        const dateKey = sale.saleDate;
        if (!salesByDate.has(dateKey)) {
          salesByDate.set(dateKey, []);
        }
        salesByDate.get(dateKey)!.push(sale);
      });
      
      console.log(`Found ${salesByDate.size} unique dates with sales for ${config.merchantName}`);
      
      // Aggregate each date
      let aggregatedDays = 0;
      for (const [date, sales] of Array.from(salesByDate.entries())) {
        try {
          // Calculate basic metrics
          const orderCount = sales.length;
          const customerCount = sales.reduce((sum: number, s: any) => sum + (s.customerCount || 1), 0);
          const grossSales = sales.reduce((sum: number, s: any) => sum + parseFloat(s.totalAmount || '0'), 0);
          const taxAmount = sales.reduce((sum: number, s: any) => sum + parseFloat(s.taxAmount || '0'), 0);
          const tipAmount = sales.reduce((sum: number, s: any) => sum + parseFloat(s.tipAmount || '0'), 0);
          
          // Get all line items for these sales to calculate discounts and COGS
          const saleIds = sales.map((s: any) => s.id);
          const lineItems = await storage.getPosSaleItemsBySaleIds(saleIds);
          
          const itemCount = lineItems.reduce((sum: number, item: any) => sum + parseInt(item.quantity || '0'), 0);
          const totalDiscounts = lineItems.reduce((sum: number, item: any) => sum + parseFloat(item.discountAmount || '0'), 0);
          const totalCogs = lineItems.reduce((sum: number, item: any) => {
            const quantity = parseInt(item.quantity || '0');
            const cost = parseFloat(item.costBasis || '0');
            return sum + (quantity * cost);
          }, 0);
          
          // Calculate derived metrics
          const netSales = grossSales - totalDiscounts;
          const totalRevenue = grossSales; // Total amount already includes tax
          const grossMargin = netSales - totalCogs;
          const grossMarginPercent = netSales > 0 ? (grossMargin / netSales) * 100 : 0;
          
          // Calculate payment breakdowns
          const paymentBreakdown: any = {};
          sales.forEach((sale: any) => {
            const method = sale.paymentMethod || 'unknown';
            const amount = parseFloat(sale.totalAmount || '0');
            if (!paymentBreakdown[method]) {
              paymentBreakdown[method] = { count: 0, amount: 0 };
            }
            paymentBreakdown[method].count++;
            paymentBreakdown[method].amount += amount;
          });
          
          // Get refund data if any exist
          const refunds = await storage.getRefundsByDateAndLocation(date, config.id);
          const refundCount = refunds.length;
          const refundAmount = refunds.reduce((sum: number, r: any) => sum + parseFloat(r.refundAmount || '0'), 0);
          
          // Calculate average metrics
          const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
          const avgItemsPerOrder = orderCount > 0 ? itemCount / orderCount : 0;
          
          // Find peak hour (hour with most revenue)
          const hourlyRevenue = new Map<number, number>();
          sales.forEach((sale: any) => {
            if (sale.saleTime) {
              const hour = new Date(sale.saleTime).getHours();
              const amount = parseFloat(sale.totalAmount || '0');
              hourlyRevenue.set(hour, (hourlyRevenue.get(hour) || 0) + amount);
            }
          });
          
          let peakHour = null;
          let peakHourRevenue = 0;
          hourlyRevenue.forEach((revenue, hour) => {
            if (revenue > peakHourRevenue) {
              peakHourRevenue = revenue;
              peakHour = hour;
            }
          });
          
          // Create daily sales record
          const dailySalesData = {
            merchantId: config.merchantId || 1,
            locationId: config.id,
            channel: 'pos',
            date,
            orderCount,
            itemCount,
            customerCount,
            grossSales: grossSales.toFixed(2),
            discounts: totalDiscounts.toFixed(2),
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
            avgOrderValue: avgOrderValue.toFixed(2),
            avgItemsPerOrder: avgItemsPerOrder.toFixed(2),
            peakHour,
            peakHourRevenue: peakHourRevenue.toFixed(2),
            topCategories: [], // Could be enhanced later if needed
            dataCompleteness: '100' // Historical data is complete
          };
          
          // Check if daily sales record exists and update or create
          const existing = await storage.getDailySalesByLocationAndDate(config.id, date);
          if (existing) {
            await storage.updateDailySales(existing.id, dailySalesData);
          } else {
            await storage.createDailySales(dailySalesData);
          }
          
          aggregatedDays++;
          if (aggregatedDays % 10 === 0) {
            console.log(`Aggregated ${aggregatedDays}/${salesByDate.size} days for ${config.merchantName}`);
          }
        } catch (dateError) {
          console.error(`Error aggregating date ${date} for ${config.merchantName}:`, dateError);
          // Continue with next date
        }
      }
      
      console.log(`Daily aggregation completed: ${aggregatedDays} days processed for ${config.merchantName}`);
      
    } catch (error) {
      console.error(`Error in aggregateHistoricalDailySales for ${config.merchantName}:`, error);
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
              
              // Calculate tax from payments instead of using null taxAmount
              let taxAmount = 0;
              if (order.payments && order.payments.elements && order.payments.elements.length > 0) {
                const paymentsWithTax = order.payments.elements.filter((p: any) => parseFloat(p.taxAmount || '0') > 0).length;
                taxAmount = order.payments.elements.reduce((sum: number, payment: any) => {
                  return sum + parseFloat(payment.taxAmount || '0');
                }, 0) / 100;
                
                if (taxAmount === 0 && paymentsWithTax === 0) {
                  console.log(`⚠️ Order ${order.id}: No tax data in ${order.payments.elements.length} payment(s)`);
                } else if (taxAmount > 0) {
                  console.log(`✅ Order ${order.id}: Tax=$${taxAmount.toFixed(2)} from ${paymentsWithTax} payment(s)`);
                }
              } else {
                console.log(`⚠️ Order ${order.id}: No payment data available for tax calculation`);
              }
              
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
            
            // Calculate tax from payments instead of using null taxAmount
            let taxAmount = 0;
            if (order.payments && order.payments.elements && order.payments.elements.length > 0) {
              const paymentsWithTax = order.payments.elements.filter((p: any) => parseFloat(p.taxAmount || '0') > 0).length;
              taxAmount = order.payments.elements.reduce((sum: number, payment: any) => {
                return sum + parseFloat(payment.taxAmount || '0');
              }, 0) / 100;
              
              if (taxAmount === 0 && paymentsWithTax === 0) {
                console.log(`⚠️ Order ${order.id}: No tax data in ${order.payments.elements.length} payment(s)`);
              } else if (taxAmount > 0) {
                console.log(`✅ Order ${order.id}: Tax=$${taxAmount.toFixed(2)} from ${paymentsWithTax} payment(s)`);
              }
            } else {
              console.log(`⚠️ Order ${order.id}: No payment data available for tax calculation`);
            }
            
            const tipAmount = parseFloat(order.tipAmount || '0') / 100;
            const orderDate = new Date(order.createdTime);

            // CRITICAL: Runtime guard to ensure location mapping exists
            if (!this.config.locationId) {
              throw new Error(`Clover config ${this.config.merchantId} (${this.config.merchantName}) is missing required locationId mapping`);
            }

            const saleData = {
              saleDate: orderDate.toISOString().split('T')[0],
              saleTime: orderDate,
              totalAmount: totalAmount.toString(),
              taxAmount: taxAmount.toString(),
              tipAmount: tipAmount.toString(),
              paymentMethod: order.payType || 'unknown',
              cloverOrderId: order.id,
              locationId: this.config.locationId // FIXED: Use config.locationId instead of config.id
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