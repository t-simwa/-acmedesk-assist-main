import { useState, useEffect, useCallback } from "react";
import {
  knowledgeBasesApi,
  KnowledgeBase,
  UserKnowledgeBasePreferences,
  CreateKnowledgeBaseRequest,
  UpdateKnowledgeBaseRequest,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useKnowledgeBases() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchKnowledgeBases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await knowledgeBasesApi.list();
      setKnowledgeBases(response.knowledge_bases);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch knowledge bases");
      setError(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchKnowledgeBases();
  }, [fetchKnowledgeBases]);

  return {
    knowledgeBases,
    loading,
    error,
    refetch: fetchKnowledgeBases,
  };
}

export function useKnowledgeBasePreferences() {
  const [preferences, setPreferences] = useState<UserKnowledgeBasePreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await knowledgeBasesApi.getPreferences();
      setPreferences(response.preferences);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch preferences");
      setError(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = useCallback(
    async (newPreferences: UserKnowledgeBasePreferences) => {
      try {
        setError(null);
        const response = await knowledgeBasesApi.updatePreferences(newPreferences);
        setPreferences(response.preferences);
        toast({
          title: "Success",
          description: "Knowledge base preferences updated",
        });
        return response.preferences;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to update preferences");
        setError(error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
    },
    [toast]
  );

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    refetch: fetchPreferences,
  };
}

export function useCreateKnowledgeBase() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const createKnowledgeBase = useCallback(
    async (request: CreateKnowledgeBaseRequest) => {
      try {
        setLoading(true);
        setError(null);
        const response = await knowledgeBasesApi.create(request);
        toast({
          title: "Success",
          description: `Knowledge base "${response.knowledge_base.name}" created successfully`,
        });
        return response.knowledge_base;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to create knowledge base");
        setError(error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  return {
    createKnowledgeBase,
    loading,
    error,
  };
}

export function useUpdateKnowledgeBase() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const updateKnowledgeBase = useCallback(
    async (id: string, request: UpdateKnowledgeBaseRequest) => {
      try {
        setLoading(true);
        setError(null);
        const response = await knowledgeBasesApi.update(id, request);
        toast({
          title: "Success",
          description: "Knowledge base updated successfully",
        });
        return response.knowledge_base;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to update knowledge base");
        setError(error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  return {
    updateKnowledgeBase,
    loading,
    error,
  };
}

export function useDeleteKnowledgeBase() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const deleteKnowledgeBase = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setError(null);
        await knowledgeBasesApi.delete(id);
        toast({
          title: "Success",
          description: "Knowledge base deleted successfully",
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to delete knowledge base");
        setError(error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  return {
    deleteKnowledgeBase,
    loading,
    error,
  };
}
