import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  ShoppingCart, 
  Eye, 
  DollarSign, 
  Package, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Calendar,
  MapPin,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { getDateRangeByValue, formatDateForAPI } from '@/lib/date-ranges';

type OrderLineItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unitQty?: number;
  isRevenue: boolean;
  printed: boolean;
  exchanged: boolean;
  refunded: boolean;
  refund?: {
    transactionInfo: {
      amount: number;
    };
  };
  discounts?: Array<{
    name: string;
    amount: number;
  }>;
  modifications?: Array<{
    name: string;
    amount: number;
  }>;
};

type OrderPayment = {
  id: string;
  amount: number;
  tipAmount?: number;
  taxAmount?: number;
  result: string;
  cardTransaction?: {
    last4: string;
    type: string;
  };
  tender: {
    label: string;
    labelKey: string;
  };
};

type Order = {
  id: string;
  currency: string;
  employee?: {
    name: string;
  };
  total: number;
  taxAmount: number;
  serviceCharge: number;
  paymentState: string;
  title?: string;
  note?: string;
  manualTransaction: boolean;
  groupLineItems: boolean;
  testMode: boolean;
  createdTime: number;
  clientCreatedTime: number;
  modifiedTime: number;
  deletedTime?: number;
  orderType?: {
    id: string;
    label: string;
    systemOrderTypeId: string;
  };
  taxRemoved: boolean;
  isVat: boolean;
  state: string;
  device?: {
    id: string;
  };
  lineItems?: OrderLineItem[];
  payments?: OrderPayment[];
  discounts?: Array<{
    name: string;
    amount: number;
  }>;
  credits?: Array<{
    amount: number;
  }>;
  refunds?: Array<{
    amount: number;
  }>;
  voids?: Array<{
    reason: string;
    amount: number;
  }>;
  merchantId: string;
  locationName: string;
};

type OrdersResponse = {
  orders: Order[];
  total: number;
  hasMore: boolean;
};

type VoidedLineItemsResponse = {
  voidedItems: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    reason: string;
    voidedTime: number;
    orderId: string;
  }>;
  totals: {
    totalVoidedAmount: number;
    totalVoidedItems: number;
  };
};

