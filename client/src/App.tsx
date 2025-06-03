import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import TimeManagement from "@/pages/time-management";
import Communication from "@/pages/communication";
import Employees from "@/pages/employees";
import TestCalendar from "@/pages/test-calendar";
import Marketing from "@/pages/marketing";
import Training from "@/pages/training";
import AdminTraining from "@/pages/admin-training";
import Reports from "@/pages/reports";
import Diagnostics from "@/pages/diagnostics";
import Notifications from "@/pages/notifications";
import Profile from "@/pages/profile";
import AppLayout from "@/components/layout/app-layout";
import ProtectedRoute from "@/components/common/protected-route";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <AppLayout>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/calendar">
            <div className="p-6">
              <h1 className="text-2xl font-bold">Global Calendar Debug</h1>
              <p>Route is working. Testing component loading...</p>
              <TestCalendar />
            </div>
          </Route>
          <Route path="/time" component={TimeManagement} />
          <Route path="/communication" component={Communication} />
          <Route path="/marketing" component={Marketing} />
          <Route path="/training" component={Training} />
          <Route path="/reports" component={Reports} />
          <Route path="/diagnostics" component={Diagnostics} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/profile" component={Profile} />
          
          {/* Admin-only routes */}
          <Route path="/employees">
            <ProtectedRoute requiredRole="admin">
              <Employees />
            </ProtectedRoute>
          </Route>
          <Route path="/admin-training">
            <ProtectedRoute requiredRole="admin">
              <AdminTraining />
            </ProtectedRoute>
          </Route>
        </AppLayout>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
