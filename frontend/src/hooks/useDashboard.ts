import { useQuery } from "@tanstack/react-query";
import { dashboardApi, type DashboardSummary, type ApiError } from "@/lib/api";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: (preset: string) => [...dashboardKeys.all, "summary", preset] as const,
};

export function useDashboardSummary(
  preset: string = "7days",
  start_date?: string,
  end_date?: string,
) {
  const key = start_date && end_date ? [...dashboardKeys.summary(preset), start_date, end_date] : dashboardKeys.summary(preset);
  return useQuery<DashboardSummary, ApiError>({
    queryKey: key,
    queryFn: () => dashboardApi.getSummary(preset, start_date, end_date),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchInterval: 30000,
  });
}
