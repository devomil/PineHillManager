/**
 * Clover Payment Integration
 * 
 * Handles credit card payment processing through Clover POS API for employee purchases
 * that exceed their monthly allowance cap.
 * 
 * Documentation: https://docs.clover.com/dev/reference/pay
 */

interface CloverPaymentConfig {
  merchantId: string;
  apiToken: string;
  baseUrl?: string;
}

interface PaymentRequest {
  amount: number; // Amount in cents
  currency?: string;
  externalPaymentId?: string;
  note?: string;
  taxAmount?: number;
}

interface PaymentResponse {
  id: string;
  amount: number;
  status: string; // success, pending, declined, error
  result: string; // SUCCESS, DECLINED, etc.
  cardType?: string;
  last4?: string;
  authCode?: string;
  createdTime?: number;
  errorMessage?: string;
}

export class CloverPaymentService {
  private config: CloverPaymentConfig;

  constructor(config: CloverPaymentConfig) {
    this.config = {
      merchantId: config.merchantId,
      apiToken: config.apiToken,
      baseUrl: config.baseUrl || 'https://api.clover.com',
    };

    console.log('🔧 [Clover Payment] Service initialized:', {
      merchantId: this.config.merchantId,
      baseUrl: this.config.baseUrl,
    });
  }

  /**
   * Create a payment charge through Clover
   * 
   * @param paymentRequest - Payment details including amount and metadata
   * @param cardToken - Secure card token from Clover iframe
   * @returns Payment result with transaction ID and status
   */
  async createPayment(
    paymentRequest: PaymentRequest,
    cardToken: string
  ): Promise<PaymentResponse> {
    try {
      const url = `${this.config.baseUrl}/v1/payments`;
      
      const payload = {
        amount: Math.round(paymentRequest.amount), // Ensure cents
        currency: paymentRequest.currency || 'USD',
        source: cardToken,
        externalPaymentId: paymentRequest.externalPaymentId,
        note: paymentRequest.note,
        taxAmount: paymentRequest.taxAmount,
      };

      console.log('💳 [Clover Payment] Creating payment:', {
        amount: payload.amount,
        currency: payload.currency,
        externalId: payload.externalPaymentId,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
          'X-Clover-Merchant-Id': this.config.merchantId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [Clover Payment] Payment failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        
        throw new Error(
          errorData.message || 
          `Payment failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      
      console.log('✅ [Clover Payment] Payment successful:', {
        id: result.id,
        amount: result.amount,
        status: result.result,
        last4: result.last4,
      });

      return {
        id: result.id,
        amount: result.amount,
        status: result.result === 'SUCCESS' ? 'success' : 'declined',
        result: result.result,
        cardType: result.cardType,
        last4: result.last4,
        authCode: result.authCode,
        createdTime: result.createdTime,
        errorMessage: result.message,
      };
    } catch (error) {
      console.error('❌ [Clover Payment] Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Get payment details by ID
   */
  async getPayment(paymentId: string): Promise<PaymentResponse> {
    try {
      const url = `${this.config.baseUrl}/v1/payments/${paymentId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'X-Clover-Merchant-Id': this.config.merchantId,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch payment: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        id: result.id,
        amount: result.amount,
        status: result.result === 'SUCCESS' ? 'success' : 'declined',
        result: result.result,
        cardType: result.cardType,
        last4: result.last4,
        authCode: result.authCode,
        createdTime: result.createdTime,
      };
    } catch (error) {
      console.error('❌ [Clover Payment] Error fetching payment:', error);
      throw error;
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, amount?: number): Promise<any> {
    try {
      const url = `${this.config.baseUrl}/v1/payments/${paymentId}/refunds`;
      
      const payload: any = {};
      if (amount) {
        payload.amount = Math.round(amount);
      }

      console.log('🔄 [Clover Payment] Creating refund:', {
        paymentId,
        amount: payload.amount,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
          'X-Clover-Merchant-Id': this.config.merchantId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [Clover Payment] Refund failed:', errorData);
        throw new Error(errorData.message || 'Refund failed');
      }

      const result = await response.json();
      console.log('✅ [Clover Payment] Refund successful:', result.id);
      
      return result;
    } catch (error) {
      console.error('❌ [Clover Payment] Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Get the public API key (PAKMS key) for Clover iframe tokenization
   * This key is used by the frontend Clover SDK to securely tokenize cards
   */
  async getPublicApiKey(): Promise<string> {
    try {
      // Clover PAKMS endpoint to get public API access key
      const url = `https://scl.clover.com/pakms/apikey`;
      
      console.log('🔑 [Clover Payment] Fetching public API key...');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('❌ [Clover Payment] Failed to fetch public API key:', {
          status: response.status,
          error: errorText,
        });
        throw new Error(`Failed to get public API key: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.apiAccessKey) {
        throw new Error('No apiAccessKey returned from PAKMS');
      }

      console.log('✅ [Clover Payment] Public API key retrieved');
      
      return result.apiAccessKey;
    } catch (error) {
      console.error('❌ [Clover Payment] Error getting public API key:', error);
      throw error;
    }
  }
}

/**
 * Merchant configuration mapping
 */
const MERCHANT_CONFIGS: Record<string, { token: string; name: string }> = {
  'QGFXZQXYG8M31': { 
    token: process.env.WATERTOWN_CLOVER_TOKEN || process.env.CLOVER_API_TOKEN || '',
    name: 'Watertown Retail'
  },
  'S5TK30WEK0ZJ1': { 
    token: process.env.LAKE_GENEVA_CLOVER_TOKEN || process.env.CLOVER_API_TOKEN || '',
    name: 'Lake Geneva Retail'
  },
};

/**
 * Create a Clover Payment Service instance from environment variables
 * @deprecated Use getCloverPaymentServiceFromDb with merchantId and storage instead
 */
export function createCloverPaymentService(): CloverPaymentService | null {
  const merchantId = process.env.CLOVER_MERCHANT_ID;
  const apiToken = process.env.CLOVER_API_TOKEN;

  if (!merchantId || !apiToken) {
    console.warn('⚠️ [Clover Payment] Missing credentials - payment processing disabled');
    return null;
  }

  return new CloverPaymentService({
    merchantId,
    apiToken,
  });
}

/**
 * Get a Clover Payment Service instance for a specific merchant from the database
 * @param merchantId - The merchant ID (e.g., 'QGFXZQXYG8M31' for Watertown)
 * @param storage - The storage instance to fetch merchant config from database
 * @returns CloverPaymentService instance for the specified merchant
 */
export async function getCloverPaymentServiceFromDb(merchantId: string, storage: any): Promise<CloverPaymentService> {
  // Fetch merchant config from database
  const configs = await storage.getAllCloverConfigs();
  const config = configs.find((c: any) => c.merchantId === merchantId);
  
  if (!config) {
    throw new Error(`Merchant configuration not found for ID: ${merchantId}`);
  }
  
  if (!config.apiToken) {
    throw new Error(`Missing API token for merchant: ${config.merchantName || merchantId}`);
  }

  console.log(`🔐 [Clover Payment] Using merchant config from database:`, {
    merchantId: config.merchantId,
    merchantName: config.merchantName,
  });

  return new CloverPaymentService({
    merchantId: config.merchantId,
    apiToken: config.apiToken,
  });
}

/**
 * Get a Clover Payment Service instance for a specific merchant (deprecated - uses env vars)
 * @deprecated Use getCloverPaymentServiceFromDb instead
 * @param merchantId - The merchant ID (e.g., 'QGFXZQXYG8M31' for Watertown)
 * @returns CloverPaymentService instance for the specified merchant
 */
export function getCloverPaymentService(merchantId: string): CloverPaymentService {
  const config = MERCHANT_CONFIGS[merchantId];
  
  if (!config) {
    throw new Error(`Unknown merchant ID: ${merchantId}`);
  }
  
  if (!config.token) {
    throw new Error(`Missing API token for merchant: ${config.name}`);
  }

  return new CloverPaymentService({
    merchantId,
    apiToken: config.token,
  });
}
