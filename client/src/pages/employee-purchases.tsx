import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Scan, Trash2, Plus, Minus, DollarSign, Package } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { EmployeePurchase, InventoryItem } from "@shared/schema";

interface CartItem {
  item: InventoryItem;
  quantity: number;
}

interface PurchaseBalance {
  monthlyTotal: number;
  monthlyCap: number;
  remainingBalance: number;
  periodMonth: string;
  isEnabled: boolean;
  costMarkup: number;
  retailDiscount: number;
}

export default function EmployeePurchases() {
  const { toast } = useToast();
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Calculate price based on dual discount model
  // This function now takes the current cart total to properly handle mid-transaction cap crossing
  const calculatePrice = (item: InventoryItem, balance: PurchaseBalance | undefined, currentCartTotal: number = 0): number => {
    if (!balance) return parseFloat(item.unitCost || '0');
    
    const cost = parseFloat(item.unitCost || '0');
    const retailPrice = parseFloat(item.unitPrice || '0');
    
    // Check if we've already exceeded the cap (including current cart)
    const totalSpending = balance.monthlyTotal + currentCartTotal;
    const cap = parseFloat(balance.monthlyCap?.toString() || '0');
    
    // If under allowance cap: use cost + markup%
    if (totalSpending < cap) {
      const markup = parseFloat(balance.costMarkup?.toString() || '0');
      return cost * (1 + markup / 100);
    }
    
    // If over allowance cap: use retail - discount%
    const discount = parseFloat(balance.retailDiscount?.toString() || '0');
    return retailPrice * (1 - discount / 100);
  };

  const { data: balance, isLoading: balanceLoading } = useQuery<PurchaseBalance>({
    queryKey: ['/api/employee-purchases/balance'],
  });

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery<EmployeePurchase[]>({
    queryKey: ['/api/employee-purchases'],
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
      // Use pre-calculated prices from cartItemsWithPrices
      const purchases = cartItemsWithPrices.map(({ item, quantity, unitPrice, lineTotal }) => {
        return {
          inventoryItemId: item.id,
          itemName: item.itemName,
          barcode: item.sku || item.asin || '',
          quantity,
          unitPrice,
          totalAmount: lineTotal,
        };
      });

      const results = [];
      for (const purchase of purchases) {
        const result = await apiRequest('POST', '/api/employee-purchases', purchase);
        results.push(result);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/employee-purchases/balance'] });
      setCart([]);
      toast({
        title: "Purchase complete",
        description: "Your items have been recorded",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Purchase failed",
        description: error.message || "Failed to complete purchase",
      });
    },
  });

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
                <div className="space-y-4">
                  {cartItemsWithPrices.map(({ item, quantity, unitPrice, lineTotal }) => (
                    <div 
                      key={item.id} 
                      className="flex items-center gap-4 p-4 border rounded-lg"
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
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-lg font-semibold">Cart Total:</span>
                    <span className="text-2xl font-bold" data-testid="cart-total">
                      ${cartTotal.toFixed(2)}
                    </span>
                  </div>
                  
                  {wouldExceed && (
                    <div className="bg-destructive/10 text-destructive p-4 rounded-lg" data-testid="alert-exceed">
                      <p className="font-medium">Exceeds Monthly Allowance</p>
                      <p className="text-sm">
                        This purchase would exceed your monthly allowance. 
                        Please remove items or wait until next month.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCart([])}
                      className="flex-1"
                      data-testid="button-clear-cart"
                    >
                      Clear Cart
                    </Button>
                    <Button
                      onClick={() => purchaseMutation.mutate()}
                      disabled={wouldExceed || purchaseMutation.isPending}
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
    </div>
  );
}
