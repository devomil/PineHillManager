import { useQuery } from "@tanstack/react-query";
import { Users, Clock, Calendar, MapPin, ChevronRight, FileText, MessageCircle, Bell, DollarSign, Package, ShoppingCart, QrCode, Settings, Target, TrendingUp, CheckCircle, Circle, TrendingDown, UserCheck, Repeat } from "lucide-react";
import { Link } from "wouter";
import { formatTimeStringToCST } from "@/lib/time-utils";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Checkbox } from "@/components/ui/checkbox";
import type { Goal, TimeOffRequest, ShiftSwapRequest } from "@shared/schema";
import { format, startOfMonth, endOfMonth, differenceInDays, addDays } from "date-fns";

interface AdminStats {
  totalEmployees: number;
  pendingRequests: number;
  scheduledToday: number;
  storeLocations: number;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department?: string;
  position?: string;
}

interface Location {
  id: number;
  name: string;
  address?: string;
}

interface WorkSchedule {
  id: number;
  userId: string;
  locationId: number;
  startTime: string;
  endTime: string;
  position?: string;
  status: string;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignedTo: string;
  createdBy: string;
  archived: boolean;
  dueDate?: string;
}

interface ProfitLossData {
  totalRevenue: string | number;
  totalCOGS: string | number;
  grossProfit: string | number;
  grossMargin: string | number;
  totalExpenses: string | number;
  netIncome: string | number;
  profitMargin: string | number;
  period: string;
  currency: string;
}

interface PayrollData {
  totalScheduledHours: number;
  totalScheduledPay: number;
  employeeCount: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  
  // Calculate current month dates
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const today = format(now, 'yyyy-MM-dd');
  const daysElapsed = differenceInDays(now, startOfMonth(now)) + 1;
  const totalDaysInMonth = differenceInDays(endOfMonth(now), startOfMonth(now)) + 1;
  const daysRemaining = totalDaysInMonth - daysElapsed;

  // Fetch goals
  // Fetch goals from separate endpoints
  const { data: myGoalsData = [] } = useQuery<Goal[]>({
    queryKey: ["/api/goals/my"],
  });

  const { data: companyGoalsData = [] } = useQuery<Goal[]>({
    queryKey: ["/api/goals/company"],
  });

  const { data: teamGoalsData = [] } = useQuery<Goal[]>({
    queryKey: ["/api/goals/team"],
  });

  // Fetch tasks for the user
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  // Fetch dashboard stats
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch employees for name mapping
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  // Fetch locations for location mapping
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  // Fetch today's schedules
  const { data: todaySchedules = [] } = useQuery<WorkSchedule[]>({
    queryKey: ["/api/work-schedules/today"],
  });

  // Check if user is manager/admin for approval widgets
  const userRole = user?.role?.toLowerCase();
  const isManager = userRole === 'admin' || userRole === 'manager';

  // Fetch time off requests for managers/admins (only after user is loaded)
  const { data: timeOffRequests = [] } = useQuery<TimeOffRequest[]>({
    queryKey: ['/api/time-off-requests'],
    enabled: !!user && isManager,
  });

  // Fetch shift swap requests for managers/admins (only after user is loaded)
  const { data: shiftSwaps = [] } = useQuery<ShiftSwapRequest[]>({
    queryKey: ['/api/shift-swaps'],
    enabled: !!user && isManager,
  });
  
  // Fetch profit/loss data for current month
  const { data: profitLossData } = useQuery<ProfitLossData>({
    queryKey: ["/api/accounting/analytics/profit-loss", monthStart, monthEnd],
    queryFn: async () => {
      const response = await fetch(`/api/accounting/analytics/profit-loss?startDate=${monthStart}&endDate=${monthEnd}`);
      if (!response.ok) throw new Error('Failed to fetch profit/loss data');
      return response.json();
    },
  });
  
