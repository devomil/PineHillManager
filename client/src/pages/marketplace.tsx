import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Store, 
  Package, 
  Truck,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  MoreHorizontal,
  ArrowLeft,
  Users,
  Settings,
  BarChart3,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import { useLocation } from 'wouter';
import { format } from 'date-fns';

interface MarketplaceChannel {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
  last_sync_at: string | null;
}

interface MarketplaceOrder {
  id: number;
  channel_id: number;
  channel_name: string;
  channel_type: string;
  external_order_id: string;
  order_number: string;
  status: string;
  order_date: string;
  customer_name: string;
  customer_email: string;
  total: number;
  currency: string;
  payment_status: string;
  items?: any[];
  fulfillments?: any[];
}

interface SyncJob {
  id: number;
  channel_name: string;
  job_type: string;
  status: string;
  total_items: number;
  processed_items: number;
  success_count: number;
  error_count: number;
  created_at: string;
  completed_at: string | null;
}

interface InventoryRule {
  id: number;
  name: string;
  channel_id: number | null;
  channel_name: string | null;
  rule_type: string;
  percentage_allocation: number;
  min_stock_threshold: number;
  sync_enabled: boolean;
  sync_interval_minutes: number;
  is_active: boolean;
}

interface AuthorizedUser {
  id: number;
  user_id: string;
  user_name: string;
  user_email: string;
  channel_id: number | null;
  channel_name: string | null;
  permission_level: string;
  is_active: boolean;
  expires_at: string | null;
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(null);
  const [fulfillDialogOpen, setFulfillDialogOpen] = useState(false);
  const [fulfillmentData, setFulfillmentData] = useState({
    carrier: '',
    trackingNumber: '',
    trackingUrl: '',
    serviceLevel: '',
  });

  const hasAccess = user?.role === 'admin' || user?.role === 'manager';

  const { data: channels = [], isLoading: channelsLoading } = useQuery<MarketplaceChannel[]>({
    queryKey: ['/api/marketplace/channels'],
    enabled: hasAccess,
  });

  const ordersQueryUrl = (() => {
    const params = new URLSearchParams();
    if (selectedChannel !== 'all') params.append('channelId', selectedChannel);
    if (selectedStatus !== 'all') params.append('status', selectedStatus);
    const queryString = params.toString();
    return queryString ? `/api/marketplace/orders?${queryString}` : '/api/marketplace/orders';
  })();

  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery<{
    orders: MarketplaceOrder[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: [ordersQueryUrl],
    enabled: hasAccess,
  });

  const { data: syncJobs = [], isLoading: syncJobsLoading } = useQuery<SyncJob[]>({
    queryKey: ['/api/marketplace/sync-jobs'],
    enabled: hasAccess,
  });

  const { data: inventoryRules = [], isLoading: rulesLoading } = useQuery<InventoryRule[]>({
    queryKey: ['/api/marketplace/inventory-rules'],
    enabled: hasAccess && user?.role === 'admin',
  });

  const { data: authorizedUsers = [], isLoading: usersLoading } = useQuery<AuthorizedUser[]>({
    queryKey: ['/api/marketplace/authorized-users'],
    enabled: hasAccess && user?.role === 'admin',
  });

  const { data: analytics } = useQuery<{
    byChannel: { channel: string; total_orders: number; pending_orders: number; shipped_orders: number; total_revenue: number }[];
    dailyTrend: { date: string; orders: number; revenue: number }[];
  }>({
    queryKey: ['/api/marketplace/analytics'],
    enabled: hasAccess,
  });

  const syncOrdersMutation = useMutation({
    mutationFn: async (channelId: number) => {
      return apiRequest('POST', '/api/marketplace/sync/orders', { channelId });
    },
    onSuccess: () => {
      toast({ title: 'Order sync started', description: 'Orders are being synchronized from the marketplace.' });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/sync-jobs'] });
      setTimeout(() => {
        queryClient.invalidateQueries({ predicate: (query) => 
          typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/marketplace/orders')
        });
      }, 5000);
    },
    onError: (error: any) => {
      toast({ title: 'Sync failed', description: error.message, variant: 'destructive' });
    },
  });

