/**
 * useLeads — React Query hooks for Leads admin page (7.5)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  leadsApi,
  type LeadListFilters,
  type LeadBulkRequest,
} from "@/lib/api";

export const leadKeys = {
  all: ["leads"] as const,
  list: (filters: LeadListFilters) => [...leadKeys.all, "list", filters] as const,
  detail: (id: string) => [...leadKeys.all, "detail", id] as const,
};

/**
 * 7.5.1–7.5.3: Paginated list with filters and stats summary bar.
 */
export function useLeadsList(filters: LeadListFilters = {}) {
  return useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: () => leadsApi.listLeads(filters),
    staleTime: 30_000,
    gcTime: 120_000,
    retry: 1,
  });
}

/**
 * 7.5.4: Full lead detail (transcript + contact + timeline + notes).
 */
export function useLeadDetail(id: string | null) {
  return useQuery({
    queryKey: leadKeys.detail(id ?? ""),
    queryFn: () => leadsApi.getLeadDetail(id!),
    enabled: !!id,
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 1,
  });
}

/**
 * 7.5.3 / 7.5.4: Update lead status mutation.
 */
export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      leadsApi.updateLeadStatus(id, status, reason),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
      qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<import("@/lib/api").LeadUpdateRequest> }) =>
      leadsApi.updateLead(id, updates),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
      qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

/**
 * 7.5.4: Add internal note mutation.
 */
export function useAddLeadNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      leadsApi.addNote(id, note),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
    },
  });
}

export function useDeleteLeadNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, noteId }: { id: string; noteId: string }) =>
      leadsApi.deleteNote(id, noteId),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
    },
  });
}

/**
 * 7.5.6: Recalculate lead score mutation.
 */
export function useRecalculateLeadScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadsApi.recalculateScore(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
      qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

/**
 * 7.5.7: Bulk action mutation.
 */
export function useBulkLeadAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (request: LeadBulkRequest) => leadsApi.bulkAction(request),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (request: LeadCreateRequest) => leadsApi.createLead(request),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

export function useLeadStats() {
  return useQuery({
    queryKey: [...leadKeys.all, "stats"],
    queryFn: () => leadsApi.getStats(),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useLeadTags() {
  return useQuery({
    queryKey: [...leadKeys.all, "tags"],
    queryFn: () => leadsApi.getTags(),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useLeadAssignees() {
  return useQuery({
    queryKey: [...leadKeys.all, "assignees"],
    queryFn: () => leadsApi.getAssignees(),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useLeadPipeline(filters: { status?: string; channel?: string; search?: string; max_per_column?: number } = {}) {
  return useQuery({
    queryKey: [...leadKeys.all, "pipeline", filters],
    queryFn: () => leadsApi.getPipeline(filters),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useGenerateFollowupDraft() {
  return useMutation({
    mutationFn: (request: import("@/lib/api").LeadFollowupDraftRequest) =>
      leadsApi.generateFollowupDraft(request),
  });
}

export function useSendFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (request: import("@/lib/api").LeadFollowupSendRequest) =>
      leadsApi.sendFollowup(request),
    onSuccess: (_, { lead_id }) => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(lead_id) });
    },
  });
}
