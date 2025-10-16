import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, FileText, Users, MessageSquare, MessageCircle, Bell, ChevronRight, HelpCircle, User, LogOut, ChevronDown, ShoppingCart, CheckSquare, GraduationCap } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import UserAvatar from "@/components/user-avatar";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Task } from "@shared/schema";

export default function HomeDashboard() {
  const { user, logoutMutation } = useAuth();

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  
  // Convert user to UserAvatar compatible type (null to undefined)
  const avatarUser = user ? {
    profileImageUrl: user.profileImageUrl ?? undefined,
    firstName: user.firstName ?? undefined,
    lastName: user.lastName ?? undefined,
  } : undefined;

  // Fetch employee's assigned tasks
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    enabled: !!user?.id,
  });

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const taskCount = pendingTasks.length;

  const quickActions = [
    {
      title: "Time Clock",
      description: "Clock in/out, track breaks, and manage your work time",
      icon: Clock,
      href: "/time-clock",
      color: "bg-red-50 border-red-200",
      iconColor: "text-red-600"
    },
    {
      title: "My Schedule", 
      description: "View shifts, request time off, and manage shift swaps - all in one place",
      icon: Calendar,
      href: "/schedule",
      color: "bg-blue-50 border-blue-200",
      iconColor: "text-blue-600"
    },
    {
      title: "Communications",
      description: "Company announcements, team messages, and SMS notifications",
      icon: MessageSquare,
      href: "/communications",
      color: "bg-blue-50 border-blue-200",
      iconColor: "text-blue-600"
    },
    {
      title: "Training",
      description: "Access courses, track progress, and earn skills",
      icon: GraduationCap,
      href: "/training",
      color: "bg-orange-50 border-orange-200",
      iconColor: "text-orange-600"
    },
    {
      title: "My Tasks",
      description: taskCount > 0 ? `You have ${taskCount} active task${taskCount !== 1 ? 's' : ''} to complete` : "View and manage your assigned tasks",
      icon: CheckSquare,
      href: "/tasks",
      color: "bg-purple-50 border-purple-200",
      iconColor: "text-purple-600",
      badge: taskCount > 0 ? taskCount : undefined
    },
    {
      title: "Employee Purchases",
      description: "Shop with your monthly employee purchase allowance",
      icon: ShoppingCart,
      href: "/employee-purchases",
      color: "bg-green-50 border-green-200",
      iconColor: "text-green-600"
    },
    {
      title: "Support Center",
      description: "Get help, submit tickets, and find answers to questions",
      icon: HelpCircle,
      href: "/support",
      color: "bg-indigo-50 border-indigo-200",
      iconColor: "text-indigo-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-brand brand-title" data-brand="pine-hill">
                  Pine Hill Farm
                </h1>
                <p className="text-sm text-gray-500">Employee Portal</p>
              </div>
            </div>
            
            {/* Mobile Profile Button - Only visible on small screens */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-50" data-testid="button-mobile-profile">
                    <UserAvatar user={avatarUser} size="md" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => window.location.href = '/profile'} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile & Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <Link href="/dashboard">
                <Button variant="default" className="bg-green-600 hover:bg-green-700">
                  Dashboard
                </Button>
              </Link>
              <Link href="/time-clock">
                <Button variant="ghost">Time Clock</Button>
              </Link>
              <Link href="/schedule">
                <Button variant="ghost">Schedule</Button>
              </Link>
              <Link href="/announcements">
                <Button variant="ghost">Announcements</Button>
              </Link>
              {isManager && (
                <Link href="/admin">
                  <Button variant="outline" className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600">
                    ← Back to Admin View
                  </Button>
                </Link>
              )}
              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-50">
                    <UserAvatar user={avatarUser} size="md" />
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {user?.role || 'Employee'}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => window.location.href = '/profile'} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile & Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Your Dashboard
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Here's an overview of your work activities and quick access to important features.
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <Card className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${action.color}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg ${action.color} relative`}>
                      <action.icon className={`h-6 w-6 ${action.iconColor}`} />
                      {action.badge && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {action.badge}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {action.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {action.description}
                  </CardDescription>
                  <div className="mt-4">
                    <Button className={`w-full ${action.iconColor.replace('text-', 'bg-').replace('600', '600')} hover:${action.iconColor.replace('text-', 'bg-').replace('600', '700')} text-white`}>
                      {action.title === "Time Clock" ? "Clock In/Out" :
                       action.title === "My Schedule" ? "View Schedule" :
                       action.title === "Communications" ? "View Communications" :
                       action.title === "Training" ? "View Courses" :
                       action.title === "My Tasks" ? "View Tasks" :
                       "Open"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}