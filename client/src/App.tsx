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
import ShiftScheduling from "@/pages/shift-scheduling";
import Marketing from "@/pages/marketing";
import Training from "@/pages/training";
import AdminTraining from "@/pages/admin-training";
import Reports from "@/pages/reports";
import Diagnostics from "@/pages/diagnostics";
import Notifications from "@/pages/notifications";
import Profile from "@/pages/profile";
import DocumentManagement from "@/pages/document-management";
import AppLayout from "@/components/layout/app-layout";
import ProtectedRoute from "@/components/common/protected-route";
import { Component, ReactNode } from "react";

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">Please refresh the page to try again.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function Router() {
  try {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    return (
      <Switch>
        <Route path="/calendar" component={TestCalendar} />
        <Route path="/notifications" component={Notifications} />
        {!isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <AppLayout>
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/time" component={TimeManagement} />
            <Route path="/communication" component={Communication} />
            <Route path="/marketing" component={Marketing} />
            <Route path="/training" component={Training} />
            <Route path="/reports" component={Reports} />
            <Route path="/diagnostics" component={Diagnostics} />
            <Route path="/documents" component={DocumentManagement} />

            <Route path="/profile" component={Profile} />
            
            {/* Manager/Admin routes */}
            <Route path="/shift-scheduling" component={ShiftScheduling} />
            
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
  } catch (error) {
    console.error('Router error:', error);
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Error</h1>
          <p className="text-gray-600 mb-4">There was an error loading the application.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
