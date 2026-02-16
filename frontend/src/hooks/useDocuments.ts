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
 * Hook to upload a document with optimistic updates
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (file: File) => documentsApi.upload(file),
    onMutate: async (file: File) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: documentKeys.lists() });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({ queryKey: documentKeys.lists() });

      // Optimistically add a placeholder document to the list
      const optimisticDocument: Document = {
        id: `temp-${Date.now()}`,
        name: file.name,
        type: file.type || "unknown",
        status: "processing",
        file_path: "",
        file_size: file.size,
        chunk_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueriesData<DocumentListResponse>(
        { queryKey: documentKeys.lists() },
        (old) => {
          if (!old) {
            return {
              documents: [optimisticDocument],
              total: 1,
              limit: 50,
              offset: 0,
            };
          }
          return {
            ...old,
            documents: [optimisticDocument, ...old.documents],
            total: old.total + 1,
          };
        }
      );

      return { previousData, optimisticDocument };
    },
    onError: (error: ApiError, file: File, context) => {
      // Roll back optimistic update on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      // Replace optimistic document with real one
      queryClient.setQueriesData<DocumentListResponse>(
        { queryKey: documentKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            documents: old.documents.map((doc) =>
              doc.id.startsWith("temp-") && doc.name === data.name
                ? { ...doc, id: data.id, status: data.status }
                : doc
            ),
          };
        }
      );
      // Invalidate to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded successfully.",
      });
    },
  });
}

/**
 * Hook to delete a document with optimistic updates
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: documentKeys.lists() });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({ queryKey: documentKeys.lists() });

      // Optimistically update the cache by removing the document
      queryClient.setQueriesData<DocumentListResponse>(
        { queryKey: documentKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            documents: old.documents.filter((doc) => doc.id !== id),
            total: Math.max(0, old.total - 1),
          };
        }
      );

      // Also remove from detail cache
      queryClient.removeQueries({ queryKey: documentKeys.detail(id) });

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (error: ApiError, id: string, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Invalidate to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      toast({
        title: "Document deleted",
        description: "The document has been deleted successfully.",
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
 * Hook to update document metadata with optimistic updates
 */
export function useUpdateDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { name?: string } }) =>
      documentsApi.update(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: documentKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: documentKeys.lists() });

      // Snapshot the previous values
      const previousDetail = queryClient.getQueryData<Document>(documentKeys.detail(id));
      const previousLists = queryClient.getQueriesData({ queryKey: documentKeys.lists() });

      // Optimistically update the detail cache
      if (previousDetail) {
        queryClient.setQueryData<Document>(documentKeys.detail(id), {
          ...previousDetail,
          ...updates,
          updated_at: new Date().toISOString(),
        });
      }

      // Optimistically update the list cache
      queryClient.setQueriesData<DocumentListResponse>(
        { queryKey: documentKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            documents: old.documents.map((doc) =>
              doc.id === id ? { ...doc, ...updates, updated_at: new Date().toISOString() } : doc
            ),
          };
        }
      );

      return { previousDetail, previousLists };
    },
    onError: (error: ApiError, variables, context) => {
      // Roll back optimistic updates on error
      if (context?.previousDetail) {
        queryClient.setQueryData(documentKeys.detail(variables.id), context.previousDetail);
      }
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: "Update failed",
        description: error.message || "Failed to update document",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables) => {
      // Update with actual server response
      queryClient.setQueryData(documentKeys.detail(variables.id), data);
      // Invalidate list to ensure consistency
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      toast({
        title: "Document updated",
        description: "The document has been updated successfully.",
      });
    },
  });
}
