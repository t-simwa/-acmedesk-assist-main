/**
 * useConversations — React Query hooks for Conversations admin page (7.4)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  conversationsApi,
  type ConversationListFilters,
  type ConversationBulkRequest,
} from "@/lib/api";

export const conversationKeys = {
  all: ["conversations"] as const,
  list: (filters: ConversationListFilters) => [...conversationKeys.all, "list", filters] as const,
  detail: (id: string) => [...conversationKeys.all, "detail", id] as const,
};

/**
 * 7.4.1–7.4.3: Paginated list with filters and stats summary bar.
 */
export function useConversationsList(filters: ConversationListFilters = {}) {
  return useQuery({
    queryKey: conversationKeys.list(filters),
    queryFn: () => conversationsApi.listConversations(filters),
    staleTime: 30_000,
    gcTime: 120_000,
    retry: 1,
  });
}

/**
 * 7.4.4: Full conversation detail (transcript + contact + timeline).
 */
export function useConversationDetail(id: string | null) {
  return useQuery({
    queryKey: conversationKeys.detail(id ?? ""),
    queryFn: () => conversationsApi.getConversationDetail(id!),
    enabled: !!id,
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 1,
  });
}

/**
 * 7.4.4: Update conversation status mutation.
 */
export function useUpdateConversationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      conversationsApi.updateConversationStatus(id, status, reason),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: conversationKeys.detail(id) });
      qc.invalidateQueries({ queryKey: conversationKeys.all });
    },
  });
}

/**
 * 7.4.4: Add internal note mutation.
 */
export function useAddConversationNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      conversationsApi.addNote(id, note),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: conversationKeys.detail(id) });
    },
  });
}

/**
 * 7.4.4: Toggle flag for training mutation.
 */
export function useToggleConversationFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => conversationsApi.toggleFlag(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: conversationKeys.detail(id) });
    },
  });
}

/**
 * 7.4.5: Bulk action mutation.
 */
export function useBulkConversationAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (request: ConversationBulkRequest) => conversationsApi.bulkAction(request),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: conversationKeys.all });
    },
  });
}
