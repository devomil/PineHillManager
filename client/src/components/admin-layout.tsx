import { ReactNode, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import UserAvatar from "@/components/user-avatar";
// Removed Tabs imports to prevent RovingFocusGroupItem conflicts
import { Users, Clock, Calendar, Bell, Settings, Eye, FileText, DollarSign, Menu, QrCode, Video, User, LogOut, ChevronDown, MessageSquare, Package, ShoppingCart, ArrowLeftRight } from "lucide-react";
import { useLocation } from "wouter";
import { SeasonalThemeSwitcher } from "@/components/SeasonalThemeSwitcher";

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
      case 'communications':
        setLocation('/communications');
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
        setLocation('/admin/integrations');
        break;
      case 'marketing':
        setLocation('/admin/marketing');
        break;
      case 'inventory':
        setLocation('/inventory');
        break;
      case 'orders':
        setLocation('/orders');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Clean Header */}
      <div className="bg-card shadow-sm border-b border-border">
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
              {/* Seasonal Theme Switcher */}
              <SeasonalThemeSwitcher />
              
              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-50">
                    <UserAvatar user={user} size="md" />
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {user?.role || 'Admin'}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setLocation('/profile')} className="cursor-pointer">
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full">
          {/* Desktop Navigation */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-4 xl:gap-6 mb-8 p-3 xl:p-4 bg-card rounded-lg shadow-sm border border-border h-auto flex-wrap">
              {/* Core Operations */}
              <Button
                variant={currentTab === "dashboard" ? "default" : "ghost"}
                onClick={() => handleTabChange("dashboard")}
                className="nav-item-core flex items-center gap-2 px-4 xl:px-6 py-2 xl:py-3 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden xl:inline">Admin Dashboard</span>
                <span className="xl:hidden">Dashboard</span>
              </Button>
              <div className="h-6 w-px bg-gray-300 hidden lg:block"></div>
              <Button
                variant={currentTab === "employees" ? "default" : "ghost"}
                onClick={() => handleTabChange("employees")}
                className="nav-item-core flex items-center gap-2 px-4 xl:px-6 py-2 xl:py-3 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0"
              >
                <Users className="h-4 w-4" />
                <span className="hidden xl:inline">Employee Management</span>
                <span className="xl:hidden">Employees</span>
              </Button>
              <div className="h-6 w-px bg-gray-300 hidden lg:block"></div>
              <Button
                variant={currentTab === "scheduling" ? "default" : "ghost"}
                onClick={() => handleTabChange("scheduling")}
                className="nav-item-core flex items-center gap-2 px-4 xl:px-6 py-2 xl:py-3 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden xl:inline">Schedule Management</span>
                <span className="xl:hidden">Schedule</span>
              </Button>
              <div className="h-6 w-px bg-gray-300 hidden lg:block"></div>
              <Button
                variant={currentTab === "accounting" ? "default" : "ghost"}
                onClick={() => handleTabChange("accounting")}
                className="nav-item-core flex items-center gap-2 px-4 xl:px-6 py-2 xl:py-3 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0"
              >
                <DollarSign className="h-4 w-4" />
                <span className="hidden xl:inline">Accounting</span>
                <span className="xl:hidden">Finance</span>
              </Button>
              <div className="h-6 w-px bg-gray-300 hidden lg:block"></div>
              <Button
                variant={currentTab === "inventory" ? "default" : "ghost"}
                onClick={() => handleTabChange("inventory")}
                className="nav-item-core flex items-center gap-2 px-4 xl:px-6 py-2 xl:py-3 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0"
              >
                <Package className="h-4 w-4" />
                <span className="hidden xl:inline">Inventory</span>
                <span className="xl:hidden">Inventory</span>
              </Button>
              <div className="h-6 w-px bg-gray-300 hidden lg:block"></div>
              <Button
                variant={currentTab === "orders" ? "default" : "ghost"}
                onClick={() => handleTabChange("orders")}
                className="nav-item-core flex items-center gap-2 px-4 xl:px-6 py-2 xl:py-3 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden xl:inline">Orders</span>
                <span className="xl:hidden">Orders</span>
              </Button>
              <div className="h-6 w-px bg-gray-300 hidden lg:block"></div>
              <Button
                variant={currentTab === "marketing" ? "default" : "ghost"}
                onClick={() => handleTabChange("marketing")}
                className="nav-item-core flex items-center gap-2 px-4 xl:px-6 py-2 xl:py-3 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0"
              >
                <Video className="h-4 w-4" />
                <span className="hidden xl:inline">Marketing Videos</span>
                <span className="xl:hidden">Marketing</span>
              </Button>
              <div className="h-6 w-px bg-gray-300 hidden lg:block"></div>
              <Button
                variant={currentTab === "communications" ? "default" : "ghost"}
                onClick={() => handleTabChange("communications")}
                className="nav-item-core flex items-center gap-2 px-4 xl:px-6 py-2 xl:py-3 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden xl:inline">Communications</span>
                <span className="xl:hidden">Comms</span>
              </Button>
              <div className="h-6 w-px bg-gray-300 hidden lg:block"></div>
              <Button
                variant={currentTab === "integrations" ? "default" : "ghost"}
                onClick={() => handleTabChange("integrations")}
                className="nav-item-core flex items-center gap-2 px-4 xl:px-6 py-2 xl:py-3 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden xl:inline">Integrations</span>
                <span className="xl:hidden">Integrations</span>
              </Button>

              {/* Secondary Items - Hidden on smaller screens */}
              <div className="h-6 w-px bg-gray-300 hidden xl:block"></div>
              <Button
                variant={currentTab === "system-support" ? "default" : "ghost"}
                onClick={() => handleTabChange("system-support")}
                className="nav-item-secondary hidden xl:flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0 text-sm"
              >
                <FileText className="h-3 w-3" />
                Support
              </Button>
              <Button
                variant={currentTab === "user-management" ? "default" : "ghost"}
                onClick={() => handleTabChange("user-management")}
                className="nav-item-secondary hidden xl:flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0 text-sm"
              >
                <Settings className="h-3 w-3" />
                Users
              </Button>
              <Button
                variant={currentTab === "employee-view" ? "default" : "ghost"}
                onClick={() => handleTabChange("employee-view")}
                className="nav-item-secondary hidden xl:flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0 text-sm"
              >
                <Eye className="h-3 w-3" />
                Employee View
              </Button>
              <Button
                variant={currentTab === "reports" ? "default" : "ghost"}
                onClick={() => handleTabChange("reports")}
                className="nav-item-secondary hidden xl:flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap mx-0 text-sm"
              >
                <Clock className="h-3 w-3" />
                Reports
              </Button>

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
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm border flex-wrap">
              <Button
                variant={currentTab === "dashboard" ? "default" : "ghost"}
                onClick={() => handleTabChange("dashboard")}
                className="flex items-center gap-1 px-3 py-2 rounded-md hover:bg-blue-50 transition-colors text-sm"
              >
                <Settings className="h-3 w-3" />
                Dashboard
              </Button>
              <Button
                variant={currentTab === "employees" ? "default" : "ghost"}
                onClick={() => handleTabChange("employees")}
                className="flex items-center gap-1 px-3 py-2 rounded-md hover:bg-blue-50 transition-colors text-sm"
              >
                <Users className="h-3 w-3" />
                Employees
              </Button>
              <Button
                variant={currentTab === "scheduling" ? "default" : "ghost"}
                onClick={() => handleTabChange("scheduling")}
                className="flex items-center gap-1 px-3 py-2 rounded-md hover:bg-blue-50 transition-colors text-sm"
              >
                <Calendar className="h-3 w-3" />
                Schedule
              </Button>
              <Button
                variant={currentTab === "communications" ? "default" : "ghost"}
                onClick={() => handleTabChange("communications")}
                className="flex items-center gap-1 px-3 py-2 rounded-md hover:bg-blue-50 transition-colors text-sm"
              >
                <MessageSquare className="h-3 w-3" />
                Communications
              </Button>
              <Button
                variant={currentTab === "marketing" ? "default" : "ghost"}
                onClick={() => handleTabChange("marketing")}
                className="flex items-center gap-1 px-3 py-2 rounded-md hover:bg-blue-50 transition-colors text-sm"
              >
                <Video className="h-3 w-3" />
                Marketing
              </Button>
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
                  variant={currentTab === "communications" ? "default" : "ghost"}
                  onClick={() => { handleTabChange("communications"); setMobileMenuOpen(false); }}
                  className="w-full justify-start gap-2 h-10 hover:bg-blue-50 hover:text-blue-700"
                >
                  <MessageSquare className="h-4 w-4" />
                  Communications
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
        </div>
      </div>
    </div>
  );
}