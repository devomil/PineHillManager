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
  apiToken?: string; // Legacy API token (for REST API calls)
  publicKey?: string; // Ecommerce public key for iframe tokenization
  privateKey?: string; // Ecommerce private key for payment processing
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
      publicKey: config.publicKey,
      privateKey: config.privateKey,
      baseUrl: config.baseUrl || 'https://api.clover.com',
    };

    console.log('🔧 [Clover Payment] Service initialized:', {
      merchantId: this.config.merchantId,
      baseUrl: this.config.baseUrl,
      hasPublicKey: !!config.publicKey,
      hasPrivateKey: !!config.privateKey,
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
      if (!this.config.privateKey) {
        throw new Error('No private key configured for this merchant. Please configure ecommerce keys in the merchant dashboard.');
      }

      const url = `${this.config.baseUrl}/v1/charges`;
      
      const payload = {
        amount: Math.round(paymentRequest.amount), // Ensure cents
        currency: paymentRequest.currency || 'usd',
        source: cardToken,
        external_reference_id: paymentRequest.externalPaymentId,
        description: paymentRequest.note,
      };

      console.log('💳 [Clover Payment] Creating charge:', {
        amount: payload.amount,
        currency: payload.currency,
        externalId: payload.external_reference_id,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.privateKey}`,
          'Content-Type': 'application/json',
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
      
      console.log('✅ [Clover Payment] Charge successful:', {
        id: result.id,
        amount: result.amount,
        status: result.status,
        last4: result.source?.last4,
      });

      return {
        id: result.id,
        amount: result.amount,
        status: result.status === 'succeeded' ? 'success' : 'declined',
        result: result.status?.toUpperCase() || 'UNKNOWN',
        cardType: result.source?.brand,
        last4: result.source?.last4,
        authCode: result.authorization_code,
        createdTime: result.created,
        errorMessage: result.failure_message,
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
   * Get the public API key for Clover iframe tokenization
   * This key is used by the frontend Clover SDK to securely tokenize cards
   */
  async getPublicApiKey(): Promise<string> {
    if (!this.config.publicKey) {
      throw new Error('No public key configured for this merchant. Please configure ecommerce keys in the merchant dashboard.');
    }

    console.log('✅ [Clover Payment] Returning stored public key');
    return this.config.publicKey;
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
  
  if (!config.publicKey || !config.privateKey) {
    throw new Error(`Missing ecommerce keys for merchant: ${config.merchantName || merchantId}. Please configure in Clover dashboard.`);
  }

  console.log(`🔐 [Clover Payment] Using merchant config from database:`, {
    merchantId: config.merchantId,
    merchantName: config.merchantName,
    hasPublicKey: !!config.publicKey,
    hasPrivateKey: !!config.privateKey,
  });

  return new CloverPaymentService({
    merchantId: config.merchantId,
    apiToken: config.apiToken, // Optional, for legacy API calls
    publicKey: config.publicKey,
    privateKey: config.privateKey,
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
