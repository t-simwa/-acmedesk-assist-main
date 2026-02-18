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

export interface ConversationCountByDay {
  date: string; // ISO 8601 format (YYYY-MM-DD)
  count: number;
}

export interface QuestionCategory {
  category: string;
  count: number;
}

export interface APIUsageMetrics {
  total_requests: number;
  total_tokens_used?: number;
  estimated_cost?: number;
  last_updated: string;
}

export interface AnalyticsSummary {
  total_conversations: number;
  total_messages: number;
  conversations_by_day: ConversationCountByDay[];
  resolution_rate: {
    resolved_via_bot?: number;
    escalated?: number;
    total?: number;
    percentage?: number;
  };
  response_accuracy: {
    average_query_time_ms?: number;
    average_sources_count?: number;
  };
  top_categories: QuestionCategory[];
  api_usage: APIUsageMetrics;
  user_satisfaction: {
    thumbs_up?: number;
    thumbs_down?: number;
    total_feedback?: number;
    satisfaction_rate?: number;
  };
}

export interface TopQuery {
  query: string;
  count: number;
  resolved_by_bot: number;
  resolved_percentage: number;
}

export interface TopQueriesResponse {
  queries: TopQuery[];
  total: number;
  limit: number;
}

export interface RAGSettings {
  model?: string;
  temperature?: number;
  top_k?: number;
  max_tokens?: number;
  system_prompt?: string | null;
  chunk_size?: number;
  chunk_overlap?: number;
  embedding_model?: string;
  chunking_strategy?: "recursive" | "fixed" | "semantic";
}

export interface RAGSettingsValidationResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// API Client Configuration
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds default timeout
const DEFAULT_MAX_RETRIES = 3; // Maximum number of retry attempts
const DEFAULT_RETRY_DELAY_MS = 1000; // Initial retry delay in milliseconds
const DEFAULT_RETRY_MULTIPLIER = 2; // Exponential backoff multiplier

interface ApiClientOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
  timeout?: number; // Timeout in milliseconds
  retries?: number; // Number of retry attempts (default: 3)
  retryDelay?: number; // Initial retry delay in ms (default: 1000)
  retryOn?: number[]; // HTTP status codes to retry on (default: [408, 429, 500, 502, 503, 504])
  requestId?: string; // Optional request ID for cancellation tracking
}

export interface ApiError {
  message: string;
  status?: number;
  statusText?: string;
  errorType?: "network" | "rate_limit" | "timeout" | "server_error" | "unknown";
}

// Request cancellation manager
class RequestManager {
  private activeRequests = new Map<string, AbortController>();

  /**
   * Register a new request with optional ID for cancellation
   */
  register(requestId: string | undefined, controller: AbortController): void {
    if (requestId) {
      // Cancel any existing request with the same ID
      this.cancel(requestId);
      this.activeRequests.set(requestId, controller);
    }
  }

