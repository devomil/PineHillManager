import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Camera, X, AlertCircle, Keyboard, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

interface ProductInfo {
  id: number;
  itemName: string;
  sku: string;
  upc?: string;
  unitCost: string;
  vendor?: string;
  description?: string;
}

interface PurchaseOrderBarcodeScannerProps {
  onProductFound: (product: ProductInfo) => void;
  onClose: () => void;
}

export function PurchaseOrderBarcodeScanner({ onProductFound, onClose }: PurchaseOrderBarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
  const [manualBarcode, setManualBarcode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrboxSize = 250;

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      setIsScanning(true);
      setError(null);

      const scanner = new Html5Qrcode("po-barcode-scanner-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: qrboxSize, height: qrboxSize },
        },
        (decodedText) => {
          lookupProduct(decodedText);
        },
        undefined
      );
    } catch (err) {
      console.error("Scanner error:", err);
      setError("Unable to access camera. Please ensure camera permissions are granted.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const lookupProduct = async (barcode: string) => {
    if (isLookingUp) return;
    
    setIsLookingUp(true);
    setError(null);

    try {
      const response = await apiRequest('GET', `/api/inventory/search/${encodeURIComponent(barcode)}`);
      
      if (response.ok) {
        const item = await response.json();
        
        const product: ProductInfo = {
          id: item.id,
          itemName: item.itemName,
          sku: item.sku || barcode,
          upc: item.upc,
          unitCost: item.unitCost || '0.00',
          vendor: item.vendor,
          description: item.description,
        };
        
        onProductFound(product);
        stopScanner();
        onClose();
      } else {
        setError(`Product not found for barcode: ${barcode}`);
      }
    } catch (err) {
      console.error('Error looking up product:', err);
      setError('Failed to look up product. Please try again.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualBarcode.trim()) return;
    await lookupProduct(manualBarcode.trim());
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scan Product Barcode
            </CardTitle>
            <CardDescription>
              Scan or enter a barcode to add product from inventory
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            data-testid="button-close-scanner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scan Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={scanMode === 'camera' ? 'default' : 'outline'}
            onClick={() => {
              setScanMode('camera');
              stopScanner();
            }}
            className="flex items-center gap-2"
            size="sm"
            data-testid="button-camera-mode"
          >
            <Camera className="h-4 w-4" />
            Camera
          </Button>
          <Button
            variant={scanMode === 'manual' ? 'default' : 'outline'}
            onClick={() => {
              setScanMode('manual');
              stopScanner();
            }}
            className="flex items-center gap-2"
            size="sm"
            data-testid="button-manual-mode"
          >
            <Keyboard className="h-4 w-4" />
            Manual
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Camera Scanner */}
        {scanMode === 'camera' && (
          <div className="space-y-4">
            {!isScanning && (
              <Button
                onClick={startScanner}
                className="w-full"
                data-testid="button-start-camera"
              >
                Start Camera
              </Button>
            )}
            
            {isScanning && (
              <>
                <div className="relative w-full flex justify-center border rounded-lg overflow-hidden">
                  <div id="po-barcode-scanner-reader" className="w-full" />
                </div>
                <Button
                  onClick={stopScanner}
                  variant="destructive"
                  className="w-full"
                  data-testid="button-stop-camera"
                >
                  Stop Camera
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Position the barcode within the frame to scan
                </p>
              </>
            )}
          </div>
        )}

        {/* Manual Entry */}
        {scanMode === 'manual' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter barcode, UPC, SKU, or ASIN"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                disabled={isLookingUp}
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
            {isLookingUp && (
              <p className="text-sm text-muted-foreground text-center">
                Looking up product...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