  const fulfillOrderMutation = useMutation({
    mutationFn: async (data: { orderId: number; carrier: string; trackingNumber: string; trackingUrl?: string; serviceLevel?: string }) => {
      return apiRequest('POST', `/api/marketplace/orders/${data.orderId}/fulfill`, data);
    },
    onSuccess: () => {
      toast({ title: 'Order fulfilled', description: 'The order has been marked as shipped and tracking info sent to customer.' });
      setFulfillDialogOpen(false);
      setSelectedOrder(null);
      setFulfillmentData({ carrier: '', trackingNumber: '', trackingUrl: '', serviceLevel: '' });
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/marketplace/orders')
      });
    },
    onError: (error: any) => {
      toast({ title: 'Fulfillment failed', description: error.message, variant: 'destructive' });
    },
  });

  const orders = ordersData?.orders || [];
  const filteredOrders = orders.filter(order => {
    if (searchQuery && !order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !order.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      'awaiting_fulfillment': { color: 'bg-orange-100 text-orange-800', label: 'Awaiting Fulfillment' },
      'awaiting_shipment': { color: 'bg-blue-100 text-blue-800', label: 'Awaiting Shipment' },
      'shipped': { color: 'bg-green-100 text-green-800', label: 'Shipped' },
      'completed': { color: 'bg-emerald-100 text-emerald-800', label: 'Completed' },
      'cancelled': { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      'Awaiting Fulfillment': { color: 'bg-orange-100 text-orange-800', label: 'Awaiting Fulfillment' },
      'Awaiting Shipment': { color: 'bg-blue-100 text-blue-800', label: 'Awaiting Shipment' },
      'Shipped': { color: 'bg-green-100 text-green-800', label: 'Shipped' },
    };
    const config = statusMap[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getChannelIcon = (type: string) => {
    if (type === 'bigcommerce') return <ShoppingBag className="h-4 w-4" />;
    if (type === 'amazon') return <Store className="h-4 w-4" />;
    return <Package className="h-4 w-4" />;
  };

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border border-red-200 bg-red-50">
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-700 mb-2">Access Restricted</h3>
                <p className="text-red-600">You don't have permission to access Marketplace Management.</p>
                <p className="text-sm text-red-500 mt-2">Contact your administrator for access.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setLocation('/admin')}
                className="flex items-center gap-2 hover:bg-blue-50 hover:text-blue-700"
                data-testid="button-back-dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Marketplace Fulfillment</h1>
                <p className="text-gray-600">Manage orders from BigCommerce, Amazon, and other marketplaces</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {channels.map(channel => (
                <Badge 
                  key={channel.id} 
                  variant="outline" 
                  className={channel.is_active ? 'text-green-600 border-green-600' : 'text-gray-400 border-gray-400'}
                >
                  {getChannelIcon(channel.type)}
                  <span className="ml-1">{channel.name}</span>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-2xl font-bold">{analytics?.byChannel.reduce((sum, c) => sum + Number(c.total_orders || 0), 0) || 0}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Fulfillment</p>
                  <p className="text-2xl font-bold text-orange-600">{analytics?.byChannel.reduce((sum, c) => sum + Number(c.pending_orders || 0), 0) || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Shipped</p>
                  <p className="text-2xl font-bold text-green-600">{analytics?.byChannel.reduce((sum, c) => sum + Number(c.shipped_orders || 0), 0) || 0}</p>
                </div>
                <Truck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold">${(analytics?.byChannel.reduce((sum, c) => sum + Number(c.total_revenue || 0), 0) || 0).toLocaleString()}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders" data-testid="tab-orders">
              <Package className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="sync" data-testid="tab-sync">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Jobs
            </TabsTrigger>
            {user?.role === 'admin' && (
              <>
                <TabsTrigger value="inventory" data-testid="tab-inventory">
                  <Settings className="h-4 w-4 mr-2" />
                  Inventory Rules
                </TabsTrigger>
                <TabsTrigger value="users" data-testid="tab-users">
                  <Users className="h-4 w-4 mr-2" />
                  Access Control
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Marketplace Orders</CardTitle>
                    <CardDescription>Orders synced from connected marketplaces ready for fulfillment</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {channels.map(channel => (
                      <Button
                        key={channel.id}
                        variant="outline"
                        size="sm"
                        onClick={() => syncOrdersMutation.mutate(channel.id)}
                        disabled={syncOrdersMutation.isPending}
                        data-testid={`button-sync-${channel.type}`}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncOrdersMutation.isPending ? 'animate-spin' : ''}`} />
                        Sync {channel.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by order number or customer..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-orders"
                    />
                  </div>
                  <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                    <SelectTrigger className="w-[180px]" data-testid="select-channel-filter">
                      <SelectValue placeholder="All Channels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Channels</SelectItem>
                      {channels.map(channel => (
                        <SelectItem key={channel.id} value={channel.id.toString()}>{channel.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="awaiting_fulfillment">Awaiting Fulfillment</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {ordersLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No orders found. Click "Sync" to fetch orders from your marketplaces.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map(order => (
                        <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                          <TableCell className="font-medium">{order.external_order_number || order.external_order_id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getChannelIcon(order.channel_type)}
                              <span>{order.channel_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.customer_name}</p>
                              <p className="text-sm text-gray-500">{order.customer_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{order.order_placed_at ? format(new Date(order.order_placed_at), 'MMM d, yyyy') : 'N/A'}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {order.currency} ${Number(order.grand_total || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {order.status !== 'shipped' && order.status !== 'completed' && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setFulfillDialogOpen(true);
                                  }}
                                  data-testid={`button-fulfill-${order.id}`}
                                >
                                  <Truck className="h-4 w-4 mr-1" />
                                  Fulfill
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                data-testid={`button-view-${order.id}`}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sync History</CardTitle>
                <CardDescription>Recent order synchronization jobs</CardDescription>
              </CardHeader>
              <CardContent>
                {syncJobsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : syncJobs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No sync jobs yet. Start a sync to see history here.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncJobs.map(job => (
                        <TableRow key={job.id} data-testid={`row-sync-${job.id}`}>
                          <TableCell>{job.channel_name}</TableCell>
                          <TableCell className="capitalize">{job.job_type}</TableCell>
                          <TableCell>
                            <Badge className={
                              job.status === 'completed' ? 'bg-green-100 text-green-800' :
                              job.status === 'running' ? 'bg-blue-100 text-blue-800' :
                              job.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {job.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {job.success_count} / {job.total_items} ({job.error_count} errors)
                          </TableCell>
                          <TableCell>{job.created_at ? format(new Date(job.created_at), 'MMM d, h:mm a') : '-'}</TableCell>
                          <TableCell>{job.completed_at ? format(new Date(job.completed_at), 'MMM d, h:mm a') : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Inventory Allocation Rules</CardTitle>
                    <CardDescription>Configure how inventory is allocated to each marketplace</CardDescription>
                  </div>
                  <Button data-testid="button-add-rule">
                    <Settings className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {rulesLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : inventoryRules.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No inventory rules configured yet.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rule Name</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Allocation</TableHead>
                        <TableHead>Min Threshold</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryRules.map(rule => (
                        <TableRow key={rule.id} data-testid={`row-rule-${rule.id}`}>
                          <TableCell className="font-medium">{rule.name}</TableCell>
                          <TableCell>{rule.channel_name || 'All Channels'}</TableCell>
                          <TableCell className="capitalize">{rule.rule_type}</TableCell>
                          <TableCell>{rule.percentage_allocation}%</TableCell>
                          <TableCell>{rule.min_stock_threshold}</TableCell>
                          <TableCell>
                            <Badge className={rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {rule.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" data-testid={`button-edit-rule-${rule.id}`}>
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Marketplace Access Control</CardTitle>
                    <CardDescription>Manage which employees can access marketplace fulfillment</CardDescription>
                  </div>
                  <Button data-testid="button-grant-access">
                    <Users className="h-4 w-4 mr-2" />
                    Grant Access
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : authorizedUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No employees have been granted marketplace access yet.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Channel Access</TableHead>
                        <TableHead>Permission Level</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {authorizedUsers.map(auth => (
                        <TableRow key={auth.id} data-testid={`row-auth-${auth.id}`}>
                          <TableCell className="font-medium">{auth.user_name}</TableCell>
                          <TableCell>{auth.user_email}</TableCell>
                          <TableCell>{auth.channel_name || 'All Channels'}</TableCell>
                          <TableCell className="capitalize">{auth.permission_level}</TableCell>
                          <TableCell>
                            <Badge className={auth.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {auth.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>{auth.expires_at ? format(new Date(auth.expires_at), 'MMM d, yyyy') : 'Never'}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" data-testid={`button-revoke-${auth.id}`}>
                              Revoke
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={fulfillDialogOpen} onOpenChange={setFulfillDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Fulfill Order #{selectedOrder?.order_number}</DialogTitle>
              <DialogDescription>
                Enter shipping details to fulfill this order. Tracking information will be sent to the customer.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="carrier">Shipping Carrier</Label>
                <Select
                  value={fulfillmentData.carrier}
                  onValueChange={(value) => setFulfillmentData(prev => ({ ...prev, carrier: value }))}
                >
                  <SelectTrigger data-testid="select-carrier">
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ups">UPS</SelectItem>
                    <SelectItem value="usps">USPS</SelectItem>
                    <SelectItem value="fedex">FedEx</SelectItem>
                    <SelectItem value="dhl">DHL</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tracking">Tracking Number</Label>
                <Input
                  id="tracking"
                  value={fulfillmentData.trackingNumber}
                  onChange={(e) => setFulfillmentData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                  placeholder="Enter tracking number"
                  data-testid="input-tracking-number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trackingUrl">Tracking URL (optional)</Label>
                <Input
                  id="trackingUrl"
                  value={fulfillmentData.trackingUrl}
                  onChange={(e) => setFulfillmentData(prev => ({ ...prev, trackingUrl: e.target.value }))}
                  placeholder="https://..."
                  data-testid="input-tracking-url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceLevel">Service Level (optional)</Label>
                <Input
                  id="serviceLevel"
                  value={fulfillmentData.serviceLevel}
                  onChange={(e) => setFulfillmentData(prev => ({ ...prev, serviceLevel: e.target.value }))}
                  placeholder="e.g., Ground, Express, Priority"
                  data-testid="input-service-level"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFulfillDialogOpen(false)} data-testid="button-cancel-fulfill">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedOrder && fulfillmentData.carrier && fulfillmentData.trackingNumber) {
                    fulfillOrderMutation.mutate({
                      orderId: selectedOrder.id,
                      carrier: fulfillmentData.carrier,
                      trackingNumber: fulfillmentData.trackingNumber,
                      trackingUrl: fulfillmentData.trackingUrl || undefined,
                      serviceLevel: fulfillmentData.serviceLevel || undefined,
                    });
                  }
                }}
                disabled={!fulfillmentData.carrier || !fulfillmentData.trackingNumber || fulfillOrderMutation.isPending}
                data-testid="button-confirm-fulfill"
              >
                {fulfillOrderMutation.isPending ? 'Fulfilling...' : 'Fulfill Order'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
