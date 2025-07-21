import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Settings, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign,
  ShoppingCart,
  Heart,
  Package
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

  // Fetch integration statuses
  const { data: integrationStatus, isLoading } = useQuery({
    queryKey: ['/api/accounting/health'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

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

  const getIntegrations = (): IntegrationStatus[] => {
    if (!integrationStatus) return [];
    
    return [
      {
        name: 'QuickBooks',
        status: (integrationStatus as any).quickbooks || 'not_configured',
        icon: <DollarSign className="h-6 w-6" />,
        color: (integrationStatus as any).quickbooks === 'configured' ? 'bg-green-500' : 'bg-gray-400'
      },
      {
        name: 'Clover POS',
        status: (integrationStatus as any).clover || 'not_configured',
        icon: <ShoppingCart className="h-6 w-6" />,
        color: (integrationStatus as any).clover === 'configured' ? 'bg-green-500' : 'bg-gray-400'
      },
      {
        name: 'HSA Provider',
        status: (integrationStatus as any).hsa || 'not_configured',
        icon: <Heart className="h-6 w-6" />,
        color: (integrationStatus as any).hsa === 'configured' ? 'bg-green-500' : 'bg-gray-400'
      },
      {
        name: 'Thrive Inventory',
        status: (integrationStatus as any).thrive || 'not_configured',
        icon: <Package className="h-6 w-6" />,
        color: (integrationStatus as any).thrive === 'configured' ? 'bg-green-500' : 'bg-gray-400'
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Great Vibes, cursive' }}>
            External Integrations
          </h1>
          <p className="text-gray-600 mt-2">
            Connect and manage external systems for comprehensive business data
          </p>
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
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Connection Status</p>
                  <p className="text-sm text-gray-600">
                    Sync chart of accounts, customers, and vendors
                  </p>
                </div>
                {getStatusBadge((integrationStatus as any)?.quickbooks || 'not_configured')}
              </div>

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
                  Configure QuickBooks credentials in the accounting settings first. 
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
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Connection Status</p>
                  <p className="text-sm text-gray-600">
                    Sync daily sales, inventory, and transaction data
                  </p>
                </div>
                {getStatusBadge((integrationStatus as any)?.clover || 'not_configured')}
              </div>

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
                  Configure your Clover merchant ID and API token in the accounting settings. 
                  Sales data will be automatically synchronized daily.
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
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Connection Status</p>
                  <p className="text-sm text-gray-600">
                    Track HSA eligible expenses and compliance
                  </p>
                </div>
                {getStatusBadge((integrationStatus as any)?.hsa || 'not_configured')}
              </div>

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
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Connection Status</p>
                  <p className="text-sm text-gray-600">
                    Monitor inventory levels, stock movements, and purchase orders
                  </p>
                </div>
                {getStatusBadge((integrationStatus as any)?.thrive || 'not_configured')}
              </div>

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