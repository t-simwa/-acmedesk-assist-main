/**
 * API Client Layer for NexaChat
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

// =============================================================================
// Milestone 7.3 - Analytics Page Types
// =============================================================================

// Lead Analytics (7.3.6)
export interface LeadCountByDay {
  date: string;
  count: number;
}

export interface LeadSourceItem {
  channel: string;
  count: number;
  percentage: number;
}

export interface ConversionFunnelItem {
  stage: string;
  count: number;
  percentage: number;
}

export interface LeadAnalyticsResponse {
  total_leads: number;
  leads_by_day: LeadCountByDay[];
  lead_sources: LeadSourceItem[];
  conversion_funnel: ConversionFunnelItem[];
  leads_trend?: number | null;
}

// Channel Analytics (7.3.4)
export interface ChannelConversationItem {
  channel: string;
  icon: string;
  conversations: number;
  resolution_rate: number;
  avg_duration_minutes?: number | null;
}

export interface ChannelAnalyticsResponse {
  channels: ChannelConversationItem[];
  total_conversations: number;
}

// Content Analytics (7.3.5)
export interface UnansweredQuestion {
  query: string;
  count: number;
  last_asked: string;
}

export interface DocumentUsageItem {
  document_id: string;
  filename: string;
  reference_count: number;
  last_referenced?: string | null;
}

export interface ContentAnalyticsResponse {
  top_questions: TopQuery[];
  unanswered_questions: UnansweredQuestion[];
  most_referenced_docs: DocumentUsageItem[];
  underutilized_docs: DocumentUsageItem[];
  total_unanswered: number;
}

// Satisfaction Analytics (7.3.7)
export interface SatisfactionDataPoint {
  date: string;
  score: number;
  positive: number;
  negative: number;
}

export interface SatisfactionAnalyticsResponse {
  current_score: number;
  satisfaction_by_day: SatisfactionDataPoint[];
  total_positive: number;
  total_negative: number;
  score_trend?: number | null;
}

// ============================================================================
// Milestone 10 — Super Admin Panel Types
// ============================================================================

export interface SuperAdminKpiCard {
  label: string;
  value: number;
  suffix?: string | null;
  trend?: number | null;
}

export interface SuperAdminMrrPoint {
  month: string;
  new_mrr: number;
  churned_mrr: number;
  net_mrr: number;
}

export interface SuperAdminRecentSignup {
  tenant_id: string;
  business_name: string;
  plan?: string | null;
  created_at: string;
  status: string;
}

export interface SuperAdminFailedJob {
  id: string;
  tenant_name: string;
  error: string;
  created_at: string;
}

export interface SuperAdminSystemStatusItem {
  name: string;
  status: string;
  value?: string | null;
}

export interface SuperAdminDashboard {
  cards: SuperAdminKpiCard[];
  mrr_last_12_months: SuperAdminMrrPoint[];
  recent_signups: SuperAdminRecentSignup[];
  recent_failed_jobs: SuperAdminFailedJob[];
  system_status: SuperAdminSystemStatusItem[];
}

export interface SuperAdminClientRow {
  id: string;
  business_name: string;
  owner_email?: string | null;
  plan?: string | null;
  status: string;
  conversations_this_month: number;
  mrr_contribution: number;
  join_date: string;
  last_active?: string | null;
}

export interface SuperAdminClients {
  clients: SuperAdminClientRow[];
}

// Schedule Report (7.3.1)
export interface ScheduleReportRequest {
  frequency: string;
  day_of_week?: number;
  day_of_month?: number;
  time: string;
  recipient_email: string;
  enabled: boolean;
}

export interface ScheduleReportResponse {
  id: string;
  frequency: string;
  day_of_week?: number;
  day_of_month?: number;
  time: string;
  recipient_email: string;
  enabled: boolean;
  created_at: string;
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
// Super Admin API (Milestone 10)
// ============================================================================

export const superAdminApi = {
  async getDashboard(): Promise<SuperAdminDashboard> {
    return apiClient<SuperAdminDashboard>("/api/super-admin/dashboard", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authApi.getAccessToken()}`,
      },
    });
  },

  async getClients(): Promise<SuperAdminClients> {
    return apiClient<SuperAdminClients>("/api/super-admin/clients", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authApi.getAccessToken()}`,
      },
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
    const options: ApiClientOptions = {};
    if (params) {
      options.params = params as Record<string, string | number>;
    }
    return apiClient<DocumentListResponse>("/api/documents", options);
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

  /**
   * Get lead analytics (7.3.6 - Lead Analytics Section)
   */
  async getLeadsAnalytics(days: number = 30): Promise<LeadAnalyticsResponse> {
    return apiClient<LeadAnalyticsResponse>("/api/analytics/leads", {
      params: { days },
    });
  },

  /**
   * Get channel analytics (7.3.4 - Channel Analytics Section)
   */
  async getChannelAnalytics(): Promise<ChannelAnalyticsResponse> {
    return apiClient<ChannelAnalyticsResponse>("/api/analytics/channels");
  },

  /**
   * Get content analytics (7.3.5 - Content Analytics Section)
   */
  async getContentAnalytics(days: number = 30): Promise<ContentAnalyticsResponse> {
    return apiClient<ContentAnalyticsResponse>("/api/analytics/content", {
      params: { days },
    });
  },

  /**
   * Get satisfaction analytics (7.3.7 - Satisfaction Analytics Section)
   */
  async getSatisfactionAnalytics(days: number = 30): Promise<SatisfactionAnalyticsResponse> {
    return apiClient<SatisfactionAnalyticsResponse>("/api/analytics/satisfaction", {
      params: { days },
    });
  },

  /**
   * Schedule automated report (7.3.1 - Schedule Report)
   */
  async scheduleReport(config: ScheduleReportRequest): Promise<ScheduleReportResponse> {
    return apiClient<ScheduleReportResponse>("/api/analytics/schedule-report", {
      method: "POST",
      body: JSON.stringify(config),
    });
  },

  /**
   * Get scheduled reports
   */
  async getScheduledReports(): Promise<ScheduleReportResponse[]> {
    return apiClient<ScheduleReportResponse[]>("/api/analytics/schedule-report");
  },

  /**
   * Delete scheduled report
   */
  async deleteScheduledReport(reportId: string): Promise<void> {
    return apiClient<void>(`/api/analytics/schedule-report/${reportId}`, {
      method: "DELETE",
    });
  },
};

