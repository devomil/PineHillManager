import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { z } from "zod";

const CRITICAL_ENDPOINTS = [
  '/api/accounting/cogs',
  '/api/accounting/analytics',
  '/api/accounting/payroll',
  '/api/accounting/monthly'
];

export interface QueryParams {
  [key: string]: string | number | boolean | undefined | null;
}

export interface TypeSafeQueryKey<T extends QueryParams = QueryParams> {
  url: string;
  params?: T;
  schema?: z.ZodSchema<T>;
}

export function buildQueryKey<T extends QueryParams>(
  url: string,
  params?: T,
  schema?: z.ZodSchema<T>
): [string, T | undefined] {
  if (params && schema) {
    try {
      schema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const missingFields = error.errors.map(e => e.path.join('.')).join(', ');
        console.error(`⚠️ Query parameter validation failed for ${url}:`, error.errors);
        throw new Error(
          `Missing or invalid required parameters for ${url}: ${missingFields}. ` +
          `This may cause data loss or API errors. Please ensure all required fields are provided.`
        );
      }
      throw error;
    }
  }
  
  return [url, params];
}

const DateRangeParamsSchema = z.object({
  startDate: z.string().min(1, "startDate is required"),
  endDate: z.string().min(1, "endDate is required"),
});

export type DateRangeParams = z.infer<typeof DateRangeParamsSchema>;

export const QuerySchemas = {
  dateRange: DateRangeParamsSchema,
  
  cogsLabor: DateRangeParamsSchema,
  cogsMaterial: DateRangeParamsSchema,
  cogsByProduct: DateRangeParamsSchema,
  cogsByEmployee: DateRangeParamsSchema,
  cogsByLocation: DateRangeParamsSchema,
  
  profitLoss: DateRangeParamsSchema,
  multiLocation: DateRangeParamsSchema,
};

function isCriticalEndpoint(url: string): boolean {
  return CRITICAL_ENDPOINTS.some(endpoint => url.includes(endpoint));
}

function logError(context: string, error: any, metadata?: any) {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    context,
    error: error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: error.stack
    } : error,
    metadata,
    isCritical: metadata?.url ? isCriticalEndpoint(metadata.url) : false
  };
  
  console.error(`[${timestamp}] ${context}:`, errorLog);
  
  if (errorLog.isCritical) {
    console.error('⚠️ CRITICAL ENDPOINT FAILURE - Data loss risk detected!', errorLog);
  }
  
  return errorLog;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any, query) => {
      const url = (error as any).url || (query.queryKey[0] as string);
      logError('Query Failed', error, { 
        type: 'query',
        url,
        queryKey: query.queryKey,
        timestamp: new Date().toISOString()
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: any, variables, context, mutation) => {
      logError('Mutation Failed', error, { 
        type: 'mutation',
        variables,
        timestamp: new Date().toISOString()
      });
    },
  }),
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 500,
      refetchOnWindowFocus: true,
      staleTime: 0,
      queryFn: async ({ queryKey }) => {
        let url = queryKey[0] as string;
        
        // Handle query parameters from queryKey
        if (queryKey.length > 1 && typeof queryKey[1] === 'object' && queryKey[1] !== null) {
          const params = new URLSearchParams();
          const paramsObj = queryKey[1] as Record<string, any>;
          
          Object.entries(paramsObj).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              params.append(key, String(value));
            }
          });
          
          if (params.toString()) {
            url += (url.includes('?') ? '&' : '?') + params.toString();
          }
        }
        
        if (import.meta.env.DEV) console.log('QueryClient: Making request to:', url);
        
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
          
          if (import.meta.env.DEV) console.log('Response status:', response.status, 'for', url);
          
          if (!response.ok) {
            const errorMetadata = {
              url,
              status: response.status,
              statusText: response.statusText,
              queryKey
            };
            
            if (response.status === 401) {
              console.log('Authentication required for:', url);
              console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            }
            
            logError('HTTP Error', new Error(`${response.status}: ${response.statusText}`), errorMetadata);
            
            const error = new Error(`${response.status}: ${response.statusText}`);
            (error as any).url = url;
            (error as any).status = response.status;
            (error as any).queryKey = queryKey;
            throw error;
          }
          
          const text = await response.text();
          if (import.meta.env.DEV) console.log('Raw response text for', url, ':', text);
          
          let data;
          try {
            data = JSON.parse(text);
            if (import.meta.env.DEV) console.log('Parsed response data for', url, ':', data);
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
  if (import.meta.env.DEV) console.log('API Request:', method, url, 'with data:', data);
  
  const options: RequestInit = {
    method,
    credentials: 'include',
    mode: 'cors',
    cache: 'no-cache',
  };

  // Handle FormData differently - don't set Content-Type header, let browser handle it
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    if (data instanceof FormData) {
      options.body = data;
      // Don't set Content-Type for FormData - browser will set it with boundary
    } else {
      options.headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
      };
      options.body = JSON.stringify(data);
    }
  } else {
    options.headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
  }

  const response = await fetch(url, options);
  if (import.meta.env.DEV) console.log('API Response status:', response.status, 'for', method, url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', response.status, errorText);
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response;
}