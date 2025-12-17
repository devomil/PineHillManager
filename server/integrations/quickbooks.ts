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

// In-memory state storage for OAuth (in production, use Redis or session storage)
const oauthStates = new Map<string, { timestamp: number; userId?: string }>();

// Clean up old states (older than 10 minutes)
setInterval(() => {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  const entries = Array.from(oauthStates.entries());
  for (const [state, data] of entries) {
    if (data.timestamp < tenMinutesAgo) {
      oauthStates.delete(state);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

export class QuickBooksIntegration {
  private config: QuickBooksConfig;

  constructor() {
    // Determine redirect URI based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const defaultRedirectUri = isProduction 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/integrations/quickbooks/callback`
      : 'http://localhost:5000/api/integrations/quickbooks/callback';
    
    this.config = {
      clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
      clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
      redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || defaultRedirectUri,
      baseUrl: process.env.QUICKBOOKS_BASE_URL || 'https://quickbooks.api.intuit.com'
    };
  }

  // OAuth Flow - Step 1: Generate authorization URL
  getAuthorizationUrl(userId?: string): string {
    const scopes = 'com.intuit.quickbooks.accounting';
    const state = this.generateState();
    
    // Store state for validation during callback
    oauthStates.set(state, {
      timestamp: Date.now(),
      userId
    });
    
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
  async exchangeCodeForTokens(code: string, realmId: string, state: string): Promise<boolean> {
    try {
      // Validate OAuth state to prevent CSRF attacks (REQUIRED)
      if (!state) {
        throw new Error('OAuth state parameter is required');
      }
      
      const storedState = oauthStates.get(state);
      if (!storedState) {
        throw new Error('Invalid OAuth state parameter - possible CSRF attack');
      }
      
      // Clean up used state
      oauthStates.delete(state);
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
      const existingConfig = await storage.getQuickbooksConfig(realmId);
      if (existingConfig) {
        await storage.updateQuickbooksConfig(existingConfig.id, {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          realmId: realmId,
          tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
          isActive: true,
          lastSyncAt: new Date()
        });
      } else {
        // Create new configuration
        await storage.createQuickbooksConfig({
          companyId: realmId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          realmId: realmId,
          tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
          baseUrl: this.config.baseUrl,
          isActive: true,
          lastSyncAt: new Date()
        });
      }

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
      // Reload config from database first
      const config = await storage.getActiveQuickbooksConfig();
      if (!config || !config.refreshToken) {
        throw new Error('No refresh token available');
      }

      // Update in-memory refresh token
      this.config.refreshToken = config.refreshToken;
      this.config.realmId = config.realmId || undefined;

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
      await storage.updateQuickbooksConfig(config.id, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || config.refreshToken,
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        isActive: true,
        lastSyncAt: new Date()
      });

      this.config.accessToken = tokens.access_token;
      if (tokens.refresh_token) {
        this.config.refreshToken = tokens.refresh_token;
      }

      console.log('✅ QuickBooks access token refreshed successfully');
      return true;
    } catch (error) {
      console.error('❌ QuickBooks token refresh error:', error);
      return false;
    }
  }

  // Make authenticated API calls to QuickBooks
  private async makeQBAPICall(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<any> {
    try {
      // Always reload config from database to ensure we have latest tokens
      const config = await storage.getActiveQuickbooksConfig();
      if (!config || !config.accessToken || !config.realmId) {
        throw new Error('QuickBooks not configured');
      }

      // Update in-memory config with database values
      this.config.accessToken = config.accessToken;
      this.config.refreshToken = config.refreshToken || undefined;
      this.config.realmId = config.realmId || undefined;

      // Check if token needs refresh
      if (config.tokenExpiry && config.tokenExpiry < new Date()) {
        await this.refreshAccessToken();
        // Reload config after refresh to get new token
        const refreshedConfig = await storage.getActiveQuickbooksConfig();
        if (!refreshedConfig) throw new Error('Failed to reload config after refresh');
        this.config.accessToken = refreshedConfig.accessToken || undefined;
      }

      const url = `${config.baseUrl || this.config.baseUrl}/v3/company/${config.realmId}/${endpoint}`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
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
      const response = await this.makeQBAPICall('query?query=SELECT * FROM Account');
      const accounts = response.QueryResponse?.Account || [];

      let created = 0;
      let updated = 0;

      for (const qbAccount of accounts) {
        const accountData = {
          qbAccountId: qbAccount.Id,
          accountNumber: qbAccount.AcctNum || null,
          accountName: qbAccount.Name,
          accountType: qbAccount.AccountType,
          subType: qbAccount.AccountSubType || null,
          description: qbAccount.Description || null,
          balance: (qbAccount.CurrentBalance || 0).toString(),
          isActive: qbAccount.Active !== false,
          lastSyncAt: new Date()
        };

        // Check if account already exists
        const existingAccount = await storage.getFinancialAccountByQBId(qbAccount.Id);
        if (existingAccount) {
          await storage.updateFinancialAccount(existingAccount.id, accountData);
          updated++;
        } else {
          await storage.createFinancialAccount(accountData);
          created++;
        }
      }

      console.log(`✅ QuickBooks Chart of Accounts synced: ${created} created, ${updated} updated`);

    } catch (error) {
      console.error('❌ QuickBooks Chart of Accounts sync failed:', error);
      throw error;
    }
  }

  // Sync Customers and Vendors from QuickBooks
  async syncCustomersAndVendors(): Promise<void> {
    try {
      let customerCreated = 0, customerUpdated = 0;
      let vendorCreated = 0, vendorUpdated = 0;

      // Sync Customers
      const customerResponse = await this.makeQBAPICall('query?query=SELECT * FROM Customer');
      const customers = customerResponse.QueryResponse?.Customer || [];

      for (const qbCustomer of customers) {
        const customerData = {
          qbId: qbCustomer.Id,
          name: qbCustomer.DisplayName || qbCustomer.FullyQualifiedName || qbCustomer.CompanyName || 'Unknown',
          type: 'customer' as const,
          companyName: qbCustomer.CompanyName || null,
          email: qbCustomer.PrimaryEmailAddr?.Address || null,
          phone: qbCustomer.PrimaryPhone?.FreeFormNumber || null,
          address: qbCustomer.BillAddr?.Line1 || null,
          city: qbCustomer.BillAddr?.City || null,
          state: qbCustomer.BillAddr?.CountrySubDivisionCode || null,
          zipCode: qbCustomer.BillAddr?.PostalCode || null,
          balance: (qbCustomer.Balance || 0).toString(),
          isActive: qbCustomer.Active !== false,
          lastSyncAt: new Date()
        };

        const existing = await storage.getCustomerVendorByQBId(qbCustomer.Id);
        if (existing) {
          await storage.updateCustomerVendor(existing.id, customerData);
          customerUpdated++;
        } else {
          await storage.createCustomerVendor(customerData);
          customerCreated++;
        }
      }

      // Sync Vendors
      const vendorResponse = await this.makeQBAPICall('query?query=SELECT * FROM Vendor');
      const vendors = vendorResponse.QueryResponse?.Vendor || [];

      for (const qbVendor of vendors) {
        const vendorData = {
          qbId: qbVendor.Id,
          name: qbVendor.DisplayName || qbVendor.CompanyName || 'Unknown',
          type: 'vendor' as const,
          companyName: qbVendor.CompanyName || null,
          email: qbVendor.PrimaryEmailAddr?.Address || null,
          phone: qbVendor.PrimaryPhone?.FreeFormNumber || null,
          address: qbVendor.BillAddr?.Line1 || null,
          city: qbVendor.BillAddr?.City || null,
          state: qbVendor.BillAddr?.CountrySubDivisionCode || null,
          zipCode: qbVendor.BillAddr?.PostalCode || null,
          balance: (qbVendor.Balance || 0).toString(),
          isActive: qbVendor.Active !== false,
          lastSyncAt: new Date()
        };

        const existing = await storage.getCustomerVendorByQBId(qbVendor.Id);
        if (existing) {
          await storage.updateCustomerVendor(existing.id, vendorData);
          vendorUpdated++;
        } else {
          await storage.createCustomerVendor(vendorData);
          vendorCreated++;
        }
      }

      console.log(`✅ QuickBooks Customers/Vendors synced: ${customerCreated} customers created, ${customerUpdated} updated, ${vendorCreated} vendors created, ${vendorUpdated} updated`);

    } catch (error) {
      console.error('❌ QuickBooks Customers/Vendors sync failed:', error);
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
    const config = await storage.getQuickbooksConfig(this.config.realmId || '');
    if (config) {
      this.config.accessToken = config.accessToken || undefined;
      this.config.refreshToken = config.refreshToken || undefined;
      this.config.realmId = config.realmId || undefined;
      this.config.tokenExpiresAt = config.tokenExpiry || undefined;
    }
  }
}

export const quickBooksIntegration = new QuickBooksIntegration();