import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: 3,
    retryDelay: 1000,
  });

  console.log("useAuth - user:", user, "isLoading:", isLoading, "error:", error);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}