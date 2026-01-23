import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  CheckCircle2,
  XCircle, 
  Clock, 
  DollarSign,
  ShoppingCart,
  Heart,
  Package,
  ArrowLeft,
  Database,
  BarChart3,
  MapPin,
  Store,
  History,
  Play,
  AlertTriangle,
  TestTube
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface IntegrationStatus {
  name: string;
  status: 'connected' | 'error' | 'not_configured';
  lastSync?: Date;
  icon: React.ReactNode;
  color: string;
}

interface CloverConfig {
  id?: number;
  merchantId: string;
  merchantName?: string;
  apiToken: string;
  isActive: boolean;
}

interface BigCommerceSyncConfig {
  id: number;
  syncEnabled: boolean;
  syncTimeLocal: string;
  percentageAllocation: number;
  alertEmail: string | null;
  alertOnFailure: boolean;
  alertInApp: boolean;
  sourceMerchantId: string;
  sourceLocationName: string;
  lastSyncAt: string | null;
  timezone: string;
}

interface SyncHistoryEntry {
  id: number;
  status: string;
  processedItems: number;
  successCount: number;
  errorCount: number;
  errorLog: string | null;
  startedAt: string;
  completedAt: string | null;
  triggeredBy: string;
}

interface InventoryItem {
  id: number;
  sku: string | null;
  itemName: string;
  quantityOnHand: number | null;
  vendor: string | null;
}

interface SkuMapping {
  id: number;
  sku: string;
  cloverSku: string | null;
  bigcommerceProductId: number;
  bigcommerceVariantId: number | null;
  productName: string;
  isActive: boolean;
  cloverItemName: string | null;
  cloverQuantity: number | null;
  isLinked: boolean;
}

interface CloverSearchItem {
  sku: string;
  itemName: string;
  quantityOnHand: number | null;
}

