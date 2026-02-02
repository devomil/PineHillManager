import { storage } from '../storage';

// Clover API Configuration
interface CloverConfig {
  id?: number;
  merchantId: string;
  accessToken: string;
  baseUrl: string;
}

interface CloverItem {
  id: string;
  name: string;
  price: number;
  sku?: string;
  stockCount?: number;
}

export class CloverInventoryService {
  private config: CloverConfig | null = null;

  constructor(config?: CloverConfig) {
    if (config) {
      this.config = config;
    }
  }

  /**
   * Initialize service with merchant configuration
   */
  async initialize(merchantId: string): Promise<void> {
    const config = await storage.getCloverConfig(merchantId);
    
    if (!config) {
      throw new Error(`Clover configuration not found for merchant: ${merchantId}`);
    }

    this.config = {
      id: config.id,
      merchantId: config.merchantId,
      accessToken: config.apiToken || '',
      baseUrl: `https://api.clover.com/v3/merchants/${config.merchantId}`
    };
  }

  /**
   * Make API call to Clover
   */
  private async makeAPICall(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any): Promise<any> {
    if (!this.config) {
      throw new Error('CloverInventoryService not initialized. Call initialize() first.');
    }

    const url = `${this.config.baseUrl}/${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    console.log(`🔧 [CLOVER INVENTORY] ${method} ${url}`);
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [CLOVER INVENTORY] API error:`, errorText);
      throw new Error(`Clover API error: ${response.status} ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Search for inventory item by SKU or barcode
   */
  async findItemBySku(sku: string): Promise<CloverItem | null> {
    try {
      // Search items with SKU filter
      const response = await this.makeAPICall(`items?filter=sku=${encodeURIComponent(sku)}`);
      
      if (response.elements && response.elements.length > 0) {
        return response.elements[0];
      }

      return null;
    } catch (error) {
      console.error(`❌ [CLOVER INVENTORY] Error finding item by SKU ${sku}:`, error);
      throw error;
    }
  }

  /**
   * Get current stock count for an item using item_stocks endpoint with pagination
   * Returns 0 if no stock record exists but tracking is enabled, null only if tracking is disabled
   */
  async getStockCount(itemId: string): Promise<number | null> {
    try {
      // Paginate through all stock records to find this item
      let offset = 0;
      const limit = 1000;
      let hasMoreData = true;
      
      while (hasMoreData) {
        const response = await this.makeAPICall(`item_stocks?limit=${limit}&offset=${offset}&expand=item`);
        
        if (response && response.elements && response.elements.length > 0) {
          // Find the stock data for this specific item
          const itemStock = response.elements.find((stock: any) => stock.item?.id === itemId);
          
          if (itemStock) {
            console.log(`📊 [CLOVER INVENTORY] Found stock for item ${itemId}: ${itemStock.quantity} units (offset ${offset})`);
            return itemStock.quantity ?? 0;
          }
          
          // Check if there's more data
          if (response.elements.length < limit) {
            hasMoreData = false;
          } else {
            offset += limit;
            console.log(`📦 [CLOVER INVENTORY] Item ${itemId} not in first ${offset} stock records, checking next batch...`);
          }
        } else {
          hasMoreData = false;
        }
      }
      
      // No stock record found - check if item has stock tracking enabled at item level
      console.log(`📦 [CLOVER INVENTORY] No stock record in item_stocks for item ${itemId} after searching all ${offset} records, checking item directly...`);
      
      try {
        const itemResponse = await this.makeAPICall(`items/${itemId}`);
        if (itemResponse && itemResponse.trackingStock === true) {
          // Stock tracking is enabled but no stock record exists yet - assume 0 stock
          console.log(`📦 [CLOVER INVENTORY] Item ${itemId} has trackingStock=true, assuming 0 stock`);
          return 0;
        }
      } catch (itemError) {
        console.log(`📦 [CLOVER INVENTORY] Could not check item trackingStock property`);
      }
      
      return null;
    } catch (error) {
      console.error(`❌ [CLOVER INVENTORY] Error getting stock count for item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Update stock count for an item using item_stocks endpoint
   */
  async updateStockCount(itemId: string, newStockCount: number): Promise<void> {
    try {
      // Clover requires item_stocks endpoint for stock updates
      await this.makeAPICall(`item_stocks/${itemId}`, 'POST', {
        item: { id: itemId },
        quantity: newStockCount
      });
      
      console.log(`✅ [CLOVER INVENTORY] Updated stock count for item ${itemId} to ${newStockCount}`);
    } catch (error) {
      console.error(`❌ [CLOVER INVENTORY] Error updating stock count for item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Deduct quantity from item's stock count
   */
  async deductStock(sku: string, quantityToDeduct: number): Promise<{ success: boolean; newStockCount?: number; error?: string }> {
    try {
      // Find the item by SKU
      const item = await this.findItemBySku(sku);
      
      if (!item) {
        console.warn(`⚠️ [CLOVER INVENTORY] Item not found with SKU: ${sku}`);
        return {
          success: false,
          error: `Item not found with SKU: ${sku}`
        };
      }

      // Get current stock count
      const currentStock = await this.getStockCount(item.id);
      
      if (currentStock === null) {
        console.warn(`⚠️ [CLOVER INVENTORY] Stock tracking not enabled for item: ${item.name} (${sku})`);
        return {
          success: false,
          error: `Stock tracking not enabled for item: ${item.name}`
        };
      }

      // Calculate new stock count
      const newStockCount = Math.max(0, currentStock - quantityToDeduct);
      
      // Update stock count
      await this.updateStockCount(item.id, newStockCount);
      
      console.log(`✅ [CLOVER INVENTORY] Deducted ${quantityToDeduct} units from ${item.name} (${sku}). Stock: ${currentStock} → ${newStockCount}`);
      
      return {
        success: true,
        newStockCount
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [CLOVER INVENTORY] Error deducting stock for SKU ${sku}:`, error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Batch deduct multiple items from inventory
   */
  async batchDeductStock(items: Array<{ sku: string; quantity: number; itemName: string }>): Promise<{
    success: boolean;
    results: Array<{ sku: string; itemName: string; success: boolean; newStockCount?: number; error?: string }>;
  }> {
    const results: Array<{ sku: string; itemName: string; success: boolean; newStockCount?: number; error?: string }> = [];
    let allSuccessful = true;

    for (const { sku, quantity, itemName } of items) {
      const result = await this.deductStock(sku, quantity);
      
      results.push({
        sku,
        itemName,
        success: result.success,
        newStockCount: result.newStockCount,
        error: result.error
      });

      if (!result.success) {
        allSuccessful = false;
      }
    }

    return {
      success: allSuccessful,
      results
    };
  }
}

// Export the class for creating instances per request
// DO NOT export a singleton to avoid credential mixing between concurrent requests
