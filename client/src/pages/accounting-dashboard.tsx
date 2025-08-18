import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  RefreshCw
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import AdminLayout from '@/components/admin-layout';
import { useToast } from '@/hooks/use-toast';
import { RevenueAnalytics } from '@/components/revenue-analytics';
import { ComprehensiveOrderManagement } from '@/components/comprehensive-order-management';

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

function AccountingContent() {
  const [activeSection, setActiveSection] = useState('overview');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
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

  // Analytics data - today's data
  const today = new Date().toISOString().split('T')[0];
  const { data: profitLoss } = useQuery({
    queryKey: ['/api/accounting/analytics/profit-loss', today],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/accounting/analytics/profit-loss?startDate=${today}&endDate=${today}`);
      return await response.json();
    },
  });

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