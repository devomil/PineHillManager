import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  User,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Tag
} from 'lucide-react';
import { useRoute, useLocation } from 'wouter';
import { format, addDays } from 'date-fns';

interface OrderItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  external_product_id?: string;
  external_item_id?: string;
}

interface InventoryLocation {
  id: number;
  name: string;
  available_quantity: number;
  unit_price?: string;
  unit_cost?: string;
  margin?: string;
  selected?: boolean;
}

interface InventoryBySku {
  sku: string;
  locations: InventoryLocation[];
}

interface MarketplaceOrder {
  id: number;
  channel_id: number;
  channel_name: string;
  channel_type: string;
  external_order_id: string;
  external_order_number: string;
  status: string;
  order_placed_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  grand_total: number;
  subtotal?: number;
  shipping_total?: number;
  tax_total?: number;
  discount_total?: number;
  currency: string;
  payment_status: string;
  shipping_address?: any;
  billing_address?: any;
  shipping_method?: string;
  shipping_carrier?: string;
  items?: OrderItem[];
  fulfillments?: any[];
  seller_notes?: string;
}

export default function OrderFulfillmentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/marketplace/orders/:id/fulfill');
  const orderId = params?.id;
  
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [itemAllocations, setItemAllocations] = useState<Record<number, number>>({});
  const [sellerNotes, setSellerNotes] = useState('');
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [inventoryBySku, setInventoryBySku] = useState<Record<string, InventoryLocation[]>>({});

  const { data: order, isLoading: orderLoading } = useQuery<MarketplaceOrder>({
    queryKey: [`/api/marketplace/orders/${orderId}`],
    enabled: !!orderId,
  });

  const { data: inventoryLocations = [] } = useQuery<InventoryLocation[]>({
    queryKey: ['/api/inventory/locations'],
  });

  useEffect(() => {
    if (order?.items) {
      const allItemIds = new Set(order.items.map(item => item.id));
      setSelectedItems(allItemIds);
      
      // Fetch inventory for each unique SKU
      const allSkus = order.items.map(item => item.sku).filter(Boolean);
      const skus = Array.from(new Set(allSkus));
      skus.forEach(async (sku) => {
        try {
          const response = await fetch(`/api/marketplace/inventory/by-sku/${encodeURIComponent(sku)}`);
          if (response.ok) {
            const data = await response.json();
            setInventoryBySku(prev => ({ ...prev, [sku]: data.locations || [] }));
          }
        } catch (error) {
          console.error(`Failed to fetch inventory for SKU ${sku}:`, error);
        }
      });
    }
    if ((order as any)?.internal_notes) {
      setSellerNotes((order as any).internal_notes);
    }
  }, [order]);

  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      return apiRequest('PATCH', `/api/marketplace/orders/${orderId}/notes`, { seller_notes: notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/orders', orderId] });
      toast({ title: 'Notes saved', description: 'Seller notes have been updated.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save notes.', variant: 'destructive' });
    },
  });

  const fulfillOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/marketplace/orders/${orderId}/fulfill`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/orders'] });
      toast({ title: 'Order fulfilled', description: 'Order has been marked as fulfilled.' });
      setLocation('/marketplace');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to fulfill order.', variant: 'destructive' });
    },
  });

  const handleItemSelection = (itemId: number, checked: boolean) => {
    const newSelection = new Set(selectedItems);
    if (checked) {
      newSelection.add(itemId);
    } else {
      newSelection.delete(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handleLocationSelection = (itemId: number, locationId: number) => {
    setItemAllocations(prev => ({
      ...prev,
      [itemId]: locationId,
    }));
  };

  const getShipByDate = () => {
    if (!order?.order_placed_at) return null;
    const orderDate = new Date(order.order_placed_at);
    return addDays(orderDate, 3);
  };

  const getShippingService = () => {
    if (order?.shipping_method) return order.shipping_method;
    return order?.channel_type === 'amazon' ? 'Standard' : 'Ground';
  };

  const handleGetShippoLabel = async () => {
    setIsGeneratingLabel(true);
    try {
      toast({
        title: 'Generating label...',
        description: 'Connecting to Shippo to generate shipping label.',
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: 'Shippo Label',
        description: 'Shippo integration coming soon. Please generate labels manually.',
      });
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; icon: any }> = {
      pending: { className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      processing: { className: 'bg-blue-100 text-blue-800', icon: Package },
      shipped: { className: 'bg-green-100 text-green-800', icon: Truck },
      completed: { className: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { className: 'bg-red-100 text-red-800', icon: AlertCircle },
      awaiting_payment: { className: 'bg-orange-100 text-orange-800', icon: CreditCard },
    };
    const config = statusConfig[status.toLowerCase()] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  if (!match) {
    return null;
  }

  if (orderLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Order not found</h2>
              <p className="text-gray-500 mb-4">The order you're looking for doesn't exist.</p>
              <Button onClick={() => setLocation('/marketplace')} data-testid="button-back-to-orders">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Order List
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const shipByDate = getShipByDate();
  const shippingService = getShippingService();
  const shippingAddress = order.shipping_address;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Order details
                <span className="text-gray-500 ml-2 text-sm font-normal">
                  Order ID: # {order.external_order_id}
                </span>
                <span className="text-gray-400 ml-2 text-sm font-normal">
                  Your Seller Order ID: # {order.external_order_number}
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" data-testid="button-refund-order">
                Refund Order
              </Button>
              <Button variant="outline" size="sm" data-testid="button-request-review">
                Request a Review
              </Button>
            </div>
          </div>
          <Button
            variant="link"
            className="p-0 h-auto text-blue-600 hover:text-blue-700 mt-2"
            onClick={() => setLocation('/marketplace')}
            data-testid="button-go-back"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Go back to order list
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-9 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Order summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Amazon's Ship By:</p>
                    <p className="font-medium text-orange-600">
                      {shipByDate ? format(shipByDate, 'EEE, MMM d, yyyy') : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">Purchase date:</p>
                    <p className="text-sm">
                      {order.order_placed_at ? format(new Date(order.order_placed_at), 'EEE, MMM d, yyyy, h:mm a') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Shipping service:</p>
                    <Badge className={shippingService === 'Expedited' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}>
                      {shippingService}
                    </Badge>
                    <p className="text-sm text-gray-500 mt-2">Fulfillment:</p>
                    <p className="text-sm">{order.channel_type === 'amazon' ? 'Amazon' : 'Merchant'}</p>
                    <p className="text-sm text-gray-500 mt-2">Sales channel:</p>
                    <p className="text-sm flex items-center gap-1">
                      {order.channel_name}
                      <ExternalLink className="h-3 w-3 text-gray-400" />
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Ship to</p>
                    <div className="text-sm">
                      {shippingAddress ? (
                        <>
                          <p className="font-medium">{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}</p>
                        </>
                      ) : (
                        <p className="text-gray-400">No address provided</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Contact Buyer:</p>
                    <a href="#" className="text-blue-600 hover:underline text-sm font-medium" data-testid="link-contact-buyer">
                      {order.customer_name || 'Customer'}
                    </a>
                    <p className="text-xs text-gray-500 mt-1">
                      See all orders from this buyer
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">More details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Tax Collection Model:</span>
                    <span className="ml-2">MarketplaceFacilitator</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tax Collection Responsible Party:</span>
                    <span className="ml-2">{order.channel_type === 'amazon' ? 'Amazon Services LLC' : 'Merchant'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Order contents</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-20">Status</TableHead>
                      <TableHead className="w-16">Image</TableHead>
                      <TableHead>Product name</TableHead>
                      <TableHead>More information</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-right">Unit price</TableHead>
                      <TableHead className="text-right">Proceeds</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <TableRow key={item.id || idx} data-testid={`row-item-${item.id}`}>
                          <TableCell>
                            <Badge className="bg-green-600 text-white text-xs">
                              PAYMENT COMPLETE
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-blue-600 hover:underline cursor-pointer">
                                {item.name}
                              </p>
                              {item.external_product_id && (
                                <p className="text-xs text-gray-500">ASIN: {item.external_product_id}</p>
                              )}
                              {item.sku && (
                                <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-gray-600">
                              Order item ID: {item.external_item_id || item.id}
                            </p>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {(() => {
                              const orderPrice = Number(item.unit_price) || 0;
                              const invLocations = item.sku && inventoryBySku[item.sku] ? inventoryBySku[item.sku] : [];
                              const invPrice = invLocations.length > 0 ? Number(invLocations[0].unit_price) || 0 : 0;
                              const displayPrice = orderPrice > 0 ? orderPrice : invPrice;
                              return `$${displayPrice.toFixed(2)}`;
                            })()}
                          </TableCell>
                          <TableCell className="text-right">
                            {(() => {
                              const orderPrice = Number(item.unit_price) || 0;
                              const orderTotal = Number(item.total_price) || 0;
                              const invLocations = item.sku && inventoryBySku[item.sku] ? inventoryBySku[item.sku] : [];
                              const invPrice = invLocations.length > 0 ? Number(invLocations[0].unit_price) || 0 : 0;
                              const displayPrice = orderPrice > 0 ? orderPrice : invPrice;
                              const displayTotal = orderTotal > 0 ? orderTotal : displayPrice * item.quantity;
                              return (
                                <div>
                                  <p className="text-xs text-gray-500">Item subtotal:</p>
                                  <p className="font-medium">${displayTotal.toFixed(2)}</p>
                                  <p className="text-xs text-gray-500 mt-1">Item total:</p>
                                  <p className="font-medium">${displayTotal.toFixed(2)}</p>
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.has(item.id)}
                              onCheckedChange={(checked) => handleItemSelection(item.id, checked as boolean)}
                              data-testid={`checkbox-item-${item.id}`}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No items in this order
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {order.items && order.items.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">Inventory Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-center">Available</TableHead>
                        <TableHead className="text-center">Margin</TableHead>
                        <TableHead className="text-right">Proceeds</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item, idx) => {
                        const locations = item.sku && inventoryBySku[item.sku] 
                          ? inventoryBySku[item.sku] 
                          : [];
                        
                        if (locations.length === 0) {
                          return (
                            <TableRow key={item.id} data-testid={`row-allocation-${item.id}-none`}>
                              <TableCell>
                                <div>
                                  <p className="text-blue-600 font-medium text-sm hover:underline cursor-pointer">
                                    {item.name.length > 30 ? item.name.substring(0, 30) + '...' : item.name}
                                  </p>
                                  <p className="text-xs text-gray-500">Pine Hill Farm</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-gray-500">{item.sku || 'N/A'}</TableCell>
                              <TableCell colSpan={5} className="text-center text-gray-500">
                                No inventory found for this SKU
                              </TableCell>
                            </TableRow>
                          );
                        }
                        
                        return locations.map((location, locIdx) => {
                          const itemPrice = Number(item.unit_price) || Number(location.unit_price) || 0;
                          return (
                            <TableRow key={`${item.id}-${location.id}`} data-testid={`row-allocation-${item.id}-${location.id}`}>
                              {locIdx === 0 && (
                                <>
                                  <TableCell rowSpan={locations.length}>
                                    <div>
                                      <p className="text-blue-600 font-medium text-sm hover:underline cursor-pointer">
                                        {item.name.length > 30 ? item.name.substring(0, 30) + '...' : item.name}
                                      </p>
                                      <p className="text-xs text-gray-500">Pine Hill Farm</p>
                                    </div>
                                  </TableCell>
                                  <TableCell rowSpan={locations.length} className="text-xs text-gray-500">
                                    {item.sku || 'N/A'}
                                  </TableCell>
                                </>
                              )}
                              <TableCell className="font-medium">{location.name}</TableCell>
                              <TableCell className="text-center">
                                <span className="text-blue-600">{location.available_quantity}</span>
                              </TableCell>
                              <TableCell className="text-center text-gray-600">
                                Margin: {location.margin || 'N/A'}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ${itemPrice.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Checkbox
                                  checked={itemAllocations[item.id] === location.id}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      handleLocationSelection(item.id, location.id);
                                    }
                                  }}
                                  data-testid={`checkbox-allocation-${item.id}-${location.id}`}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center">
              <Button
                size="lg"
                className="px-8"
                onClick={handleGetShippoLabel}
                disabled={isGeneratingLabel || selectedItems.size === 0}
                data-testid="button-get-shippo-label"
              >
                {isGeneratingLabel ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating...
                  </>
                ) : (
                  'Get Shippo Label'
                )}
              </Button>
            </div>
          </div>

          <div className="col-span-3 space-y-6">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500 mb-1">Billing country/region:</p>
                <p className="text-sm flex items-center gap-1">
                  {shippingAddress?.country || 'US'} 🇺🇸
                </p>
                <p className="text-sm text-gray-500 mt-3 mb-1">Payment methods:</p>
                <p className="text-sm">{order.payment_status || 'Standard'}</p>
                
                <Separator className="my-4" />
                
                <div className="space-y-2">
                  {(() => {
                    let itemsTotal = Number(order.subtotal) || Number(order.grand_total) || 0;
                    let grandTotal = Number(order.grand_total) || 0;
                    
                    // Calculate from inventory prices if order totals are 0
                    if (grandTotal === 0 && order.items) {
                      itemsTotal = order.items.reduce((sum, item) => {
                        const orderPrice = Number(item.unit_price) || 0;
                        const orderTotal = Number(item.total_price) || 0;
                        if (orderTotal > 0) return sum + orderTotal;
                        const invLocations = item.sku && inventoryBySku[item.sku] ? inventoryBySku[item.sku] : [];
                        const invPrice = invLocations.length > 0 ? Number(invLocations[0].unit_price) || 0 : 0;
                        const displayPrice = orderPrice > 0 ? orderPrice : invPrice;
                        return sum + (displayPrice * item.quantity);
                      }, 0);
                      grandTotal = itemsTotal;
                    }
                    
                    return (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Items total:</span>
                          <span>${itemsTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold">
                          <span>Grand total:</span>
                          <span>${grandTotal.toFixed(2)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Seller Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="For your records only. Will not be displayed to the buyer."
                  value={sellerNotes}
                  onChange={(e) => setSellerNotes(e.target.value)}
                  className="min-h-[100px] text-sm"
                  data-testid="textarea-seller-notes"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={() => updateNotesMutation.mutate(sellerNotes)}
                  disabled={updateNotesMutation.isPending}
                  data-testid="button-save-notes"
                >
                  {updateNotesMutation.isPending ? 'Saving...' : 'Save Notes'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Manage Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  {order.customer_name || 'The customer'} has not left you feedback for this order yet.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
