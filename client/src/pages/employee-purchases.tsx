import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Scan, Trash2, Plus, Minus, DollarSign, Package, MapPin, FileText } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { EmployeePurchase, InventoryItem } from "@shared/schema";
import { CloverPaymentDialog } from "@/components/clover-payment-dialog";

interface CartItem {
  item: InventoryItem;
  quantity: number;
}

interface Location {
  id: number;
  name: string;
  address: string;
  merchantId?: string;
}

interface PurchaseBalance {
  monthlyTotal: number;
  monthlyCap: number;
  remainingBalance: number;
  periodMonth: string;
  isEnabled: boolean;
  costMarkup: number;
  retailDiscount: number;
  userRole: 'employee' | 'manager' | 'admin';
}

export default function EmployeePurchases() {
  const { toast } = useToast();
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [pendingPurchaseIds, setPendingPurchaseIds] = useState<number[]>([]);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Calculate price based on monthly allowance model and user role
  // Managers/Admins:
  //   - Before reaching monthly cap: 100% discount (no charge until allowance used)
  //   - After exceeding monthly cap: COGS + % markup
  // Regular Employees:
  //   - Before reaching monthly cap: charge full retail price (company pays, employee doesn't)
  //   - After exceeding monthly cap: charge 25% off retail (employee pays out of pocket with discount)
  const calculatePrice = (item: InventoryItem, balance: PurchaseBalance | undefined, currentCartTotal: number = 0): number => {
    if (!balance) return parseFloat(item.unitCost || '0');
    
    const cost = parseFloat(item.unitCost || '0');
    const retailPrice = parseFloat(item.unitPrice || '0');
    const totalSpending = balance.monthlyTotal + currentCartTotal;
    const cap = parseFloat(balance.monthlyCap?.toString() || '0');
    
    // Managers and admins get special pricing
    if (balance.userRole === 'manager' || balance.userRole === 'admin') {
      // Before cap: 100% discount (no charge)
      if (totalSpending < cap) {
        return 0;
      }
      // After cap: COGS + % markup
      const markup = parseFloat(balance.costMarkup?.toString() || '0');
      return cost * (1 + markup / 100);
    }
    
    // For regular employees: check if we've already exceeded the cap (including current cart)
    // If under allowance cap: use full retail price (no discount - company pays)
    if (totalSpending < cap) {
      return retailPrice;
    }
    
    // If over allowance cap: use 25% off retail (employee discount - employee pays)
    return retailPrice * 0.75;
  };

  const { data: balance, isLoading: balanceLoading } = useQuery<PurchaseBalance>({
    queryKey: ['/api/employee-purchases/balance'],
  });

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery<EmployeePurchase[]>({
    queryKey: ['/api/employee-purchases'],
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  const searchMutation = useMutation({
    mutationFn: async (barcode: string) => {
      const res = await fetch(`/api/inventory/search/${barcode}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Item not found');
      }
      return res.json();
    },
    onSuccess: (item: InventoryItem) => {
      const existingItem = cart.find(c => c.item.id === item.id);
      if (existingItem) {
        setCart(cart.map(c => 
          c.item.id === item.id 
            ? { ...c, quantity: c.quantity + 1 }
            : c
        ));
      } else {
        setCart([...cart, { item, quantity: 1 }]);
      }
      setBarcode("");
      barcodeInputRef.current?.focus();
      toast({
        title: "Item added",
        description: `${item.itemName} added to cart`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Item not found",
        description: error.message,
      });
      setBarcode("");
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!balance) {
        throw new Error('Balance data not available');
      }

      if (!selectedLocation) {
        throw new Error('Please select a store location');
      }

      // Calculate how much requires payment (items that exceed allowance cap)
      let runningTotal = balance.monthlyTotal;
      const cap = parseFloat(balance.monthlyCap?.toString() || '0');
      let amountRequiringPayment = 0;
      
      // For each cart item, determine how much needs payment
      for (const { item, quantity, unitPrice, lineTotal } of cartItemsWithPrices) {
        for (let i = 0; i < quantity; i++) {
          const itemPrice = calculatePrice(item, balance, runningTotal - balance.monthlyTotal);
          
          // If this item pushes us over the cap, it requires payment
          if (runningTotal + itemPrice > cap && itemPrice > 0) {
            amountRequiringPayment += itemPrice;
          }
          
          runningTotal += itemPrice;
        }
      }

      // Create purchase records first
      const purchases = cartItemsWithPrices.map(({ item, quantity, unitPrice, lineTotal }) => {
        return {
          employeeId: balance.periodMonth, // This will be replaced by the backend with the actual employee ID from session
          inventoryItemId: item.id,
          locationId: selectedLocation,
          itemName: item.itemName,
          barcode: item.sku || item.asin || '',
          quantity: quantity.toString(),
          unitPrice: unitPrice.toFixed(2),
          totalAmount: lineTotal.toFixed(2),
          periodMonth: balance.periodMonth,
          notes: purchaseNotes.trim() || null,
        };
      });

      const results = [];
      let totalPaymentRequired = 0;
      
      for (const purchase of purchases) {
        const response = await apiRequest('POST', '/api/employee-purchases', purchase);
        const result = await response.json();
        results.push(result);
        
        // Check if this purchase requires payment (backend now tells us)
        if (result.requiresPayment && result.paymentAmount) {
          totalPaymentRequired += parseFloat(result.paymentAmount);
        }
      }

      // If payment is required, show payment dialog
      if (totalPaymentRequired > 0) {
        const purchaseIds = results.map((r: any) => r.id);
        setPendingPurchaseIds(purchaseIds);
        setPaymentAmount(totalPaymentRequired);
        setShowPaymentDialog(true);
        return { requiresPayment: true, purchaseIds, amount: totalPaymentRequired };
      }

      return { requiresPayment: false, results };
    },
    onSuccess: (data: any) => {
      if (!data.requiresPayment) {
        // Free purchase completed successfully
        queryClient.invalidateQueries({ queryKey: ['/api/employee-purchases'] });
        queryClient.invalidateQueries({ queryKey: ['/api/employee-purchases/balance'] });
        setCart([]);
        toast({
          title: "Purchase complete",
          description: "Your items have been recorded",
        });
      }
      // If payment required, wait for payment dialog to complete
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Purchase failed",
        description: error.message || "Failed to complete purchase",
      });
    },
  });

  const handlePaymentSuccess = async (paymentData: any) => {
    // Payment completed successfully
    queryClient.invalidateQueries({ queryKey: ['/api/employee-purchases'] });
    queryClient.invalidateQueries({ queryKey: ['/api/employee-purchases/balance'] });
    setCart([]);
    setPendingPurchaseIds([]);
    setPaymentAmount(0);
    setShowPaymentDialog(false);
    
    toast({
      title: "Purchase complete",
      description: `Payment of $${paymentAmount.toFixed(2)} processed successfully`,
    });
  };

  const handlePaymentError = (error: string) => {
    toast({
      variant: "destructive",
      title: "Payment failed",
      description: error,
    });
  };

  const handlePaymentCancel = () => {
    setShowPaymentDialog(false);
    setPendingPurchaseIds([]);
    setPaymentAmount(0);
    
    toast({
      title: "Payment cancelled",
      description: "Your purchase has been cancelled. Please complete payment to finalize your order.",
      variant: "destructive",
    });
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) {
      searchMutation.mutate(barcode.trim());
    }
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setCart(cart.map(c => {
      if (c.item.id === itemId) {
        const newQuantity = Math.max(1, c.quantity + delta);
        return { ...c, quantity: newQuantity };
      }
      return c;
    }));
  };

  const removeItem = (itemId: number) => {
    setCart(cart.filter(c => c.item.id !== itemId));
  };

  // Calculate cart total with progressive pricing (accounts for crossing cap mid-cart)
  // Use a pure reducer to avoid side effects and ensure deterministic pricing
  const { cartItemsWithPrices, cartTotal } = cart.reduce<{
    cartItemsWithPrices: Array<CartItem & { unitPrice: number; lineTotal: number }>;
    cartTotal: number;
  }>(
    (acc, cartItem) => {
      let lineTotal = 0;
      
      // Calculate price for each unit individually
      for (let i = 0; i < cartItem.quantity; i++) {
        const unitPrice = calculatePrice(cartItem.item, balance, acc.cartTotal);
        lineTotal += unitPrice;
        acc.cartTotal += unitPrice;
      }
      
      // For display purposes, we show average price per unit for the line
      const avgUnitPrice = lineTotal / cartItem.quantity;
      
      acc.cartItemsWithPrices.push({
        ...cartItem,
        unitPrice: avgUnitPrice,
        lineTotal,
      });
      
      return acc;
    },
    { cartItemsWithPrices: [], cartTotal: 0 }
  );
  
  const wouldExceed = balance && (balance.monthlyTotal + cartTotal > parseFloat(balance.monthlyCap?.toString() || '0'));

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Show loading state while balance data is being fetched
  if (balanceLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-3xl font-semibold text-gray-900">
                    Pine Hill Farm
                  </h1>
                  <p className="text-sm text-gray-600">Employee Purchase Portal</p>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = "/"}
                className="text-gray-700 hover:text-gray-900"
              >
                ← Back to Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Employee Purchase Portal</CardTitle>
              <CardDescription>Loading your purchase information...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Please wait...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show disabled message if benefit is not enabled
  if (!balance?.isEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-3xl font-semibold text-gray-900">
                    Pine Hill Farm
                  </h1>
                  <p className="text-sm text-gray-600">Employee Purchase Portal</p>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = "/"}
                className="text-gray-700 hover:text-gray-900"
              >
                ← Back to Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Employee Purchase Portal</CardTitle>
              <CardDescription>Purchase benefit not enabled</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                The employee purchase benefit is not currently enabled for your account. 
                Please contact your manager or administrator for more information.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                  Pine Hill Farm
                </h1>
                <p className="text-sm text-gray-600">Employee Purchase Portal</p>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={() => window.location.href = "/"}
              className="text-gray-700 hover:text-gray-900"
            >
              ← Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                Scan Item
              </CardTitle>
              <CardDescription>
                Use your barcode scanner or enter SKU/ASIN manually
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleScan} className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="barcode" className="sr-only">Barcode/SKU/ASIN</Label>
                  <Input
                    id="barcode"
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="Scan or enter barcode, SKU, or ASIN..."
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    disabled={searchMutation.isPending}
                    data-testid="input-barcode"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={!barcode.trim() || searchMutation.isPending}
                  data-testid="button-scan"
                >
                  <Scan className="h-4 w-4 mr-2" />
                  Scan
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Shopping Cart
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Your cart is empty</p>
                  <p className="text-sm">Scan items to add them to your cart</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Cart Items */}
                  <div className="space-y-4">
                    {cartItemsWithPrices.map(({ item, quantity, unitPrice, lineTotal }) => (
                      <div 
                        key={item.id} 
                        className="flex items-center gap-4 p-4 border rounded-lg bg-white"
                        data-testid={`cart-item-${item.id}`}
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{item.itemName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {item.sku && `SKU: ${item.sku}`}
                            {item.asin && ` | ASIN: ${item.asin}`}
                          </p>
                          <p className="text-sm font-medium mt-1">
                            ${unitPrice.toFixed(2)} each
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.id, -1)}
                            disabled={quantity <= 1}
                            data-testid={`button-decrease-${item.id}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-12 text-center font-medium" data-testid={`quantity-${item.id}`}>
                            {quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.id, 1)}
                            data-testid={`button-increase-${item.id}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-medium" data-testid={`total-${item.id}`}>
                            ${lineTotal.toFixed(2)}
                          </p>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          data-testid={`button-remove-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Pricing Breakdown
                    </h4>
                    {balance && (
                      <>
                        {balance.userRole === 'admin' || balance.userRole === 'manager' ? (
                          <>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Within Allowance:</span>
                                <span className="font-medium text-green-600">FREE</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Over Cap Pricing:</span>
                                <span className="font-medium">COGS + {balance.costMarkup}%</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Within Allowance:</span>
                                <span className="font-medium text-blue-600">Retail Price</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Over Cap Discount:</span>
                                <span className="font-medium text-green-600">25% OFF Retail</span>
                              </div>
                            </div>
                          </>
                        )}
                        <div className="pt-2 border-t flex justify-between">
                          <span className="font-semibold">Cart Total:</span>
                          <span className="text-xl font-bold" data-testid="cart-total">
                            ${cartTotal.toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Location Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="location" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Store Location
                    </Label>
                    <Select
                      value={selectedLocation?.toString() || ""}
                      onValueChange={(value) => setSelectedLocation(parseInt(value))}
                    >
                      <SelectTrigger id="location" data-testid="select-location">
                        <SelectValue placeholder="Select store location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.filter(l => l.name === 'Watertown Retail' || l.name === 'Lake Geneva Retail').map((location) => (
                          <SelectItem key={location.id} value={location.id.toString()}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes Field */}
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Special Instructions / Approvals (Optional)
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="e.g., Owner Jackie said I could get 3 PHF CoEnzyme Q10 Softgel for the price of one"
                      value={purchaseNotes}
                      onChange={(e) => setPurchaseNotes(e.target.value)}
                      className="resize-none"
                      rows={3}
                      data-testid="textarea-notes"
                    />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCart([]);
                        setPurchaseNotes("");
                        setSelectedLocation(null);
                      }}
                      className="flex-1"
                      data-testid="button-clear-cart"
                    >
                      Clear Cart
                    </Button>
                    <Button
                      onClick={() => purchaseMutation.mutate()}
                      disabled={purchaseMutation.isPending || !selectedLocation}
                      className="flex-1"
                      data-testid="button-complete-purchase"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Complete Purchase
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Monthly Allowance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {balanceLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : balance && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Cap</p>
                    <p className="text-2xl font-bold" data-testid="text-monthly-cap">
                      ${parseFloat(balance.monthlyCap?.toString() || '0').toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Used This Month</p>
                    <p className="text-2xl font-bold text-muted-foreground" data-testid="text-monthly-total">
                      ${(balance.monthlyTotal || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">Remaining Balance</p>
                    <p className="text-3xl font-bold text-green-600" data-testid="text-remaining-balance">
                      ${(balance.remainingBalance || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Period: {balance.periodMonth}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
            </CardHeader>
            <CardContent>
              {purchasesLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : purchases.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No purchases yet this month
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {purchases.slice(0, 10).map((purchase) => (
                    <div 
                      key={purchase.id} 
                      className="p-3 border rounded-lg text-sm"
                      data-testid={`purchase-${purchase.id}`}
                    >
                      <p className="font-medium">{purchase.itemName}</p>
                      <div className="flex justify-between text-muted-foreground text-xs mt-1">
                        <span>Qty: {parseFloat(purchase.quantity as any).toFixed(0)}</span>
                        <span className="font-medium text-foreground">
                          ${parseFloat(purchase.totalAmount as any).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(purchase.purchaseDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>

      {/* Payment Dialog */}
      <CloverPaymentDialog
        open={showPaymentDialog}
        onClose={handlePaymentCancel}
        amount={paymentAmount}
        purchaseIds={pendingPurchaseIds}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
      />
    </div>
  );
}
