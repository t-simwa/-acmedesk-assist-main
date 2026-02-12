/**
 * API Client Layer for AcmeDesk Assist
 * 
 * Provides a generic apiClient using fetch and specific API functions for:
 * - Chat API
 * - Documents API
 * - Analytics API
 * - Settings API
 */

// ============================================================================
// Types
// ============================================================================

export interface SourceRef {
  doc_id: string;
  chunk_index: number;
  title?: string;
  snippet?: string;
  score?: number;
}

export interface ChatMetadata {
  session_id?: string;
  query_time_ms: number;
  sources_count: number;
  model?: string;
  timestamp: string;
}

export interface ChatRequest {
  session_id?: string;
  message: string;
}

export interface ChatResponse {
  answer: string;
  sources: SourceRef[];
  metadata: ChatMetadata;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  status: "pending" | "processing" | "indexed" | "error";
  chunk_count?: number;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsSummary {
  total_conversations: number;
  total_queries: number;
  avg_query_time_ms: number;
  resolution_rate: number;
  conversations_today: number;
}

export interface TopQuery {
  query: string;
  count: number;
  avg_response_time_ms: number;
}

export interface RAGSettings {
  model?: string;
  temperature?: number;
  top_k?: number;
  max_tokens?: number;
  system_prompt?: string;
}

// ============================================================================
// API Client Configuration
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface ApiClientOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

interface ApiError {
  message: string;
  status?: number;
  statusText?: string;
}

/**
 * Generic API client using fetch
 */
async function apiClient<T>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  // Build URL with query parameters
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Set default headers
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  };

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Handle non-JSON responses (e.g., file uploads)
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response as unknown as T;
    }

    const data = await response.json();

    if (!response.ok) {
      const error: ApiError = {
        message: data.detail || data.message || `HTTP error! status: ${response.status}`,
        status: response.status,
        statusText: response.statusText,
      };
      throw error;
    }

    return data as T;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw {
        message: "Network error: Unable to reach the API server. Please check if the backend is running.",
        status: 0,
      } as ApiError;
    }
    throw error;
  }
}

// ============================================================================
// Chat API
// ============================================================================

export const chatApi = {
  /**
   * Send a chat message and get a response
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    return apiClient<ChatResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },
};

// ============================================================================
// Documents API
// ============================================================================

export const documentsApi = {
  /**
   * List all documents
   */
  async list(): Promise<Document[]> {
    return apiClient<Document[]>("/api/documents");
  },

  /**
   * Upload a document
   */
  async upload(file: File): Promise<Document> {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient<Document>("/api/documents/upload", {
      method: "POST",
      headers: {}, // Let browser set Content-Type with boundary for FormData
      body: formData,
    });
  },

  /**
   * Reindex a document by ID
   */
  async reindex(id: string): Promise<{ message: string; document_id: string }> {
    return apiClient<{ message: string; document_id: string }>(
      `/api/documents/${id}/reindex`,
      {
        method: "POST",
      }
    );
  },
};

// ============================================================================
// Analytics API
// ============================================================================

export const analyticsApi = {
  /**
   * Get analytics summary
   */
  async getSummary(): Promise<AnalyticsSummary> {
    return apiClient<AnalyticsSummary>("/api/analytics/summary");
  },

  /**
   * Get top queries
   */
  async getTopQueries(limit: number = 10): Promise<TopQuery[]> {
    return apiClient<TopQuery[]>("/api/analytics/top-queries", {
      params: { limit },
    });
  },
};

// ============================================================================
// Settings API
// ============================================================================

export const settingsApi = {
  /**
   * Get RAG settings
   */
  async getRagSettings(): Promise<RAGSettings> {
    return apiClient<RAGSettings>("/api/settings/rag");
  },

  /**
   * Update RAG settings
   */
  async updateRagSettings(payload: Partial<RAGSettings>): Promise<RAGSettings> {
    return apiClient<RAGSettings>("/api/settings/rag", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};
