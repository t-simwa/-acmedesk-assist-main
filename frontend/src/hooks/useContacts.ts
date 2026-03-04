/**
 * useContacts — React Query hooks for Contacts page (9.8)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  contactsApi,
  type ContactListFilters,
  type ContactCreateRequest,
  type ContactUpdateRequest,
} from "@/lib/api";

export const contactKeys = {
  all: ["contacts"] as const,
  list: (filters: ContactListFilters) => [...contactKeys.all, "list", filters] as const,
  detail: (id: string) => [...contactKeys.all, "detail", id] as const,
};

export function useContactsList(filters: ContactListFilters = {}) {
  return useQuery({
    queryKey: contactKeys.list(filters),
    queryFn: () => contactsApi.list(filters),
    staleTime: 30_000,
    gcTime: 120_000,
    retry: 1,
  });
}

export function useContactDetail(id: string | null) {
  return useQuery({
    queryKey: contactKeys.detail(id ?? ""),
    queryFn: () => contactsApi.get(id!),
    enabled: !!id,
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 1,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ContactCreateRequest) => contactsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKeys.all });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContactUpdateRequest }) =>
      contactsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: contactKeys.detail(id) });
      qc.invalidateQueries({ queryKey: contactKeys.all });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKeys.all });
    },
  });
}