  // Fetch payroll data for current month
  const { data: payrollData } = useQuery<PayrollData>({
    queryKey: ["/api/accounting/payroll/scheduled", monthStart, monthEnd],
    queryFn: async () => {
      const response = await fetch(`/api/accounting/payroll/scheduled?startDate=${monthStart}&endDate=${monthEnd}`);
      if (!response.ok) throw new Error('Failed to fetch payroll data');
      return response.json();
    },
  });

  // Fetch today's revenue
  const { data: todayData } = useQuery<{ 
    locationBreakdown: Array<{ locationName: string; totalRevenue: string | number; totalSales?: string }>;
    totalSummary?: {
      totalRevenue: string;
      totalTransactions: number;
      integrations?: any;
    };
  }>({
    queryKey: ["/api/accounting/analytics/multi-location", today, today],
    queryFn: async () => {
      const response = await fetch(`/api/accounting/analytics/multi-location?startDate=${today}&endDate=${today}`);
      if (!response.ok) throw new Error('Failed to fetch today revenue');
      const data = await response.json();
      return data;
    },
  });

  const getEmployeeName = (userId: string) => {
    const employee = employees.find(emp => emp.id === userId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  const getLocationName = (locationId: number) => {
    const location = locations.find(loc => loc.id === locationId);
    return location?.name || 'Unknown Location';
  };

  // Use goals from separate endpoints
  const myGoals = myGoalsData.slice(0, 3);
  const companyGoals = companyGoalsData; // Show all company BHAGs
  const teamGoals = teamGoalsData.slice(0, 3);

  // Filter tasks for current user
  const myTasks = tasks.filter(t => 
    t.assignedTo === user?.id && 
    t.status !== 'completed' && 
    !t.archived
  ).slice(0, 4);

  // Filter pending approvals for managers/admins
  const pendingTimeOffRequests = timeOffRequests.filter(
    req => req.status === 'pending' || req.status === 'cancellation_requested'
  );
  const pendingShiftSwaps = shiftSwaps.filter(
    swap => swap.status === 'pending'
  );
  const totalPendingApprovals = pendingTimeOffRequests.length + pendingShiftSwaps.length;
  
  // Calculate monthly metrics
  const revenue = typeof profitLossData?.totalRevenue === 'string' ? parseFloat(profitLossData.totalRevenue) : (profitLossData?.totalRevenue || 0);
  const cogs = typeof profitLossData?.totalCOGS === 'string' ? parseFloat(profitLossData.totalCOGS) : (profitLossData?.totalCOGS || 0);
  const payroll = payrollData?.totalScheduledPay || 0;
  const expenses = typeof profitLossData?.totalExpenses === 'string' ? parseFloat(profitLossData.totalExpenses) : (profitLossData?.totalExpenses || 0);
  const grossProfit = typeof profitLossData?.grossProfit === 'string' ? parseFloat(profitLossData.grossProfit) : (profitLossData?.grossProfit || 0);
  const grossMargin = typeof profitLossData?.grossMargin === 'string' ? parseFloat(profitLossData.grossMargin) : (profitLossData?.grossMargin || 0);
  
  // Calculate daily average revenue
  const dailyAvgRevenue = daysElapsed > 0 ? revenue / daysElapsed : 0;
  
  // Calculate today's revenue from live data
  const todayRevenue = todayData?.locationBreakdown?.reduce((sum, loc) => {
    const revenue = typeof loc.totalRevenue === 'string' ? parseFloat(loc.totalRevenue) : (loc.totalRevenue || 0);
    return sum + revenue;
  }, 0) || 0;
  
  // Project month-end revenue
  const projectedRevenue = dailyAvgRevenue * totalDaysInMonth;
  
  // Calculate confidence (matches accounting page formula)
  const confidence = Math.min(95, 60 + (daysElapsed * 2));

  const adminQuickActions = [
    {
      title: "Employee Management",
      description: "Manage staff, roles, and permissions",
      icon: Users,
      href: "/employees",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Schedule Management",
      description: "Create and manage work schedules",
      icon: Calendar,
      href: "/shift-scheduling",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Communications",
      description: "Manage announcements, messages, and team communication",
      icon: MessageCircle,
      href: "/communications",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "System Support",
      description: "Access support resources and documentation",
      icon: FileText,
      href: "/support",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    },
    {
      title: "Inventory Management",
      description: "Manage products, stock levels, and categories",
      icon: Package,
      href: "/inventory",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    },
    {
      title: "Order Management",
      description: "Process orders and analyze sales performance",
      icon: ShoppingCart,
      href: "/orders",
      color: "text-cyan-600",
      bgColor: "bg-cyan-50"
    },
    {
      title: "Reports & Analytics",
      description: "View detailed reports and insights",
      icon: Clock,
      href: "/reports",
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      title: "Accounting Tool",
      description: "Manage financial data and integrations",
      icon: DollarSign,
      href: "/accounting",
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Marketing Tools",
      description: "Generate QR codes for marketing campaigns",
      icon: QrCode,
      href: "/admin/marketing",
      color: "text-pink-600",
      bgColor: "bg-pink-50"
    }
  ];


  return (
    <AdminLayout currentTab="dashboard">
      <div className="flex gap-6">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          {/* Goals Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* MY Goals */}
            <div className="group relative bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden hover:shadow-md transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5a7a5c] to-[#7ea680]"></div>
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                    <Target className="h-5 w-5 text-[#5a7a5c]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 tracking-tight">MY Goals</h3>
                </div>
                <div className="space-y-2.5">
                  {myGoals.length > 0 ? (
                    myGoals.map((goal) => (
                      <div 
                        key={goal.id}
                        className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-emerald-50/30 hover:border-emerald-200/50 transition-all duration-200"
                      >
                        <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#5a7a5c] flex-shrink-0"></div>
                        <span className="text-sm font-medium text-gray-700 leading-relaxed flex-1">{goal.title}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500 mb-2">No personal goals yet</p>
                      <Link href="/goals">
                        <Button variant="link" size="sm" className="text-[#5a7a5c] hover:text-[#7ea680]">Add Goals</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Company BHAG */}
            <div className="group relative bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden hover:shadow-md transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#b85a42] to-[#d47a5e]"></div>
              <div className="p-6 min-h-[220px]">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-100">
                    <Target className="h-5 w-5 text-[#b85a42]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Company BHAG</h3>
                </div>
                {companyGoals.length > 0 ? (
                  <div className="space-y-2.5">
                    {companyGoals.map((goal) => (
                      <div key={goal.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-orange-50/30 hover:border-orange-200/50 transition-all duration-200">
                        <div className="flex-shrink-0 mt-0.5">
                          {goal.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#b85a42]"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 leading-relaxed">{goal.title}</p>
                          {goal.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">{goal.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 mb-2">No company goal set</p>
                    <Link href="/goals">
                      <Button variant="link" size="sm" className="text-[#b85a42] hover:text-[#d47a5e]">Set BHAG</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* TEAM Goals */}
            <div className="group relative bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden hover:shadow-md transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#a57283] to-[#c49aaa]"></div>
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100">
                    <Target className="h-5 w-5 text-[#a57283]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 tracking-tight">TEAM Goals</h3>
                </div>
                <div className="space-y-2.5">
                  {teamGoals.length > 0 ? (
                    teamGoals.map((goal) => (
                      <div 
                        key={goal.id}
                        className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-rose-50/30 hover:border-rose-200/50 transition-all duration-200"
                      >
                        <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#a57283] flex-shrink-0"></div>
                        <span className="text-sm font-medium text-gray-700 leading-relaxed flex-1">{goal.title}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500 mb-2">No team goals yet</p>
                      <Link href="/goals">
                        <Button variant="link" size="sm" className="text-[#a57283] hover:text-[#c49aaa]">Add Goals</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Business Intelligence */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">
                    Monthly Business Intelligence - {format(now, 'MMMM yyyy')}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Comprehensive monthly performance insights and analytics
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    Updated {format(now, 'MM/dd/yyyy')}
                  </Badge>
                  <Link href="/accounting">
                    <Button size="sm" data-testid="button-view-accounting">
                      View Full Accounting
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Month-to-Date Performance */}
                <div className="bg-gradient-to-br from-[#5b7c99] to-[#5c97ab] p-5 rounded-lg border border-[#5b7c99]/30 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-white" />
                      Month-to-Date Performance
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-white/80 mb-1">Monthly Revenue</div>
                      <div className="text-3xl font-bold text-white">
                        ${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="h-px bg-white/20"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/80">Days elapsed:</span>
                      <span className="text-sm font-semibold text-white">{daysElapsed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/80">Daily average:</span>
                      <span className="text-sm font-semibold text-white">
                        ${dailyAvgRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Today's Revenue */}
                <div className="bg-gradient-to-br from-[#56637a] via-[#6e7b93] to-[#8c93ad] p-5 rounded-lg border border-[#56637a]/30 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-white" />
                      Today's Revenue
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-white/80 mb-1">Live Sales Today</div>
                      <div className="text-3xl font-bold text-white">
                        ${todayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="h-px bg-white/20"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/80">Days elapsed:</span>
                      <span className="text-sm font-semibold text-white">{daysElapsed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/80">Monthly avg/day:</span>
                      <span className="text-sm font-semibold text-white">
                        ${dailyAvgRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Projected Month-End */}
                <div className="bg-gradient-to-br from-[#9b6347] via-[#b8774f] to-[#d4a574] p-5 rounded-lg border border-[#9b6347]/30 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Target className="h-4 w-4 text-white" />
                      Projected Month-End
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-3xl font-bold text-white mb-1">
                        ${projectedRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs text-white/80">projected revenue</div>
                    </div>
                    <div className="h-px bg-white/20"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/80">Confidence:</span>
                      <span className="text-sm font-semibold text-white">{confidence}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/80">Days remaining:</span>
                      <span className="text-sm font-semibold text-white">{daysRemaining}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Quick Actions */}
          <Card className="shadow-lg border-gray-200/50">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-xl font-semibold text-gray-900">Admin Quick Actions</CardTitle>
              <CardDescription className="text-gray-600">
                Streamline your administrative tasks with these essential management tools
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {adminQuickActions.map((action, index) => (
                  <Link key={index} href={action.href}>
                    <div 
                      className="group relative cursor-pointer rounded-xl border border-gray-200/60 bg-gradient-to-br from-white to-gray-50/50 p-5 transition-all duration-300 hover:shadow-lg hover:border-gray-300/80 hover:-translate-y-1"
                      data-testid={`action-${action.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`flex-shrink-0 p-3 rounded-xl ${action.bgColor} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                          <action.icon className={`h-6 w-6 ${action.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-base mb-1 group-hover:text-gray-700 transition-colors">
                            {action.title}
                          </h3>
                          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                            {action.description}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 space-y-6">
          {/* Today's Schedule Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div className="bg-gradient-to-r from-[#5b7c99] to-[#5c97ab] px-4 py-3">
              <CardTitle className="text-lg font-semibold text-white">Today's Schedule Overview</CardTitle>
            </div>
            <CardContent className="pt-4">
              {todaySchedules && todaySchedules.length > 0 ? (
                <div className="space-y-3">
                  {todaySchedules.slice(0, 3).map((schedule, index) => (
                    <div key={index} className="flex items-center space-x-3" data-testid={`schedule-${index}`}>
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-medium">
                          {getEmployeeName(schedule.userId).charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{getEmployeeName(schedule.userId)}</p>
                        <p className="text-xs text-gray-500">{getLocationName(schedule.locationId)}</p>
                      </div>
                    </div>
                  ))}
                  {todaySchedules.length > 3 && (
                    <Link href="/shift-scheduling">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full mt-2"
                        data-testid="button-view-all-schedules"
                      >
                        View All ({todaySchedules.length})
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Calendar className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No schedules today</p>
                  <Link href="/shift-scheduling">
                    <Button variant="link" size="sm" className="mt-2">Create Schedule</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </div>

          {/* My Monthly Tasks */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div className="bg-gradient-to-r from-[#56637a] to-[#8c93ad] px-4 py-3">
              <CardTitle className="text-lg font-semibold text-white">My Monthly Tasks</CardTitle>
            </div>
            <CardContent className="pt-4">
              {myTasks.length > 0 ? (
                <div className="space-y-3">
                  {myTasks.map((task) => (
                    <div key={task.id} className="flex items-center space-x-3 p-2 bg-white rounded-lg" data-testid={`task-${task.id}`}>
                      <Checkbox 
                        checked={task.status === 'completed'}
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{task.title}</p>
                      </div>
                    </div>
                  ))}
                  <Link href="/tasks">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full mt-2"
                      data-testid="button-view-all-tasks"
                    >
                      View All Tasks
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No pending tasks</p>
                  <Link href="/tasks">
                    <Button variant="link" size="sm" className="mt-2">Manage Tasks</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </div>

          {/* Pending Approvals Widget - Only for Managers/Admins */}
          {isManager && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
              <div className="bg-gradient-to-r from-[#9b6347] to-[#d4a574] px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-white" />
                    <CardTitle className="text-lg font-semibold text-white">Pending Approvals</CardTitle>
                  </div>
                  {totalPendingApprovals > 0 && (
                    <Badge className="bg-white/90 text-[#9b6347]">{totalPendingApprovals}</Badge>
                  )}
                </div>
              </div>
              <CardContent className="pt-4">
                {totalPendingApprovals === 0 ? (
                  <div className="text-center py-4">
                    <CheckCircle className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No pending approvals</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Time Off Requests */}
                    {pendingTimeOffRequests.slice(0, 2).map((request) => (
                      <div 
                        key={`timeoff-${request.id}`} 
                        className="p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-300 transition-colors"
                        data-testid={`approval-timeoff-${request.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="h-4 w-4 text-orange-600 flex-shrink-0" />
                              <p className="font-medium text-sm text-gray-900 truncate">
                                {getEmployeeName(request.userId)}
                              </p>
                            </div>
                            <p className="text-xs text-gray-600 ml-6">
                              {request.status === 'cancellation_requested' ? 'Cancellation Request' : 'Time Off Request'}
                            </p>
                            <p className="text-xs text-gray-500 ml-6 mt-0.5">
                              {format(new Date(request.startDate), "MMM d")} - {format(new Date(request.endDate), "MMM d")}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50 flex-shrink-0">
                            PENDING
                          </Badge>
                        </div>
                      </div>
                    ))}
                    
                    {/* Shift Swaps */}
                    {pendingShiftSwaps.slice(0, Math.max(0, 3 - pendingTimeOffRequests.length)).map((swap) => (
                      <div 
                        key={`swap-${swap.id}`} 
                        className="p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-300 transition-colors"
                        data-testid={`approval-swap-${swap.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Repeat className="h-4 w-4 text-orange-600 flex-shrink-0" />
                              <p className="font-medium text-sm text-gray-900 truncate">
                                {getEmployeeName(swap.requesterId)}
                              </p>
                            </div>
                            <p className="text-xs text-gray-600 ml-6">
                              Shift Swap Request
                            </p>
                            {swap.takerId && (
                              <p className="text-xs text-gray-500 ml-6 mt-0.5">
                                with {getEmployeeName(swap.takerId)}
                              </p>
                            )}
                          </div>
                          {swap.urgencyLevel === 'urgent' || swap.urgencyLevel === 'high' ? (
                            <Badge variant="destructive" className="flex-shrink-0">
                              URGENT
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50 flex-shrink-0">
                              PENDING
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}

                    <Link href="/shift-scheduling">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full mt-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                        data-testid="button-manage-approvals"
                      >
                        Manage Approvals
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
