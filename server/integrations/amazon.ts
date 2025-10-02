import { storage } from '../storage';

export interface AmazonConfig {
  sellerId: string;
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  marketplaceId: string;
  baseUrl: string;
}

export class AmazonIntegration {
  private config: AmazonConfig | null = null;
  private static orderCache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static lastApiCall = 0;
  private static readonly MIN_API_INTERVAL = 15000; // 15 seconds between calls to prevent rate limits

  constructor(dbConfig?: any) {
    if (dbConfig) {
      console.log(`🔧 AmazonIntegration constructor received config:`, {
        sellerId: dbConfig.sellerId,
        seller_id: dbConfig.seller_id,
        merchantName: dbConfig.merchantName
      });
      
      this.config = {
        sellerId: dbConfig.sellerId || dbConfig.seller_id,
        accessToken: dbConfig.accessToken || dbConfig.access_token,
        refreshToken: dbConfig.refreshToken || dbConfig.refresh_token,
        clientId: dbConfig.clientId || dbConfig.client_id,
        clientSecret: dbConfig.clientSecret || dbConfig.client_secret,
        marketplaceId: dbConfig.marketplaceId || dbConfig.marketplace_id || 'ATVPDKIKX0DER', // US marketplace
        baseUrl: dbConfig.baseUrl || dbConfig.base_url || 'https://sellingpartnerapi-na.amazon.com'
      };
      
      console.log(`🔧 Final Amazon config created:`, {
        sellerId: this.config.sellerId,
        accessToken: this.config.accessToken ? `${this.config.accessToken.substring(0, 8)}...${this.config.accessToken.slice(-4)}` : 'MISSING',
        baseUrl: this.config.baseUrl
      });
    }
  }

  setConfig(config: AmazonConfig): void {
    this.config = config;
  }