// ============================================================================
// Dashboard API (Milestone 7.2)
// ============================================================================

export interface ConversationVolumeData {
  date: string;
  count: number;
}

export interface ConversationOutcomeData {
  outcome: string;
  count: number;
  percentage: number;
}

export interface ChannelData {
  channel: string;
  count: number;
  icon: string;
}

export interface RecentConversationItem {
  id: string;
  channel: string;
  contact_name: string;
  first_message: string;
  status: string;
  time_ago: string;
}

export interface RecentLeadItem {
  id: string;
  name: string;
  email: string;
  channel: string;
  status: string;
  time_ago: string;
}

export interface ChatbotStatusResponse {
  status: "live" | "paused" | "not_installed";
  last_active?: string | null;
  embed_code?: string | null;
  chatbot_name?: string | null;
}

export interface DashboardSummary {
  total_conversations: number;
  leads_captured: number;
  resolution_rate: number;
  avg_response_time: string;
  conversations_trend?: number | null;
  leads_trend?: number | null;
  resolution_trend?: number | null;
  response_time_trend?: number | null;
  conversation_volume: ConversationVolumeData[];
  conversation_outcomes: ConversationOutcomeData[];
  channel_breakdown: ChannelData[];
  recent_conversations: RecentConversationItem[];
  recent_leads: RecentLeadItem[];
  unanswered_count: number;
  chatbot_status: ChatbotStatusResponse;
}

