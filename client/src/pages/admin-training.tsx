import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, BarChart3, Settings } from "lucide-react";

export default function AdminTraining() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

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

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Access Denied
            </h2>
            <p className="text-slate-500">
              This page is only accessible to administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Training</h1>
        <p className="text-slate-500 mt-1">
          Manage training content and monitor employee progress
        </p>
      </div>

      {/* Admin Training Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GraduationCap className="w-5 h-5 mr-2 text-farm-green" />
              Training Modules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500">
              Create and manage training modules for employees.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-farm-blue" />
              Employee Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500">
              Monitor individual and team training progress.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-farm-brown" />
              Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500">
              Generate training completion and performance reports.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2 text-farm-gray" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500">
              Configure training requirements and policies.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
