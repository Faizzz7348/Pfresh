import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Request deduplication map
const pendingRequests = new Map<string, Promise<Response>>();

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Create unique request key for deduplication
  const requestKey = `${method}:${url}:${data ? JSON.stringify(data) : ''}`;
  
  // Return existing pending request if found (GET only)
  if (method === 'GET' && pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey)!.then(res => res.clone());
  }
  
  const requestPromise = fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  }).then(async (res) => {
    await throwIfResNotOk(res);
    // Remove from pending after completion
    if (method === 'GET') {
      pendingRequests.delete(requestKey);
    }
    return res;
  }).catch((error) => {
    // Remove from pending on error
    if (method === 'GET') {
      pendingRequests.delete(requestKey);
    }
    throw error;
  });
  
  // Store pending request (GET only)
  if (method === 'GET') {
    pendingRequests.set(requestKey, requestPromise);
  }
  
  return requestPromise;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Refetch when user returns to tab
      refetchOnReconnect: true, // Refetch when internet reconnects
      staleTime: 5 * 60 * 1000, // 5 minutes default
      gcTime: 30 * 60 * 1000, // 30 minutes garbage collection (increased)
      retry: 2, // Retry twice on failure
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      networkMode: 'online', // Only fetch when online
    },
    mutations: {
      retry: 1, // Retry mutations once
      retryDelay: 1000,
      networkMode: 'online',
    },
  },
});

// In-memory cache for frequently accessed static data
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const MEMORY_CACHE_TTL = 60 * 1000; // 1 minute

export function getFromMemoryCache<T>(key: string): T | null {
  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.timestamp < MEMORY_CACHE_TTL) {
    return cached.data;
  }
  memoryCache.delete(key);
  return null;
}

export function setMemoryCache(key: string, data: any) {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

// Prefetch common data on app load with priority
export function prefetchCommonData() {
  // High priority - columns (rarely change)
  queryClient.prefetchQuery({
    queryKey: ['/api/table-columns'],
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
  
  // Medium priority - rows (change often but needed immediately)
  setTimeout(() => {
    queryClient.prefetchQuery({
      queryKey: ['/api/table-rows'],
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }, 100);
  
  // Low priority - saved links (optional data)
  setTimeout(() => {
    queryClient.prefetchQuery({
      queryKey: ['/api/saved-share-links'],
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  }, 500);
}

// Clear memory cache periodically
setInterval(() => {
  const now = Date.now();
  Array.from(memoryCache.entries()).forEach(([key, value]) => {
    if (now - value.timestamp > MEMORY_CACHE_TTL) {
      memoryCache.delete(key);
    }
  });
}, MEMORY_CACHE_TTL);
