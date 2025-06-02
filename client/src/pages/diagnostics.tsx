import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Activity, AlertTriangle, Shield } from "lucide-react";

export default function Diagnostics() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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
        <h1 className="text-2xl font-bold text-slate-900">System Diagnostics</h1>
        <p className="text-slate-500 mt-1">
          Monitor system health and troubleshoot issues
        </p>
      </div>

      {/* Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-farm-green" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500">
              Monitor system performance and health metrics.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
              Error Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500">
              Track and resolve application errors and issues.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2 text-farm-blue" />
              Security Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500">
              Monitor security events and access logs.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2 text-farm-brown" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500">
              System configuration and debugging tools.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
