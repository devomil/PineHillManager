import { ReactNode, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Clock, Calendar, Bell, Settings, Eye, FileText, DollarSign, Menu } from "lucide-react";
import { useLocation } from "wouter";

interface AdminLayoutProps {
  children: ReactNode;
  currentTab: string;
}

export default function AdminLayout({ children, currentTab }: AdminLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        setLocation('/announcements');
        break;
      case 'system-support':
        setLocation('/admin/training');
        break;
      case 'user-management':
        setLocation('/user-management');
        break;
      case 'reports':
        setLocation('/reports');
        break;
      case 'employee-view':
        setLocation('/dashboard');
        break;
      case 'accounting':
        setLocation('/accounting');
        break;
      case 'integrations':
        setLocation('/integrations');
        break;
    }
  };

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
        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          {/* Desktop Navigation */}
          <div className="hidden lg:block">
            <TabsList className="flex items-center gap-4 xl:gap-6 mb-8 p-3 xl:p-4 bg-white rounded-lg shadow-sm border h-auto flex-wrap">
              {/* Core Operations */}
              <TabsTrigger 
                value="dashboard" 
                className="nav-item-core flex items-center gap-2 px-4 xl:px-6 py-2 xl:py-3 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 data-[state=active]:font-medium"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden xl:inline">Admin Dashboard</span>
                <span className="xl:hidden">Dashboard</span>
              </TabsTrigger>
              <div className="h-6 w-px bg-gray-300 hidden lg:block"></div>
              <TabsTrigger 
                value="employees" 
                className="nav-item-core flex items-center gap-2 px-4 xl:px-6 py-2 xl:py-3 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 data-[state=active]:font-medium"
              >
                <Users className="h-4 w-4" />
                <span className="hidden xl:inline">Employee Management</span>
                <span className="xl:hidden">Employees</span>
              </TabsTrigger>
              <div className="h-6 w-px bg-gray-300 hidden lg:block"></div>
              <TabsTrigger 
                value="scheduling" 
                className="nav-item-core flex items-center gap-2 px-4 xl:px-6 py-2 xl:py-3 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 data-[state=active]:font-medium"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden xl:inline">Schedule Management</span>
                <span className="xl:hidden">Schedule</span>
              </TabsTrigger>
              <div className="h-6 w-px bg-gray-300 hidden lg:block"></div>
              <TabsTrigger 
                value="accounting" 
                className="nav-item-core flex items-center gap-2 px-4 xl:px-6 py-2 xl:py-3 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 data-[state=active]:font-medium"
              >
                <DollarSign className="h-4 w-4" />
                <span className="hidden xl:inline">Accounting</span>
                <span className="xl:hidden">Finance</span>
              </TabsTrigger>
              <div className="h-6 w-px bg-gray-300 hidden lg:block"></div>
              <TabsTrigger 
                value="integrations" 
                className="nav-item-core flex items-center gap-2 px-4 xl:px-6 py-2 xl:py-3 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 data-[state=active]:font-medium"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden xl:inline">Integrations</span>
                <span className="xl:hidden">Integrations</span>
              </TabsTrigger>

              {/* Secondary Items - Hidden on smaller screens */}
              <div className="h-6 w-px bg-gray-300 hidden xl:block"></div>
              <TabsTrigger 
                value="announcements" 
                className="nav-item-secondary hidden xl:flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0 text-sm data-[state=active]:bg-gray-100 data-[state=active]:font-medium"
              >
                <Bell className="h-3 w-3" />
                Announcements
              </TabsTrigger>
              <TabsTrigger 
                value="system-support" 
                className="nav-item-secondary hidden xl:flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0 text-sm data-[state=active]:bg-gray-100 data-[state=active]:font-medium"
              >
                <FileText className="h-3 w-3" />
                Support
              </TabsTrigger>
              <TabsTrigger 
                value="user-management" 
                className="nav-item-secondary hidden xl:flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0 text-sm data-[state=active]:bg-gray-100 data-[state=active]:font-medium"
              >
                <Settings className="h-3 w-3" />
                Users
              </TabsTrigger>
              <TabsTrigger 
                value="employee-view" 
                className="nav-item-secondary hidden xl:flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0 text-sm data-[state=active]:bg-gray-100 data-[state=active]:font-medium"
              >
                <Eye className="h-3 w-3" />
                Employee View
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="nav-item-secondary hidden xl:flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0 text-sm data-[state=active]:bg-gray-100 data-[state=active]:font-medium"
              >
                <Clock className="h-3 w-3" />
                Reports
              </TabsTrigger>

              {/* More Options Button for smaller screens */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden flex items-center gap-1 ml-2 px-3 py-2 hover:bg-gray-50 transition-colors"
              >
                <Menu className="h-3 w-3" />
                More
              </Button>
            </TabsList>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm border flex-wrap">
              <TabsTrigger 
                value="dashboard" 
                className="flex items-center gap-1 px-3 py-2 rounded-md hover:bg-blue-50 transition-colors text-sm"
              >
                <Settings className="h-3 w-3" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="employees" 
                className="flex items-center gap-1 px-3 py-2 rounded-md hover:bg-blue-50 transition-colors text-sm"
              >
                <Users className="h-3 w-3" />
                Employees
              </TabsTrigger>
              <TabsTrigger 
                value="scheduling" 
                className="flex items-center gap-1 px-3 py-2 rounded-md hover:bg-blue-50 transition-colors text-sm"
              >
                <Calendar className="h-3 w-3" />
                Schedule
              </TabsTrigger>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center gap-1 ml-auto px-3 py-2"
              >
                <Menu className="h-3 w-3" />
                More
              </Button>
            </div>
          </div>

          {/* Mobile/Tablet Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="xl:hidden mb-8 bg-white border rounded-lg shadow-lg p-4">
              <div className="space-y-2">
                {/* Communication & Support Section */}
                <div className="text-sm font-medium text-gray-500 px-3 py-2 border-b">Communication & Support</div>
                <Button
                  variant={currentTab === "announcements" ? "default" : "ghost"}
                  onClick={() => { handleTabChange("announcements"); setMobileMenuOpen(false); }}
                  className="w-full justify-start gap-2 h-10 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Bell className="h-4 w-4" />
                  Announcements
                </Button>
                <Button
                  variant={currentTab === "system-support" ? "default" : "ghost"}
                  onClick={() => { handleTabChange("system-support"); setMobileMenuOpen(false); }}
                  className="w-full justify-start gap-2 h-10 hover:bg-blue-50 hover:text-blue-700"
                >
                  <FileText className="h-4 w-4" />
                  System Support
                </Button>
                
                {/* Advanced Features Section */}
                <div className="text-sm font-medium text-gray-500 px-3 py-2 border-b mt-4">Advanced Features</div>
                <Button
                  variant={currentTab === "user-management" ? "default" : "ghost"}
                  onClick={() => { handleTabChange("user-management"); setMobileMenuOpen(false); }}
                  className="w-full justify-start gap-2 h-10 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Settings className="h-4 w-4" />
                  User Management
                </Button>
                <Button
                  variant={currentTab === "employee-view" ? "default" : "ghost"}
                  onClick={() => { handleTabChange("employee-view"); setMobileMenuOpen(false); }}
                  className="w-full justify-start gap-2 h-10 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Eye className="h-4 w-4" />
                  Employee View
                </Button>
                <Button
                  variant={currentTab === "reports" ? "default" : "ghost"}
                  onClick={() => { handleTabChange("reports"); setMobileMenuOpen(false); }}
                  className="w-full justify-start gap-2 h-10 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Clock className="h-4 w-4" />
                  Reports
                </Button>
                <Button
                  variant={currentTab === "accounting" ? "default" : "ghost"}
                  onClick={() => { handleTabChange("accounting"); setMobileMenuOpen(false); }}
                  className="w-full justify-start gap-2 h-10 hover:bg-blue-50 hover:text-blue-700"
                >
                  <DollarSign className="h-4 w-4" />
                  Accounting
                </Button>
                <Button
                  variant={currentTab === "integrations" ? "default" : "ghost"}
                  onClick={() => { handleTabChange("integrations"); setMobileMenuOpen(false); }}
                  className="w-full justify-start gap-2 h-10 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Settings className="h-4 w-4" />
                  Integrations
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {children}
          </div>
        </Tabs>
      </div>
    </div>
  );
}