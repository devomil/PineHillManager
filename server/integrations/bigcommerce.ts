/**
 * BigCommerce API Integration
 * Manages product data sync for training module creation
 * Plus order management for marketplace fulfillment
 */

export interface BigCommerceProduct {
  id: number;
  name: string;
  description: string;
  categories?: number[];
  brand_id?: number;
  sku?: string;
  inventory_level?: number;
  price?: number;
  images?: Array<{
    url_standard: string;
    is_thumbnail: boolean;
    sort_order: number;
  }>;
  custom_fields?: Array<{
    name: string;
    value: string;
  }>;
}

export interface BigCommerceOrder {
  id: number;
  date_created: string;
  date_modified: string;
  date_shipped: string;
  status_id: number;
  status: string;
  subtotal_ex_tax: string;
  subtotal_inc_tax: string;
  subtotal_tax: string;
  base_shipping_cost: string;
  shipping_cost_ex_tax: string;
  shipping_cost_inc_tax: string;
  shipping_cost_tax: string;
  handling_cost_ex_tax: string;
  handling_cost_inc_tax: string;
  wrapping_cost_ex_tax: string;
  wrapping_cost_inc_tax: string;
  total_ex_tax: string;
  total_inc_tax: string;
  total_tax: string;
  items_total: number;
  items_shipped: number;
  payment_method: string;
  payment_status: string;
  refunded_amount: string;
  order_is_digital: boolean;
  store_credit_amount: string;
  gift_certificate_amount: string;
  ip_address: string;
  currency_code: string;
  currency_exchange_rate: string;
  default_currency_code: string;
  customer_id: number;
  customer_message: string;
  billing_address: BigCommerceAddress;
  products: { url: string; resource: string };
  shipping_addresses: { url: string; resource: string };
  coupons: { url: string; resource: string };
  external_id?: string;
  external_source?: string;
  order_source?: string;
}

export interface BigCommerceAddress {
  first_name: string;
  last_name: string;
  company: string;
  street_1: string;
  street_2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  country_iso2: string;
  phone: string;
  email: string;
}

export interface BigCommerceOrderProduct {
  id: number;
  order_id: number;
  product_id: number;
  variant_id: number;
  order_address_id: number;
  name: string;
  sku: string;
  type: string;
  base_price: string;
  price_ex_tax: string;
  price_inc_tax: string;
  price_tax: string;
  base_total: string;
  total_ex_tax: string;
  total_inc_tax: string;
  total_tax: string;
  weight: string;
  quantity: number;
  quantity_shipped: number;
  base_cost_price: string;
  cost_price_ex_tax: string;
  cost_price_inc_tax: string;
  cost_price_tax: string;
}

export interface BigCommerceShipment {
  id?: number;
  order_id?: number;
  tracking_number: string;
  shipping_method?: string;
  shipping_provider: string;
  tracking_carrier?: string;
  comments?: string;
  order_address_id: number;
  items: Array<{
    order_product_id: number;
    quantity: number;
  }>;
}

export interface BigCommerceOrderStatus {
  id: number;
  name: string;
  system_label: string;
  custom_label: string;
  system_description: string;
  order: number;
}

export class BigCommerceIntegration {
  private storeHash: string;
  private accessToken: string;
  private baseUrl: string;

  constructor() {
    const rawStoreHash = process.env.BIGCOMMERCE_STORE_HASH || '';
    
    // Extract store hash from URL if full URL was provided
    // Expected: just "fgfzksauss" but might be "https://api.bigcommerce.com/stores/fgfzksauss/v3/"
    if (rawStoreHash.includes('bigcommerce.com')) {
      const match = rawStoreHash.match(/stores\/([^\/]+)/);
      this.storeHash = match ? match[1] : rawStoreHash;
      console.log(`📦 Extracted store hash from URL: ${this.storeHash}`);
    } else {
      this.storeHash = rawStoreHash;
    }
    
    this.accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN || '';
    this.baseUrl = `https://api.bigcommerce.com/stores/${this.storeHash}/v3`;

    if (!this.storeHash || !this.accessToken) {
      console.warn('BigCommerce credentials not configured');
    } else {
      console.log(`✅ BigCommerce configured with store hash: ${this.storeHash}`);
    }
  }

