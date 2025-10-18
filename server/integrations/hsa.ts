import { storage } from '../storage';

// HSA Integration Configuration
interface HSAConfig {
  providerName: string;
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

// HSA Eligible Expense Categories (IRS Guidelines)
const HSA_ELIGIBLE_CATEGORIES = [
  'Medical Services',
  'Dental Care',
  'Vision Care',
  'Prescription Medications',
  'Medical Equipment',
  'Mental Health Services',
  'Preventive Care',
  'Emergency Services',
  'Diagnostic Tests',
  'Physical Therapy'
];

// HSA API Response Types
interface HSATransaction {
  id: string;
  memberId: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  merchantName: string;
  isEligible: boolean;
  receiptRequired: boolean;
  status: 'pending' | 'approved' | 'denied';
}

interface HSAAccount {
  memberId: string;
  accountBalance: number;
  yearToDateContributions: number;
  yearToDateWithdrawals: number;
  maxContribution: number;
  employerContributions: number;
}

export class HSAIntegration {
  private config: HSAConfig;

  constructor() {
    this.config = {
      providerName: process.env.HSA_PROVIDER_NAME || 'Generic HSA Provider',
      apiKey: process.env.HSA_API_KEY || '',
      apiSecret: process.env.HSA_API_SECRET || '',
      baseUrl: process.env.HSA_BASE_URL || ''
    };
  }

