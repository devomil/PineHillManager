import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import StatsCards from "@/components/dashboard/stats-cards";
import TimeOffRequestsCard from "@/components/dashboard/time-off-requests-card";
import QuickActionsPanel from "@/components/dashboard/quick-actions-panel";
import UpcomingShifts from "@/components/dashboard/upcoming-shifts";
import AnnouncementsFeed from "@/components/dashboard/announcements-feed";
import { QuickChat } from "@/components/quick-chat";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-farm-green"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Welcome back, {user?.firstName || 'Employee'}!
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Announcements Feed */}
      <AnnouncementsFeed />

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Time Off Requests */}
        <div className="lg:col-span-2">
          <TimeOffRequestsCard />
        </div>

        {/* Quick Actions Panel */}
        <div>
          <QuickActionsPanel />
        </div>
      </div>

      {/* Upcoming Shifts */}
      <UpcomingShifts />

      {/* Quick Chat - Floating Chat Interface */}
      <QuickChat isOpen={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
    </div>
  );
}
