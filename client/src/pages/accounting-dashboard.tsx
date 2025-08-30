import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
} from '@/components/ui/dialog';
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
  CheckCircle2,
  AlertTriangle,
  Calculator
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import AdminLayout from '@/components/admin-layout';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { RevenueAnalytics } from '@/components/revenue-analytics';
import { ComprehensiveOrderManagement } from '@/components/comprehensive-order-management';
import { InventoryManagement } from '@/components/inventory-management';

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
  accountName: string;
  accountType: string;
  balance: string;
  isActive: boolean;
};

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

function AccountingContent() {
  const [activeSection, setActiveSection] = useState('overview');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Goal setting state
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [monthlyGoals, setMonthlyGoals] = useState<MonthlyGoals | null>(null);
  const [goalForm, setGoalForm] = useState({
    revenue: '',
    profit: '',
    profitMargin: '',
    notes: ''
  });

  // Load goals from localStorage on component mount
  useEffect(() => {
    const currentMonthKey = `monthly_goals_${currentMonth.getFullYear()}_${currentMonth.getMonth()}`;
    const savedGoals = localStorage.getItem(currentMonthKey);
    if (savedGoals) {
      setMonthlyGoals(JSON.parse(savedGoals));
    }
  }, []);

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

  // Financial accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery<FinancialAccount[]>({
    queryKey: ['/api/accounting/accounts'],
  });

  // Analytics data - today's data (current calendar date)
  const today = new Date().toISOString().split('T')[0];
  
  const { data: profitLoss } = useQuery({
    queryKey: ['/api/accounting/analytics/profit-loss', today],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/analytics/profit-loss?startDate=${today}&endDate=${today}`);
      return await response.json();
    },
  });

  // Month-to-date analytics data
  const currentMonth = new Date();
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
  const { data: monthlyProfitLoss } = useQuery({
    queryKey: ['/api/accounting/analytics/profit-loss', monthStart, today],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/analytics/profit-loss?startDate=${monthStart}&endDate=${today}`);
      return await response.json();
    },
  });

  // Calculate BI metrics from real data
  const calculateBIMetrics = () => {
    if (!monthlyProfitLoss) return null;
    
    const monthlyRevenue = parseFloat(monthlyProfitLoss.revenue || '0');
    const monthlyExpenses = parseFloat(monthlyProfitLoss.expenses || '0');
    const daysElapsed = new Date().getDate();
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - daysElapsed;
    
    const dailyAverage = monthlyRevenue / daysElapsed;
    const projectedRevenue = dailyAverage * daysInMonth;
    const profitMargin = monthlyRevenue > 0 ? ((monthlyRevenue - monthlyExpenses) / monthlyRevenue * 100) : 0;
    
    return {
      monthlyRevenue,
      monthlyExpenses,
      profitMargin,
      dailyAverage,
      projectedRevenue,
      daysElapsed,
      daysRemaining,
      confidence: Math.min(95, 60 + (daysElapsed * 2)) // Increases with more data
    };
  };

  const biMetrics = calculateBIMetrics();

  // Goal handling functions
  const handleSaveGoals = () => {
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

    const goals: MonthlyGoals = {
      revenue,
      profit,
      profitMargin,
      notes: goalForm.notes,
      month: `${currentMonth.getFullYear()}-${currentMonth.getMonth() + 1}`,
      setDate: new Date().toISOString()
    };

    const currentMonthKey = `monthly_goals_${currentMonth.getFullYear()}_${currentMonth.getMonth()}`;
    localStorage.setItem(currentMonthKey, JSON.stringify(goals));
    setMonthlyGoals(goals);
    setIsGoalDialogOpen(false);
    setGoalForm({ revenue: '', profit: '', profitMargin: '', notes: '' });

    toast({
      title: "Goals Saved",
      description: "Monthly goals have been successfully saved",
      variant: "default",
    });
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

  // Multi-location analytics
  const { data: multiLocationData } = useQuery<MultiLocationAnalytics>({
    queryKey: ['/api/accounting/analytics/multi-location', today],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/analytics/multi-location?startDate=${today}&endDate=${today}`);
      return await response.json();
    },
  });

  // Cost of Goods Sold analytics - Daily
  const { data: cogsData } = useQuery({
    queryKey: ['/api/accounting/analytics/cogs', today],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/analytics/cogs?startDate=${today}&endDate=${today}`);
      return await response.json();
    },
  });

  // Cost of Goods Sold analytics - Monthly (month-to-date)
  const { data: monthlyCogsData } = useQuery({
    queryKey: ['/api/accounting/analytics/cogs', monthStart, today],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/analytics/cogs?startDate=${monthStart}&endDate=${today}`);
      return await response.json();
    },
  });

  // Inventory sync mutation
  const inventorySync = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/accounting/sync-inventory');
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('Sync success data:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/analytics/cogs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/analytics/multi-location'] });
      
      const successCount = data.results?.filter((r: any) => r.status === 'success').length || 0;
      const totalLocations = data.results?.length || 0;
      
      toast({
        title: "Inventory Sync Complete! 🎉",
        description: `Successfully synced product costs from ${successCount}/${totalLocations} Clover locations. Cost analysis data updated.`,
        variant: "default",
        duration: 5000,
      });
    },
    onError: (error) => {
      console.error('Sync error:', error);
      toast({
        title: "Inventory Sync Failed",
        description: "Failed to sync product costs. Please try again.",
        variant: "destructive",
      });
    },
  });

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
              onClick={() => setActiveSection('orders')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'orders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Order Management
            </button>
            <button
              onClick={() => setActiveSection('inventory')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'inventory'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Inventory
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
                  <div className="text-2xl font-bold">${(profitLoss as any)?.revenue || '0.00'}</div>
                  <p className="text-xs text-muted-foreground">Today</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(profitLoss as any)?.expenses || '0.00'}</div>
                  <p className="text-xs text-muted-foreground">Today</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Income</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(profitLoss as any)?.netIncome || '0.00'}</div>
                  <p className="text-xs text-muted-foreground">Today</p>
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
                      onClick={() => {
                        // Just sync inventory costs - the COGS endpoint now uses live data automatically
                        inventorySync.mutate();
                      }}
                      disabled={inventorySync.isPending}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Calculator className="h-4 w-4" />
                      {inventorySync.isPending ? 'Syncing...' : 'Sync Product Costs'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {cogsData ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-xl font-bold text-green-600">${cogsData.totalRevenue}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Cost of Goods</p>
                      <p className="text-xl font-bold text-red-600">${cogsData.totalCost}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Gross Profit</p>
                      <p className="text-xl font-bold text-blue-600">${cogsData.grossProfit}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Gross Margin</p>
                      <p className="text-xl font-bold text-purple-600">{cogsData.grossMargin}%</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No cost data available</p>
                    <p className="text-sm text-gray-400 mb-4">Sync inventory to get product costs and profit insights</p>
                    <Button
                      onClick={() => inventorySync.mutate()}
                      disabled={inventorySync.isPending}
                      size="sm"
                    >
                      {inventorySync.isPending ? 'Syncing Inventory...' : 'Sync Product Costs'}
                    </Button>
                  </div>
                )}
                
                {cogsData && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Items Sold: {cogsData.totalItemsSold}</span>
                      <span>Unique Products: {cogsData.uniqueItems}</span>
                    </div>
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
                      <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            className="flex items-center gap-2"
                            onClick={() => {
                              resetGoalForm();
                              setIsGoalDialogOpen(true);
                            }}
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
                          <span className="font-bold text-orange-600">${monthlyCogsData?.totalCost || '0.00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Expenses:</span>
                          <span className="font-bold text-red-600">${biMetrics?.monthlyExpenses?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-sm font-medium">Gross Profit:</span>
                          <span className="font-bold text-blue-600">${monthlyCogsData?.grossProfit || '0.00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Gross Margin:</span>
                          <span className="font-bold text-blue-600">{monthlyCogsData?.grossMargin || '0.0'}%</span>
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
                          <span className="font-medium text-green-600">${(profitLoss as any)?.revenue || '0.00'}</span>
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
                            ${monthlyCogsData ? parseFloat(monthlyCogsData.grossProfit).toLocaleString() : '0'} / ${monthlyGoals.profit.toLocaleString()}
                          </span>
                        </div>
                        <div className="relative">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ease-out ${
                                monthlyCogsData && (parseFloat(monthlyCogsData.grossProfit) / monthlyGoals.profit) >= 1.0 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                monthlyCogsData && (parseFloat(monthlyCogsData.grossProfit) / monthlyGoals.profit) >= 0.8 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                                monthlyCogsData && (parseFloat(monthlyCogsData.grossProfit) / monthlyGoals.profit) >= 0.5 ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                                'bg-gradient-to-r from-red-400 to-red-500'
                              }`}
                              style={{ width: `${Math.min(100, monthlyCogsData ? (parseFloat(monthlyCogsData.grossProfit) / monthlyGoals.profit) * 100 : 0)}%` }}
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
                            {monthlyCogsData && parseFloat(monthlyCogsData.grossProfit) >= monthlyGoals.profit 
                              ? 'Goal Achieved!' 
                              : `${monthlyCogsData ? ((parseFloat(monthlyCogsData.grossProfit) / monthlyGoals.profit) * 100).toFixed(1) : '0.0'}% Complete`}
                          </span>
                        </div>
                      </div>

                      {/* Profit Margin Gauge */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Profit Margin</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {monthlyCogsData ? parseFloat(monthlyCogsData.grossMargin).toFixed(1) : '0.0'}% / {monthlyGoals.profitMargin}%
                          </span>
                        </div>
                        <div className="relative">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ease-out ${
                                monthlyCogsData && (parseFloat(monthlyCogsData.grossMargin) / monthlyGoals.profitMargin) >= 1.0 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                monthlyCogsData && (parseFloat(monthlyCogsData.grossMargin) / monthlyGoals.profitMargin) >= 0.8 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                                monthlyCogsData && (parseFloat(monthlyCogsData.grossMargin) / monthlyGoals.profitMargin) >= 0.5 ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                                'bg-gradient-to-r from-red-400 to-red-500'
                              }`}
                              style={{ width: `${Math.min(100, monthlyCogsData ? (parseFloat(monthlyCogsData.grossMargin) / monthlyGoals.profitMargin) * 100 : 0)}%` }}
                            />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-semibold text-white drop-shadow">
                              {monthlyCogsData ? parseFloat(monthlyCogsData.grossMargin).toFixed(1) : '0.0'}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {monthlyCogsData && parseFloat(monthlyCogsData.grossMargin) >= monthlyGoals.profitMargin ? (
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
                                <div className="font-bold text-orange-600">${(profitLoss as any)?.revenue || '0.00'}</div>
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
                                <div className="font-bold">${biMetrics.monthlyExpenses?.toFixed(2) || '0.00'}</div>
                                <div className="text-xs text-gray-500">MTD</div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                <span className="text-sm">Daily Avg</span>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">${(biMetrics.monthlyExpenses / biMetrics.daysElapsed)?.toFixed(2) || '0.00'}</div>
                                <div className="text-xs text-gray-500">per day</div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                <span className="text-sm">Net Profit</span>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">${(biMetrics.monthlyRevenue - biMetrics.monthlyExpenses)?.toFixed(2) || '0.00'}</div>
                                <div className="text-xs text-green-600">{biMetrics.profitMargin?.toFixed(1)}%</div>
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
              <Card>
                <CardHeader>
                  <CardTitle>Chart of Accounts</CardTitle>
                  <CardDescription>
                    Manage your financial account structure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {accountsLoading ? (
                    <div className="flex items-center justify-center h-20">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : accounts.length > 0 ? (
                    <div className="space-y-2">
                      {accounts.map((account) => (
                        <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <h3 className="font-medium">{account.accountName}</h3>
                            <p className="text-sm text-gray-500">{account.accountType}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${account.balance}</p>
                            <Badge variant={account.isActive ? "default" : "secondary"}>
                              {account.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No accounts found. Start by setting up your chart of accounts.</p>
                      <Button>Add First Account</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Transactions Section */}
          {activeSection === 'transactions' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Transactions</CardTitle>
                  <CardDescription>
                    View and manage all financial transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Transaction management will be available in Phase 2.</p>
                    <Button variant="outline" disabled>Coming Soon</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Reports Section */}
          {activeSection === 'reports' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Reports</CardTitle>
                  <CardDescription>
                    Generate and view financial reports
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Advanced reporting will be available in Phase 3.</p>
                    <Button variant="outline" disabled>Coming Soon</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
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

          {/* Order Management Section */}
          {activeSection === 'orders' && (
            <div className="space-y-6">
              <ComprehensiveOrderManagement />
            </div>
          )}

          {/* Inventory Management Section */}
          {activeSection === 'inventory' && (
            <div className="space-y-6">
              <InventoryManagement />
            </div>
          )}

          {/* Revenue Analytics Section */}
          {activeSection === 'analytics' && (
            <div className="space-y-6">
              <RevenueAnalytics />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default function AccountingDashboard() {
  return <AccountingContent />;
}