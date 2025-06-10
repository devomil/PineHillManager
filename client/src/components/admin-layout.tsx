import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Clock, Calendar, Bell, Settings, Eye, FileText } from "lucide-react";
import { useLocation } from "wouter";

interface AdminLayoutProps {
  children: ReactNode;
  currentTab: string;
}

export default function AdminLayout({ children, currentTab }: AdminLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();

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
      case 'training':
        setLocation('/admin/training');
        break;
      case 'reports':
        setLocation('/reports');
        break;
      case 'employee-view':
        setLocation('/dashboard');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100">
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
        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
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
            <TabsTrigger value="training" className="flex items-center gap-2">
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

          <div className="space-y-6">
            {children}
          </div>
        </Tabs>
      </div>
    </div>
  );
}