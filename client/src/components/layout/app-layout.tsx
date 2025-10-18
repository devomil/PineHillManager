import { useState } from "react";
import { useLocation } from "wouter";
import Sidebar from "./sidebar";
import { Button } from "@/components/ui/button";
import { Bell, Plus } from "lucide-react";
import UserAvatar from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ContextualHelp, useContextualHelp } from "@/components/ui/contextual-help";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Extract current page from location for contextual help
  const currentPage = location.split('/')[1] || 'dashboard';

  const handleTimeOffRequest = () => {
    toast({
      title: "Time Off Request",
      description: "Time off request modal would open here",
    });
  };

  const handleNotifications = () => {
    toast({
      title: "Notifications",
      description: "Notifications panel would open here",
    });
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar 
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden mr-4"
                onClick={() => setMobileMenuOpen(true)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleNotifications}
                  className="relative"
                >
                  <Bell className="w-5 h-5" />
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-red-500 text-white flex items-center justify-center"
                  >
                    3
                  </Badge>
                </Button>
              </div>
              
              {/* Quick Actions */}
              <Button 
                onClick={handleTimeOffRequest}
                size="sm"
                className="bg-farm-green hover:bg-green-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Request Time Off
              </Button>

              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <UserAvatar user={user as any} size="md" />
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-slate-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">
                    {user?.role || 'Employee'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Contextual Help System */}
      <ContextualHelp 
        currentPage={currentPage}
        userRole={user?.role}
      />
    </div>
  );
}