export const dashboardApi = {
  /**
   * Get dashboard summary with all metrics
   * @param preset Date range preset: "today", "7days", "30days"
   */
  async getSummary(preset: string = "7days"): Promise<DashboardSummary> {
    return apiClient<DashboardSummary>("/api/dashboard/summary", {
      params: { preset },
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

// ─── Admin Conversations Types (7.4) ─────────────────────────────────────────

export interface ConversationListItem {
  id: string;
  channel: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  first_message: string | null;
  message_count: number;
  status: "active" | "resolved" | "escalated" | "abandoned";
  rating: "positive" | "negative" | null;
  duration_minutes: number | null;
  started_at: string;
}

export interface ConversationStats {
  total: number;
  active: number;
  resolved: number;
  escalated: number;
  abandoned: number;
}

export interface ConversationListResponse {
  conversations: ConversationListItem[];
  total: number;
  page: number;
  per_page: number;
  stats: ConversationStats;
}

export interface ConversationMessageDetail {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations: Array<{ title?: string; url?: string; source?: string }> | null;
  confidence_score: number | null;
  created_at: string;
}

export interface ConversationContactDetail {
  id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  instagram_handle: string | null;
  company: string | null;
  lead_status: string | null;
  channels_used: string[] | null;
  first_seen_at: string | null;
  last_active_at: string | null;
  notes: string | null;
}

export interface ConversationTimelineEvent {
  event: string;
  timestamp: string;
  detail: string | null;
}

export interface ConversationDetailResponse {
  id: string;
  channel: string;
  status: string;
  rating: string | null;
  message_count: number;
  started_at: string;
  resolved_at: string | null;
  last_activity_at: string | null;
  page_url: string | null;
  duration_minutes: number | null;
  messages: ConversationMessageDetail[];
  contact: ConversationContactDetail | null;
  timeline: ConversationTimelineEvent[];
  is_flagged: boolean;
}

export interface ConversationStatusUpdateResponse {
  id: string;
  status: string;
  updated: boolean;
  message: string;
}

export interface ConversationNoteResponse {
  conversation_id: string;
  note: string;
  added: boolean;
  message: string;
}

export interface ConversationFlagResponse {
  conversation_id: string;
  is_flagged: boolean;
  message: string;
}

export interface ConversationBulkRequest {
  action: "resolve" | "delete" | "tag" | "export";
  conversation_ids: string[];
  tag?: string;
  reason?: string;
}

export interface ConversationBulkResponse {
  action: string;
  affected: number;
  failed: number;
  message: string;
  export_data: Array<Record<string, string | number>> | null;
}

export interface ConversationListFilters {
  page?: number;
  per_page?: number;
  search?: string;
  channel?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  rating?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

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

  // ─── Admin Conversation Management (7.4) ───────────────────────────────────

  /** 7.4.1–7.4.3: Paginated list with filters and stats */
  async listConversations(filters: ConversationListFilters = {}): Promise<ConversationListResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.per_page) params.set("per_page", String(filters.per_page));
    if (filters.search) params.set("search", filters.search);
    if (filters.channel && filters.channel !== "all") params.set("channel", filters.channel);
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.rating && filters.rating !== "all") params.set("rating", filters.rating);
    const qs = params.toString();
    return apiClient<ConversationListResponse>(`/api/conversations/admin/list${qs ? `?${qs}` : ""}`);
  },

  /** 7.4.4: Full conversation detail */
  async getConversationDetail(id: string): Promise<ConversationDetailResponse> {
    return apiClient<ConversationDetailResponse>(`/api/conversations/admin/${id}`);
  },

  /** 7.4.4: Update conversation status */
  async updateConversationStatus(
    id: string,
    status: string,
    reason?: string,
  ): Promise<ConversationStatusUpdateResponse> {
    return apiClient<ConversationStatusUpdateResponse>(`/api/conversations/admin/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    });
  },

  /** 7.4.4: Add internal note */
  async addNote(id: string, note: string): Promise<ConversationNoteResponse> {
    return apiClient<ConversationNoteResponse>(`/api/conversations/admin/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  },

  /** 7.4.4: Toggle flag for training */
  async toggleFlag(id: string): Promise<ConversationFlagResponse> {
    return apiClient<ConversationFlagResponse>(`/api/conversations/admin/${id}/flag`, {
      method: "POST",
    });
  },

  /** 7.4.5: Bulk action */
  async bulkAction(request: ConversationBulkRequest): Promise<ConversationBulkResponse> {
    return apiClient<ConversationBulkResponse>("/api/conversations/admin/bulk", {
      method: "POST",
      body: JSON.stringify(request),
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
  job_title: string | null;
  linkedin_url: string | null;
  phone: string | null;
  bio: string | null;
  notifications: NotificationPreferences;
  theme: "light" | "dark" | "system";
  default_date_range: string;
  email_digest: string;
  language: string | null;
  timezone: string | null;
  notifications_summary: boolean;
  additional_preferences: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferencesUpdateRequest {
  name?: string;
  email?: string;
  job_title?: string;
  linkedin_url?: string;
  phone?: string;
  bio?: string;
  notifications?: NotificationPreferences;
  theme?: "light" | "dark" | "system";
  default_date_range?: string;
  email_digest?: string;
  language?: string;
  timezone?: string;
  notifications_summary?: boolean;
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
    const options: ApiClientOptions = {};
    if (filters) {
      options.params = filters as Record<string, string | number>;
    }
    return apiClient<AuditLogListResponse>("/api/admin/audit-logs", options);
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
    const options: ApiClientOptions = {
      method: "DELETE",
    };
    if (reason) {
      options.body = JSON.stringify({ reason });
    }
    return apiClient<{ message: string; id: string }>(`/api/admin/api-keys/${keyId}`, options);
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
   * Create Stripe Checkout session for selected plan (Step 2)
   */
  async createCheckoutSession(planTier: string): Promise<{
    checkout_url: string;
  }> {
    return apiClient("/api/billing/create-checkout-session", {
      method: "POST",
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

// ============================================================================
// Chatbot API (Milestone 6)
// ============================================================================

export interface ChatbotConfig {
  id: string;
  status: string;
  // Tab1
  name: string;
  avatar_url?: string;
  brand_color: string;
  secondary_color: string;
  user_message_color: string;
  widget_position: string;
  show_powered_by: boolean;
  font_size: string;
  // Tab2
  response_language: string;
  response_tone: string;
  response_length: string;
  greeting_message?: string;
  farewell_message?: string;
  fallback_message?: string;
  escalation_message?: string;
  show_typing: boolean;
  show_citations: boolean;
  read_receipts: boolean;
  suggested_starter_questions?: string[];
  conversation_starters_display: string;
  // Tab3
  business_hours_enabled: boolean;
  timezone?: string;
  weekly_schedule?: any;
  outside_hours_behavior: string;
  offline_message?: string;
  back_online_message?: string;
  holiday_hours?: any;
  // Tab4
  auto_escalation_enabled: boolean;
  confidence_threshold: number;
  unanswered_questions_threshold: string;
  sentiment_escalation_enabled: boolean;
  keyword_triggers?: string[];
  escalation_email_addresses?: string[];
  escalation_slack_webhook?: string;
  escalation_whatsapp_notification: boolean;
  // Tab5
  lead_capture_enabled: boolean;
  lead_capture_trigger: string;
  lead_capture_fields_config?: any;
  lead_capture_message?: string;
  lead_capture_thank_you_message?: string;
  lead_capture_skip_enabled: boolean;
  lead_capture_skip_button_text?: string;
  // Tab6
  notifications_config?: any;
  notification_email_addresses?: string[];
}


export const chatbotApi = {
  /**
   * Get chatbot configuration
   */
  async getConfig(): Promise<ChatbotConfig> {
    return apiClient<ChatbotConfig>("/api/chatbot/config");
  },

  /**
   * Update chatbot configuration
   */
  async updateConfig(data: Partial<ChatbotConfig>): Promise<ChatbotConfig> {
    return apiClient<ChatbotConfig>("/api/chatbot/config", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * Update allowed domains
   */
  async updateDomains(domains: string[]): Promise<ChatbotConfig> {
    return apiClient<ChatbotConfig>("/api/chatbot/domains", {
      method: "PUT",
      body: JSON.stringify({ allowed_domains: domains }),
    });
  },
};

// ============================================================================
// Leads API (Milestone 7.5)
// ============================================================================

export interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  converted: number;
  this_month: number;
}

export interface LeadListItem {
  id: string;
  contact_id: string | null;
  conversation_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_company: string | null;
  channel: string | null;
  source_page_url: string | null;
  first_message: string | null;
  status: string;
  lead_score: string | null;
  message_count: number;
  created_at: string;
}

export interface LeadListResponse {
  leads: LeadListItem[];
  total: number;
  page: number;
  per_page: number;
  stats: LeadStats;
}

export interface LeadContactDetail {
  id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  instagram_handle: string | null;
  channels_used: string[] | null;
  lead_status: string | null;
  lead_score: string | null;
  tags: string[] | null;
  notes: string | null;
}

export interface LeadMessageItem {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  sources: string[] | null;
}

export interface LeadTimelineEvent {
  event: string;
  timestamp: string;
  detail: string | null;
}

export interface LeadDetailResponse {
  id: string;
  contact: LeadContactDetail | null;
  conversation_id: string | null;
  channel: string | null;
  source_page_url: string | null;
  first_message: string | null;
  status: string;
  lead_score: string | null;
  message_count: number;
  messages: LeadMessageItem[];
  timeline: LeadTimelineEvent[];
  notes: Array<{ note: string; created_at: string }>;
  created_at: string;
  updated_at: string | null;
}

export interface LeadBulkRequest {
  action: string;
  lead_ids: string[];
  status?: string;
  reason?: string;
}

export interface LeadBulkResponse {
  action: string;
  affected: number;
  failed: number;
  export_data: Array<Record<string, unknown>> | null;
}

export interface LeadListFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  channel?: string;
  date_from?: string;
  date_to?: string;
  source_page?: string;
}

export const leadsApi = {
  async listLeads(filters: LeadListFilters = {}): Promise<LeadListResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.per_page) params.set("per_page", String(filters.per_page));
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.channel) params.set("channel", filters.channel);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.source_page) params.set("source_page", filters.source_page);
    return apiClient<LeadListResponse>(`/api/leads/list?${params.toString()}`);
  },

  async getLeadDetail(id: string): Promise<LeadDetailResponse> {
    return apiClient<LeadDetailResponse>(`/api/leads/${id}`);
  },

  async updateLeadStatus(id: string, status: string, reason?: string): Promise<{ id: string; status: string; updated_at: string }> {
    return apiClient(`/api/leads/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    });
  },

  async addNote(id: string, note: string): Promise<{ id: string; note: string; timestamp: string }> {
    return apiClient(`/api/leads/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  },

  async recalculateScore(id: string): Promise<{ id: string; lead_score: string | null; updated_at: string }> {
    return apiClient(`/api/leads/${id}/score`, {
      method: "POST",
    });
  },

  async bulkAction(request: LeadBulkRequest): Promise<LeadBulkResponse> {
    return apiClient("/api/leads/bulk", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },
};

// ============================================================================
// Contacts API (Milestone 9.8)
// ============================================================================

export interface ContactItem {
  id: string;
  tenant_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  instagram_handle: string | null;
  company: string | null;
  channels_used: string[] | null;
  first_seen_channel: string | null;
  first_seen_at: string | null;
  last_active_at: string | null;
  lead_status: string | null;
  lead_score: string | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ContactListResponse {
  contacts: ContactItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface ContactCreateRequest {
  full_name?: string;
  email?: string;
  phone?: string;
  instagram_handle?: string;
  company?: string;
  lead_status?: string;
  lead_score?: string;
  tags?: string[];
  notes?: string;
}

export interface ContactUpdateRequest {
  full_name?: string;
  email?: string;
  phone?: string;
  instagram_handle?: string;
  company?: string;
  lead_status?: string;
  lead_score?: string;
  tags?: string[];
  notes?: string;
}

export interface ContactDetailResponse {
  contact: ContactItem;
  conversations_count: number;
  bookings_count: number;
}

export interface ContactListFilters {
  page?: number;
  per_page?: number;
  search?: string;
  lead_status?: string;
  channel?: string;
}

export const contactsApi = {
  async list(filters: ContactListFilters = {}): Promise<ContactListResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.per_page) params.set("per_page", String(filters.per_page));
    if (filters.search) params.set("search", filters.search);
    if (filters.lead_status) params.set("lead_status", filters.lead_status);
    if (filters.channel) params.set("channel", filters.channel);
    return apiClient<ContactListResponse>(`/api/contacts?${params.toString()}`);
  },

  async get(id: string): Promise<ContactDetailResponse> {
    return apiClient<ContactDetailResponse>(`/api/contacts/${id}`);
  },

  async create(data: ContactCreateRequest): Promise<ContactItem> {
    return apiClient<ContactItem>("/api/contacts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: ContactUpdateRequest): Promise<ContactItem> {
    return apiClient<ContactItem>(`/api/contacts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async remove(id: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/api/contacts/${id}`, {
      method: "DELETE",
    });
  },
};

// ============================================================================
// Campaigns API (Milestone 9.9)
// ============================================================================

export interface CampaignItem {
  id: string;
  tenant_id: string;
  name: string;
  channel: string;
  status: string;
  audience_filter: Record<string, unknown> | null;
  message_template: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  reply_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface CampaignListResponse {
  campaigns: CampaignItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface CampaignCreateRequest {
  name: string;
  channel: string;
  message_template?: string;
  audience_filter?: Record<string, unknown>;
  scheduled_at?: string;
}

export interface CampaignUpdateRequest {
  name?: string;
  channel?: string;
  status?: string;
  message_template?: string;
  audience_filter?: Record<string, unknown>;
  scheduled_at?: string;
}

export interface CampaignStats {
  total: number;
  draft: number;
  scheduled: number;
  sending: number;
  sent: number;
  cancelled: number;
}

export interface CampaignListFilters {
  page?: number;
  per_page?: number;
  status?: string;
  channel?: string;
}

export const campaignsApi = {
  async list(filters: CampaignListFilters = {}): Promise<CampaignListResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.per_page) params.set("per_page", String(filters.per_page));
    if (filters.status) params.set("status", filters.status);
    if (filters.channel) params.set("channel", filters.channel);
    return apiClient<CampaignListResponse>(`/api/campaigns?${params.toString()}`);
  },

  async get(id: string): Promise<CampaignItem> {
    return apiClient<CampaignItem>(`/api/campaigns/${id}`);
  },

  async create(data: CampaignCreateRequest): Promise<CampaignItem> {
    return apiClient<CampaignItem>("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: CampaignUpdateRequest): Promise<CampaignItem> {
    return apiClient<CampaignItem>(`/api/campaigns/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async remove(id: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/api/campaigns/${id}`, {
      method: "DELETE",
    });
  },

  async stats(): Promise<CampaignStats> {
    return apiClient<CampaignStats>("/api/campaigns/stats");
  },

  async send(id: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/api/campaigns/${id}/send`, {
      method: "POST",
    });
  },
};

// ============================================================================
// Bookings API (Milestone 9.10)
// ============================================================================

export interface BookingItem {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  conversation_id: string | null;
  service: string;
  preferred_date: string | null;
  preferred_time: string | null;
  status: string;
  notes: string | null;
  source_channel: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BookingListResponse {
  bookings: BookingItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface BookingCreateRequest {
  contact_id?: string;
  conversation_id?: string;
  service: string;
  preferred_date?: string;
  preferred_time?: string;
  notes?: string;
  source_channel?: string;
}

export interface BookingUpdateRequest {
  contact_id?: string;
  service?: string;
  preferred_date?: string;
  preferred_time?: string;
  status?: string;
  notes?: string;
}

export interface BookingStats {
  total: number;
  requested: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

export interface BookingListFilters {
  page?: number;
  per_page?: number;
  status?: string;
  channel?: string;
}

export const bookingsApi = {
  async list(filters: BookingListFilters = {}): Promise<BookingListResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.per_page) params.set("per_page", String(filters.per_page));
    if (filters.status) params.set("status", filters.status);
    if (filters.channel) params.set("channel", filters.channel);
    return apiClient<BookingListResponse>(`/api/bookings?${params.toString()}`);
  },

  async get(id: string): Promise<BookingItem> {
    return apiClient<BookingItem>(`/api/bookings/${id}`);
  },

  async create(data: BookingCreateRequest): Promise<BookingItem> {
    return apiClient<BookingItem>("/api/bookings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: BookingUpdateRequest): Promise<BookingItem> {
    return apiClient<BookingItem>(`/api/bookings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async remove(id: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/api/bookings/${id}`, {
      method: "DELETE",
    });
  },

  async stats(): Promise<BookingStats> {
    return apiClient<BookingStats>("/api/bookings/stats");
  },
};

// ============================================================================
// Unified Inbox API (Milestone 9.7)
// ============================================================================

export interface InboxThreadItem {
  id: string;
  channel: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  last_message: string | null;
  last_message_at: string | null;
  message_count: number;
  status: string;
  is_unread: boolean;
}

export interface InboxListResponse {
  threads: InboxThreadItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface InboxMessageItem {
  id: string;
  role: string;
  content: string;
  created_at: string | null;
  metadata: Record<string, unknown> | null;
}

export interface InboxThreadDetailResponse {
  conversation_id: string;
  channel: string;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  messages: InboxMessageItem[];
}

export interface InboxReplyResponse {
  message: InboxMessageItem;
}

export interface InboxListFilters {
  page?: number;
  per_page?: number;
  channel?: string;
  status?: string;
  search?: string;
}

export const inboxApi = {
  async list(filters: InboxListFilters = {}): Promise<InboxListResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.per_page) params.set("per_page", String(filters.per_page));
    if (filters.channel) params.set("channel", filters.channel);
    if (filters.status) params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);
    return apiClient<InboxListResponse>(`/api/inbox?${params.toString()}`);
  },

  async getThread(conversationId: string): Promise<InboxThreadDetailResponse> {
    return apiClient<InboxThreadDetailResponse>(`/api/inbox/${conversationId}`);
  },

  async reply(conversationId: string, body: string): Promise<InboxReplyResponse> {
    return apiClient<InboxReplyResponse>(`/api/inbox/${conversationId}/reply`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  },
};

// ============================================================================
// Channels Config API (Milestone 9.1)
// ============================================================================

export interface ChannelConfigItem {
  channel: string;
  enabled: boolean;
  connected: boolean;
  display_name: string;
  description: string;
}

export interface ChannelConfigListResponse {
  channels: ChannelConfigItem[];
}

export interface ChannelToggleResponse {
  channel: string;
  enabled: boolean;
  message: string;
}

export const channelsApi = {
  async list(): Promise<ChannelConfigListResponse> {
    return apiClient<ChannelConfigListResponse>("/api/channels");
  },

  async toggle(channel: string, enabled: boolean): Promise<ChannelToggleResponse> {
    return apiClient<ChannelToggleResponse>(`/api/channels/${channel}/toggle`, {
      method: "POST",
      body: JSON.stringify({ enabled }),
    });
  },
};