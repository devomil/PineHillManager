import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { 
  Search, 
  RefreshCw, 
  Eye, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp,
  Calendar,
  Filter,
  Download,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, addDays } from "date-fns";

interface Order {
  id: string;
  currency: string;
  total: number;
  taxAmount: number;
  serviceCharge: number;
  paymentState: string;
  state: string;
  createdTime: number;
  modifiedTime: number;
  locationName: string;
  merchantId: string;
  lineItems?: OrderLineItem[];
  payments?: OrderPayment[];
}

interface OrderLineItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unitQty: number;
  isRevenue: boolean;
  modifications?: any[];
  discounts?: any[];
}

interface OrderPayment {
  id: string;
  amount: number;
  tipAmount: number;
  taxAmount: number;
  result: string;
  tender: {
    label: string;
    labelKey: string;
  };
}

interface OrdersResponse {
  orders: Order[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
    limit: number;
  };
}

interface VoidedItemsResponse {
  voidedItems: any[];
  totals: {
    totalVoidedAmount: number;
    totalVoidedItems: number;
  };
}

interface OrderAnalyticsResponse {
  analytics: Array<{
    period: string;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }>;
  summary: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
}

export function ComprehensiveOrderManagement() {
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = addDays(end, -30);
    return { from: start, to: end };
  });
  
  const [filters, setFilters] = useState({
    search: "",
    locationId: "",
    state: "",
    page: 1,
    limit: 20
  });

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch orders with filtering
  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = useQuery<OrdersResponse>({
    queryKey: ['/api/orders', {
      startDate: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      endDate: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      ...filters
    }],
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Fetch order analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<OrderAnalyticsResponse>({
    queryKey: ['/api/orders/analytics', {
      startDate: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      endDate: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      locationId: filters.locationId,
      groupBy: 'day'
    }]
  });

  // Fetch voided items
  const { data: voidedData, isLoading: voidedLoading } = useQuery<VoidedItemsResponse>({
    queryKey: ['/api/orders/voided-items', {
      startDate: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      endDate: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      locationId: filters.locationId
    }]
  });

  // Fetch available locations for filtering
  const { data: locations } = useQuery({
    queryKey: ['/api/accounting/config/clover/all']
  });

  // Order sync mutation
  const syncOrdersMutation = useMutation({
    mutationFn: async (syncOptions: { startDate?: string; endDate?: string }) => {
      const response = await fetch('/api/orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncOptions)
      });
      if (!response.ok) throw new Error('Failed to sync orders');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Order Sync Complete",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/analytics'] });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100); // Convert from cents
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getPaymentStateBadge = (state: string) => {
    switch (state) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
      case 'open':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Open</Badge>;
      case 'partial':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Partial</Badge>;
      default:
        return <Badge variant="outline">{state}</Badge>;
    }
  };

  const handleOrderClick = async (order: Order) => {
    try {
      const response = await fetch(`/api/orders/${order.id}`);
      if (response.ok) {
        const detailedOrder = await response.json();
        setSelectedOrder(detailedOrder);
        setShowOrderDetails(true);
      } else {
        toast({
          title: "Error",
          description: "Failed to load order details",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      });
    }
  };

  const handleSyncOrders = () => {
    syncOrdersMutation.mutate({
      startDate: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      endDate: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined
    });
  };

  if (ordersError) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center space-x-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load orders. Please try again.</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Order Management</h2>
          <p className="text-muted-foreground">
            Comprehensive order tracking and analytics from all locations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleSyncOrders}
            disabled={syncOrdersMutation.isPending}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncOrdersMutation.isPending ? 'animate-spin' : ''}`} />
            <span>Sync Orders</span>
          </Button>
        </div>
      </div>

      {/* Date Range and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters & Date Range</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <DateRangePicker
              date={dateRange}
              onDateChange={setDateRange}
            />
            <div className="flex flex-1 gap-2">
              <Input
                placeholder="Search orders..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                className="flex-1"
              />
              <Select
                value={filters.locationId}
                onValueChange={(value) => setFilters(prev => ({ ...prev, locationId: value, page: 1 }))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Locations</SelectItem>
                  {locations?.map((location: any) => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      {location.merchantName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.state}
                onValueChange={(value) => setFilters(prev => ({ ...prev, state: value, page: 1 }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All States</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Overview */}
      {analyticsData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.summary.totalOrders.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analyticsData.summary.totalRevenue * 100)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analyticsData.summary.averageOrderValue * 100)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Voided Items</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{voidedData?.totals.totalVoidedItems || 0}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency((voidedData?.totals.totalVoidedAmount || 0) * 100)} voided
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders">Orders List</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="voided">Voided Items</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>
                {ordersData?.pagination.totalItems ? 
                  `Showing ${ordersData.orders.length} of ${ordersData.pagination.totalItems} orders` :
                  'Loading orders...'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading orders...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordersData?.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">{order.id}</TableCell>
                          <TableCell>{formatDate(order.createdTime)}</TableCell>
                          <TableCell>{order.locationName}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(order.total)}</TableCell>
                          <TableCell>{getPaymentStateBadge(order.paymentState)}</TableCell>
                          <TableCell>
                            <Badge variant={order.state === 'locked' ? 'default' : 'outline'}>
                              {order.state}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOrderClick(order)}
                              className="flex items-center space-x-1"
                            >
                              <Eye className="h-4 w-4" />
                              <span>View</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {ordersData?.pagination && ordersData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page === 1}
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {ordersData.pagination.currentPage} of {ordersData.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!ordersData.pagination.hasMore}
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analyticsData && (
            <Card>
              <CardHeader>
                <CardTitle>Order Trends</CardTitle>
                <CardDescription>Daily order volume and revenue trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.analytics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="period" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value: any, name: string) => [
                          name === 'totalRevenue' ? formatCurrency(value * 100) : value,
                          name === 'totalRevenue' ? 'Revenue' : name === 'totalOrders' ? 'Orders' : 'Avg Order Value'
                        ]}
                      />
                      <Bar dataKey="totalOrders" fill="#8884d8" name="Orders" />
                      <Bar dataKey="totalRevenue" fill="#82ca9d" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="voided" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voided Items</CardTitle>
              <CardDescription>Items that have been voided or refunded</CardDescription>
            </CardHeader>
            <CardContent>
              {voidedLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading voided items...</span>
                </div>
              ) : voidedData && voidedData.voidedItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Void Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {voidedData.voidedItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="font-mono text-sm">{item.orderId}</TableCell>
                        <TableCell>{formatDate(item.voidTime)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(item.amount)}</TableCell>
                        <TableCell>{item.reason || 'No reason provided'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4" />
                  <p>No voided items found for the selected date range.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              {selectedOrder && `Order ${selectedOrder.id} from ${selectedOrder.locationName}`}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6">
                {/* Order Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Order Total</label>
                    <p className="text-lg font-semibold">{formatCurrency(selectedOrder.total)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tax Amount</label>
                    <p className="text-lg">{formatCurrency(selectedOrder.taxAmount)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Payment State</label>
                    <div className="mt-1">{getPaymentStateBadge(selectedOrder.paymentState)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Order State</label>
                    <div className="mt-1">
                      <Badge variant={selectedOrder.state === 'locked' ? 'default' : 'outline'}>
                        {selectedOrder.state}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Line Items */}
                <div>
                  <h4 className="text-lg font-semibold mb-4">Order Items</h4>
                  {selectedOrder.lineItems && selectedOrder.lineItems.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.lineItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.price)}</TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(item.price * item.quantity)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground">No line items available</p>
                  )}
                </div>

                <Separator />

                {/* Payments */}
                <div>
                  <h4 className="text-lg font-semibold mb-4">Payment Information</h4>
                  {selectedOrder.payments && selectedOrder.payments.length > 0 ? (
                    <div className="space-y-2">
                      {selectedOrder.payments.map((payment) => (
                        <div key={payment.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{payment.tender.label}</p>
                            <p className="text-sm text-muted-foreground">Status: {payment.result}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                            {payment.tipAmount > 0 && (
                              <p className="text-sm text-muted-foreground">
                                +{formatCurrency(payment.tipAmount)} tip
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No payment information available</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}