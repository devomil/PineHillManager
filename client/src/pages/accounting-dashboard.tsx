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
  CreditCard
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import AdminLayout from '@/components/admin-layout';

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
  
  // System health check
  const { data: systemHealth, isLoading: healthLoading } = useQuery<SystemHealth>({
    queryKey: ['/api/accounting/health'],
    refetchInterval: 30000, // Check every 30 seconds
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Accounting Dashboard
          </h2>
          <p className="text-gray-600">
            Comprehensive financial management and reporting system
          </p>
        </div>

        {/* Multi-Location Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Active Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cloverLocations.filter(l => l.isActive).length}</div>
              <p className="text-sm text-gray-500">Clover POS locations</p>
              <div className="mt-3 space-y-1">
                {cloverLocations.filter(l => l.isActive).map(location => (
                  <div key={location.id} className="flex items-center justify-between text-xs">
                    <span>{location.merchantName}</span>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Combined Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${multiLocationData?.totalSummary?.totalRevenue || '0.00'}
              </div>
              <p className="text-sm text-gray-500">Today across all locations</p>
              <div className="mt-3">
                <div className="text-xs text-gray-500">
                  {multiLocationData?.totalSummary?.totalTransactions || 0} transactions
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Top Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              {multiLocationData?.locationBreakdown && multiLocationData.locationBreakdown.length > 0 ? (
                <>
                  <div className="text-lg font-bold">
                    {multiLocationData.locationBreakdown[0]?.locationName || 'Unknown'}
                  </div>
                  <p className="text-sm text-gray-500">
                    ${multiLocationData.locationBreakdown[0]?.totalSales || '0.00'} revenue
                  </p>
                  <div className="mt-3">
                    <div className="text-xs text-gray-500">
                      {multiLocationData.locationBreakdown[0]?.transactionCount || 0} transactions
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-lg font-bold text-gray-400">No data</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Location Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Location Performance
            </CardTitle>
            <CardDescription>
              Individual location sales data for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            {multiLocationData?.locationBreakdown && multiLocationData.locationBreakdown.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {multiLocationData.locationBreakdown.map((location, index) => {
                  return (
                    <div key={location.locationId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{location.locationName || `Location ${location.locationId}`}</h3>
                        <Badge variant="outline">
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          {location.transactionCount}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Revenue</span>
                          <span className="font-medium">${location.totalSales}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Avg Sale</span>
                          <span className="font-medium">${location.avgSale}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(100, (parseFloat(location.totalSales) / parseFloat(multiLocationData.totalSummary.totalRevenue)) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No sales data available for today
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Health Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>
              Real-time status of all integrations and connections
            </CardDescription>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="flex items-center justify-center h-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : systemHealth ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Database</span>
                  {getStatusIcon(systemHealth.database)}
                  <Badge className={getStatusColor(systemHealth.database)}>
                    {systemHealth.database}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">QuickBooks</span>
                  {getStatusIcon(systemHealth.quickbooks)}
                  <Badge className={getStatusColor(systemHealth.quickbooks)}>
                    {systemHealth.quickbooks === 'not_configured' ? 'Setup Needed' : systemHealth.quickbooks}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Clover POS</span>
                  {getStatusIcon(systemHealth.clover)}
                  <Badge className={getStatusColor(systemHealth.clover)}>
                    {systemHealth.clover === 'not_configured' ? 'Setup Needed' : systemHealth.clover}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">HSA</span>
                  {getStatusIcon(systemHealth.hsa)}
                  <Badge className={getStatusColor(systemHealth.hsa)}>
                    {systemHealth.hsa === 'not_configured' ? 'Setup Needed' : systemHealth.hsa}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Thrive</span>
                  {getStatusIcon(systemHealth.thrive)}
                  <Badge className={getStatusColor(systemHealth.thrive)}>
                    {systemHealth.thrive === 'not_configured' ? 'Setup Needed' : systemHealth.thrive}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Unable to fetch system status</p>
            )}
          </CardContent>
        </Card>

        {/* Main Dashboard Navigation */}
        <div className="space-y-6">
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

          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
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
        </div>
      </div>
    </AdminLayout>
  );
}

export default function AccountingDashboard() {
  return <AccountingContent />;
}