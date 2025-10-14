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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
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
  FileText,
  Building2,
  Upload,
  Link2,
  Info as InfoIcon,
  ExternalLink
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { BarcodeScanner } from './barcode-scanner';
import { DymoLabelPrinter } from './dymo-label-printer';

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  priceType: string;
  unitName?: string;
  cost?: number;
  // Thrive vendor pricing fields
  thriveCost?: number;
  thriveListPrice?: number;
  isRevenue: boolean;
  stockCount?: number;
  locationId: number;
  locationName: string;
  merchantId: string;
  categories?: { id: string; name: string; }[];
  // Additional fields from database
  sku?: string;
  upc?: string;
  vendor?: string;
  lastSyncAt?: string;
  quantityOnHand?: number;
  syncStatus?: string;
}

interface ItemStock {
  id: string;
  item: { id: string; name: string; price?: number; cost?: number; };
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
  itemCount?: number;
  locationId: number;
  locationName: string;
  merchantId: string;
}

export function InventoryManagement() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sync-status' | 'items' | 'stocks' | 'categories' | 'vendors' | 'add-product'>('dashboard');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');
  const [vendorStockFilter, setVendorStockFilter] = useState<'all' | 'in-stock'>('all');
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

  // CSV Import States
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Sync Status Filters
  const [syncStatusFilter, setSyncStatusFilter] = useState<'all' | 'synced' | 'discrepancy'>('all');
  
  // Manual Matching States
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedUnmatchedItem, setSelectedUnmatchedItem] = useState<any>(null);
  const [matchSuggestions, setMatchSuggestions] = useState<any[]>([]);
  const [matchThriveItem, setMatchThriveItem] = useState<any>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  
  // Physical Count Update States
  const [physicalCountDialogOpen, setPhysicalCountDialogOpen] = useState(false);
  const [selectedDiscrepancyItem, setSelectedDiscrepancyItem] = useState<any>(null);
  const [physicalCount, setPhysicalCount] = useState<string>('');
  const [updateNotes, setUpdateNotes] = useState<string>('');
  
  // Pagination States for Items Tab
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Manual Matching Functions
  const fetchMatchSuggestions = async (thriveItemId: number) => {
    setLoadingSuggestions(true);
    try {
      const response = await apiRequest('GET', `/api/accounting/inventory/match-suggestions/${thriveItemId}`);
      const data = await response.json();
      setMatchSuggestions(data.suggestions || []);
      setMatchThriveItem(data.thriveItem || null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch match suggestions",
        variant: "destructive"
      });
      setMatchSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleMatchItem = (item: any) => {
    setSelectedUnmatchedItem(item);
    setSelectedMatch(null);
    setMatchDialogOpen(true);
    fetchMatchSuggestions(item.id);
  };

  const confirmMatch = async () => {
    if (!selectedUnmatchedItem || !selectedMatch) return;
    
    try {
      await apiRequest('POST', '/api/accounting/inventory/manual-match', {
        unmatchedThriveId: selectedUnmatchedItem.id,
        cloverItemId: selectedMatch.id
      });
      
      toast({
        title: "Success",
        description: "Items matched successfully",
      });
      
      // Refresh sync status data
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/inventory/sync-status'] });
      
      setMatchDialogOpen(false);
      setSelectedUnmatchedItem(null);
      setSelectedMatch(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to match items",
        variant: "destructive"
      });
    }
  };

  // Physical Count Update Functions
  const handleUpdatePhysicalCount = (item: any) => {
    setSelectedDiscrepancyItem(item);
    setPhysicalCount(parseFloat(item.quantityOnHand || 0).toString());
    setUpdateNotes('');
    setPhysicalCountDialogOpen(true);
  };

  const confirmPhysicalCountUpdate = async () => {
    if (!selectedDiscrepancyItem || !physicalCount) return;
    
    try {
      await apiRequest('POST', '/api/accounting/inventory/update-physical-count', {
        inventoryItemId: selectedDiscrepancyItem.id,
        newQuantity: parseFloat(physicalCount),
        notes: updateNotes || 'Physical count adjustment from discrepancy investigation'
      });
      
      toast({
        title: "Success",
        description: `Updated Clover inventory to ${physicalCount} units`,
      });
      
      // Refresh sync status and items data
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/inventory/sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/inventory/items'] });
      
      setPhysicalCountDialogOpen(false);
      setSelectedDiscrepancyItem(null);
      setPhysicalCount('');
      setUpdateNotes('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update physical count",
        variant: "destructive"
      });
    }
  };

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
    queryKey: ['/api/accounting/inventory/stocks', selectedLocation, stockSearchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation !== 'all') params.append('locationId', selectedLocation);
      if (stockSearchTerm) params.append('filter', `name:${stockSearchTerm}`);
      
      const response = await apiRequest('GET', `/api/accounting/inventory/stocks?${params.toString()}`);
      return await response.json();
    },
    enabled: activeTab === 'stocks'
  });

  // Fetch categories - load for both items and categories tabs
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/accounting/inventory/categories', selectedLocation],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation !== 'all') params.append('locationId', selectedLocation);
      
      const response = await apiRequest('GET', `/api/accounting/inventory/categories?${params.toString()}`);
      return await response.json();
    },
    enabled: activeTab === 'categories' || activeTab === 'items'
  });

  // Fetch vendor analytics
  const { data: vendorsData, isLoading: vendorsLoading } = useQuery({
    queryKey: ['/api/accounting/inventory/vendors', selectedLocation, vendorStockFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation !== 'all') params.append('locationId', selectedLocation);
      if (vendorStockFilter !== 'all') params.append('stockFilter', vendorStockFilter);
      
      const response = await apiRequest('GET', `/api/accounting/inventory/vendors?${params.toString()}`);
      return await response.json();
    },
    enabled: activeTab === 'vendors'
  });

  // Fetch sync status summary for dashboard (always unfiltered)
  const { data: dashboardSyncData, isLoading: dashboardSyncLoading } = useQuery({
    queryKey: ['/api/accounting/inventory/sync-status/dashboard', selectedLocation],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation !== 'all') params.append('locationId', selectedLocation);
      // No status filter for dashboard - always get full summary
      
      const response = await apiRequest('GET', `/api/accounting/inventory/sync-status?${params.toString()}`);
      return await response.json();
    },
    enabled: activeTab === 'dashboard'
  });

  // Fetch sync status for sync-status tab (with filters)
  const { data: syncStatusData, isLoading: syncStatusLoading } = useQuery({
    queryKey: ['/api/accounting/inventory/sync-status', selectedLocation, syncStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation !== 'all') params.append('locationId', selectedLocation);
      if (syncStatusFilter !== 'all') params.append('status', syncStatusFilter);
      
      const response = await apiRequest('GET', `/api/accounting/inventory/sync-status?${params.toString()}`);
      return await response.json();
    },
    enabled: activeTab === 'sync-status'
  });

  // Fetch profitability data
  const { data: profitabilityData, isLoading: profitabilityLoading } = useQuery({
    queryKey: ['/api/accounting/inventory/profitability', selectedLocation],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation !== 'all') params.append('locationId', selectedLocation);
      params.append('sortBy', 'marginPercent'); // Sort by margin by default
      
      const response = await apiRequest('GET', `/api/accounting/inventory/profitability?${params.toString()}`);
      return await response.json();
    },
    enabled: activeTab === 'dashboard'
  });

  // Helper functions
  const getStockStatus = (stockCount?: number) => {
    if (stockCount === undefined || stockCount === null) return { status: 'unknown', color: 'bg-gray-100 text-gray-800' };
    if (stockCount === 0) return { status: 'out-of-stock', color: 'bg-red-100 text-red-800' };
    if (stockCount < 10) return { status: 'low-stock', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'in-stock', color: 'bg-green-100 text-green-800' };
  };

  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const handleCSVImport = async () => {
    if (!csvFile) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    try {
      const text = await csvFile.text();
      const lines = text.split('\n');
      
      // Skip to line 9 (index 8) for headers, line 10 (index 9) for data
      const csvData = [];
      for (let i = 9; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCSVLine(line);
        if (values.length >= 6) {
          csvData.push({
            Product: values[0],
            Variant: values[1],
            Location: values[2],
            Categories: values[3],
            Vendors: values[4],
            SKU: values[5],
            InStock: values[6],
            ListPrice: values[7],
            CostUnit: values[8],
            TotalValue: values[9]
          });
        }
      }

      const response = await apiRequest('POST', '/api/accounting/inventory/import-vendors', { csvData });

      const result = await response.json();
      setImportResults(result.results);
      
      toast({ 
        title: "Import Complete!", 
        description: `Updated ${result.results.updated} items, ${result.results.unmatched} unmatched` 
      });

      // Refresh all inventory data (items and vendor analytics)
      await queryClient.invalidateQueries({ queryKey: ['/api/accounting/inventory/items'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/accounting/inventory/vendors'] });
    } catch (error) {
      console.error('Import error:', error);
      toast({ title: "Import failed", description: String(error), variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
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
    // Category filter
    if (filterCategory !== 'all') {
      const categoryMatch = item.categories?.some(cat => cat.id === filterCategory);
      if (!categoryMatch) return false;
    }
    
    // Stock status filter
    if (stockStatusFilter !== 'all') {
      const stockStatus = getStockStatus(item.stockCount).status;
      if (stockStatus !== stockStatusFilter) return false;
    }
    
    return true;
  }) || [];

  // Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, stockStatusFilter, selectedLocation]);

  // Clamp currentPage when totalPages changes (e.g., after refetch or data updates)
  useEffect(() => {
    const maxPage = Math.max(1, totalPages || 1);
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [totalPages, currentPage]);

  // Filter stocks for the Stock Levels tab
  const filteredStocks = stocksData?.elements?.filter((stock: ItemStock) => {
    // Search term filter
    if (stockSearchTerm) {
      const searchLower = stockSearchTerm.toLowerCase();
      const nameMatch = stock.item?.name?.toLowerCase().includes(searchLower);
      if (!nameMatch) return false;
    }
    
    // Stock status filter
    if (stockStatusFilter !== 'all') {
      const stockStatus = getStockStatus(stock.quantity).status;
      if (stockStatus !== stockStatusFilter) return false;
    }
    
    return true;
  }) || [];

  // Stats calculations - use appropriate data based on active tab
  const isStocksTab = activeTab === 'stocks';
  
  const totalItems = isStocksTab ? 
    (filteredStocks?.length || 0) : 
    (itemsData?.totalItems || 0);
  
  // Calculate inventory value - ONLY count positive stock quantities
  const totalValue = isStocksTab ?
    filteredStocks.reduce((sum: number, stock: ItemStock) => {
      const quantity = stock.quantity || 0;
      if (quantity <= 0) return sum; // Skip zero or negative stock
      const unitCost = stock.item?.cost ?? stock.item?.price ?? 0;
      return sum + (quantity * unitCost / 100);
    }, 0) :
    filteredItems.reduce((sum: number, item: InventoryItem) => {
      const stockCount = item.stockCount || 0;
      if (stockCount <= 0) return sum; // Skip zero or negative stock
      const unitCost = item.cost ?? item.price ?? 0;
      return sum + (stockCount * unitCost / 100);
    }, 0);
  
  const lowStockItems = isStocksTab ?
    filteredStocks.filter((stock: ItemStock) => 
      (stock.quantity || 0) < 10 && (stock.quantity || 0) > 0).length :
    filteredItems.filter((item: InventoryItem) => 
      (item.stockCount || 0) < 10 && (item.stockCount || 0) > 0).length;
  
  const outOfStockItems = isStocksTab ?
    filteredStocks.filter((stock: ItemStock) => 
      (stock.quantity || 0) <= 0).length :
    filteredItems.filter((item: InventoryItem) => 
      (item.stockCount || 0) <= 0).length;

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
      <TooltipProvider>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Tooltip>
                <TooltipTrigger className="text-sm font-medium cursor-help text-left">
                  Total Items
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">How it's calculated:</p>
                  <p className="text-sm mb-2">
                    {selectedLocation === 'all' 
                      ? `Total count of unique inventory items across all ${itemsData?.locations?.length || 0} Clover locations.`
                      : `Total count of unique inventory items for the selected location (${itemsData?.locations?.find((loc: any) => loc.id.toString() === selectedLocation)?.merchantName || 'filtered location'}).`
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedLocation === 'all' && itemsData?.locations
                      ? `Includes: ${itemsData.locations.map((loc: any) => loc.merchantName).join(', ')}. `
                      : ''
                    }
                    Syncs automatically from Clover POS system every 30 minutes.
                  </p>
                </TooltipContent>
              </Tooltip>
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
              <Tooltip>
                <TooltipTrigger className="text-sm font-medium cursor-help text-left">
                  Inventory Value
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">How it's calculated:</p>
                  <p className="text-sm mb-2">Sum of (Unit Cost × Quantity on Hand) for all items with available cost data{selectedLocation !== 'all' ? ' in the selected location' : ' across all locations'}. Only includes items with stock quantity greater than 0.</p>
                  <p className="text-xs text-muted-foreground">This represents the total cost value of your current inventory holdings. Price data comes from Clover POS and Thrive inventory system.</p>
                </TooltipContent>
              </Tooltip>
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
              <Tooltip>
                <TooltipTrigger className="text-sm font-medium cursor-help text-left">
                  Low Stock
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">How it's calculated:</p>
                  <p className="text-sm mb-2">Items with quantity on hand between 0.001 and 10 units{selectedLocation !== 'all' ? ' in the selected location' : ' across all locations'}. This threshold helps identify items that may need reordering soon.</p>
                  <p className="text-xs text-muted-foreground">Low stock alerts help prevent stockouts and ensure you maintain adequate inventory levels for customer demand.</p>
                </TooltipContent>
              </Tooltip>
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
              <Tooltip>
                <TooltipTrigger className="text-sm font-medium cursor-help text-left">
                  Out of Stock
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">How it's calculated:</p>
                  <p className="text-sm mb-2">Items with exactly 0 units in stock{selectedLocation !== 'all' ? ' in the selected location' : ' across all locations'}. These items cannot be sold until inventory is replenished.</p>
                  <p className="text-xs text-muted-foreground">Out of stock items may result in lost sales opportunities. Check the Sync Status tab to reconcile Thrive vendor data with Clover inventory.</p>
                </TooltipContent>
              </Tooltip>
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
      </TooltipProvider>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="tab-dashboard"
          >
            <BarChart3 className="inline h-4 w-4 mr-2" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('sync-status')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sync-status'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="tab-sync-status"
          >
            <RefreshCw className="inline h-4 w-4 mr-2" />
            Sync Status
          </button>
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
            onClick={() => setActiveTab('vendors')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'vendors'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="tab-vendors"
          >
            <Building2 className="inline h-4 w-4 mr-2" />
            Vendors
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

        {(activeTab === 'items' || activeTab === 'stocks') && (
          <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by stock status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock Levels</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="low-stock">Low Stock</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        )}
        
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
      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {dashboardSyncLoading || profitabilityLoading ? (
            <div className="text-center py-8">Loading dashboard...</div>
          ) : (
            <>
              {/* Sync Status Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Synced Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {dashboardSyncData?.summary?.synced || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ${dashboardSyncData?.summary?.totalValue?.matched?.toFixed(2) || '0.00'} value
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Discrepancies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {dashboardSyncData?.summary?.discrepancies || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Quantity mismatches
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Unmatched
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {dashboardSyncData?.summary?.unmatchedThrive || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ${dashboardSyncData?.summary?.totalValue?.unmatched?.toFixed(2) || '0.00'} value
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      Missing Vendor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-600">
                      {dashboardSyncData?.summary?.missingVendor || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clover items
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Profitability Overview - Clover vs Thrive Comparison */}
              <TooltipProvider>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Profitability Summary - System Comparison
                    </CardTitle>
                    <CardDescription>
                      Comparing Clover POS pricing vs Thrive vendor pricing ({profitabilityData?.summary?.totalItems || 0} items)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Clover Metrics */}
                      <div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <h3 className="text-sm font-semibold text-blue-600 mb-3 flex items-center gap-2 cursor-help">
                              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                              Clover POS (Sale Pricing)
                              <InfoIcon className="h-3 w-3 opacity-50" />
                            </h3>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">
                              <strong>Clover POS Pricing:</strong> Only counts items that have Clover pricing data (unitCost & unitPrice from POS). 
                              Based on what's actually in your POS system with cost/price set.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Average Margin</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {profitabilityData?.summary?.averageMargin?.toFixed(1) || '0.0'}%
                            </p>
                          </div>
                          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Total Inventory Value</p>
                            <p className="text-2xl font-bold">
                              ${profitabilityData?.summary?.totalValue?.toLocaleString() || '0'}
                            </p>
                          </div>
                          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Gross Profit</p>
                            <p className="text-2xl font-bold text-blue-600">
                              ${profitabilityData?.summary?.totalProfit?.toLocaleString() || '0'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Thrive Metrics */}
                      <div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <h3 className="text-sm font-semibold text-purple-600 mb-3 flex items-center gap-2 cursor-help">
                              <span className="h-2 w-2 rounded-full bg-purple-600"></span>
                              Thrive (Vendor Pricing)
                              <InfoIcon className="h-3 w-3 opacity-50" />
                            </h3>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">
                              <strong>Thrive Vendor Pricing:</strong> Only counts items that have Thrive pricing data (thriveCost & thriveListPrice from CSV). 
                              Based on what was imported from your Thrive CSV.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Average Margin</p>
                            <p className="text-2xl font-bold text-purple-600">
                              {(() => {
                                const items = profitabilityData?.items || [];
                                const validMargins = items.filter((item: any) => item.thriveMarginPercent > 0);
                                const avg = validMargins.length > 0 
                                  ? validMargins.reduce((sum: number, item: any) => sum + item.thriveMarginPercent, 0) / validMargins.length
                                  : 0;
                                return avg.toFixed(1);
                              })()}%
                            </p>
                          </div>
                          <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Total Inventory Value</p>
                            <p className="text-2xl font-bold">
                              ${(() => {
                                const items = profitabilityData?.items || [];
                                const total = items.reduce((sum: number, item: any) => 
                                  sum + (item.quantityOnHand * item.thriveCost), 0
                                );
                                return total.toLocaleString();
                              })()}
                            </p>
                          </div>
                          <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Gross Profit</p>
                            <p className="text-2xl font-bold text-purple-600">
                              ${(() => {
                                const items = profitabilityData?.items || [];
                                const total = items.reduce((sum: number, item: any) => 
                                  sum + (item.quantityOnHand * item.thriveUnitProfit), 0
                                );
                                return total.toLocaleString();
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* System Info */}
                      <div className="pt-3 border-t text-xs text-muted-foreground">
                        <p>💡 <strong>Tip:</strong> Clover pricing reflects current sale prices in your POS system. Thrive pricing shows vendor cost/list data for cost comparison.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipProvider>

              {/* Pricing Coverage Diagnostic */}
              <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                    Pricing Coverage Diagnostic
                  </CardTitle>
                  <CardDescription>
                    Understanding why Clover and Thrive values differ
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PricingDiagnostic />
                </CardContent>
              </Card>

              {/* Top Profitable Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Profitable Items (by Margin %)</CardTitle>
                  <CardDescription>Items with the highest profit margins</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profitabilityData?.items?.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.vendor}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{item.marginPercent}%</p>
                          <p className="text-sm text-muted-foreground">${item.grossProfit.toFixed(2)} profit</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Sync Status Tab */}
      {activeTab === 'sync-status' && (
        <div className="space-y-4">
          {syncStatusLoading ? (
            <div className="text-center py-8">Loading sync status...</div>
          ) : (
            <>
              {/* Filters */}
              <div className="flex gap-4">
                <Select value={syncStatusFilter} onValueChange={(value: any) => setSyncStatusFilter(value)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="synced">Synced</SelectItem>
                    <SelectItem value="discrepancy">Discrepancies</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Matched Items */}
              {syncStatusData?.matched && syncStatusData.matched.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Matched Items ({syncStatusData.matched.length})</CardTitle>
                    <CardDescription>Items successfully synced between Clover and Thrive</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {syncStatusData.matched.slice(0, 10).map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{item.itemName || item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.matchMethod} • {item.vendor || 'No vendor'}
                            </p>
                            {item.hasDiscrepancy && (
                              <div className="mt-2 text-sm">
                                <div className="flex items-center gap-4">
                                  <span className="text-blue-600">
                                    Clover: <strong>{parseFloat(item.quantityOnHand || 0).toFixed(2)}</strong>
                                  </span>
                                  <span className="text-purple-600">
                                    Thrive: <strong>{parseFloat(item.thriveQuantity || 0).toFixed(2)}</strong>
                                  </span>
                                  <span className="text-orange-600">
                                    Diff: <strong>{(parseFloat(item.quantityOnHand || 0) - parseFloat(item.thriveQuantity || 0)).toFixed(2)}</strong>
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {item.hasDiscrepancy ? (
                              <>
                                <Badge className="bg-yellow-100 text-yellow-800">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Discrepancy
                                </Badge>
                                {user?.role === 'admin' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdatePhysicalCount(item)}
                                    data-testid={`button-update-count-${item.id}`}
                                  >
                                    <Package className="h-4 w-4 mr-1" />
                                    Update Count
                                  </Button>
                                )}
                              </>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Synced
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Unmatched Thrive Items */}
              {syncStatusData?.unmatchedThrive && syncStatusData.unmatchedThrive.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Unmatched Thrive Items ({syncStatusData.unmatchedThrive.length})</CardTitle>
                    <CardDescription>Items from Thrive that could not be matched to Clover</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {syncStatusData.unmatchedThrive.slice(0, 10).map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-muted-foreground">
                              SKU: {item.sku || 'N/A'} • {item.vendor || 'No vendor'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-orange-100 text-orange-800">
                              Unmatched
                            </Badge>
                            {user?.role === 'admin' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMatchItem(item)}
                                data-testid={`button-match-${item.id}`}
                              >
                                <Link2 className="h-4 w-4 mr-1" />
                                Match
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Inventory Items
                </CardTitle>
                <CardDescription>
                  {filteredItems.length > 0 
                    ? `Showing ${startIndex + 1}-${Math.min(endIndex, filteredItems.length)} of ${filteredItems.length} items`
                    : 'No items to display'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">PRODUCT NAME</TableHead>
                        <TableHead>UPC/SKU</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Last Sync</TableHead>
                        <TableHead className="text-right">QUANTITY ON HAND</TableHead>
                        <TableHead className="text-right">SALABLE QUANTITY</TableHead>
                        <TableHead className="text-center">STATUS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map((item: InventoryItem, index: number) => {
                        const stockInfo = getStockStatus(item.stockCount || item.quantityOnHand || 0);
                        const uniqueKey = `item-${item.id}-${item.locationId}-${index}`;
                        const quantity = item.quantityOnHand || item.stockCount || 0;
                        const displaySku = item.sku || item.upc || '-';
                        
                        return (
                          <TableRow key={uniqueKey} data-testid={`row-item-${item.id}`}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <ExternalLink className="h-4 w-4 text-blue-500" />
                                <div>
                                  <div>{item.name}</div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {item.locationName}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <ExternalLink className="h-3 w-3 text-blue-500" />
                                <span className="font-mono text-sm">{displaySku}</span>
                              </div>
                            </TableCell>
                            <TableCell>{item.vendor || '-'}</TableCell>
                            <TableCell>
                              {item.lastSyncAt 
                                ? new Date(item.lastSyncAt).toLocaleDateString('en-US', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : '-'
                              }
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {Number(quantity).toFixed(0)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {Number(quantity).toFixed(0)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                className={stockInfo.color}
                                data-testid={`status-${item.id}`}
                              >
                                {stockInfo.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {paginatedItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No items found matching your filters
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                        {/* Show first page */}
                        {currentPage > 2 && (
                          <PaginationItem>
                            <PaginationLink onClick={() => setCurrentPage(1)} className="cursor-pointer">
                              1
                            </PaginationLink>
                          </PaginationItem>
                        )}
                        
                        {/* Show ellipsis if needed */}
                        {currentPage > 3 && <PaginationItem>...</PaginationItem>}
                        
                        {/* Show current page and neighbors */}
                        {currentPage > 1 && (
                          <PaginationItem>
                            <PaginationLink onClick={() => setCurrentPage(currentPage - 1)} className="cursor-pointer">
                              {currentPage - 1}
                            </PaginationLink>
                          </PaginationItem>
                        )}
                        
                        <PaginationItem>
                          <PaginationLink isActive className="cursor-pointer">
                            {currentPage}
                          </PaginationLink>
                        </PaginationItem>
                        
                        {currentPage < totalPages && (
                          <PaginationItem>
                            <PaginationLink onClick={() => setCurrentPage(currentPage + 1)} className="cursor-pointer">
                              {currentPage + 1}
                            </PaginationLink>
                          </PaginationItem>
                        )}
                        
                        {/* Show ellipsis if needed */}
                        {currentPage < totalPages - 2 && <PaginationItem>...</PaginationItem>}
                        
                        {/* Show last page */}
                        {currentPage < totalPages - 1 && (
                          <PaginationItem>
                            <PaginationLink onClick={() => setCurrentPage(totalPages)} className="cursor-pointer">
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        )}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>
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
                      {filteredStocks?.map((stock: ItemStock, index: number) => {
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

          {/* Adjustment History Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Stock Adjustments
              </CardTitle>
              <CardDescription>
                History of inventory adjustments and transfers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdjustmentHistory />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-4">
          {categoriesLoading ? (
            <div className="text-center py-8">Loading categories...</div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Categories
                </CardTitle>
                <CardDescription>
                  Product categories and unique item counts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Unique Items</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoriesData?.elements?.map((category: Category) => (
                        <TableRow key={`category-${category.id}-${category.locationId}`}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>{category.itemCount || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'vendors' && (
        <div className="space-y-4">
          {/* Filter and Import Controls */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={vendorStockFilter} onValueChange={(value: 'all' | 'in-stock') => setVendorStockFilter(value)}>
                <SelectTrigger className="w-[200px]" data-testid="select-vendor-filter">
                  <SelectValue placeholder="Filter vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  <SelectItem value="in-stock">Vendors with Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => setShowImportDialog(true)}
              variant="outline"
              className="flex items-center gap-2"
              data-testid="button-import-vendors"
            >
              <Upload className="h-4 w-4" />
              Import Vendor Data (CSV)
            </Button>
          </div>

          {vendorsLoading ? (
            <div className="text-center py-8">Loading vendor analytics...</div>
          ) : (
            <>
              {/* Vendor Summary Stats */}
              {vendorsData?.totals && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Total Vendors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{vendorsData.totals.totalVendors}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Total Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{vendorsData.totals.totalItems}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Inventory Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        ${vendorsData.totals.totalValue.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Potential Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        ${vendorsData.totals.potentialRevenue.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Gross Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        ${vendorsData.totals.grossProfit.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Vendor Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vendorsData?.vendors?.map((vendor: any, index: number) => (
                  <Card key={`vendor-${vendor.vendor}-${index}`} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        {vendor.vendor}
                      </CardTitle>
                      <CardDescription>
                        {vendor.itemCount} items in inventory
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Inventory Value:</span>
                        <span className="font-semibold text-green-600">
                          ${vendor.totalValue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Potential Revenue:</span>
                        <span className="font-semibold text-blue-600">
                          ${vendor.potentialRevenue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Gross Profit:</span>
                        <span className="font-semibold text-purple-600">
                          ${vendor.grossProfit.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-sm text-gray-600">Total Quantity:</span>
                        <span className="font-semibold">{vendor.quantity.toLocaleString()} units</span>
                      </div>
                      
                      {/* Location Breakdown */}
                      {vendor.locations && vendor.locations.length > 0 && (
                        <div className="pt-3 border-t">
                          <div className="text-xs font-medium text-gray-500 mb-2">Location Breakdown:</div>
                          <div className="space-y-1">
                            {vendor.locations.map((loc: any, locIndex: number) => (
                              <div key={`${vendor.vendor}-loc-${loc.locationId}-${locIndex}`} className="flex justify-between text-xs">
                                <span className="text-gray-600 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {loc.locationName}
                                </span>
                                <span className="font-medium">${loc.value.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {(!vendorsData?.vendors || vendorsData.vendors.length === 0) && (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    No vendor data available for the selected location
                  </CardContent>
                </Card>
              )}
            </>
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

      {/* Manual Matching Dialog */}
      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-manual-match">
          <DialogHeader>
            <DialogTitle>Match Thrive Item to Clover</DialogTitle>
            <DialogDescription>
              Select the best matching Clover item for: <strong>{selectedUnmatchedItem?.productName}</strong>
            </DialogDescription>
          </DialogHeader>
          
          {/* Selected Thrive Item Info */}
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h4 className="font-semibold mb-2">Thrive Item Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><strong>Product:</strong> {selectedUnmatchedItem?.productName}</div>
              <div><strong>SKU:</strong> {selectedUnmatchedItem?.sku || 'N/A'}</div>
              <div><strong>Vendor:</strong> {selectedUnmatchedItem?.vendor || 'N/A'}</div>
              <div><strong>Location:</strong> {selectedUnmatchedItem?.locationName}</div>
              <div className="col-span-2">
                <strong>Thrive Stock:</strong> {matchThriveItem?.quantity != null ? `${parseFloat(matchThriveItem.quantity).toFixed(3)} units` : 'N/A'}
              </div>
            </div>
          </div>
          
          {/* Match Suggestions */}
          <div className="space-y-3">
            <h4 className="font-semibold">Match Suggestions</h4>
            
            {loadingSuggestions ? (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading suggestions...
              </div>
            ) : matchSuggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                No matching suggestions found
              </div>
            ) : (
              matchSuggestions.map((suggestion: any) => (
                <div
                  key={suggestion.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    selectedMatch?.id === suggestion.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:border-gray-400'
                  }`}
                  onClick={() => setSelectedMatch(suggestion)}
                  data-testid={`match-suggestion-${suggestion.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{suggestion.name}</p>
                      <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                        <span>SKU: {suggestion.sku || 'N/A'}</span>
                        <span>Stock: {suggestion.quantityOnHand ?? 0} units</span>
                        <span>Location: {suggestion.locationName}</span>
                        {suggestion.category && <span>Category: {suggestion.category}</span>}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <Badge className={`${
                        suggestion.score >= 80 ? 'bg-green-100 text-green-800' :
                        suggestion.score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {suggestion.score}% Match
                      </Badge>
                      {suggestion.matchReason && (
                        <p className="text-xs text-muted-foreground mt-1">{suggestion.matchReason}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMatchDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmMatch}
              disabled={!selectedMatch}
              data-testid="button-confirm-match"
            >
              Confirm Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Physical Count Update Dialog */}
      <Dialog open={physicalCountDialogOpen} onOpenChange={setPhysicalCountDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-physical-count">
          <DialogHeader>
            <DialogTitle>Update Physical Count</DialogTitle>
            <DialogDescription>
              Update Clover inventory after physical count for: <strong>{selectedDiscrepancyItem?.itemName}</strong>
            </DialogDescription>
          </DialogHeader>
          
          {/* Discrepancy Info */}
          <div className="bg-yellow-50 p-4 rounded-lg mb-4">
            <h4 className="font-semibold mb-2 text-yellow-800">Current Discrepancy</h4>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Clover Qty</p>
                <p className="font-bold text-blue-600">{parseFloat(selectedDiscrepancyItem?.quantityOnHand || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Thrive Qty</p>
                <p className="font-bold text-purple-600">{parseFloat(selectedDiscrepancyItem?.thriveQuantity || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Difference</p>
                <p className="font-bold text-orange-600">
                  {(parseFloat(selectedDiscrepancyItem?.quantityOnHand || 0) - parseFloat(selectedDiscrepancyItem?.thriveQuantity || 0)).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Physical Count Input */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="physical-count">New Physical Count</Label>
              <Input
                id="physical-count"
                type="number"
                step="0.01"
                value={physicalCount}
                onChange={(e) => setPhysicalCount(e.target.value)}
                placeholder="Enter actual count from physical inventory"
                data-testid="input-physical-count"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will update the quantity in Clover. Thrive will sync on next import.
              </p>
            </div>
            
            <div>
              <Label htmlFor="update-notes">Notes (Optional)</Label>
              <Textarea
                id="update-notes"
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                placeholder="Add notes about this adjustment..."
                rows={3}
                data-testid="textarea-update-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPhysicalCountDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPhysicalCountUpdate}
              disabled={!physicalCount || parseFloat(physicalCount) < 0}
              data-testid="button-confirm-physical-count"
            >
              Update Clover Inventory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        csvFile={csvFile}
        setCsvFile={setCsvFile}
        onImport={handleCSVImport}
        isImporting={isImporting}
        importResults={importResults}
      />
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

// Adjustment History Component
const AdjustmentHistory = () => {
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['/api/inventory/actions/history'],
    staleTime: 30000, // 30 seconds
  });

  if (isLoading) {
    return <div className="text-center py-4">Loading adjustment history...</div>;
  }

  const historyList = (historyData as any)?.history || [];
  
  if (!historyList || historyList.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No stock adjustments found</p>
        <p className="text-sm">Adjustments will appear here after you make them</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {historyList.map((adjustment: any, index: number) => (
        <div 
          key={adjustment.id || index} 
          className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant={adjustment.type === 'increase' ? 'default' : 'secondary'}>
                {adjustment.type === 'increase' ? '+' : '-'}{adjustment.quantity}
              </Badge>
              <span className="font-medium">{adjustment.itemName}</span>
            </div>
            <div className="text-sm text-gray-500">
              {new Date(adjustment.createdAt).toLocaleDateString()} {new Date(adjustment.createdAt).toLocaleTimeString()}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Location:</span>
              <span className="ml-2">{adjustment.fromLocationName}</span>
            </div>
            <div>
              <span className="text-gray-600">Reason:</span>
              <span className="ml-2">{adjustment.reason}</span>
            </div>
            {adjustment.notes && (
              <div className="col-span-2">
                <span className="text-gray-600">Notes:</span>
                <span className="ml-2">{adjustment.notes}</span>
              </div>
            )}
            <div className="col-span-2 flex items-center gap-4">
              <div>
                <span className="text-gray-600">User:</span>
                <span className="ml-2">{adjustment.user}</span>
              </div>
              {adjustment.cloverUpdated && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Synced with Clover
                </Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// CSV Import Dialog Component
function CSVImportDialog({ 
  open, 
  onOpenChange, 
  csvFile, 
  setCsvFile, 
  onImport, 
  isImporting, 
  importResults 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  csvFile: File | null;
  setCsvFile: (file: File | null) => void;
  onImport: () => void;
  isImporting: boolean;
  importResults: any;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Vendor Data from CSV</DialogTitle>
          <DialogDescription>
            Upload your inventory CSV file to update vendor information for all items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="csv-file">Select CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              data-testid="input-csv-file"
            />
            <p className="text-sm text-gray-500 mt-2">
              Expected format: Clover inventory export with Product, Variant, Location, Vendors, SKU, Barcode columns
            </p>
          </div>

          {csvFile && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm">
                <strong>Selected:</strong> {csvFile.name} ({(csvFile.size / 1024).toFixed(2)} KB)
              </p>
            </div>
          )}

          {importResults && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold">Import Results:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Processed: <strong>{importResults.processed}</strong></div>
                <div>Updated: <strong className="text-green-600">{importResults.updated}</strong></div>
                <div>Matched: <strong className="text-blue-600">{importResults.matched}</strong></div>
                <div>Unmatched: <strong className="text-yellow-600">{importResults.unmatched}</strong></div>
              </div>
              {importResults.errors && importResults.errors.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium text-red-600 mb-1">Errors ({importResults.errors.length}):</p>
                  <ul className="text-xs text-red-500 list-disc list-inside">
                    {importResults.errors.slice(0, 10).map((error: string, i: number) => (
                      <li key={i}>{error}</li>
                    ))}
                    {importResults.errors.length > 10 && (
                      <li>... and {importResults.errors.length - 10} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setCsvFile(null);
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={onImport}
            disabled={!csvFile || isImporting}
            data-testid="button-start-import"
          >
            {isImporting ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Pricing Diagnostic Component
function PricingDiagnostic() {
  const { data: diagnostic, isLoading } = useQuery({
    queryKey: ['/api/accounting/inventory/pricing-diagnostic'],
  });

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">Loading diagnostic...</div>;
  }

  if (!diagnostic) {
    return <div className="text-center py-4 text-muted-foreground">No data available</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
          <p className="text-xs text-muted-foreground mb-1">Clover Only</p>
          <p className="text-xl font-bold text-blue-600">{diagnostic?.summary?.cloverOnly?.count || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">
            ${(diagnostic?.summary?.cloverOnly?.inventoryValue || 0).toLocaleString()} value
          </p>
          <p className="text-xs text-blue-600 mt-1">{diagnostic?.summary?.cloverOnly?.percentage || 0}% of items</p>
        </div>

        <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200">
          <p className="text-xs text-muted-foreground mb-1">Thrive Only</p>
          <p className="text-xl font-bold text-purple-600">{diagnostic?.summary?.thriveOnly?.count || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">
            ${(diagnostic?.summary?.thriveOnly?.inventoryValue || 0).toLocaleString()} value
          </p>
          <p className="text-xs text-purple-600 mt-1">{diagnostic?.summary?.thriveOnly?.percentage || 0}% of items</p>
        </div>

        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200">
          <p className="text-xs text-muted-foreground mb-1">Both Systems</p>
          <p className="text-xl font-bold text-green-600">{diagnostic?.summary?.both?.count || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">
            C: ${(diagnostic?.summary?.both?.cloverInventoryValue || 0).toLocaleString()} | T: ${(diagnostic?.summary?.both?.thriveInventoryValue || 0).toLocaleString()}
          </p>
          <p className="text-xs text-green-600 mt-1">{diagnostic?.summary?.both?.percentage || 0}% of items</p>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200">
          <p className="text-xs text-muted-foreground mb-1">No Pricing Data</p>
          <p className="text-xl font-bold text-gray-600">{diagnostic?.summary?.neither?.count || 0}</p>
          <p className="text-xs text-gray-600 mt-1">{diagnostic?.summary?.neither?.percentage || 0}% of items</p>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-300 p-4 rounded-lg">
        <p className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-2">Why the difference?</p>
        <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1 list-disc list-inside">
          <li><strong>Clover Only ({diagnostic?.summary?.cloverOnly?.count || 0} items):</strong> Items with POS pricing but no Thrive vendor data imported</li>
          <li><strong>Thrive Only ({diagnostic?.summary?.thriveOnly?.count || 0} items):</strong> Items from CSV that don't exist in Clover or have no Clover pricing</li>
          <li><strong>Both Systems ({diagnostic?.summary?.both?.count || 0} items):</strong> Items with complete pricing from both sources</li>
        </ul>
      </div>
    </div>
  );
}