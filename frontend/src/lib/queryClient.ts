import { QueryClient } from "@tanstack/react-query";

/**
 * React Query client configuration
 * Provides caching, stale-while-revalidate, and request deduplication
 * 
 * Note: Retry logic with exponential backoff is handled at the apiClient level,
 * so React Query retries are kept minimal to avoid double retries
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Cached data is kept for 10 minutes after it becomes unused
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Retry failed requests once (apiClient handles detailed retry logic with exponential backoff)
      retry: 1,
      // Exponential backoff for React Query retries (in addition to apiClient retries)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (useful for keeping data fresh)
      refetchOnWindowFocus: false,
      // Refetch on reconnect (useful for offline support)
      refetchOnReconnect: true,
      // Network mode: prefer online, but allow stale data when offline
      networkMode: "online",
    },
    mutations: {
      // Don't retry mutations at React Query level (apiClient handles retries)
      retry: false,
      // Network mode: prefer online
      networkMode: "online",
    },
  },
});