  // Make authenticated API calls to HSA provider
  private async makeHSAAPICall(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<any> {
    try {
      const config = await storage.getHsaConfig();
      if (!config || !config.apiKey) {
        throw new Error('HSA provider not configured');
      }

      const url = `${config.apiEndpoint || this.config.baseUrl}/${endpoint}`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        throw new Error(`HSA API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('HSA API call error:', error);
      throw error;
    }
  }

  // Sync HSA eligible expenses
  async syncHSAExpenses(startDate?: Date, endDate?: Date): Promise<void> {
    try {
      const start = startDate || new Date(new Date().getFullYear(), 0, 1); // Start of year
      const end = endDate || new Date(); // Today

      const params = new URLSearchParams({
        'start_date': start.toISOString().split('T')[0],
        'end_date': end.toISOString().split('T')[0]
      });

      const response = await this.makeHSAAPICall(`transactions?${params.toString()}`);
      const transactions: HSATransaction[] = response.transactions || [];

      for (const transaction of transactions) {
        // Only process HSA eligible expenses
        if (!transaction.isEligible) {
          continue;
        }

        const expenseData = {
          hsaSystemId: transaction.id,
          employeeId: transaction.memberId, // Map to employee
          expenseDate: transaction.date,
          amount: transaction.amount.toString(),
          description: transaction.description,
          category: transaction.category,
          receiptUrl: null,
          status: transaction.status,
          isEligible: true
        };

        await storage.createHsaExpense(expenseData);

        // Create financial transaction for accounting
        await this.createFinancialTransactionForHSAExpense(expenseData);
      }

      // Log successful sync
      await storage.createIntegrationLog({
        system: 'hsa',
        operation: 'sync_expenses',
        status: 'success',
        message: `Synced ${transactions.length} HSA eligible expenses`
      });

    } catch (error) {
      await storage.createIntegrationLog({
        system: 'hsa',
        operation: 'sync_expenses',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Create financial transaction for HSA expense
  private async createFinancialTransactionForHSAExpense(expense: any): Promise<void> {
    try {
      const hsaAccount = await storage.getFinancialAccountByName('HSA Account');
      const healthcareExpenseAccount = await storage.getFinancialAccountByName('Healthcare Expenses');

      if (!hsaAccount || !healthcareExpenseAccount) {
        console.warn('HSA or Healthcare Expense accounts not found in chart of accounts');
        return;
      }

      const transactionData = {
        transactionDate: typeof expense.expenseDate === 'string' ? expense.expenseDate : expense.expenseDate.toISOString().split('T')[0],
        transactionType: 'HSA Expense',
        description: `HSA Expense: ${expense.description}`,
        referenceNumber: expense.hsaSystemId || '',
        totalAmount: expense.amount,
        sourceSystem: 'hsa',
        sourceId: expense.hsaSystemId || undefined
      };

      const transaction = await storage.createFinancialTransaction(transactionData);

      // Debit healthcare expenses
      await storage.createTransactionLine({
        transactionId: transaction.id,
        accountId: healthcareExpenseAccount.id,
        description: expense.description,
        debitAmount: expense.amount,
        creditAmount: null
      });

      // Credit HSA account
      await storage.createTransactionLine({
        transactionId: transaction.id,
        accountId: hsaAccount.id,
        description: 'HSA payment',
        debitAmount: null,
        creditAmount: expense.amount
      });

    } catch (error) {
      console.error('Failed to create financial transaction for HSA expense:', error);
    }
  }

  // Process expense for HSA eligibility
  async processExpenseForHSAEligibility(expenseData: {
    employeeId: string;
    amount: number;
    description: string;
    category: string;
    receiptFile?: string;
  }): Promise<{ eligible: boolean; reason: string }> {
    try {
      // Check if category is HSA eligible
      const isEligibleCategory = HSA_ELIGIBLE_CATEGORIES.includes(expenseData.category);
      
      if (!isEligibleCategory) {
        return {
          eligible: false,
          reason: `Category "${expenseData.category}" is not HSA eligible`
        };
      }

      // Additional business logic for eligibility
      if (expenseData.amount > 1000 && !expenseData.receiptFile) {
        return {
          eligible: false,
          reason: 'Receipt required for expenses over $1,000'
        };
      }

      // Store the expense for review/processing
      const hsaExpenseData = {
        employeeId: expenseData.employeeId,
        expenseDate: new Date().toISOString().split('T')[0],
        amount: expenseData.amount.toString(),
        description: expenseData.description,
        category: expenseData.category,
        receiptUrl: expenseData.receiptFile || null,
        status: 'pending',
        isEligible: true
      };

      await storage.createHsaExpense(hsaExpenseData);

      return {
        eligible: true,
        reason: 'Expense submitted for HSA processing'
      };

    } catch (error) {
      return {
        eligible: false,
        reason: error instanceof Error ? error.message : 'Processing error'
      };
    }
  }

  // Generate HSA compliance reports
  async generateComplianceReport(year: number): Promise<any> {
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const expenses = await storage.getHsaExpensesByDateRange(startDate, endDate);
      
      const report = {
        reportYear: year,
        totalExpenses: 0,
        eligibleExpenses: 0,
        pendingReview: 0,
        byCategory: {} as Record<string, number>,
        complianceIssues: [] as string[]
      };

      for (const expense of expenses) {
        const amount = parseFloat(expense.amount);
        report.totalExpenses += amount;
        
        if (expense.isEligible) {
          report.eligibleExpenses += amount;
        }
        
        if (expense.status === 'pending') {
          report.pendingReview += amount;
        }

        // Group by category
        if (!report.byCategory[expense.category]) {
          report.byCategory[expense.category] = 0;
        }
        report.byCategory[expense.category] += amount;

        // Check for compliance issues
        if (amount > 100 && !expense.receiptUrl) {
          report.complianceIssues.push(`Missing receipt for expense: ${expense.description}`);
        }
      }

      return report;

    } catch (error) {
      throw new Error(`Failed to generate HSA compliance report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Test connection to HSA provider
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Most HSA providers have a health check endpoint
      const response = await this.makeHSAAPICall('health');
      
      return {
        success: true,
        message: `Connected to ${this.config.providerName} HSA system`
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  // Load configuration from database
  async loadConfig(): Promise<void> {
    const config = await storage.getHsaConfig();
    if (config) {
      this.config.apiKey = config.apiKey || '';
      this.config.baseUrl = config.apiEndpoint || '';
    }
  }

  // Get HSA eligible categories
  getEligibleCategories(): string[] {
    return [...HSA_ELIGIBLE_CATEGORIES];
  }

  // Validate expense category
  isEligibleCategory(category: string): boolean {
    return HSA_ELIGIBLE_CATEGORIES.includes(category);
  }

  // Submit expense for HSA reimbursement
  async submitExpenseForReimbursement(expenseId: number): Promise<{ success: boolean; message: string }> {
    try {
      const allExpenses = await storage.getAllHsaExpenses();
      const expense = allExpenses.find(e => e.id === expenseId);
      if (!expense) {
        throw new Error('Expense not found');
      }

      if (!expense.isEligible) {
        throw new Error('Expense is not HSA eligible');
      }

      // Submit to HSA provider API
      const submissionData = {
        memberId: expense.employeeId,
        amount: parseFloat(expense.amount),
        description: expense.description,
        category: expense.category,
        date: expense.expenseDate,
        receiptData: expense.receiptUrl ? 'attached' : null
      };

      const response = await this.makeHSAAPICall('reimbursements', 'POST', submissionData);

      // Update expense status
      await storage.updateHsaExpense(expenseId, { status: 'approved' });

      return {
        success: true,
        message: `Reimbursement submitted with ID: ${response.reimbursementId}`
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Submission failed'
      };
    }
  }
}

export const hsaIntegration = new HSAIntegration();