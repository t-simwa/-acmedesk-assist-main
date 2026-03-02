import { useQuery } from "@tanstack/react-query";
import { dashboardApi, type DashboardSummary, type ApiError } from "@/lib/api";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: (preset: string) => [...dashboardKeys.all, "summary", preset] as const,
};

export function useDashboardSummary(preset: string = "7days") {
  return useQuery<DashboardSummary, ApiError>({
    queryKey: dashboardKeys.summary(preset),
    queryFn: () => dashboardApi.getSummary(preset),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchInterval: 30000,
  });
}
