import { useState, useRef, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  QrCode, 
  Camera, 
  Keyboard, 
  Package, 
  Plus, 
  Minus, 
  ShoppingCart,
  Search,
  X,
  Check,
  AlertTriangle
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ScannedItem {
  barcode: string;
  itemName?: string;
  currentStock?: number;
  unitPrice?: number;
  locationName?: string;
  found: boolean;
}

interface InventoryAction {
  type: 'take' | 'adjustment' | 'employee_purchase';
  items: {
    barcode: string;
    itemName: string;
    quantity: number;
    unitPrice?: number;
    notes?: string;
  }[];
  locationId?: string;
  employeeId?: string;
  notes?: string;
}

interface BarcodeScannerProps {
  onItemScanned?: (item: ScannedItem) => void;
  selectedLocation?: string;
  mode?: 'take' | 'adjustment' | 'employee_purchase';
}

export function BarcodeScanner({ onItemScanned, selectedLocation, mode = 'take' }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
  const [manualBarcode, setManualBarcode] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [currentAction, setCurrentAction] = useState<InventoryAction>({ type: mode, items: [] });
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ScannedItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize camera scanner
  useEffect(() => {
    if (isScanning && scanMode === 'camera') {
      const scanner = new Html5QrcodeScanner(
        "barcode-scanner-element",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          // Enable multiple barcode formats
          formatsToSupport: [
            // @ts-ignore - html5-qrcode library will handle format detection
          ],
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
        },
        false
      );

      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
        }
      };
    }
  }, [isScanning, scanMode]);

  const onScanSuccess = async (decodedText: string) => {
    if (isLookingUp) return; // Prevent multiple simultaneous lookups
    
    setIsLookingUp(true);
    await lookupProduct(decodedText);
    setIsLookingUp(false);
  };

  const onScanFailure = (error: any) => {
    // Silently handle scan failures - they're very common
    console.debug('Scan failed:', error);
  };

  const lookupProduct = async (barcode: string) => {
    try {
      const params = new URLSearchParams();
      params.append('sku', barcode);
      if (selectedLocation && selectedLocation !== 'all') {
        params.append('locationId', selectedLocation);
      }

      const response = await apiRequest('GET', `/api/accounting/inventory/items/lookup?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        const item: ScannedItem = {
          barcode,
          itemName: data.name,
          currentStock: data.stockCount,
          unitPrice: data.price,
          locationName: data.locationName,
          found: true
        };
        
        addScannedItem(item);
        onItemScanned?.(item);
        
        toast({
          title: "Product Found!",
          description: `${data.name} - Stock: ${data.stockCount || 0}`,
        });
      } else {
        const item: ScannedItem = {
          barcode,
          found: false
        };
        
        addScannedItem(item);
        onItemScanned?.(item);
        
        toast({
          variant: "destructive",
          title: "Product Not Found",
          description: `Barcode ${barcode} not found in inventory`,
        });
      }
    } catch (error) {
      console.error('Error looking up product:', error);
      toast({
        variant: "destructive",
        title: "Lookup Error",
        description: "Failed to look up product information",
      });
    }
  };

  const addScannedItem = (item: ScannedItem) => {
    setScannedItems(prev => {
      // Check if item already exists
      const existing = prev.find(i => i.barcode === item.barcode);
      if (existing) {
        return prev; // Don't add duplicates
      }
      return [...prev, item];
    });
  };

  const handleManualSubmit = async () => {
    if (!manualBarcode.trim()) return;
    
    setIsLookingUp(true);
    await lookupProduct(manualBarcode.trim());
    setManualBarcode('');
    setIsLookingUp(false);
  };

  const handleItemAction = (item: ScannedItem) => {
    setSelectedItem(item);
    setQuantity(1);
    setNotes('');
    setShowActionDialog(true);
  };

  const confirmAction = () => {
    if (!selectedItem) return;

    const actionItem = {
      barcode: selectedItem.barcode,
      itemName: selectedItem.itemName || `Unknown Item (${selectedItem.barcode})`,
      quantity,
      unitPrice: selectedItem.unitPrice,
      notes
    };

    setCurrentAction(prev => ({
      ...prev,
      items: [...prev.items, actionItem]
    }));

    toast({
      title: "Item Added",
      description: `${actionItem.itemName} x${quantity} added to ${mode}`,
    });

    setShowActionDialog(false);
    setSelectedItem(null);
  };

  const removeActionItem = (index: number) => {
    setCurrentAction(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const submitInventoryAction = useMutation({
    mutationFn: async (action: InventoryAction) => {
      const endpoint = `/api/inventory/actions/${action.type}`;
      const response = await apiRequest('POST', endpoint, action);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Action Submitted",
        description: `${mode} completed successfully`,
      });
      
      // Clear current action
      setCurrentAction({ type: mode, items: [] });
      
      // Invalidate inventory queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/inventory'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Failed to submit inventory action",
      });
    }
  });

  const getModeIcon = () => {
    switch (mode) {
      case 'take': return <Package className="h-4 w-4" />;
      case 'adjustment': return <Plus className="h-4 w-4" />;
      case 'employee_purchase': return <ShoppingCart className="h-4 w-4" />;
    }
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'take': return 'Inventory Count';
      case 'adjustment': return 'Stock Adjustment';
      case 'employee_purchase': return 'Employee Purchase';
    }
  };

  return (
    <div className="space-y-6">
      {/* Scanner Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getModeIcon()}
            Barcode Scanner - {getModeTitle()}
          </CardTitle>
          <CardDescription>
            Scan barcodes using camera or enter manually for {mode.replace('_', ' ')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Scan Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={scanMode === 'camera' ? 'default' : 'outline'}
                onClick={() => setScanMode('camera')}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Camera
              </Button>
              <Button
                variant={scanMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setScanMode('manual')}
                className="flex items-center gap-2"
              >
                <Keyboard className="h-4 w-4" />
                Manual Entry
              </Button>
            </div>

            {/* Camera Scanner */}
            {scanMode === 'camera' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsScanning(!isScanning)}
                    variant={isScanning ? 'destructive' : 'default'}
                  >
                    {isScanning ? 'Stop Scanning' : 'Start Camera'}
                  </Button>
                </div>
                
                {isScanning && (
                  <div className="border rounded-lg p-4">
                    <div id="barcode-scanner-element" style={{ width: '100%' }}></div>
                  </div>
                )}
              </div>
            )}

            {/* Manual Entry */}
            {scanMode === 'manual' && (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter barcode or SKU"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                  data-testid="input-manual-barcode"
                />
                <Button 
                  onClick={handleManualSubmit}
                  disabled={!manualBarcode.trim() || isLookingUp}
                  data-testid="button-lookup-barcode"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            )}

            {isLookingUp && (
              <div className="text-center text-sm text-gray-500">
                Looking up product...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scanned Items */}
      {scannedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scanned Items</CardTitle>
            <CardDescription>
              Items found during scanning session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scannedItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`scanned-item-${index}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.found ? 'default' : 'destructive'}>
                        {item.barcode}
                      </Badge>
                      {item.found && <Check className="h-4 w-4 text-green-500" />}
                      {!item.found && <AlertTriangle className="h-4 w-4 text-red-500" />}
                    </div>
                    {item.itemName && (
                      <div className="text-sm font-medium">{item.itemName}</div>
                    )}
                    {item.currentStock !== undefined && (
                      <div className="text-sm text-gray-500">
                        Stock: {item.currentStock} | Price: ${(item.unitPrice || 0) / 100}
                      </div>
                    )}
                  </div>
                  
                  {item.found && (
                    <Button
                      size="sm"
                      onClick={() => handleItemAction(item)}
                      data-testid={`button-action-item-${index}`}
                    >
                      Add to {mode.replace('_', ' ')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Action Items */}
      {currentAction.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current {getModeTitle()}</CardTitle>
            <CardDescription>
              Items ready for submission
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentAction.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-blue-50"
                  data-testid={`action-item-${index}`}
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.itemName}</div>
                    <div className="text-sm text-gray-500">
                      Barcode: {item.barcode} | Quantity: {item.quantity}
                      {item.notes && ` | Notes: ${item.notes}`}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeActionItem(index)}
                    data-testid={`button-remove-item-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <Button
                onClick={() => submitInventoryAction.mutate(currentAction)}
                disabled={submitInventoryAction.isPending}
                className="w-full"
                data-testid="button-submit-action"
              >
                Submit {getModeTitle()} ({currentAction.items.length} items)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent data-testid="dialog-action-item">
          <DialogHeader>
            <DialogTitle>Add to {getModeTitle()}</DialogTitle>
            <DialogDescription>
              {selectedItem?.itemName || selectedItem?.barcode}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                data-testid="input-quantity"
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this item..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="textarea-notes"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAction} data-testid="button-confirm-action">
              Add to {getModeTitle()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}