/**
 * useInbox — React Query hooks for Unified Inbox page (9.7)
 */

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  inboxApi,
  type InboxListFilters,
  type InboxEvent,
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
    mutationFn: ({ conversationId, body, internalNote }: { conversationId: string; body: string; internalNote?: boolean }) =>
      inboxApi.reply(conversationId, body, internalNote),
    onSuccess: (_, { conversationId }) => {
      qc.invalidateQueries({ queryKey: inboxKeys.thread(conversationId) });
      qc.invalidateQueries({ queryKey: inboxKeys.all });
    },
  });
}

export function useCreateInboxConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      channel: string;
      contact_name?: string | null;
      contact_email?: string | null;
      contact_phone?: string | null;
      initial_message: string;
    }) => inboxApi.createConversation(payload),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: inboxKeys.all });
      qc.invalidateQueries({ queryKey: inboxKeys.thread(response.conversation_id) });
    },
  });
}

export function useInboxRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const url = new URL("/api/inbox/ws", window.location.origin);
    url.protocol = url.protocol.replace("http", "ws");
    url.searchParams.set("token", token);

    const ws = new WebSocket(url.toString());

    const handleMessage = (evt: MessageEvent) => {
      try {
        const event: InboxEvent = JSON.parse(evt.data);
        qc.invalidateQueries({ queryKey: inboxKeys.all });
        if (event?.conversation_id) {
          qc.invalidateQueries({ queryKey: inboxKeys.thread(event.conversation_id) });
        }
      } catch (err) {
        console.warn("Invalid inbox websocket message", err);
      }
    };

    ws.addEventListener("message", handleMessage);
    ws.addEventListener("error", (err) => {
      console.warn("Inbox websocket error", err);
    });

    return () => {
      ws.removeEventListener("message", handleMessage);
      ws.close();
    };
  }, [qc]);
}

export function useInboxHistory(conversationId: string | null) {
  return useQuery({
    queryKey: ["inbox", "history", conversationId ?? ""],
    queryFn: () => inboxApi.getHistory(conversationId!),
    enabled: Boolean(conversationId),
    staleTime: 60_000,
  });
}