export function OrderManagement() {
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderState, setOrderState] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { toast } = useToast();

  // Get date range parameters
  const getQueryParams = () => {
    const params = new URLSearchParams();
    
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      params.append('startDate', customStartDate);
      params.append('endDate', customEndDate);
    } else {
      const selectedRange = getDateRangeByValue(dateRange);
      if (selectedRange) {
        params.append('startDate', formatDateForAPI(selectedRange.startDate));
        params.append('endDate', formatDateForAPI(selectedRange.endDate));
      }
    }
    
    if (selectedLocation !== 'all') {
      params.append('locationId', selectedLocation);
    }
    
    if (searchTerm.trim()) {
      params.append('search', searchTerm.trim());
    }
    
    if (orderState !== 'all') {
      params.append('state', orderState);
    }
    
    params.append('page', currentPage.toString());
    params.append('limit', '50');
    
    return params.toString();
  };

  // Handle date range changes
  const handleDateRangeChange = (value: string, startDate: string, endDate: string) => {
    setDateRange(value);
    if (value === 'custom') {
      setCustomStartDate(startDate);
      setCustomEndDate(endDate);
    }
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Fetch orders
  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery<OrdersResponse>({
    queryKey: ['/api/accounting/orders', selectedLocation, dateRange, customStartDate, customEndDate, searchTerm, orderState, currentPage],
    queryFn: async () => {
      const params = getQueryParams();
      const response = await apiRequest('GET', `/api/accounting/orders?${params}`);
      return await response.json();
    },
  });

  // Fetch available locations
  const { data: locations } = useQuery({
    queryKey: ['/api/accounting/config/clover/all'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/accounting/config/clover/all');
      return await response.json();
    },
  });

  // Fetch voided line items
  const { data: voidedData, isLoading: voidedLoading } = useQuery<VoidedLineItemsResponse>({
    queryKey: ['/api/accounting/orders/voided', selectedLocation, dateRange, customStartDate, customEndDate],
    queryFn: async () => {
      const params = getQueryParams();
      const response = await apiRequest('GET', `/api/accounting/orders/voided?${params}`);
      return await response.json();
    },
  });

  // Sync orders mutation
  const syncOrdersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/accounting/orders/sync', {
        locationId: selectedLocation !== 'all' ? selectedLocation : undefined,
        startDate: dateRange === 'custom' && customStartDate ? customStartDate : undefined,
        endDate: dateRange === 'custom' && customEndDate ? customEndDate : undefined,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Orders Synced",
        description: "Order data has been successfully synced from Clover",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/orders'] });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync order data. Please try again.",
        variant: "destructive",
      });
      console.error('Orders sync failed:', error);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100); // Clover amounts are in cents
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOrderStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'locked': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      case 'partially_paid': return 'bg-yellow-100 text-yellow-800';
      case 'partially_refunded': return 'bg-orange-100 text-orange-800';
      case 'refunded': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'partially_paid': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold">Order Management</h3>
            <p className="text-gray-600">Track and manage orders from all Clover locations</p>
          </div>
          <Button
            onClick={() => syncOrdersMutation.mutate()}
            disabled={syncOrdersMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {syncOrdersMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Orders
              </>
            )}
          </Button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations?.map((location: any) => (
                  <SelectItem key={location.id} value={location.id.toString()}>
                    {location.merchantName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <DateRangePicker
              value={dateRange}
              onValueChange={handleDateRangeChange}
              className="w-48"
            />
          </div>

          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-gray-500" />
            <Select value={orderState} onValueChange={setOrderState}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Order state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ordersData?.total.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {ordersLoading ? 'Loading...' : 'Orders in selected period'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(ordersData?.orders.reduce((sum, order) => sum + order.total, 0) || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From displayed orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ordersData?.orders.length ? 
                formatCurrency((ordersData.orders.reduce((sum, order) => sum + order.total, 0)) / ordersData.orders.length) 
                : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per order average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voided Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {voidedData?.totals.totalVoidedItems || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(voidedData?.totals.totalVoidedAmount || 0)} voided
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>
            {ordersLoading ? 'Loading orders...' : `Showing ${ordersData?.orders.length || 0} orders`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersData?.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>{formatDate(order.createdTime)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {order.locationName}
                      </div>
                    </TableCell>
                    <TableCell>{order.employee?.name || 'N/A'}</TableCell>
                    <TableCell>{order.lineItems?.length || 0}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <Badge className={getOrderStateColor(order.state)}>
                        {order.state}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPaymentStateColor(order.paymentState)}>
                        {order.paymentState}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Order Details</DialogTitle>
                            <DialogDescription>
                              Order {order.id} from {order.locationName}
                            </DialogDescription>
                          </DialogHeader>
                          <OrderDetailsModal order={selectedOrder} />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {ordersData?.hasMore && (
        <div className="flex justify-center">
          <Button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={ordersLoading}
          >
            Load More Orders
          </Button>
        </div>
      )}
    </div>
  );
}

// Order Details Modal Component
function OrderDetailsModal({ order }: { order: Order | null }) {
  if (!order) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US');
  };

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2">Order Information</h4>
          <div className="space-y-1 text-sm">
            <div><span className="font-medium">ID:</span> {order.id}</div>
            <div><span className="font-medium">Created:</span> {formatDate(order.createdTime)}</div>
            <div><span className="font-medium">Modified:</span> {formatDate(order.modifiedTime)}</div>
            <div><span className="font-medium">Employee:</span> {order.employee?.name || 'N/A'}</div>
            <div><span className="font-medium">Order Type:</span> {order.orderType?.label || 'N/A'}</div>
            <div><span className="font-medium">Note:</span> {order.note || 'None'}</div>
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Financial Summary</h4>
          <div className="space-y-1 text-sm">
            <div><span className="font-medium">Subtotal:</span> {formatCurrency(order.total - order.taxAmount)}</div>
            <div><span className="font-medium">Tax:</span> {formatCurrency(order.taxAmount)}</div>
            <div><span className="font-medium">Service Charge:</span> {formatCurrency(order.serviceCharge)}</div>
            <div><span className="font-medium">Total:</span> <span className="font-bold">{formatCurrency(order.total)}</span></div>
            <div><span className="font-medium">State:</span> <Badge className="ml-1">{order.state}</Badge></div>
            <div><span className="font-medium">Payment:</span> <Badge className="ml-1">{order.paymentState}</Badge></div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="lineitems">
        <TabsList>
          <TabsTrigger value="lineitems">Line Items ({order.lineItems?.length || 0})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({order.payments?.length || 0})</TabsTrigger>
          <TabsTrigger value="discounts">Discounts ({order.discounts?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="lineitems" className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.lineItems?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      {item.modifications && item.modifications.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {item.modifications.map(mod => `+ ${mod.name} (${formatCurrency(mod.amount)})`).join(', ')}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{item.quantity}{item.unitQty ? ` × ${item.unitQty}` : ''}</TableCell>
                  <TableCell>{formatCurrency(item.price)}</TableCell>
                  <TableCell>{formatCurrency(item.price * item.quantity)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {item.printed && <Badge variant="outline" className="text-xs">Printed</Badge>}
                      {item.refunded && <Badge variant="destructive" className="text-xs">Refunded</Badge>}
                      {item.exchanged && <Badge variant="secondary" className="text-xs">Exchanged</Badge>}
                      {!item.isRevenue && <Badge variant="outline" className="text-xs">Non-Revenue</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment ID</TableHead>
                <TableHead>Tender</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Card Info</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.payments?.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-xs">{payment.id.substring(0, 8)}...</TableCell>
                  <TableCell>{payment.tender.label}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>{payment.tipAmount ? formatCurrency(payment.tipAmount) : '-'}</TableCell>
                  <TableCell>{payment.taxAmount ? formatCurrency(payment.taxAmount) : '-'}</TableCell>
                  <TableCell>
                    {payment.cardTransaction ? 
                      `**** ${payment.cardTransaction.last4} (${payment.cardTransaction.type})` : 
                      '-'
                    }
                  </TableCell>
                  <TableCell>
                    <Badge className={payment.result === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {payment.result}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="discounts" className="space-y-4">
          {order.discounts && order.discounts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Discount Name</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.discounts.map((discount, index) => (
                  <TableRow key={index}>
                    <TableCell>{discount.name}</TableCell>
                    <TableCell>{formatCurrency(discount.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No discounts applied to this order
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}