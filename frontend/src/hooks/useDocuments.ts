import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi, type Document, type DocumentListResponse, type ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

/**
 * Query keys for documents
 */
export const documentKeys = {
  all: ["documents"] as const,
  lists: () => [...documentKeys.all, "list"] as const,
  list: (filters?: { search?: string; status?: string; type?: string }) =>
    [...documentKeys.lists(), filters] as const,
  details: () => [...documentKeys.all, "detail"] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
};

/**
 * Hook to fetch documents list with caching
 */
export function useDocuments(filters?: { search?: string; status?: string; type?: string }) {
  return useQuery<DocumentListResponse, ApiError>({
    queryKey: documentKeys.list(filters),
    queryFn: () => documentsApi.list(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes - documents don't change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single document by ID
 */
export function useDocument(id: string | null) {
  return useQuery<Document, ApiError>({
    queryKey: documentKeys.detail(id || ""),
    queryFn: () => documentsApi.get(id!),
    enabled: !!id, // Only fetch if id is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to upload a document
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (file: File) => documentsApi.upload(file),
    onSuccess: () => {
      // Invalidate documents list to refetch
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded successfully.",
      });
    },
    onError: (error: ApiError) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to delete a document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      // Invalidate documents list to refetch
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      toast({
        title: "Document deleted",
        description: "The document has been deleted successfully.",
      });
    },
    onError: (error: ApiError) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to reindex a document
 */
export function useReindexDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => documentsApi.reindex(id),
    onSuccess: () => {
      // Invalidate documents list and detail to refetch
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      toast({
        title: "Reindexing started",
        description: "The document is being reindexed. This may take a few moments.",
      });
    },
    onError: (error: ApiError) => {
      toast({
        title: "Reindex failed",
        description: error.message || "Failed to reindex document",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to update document metadata
 */
export function useUpdateDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { name?: string } }) =>
      documentsApi.update(id, updates),
    onSuccess: (data, variables) => {
      // Update the cache directly for optimistic update
      queryClient.setQueryData(documentKeys.detail(variables.id), data);
      // Invalidate list to ensure consistency
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      toast({
        title: "Document updated",
        description: "The document has been updated successfully.",
      });
    },
    onError: (error: ApiError) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update document",
        variant: "destructive",
      });
    },
  });
}
