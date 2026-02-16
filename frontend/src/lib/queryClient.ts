import { QueryClient } from "@tanstack/react-query";

/**
 * React Query client configuration
 * Provides caching, stale-while-revalidate, and request deduplication
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Cached data is kept for 10 minutes after it becomes unused
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Retry failed requests 2 times
      retry: 2,
      // Refetch on window focus (useful for keeping data fresh)
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect by default (can be overridden per query)
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});
