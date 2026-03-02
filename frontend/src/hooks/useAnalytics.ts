import { useQuery } from "@tanstack/react-query";
import {
  analyticsApi,
  type AnalyticsSummary,
  type TopQueriesResponse,
  type LeadAnalyticsResponse,
  type ChannelAnalyticsResponse,
  type ContentAnalyticsResponse,
  type SatisfactionAnalyticsResponse,
  type ApiError,
} from "@/lib/api";

/**
 * Query keys for analytics (stable references for cache invalidation)
 */
export const analyticsKeys = {
  all: ["analytics"] as const,
  summary: (days: number) => [...analyticsKeys.all, "summary", days] as const,
  topQueries: (limit: number) => [...analyticsKeys.all, "top-queries", limit] as const,
  leads: (days: number) => [...analyticsKeys.all, "leads", days] as const,
  channels: () => [...analyticsKeys.all, "channels"] as const,
  content: (days: number) => [...analyticsKeys.all, "content", days] as const,
  satisfaction: (days: number) => [...analyticsKeys.all, "satisfaction", days] as const,
};

/**
 * Hook to fetch analytics summary (7.3.2, 7.3.3)
 */
export function useAnalyticsSummary(days: number = 7) {
  return useQuery<AnalyticsSummary, ApiError>({
    queryKey: analyticsKeys.summary(days),
    queryFn: () => analyticsApi.getSummary(days),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchInterval: 30000,
  });
}

/**
 * Hook to fetch top queries (7.3.5)
 */
export function useTopQueries(limit: number = 10) {
  return useQuery<TopQueriesResponse, ApiError>({
    queryKey: analyticsKeys.topQueries(limit),
    queryFn: () => analyticsApi.getTopQueries(limit),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch lead analytics (7.3.6 — Lead Analytics Section)
 */
export function useLeadsAnalytics(days: number = 30) {
  return useQuery<LeadAnalyticsResponse, ApiError>({
    queryKey: analyticsKeys.leads(days),
    queryFn: () => analyticsApi.getLeadsAnalytics(days),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch channel analytics (7.3.4 — Channel Analytics Section)
 */
export function useChannelAnalytics() {
  return useQuery<ChannelAnalyticsResponse, ApiError>({
    queryKey: analyticsKeys.channels(),
    queryFn: () => analyticsApi.getChannelAnalytics(),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch content analytics (7.3.5 — Content Analytics Section)
 */
export function useContentAnalytics(days: number = 30) {
  return useQuery<ContentAnalyticsResponse, ApiError>({
    queryKey: analyticsKeys.content(days),
    queryFn: () => analyticsApi.getContentAnalytics(days),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch satisfaction analytics (7.3.7 — Satisfaction Analytics Section)
 */
export function useSatisfactionAnalytics(days: number = 30) {
  return useQuery<SatisfactionAnalyticsResponse, ApiError>({
    queryKey: analyticsKeys.satisfaction(days),
    queryFn: () => analyticsApi.getSatisfactionAnalytics(days),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
