import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  ShoppingCart, 
  BarChart3,
  Users,
  Settings,
  AlertTriangle,
  CheckCircle,
  MapPin
} from 'lucide-react';
import { InventoryManagement } from '@/components/inventory-management';
import { ComprehensiveOrderManagement } from '@/components/comprehensive-order-management';

export default function InventoryOrdersPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders'>('inventory');

  // Check if user has access to inventory/orders (admin, manager, or specific departments)
  const hasInventoryAccess = user?.role === 'admin' || 
                            user?.role === 'manager' || 
                            user?.department === 'Inventory' ||
                            user?.department === 'Operations';

  const hasOrdersAccess = user?.role === 'admin' || 
                         user?.role === 'manager' || 
                         user?.department === 'Orders' ||
                         user?.department === 'Operations';

  if (!hasInventoryAccess && !hasOrdersAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border border-red-200 bg-red-50">
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-700 mb-2">Access Restricted</h3>
                <p className="text-red-600">You don't have permission to access Inventory and Order Management.</p>
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Inventory & Order Management
              </h1>
              <p className="text-gray-600">
                Manage products, inventory levels, and process orders across all locations
              </p>
            </div>
            <div className="flex items-center gap-3">
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

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'inventory' | 'orders')} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-96">
            {hasInventoryAccess && (
              <TabsTrigger value="inventory" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Inventory Management
              </TabsTrigger>
            )}
            {hasOrdersAccess && (
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Order Management
              </TabsTrigger>
            )}
          </TabsList>

          {/* Inventory Management Tab */}
          {hasInventoryAccess && (
            <TabsContent value="inventory" className="space-y-6">
              <Card className="border border-green-200 bg-green-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <Package className="h-5 w-5" />
                    Inventory Management
                  </CardTitle>
                  <CardDescription>
                    Manage products, stock levels, and categories across all store locations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InventoryManagement />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Order Management Tab */}
          {hasOrdersAccess && (
            <TabsContent value="orders" className="space-y-6">
              <Card className="border border-blue-200 bg-blue-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <ShoppingCart className="h-5 w-5" />
                    Order Management
                  </CardTitle>
                  <CardDescription>
                    Process orders, view transaction details, and analyze sales performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ComprehensiveOrderManagement />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Quick Actions Bar */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-2">
          {hasInventoryAccess && activeTab === 'inventory' && (
            <Button size="sm" className="shadow-lg bg-green-600 hover:bg-green-700">
              <Package className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          )}
          {hasOrdersAccess && activeTab === 'orders' && (
            <Button size="sm" className="shadow-lg bg-blue-600 hover:bg-blue-700">
              <ShoppingCart className="h-4 w-4 mr-2" />
              New Order
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}