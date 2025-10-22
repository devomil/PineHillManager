import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
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
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { 
  Search, 
  RefreshCw, 
  Eye, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Download,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Percent,
  RotateCcw,
  Receipt,
  Tag,
  Gift,
  HelpCircle
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, addDays, startOfDay, endOfDay, subDays } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { getDateRangeByValue } from '@/lib/date-ranges';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useDebounce } from '@/hooks/use-debounce';

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
  // Enhanced financial data from getOrderDetails
  grossTax?: number;
  totalDiscounts?: number;
  giftCardTotal?: number;
  totalRefunds?: number;
  netCOGS?: number;
  netSale?: number;
  netProfit?: number;
  netMargin?: number;
  amazonFees?: number;
  isAmazonOrder?: boolean;
  // Employee information
  employeeName?: string | null;
  employeeId?: string | null;
  // Discount details with names
  discountDetails?: Array<{
    id: string;
    name: string;
    amount: number;
    percentage: number;
  }>;
  // Formatted date fields
  formattedDate?: string;
  orderDate?: string;
  orderTime?: string;
  refunds?: { elements?: any[] };
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
  aggregatedTotals?: {
    totalRevenue: number;
    orderCount: number;
    totalCOGS: number;
    totalProfit: number;
    totalDiscounts: number;
    giftCardTotal: number;
    totalGrossTax: number;
    totalAmazonFees: number;
    marginSum: number;
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
  // Track both the picker value and actual date range - start with today for faster loading
  const [dateRangeValue, setDateRangeValue] = useState("today");
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return { from: today, to: today }; // Default to today only for faster loading
  });

  // Debounced search to prevent excessive API calls
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);


  // Fetch available locations for filtering - includes Clover, Amazon, and future channels
  const { data: locations, error: locationsError, isLoading: locationsLoading } = useQuery<any[]>({
    queryKey: ['/api/locations/all'],
    queryFn: async () => {
      const response = await fetch('/api/locations/all', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      if (!response.ok) throw new Error('Failed to fetch locations');
      return await response.json();
    },
  });



  
  const [filters, setFilters] = useState({
    locationId: "clover_all",
    state: "all",
    paymentState: "all",
    hasDiscounts: "all",
    hasRefunds: "all",
    search: "",
    page: 1,
    limit: 20
  });

  // Update filters when debounced search changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("orders");

  // Order details query - only fetch when dialog is open
  const { data: selectedOrder, isLoading: orderDetailsLoading, error: orderDetailsError } = useQuery<Order>({
    queryKey: ['/api/orders', selectedOrderId, 'detail'],
    queryFn: async () => {
      if (!selectedOrderId) throw new Error('No order ID provided');
      const response = await fetch(`/api/orders/${selectedOrderId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch order details: ${response.status} ${response.statusText}`);
      }
      const detailedOrder = await response.json();
      
      // Extract line items from Clover API format with better handling
      let extractedLineItems = [];
      if (Array.isArray(detailedOrder.lineItems)) {
        extractedLineItems = detailedOrder.lineItems;
      } else if (detailedOrder.lineItems?.elements && Array.isArray(detailedOrder.lineItems.elements)) {
        extractedLineItems = detailedOrder.lineItems.elements;
      } else if (detailedOrder.lineItems?.href && detailedOrder.lineItems?.data && Array.isArray(detailedOrder.lineItems.data)) {
        extractedLineItems = detailedOrder.lineItems.data;
      }
      
      // Extract payments from Clover API format with better handling
      let extractedPayments = [];
      if (Array.isArray(detailedOrder.payments)) {
        extractedPayments = detailedOrder.payments;
      } else if (detailedOrder.payments?.elements && Array.isArray(detailedOrder.payments.elements)) {
        extractedPayments = detailedOrder.payments.elements;
      } else if (detailedOrder.payments?.href && detailedOrder.payments?.data && Array.isArray(detailedOrder.payments.data)) {
        extractedPayments = detailedOrder.payments.data;
      }
      
      // Extract refunds from Clover API format  
      const extractedRefunds = detailedOrder.refunds?.elements ? 
        { elements: detailedOrder.refunds.elements } : 
        detailedOrder.refunds;
      
      // Create processed order with extracted data
      return {
        ...detailedOrder,
        lineItems: extractedLineItems,
        payments: extractedPayments,
        refunds: extractedRefunds
      };
    },
    enabled: !!selectedOrderId && showOrderDetails,
    staleTime: 10 * 60 * 1000, // Order details are fairly stable - 10 minutes
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  const { toast } = useToast();

  // Fetch orders with filtering - use pre-calculated timezone-aware epoch timestamps
  const ordersQueryParams = new URLSearchParams();
  
  // Use pre-calculated epoch values to avoid double timezone conversion
  const selectedDateRange = getDateRangeByValue(dateRangeValue);
  if (selectedDateRange) {
    // Use pre-calculated timezone-aware epoch milliseconds
    ordersQueryParams.set('createdTimeMin', selectedDateRange.startEpoch.toString());
    ordersQueryParams.set('createdTimeMax', selectedDateRange.endEpoch.toString());
    
    console.log('🌍 [TZ-AWARE FILTERING] Using pre-calculated epoch timestamps:', {
      dateRangeValue,
      startEpoch: selectedDateRange.startEpoch,
      endEpoch: selectedDateRange.endEpoch,
      startUTC: new Date(selectedDateRange.startEpoch).toISOString(),
      endUTC: new Date(selectedDateRange.endEpoch).toISOString(),
      range: `${selectedDateRange.startDate.toLocaleDateString()} - ${selectedDateRange.endDate.toLocaleDateString()}`
    });
  } else if (dateRange.from && dateRange.to) {
    // Fallback for custom date ranges only
    const BUSINESS_TIMEZONE = 'America/Chicago';
    const startEpoch = fromZonedTime(startOfDay(dateRange.from), BUSINESS_TIMEZONE).getTime();
    const endEpoch = fromZonedTime(endOfDay(dateRange.to), BUSINESS_TIMEZONE).getTime();
    
    ordersQueryParams.set('createdTimeMin', startEpoch.toString());
    ordersQueryParams.set('createdTimeMax', endEpoch.toString());
    
    console.log('🌍 [TZ-AWARE FILTERING] Custom range fallback:', {
      startEpoch,
      endEpoch,
      startUTC: new Date(startEpoch).toISOString(),
      endUTC: new Date(endEpoch).toISOString(),
      range: `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
    });
  }
  ordersQueryParams.set('search', filters.search);
  ordersQueryParams.set('locationId', filters.locationId);
  ordersQueryParams.set('state', filters.state);
  ordersQueryParams.set('page', filters.page.toString());
  ordersQueryParams.set('limit', filters.limit.toString());
  
  // Memoize date parameters for consistent usage across all queries - always return valid dates
  const dateParams = useMemo(() => {
    const selectedDateRange = getDateRangeByValue(dateRangeValue);
    if (selectedDateRange) {
      return {
        startEpoch: selectedDateRange.startEpoch,
        endEpoch: selectedDateRange.endEpoch,
        startDate: format(selectedDateRange.startDate, 'yyyy-MM-dd'),
        endDate: format(selectedDateRange.endDate, 'yyyy-MM-dd')
      };
    } else if (dateRange.from && dateRange.to) {
      const BUSINESS_TIMEZONE = 'America/Chicago';
      const startEpoch = fromZonedTime(startOfDay(dateRange.from), BUSINESS_TIMEZONE).getTime();
      const endEpoch = fromZonedTime(endOfDay(dateRange.to), BUSINESS_TIMEZONE).getTime();
      return {
        startEpoch,
        endEpoch,
        startDate: format(dateRange.from, 'yyyy-MM-dd'),
        endDate: format(dateRange.to, 'yyyy-MM-dd')
      };
    }
    
    // CRITICAL FIX: Always provide a fallback to "last-30-days" to prevent null dateParams
    console.log('🔄 [DATERANGE] Using fallback to last-30-days');
    const fallbackRange = getDateRangeByValue('last-30-days');
    if (!fallbackRange) {
      // Final fallback if even last-30-days fails
      const today = new Date();
      const BUSINESS_TIMEZONE = 'America/Chicago';
      const thirtyDaysAgo = subDays(today, 29);
      const startEpoch = fromZonedTime(startOfDay(thirtyDaysAgo), BUSINESS_TIMEZONE).getTime();
      const endEpoch = fromZonedTime(endOfDay(today), BUSINESS_TIMEZONE).getTime();
      return {
        startEpoch,
        endEpoch,
        startDate: format(thirtyDaysAgo, 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd')
      };
    }
    return {
      startEpoch: fallbackRange.startEpoch,
      endEpoch: fallbackRange.endEpoch,
      startDate: format(fallbackRange.startDate, 'yyyy-MM-dd'),
      endDate: format(fallbackRange.endDate, 'yyyy-MM-dd')
    };
  }, [dateRangeValue, dateRange]);

  // Construct orders URL using dateParams as single source of truth
  const ordersUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('createdTimeMin', dateParams.startEpoch.toString());
    params.set('createdTimeMax', dateParams.endEpoch.toString());
    params.set('search', filters.search);
    params.set('locationId', filters.locationId);
    params.set('state', filters.state);
    params.set('paymentState', filters.paymentState);
    params.set('hasDiscounts', filters.hasDiscounts);
    params.set('hasRefunds', filters.hasRefunds);
    params.set('page', filters.page.toString());
    params.set('limit', filters.limit.toString());
    params.set('skipCogs', 'true'); // Skip COGS in list for performance - full details available in order dialog
    return `/api/orders?${params.toString()}`;
  }, [dateParams, filters]);

  // Use structured query key for better caching and invalidation
  const ordersQueryKey = ['/api/orders', {
    createdTimeMin: String(dateParams.startEpoch),
    createdTimeMax: String(dateParams.endEpoch),
    search: filters.search || '',
    locationId: filters.locationId,
    state: filters.state,
    paymentState: filters.paymentState,
    hasDiscounts: filters.hasDiscounts,
    hasRefunds: filters.hasRefunds,
    page: filters.page,
    limit: filters.limit,
    skipCogs: 'true'
  }];

  const { data: ordersData, isLoading: ordersLoading, isFetching: ordersFetching, error: ordersError } = useQuery<OrdersResponse>({
    queryKey: ordersQueryKey,
    queryFn: async () => {
      // Use clean URL without cache-busting
      const response = await fetch(ordersUrl, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    placeholderData: keepPreviousData, // Prevent UI flicker during pagination/filtering
    enabled: true // Always enabled since dateParams is guaranteed to be valid
  });

  // Prepare analytics query with unified date handling
  const analyticsQueryParams = new URLSearchParams();
  if (dateParams?.startDate) analyticsQueryParams.set('startDate', dateParams.startDate);
  if (dateParams?.endDate) analyticsQueryParams.set('endDate', dateParams.endDate);
  analyticsQueryParams.set('locationId', filters.locationId);
  analyticsQueryParams.set('groupBy', 'day');

  const analyticsUrl = `/api/orders/analytics?${analyticsQueryParams.toString()}`;

  // Use structured query key for analytics
  const analyticsQueryKey = ['/api/orders/analytics', {
    startDate: dateParams?.startDate,
    endDate: dateParams?.endDate,
    locationId: filters.locationId,
    groupBy: 'day'
  }];

  // Fetch order analytics - PERFORMANCE: Only load when Analytics tab is active
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<OrderAnalyticsResponse>({
    queryKey: analyticsQueryKey,
    queryFn: async () => {
      const response = await fetch(analyticsUrl, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch order analytics: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    enabled: activeTab === 'analytics' && !!dateParams, // Only load when Analytics tab is active
    staleTime: 5 * 60 * 1000, // 5 minutes for analytics
    refetchOnWindowFocus: false,
  });

  // Prepare voided items query with unified date handling
  const voidedQueryParams = new URLSearchParams();
  if (dateParams?.startDate) voidedQueryParams.set('startDate', dateParams.startDate);
  if (dateParams?.endDate) voidedQueryParams.set('endDate', dateParams.endDate);
  voidedQueryParams.set('locationId', filters.locationId);

  const voidedUrl = `/api/orders/voided-items?${voidedQueryParams.toString()}`;

  // Use structured query key for voided items
  const voidedQueryKey = ['/api/orders/voided-items', {
    startDate: dateParams?.startDate,
    endDate: dateParams?.endDate,
    locationId: filters.locationId
  }];

  // Fetch voided items
  const { data: voidedData, isLoading: voidedLoading } = useQuery<VoidedItemsResponse>({
    queryKey: voidedQueryKey,
    queryFn: async () => {
      const response = await fetch(voidedUrl, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch voided items: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!dateParams,
    staleTime: 5 * 60 * 1000, // 5 minutes for voided items
    refetchOnWindowFocus: false,
  });

  // Fetch employee payments for comprehensive reporting
  const employeePaymentsParams = new URLSearchParams();
  if (dateParams?.startDate) employeePaymentsParams.set('startDate', dateParams.startDate);
  if (dateParams?.endDate) employeePaymentsParams.set('endDate', dateParams.endDate);
  employeePaymentsParams.set('locationId', filters.locationId);
  const employeePaymentsUrl = `/api/orders/employee-payments?${employeePaymentsParams.toString()}`;

  const { data: employeePaymentsData, isLoading: employeePaymentsLoading } = useQuery({
    queryKey: ['/api/orders/employee-payments', {
      startDate: dateParams?.startDate,
      endDate: dateParams?.endDate,
      locationId: filters.locationId
    }],
    queryFn: async () => {
      const response = await fetch(employeePaymentsUrl, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch employee payments: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!dateParams,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch credit refunds for comprehensive reporting
  const creditRefundsParams = new URLSearchParams();
  if (dateParams?.startDate) creditRefundsParams.set('startDate', dateParams.startDate);
  if (dateParams?.endDate) creditRefundsParams.set('endDate', dateParams.endDate);
  creditRefundsParams.set('locationId', filters.locationId);
  const creditRefundsUrl = `/api/orders/credit-refunds?${creditRefundsParams.toString()}`;

  const { data: creditRefundsData, isLoading: creditRefundsLoading } = useQuery({
    queryKey: ['/api/orders/credit-refunds', {
      startDate: dateParams?.startDate,
      endDate: dateParams?.endDate,
      locationId: filters.locationId
    }],
    queryFn: async () => {
      console.log(`💸 [CREDIT REFUNDS QUERY] Calling endpoint: ${creditRefundsUrl}`);
      const response = await fetch(creditRefundsUrl, {
        credentials: 'include'
      });
      if (!response.ok) {
        console.error(`❌ [CREDIT REFUNDS QUERY] Failed: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch credit refunds: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log(`✅ [CREDIT REFUNDS QUERY] Response:`, data);
      return data;
    },
    enabled: !!dateParams,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Comprehensive stats aggregation from all data sources - Single Source of Truth
  const comprehensiveStats = useMemo(() => {
    // PERFORMANCE FIX: Don't block on analytics - it can take 100+ seconds
    // Only require ordersData to render the page
    if (!ordersData) return null;

    // Use aggregatedTotals from API if available (calculated from ALL orders, not just paginated results)
    // This fixes the bug where metrics were calculated from only the first page of results
    const orderMetrics = ordersData.aggregatedTotals || ordersData.orders.reduce((acc, order) => {
      return {
        // Core metrics (previously from analytics)
        totalRevenue: acc.totalRevenue + (order.total / 100), // total is in cents, convert to dollars
        orderCount: acc.orderCount + 1,
        
        // Financial metrics (previously from orderMetrics)
        totalCOGS: acc.totalCOGS + (typeof order.netCOGS === 'number' ? order.netCOGS : parseFloat(String(order.netCOGS || 0))),
        totalProfit: acc.totalProfit + (typeof order.netProfit === 'number' ? order.netProfit : parseFloat(String(order.netProfit || 0))),
        totalDiscounts: acc.totalDiscounts + (typeof order.totalDiscounts === 'number' ? order.totalDiscounts : parseFloat(String(order.totalDiscounts || 0))),
        giftCardTotal: acc.giftCardTotal + (typeof order.giftCardTotal === 'number' ? order.giftCardTotal : parseFloat(String(order.giftCardTotal || 0))),
        totalGrossTax: acc.totalGrossTax + (typeof order.grossTax === 'number' ? order.grossTax : parseFloat(String(order.grossTax || 0))),
        totalAmazonFees: acc.totalAmazonFees + (typeof order.amazonFees === 'number' ? order.amazonFees : parseFloat(String(order.amazonFees || 0))),
        marginSum: acc.marginSum + (parseFloat(String(order.netMargin || '0').replace('%', '')))
      };
    }, { totalRevenue: 0, orderCount: 0, totalCOGS: 0, totalProfit: 0, totalDiscounts: 0, giftCardTotal: 0, totalGrossTax: 0, totalAmazonFees: 0, marginSum: 0 });

    // Comprehensive reporting metrics from new API endpoints
    const voidedMetrics = voidedData?.totals || {};
    const employeePaymentMetrics = {
      count: employeePaymentsData?.total || 0,
      totalAmount: employeePaymentsData?.payments?.reduce((sum: number, payment: any) => 
        sum + (parseFloat(payment.amount || 0) / 100), 0) || 0
    };
    const creditRefundMetrics = {
      count: creditRefundsData?.total || 0,
      totalAmount: creditRefundsData?.refunds?.reduce((sum: number, refund: any) => 
        sum + (parseFloat(refund.amount || 0) / 100), 0) || 0
    };

    return {
      // Primary order metrics (calculated from ordersData - no need to wait for analytics!)
      totalOrders: orderMetrics.orderCount,
      totalRevenue: orderMetrics.totalRevenue,
      avgOrderValue: orderMetrics.orderCount > 0 ? orderMetrics.totalRevenue / orderMetrics.orderCount : 0,
      
      // Financial analysis (from orders data)
      totalCOGS: orderMetrics.totalCOGS,
      totalProfit: orderMetrics.totalProfit,
      totalGrossTax: orderMetrics.totalGrossTax,
      totalAmazonFees: orderMetrics.totalAmazonFees,
      avgMargin: orderMetrics.orderCount > 0 ? orderMetrics.marginSum / orderMetrics.orderCount : 0,
      
      // Comprehensive reporting metrics
      totalDiscounts: orderMetrics.totalDiscounts,
      giftCardTotal: orderMetrics.giftCardTotal,
      voidedAmount: (voidedMetrics as any)?.totalVoidedAmount || 0,
      voidedItemsCount: (voidedMetrics as any)?.totalVoidedItems || 0,
      employeePaymentCount: employeePaymentMetrics.count,
      employeePaymentAmount: employeePaymentMetrics.totalAmount,
      creditRefundCount: creditRefundMetrics.count,
      creditRefundAmount: creditRefundMetrics.totalAmount,
      
      // Calculated metrics (now using orderMetrics instead of baseStats)
      grossProfitMargin: orderMetrics.totalRevenue > 0 ? (orderMetrics.totalProfit / orderMetrics.totalRevenue) * 100 : 0,
      voidedRate: orderMetrics.orderCount > 0 ? ((voidedMetrics as any)?.totalVoidedItems || 0) / orderMetrics.orderCount * 100 : 0,
      refundRate: creditRefundMetrics.count > 0 && orderMetrics.orderCount > 0 ? 
        (creditRefundMetrics.count / orderMetrics.orderCount) * 100 : 0
    };
  }, [ordersData, analyticsData, voidedData, employeePaymentsData, creditRefundsData]);

  // All useEffects AFTER useQuery declarations to avoid initialization errors
  // Log API errors and success for debugging
  useEffect(() => {
    if (ordersError) {
      console.error('Orders API error - Full details:', {
        message: ordersError.message,
        stack: ordersError.stack,
        name: ordersError.name,
        cause: ordersError.cause
      });
      console.error('Orders URL attempted:', ordersUrl);
    }
    if (ordersData) {
      console.log('Orders API success:', ordersData);
    }
  }, [ordersError, ordersData, ordersUrl]);

  // Log locations data for debugging
  useEffect(() => {
    console.log('📁 [LOCATIONS DEBUG] Locations query result:', {
      locations,
      locationsCount: locations?.length || 0,
      locationsError: locationsError?.message,
      locationsLoading,
      sampleLocation: locations?.[0]
    });
    if (locationsError) {
      console.error('📁 [LOCATIONS DEBUG] Locations API error:', locationsError);
    }
  }, [locations, locationsError, locationsLoading]);

  // Order sync mutation
  const syncOrdersMutation = useMutation({
    mutationFn: async (syncOptions: { startDate?: string; endDate?: string }) => {
      const response = await fetch('/api/orders/sync', {
        method: 'POST',
        credentials: 'include',
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
      // Invalidate all order-related queries using structured format
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/voided-items'] });
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

  const formatCurrencyDirect = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount); // Already in dollars
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatDate = (timestamp: number) => {
    // Use formatInTimeZone to ensure consistent CST timezone display
    return formatInTimeZone(timestamp, 'America/Chicago', 'MM/dd/yyyy \'at\' h:mm:ss a');
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

  const handleOrderClick = (order: Order) => {
    setSelectedOrderId(order.id);
    setShowOrderDetails(true);
  };

  const handleSyncOrders = () => {
    syncOrdersMutation.mutate({
      startDate: dateParams?.startDate,
      endDate: dateParams?.endDate
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
    <TooltipProvider>
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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters & Date Range</span>
            </div>
            {(ordersFetching || ordersLoading || analyticsLoading || voidedLoading || employeePaymentsLoading || creditRefundsLoading) && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground" data-testid="loading-indicator">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <DateRangePicker
              value={dateRangeValue}
              onValueChange={(value: string, startDate: string, endDate: string) => {
                console.log('Date range picker callback:', { value, startDate, endDate });
                
                const fromDate = new Date(startDate);
                const toDate = new Date(endDate);
                
                console.log('Date objects created:', {
                  fromDate: fromDate.toISOString(),
                  toDate: toDate.toISOString(),
                  fromFormatted: format(fromDate, 'yyyy-MM-dd'),
                  toFormatted: format(toDate, 'yyyy-MM-dd')
                });
                
                setDateRangeValue(value);
                setDateRange({
                  from: fromDate,
                  to: toDate
                });
                // Reset pagination when date changes
                setFilters(prev => ({ ...prev, page: 1 }));
              }}
            />
            <div className="flex flex-1 gap-2">
              <Input
                placeholder="Search orders..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1"
                data-testid="input-search-orders"
              />
              <Select
                value={filters.locationId}
                onValueChange={(value) => setFilters(prev => ({ ...prev, locationId: value, page: 1 }))}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="All Clover Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clover_all">All Clover Locations</SelectItem>
                  <SelectItem value="all">All Locations (Clover + Amazon)</SelectItem>
                  {locationsLoading ? (
                    <SelectItem value="loading" disabled>Loading locations...</SelectItem>
                  ) : locationsError ? (
                    <SelectItem value="error" disabled>Error loading locations</SelectItem>
                  ) : (locations || []).length === 0 ? (
                    <SelectItem value="empty" disabled>No locations available</SelectItem>
                  ) : (
                    <>
                      {/* Clover Locations */}
                      {(locations || []).filter((loc: any) => loc.type === 'clover').length > 0 && (
                        <>
                          <SelectItem value="clover_separator" disabled className="text-xs font-semibold text-muted-foreground">
                            — Clover Locations —
                          </SelectItem>
                          {(locations || []).filter((loc: any) => loc.type === 'clover').map((location: any) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name || `Clover ${location.internalId}`}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {/* Amazon Locations */}
                      {(locations || []).filter((loc: any) => loc.type === 'amazon').length > 0 && (
                        <>
                          <SelectItem value="amazon_separator" disabled className="text-xs font-semibold text-muted-foreground">
                            — Amazon Stores —
                          </SelectItem>
                          {(locations || []).filter((loc: any) => loc.type === 'amazon').map((location: any) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name || `Amazon ${location.internalId}`}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </>
                  )}
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
                  <SelectItem value="all">All States</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Additional Column Filters */}
          <div className="flex flex-col lg:flex-row gap-4 pt-2 border-t">
            <div className="flex flex-1 gap-2">
              <Select
                value={filters.paymentState}
                onValueChange={(value) => setFilters(prev => ({ ...prev, paymentState: value, page: 1 }))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Status</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={filters.hasDiscounts}
                onValueChange={(value) => setFilters(prev => ({ ...prev, hasDiscounts: value, page: 1 }))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Discounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="yes">With Discounts</SelectItem>
                  <SelectItem value="no">No Discounts</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={filters.hasRefunds}
                onValueChange={(value) => setFilters(prev => ({ ...prev, hasRefunds: value, page: 1 }))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Refunds" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="yes">With Refunds</SelectItem>
                  <SelectItem value="no">No Refunds</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comprehensive Analytics Overview - Single Source of Truth */}
      {comprehensiveStats && (
        <div className="space-y-6">
          {/* Primary Business Metrics */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Core Business Metrics</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{comprehensiveStats.totalOrders.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <UITooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Sum of all order totals from Clover</p>
                        <p className="text-xs font-mono mt-1">= Gross Sales - Discounts + Tax</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(comprehensiveStats.totalRevenue * 100)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(comprehensiveStats.avgOrderValue * 100)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gross Profit Margin</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPercentage(comprehensiveStats.grossProfitMargin)}</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Financial Analysis */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Financial Analysis</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total COGS</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrencyDirect(comprehensiveStats.totalCOGS)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">Gross Sales Tax</CardTitle>
                    <UITooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Total sales tax collected from all orders</p>
                        <p className="text-xs text-muted-foreground mt-1">Matches Clover's "Taxes & Fees" report</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrencyDirect(comprehensiveStats.totalGrossTax)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrencyDirect(comprehensiveStats.totalProfit)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Margin</CardTitle>
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPercentage(comprehensiveStats.avgMargin)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Voided Items</CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">{comprehensiveStats.voidedItemsCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrencyDirect(comprehensiveStats.voidedAmount)} voided
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Comprehensive Reporting Metrics */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Advanced Reporting</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">Total Discounts</CardTitle>
                    <UITooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Sum of all discounts applied (excludes gift cards)</p>
                        <p className="text-xs font-mono mt-1">= Subtotal + Tax - Order Total</p>
                        <p className="text-xs text-muted-foreground mt-1">Matches Clover discount reports</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <Tag className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-500">{formatCurrencyDirect(comprehensiveStats.totalDiscounts)}</div>
                  <p className="text-xs text-muted-foreground">Applied to orders</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">Gift Cards</CardTitle>
                    <UITooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Complimentary gift card items tracked separately</p>
                        <p className="text-xs text-muted-foreground mt-1">Not included in discount totals</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <Gift className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-500">{formatCurrencyDirect(comprehensiveStats.giftCardTotal)}</div>
                  <p className="text-xs text-muted-foreground">Complimentary items</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Employee Payments</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{comprehensiveStats.employeePaymentCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrencyDirect(comprehensiveStats.employeePaymentAmount)} total
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Credit Refunds</CardTitle>
                  <RefreshCw className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">{comprehensiveStats.creditRefundCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrencyDirect(comprehensiveStats.creditRefundAmount)} refunded
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">Amazon Fees</CardTitle>
                    <UITooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Total marketplace fees from Amazon orders</p>
                        <p className="text-xs text-muted-foreground mt-1">Includes FBA fulfillment and referral fees</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <ShoppingCart className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-500">{formatCurrencyDirect(comprehensiveStats.totalAmazonFees)}</div>
                  <p className="text-xs text-muted-foreground">Marketplace fees</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Void Rate</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPercentage(comprehensiveStats.voidedRate)}</div>
                  <p className="text-xs text-muted-foreground">Of total orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Refund Rate</CardTitle>
                  <RotateCcw className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPercentage(comprehensiveStats.refundRate)}</div>
                  <p className="text-xs text-muted-foreground">Of total orders</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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
                        <TableHead>Location</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Discounts</TableHead>
                        <TableHead>Refunds</TableHead>
                        <TableHead>Gross Tax</TableHead>
                        <TableHead>Net COGS</TableHead>
                        <TableHead>Net Profit</TableHead>
                        <TableHead>Net Sale</TableHead>
                        <TableHead>Net Margin</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordersData?.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">{order.id}</TableCell>
                          <TableCell>{order.locationName}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(order.total)}</TableCell>
                          <TableCell className="text-red-600">{formatCurrencyDirect(order.totalDiscounts || 0)}</TableCell>
                          <TableCell className="text-orange-600">{formatCurrencyDirect(order.totalRefunds || 0)}</TableCell>
                          <TableCell>{formatCurrencyDirect(order.grossTax || 0)}</TableCell>
                          <TableCell className="text-blue-600">{formatCurrencyDirect(order.netCOGS || 0)}</TableCell>
                          <TableCell className={`font-semibold ${(order.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrencyDirect(order.netProfit || 0)}
                          </TableCell>
                          <TableCell className="font-medium">{formatCurrencyDirect(order.netSale || 0)}</TableCell>
                          <TableCell className={`font-semibold ${(order.netMargin || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(order.netMargin || 0)}
                          </TableCell>
                          <TableCell>{getPaymentStateBadge(order.paymentState)}</TableCell>
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

              {/* Pagination - Always show if on page 2+ or if multiple pages exist */}
              {ordersData?.pagination && (ordersData.pagination.totalPages > 1 || filters.page > 1) && (
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
                    Page {filters.page} of {ordersData.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page >= ordersData.pagination.totalPages}
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
      <Dialog open={showOrderDetails} onOpenChange={(open) => {
        setShowOrderDetails(open);
        if (!open) {
          setSelectedOrderId(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              {orderDetailsLoading ? (
                'Loading order details...'
              ) : orderDetailsError ? (
                'Failed to load order details'
              ) : selectedOrder ? (
                `Order ${selectedOrder.id} from ${selectedOrder.locationName} - ${formatDate(selectedOrder.createdTime)}`
              ) : (
                'Select an order to view details'
              )}
            </DialogDescription>
          </DialogHeader>
          
          {orderDetailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading order details...</span>
            </div>
          ) : orderDetailsError ? (
            <div className="flex items-center justify-center py-12 text-red-600">
              <AlertCircle className="h-8 w-8" />
              <div className="ml-2">
                <p className="font-semibold">Failed to load order details</p>
                <p className="text-sm">{orderDetailsError instanceof Error ? orderDetailsError.message : 'Unknown error'}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => {
                    if (selectedOrderId) {
                      queryClient.invalidateQueries({ queryKey: ['/api/orders', selectedOrderId, 'detail'] });
                    }
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              </div>
            </div>
          ) : selectedOrder ? (
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
                    <p className="text-lg">{formatCurrencyDirect(selectedOrder.grossTax || 0)}</p>
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

                {/* Employee Information */}
                {selectedOrder.employeeName && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <label className="text-sm font-medium text-blue-900 dark:text-blue-100">Order Employee</label>
                    </div>
                    <p className="text-base font-semibold text-blue-900 dark:text-blue-100 mt-1">{selectedOrder.employeeName}</p>
                  </div>
                )}

                {/* Discount Details */}
                {selectedOrder.discountDetails && selectedOrder.discountDetails.length > 0 && (
                  <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center space-x-2 mb-3">
                      <Percent className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <label className="text-sm font-medium text-red-900 dark:text-red-100">Discounts Applied</label>
                    </div>
                    <div className="space-y-2">
                      {selectedOrder.discountDetails.map((discount) => (
                        <div key={discount.id} className="flex justify-between items-center">
                          <span className="text-sm font-medium text-red-900 dark:text-red-100">{discount.name}</span>
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                            {discount.percentage > 0 
                              ? `${discount.percentage}%` 
                              : `-${formatCurrencyDirect(discount.amount)}`
                            }
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-red-300 dark:border-red-700 flex justify-between items-center">
                        <span className="text-sm font-bold text-red-900 dark:text-red-100">Total Discounts</span>
                        <span className="text-base font-bold text-red-600 dark:text-red-400">
                          -{formatCurrencyDirect(selectedOrder.totalDiscounts || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Line Items */}
                <div>
                  <h4 className="text-lg font-semibold mb-4">Order Items</h4>
                  {selectedOrder.lineItems && selectedOrder.lineItems.length > 0 ? (
                    <div className="space-y-4">
                      {/* Order Financial Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-muted rounded-lg">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Total Discounts</label>
                          <p className="text-lg font-semibold text-red-600">
                            {formatCurrencyDirect(selectedOrder.totalDiscounts || 0)}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Total Refunds</label>
                          <p className="text-lg font-semibold text-red-600">
                            {formatCurrencyDirect(selectedOrder.totalRefunds || 0)}
                          </p>
                        </div>
                        {selectedOrder.isAmazonOrder && (selectedOrder.amazonFees ?? 0) > 0 && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Amazon Fees</label>
                            <p className="text-lg font-semibold text-orange-600">
                              {formatCurrencyDirect(selectedOrder.amazonFees ?? 0)}
                            </p>
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Product Cost (COGS)</label>
                          <p className="text-lg font-semibold text-purple-600">
                            {formatCurrencyDirect(selectedOrder.netCOGS || 0)}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Net Sale</label>
                          <p className="text-lg font-semibold text-green-600">
                            {formatCurrencyDirect(selectedOrder.netSale || 0)}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Net Profit</label>
                          <p className={`text-lg font-semibold ${(selectedOrder.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrencyDirect(selectedOrder.netProfit || 0)}
                          </p>
                        </div>
                      </div>
                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Unit Price</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOrder.lineItems.map((item) => {
                            // Check if this item has refunds
                            const isRefunded = selectedOrder.refunds?.elements?.some((refund: any) => 
                              refund.lineItems?.elements?.some((refundItem: any) => refundItem.id === item.id)
                            );
                            
                            return (
                              <TableRow key={item.id} className={isRefunded ? 'bg-red-50' : ''}>
                                <TableCell>
                                  <div>
                                    {item.name}
                                    {isRefunded && (
                                      <Badge variant="destructive" className="ml-2 text-xs">
                                        Refunded
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{item.quantity || 1}</TableCell>
                                <TableCell>{formatCurrency(item.price)}</TableCell>
                                <TableCell className={`font-semibold ${isRefunded ? 'line-through text-red-600' : ''}`}>
                                  {formatCurrency(item.price * (item.quantity || 1))}
                                </TableCell>
                                <TableCell>
                                  {isRefunded ? (
                                    <Badge variant="destructive">Refunded</Badge>
                                  ) : (
                                    <Badge variant="default">Completed</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
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
                            <p className="font-medium">{payment.tender?.label || 'Payment'}</p>
                            <p className="text-sm text-muted-foreground">Status: {payment.result || 'Completed'}</p>
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
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p>No order details available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}