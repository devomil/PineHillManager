import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, Users, AlertTriangle, Clock, Plus, Send, MessageSquare, BarChart3, Wifi, WifiOff, TrendingUp, Activity, DollarSign } from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, isAfter, parseISO } from "date-fns";
import AdminLayout from "@/components/admin-layout";
import { MessageReactions } from "@/components/ui/message-reactions";
import { AnnouncementResponses } from "@/components/ui/announcement-responses";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket, useWebSocketSubscription } from "@/lib/websocket";

interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: string;
  targetAudience: string;
  authorName: string;
  createdAt: string;
  expiresAt?: string;
  smsEnabled: boolean;
  reactions?: any[];
}

interface Communication {
  id: number;
  type: 'announcement' | 'direct_message' | 'group_message';
  title: string;
  content: string;
  priority: string;
  smsEnabled: boolean;
  targetAudience: string;
  authorName: string;
  createdAt: string;
  scheduledFor?: string;
  status: string;
}

// Chart colors
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState(30);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // WebSocket integration for real-time analytics updates
  const { isConnected, send } = useWebSocket();

  // Subscribe to analytics updates when component mounts
  useEffect(() => {
    if (isConnected && send) {
      send({ type: 'subscribe', channel: 'analytics' });
      
      return () => {
        send({ type: 'unsubscribe', channel: 'analytics' });
      };
    }
  }, [isConnected, send]);

  // Listen for real-time analytics updates
  const { messages: analyticsMessages, isConnected: wsConnected } = useWebSocketSubscription('analytics');

  useEffect(() => {
    if (analyticsMessages.length > 0) {
      const lastMessage = analyticsMessages[analyticsMessages.length - 1];
      
      if (lastMessage.type === 'analytics_update') {
        console.log('📊 Real-time analytics update:', lastMessage.eventType, lastMessage.data);
        
        switch (lastMessage.eventType) {
          case 'sms_status_changed':
            // Refresh SMS metrics when delivery status changes
            queryClient.invalidateQueries({ queryKey: ['/api/analytics/sms/metrics'] });
            
            // Show toast for successful delivery
            if (lastMessage.data.isSuccess) {
              toast({
                title: "📱 SMS Delivered",
                description: `Message ${lastMessage.data.messageId.substring(0, 8)}... delivered successfully`,
              });
            }
            break;

          case 'daily_metrics_updated':
            // Refresh all analytics when daily metrics are updated
            queryClient.invalidateQueries({ queryKey: ['/api/analytics/communication/overview'] });
            queryClient.invalidateQueries({ queryKey: ['/api/analytics/communication/charts'] });
            break;

          case 'metrics_refreshed':
            // Comprehensive metrics refresh
            queryClient.invalidateQueries({ queryKey: ['/api/analytics/communication/overview'] });
            queryClient.invalidateQueries({ queryKey: ['/api/analytics/communication/charts'] });
            queryClient.invalidateQueries({ queryKey: ['/api/analytics/sms/metrics'] });
            queryClient.invalidateQueries({ queryKey: ['/api/analytics/user-engagement'] });
            
            toast({
              title: "📊 Analytics Updated",
              description: "Dashboard refreshed with latest data",
              variant: "default",
            });
            break;

          case 'communication_event':
            // Refresh engagement metrics for communication events
            queryClient.invalidateQueries({ queryKey: ['/api/analytics/user-engagement'] });
            break;
        }
      }
    }
  }, [analyticsMessages, queryClient, toast]);

  // Fetch analytics data
  const { data: analyticsOverview, isLoading: overviewLoading } = useQuery({
    queryKey: ['/api/analytics/communication/overview', timeRange],
    queryFn: () => fetch(`/api/analytics/communication/overview?days=${timeRange}`).then(res => res.json()),
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['/api/analytics/communication/charts', timeRange],
    queryFn: () => fetch(`/api/analytics/communication/charts?type=engagement&days=${timeRange}`).then(res => res.json()),
  });

  const { data: smsMetrics, isLoading: smsLoading } = useQuery({
    queryKey: ['/api/analytics/sms/metrics', timeRange],
    queryFn: () => fetch(`/api/analytics/sms/metrics?days=${timeRange}`).then(res => res.json()),
  });

  const { data: userEngagement, isLoading: userLoading } = useQuery({
    queryKey: ['/api/analytics/user-engagement', timeRange],
    queryFn: () => fetch(`/api/analytics/user-engagement?days=${timeRange}`).then(res => res.json()),
  });

  if (overviewLoading && chartLoading && smsLoading && userLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-64 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const overview = analyticsOverview?.overview || {};
  const charts = chartData?.data || [];
  const smsData = smsMetrics?.summary || {};
  const engagement = userEngagement?.summary || {};

  // Process SMS delivery data for pie chart
  const smsDeliveryData = [
    { name: 'Delivered', value: smsData.totalDelivered || 0, color: COLORS[1] },
    { name: 'Failed', value: smsData.totalFailed || 0, color: COLORS[3] },
  ];

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
          Communication Analytics
        </h3>
        <Select value={timeRange.toString()} onValueChange={(value) => setTimeRange(Number(value))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900">{overview.totalMessages || 0}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                {overview.totalAnnouncements || 0} announcements sent
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">SMS Delivered</p>
                <p className="text-2xl font-bold text-gray-900">{overview.smsDelivered || 0}</p>
              </div>
              <Send className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                {overview.averageDeliveryRate || 0}% delivery rate
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Engagement Rate</p>
                <p className="text-2xl font-bold text-gray-900">{overview.averageEngagementRate || 0}%</p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                {overview.totalReactions || 0} total reactions
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">SMS Costs</p>
                <p className="text-2xl font-bold text-gray-900">${overview.totalCost || '0.00'}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                {timeRange} day total
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Communication Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
              Communication Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="messages" 
                    stroke={COLORS[0]} 
                    strokeWidth={2}
                    name="Messages"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="announcements" 
                    stroke={COLORS[1]} 
                    strokeWidth={2}
                    name="Announcements"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sms" 
                    stroke={COLORS[2]} 
                    strokeWidth={2}
                    name="SMS"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Engagement Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2 text-purple-600" />
              Engagement Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="reactions" 
                    stackId="1"
                    stroke={COLORS[4]} 
                    fill={COLORS[4]}
                    name="Reactions"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="responses" 
                    stackId="1"
                    stroke={COLORS[5]} 
                    fill={COLORS[5]}
                    name="Responses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* SMS Delivery Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Send className="h-5 w-5 mr-2 text-green-600" />
              SMS Delivery Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={smsDeliveryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {smsDeliveryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              {smsDeliveryData.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Engaged Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-indigo-600" />
              Top Engaged Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userEngagement?.topEngaged?.slice(0, 5).map((user: any, index: number) => (
                <div key={user.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                      <p className="text-xs text-gray-500">
                        {user.messagesSent || 0} messages • {user.reactionsGiven || 0} reactions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-blue-600">{user.engagementScore}%</p>
                    <p className="text-xs text-gray-500">engagement</p>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No engagement data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Updates Indicator */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                wsConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm font-medium text-gray-700">
                {wsConnected ? 'Live Analytics Dashboard' : 'Connecting to live updates...'}
              </span>
              {wsConnected && (
                <Badge variant="secondary" className="text-xs">
                  <Wifi className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  // Manual refresh all queries
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['/api/analytics/communication/overview'] }),
                    queryClient.invalidateQueries({ queryKey: ['/api/analytics/communication/charts'] }),
                    queryClient.invalidateQueries({ queryKey: ['/api/analytics/sms/metrics'] }),
                    queryClient.invalidateQueries({ queryKey: ['/api/analytics/user-engagement'] })
                  ]);
                  
                  toast({
                    title: "📊 Analytics Refreshed",
                    description: "Dashboard data updated with latest metrics.",
                  });
                }}
              >
                Refresh Now
              </Button>
              {wsConnected && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    toast({
                      title: "🔄 Real-time Active",
                      description: "Analytics dashboard automatically updates when new data arrives via SMS deliveries and communication events.",
                    });
                  }}
                >
                  <Activity className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CommunicationsContent() {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("announcements");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // WebSocket integration for real-time updates
  const { isConnected } = useWebSocket();
  
  // Subscribe to communications updates
  const { messages } = useWebSocketSubscription('communications');

  // Handle real-time updates
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage.type === 'update' && lastMessage.data?.type === 'announcement') {
        // Refresh announcements when we get real-time updates
        queryClient.invalidateQueries({ queryKey: ["/api/announcements/published"] });
        
        // Show toast notification for new announcements
        if (lastMessage.data.action === 'created') {
          toast({
            title: "📢 New Announcement",
            description: `${lastMessage.data.title || 'A new announcement'} has been posted`,
            duration: 5000,
          });
        }
      }
    }
  }, [messages, queryClient, toast]);

  // Form state for creating communications
  const [formData, setFormData] = useState({
    type: 'announcement' as 'announcement' | 'direct_message' | 'group_message',
    title: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    targetAudience: 'all',
    smsEnabled: false,
    scheduledFor: ''
  });

  // Fetch announcements (existing functionality)
  const { data: announcements = [], isLoading: announcementsLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements/published"],
    retry: 1,
  });

  // Create communication mutation
  const createCommunicationMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/communications', 'POST', data);
    },
    onSuccess: () => {
      toast({ title: "Communication sent successfully!" });
      setShowCreateDialog(false);
      setFormData({
        type: 'announcement',
        title: '',
        content: '',
        priority: 'normal',
        targetAudience: 'all',
        smsEnabled: false,
        scheduledFor: ''
      });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/published"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error sending communication", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleCreateCommunication = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({ 
        title: "Missing required fields", 
        description: "Please fill in title and content",
        variant: "destructive" 
      });
      return;
    }

    createCommunicationMutation.mutate(formData);
  };

  // Utility functions (existing from announcements page)
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTargetAudienceIcon = (audience: string) => {
    return <Users className="h-4 w-4" />;
  };

  const formatAudience = (audience: string) => {
    switch (audience) {
      case 'all': return 'All Staff';
      case 'employees-only': return 'Employees Only';
      case 'admins-managers': return 'Admins & Managers';
      case 'managers-only': return 'Managers Only';
      case 'admins-only': return 'Admins Only';
      case 'lake-geneva': return 'Lake Geneva Team';
      case 'watertown': return 'Watertown Team';
      case 'watertown-retail': return 'Watertown Retail';
      case 'watertown-spa': return 'Watertown Spa';
      case 'online-team': return 'Online Team';
      default: return audience.charAt(0).toUpperCase() + audience.slice(1);
    }
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return isAfter(new Date(), parseISO(expiresAt));
  };

  // Filter announcements
  const getFilteredAnnouncements = () => {
    const activeAnnouncements = announcements.filter(announcement => !isExpired(announcement.expiresAt));
    
    if (selectedFilter === "all") return activeAnnouncements;
    if (selectedFilter === "important") return activeAnnouncements.filter(a => a.priority === "urgent" || a.priority === "high");
    if (selectedFilter === "general") return activeAnnouncements.filter(a => a.priority === "normal" || a.priority === "low");
    if (selectedFilter === "policy") return activeAnnouncements.filter(a => a.title.toLowerCase().includes("policy"));
    
    return activeAnnouncements;
  };

  const filteredAnnouncements = getFilteredAnnouncements();
  const expiredAnnouncements = announcements.filter(announcement => isExpired(announcement.expiresAt));

  if (announcementsLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-6">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-First Header with Create Button */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-2">
          {/* Connection Status Indicator */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {isConnected ? (
              <>
                <Wifi className="w-3 h-3 text-green-500" />
                <span className="hidden sm:inline">Real-time updates active</span>
                <span className="sm:hidden">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-orange-500" />
                <span className="hidden sm:inline">Connecting...</span>
                <span className="sm:hidden">Offline</span>
              </>
            )}
          </div>
        </div>
        
        {/* Create Communication Button - Admin/Manager Only */}
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button 
                style={{
                  backgroundColor: '#1e40af',
                  borderColor: '#1e40af',
                  color: 'white',
                  fontWeight: '600'
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Communication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
              <DialogHeader>
                <DialogTitle>Create New Communication</DialogTitle>
                <DialogDescription>
                  Send announcements, direct messages, or group communications
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Communication Type */}
                <div>
                  <Label htmlFor="type">Communication Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">📢 Announcement</SelectItem>
                      <SelectItem value="direct_message">💬 Direct Message</SelectItem>
                      <SelectItem value="group_message">👥 Group Message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter communication title"
                  />
                </div>

                {/* Content */}
                <div>
                  <Label htmlFor="content">Message Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter your message content"
                    rows={4}
                  />
                </div>

                {/* Priority */}
                <div>
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">🔵 Low Priority</SelectItem>
                      <SelectItem value="normal">⚪ Normal Priority</SelectItem>
                      <SelectItem value="high">🟠 High Priority</SelectItem>
                      <SelectItem value="urgent">🔴 Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Audience */}
                <div>
                  <Label htmlFor="audience">Target Audience</Label>
                  <Select 
                    value={formData.targetAudience} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, targetAudience: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      <SelectItem value="employees-only">Employees Only</SelectItem>
                      <SelectItem value="admins-managers">Admins & Managers</SelectItem>
                      <SelectItem value="managers-only">Managers Only</SelectItem>
                      <SelectItem value="admins-only">Admins Only</SelectItem>
                      <SelectItem value="lake-geneva">Lake Geneva Team</SelectItem>
                      <SelectItem value="watertown">Watertown Team</SelectItem>
                      <SelectItem value="watertown-retail">Watertown Retail</SelectItem>
                      <SelectItem value="watertown-spa">Watertown Spa</SelectItem>
                      <SelectItem value="online-team">Online Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* SMS Enabled */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="smsEnabled"
                    checked={formData.smsEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, smsEnabled: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="smsEnabled">📱 Send SMS notifications</Label>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateCommunication}
                  disabled={createCommunicationMutation.isPending}
                  className="w-full sm:w-auto touch-manipulation"
                  style={{
                    backgroundColor: '#1e40af',
                    borderColor: '#1e40af',
                    color: 'white',
                    fontWeight: '600'
                  }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {createCommunicationMutation.isPending ? 'Sending...' : 'Send Communication'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Mobile-First Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:w-auto bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="announcements" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium">
            <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Announcements</span>
            <span className="sm:hidden">News</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium">
            <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Messages</span>
            <span className="sm:hidden">Chat</span>
          </TabsTrigger>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium col-span-2 sm:col-span-1">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              Analytics
            </TabsTrigger>
          )}
        </TabsList>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-6">
          {/* Mobile-First Filter Buttons */}
          <div className="mb-4 md:mb-6">
            <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button
              variant={selectedFilter === "all" ? "default" : "outline"}
              onClick={() => setSelectedFilter("all")}
              size="sm"
              className="touch-manipulation"
              style={selectedFilter === "all" ? {
                backgroundColor: '#16a34a',
                borderColor: '#16a34a',
                color: 'white',
                fontWeight: '600'
              } : {
                backgroundColor: 'white',
                borderColor: '#d1d5db',
                color: '#374151'
              }}
            >
              <span className="text-xs sm:text-sm">All</span>
              <span className="hidden md:inline ml-1">Announcements</span>
            </Button>
            <Button
              variant={selectedFilter === "important" ? "default" : "outline"}
              onClick={() => setSelectedFilter("important")}
              size="sm"
              className="touch-manipulation"
              style={selectedFilter === "important" ? {
                backgroundColor: '#dc2626',
                borderColor: '#dc2626',
                color: 'white',
                fontWeight: '600'
              } : {
                backgroundColor: 'white',
                borderColor: '#d1d5db',
                color: '#374151'
              }}
            >
              🔴 <span className="ml-1 text-xs sm:text-sm">Important</span>
            </Button>
            <Button
              variant={selectedFilter === "general" ? "default" : "outline"}
              onClick={() => setSelectedFilter("general")}
              size="sm"
              className="touch-manipulation"
              style={selectedFilter === "general" ? {
                backgroundColor: '#1e40af',
                borderColor: '#1e40af',
                color: 'white',
                fontWeight: '600'
              } : {
                backgroundColor: 'white',
                borderColor: '#d1d5db',
                color: '#374151'
              }}
            >
              🔵 <span className="ml-1 text-xs sm:text-sm">General</span>
            </Button>
            <Button
              variant={selectedFilter === "policy" ? "default" : "outline"}
              onClick={() => setSelectedFilter("policy")}
              size="sm"
              className="touch-manipulation"
              style={selectedFilter === "policy" ? {
                backgroundColor: '#7c3aed',
                borderColor: '#7c3aed',
                color: 'white',
                fontWeight: '600'
              } : {
                backgroundColor: 'white',
                borderColor: '#d1d5db',
                color: '#374151'
              }}
            >
              📋 <span className="ml-1 text-xs sm:text-sm">Policy</span>
            </Button>
            </div>
          </div>

          {/* Announcements List */}
          {filteredAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No matching announcements</h3>
                <p className="text-gray-500">
                  There are no announcements matching your current filter.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Current Announcements */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {selectedFilter === "all" ? "Current Announcements" : 
                   selectedFilter === "important" ? "Important Announcements" :
                   selectedFilter === "general" ? "General Announcements" :
                   "Policy Updates"}
                </h2>
                <div className="space-y-3 md:space-y-4">
                  {filteredAnnouncements.map((announcement) => (
                    <Card key={announcement.id} className="shadow-md hover:shadow-lg transition-shadow touch-manipulation">
                      <CardHeader className="pb-3 md:pb-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1 min-w-0">
                            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 leading-tight">
                              {announcement.title}
                            </CardTitle>
                          </div>
                          <div className="flex flex-col items-end space-y-1 sm:space-y-2 flex-shrink-0">
                            <Badge className={`text-xs ${getPriorityColor(announcement.priority)}`}>
                              {announcement.priority}
                            </Badge>
                            {announcement.smsEnabled && (
                              <Badge variant="outline" className="text-xs text-blue-600 border-blue-600">
                                📱 SMS
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 md:space-y-4 pt-0">
                        <p className="text-gray-700 leading-relaxed text-sm md:text-base">
                          {announcement.content}
                        </p>
                        
                        {/* Message Reactions */}
                        <MessageReactions 
                          messageId={announcement.id} 
                        />
                        
                        {/* Announcement Responses */}
                        <AnnouncementResponses announcementId={announcement.id} />
                        
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-3 md:pt-4 border-t border-gray-200 gap-2">
                          <div className="flex flex-col sm:flex-row sm:items-center text-xs sm:text-sm text-gray-500 gap-2 sm:gap-4">
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              Published {format(parseISO(announcement.createdAt), "MMM d")}
                              <span className="hidden sm:inline">, {format(parseISO(announcement.createdAt), "yyyy")}</span>
                            </span>
                            <span className="flex items-center">
                              {getTargetAudienceIcon(announcement.targetAudience)}
                              <span className="ml-1">{formatAudience(announcement.targetAudience)}</span>
                            </span>
                          </div>
                          {announcement.expiresAt && (
                            <span className="flex items-center text-xs sm:text-sm text-orange-600">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="hidden sm:inline">Expires </span>
                              {format(parseISO(announcement.expiresAt), "MMM d")}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Expired Announcements */}
              {expiredAnnouncements.length > 0 && selectedFilter === "all" && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Expired Announcements
                  </h2>
                  <div className="space-y-4">
                    {expiredAnnouncements.map((announcement) => (
                      <Card key={announcement.id} className="opacity-60">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-xl font-semibold text-gray-900">
                                {announcement.title}
                              </CardTitle>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              <Badge className={getPriorityColor(announcement.priority)}>
                                {announcement.priority}
                              </Badge>
                              <Badge variant="outline" className="text-red-600 border-red-600">
                                Expired
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-gray-700 leading-relaxed">
                            {announcement.content}
                          </p>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <div className="flex items-center text-sm text-gray-500 space-x-4">
                              <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                Published {format(parseISO(announcement.createdAt), "MMM d, yyyy")}
                              </span>
                              <span className="flex items-center">
                                {getTargetAudienceIcon(announcement.targetAudience)}
                                <span className="ml-1">{formatAudience(announcement.targetAudience)}</span>
                              </span>
                            </div>
                            {announcement.expiresAt && (
                              <span className="flex items-center text-sm text-red-600">
                                <Clock className="h-4 w-4 mr-1" />
                                Expired {format(parseISO(announcement.expiresAt), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Direct Messages</h3>
              <p className="text-gray-500 mb-4">
                Direct messaging functionality will be implemented in Phase 3.
              </p>
              <p className="text-sm text-gray-400">
                This will include one-on-one conversations, group chats, and SMS integration.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            <AnalyticsDashboard />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CommunicationsPage() {
  return (
    <AdminLayout currentTab="communications">
      <div className="space-y-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            📢 Communications Hub
          </h2>
          <p className="text-gray-600">
            Unified platform for announcements, messages, and team communication with SMS integration.
          </p>
        </div>
        <CommunicationsContent />
      </div>
    </AdminLayout>
  );
}