/**
 * useBookings — React Query hooks for Bookings page (9.10)
 */

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  bookingsApi,
  type BookingListFilters,
  type BookingCreateRequest,
  type BookingUpdateRequest,
  type BookingActivityResponse,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export const bookingKeys = {
  all: ["bookings"] as const,
  list: (filters: BookingListFilters) => [...bookingKeys.all, "list", filters] as const,
  calendar: (filters: BookingListFilters) => [...bookingKeys.all, "calendar", filters] as const,
  detail: (id: string) => [...bookingKeys.all, "detail", id] as const,
  stats: () => [...bookingKeys.all, "stats"] as const,
};

export function useBookingsList(filters: BookingListFilters = {}) {
  return useQuery({
    queryKey: bookingKeys.list(filters),
    queryFn: () => bookingsApi.list(filters),
    staleTime: 30_000,
    gcTime: 120_000,
    retry: 1,
  });
}

export function useBookingDetail(id: string | null | undefined) {
  const safeId = id ?? "";
  return useQuery({
    queryKey: bookingKeys.detail(safeId),
    queryFn: () => bookingsApi.get(safeId),
    enabled: !!id,
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 1,
  });
}

export function useBookingStats() {
  return useQuery({
    queryKey: bookingKeys.stats(),
    queryFn: () => bookingsApi.stats(),
    staleTime: 30_000,
    gcTime: 120_000,
    retry: 1,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BookingCreateRequest) => bookingsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BookingUpdateRequest }) =>
      bookingsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      qc.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

export function useConfirmBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { channel?: string; send_notification?: boolean; message?: string } }) =>
      bookingsApi.confirm(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      qc.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reason: string; channel?: string; send_notification?: boolean; message?: string; internal_note?: string } }) =>
      bookingsApi.cancel(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      qc.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

export function useCompleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { actual_value?: number; satisfaction_note?: string } }) =>
      bookingsApi.complete(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      qc.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

export function useRescheduleBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { new_date: string; new_time: string; reason?: string; channel?: string; send_notification?: boolean; message?: string } }) =>
      bookingsApi.reschedule(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      qc.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

export function useSendReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { channel?: string; message?: string } }) =>
      bookingsApi.sendReminder(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      qc.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

export function useBulkBookingsAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { booking_ids: string[]; action: string; params?: Record<string, any> }) =>
      bookingsApi.bulk(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

export function useBookingActivity(id: string | null) {
  return useQuery({
    queryKey: ["bookings", "activity", id ?? ""],
    queryFn: () => bookingsApi.getActivity(id!),
    enabled: !!id,
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 1,
  });
}

export function useBookingNotes(id: string | null) {
  return useQuery({
    queryKey: ["bookings", "notes", id ?? ""],
    queryFn: () => bookingsApi.getNotes(id!),
    enabled: !!id,
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 1,
  });
}

export function useCreateBookingNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { content: string } }) =>
      bookingsApi.createNote(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["bookings", "notes", id] });
      qc.invalidateQueries({ queryKey: bookingKeys.detail(id) });
    },
  });
}

export function useBookingRealtime() {
  const qc = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const url = new URL("/api/bookings/ws", window.location.origin);
    url.protocol = url.protocol.replace("http", "ws");

    const ws = new WebSocket(url.toString());

    const handleMessage = (evt: MessageEvent) => {
      try {
        const event = JSON.parse(evt.data) as { type?: string; booking_id?: string; message?: string };
        qc.invalidateQueries({ queryKey: bookingKeys.all });
        if (event.booking_id) {
          qc.invalidateQueries({ queryKey: bookingKeys.detail(event.booking_id) });
        }
        if (event.type) {
          toast({
            title: `Booking update: ${event.type.replace("booking.", "")}`,
            description: event.message ?? event.booking_id,
          });
        }
      } catch (err) {
        console.warn("Invalid booking websocket message", err);
      }
    };

    ws.addEventListener("message", handleMessage);
    ws.addEventListener("error", (err) => {
      console.warn("Booking websocket error", err);
    });

    return () => {
      ws.removeEventListener("message", handleMessage);
      ws.close();
    };
  }, [qc, toast]);
}

export function useBookingsCalendar(filters: BookingListFilters) {
  return useQuery({
    queryKey: bookingKeys.calendar(filters),
    queryFn: () => bookingsApi.calendar(filters),
    enabled: !!filters.start_date && !!filters.end_date,
    staleTime: 30_000,
    gcTime: 120_000,
    retry: 1,
  });
}
