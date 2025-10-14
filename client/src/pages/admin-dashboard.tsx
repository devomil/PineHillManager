import { useQuery } from "@tanstack/react-query";
import { Users, Clock, Calendar, MapPin, ChevronRight, FileText, MessageCircle, Bell, DollarSign, Package, ShoppingCart, QrCode, Settings } from "lucide-react";
import { Link } from "wouter";
import { formatTimeStringToCST } from "@/lib/time-utils";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function AdminDashboard() {
  const { user } = useAuth();

  // Fetch dashboard stats
  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    }
  });

  // Fetch employees for name mapping
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await fetch("/api/employees", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch employees");
      return response.json();
    }
  });

  // Fetch locations for location mapping
  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const response = await fetch("/api/locations", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch locations");
      return response.json();
    }
  });

  // Fetch today's schedules
  const { data: todaySchedules = [] } = useQuery({
    queryKey: ["/api/work-schedules/today"],
    queryFn: async () => {
      const response = await fetch("/api/work-schedules/today", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch today's schedules");
      return response.json();
    }
  });

  const getEmployeeName = (userId: string) => {
    const employee = employees.find((emp: any) => emp.id === userId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  const getLocationName = (locationId: number) => {
    const location = locations.find((loc: any) => loc.id === locationId);
    return location?.name || 'Unknown Location';
  };

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
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName}!
          </h2>
          <p className="text-gray-600">
            Manage employees, schedules, and company operations from your admin dashboard.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats?.totalEmployees || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Active staff members</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Pending Requests</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats?.pendingRequests || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Scheduled Today</CardTitle>
                <Calendar className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{todaySchedules?.length || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Staff working today</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Store Locations</CardTitle>
                <MapPin className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats?.storeLocations || 3}</div>
              <p className="text-xs text-gray-500 mt-1">Active locations</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
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

        {/* Today's Schedule Overview */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">Today's Schedule Overview</CardTitle>
            <CardDescription>
              Current staff schedules and coverage status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todaySchedules && todaySchedules.length > 0 ? (
              <div className="space-y-3">
                {todaySchedules.slice(0, 5).map((schedule: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {getEmployeeName(schedule.userId).charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{getEmployeeName(schedule.userId)}</p>
                        <p className="text-sm text-gray-500">{getLocationName(schedule.locationId)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatTimeStringToCST(schedule.startTime)} - {formatTimeStringToCST(schedule.endTime)}
                      </p>
                      <p className="text-sm text-gray-500">{schedule.position || 'Staff'}</p>
                    </div>
                  </div>
                ))}
                {todaySchedules.length > 5 && (
                  <Link href="/shift-scheduling">
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                    >
                      View All Schedules ({todaySchedules.length})
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No schedules for today</h3>
                <p className="text-gray-500 mb-4">Get started by creating work schedules for your team</p>
                <Link href="/shift-scheduling">
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Create Schedule
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
