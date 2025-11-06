import { useQuery } from "@tanstack/react-query";
import { Users, Clock, Calendar, MapPin, ChevronRight, FileText, MessageCircle, Bell, DollarSign, Package, ShoppingCart, QrCode, Settings, Target, TrendingUp, CheckCircle, Circle, TrendingDown } from "lucide-react";
import { Link } from "wouter";
import { formatTimeStringToCST } from "@/lib/time-utils";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Checkbox } from "@/components/ui/checkbox";
import type { Goal } from "@shared/schema";
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
  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
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
  const { data: todayData } = useQuery<{ locationBreakdown: Array<{ locationName: string; revenue: number }> }>({
    queryKey: ["/api/accounting/analytics/multi-location", today, today],
    queryFn: async () => {
      const response = await fetch(`/api/accounting/analytics/multi-location?startDate=${today}&endDate=${today}`);
      if (!response.ok) throw new Error('Failed to fetch today revenue');
      return response.json();
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

  // Filter goals by type
  const myGoals = goals.filter(g => g.type === 'my' && g.createdBy === user?.id).slice(0, 3);
  const companyGoals = goals.filter(g => g.type === 'company').slice(0, 1);
  const teamGoals = goals.filter(g => g.type === 'team').slice(0, 3);

  // Filter tasks for current user
  const myTasks = tasks.filter(t => 
    t.assignedTo === user?.id && 
    t.status !== 'completed' && 
    !t.archived
  ).slice(0, 4);
  
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
  const todayRevenue = todayData?.locationBreakdown?.reduce((sum, loc) => sum + (loc.revenue || 0), 0) || 0;
  
  // Project month-end revenue
  const projectedRevenue = dailyAvgRevenue * totalDaysInMonth;
  
  // Calculate confidence (higher confidence as month progresses)
  const confidence = Math.min(Math.round((daysElapsed / totalDaysInMonth) * 100), 95);

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
      href: "/system-support",
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* MY Goals */}
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-center">MY Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {myGoals.length > 0 ? (
                  myGoals.map((goal) => (
                    <div 
                      key={goal.id}
                      className="flex items-center space-x-2 p-3 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <Target className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 truncate flex-1">{goal.title}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No personal goals yet</p>
                    <Link href="/goals">
                      <Button variant="link" size="sm" className="mt-2">Add Goals</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Company BHAG */}
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-center">Company BHAG</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center min-h-[180px]">
                {companyGoals.length > 0 ? (
                  <div className="relative">
                    <div className="w-40 h-40 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-lg flex items-center justify-center p-6">
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-800 leading-tight">{companyGoals[0].title}</p>
                      </div>
                    </div>
                    <div className="absolute -top-2 -left-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white shadow-md flex items-center justify-center">
                      {companyGoals[0].status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-white" />
                      ) : (
                        <Circle className="h-4 w-4 text-white" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-gray-500">No company goal set</p>
                    <Link href="/goals">
                      <Button variant="link" size="sm" className="mt-2">Set BHAG</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* TEAM Goals */}
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-center">TEAM Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {teamGoals.length > 0 ? (
                  teamGoals.map((goal) => (
                    <div 
                      key={goal.id}
                      className="flex items-center space-x-2 p-3 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <Target className="h-4 w-4 text-purple-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 truncate flex-1">{goal.title}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No team goals yet</p>
                    <Link href="/goals">
                      <Button variant="link" size="sm" className="mt-2">Add Goals</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
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
                  <Link href="/accounting-dashboard">
                    <Button variant="outline" size="sm" data-testid="button-dream-view">
                      Dream View
                    </Button>
                  </Link>
                  <Link href="/accounting-dashboard">
                    <Button size="sm" data-testid="button-set-monthly-goals">
                      Set Monthly Goals
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Month-to-Date Performance */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      Month-to-Date Performance
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Revenue:</span>
                      <span className="text-base font-bold text-green-600">
                        ${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Cost of Goods:</span>
                      <span className="text-sm font-semibold text-red-600">
                        ${cogs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Payroll:</span>
                      <span className="text-sm font-semibold text-red-600">
                        ${payroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Total Expenses:</span>
                      <span className="text-sm font-semibold text-red-600">
                        ${expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="h-px bg-blue-300 my-2"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Gross Profit:</span>
                      <span className="text-base font-bold text-blue-700">
                        ${grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Gross Margin:</span>
                      <span className="text-base font-bold text-blue-700">
                        {grossMargin.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Daily Average Revenue */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Daily Average Revenue
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        ${dailyAvgRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-600">per day this month</div>
                    </div>
                    <div className="h-px bg-green-300"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Days elapsed:</span>
                      <span className="text-sm font-semibold text-gray-700">{daysElapsed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Today:</span>
                      <span className="text-sm font-semibold text-green-600">
                        ${todayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Projected Month-End */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-600" />
                      Projected Month-End
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-3xl font-bold text-purple-600 mb-1">
                        ${projectedRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs text-gray-600">projected revenue</div>
                    </div>
                    <div className="h-px bg-purple-300"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Confidence:</span>
                      <span className="text-sm font-semibold text-purple-600">{confidence}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Days remaining:</span>
                      <span className="text-sm font-semibold text-gray-700">{daysRemaining}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Quick Actions */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">Admin Quick Actions</CardTitle>
              <CardDescription>
                Streamline your administrative tasks with these essential management tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {adminQuickActions.map((action, index) => (
                  <Link key={index} href={action.href}>
                    <Card 
                      className="cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 border border-gray-200"
                      data-testid={`action-${action.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${action.bgColor}`}>
                            <action.icon className={`h-5 w-5 ${action.color}`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{action.title}</h3>
                            <p className="text-sm text-gray-500">{action.description}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 space-y-6">
          {/* Today's Schedule Overview */}
          <Card className="shadow-lg bg-gradient-to-br from-slate-50 to-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">Today's Schedule Overview</CardTitle>
            </CardHeader>
            <CardContent>
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
          </Card>

          {/* My Monthly Tasks */}
          <Card className="shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">My Monthly Tasks</CardTitle>
            </CardHeader>
            <CardContent>
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
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
