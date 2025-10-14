import { ReactNode, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import UserAvatar from "@/components/user-avatar";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { SeasonalThemeSwitcher } from "@/components/SeasonalThemeSwitcher";
import { AdminSidebar } from "@/components/admin-sidebar";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
  currentTab: string;
}

export default function AdminLayout({ children, currentTab }: AdminLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Listen to sidebar state changes
  useEffect(() => {
    const handleStorageChange = () => {
      const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
      setIsSidebarCollapsed(collapsed);
    };

    // Initial check
    handleStorageChange();

    // Listen for changes
    window.addEventListener('storage', handleStorageChange);
    // Custom event for same-tab changes
    window.addEventListener('sidebar-toggle', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sidebar-toggle', handleStorageChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <AdminSidebar currentTab={currentTab} />

      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b border-gray-200 z-20">
        <div className={cn(
          "transition-all duration-300 px-4 sm:px-6 lg:px-8",
          isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        )}>
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-brand brand-title" 
                    style={{ fontFamily: "'Great Vibes', cursive" }}>
                  Pine Hill Farm
                </h1>
                <p className="text-sm text-gray-600 hidden sm:block">Admin Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Seasonal Theme Switcher */}
              <SeasonalThemeSwitcher />
              
              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-50">
                    <UserAvatar 
                      user={user ? {
                        firstName: user.firstName || undefined,
                        lastName: user.lastName || undefined,
                        profileImageUrl: user.profileImageUrl
                      } : undefined} 
                      size="md" 
                    />
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
      <div className={cn(
        "pt-20 transition-all duration-300",
        isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
      )}>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </div>
    </div>
  );
}