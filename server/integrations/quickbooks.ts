import { Request, Response } from 'express';
import { storage } from '../storage';

// QuickBooks OAuth 2.0 Configuration
interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl: string; // sandbox or production
  accessToken?: string;
  refreshToken?: string;
  realmId?: string; // Company ID
  tokenExpiresAt?: Date;
}

// QuickBooks API Response Types
interface QBAccount {
  Id: string;
  Name: string;
  AccountType: string;
  AccountSubType: string;
  CurrentBalance: number;
  Active: boolean;
}

interface QBCustomer {
  Id: string;
  Name: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  BillAddr?: {
    Line1: string;
    City: string;
    CountrySubDivisionCode: string;
    PostalCode: string;
  };
}

interface QBItem {
  Id: string;
  Name: string;
  Type: string;
  UnitPrice: number;
  QtyOnHand: number;
  Active: boolean;
}

export class QuickBooksIntegration {
  private config: QuickBooksConfig;

  constructor() {
    this.config = {
      clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
      clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
      redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || 'https://localhost:5000/api/quickbooks/callback',
      baseUrl: process.env.QUICKBOOKS_BASE_URL || 'https://sandbox-quickbooks.api.intuit.com'
    };
  }

  // OAuth Flow - Step 1: Generate authorization URL
  getAuthorizationUrl(): string {
    const scopes = 'com.intuit.quickbooks.accounting';
    const state = this.generateState();
    
    const params = new URLSearchParams({
      'client_id': this.config.clientId,
      'scope': scopes,
      'redirect_uri': this.config.redirectUri,
      'response_type': 'code',
      'access_type': 'offline',
      'state': state
    });

    return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
  }

  // OAuth Flow - Step 2: Exchange code for tokens
  async exchangeCodeForTokens(code: string, realmId: string): Promise<boolean> {
    try {
      const tokenEndpoint = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
      
      const params = new URLSearchParams({
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': this.config.redirectUri
      });

      const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const tokens = await response.json();
      
      // Store configuration in database
      await storage.updateQuickbooksConfig({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        realmId: realmId,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        isActive: true
      });

      this.config.accessToken = tokens.access_token;
      this.config.refreshToken = tokens.refresh_token;
      this.config.realmId = realmId;

      return true;
    } catch (error) {
      console.error('QuickBooks token exchange error:', error);
      return false;
    }
  }

  // Refresh access token when expired
  async refreshAccessToken(): Promise<boolean> {
    try {
      if (!this.config.refreshToken) {
        throw new Error('No refresh token available');
      }

      const tokenEndpoint = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
      
      const params = new URLSearchParams({
        'grant_type': 'refresh_token',
        'refresh_token': this.config.refreshToken
      });

      const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const tokens = await response.json();
      
      // Update stored configuration
      await storage.updateQuickbooksConfig({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || this.config.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        isActive: true
      });

      this.config.accessToken = tokens.access_token;
      if (tokens.refresh_token) {
        this.config.refreshToken = tokens.refresh_token;
      }

      return true;
    } catch (error) {
      console.error('QuickBooks token refresh error:', error);
      return false;
    }
  }

