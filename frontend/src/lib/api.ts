/**
 * API Client Layer for AcmeDesk Assist
 * 
 * Provides a generic apiClient using fetch and specific API functions for:
 * - Auth API
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
  tenant_id: string;
  chatbot_id?: string | null;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  storage_url: string;
  content_hash?: string | null;
  status: "processing" | "ready" | "failed" | "archived";
  chunk_count: number;
  page_count?: number | null;
  source_url?: string | null;
  upload_date: string;
  last_retrieved_at?: string | null;
  error_message?: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
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
  status: "processing" | "ready" | "failed";
  message: string;
  is_duplicate?: boolean;
  duplicate_of?: string | null;
}

export interface DocumentStatusResponse {
  id: string;
  status: string;
  chunk_count?: number | null;
  page_count?: number | null;
  error_message?: string | null;
  progress: number;
}

export interface StorageUsageResponse {
  used_bytes: number;
  limit_bytes: number;
  used_percent: number;
  document_count: number;
}

export interface ArchiveDocumentResponse {
  id: string;
  archived: boolean;
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
// Email Channel Types
// ============================================================================

export interface EmailThreadSummary {
  id: string;
  role: string;
  content: string;
  timestamp?: string;
  metadata?: {
    from?: string;
    to?: string;
    message_count?: number;
  };
}

export interface EmailThreadListResponse {
  threads: EmailThreadSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface EmailMessageMetadata {
  id: string;
  role: string;
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface EmailThreadMessagesResponse {
  thread_id: string;
  messages: EmailMessageMetadata[];
}

export interface EmailReplyResponse {
  message: EmailMessageMetadata;
}

// ============================================================================
// SMS Channel Types (J2.1)
// ============================================================================

export interface SmsMessageMetadata {
  id: string;
  role: string;
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface SmsThreadListResponse {
  threads: SmsMessageMetadata[];
  total: number;
  limit: number;
  offset: number;
}

export interface SmsThreadMessagesResponse {
  thread_id: string;
  messages: SmsMessageMetadata[];
}

export interface SmsReplyResponse {
  message: SmsMessageMetadata;
}

// ============================================================================
// WhatsApp Channel Types (J2.2)
// ============================================================================

export interface WhatsAppMessageMetadata {
  id: string;
  role: string;
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface WhatsAppThreadListResponse {
  threads: WhatsAppMessageMetadata[];
  total: number;
  limit: number;
  offset: number;
}

export interface WhatsAppThreadMessagesResponse {
  thread_id: string;
  messages: WhatsAppMessageMetadata[];
}

export interface WhatsAppReplyResponse {
  message: WhatsAppMessageMetadata;
}

// ============================================================================
// Facebook Messenger Channel Types (J3.1)
// ============================================================================

export interface MessengerMessageMetadata {
  id: string;
  role: string;
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface MessengerThreadListResponse {
  threads: MessengerMessageMetadata[];
  total: number;
  limit: number;
  offset: number;
}

export interface MessengerThreadMessagesResponse {
  thread_id: string;
  messages: MessengerMessageMetadata[];
}

export interface MessengerReplyResponse {
  message: MessengerMessageMetadata;
}

// ============================================================================
// Twitter/X Channel Types (J3.2)
// ============================================================================

export interface TwitterMessageMetadata {
  id: string;
  role: string;
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface TwitterThreadListResponse {
  threads: TwitterMessageMetadata[];
  total: number;
  limit: number;
  offset: number;
}

export interface TwitterThreadMessagesResponse {
  thread_id: string;
  messages: TwitterMessageMetadata[];
}

export interface TwitterReplyResponse {
  message: TwitterMessageMetadata;
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
  options: ApiClientOptions = {},
  retryCount: number = 0
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
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(fetchOptions.headers as Record<string, string> || {}),
    };
    
    // Add Authorization header if token is available and not already set
    const accessToken = localStorage.getItem("access_token");
    if (accessToken && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

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

      // Handle 401 Unauthorized - try to refresh token (only for JSON responses, avoid infinite loop)
      if (response.status === 401 && accessToken && endpoint !== "/api/auth/refresh" && retryCount === 0) {
        try {
          // Attempt to refresh token
          const refreshToken = localStorage.getItem("refresh_token");
          if (refreshToken) {
            const refreshResponse = await authApi.refreshToken();
            // Retry original request with new token (recursive call with retryCount = 1)
            return apiClient<T>(endpoint, {
              ...options,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${refreshResponse.access_token}`,
              },
            }, 1);
          }
        } catch (refreshError) {
          // Refresh failed, clear tokens and let error propagate
          authApi.logout();
          // Fall through to error handling
        }
      }

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

// ============================================================================
// Auth API Types
// ============================================================================

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  business_name: string;
}

export interface RegisterResponse {
  message: string;
  user_id: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  message: string;
  user_id: string;
  email: string;
  name?: string;
  role: string;
  tokens: TokenResponse;
  requires_2fa?: boolean;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface UserInfoResponse {
  user_id: string;
  email: string;
  name?: string;
  role: string;
  is_active: boolean;
}

// ============================================================================
// Auth API
// ============================================================================

export interface ResendVerificationRequest {
  email: string;
}

export const authApi = {
  /**
   * Register a new user account
   */
  async register(payload: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient<RegisterResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    
    return response;
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: "GET",
    });
  },

  /**
   * Resend verification email
   */
  async resendVerification(payload: ResendVerificationRequest): Promise<{ message: string }> {
    return apiClient<{ message: string }>("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Login with email and password
   */
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    
    // Store tokens in localStorage
    if (response.tokens) {
      localStorage.setItem("access_token", response.tokens.access_token);
      localStorage.setItem("refresh_token", response.tokens.refresh_token);
    }
    
    return response;
  },

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<UserInfoResponse> {
    return apiClient<UserInfoResponse>("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
  },

  /**
   * Change password (requires authentication)
   */
  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    return apiClient<{ message: string }>("/api/auth/change-password", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: JSON.stringify({
        current_password: payload.currentPassword,
        new_password: payload.newPassword,
      }),
    });
  },

  /**
   * Request password reset (forgot password)
   */
  async forgotPassword(payload: { email: string }): Promise<{ message: string }> {
    return apiClient<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({
        email: payload.email,
      }),
    });
  },

  /**
   * Reset password using token from email
   */
  async resetPassword(payload: { token: string; newPassword: string }): Promise<{ message: string }> {
    return apiClient<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        token: payload.token,
        new_password: payload.newPassword,
      }),
    });
  },

  /**
   * Logout (clear tokens)
   */
  logout(): void {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem("access_token");
  },

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem("access_token");
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<TokenResponse> {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await apiClient<TokenResponse>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    // Update stored tokens
    localStorage.setItem("access_token", response.access_token);
    localStorage.setItem("refresh_token", response.refresh_token);

    return response;
  },
};

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
  async upload(file: File, knowledge_base_id?: string): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    if (knowledge_base_id) {
      formData.append("knowledge_base_id", knowledge_base_id);
    }

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

  /**
   * Get document processing status
   */
  async getStatus(id: string): Promise<DocumentStatusResponse> {
    return apiClient<DocumentStatusResponse>(`/api/documents/${id}/status`);
  },

  /**
   * Get storage usage for tenant
   */
  async getStorageUsage(): Promise<StorageUsageResponse> {
    return apiClient<StorageUsageResponse>("/api/documents/usage");
  },

  /**
   * Ingest content from URL
   */
  async ingestUrl(url: string, chatbot_id?: string): Promise<DocumentUploadResponse> {
    return apiClient<DocumentUploadResponse>("/api/documents/ingest-url", {
      method: "POST",
      body: JSON.stringify({ url, chatbot_id }),
    });
  },

  /**
   * Archive a document
   */
  async archive(id: string): Promise<ArchiveDocumentResponse> {
    return apiClient<ArchiveDocumentResponse>(`/api/documents/${id}/archive`, {
      method: "POST",
    });
  },

  /**
   * Restore an archived document
   */
  async restore(id: string): Promise<ArchiveDocumentResponse> {
    return apiClient<ArchiveDocumentResponse>(`/api/documents/${id}/restore`, {
      method: "POST",
    });
  },

  /**
   * Replace document with new version
   */
  async replace(id: string, file: File): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient<DocumentUploadResponse>(`/api/documents/${id}/replace`, {
      method: "POST",
      headers: {},
      body: formData,
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
// Knowledge Bases API
// ============================================================================

export interface KnowledgeBase {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface KnowledgeBaseListResponse {
  knowledge_bases: KnowledgeBase[];
  total: number;
}

export interface KnowledgeBaseResponse {
  knowledge_base: KnowledgeBase;
}

export interface CreateKnowledgeBaseRequest {
  name: string;
  description?: string;
}

export interface UpdateKnowledgeBaseRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface UserKnowledgeBasePreferences {
  use_default_kb: boolean;
  active_kb_ids: string[];
}

export interface KnowledgeBasePreferencesResponse {
  preferences: UserKnowledgeBasePreferences;
}

export const knowledgeBasesApi = {
  /**
   * List all knowledge bases
   */
  async list(): Promise<KnowledgeBaseListResponse> {
    return apiClient<KnowledgeBaseListResponse>("/api/knowledge-bases");
  },

  /**
   * Create a knowledge base
   */
  async create(request: CreateKnowledgeBaseRequest): Promise<KnowledgeBaseResponse> {
    return apiClient<KnowledgeBaseResponse>("/api/knowledge-bases", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  /**
   * Get knowledge base by ID
   */
  async get(id: string): Promise<KnowledgeBaseResponse> {
    return apiClient<KnowledgeBaseResponse>(`/api/knowledge-bases/${id}`);
  },

  /**
   * Update knowledge base
   */
  async update(id: string, request: UpdateKnowledgeBaseRequest): Promise<KnowledgeBaseResponse> {
    return apiClient<KnowledgeBaseResponse>(`/api/knowledge-bases/${id}`, {
      method: "PUT",
      body: JSON.stringify(request),
    });
  },

  /**
   * Delete knowledge base
   */
  async delete(id: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/api/knowledge-bases/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Get user knowledge base preferences
   */
  async getPreferences(): Promise<KnowledgeBasePreferencesResponse> {
    return apiClient<KnowledgeBasePreferencesResponse>("/api/knowledge-bases/preferences");
  },

  /**
   * Update user knowledge base preferences
   */
  async updatePreferences(preferences: UserKnowledgeBasePreferences): Promise<KnowledgeBasePreferencesResponse> {
    return apiClient<KnowledgeBasePreferencesResponse>("/api/knowledge-bases/preferences", {
      method: "PUT",
      body: JSON.stringify(preferences),
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
// Email Channel API
// ============================================================================

export const emailApi = {
  /**
   * Trigger an email inbox sync.
   */
  async syncInbox(): Promise<{ imported: number }> {
    return apiClient<{ imported: number }>("/api/email/sync", {
      method: "POST",
    });
  },

  /**
   * List email threads.
   */
  async listThreads(limit = 50, offset = 0): Promise<EmailThreadListResponse> {
    return apiClient<EmailThreadListResponse>("/api/email/threads", {
      params: { limit, offset },
    });
  },

  /**
   * Get messages for a specific email thread.
   */
  async getThreadMessages(threadId: string): Promise<EmailThreadMessagesResponse> {
    return apiClient<EmailThreadMessagesResponse>(`/api/email/threads/${threadId}`);
  },

  /**
   * Send a reply for an email thread.
   */
  async replyToThread(threadId: string, body: string): Promise<EmailReplyResponse> {
    return apiClient<EmailReplyResponse>(`/api/email/threads/${threadId}/reply`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  },
};

// ============================================================================
// SMS Channel API (J2.1)
// ============================================================================

export const smsApi = {
  /**
   * Create a mock inbound SMS message for testing.
   */
  async createTestInbound(): Promise<SmsMessageMetadata> {
    const payload = {
      from_number: "+15555550100",
      to_number: import.meta.env.VITE_SMS_DEFAULT_TO_NUMBER || "+15555550999",
      body: "Test SMS message from customer.",
    };
    const response = await apiClient<SmsMessageMetadata>("/api/sms/inbound-test", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response;
  },

  /**
   * List SMS threads.
   */
  async listThreads(limit = 50, offset = 0): Promise<SmsThreadListResponse> {
    return apiClient<SmsThreadListResponse>("/api/sms/threads", {
      params: { limit, offset },
    });
  },

  /**
   * Get messages for a specific SMS thread.
   */
  async getThreadMessages(threadId: string): Promise<SmsThreadMessagesResponse> {
    return apiClient<SmsThreadMessagesResponse>(`/api/sms/threads/${threadId}`);
  },

  /**
   * Send a reply for an SMS thread.
   */
  async replyToThread(threadId: string, body: string): Promise<SmsReplyResponse> {
    return apiClient<SmsReplyResponse>(`/api/sms/threads/${threadId}/reply`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  },
};

// ============================================================================
// WhatsApp Channel API (J2.2)
// ============================================================================

export const whatsappApi = {
  /**
   * Create a mock inbound WhatsApp message for testing.
   */
  async createTestInbound(): Promise<WhatsAppMessageMetadata> {
    const payload = {
      wa_id: "+15555550111",
      business_number: import.meta.env.VITE_WHATSAPP_DEFAULT_BUSINESS_NUMBER || "+15555550998",
      body: "Test WhatsApp message from customer.",
    };
    const response = await apiClient<WhatsAppMessageMetadata>("/api/whatsapp/inbound-test", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response;
  },

  /**
   * List WhatsApp threads.
   */
  async listThreads(limit = 50, offset = 0): Promise<WhatsAppThreadListResponse> {
    return apiClient<WhatsAppThreadListResponse>("/api/whatsapp/threads", {
      params: { limit, offset },
    });
  },

  /**
   * Get messages for a specific WhatsApp thread.
   */
  async getThreadMessages(threadId: string): Promise<WhatsAppThreadMessagesResponse> {
    return apiClient<WhatsAppThreadMessagesResponse>(`/api/whatsapp/threads/${threadId}`);
  },

  /**
   * Send a reply for a WhatsApp thread.
   */
  async replyToThread(threadId: string, body: string): Promise<WhatsAppReplyResponse> {
    return apiClient<WhatsAppReplyResponse>(`/api/whatsapp/threads/${threadId}/reply`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  },
};

// ============================================================================
// Facebook Messenger Channel API (J3.1)
// ============================================================================

export const messengerApi = {
  /**
   * Create a mock inbound Messenger message for testing.
   */
  async createTestInbound(): Promise<MessengerMessageMetadata> {
    const payload = {
      sender_id: "123456789",
      page_id: import.meta.env.VITE_MESSENGER_PAGE_ID || "987654321",
      body: "Test Messenger message from customer.",
    };
    const response = await apiClient<MessengerMessageMetadata>("/api/messenger/inbound-test", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response;
  },

  /**
   * List Messenger threads.
   */
  async listThreads(limit = 50, offset = 0): Promise<MessengerThreadListResponse> {
    return apiClient<MessengerThreadListResponse>("/api/messenger/threads", {
      params: { limit, offset },
    });
  },

  /**
   * Get messages for a specific Messenger thread.
   */
  async getThreadMessages(threadId: string): Promise<MessengerThreadMessagesResponse> {
    return apiClient<MessengerThreadMessagesResponse>(`/api/messenger/threads/${threadId}`);
  },

  /**
   * Send a reply for a Messenger thread.
   */
  async replyToThread(threadId: string, body: string): Promise<MessengerReplyResponse> {
    return apiClient<MessengerReplyResponse>(`/api/messenger/threads/${threadId}/reply`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  },
};

// ============================================================================
// Twitter/X Channel API (J3.2)
// ============================================================================

export const twitterApi = {
  /**
   * Create a mock inbound Twitter DM for testing.
   */
  async createTestInbound(): Promise<TwitterMessageMetadata> {
    const payload = {
      sender_id: "twitter_user_123",
      account_id: import.meta.env.VITE_TWITTER_ACCOUNT_ID || "twitter_business_account",
      body: "Test Twitter DM from customer.",
    };
    const response = await apiClient<TwitterMessageMetadata>("/api/twitter/inbound-test", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response;
  },

  /**
   * List Twitter DM threads.
   */
  async listThreads(limit = 50, offset = 0): Promise<TwitterThreadListResponse> {
    return apiClient<TwitterThreadListResponse>("/api/twitter/threads", {
      params: { limit, offset },
    });
  },

  /**
   * Get messages for a specific Twitter DM thread.
   */
  async getThreadMessages(threadId: string): Promise<TwitterThreadMessagesResponse> {
    return apiClient<TwitterThreadMessagesResponse>(`/api/twitter/threads/${threadId}`);
  },

  /**
   * Send a reply for a Twitter DM thread.
   */
  async replyToThread(threadId: string, body: string): Promise<TwitterReplyResponse> {
    return apiClient<TwitterReplyResponse>(`/api/twitter/threads/${threadId}/reply`, {
      method: "POST",
      body: JSON.stringify({ body }),
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

// ============================================================================
// Security API - Sessions & 2FA
// ============================================================================

export interface SessionInfo {
  id: string;
  device_type: string | null;
  browser: string | null;
  operating_system: string | null;
  ip_address: string | null;
  location: string | null;
  last_active_at: string | null;
  created_at: string | null;
  is_current: boolean;
}

export interface SessionsListResponse {
  sessions: SessionInfo[];
  total: number;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qr_code: string;
  message: string;
}

export interface TwoFactorStatusResponse {
  is_enabled: boolean;
  backup_codes_count: number;
  enabled_at: string | null;
}

export interface BackupCodesResponse {
  backup_codes: string[];
  message: string;
}

export const securityApi = {
  /**
   * List all active sessions
   */
  async listSessions(): Promise<SessionsListResponse> {
    return apiClient<SessionsListResponse>("/api/auth/sessions");
  },

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/api/auth/sessions/${sessionId}`, {
      method: "DELETE",
    });
  },

  /**
   * Revoke all sessions except current
   */
  async revokeAllSessions(): Promise<{ message: string }> {
    return apiClient<{ message: string }>("/api/auth/sessions/revoke-all", {
      method: "POST",
    });
  },

  /**
   * Setup 2FA - generate secret and QR code
   */
  async setup2FA(): Promise<TwoFactorSetupResponse> {
    return apiClient<TwoFactorSetupResponse>("/api/auth/2fa/setup", {
      method: "POST",
    });
  },

  /**
   * Enable 2FA with verified code
   */
  async enable2FA(code: string): Promise<{ message: string; backup_codes: string[] }> {
    return apiClient<{ message: string; backup_codes: string[] }>("/api/auth/2fa/enable", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  /**
   * Disable 2FA
   */
  async disable2FA(code: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>("/api/auth/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  /**
   * Get 2FA status
   */
  async get2FAStatus(): Promise<TwoFactorStatusResponse> {
    return apiClient<TwoFactorStatusResponse>("/api/auth/2fa/status");
  },

  /**
   * Verify a 2FA code
   */
  async verify2FA(code: string): Promise<{ message: string; valid: boolean }> {
    return apiClient<{ message: string; valid: boolean }>("/api/auth/2fa/verify", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },
};

// ============================================================================
// OAuth API - Google OAuth
// ============================================================================

export interface GoogleOAuthUrlResponse {
  url: string;
}

export const oauthApi = {
  /**
   * Get Google OAuth URL
   */
  async getGoogleAuthUrl(): Promise<GoogleOAuthUrlResponse> {
    return apiClient<GoogleOAuthUrlResponse>("/api/auth/oauth/google/url");
  },

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(code: string): Promise<{
    message: string;
    user_id: string;
    email: string;
    name?: string;
    tokens: TokenResponse;
  }> {
    return apiClient<{
      message: string;
      user_id: string;
      email: string;
      name?: string;
      tokens: TokenResponse;
    }>("/api/auth/oauth/google/callback", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },
};

// ============================================================================
// Team API - Invitations
// ============================================================================

export interface AcceptInviteRequest {
  token: string;
  password: string;
  full_name?: string;
}

export interface AcceptInviteResponse {
  message: string;
  tenant_id: string;
  role: string;
  email: string;
  name?: string;
}

export interface AcceptInviteStatusResponse {
  valid: boolean;
  email?: string;
  name?: string;
  tenant_name?: string;
  role?: string;
  expires_at?: string;
  message?: string;
}

export const teamApi = {
  /**
   * Check invite status
   */
  async checkInviteStatus(token: string): Promise<AcceptInviteStatusResponse> {
    return apiClient<AcceptInviteStatusResponse>(`/api/team/accept?token=${encodeURIComponent(token)}`, {
      method: "GET",
    });
  },

  /**
   * Accept team invitation
   */
  async acceptInvite(payload: AcceptInviteRequest): Promise<AcceptInviteResponse> {
    return apiClient<AcceptInviteResponse>("/api/team/accept", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

// ============================================================================
// Onboarding API
// ============================================================================

export interface OnboardingStatus {
  current_step: number;
  completed: boolean;
  skipped_steps: string[];
  business_name?: string;
  industry?: string;
  website_url?: string;
  plan_tier?: string;
  chatbot_name?: string;
  document_count: number;
  ready_document_count: number;
}

export interface PlanInfo {
  tier: string;
  name: string;
  description: string;
  price_monthly: number;
  setup_fee: number;
  features: string[];
  highlighted: boolean;
}

export interface BusinessProfileRequest {
  business_name?: string;
  industry?: string;
  website_url?: string;
  business_description?: string;
  logo_url?: string;
}

export interface ChatbotConfigRequest {
  name?: string;
  avatar_url?: string;
  brand_color?: string;
  secondary_color?: string;
  greeting_message?: string;
  fallback_message?: string;
}

export interface DocumentStatusResponse {
  total: number;
  ready: number;
  processing: number;
  failed: number;
}

export interface EmbedCodeResponse {
  chatbot_id: string;
  embed_code: string;
  installation_instructions: {
    [key: string]: {
      title: string;
      steps?: string[];
      description?: string;
      code: string;
    };
  };
}

export const onboardingApi = {
  /**
   * Get onboarding status
   */
  async getStatus(): Promise<OnboardingStatus> {
    return apiClient<OnboardingStatus>("/api/onboarding/status", {
      method: "GET",
    });
  },

  /**
   * Get available plans
   */
  async getPlans(): Promise<PlanInfo[]> {
    return apiClient<PlanInfo[]>("/api/onboarding/plans", {
      method: "GET",
    });
  },

  /**
   * Update business profile (Step 1)
   */
  async updateProfile(data: BusinessProfileRequest): Promise<{
    message: string;
    business_name?: string;
    industry?: string;
    website_url?: string;
    business_description?: string;
    logo_url?: string;
  }> {
    return apiClient("/api/onboarding/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * Select plan (Step 2)
   */
  async selectPlan(planTier: string): Promise<{
    message: string;
    plan_tier: string;
    trial_days: number;
  }> {
    return apiClient("/api/onboarding/plan", {
      method: "PUT",
      body: JSON.stringify({ plan_tier: planTier }),
    });
  },

  /**
   * Get document status for Step 3
   */
  async getDocumentStatus(): Promise<DocumentStatusResponse> {
    return apiClient<DocumentStatusResponse>("/api/onboarding/documents/status", {
      method: "GET",
    });
  },

  /**
   * Configure chatbot (Step 4)
   */
  async configureChatbot(data: ChatbotConfigRequest): Promise<{
    message: string;
    chatbot_id?: string;
    name?: string;
    brand_color?: string;
    greeting_message?: string;
    fallback_message?: string;
  }> {
    return apiClient("/api/onboarding/chatbot", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * Complete a step
   */
  async completeStep(step: number): Promise<{
    message: string;
    next_step: number;
    completed: boolean;
  }> {
    return apiClient("/api/onboarding/complete", {
      method: "POST",
      body: JSON.stringify({ step }),
    });
  },

  /**
   * Skip a step
   */
  async skipStep(step: number, reason?: string): Promise<{
    message: string;
    skipped_step: number;
    next_step: number;
  }> {
    return apiClient("/api/onboarding/skip", {
      method: "POST",
      body: JSON.stringify({ step, reason }),
    });
  },

  /**
   * Get embed code (Step 6)
   */
  async getEmbedCode(): Promise<EmbedCodeResponse> {
    return apiClient<EmbedCodeResponse>("/api/onboarding/embed-code", {
      method: "GET",
    });
  },

  /**
   * Dismiss setup checklist
   */
  async dismissChecklist(): Promise<{ message: string }> {
    return apiClient("/api/onboarding/dismiss-checklist", {
      method: "POST",
    });
  },
};