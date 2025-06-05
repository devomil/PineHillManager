import { Router, Route, Switch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/app-layout";
import Home from "@/pages/Home";
import Dashboard from "@/pages/dashboard";
import Documents from "@/pages/documents";
import LogosPage from "@/pages/admin/logos";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/documents" component={Documents} />
        <Route path="/admin/logos" component={LogosPage} />
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
