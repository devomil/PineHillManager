import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  Calendar,
  MapPin,
  Activity,
  Loader2
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const HSA_COLOR = '#9333EA'; // Purple for HSA locations
const RETAIL_COLOR = '#2563EB'; // Blue for retail locations

export function RevenueAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const { toast } = useToast();

  // Get date range parameters
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

  // Handle date range changes
  const handleDateRangeChange = (value: string, startDate: string, endDate: string) => {
    setDateRange(value);
    if (value === 'custom') {
      setCustomStartDate(startDate);
      setCustomEndDate(endDate);
    }
  };

  // Overall revenue trends
  const { data: revenueTrends, isLoading: trendsLoading } = useQuery<RevenueTrendsResponse>({
    queryKey: ['/api/accounting/analytics/revenue-trends', dateRange, customStartDate, customEndDate, selectedPeriod, selectedYear],
    queryFn: async () => {
      const params = getQueryParams();
      const response = await apiRequest('GET', `/api/accounting/analytics/revenue-trends?${params}`);
      return await response.json();
    },
  });

  // Multi-location analytics (includes Clover POS + Amazon Store)
  const { data: multiLocationData, isLoading: multiLocationLoading } = useQuery({
    queryKey: ['/api/accounting/analytics/multi-location', dateRange, customStartDate, customEndDate],
    queryFn: async () => {
      const params = getQueryParams();
      const response = await apiRequest('GET', `/api/accounting/analytics/multi-location?${params}`);
      return response;
    },
    retry: 1
  });

  // Location-specific trends (fallback for legacy charts)
  const { data: locationTrends, isLoading: locationLoading } = useQuery<LocationRevenueTrendsResponse>({
    queryKey: ['/api/accounting/analytics/location-revenue-trends', dateRange, customStartDate, customEndDate, selectedPeriod, selectedYear],
    queryFn: async () => {
      const params = getQueryParams();
      const response = await apiRequest('GET', `/api/accounting/analytics/location-revenue-trends?${params}`);
      return await response.json();
    },
  });

  // Sync mutation with proper loading and feedback
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
      // Invalidate all analytics queries to refresh data
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
    }).format(num);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Calculate totals for summary cards
  const totalRevenue = revenueTrends?.data.reduce((sum, item) => sum + parseFloat(item.revenue), 0) || 0;
  const totalTransactions = revenueTrends?.data.reduce((sum, item) => sum + item.transactions, 0) || 0;
  const avgSaleOverall = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Prepare data for location comparison pie chart
  const locationPieData = locationTrends?.locations.map((location, index) => ({
    name: location.locationName,
    value: location.data.reduce((sum, period) => sum + parseFloat(period.revenue), 0),
    color: location.isHSA ? HSA_COLOR : COLORS[index % COLORS.length],
    isHSA: location.isHSA
  })) || [];

  // Prepare data for multi-location line chart
  const getMultiLocationChartData = () => {
    if (!locationTrends?.locations.length) return [];
    
    const periods = locationTrends.locations[0]?.data.map(d => d.period) || [];
    
    return periods.map(period => {
      const dataPoint: any = { period };
      locationTrends.locations.forEach(location => {
        const periodData = location.data.find(d => d.period === period);
        dataPoint[location.locationName] = parseFloat(periodData?.revenue || '0');
      });
      return dataPoint;
    });
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 4; i--) {
      years.push(i.toString());
    }
    return years;
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold">Revenue Analytics</h3>
          <p className="text-gray-600">Comprehensive revenue tracking across all locations</p>
        </div>
        <div className="flex gap-4 items-center">
          <Button 
            variant="outline" 
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {syncMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing Sales Data...
              </>
            ) : (
              'Pull All Sales Data'
            )}
          </Button>
          
          {/* Date Range Controls */}
          <DateRangePicker
            value={dateRange}
            onValueChange={handleDateRangeChange}
            className="w-48"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-sm text-gray-500 capitalize">{selectedPeriod} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalTransactions)}</div>
            <p className="text-sm text-gray-500">All locations combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Average Sale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgSaleOverall)}</div>
            <p className="text-sm text-gray-500">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Revenue Overview</TabsTrigger>
          <TabsTrigger value="locations" disabled={selectedPeriod === 'annual'}>
            Location Comparison
          </TabsTrigger>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Revenue Trend - {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}
              </CardTitle>
              <CardDescription>
                {selectedPeriod === 'annual' ? 'Last 5 years' : `${selectedYear} breakdown`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueTrends?.data || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      tick={{ fontSize: 12 }}
                      angle={selectedPeriod === 'monthly' ? -45 : 0}
                      textAnchor={selectedPeriod === 'monthly' ? 'end' : 'middle'}
                      height={selectedPeriod === 'monthly' ? 80 : 60}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                      labelFormatter={(label) => `Period: ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#2563EB" 
                      fill="#3B82F6" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Revenue Share
                </CardTitle>
                <CardDescription>
                  Revenue distribution across all locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {locationLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={locationPieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {locationPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location Performance</CardTitle>
                <CardDescription>
                  Individual location metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {locationTrends?.locations.map((location) => {
                    const totalLocationRevenue = location.data.reduce(
                      (sum, period) => sum + parseFloat(period.revenue), 0
                    );
                    const totalLocationTransactions = location.data.reduce(
                      (sum, period) => sum + period.transactions, 0
                    );
                    
                    return (
                      <div key={location.locationId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{location.locationName}</span>
                            <div className="flex gap-2">
                              {location.isHSA && (
                                <Badge variant="secondary" className="text-xs">HSA</Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {totalLocationTransactions} transactions
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(totalLocationRevenue)}</div>
                          <div className="text-sm text-gray-500">
                            {formatCurrency(totalLocationTransactions > 0 ? totalLocationRevenue / totalLocationTransactions : 0)} avg
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Multi-Location Revenue Comparison</CardTitle>
              <CardDescription>
                Revenue trends comparison across all locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {locationLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getMultiLocationChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: any, name: string) => [formatCurrency(value), name]}
                    />
                    <Legend />
                    {locationTrends?.locations.map((location, index) => (
                      <Line
                        key={location.locationId}
                        type="monotone"
                        dataKey={location.locationName}
                        stroke={location.isHSA ? HSA_COLOR : COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Transaction Volume vs Revenue
              </CardTitle>
              <CardDescription>
                Correlation between transaction count and revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueTrends?.data || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      tick={{ fontSize: 12 }}
                      angle={selectedPeriod === 'monthly' ? -45 : 0}
                      textAnchor={selectedPeriod === 'monthly' ? 'end' : 'middle'}
                      height={selectedPeriod === 'monthly' ? 80 : 60}
                    />
                    <YAxis yAxisId="revenue" orientation="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="transactions" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        name === 'revenue' ? formatCurrency(value) : formatNumber(value),
                        name === 'revenue' ? 'Revenue' : 'Transactions'
                      ]}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="revenue"
                      dataKey="revenue" 
                      fill="#3B82F6" 
                      name="Revenue"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      yAxisId="transactions"
                      dataKey="transactions" 
                      fill="#10B981" 
                      name="Transactions"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}