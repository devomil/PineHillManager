import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, Calendar, Users, AlertTriangle, Clock, Plus, Send, MessageSquare, BarChart3, Wifi, WifiOff, TrendingUp, Activity, DollarSign, CheckCircle, CalendarCheck, Edit, Trash2, Search, X, Check } from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, isAfter, parseISO } from "date-fns";
import AdminLayout from "@/components/admin-layout";
import { MessageReactions } from "@/components/ui/message-reactions";
import { AnnouncementResponses } from "@/components/ui/announcement-responses";
import { MessageResponses } from "@/components/ui/message-responses";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getPriorityStyle, getCategoryStyle, getPriorityEmoji, getCategoryEmoji } from "@shared/template-utils";
import { useWebSocket, useWebSocketSubscription } from "@/lib/websocket";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { UnreadIndicator } from "@/components/ui/unread-indicator";

interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: string;
  targetAudience: string;
  targetEmployees?: string[];
  authorName: string;
  createdAt: string;
  expiresAt?: string;
  smsEnabled: boolean;
  reactions?: any[];
  imageUrls?: string[];
}

interface Communication {
  id: number;
  type: 'announcement' | 'direct_message' | 'group_message';
  title: string;
  content: string;
  priority: string;
  smsEnabled: boolean;
  targetAudience: string;
  targetEmployees?: string[];
  authorName: string;
  createdAt: string;
  scheduledFor?: string;
  status: string;
}

interface ScheduledMessage {
  id: number;
  title: string;
  content: string;
  scheduledFor: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  priority: string;
  targetAudience: string;
  targetEmployees?: string[];
  smsEnabled: boolean;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  failureReason?: string;
}

interface AnnouncementTemplate {
  id: number;
  name: string;
  category: string;
  title: string;
  content: string;
  variables: string[];
  useCount: number;
  lastUsedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  smsEnabled?: boolean;
  emoji?: string;
}

// Priority and type definitions
const PRIORITY_OPTIONS = ['urgent', 'high', 'normal', 'low'] as const;
type Priority = typeof PRIORITY_OPTIONS[number];

// Communication Overview Interface
interface CommunicationOverview {
  totalMessages: number;
  totalAnnouncements: number;
  smsDelivered: number;
  averageDeliveryRate: number;
  averageEngagementRate: number;
  totalReactions: number;
  totalCost: number;
}

// Admin Stats Interface
interface AdminStats {
  totalEmployees: number;
  pendingRequests?: number;
  totalAdmins?: number;
  totalManagers?: number;
}

// Chart colors
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

// Utility functions
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
    case 'specific': return 'Selected Recipients';  // Handle specific targeting
    default: return audience.charAt(0).toUpperCase() + audience.slice(1);
  }
};

// Function to format audience based on selected employees, recipients, or recipient_id
const formatMessageAudience = (message: any, employees: any[] = []) => {
  // For direct messages with recipients array (from readReceipts), show recipient names
  if (message.recipients && Array.isArray(message.recipients) && message.recipients.length > 0) {
    if (message.recipients.length === 1) {
      const recipient = message.recipients[0];
      return `${recipient.firstName} ${recipient.lastName}`;
    } else if (message.recipients.length === 2) {
      return `${message.recipients[0].firstName} ${message.recipients[0].lastName} & ${message.recipients[1].firstName} ${message.recipients[1].lastName}`;
    } else if (message.recipients.length <= 10) {
      // Show up to 10 recipient names, separated by commas with & before the last one
      const names = message.recipients.map((r: any) => `${r.firstName} ${r.lastName}`);
      const lastRecipient = names.pop();
      return `${names.join(', ')} & ${lastRecipient}`;
    } else {
      return `${message.recipients.length} Recipients`;
    }
  }
  
  // For direct messages with a recipient_id, show the recipient's name
  if (message.recipientId) {
    const recipient = employees?.find(emp => emp.id === message.recipientId);
    if (recipient) {
      return `${recipient.firstName} ${recipient.lastName}`;
    }
  }
  
  // Handle different formats of targetEmployees (array, string, or PostgreSQL array format)
  let targetEmployeeIds: string[] = [];
  
  if (message.targetEmployees) {
    if (Array.isArray(message.targetEmployees)) {
      targetEmployeeIds = message.targetEmployees;
    } else if (typeof message.targetEmployees === 'string') {
      // Handle PostgreSQL array format like "{emp_1748972869348_lpavu3oa7}"
      if (message.targetEmployees.startsWith('{') && message.targetEmployees.endsWith('}')) {
        targetEmployeeIds = message.targetEmployees.slice(1, -1).split(',').map((id: string) => id.trim());
      } else {
        targetEmployeeIds = [message.targetEmployees];
      }
    }
  }
  
  // If specific employees are selected, show their names
  if (targetEmployeeIds.length > 0) {

    const selectedEmployees = employees?.filter(emp => 
      targetEmployeeIds.includes(emp.id)
    ) || [];
    
    if (selectedEmployees.length > 0) {
      if (selectedEmployees.length === 1) {
        return `${selectedEmployees[0].firstName} ${selectedEmployees[0].lastName}`;
      } else if (selectedEmployees.length === 2) {
        return `${selectedEmployees[0].firstName} ${selectedEmployees[0].lastName} & ${selectedEmployees[1].firstName} ${selectedEmployees[1].lastName}`;
      } else if (selectedEmployees.length <= 4) {
        return `${selectedEmployees.length} Selected Employees`;
      } else {
        return `${selectedEmployees.length} Employees`;
      }
    }
  }
  
  // Default to the audience type
  return formatAudience(message.targetAudience);
};

const isExpired = (expiresAt?: string) => {
  if (!expiresAt) return false;
  return isAfter(new Date(), parseISO(expiresAt));
};

