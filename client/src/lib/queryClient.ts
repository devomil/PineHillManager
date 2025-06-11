import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: true,
      staleTime: 0,
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        console.log('Making request to:', url);
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Accept': 'application/json',
          },
        });
        
        console.log('Response status:', response.status, 'for', url);
        
        if (!response.ok) {
          if (response.status === 401) {
            console.log('Authentication required for:', url);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
          }
          console.log('Request failed:', response.status, response.statusText, 'for URL:', url);
          throw new Error(`${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Response data for', url, ':', data);
        return data;
      },
    },
  },
});

export async function apiRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}