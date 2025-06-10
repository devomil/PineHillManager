import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Users, Clock, Calendar, MapPin } from "lucide-react";
import { Link } from "wouter";

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

  const { data: todaySchedules } = useQuery({
    queryKey: ["/api/work-schedules/today"],
    queryFn: async () => {
      const response = await fetch("/api/work-schedules/today", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch today's schedules");
      return response.json();
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">🌲</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Great Vibes, cursive' }}>
                  Pine Hill Farm
                </h1>
                <p className="text-sm text-gray-500">Admin Portal</p>
              </div>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <Link href="/admin/dashboard">
                <Button variant="default" className="bg-green-600 hover:bg-green-700">
                  Admin Dashboard
                </Button>
              </Link>
              <Link href="/admin/employees">
                <Button variant="ghost">Employee Management</Button>
              </Link>
              <Link href="/admin/schedules">
                <Button variant="ghost">Schedule Management</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost">Employee View</Button>
              </Link>
              <Button variant="ghost" onClick={() => window.location.href = '/api/logout'}>
                Sign Out
              </Button>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-gray-600 mt-2">
            Welcome, Admin User (admin). Manage employees, schedules, and company operations.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl font-bold text-gray-900">
                {stats?.totalEmployees || 19}
              </CardTitle>
              <CardDescription className="text-gray-600">
                Total Employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Users className="h-4 w-4 text-blue-500 mr-2" />
                <span className="text-sm text-gray-500">Active staff members</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl font-bold text-gray-900">
                {stats?.pendingRequests || 0}
              </CardTitle>
              <CardDescription className="text-gray-600">
                Pending Requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-yellow-500 mr-2" />
                <span className="text-sm text-gray-500">Awaiting approval</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl font-bold text-gray-900">
                {todaySchedules?.length || 0}
              </CardTitle>
              <CardDescription className="text-gray-600">
                Scheduled Today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-sm text-gray-500">Staff working today</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl font-bold text-gray-900">
                2
              </CardTitle>
              <CardDescription className="text-gray-600">
                Store Locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 text-purple-500 mr-2" />
                <span className="text-sm text-gray-500">Active locations</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Schedule Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Today's Schedule Overview
            </CardTitle>
            <CardDescription>
              Current staff schedules and coverage status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todaySchedules && todaySchedules.length > 0 ? (
              <div className="space-y-4">
                {todaySchedules.map((schedule: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{schedule.user?.name || 'Employee'}</p>
                        <p className="text-sm text-gray-500">{schedule.location?.name || 'Location'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {schedule.startTime} - {schedule.endTime}
                      </p>
                      <p className="text-sm text-gray-500">{schedule.status || 'Scheduled'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No schedules for today</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}