// Employee Selection Component
function EmployeeSelector({ 
  employees, 
  selectedEmployees, 
  onEmployeesChange, 
  searchQuery, 
  onSearchChange, 
  maxSelections = 10,
  isVisible = false,
  onVisibilityChange 
}: {
  employees: any[],
  selectedEmployees: string[],
  onEmployeesChange: (ids: string[]) => void,
  searchQuery: string,
  onSearchChange: (query: string) => void,
  maxSelections?: number,
  isVisible: boolean,
  onVisibilityChange: (visible: boolean) => void
}) {
  
  const filteredEmployees = employees.filter(emp => 
    emp.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleEmployee = (employeeId: string) => {
    if (selectedEmployees.includes(employeeId)) {
      onEmployeesChange(selectedEmployees.filter(id => id !== employeeId));
    } else if (selectedEmployees.length < maxSelections) {
      onEmployeesChange([...selectedEmployees, employeeId]);
    }
  };

  const getSelectedEmployeeNames = () => {
    return selectedEmployees
      .map(id => employees.find(emp => emp.id === id))
      .filter(emp => emp)
      .map(emp => `${emp.firstName} ${emp.lastName}`)
      .slice(0, 3)
      .join(', ') + (selectedEmployees.length > 3 ? ` +${selectedEmployees.length - 3} more` : '');
  };

  if (!isVisible) {
    return (
      <div>
        <Label>Specific Employees (Optional)</Label>
        <Button 
          type="button"
          variant="outline" 
          onClick={() => onVisibilityChange(true)}
          className="w-full justify-between"
        >
          <span>
            {selectedEmployees.length === 0 
              ? "Select up to 10 employees..." 
              : `${selectedEmployees.length} selected: ${getSelectedEmployeeNames()}`
            }
          </span>
          <Search className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Label>Select Employees ({selectedEmployees.length}/{maxSelections})</Label>
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search employees by name, email, or department..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onVisibilityChange(false)}
            className="absolute right-2 top-2 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {selectedEmployees.length > 0 && (
          <div className="flex flex-wrap gap-1 p-2 bg-blue-50 rounded">
            {selectedEmployees.map(employeeId => {
              const employee = employees.find(emp => emp.id === employeeId);
              return employee ? (
                <Badge 
                  key={employeeId} 
                  variant="secondary"
                  className="bg-blue-100 text-blue-800 flex items-center gap-1"
                >
                  {employee.firstName} {employee.lastName}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => toggleEmployee(employeeId)}
                  />
                </Badge>
              ) : null;
            })}
          </div>
        )}
        
        <div className="max-h-32 overflow-y-auto border rounded">
          {filteredEmployees.length === 0 ? (
            <div className="p-3 text-center text-gray-500">
              {searchQuery ? "No employees found matching your search" : "No employees available"}
            </div>
          ) : (
            filteredEmployees.map(employee => (
              <div 
                key={employee.id}
                onClick={() => toggleEmployee(employee.id)}
                className={`p-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                  selectedEmployees.includes(employee.id) ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                } ${
                  !selectedEmployees.includes(employee.id) && selectedEmployees.length >= maxSelections 
                    ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div>
                  <div className="font-medium">
                    {employee.firstName} {employee.lastName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {employee.email} • {employee.department} • {employee.role}
                  </div>
                </div>
                {selectedEmployees.includes(employee.id) && (
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

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
    }
    
    // Cleanup function will run on component unmount
    return () => {
      if (send) {
        send({ type: 'unsubscribe', channel: 'analytics' });
      }
    };
  }, []); // Remove dependencies to prevent re-subscription cycles

  // Listen for real-time analytics updates
  const { messages: analyticsMessages, isConnected: wsConnected } = useWebSocketSubscription('analytics');

  useEffect(() => {
    if (analyticsMessages.length > 0) {
      const lastMessage = analyticsMessages[analyticsMessages.length - 1];
      
      if (lastMessage.type === 'analytics_update') {
        console.log('📊 Real-time analytics update:', (lastMessage as any).eventType, lastMessage.data);
        
        switch ((lastMessage as any).eventType) {
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

  // Form state for creating communications (admin/manager only)
  const [formData, setFormData] = useState({
    type: 'announcement' as 'announcement' | 'group_message', // Removed direct_message from admin interface
    title: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    targetAudience: 'all',
    targetEmployees: [] as string[],
    smsEnabled: true,
    scheduledFor: '',
    imageUrls: [] as string[]
  });
  
  // Form state for direct messages (available to all employees)
  const [directMessageData, setDirectMessageData] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    targetEmployees: [] as string[],
    smsEnabled: true,
    imageUrls: [] as string[]
  });
  
  // Dialog states
  const [showDirectMessageDialog, setShowDirectMessageDialog] = useState(false);
  
  // Employee search state for regular communications
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [showEmployeeSelector, setShowEmployeeSelector] = useState(false);
  
  // Employee search state for direct messages
  const [directMessageSearchQuery, setDirectMessageSearchQuery] = useState('');
  const [showDirectMessageEmployeeSelector, setShowDirectMessageEmployeeSelector] = useState(false);
  
  // Employee search state for scheduled messages  
  const [scheduledEmployeeSearchQuery, setScheduledEmployeeSearchQuery] = useState('');
  const [showScheduledEmployeeSelector, setShowScheduledEmployeeSelector] = useState(false);

  // Fetch employees for targeting
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await fetch("/api/employees", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch employees");
      return response.json();
    },
    retry: 1,
  });
  
  // Fetch announcements (existing functionality)
  // Fetch traditional announcements
  const { data: legacyAnnouncements = [], isLoading: legacyLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements/published"],
    queryFn: async () => {
      const response = await fetch("/api/announcements/published", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch announcements");
      return response.json();
    },
    retry: 1,
  });

  // Fetch new communication messages (announcements and direct messages)  
  const { data: communicationMessages = [], isLoading: messagesLoading } = useQuery<any[]>({
    queryKey: ["/api/messages", "v3"],
    queryFn: async () => {
      console.log("🔄 FETCHING /api/messages with queryKey v3");
      const response = await fetch("/api/messages", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      console.log("📦 Received", data.length, "messages from /api/messages");
      
      // Debug: Check if any messages have imageUrls
      const messagesWithImages = data.filter((msg: any) => msg.imageUrls && msg.imageUrls.length > 0);
      if (messagesWithImages.length > 0) {
        console.log("📸 Messages with images:", messagesWithImages.map((msg: any) => ({ 
          subject: msg.subject, 
          imageUrls: msg.imageUrls 
        })));
      } else {
        console.log("❌ No messages with imageUrls found in response");
      }
      
      return data;
    },
    retry: 1,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Combine legacy announcements with new announcement-type messages
  const announcements = [
    ...legacyAnnouncements,
    ...communicationMessages
      .filter(msg => msg.messageType === 'announcement')
      .map(msg => ({
        id: `msg_${msg.id}`, // Prefix to avoid ID conflicts with legacy announcements
        title: msg.subject || 'Announcement',
        content: msg.content,
        priority: msg.priority || 'normal',
        smsEnabled: msg.smsEnabled || false,
        createdAt: msg.sentAt,
        expiresAt: null, // New messages don't have expiration
        targetAudience: msg.targetAudience || 'all',
        messageType: msg.messageType,
        isNewMessage: true // Flag to identify new messages
      }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const announcementsLoading = legacyLoading || messagesLoading;

  // Phase 6: Fetch scheduled messages
  const { data: scheduledMessages = [], isLoading: scheduledLoading } = useQuery<ScheduledMessage[]>({
    queryKey: ["/api/scheduled-messages"],
    queryFn: async () => {
      const response = await fetch("/api/scheduled-messages", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch scheduled messages");
      return response.json();
    },
    retry: 1,
  });

  // Phase 6: Fetch announcement templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery<AnnouncementTemplate[]>({
    queryKey: ["/api/announcement-templates"],
    queryFn: async () => {
      const response = await fetch("/api/announcement-templates", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch templates");
      return response.json();
    },
    retry: 1,
  });

  // Create communication mutation
  const createCommunicationMutation = useMutation({
    mutationFn: async (data: any) => {
      // Route announcements to correct endpoint for proper database storage
      if (data.type === 'announcement' || data.messageType === 'announcement') {
        const announcementData = {
          title: data.title,
          content: data.content,
          priority: data.priority,
          targetAudience: data.targetAudience,
          targetEmployees: data.targetEmployees,
          smsEnabled: data.smsEnabled,
          imageUrls: data.imageUrls || [],
          action: 'publish'  // Auto-publish announcements for SMS threading
        };
        return apiRequest('POST', '/api/announcements', announcementData);
      } else {
        // Regular messages use communications endpoint
        const mappedData = {
          subject: data.title,           // Server expects 'subject' not 'title'
          content: data.content,
          priority: data.priority,
          messageType: data.type,
          smsEnabled: data.smsEnabled,
          recipientMode: data.targetEmployees?.length > 0 ? 'individual' : 'audience',
          targetAudience: data.targetAudience,
          recipients: data.targetEmployees || [],  // Server expects 'recipients' not 'targetEmployees'
          imageUrls: data.imageUrls || []
        };
        return apiRequest('POST', '/api/communications/send', mappedData);
      }
    },
    onSuccess: () => {
      toast({ title: "Communication sent successfully!" });
      setShowCreateDialog(false);
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/messages", "v2"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/published"] });
      
      // Force refetch to show new data immediately
      queryClient.refetchQueries({ queryKey: ["/api/messages", "v2"] });
      setFormData({
        type: 'announcement',
        title: '',
        content: '',
        priority: 'normal',
        targetAudience: 'all',
        targetEmployees: [],
        smsEnabled: true,
        scheduledFor: '',
        imageUrls: []
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error sending communication", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Direct message mutation for all employees
  const createDirectMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const mappedData = {
        subject: data.title,
        content: data.content,
        priority: data.priority,
        messageType: 'direct_message',
        smsEnabled: data.smsEnabled,
        recipientMode: 'individual',
        recipients: data.targetEmployees,
        imageUrls: data.imageUrls || []
      };
      return apiRequest('POST', '/api/communications/send', mappedData);
    },
    onSuccess: () => {
      toast({ title: "✅ Direct message sent successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/messages", "v2"] });
      setShowDirectMessageDialog(false);
      // Reset direct message form
      setDirectMessageData({
        title: '',
        content: '',
        priority: 'normal',
        targetEmployees: [],
        smsEnabled: true,
        imageUrls: []
      });
      setShowDirectMessageEmployeeSelector(false);
      setDirectMessageSearchQuery('');
    },
    onError: (error: any) => {
      console.error('Direct message creation error:', error);
      toast({ 
        title: "❌ Failed to send direct message", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    }
  });

  // Phase 6: Create scheduled message mutation
  const createScheduledMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/scheduled-messages', data);
    },
    onSuccess: () => {
      toast({ title: "✅ Message scheduled successfully!" });
      setShowCreateDialog(false);
      setFormData({
        type: 'announcement',
        title: '',
        content: '',
        priority: 'normal',
        targetAudience: 'all',
        targetEmployees: [],
        smsEnabled: true,
        scheduledFor: '',
        imageUrls: []
      });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-messages"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to schedule message", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    }
  });

  // Phase 6: Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/announcement-templates', data);
    },
    onSuccess: () => {
      toast({ title: "📋 Template created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/announcement-templates"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create template", 
        description: error.message || "Please try again",
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

  const handleCreateDirectMessage = () => {
    if (!directMessageData.title.trim() || !directMessageData.content.trim()) {
      toast({ 
        title: "Missing required fields", 
        description: "Please fill in title and content",
        variant: "destructive" 
      });
      return;
    }

    if (!directMessageData.targetEmployees || directMessageData.targetEmployees.length === 0) {
      toast({ 
        title: "No recipients selected", 
        description: "Please select at least one employee to message",
        variant: "destructive" 
      });
      return;
    }

    createDirectMessageMutation.mutate(directMessageData);
  };

  // Utility functions are now defined at top level

  // Filter announcements
  const getFilteredAnnouncements = () => {
    const activeAnnouncements = announcements.filter(announcement => !isExpired(announcement.expiresAt || undefined));
    
    if (selectedFilter === "all") return activeAnnouncements;
    if (selectedFilter === "important") return activeAnnouncements.filter(a => a.priority === "urgent" || a.priority === "high");
    if (selectedFilter === "general") return activeAnnouncements.filter(a => a.priority === "normal" || a.priority === "low");
    if (selectedFilter === "policy") return activeAnnouncements.filter(a => a.title.toLowerCase().includes("policy"));
    
    return activeAnnouncements;
  };

  const filteredAnnouncements = getFilteredAnnouncements();
  const expiredAnnouncements = announcements.filter(announcement => isExpired(announcement.expiresAt || undefined));

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
      {/* Redesigned Header with Prominent Direct Message Button */}
      <div className="space-y-4">
        {/* Primary Action Bar - Direct Message (Available to ALL users) */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Quick Communication
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Send direct messages to team members instantly
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Send Direct Message Button - PRIMARY BUTTON for all users */}
            <Dialog open={showDirectMessageDialog} onOpenChange={setShowDirectMessageDialog}>
              <DialogTrigger asChild>
                <Button 
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex-1 sm:flex-none min-w-[200px]"
                  data-testid="button-send-direct-message"
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Send Direct Message
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
              <DialogHeader>
                <DialogTitle>Send Direct Message</DialogTitle>
                <DialogDescription>
                  Send a private message to specific team members
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Title */}
                <div>
                  <Label htmlFor="dm-title">Subject</Label>
                  <Input
                    id="dm-title"
                    value={directMessageData.title}
                    onChange={(e) => setDirectMessageData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter message subject"
                    data-testid="input-direct-message-title"
                  />
                </div>

                {/* Content */}
                <div>
                  <Label htmlFor="dm-content">Message Content</Label>
                  <Textarea
                    id="dm-content"
                    value={directMessageData.content}
                    onChange={(e) => setDirectMessageData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter your message content"
                    rows={4}
                    data-testid="input-direct-message-content"
                  />
                </div>

                {/* Photo Upload - Available to all users for messages */}
                <div>
                  <Label>📷 Attach Photos</Label>
                  <PhotoUpload
                    onPhotosUploaded={(imageUrls) => setDirectMessageData(prev => ({ ...prev, imageUrls }))}
                    maxFiles={5}
                    placeholder="Add photos to your message (drag, paste, or click)"
                    className="mt-2"
                  />
                </div>

                {/* Priority */}
                <div>
                  <Label htmlFor="dm-priority">Priority Level</Label>
                  <Select 
                    value={directMessageData.priority} 
                    onValueChange={(value: 'low' | 'normal' | 'high' | 'urgent') => setDirectMessageData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger id="dm-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <span>💬</span>
                          <span>Low Priority</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="normal">
                        <div className="flex items-center gap-2">
                          <span>📢</span>
                          <span>Normal Priority</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          <span>⚠️</span>
                          <span>High Priority</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="urgent">
                        <div className="flex items-center gap-2">
                          <span>🚨</span>
                          <span>Urgent</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Employee Selector for Direct Messages */}
                <EmployeeSelector
                  employees={employees}
                  selectedEmployees={directMessageData.targetEmployees}
                  onEmployeesChange={(selectedIds) => setDirectMessageData(prev => ({ ...prev, targetEmployees: selectedIds }))}
                  searchQuery={directMessageSearchQuery}
                  onSearchChange={setDirectMessageSearchQuery}
                  isVisible={showDirectMessageEmployeeSelector}
                  onVisibilityChange={setShowDirectMessageEmployeeSelector}
                />

                {/* SMS Enabled */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="dm-smsEnabled"
                    checked={directMessageData.smsEnabled}
                    onChange={(e) => setDirectMessageData(prev => ({ ...prev, smsEnabled: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="dm-smsEnabled">📱 Send SMS notifications</Label>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDirectMessageDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateDirectMessage}
                  disabled={createDirectMessageMutation.isPending}
                  className="w-full sm:w-auto touch-manipulation"
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {createDirectMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          </div>
        </div>

        {/* Admin/Manager Communication Tools - Separate Section */}
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                Management Communications
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create announcements and group communications for teams
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button 
                    size="lg"
                    className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg flex-1 sm:flex-none min-w-[200px]"
                    data-testid="button-create-communication"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Communication
                  </Button>
                </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
              <DialogHeader>
                <DialogTitle>Create New Communication</DialogTitle>
                <DialogDescription>
                  Send announcements or group communications to teams
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
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">📢 Announcement</SelectItem>
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

                {/* Photo Upload - Only for Admin/Manager users in announcements */}
                {(user?.role === 'admin' || user?.role === 'manager') && (
                  <div>
                    <Label>📷 Attach Photos</Label>
                    <PhotoUpload
                      onPhotosUploaded={(imageUrls) => setFormData(prev => ({ ...prev, imageUrls }))}
                      maxFiles={5}
                      placeholder="Add photos to your announcement (drag, paste, or click)"
                      className="mt-2"
                    />
                  </div>
                )}

                {/* Professional Templates */}
                {templates && templates.length > 0 && (
                  <div>
                    <Label htmlFor="template">📋 Use Professional Template</Label>
                    <Select 
                      value=""
                      onValueChange={(templateId) => {
                        const template = templates.find(t => t.id.toString() === templateId);
                        if (template) {
                          setFormData(prev => ({
                            ...prev,
                            title: template.title,
                            content: template.content,
                            priority: template.priority || 'normal',
                            smsEnabled: template.smsEnabled || false
                          }));
                        }
                      }}
                    >
                      <SelectTrigger id="template">
                        <SelectValue placeholder="Choose a professional template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => {
                          const categoryStyle = getCategoryStyle(template.category);
                          const priorityStyle = getPriorityStyle(template.priority || 'normal');
                          return (
                            <SelectItem 
                              key={template.id} 
                              value={template.id.toString()}
                              className="flex flex-col items-start"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <span className="text-lg">{template.emoji || getCategoryEmoji(template.category)}</span>
                                <div className="flex-1">
                                  <div className="font-medium">{template.name}</div>
                                  <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                    <Badge className={`text-xs ${categoryStyle.bg} ${categoryStyle.color}`}>
                                      {template.category}
                                    </Badge>
                                    <Badge className={`text-xs ${priorityStyle.bg} ${priorityStyle.color}`}>
                                      {getPriorityEmoji(template.priority || 'normal')} {template.priority || 'normal'}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select a template to automatically fill in title, content, and settings
                    </p>
                  </div>
                )}

                {/* Enhanced Priority with Emojis */}
                <div>
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value: Priority) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <span>💬</span>
                          <span>Low Priority</span>
                          <Badge className="text-xs bg-gray-100 text-gray-700">General info</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="normal">
                        <div className="flex items-center gap-2">
                          <span>📢</span>
                          <span>Normal Priority</span>
                          <Badge className="text-xs bg-blue-100 text-blue-700">Standard</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          <span>⚠️</span>
                          <span>High Priority</span>
                          <Badge className="text-xs bg-orange-100 text-orange-700">Important</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="urgent">
                        <div className="flex items-center gap-2">
                          <span>🚨</span>
                          <span>Urgent</span>
                          <Badge className="text-xs bg-red-100 text-red-700">Urgent action required</Badge>
                        </div>
                      </SelectItem>
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
                    <SelectTrigger id="audience">
                      <SelectValue asChild>
                        <span>
                          {(() => {
                            // Show selected employees if any are chosen
                            if (formData.targetEmployees && formData.targetEmployees.length > 0) {
                              const selectedEmployees = employees?.filter(emp => 
                                formData.targetEmployees.includes(emp.id)
                              ) || [];
                              
                              if (selectedEmployees.length === 1) {
                                return `${selectedEmployees[0].firstName} ${selectedEmployees[0].lastName}`;
                              } else if (selectedEmployees.length === 2) {
                                return `${selectedEmployees[0].firstName} ${selectedEmployees[0].lastName} & ${selectedEmployees[1].firstName} ${selectedEmployees[1].lastName}`;
                              } else if (selectedEmployees.length <= 4) {
                                return `${selectedEmployees.length} Selected Employees`;
                              } else {
                                return `${selectedEmployees.length} Employees`;
                              }
                            }
                            
                            // Default to audience type
                            return formatAudience(formData.targetAudience);
                          })()} 
                        </span>
                      </SelectValue>
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

                {/* Employee Selector */}
                <EmployeeSelector
                  employees={employees}
                  selectedEmployees={formData.targetEmployees}
                  onEmployeesChange={(selectedIds) => {
                    console.log('🎯 Employee selection changed:', selectedIds);
                    setFormData(prev => ({ 
                      ...prev, 
                      targetEmployees: selectedIds,
                      // Update targetAudience based on selection
                      targetAudience: selectedIds.length > 0 ? 'specific' : 'all'
                    }));
                  }}
                  searchQuery={employeeSearchQuery}
                  onSearchChange={setEmployeeSearchQuery}
                  isVisible={showEmployeeSelector}
                  onVisibilityChange={setShowEmployeeSelector}
                />

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
            </div>
          </div>
        )}

        {/* Connection Status and System Info */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span>Real-time updates active</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-orange-500" />
                <span>Connecting...</span>
              </>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Communication Hub
          </div>
        </div>
      </div>

      {/* Mobile-First Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        {/* Mobile Dropdown Navigation */}
        <div className="block sm:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full bg-white border border-gray-200">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {activeTab === 'announcements' && (
                    <>
                      <Bell className="w-4 h-4" />
                      <span>Announcements</span>
                    </>
                  )}
                  {activeTab === 'messages' && (
                    <>
                      <MessageSquare className="w-4 h-4" />
                      <span>Messages</span>
                    </>
                  )}
                  {activeTab === 'scheduled' && (
                    <>
                      <CalendarCheck className="w-4 h-4" />
                      <span>Scheduled</span>
                    </>
                  )}
                  {activeTab === 'analytics' && (
                    <>
                      <BarChart3 className="w-4 h-4" />
                      <span>Analytics</span>
                    </>
                  )}
                  {activeTab === 'admin' && (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      <span>Admin KPIs</span>
                    </>
                  )}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="announcements">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  <span>Announcements</span>
                  <UnreadIndicator type="announcements" className="ml-auto" />
                </div>
              </SelectItem>
              <SelectItem value="messages">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Messages</span>
                  <UnreadIndicator type="messages" className="ml-auto" />
                </div>
              </SelectItem>
              <SelectItem value="scheduled">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4" />
                  <span>Scheduled</span>
                </div>
              </SelectItem>
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <SelectItem value="analytics">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    <span>Analytics</span>
                  </div>
                </SelectItem>
              )}
              {user?.role === 'admin' && (
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Admin KPIs</span>
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop Tabs Navigation */}
        <TabsList className="hidden sm:grid sm:grid-cols-5 lg:w-auto bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="announcements" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium">
            <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Announcements</span>
            <UnreadIndicator type="announcements" className="ml-1" />
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium">
            <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Messages</span>
            <UnreadIndicator type="messages" className="ml-1" />
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium">
            <CalendarCheck className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Scheduled</span>
          </TabsTrigger>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Analytics</span>
            </TabsTrigger>
          )}
          {user?.role === 'admin' && (
            <TabsTrigger value="admin" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Admin KPIs</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-6">
          {/* Header with Mark All as Read */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Current Announcements</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await apiRequest('POST', '/api/communications/mark-all-announcements-read');
                  // Refresh unread counts
                  queryClient.invalidateQueries({ queryKey: ['/api/communications/unread-counts'] });
                } catch (error) {
                  console.error('Failed to mark all announcements as read:', error);
                }
              }}
              className="flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Mark All Read</span>
            </Button>
          </div>
          
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
                            {/* Author Information */}
                            {announcement.authorId && (
                              <div className="flex items-center gap-2 mt-1">
                                <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                                  <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                                    {(() => {
                                      const author = employees?.find(emp => emp.id === announcement.authorId);
                                      return author ? `${author.firstName[0]}${author.lastName[0]}` : '??';
                                    })()} 
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs sm:text-sm text-gray-600">
                                  {(() => {
                                    const author = employees?.find(emp => emp.id === announcement.authorId);
                                    return author ? `${author.firstName} ${author.lastName}` : 'Unknown Author';
                                  })()}
                                </span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500">Author</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end space-y-1 sm:space-y-2 flex-shrink-0">
                            <Badge className={`text-xs ${getPriorityColor(announcement.priority)}`}>
                              {getPriorityEmoji(announcement.priority)} {announcement.priority}
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
                        
                        {/* Image Gallery */}
                        {announcement.imageUrls && announcement.imageUrls.length > 0 && (
                          <div className="mt-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {announcement.imageUrls.map((imageUrl: string, index: number) => (
                                <div 
                                  key={index} 
                                  className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition-opacity cursor-pointer"
                                  data-testid={`image-announcement-${announcement.id}-${index}`}
                                >
                                  <img
                                    src={imageUrl}
                                    alt={`Announcement image ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Message Reactions */}
                        {typeof announcement.id === 'number' && announcement.id > 0 && (
                          <MessageReactions 
                            announcementId={announcement.id} 
                          />
                        )}
                        
                        {/* Announcement Responses */}
                        {typeof announcement.id === 'number' && announcement.id > 0 && (
                          <AnnouncementResponses announcementId={announcement.id} />
                        )}
                        
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-3 md:pt-4 border-t border-gray-200 gap-2">
                          <div className="flex flex-col sm:flex-row sm:items-center text-xs sm:text-sm text-gray-500 gap-2 sm:gap-4">
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              Published {format(parseISO(announcement.createdAt), "MMM d")}
                              <span className="hidden sm:inline">, {format(parseISO(announcement.createdAt), "yyyy")}</span>
                            </span>
                            <span className="flex items-center">
                              {getTargetAudienceIcon(announcement.targetAudience)}
                              <span className="ml-1">{formatMessageAudience(announcement, employees)}</span>
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
                              {/* Author Information for Expired Announcements */}
                              {announcement.authorId && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                                    <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                                      {(() => {
                                        const author = employees?.find(emp => emp.id === announcement.authorId);
                                        return author ? `${author.firstName[0]}${author.lastName[0]}` : '??';
                                      })()} 
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs sm:text-sm text-gray-500">
                                    {(() => {
                                      const author = employees?.find(emp => emp.id === announcement.authorId);
                                      return author ? `${author.firstName} ${author.lastName}` : 'Unknown Author';
                                    })()}
                                  </span>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-400">Author</span>
                                </div>
                              )}
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
                                <span className="ml-1">{formatMessageAudience(announcement, employees)}</span>
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
          {/* Header with Mark All as Read */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Direct Messages</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await apiRequest('POST', '/api/communications/mark-all-messages-read');
                  // Refresh unread counts
                  queryClient.invalidateQueries({ queryKey: ['/api/communications/unread-counts'] });
                } catch (error) {
                  console.error('Failed to mark all messages as read:', error);
                }
              }}
              className="flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Mark All Read</span>
            </Button>
          </div>
          
          {messagesLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading messages...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {communicationMessages
                .filter(msg => msg.messageType === 'direct_message')
                .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
                .map((message) => (
                  <Card key={message.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <CardTitle className="text-lg font-semibold text-gray-900">
                            {message.subject || 'Direct Message'}
                          </CardTitle>
                          {/* Sender Information */}
                          {message.senderId && (
                            <div className="flex items-center gap-2 mt-1">
                              <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                                <AvatarFallback className="text-xs bg-green-100 text-green-700">
                                  {(() => {
                                    const sender = employees?.find(emp => emp.id === message.senderId);
                                    return sender ? `${sender.firstName[0]}${sender.lastName[0]}` : '??';
                                  })()} 
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs sm:text-sm text-gray-600">
                                {(() => {
                                  const sender = employees?.find(emp => emp.id === message.senderId);
                                  return sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown Sender';
                                })()}
                              </span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">Sender</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <Badge className={`text-xs ${getPriorityColor(message.priority)}`}>
                            {message.priority}
                          </Badge>
                          {message.smsEnabled && (
                            <Badge variant="outline" className="text-xs text-blue-600 border-blue-600">
                              📱 SMS
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <p className="text-gray-700 leading-relaxed">
                        {message.content}
                      </p>
                      
                      {/* Image Gallery */}
                      {message.imageUrls && message.imageUrls.length > 0 && (
                        <div className="mt-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {message.imageUrls.map((imageUrl: string, index: number) => (
                              <div 
                                key={index} 
                                className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition-opacity cursor-pointer"
                                data-testid={`image-message-${message.id}-${index}`}
                              >
                                <img
                                  src={imageUrl}
                                  alt={`Message image ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Message Reactions - Use messageId for direct messages */}
                      <div className="pt-3 border-t border-gray-200">
                        <MessageReactions messageId={message.id} />
                      </div>
                      
                      {/* Message Responses - Use messageId for direct messages */}
                      <div className="pt-2">
                        <MessageResponses messageId={message.id} />
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          Sent {format(parseISO(message.sentAt), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                        <div className="text-sm text-gray-500">
                          To: {formatMessageAudience(message, employees)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              
              {communicationMessages.filter(msg => msg.messageType === 'direct_message').length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Messages Yet</h3>
                    <p className="text-gray-500">
                      Direct messages will appear here once you start sending them.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Phase 6: Scheduled Messages Tab */}
        <TabsContent value="scheduled" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Scheduled Messages</h3>
              <p className="text-sm text-gray-600">Manage future announcements and recurring messages</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4" />
                  Schedule Message
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Schedule New Message</DialogTitle>
                  <DialogDescription>
                    Create a message to be sent automatically at a future date and time.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="schedule-title">Title</Label>
                    <Input
                      id="schedule-title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Message title..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="schedule-content">Content</Label>
                    <Textarea
                      id="schedule-content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Message content..."
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="schedule-priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value: Priority) => setFormData({ ...formData, priority: value as Priority })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="schedule-audience">Target Audience</Label>
                      <Select
                        value={formData.targetAudience}
                        onValueChange={(value) => setFormData({ ...formData, targetAudience: value })}
                      >
                        <SelectTrigger>
                          <SelectValue asChild>
                            <span>
                              {(() => {
                                // Show selected employees if any are chosen
                                if (formData.targetEmployees && formData.targetEmployees.length > 0) {
                                  const selectedEmployees = employees?.filter(emp => 
                                    formData.targetEmployees.includes(emp.id)
                                  ) || [];
                                  
                                  if (selectedEmployees.length === 1) {
                                    return `${selectedEmployees[0].firstName} ${selectedEmployees[0].lastName}`;
                                  } else if (selectedEmployees.length === 2) {
                                    return `${selectedEmployees[0].firstName} ${selectedEmployees[0].lastName} & ${selectedEmployees[1].firstName} ${selectedEmployees[1].lastName}`;
                                  } else if (selectedEmployees.length <= 4) {
                                    return `${selectedEmployees.length} Selected Employees`;
                                  } else {
                                    return `${selectedEmployees.length} Employees`;
                                  }
                                }
                                
                                // Default to audience type
                                return formatAudience(formData.targetAudience);
                              })()
                              }
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Staff</SelectItem>
                          <SelectItem value="employees-only">Employees Only</SelectItem>
                          <SelectItem value="admins-managers">Admins & Managers</SelectItem>
                          <SelectItem value="managers-only">Managers Only</SelectItem>
                          <SelectItem value="admins-only">Admins Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="schedule-time">Schedule For</Label>
                    <Input
                      id="schedule-time"
                      type="datetime-local"
                      value={formData.scheduledFor}
                      onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                    />
                  </div>

                  {/* Employee Selector for Scheduled Messages */}
                  <EmployeeSelector
                    employees={employees}
                    selectedEmployees={formData.targetEmployees}
                    onEmployeesChange={(selectedIds) => setFormData(prev => ({ ...prev, targetEmployees: selectedIds }))}
                    searchQuery={scheduledEmployeeSearchQuery}
                    onSearchChange={setScheduledEmployeeSearchQuery}
                    isVisible={showScheduledEmployeeSelector}
                    onVisibilityChange={setShowScheduledEmployeeSelector}
                  />

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="schedule-sms"
                      checked={formData.smsEnabled}
                      onChange={(e) => setFormData({ ...formData, smsEnabled: e.target.checked })}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <Label htmlFor="schedule-sms">Send SMS notifications</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      if (!formData.title.trim() || !formData.content.trim() || !formData.scheduledFor) {
                        toast({ 
                          title: "Missing required fields", 
                          description: "Please fill in title, content, and schedule time",
                          variant: "destructive" 
                        });
                        return;
                      }
                      createScheduledMessageMutation.mutate(formData);
                    }}
                    disabled={createScheduledMessageMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {createScheduledMessageMutation.isPending ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Message
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Scheduled Messages List */}
          <div className="space-y-4">
            {scheduledLoading ? (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
                <p className="text-gray-500">Loading scheduled messages...</p>
              </div>
            ) : scheduledMessages.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <CalendarCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      No Scheduled Messages
                    </h3>
                    <p className="text-gray-500">
                      Create your first scheduled message to get started.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {scheduledMessages.map((message) => (
                  <Card key={message.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{message.title}</h4>
                            <Badge 
                              className={`text-xs ${
                                message.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                message.status === 'sent' ? 'bg-green-100 text-green-800' :
                                message.status === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {message.status}
                            </Badge>
                            <Badge className={`text-xs ${getPriorityColor(message.priority)}`}>
                              {message.priority}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{message.content}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Scheduled: {(() => {
                                  // Parse time as local time - split and manually create date
                                  const timeStr = message.scheduledFor.replace('T', ' ');
                                  const [datePart, timePart] = timeStr.split(' ');
                                  const [year, month, day] = datePart.split('-').map(Number);
                                  const [hour, minute] = timePart.split(':').map(Number);
                                  // Create date in local timezone
                                  const localDate = new Date(year, month - 1, day, hour, minute);
                                  return format(localDate, 'MMM dd, yyyy h:mm a');
                                })()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{formatMessageAudience(message, employees)}</span>
                            </div>
                            {message.smsEnabled && (
                              <Badge className="bg-blue-100 text-blue-800 text-xs">SMS</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {message.status === 'scheduled' && (
                            <>
                              <Button size="sm" variant="outline">
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            <AnalyticsDashboard />
          </div>
        </TabsContent>

        {/* Admin KPIs Dashboard Tab */}
        <TabsContent value="admin">
          <div className="space-y-6">
            <AdminKPIDashboard />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Admin KPIs Dashboard Component
function AdminKPIDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  // Fetch comprehensive admin data
  const { data: adminStats } = useQuery({
    queryKey: ['/api/admin/stats'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: analyticsOverview } = useQuery({
    queryKey: ['/api/analytics/communication/overview', selectedPeriod],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const { data: smsMetrics } = useQuery({
    queryKey: ['/api/analytics/sms/metrics', selectedPeriod],
    staleTime: 2 * 60 * 1000,
  });

  const { data: engagementData } = useQuery({
    queryKey: ['/api/analytics/user-engagement', selectedPeriod],
    staleTime: 2 * 60 * 1000,
  });

  // Safely extract overview data with proper typing
  const overview: Partial<CommunicationOverview> = (analyticsOverview as any)?.overview ?? {};
  const smsData = (smsMetrics as any)?.summary ?? {};
  const engagementSummary = (engagementData as any)?.summary ?? {};
  const stats: Partial<AdminStats> = (adminStats as any) ?? {};

  // Calculate performance metrics with safe property access
  const totalCommunications = (overview.totalMessages || 0) + (overview.totalAnnouncements || 0);
  const avgDeliveryRate = smsData.deliveryRate || 0;
  const totalCost = (smsData.totalCost || 0) / 100; // Convert from cents to dollars
  const costPerMessage = totalCommunications > 0 ? totalCost / totalCommunications : 0;
  const activeUsers = engagementSummary.topUsers?.length || 0;
  const avgEngagement = overview.averageEngagementRate || 0;

  // ROI Calculation (simplified)
  const estimatedTimeSaved = totalCommunications * 2; // 2 minutes saved per automated communication
  const hourlyRate = 25; // $25/hour average wage
  const timeSavingsValue = (estimatedTimeSaved / 60) * hourlyRate;
  const roi = totalCost > 0 ? ((timeSavingsValue - totalCost) / totalCost) * 100 : 0;

  const performanceScore = Math.min(100, (avgDeliveryRate * 0.4) + (avgEngagement * 0.3) + (Math.min(activeUsers / 10, 1) * 30));

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            Executive KPIs Dashboard
          </h2>
          <p className="text-gray-600 mt-1">System performance and business impact metrics</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Executive Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">System Performance</p>
                <p className="text-2xl font-bold text-blue-900">{performanceScore.toFixed(1)}%</p>
                <p className="text-xs text-blue-600 mt-1">Overall health score</p>
              </div>
              <div className="p-2 bg-blue-200 rounded-full">
                <Activity className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">ROI</p>
                <p className="text-2xl font-bold text-green-900">{roi > 0 ? '+' : ''}{roi.toFixed(1)}%</p>
                <p className="text-xs text-green-600 mt-1">Return on investment</p>
              </div>
              <div className="p-2 bg-green-200 rounded-full">
                <DollarSign className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Active Users</p>
                <p className="text-2xl font-bold text-purple-900">{activeUsers}</p>
                <p className="text-xs text-purple-600 mt-1">Engaged employees</p>
              </div>
              <div className="p-2 bg-purple-200 rounded-full">
                <Users className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Delivery Rate</p>
                <p className="text-2xl font-bold text-orange-900">{avgDeliveryRate.toFixed(1)}%</p>
                <p className="text-xs text-orange-600 mt-1">SMS success rate</p>
              </div>
              <div className="p-2 bg-orange-200 rounded-full">
                <Send className="h-6 w-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Operational Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{totalCommunications}</p>
                <p className="text-sm text-gray-600">Total Communications</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">${totalCost.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Communication Costs</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">${costPerMessage.toFixed(3)}</p>
                <p className="text-sm text-gray-600">Cost Per Message</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{estimatedTimeSaved}m</p>
                <p className="text-sm text-gray-600">Time Saved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Employee Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Average Engagement</span>
                <span className="text-sm font-bold">{avgEngagement.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${avgEngagement}%` }}
                ></div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">System Adoption</span>
                <span className="text-sm font-bold">{Math.min(100, (activeUsers / (stats.totalEmployees || 1)) * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (activeUsers / (stats.totalEmployees || 1)) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-600">
                {activeUsers} of {stats.totalEmployees || 'N/A'} employees actively engaged
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Impact Summary */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <TrendingUp className="h-5 w-5" />
            Business Impact Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600 mb-2">${timeSavingsValue.toFixed(0)}</div>
              <div className="text-sm text-gray-600">Estimated Value from Time Savings</div>
              <div className="text-xs text-gray-500 mt-1">Based on automated communications</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">{((avgDeliveryRate / 100) * totalCommunications).toFixed(0)}</div>
              <div className="text-sm text-gray-600">Successful Communications</div>
              <div className="text-xs text-gray-500 mt-1">Messages delivered successfully</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{roi > 0 ? 'Positive' : 'Negative'}</div>
              <div className="text-sm text-gray-600">ROI Trend</div>
              <div className="text-xs text-gray-500 mt-1">
                {roi > 0 ? 'System generating value' : 'Investment period'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Health and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-600" />
            System Health & Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Communications System Online</p>
                  <p className="text-sm text-green-700">All services operational</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">Healthy</Badge>
            </div>

            {avgDeliveryRate < 95 && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-900">SMS Delivery Rate Below Target</p>
                    <p className="text-sm text-yellow-700">Consider reviewing SMS service configuration</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-yellow-400 text-yellow-800">Warning</Badge>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
                    await queryClient.invalidateQueries({ queryKey: ['/api/analytics/communication/overview'] });
                    toast({
                      title: "🔄 Data Refreshed",
                      description: "All KPI metrics have been updated with latest data",
                    });
                  } catch (error) {
                    toast({
                      title: "❌ Refresh Failed",
                      description: "Unable to refresh data. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Activity className="h-4 w-4 mr-2" />
                Refresh Metrics
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast({
                    title: "📊 Export Available",
                    description: "KPI data export functionality will be available in the next update.",
                  });
                }}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CommunicationsPage() {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';

  if (isEmployee) {
    // Employee view - clean interface without admin navigation
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 font-brand" 
                      style={{ fontFamily: "'Great Vibes', cursive" }}>
                    Pine Hill Farm
                  </h1>
                  <p className="text-sm text-gray-600">Communications</p>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                📢 Communications Hub
              </h2>
              <p className="text-gray-600">
                Stay updated with company announcements and team communications.
              </p>
            </div>
            <CommunicationsContent />
          </div>
        </div>
      </div>
    );
  }

  // Admin/Manager view - full admin layout
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