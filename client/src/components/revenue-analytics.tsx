import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { getDateRangeByValue, formatDateForAPI } from '@/lib/date-ranges';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  ReferenceLine
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  BarChart3, 
  Calendar,
  MapPin,
  Activity,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Store,
  Globe,
  ShoppingCart,
  Clock,
  Sparkles
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

type RevenueTrendData = {
  period: string;
  month?: number;
  quarter?: string;
  year?: number;
  revenue: string;
  transactions: number;
  avgSale: string;
};

type LocationRevenueTrend = {
  locationId: number;
  locationName: string;
  isHSA: boolean;
  data: {
    period: string;
    revenue: string;
    transactions: number;
  }[];
};

type RevenueTrendsResponse = {
  period: string;
  data: RevenueTrendData[];
};

type LocationRevenueTrendsResponse = {
  period: string;
  locations: LocationRevenueTrend[];
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const LOCATION_COLORS: Record<string, string> = {
  'Lake Geneva Retail': '#3B82F6',
  'Watertown Retail': '#10B981',
  'Lake Geneva - HSA': '#8B5CF6',
  'Lake Geneva HSA': '#8B5CF6',
  'Watertown HSA': '#A855F7',
  'Pinehillfarm.co Online': '#F97316',
  'Amazon Store': '#F59E0B',
};

const getLocationColor = (locationName: string): string => {
  if (LOCATION_COLORS[locationName]) return LOCATION_COLORS[locationName];
  if (locationName?.toLowerCase().includes('hsa')) return '#8B5CF6';
  if (locationName?.toLowerCase().includes('amazon')) return '#F59E0B';
  if (locationName?.toLowerCase().includes('online')) return '#F97316';
  if (locationName?.toLowerCase().includes('retail')) return '#3B82F6';
  return '#6B7280';
};

const HSA_COLOR = '#8B5CF6';
const RETAIL_COLOR = '#3B82F6';
const AMAZON_COLOR = '#F59E0B';
const ONLINE_COLOR = '#F97316';

const GRADIENT_COLORS = {
  revenue: { start: '#3B82F6', end: '#60A5FA' },
  transactions: { start: '#10B981', end: '#34D399' },
  profit: { start: '#8B5CF6', end: '#A78BFA' }
};

export function RevenueAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [locationFilter, setLocationFilter] = useState<'all' | 'retail' | 'hsa' | 'online'>('all');
  
  const { toast } = useToast();

  const getQueryParams = () => {
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      return `startDate=${customStartDate}&endDate=${customEndDate}`;
    }
    
    const selectedRange = getDateRangeByValue(dateRange);
    if (selectedRange) {
      const startDate = formatDateForAPI(selectedRange.startDate);
      const endDate = formatDateForAPI(selectedRange.endDate);
      return `startDate=${startDate}&endDate=${endDate}`;
    }
    
    return `period=${selectedPeriod}&year=${selectedYear}`;
  };

  // Always fetch 6 months of data for trend chart - use monthly period format for monthly breakdown
  const getTrendQueryParams = () => {
    const currentYear = new Date().getFullYear();
    // Use period=monthly to get month-by-month breakdown instead of single aggregate
    return `period=monthly&year=${currentYear}`;
  };

  const handleDateRangeChange = (value: string, startDate: string, endDate: string) => {
    setDateRange(value);
    if (value === 'custom') {
      setCustomStartDate(startDate);
      setCustomEndDate(endDate);
    } else {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  // Revenue trends always fetches 6 months for meaningful trend visualization
  const { data: revenueTrends, isLoading: trendsLoading } = useQuery<RevenueTrendsResponse>({
    queryKey: ['/api/accounting/analytics/revenue-trends', 'six-months'],
    queryFn: async () => {
      const params = getTrendQueryParams();
      const response = await apiRequest('GET', `/api/accounting/analytics/revenue-trends?${params}`);
      return await response.json();
    },
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['/api/accounting/reports/profit-loss', dateRange, customStartDate, customEndDate],
    queryFn: async () => {
      const params = getQueryParams();
      const response = await apiRequest('GET', `/api/accounting/reports/profit-loss?${params}`);
      return await response.json();
    },
  });

  const { data: multiLocationData, isLoading: multiLocationLoading } = useQuery({
    queryKey: ['/api/accounting/analytics/multi-location', dateRange, customStartDate, customEndDate],
    queryFn: async () => {
      const params = getQueryParams();
      const response = await apiRequest('GET', `/api/accounting/analytics/multi-location?${params}`);
      return await response.json();
    },
    retry: 1
  });

  // Location trends also uses 6 months for consistent trend visualization
  const { data: locationTrends, isLoading: locationLoading } = useQuery<LocationRevenueTrendsResponse>({
    queryKey: ['/api/accounting/analytics/location-revenue-trends', 'six-months'],
    queryFn: async () => {
      const params = getTrendQueryParams();
      const response = await apiRequest('GET', `/api/accounting/analytics/location-revenue-trends?${params}`);
      return await response.json();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/integrations/clover/sync/historical-all', {
        startDate: '2025-01-01',
        endDate: '2025-08-18'
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sales Data Sync Complete",
        description: "All Clover sales data has been successfully synced across all locations",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/analytics'] });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync sales data. Please try again.",
        variant: "destructive",
      });
      console.error('Sync failed:', error);
    },
  });

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatCurrencyDetailed = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Calculate totals from the selected date period (multiLocationData uses getQueryParams)
  const totalRevenue = multiLocationData?.locationBreakdown?.reduce((sum: number, location: any) => {
    return sum + parseFloat(location.totalSales || location.totalRevenue || '0');
  }, 0) || 0;
  
  // Use multiLocationData for transactions to match the selected date range
  const totalTransactions = multiLocationData?.locationBreakdown?.reduce((sum: number, location: any) => {
    return sum + (location.transactionCount || 0);
  }, 0) || 0;
  const avgSaleOverall = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Calculate trend data for comparison
  const trendMetrics = useMemo(() => {
    if (!revenueTrends?.data || revenueTrends.data.length < 2) {
      return { revenueGrowth: 0, transactionGrowth: 0, avgSaleGrowth: 0, peakPeriod: null, lowPeriod: null };
    }
    
    const data = revenueTrends.data;
    const current = data[data.length - 1];
    const previous = data[data.length - 2];
    
    const currentRevenue = parseFloat(current?.revenue || '0');
    const previousRevenue = parseFloat(previous?.revenue || '0');
    const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    
    const transactionGrowth = previous?.transactions > 0 
      ? ((current?.transactions - previous?.transactions) / previous?.transactions) * 100 
      : 0;
    
    const currentAvg = parseFloat(current?.avgSale || '0');
    const previousAvg = parseFloat(previous?.avgSale || '0');
    const avgSaleGrowth = previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;
    
    // Find peak and low periods
    let peakPeriod = data[0];
    let lowPeriod = data[0];
    data.forEach(item => {
      if (parseFloat(item.revenue) > parseFloat(peakPeriod?.revenue || '0')) peakPeriod = item;
      if (parseFloat(item.revenue) < parseFloat(lowPeriod?.revenue || '0') && parseFloat(item.revenue) > 0) lowPeriod = item;
    });
    
    return { revenueGrowth, transactionGrowth, avgSaleGrowth, peakPeriod, lowPeriod };
  }, [revenueTrends]);

  // Filter locations based on segment
  const filteredLocations = useMemo(() => {
    if (!multiLocationData?.locationBreakdown) return [];
    
    return multiLocationData.locationBreakdown.filter((location: any) => {
      if (locationFilter === 'all') return true;
      if (locationFilter === 'hsa') return location.locationName?.toLowerCase().includes('hsa');
      if (locationFilter === 'online') return location.platform === 'Amazon Store' || location.locationName?.toLowerCase().includes('online');
      if (locationFilter === 'retail') return !location.locationName?.toLowerCase().includes('hsa') && 
                                                location.platform !== 'Amazon Store' && 
                                                !location.locationName?.toLowerCase().includes('online');
      return true;
    });
  }, [multiLocationData, locationFilter]);

  // Prepare pie/donut chart data
  const locationPieData = useMemo(() => {
    return filteredLocations.map((location: any) => {
      const color = getLocationColor(location.locationName);
      
      return {
        name: location.locationName,
        value: parseFloat(location.totalSales || '0'),
        transactions: location.transactionCount || 0,
        color,
        platform: location.platform,
        isHSA: location.locationName?.toLowerCase().includes('hsa'),
        isOnline: location.platform === 'Amazon Store' || location.locationName?.toLowerCase().includes('online')
      };
    }).sort((a: any, b: any) => b.value - a.value);
  }, [filteredLocations]);

  const totalFilteredRevenue = locationPieData.reduce((sum: number, item: any) => sum + item.value, 0);

  // Multi-location chart data
  const getMultiLocationChartData = () => {
    if (!locationTrends?.locations?.length) return [];
    
    const periods = locationTrends.locations[0]?.data?.map(d => d.period) || [];
    
    return periods.map(period => {
      const dataPoint: any = { period };
      locationTrends.locations.forEach(location => {
        const periodData = location.data.find(d => d.period === period);
        dataPoint[location.locationName] = parseFloat(periodData?.revenue || '0');
      });
      return dataPoint;
    });
  };

  // Enhanced chart data with additional metrics
  const enhancedTrendData = useMemo(() => {
    if (!revenueTrends?.data) return [];
    
    return revenueTrends.data.map((item, index) => {
      const revenue = parseFloat(item.revenue || '0');
      const transactions = item.transactions || 0;
      const avgSale = transactions > 0 ? revenue / transactions : 0;
      const prevRevenue = index > 0 ? parseFloat(revenueTrends.data[index - 1].revenue || '0') : revenue;
      const growth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
      
      return {
        ...item,
        revenue,
        avgSale,
        growth,
        revenueFormatted: formatCurrency(revenue),
        isPeak: trendMetrics.peakPeriod?.period === item.period
      };
    });
  }, [revenueTrends, trendMetrics]);

  // Custom tooltip components
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {entry.name === 'Transactions' ? formatNumber(entry.value) : formatCurrencyDetailed(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">{data.name}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-400">Revenue:</span>
            <span className="font-medium">{formatCurrencyDetailed(data.value)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-400">Share:</span>
            <span className="font-medium">{totalFilteredRevenue > 0 ? ((data.value / totalFilteredRevenue) * 100).toFixed(1) : '0'}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-400">Transactions:</span>
            <span className="font-medium">{formatNumber(data.transactions)}</span>
          </div>
        </div>
      </div>
    );
  };

  // Trend indicator component
  const TrendIndicator = ({ value, suffix = '%' }: { value: number; suffix?: string }) => {
    const isPositive = value >= 0;
    return (
      <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        <span>{Math.abs(value).toFixed(1)}{suffix}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Revenue Analytics</h3>
          <p className="text-gray-600 dark:text-gray-400">Comprehensive revenue tracking across all locations</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <Button 
            variant="default" 
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md"
            data-testid="button-sync-sales"
          >
            {syncMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              'Pull All Sales Data'
            )}
          </Button>
          
          <DateRangePicker
            value={dateRange}
            onValueChange={handleDateRangeChange}
            className="w-48"
          />
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 border-blue-100 dark:border-blue-900">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                Total Revenue
              </CardTitle>
              {trendMetrics.revenueGrowth !== 0 && (
                <TrendIndicator value={trendMetrics.revenueGrowth} />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {reportsLoading ? '...' : formatCurrency(totalRevenue)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {multiLocationData?.locationBreakdown?.length || 0} locations
              </Badge>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {dateRange === 'today' ? 'Today' : dateRange === 'this_week' ? 'This Week' : 'Selected Period'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950 dark:to-gray-900 border-green-100 dark:border-green-900">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <ShoppingCart className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                Total Transactions
              </CardTitle>
              {trendMetrics.transactionGrowth !== 0 && (
                <TrendIndicator value={trendMetrics.transactionGrowth} />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{formatNumber(totalTransactions)}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">All locations combined</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950 dark:to-gray-900 border-purple-100 dark:border-purple-900">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                Average Sale
              </CardTitle>
              {trendMetrics.avgSaleGrowth !== 0 && (
                <TrendIndicator value={trendMetrics.avgSaleGrowth} />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrencyDetailed(avgSaleOverall)}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Navigation */}
      <div className="space-y-4">
        <div className="md:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full" data-testid="select-analytics-tab-mobile">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Revenue Overview</SelectItem>
              <SelectItem value="locations">Location Comparison</SelectItem>
              <SelectItem value="trends">Performance Trends</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="hidden md:block">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800">
              <TabsTrigger value="overview" data-testid="tab-revenue-overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                Revenue Overview
              </TabsTrigger>
              <TabsTrigger value="locations" data-testid="tab-location-comparison" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                Location Comparison
              </TabsTrigger>
              <TabsTrigger value="trends" data-testid="tab-performance-trends" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                Performance Trends
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-6">
        {/* Revenue Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Main Revenue Chart */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      Revenue Trend
                    </CardTitle>
                    <CardDescription>
                      Revenue performance over the last 6 months
                    </CardDescription>
                  </div>
                  {trendMetrics.peakPeriod && (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Peak: {trendMetrics.peakPeriod.period}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {trendsLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={enhancedTrendData}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis 
                        dataKey="period" 
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        axisLine={{ stroke: '#E5E7EB' }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3B82F6"
                        strokeWidth={3}
                        fill="url(#revenueGradient)"
                        name="Revenue"
                      />
                      <Line
                        type="monotone"
                        dataKey="avgSale"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Avg Sale"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Period Insights */}
            {trendMetrics.peakPeriod && trendMetrics.lowPeriod && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-green-200 dark:border-green-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
                        <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Best Performing Period</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{trendMetrics.peakPeriod.period}</p>
                        <p className="text-green-600 dark:text-green-400 font-medium">
                          {formatCurrency(parseFloat(trendMetrics.peakPeriod.revenue || '0'))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-amber-200 dark:border-amber-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-xl">
                        <Target className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Opportunity Period</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{trendMetrics.lowPeriod.period}</p>
                        <p className="text-amber-600 dark:text-amber-400 font-medium">
                          {formatCurrency(parseFloat(trendMetrics.lowPeriod.revenue || '0'))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Location Comparison Tab */}
        {activeTab === 'locations' && (
          <div className="space-y-6">
            {/* Location Filter */}
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'all', label: 'All Locations', icon: MapPin },
                { value: 'retail', label: 'Retail', icon: Store },
                { value: 'hsa', label: 'HSA', icon: Activity },
                { value: 'online', label: 'Online', icon: Globe },
              ].map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant={locationFilter === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLocationFilter(value as any)}
                  className={locationFilter === value ? 'bg-blue-600 hover:bg-blue-700' : ''}
                  data-testid={`filter-location-${value}`}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {label}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Donut Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    Revenue Distribution
                  </CardTitle>
                  <CardDescription>
                    Revenue share by location
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {locationLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="60%" height={280}>
                        <PieChart>
                          <Pie
                            data={locationPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {locationPieData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      
                      {/* Custom Legend */}
                      <div className="w-[40%] space-y-2 max-h-[280px] overflow-y-auto pr-2">
                        {locationPieData.slice(0, 6).map((entry: any, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate text-gray-900 dark:text-white">{entry.name}</p>
                              <p className="text-xs text-gray-500">{totalFilteredRevenue > 0 ? ((entry.value / totalFilteredRevenue) * 100).toFixed(0) : '0'}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Location Performance List */}
              <Card>
                <CardHeader>
                  <CardTitle>Location Performance</CardTitle>
                  <CardDescription>
                    Revenue and transactions by location
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
                    {filteredLocations.map((location: any, index: number) => {
                      const revenue = parseFloat(location.totalSales || '0');
                      const transactions = location.transactionCount || 0;
                      const avgSale = transactions > 0 ? revenue / transactions : 0;
                      const sharePercent = totalFilteredRevenue > 0 ? (revenue / totalFilteredRevenue) * 100 : 0;
                      
                      let badgeColor = 'bg-blue-100 text-blue-700';
                      let Icon = Store;
                      if (location.platform === 'Amazon Store') {
                        badgeColor = 'bg-amber-100 text-amber-700';
                        Icon = Globe;
                      } else if (location.locationName?.toLowerCase().includes('hsa')) {
                        badgeColor = 'bg-purple-100 text-purple-700';
                        Icon = Activity;
                      } else if (location.locationName?.toLowerCase().includes('online')) {
                        badgeColor = 'bg-cyan-100 text-cyan-700';
                        Icon = Globe;
                      }
                      
                      return (
                        <div key={location.locationId || index} className="p-4 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" data-testid={`location-item-${location.locationId}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${badgeColor.replace('text', 'bg').replace('100', '100').replace('700', '100')}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{location.locationName}</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {transactions} transactions
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {formatCurrencyDetailed(avgSale)} avg
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(revenue)}</p>
                              <p className="text-sm text-gray-500">{sharePercent.toFixed(1)}% share</p>
                            </div>
                          </div>
                          <Progress 
                            value={sharePercent} 
                            className="h-2" 
                          />
                        </div>
                      );
                    })}
                    
                    {filteredLocations.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No locations match the selected filter
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Multi-Location Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends by Location</CardTitle>
                <CardDescription>
                  Compare revenue performance across locations over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {locationLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={getMultiLocationChartData()}>
                      <defs>
                        {locationTrends?.locations?.map((location) => {
                          const color = getLocationColor(location.locationName);
                          return (
                            <linearGradient key={location.locationId} id={`gradient-${location.locationId}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                            </linearGradient>
                          );
                        })}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis 
                        dataKey="period" 
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        axisLine={{ stroke: '#E5E7EB' }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        verticalAlign="bottom"
                        height={36}
                        wrapperStyle={{ paddingTop: '20px' }}
                      />
                      {locationTrends?.locations?.map((location) => {
                        const color = getLocationColor(location.locationName);
                        return (
                          <Area
                            key={location.locationId}
                            type="monotone"
                            dataKey={location.locationName}
                            stroke={color}
                            strokeWidth={2}
                            fill={`url(#gradient-${location.locationId})`}
                          />
                        );
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Performance Trends Tab */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Peak Period</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {trendMetrics.peakPeriod?.period || 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950 dark:to-gray-900">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Revenue Growth</p>
                      <p className={`font-bold ${trendMetrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(trendMetrics.revenueGrowth)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950 dark:to-gray-900">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Transaction Growth</p>
                      <p className={`font-bold ${trendMetrics.transactionGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(trendMetrics.transactionGrowth)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950 dark:to-gray-900">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Avg Sale Growth</p>
                      <p className={`font-bold ${trendMetrics.avgSaleGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(trendMetrics.avgSaleGrowth)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Combined Performance Chart */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Revenue & Transaction Performance
                </CardTitle>
                <CardDescription>
                  Compare revenue, transaction volume, and average sale trends
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {trendsLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={enhancedTrendData}>
                      <defs>
                        <linearGradient id="barGradientBlue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                          <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id="barGradientGreen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                          <stop offset="100%" stopColor="#34D399" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis 
                        dataKey="period" 
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        axisLine={{ stroke: '#E5E7EB' }}
                        tickLine={false}
                      />
                      <YAxis 
                        yAxisId="revenue"
                        orientation="left"
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        yAxisId="transactions"
                        orientation="right"
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        verticalAlign="top"
                        height={36}
                      />
                      <Bar 
                        yAxisId="revenue"
                        dataKey="revenue" 
                        fill="url(#barGradientBlue)"
                        name="Revenue"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={60}
                      />
                      <Bar 
                        yAxisId="transactions"
                        dataKey="transactions" 
                        fill="url(#barGradientGreen)"
                        name="Transactions"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={60}
                      />
                      <Line
                        yAxisId="revenue"
                        type="monotone"
                        dataKey="avgSale"
                        stroke="#8B5CF6"
                        strokeWidth={3}
                        dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                        name="Avg Sale"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Period-over-Period Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle>Period Performance Details</CardTitle>
                <CardDescription>Detailed breakdown of each period's metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Period</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Revenue</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Transactions</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Avg Sale</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Growth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enhancedTrendData.slice().reverse().slice(0, 10).map((item: any, index: number) => (
                        <tr 
                          key={index} 
                          className={`border-b border-gray-100 dark:border-gray-800 ${item.isPeak ? 'bg-green-50 dark:bg-green-950' : ''}`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {item.isPeak && <Sparkles className="h-4 w-4 text-green-600" />}
                              <span className="font-medium text-gray-900 dark:text-white">{item.period}</span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                            {formatCurrencyDetailed(item.revenue)}
                          </td>
                          <td className="text-right py-3 px-4 text-gray-600 dark:text-gray-400">
                            {formatNumber(item.transactions)}
                          </td>
                          <td className="text-right py-3 px-4 text-gray-600 dark:text-gray-400">
                            {formatCurrencyDetailed(item.avgSale)}
                          </td>
                          <td className="text-right py-3 px-4">
                            <span className={`inline-flex items-center gap-1 ${item.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {item.growth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {Math.abs(item.growth).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
