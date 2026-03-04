/**
 * useCampaigns — React Query hooks for Campaigns page (9.9)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  campaignsApi,
  type CampaignListFilters,
  type CampaignCreateRequest,
  type CampaignUpdateRequest,
} from "@/lib/api";

export const campaignKeys = {
  all: ["campaigns"] as const,
  list: (filters: CampaignListFilters) => [...campaignKeys.all, "list", filters] as const,
  detail: (id: string) => [...campaignKeys.all, "detail", id] as const,
  stats: () => [...campaignKeys.all, "stats"] as const,
};

export function useCampaignsList(filters: CampaignListFilters = {}) {
  return useQuery({
    queryKey: campaignKeys.list(filters),
    queryFn: () => campaignsApi.list(filters),
    staleTime: 30_000,
    gcTime: 120_000,
    retry: 1,
  });
}

export function useCampaignDetail(id: string | null) {
  return useQuery({
    queryKey: campaignKeys.detail(id ?? ""),
    queryFn: () => campaignsApi.get(id!),
    enabled: !!id,
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 1,
  });
}

export function useCampaignStats() {
  return useQuery({
    queryKey: campaignKeys.stats(),
    queryFn: () => campaignsApi.stats(),
    staleTime: 30_000,
    gcTime: 120_000,
    retry: 1,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CampaignCreateRequest) => campaignsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CampaignUpdateRequest }) =>
      campaignsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: campaignKeys.detail(id) });
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => campaignsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

export function useSendCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => campaignsApi.send(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}
