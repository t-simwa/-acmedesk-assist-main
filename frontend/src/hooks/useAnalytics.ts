import { useQuery } from "@tanstack/react-query";
import { analyticsApi, type AnalyticsSummary, type TopQueriesResponse, type ApiError } from "@/lib/api";

/**
 * Query keys for analytics
 */
export const analyticsKeys = {
  all: ["analytics"] as const,
  summary: (days: number) => [...analyticsKeys.all, "summary", days] as const,
  topQueries: (limit: number) => [...analyticsKeys.all, "top-queries", limit] as const,
};

/**
 * Hook to fetch analytics summary with caching
 */
export function useAnalyticsSummary(days: number = 7) {
  return useQuery<AnalyticsSummary, ApiError>({
    queryKey: analyticsKeys.summary(days),
    queryFn: () => analyticsApi.getSummary(days),
    staleTime: 30 * 1000, // 30 seconds - analytics data changes frequently
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
}

/**
 * Hook to fetch top queries with caching
 */
export function useTopQueries(limit: number = 10) {
  return useQuery<TopQueriesResponse, ApiError>({
    queryKey: analyticsKeys.topQueries(limit),
    queryFn: () => analyticsApi.getTopQueries(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
