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
  summary: (rangeKey: string) => [...analyticsKeys.all, "summary", rangeKey] as const,
  topQueries: (limit: number) => [...analyticsKeys.all, "top-queries", limit] as const,
  leads: (rangeKey: string) => [...analyticsKeys.all, "leads", rangeKey] as const,
  channels: () => [...analyticsKeys.all, "channels"] as const,
  content: (rangeKey: string) => [...analyticsKeys.all, "content", rangeKey] as const,
  satisfaction: (rangeKey: string) => [...analyticsKeys.all, "satisfaction", rangeKey] as const,
};

/**
 * Hook to fetch analytics summary (7.3.2, 7.3.3)
 */
export function useAnalyticsSummary(options?: { range?: string; from?: string; to?: string; compare?: boolean }) {
  const rangeKey = options?.range ?? "30d";
  const compareKey = options?.compare ? "compare" : "no-compare";

  return useQuery<AnalyticsSummary, ApiError>({
    queryKey: analyticsKeys.summary(rangeKey + (options?.from ?? "") + (options?.to ?? "") + compareKey),
    queryFn: () => analyticsApi.getSummary(options),
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
export function useLeadsAnalytics(options?: { range?: string; from?: string; to?: string; compare?: boolean }) {
  const rangeKey = options?.range ?? "30d";
  const compareKey = options?.compare ? "compare" : "no-compare";

  return useQuery<LeadAnalyticsResponse, ApiError>({
    queryKey: analyticsKeys.leads(rangeKey + (options?.from ?? "") + (options?.to ?? "") + compareKey),
    queryFn: () => analyticsApi.getLeadsAnalytics(options),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch channel analytics (7.3.4 — Channel Analytics Section)
 */
export function useChannelAnalytics(options?: { range?: string; from?: string; to?: string; }) {
  const rangeKey = options?.range ?? "30d";
  return useQuery<ChannelAnalyticsResponse, ApiError>({
    queryKey: analyticsKeys.channels().concat(rangeKey, options?.from ?? "", options?.to ?? ""),
    queryFn: () => analyticsApi.getChannelAnalytics(options),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch content analytics (7.3.5 — Content Analytics Section)
 */
export function useContentAnalytics(options?: { range?: string; from?: string; to?: string; }) {
  const rangeKey = options?.range ?? "30d";
  return useQuery<ContentAnalyticsResponse, ApiError>({
    queryKey: analyticsKeys.content(rangeKey + (options?.from ?? "") + (options?.to ?? "")),
    queryFn: () => analyticsApi.getContentAnalytics(options),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch satisfaction analytics (7.3.7 — Satisfaction Analytics Section)
 */
export function useSatisfactionAnalytics(options?: { range?: string; from?: string; to?: string; }) {
  const rangeKey = options?.range ?? "30d";
  return useQuery<SatisfactionAnalyticsResponse, ApiError>({
    queryKey: analyticsKeys.satisfaction(rangeKey + (options?.from ?? "") + (options?.to ?? "")),
    queryFn: () => analyticsApi.getSatisfactionAnalytics(options),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