  // Refresh access token using refresh token
  private async refreshAccessToken(): Promise<string> {
    if (!this.config) {
      throw new Error('Amazon config not set');
    }

    const tokenUrl = 'https://api.amazon.com/auth/o2/token';
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.config.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh Amazon token: ${response.status}`);
    }

    const tokenData = await response.json();
    this.config.accessToken = tokenData.access_token;
    
    return tokenData.access_token;
  }

  // Make authenticated API calls to Amazon Seller API
  private async makeAmazonAPICall(endpoint: string, config?: any, method: 'GET' | 'POST' = 'GET'): Promise<any> {
    try {
      // Check if access token is missing or is a placeholder string
      const hasValidToken = this.config?.accessToken && 
                           this.config.accessToken.length > 20 && 
                           !this.config.accessToken.includes('AMAZON_ACCESS_TOKEN');
      
      if (!this.config || !hasValidToken) {
        // Try to refresh token if available
        if (this.config?.refreshToken) {
          console.log('🔄 [AMAZON TOKEN] Access token missing or invalid, refreshing...');
          await this.refreshAccessToken();
        } else {
          throw new Error('Amazon not configured - no refresh token available');
        }
      }

      const url = `${this.config.baseUrl}${endpoint}`;
      
      console.log(`Making Amazon API call to: ${url}`);
      console.log(`Using seller ID: ${this.config.sellerId}`);
      console.log(`Using access token: ${this.config.accessToken ? '[MASKED-' + this.config.accessToken.substring(0, 6) + '...]' : 'MISSING'}`);
      
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'x-amz-access-token': this.config.accessToken,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };
      
      // Add body for POST requests
      if (method === 'POST' && config) {
        fetchOptions.body = JSON.stringify(config);
      }
      
      const response = await fetch(url, fetchOptions);

      if (response.status === 401 || response.status === 403) {
        // Try refreshing token once for 401 (Unauthorized) or 403 (Forbidden)
        console.log(`⚠️ Amazon API returned ${response.status}, attempting token refresh...`);
        
        try {
          await this.refreshAccessToken();
          console.log(`✅ Token refreshed successfully, retrying request...`);
        } catch (refreshError) {
          console.error(`❌ Token refresh failed:`, refreshError);
          throw new Error(`Failed to refresh Amazon token: ${refreshError.message}`);
        }
        
        const retryFetchOptions: RequestInit = {
          method,
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'x-amz-access-token': this.config.accessToken,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        };
        
        // Add body for POST requests
        if (method === 'POST' && config) {
          retryFetchOptions.body = JSON.stringify(config);
        }
        
        const retryResponse = await fetch(url, retryFetchOptions);

        if (!retryResponse.ok) {
          const errorBody = await retryResponse.text();
          console.error(`Amazon API retry error:`, {
            status: retryResponse.status,
            statusText: retryResponse.statusText,
            body: errorBody
          });
          throw new Error(`Amazon API error after refresh: ${retryResponse.status} ${retryResponse.statusText}`);
        }

        return await retryResponse.json();
      }

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Amazon API error details:`, {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
          url: url
        });
        throw new Error(`Amazon API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Amazon API call failed:`, error);
      throw error;
    }
  }

  // Get Amazon orders for a date range with caching and rate limiting
  async getOrders(startDate?: string, endDate?: string): Promise<any> {
    // Create cache key
    const cacheKey = `${this.config?.sellerId}-${startDate}-${endDate}`;
    
    // Check cache first
    const cached = AmazonIntegration.orderCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < AmazonIntegration.CACHE_DURATION)) {
      console.log(`Amazon API: Using cached data for ${cacheKey}`);
      return cached.data;
    }
    
    // Rate limiting: ensure minimum time between API calls
    const now = Date.now();
    const timeSinceLastCall = now - AmazonIntegration.lastApiCall;
    if (timeSinceLastCall < AmazonIntegration.MIN_API_INTERVAL) {
      const waitTime = AmazonIntegration.MIN_API_INTERVAL - timeSinceLastCall;
      console.log(`Amazon API: Rate limiting - waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    AmazonIntegration.lastApiCall = Date.now();
    if (!this.config) {
      throw new Error('Amazon config not set');
    }

    const params = new URLSearchParams({
      MarketplaceIds: this.config.marketplaceId,
    });

    if (startDate) {
      params.append('CreatedAfter', startDate);
    }
    if (endDate) {
      // Amazon requires CreatedBefore to be at least 2 minutes before current time
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      const requestedEndDate = new Date(endDate);
      
      // If requested end date is in the future or within 2 minutes, cap it to 2 minutes ago
      const actualEndDate = requestedEndDate > twoMinutesAgo ? twoMinutesAgo : requestedEndDate;
      
      if (actualEndDate < twoMinutesAgo) {
        console.log(`📅 [AMAZON API] Using CreatedBefore: ${actualEndDate.toISOString()} (requested: ${endDate})`);
      } else {
        console.log(`⏰ [AMAZON API] Capping CreatedBefore to 2 minutes ago: ${actualEndDate.toISOString()} (requested: ${endDate})`);
      }
      
      params.append('CreatedBefore', actualEndDate.toISOString());
    }

    const endpoint = `/orders/v0/orders?${params.toString()}`;
    
    try {
      const result = await this.makeAmazonAPICall(endpoint);
      
      // Cache successful results
      AmazonIntegration.orderCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      // If we hit rate limits, return cached data if available (even if expired)
      if (cached && error.message.includes('429')) {
        console.log(`Amazon API: Rate limited, using stale cache for ${cacheKey}`);
        return cached.data;
      }
      throw error;
    }
  }

  // Get a single order by ID
  async getOrder(orderId: string): Promise<any> {
    if (!this.config) {
      throw new Error('Amazon config not set');
    }

    const endpoint = `/orders/v0/orders/${orderId}`;
    
    console.log(`📦 [AMAZON ORDER] Fetching order ${orderId}`);
    
    try {
      const result = await this.makeAmazonAPICall(endpoint);
      console.log(`📦 [AMAZON ORDER] Retrieved order ${orderId}`);
      return result;
    } catch (error) {
      console.error(`❌ [AMAZON ORDER] Failed to fetch order ${orderId}:`, error);
      throw error;
    }
  }

  // Get order items for a specific order
  async getOrderItems(orderId: string): Promise<any> {
    if (!this.config) {
      throw new Error('Amazon config not set');
    }

    const endpoint = `/orders/v0/orders/${orderId}/orderItems`;
    
    console.log(`📦 [AMAZON ORDER ITEMS] Fetching items for order ${orderId}`);
    
    try {
      const result = await this.makeAmazonAPICall(endpoint);
      console.log(`📦 [AMAZON ORDER ITEMS] Retrieved ${result.payload?.OrderItems?.length || 0} items`);
      return result;
    } catch (error) {
      console.error(`❌ [AMAZON ORDER ITEMS] Failed to fetch items for order ${orderId}:`, error);
      throw error;
    }
  }

  // Get product fees estimate for a SKU
  async getProductFees(sku: string, price: number, isAmazonFulfilled: boolean = true): Promise<any> {
    if (!this.config) {
      throw new Error('Amazon config not set');
    }

    const endpoint = `/products/fees/v0/listings/${encodeURIComponent(sku)}/feesEstimate`;
    
    const requestBody = {
      FeesEstimateRequest: {
        MarketplaceId: this.config.marketplaceId,
        IsAmazonFulfilled: isAmazonFulfilled,
        PriceToEstimateFees: {
          ListingPrice: {
            CurrencyCode: 'USD',
            Amount: price
          },
          Shipping: {
            CurrencyCode: 'USD',
            Amount: 0.00
          }
        },
        Identifier: `fee-${sku}-${Date.now()}`
      }
    };

    console.log(`💰 [AMAZON FEES] Fetching fees for SKU ${sku} at price $${price}`);
    
    try {
      const result = await this.makeAmazonAPICall(endpoint, requestBody, 'POST');
      
      if (result?.payload?.FeesEstimateResult?.FeesEstimate) {
        const fees = result.payload.FeesEstimateResult.FeesEstimate;
        const totalFees = parseFloat(fees.TotalFeesEstimate?.Amount || '0');
        
        console.log(`💰 [AMAZON FEES] SKU ${sku}: Total fees = $${totalFees.toFixed(2)}`);
        
        return {
          totalFees,
          feeDetails: fees.FeeDetailList || [],
          timeOfEstimation: fees.TimeOfFeesEstimation
        };
      }
      
      return { totalFees: 0, feeDetails: [], timeOfEstimation: null };
    } catch (error) {
      console.error(`❌ [AMAZON FEES] Failed to fetch fees for SKU ${sku}:`, error);
      // Return zero fees on error to avoid breaking the order processing
      return { totalFees: 0, feeDetails: [], error: error.message };
    }
  }

  // Get product fees estimate by ASIN (alternative to SKU)
  async getProductFeesByASIN(asin: string, price: number, isAmazonFulfilled: boolean = true): Promise<any> {
    if (!this.config) {
      throw new Error('Amazon config not set');
    }

    const endpoint = `/products/fees/v0/items/${encodeURIComponent(asin)}/feesEstimate`;
    
    const requestBody = {
      FeesEstimateRequest: {
        MarketplaceId: this.config.marketplaceId,
        IsAmazonFulfilled: isAmazonFulfilled,
        PriceToEstimateFees: {
          ListingPrice: {
            CurrencyCode: 'USD',
            Amount: price
          },
          Shipping: {
            CurrencyCode: 'USD',
            Amount: 0.00
          }
        },
        Identifier: `fee-asin-${asin}-${Date.now()}`
      }
    };

    console.log(`💰 [AMAZON FEES] Fetching fees for ASIN ${asin} at price $${price}`);
    
    try {
      const result = await this.makeAmazonAPICall(endpoint, requestBody, 'POST');
      
      if (result?.payload?.FeesEstimateResult?.FeesEstimate) {
        const fees = result.payload.FeesEstimateResult.FeesEstimate;
        const totalFees = parseFloat(fees.TotalFeesEstimate?.Amount || '0');
        
        console.log(`💰 [AMAZON FEES] ASIN ${asin}: Total fees = $${totalFees.toFixed(2)}`);
        
        return {
          totalFees,
          feeDetails: fees.FeeDetailList || [],
          timeOfEstimation: fees.TimeOfFeesEstimation
        };
      }
      
      return { totalFees: 0, feeDetails: [], timeOfEstimation: null };
    } catch (error) {
      console.error(`❌ [AMAZON FEES] Failed to fetch fees for ASIN ${asin}:`, error);
      return { totalFees: 0, feeDetails: [], error: error.message };
    }
  }

  // Get fees for multiple items (batch)
  async getProductFeesBatch(items: Array<{ sku: string; price: number; isAmazonFulfilled?: boolean }>): Promise<Map<string, any>> {
    const feesMap = new Map<string, any>();
    
    // Amazon allows up to 20 items per batch request, but we'll process sequentially to avoid rate limits
    for (const item of items) {
      const fees = await this.getProductFees(item.sku, item.price, item.isAmazonFulfilled);
      feesMap.set(item.sku, fees);
    }
    
    return feesMap;
  }

  // Get sales metrics (same API used by Amazon Seller Central)
  async getSalesMetrics(startDate: string, endDate: string, granularity: string = 'Total'): Promise<any> {
    if (!this.config) {
      throw new Error('Amazon config not set');
    }

    // Format interval for Sales API: 2018-09-01T00:00:00-07:00--2018-09-04T00:00:00-07:00
    const interval = `${startDate}--${endDate}`;
    
    const params = new URLSearchParams({
      marketplaceIds: 'ATVPDKIKX0DER', // US marketplace
      interval: interval,
      granularity: granularity
    });

    // Add timezone for Day/Week/Month granularities
    if (granularity !== 'Total' && granularity !== 'Hour') {
      params.append('granularityTimeZone', 'UTC');
    }

    const endpoint = `/sales/v1/orderMetrics?${params.toString()}`;
    return await this.makeAmazonAPICall(endpoint);
  }

  // Get financial events (for revenue tracking)
  async getFinancialEvents(startDate?: string, endDate?: string): Promise<any> {
    if (!this.config) {
      throw new Error('Amazon config not set');
    }

    const params = new URLSearchParams({
      MaxResultsPerPage: '100'
    });

    if (startDate) {
      params.append('PostedAfter', startDate);
    }
    if (endDate) {
      params.append('PostedBefore', endDate);
    }

    const endpoint = `/finances/v0/financialEvents?${params.toString()}`;
    return await this.makeAmazonAPICall(endpoint);
  }

  // Sync daily sales data for Amazon
  async syncDailySalesWithConfig(config: any, targetDate: Date = new Date()): Promise<void> {
    console.log(`Starting Amazon daily sales sync for ${config.merchantName} on ${targetDate.toDateString()}`);

    // Set date range for the target date (start and end of day)
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const startDateISO = startDate.toISOString();
    const endDateISO = endDate.toISOString();

    try {
      await storage.createIntegrationLog({
        system: 'amazon',
        operation: 'sync_daily_sales',
        status: 'in_progress',
        message: `Starting daily sales sync for ${config.merchantName} - ${targetDate.toDateString()}`
      });

      // Get financial events (these contain settlement data)
      const financialResponse = await this.getFinancialEvents(startDateISO, endDateISO);

      console.log(`Financial events response for ${config.merchantName}:`, {
        hasResponse: !!financialResponse,
        hasPayload: !!(financialResponse && financialResponse.payload),
        eventCount: financialResponse?.payload?.FinancialEvents?.length || 0
      });

      if (!financialResponse || !financialResponse.payload || !financialResponse.payload.FinancialEvents) {
        console.log(`No financial events found for Amazon seller ${config.sellerId} on ${targetDate.toDateString()}`);
        await storage.createIntegrationLog({
          system: 'amazon',
          operation: 'sync_daily_sales',
          status: 'success',
          message: `No financial events found for ${config.merchantName} on ${targetDate.toDateString()}`
        });
        return;
      }

      const events = financialResponse.payload.FinancialEvents;
      let processedCount = 0;

      for (const event of events) {
        // Process different types of financial events
        if (event.ShipmentEventList) {
          for (const shipment of event.ShipmentEventList) {
            // Check if this shipment is already synced
            const existingSale = await storage.getPosSaleByAmazonOrderId?.(shipment.AmazonOrderId);
            if (existingSale) {
              console.log(`Amazon order ${shipment.AmazonOrderId} already synced, skipping...`);
              continue;
            }

            // Calculate total amount from shipment items
            let totalAmount = 0;
            let taxAmount = 0;

            if (shipment.ShipmentItemList) {
              for (const item of shipment.ShipmentItemList) {
                // Add principal amount
                if (item.ItemChargeList) {
                  for (const charge of item.ItemChargeList) {
                    if (charge.ChargeType === 'Principal') {
                      totalAmount += parseFloat(charge.ChargeAmount.CurrencyAmount || '0');
                    }
                    if (charge.ChargeType === 'Tax') {
                      taxAmount += parseFloat(charge.ChargeAmount.CurrencyAmount || '0');
                    }
                  }
                }
              }
            }

            const saleData = {
              saleDate: targetDate.toISOString().split('T')[0],
              saleTime: new Date(shipment.PostedDate || targetDate),
              totalAmount: totalAmount.toString(),
              taxAmount: taxAmount.toString(),
              tipAmount: '0.00', // Amazon doesn't have tips
              paymentMethod: 'amazon_payment',
              amazonOrderId: shipment.AmazonOrderId,
              locationId: config.id || 1 // Use config ID as location identifier
            };

            const createdSale = await storage.createPosSale(saleData);
            processedCount++;

            console.log(`Created POS sale record for Amazon order ${shipment.AmazonOrderId}: $${totalAmount}`);
          }
        }
      }

      await storage.createIntegrationLog({
        system: 'amazon',
        operation: 'sync_daily_sales',
        status: 'success',
        message: `Successfully synced ${processedCount} sales for ${config.merchantName} on ${targetDate.toDateString()}`
      });

      console.log(`✅ Completed Amazon daily sales sync for ${config.merchantName}: ${processedCount} orders processed`);

    } catch (error) {
      console.error(`❌ Amazon daily sales sync failed for ${config.merchantName}:`, error);
      
      await storage.createIntegrationLog({
        system: 'amazon',
        operation: 'sync_daily_sales',
        status: 'error',
        message: `Failed to sync sales for ${config.merchantName}: ${(error as Error).message}`
      });
      
      throw error;
    }
  }

  // Test Amazon API connection
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      if (!this.config) {
        return { success: false, message: 'Amazon config not set' };
      }

      // Test with a simple marketplace participations call
      const response = await this.makeAmazonAPICall('/sellers/v1/marketplaceParticipations');
      
      return {
        success: true,
        message: 'Amazon API connection successful',
        data: {
          marketplaces: response.payload?.length || 0,
          sellerId: this.config.sellerId
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Amazon API connection failed: ${(error as Error).message}`
      };
    }
  }
}