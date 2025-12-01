import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buildQueryKey, QuerySchemas, type DateRangeParams } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
// Tabs component no longer needed - using custom navigation
import { Separator } from '@/components/ui/separator';
import { 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  Users, 
  Package, 
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Database,
  Activity,
  MapPin,
  ShoppingCart,
  CreditCard,
  RefreshCw,
  Target,
  Plus,
  TrendingDown,
  Calculator,
  CalendarDays,
  Calendar,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  Edit,
  FileText,
  Scan,
  Upload,
  Receipt,
  BookOpen,
  Store,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import AdminLayout from '@/components/admin-layout';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { RevenueAnalytics } from '@/components/revenue-analytics';
import { DreamViewDialog } from '@/components/dream-view-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

type SystemHealth = {
  database: string;
  quickbooks: string;
  clover: string;
  hsa: string;
  thrive: string;
  timestamp: string;
};

type FinancialAccount = {
  id: number;
  qbAccountId?: string;
  accountNumber?: string;
  accountName: string;
  accountType: string;
  subType?: string;
  description?: string;
  balance: string;
  dataSource?: string;
  manualBalance?: string | null;
  isActive: boolean;
  parentAccountId?: number;
  createdAt: string;
  updatedAt: string;
};

type JournalEntry = {
  id?: number;
  transactionDate: string;
  transactionType: string;
  description: string;
  referenceNumber?: string;
  lines: JournalEntryLine[];
};

type JournalEntryLine = {
  accountId: number;
  description?: string;
  debitAmount: string;
  creditAmount: string;
};

// Form schemas
const accountFormSchema = z.object({
  accountName: z.string().min(1, 'Account name is required'),
  accountType: z.enum(['Asset', 'Liability', 'Equity', 'Income', 'Expense']),
  subType: z.string().optional(),
  description: z.string().optional(),
  accountNumber: z.string().optional(),
  parentAccountId: z.string().optional(),
  dataSource: z.enum(['Auto', 'Manual', 'QuickBooks']).default('Auto'),
  manualBalance: z.string().optional(),
});

const journalEntryFormSchema = z.object({
  transactionDate: z.string().min(1, 'Transaction date is required'),
  description: z.string().min(1, 'Description is required'),
  referenceNumber: z.string().optional(),
  lines: z.array(z.object({
    accountId: z.string().min(1, 'Account is required'),
    description: z.string().optional(),
    debitAmount: z.string().refine((val) => !val || !isNaN(parseFloat(val)), 'Must be a valid number'),
    creditAmount: z.string().refine((val) => !val || !isNaN(parseFloat(val)), 'Must be a valid number'),
  })).min(2, 'At least 2 journal lines are required').refine((lines) => {
    const totalDebits = lines.reduce((sum, line) => sum + (parseFloat(line.debitAmount) || 0), 0);
    const totalCredits = lines.reduce((sum, line) => sum + (parseFloat(line.creditAmount) || 0), 0);
    return Math.abs(totalDebits - totalCredits) < 0.01;
  }, 'Total debits must equal total credits'),
});

const quickExpenseFormSchema = z.object({
  amount: z.string().min(1, 'Amount is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Amount must be a positive number'),
  description: z.string().min(1, 'Description is required').max(255, 'Description must be less than 255 characters'),
  category: z.string().min(1, 'Category is required'),
  expenseDate: z.string().min(1, 'Date is required'),
  frequency: z.enum(['one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'annually']).default('one_time'),
});

const EXPENSE_FREQUENCIES = [
  { value: 'one_time', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every 3 Months' },
  { value: 'annually', label: 'Annually' },
];

type CloverLocation = {
  id: number;
  merchantId: string;
  merchantName: string;
  apiToken: string;
  baseUrl: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type LocationSalesData = {
  locationId: string;
  locationName: string;
  totalSales: string;
  totalRevenue?: string;
  transactionCount: number;
  avgSale: string;
};

type MultiLocationAnalytics = {
  locationBreakdown: LocationSalesData[];
  totalSummary: {
    totalRevenue: string;
    totalTransactions: number;
  };
};

type MonthlyGoals = {
  revenue: number;
  profit: number;
  profitMargin: number;
  notes: string;
  month: string;
  setDate: string;
};

type QuickExpense = {
  amount: number;
  description: string;
  category: string;
  expenseDate: string;
  accountId?: number;
};

// Predefined expense categories for quick selection
const EXPENSE_CATEGORIES = [
  'Office Supplies',
  'Travel & Transportation',
  'Meals & Entertainment',
  'Utilities',
  'Rent & Facilities',
  'Marketing & Advertising',
  'Professional Services',
  'Software & Technology',
  'Insurance',
  'Maintenance & Repairs',
  'Bank Fees',
  'Other Business Expenses'
];

const CATEGORY_ACCOUNT_MAPPING: Record<string, string> = {
  'Office Supplies': 'Office Expenses',
  'Travel & Transportation': 'Travel Expenses',
  'Meals & Entertainment': 'Meals and Entertainment',
  'Utilities': 'Utilities',
  'Rent & Facilities': 'Rent Expense',
  'Marketing & Advertising': 'Advertising Expenses',
  'Professional Services': 'Professional Fees',
  'Software & Technology': 'Computer and Internet Expenses',
  'Insurance': 'Insurance Expense',
  'Maintenance & Repairs': 'Repairs and Maintenance',
  'Bank Fees': 'Bank Service Charges',
  'Other Business Expenses': 'Other Expenses'
};

function AccountingContent() {
  const [activeSection, setActiveSection] = useState('overview');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Account management state
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isJournalEntryDialogOpen, setIsJournalEntryDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  
  // PDF scanning state
  const [isPdfScanDialogOpen, setIsPdfScanDialogOpen] = useState(false);
  const [isPLScanDialogOpen, setIsPLScanDialogOpen] = useState(false);
  const [scanningPdf, setScanningPdf] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Check if user can manage accounts (Admin or Manager only)
  const canManageAccounts = user?.role === 'admin' || user?.role === 'manager';
  const canAddExpenses = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'owner';

  // Quick expense state
  const [isQuickExpenseDialogOpen, setIsQuickExpenseDialogOpen] = useState(false);
  const [recentExpenseCategories, setRecentExpenseCategories] = useState<string[]>([]);
  const [expenseDescriptionSuggestions, setExpenseDescriptionSuggestions] = useState<string[]>([]);
  
  // Hierarchical account view state - expand all parents by default
  const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());

  // Goal setting state
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [monthlyGoals, setMonthlyGoals] = useState<MonthlyGoals | null>(null);
  const [goalForm, setGoalForm] = useState({
    revenue: '',
    profit: '',
    profitMargin: '',
    notes: ''
  });

  // Dream View state - for modeling officer salary impacts
  const [isDreamViewOpen, setIsDreamViewOpen] = useState(false);
  const [dreamSalaries, setDreamSalaries] = useState({
    ryanSorensen: '',
    jacalynPhillips: '',
    leanneAnthon: '',
    lynleyGray: ''
  });

  // Monthly operations state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isHistoricalMode, setIsHistoricalMode] = useState(false);
  const [isMonthlyCloseDialogOpen, setIsMonthlyCloseDialogOpen] = useState(false);
  const [isMonthlyResetDialogOpen, setIsMonthlyResetDialogOpen] = useState(false);
  const [monthlyCloseNotes, setMonthlyCloseNotes] = useState('');
  const [monthlyResetNotes, setMonthlyResetNotes] = useState('');
  const [monthlyResetReason, setMonthlyResetReason] = useState('');

  // Check if user can set goals (Admin or Manager only)
  const canSetGoals = user?.role === 'admin' || user?.role === 'manager';
  
  // System health check
  const { data: systemHealth, isLoading: healthLoading } = useQuery<SystemHealth>({
    queryKey: ['/api/accounting/health'],
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Sync mutation to refresh all accounting data
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/accounting/sync');
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate all accounting-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/accounting'] });
      // Also invalidate specific query keys
      const today = new Date().toISOString().split('T')[0];
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/analytics/profit-loss', today] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/analytics/multi-location', today] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/config/clover/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/health'] });
      
      // Show success toast with sync results
      const results = data.results || {};
      const successfulSyncs = Object.entries(results).filter(([, result]: [string, any]) => result.success);
      
      toast({
        title: "Data Sync Complete",
        description: `Successfully synced ${successfulSyncs.length} out of ${Object.keys(results).length} integrations`,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync accounting data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Backfill COGS mutation to populate cost data for existing orders by matching item names to inventory
  const backfillCogsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/sync/clover/backfill-cost', {
        startDate: '2025-01-01',
        endDate: new Date().toISOString().split('T')[0],
        dryRun: false
      });
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate COGS-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/analytics/cogs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting'] });
      const today = new Date().toISOString().split('T')[0];
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/analytics/profit-loss', today] });
      
      toast({
        title: "COGS Data Backfilled",
        description: `Updated ${data.totalUpdated} items, added $${data.totalCostAdded.toLocaleString()} to COGS`,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Backfill Failed",
        description: "Failed to backfill COGS data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Tax backfill mutation to update existing orders with calculated tax
  const taxBackfillMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/sync/clover/backfill-tax');
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate all accounting-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/accounting'] });
      const today = new Date().toISOString().split('T')[0];
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/analytics/profit-loss', today] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/accounts'] });
      
      toast({
        title: "Tax Backfill Complete",
        description: `Processed ${data.totalProcessed} orders, updated ${data.totalUpdated} with tax data${data.totalFailed > 0 ? `, ${data.totalFailed} failed` : ''}`,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Tax Backfill Failed",
        description: "Failed to backfill tax data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Job-based historical sync state (persisted across refreshes)
  const [currentJobId, setCurrentJobId] = useState<number | null>(() => {
    const stored = localStorage.getItem('cloverSyncJobId');
    return stored ? parseInt(stored) : null;
  });

  // Historical sync mutation using new job-based system
  const historicalSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/integrations/clover/sync/start-historical', {
        startDate: '2025-01-01',
        endDate: new Date().toISOString().split('T')[0],
        forceFullSync: false
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.jobId) {
        setCurrentJobId(data.jobId);
        localStorage.setItem('cloverSyncJobId', data.jobId.toString());
        localStorage.setItem('cloverSyncStartedAt', new Date().toISOString());
        
        toast({
          title: "Sync Job Started",
          description: data.message || `Job #${data.jobId} is now processing in the background.`,
          variant: "default",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to Start Sync",
        description: "Could not start historical sync job. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Cancel sync mutation
  const cancelSyncMutation = useMutation({
    mutationFn: async () => {
      if (!currentJobId) {
        throw new Error('No job to cancel');
      }
      const response = await apiRequest('POST', `/api/integrations/clover/sync/cancel/${currentJobId}`);
      return await response.json();
    },
    onSuccess: () => {
      localStorage.removeItem('cloverSyncJobId');
      localStorage.removeItem('cloverSyncStartedAt');
      setCurrentJobId(null);
      
      toast({
        title: "Sync Cancelled",
        description: "Historical sync has been stopped.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Cancel Sync",
        description: "Could not stop the sync job. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Poll for job status while job is running
  const { data: syncStatus, isLoading: syncStatusLoading } = useQuery({
    queryKey: ['/api/integrations/clover/sync/status', currentJobId],
    queryFn: async () => {
      if (!currentJobId) return null;
      try {
        const response = await apiRequest('GET', `/api/integrations/clover/sync/status/${currentJobId}`);
        if (!response.ok) {
          // If job not found, clear localStorage
          if (response.status === 404) {
            localStorage.removeItem('cloverSyncJobId');
            localStorage.removeItem('cloverSyncStartedAt');
            return null;
          }
          throw new Error(`Status check failed: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching sync status:', error);
        return null;
      }
    },
    enabled: !!currentJobId,
    retry: false, // Don't retry failed requests
    refetchInterval: 3000, // Poll every 3 seconds
    refetchIntervalInBackground: false,
  });

  // Handle job completion/failure
  useEffect(() => {
    if (!syncStatus) return;

    if (syncStatus.status === 'completed') {
      // Job completed successfully
      localStorage.removeItem('cloverSyncJobId');
      localStorage.removeItem('cloverSyncStartedAt');
      setCurrentJobId(null);

      // Invalidate all order and accounting queries
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/analytics/cogs'] });

      toast({
        title: "Historical Sync Complete",
        description: `Successfully synced ${syncStatus.progress?.processedOrders || 0} orders from ${syncStatus.progress?.totalLocations || 0} locations!`,
        variant: "default",
      });
    } else if (syncStatus.status === 'failed') {
      // Job failed
      toast({
        title: "Sync Job Failed",
        description: syncStatus.errorLog || "The sync job encountered an error. Please try again.",
        variant: "destructive",
      });
    }
  }, [syncStatus?.status, toast]);

  // Clear stuck job state
  const clearSyncState = () => {
    localStorage.removeItem('cloverSyncJobId');
    localStorage.removeItem('cloverSyncStartedAt');
    setCurrentJobId(null);
    toast({
      title: "Sync State Cleared",
      description: "Sync job state has been reset.",
      variant: "default",
    });
  };

  // Chart of Accounts with period filtering state
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("all");

  // Financial accounts with period filtering - always use COA endpoint for live MTD calculations
  const useCOAFiltering = true;
  const { data: coaData, isLoading: accountsLoading } = useQuery<{
    accounts: FinancialAccount[];
    period: { month: number; year: number } | null;
  }>({
    queryKey: useCOAFiltering ? ['/api/accounting/coa', selectedMonth, selectedYear] : ['/api/accounting/accounts'],
    queryFn: async () => {
      if (useCOAFiltering) {
        const params = new URLSearchParams();
        params.append('month', selectedMonth.toString());
        params.append('year', selectedYear.toString());
        const response = await apiRequest('GET', `/api/accounting/coa?${params.toString()}`);
        return await response.json();
      } else {
        const response = await apiRequest('GET', '/api/accounting/accounts');
        const accounts = await response.json();
        return { accounts, period: null };
      }
    },
  });

  const accounts = coaData?.accounts || [];
  const selectedPeriod = coaData?.period;

  // Update expanded accounts when accounts data changes - expand all parents by default
  useEffect(() => {
    const parentIds = new Set<number>();
    accounts.forEach(acc => {
      if (acc.parentAccountId) {
        parentIds.add(acc.parentAccountId);
      }
    });
    setExpandedAccounts(parentIds);
  }, [accounts]);

  // Analytics data - Dynamic based on historical mode
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  const currentMonth = new Date();
  const monthStart = isHistoricalMode 
    ? new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0]
    : new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = isHistoricalMode 
    ? new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]
    : today;
  
  // Fetch company monthly goals from API
  const { data: companyGoals } = useQuery({
    queryKey: ['/api/goals/company/monthly', currentMonth.getFullYear(), currentMonth.getMonth()],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/goals/company/monthly?year=${currentMonth.getFullYear()}&month=${currentMonth.getMonth()}`);
      return await response.json();
    },
    enabled: canSetGoals, // Only fetch if user can view goals
  });

  // Update local state when company goals are fetched
  useEffect(() => {
    if (companyGoals) {
      setMonthlyGoals({
        revenue: parseFloat(companyGoals.revenue),
        profit: parseFloat(companyGoals.profit),
        profitMargin: parseFloat(companyGoals.profitMargin),
        notes: companyGoals.notes || '',
        month: `${companyGoals.year}-${companyGoals.month + 1}`,
        setDate: companyGoals.createdAt
      });
    }
  }, [companyGoals]);

  const { data: profitLoss } = useQuery({
    queryKey: ['/api/accounting/analytics/profit-loss', isHistoricalMode ? monthStart : today, isHistoricalMode ? monthEnd : today],
    queryFn: async () => {
      const startDate = isHistoricalMode ? monthStart : today;
      const endDate = isHistoricalMode ? monthEnd : today;
      const response = await apiRequest('GET', `/api/accounting/analytics/profit-loss?startDate=${startDate}&endDate=${endDate}`);
      return await response.json();
    },
  });

  // Month-to-date or historical month analytics data
  const { data: monthlyProfitLoss } = useQuery({
    queryKey: ['/api/accounting/analytics/profit-loss', monthStart, monthEnd],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/analytics/profit-loss?startDate=${monthStart}&endDate=${monthEnd}`);
      return await response.json();
    },
  });

  // Cost of Goods Sold analytics - Today (top level, always executes)
  const { data: cogsData } = useQuery({
    queryKey: ['/api/accounting/analytics/cogs', today, today],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/analytics/cogs?startDate=${today}&endDate=${today}`);
      return await response.json();
    },
  });

  // Cost of Goods Sold analytics - Monthly (top level, always executes)
  const { data: monthlyCogsData } = useQuery({
    queryKey: ['/api/accounting/analytics/cogs', monthStart, today],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/analytics/cogs?startDate=${monthStart}&endDate=${today}`);
      return await response.json();
    },
  });

  // Real revenue data from multi-location analytics (faster than orders endpoint)
  const { data: monthlyRevenueData } = useQuery({
    queryKey: ['/api/accounting/analytics/multi-location', monthStart, monthEnd],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: monthStart,
        endDate: monthEnd
      });
      const response = await apiRequest('GET', `/api/accounting/analytics/multi-location?${params.toString()}`);
      return await response.json();
    },
  });

  // Actual payroll costs from time clock entries
  // Use scheduled payroll instead of actual for Monthly Business Intelligence
  const { data: scheduledPayrollData } = useQuery({
    queryKey: ['/api/accounting/payroll/scheduled', monthStart, monthEnd],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: monthStart,
        endDate: monthEnd
      });
      const response = await apiRequest('GET', `/api/accounting/payroll/scheduled?${params.toString()}`);
      return await response.json();
    },
  });

  // Monthly closings data
  const { data: monthlyClosings } = useQuery({
    queryKey: ['/api/accounting/monthly/closings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/accounting/monthly/closings');
      return await response.json();
    },
  });

  // Current month status
  const { data: currentMonthStatus } = useQuery({
    queryKey: ['/api/accounting/monthly/current'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/accounting/monthly/current');
      return await response.json();
    },
  });

  // Check if selected month is closed
  const { data: isSelectedMonthClosed } = useQuery({
    queryKey: ['/api/accounting/monthly/is-closed', selectedYear, selectedMonth],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/monthly/is-closed?year=${selectedYear}&month=${selectedMonth}`);
      return await response.json();
    },
    enabled: isHistoricalMode,
  });

  // Historical data for selected month
  const { data: historicalData } = useQuery({
    queryKey: ['/api/accounting/monthly/historical-data', selectedYear, selectedMonth],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/monthly/historical-data?year=${selectedYear}&month=${selectedMonth}`);
      return await response.json();
    },
    enabled: isHistoricalMode,
  });

  // Historical profit & loss for selected month
  const { data: historicalProfitLoss } = useQuery({
    queryKey: ['/api/accounting/monthly/historical-profit-loss', selectedYear, selectedMonth],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/monthly/historical-profit-loss?year=${selectedYear}&month=${selectedMonth}`);
      return await response.json();
    },
    enabled: isHistoricalMode,
  });

  // Moved calculateBIMetrics and biMetrics calculation after monthlyCogsData declaration

  // Monthly operations mutations
  const monthlyCloseMutation = useMutation({
    mutationFn: async ({ year, month, notes }: { year: number; month: number; notes?: string }) => {
      const response = await apiRequest('POST', '/api/accounting/monthly/close', { year, month, notes });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Month Closed Successfully',
        description: data.message,
        variant: 'default'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/monthly/closings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/monthly/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/monthly/is-closed'] });
      setIsMonthlyCloseDialogOpen(false);
      setMonthlyCloseNotes('');
    },
    onError: (error: any) => {
      toast({
        title: 'Monthly Close Failed',
        description: error.message || 'Failed to close month',
        variant: 'destructive'
      });
    }
  });

  const monthlyResetMutation = useMutation({
    mutationFn: async ({ year, month, resetType, reason, notes }: { 
      year: number; 
      month: number; 
      resetType?: string; 
      reason?: string; 
      notes?: string; 
    }) => {
      const response = await apiRequest('POST', '/api/accounting/monthly/reset', { 
        year, 
        month, 
        resetType: resetType || 'manual', 
        reason, 
        notes 
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Month Reset Successfully',
        description: data.message,
        variant: 'default'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/monthly/closings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/monthly/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/monthly/is-closed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/monthly/reset-history'] });
      setIsMonthlyResetDialogOpen(false);
      setMonthlyResetNotes('');
      setMonthlyResetReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Monthly Reset Failed',
        description: error.message || 'Failed to reset month',
        variant: 'destructive'
      });
    }
  });

  const monthlyReopenMutation = useMutation({
    mutationFn: async ({ year, month }: { year: number; month: number }) => {
      const response = await apiRequest('PUT', '/api/accounting/monthly/reopen', { year, month });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Month Reopened Successfully',
        description: data.message,
        variant: 'default'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/monthly/closings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/monthly/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/monthly/is-closed'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Month Reopen Failed',
        description: error.message || 'Failed to reopen month',
        variant: 'destructive'
      });
    }
  });

  // Goal handling functions
  const handleSaveGoals = async () => {
    const revenue = parseFloat(goalForm.revenue);
    const profit = parseFloat(goalForm.profit);
    const profitMargin = parseFloat(goalForm.profitMargin);

    // Validation
    if (!revenue || revenue <= 0) {
      toast({
        title: "Validation Error",
        description: "Revenue goal must be a positive number",
        variant: "destructive",
      });
      return;
    }

    if (!profit || profit <= 0) {
      toast({
        title: "Validation Error", 
        description: "Profit goal must be a positive number",
        variant: "destructive",
      });
      return;
    }

    if (profit > revenue) {
      toast({
        title: "Validation Error",
        description: "Profit goal cannot exceed revenue goal",
        variant: "destructive",
      });
      return;
    }

    if (!profitMargin || profitMargin < 0 || profitMargin > 100) {
      toast({
        title: "Validation Error",
        description: "Profit margin should be between 0-100%",
        variant: "destructive",
      });
      return;
    }

    // Save to API instead of localStorage
    try {
      const response = await apiRequest('POST', '/api/goals/company/monthly', {
        year: currentMonth.getFullYear(),
        month: currentMonth.getMonth(),
        revenue,
        profit,
        profitMargin,
        notes: goalForm.notes
      });

      const savedGoals = await response.json();

      // Update local state
      setMonthlyGoals({
        revenue,
        profit,
        profitMargin,
        notes: goalForm.notes,
        month: `${currentMonth.getFullYear()}-${currentMonth.getMonth() + 1}`,
        setDate: new Date().toISOString()
      });

      // Invalidate the query to refetch company goals
      queryClient.invalidateQueries({ queryKey: ['/api/goals/company/monthly'] });

      setIsGoalDialogOpen(false);
      setGoalForm({ revenue: '', profit: '', profitMargin: '', notes: '' });

      toast({
        title: "Company Goals Saved",
        description: "Monthly goals have been successfully saved for all admins and managers",
        variant: "default",
      });
    } catch (error) {
      console.error('Error saving goals:', error);
      toast({
        title: "Error",
        description: "Failed to save company goals. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetGoalForm = () => {
    if (monthlyGoals) {
      setGoalForm({
        revenue: monthlyGoals.revenue.toString(),
        profit: monthlyGoals.profit.toString(),
        profitMargin: monthlyGoals.profitMargin.toString(),
        notes: monthlyGoals.notes
      });
    } else {
      setGoalForm({ revenue: '', profit: '', profitMargin: '', notes: '' });
    }
  };

  // Multi-location Clover data
  const { data: cloverLocations = [] } = useQuery<CloverLocation[]>({
    queryKey: ['/api/accounting/config/clover/all'],
    queryFn: async () => {
      const response = await fetch('/api/accounting/config/clover/all', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      if (!response.ok) throw new Error('Failed to fetch locations');
      return await response.json();
    },
  });

  // Multi-location analytics - Today
  const { data: multiLocationData } = useQuery<MultiLocationAnalytics>({
    queryKey: ['/api/accounting/analytics/multi-location', today, today],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/analytics/multi-location?startDate=${today}&endDate=${today}`);
      return await response.json();
    },
  });


  // Detailed COGS Analytics - Labor Costs (using type-safe query builder)
  const { data: laborCostsData, isLoading: laborCostsLoading, error: laborCostsError } = useQuery({
    queryKey: buildQueryKey('/api/accounting/cogs/labor-costs', { startDate: today, endDate: today }, QuerySchemas.cogsLabor),
  });

  // Detailed COGS Analytics - Material Costs (using type-safe query builder)
  const { data: materialCostsData, isLoading: materialCostsLoading, error: materialCostsError } = useQuery({
    queryKey: buildQueryKey('/api/accounting/cogs/material-costs', { startDate: today, endDate: today }, QuerySchemas.cogsMaterial),
  });

  // COGS By Product Analysis (using type-safe query builder)
  const { data: cogsByProductData, isLoading: cogsByProductLoading, error: cogsByProductError } = useQuery({
    queryKey: buildQueryKey('/api/accounting/cogs/by-product', { startDate: today, endDate: today }, QuerySchemas.cogsByProduct),
  });

  // COGS By Employee Analysis (using type-safe query builder - admin only data)
  const { data: cogsByEmployeeData, isLoading: cogsByEmployeeLoading, error: cogsByEmployeeError } = useQuery({
    queryKey: buildQueryKey('/api/accounting/cogs/by-employee', { startDate: today, endDate: today }, QuerySchemas.cogsByEmployee),
  });

  // COGS By Location Analysis (using type-safe query builder)
  const { data: cogsByLocationData, isLoading: cogsByLocationLoading, error: cogsByLocationError } = useQuery({
    queryKey: buildQueryKey('/api/accounting/cogs/by-location', { startDate: today, endDate: today }, QuerySchemas.cogsByLocation),
  });

  // Calculate BI metrics from real data (using monthly P&L data)
  const calculateBIMetrics = () => {
    // Use real data from multi-location analytics, COGS, and scheduled payroll APIs
    const monthlyRevenue = parseFloat(monthlyRevenueData?.totalSummary?.totalRevenue || '0');
    const monthlyCOGS = parseFloat(monthlyCogsData?.totalCost || '0');
    const monthlyPayroll = parseFloat(scheduledPayrollData?.totalAmount || '0');
    
    // Calculate operating expenses from Chart of Accounts (exclude COGS and Payroll accounts)
    // Note: Child account balances are rolled up into parent accounts by the backend,
    // so we need to be careful about double-counting:
    // - Exclude child accounts whose parent IS an operating expense (already rolled up)
    // - Include child accounts whose parent is excluded (e.g., Officer Income under Payroll)
    
    // First, identify which parent accounts are operating expenses (not COGS/Payroll)
    const isOperatingExpenseAccount = (acc: any) => {
      const isExpenseAccount = acc.accountType?.toLowerCase() === 'expense';
      const isCOGS = acc.accountName?.toLowerCase().includes('cost of goods') || 
                     acc.accountNumber?.startsWith('50');
      const isPayroll = acc.accountName?.toLowerCase().includes('payroll') ||
                        acc.accountNumber?.startsWith('67');
      return isExpenseAccount && !isCOGS && !isPayroll;
    };
    
    // Create a set of operating expense parent account IDs
    const operatingExpenseParentIds = new Set(
      accounts.filter(acc => isOperatingExpenseAccount(acc) && !acc.parentAccountId).map(acc => acc.id)
    );
    
    const operatingExpenses = accounts
      .filter(acc => {
        if (!isOperatingExpenseAccount(acc)) return false;
        
        // If this is a child account, only include it if its parent is NOT an operating expense
        // (because if parent IS operating expense, child balance is already rolled up into parent)
        if (acc.parentAccountId != null) {
          const parentIsOperatingExpense = operatingExpenseParentIds.has(acc.parentAccountId);
          return !parentIsOperatingExpense; // Include only if parent is excluded (like Payroll)
        }
        
        return true; // Include all top-level operating expense accounts
      })
      .reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);
    
    // Total expenses = COGS + Payroll + Operating Expenses from Chart of Accounts
    const monthlyExpenses = monthlyCOGS + monthlyPayroll + operatingExpenses;
    
    const daysElapsed = new Date().getDate();
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - daysElapsed;
    
    const dailyAverage = daysElapsed > 0 ? monthlyRevenue / daysElapsed : 0;
    const projectedRevenue = dailyAverage * daysInMonth;
    
    // Gross profit = Revenue - Total Expenses (COGS + Payroll + Operating)
    const grossProfit = monthlyRevenue - monthlyExpenses;
    const profitMargin = monthlyRevenue > 0 ? (grossProfit / monthlyRevenue * 100) : 0;
    
    return {
      monthlyRevenue,
      monthlyCOGS,
      monthlyPayroll,
      operatingExpenses,
      monthlyExpenses,
      grossProfit,
      profitMargin,
      dailyAverage,
      projectedRevenue,
      daysElapsed,
      daysRemaining,
      confidence: Math.min(95, 60 + (daysElapsed * 2)) // Increases with more data
    };
  };

  const biMetrics = calculateBIMetrics();


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'configured':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'not_configured':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'configured':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'not_configured':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };

  return (
    <AdminLayout currentTab="accounting">
      <div className="space-y-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Accounting Dashboard
            </h2>
            <p className="text-gray-600">
              Comprehensive financial management and reporting system
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
            </Button>
            {canManageAccounts && (
              <>
                <Button 
                  onClick={() => historicalSyncMutation.mutate()}
                  disabled={historicalSyncMutation.isPending || (syncStatus?.status === 'pending' || syncStatus?.status === 'active')}
                  className="flex items-center gap-2"
                  variant="outline"
                  size="sm"
                  data-testid="button-sync-historical"
                >
                  <Database className={`h-4 w-4 ${historicalSyncMutation.isPending ? 'animate-spin' : ''}`} />
                  {historicalSyncMutation.isPending ? 'Starting Job...' : 
                   (syncStatus?.status === 'pending' || syncStatus?.status === 'active') ? 'Sync Running...' : 
                   'Sync Historical Orders'}
                </Button>
                {currentJobId && (syncStatus?.status === 'failed' || syncStatus?.status === 'cancelled') && (
                  <Button 
                    onClick={clearSyncState}
                    variant="ghost"
                    size="sm"
                    data-testid="button-clear-sync-state"
                  >
                    <XCircle className="h-4 w-4" />
                    Clear Sync State
                  </Button>
                )}
                <Button 
                  onClick={() => backfillCogsMutation.mutate()}
                  disabled={backfillCogsMutation.isPending}
                  className="flex items-center gap-2"
                  variant="outline"
                  size="sm"
                  data-testid="button-backfill-cogs"
                >
                  <Database className={`h-4 w-4 ${backfillCogsMutation.isPending ? 'animate-spin' : ''}`} />
                  {backfillCogsMutation.isPending ? 'Backfilling...' : 'Backfill COGS'}
                </Button>
                <Button 
                  onClick={() => taxBackfillMutation.mutate()}
                  disabled={taxBackfillMutation.isPending}
                  className="flex items-center gap-2"
                  variant="outline"
                  size="sm"
                  data-testid="button-backfill-tax"
                >
                  <Calculator className={`h-4 w-4 ${taxBackfillMutation.isPending ? 'animate-spin' : ''}`} />
                  {taxBackfillMutation.isPending ? 'Backfilling Tax...' : 'Backfill Tax Data'}
                </Button>
              </>
            )}
            <Button 
              onClick={async () => {
                const response = await fetch('/api/accounting/test-clover-connections');
                const data = await response.json();
                alert(`Connection Test Results:\n\n${data.connectionTests.map((test: any) => 
                  `${test.location}: ${test.status}\nMerchant ID: ${test.merchantId}\nToken: ...${test.tokenSuffix}\n${test.error ? `Error: ${test.error}` : ''}`
                ).join('\n\n')}`);
              }}
              variant="secondary"
              className="text-xs"
            >
              Test API Connections
            </Button>
          </div>
        </div>

        {/* Sync Job Progress Card (Inline) */}
        {currentJobId && syncStatus && (
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20" data-testid="card-sync-progress">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`${syncStatus.status === 'active' ? 'animate-spin' : ''}`}>
                    <Database className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Historical Sync Job #{currentJobId}</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Started {new Date(syncStatus.startedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    syncStatus.status === 'active' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    syncStatus.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    syncStatus.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {syncStatus.status.toUpperCase()}
                  </span>
                  {(syncStatus.status === 'active' || syncStatus.status === 'pending') && (
                    <Button
                      onClick={() => cancelSyncMutation.mutate()}
                      disabled={cancelSyncMutation.isPending}
                      variant="destructive"
                      size="sm"
                      className="text-xs"
                      data-testid="button-cancel-sync"
                    >
                      {cancelSyncMutation.isPending ? 'Cancelling...' : 'Cancel Sync'}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Overall Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Overall Progress</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {syncStatus.progress?.completedLocations || 0} / {syncStatus.progress?.totalLocations || 0} locations
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${syncStatus.progress?.percentComplete || 0}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>{syncStatus.progress?.processedOrders || 0} orders processed</span>
                    <span>{syncStatus.progress?.percentComplete?.toFixed(1) || 0}%</span>
                  </div>
                </div>

                {/* Per-Location Checkpoints */}
                {syncStatus.checkpoints && syncStatus.checkpoints.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Location Progress</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {syncStatus.checkpoints.map((checkpoint: any) => (
                        <div 
                          key={checkpoint.id}
                          className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border"
                          data-testid={`checkpoint-${checkpoint.merchantId}`}
                        >
                          <div className="flex items-center gap-2">
                            {checkpoint.status === 'completed' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : checkpoint.status === 'active' ? (
                              <Database className="h-4 w-4 text-blue-500 animate-spin" />
                            ) : checkpoint.status === 'failed' ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-gray-400" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{checkpoint.merchantName || checkpoint.merchantId}</p>
                              {checkpoint.lastError && (
                                <p className="text-xs text-red-600 dark:text-red-400">{checkpoint.lastError}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {checkpoint.processedOrders || 0} orders
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              Attempt {checkpoint.retryCount + 1}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error Log */}
                {syncStatus.errorLog && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Error</p>
                    <p className="text-xs text-red-600 dark:text-red-400">{syncStatus.errorLog}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Dashboard Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveSection('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveSection('accounts')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'accounts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Chart of Accounts
            </button>
            <button
              onClick={() => setActiveSection('transactions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setActiveSection('reports')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reports
            </button>
            <button
              onClick={() => setActiveSection('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Revenue Analytics
            </button>
            <button
              onClick={() => setActiveSection('integrations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'integrations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Integrations
            </button>
            <button
              onClick={() => setActiveSection('payroll')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'payroll'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Payroll
            </button>
          </nav>
        </div>

        {/* Dashboard Content Sections - Only show selected section */}
        <div className="mt-6">
          {/* Overview Section */}
            {activeSection === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${multiLocationData?.totalSummary?.totalRevenue || (cogsData as any)?.totalRevenue || '0.00'}</div>
                  <p className="text-xs text-muted-foreground">Today</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">COGS</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${parseFloat((cogsData as any)?.totalCost || (cogsData as any)?.total || '0').toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Today</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(() => {
                    const revenue = parseFloat(multiLocationData?.totalSummary?.totalRevenue || (cogsData as any)?.totalRevenue || '0');
                    const cogs = parseFloat((cogsData as any)?.totalCost || (cogsData as any)?.total || '0');
                    return (revenue - cogs).toFixed(2);
                  })()}</div>
                  <p className="text-xs text-muted-foreground">Today (Revenue - COGS)</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{accounts.length}</div>
                  <p className="text-xs text-muted-foreground">In chart of accounts</p>
                </CardContent>
              </Card>
            </div>

            {/* Cost Analysis Section */}
            <Card className="w-full shadow-md border-2">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-blue-600" />
                      Cost of Goods Sold Analysis - Today
                    </CardTitle>
                    <CardDescription>
                      Product cost tracking and profit margin insights
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => window.open('/inventory', '_blank')}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Package className="h-4 w-4" />
                      Manage Inventory
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(laborCostsError || materialCostsError || cogsByProductError) && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3" data-testid="error-cogs-data">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-900">Failed to Load COGS Data</h4>
                      <p className="text-sm text-red-700 mt-1">
                        Unable to retrieve cost analysis. This may indicate missing parameters or a connection issue. 
                        {laborCostsError && <span className="block mt-1">Labor Costs: {(laborCostsError as any).message}</span>}
                        {materialCostsError && <span className="block mt-1">Material Costs: {(materialCostsError as any).message}</span>}
                        {cogsByProductError && <span className="block mt-1">Product Analysis: {(cogsByProductError as any).message}</span>}
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-2 border-red-300 text-red-700 hover:bg-red-100"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/accounting/cogs'] })}
                        data-testid="button-retry-cogs"
                      >
                        <RefreshCw className="h-3 w-3 mr-2" />
                        Retry
                      </Button>
                    </div>
                  </div>
                )}
                {cogsData && (Number.parseFloat((cogsData as any).totalCost ?? '0') > 0 || Number.parseFloat((cogsData as any).laborCosts ?? '0') > 0 || Number.parseFloat((cogsData as any).materialCosts ?? '0') > 0) ? (
                  <div className="space-y-6">
                    {/* Main COGS Metrics */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total Cost of Goods Sold</p>
                        <p className="text-xl font-bold text-red-600">${(Number.parseFloat((cogsData as any).totalCost ?? '0') || 0).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Period: {(cogsData as any).period || 'Today'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Labor Costs</p>
                        <p className="text-xl font-bold text-orange-600">${(Number.parseFloat((cogsData as any).laborCosts ?? '0') || 0).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{((Number.parseFloat((cogsData as any).laborCosts ?? '0') || 0) / (Number.parseFloat((cogsData as any).totalCost ?? '1') || 1) * 100).toFixed(1)}% of COGS</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Material Costs</p>
                        <p className="text-xl font-bold text-teal-600">${(Number.parseFloat((cogsData as any).materialCosts ?? '0') || 0).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{((Number.parseFloat((cogsData as any).materialCosts ?? '0') || 0) / (Number.parseFloat((cogsData as any).totalCost ?? '1') || 1) * 100).toFixed(1)}% of COGS</p>
                      </div>
                    </div>

                    {/* COGS Breakdown - Always show if data exists */}
                    {((cogsData as any).laborCosts || (cogsData as any).materialCosts) && (
                      <div className="border-t pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Labor Costs Breakdown */}
                          {Number.parseFloat((cogsData as any).laborCosts ?? '0') > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-orange-600" />
                                <h4 className="font-semibold text-orange-600">Labor Costs Detail</h4>
                              </div>
                              <div className="text-lg font-bold text-orange-600">${(Number.parseFloat((cogsData as any).laborCosts) || 0).toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">
                                Employee time and wages allocated to cost of goods
                              </div>
                            </div>
                          )}

                          {/* Material Costs Breakdown */}
                          {Number.parseFloat((cogsData as any).materialCosts ?? '0') > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-teal-600" />
                                <h4 className="font-semibold text-teal-600">Material Costs Detail</h4>
                              </div>
                              <div className="text-lg font-bold text-teal-600">${(Number.parseFloat((cogsData as any).materialCosts) || 0).toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">
                                Inventory and raw materials used in production
                              </div>
                            </div>
                          )}

                          {/* Other Costs Breakdown */}
                          {Number.parseFloat((cogsData as any).breakdown?.other ?? '0') > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Calculator className="h-4 w-4 text-purple-600" />
                                <h4 className="font-semibold text-purple-600">Other Costs</h4>
                              </div>
                              <div className="text-lg font-bold text-purple-600">${(Number.parseFloat((cogsData as any).breakdown.other) || 0).toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">
                                Additional production and overhead costs
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Summary Info */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">Cost Period: <span className="font-medium">{(cogsData as any).period || 'Current'}</span></span>
                          {(cogsData as any).currency && (
                            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                              Currency: {cogsData.currency}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last updated: {new Date().toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No cost data available for today</p>
                    <p className="text-sm text-gray-400 mb-4">Cost data will appear when there are sales with linked inventory items</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Business Intelligence Summary */}
            <Card className="w-full shadow-lg border-2">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl font-bold">
                      Monthly Business Intelligence - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </CardTitle>
                    <CardDescription>
                      Comprehensive monthly performance insights and analytics
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-sm">
                      Updated: {new Date().toLocaleDateString()}
                    </Badge>
                    {canSetGoals && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex items-center gap-2"
                          onClick={() => setIsDreamViewOpen(true)}
                          data-testid="button-dream-view"
                        >
                          <Sparkles className="h-4 w-4" />
                          Dream View
                        </Button>
                        <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              className="flex items-center gap-2"
                              onClick={() => {
                                resetGoalForm();
                                setIsGoalDialogOpen(true);
                              }}
                              data-testid="button-set-monthly-goals"
                            >
                              <Target className="h-4 w-4" />
                              {monthlyGoals ? 'Update Goals' : 'Set Monthly Goals'}
                            </Button>
                          </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Target className="h-5 w-5" />
                              Set Monthly Goals - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </DialogTitle>
                            <DialogDescription>
                              Set your monthly revenue, profit, and margin targets to track performance against goals.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="revenue-goal">Revenue Goal ($)</Label>
                                <Input
                                  id="revenue-goal"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="15000"
                                  value={goalForm.revenue}
                                  onChange={(e) => setGoalForm(prev => ({ ...prev, revenue: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="profit-goal">Profit Goal ($)</Label>
                                <Input
                                  id="profit-goal"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="5000"
                                  value={goalForm.profit}
                                  onChange={(e) => setGoalForm(prev => ({ ...prev, profit: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="margin-goal">Profit Margin Goal (%)</Label>
                              <Input
                                id="margin-goal"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder="33.3"
                                value={goalForm.profitMargin}
                                onChange={(e) => setGoalForm(prev => ({ ...prev, profitMargin: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="notes">Notes/Strategy (Optional)</Label>
                              <Textarea
                                id="notes"
                                placeholder="Enter your strategy or notes for achieving these goals..."
                                value={goalForm.notes}
                                onChange={(e) => setGoalForm(prev => ({ ...prev, notes: e.target.value }))}
                                rows={3}
                              />
                            </div>
                            <div className="flex justify-end gap-3">
                              <Button variant="outline" onClick={() => setIsGoalDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleSaveGoals}>
                                Save Goals
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* BI Summary Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Month-to-Date Performance */}
                  <Card className="border border-blue-200 bg-blue-50/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Month-to-Date Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Revenue:</span>
                          <span className="font-bold text-green-600">${biMetrics?.monthlyRevenue?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Cost of Goods:</span>
                          <span className="font-bold text-red-600">${biMetrics?.monthlyCOGS?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Payroll:</span>
                          <span className="font-bold text-red-600">${biMetrics?.monthlyPayroll?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Operating Expenses:</span>
                          <span className="font-bold text-orange-600">${biMetrics?.operatingExpenses?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="text-sm font-medium text-gray-700">Total Expenses:</span>
                          <span className="font-bold text-red-600">${biMetrics?.monthlyExpenses?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-sm font-medium">Gross Profit:</span>
                          <span className={`font-bold ${(biMetrics?.grossProfit || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>${biMetrics?.grossProfit?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Gross Margin:</span>
                          <span className={`font-bold ${(biMetrics?.profitMargin || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{biMetrics?.profitMargin?.toFixed(2) || '0.00'}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Daily Average Revenue */}
                  <Card className="border border-green-200 bg-green-50/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-green-700 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Daily Average Revenue
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">${biMetrics?.dailyAverage?.toFixed(2) || '0.00'}</div>
                          <div className="text-xs text-gray-500">per day this month</div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Days elapsed:</span>
                          <span className="font-medium">{biMetrics?.daysElapsed || new Date().getDate()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Today:</span>
                          <span className="font-medium text-green-600">${(cogsData as any)?.totalRevenue || (profitLoss as any)?.totalRevenue || '0.00'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Projected Month-End Numbers */}
                  <Card className="border border-purple-200 bg-purple-50/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-purple-700 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Projected Month-End
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">${biMetrics?.projectedRevenue?.toFixed(0) || '0'}</div>
                          <div className="text-xs text-gray-500">projected revenue</div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Confidence:</span>
                          <span className="font-medium text-green-600">{biMetrics?.confidence || 60}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Days remaining:</span>
                          <span className="font-medium">{biMetrics?.daysRemaining || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Goal Progress & Visual Analytics */}
                {monthlyGoals && biMetrics && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-6 rounded-lg space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Goal Progress Tracking</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Revenue Goal Progress */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Revenue Goal</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            ${biMetrics.monthlyRevenue.toLocaleString()} / ${monthlyGoals.revenue.toLocaleString()}
                          </span>
                        </div>
                        <div className="relative">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ease-out ${
                                (biMetrics.monthlyRevenue / monthlyGoals.revenue) >= 1.0 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                (biMetrics.monthlyRevenue / monthlyGoals.revenue) >= 0.8 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                                (biMetrics.monthlyRevenue / monthlyGoals.revenue) >= 0.5 ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                                'bg-gradient-to-r from-red-400 to-red-500'
                              }`}
                              style={{ width: `${Math.min(100, (biMetrics.monthlyRevenue / monthlyGoals.revenue) * 100)}%` }}
                            />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-semibold text-white drop-shadow">
                              {((biMetrics.monthlyRevenue / monthlyGoals.revenue) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {biMetrics.monthlyRevenue >= monthlyGoals.revenue ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 animate-pulse" />
                          ) : biMetrics.monthlyRevenue >= monthlyGoals.revenue * 0.8 ? (
                            <TrendingUp className="h-4 w-4 text-yellow-600 animate-bounce" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-xs">
                            {biMetrics.monthlyRevenue >= monthlyGoals.revenue 
                              ? 'Goal Achieved!' 
                              : `${((biMetrics.monthlyRevenue / monthlyGoals.revenue) * 100).toFixed(1)}% Complete`}
                          </span>
                        </div>
                      </div>

                      {/* Profit Goal Progress */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Profit Goal</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            ${monthlyCogsData ? parseFloat((monthlyCogsData as any).grossProfit).toLocaleString() : '0'} / ${monthlyGoals.profit.toLocaleString()}
                          </span>
                        </div>
                        <div className="relative">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ease-out ${
                                monthlyCogsData && (parseFloat((monthlyCogsData as any).grossProfit) / monthlyGoals.profit) >= 1.0 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                monthlyCogsData && (parseFloat((monthlyCogsData as any).grossProfit) / monthlyGoals.profit) >= 0.8 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                                monthlyCogsData && (parseFloat((monthlyCogsData as any).grossProfit) / monthlyGoals.profit) >= 0.5 ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                                'bg-gradient-to-r from-red-400 to-red-500'
                              }`}
                              style={{ width: `${Math.min(100, monthlyCogsData ? (parseFloat((monthlyCogsData as any).grossProfit) / monthlyGoals.profit) * 100 : 0)}%` }}
                            />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-semibold text-white drop-shadow">
                              {monthlyCogsData ? ((parseFloat(monthlyCogsData.grossProfit) / monthlyGoals.profit) * 100).toFixed(1) : '0.0'}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {monthlyCogsData && parseFloat(monthlyCogsData.grossProfit) >= monthlyGoals.profit ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 animate-pulse" />
                          ) : monthlyCogsData && parseFloat(monthlyCogsData.grossProfit) >= monthlyGoals.profit * 0.8 ? (
                            <TrendingUp className="h-4 w-4 text-yellow-600 animate-bounce" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-xs">
                            {monthlyCogsData && parseFloat((monthlyCogsData as any).grossProfit) >= monthlyGoals.profit 
                              ? 'Goal Achieved!' 
                              : `${monthlyCogsData ? ((parseFloat((monthlyCogsData as any).grossProfit) / monthlyGoals.profit) * 100).toFixed(1) : '0.0'}% Complete`}
                          </span>
                        </div>
                      </div>

                      {/* Profit Margin Gauge */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Profit Margin</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {monthlyCogsData ? parseFloat((monthlyCogsData as any).grossMargin).toFixed(1) : '0.0'}% / {monthlyGoals.profitMargin}%
                          </span>
                        </div>
                        <div className="relative">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ease-out ${
                                monthlyCogsData && (parseFloat((monthlyCogsData as any).grossMargin) / monthlyGoals.profitMargin) >= 1.0 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                monthlyCogsData && (parseFloat((monthlyCogsData as any).grossMargin) / monthlyGoals.profitMargin) >= 0.8 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                                monthlyCogsData && (parseFloat((monthlyCogsData as any).grossMargin) / monthlyGoals.profitMargin) >= 0.5 ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                                'bg-gradient-to-r from-red-400 to-red-500'
                              }`}
                              style={{ width: `${Math.min(100, monthlyCogsData ? (parseFloat((monthlyCogsData as any).grossMargin) / monthlyGoals.profitMargin) * 100 : 0)}%` }}
                            />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-semibold text-white drop-shadow">
                              {monthlyCogsData ? parseFloat((monthlyCogsData as any).grossMargin).toFixed(1) : '0.0'}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {monthlyCogsData && parseFloat((monthlyCogsData as any).grossMargin) >= monthlyGoals.profitMargin ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 animate-pulse" />
                          ) : monthlyCogsData && parseFloat(monthlyCogsData.grossMargin) >= monthlyGoals.profitMargin * 0.8 ? (
                            <TrendingUp className="h-4 w-4 text-yellow-600 animate-bounce" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-xs">
                            {monthlyCogsData && parseFloat(monthlyCogsData.grossMargin) >= monthlyGoals.profitMargin 
                              ? 'Target Met!' 
                              : `${monthlyCogsData ? ((parseFloat(monthlyCogsData.grossMargin) / monthlyGoals.profitMargin) * 100).toFixed(1) : '0.0'}% of Target`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Goal Strategy Notes */}
                    {monthlyGoals.notes && (
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Monthly Strategy</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{monthlyGoals.notes}</p>
                      </div>
                    )}

                    {/* Monthly Performance Insights */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-3">Performance Insights</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Daily Target: ${(monthlyGoals.revenue / 31).toFixed(0)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Current Pace: ${biMetrics.dailyAverage.toFixed(0)}/day</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span>Projected: ${biMetrics.projectedRevenue.toFixed(0)}</span>
                        </div>
                      </div>
                      {biMetrics.projectedRevenue >= monthlyGoals.revenue && (
                        <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800 animate-pulse">
                          <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 animate-spin" />
                            🎉 On track to exceed revenue goal by ${(biMetrics.projectedRevenue - monthlyGoals.revenue).toFixed(0)}!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Second Row - Top Revenue Days & Expense Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Revenue Days */}
                  <Card className="border border-orange-200 bg-orange-50/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Top Revenue Days
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {biMetrics ? (
                          <>
                            <div className="flex justify-between items-center py-2 border-b border-orange-200">
                              <div>
                                <div className="font-medium">Today ({today})</div>
                                <div className="text-xs text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-orange-600">${(cogsData as any)?.totalRevenue || (profitLoss as any)?.totalRevenue || '0.00'}</div>
                                <div className="text-xs text-blue-600">current</div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-orange-200">
                              <div>
                                <div className="font-medium">Daily Average</div>
                                <div className="text-xs text-gray-500">this month</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-orange-600">${biMetrics.dailyAverage?.toFixed(2)}</div>
                                <div className="text-xs text-green-600">avg</div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center py-2">
                              <div>
                                <div className="font-medium">Month Total</div>
                                <div className="text-xs text-gray-500">so far</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-orange-600">${biMetrics.monthlyRevenue?.toFixed(2)}</div>
                                <div className="text-xs text-green-600">MTD</div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            Loading revenue data...
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Expense Categories Breakdown */}
                  <Card className="border border-red-200 bg-red-50/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Expense Categories
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {biMetrics ? (
                          <>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <span className="text-sm">Total Expenses</span>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">${biMetrics?.monthlyExpenses?.toFixed(2) || '0.00'}</div>
                                <div className="text-xs text-gray-500">MTD</div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                <span className="text-sm">Daily Avg</span>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">${(biMetrics?.monthlyExpenses && biMetrics?.daysElapsed ? biMetrics.monthlyExpenses / biMetrics.daysElapsed : 0)?.toFixed(2) || '0.00'}</div>
                                <div className="text-xs text-gray-500">per day</div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                <span className="text-sm">Net Profit</span>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">${(biMetrics?.monthlyRevenue && biMetrics?.monthlyExpenses ? biMetrics.monthlyRevenue - biMetrics.monthlyExpenses : 0)?.toFixed(2) || '0.00'}</div>
                                <div className="text-xs text-green-600">{biMetrics?.profitMargin?.toFixed(1)}%</div>
                              </div>
                            </div>
                            <div className="text-center pt-2 text-xs text-gray-500 border-t">
                              Detailed expense breakdown coming soon
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            Loading expense data...
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common accounting tasks and setup options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-20 flex flex-col gap-2">
                    <Settings className="h-5 w-5" />
                    Setup QuickBooks
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2">
                    <DollarSign className="h-5 w-5" />
                    Setup Clover POS
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2">
                    <Package className="h-5 w-5" />
                    Setup Inventory
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2">
                    <BarChart3 className="h-5 w-5" />
                    View Reports
                  </Button>
                </div>
              </CardContent>
              </Card>
              </div>
            )}

            {/* Chart of Accounts Section */}
          {activeSection === 'accounts' && (
            <div className="space-y-6">
              {/* Chart of Accounts Management */}
              <Card>
                <CardHeader>
                  <div className="space-y-4">
                    {/* Title and Period Filters */}
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-blue-600" />
                          Chart of Accounts
                          {selectedPeriod && (
                            <Badge variant="outline" className="ml-2">
                              {new Date(selectedPeriod.year, selectedPeriod.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {selectedPeriod 
                            ? `Account balances as of ${new Date(selectedPeriod.year, selectedPeriod.month, 0).toLocaleDateString()}`
                            : 'Manage your financial account structure and view current balances'
                          }
                        </CardDescription>
                      </div>

                      {/* Period and Type Filtering Controls */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-gray-500" />
                          <Label className="text-sm text-gray-600">Filter by Period:</Label>
                        </div>
                        <Select 
                          value={selectedMonth?.toString() || "all"} 
                          onValueChange={(value) => setSelectedMonth(value === "all" ? null as any : parseInt(value))}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select 
                          value={selectedYear?.toString() || "all"} 
                          onValueChange={(value) => setSelectedYear(value === "all" ? null as any : parseInt(value))}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {Array.from({ length: 5 }, (_, i) => (
                              <SelectItem key={2024 - i} value={(2024 - i).toString()}>
                                {2024 - i}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {(selectedMonth || selectedYear) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedMonth(null as any);
                              setSelectedYear(null as any);
                            }}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            Clear
                          </Button>
                        )}
                        
                        {/* Account Type Filter */}
                        <div className="flex items-center gap-2 ml-4 border-l pl-4">
                          <Label className="text-sm text-gray-600">Account Type:</Label>
                          <Select 
                            value={accountTypeFilter} 
                            onValueChange={setAccountTypeFilter}
                          >
                            <SelectTrigger className="w-32" data-testid="select-account-type-filter">
                              <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              <SelectItem value="Income">Income</SelectItem>
                              <SelectItem value="Expense">Expense</SelectItem>
                              <SelectItem value="Asset">Asset</SelectItem>
                              <SelectItem value="Liability">Liability</SelectItem>
                              <SelectItem value="Equity">Equity</SelectItem>
                            </SelectContent>
                          </Select>
                          {accountTypeFilter !== "all" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAccountTypeFilter("all")}
                              className="text-gray-500 hover:text-gray-700 h-8 px-2"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center">
                      <div />
                      <div className="flex gap-2">
                        {user?.role === 'admin' && (
                          <Button
                            onClick={() => setIsPayrollDialogOpen(true)}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-md"
                            data-testid="button-payroll-accrual"
                          >
                            <Calculator className="h-4 w-4" />
                            Payroll Accrual
                          </Button>
                        )}
                        {canAddExpenses && (
                          <Button
                            onClick={() => setIsQuickExpenseDialogOpen(true)}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white shadow-md"
                            data-testid="button-add-expense"
                          >
                            <Receipt className="h-4 w-4" />
                            Add Expense
                          </Button>
                        )}
                        {canManageAccounts && (
                          <>
                            <Button
                              onClick={() => {
                                setEditingAccount(null);
                                setIsAccountDialogOpen(true);
                              }}
                              className="flex items-center gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Add Account
                            </Button>
                            <Button
                              onClick={() => setIsJournalEntryDialogOpen(true)}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              Journal Entry
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {accountsLoading ? (
                    <div className="flex items-center justify-center h-20">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : accounts.length > 0 ? (
                    <div className="space-y-2">
                      {(() => {
                        // Filter accounts by type first
                        const filteredAccounts = accountTypeFilter === "all" 
                          ? accounts 
                          : accounts.filter(acc => acc.accountType?.toLowerCase() === accountTypeFilter.toLowerCase());
                        
                        // Organize accounts hierarchically
                        const parentAccounts = filteredAccounts.filter(acc => !acc.parentAccountId);
                        const childAccountsMap = new Map<number, typeof filteredAccounts>();
                        filteredAccounts.forEach(acc => {
                          if (acc.parentAccountId) {
                            if (!childAccountsMap.has(acc.parentAccountId)) {
                              childAccountsMap.set(acc.parentAccountId, []);
                            }
                            childAccountsMap.get(acc.parentAccountId)!.push(acc);
                          }
                        });
                        
                        const toggleExpand = (accountId: number) => {
                          setExpandedAccounts(prev => {
                            const next = new Set(prev);
                            if (next.has(accountId)) {
                              next.delete(accountId);
                            } else {
                              next.add(accountId);
                            }
                            return next;
                          });
                        };
                        
                        const renderAccount = (account: typeof accounts[0], isChild = false) => {
                          const hasChildren = childAccountsMap.has(account.id);
                          const isExpanded = expandedAccounts.has(account.id);
                          const children = childAccountsMap.get(account.id) || [];
                          
                          return (
                            <div key={account.id}>
                              <div className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 ${isChild ? 'ml-8 border-l-4 border-l-blue-200' : ''}`}>
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    {hasChildren && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleExpand(account.id)}
                                        className="h-6 w-6 p-0"
                                      >
                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      </Button>
                                    )}
                                    {!hasChildren && isChild && <div className="w-6" />}
                                    <h3 className="font-medium">{account.accountName}</h3>
                                    {account.accountNumber && (
                                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                        {account.accountNumber}
                                      </span>
                                    )}
                                    <Badge 
                                      variant={
                                        account.dataSource === 'Manual' ? 'default' : 
                                        account.dataSource === 'QuickBooks' ? 'outline' : 
                                        'secondary'
                                      }
                                      className={
                                        account.dataSource === 'Manual' ? 'bg-blue-600 text-white' :
                                        account.dataSource === 'QuickBooks' ? 'border-green-600 text-green-700' :
                                        'bg-gray-200 text-gray-700'
                                      }
                                      data-testid={`badge-data-source-${account.id}`}
                                    >
                                      {account.dataSource === 'Manual' ? 'Manual' : 
                                       account.dataSource === 'QuickBooks' ? 'QuickBooks' : 
                                       'API'}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1">
                                    <p className="text-sm text-gray-500">{account.accountType}</p>
                                    {account.subType && (
                                      <p className="text-sm text-gray-400">• {account.subType}</p>
                                    )}
                                  </div>
                                  {account.description && (
                                    <p className="text-sm text-gray-400 mt-1">{account.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="font-medium text-lg">${account.manualBalance !== null && account.manualBalance !== undefined ? account.manualBalance : account.balance}</p>
                                    <Badge variant={account.isActive ? "default" : "secondary"}>
                                      {account.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                  {canManageAccounts && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingAccount(account);
                                        setIsAccountDialogOpen(true);
                                      }}
                                      className="flex items-center gap-1"
                                    >
                                      <Edit className="h-4 w-4" />
                                      Edit
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {hasChildren && isExpanded && (
                                <div className="mt-2 space-y-2">
                                  {children.map(child => renderAccount(child, true))}
                                </div>
                              )}
                            </div>
                          );
                        };
                        
                        if (filteredAccounts.length === 0 && accountTypeFilter !== "all") {
                          return (
                            <div className="text-center py-8">
                              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-500">No {accountTypeFilter} accounts found.</p>
                              <Button
                                variant="link"
                                onClick={() => setAccountTypeFilter("all")}
                                className="mt-2"
                              >
                                View all accounts
                              </Button>
                            </div>
                          );
                        }
                        
                        return parentAccounts.map(account => renderAccount(account));
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">No accounts found. Start by setting up your chart of accounts.</p>
                      {canManageAccounts && (
                        <Button
                          onClick={() => {
                            setEditingAccount(null);
                            setIsAccountDialogOpen(true);
                          }}
                        >
                          Add First Account
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* PDF Scanning for Vendor Invoices */}
              {canManageAccounts && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scan className="h-5 w-5 text-green-600" />
                      Invoice Processing
                    </CardTitle>
                    <CardDescription>
                      Upload and scan vendor invoices to create accounting entries automatically
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Button
                        onClick={() => setIsPdfScanDialogOpen(true)}
                        className="h-24 flex flex-col gap-2"
                        variant="outline"
                      >
                        <Upload className="h-6 w-6" />
                        <span>Upload Invoice</span>
                      </Button>
                      <Button
                        onClick={() => setIsPLScanDialogOpen(true)}
                        className="h-24 flex flex-col gap-2"
                        variant="outline"
                      >
                        <FileText className="h-6 w-6" />
                        <span>Import P&L</span>
                      </Button>
                      <Button
                        className="h-24 flex flex-col gap-2"
                        variant="outline"
                        disabled
                      >
                        <Receipt className="h-6 w-6" />
                        <span>Scan Receipt</span>
                        <span className="text-xs text-gray-500">Coming Soon</span>
                      </Button>
                      <Button
                        className="h-24 flex flex-col gap-2"
                        variant="outline"
                        disabled
                      >
                        <Database className="h-6 w-6" />
                        <span>Batch Process</span>
                        <span className="text-xs text-gray-500">Coming Soon</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Transactions Section */}
          {activeSection === 'transactions' && (
            <TransactionsSection canManageAccounts={canManageAccounts} accounts={accounts} />
          )}

          {/* Reports Section */}
          {activeSection === 'reports' && (
            <ReportsSection accounts={accounts} canManageAccounts={canManageAccounts} />
          )}

          {/* Integrations Section */}
          {activeSection === 'integrations' && (
            <div className="space-y-6">
              <Card>
              <CardHeader>
                <CardTitle>System Integrations</CardTitle>
                <CardDescription>
                  Configure connections to external systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">QuickBooks Online</h3>
                      <Badge className={getStatusColor(systemHealth?.quickbooks || 'not_configured')}>
                        {systemHealth?.quickbooks === 'not_configured' ? 'Not Connected' : 'Connected'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">Sync financial data and transactions</p>
                    <Button variant="outline" size="sm">
                      {systemHealth?.quickbooks === 'configured' ? 'Manage Connection' : 'Connect QuickBooks'}
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Clover POS</h3>
                      <Badge className={getStatusColor(systemHealth?.clover || 'not_configured')}>
                        {systemHealth?.clover === 'not_configured' ? 'Not Connected' : 'Connected'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">Import sales and payment data</p>
                    <Button variant="outline" size="sm">
                      {systemHealth?.clover === 'configured' ? 'Manage Connection' : 'Connect Clover'}
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">HSA System</h3>
                      <Badge className={getStatusColor(systemHealth?.hsa || 'not_configured')}>
                        {systemHealth?.hsa === 'not_configured' ? 'Not Connected' : 'Connected'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">Track employee HSA expenses</p>
                    <Button variant="outline" size="sm">
                      {systemHealth?.hsa === 'configured' ? 'Manage Connection' : 'Connect HSA'}
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Thrive Inventory</h3>
                      <Badge className={getStatusColor(systemHealth?.thrive || 'not_configured')}>
                        {systemHealth?.thrive === 'not_configured' ? 'Not Connected' : 'Connected'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">Sync inventory and product data</p>
                    <Button variant="outline" size="sm">
                      {systemHealth?.thrive === 'configured' ? 'Manage Connection' : 'Connect Thrive'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
          )}


          {/* Revenue Analytics Section */}
          {activeSection === 'analytics' && (
            <div className="space-y-6">
              <RevenueAnalytics />
            </div>
          )}
        </div>

        {/* Account Management Dialog */}
        <AccountManagementDialog
          isOpen={isAccountDialogOpen}
          onClose={() => {
            setIsAccountDialogOpen(false);
            setEditingAccount(null);
          }}
          editingAccount={editingAccount}
          accounts={accounts}
        />

        {/* Journal Entry Dialog */}
        <JournalEntryDialog
          isOpen={isJournalEntryDialogOpen}
          onClose={() => setIsJournalEntryDialogOpen(false)}
          accounts={accounts}
        />

        {/* Quick Expense Dialog */}
        <QuickExpenseDialog
          isOpen={isQuickExpenseDialogOpen}
          onClose={() => setIsQuickExpenseDialogOpen(false)}
          accounts={accounts}
        />

        {/* PDF Scanning Dialog */}
        <PdfScanningDialog
          isOpen={isPdfScanDialogOpen}
          onClose={() => setIsPdfScanDialogOpen(false)}
          accounts={accounts}
        />

        {/* P&L Import Dialog */}
        <PLImportDialog
          isOpen={isPLScanDialogOpen}
          onClose={() => setIsPLScanDialogOpen(false)}
          accounts={accounts}
        />

        {/* Payroll Accrual Dialog */}
        <PayrollAccrualDialog
          isOpen={isPayrollDialogOpen}
          onClose={() => setIsPayrollDialogOpen(false)}
        />

        {/* Dream View Dialog */}
        <DreamViewDialog
          open={isDreamViewOpen}
          onOpenChange={setIsDreamViewOpen}
          currentMetrics={{
            revenue: biMetrics?.monthlyRevenue || 0,
            cogs: biMetrics?.monthlyCOGS || 0,
            payroll: biMetrics?.monthlyPayroll || 0,
            expenses: biMetrics?.monthlyExpenses || 0,
            profit: biMetrics?.grossProfit || 0,
            margin: biMetrics?.profitMargin || 0
          }}
        />
      </div>
    </AdminLayout>
  );
}

// Account Management Dialog Component
function AccountManagementDialog({ 
  isOpen, 
  onClose, 
  editingAccount, 
  accounts 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  editingAccount: FinancialAccount | null;
  accounts: FinancialAccount[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<z.infer<typeof accountFormSchema>>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      accountName: editingAccount?.accountName || '',
      accountType: editingAccount?.accountType as any || 'Asset',
      subType: editingAccount?.subType || '',
      description: editingAccount?.description || '',
      accountNumber: editingAccount?.accountNumber || '',
      parentAccountId: editingAccount?.parentAccountId?.toString() || 'none',
      dataSource: (editingAccount?.dataSource as any) || 'Auto',
      manualBalance: editingAccount?.manualBalance?.toString() || '',
    },
  });

  const accountMutation = useMutation({
    mutationFn: async (data: z.infer<typeof accountFormSchema>) => {
      const payload = {
        ...data,
        parentAccountId: data.parentAccountId && data.parentAccountId !== 'none' ? parseInt(data.parentAccountId) : null,
      };
      
      if (editingAccount) {
        const response = await apiRequest('PUT', `/api/accounting/accounts/${editingAccount.id}`, payload);
        return await response.json();
      } else {
        const response = await apiRequest('POST', '/api/accounting/accounts', payload);
        return await response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/accounts'] });
      toast({
        title: editingAccount ? "Account Updated" : "Account Created",
        description: editingAccount ? "Account has been updated successfully" : "New account has been created successfully",
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: editingAccount ? "Failed to update account" : "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: z.infer<typeof accountFormSchema>) => {
    accountMutation.mutate(data);
  };

  useEffect(() => {
    if (editingAccount) {
      form.reset({
        accountName: editingAccount.accountName,
        accountType: editingAccount.accountType as any,
        subType: editingAccount.subType || '',
        description: editingAccount.description || '',
        accountNumber: editingAccount.accountNumber || '',
        parentAccountId: editingAccount.parentAccountId?.toString() || 'none',
        dataSource: (editingAccount.dataSource as any) || 'Auto',
        manualBalance: editingAccount.manualBalance?.toString() || '',
      });
    } else {
      form.reset({
        accountName: '',
        accountType: 'Asset',
        subType: '',
        description: '',
        accountNumber: '',
        parentAccountId: 'none',
        dataSource: 'Auto',
        manualBalance: '',
      });
    }
  }, [editingAccount, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingAccount ? 'Edit Account' : 'Add New Account'}
          </DialogTitle>
          <DialogDescription>
            {editingAccount ? 'Update account information' : 'Create a new financial account for your chart of accounts'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="accountName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Cash in Bank" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Asset">Asset</SelectItem>
                      <SelectItem value="Liability">Liability</SelectItem>
                      <SelectItem value="Equity">Equity</SelectItem>
                      <SelectItem value="Income">Income</SelectItem>
                      <SelectItem value="Expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 1000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="subType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sub Type (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Current Asset" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="parentAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Account (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No Parent</SelectItem>
                      {accounts.filter(acc => acc.id !== editingAccount?.id).map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dataSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Source</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-data-source">
                        <SelectValue placeholder="Select data source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Auto">API (Auto-calculated)</SelectItem>
                      <SelectItem value="Manual">Manual Entry</SelectItem>
                      <SelectItem value="QuickBooks">QuickBooks</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Auto: Balance calculated from API data. Manual: Enter fixed amount below. QuickBooks: Synced from QB.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {form.watch('dataSource') === 'Manual' && (
              <FormField
                control={form.control}
                name="manualBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manual Balance</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="e.g., 1500.00" 
                        {...field} 
                        data-testid="input-manual-balance"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the fixed amount for this account (e.g., rent expense)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Account description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={accountMutation.isPending}>
                {accountMutation.isPending ? 'Saving...' : (editingAccount ? 'Update Account' : 'Create Account')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Quick Expense Dialog Component
function QuickExpenseDialog({ 
  isOpen, 
  onClose, 
  accounts 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  accounts: FinancialAccount[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm({
    resolver: zodResolver(quickExpenseFormSchema),
    defaultValues: {
      amount: '',
      description: '',
      category: '',
      expenseDate: new Date().toISOString().split('T')[0],
      frequency: 'one_time' as const,
    },
  });

  // Get recent categories from localStorage
  const recentCategories = JSON.parse(localStorage.getItem('recent_expense_categories') || '[]');
  const suggestedCategories = Array.from(new Set([...recentCategories, ...EXPENSE_CATEGORIES]));

  // Quick expense mutation
  const quickExpenseMutation = useMutation({
    mutationFn: async (data: {
      amount: string;
      description: string;
      category: string;
      expenseDate: string;
      frequency: string;
    }) => {
      const response = await apiRequest('POST', '/api/accounting/expenses/quick', {
        amount: parseFloat(data.amount),
        description: data.description,
        category: data.category,
        expenseDate: data.expenseDate,
        frequency: data.frequency,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      // Add category to recent categories
      const category = form.getValues('category');
      const updatedCategories = [category, ...recentCategories.filter((c: string) => c !== category)].slice(0, 5);
      localStorage.setItem('recent_expense_categories', JSON.stringify(updatedCategories));

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/reports'] });
      
      const today = new Date().toISOString().split('T')[0];
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/analytics/profit-loss', today] });

      onClose();
      form.reset();
      
      toast({
        title: "Expense Added Successfully",
        description: `$${data.amount} expense for ${data.description} has been recorded.`,
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Expense",
        description: error.message || "There was an error adding the expense. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    quickExpenseMutation.mutate(data);
  };

  // Auto-suggest category based on description
  const suggestCategory = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('office') || desc.includes('supplies') || desc.includes('paper') || desc.includes('pen')) {
      return 'Office Supplies';
    }
    if (desc.includes('travel') || desc.includes('gas') || desc.includes('fuel') || desc.includes('uber') || desc.includes('taxi')) {
      return 'Travel & Transportation';
    }
    if (desc.includes('meal') || desc.includes('lunch') || desc.includes('dinner') || desc.includes('restaurant')) {
      return 'Meals & Entertainment';
    }
    if (desc.includes('phone') || desc.includes('internet') || desc.includes('software') || desc.includes('subscription')) {
      return 'Software & Technology';
    }
    if (desc.includes('rent') || desc.includes('lease')) {
      return 'Rent & Facilities';
    }
    return '';
  };

  const handleDescriptionChange = (description: string) => {
    const suggested = suggestCategory(description);
    if (suggested && !form.getValues('category')) {
      form.setValue('category', suggested);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <Receipt className="h-5 w-5" />
            Quick Expense Entry
          </DialogTitle>
          <DialogDescription>
            Add a business expense quickly and easily
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm text-gray-500">$</span>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        className="pl-8"
                        data-testid="input-expense-amount"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="What was this expense for?"
                      data-testid="input-expense-description"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleDescriptionChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-expense-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {recentCategories.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs font-medium text-gray-500">Recent</div>
                          {recentCategories.map((category: string) => (
                            <SelectItem key={`recent-${category}`} value={category}>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-gray-400" />
                                {category}
                              </div>
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1 text-xs font-medium text-gray-500 border-t">All Categories</div>
                        </>
                      )}
                      {EXPENSE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="expenseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      data-testid="input-expense-date"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-expense-frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXPENSE_FREQUENCIES.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={quickExpenseMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={quickExpenseMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-submit-expense"
              >
                {quickExpenseMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4 mr-2" />
                    Add Expense
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Journal Entry Dialog Component
function JournalEntryDialog({ 
  isOpen, 
  onClose, 
  accounts 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  accounts: FinancialAccount[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lines, setLines] = useState<JournalEntryLine[]>([
    { accountId: 0, description: '', debitAmount: '', creditAmount: '' },
    { accountId: 0, description: '', debitAmount: '', creditAmount: '' },
  ]);
  
  const form = useForm<z.infer<typeof journalEntryFormSchema>>({
    resolver: zodResolver(journalEntryFormSchema),
    defaultValues: {
      transactionDate: new Date().toISOString().split('T')[0],
      description: '',
      referenceNumber: '',
      lines: lines.map(line => ({ ...line, accountId: line.accountId.toString() })),
    },
  });

  const journalMutation = useMutation({
    mutationFn: async (data: z.infer<typeof journalEntryFormSchema>) => {
      const payload = {
        transactionDate: data.transactionDate,
        transactionType: 'Journal Entry',
        description: data.description,
        referenceNumber: data.referenceNumber,
        sourceSystem: 'Manual',
        totalAmount: data.lines.reduce((sum, line) => sum + (parseFloat(line.debitAmount) || 0), 0).toFixed(2),
        lines: data.lines.map(line => ({
          accountId: parseInt(line.accountId),
          description: line.description,
          debitAmount: parseFloat(line.debitAmount) || 0,
          creditAmount: parseFloat(line.creditAmount) || 0,
        })),
      };
      
      const response = await apiRequest('POST', '/api/accounting/transactions', payload);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/transactions'] });
      toast({
        title: "Journal Entry Created",
        description: "Journal entry has been posted successfully",
      });
      onClose();
      form.reset();
      setLines([
        { accountId: 0, description: '', debitAmount: '', creditAmount: '' },
        { accountId: 0, description: '', debitAmount: '', creditAmount: '' },
      ]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create journal entry",
        variant: "destructive",
      });
    },
  });

  const addLine = () => {
    setLines([...lines, { accountId: 0, description: '', debitAmount: '', creditAmount: '' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof JournalEntryLine, value: string | number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
    form.setValue('lines', newLines.map(line => ({ ...line, accountId: line.accountId.toString() })));
  };

  const totalDebits = lines.reduce((sum, line) => sum + (parseFloat(line.debitAmount) || 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + (parseFloat(line.creditAmount) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Journal Entry
          </DialogTitle>
          <DialogDescription>
            Create a manual journal entry with multiple account lines
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => journalMutation.mutate(data))} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="transactionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., JE-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Journal entry description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Journal Lines</h3>
                <Button type="button" onClick={addLine} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Line
                </Button>
              </div>
              
              <div className="border rounded-lg">
                <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 border-b font-medium text-sm">
                  <div className="col-span-4">Account</div>
                  <div className="col-span-3">Description</div>
                  <div className="col-span-2">Debit</div>
                  <div className="col-span-2">Credit</div>
                  <div className="col-span-1">Action</div>
                </div>
                
                {lines.map((line, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 p-3 border-b last:border-b-0">
                    <div className="col-span-4">
                      <Select 
                        value={line.accountId.toString()} 
                        onValueChange={(value) => updateLine(index, 'accountId', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.accountName} ({account.accountType})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input 
                        placeholder="Line description"
                        value={line.description}
                        onChange={(e) => updateLine(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={line.debitAmount}
                        onChange={(e) => updateLine(index, 'debitAmount', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={line.creditAmount}
                        onChange={(e) => updateLine(index, 'creditAmount', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1">
                      {lines.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLine(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 border-t font-medium">
                  <div className="col-span-7">Totals:</div>
                  <div className="col-span-2 text-right">${totalDebits.toFixed(2)}</div>
                  <div className="col-span-2 text-right">${totalCredits.toFixed(2)}</div>
                  <div className="col-span-1">
                    {isBalanced ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>
              </div>
              
              {!isBalanced && (
                <p className="text-sm text-red-600">
                  Debits and credits must be equal. Difference: ${Math.abs(totalDebits - totalCredits).toFixed(2)}
                </p>
              )}
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={journalMutation.isPending || !isBalanced}>
                {journalMutation.isPending ? 'Creating...' : 'Create Journal Entry'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// PDF Scanning Dialog Component
function PdfScanningDialog({ 
  isOpen, 
  onClose, 
  accounts 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  accounts: FinancialAccount[];
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setExtractedData(null);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a PDF file",
        variant: "destructive",
      });
    }
  };

  const handleScanPdf = async () => {
    if (!selectedFile) return;
    
    setScanning(true);
    try {
      // Mock PDF scanning - in real implementation, you'd send to a PDF processing service
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock extracted data
      setExtractedData({
        vendor: 'ACME Office Supplies',
        invoiceNumber: 'INV-2025-001',
        date: '2025-09-02',
        amount: '125.50',
        description: 'Office supplies - printer paper, pens',
        suggestedAccount: 'Office Expenses'
      });
      
      toast({
        title: "PDF Scanned Successfully",
        description: "Invoice data has been extracted. Please review and approve.",
      });
    } catch (error) {
      toast({
        title: "Scan Failed",
        description: "Failed to extract data from PDF",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const handleCreateEntry = () => {
    // This would create a journal entry based on the extracted data
    toast({
      title: "Feature Coming Soon",
      description: "Automatic journal entry creation from PDF data will be available soon",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Scan Vendor Invoice
          </DialogTitle>
          <DialogDescription>
            Upload a PDF invoice to automatically extract vendor and expense information
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    {selectedFile ? selectedFile.name : 'Upload PDF Invoice'}
                  </span>
                  <span className="mt-1 block text-sm text-gray-500">
                    {selectedFile ? 'Click to select a different file' : 'Click to browse or drag and drop'}
                  </span>
                </label>
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          </div>
          
          {selectedFile && (
            <div className="flex justify-center">
              <Button 
                onClick={handleScanPdf} 
                disabled={scanning}
                className="flex items-center gap-2"
              >
                {scanning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Scanning...
                  </>
                ) : (
                  <>
                    <Scan className="h-4 w-4" />
                    Scan PDF
                  </>
                )}
              </Button>
            </div>
          )}
          
          {extractedData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Extracted Information</CardTitle>
                <CardDescription>
                  Review the extracted data and create a journal entry
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Vendor</Label>
                      <p className="text-sm text-gray-600">{extractedData.vendor}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Invoice Number</Label>
                      <p className="text-sm text-gray-600">{extractedData.invoiceNumber}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Date</Label>
                      <p className="text-sm text-gray-600">{extractedData.date}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Amount</Label>
                      <p className="text-sm text-gray-600 font-medium">${extractedData.amount}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-gray-600">{extractedData.description}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Suggested Account</Label>
                    <p className="text-sm text-gray-600">{extractedData.suggestedAccount}</p>
                  </div>
                </div>
                
                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setExtractedData(null)}>
                    Re-scan
                  </Button>
                  <Button onClick={handleCreateEntry}>
                    Create Journal Entry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// P&L Import Dialog Component
function PLImportDialog({ 
  isOpen, 
  onClose, 
  accounts 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  accounts: FinancialAccount[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setExtractedData(null);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file.",
        variant: "destructive",
      });
    }
  };

  const handleScanPdf = async () => {
    if (!selectedFile) return;
    
    setScanning(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('pdf', selectedFile);
      
      const response = await fetch('/api/accounting/scan-pl-pdf', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to scan PDF');
      }
      
      const data = await response.json();
      setExtractedData(data);
      
      toast({
        title: "P&L Scanned Successfully",
        description: "Financial data extracted from PDF. Review before importing.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error scanning PDF:', error);
      toast({
        title: "Scan Failed",
        description: "Failed to extract data from PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const handleImportData = async () => {
    if (!extractedData) return;
    
    try {
      const response = await fetch('/api/accounting/import-pl-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(extractedData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to import P&L data');
      }
      
      toast({
        title: "P&L Data Imported",
        description: "Financial transactions have been created successfully.",
        variant: "default",
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/transactions'] });
      
      onClose();
    } catch (error) {
      console.error('Error importing P&L data:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import P&L data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Import P&L Document
          </DialogTitle>
          <DialogDescription>
            Upload a P&L PDF to automatically extract and import financial data for historical periods
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label 
                htmlFor="pl-dropzone-file" 
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> P&L PDF
                  </p>
                  <p className="text-xs text-gray-500">PDF files only</p>
                  {selectedFile && (
                    <p className="mt-2 text-sm text-blue-600 font-medium">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
                <input 
                  id="pl-dropzone-file" 
                  type="file" 
                  className="hidden" 
                  accept=".pdf"
                  onChange={handleFileSelect}
                />
              </label>
            </div>
          </div>
          
          {selectedFile && (
            <div className="flex justify-center">
              <Button 
                onClick={handleScanPdf} 
                disabled={scanning}
                className="flex items-center gap-2"
              >
                {scanning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Extracting Data...
                  </>
                ) : (
                  <>
                    <Scan className="h-4 w-4" />
                    Extract P&L Data
                  </>
                )}
              </Button>
            </div>
          )}
          
          {extractedData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Extracted P&L Data</CardTitle>
                <CardDescription>
                  Review the extracted financial data before importing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Period</Label>
                      <p className="text-sm text-gray-600">{extractedData.period}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Total Revenue</Label>
                      <p className="text-sm text-gray-600 font-medium">${extractedData.totalRevenue}</p>
                    </div>
                  </div>
                  
                  {extractedData.incomeCategories && (
                    <div>
                      <Label className="text-sm font-medium">Income Categories</Label>
                      <div className="mt-2 space-y-2">
                        {extractedData.incomeCategories.map((category: any, index: number) => (
                          <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                            <span className="text-sm">{category.name}</span>
                            <span className="text-sm font-medium">${category.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setExtractedData(null)}>
                    Re-scan
                  </Button>
                  <Button onClick={handleImportData}>
                    Import Financial Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Reports Section Component
function ReportsSection({ 
  accounts, 
  canManageAccounts 
}: { 
  accounts: FinancialAccount[]; 
  canManageAccounts: boolean;
}) {
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [reportType, setReportType] = useState('profit_loss');
  const [selectedLocation, setSelectedLocation] = useState('all');

  // Get period dates based on selection
  const getPeriodDates = () => {
    const now = new Date();
    const currentYear = parseInt(selectedYear);
    
    switch (selectedPeriod) {
      case 'current_month':
        return {
          start: new Date(currentYear, now.getMonth(), 1),
          end: new Date(currentYear, now.getMonth() + 1, 0)
        };
      case 'last_month':
        return {
          start: new Date(currentYear, now.getMonth() - 1, 1),
          end: new Date(currentYear, now.getMonth(), 0)
        };
      case 'current_quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        return {
          start: new Date(currentYear, quarterStart, 1),
          end: new Date(currentYear, quarterStart + 3, 0)
        };
      case 'current_year':
        return {
          start: new Date(currentYear, 0, 1),
          end: new Date(currentYear, 11, 31)
        };
      case 'july_2025':
        return {
          start: new Date(2025, 6, 1), // July 1, 2025
          end: new Date(2025, 6, 31)   // July 31, 2025
        };
      default:
        return {
          start: new Date(currentYear, now.getMonth(), 1),
          end: new Date(currentYear, now.getMonth() + 1, 0)
        };
    }
  };

  const { start: startDate, end: endDate } = getPeriodDates();
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Fetch expense data
  const { data: expenseData = {}, isLoading: expenseLoading } = useQuery({
    queryKey: ['/api/accounting/reports/expenses', startDateStr, endDateStr],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/reports/expenses?startDate=${startDateStr}&endDate=${endDateStr}`);
      return await response.json();
    },
  });

  // Fetch P&L data
  const { data: profitLossData = {}, isLoading: profitLossLoading } = useQuery({
    queryKey: ['/api/accounting/reports/profit-loss', startDateStr, endDateStr],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/reports/profit-loss?startDate=${startDateStr}&endDate=${endDateStr}`);
      return await response.json();
    },
  });

  // Fetch COGS data using working API (same as Overview section)
  const { data: reportsCogsData = {}, isLoading: cogsLoading } = useQuery({
    queryKey: ['/api/accounting/analytics/cogs', startDateStr, endDateStr],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/analytics/cogs?startDate=${startDateStr}&endDate=${endDateStr}`);
      return await response.json();
    },
  });

  // Get revenue analytics with Clover integration
  const { data: revenueData = {}, isLoading: revenueLoading } = useQuery({
    queryKey: ['/api/accounting/analytics/multi-location', startDateStr, endDateStr],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/analytics/multi-location?startDate=${startDateStr}&endDate=${endDateStr}`);
      return await response.json();
    },
  });

  // Fetch locations data for filtering
  const { data: reportLocations = [] } = useQuery({
    queryKey: ['/api/accounting/config/clover/all'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/accounting/config/clover/all');
      return await response.json();
    },
  });

  // Fetch daily sales report data with location filtering
  const { data: dailySalesData = {}, isLoading: dailySalesLoading } = useQuery({
    queryKey: ['/api/accounting/reports/daily-sales', startDateStr, endDateStr, selectedLocation],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDateStr,
        endDate: endDateStr
      });
      if (selectedLocation !== 'all') {
        params.set('locationId', selectedLocation);
      }
      const response = await apiRequest('GET', `/api/accounting/reports/daily-sales?${params.toString()}`);
      return await response.json();
    },
    enabled: reportType === 'daily_sales'
  });

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num || 0);
  };

  const formatPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'current_month':
        return `${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      case 'last_month':
        return `${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      case 'current_quarter':
        return `Q${Math.floor(startDate.getMonth() / 3) + 1} ${startDate.getFullYear()}`;
      case 'current_year':
        return `${startDate.getFullYear()}`;
      case 'july_2025':
        return 'July 2025';
      default:
        return 'Custom Period';
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Financial Reports Dashboard
          </CardTitle>
          <CardDescription>
            Comprehensive expense reporting and financial analysis with real-time Clover integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profit_loss">Profit & Loss</SelectItem>
                  <SelectItem value="expense_detail">Expense Detail</SelectItem>
                  <SelectItem value="revenue_breakdown">Revenue Breakdown</SelectItem>
                  <SelectItem value="daily_sales">Daily Sales Report</SelectItem>
                  <SelectItem value="profit_margin_trends">Profit Margin Trends</SelectItem>
                  <SelectItem value="product_profitability">Product Profitability</SelectItem>
                  <SelectItem value="location_comparison">Location Comparison</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">Current Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="current_quarter">Current Quarter</SelectItem>
                  <SelectItem value="current_year">Current Year</SelectItem>
                  <SelectItem value="july_2025">July 2025 (Sample Data)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {reportLocations.map((location: any) => (
                    <SelectItem key={location.merchantId} value={location.merchantId}>
                      {location.merchantName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              {formatPeriodLabel()} Summary
            </span>
            <Badge variant="outline" className="text-sm">
              {startDateStr} to {endDateStr}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg md:text-xl font-bold text-green-600">
                {revenueLoading ? '...' : formatCurrency(
                  revenueData.locationBreakdown?.reduce((sum: number, location: LocationSalesData) => 
                    sum + parseFloat(location.totalSales || location.totalRevenue || '0'), 0
                  ) || 0
                )}
              </div>
              <div className="text-xs md:text-sm text-gray-600">Total Revenue</div>
              <div className="text-xs text-gray-500 mt-1">
                {revenueData.locationBreakdown?.length || 0} locations
              </div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-lg md:text-xl font-bold text-orange-600">
                {cogsLoading ? '...' : formatCurrency(reportsCogsData.totalCost || 0)}
              </div>
              <div className="text-xs md:text-sm text-gray-600">COGS</div>
              <div className="text-xs text-gray-500 mt-1">
                Cost of Goods Sold
              </div>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <div className="text-lg md:text-xl font-bold text-emerald-600">
                {(revenueLoading || cogsLoading) ? '...' : formatCurrency(
                  (revenueData.locationBreakdown?.reduce((sum: number, location: LocationSalesData) => 
                    sum + parseFloat(location.totalSales || location.totalRevenue || '0'), 0
                  ) || 0) - (parseFloat(reportsCogsData.totalCost || '0'))
                )}
              </div>
              <div className="text-xs md:text-sm text-gray-600">Gross Profit</div>
              <div className="text-xs text-gray-500 mt-1">
                Revenue - COGS
              </div>
            </div>
            <div className="text-center p-3 bg-teal-50 rounded-lg">
              <div className="text-lg md:text-xl font-bold text-teal-600">
                {(revenueLoading || cogsLoading) ? '...' : (() => {
                  const totalRevenue = revenueData.locationBreakdown?.reduce((sum: number, location: LocationSalesData) => 
                    sum + parseFloat(location.totalSales || location.totalRevenue || '0'), 0
                  ) || 0;
                  const totalCogs = parseFloat(reportsCogsData.totalCost || '0');
                  const grossProfit = totalRevenue - totalCogs;
                  const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100) : 0;
                  return `${grossMargin.toFixed(1)}%`;
                })()}
              </div>
              <div className="text-xs md:text-sm text-gray-600">Gross Margin</div>
              <div className="text-xs text-gray-500 mt-1">
                Gross Profit / Revenue
              </div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-lg md:text-xl font-bold text-red-600">
                {profitLossLoading ? '...' : (() => {
                  // Calculate operating expenses from accounts (same logic as detailed P&L report)
                  const expenseAccounts = accounts.filter(acc => 
                    acc.accountType.toLowerCase().includes('expense')
                  );
                  
                  // Identify top-level expense account IDs
                  const topLevelExpenseIds = new Set(
                    expenseAccounts
                      .filter(acc => !(acc as any).parentAccountId)
                      .map(acc => acc.id)
                  );
                  
                  const operatingExpenses = expenseAccounts.filter(account => {
                    const name = account.accountName.toLowerCase();
                    const accountNumber = (account as any).accountNumber || '';
                    // Exclude COGS
                    const isCOGS = name.includes('cost of goods') || 
                                   name.includes('cogs') || 
                                   name.includes('cost of sales') ||
                                   accountNumber.startsWith('50');
                    if (isCOGS) return false;
                    
                    // Exclude child accounts (parent has rolled-up balance)
                    const parentId = (account as any).parentAccountId;
                    if (parentId && topLevelExpenseIds.has(parentId)) return false;
                    
                    return true;
                  });
                  
                  const total = operatingExpenses.reduce((sum, acc) => 
                    sum + parseFloat(acc.balance || '0'), 0
                  );
                  return formatCurrency(total);
                })()}
              </div>
              <div className="text-xs md:text-sm text-gray-600">Operating Expenses</div>
              <div className="text-xs text-gray-500 mt-1">
                {expenseData.expenseCategories?.length || 0} categories
              </div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg md:text-xl font-bold text-blue-600">
                {(revenueLoading || cogsLoading || profitLossLoading) ? '...' : (() => {
                  const totalRevenue = revenueData.locationBreakdown?.reduce((sum: number, location: LocationSalesData) => 
                    sum + parseFloat(location.totalSales || location.totalRevenue || '0'), 0
                  ) || 0;
                  const totalCogs = parseFloat(reportsCogsData.totalCost || '0');
                  const grossProfit = totalRevenue - totalCogs;
                  
                  // Calculate operating expenses from accounts (same logic as summary card)
                  const expenseAccts = accounts.filter(acc => acc.accountType.toLowerCase().includes('expense'));
                  const topLevelIds = new Set(expenseAccts.filter(acc => !(acc as any).parentAccountId).map(acc => acc.id));
                  const opExpenses = expenseAccts.filter(acc => {
                    const name = acc.accountName.toLowerCase();
                    const num = (acc as any).accountNumber || '';
                    if (name.includes('cost of goods') || name.includes('cogs') || name.includes('cost of sales') || num.startsWith('50')) return false;
                    if ((acc as any).parentAccountId && topLevelIds.has((acc as any).parentAccountId)) return false;
                    return true;
                  }).reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);
                  
                  const netIncome = grossProfit - opExpenses;
                  return formatCurrency(netIncome);
                })()}
              </div>
              <div className="text-xs md:text-sm text-gray-600">Net Income</div>
              <div className="text-xs text-gray-500 mt-1">
                Gross Profit - Expenses
              </div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg md:text-xl font-bold text-purple-600">
                {(revenueLoading || cogsLoading || profitLossLoading) ? '...' : (() => {
                  const totalRevenue = revenueData.locationBreakdown?.reduce((sum: number, location: LocationSalesData) => 
                    sum + parseFloat(location.totalSales || location.totalRevenue || '0'), 0
                  ) || 0;
                  const totalCogs = parseFloat(reportsCogsData.totalCost || '0');
                  const grossProfit = totalRevenue - totalCogs;
                  
                  // Calculate operating expenses from accounts (same logic as summary card)
                  const expenseAccts = accounts.filter(acc => acc.accountType.toLowerCase().includes('expense'));
                  const topLevelIds = new Set(expenseAccts.filter(acc => !(acc as any).parentAccountId).map(acc => acc.id));
                  const opExpenses = expenseAccts.filter(acc => {
                    const name = acc.accountName.toLowerCase();
                    const num = (acc as any).accountNumber || '';
                    if (name.includes('cost of goods') || name.includes('cogs') || name.includes('cost of sales') || num.startsWith('50')) return false;
                    if ((acc as any).parentAccountId && topLevelIds.has((acc as any).parentAccountId)) return false;
                    return true;
                  }).reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);
                  
                  const netIncome = grossProfit - opExpenses;
                  const netMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100) : 0;
                  return `${netMargin.toFixed(1)}%`;
                })()}
              </div>
              <div className="text-xs md:text-sm text-gray-600">Net Margin</div>
              <div className="text-xs text-gray-500 mt-1">
                Net Income / Revenue
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content Based on Type */}
      {reportType === 'profit_loss' && (
        <ProfitLossReport 
          data={{
            ...profitLossData,
            totalCOGS: parseFloat(reportsCogsData.totalCost || '0'),
            grossProfit: (revenueData.locationBreakdown?.reduce((sum: number, location: LocationSalesData) => 
              sum + parseFloat(location.totalSales || location.totalRevenue || '0'), 0
            ) || 0) - parseFloat(reportsCogsData.totalCost || '0')
          }} 
          period={formatPeriodLabel()} 
          loading={profitLossLoading || cogsLoading || revenueLoading}
          accounts={accounts}
          revenueData={revenueData}
        />
      )}

      {reportType === 'expense_detail' && (
        <ExpenseDetailReport 
          data={expenseData} 
          period={formatPeriodLabel()} 
          loading={expenseLoading}
          accounts={accounts}
        />
      )}

      {reportType === 'revenue_breakdown' && (
        <RevenueBreakdownReport 
          data={revenueData} 
          period={formatPeriodLabel()} 
          loading={revenueLoading}
        />
      )}

      {reportType === 'daily_sales' && (
        <DailySalesReport 
          data={dailySalesData} 
          period={formatPeriodLabel()} 
          loading={dailySalesLoading}
        />
      )}

      {reportType === 'profit_margin_trends' && (
        <ProfitMarginTrendsReport />
      )}

      {reportType === 'product_profitability' && (
        <ProductProfitabilityReport 
          startDate={startDateStr}
          endDate={endDateStr}
        />
      )}

      {reportType === 'location_comparison' && (
        <LocationComparisonReport 
          startDate={startDateStr}
          endDate={endDateStr}
        />
      )}
    </div>
  );
}

// Profit & Loss Report Component
function ProfitLossReport({ 
  data, 
  period, 
  loading, 
  accounts,
  revenueData = {}
}: { 
  data: any; 
  period: string; 
  loading: boolean; 
  accounts: FinancialAccount[];
  revenueData?: any;
}) {
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num || 0);
  };

  const getAccountsByType = (type: string) => {
    return accounts.filter(account => 
      account.accountType.toLowerCase().includes(type.toLowerCase())
    );
  };

  // Use date-filtered revenue from API (locationBreakdown) or fall back to incomeBreakdown from P&L endpoint
  const hasApiRevenueData = revenueData?.locationBreakdown && revenueData.locationBreakdown.length > 0;
  const hasIncomeBreakdown = data?.incomeBreakdown && data.incomeBreakdown.length > 0;
  
  // Build revenue items from API data (date-filtered) or Chart of Accounts (static)
  let revenueItems: Array<{ id: string | number; name: string; amount: number }> = [];
  
  if (hasApiRevenueData) {
    // Use live date-filtered revenue from multi-location API
    // API returns: locationId, locationName, totalSales, totalRevenue, platform
    revenueItems = revenueData.locationBreakdown.map((location: any) => ({
      id: location.locationId || location.locationName || 'unknown',
      name: `Sales - ${location.locationName}`,
      amount: parseFloat(location.totalSales || location.totalRevenue || '0')
    }));
  } else if (hasIncomeBreakdown) {
    // Use income breakdown from P&L API
    revenueItems = data.incomeBreakdown.map((item: any) => ({
      id: item.id,
      name: item.name,
      amount: parseFloat(item.amount || '0')
    }));
  } else {
    // Fall back to Chart of Accounts (static balances - not date filtered)
    const allRevenueAccounts = getAccountsByType('income');
    const filteredRevenueAccounts = allRevenueAccounts.filter(account => {
      const name = account.accountName.toLowerCase();
      const isSummaryAccount = name.includes('total sales') || 
                                name === 'total revenue' ||
                                name.includes('total income');
      return !isSummaryAccount;
    });
    revenueItems = filteredRevenueAccounts.map(account => ({
      id: account.id,
      name: account.accountName,
      amount: parseFloat(account.balance || '0')
    }));
  }
  
  // COGS accounts - identify by name patterns or account number (50xx range)
  const cogsAccounts = accounts.filter(account => {
    const name = account.accountName.toLowerCase();
    const accountNumber = (account as any).accountNumber || '';
    return name.includes('cost of goods') || 
           name.includes('cogs') || 
           name.includes('cost of sales') ||
           accountNumber.startsWith('50');
  });
  
  // Exclude COGS from Operating Expenses to prevent double-counting (COGS is shown in its own section)
  // Also exclude child accounts whose parent is already displayed (prevents Officer Income + Payroll Expense double-counting)
  const cogsAccountIds = new Set(cogsAccounts.map(a => a.id));
  
  // Get all expense accounts that are top-level (no parent)
  const topLevelExpenseIds = new Set(
    getAccountsByType('expense')
      .filter(acc => !(acc as any).parentAccountId)
      .map(acc => acc.id)
  );
  
  const operatingExpenseAccounts = getAccountsByType('expense').filter(account => {
    const name = account.accountName.toLowerCase();
    const accountNumber = (account as any).accountNumber || '';
    // Exclude Cost of Goods accounts by name or account number (50xx range)
    const isCOGS = name.includes('cost of goods') || 
                   name.includes('cogs') || 
                   name.includes('cost of sales') ||
                   cogsAccountIds.has(account.id) ||
                   accountNumber.startsWith('50');
    if (isCOGS) return false;
    
    // Exclude child accounts if their parent is already a top-level expense account
    // (parent's balance includes child balances, so showing both would double-count)
    const parentId = (account as any).parentAccountId;
    if (parentId && topLevelExpenseIds.has(parentId)) {
      return false;
    }
    
    return true;
  });
  
  // Calculate totals
  const calculatedTotalRevenue = revenueItems.reduce((sum, item) => sum + item.amount, 0);
  const calculatedTotalCOGS = cogsAccounts.reduce((sum, account) => 
    sum + parseFloat(account.balance || '0'), 0
  );
  const calculatedTotalExpenses = operatingExpenseAccounts.reduce((sum, account) => 
    sum + parseFloat(account.balance || '0'), 0
  );
  
  // Use API data for COGS if available (more accurate from live transactions), otherwise use account balance
  const totalCOGS = data.totalCOGS > 0 ? data.totalCOGS : calculatedTotalCOGS;
  const totalRevenue = calculatedTotalRevenue;
  const totalExpenses = calculatedTotalExpenses;
  const grossProfit = totalRevenue - totalCOGS;
  const netIncome = grossProfit - totalExpenses;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Profit & Loss Statement - {period}
        </CardTitle>
        <CardDescription>
          Income statement showing revenue, expenses, and net income
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Revenue Section */}
            <div>
              <h3 className="text-lg font-semibold text-green-600 mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Revenue
              </h3>
              <div className="space-y-2 ml-4">
                {revenueItems.length > 0 ? (
                  revenueItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <span className="text-sm">{item.name}</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    No revenue data available for this period
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between items-center font-semibold">
                  <span>Total Revenue</span>
                  <span className="text-green-600">
                    {formatCurrency(totalRevenue)}
                  </span>
                </div>
              </div>
            </div>

            {/* COGS Section */}
            <div>
              <h3 className="text-lg font-semibold text-orange-600 mb-3 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Cost of Goods Sold
              </h3>
              <div className="space-y-2 ml-4">
                {cogsAccounts.length > 0 ? (
                  cogsAccounts.map((account) => (
                    <div key={account.id} className="flex justify-between items-center">
                      <span className="text-sm">{account.accountName}</span>
                      <span className="font-medium text-orange-600">
                        {formatCurrency(account.balance)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cost of Goods Sold</span>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(totalCOGS)}
                    </span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between items-center font-semibold">
                  <span>Total COGS</span>
                  <span className="text-orange-600">
                    {formatCurrency(totalCOGS)}
                  </span>
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div className={`p-3 rounded-lg ${grossProfit >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
              <div className="flex justify-between items-center font-semibold text-lg">
                <span>Gross Profit</span>
                <span className={grossProfit >= 0 ? 'text-blue-600' : 'text-red-600'}>
                  {formatCurrency(grossProfit)}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Revenue - COGS
              </div>
            </div>

            {/* Expenses Section */}
            <div>
              <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Operating Expenses
              </h3>
              <div className="space-y-2 ml-4">
                {operatingExpenseAccounts.map((account) => (
                  <div key={account.id} className="flex justify-between items-center">
                    <span className="text-sm">{account.accountName}</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(account.balance)}
                    </span>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex justify-between items-center font-semibold">
                  <span>Total Operating Expenses</span>
                  <span className="text-red-600">
                    {formatCurrency(totalExpenses)}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Income */}
            <div className={`p-4 rounded-lg ${netIncome >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex justify-between items-center font-bold text-xl">
                <span>Net Income</span>
                <span className={netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(netIncome)}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Gross Profit - Operating Expenses
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Expense Detail Report Component
function ExpenseDetailReport({ 
  data, 
  period, 
  loading, 
  accounts 
}: { 
  data: any; 
  period: string; 
  loading: boolean; 
  accounts: FinancialAccount[];
}) {
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num || 0);
  };

  const expenseAccounts = accounts.filter(account => 
    account.accountType.toLowerCase().includes('expense')
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-600" />
          Expense Detail Report - {period}
        </CardTitle>
        <CardDescription>
          Detailed breakdown of all expenses by category
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600">
                  {formatCurrency(data.totalExpenses || 0)}
                </div>
                <div className="text-sm text-gray-600">Total Expenses</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-600">
                  {expenseAccounts.length}
                </div>
                <div className="text-sm text-gray-600">Expense Categories</div>
              </div>
            </div>

            <div className="space-y-3">
              {expenseAccounts.map((account) => {
                const amount = parseFloat(account.balance);
                const percentage = data.totalExpenses ? ((amount / data.totalExpenses) * 100).toFixed(1) : '0.0';
                
                return (
                  <div key={account.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h4 className="font-medium">{account.accountName}</h4>
                        <p className="text-sm text-gray-500">{account.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-red-600">
                          {formatCurrency(amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {percentage}% of total
                        </div>
                      </div>
                    </div>
                    <Progress 
                      value={parseFloat(percentage)} 
                      className="h-2" 
                    />
                  </div>
                );
              })}
            </div>

            {expenseAccounts.length === 0 && (
              <div className="text-center py-8">
                <TrendingDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No expense data found for this period.</p>
                <p className="text-sm text-gray-400">
                  Create expense transactions to see detailed reporting here.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Revenue Breakdown Report Component
function RevenueBreakdownReport({ 
  data, 
  period, 
  loading 
}: { 
  data: any; 
  period: string; 
  loading: boolean;
}) {
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num || 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-green-600" />
          Revenue Breakdown - {period}
        </CardTitle>
        <CardDescription>
          Revenue analysis by location and payment method with Clover integration
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Total Revenue Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(data.totalRevenue || 0)}
                </div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {data.locationBreakdown?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Active Locations</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  {formatCurrency(data.averageOrderValue || 0)}
                </div>
                <div className="text-sm text-gray-600">Avg Order Value</div>
              </div>
            </div>

            {/* Location Breakdown */}
            {data.locationBreakdown && data.locationBreakdown.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  Revenue by Location
                </h3>
                <div className="space-y-3">
                  {data.locationBreakdown.map((location: any, index: number) => {
                    const percentage = data.totalRevenue ? 
                      ((parseFloat(location.revenue) / parseFloat(data.totalRevenue)) * 100).toFixed(1) : '0.0';
                    
                    return (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              <Store className="h-4 w-4" />
                              {location.merchantName || location.name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {location.orderCount} orders • {location.source}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-green-600">
                              {formatCurrency(location.revenue)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {percentage}% of total
                            </div>
                          </div>
                        </div>
                        <Progress 
                          value={parseFloat(percentage)} 
                          className="h-2" 
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Performance Metrics */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                Performance Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Order Volume</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {data.totalOrders || 0}
                  </div>
                  <div className="text-sm text-gray-500">
                    Total orders processed
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Payment Methods</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Card Payments</span>
                      <span className="font-medium">{formatCurrency(data.cardRevenue || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cash/Mobile</span>
                      <span className="font-medium">{formatCurrency(data.cashRevenue || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {(!data.locationBreakdown || data.locationBreakdown.length === 0) && (
              <div className="text-center py-8">
                <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No revenue data found for this period.</p>
                <p className="text-sm text-gray-400">
                  Revenue data will appear here once transactions are processed.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Profit Margin Trends Report Component - Shows 6-month margin trends
function ProfitMarginTrendsReport() {
  const { data: trendsData, isLoading } = useQuery({
    queryKey: ['/api/accounting/reports/margin-trends'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/accounting/reports/margin-trends');
      return await response.json();
    },
  });

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num || 0);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const months = trendsData?.months || [];
  const hasData = months.length > 0;

  return (
    <Card data-testid="profit-margin-trends-report">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Profit Margin Trends - Last 6 Months
        </CardTitle>
        <CardDescription>
          Track gross and net margin performance over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No margin data available for the selected period.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 bg-green-50">
                <div className="text-sm text-gray-600 mb-1">Average Gross Margin</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatPercent(trendsData?.averageGrossMargin || 0)}
                </div>
              </div>
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="text-sm text-gray-600 mb-1">Average Net Margin</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatPercent(trendsData?.averageNetMargin || 0)}
                </div>
              </div>
              <div className="border rounded-lg p-4 bg-purple-50">
                <div className="text-sm text-gray-600 mb-1">Trend Direction</div>
                <div className={`text-2xl font-bold flex items-center gap-2 ${
                  trendsData?.trendDirection === 'up' ? 'text-green-600' : 
                  trendsData?.trendDirection === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {trendsData?.trendDirection === 'up' && <ArrowUp className="h-5 w-5" />}
                  {trendsData?.trendDirection === 'down' && <ArrowDown className="h-5 w-5" />}
                  {trendsData?.trendDirection === 'stable' && <Minus className="h-5 w-5" />}
                  {trendsData?.trendDirection === 'up' ? 'Improving' : 
                   trendsData?.trendDirection === 'down' ? 'Declining' : 'Stable'}
                </div>
              </div>
            </div>

            {/* Monthly Breakdown Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Month</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Revenue</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">COGS</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Gross Profit</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Gross Margin</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Net Margin</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">MoM Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {months.map((month: any, index: number) => (
                    <tr key={month.month} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{month.monthLabel}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(month.revenue)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatCurrency(month.cogs)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(month.grossProfit)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatPercent(month.grossMargin)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatPercent(month.netMargin)}</td>
                      <td className="px-4 py-3 text-center">
                        {index > 0 && month.marginChange !== 0 && (
                          <span className={`inline-flex items-center gap-1 ${
                            month.marginChange > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {month.marginChange > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            {formatPercent(Math.abs(month.marginChange))}
                          </span>
                        )}
                        {(index === 0 || month.marginChange === 0) && (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visual Progress Bar Chart */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Gross Margin Visualization</h4>
              {months.map((month: any) => (
                <div key={`bar-${month.month}`} className="flex items-center gap-3">
                  <div className="w-20 text-sm text-gray-600">{month.monthLabel?.substring(0, 3)}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(month.grossMargin, 100)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                      {formatPercent(month.grossMargin)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Product Profitability Report Component - Top and bottom performing products
function ProductProfitabilityReport({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data: productData, isLoading } = useQuery({
    queryKey: ['/api/accounting/reports/product-profitability', startDate, endDate],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/reports/product-profitability?startDate=${startDate}&endDate=${endDate}`);
      return await response.json();
    },
  });

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num || 0);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topProducts = productData?.topProducts || [];
  const bottomProducts = productData?.bottomProducts || [];

  return (
    <Card data-testid="product-profitability-report">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          Product Profitability Analysis
        </CardTitle>
        <CardDescription>
          Best and worst performing products by profit margin
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performing Products */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-green-600 mb-4 flex items-center gap-2">
              <ArrowUp className="h-4 w-4" />
              Top Performers
            </h4>
            {topProducts.length === 0 ? (
              <p className="text-gray-500 text-sm">No product data available</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product: any, index: number) => (
                  <div key={product.id || index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{product.name}</div>
                      <div className="text-xs text-gray-500">
                        {product.unitsSold} units sold
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">
                        {formatPercent(product.margin)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatCurrency(product.profit)} profit
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Performing Products */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-red-600 mb-4 flex items-center gap-2">
              <ArrowDown className="h-4 w-4" />
              Lowest Margins
            </h4>
            {bottomProducts.length === 0 ? (
              <p className="text-gray-500 text-sm">No product data available</p>
            ) : (
              <div className="space-y-3">
                {bottomProducts.map((product: any, index: number) => (
                  <div key={product.id || index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{product.name}</div>
                      <div className="text-xs text-gray-500">
                        {product.unitsSold} units sold
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-600">
                        {formatPercent(product.margin)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatCurrency(product.profit)} profit
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{productData?.totalProducts || 0}</div>
            <div className="text-sm text-gray-500">Total Products</div>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{formatPercent(productData?.averageMargin || 0)}</div>
            <div className="text-sm text-gray-500">Average Margin</div>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(productData?.totalRevenue || 0)}</div>
            <div className="text-sm text-gray-500">Total Revenue</div>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(productData?.totalProfit || 0)}</div>
            <div className="text-sm text-gray-500">Total Profit</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Location Comparison Report Component - COGS and margins across locations
function LocationComparisonReport({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data: locationData, isLoading } = useQuery({
    queryKey: ['/api/accounting/reports/location-comparison', startDate, endDate],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/reports/location-comparison?startDate=${startDate}&endDate=${endDate}`);
      return await response.json();
    },
  });

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num || 0);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const locations = locationData?.locations || [];

  return (
    <Card data-testid="location-comparison-report">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          Location Comparison
        </CardTitle>
        <CardDescription>
          Compare revenue, COGS, and margins across all store locations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {locations.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No location data available for the selected period.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Location Comparison Table */}
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Location</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Revenue</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">COGS</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Gross Profit</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Gross Margin</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Orders</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Avg Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {locations.map((location: any) => (
                    <tr key={location.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: location.displayColor || '#3b82f6' }}
                          />
                          <span className="font-medium">{location.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(location.revenue)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatCurrency(location.cogs)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(location.grossProfit)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${
                          location.grossMargin >= 50 ? 'text-green-600' :
                          location.grossMargin >= 30 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {formatPercent(location.grossMargin)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{location.orderCount}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(location.averageOrder)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-medium">
                  <tr>
                    <td className="px-4 py-3">Total / Average</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(locationData?.totalRevenue || 0)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(locationData?.totalCogs || 0)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(locationData?.totalGrossProfit || 0)}</td>
                    <td className="px-4 py-3 text-right">{formatPercent(locationData?.averageGrossMargin || 0)}</td>
                    <td className="px-4 py-3 text-right">{locationData?.totalOrders || 0}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(locationData?.averageOrderValue || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Visual Comparison Bars */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Comparison */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-4">Revenue by Location</h4>
                <div className="space-y-3">
                  {locations.map((location: any) => {
                    const maxRevenue = Math.max(...locations.map((l: any) => l.revenue));
                    const widthPercent = maxRevenue > 0 ? (location.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div key={`rev-${location.id}`} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{location.name}</span>
                          <span className="font-medium">{formatCurrency(location.revenue)}</span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-3">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${widthPercent}%`,
                              backgroundColor: location.displayColor || '#3b82f6'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Margin Comparison */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-4">Gross Margin by Location</h4>
                <div className="space-y-3">
                  {locations.map((location: any) => (
                    <div key={`margin-${location.id}`} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{location.name}</span>
                        <span className={`font-medium ${
                          location.grossMargin >= 50 ? 'text-green-600' :
                          location.grossMargin >= 30 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {formatPercent(location.grossMargin)}
                        </span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-3">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            location.grossMargin >= 50 ? 'bg-green-500' :
                            location.grossMargin >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(location.grossMargin, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Transactions Section Component
function TransactionsSection({ 
  canManageAccounts, 
  accounts 
}: { 
  canManageAccounts: boolean; 
  accounts: FinancialAccount[];
}) {
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/accounting/transactions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/accounting/transactions?limit=50');
      return await response.json();
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Financial Transactions
              </CardTitle>
              <CardDescription>
                View and manage all financial transactions and journal entries
              </CardDescription>
            </div>
            {canManageAccounts && (
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Transaction
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((transaction: any) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{transaction.description}</h3>
                      <Badge variant="outline">{transaction.transactionType}</Badge>
                      {transaction.referenceNumber && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {transaction.referenceNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-sm text-gray-500">{transaction.transactionDate}</p>
                      <p className="text-sm text-gray-400">• {transaction.sourceSystem}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium text-lg">${transaction.totalAmount}</p>
                      <Badge variant={transaction.status === 'posted' ? "default" : "secondary"}>
                        {transaction.status}
                      </Badge>
                    </div>
                    {canManageAccounts && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No transactions found. Create your first journal entry.</p>
              {canManageAccounts && (
                <Button>
                  Create First Transaction
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Daily Sales Report Component
function DailySalesReport({ 
  data, 
  period, 
  loading 
}: { 
  data: any; 
  period: string; 
  loading: boolean;
}) {
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num || 0);
  };

  const formatPercentage = (value: string | number) => {
    return `${value}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Daily Sales Report - {period}
        </CardTitle>
        <CardDescription>
          Daily aggregated sales data with revenue, costs, and profit analysis ({data.location || 'All Locations'})
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.totals?.netSales || 0)}
                </div>
                <div className="text-sm text-gray-600">Total Net Sales</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {data.totals?.orderCount || 0}
                </div>
                <div className="text-sm text-gray-600">Total Orders</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(data.totals?.netProfit || 0)}
                </div>
                <div className="text-sm text-gray-600">Net Profit</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {formatPercentage(data.totals?.netProfitMargin || '0.00')}
                </div>
                <div className="text-sm text-gray-600">Profit Margin</div>
              </div>
            </div>

            {/* Daily Sales Table */}
            {data.dailySales && data.dailySales.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Daily Sales Breakdown
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-right p-3 font-medium">Total</th>
                        <th className="text-right p-3 font-medium">Net Sales</th>
                        <th className="text-right p-3 font-medium">Discounts</th>
                        <th className="text-right p-3 font-medium">Refunds</th>
                        <th className="text-right p-3 font-medium">Net COGS</th>
                        <th className="text-right p-3 font-medium">Sales Tax</th>
                        <th className="text-right p-3 font-medium">Net Profit</th>
                        <th className="text-right p-3 font-medium">Orders</th>
                        <th className="text-right p-3 font-medium">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dailySales.map((day: any, index: number) => (
                        <tr key={day.date} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="p-3 font-medium">{new Date(day.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}</td>
                          <td className="p-3 text-right">{formatCurrency(day.total)}</td>
                          <td className="p-3 text-right text-green-600 font-medium">{formatCurrency(day.netSales)}</td>
                          <td className="p-3 text-right text-orange-600">{formatCurrency(day.discounts)}</td>
                          <td className="p-3 text-right text-red-600">{formatCurrency(day.refunds)}</td>
                          <td className="p-3 text-right text-purple-600">{formatCurrency(day.netCOGS)}</td>
                          <td className="p-3 text-right text-blue-600">{formatCurrency(day.netSalesTax)}</td>
                          <td className={`p-3 text-right font-medium ${parseFloat(day.netProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(day.netProfit)}
                          </td>
                          <td className="p-3 text-right">{day.orderCount}</td>
                          <td className={`p-3 text-right text-sm ${parseFloat(day.netProfitMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(day.netProfitMargin)}
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="border-t-2 bg-gray-100 font-bold">
                        <td className="p-3">Total</td>
                        <td className="p-3 text-right">{formatCurrency(data.totals?.total || 0)}</td>
                        <td className="p-3 text-right text-green-600">{formatCurrency(data.totals?.netSales || 0)}</td>
                        <td className="p-3 text-right text-orange-600">{formatCurrency(data.totals?.discounts || 0)}</td>
                        <td className="p-3 text-right text-red-600">{formatCurrency(data.totals?.refunds || 0)}</td>
                        <td className="p-3 text-right text-purple-600">{formatCurrency(data.totals?.netCOGS || 0)}</td>
                        <td className="p-3 text-right text-blue-600">{formatCurrency(data.totals?.netSalesTax || 0)}</td>
                        <td className={`p-3 text-right ${parseFloat(data.totals?.netProfit || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(data.totals?.netProfit || 0)}
                        </td>
                        <td className="p-3 text-right">{data.totals?.orderCount || 0}</td>
                        <td className={`p-3 text-right text-sm ${parseFloat(data.totals?.netProfitMargin || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercentage(data.totals?.netProfitMargin || '0.00')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No sales data found for this period.</p>
                <p className="text-sm text-gray-400">
                  Try selecting a different date range or check your integration settings.
                </p>
              </div>
            )}

            {/* Location Information */}
            {data.availableLocations && data.availableLocations.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Available Locations:</strong> {data.availableLocations.map((loc: any) => loc.name).join(', ')}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Use the location filter above to view specific location data
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Payroll Accrual Dialog Component
function PayrollAccrualDialog({ isOpen, onClose }: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const { toast } = useToast();

  // Preview payroll calculation
  const { data: payrollPreview, isLoading: previewLoading } = useQuery({
    queryKey: ['/api/accounting/payroll/preview', selectedMonth, selectedYear],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/payroll/preview?month=${selectedMonth}&year=${selectedYear}`);
      return await response.json();
    },
    enabled: isOpen && !!selectedMonth && !!selectedYear,
  });

  // Payroll accrual mutation
  const payrollMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/accounting/payroll/accrue', {
        month: selectedMonth,
        year: selectedYear,
        source: 'scheduled',
        replace: false
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Payroll accrual created successfully for ${data.accrual.employeeCount} employees ($${data.accrual.totalAmount})`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payroll accrual",
        variant: "destructive",
      });
    },
  });

  const handleAccrue = () => {
    payrollMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Payroll Accrual
          </DialogTitle>
          <DialogDescription>
            Calculate and create payroll accrual entries based on scheduled hours and employee wages
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Period Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="accrual-month">Month</Label>
              <Select 
                value={selectedMonth.toString()} 
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="accrual-year">Year</Label>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 3 }, (_, i) => (
                    <SelectItem key={2024 - i} value={(2024 - i).toString()}>
                      {2024 - i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview Results */}
          {previewLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : payrollPreview ? (
            <div className="space-y-4">
              {/* Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payroll Summary</CardTitle>
                  <CardDescription>
                    {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">${payrollPreview.totalAmount}</p>
                      <p className="text-sm text-gray-500">Total Payroll</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{payrollPreview.employeeCount}</p>
                      <p className="text-sm text-gray-500">Employees</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {payrollPreview.employeeBreakdown.reduce((sum: number, emp: any) => sum + emp.scheduledHours, 0)}
                      </p>
                      <p className="text-sm text-gray-500">Total Hours</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Employee Breakdown */}
              {payrollPreview.employeeBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Employee Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {payrollPreview.employeeBreakdown.map((employee: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{employee.userName}</p>
                            <p className="text-sm text-gray-500">
                              {employee.scheduledHours} hours × ${employee.hourlyRate}/hr
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${employee.totalCost}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No scheduled hours found for this period</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {payrollPreview && payrollPreview.employeeBreakdown.length > 0 && (
            <Button
              onClick={handleAccrue}
              disabled={payrollMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {payrollMutation.isPending ? 'Creating...' : `Create Accrual ($${payrollPreview.totalAmount})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AccountingDashboard() {
  return <AccountingContent />;
}