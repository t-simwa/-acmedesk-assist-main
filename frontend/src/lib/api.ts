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
  status: "processing" | "indexed" | "error";
  file_path: string;
  file_size: number;
  chunk_count: number;
  created_at: string;
  updated_at: string;
  last_indexed_at?: string | null;
  error_message?: string | null;
}

export interface DocumentDetail {
  document: Document;
}

export interface DocumentChunk {
  chunk_index: number;
  text: string;
  metadata?: Record<string, any>;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
  limit: number;
  offset: number;
}

export interface DocumentUploadResponse {
  id: string;
  name: string;
  status: "processing" | "indexed" | "error";
  message: string;
}

export interface ReindexResponse {
  id: string;
  status: "processing" | "indexed" | "error";
  message: string;
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
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds default timeout

interface ApiClientOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
  timeout?: number; // Timeout in milliseconds
}

export interface ApiError {
  message: string;
  status?: number;
  statusText?: string;
  errorType?: "network" | "rate_limit" | "timeout" | "server_error" | "unknown";
}

/**
 * Generic API client using fetch with enhanced error handling
 */
async function apiClient<T>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const { params, timeout = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

  // Build URL with query parameters
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      // Only append non-undefined values
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Set default headers
  // Don't set Content-Type for FormData - let browser set it with boundary
  const isFormData = fetchOptions.body instanceof FormData;
  const headers: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...fetchOptions.headers,
  };

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle non-JSON responses (e.g., file uploads)
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      if (!response.ok) {
        const error: ApiError = {
          message: `HTTP error! status: ${response.status}`,
          status: response.status,
          statusText: response.statusText,
          errorType: response.status >= 500 ? "server_error" : "unknown",
        };
        throw error;
      }
      return response as unknown as T;
    }

    const data = await response.json();

    if (!response.ok) {
      // Extract error message from FastAPI response format
      let errorMessage = "An error occurred";
      
      if (data.detail) {
        // FastAPI validation errors can be an array or a string
        if (Array.isArray(data.detail)) {
          // Extract messages from validation error array
          errorMessage = data.detail
            .map((err: any) => {
              if (typeof err === "string") return err;
              if (err.msg) return err.msg;
              if (err.message) return err.message;
              return JSON.stringify(err);
            })
            .join(", ");
        } else if (typeof data.detail === "string") {
          errorMessage = data.detail;
        } else {
          errorMessage = JSON.stringify(data.detail);
        }
      } else if (data.message) {
        errorMessage = typeof data.message === "string" ? data.message : JSON.stringify(data.message);
      } else {
        errorMessage = `HTTP error! status: ${response.status}`;
      }

      // Detect rate limit errors (429)
      if (response.status === 429) {
        const error: ApiError = {
          message: errorMessage,
          status: response.status,
          statusText: response.statusText,
          errorType: "rate_limit",
        };
        throw error;
      }

      // Server errors (5xx)
      if (response.status >= 500) {
        const error: ApiError = {
          message: errorMessage,
          status: response.status,
          statusText: response.statusText,
          errorType: "server_error",
        };
        throw error;
      }

      // Other HTTP errors (including 422 validation errors)
      const error: ApiError = {
        message: errorMessage,
        status: response.status,
        statusText: response.statusText,
        errorType: response.status === 422 ? "unknown" : "unknown",
      };
      throw error;
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle timeout errors
    if (error instanceof Error && error.name === "AbortError") {
      const timeoutError: ApiError = {
        message: "Request took too long. Please check your connection and try again.",
        status: 0,
        errorType: "timeout",
      };
      throw timeoutError;
    }

    // Handle network errors (fetch failures, CORS, etc.)
    if (error instanceof TypeError && error.message.includes("fetch")) {
      const networkError: ApiError = {
        message: "Network error: Unable to reach the API server. Please check your connection.",
        status: 0,
        errorType: "network",
      };
      throw networkError;
    }

    // Re-throw ApiError instances as-is
    if (error && typeof error === "object" && "message" in error) {
      throw error;
    }

    // Fallback for unknown errors
    const unknownError: ApiError = {
      message: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
      status: 0,
      errorType: "unknown",
    };
    throw unknownError;
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
  async list(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    type?: string;
  }): Promise<DocumentListResponse> {
    return apiClient<DocumentListResponse>("/api/documents", {
      params: params as Record<string, string | number> | undefined,
    });
  },

  /**
   * Upload a document
   */
  async upload(file: File): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient<DocumentUploadResponse>("/api/documents/upload", {
      method: "POST",
      headers: {}, // Let browser set Content-Type with boundary for FormData
      body: formData,
    });
  },

  /**
   * Reindex a document by ID
   */
  async reindex(id: string): Promise<ReindexResponse> {
    return apiClient<ReindexResponse>(`/api/documents/${id}/reindex`, {
      method: "POST",
    });
  },

  /**
   * Get document details by ID
   */
  async get(id: string): Promise<DocumentDetail> {
    return apiClient<DocumentDetail>(`/api/documents/${id}`);
  },

  /**
   * Delete a document by ID
   */
  async delete(id: string): Promise<{ id: string; deleted: boolean; message: string }> {
    return apiClient<{ id: string; deleted: boolean; message: string }>(`/api/documents/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Update document metadata
   */
  async update(id: string, updates: { name?: string }): Promise<Document> {
    return apiClient<Document>(`/api/documents/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
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

// ============================================================================
// Conversations API
// ============================================================================

export interface MessageReactionRequest {
  message_id: string;
  reaction: "thumbs_up" | "thumbs_down";
}

export interface MessageReactionResponse {
  message_id: string;
  reaction: string | null;
  success: boolean;
}

export interface DeleteConversationResponse {
  session_id: string;
  deleted: boolean;
  message: string;
}

export const conversationsApi = {
  /**
   * Delete a conversation by session ID
   */
  async deleteConversation(sessionId: string): Promise<DeleteConversationResponse> {
    return apiClient<DeleteConversationResponse>(`/api/conversations/${sessionId}`, {
      method: "DELETE",
    });
  },

  /**
   * Update message reaction
   */
  async updateMessageReaction(request: MessageReactionRequest): Promise<MessageReactionResponse> {
    return apiClient<MessageReactionResponse>("/api/conversations/messages/reaction", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  /**
   * Remove message reaction
   */
  async removeMessageReaction(messageId: string): Promise<MessageReactionResponse> {
    return apiClient<MessageReactionResponse>(`/api/conversations/messages/reaction/${messageId}`, {
      method: "DELETE",
    });
  },
};