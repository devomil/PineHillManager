import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Users, Clock, Calendar, MapPin, ChevronRight, FileText, MessageCircle, Bell } from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();

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
      title: "Training Management",
      description: "Manage training modules and progress",
      icon: FileText,
      href: "/admin-training",
      color: "text-orange-600",
      bgColor: "bg-orange-50"
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with Pine Hill Farm branding */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">🌲</span>
              </div>
              <div>
                <h1 className="text-2xl font-serif text-gray-900" style={{ fontFamily: "'Great Vibes', cursive" }}>
                  Pine Hill Farm
                </h1>
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            </div>
            
            {/* Navigation Tabs */}
            <nav className="flex items-center space-x-1">
              <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2">
                Admin Dashboard
              </Button>
              <Link href="/employees">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900 text-sm px-4 py-2">
                  Employee Management
                </Button>
              </Link>
              <Link href="/shift-scheduling">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900 text-sm px-4 py-2">
                  Schedule Management
                </Button>
              </Link>
              <Link href="/admin/announcements">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900 text-sm px-4 py-2">
                  Announcements
                </Button>
              </Link>
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900 text-sm px-4 py-2">
                System Support
              </Button>
              <Link href="/dashboard">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900 text-sm px-4 py-2">
                  Employee View
                </Button>
              </Link>
              <Button variant="ghost" onClick={() => logoutMutation.mutate()} className="text-gray-600 hover:text-red-600 text-sm px-4 py-2">
                Sign Out
              </Button>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content with light blue background */}
      <div className="bg-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Welcome, {user?.firstName} {user?.lastName} (admin). Manage employees, schedules, and company operations.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg border-l-4 border-l-blue-500 p-6">
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.totalEmployees || 19}</div>
              <div className="text-sm text-gray-600">Total Employees</div>
            </div>

            <div className="bg-white rounded-lg border-l-4 border-l-yellow-500 p-6">
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.pendingRequests || 0}</div>
              <div className="text-sm text-gray-600">Pending Requests</div>
            </div>

            <div className="bg-white rounded-lg border-l-4 border-l-green-500 p-6">
              <div className="text-3xl font-bold text-gray-900 mb-1">{todaySchedules?.length || 0}</div>
              <div className="text-sm text-gray-600">Scheduled Today</div>
            </div>

            <div className="bg-white rounded-lg border-l-4 border-l-purple-500 p-6">
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.storeLocations || 2}</div>
              <div className="text-sm text-gray-600">Store Locations</div>
            </div>
          </div>

          {/* Today's Schedule Overview */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Schedule Overview</h2>
            <div className="text-center py-8 text-gray-500">
              No schedules for today.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Link href="/admin/approvals">
              <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2">
                Pending Approvals
              </Button>
            </Link>
            <Link href="/employees">
              <Button variant="outline" className="px-6 py-2">
                Employee Overview
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}