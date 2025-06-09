import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TimeOffRequestsTab from "@/components/time/time-off-requests-tab";
import ShiftCoverageTab from "@/components/time/shift-coverage-tab";
import WorkScheduleTab from "@/components/time/work-schedule-tab";
import TeamCalendarTab from "@/components/time/team-calendar-tab";

export default function TimeManagement() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [activeTab, setActiveTab] = useState("requests");

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Time Management</h1>
        <p className="text-slate-500 mt-1">
          Manage your time off requests, schedules, and shift coverage
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-5">
          <TabsTrigger value="requests">My Requests</TabsTrigger>
          <TabsTrigger value="coverage">Shift Coverage</TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
          )}
          <TabsTrigger value="calendar">Team Calendar</TabsTrigger>
          <TabsTrigger value="schedules">Work Schedules</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          <TimeOffRequestsTab />
        </TabsContent>

        <TabsContent value="coverage" className="space-y-6">
          <ShiftCoverageTab />
        </TabsContent>

        {user?.role === 'admin' && (
          <TabsContent value="approvals" className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Pending Approvals
              </h3>
              <p className="text-slate-500">
                Admin approval functionality will be implemented here.
              </p>
            </div>
          </TabsContent>
        )}

        <TabsContent value="calendar" className="space-y-6">
          <TeamCalendarTab />
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6">
          <WorkScheduleTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
