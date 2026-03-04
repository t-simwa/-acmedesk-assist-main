/**
 * useBookings — React Query hooks for Bookings page (9.10)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  bookingsApi,
  type BookingListFilters,
  type BookingCreateRequest,
  type BookingUpdateRequest,
} from "@/lib/api";

export const bookingKeys = {
  all: ["bookings"] as const,
  list: (filters: BookingListFilters) => [...bookingKeys.all, "list", filters] as const,
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

export function useBookingDetail(id: string | null) {
  return useQuery({
    queryKey: bookingKeys.detail(id ?? ""),
    queryFn: () => bookingsApi.get(id!),
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
