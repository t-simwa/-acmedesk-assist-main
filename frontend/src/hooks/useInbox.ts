/**
 * useInbox — React Query hooks for Unified Inbox page (9.7)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  inboxApi,
  type InboxListFilters,
} from "@/lib/api";

export const inboxKeys = {
  all: ["inbox"] as const,
  list: (filters: InboxListFilters) => [...inboxKeys.all, "list", filters] as const,
  thread: (id: string) => [...inboxKeys.all, "thread", id] as const,
};

export function useInboxList(filters: InboxListFilters = {}) {
  return useQuery({
    queryKey: inboxKeys.list(filters),
    queryFn: () => inboxApi.list(filters),
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 1,
  });
}

export function useInboxThread(conversationId: string | null) {
  return useQuery({
    queryKey: inboxKeys.thread(conversationId ?? ""),
    queryFn: () => inboxApi.getThread(conversationId!),
    enabled: !!conversationId,
    staleTime: 10_000,
    gcTime: 30_000,
    retry: 1,
  });
}

export function useInboxReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, body }: { conversationId: string; body: string }) =>
      inboxApi.reply(conversationId, body),
    onSuccess: (_, { conversationId }) => {
      qc.invalidateQueries({ queryKey: inboxKeys.thread(conversationId) });
      qc.invalidateQueries({ queryKey: inboxKeys.all });
    },
  });
}