const BigCommerceSyncTab = ({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) => {
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [skuManagerSearch, setSkuManagerSearch] = useState('');
  const [editingMappingId, setEditingMappingId] = useState<number | null>(null);
  const [cloverSearchQuery, setCloverSearchQuery] = useState('');
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false);
  const [alertEmailValue, setAlertEmailValue] = useState('');
  
  const { data: syncConfig, isLoading: configLoading, refetch: refetchConfig } = useQuery<BigCommerceSyncConfig>({
    queryKey: ['/api/admin/bigcommerce-sync/config'],
    queryFn: async () => {
      const response = await fetch('/api/admin/bigcommerce-sync/config', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch config');
      return response.json();
    }
  });

  const { data: syncHistory = [], isLoading: historyLoading } = useQuery<SyncHistoryEntry[]>({
    queryKey: ['/api/admin/bigcommerce-sync/history'],
    queryFn: async () => {
      const response = await fetch('/api/admin/bigcommerce-sync/history?limit=10', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch history');
      return response.json();
    }
  });

  const { data: inventoryItems = [], isLoading: itemsLoading } = useQuery<InventoryItem[]>({
    queryKey: ['/api/admin/bigcommerce-sync/inventory-items'],
    queryFn: async () => {
      const response = await fetch('/api/admin/bigcommerce-sync/inventory-items', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch inventory');
      return response.json();
    },
    enabled: !!syncConfig
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<BigCommerceSyncConfig>) => {
      const response = await apiRequest('PUT', '/api/admin/bigcommerce-sync/config', updates);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Configuration updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bigcommerce-sync/config'] });
    },
    onError: (error) => {
      toast({ title: 'Failed to update configuration', description: error.message, variant: 'destructive' });
    }
  });

  const runSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/bigcommerce-sync/run');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.status === 'completed' ? 'Sync completed' : 'Sync completed with issues',
        description: `Processed: ${data.processedItems}, Updated: ${data.successCount}, Failed: ${data.errorCount}`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bigcommerce-sync/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bigcommerce-sync/config'] });
    },
    onError: (error) => {
      toast({ title: 'Sync failed', description: error.message, variant: 'destructive' });
    }
  });

  const testSyncMutation = useMutation({
    mutationFn: async (itemIds: number[]) => {
      const response = await apiRequest('POST', '/api/admin/bigcommerce-sync/test', { itemIds });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Test sync completed',
        description: `Processed: ${data.processedItems}, Updated: ${data.successCount}, Failed: ${data.errorCount}`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bigcommerce-sync/history'] });
      setSelectedItems([]);
    },
    onError: (error) => {
      toast({ title: 'Test sync failed', description: error.message, variant: 'destructive' });
    }
  });

  const importMappingsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/bigcommerce-sync/import-mappings');
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Mappings imported', description: `Imported ${data.imported} product mappings from BigCommerce` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bigcommerce-sync/sku-mappings'] });
    },
    onError: (error) => {
      toast({ title: 'Import failed', description: error.message, variant: 'destructive' });
    }
  });

  // SKU Manager queries
  const { data: skuMappings = [], isLoading: skuMappingsLoading, refetch: refetchSkuMappings } = useQuery<SkuMapping[]>({
    queryKey: ['/api/admin/bigcommerce-sync/sku-mappings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/bigcommerce-sync/sku-mappings', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch SKU mappings');
      return response.json();
    },
    enabled: !!syncConfig
  });

  const { data: cloverSearchResults = [] } = useQuery<CloverSearchItem[]>({
    queryKey: ['/api/admin/bigcommerce-sync/search-clover-items', cloverSearchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/admin/bigcommerce-sync/search-clover-items?q=${encodeURIComponent(cloverSearchQuery)}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to search');
      return response.json();
    },
    enabled: cloverSearchQuery.length >= 2
  });

  const updateSkuMappingMutation = useMutation({
    mutationFn: async ({ mappingId, cloverSku }: { mappingId: number; cloverSku: string | null }) => {
      const response = await apiRequest('PATCH', `/api/admin/bigcommerce-sync/sku-mappings/${mappingId}`, { cloverSku });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'SKU mapping updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bigcommerce-sync/sku-mappings'] });
      setEditingMappingId(null);
      setCloverSearchQuery('');
    },
    onError: (error) => {
      toast({ title: 'Failed to update mapping', description: error.message, variant: 'destructive' });
    }
  });

  // Filter SKU mappings
  const filteredSkuMappings = skuMappings.filter(m => {
    const matchesSearch = !skuManagerSearch || 
      m.productName?.toLowerCase().includes(skuManagerSearch.toLowerCase()) ||
      m.sku.toLowerCase().includes(skuManagerSearch.toLowerCase()) ||
      m.cloverSku?.toLowerCase().includes(skuManagerSearch.toLowerCase());
    const matchesUnmapped = !showUnmappedOnly || !m.isLinked;
    return matchesSearch && matchesUnmapped;
  });

  const toggleItemSelection = (itemId: number) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : prev.length < 10 
          ? [...prev, itemId]
          : prev
    );
  };

  // Sync local alert email state with config
  useEffect(() => {
    if (syncConfig?.alertEmail !== undefined) {
      setAlertEmailValue(syncConfig.alertEmail || '');
    }
  }, [syncConfig?.alertEmail]);

  const handleAlertEmailBlur = () => {
    if (alertEmailValue !== (syncConfig?.alertEmail || '')) {
      updateConfigMutation.mutate({ alertEmail: alertEmailValue || null });
    }
  };

  if (configLoading) {
    return (
      <TabsContent value="bigcommerce" className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading configuration...</span>
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="bigcommerce" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            BigCommerce Inventory Sync
          </CardTitle>
          <CardDescription>
            Automatically sync inventory from Clover (Watertown) to BigCommerce at 80% allocation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
            <div>
              <p className="font-medium">Sync Status</p>
              <p className="text-sm text-gray-600">
                Source: {syncConfig?.sourceLocationName || 'Watertown Retail'}
              </p>
              {syncConfig?.lastSyncAt && (
                <p className="text-xs text-gray-500">
                  Last sync: {new Date(syncConfig.lastSyncAt).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={syncConfig?.syncEnabled || false}
                  onCheckedChange={(checked) => updateConfigMutation.mutate({ syncEnabled: checked })}
                />
                <span className="text-sm">{syncConfig?.syncEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <Badge variant={syncConfig?.syncEnabled ? 'default' : 'secondary'}>
                {syncConfig?.syncEnabled ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sync Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={syncConfig?.syncTimeLocal?.split(':')[0] || '20'}
                  onValueChange={(value) => updateConfigMutation.mutate({ syncTimeLocal: `${value}:00` })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-2">Daily sync time</p>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{syncConfig?.percentageAllocation || 80}%</div>
                <p className="text-xs text-gray-500">
                  Qty 10 → {Math.floor(10 * (syncConfig?.percentageAllocation || 80) / 100)} to BigCommerce
                </p>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Alert Email</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={alertEmailValue}
                  onChange={(e) => setAlertEmailValue(e.target.value)}
                  onBlur={handleAlertEmailBlur}
                  className="text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">Failure notifications</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => runSyncMutation.mutate()}
              disabled={runSyncMutation.isPending || !syncConfig?.syncEnabled}
            >
              {runSyncMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              <Play className="h-4 w-4 mr-2" />
              Run Full Sync Now
            </Button>
            <Button
              variant="outline"
              onClick={() => importMappingsMutation.mutate()}
              disabled={importMappingsMutation.isPending}
            >
              {importMappingsMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Import Product Mappings
            </Button>
          </div>

          {!syncConfig?.syncEnabled && (
            <Alert>
              <TestTube className="h-4 w-4" />
              <AlertTitle>Test Mode</AlertTitle>
              <AlertDescription>
                Sync is disabled. Select up to 10 items below to test the sync before enabling full automation.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Test Sync
          </CardTitle>
          <CardDescription>
            Select 1-10 inventory items to test the sync functionality before enabling automation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {itemsLoading ? (
            <div className="flex items-center justify-center p-4">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="ml-2">Loading items...</span>
            </div>
          ) : (
            <>
              <div className="max-h-64 overflow-y-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Allocated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryItems.slice(0, 50).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                            disabled={!selectedItems.includes(item.id) && selectedItems.length >= 10}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-sm">{item.itemName}</TableCell>
                        <TableCell className="text-xs text-gray-500">{item.sku || '-'}</TableCell>
                        <TableCell>{item.quantityOnHand || 0}</TableCell>
                        <TableCell className="text-xs">{item.vendor || '-'}</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {Math.floor((item.quantityOnHand || 0) * (syncConfig?.percentageAllocation || 80) / 100)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-600">
                  {selectedItems.length} of 10 items selected
                </span>
                <Button
                  onClick={() => testSyncMutation.mutate(selectedItems)}
                  disabled={testSyncMutation.isPending || selectedItems.length === 0}
                  variant="secondary"
                >
                  {testSyncMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  <TestTube className="h-4 w-4 mr-2" />
                  Run Test Sync ({selectedItems.length} items)
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Sync History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center p-4">
              <RefreshCw className="h-4 w-4 animate-spin" />
            </div>
          ) : syncHistory.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No sync history yet</p>
          ) : (
            <div className="space-y-2">
              {syncHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {entry.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : entry.status === 'failed' ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : entry.status === 'partial' ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-blue-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(entry.startedAt).toLocaleDateString()} {new Date(entry.startedAt).toLocaleTimeString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {entry.triggeredBy === 'scheduled' ? 'Scheduled' : 
                         entry.triggeredBy === 'test' ? 'Test' : 'Manual'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">Processed: {entry.processedItems}</span>
                    <span className="text-green-600">Updated: {entry.successCount}</span>
                    {entry.errorCount > 0 && (
                      <span className="text-red-600">Failed: {entry.errorCount}</span>
                    )}
                    <Badge variant={entry.status === 'completed' ? 'default' : entry.status === 'failed' ? 'destructive' : 'secondary'}>
                      {entry.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SKU Manager Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            SKU Manager
          </CardTitle>
          <CardDescription>
            Link BigCommerce variants to Clover items when SKUs don't match. Items marked "Not Linked" won't sync until mapped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Search products..."
              value={skuManagerSearch}
              onChange={(e) => setSkuManagerSearch(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex items-center gap-2">
              <Checkbox 
                id="showUnmapped"
                checked={showUnmappedOnly}
                onCheckedChange={(checked) => setShowUnmappedOnly(checked === true)}
              />
              <Label htmlFor="showUnmapped" className="text-sm">Show unmapped only</Label>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetchSkuMappings()}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>

          {skuMappingsLoading ? (
            <div className="flex items-center justify-center p-4">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="ml-2">Loading mappings...</span>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>BigCommerce Product</TableHead>
                    <TableHead>BC SKU</TableHead>
                    <TableHead>Clover SKU</TableHead>
                    <TableHead>Clover Item</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSkuMappings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-4">
                        {showUnmappedOnly ? 'All items are linked' : 'No mappings found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSkuMappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell className="font-medium text-sm max-w-[200px] truncate" title={mapping.productName}>
                          {mapping.productName}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{mapping.sku}</TableCell>
                        <TableCell>
                          {editingMappingId === mapping.id ? (
                            <div className="space-y-2">
                              <Input
                                placeholder="Search Clover items..."
                                value={cloverSearchQuery}
                                onChange={(e) => setCloverSearchQuery(e.target.value)}
                                className="h-8 text-sm"
                                autoFocus
                              />
                              {cloverSearchResults.length > 0 && (
                                <div className="absolute z-10 bg-white border rounded shadow-lg max-h-48 overflow-y-auto w-64">
                                  {cloverSearchResults.map((item) => (
                                    <button
                                      key={item.sku}
                                      className="w-full px-3 py-2 text-left hover:bg-gray-100 border-b last:border-0"
                                      onClick={() => {
                                        updateSkuMappingMutation.mutate({ 
                                          mappingId: mapping.id, 
                                          cloverSku: item.sku 
                                        });
                                      }}
                                    >
                                      <p className="text-sm font-medium truncate">{item.itemName}</p>
                                      <p className="text-xs text-gray-500">SKU: {item.sku} | Qty: {item.quantityOnHand}</p>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono text-xs">
                              {mapping.cloverSku || <span className="text-gray-400 italic">—</span>}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-[150px] truncate" title={mapping.cloverItemName || ''}>
                          {mapping.cloverItemName || <span className="text-gray-400 italic">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {mapping.cloverQuantity !== null ? (
                            <span className="font-medium">{mapping.cloverQuantity}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {mapping.isLinked ? (
                            <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Linked
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Not Linked
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingMappingId === mapping.id ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingMappingId(null);
                                  setCloverSearchQuery('');
                                }}
                              >
                                Cancel
                              </Button>
                              {mapping.cloverSku && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600"
                                  onClick={() => {
                                    updateSkuMappingMutation.mutate({ 
                                      mappingId: mapping.id, 
                                      cloverSku: null 
                                    });
                                  }}
                                >
                                  Clear
                                </Button>
                              )}
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingMappingId(mapping.id);
                                setCloverSearchQuery('');
                              }}
                            >
                              {mapping.cloverSku ? 'Edit' : 'Link'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          <p className="text-xs text-gray-500">
            Showing {filteredSkuMappings.length} of {skuMappings.length} mappings
            {showUnmappedOnly && ` (${skuMappings.filter(m => !m.isLinked).length} unmapped)`}
          </p>
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          <strong>How it works:</strong> This sync pulls inventory from Clover (Watertown Retail location) and updates 
          BigCommerce with {syncConfig?.percentageAllocation || 80}% of the quantity (e.g., qty 10 → {Math.floor(10 * (syncConfig?.percentageAllocation || 80) / 100)} allocated to BigCommerce). 
          Syncs run daily at {(() => {
            const hour = parseInt(syncConfig?.syncTimeLocal?.split(':')[0] || '20');
            return hour === 0 ? '12:00 AM' : hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`;
          })()} and match products by SKU.
        </AlertDescription>
      </Alert>
    </TabsContent>
  );
};

const IntegrationsPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [, setLocation] = useLocation();

  // Integration status mapping
  const getIntegrationStatuses = (healthData: any, cloverConfigs: CloverConfig[]) => {
    const statuses = [
      {
        name: 'Database',
        status: healthData?.database === 'connected' ? 'connected' : 'error',
        icon: <Database className="h-4 w-4" />,
        color: healthData?.database === 'connected' ? 'green' : 'red'
      },
      {
        name: 'QuickBooks',
        status: healthData?.quickbooks === 'configured' ? 'connected' : 'not_configured',
        icon: <BarChart3 className="h-4 w-4" />,
        color: healthData?.quickbooks === 'configured' ? 'green' : 'yellow'
      },
      {
        name: 'HSA Provider',
        status: healthData?.hsa === 'configured' ? 'connected' : 'not_configured',
        icon: <Heart className="h-4 w-4" />,
        color: healthData?.hsa === 'configured' ? 'green' : 'yellow'
      },
      {
        name: 'Thrive Inventory',
        status: healthData?.thrive === 'configured' ? 'connected' : 'not_configured',
        icon: <Package className="h-4 w-4" />,
        color: healthData?.thrive === 'configured' ? 'green' : 'yellow'
      }
    ];

    // Add Clover locations
    cloverConfigs.forEach(config => {
      statuses.push({
        name: `Clover POS - ${config.merchantName}`,
        status: config.isActive ? 'connected' : 'not_configured',
        icon: <ShoppingCart className="h-4 w-4" />,
        color: config.isActive ? 'green' : 'yellow'
      });
    });

    return statuses;
  };

  // Form states for credentials
  const [quickbooksCredentials, setQuickbooksCredentials] = useState({
    clientId: '',
    clientSecret: '',
    sandboxMode: true
  });

  const [cloverCredentials, setCloverCredentials] = useState({
    merchantId: '',
    merchantName: '',
    apiToken: '',
    environment: 'production'
  });

  const [savedMerchants, setSavedMerchants] = useState<CloverConfig[]>([]);

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
    queryFn: async () => {
      const response = await fetch('/api/accounting/health', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch all Clover configurations for multi-location support
  const { data: allCloverConfigs = [], refetch: refetchClover } = useQuery<CloverConfig[]>({
    queryKey: ['/api/accounting/config/clover/all'],
    queryFn: async () => {
      const response = await fetch('/api/accounting/config/clover/all', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      return text ? JSON.parse(text) : [];
    },
    retry: 1,
    staleTime: 0,
    gcTime: 0,
    enabled: true,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Get the first active config for form loading (backward compatibility)
  const cloverConfig = allCloverConfigs.find((config: CloverConfig) => config.isActive) || allCloverConfigs[0] || null;

  // Update form when data is loaded
  useEffect(() => {
    if (cloverConfig && typeof cloverConfig === 'object' && !cloverCredentials.merchantId) {
      setCloverCredentials({
        merchantId: cloverConfig.merchantId || '',
        merchantName: cloverConfig.merchantName || '',
        apiToken: cloverConfig.apiToken || '',
        environment: 'production'
      });
    }
  }, [cloverConfig]);

  // Update saved merchants list separately
  useEffect(() => {
    if (allCloverConfigs && allCloverConfigs.length > 0) {
      setSavedMerchants(allCloverConfigs);
    }
  }, [allCloverConfigs]);

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
    queryKey: ['/api/accounting/config/clover/all'],
    queryFn: async () => {
      const response = await fetch('/api/accounting/config/clover/all', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      return text ? JSON.parse(text) : [];
    }
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

  // QuickBooks connect with OAuth
  const connectQuickbooksMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/integrations/quickbooks/auth-url');
      const data = await response.json();
      // Redirect to QuickBooks OAuth page
      window.location.href = data.authUrl;
      return data;
    },
    onError: (error) => {
      toast({
        title: 'Connection Failed',
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
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/health'] });
    },
    onError: (error) => {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // QuickBooks sync customers and vendors
  const quickbooksSyncCustomersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/integrations/quickbooks/sync/customers-vendors');
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Sync Successful',
        description: data.message,
        variant: 'default'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/health'] });
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
            <h1 className="text-3xl font-semibold text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quickbooks">QuickBooks</TabsTrigger>
          <TabsTrigger value="clover">Clover POS</TabsTrigger>
          <TabsTrigger value="bigcommerce">BigCommerce</TabsTrigger>
          <TabsTrigger value="hsa">HSA Provider</TabsTrigger>
          <TabsTrigger value="thrive">Thrive</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Multi-Location Integration Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Active Integrations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getIntegrationStatuses(integrationStatus, allCloverConfigs).filter(i => i.status === 'connected').length}
                </div>
                <p className="text-sm text-gray-500">Connected systems</p>
                <div className="mt-3 space-y-1">
                  {getIntegrationStatuses(integrationStatus, allCloverConfigs).filter(i => i.status === 'connected').slice(0, 3).map((integration, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span>{integration.name}</span>
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700">Active</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Clover Locations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{allCloverConfigs.filter(c => c.isActive).length}</div>
                <p className="text-sm text-gray-500">POS locations connected</p>
                <div className="mt-3 space-y-1">
                  {allCloverConfigs.filter(c => c.isActive).map(config => (
                    <div key={config.id} className="flex items-center justify-between text-xs">
                      <span>{config.merchantName}</span>
                      <Badge variant="outline" className="text-xs">Active</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {integrationStatus?.database === 'connected' ? '100%' : '0%'}
                </div>
                <p className="text-sm text-gray-500">Overall system health</p>
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: integrationStatus?.database === 'connected' ? '100%' : '0%' }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Integration Status Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                All Integrations Status
              </CardTitle>
              <CardDescription>
                Complete overview of all connected systems and locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getIntegrationStatuses(integrationStatus, allCloverConfigs).map((integration, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {integration.icon}
                        <h3 className="font-medium text-sm">{integration.name}</h3>
                      </div>
                      <Badge 
                        variant={integration.status === 'connected' ? 'default' : 'secondary'}
                        className={integration.status === 'connected' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {integration.status === 'connected' ? 'Connected' : 
                         integration.status === 'not_configured' ? 'Setup Needed' : 'Error'}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      {integration.status === 'connected' ? 'Ready for data sync' : 'Configuration required'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Settings className="h-4 w-4" />
            <AlertTitle>Multi-Location Integration Management</AlertTitle>
            <AlertDescription>
              All {allCloverConfigs.length} Clover POS locations are operational. Configure additional integrations using their respective tabs. 
              QuickBooks, HSA, and Thrive inventory integrations will sync data across all locations.
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

              {/* OAuth Connection */}
              {(integrationStatus as any)?.quickbooks !== 'configured' ? (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-800">Connect to QuickBooks</CardTitle>
                    <p className="text-sm text-blue-600">Click below to authorize Pine Hill Farm with your QuickBooks account</p>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => connectQuickbooksMutation.mutate()}
                      disabled={connectQuickbooksMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {connectQuickbooksMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                      <DollarSign className="h-4 w-4 mr-2" />
                      Connect to QuickBooks
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">QuickBooks Connected</AlertTitle>
                    <AlertDescription className="text-green-700">
                      Your QuickBooks account is connected and ready to sync data.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => quickbooksSyncMutation.mutate()}
                      disabled={quickbooksSyncMutation.isPending}
                    >
                      {quickbooksSyncMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                      Sync Chart of Accounts
                    </Button>
                    
                    <Button 
                      onClick={() => quickbooksSyncCustomersMutation.mutate()}
                      disabled={quickbooksSyncCustomersMutation.isPending}
                      variant="outline"
                    >
                      {quickbooksSyncCustomersMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                      Sync Customers & Vendors
                    </Button>
                  </div>
                </>
              )}

              <Alert>
                <AlertDescription>
                  QuickBooks integration allows you to sync your chart of accounts, customers, and vendors.
                  All data is securely synced using OAuth 2.0 authentication.
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

              {/* Quick Setup for Known Locations */}
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-800">Quick Setup - Additional Pine Hill Farm Locations</CardTitle>
                  <p className="text-sm text-blue-600">Click to quickly set up your additional merchant locations</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 text-left bg-white hover:bg-blue-50"
                      onClick={() => setCloverCredentials({
                        merchantId: '',
                        merchantName: 'Watertown Retail',
                        apiToken: '',
                        environment: 'production'
                      })}
                    >
                      <div>
                        <div className="font-medium">Watertown Retail</div>
                        <div className="text-xs text-gray-500 mt-1">Click to setup this location</div>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 text-left bg-white hover:bg-blue-50"
                      onClick={() => setCloverCredentials({
                        merchantId: '',
                        merchantName: 'Pinehillfarm.co Online',
                        apiToken: '',
                        environment: 'production'
                      })}
                    >
                      <div>
                        <div className="font-medium">Pinehillfarm.co Online</div>
                        <div className="text-xs text-gray-500 mt-1">Click to setup this location</div>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 text-left bg-white hover:bg-blue-50"
                      onClick={() => setCloverCredentials({
                        merchantId: '',
                        merchantName: '',
                        apiToken: '',
                        environment: 'production'
                      })}
                    >
                      <div>
                        <div className="font-medium">Custom Location</div>
                        <div className="text-xs text-gray-500 mt-1">Setup a custom merchant</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>

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
                                  merchantName: merchant.merchantName || '',
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
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="clover-location-name">Location Name</Label>
                      <Input
                        id="clover-location-name"
                        type="text"
                        value={cloverCredentials.merchantName}
                        onChange={(e) => setCloverCredentials(prev => ({ ...prev, merchantName: e.target.value }))}
                        placeholder="e.g., Lake Geneva Retail, Watertown Retail, Pinehillfarm.co Online"
                      />
                    </div>
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

        <BigCommerceSyncTab toast={toast} />

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