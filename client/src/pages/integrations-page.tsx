import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { 
  Settings, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign,
  ShoppingCart,
  Heart,
  Package,
  ArrowLeft
} from 'lucide-react';

interface IntegrationStatus {
  name: string;
  status: 'connected' | 'error' | 'not_configured';
  lastSync?: Date;
  icon: React.ReactNode;
  color: string;
}

const IntegrationsPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [, setLocation] = useLocation();

  // Form states for credentials
  const [quickbooksCredentials, setQuickbooksCredentials] = useState({
    clientId: '',
    clientSecret: '',
    sandboxMode: true
  });

  const [cloverCredentials, setCloverCredentials] = useState({
    merchantId: '',
    apiToken: '',
    environment: 'production'
  });

  const [savedMerchants, setSavedMerchants] = useState([]);

  const [hsaCredentials, setHsaCredentials] = useState({
    providerId: '',
    apiKey: '',
    baseUrl: ''
  });

  const [thriveCredentials, setThriveCredentials] = useState({
    apiKey: '',
    baseUrl: '',
    warehouseId: ''
  });

  // Fetch integration statuses
  const { data: integrationStatus, isLoading } = useQuery({
    queryKey: ['/api/accounting/health'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch existing Clover configuration
  const { data: cloverConfig, error: cloverError, isLoading: cloverLoading, refetch: refetchClover } = useQuery({
    queryKey: ['/api/accounting/clover-config'],
    retry: 1,
    staleTime: 0,
    cacheTime: 0
  });

  // Force refresh the config data
  useEffect(() => {
    refetchClover();
  }, [refetchClover]);

  // Update form when data is loaded
  useEffect(() => {
    if (cloverConfig) {
      console.log('Loading Clover config:', cloverConfig);
      console.log('Setting form with:', {
        merchantId: cloverConfig.merchantId || cloverConfig.merchant_id || '',
        apiToken: cloverConfig.apiToken || cloverConfig.api_token || '',
        environment: 'production'
      });
      
      setCloverCredentials({
        merchantId: cloverConfig.merchantId || cloverConfig.merchant_id || '',
        apiToken: cloverConfig.apiToken || cloverConfig.api_token || '',
        environment: 'production'
      });
    } else if (cloverError) {
      console.error('Error loading Clover config:', cloverError);
    }
  }, [cloverConfig, cloverError]);

  // Debug logging for API responses
  useEffect(() => {
    console.log('Clover config from API:', cloverConfig);
    console.log('Current credentials state:', cloverCredentials);
    
    if (cloverConfig && cloverConfig.merchantId && !cloverCredentials.merchantId) {
      console.log('Loading credentials from API response');
    }
  }, [cloverConfig, cloverCredentials]);

  // Fetch all saved merchant configurations
  const { data: allMerchants } = useQuery({
    queryKey: ['/api/accounting/config/clover/all']
  });

  // Update merchants when data is loaded
  useEffect(() => {
    if (allMerchants) {
      setSavedMerchants(allMerchants);
    }
  }, [allMerchants]);

  // QuickBooks connection test
  const quickbooksTestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/integrations/quickbooks/test');
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? 'Connection Successful' : 'Connection Failed',
        description: data.message,
        variant: data.success ? 'default' : 'destructive'
      });
    },
    onError: (error) => {
      toast({
        title: 'Connection Test Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // QuickBooks sync accounts
  const quickbooksSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/integrations/quickbooks/sync/accounts');
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Sync Successful',
        description: data.message,
        variant: 'default'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/accounts'] });
    },
    onError: (error) => {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Clover connection test
  const cloverTestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/integrations/clover/test');
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? 'Connection Successful' : 'Connection Failed',
        description: data.message,
        variant: data.success ? 'default' : 'destructive'
      });
    },
    onError: (error) => {
      toast({
        title: 'Connection Test Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Clover sync sales
  const cloverSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/integrations/clover/sync/sales');
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Sales Sync Successful',
        description: data.message,
        variant: 'default'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/health'] });
    },
    onError: (error) => {
      toast({
        title: 'Sales Sync Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // HSA connection test
  const hsaTestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/integrations/hsa/test');
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? 'Connection Successful' : 'Connection Failed',
        description: data.message,
        variant: data.success ? 'default' : 'destructive'
      });
    }
  });

  // Thrive connection test
  const thriveTestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/integrations/thrive/test');
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? 'Connection Successful' : 'Connection Failed',
        description: data.message,
        variant: 'default'
      });
    }
  });

  // Thrive sync inventory
  const thriveSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/integrations/thrive/sync/inventory');
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Inventory Sync Successful',
        description: data.message,
        variant: 'default'
      });
    }
  });

  // Save credentials mutations
  const saveQuickbooksMutation = useMutation({
    mutationFn: async (credentials: typeof quickbooksCredentials) => {
      const response = await apiRequest('POST', '/api/accounting/config/quickbooks', credentials);
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: 'QuickBooks credentials saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/health'] });
    }
  });

  const saveCloverMutation = useMutation({
    mutationFn: async (credentials: typeof cloverCredentials) => {
      const response = await apiRequest('POST', '/api/accounting/config/clover', credentials);
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: 'Clover credentials saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/health'] });
    }
  });

  const saveHsaMutation = useMutation({
    mutationFn: async (credentials: typeof hsaCredentials) => {
      const response = await apiRequest('POST', '/api/accounting/config/hsa', credentials);
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: 'HSA credentials saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/health'] });
    }
  });

  const saveThriveMutation = useMutation({
    mutationFn: async (credentials: typeof thriveCredentials) => {
      const response = await apiRequest('POST', '/api/accounting/config/thrive', credentials);
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: 'Thrive credentials saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/health'] });
    }
  });

  const getIntegrations = (): IntegrationStatus[] => {
    if (!integrationStatus) return [];
    
    return [
      {
        name: 'QuickBooks',
        status: (integrationStatus as any).quickbooks || 'not_configured',
        icon: <DollarSign className="h-6 w-6" />,
        color: (integrationStatus as any).quickbooks === 'connected' ? 'bg-green-500' : 'bg-gray-400'
      },
      {
        name: 'Clover POS',
        status: (integrationStatus as any).clover || 'not_configured',
        icon: <ShoppingCart className="h-6 w-6" />,
        color: (integrationStatus as any).clover === 'connected' ? 'bg-green-500' : 'bg-gray-400'
      },
      {
        name: 'HSA Provider',
        status: (integrationStatus as any).hsa || 'not_configured',
        icon: <Heart className="h-6 w-6" />,
        color: (integrationStatus as any).hsa === 'connected' ? 'bg-green-500' : 'bg-gray-400'
      },
      {
        name: 'Thrive Inventory',
        status: (integrationStatus as any).thrive || 'not_configured',
        icon: <Package className="h-6 w-6" />,
        color: (integrationStatus as any).thrive === 'connected' ? 'bg-green-500' : 'bg-gray-400'
      }
    ];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'configured':
        return <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>;
      case 'connected':
        return <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Not Configured</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading integrations...</span>
        </div>
      </div>
    );
  }

  const integrations = getIntegrations();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/accounting')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Great Vibes, cursive' }}>
              External Integrations
            </h1>
            <p className="text-gray-600 mt-2">
              Connect and manage external systems for comprehensive business data
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/accounting/health'] })}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quickbooks">QuickBooks</TabsTrigger>
          <TabsTrigger value="clover">Clover POS</TabsTrigger>
          <TabsTrigger value="hsa">HSA Provider</TabsTrigger>
          <TabsTrigger value="thrive">Thrive</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {integrations.map((integration) => (
              <Card key={integration.name} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <div className={`p-2 rounded-lg text-white mr-3 ${integration.color}`}>
                    {integration.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-sm font-medium">
                      {integration.name}
                    </CardTitle>
                    {getStatusBadge(integration.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-gray-500">
                    {integration.status === 'configured' 
                      ? 'Ready for data sync'
                      : 'Configuration required'
                    }
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Alert>
            <Settings className="h-4 w-4" />
            <AlertTitle>Getting Started</AlertTitle>
            <AlertDescription>
              To connect external systems, configure each integration using their respective tabs. 
              You'll need API credentials from each provider.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="quickbooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                QuickBooks Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Connection Status</p>
                  <p className="text-sm text-gray-600">
                    Sync chart of accounts, customers, and vendors
                  </p>
                </div>
                {getStatusBadge((integrationStatus as any)?.quickbooks || 'not_configured')}
              </div>

              {/* Credentials Form */}
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">API Credentials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="qb-client-id">Client ID</Label>
                      <Input
                        id="qb-client-id"
                        type="text"
                        value={quickbooksCredentials.clientId}
                        onChange={(e) => setQuickbooksCredentials(prev => ({ ...prev, clientId: e.target.value }))}
                        placeholder="Enter QuickBooks Client ID"
                      />
                    </div>
                    <div>
                      <Label htmlFor="qb-client-secret">Client Secret</Label>
                      <Input
                        id="qb-client-secret"
                        type="password"
                        value={quickbooksCredentials.clientSecret}
                        onChange={(e) => setQuickbooksCredentials(prev => ({ ...prev, clientSecret: e.target.value }))}
                        placeholder="Enter QuickBooks Client Secret"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      id="qb-sandbox"
                      type="checkbox"
                      checked={quickbooksCredentials.sandboxMode}
                      onChange={(e) => setQuickbooksCredentials(prev => ({ ...prev, sandboxMode: e.target.checked }))}
                    />
                    <Label htmlFor="qb-sandbox">Use Sandbox Environment</Label>
                  </div>
                  <Button 
                    onClick={() => saveQuickbooksMutation.mutate(quickbooksCredentials)}
                    disabled={saveQuickbooksMutation.isPending || !quickbooksCredentials.clientId || !quickbooksCredentials.clientSecret}
                  >
                    {saveQuickbooksMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    Save Credentials
                  </Button>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button 
                  onClick={() => quickbooksTestMutation.mutate()}
                  disabled={quickbooksTestMutation.isPending}
                  variant="outline"
                >
                  {quickbooksTestMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Test Connection
                </Button>
                
                <Button 
                  onClick={() => quickbooksSyncMutation.mutate()}
                  disabled={quickbooksSyncMutation.isPending}
                >
                  {quickbooksSyncMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Sync Accounts
                </Button>
              </div>

              <Alert>
                <AlertDescription>
                  Enter your QuickBooks app credentials above, then test the connection. 
                  Once connected, you can sync your chart of accounts and customer data.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clover" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Clover POS Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Connection Status</p>
                  <p className="text-sm text-gray-600">
                    Sync daily sales, inventory, and transaction data
                  </p>
                </div>
                {getStatusBadge((integrationStatus as any)?.clover || 'not_configured')}
              </div>

              {/* Credentials Form */}
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">API Credentials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Saved Merchants Display */}
                  {savedMerchants && savedMerchants.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Saved Merchant Configurations</h4>
                      <div className="space-y-2">
                        {savedMerchants.map((merchant, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{merchant.merchantName || `Merchant ${index + 1}`}</div>
                              <div className="text-xs text-gray-500">ID: {merchant.merchantId}</div>
                              <div className="text-xs text-gray-500">Token: {merchant.apiToken ? `${merchant.apiToken.slice(0, 8)}...` : 'Not set'}</div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCloverCredentials({
                                  merchantId: merchant.merchantId,
                                  apiToken: merchant.apiToken,
                                  environment: 'production'
                                });
                              }}
                            >
                              Use
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="clover-merchant-id">Merchant ID</Label>
                      <Input
                        id="clover-merchant-id"
                        type="text"
                        value={cloverCredentials.merchantId}
                        onChange={(e) => setCloverCredentials(prev => ({ ...prev, merchantId: e.target.value }))}
                        placeholder="e.g., 2DWZED6B4ZVF1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="clover-api-token">API Token</Label>
                      <Input
                        id="clover-api-token"
                        type="text"
                        value={cloverCredentials.apiToken}
                        onChange={(e) => setCloverCredentials(prev => ({ ...prev, apiToken: e.target.value }))}
                        placeholder="e.g., 0536d75e-8fe8-b412-f483-8bfb08d7365f"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="clover-environment">Environment</Label>
                    <div className="w-full p-2 border rounded-md bg-gray-50 text-gray-700">
                      Production
                    </div>
                    <input type="hidden" name="environment" value="production" />
                  </div>
                  <Button 
                    onClick={() => saveCloverMutation.mutate(cloverCredentials)}
                    disabled={saveCloverMutation.isPending || !cloverCredentials.merchantId || !cloverCredentials.apiToken}
                  >
                    {saveCloverMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    Save Credentials
                  </Button>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button 
                  onClick={() => cloverTestMutation.mutate()}
                  disabled={cloverTestMutation.isPending}
                  variant="outline"
                >
                  {cloverTestMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Test Connection
                </Button>
                
                <Button 
                  onClick={() => cloverSyncMutation.mutate()}
                  disabled={cloverSyncMutation.isPending}
                >
                  {cloverSyncMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Sync Today's Sales
                </Button>
              </div>

              <Alert>
                <AlertDescription>
                  Enter your Clover merchant ID and API token above. 
                  Sales data will be automatically synchronized daily once configured.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hsa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                HSA Provider Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Connection Status</p>
                  <p className="text-sm text-gray-600">
                    Track HSA eligible expenses and compliance
                  </p>
                </div>
                {getStatusBadge((integrationStatus as any)?.hsa || 'not_configured')}
              </div>

              {/* Credentials Form */}
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">HSA Provider Credentials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="hsa-provider-id">Provider ID</Label>
                      <Input
                        id="hsa-provider-id"
                        type="text"
                        value={hsaCredentials.providerId}
                        onChange={(e) => setHsaCredentials(prev => ({ ...prev, providerId: e.target.value }))}
                        placeholder="Enter HSA Provider ID"
                      />
                    </div>
                    <div>
                      <Label htmlFor="hsa-api-key">API Key</Label>
                      <Input
                        id="hsa-api-key"
                        type="password"
                        value={hsaCredentials.apiKey}
                        onChange={(e) => setHsaCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                        placeholder="Enter HSA API Key"
                      />
                    </div>
                    <div>
                      <Label htmlFor="hsa-base-url">Base URL</Label>
                      <Input
                        id="hsa-base-url"
                        type="url"
                        value={hsaCredentials.baseUrl}
                        onChange={(e) => setHsaCredentials(prev => ({ ...prev, baseUrl: e.target.value }))}
                        placeholder="https://api.hsaprovider.com"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={() => saveHsaMutation.mutate(hsaCredentials)}
                    disabled={saveHsaMutation.isPending || !hsaCredentials.providerId || !hsaCredentials.apiKey}
                  >
                    {saveHsaMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    Save Credentials
                  </Button>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button 
                  onClick={() => hsaTestMutation.mutate()}
                  disabled={hsaTestMutation.isPending}
                  variant="outline"
                >
                  {hsaTestMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Test Connection
                </Button>
              </div>

              <Alert>
                <AlertDescription>
                  Connect your HSA provider to automatically track eligible medical expenses 
                  and ensure compliance with IRS regulations.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="thrive" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Thrive Inventory Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Connection Status</p>
                  <p className="text-sm text-gray-600">
                    Monitor inventory levels, stock movements, and purchase orders
                  </p>
                </div>
                {getStatusBadge((integrationStatus as any)?.thrive || 'not_configured')}
              </div>

              {/* Credentials Form */}
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Thrive API Credentials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="thrive-api-key">API Key</Label>
                      <Input
                        id="thrive-api-key"
                        type="password"
                        value={thriveCredentials.apiKey}
                        onChange={(e) => setThriveCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                        placeholder="Enter Thrive API Key"
                      />
                    </div>
                    <div>
                      <Label htmlFor="thrive-base-url">Base URL</Label>
                      <Input
                        id="thrive-base-url"
                        type="url"
                        value={thriveCredentials.baseUrl}
                        onChange={(e) => setThriveCredentials(prev => ({ ...prev, baseUrl: e.target.value }))}
                        placeholder="https://api.thrive.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="thrive-warehouse-id">Warehouse ID</Label>
                      <Input
                        id="thrive-warehouse-id"
                        type="text"
                        value={thriveCredentials.warehouseId}
                        onChange={(e) => setThriveCredentials(prev => ({ ...prev, warehouseId: e.target.value }))}
                        placeholder="Enter Warehouse ID"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={() => saveThriveMutation.mutate(thriveCredentials)}
                    disabled={saveThriveMutation.isPending || !thriveCredentials.apiKey || !thriveCredentials.baseUrl}
                  >
                    {saveThriveMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    Save Credentials
                  </Button>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button 
                  onClick={() => thriveTestMutation.mutate()}
                  disabled={thriveTestMutation.isPending}
                  variant="outline"
                >
                  {thriveTestMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Test Connection
                </Button>
                
                <Button 
                  onClick={() => thriveSyncMutation.mutate()}
                  disabled={thriveSyncMutation.isPending}
                >
                  {thriveSyncMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Sync Inventory
                </Button>
              </div>

              <Alert>
                <AlertDescription>
                  Connect to Thrive for real-time inventory management. 
                  Track stock levels, reorder points, and automate purchase orders.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default IntegrationsPage;