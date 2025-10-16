import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  redirectTo = "/dashboard" 
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return;

    // If not authenticated, redirect to login
    if (!user) {
      setLocation("/auth");
      return;
    }

    // If no role restrictions, allow access
    if (allowedRoles.length === 0) {
      return;
    }

    // If user doesn't have required role, redirect to dashboard
    if (!allowedRoles.includes(user.role)) {
      setLocation(redirectTo);
    }
  }, [user, isLoading, allowedRoles, redirectTo, setLocation]);

  // Show nothing while loading or checking permissions
  if (isLoading || !user) {
    return null;
  }

  // If no role restrictions or user has required role, render children
  if (allowedRoles.length === 0 || allowedRoles.includes(user.role)) {
    return <>{children}</>;
  }

  // Show nothing while redirecting
  return null;
}