  /**
   * Fetch all products from BigCommerce
   */
  async getProducts(limit: number = 250): Promise<BigCommerceProduct[]> {
    if (!this.storeHash || !this.accessToken) {
      throw new Error('BigCommerce API credentials not configured');
    }

    try {
      const products: BigCommerceProduct[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && products.length < limit) {
        const url = `${this.baseUrl}/catalog/products?limit=250&page=${page}&include=images`;
        console.log(`🛒 Calling BigCommerce API: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'X-Auth-Token': this.accessToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`❌ BigCommerce API error response:`, {
            status: response.status,
            statusText: response.statusText,
            url,
            storeHash: this.storeHash,
            body: errorBody
          });
          throw new Error(`BigCommerce API error: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        const data = await response.json();
        
        if (!data.data || !Array.isArray(data.data)) {
          console.error(`❌ Unexpected BigCommerce response structure:`, data);
          throw new Error('Unexpected response structure from BigCommerce API');
        }
        
        console.log(`✅ Fetched ${data.data.length} products from BigCommerce (page ${page})`);
        products.push(...data.data);

        // Check if there are more pages
        hasMore = data.meta?.pagination?.current_page < data.meta?.pagination?.total_pages;
        page++;
      }

      console.log(`✅ Total BigCommerce products fetched: ${products.length}`);
      return products;
    } catch (error) {
      console.error('Error fetching BigCommerce products:', error);
      throw error;
    }
  }

  /**
   * Get product by ID with full details
   */
  async getProductById(productId: number): Promise<BigCommerceProduct> {
    if (!this.storeHash || !this.accessToken) {
      throw new Error('BigCommerce API credentials not configured');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/catalog/products/${productId}?include=images,custom_fields`,
        {
          headers: {
            'X-Auth-Token': this.accessToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`BigCommerce API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error(`Error fetching product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Get categories for organizing training modules
   */
  async getCategories(): Promise<Array<{ id: number; name: string; parent_id: number }>> {
    if (!this.storeHash || !this.accessToken) {
      throw new Error('BigCommerce API credentials not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/catalog/categories`, {
        headers: {
          'X-Auth-Token': this.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`BigCommerce API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  // ===========================================
  // ORDER MANAGEMENT (V2 API)
  // ===========================================

  private get baseUrlV2(): string {
    return `https://api.bigcommerce.com/stores/${this.storeHash}/v2`;
  }

  /**
   * Fetch orders from BigCommerce with optional filters
   * Status IDs: 0=Incomplete, 1=Pending, 2=Shipped, 3=Partially Shipped, 4=Refunded, 
   * 5=Cancelled, 6=Declined, 7=Awaiting Payment, 8=Awaiting Pickup, 9=Awaiting Shipment,
   * 10=Completed, 11=Awaiting Fulfillment, 12=Manual Verification Required
   */
  async getOrders(options: {
    limit?: number;
    page?: number;
    minDateCreated?: string;
    maxDateCreated?: string;
    statusId?: number;
    minId?: number;
  } = {}): Promise<BigCommerceOrder[]> {
    if (!this.storeHash || !this.accessToken) {
      throw new Error('BigCommerce API credentials not configured');
    }

    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.page) params.append('page', options.page.toString());
      if (options.minDateCreated) params.append('min_date_created', options.minDateCreated);
      if (options.maxDateCreated) params.append('max_date_created', options.maxDateCreated);
      if (options.statusId !== undefined) params.append('status_id', options.statusId.toString());
      if (options.minId) params.append('min_id', options.minId.toString());

      const url = `${this.baseUrlV2}/orders?${params.toString()}`;
      console.log(`📦 [BigCommerce] Fetching orders: ${url}`);

      const response = await fetch(url, {
        headers: {
          'X-Auth-Token': this.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (response.status === 204) {
        console.log('📦 [BigCommerce] No orders found');
        return [];
      }

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ BigCommerce Orders API error:', response.status, errorBody);
        throw new Error(`BigCommerce API error: ${response.status} ${response.statusText}`);
      }

      const orders = await response.json();
      console.log(`✅ [BigCommerce] Fetched ${orders.length} orders`);
      return orders;
    } catch (error) {
      console.error('Error fetching BigCommerce orders:', error);
      throw error;
    }
  }

  /**
   * Get a specific order by ID
   */
  async getOrderById(orderId: number): Promise<BigCommerceOrder> {
    if (!this.storeHash || !this.accessToken) {
      throw new Error('BigCommerce API credentials not configured');
    }

    try {
      const response = await fetch(`${this.baseUrlV2}/orders/${orderId}`, {
        headers: {
          'X-Auth-Token': this.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`BigCommerce API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get products for a specific order
   */
  async getOrderProducts(orderId: number): Promise<BigCommerceOrderProduct[]> {
    if (!this.storeHash || !this.accessToken) {
      throw new Error('BigCommerce API credentials not configured');
    }

    try {
      const response = await fetch(`${this.baseUrlV2}/orders/${orderId}/products`, {
        headers: {
          'X-Auth-Token': this.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (response.status === 204) {
        return [];
      }

      if (!response.ok) {
        throw new Error(`BigCommerce API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching products for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get shipping addresses for an order
   */
  async getOrderShippingAddresses(orderId: number): Promise<Array<BigCommerceAddress & { id: number }>> {
    if (!this.storeHash || !this.accessToken) {
      throw new Error('BigCommerce API credentials not configured');
    }

    try {
      const response = await fetch(`${this.baseUrlV2}/orders/${orderId}/shipping_addresses`, {
        headers: {
          'X-Auth-Token': this.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (response.status === 204) {
        return [];
      }

      if (!response.ok) {
        throw new Error(`BigCommerce API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching shipping addresses for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: number, statusId: number): Promise<BigCommerceOrder> {
    if (!this.storeHash || !this.accessToken) {
      throw new Error('BigCommerce API credentials not configured');
    }

    try {
      console.log(`📦 [BigCommerce] Updating order ${orderId} to status ${statusId}`);
      
      const response = await fetch(`${this.baseUrlV2}/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'X-Auth-Token': this.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ status_id: statusId }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ BigCommerce update status error:', response.status, errorBody);
        throw new Error(`BigCommerce API error: ${response.status} ${response.statusText}`);
      }

      const updatedOrder = await response.json();
      console.log(`✅ [BigCommerce] Order ${orderId} status updated to ${statusId}`);
      return updatedOrder;
    } catch (error) {
      console.error(`Error updating order ${orderId} status:`, error);
      throw error;
    }
  }

  /**
   * Create a shipment for an order (sends tracking info to customer)
   */
  async createOrderShipment(orderId: number, shipment: Omit<BigCommerceShipment, 'id' | 'order_id'>): Promise<BigCommerceShipment> {
    if (!this.storeHash || !this.accessToken) {
      throw new Error('BigCommerce API credentials not configured');
    }

    try {
      console.log(`📦 [BigCommerce] Creating shipment for order ${orderId}`, shipment);
      
      const response = await fetch(`${this.baseUrlV2}/orders/${orderId}/shipments`, {
        method: 'POST',
        headers: {
          'X-Auth-Token': this.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(shipment),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ BigCommerce create shipment error:', response.status, errorBody);
        throw new Error(`BigCommerce API error: ${response.status} ${response.statusText}`);
      }

      const createdShipment = await response.json();
      console.log(`✅ [BigCommerce] Shipment created for order ${orderId}:`, createdShipment.id);
      return createdShipment;
    } catch (error) {
      console.error(`Error creating shipment for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get all shipments for an order
   */
  async getOrderShipments(orderId: number): Promise<BigCommerceShipment[]> {
    if (!this.storeHash || !this.accessToken) {
      throw new Error('BigCommerce API credentials not configured');
    }

    try {
      const response = await fetch(`${this.baseUrlV2}/orders/${orderId}/shipments`, {
        headers: {
          'X-Auth-Token': this.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (response.status === 204) {
        return [];
      }

      if (!response.ok) {
        throw new Error(`BigCommerce API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching shipments for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get all order statuses
   */
  async getOrderStatuses(): Promise<BigCommerceOrderStatus[]> {
    if (!this.storeHash || !this.accessToken) {
      throw new Error('BigCommerce API credentials not configured');
    }

    try {
      const response = await fetch(`${this.baseUrlV2}/order_statuses`, {
        headers: {
          'X-Auth-Token': this.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`BigCommerce API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching order statuses:', error);
      throw error;
    }
  }

  // ===========================================
  // INVENTORY MANAGEMENT (V3 API)
  // ===========================================

  /**
   * Update product inventory level
   */
  async updateProductInventory(productId: number, inventoryLevel: number): Promise<void> {
    if (!this.storeHash || !this.accessToken) {
      throw new Error('BigCommerce API credentials not configured');
    }

    try {
      console.log(`📦 [BigCommerce] Updating product ${productId} inventory to ${inventoryLevel}`);
      
      const response = await fetch(`${this.baseUrl}/catalog/products/${productId}`, {
        method: 'PUT',
        headers: {
          'X-Auth-Token': this.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ inventory_level: inventoryLevel }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ BigCommerce update inventory error:', response.status, errorBody);
        throw new Error(`BigCommerce API error: ${response.status} ${response.statusText}`);
      }

      console.log(`✅ [BigCommerce] Product ${productId} inventory updated to ${inventoryLevel}`);
    } catch (error) {
      console.error(`Error updating product ${productId} inventory:`, error);
      throw error;
    }
  }

  /**
   * Update variant inventory level
   */
  async updateVariantInventory(productId: number, variantId: number, inventoryLevel: number): Promise<void> {
    if (!this.storeHash || !this.accessToken) {
      throw new Error('BigCommerce API credentials not configured');
    }

    try {
      console.log(`📦 [BigCommerce] Updating variant ${variantId} of product ${productId} inventory to ${inventoryLevel}`);
      
      const response = await fetch(`${this.baseUrl}/catalog/products/${productId}/variants/${variantId}`, {
        method: 'PUT',
        headers: {
          'X-Auth-Token': this.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ inventory_level: inventoryLevel }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ BigCommerce update variant inventory error:', response.status, errorBody);
        throw new Error(`BigCommerce API error: ${response.status} ${response.statusText}`);
      }

      console.log(`✅ [BigCommerce] Variant ${variantId} inventory updated to ${inventoryLevel}`);
    } catch (error) {
      console.error(`Error updating variant ${variantId} inventory:`, error);
      throw error;
    }
  }

  /**
   * Batch update inventory levels for multiple products
   */
  async batchUpdateInventory(updates: Array<{ productId: number; variantId?: number; inventoryLevel: number }>): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const update of updates) {
      try {
        if (update.variantId) {
          await this.updateVariantInventory(update.productId, update.variantId, update.inventoryLevel);
        } else {
          await this.updateProductInventory(update.productId, update.inventoryLevel);
        }
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Product ${update.productId}${update.variantId ? ` variant ${update.variantId}` : ''}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log(`📦 [BigCommerce] Batch inventory update complete: ${results.success} success, ${results.failed} failed`);
    return results;
  }

  /**
   * Get all orders that are awaiting fulfillment (status 11)
   */
  async getOrdersAwaitingFulfillment(limit: number = 50): Promise<BigCommerceOrder[]> {
    return this.getOrders({ statusId: 11, limit });
  }

  /**
   * Get all orders awaiting shipment (status 9)
   */
  async getOrdersAwaitingShipment(limit: number = 50): Promise<BigCommerceOrder[]> {
    return this.getOrders({ statusId: 9, limit });
  }
}
