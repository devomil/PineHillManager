import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Users, Clock, Calendar, MapPin, ChevronRight, FileText, MessageCircle, Bell, Settings, Eye } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatTimeStringToCST } from "@/lib/time-utils";

// Import tab components
import EmployeesPage from "@/pages/employees";
import ShiftScheduling from "@/pages/shift-scheduling";
import AnnouncementsPage from "@/pages/admin/announcements";
import SystemSupport from "@/pages/system-support";
import ReportsPage from "@/pages/reports";
import HomeDashboard from "@/pages/home-dashboard";

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Extract the current tab from the URL
  const getCurrentTab = () => {
    const path = location;
    if (path.includes('/employees')) return 'employees';
    if (path.includes('/shift-scheduling')) return 'scheduling';
    if (path.includes('/announcements')) return 'announcements';
    if (path.includes('/system-support')) return 'system-support';
    if (path.includes('/reports')) return 'reports';
    if (path.includes('/dashboard') && !path.includes('/admin')) return 'employee-view';
    return 'dashboard';
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case 'dashboard':
        setLocation('/admin');
        break;
      case 'employees':
        setLocation('/employees');
        break;
      case 'scheduling':
        setLocation('/shift-scheduling');
        break;
      case 'announcements':
        setLocation('/admin/announcements');
        break;
      case 'system-support':
        setLocation('/system-support');
        break;
      case 'communication':
        setLocation('/communication');
        break;
      case 'reports':
        setLocation('/reports');
        break;
      case 'employee-view':
        setLocation('/dashboard');
        break;
    }
  };

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
  const { data: todaySchedules } = useQuery({
    queryKey: ["/api/work-schedules/today"],
    queryFn: async () => {
      const response = await fetch("/api/work-schedules/today", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch schedules");
      return response.json();
    }
  });

  // Helper functions to map IDs to names
  const getEmployeeName = (userId: string) => {
    const employee = employees.find((emp: any) => emp.id === userId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
  };

  const getLocationName = (locationId: number) => {
    const location = locations.find((loc: any) => loc.id === locationId);
    return location ? location.name : 'Location TBD';
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
      title: "Company Announcements",
      description: "Create and manage announcements",
      icon: Bell,
      href: "/admin/announcements",
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
      title: "Team Communication",
      description: "Monitor team chat and messages",
      icon: MessageCircle,
      href: "/communication",
      color: "text-teal-600",
      bgColor: "bg-teal-50"
    },
    {
      title: "Reports & Analytics",
      description: "View detailed reports and insights",
      icon: Clock,
      href: "/reports",
      color: "text-red-600",
      bgColor: "bg-red-50"
    }
  ];

  const DashboardContent = () => (
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
              <Card key={index} 
                className="cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 border border-gray-200"
                onClick={() => handleTabChange(action.href.includes('/employees') ? 'employees' : 
                  action.href.includes('/shift-scheduling') ? 'scheduling' :
                  action.href.includes('/announcements') ? 'announcements' :
                  action.href.includes('/system-support') ? 'system-support' :
                  action.href.includes('/communication') ? 'communication' :
                  action.href.includes('/reports') ? 'reports' : 'dashboard')}
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
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => handleTabChange('scheduling')}
                >
                  View All Schedules ({todaySchedules.length})
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No schedules for today</h3>
              <p className="text-gray-500 mb-4">Get started by creating work schedules for your team</p>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleTabChange('scheduling')}
              >
                Create Schedule
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Clean Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 font-brand brand-title" 
                    style={{ fontFamily: "'Great Vibes', cursive" }}>
                  Pine Hill Farm
                </h1>
                <p className="text-sm text-gray-600">Admin Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => logoutMutation.mutate()} className="text-gray-700 hover:text-red-600">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Admin Dashboard
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employee Management
            </TabsTrigger>
            <TabsTrigger value="scheduling" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule Management
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="system-support" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              System Support
            </TabsTrigger>
            <TabsTrigger value="employee-view" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Employee View
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardContent />
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <EmployeesPage />
          </TabsContent>

          <TabsContent value="scheduling" className="space-y-6">
            <ShiftScheduling />
          </TabsContent>

          <TabsContent value="announcements" className="space-y-6">
            <AnnouncementsPage />
          </TabsContent>

          <TabsContent value="system-support" className="space-y-6">
            <SystemSupport />
          </TabsContent>

          <TabsContent value="employee-view" className="space-y-6">
            <HomeDashboard />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ReportsPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}