  // Make authenticated API calls to QuickBooks
  private async makeQBAPICall(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<any> {
    try {
      // Check if token needs refresh
      const config = await storage.getQuickbooksConfig();
      if (!config || !config.accessToken) {
        throw new Error('QuickBooks not configured');
      }

      if (config.tokenExpiresAt && config.tokenExpiresAt < new Date()) {
        await this.refreshAccessToken();
      }

      const url = `${this.config.baseUrl}/v3/company/${config.realmId}/${endpoint}`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        throw new Error(`QuickBooks API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('QuickBooks API call error:', error);
      throw error;
    }
  }

  // Sync Chart of Accounts from QuickBooks
  async syncChartOfAccounts(): Promise<void> {
    try {
      const response = await this.makeQBAPICall('accounts');
      const accounts = response.QueryResponse?.Account || [];

      for (const qbAccount of accounts) {
        const account = {
          externalId: qbAccount.Id,
          accountName: qbAccount.Name,
          accountType: qbAccount.AccountType,
          accountSubtype: qbAccount.AccountSubType || '',
          balance: (qbAccount.CurrentBalance || 0).toString(),
          isActive: qbAccount.Active !== false,
          source: 'quickbooks' as const
        };

        await storage.createFinancialAccount(account);
      }

      // Log successful sync
      await storage.createIntegrationLog({
        system: 'quickbooks',
        operation: 'sync_accounts',
        status: 'success',
        message: `Synced ${accounts.length} accounts`
      });

    } catch (error) {
      await storage.createIntegrationLog({
        system: 'quickbooks',
        operation: 'sync_accounts',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Sync Customers and Vendors from QuickBooks
  async syncCustomersAndVendors(): Promise<void> {
    try {
      // Sync Customers
      const customerResponse = await this.makeQBAPICall('customers');
      const customers = customerResponse.QueryResponse?.Customer || [];

      for (const qbCustomer of customers) {
        const customer = {
          externalId: qbCustomer.Id,
          name: qbCustomer.Name,
          type: 'customer' as const,
          email: qbCustomer.PrimaryEmailAddr?.Address || null,
          phone: qbCustomer.PrimaryPhone?.FreeFormNumber || null,
          address: qbCustomer.BillAddr ? {
            line1: qbCustomer.BillAddr.Line1,
            city: qbCustomer.BillAddr.City,
            state: qbCustomer.BillAddr.CountrySubDivisionCode,
            zipCode: qbCustomer.BillAddr.PostalCode
          } : null,
          isActive: true,
          source: 'quickbooks' as const
        };

        await storage.createCustomerVendor(customer);
      }

      // Sync Vendors
      const vendorResponse = await this.makeQBAPICall('vendors');
      const vendors = vendorResponse.QueryResponse?.Vendor || [];

      for (const qbVendor of vendors) {
        const vendor = {
          externalId: qbVendor.Id,
          name: qbVendor.Name,
          type: 'vendor' as const,
          email: qbVendor.PrimaryEmailAddr?.Address || null,
          phone: qbVendor.PrimaryPhone?.FreeFormNumber || null,
          address: qbVendor.BillAddr ? {
            line1: qbVendor.BillAddr.Line1,
            city: qbVendor.BillAddr.City,
            state: qbVendor.BillAddr.CountrySubDivisionCode,
            zipCode: qbVendor.BillAddr.PostalCode
          } : null,
          isActive: true,
          source: 'quickbooks' as const
        };

        await storage.createCustomerVendor(vendor);
      }

      // Log successful sync
      await storage.createIntegrationLog({
        system: 'quickbooks',
        operation: 'sync_customers_vendors',
        status: 'success',
        message: `Synced ${customers.length} customers and ${vendors.length} vendors`
      });

    } catch (error) {
      await storage.createIntegrationLog({
        system: 'quickbooks',
        operation: 'sync_customers_vendors',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Test connection to QuickBooks
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeQBAPICall('companyinfo/1');
      const companyInfo = response.QueryResponse?.CompanyInfo?.[0];
      
      return {
        success: true,
        message: `Connected to ${companyInfo?.CompanyName || 'QuickBooks'}`
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  // Helper function to generate state parameter for OAuth
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Load configuration from database
  async loadConfig(): Promise<void> {
    const config = await storage.getQuickbooksConfig();
    if (config) {
      this.config.accessToken = config.accessToken || undefined;
      this.config.refreshToken = config.refreshToken || undefined;
      this.config.realmId = config.realmId || undefined;
      this.config.tokenExpiresAt = config.tokenExpiresAt || undefined;
    }
  }
}

export const quickBooksIntegration = new QuickBooksIntegration();