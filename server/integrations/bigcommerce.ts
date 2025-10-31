/**
 * BigCommerce API Integration
 * Manages product data sync for training module creation
 */

export interface BigCommerceProduct {
  id: number;
  name: string;
  description: string;
  categories?: number[];
  brand_id?: number;
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
}
