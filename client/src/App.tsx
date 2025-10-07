import { Router, Route, Switch } from "wouter";
import { useAuth, AuthProvider } from "@/hooks/use-auth";
import { useFontLoader } from "@/hooks/use-font-loader";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AuthPage from "@/pages/auth-page";
import HomeDashboard from "@/pages/home-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import Documents from "@/pages/documents";
import LogosPage from "@/pages/admin/logos";
import AdminEmployeesPage from "@/pages/admin/employees";
import CommunicationsPage from "@/pages/communications";
import Calendar from "@/pages/calendar";
import Employees from "@/pages/employees";
import TimeManagement from "@/pages/time-management";
import ShiftScheduling from "@/pages/shift-scheduling";
import ShiftSwapMarketplace from "@/pages/shift-swap-marketplace";
import Training from "@/pages/training";
import AdminTraining from "@/pages/admin-training";
import Profile from "@/pages/profile";
import Reports from "@/pages/reports";
import Notifications from "@/pages/notifications";
import TimeClock from "@/pages/time-clock";
import Schedule from "@/pages/schedule";
import TimeOff from "@/pages/time-off";
import ShiftCoverage from "@/pages/shift-coverage";
import SystemSupport from "@/pages/system-support";
import EmployeeSupport from "@/pages/employee-support";
import UserManagement from "@/pages/user-management";
import AccountingDashboard from "@/pages/accounting-dashboard";
import IntegrationsPage from "@/pages/integrations-page";
import MarketingPage from "@/pages/marketing-page";
import InventoryPage from "@/pages/inventory";
import OrdersPage from "@/pages/orders";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import EmergencyContactPage from "@/pages/emergency-contact";
import EmployeePurchases from "@/pages/employee-purchases";
import AdminEmployeePurchases from "@/pages/admin/admin-employee-purchases";

function AuthenticatedApp() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  
  return (
    <Switch>
      <Route path="/" component={isAdmin ? AdminDashboard : HomeDashboard} />
      <Route path="/dashboard" component={HomeDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/employees" component={Employees} />
      <Route path="/admin/employees" component={AdminEmployeesPage} />
      <Route path="/time-management" component={TimeManagement} />
      <Route path="/shift-scheduling" component={ShiftScheduling} />
      <Route path="/shift-swaps" component={ShiftSwapMarketplace} />
      <Route path="/communication" component={CommunicationsPage} />
      <Route path="/training" component={Training} />
      <Route path="/admin/training" component={AdminTraining} />
      <Route path="/profile" component={Profile} />
      <Route path="/reports" component={Reports} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/documents" component={Documents} />
      <Route path="/admin/logos" component={LogosPage} />
      <Route path="/announcements" component={CommunicationsPage} />
      <Route path="/communications" component={CommunicationsPage} />
      <Route path="/time-clock" component={TimeClock} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/time-off" component={TimeOff} />
      <Route path="/shift-coverage" component={ShiftCoverage} />
      <Route path="/team-communication" component={CommunicationsPage} />
      <Route path="/system-support" component={SystemSupport} />
      <Route path="/support" component={EmployeeSupport} />
      <Route path="/user-management" component={UserManagement} />
      <Route path="/accounting" component={AccountingDashboard} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/integrations" component={IntegrationsPage} />
      <Route path="/admin/accounting" component={AccountingDashboard} />
      <Route path="/admin/integrations" component={IntegrationsPage} />
      <Route path="/admin/marketing" component={MarketingPage} />
      <Route path="/admin/employee-purchases" component={AdminEmployeePurchases} />
      <Route path="/employee-purchases" component={EmployeePurchases} />
      <Route path="/emergency-contact" component={EmergencyContactPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function UnauthenticatedApp() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/emergency-contact" component={EmergencyContactPage} />
      <Route component={Landing} />
    </Switch>
  );
}

function AppRouter() {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  // Initialize font loading for consistent branding
  useFontLoader();

  if (import.meta.env.DEV) console.log('Auth state:', { isAuthenticated, isLoading, user });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (import.meta.env.DEV) console.log('Rendering:', isAuthenticated ? 'AuthenticatedApp' : 'UnauthenticatedApp');
  
  // Force re-render when user data changes
  if (isAuthenticated && user) {
    return <AuthenticatedApp key={user.id} />;
  } else {
    return <UnauthenticatedApp />;
  }
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRouter />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