  /**
   * Cancel a request by ID
   */
  cancel(requestId: string): void {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Unregister a request (called when request completes)
   */
  unregister(requestId: string | undefined): void {
    if (requestId) {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Cancel all active requests
   */
  cancelAll(): void {
    this.activeRequests.forEach((controller) => controller.abort());
    this.activeRequests.clear();
  }
}

const requestManager = new RequestManager();

/**
 * Calculate exponential backoff delay
 */
function calculateRetryDelay(attempt: number, baseDelay: number, multiplier: number): number {
  return baseDelay * Math.pow(multiplier, attempt);
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: ApiError, retryOn: number[]): boolean {
  // Network errors are always retryable
  if (error.errorType === "network" || error.errorType === "timeout") {
    return true;
  }

  // Check if status code is in retry list
  if (error.status && retryOn.includes(error.status)) {
    return true;
  }

  return false;
}

/**
 * Generic API client using fetch with enhanced error handling, retry logic, and request cancellation
 */
async function apiClient<T>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const {
    params,
    timeout = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_MAX_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY_MS,
    retryOn = [408, 429, 500, 502, 503, 504], // Default retryable status codes
    requestId,
    ...fetchOptions
  } = options;

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

  // Retry logic with exponential backoff
  let lastError: ApiError | null = null;
  
  // Don't retry FormData requests (file uploads) - FormData can't be reused
  const isFormData = fetchOptions.body instanceof FormData;
  const effectiveRetries = isFormData ? 0 : retries;
  
  for (let attempt = 0; attempt <= effectiveRetries; attempt++) {
    // Set default headers
    // Don't set Content-Type for FormData - let browser set it with boundary
    const headers: HeadersInit = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...fetchOptions.headers,
    };

    // Create abort controller for timeout and cancellation
    const controller = new AbortController();
    
    // Register request for cancellation tracking
    requestManager.register(requestId, controller);
    
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      requestManager.unregister(requestId);

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
      requestManager.unregister(requestId);

      // Handle abort errors (user cancellation or timeout)
      if (error instanceof Error && error.name === "AbortError") {
        // Check if it was a timeout or user cancellation
        const timeoutError: ApiError = {
          message: "Request was cancelled or took too long. Please check your connection and try again.",
          status: 0,
          errorType: "timeout",
        };
        
        // If this was the last attempt, throw the error
        if (attempt === effectiveRetries) {
          throw timeoutError;
        }
        
        lastError = timeoutError;
        // Wait before retrying (exponential backoff)
        if (attempt < effectiveRetries) {
          const delay = calculateRetryDelay(attempt, retryDelay, DEFAULT_RETRY_MULTIPLIER);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        continue;
      }

      // Handle network errors (fetch failures, CORS, etc.)
      if (error instanceof TypeError && error.message.includes("fetch")) {
        const networkError: ApiError = {
          message: "Network error: Unable to reach the API server. Please check your connection.",
          status: 0,
          errorType: "network",
        };
        
        // If this was the last attempt, throw the error
        if (attempt === effectiveRetries) {
          throw networkError;
        }
        
        lastError = networkError;
        // Wait before retrying (exponential backoff)
        if (attempt < effectiveRetries) {
          const delay = calculateRetryDelay(attempt, retryDelay, DEFAULT_RETRY_MULTIPLIER);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        continue;
      }

      // Handle HTTP errors
      if (error && typeof error === "object" && "message" in error) {
        const apiError = error as ApiError;
        lastError = apiError;

        // Check if error is retryable
        if (isRetryableError(apiError, retryOn) && attempt < effectiveRetries) {
          // Wait before retrying (exponential backoff)
          const delay = calculateRetryDelay(attempt, retryDelay, DEFAULT_RETRY_MULTIPLIER);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Not retryable or last attempt - throw the error
        throw apiError;
      }

      // Fallback for unknown errors
      const unknownError: ApiError = {
        message: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        status: 0,
        errorType: "unknown",
      };
      
      // If this was the last attempt, throw the error
      if (attempt === effectiveRetries) {
        throw unknownError;
      }
      
      lastError = unknownError;
      // Wait before retrying (exponential backoff)
      if (attempt < effectiveRetries) {
        const delay = calculateRetryDelay(attempt, retryDelay, DEFAULT_RETRY_MULTIPLIER);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // If we've exhausted all retries, throw the last error
  if (lastError) {
    throw lastError;
  }

  // This should never be reached, but TypeScript requires it
  throw new Error("Unexpected error in apiClient");
}

/**
 * Cancel an active request by ID
 */
export function cancelRequest(requestId: string): void {
  requestManager.cancel(requestId);
}

/**
 * Cancel all active requests
 */
export function cancelAllRequests(): void {
  requestManager.cancelAll();
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
   * @param days Number of days to include in conversation counts (default: 7, max: 30)
   */
  async getSummary(days: number = 7): Promise<AnalyticsSummary> {
    return apiClient<AnalyticsSummary>("/api/analytics/summary", {
      params: { days },
    });
  },

  /**
   * Get top queries
   */
  async getTopQueries(limit: number = 10): Promise<TopQueriesResponse> {
    return apiClient<TopQueriesResponse>("/api/analytics/top-queries", {
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
    const response = await apiClient<{ message: string; settings: RAGSettings }>("/api/settings/rag", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return response.settings;
  },

  /**
   * Validate RAG settings without saving
   */
  async validateRagSettings(payload: Partial<RAGSettings>): Promise<RAGSettingsValidationResponse> {
    return apiClient<RAGSettingsValidationResponse>("/api/settings/rag/validate", {
      method: "POST",
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

// ============================================================================
// User Preferences API
// ============================================================================

export interface NotificationPreferences {
  email: boolean;
  in_app: boolean;
  push: boolean;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  notifications: NotificationPreferences;
  language: string | null;
  timezone: string | null;
  additional_preferences: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferencesUpdateRequest {
  name?: string;
  email?: string;
  notifications?: NotificationPreferences;
  language?: string;
  timezone?: string;
}

export interface UserPreferencesUpdateResponse {
  message: string;
  preferences: UserPreferences;
}

export interface AvatarUploadResponse {
  message: string;
  avatar_url: string;
}

export const userPreferencesApi = {
  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    return apiClient<UserPreferences>("/api/user/preferences");
  },

  /**
   * Update user preferences
   */
  async updatePreferences(payload: UserPreferencesUpdateRequest): Promise<UserPreferences> {
    const response = await apiClient<UserPreferencesUpdateResponse>("/api/user/preferences", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return response.preferences;
  },

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    
    return apiClient<AvatarUploadResponse>("/api/user/avatar", {
      method: "POST",
      body: formData,
      // Don't set headers - apiClient will handle FormData correctly
    });
  },

  /**
   * Delete user avatar
   */
  async deleteAvatar(): Promise<{ message: string }> {
    return apiClient<{ message: string }>("/api/user/avatar", {
      method: "DELETE",
    });
  },
};

// ============================================================================
// Admin API
// ============================================================================

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "analyst" | "viewer";
  is_active: boolean;
  permissions: string[];
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  description: string;
  metadata: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  status: string;
  created_at: string;
}

export interface AuditLogListResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditLogFilters {
  action?: string;
  resource_type?: string;
  resource_id?: string;
  user_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface APIKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface APIKeyCreateRequest {
  name: string;
  expires_in_days?: number;
}

export interface APIKeyCreateResponse {
  id: string;
  name: string;
  key: string;
  key_prefix: string;
  expires_at: string | null;
  created_at: string;
  message: string;
}

export interface APIKeyListResponse {
  keys: APIKey[];
  total: number;
}

export interface TeamMember {
  id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  role: "admin" | "analyst" | "viewer";
  status: "pending" | "accepted" | "rejected" | "expired";
  invited_by: string;
  invited_at: string;
  accepted_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberListResponse {
  members: TeamMember[];
  total: number;
}

export interface TeamMemberInviteRequest {
  email: string;
  name?: string;
  role: "admin" | "analyst" | "viewer";
}

export interface TeamMemberInviteResponse {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  invited_at: string;
  message: string;
}

export interface TeamMemberUpdateRoleRequest {
  role: "admin" | "analyst" | "viewer";
}

export const adminApi = {
  /**
   * Get current user information and permissions
   */
  async getCurrentUser(): Promise<CurrentUser> {
    return apiClient<CurrentUser>("/api/admin/current-user");
  },

  /**
   * List audit logs with optional filters
   */
  async listAuditLogs(filters?: AuditLogFilters): Promise<AuditLogListResponse> {
    return apiClient<AuditLogListResponse>("/api/admin/audit-logs", {
      params: filters as Record<string, string | number> | undefined,
    });
  },

  /**
   * List API keys
   */
  async listAPIKeys(): Promise<APIKeyListResponse> {
    return apiClient<APIKeyListResponse>("/api/admin/api-keys");
  },

  /**
   * Create API key
   */
  async createAPIKey(payload: APIKeyCreateRequest): Promise<APIKeyCreateResponse> {
    return apiClient<APIKeyCreateResponse>("/api/admin/api-keys", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Revoke API key
   */
  async revokeAPIKey(keyId: string, reason?: string): Promise<{ message: string; id: string }> {
    return apiClient<{ message: string; id: string }>(`/api/admin/api-keys/${keyId}`, {
      method: "DELETE",
      body: reason ? JSON.stringify({ reason }) : undefined,
    });
  },

  /**
   * List team members
   */
  async listTeamMembers(): Promise<TeamMemberListResponse> {
    return apiClient<TeamMemberListResponse>("/api/admin/team");
  },

  /**
   * Invite team member
   */
  async inviteTeamMember(payload: TeamMemberInviteRequest): Promise<TeamMemberInviteResponse> {
    return apiClient<TeamMemberInviteResponse>("/api/admin/team/invite", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update team member role
   */
  async updateTeamMemberRole(memberId: string, payload: TeamMemberUpdateRoleRequest): Promise<{ id: string; role: string; message: string }> {
    return apiClient<{ id: string; role: string; message: string }>(`/api/admin/team/${memberId}/role`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Remove team member
   */
  async removeTeamMember(memberId: string): Promise<{ message: string; id: string }> {
    return apiClient<{ message: string; id: string }>(`/api/admin/team/${memberId}`, {
      method: "DELETE",
    });
  },
};