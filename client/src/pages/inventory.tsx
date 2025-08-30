import { useAuth } from '@/hooks/use-auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  BarChart3,
  Users,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Calculator,
  ArrowLeft
} from 'lucide-react';
import { InventoryManagement } from '@/components/inventory-management';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

export default function InventoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  // Inventory sync mutation - preserve functionality from accounting dashboard
  const inventorySync = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/accounting/sync-inventory');
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('Sync success data:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/analytics/cogs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/analytics/multi-location'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/inventory'] });
      
      const successCount = data.results?.filter((r: any) => r.status === 'success').length || 0;
      const totalLocations = data.results?.length || 0;
      
      toast({
        title: "Inventory sync completed",
        description: `Successfully synced ${successCount}/${totalLocations} locations`,
      });
    },
    onError: (error) => {
      console.error('Sync error:', error);
      toast({
        title: "Sync failed",
        description: "Failed to sync inventory data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Check if user has access to inventory (admin, manager, or specific departments)
  const hasInventoryAccess = user?.role === 'admin' || 
                            user?.role === 'manager' || 
                            user?.department === 'Inventory' ||
                            user?.department === 'Operations';

  if (!hasInventoryAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border border-red-200 bg-red-50">
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-700 mb-2">Access Restricted</h3>
                <p className="text-red-600">You don't have permission to access Inventory Management.</p>
                <p className="text-sm text-red-500 mt-2">Contact your administrator for access.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setLocation('/admin')}
                className="flex items-center gap-2 hover:bg-blue-50 hover:text-blue-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Inventory Management
                </h1>
                <p className="text-gray-600">
                  Manage products, stock levels, and categories across all store locations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => inventorySync.mutate()}
                disabled={inventorySync.isPending}
                size="sm"
                className="flex items-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                {inventorySync.isPending ? 'Syncing...' : 'Sync Inventory Data'}
              </Button>
              <Badge variant="outline" className="text-green-600 border-green-600">
                <MapPin className="h-3 w-3 mr-1" />
                {user?.department || 'Operations'}
              </Badge>
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                <Users className="h-3 w-3 mr-1" />
                {user?.role}
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Card className="border border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Package className="h-5 w-5" />
              Inventory Management System
            </CardTitle>
            <CardDescription>
              Comprehensive inventory tracking with real-time stock levels, categories, and analytics across all locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InventoryManagement />
          </CardContent>
        </Card>

        {/* Quick Actions Bar */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-2">
          <Button size="sm" className="shadow-lg bg-green-600 hover:bg-green-700">
            <Package className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>
    </div>
  );
}