import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  Search, 
  Filter,
  BarChart3,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Tag,
  Eye,
  RefreshCw,
  QrCode,
  Plus,
  Camera,
  Settings,
  ArrowLeftRight,
  FileText
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { BarcodeScanner } from './barcode-scanner';
import { DymoLabelPrinter } from './dymo-label-printer';

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  priceType: string;
  unitName?: string;
  cost?: number;
  isRevenue: boolean;
  stockCount?: number;
  locationId: number;
  locationName: string;
  merchantId: string;
  categories?: { id: string; name: string; }[];
}

interface ItemStock {
  id: string;
  item: { id: string; name: string; price?: number; };
  quantity: number;
  locationId: number;
  locationName: string;
  merchantId: string;
}

interface SelectedStockItem {
  itemId: string;
  itemName: string;
  currentStock: number;
  locationName: string;
  locationId?: number;
  unitPrice?: number;
}

interface Category {
  id: string;
  name: string;
  items?: { id: string; name: string; }[];
  locationId: number;
  locationName: string;
  merchantId: string;
}

export function InventoryManagement() {
  const [activeTab, setActiveTab] = useState<'items' | 'stocks' | 'categories' | 'add-product'>('items');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [scannerMode, setScannerMode] = useState<'take' | 'adjustment' | 'employee_purchase'>('take');
  const [selectedProductForLabel, setSelectedProductForLabel] = useState<{
    name: string;
    sku: string;
    price: number;
    description?: string;
  } | undefined>(undefined);
  
  // Stock Adjustment States
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<SelectedStockItem | null>(null);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch inventory items
  const { data: itemsData, isLoading: itemsLoading, error: itemsError } = useQuery({
    queryKey: ['/api/accounting/inventory/items', selectedLocation, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation !== 'all') params.append('locationId', selectedLocation);
      if (searchTerm) params.append('filter', `name:${searchTerm}`);
      
      const response = await apiRequest('GET', `/api/accounting/inventory/items?${params.toString()}`);
      return await response.json();
    },
  });

  // Fetch item stocks
  const { data: stocksData, isLoading: stocksLoading } = useQuery({
    queryKey: ['/api/accounting/inventory/stocks', selectedLocation],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation !== 'all') params.append('locationId', selectedLocation);
      
      const response = await apiRequest('GET', `/api/accounting/inventory/stocks?${params.toString()}`);
      return await response.json();
    },
    enabled: activeTab === 'stocks'
  });

  // Fetch categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/accounting/inventory/categories', selectedLocation],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation !== 'all') params.append('locationId', selectedLocation);
      
      const response = await apiRequest('GET', `/api/accounting/inventory/categories?${params.toString()}`);
      return await response.json();
    },
    enabled: activeTab === 'categories'
  });

  // Helper functions
  const getStockStatus = (stockCount?: number) => {
    if (stockCount === undefined || stockCount === null) return { status: 'unknown', color: 'bg-gray-100 text-gray-800' };
    if (stockCount === 0) return { status: 'out-of-stock', color: 'bg-red-100 text-red-800' };
    if (stockCount < 10) return { status: 'low-stock', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'in-stock', color: 'bg-green-100 text-green-800' };
  };

  const handleStockSearch = async () => {
    if (!stockSearchTerm.trim()) return;
    
    try {
      const params = new URLSearchParams();
      params.append('sku', stockSearchTerm);
      if (selectedLocation && selectedLocation !== 'all') {
        params.append('locationId', selectedLocation);
      }

      const response = await apiRequest('GET', `/api/accounting/inventory/items/lookup?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setSelectedStockItem({
          itemId: data.id || stockSearchTerm,
          itemName: data.name || 'Unknown Item',
          currentStock: data.stockCount || 0,
          locationName: data.locationName || '',
          locationId: data.locationId,
          unitPrice: data.price || 0
        });
        setShowAdjustmentDialog(true);
        setStockSearchTerm('');
        
        toast({
          title: "Product Found!",
          description: `${data.name} - Stock: ${data.stockCount || 0}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Product Not Found",
          description: `No product found for "${stockSearchTerm}"`,
        });
      }
    } catch (error) {
      console.error('Error searching product:', error);
      toast({
        variant: "destructive",
        title: "Search Error",
        description: "Failed to search for product",
      });
    }
  };

  const formatPrice = (price: number) => {
    return (price / 100).toFixed(2); // Convert cents to dollars
  };

  const filteredItems = itemsData?.elements?.filter((item: InventoryItem) => {
    if (filterCategory !== 'all') {
      return item.categories?.some(cat => cat.id === filterCategory);
    }
    return true;
  }) || [];

  // Stats calculations
  const totalItems = itemsData?.totalItems || 0;
  const totalValue = filteredItems.reduce((sum: number, item: InventoryItem) => 
    sum + ((item.stockCount || 0) * (item.price || 0) / 100), 0);
  const lowStockItems = filteredItems.filter((item: InventoryItem) => 
    (item.stockCount || 0) < 10 && (item.stockCount || 0) > 0).length;
  const outOfStockItems = filteredItems.filter((item: InventoryItem) => 
    (item.stockCount || 0) === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Inventory Management
          </h3>
          <p className="text-gray-600">
            Track and manage inventory across all Clover locations
          </p>
        </div>
        <Button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/accounting/inventory'] });
            toast({ title: "Refreshed inventory data" });
          }}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Across {itemsData?.locations?.length || 0} locations
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Current stock value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Items below 10 units
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Items with 0 units
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('items')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'items'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="inline h-4 w-4 mr-2" />
            Items
          </button>
          <button
            onClick={() => setActiveTab('stocks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stocks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="inline h-4 w-4 mr-2" />
            Stock Levels
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categories'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Tag className="inline h-4 w-4 mr-2" />
            Categories
          </button>
          <button
            onClick={() => setActiveTab('add-product')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'add-product'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="tab-add-product"
          >
            <Plus className="inline h-4 w-4 mr-2" />
            Add Product
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {itemsData?.locations?.map((location: any) => (
              <SelectItem key={location.id} value={location.id.toString()}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeTab === 'items' && (
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoriesData?.elements?.map((category: Category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Content Sections */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {itemsLoading ? (
            <div className="text-center py-8">Loading inventory items...</div>
          ) : itemsError ? (
            <Card>
              <CardContent className="text-center py-8 text-red-600">
                Error loading inventory items. Please try again.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item: InventoryItem, index: number) => {
                const stockInfo = getStockStatus(item.stockCount);
                const uniqueKey = `item-${item.id}-${item.locationId}-${index}`;
                return (
                  <Card key={uniqueKey}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{item.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {item.locationName}
                          </CardDescription>
                        </div>
                        <Badge className={stockInfo.color}>
                          {stockInfo.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Price:</span>
                          <span className="font-medium">${formatPrice(item.price)}</span>
                        </div>
                        {item.cost && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Cost:</span>
                            <span className="font-medium">${formatPrice(item.cost)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Stock:</span>
                          <span className="font-medium">{item.stockCount || 0} {item.unitName || 'units'}</span>
                        </div>
                        {item.stockCount && item.price && (
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-sm text-gray-600">Value:</span>
                            <span className="font-bold">${((item.stockCount * item.price) / 100).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stocks' && (
        <div className="space-y-4">
          {/* Stock Adjustment Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Stock Adjustments
              </CardTitle>
              <CardDescription>
                Scan barcodes or search products to adjust inventory levels and transfer between locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                {/* Search/Scan Input */}
                <div className="flex-1">
                  <Input
                    placeholder="Scan barcode or search product name..."
                    value={stockSearchTerm}
                    onChange={(e) => setStockSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleStockSearch()}
                    data-testid="input-stock-search"
                  />
                </div>
                <Button onClick={handleStockSearch} disabled={!stockSearchTerm.trim()}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button onClick={() => setShowBarcodeScanner(!showBarcodeScanner)} variant="outline">
                  <QrCode className="h-4 w-4 mr-2" />
                  {showBarcodeScanner ? 'Hide Scanner' : 'Scan Barcode'}
                </Button>
              </div>

              {/* Barcode Scanner */}
              {showBarcodeScanner && (
                <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                  <BarcodeScanner 
                    mode="adjustment"
                    selectedLocation={selectedLocation}
                    onItemScanned={(item) => {
                      if (item && item.found) {
                        setSelectedStockItem({
                          itemId: item.barcode,
                          itemName: item.itemName || '',
                          currentStock: item.currentStock || 0,
                          locationName: item.locationName || '',
                          unitPrice: item.unitPrice || 0
                        });
                        setShowAdjustmentDialog(true);
                        setShowBarcodeScanner(false);
                      }
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Levels Table */}
          {stocksLoading ? (
            <div className="text-center py-8">Loading stock levels...</div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Stock Levels by Location</CardTitle>
                <CardDescription>Current inventory levels across all locations - Click any row to adjust</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Item</th>
                        <th className="text-left py-2">Location</th>
                        <th className="text-right py-2">Quantity</th>
                        <th className="text-center py-2">Status</th>
                        <th className="text-center py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stocksData?.elements?.map((stock: ItemStock, index: number) => {
                        const stockInfo = getStockStatus(stock.quantity);
                        const uniqueKey = `stock-${stock.item?.id || `unknown-${index}`}-${stock.locationId}-${index}-${stock.quantity}`;
                        return (
                          <tr key={uniqueKey} className="border-b hover:bg-gray-50 cursor-pointer">
                            <td className="py-2 font-medium">{stock.item?.name || 'Unknown Item'}</td>
                            <td className="py-2 text-gray-600">{stock.locationName}</td>
                            <td className="py-2 text-right font-medium">{stock.quantity}</td>
                            <td className="py-2 text-center">
                              <Badge className={stockInfo.color}>
                                {stockInfo.status}
                              </Badge>
                            </td>
                            <td className="py-2 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedStockItem({
                                    itemId: stock.item?.id || '',
                                    itemName: stock.item?.name || 'Unknown Item',
                                    currentStock: stock.quantity,
                                    locationName: stock.locationName,
                                    locationId: stock.locationId,
                                    unitPrice: stock.item?.price || 0
                                  });
                                  setShowAdjustmentDialog(true);
                                }}
                                data-testid={`button-adjust-${index}`}
                              >
                                <Settings className="h-4 w-4 mr-1" />
                                Adjust
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-4">
          {categoriesLoading ? (
            <div className="text-center py-8">Loading categories...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoriesData?.elements?.map((category: Category, index: number) => (
                <Card key={`category-${category.id}-${category.locationId}-${index}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      {category.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {category.locationName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600">
                      {category.items?.length || 0} items in this category
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'add-product' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Product
              </CardTitle>
              <CardDescription>
                Create a new product in your inventory. Use the barcode scanner to quickly fill in product details or enter them manually.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                  <TabsTrigger value="scan">Barcode Scan</TabsTrigger>
                  <TabsTrigger value="print">Print Labels</TabsTrigger>
                </TabsList>
                
                <TabsContent value="manual" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Product Name</label>
                      <Input placeholder="Enter product name" data-testid="input-product-name" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">SKU/Barcode</label>
                      <Input placeholder="Enter SKU or barcode" data-testid="input-product-sku" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Price</label>
                      <Input type="number" placeholder="0.00" step="0.01" data-testid="input-product-price" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Cost</label>
                      <Input type="number" placeholder="0.00" step="0.01" data-testid="input-product-cost" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Location</label>
                      <Select defaultValue={selectedLocation}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Locations</SelectItem>
                          {itemsData?.locations?.map((location: any) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="uncategorized">Uncategorized</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Quantity</label>
                      <Input type="number" placeholder="1" min="0" step="1" data-testid="input-product-quantity" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Input placeholder="Product description (optional)" data-testid="input-product-description" />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button className="flex-1" data-testid="button-save-product">
                      <Package className="h-4 w-4 mr-2" />
                      Save Product
                    </Button>
                    <Button variant="outline" data-testid="button-save-and-print">
                      <Eye className="h-4 w-4 mr-2" />
                      Save & Print Label
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="scan" className="space-y-4">
                  <div className="text-center py-4">
                    <Camera className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Scan Product Barcode</h3>
                    <p className="text-gray-600 mb-4">
                      Use your camera to scan a product barcode and automatically fill in the product details.
                    </p>
                  </div>
                  
                  {/* Barcode Scanner Component */}
                  <BarcodeScanner 
                    mode="take"
                    selectedLocation={selectedLocation}
                    onItemScanned={(item) => {
                      console.log('Item scanned for add product:', item);
                      if (item) {
                        setSelectedProductForLabel({
                          name: item.itemName || '',
                          sku: item.barcode || '',
                          price: item.unitPrice || 0,
                          description: item.itemName || ''
                        });
                        toast({
                          title: "Product Scanned",
                          description: "Product details have been filled automatically",
                        });
                      }
                    }}
                  />
                </TabsContent>
                
                <TabsContent value="print" className="space-y-4">
                  {/* DYMO Label Printer Component */}
                  <DymoLabelPrinter 
                    productData={selectedProductForLabel}
                    onPrintComplete={() => {
                      toast({
                        title: "Label Printed",
                        description: "Label has been sent to the printer successfully",
                      });
                    }}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stock Adjustment Dialog */}
      <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-stock-adjustment">
          <DialogHeader>
            <DialogTitle>Stock Adjustment</DialogTitle>
            <DialogDescription>
              Adjust inventory levels for {selectedStockItem?.itemName}
            </DialogDescription>
          </DialogHeader>
          
          <StockAdjustmentForm 
            selectedStockItem={selectedStockItem}
            availableLocations={itemsData?.locations || []}
            selectedLocation={selectedLocation}
            onClose={() => setShowAdjustmentDialog(false)}
            onSuccess={() => {
              setShowAdjustmentDialog(false);
              queryClient.invalidateQueries({ queryKey: ['/api/accounting/inventory/stocks'] });
              toast({
                title: "Stock Adjusted",
                description: "Inventory levels have been updated successfully",
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Stock Adjustment Form Component
interface StockAdjustmentFormProps {
  selectedStockItem: SelectedStockItem | null;
  availableLocations: any[];
  selectedLocation: string;
  onClose: () => void;
  onSuccess: () => void;
}

function StockAdjustmentForm({ 
  selectedStockItem, 
  availableLocations, 
  selectedLocation, 
  onClose, 
  onSuccess 
}: StockAdjustmentFormProps) {
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease' | 'transfer'>('increase');
  const [quantity, setQuantity] = useState<number>(1);
  const [targetLocationId, setTargetLocationId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const predefinedReasons = [
    'Employee Purchase',
    'Expired Shelf Life',
    'End of Life Product',
    'Lack of Sales',
    'Product Damage',
    'Theft/Loss',
    'Quality Control',
    'Inventory Correction',
    'Return to Vendor',
    'Promotional Use',
    'Sample/Demo',
    'Transfer Between Locations',
    'Recount Adjustment',
    'Other'
  ];

  const adjustmentMutation = useMutation({
    mutationFn: async (adjustmentData: any) => {
      const endpoint = adjustmentType === 'transfer' 
        ? '/api/inventory/actions/transfer'
        : '/api/inventory/actions/adjustment';
      
      const payload = {
        type: adjustmentType,
        itemId: selectedStockItem?.itemId,
        itemName: selectedStockItem?.itemName,
        quantity: adjustmentType === 'decrease' ? -quantity : quantity,
        fromLocationId: selectedStockItem?.locationId,
        toLocationId: adjustmentType === 'transfer' ? targetLocationId : undefined,
        reason: reason === 'Other' ? customReason : reason,
        notes,
        ...adjustmentData
      };

      const response = await apiRequest('POST', endpoint, payload);
      return response.json();
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      console.error('Adjustment failed:', error);
    }
  });

  const handleSubmit = () => {
    if (!selectedStockItem || !reason || (reason === 'Other' && !customReason)) return;
    if (adjustmentType === 'transfer' && !targetLocationId) return;
    
    adjustmentMutation.mutate({});
  };

  if (!selectedStockItem) return null;

  return (
    <div className="space-y-6">
      {/* Current Stock Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Current Stock Information</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-gray-600">Product:</span>
          <span className="font-medium">{selectedStockItem.itemName}</span>
          <span className="text-gray-600">Location:</span>
          <span className="font-medium">{selectedStockItem.locationName}</span>
          <span className="text-gray-600">Current Stock:</span>
          <span className="font-medium">{selectedStockItem.currentStock} units</span>
        </div>
      </div>

      {/* Adjustment Type */}
      <div>
        <Label htmlFor="adjustment-type">Adjustment Type</Label>
        <Select value={adjustmentType} onValueChange={(value: 'increase' | 'decrease' | 'transfer') => setAdjustmentType(value)}>
          <SelectTrigger data-testid="select-adjustment-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="increase">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-green-600" />
                Increase Stock
              </div>
            </SelectItem>
            <SelectItem value="decrease">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Decrease Stock
              </div>
            </SelectItem>
            <SelectItem value="transfer">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                Transfer Between Locations
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Target Location for Transfers */}
      {adjustmentType === 'transfer' && (
        <div>
          <Label htmlFor="target-location">Transfer To Location</Label>
          <Select value={targetLocationId} onValueChange={setTargetLocationId}>
            <SelectTrigger data-testid="select-target-location">
              <SelectValue placeholder="Select destination location" />
            </SelectTrigger>
            <SelectContent>
              {availableLocations
                .filter(loc => loc.id.toString() !== selectedStockItem.locationId?.toString())
                .map((location: any) => (
                <SelectItem key={location.id} value={location.id.toString()}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Quantity */}
      <div>
        <Label htmlFor="quantity">
          {adjustmentType === 'transfer' ? 'Quantity to Transfer' : 
           adjustmentType === 'increase' ? 'Quantity to Add' : 'Quantity to Remove'}
        </Label>
        <Input
          id="quantity"
          type="number"
          min="1"
          max={adjustmentType === 'decrease' || adjustmentType === 'transfer' ? selectedStockItem.currentStock : undefined}
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          data-testid="input-adjustment-quantity"
        />
      </div>

      {/* Reason */}
      <div>
        <Label htmlFor="reason">Reason for Adjustment</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger data-testid="select-adjustment-reason">
            <SelectValue placeholder="Select a reason" />
          </SelectTrigger>
          <SelectContent>
            {predefinedReasons.map((reasonOption) => (
              <SelectItem key={reasonOption} value={reasonOption}>
                {reasonOption}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom Reason */}
      {reason === 'Other' && (
        <div>
          <Label htmlFor="custom-reason">Custom Reason</Label>
          <Input
            id="custom-reason"
            placeholder="Please specify the reason"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            data-testid="input-custom-reason"
          />
        </div>
      )}

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Additional Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Add any additional details about this adjustment..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          data-testid="textarea-adjustment-notes"
        />
      </div>

      {/* New Stock Level Preview */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2 text-blue-800">Stock Level Preview</h4>
        <div className="text-sm">
          <span className="text-blue-600">
            {adjustmentType === 'transfer' 
              ? `After transfer: ${selectedStockItem.currentStock - quantity} units remaining at ${selectedStockItem.locationName}`
              : adjustmentType === 'increase'
              ? `New stock level: ${selectedStockItem.currentStock + quantity} units`
              : `New stock level: ${selectedStockItem.currentStock - quantity} units`
            }
          </span>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={
            adjustmentMutation.isPending || 
            !reason || 
            (reason === 'Other' && !customReason) ||
            (adjustmentType === 'transfer' && !targetLocationId)
          }
          data-testid="button-confirm-adjustment"
        >
          {adjustmentMutation.isPending ? 'Processing...' : 
           adjustmentType === 'transfer' ? 'Transfer Stock' :
           adjustmentType === 'increase' ? 'Increase Stock' : 'Decrease Stock'}
        </Button>
      </DialogFooter>
    </div>
  );
}