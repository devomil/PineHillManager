import { Router, Route, Switch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import AppLayout from "@/components/layout/app-layout";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Documents from "@/pages/documents";
import LogosPage from "@/pages/admin/logos";
import AnnouncementsPage from "@/pages/admin/announcements";
import AnnouncementsViewPage from "@/pages/announcements";
import Calendar from "@/pages/calendar";
import Employees from "@/pages/employees";
import TimeManagement from "@/pages/time-management";
import ShiftScheduling from "@/pages/shift-scheduling";
import Communication from "@/pages/communication";
import Training from "@/pages/training";
import AdminTraining from "@/pages/admin-training";
import Profile from "@/pages/profile";
import Reports from "@/pages/reports";
import Notifications from "@/pages/notifications";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/employees" component={Employees} />
        <Route path="/time-management" component={TimeManagement} />
        <Route path="/shift-scheduling" component={ShiftScheduling} />
        <Route path="/communication" component={Communication} />
        <Route path="/training" component={Training} />
        <Route path="/admin/training" component={AdminTraining} />
        <Route path="/profile" component={Profile} />
        <Route path="/reports" component={Reports} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/documents" component={Documents} />
        <Route path="/admin/logos" component={LogosPage} />
        <Route path="/admin/announcements" component={AnnouncementsPage} />
        <Route path="/announcements" component={AnnouncementsViewPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function UnauthenticatedApp() {
  return <Home />;
}

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <AuthenticatedApp /> : <UnauthenticatedApp />;
}

function App() {
  return (
    <Router>
      <AppRouter />
    </Router>
  );
}

export default App;
