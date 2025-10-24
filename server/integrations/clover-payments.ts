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
   * Generate Clover iframe token for secure card entry
   * This is used by the frontend to display the secure payment form
   */
  async generateIframeToken(): Promise<string> {
    try {
      // For Clover's hosted iframe, we use the merchant's publishable key
      // This is typically configured separately from the API token
      // For now, we'll return the merchant ID which is used in the iframe URL
      return this.config.merchantId;
    } catch (error) {
      console.error('❌ [Clover Payment] Error generating iframe token:', error);
      throw error;
    }
  }
}

/**
 * Create a Clover Payment Service instance from environment variables
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
