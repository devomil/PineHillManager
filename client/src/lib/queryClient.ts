import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 500,
      refetchOnWindowFocus: true,
      staleTime: 0,
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        console.log('Making request to:', url);
        
        try {
          const response = await fetch(url, {
            credentials: 'include',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
              'Content-Type': 'application/json',
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
          
          const text = await response.text();
          console.log('Raw response text for', url, ':', text);
          
          let data;
          try {
            data = JSON.parse(text);
            console.log('Parsed response data for', url, ':', data);
          } catch (e) {
            console.error('Failed to parse JSON for', url, ':', text);
            throw new Error('Invalid JSON response');
          }
          
          return data;
        } catch (error) {
          console.error('Fetch error for', url, ':', error);
          throw error;
        }
      },
    },
  },
});

export async function apiRequest(method: string, url: string, data?: any) {
  console.log('API Request:', method, url, 'with data:', data);
  
  const options: RequestInit = {
    method,
    credentials: 'include',
    mode: 'cors',
    cache: 'no-cache',
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  console.log('API Response status:', response.status, 'for', method, url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', response.status, errorText);
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response;
}