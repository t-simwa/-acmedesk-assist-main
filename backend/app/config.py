"""
Application configuration for the AcmeDesk Assist backend.

Central place to load environment-based settings such as:
- OpenAI / LLM API keys
- Database URLs
- Vector database configuration

For now we keep this intentionally small; it can grow as the project does.
"""

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings

from app.rag.chunking import ChunkingConfig

# Backend root (directory containing app/) and default Chroma path.
# Resolving relative paths against this ensures the same index is used regardless of process cwd.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_VECTOR_PERSIST_DIR = str(_BACKEND_ROOT / "data" / "vector_db")


def get_vector_store_persist_dir() -> str:
    """Return absolute path for Chroma persistence so ingestion and API share the same index.
    Relative paths (e.g. from .env) are resolved against the backend root, not cwd.
    """
    s = get_settings()
    raw = s.vector_store_persist_dir or _DEFAULT_VECTOR_PERSIST_DIR
    p = Path(raw)
    if not p.is_absolute():
        p = _BACKEND_ROOT / raw
    return str(p.resolve())


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables."""

    # Core service config
    app_name: str = "AcmeDesk Assist Backend"
    environment: str = "development"

    # Frontend URL allowed for CORS
    frontend_origin: AnyHttpUrl | str = "http://localhost:8080"

    # RAG-related configuration
    openai_api_key: Optional[str] = None  # Also used for Ollama Cloud API key
    ollama_api_key: Optional[str] = None  # Ollama Cloud API key (alternative to openai_api_key)
    database_url: Optional[str] = None
    vector_db_url: Optional[str] = None
    
    # Embedding configuration
    embedding_model: str = "all-MiniLM-L6-v2"  # Sentence Transformer model name
    use_openai_embeddings: bool = False  # If True, use OpenAI instead of Sentence Transformers
    vector_store_persist_dir: Optional[str] = None  # Directory for ChromaDB persistence (None = in-memory)
    vector_collection_name: str = "acmedesk_documents"

    # Chunking configuration
    chunk_size: int = 600
    chunk_overlap: int = 100
    
    # LLM configuration
    llm_model: str = "gpt-3.5-turbo"  # LLM model (supports OpenAI, Ollama, etc. via LiteLLM)
    # For Ollama Cloud: use "ollama/gpt-oss:120b-cloud" (recommended) or "ollama/llama3.1" or "ollama/llama3" or "ollama/mistral"
    llm_temperature: float = 0.2  # Sampling temperature (0.0 to 2.0) - Lowered for consistent formatting (was 0.7)
    llm_max_tokens: int = 1000  # Maximum tokens to generate
    llm_base_url: Optional[str] = None  # Base URL for LLM API
    # For Ollama Cloud: use "https://api.ollama.com" or your Ollama Cloud endpoint
    # For local Ollama: use "http://localhost:11434"
    
    # Retrieval configuration
    retrieval_top_k: int = 5  # Number of chunks to retrieve
    retrieval_use_hybrid_search: bool = True  # Enable hybrid search (semantic + keyword)
    retrieval_hybrid_semantic_weight: float = 0.7  # Weight for semantic search in hybrid
    retrieval_hybrid_keyword_weight: float = 0.3  # Weight for keyword search in hybrid
    retrieval_use_reranking: bool = False  # Enable re-ranking with cross-encoder
    retrieval_rerank_top_n: int = 10  # Number of chunks to re-rank
    
    # Prompt configuration
    system_prompt: Optional[str] = None  # Custom system prompt (None = use default)

    # Authentication & JWT configuration
    jwt_secret_key: str = "your-secret-key-change-in-production"  # JWT secret key (MUST be changed in production)
    jwt_algorithm: str = "HS256"  # JWT algorithm
    jwt_access_token_expire_minutes: int = 60  # Access token expiration (1 hour per spec 3.1.3)
    jwt_refresh_token_expire_days: int = 30  # Refresh token expiration (30 days per spec 3.1.3)
    jwt_remember_me_expire_days: int = 30  # Remember me token expiration (30 days)
    
    # Email/SMTP configuration
    email_provider: str = "sendgrid"  # sendgrid | resend | smtp
    # SendGrid credentials (used when email_provider=sendgrid)
    sendgrid_api_key: Optional[str] = None
    sendgrid_from_email: Optional[str] = None
    sendgrid_default_subject: Optional[str] = None
    # Resend credentials (used when email_provider=resend)
    resend_api_key: Optional[str] = None  # Resend API key (get from https://resend.com)
    resend_from_email: Optional[str] = None
    # SMTP configuration (used when email_provider=smtp)
    smtp_host: str = "localhost"  # SMTP server host (deprecated - use Resend)
    smtp_port: int = 587  # SMTP server port
    smtp_username: Optional[str] = None  # SMTP username (if required)
    smtp_password: Optional[str] = None  # SMTP password (if required)
    smtp_use_tls: bool = True  # Use TLS for SMTP
    smtp_from_email: str = "noreply@simca-agencies.com"  # From email address
    smtp_from_name: str = "AcmeDesk Assist"  # From name

    # Email inbox (IMAP/POP3) configuration
    email_channel_enabled: bool = False  # Master toggle for email channel
    email_imap_host: Optional[str] = None  # IMAP server host
    email_imap_port: int = 993  # IMAP server port (usually 993 for SSL)
    email_imap_username: Optional[str] = None  # IMAP username (usually full email)
    email_imap_password: Optional[str] = None  # IMAP password or app password
    email_imap_use_ssl: bool = True  # Use SSL for IMAP
    email_imap_mailbox: str = "INBOX"  # Mailbox folder to monitor

    # Stripe billing configuration
    stripe_secret_key: Optional[str] = None  # Stripe secret API key
    stripe_webhook_secret: Optional[str] = None  # Stripe webhook signing secret

    # SMS channel configuration (J2.1)
    sms_channel_enabled: bool = False  # Master toggle for SMS channel
    sms_default_from_number: Optional[str] = None  # Default sender number (e.g. +15551234567)
    sms_outbound_webhook_url: Optional[str] = None  # Optional HTTP endpoint to call for outbound SMS delivery
    sms_outbound_webhook_token: Optional[str] = None  # Optional token/secret for outbound webhook auth

    # WhatsApp channel configuration (J2.2)
    whatsapp_channel_enabled: bool = False  # Master toggle for WhatsApp channel
    whatsapp_default_from_number: Optional[str] = None  # Default business number or phone for WhatsApp
    whatsapp_outbound_webhook_url: Optional[str] = None  # Optional HTTP endpoint to call for outbound WhatsApp delivery
    whatsapp_outbound_webhook_token: Optional[str] = None  # Optional token/secret for outbound webhook auth

    # Facebook Messenger channel configuration (J3.1)
    messenger_channel_enabled: bool = False  # Master toggle for Facebook Messenger channel
    messenger_page_id: Optional[str] = None  # Facebook Page ID for Messenger
    messenger_outbound_webhook_url: Optional[str] = None  # Optional HTTP endpoint to call for outbound Messenger delivery
    messenger_outbound_webhook_token: Optional[str] = None  # Optional token/secret for outbound webhook auth

    # Twitter/X channel configuration (J3.2) — LEGACY, kept for backward compat
    twitter_channel_enabled: bool = False
    twitter_account_id: Optional[str] = None
    twitter_outbound_webhook_url: Optional[str] = None
    twitter_outbound_webhook_token: Optional[str] = None

    # Instagram DM channel configuration (9.4)
    instagram_channel_enabled: bool = False  # Master toggle for Instagram DM channel
    instagram_account_id: Optional[str] = None  # Instagram business account ID
    instagram_outbound_webhook_url: Optional[str] = None  # Optional HTTP endpoint for outbound Instagram DM delivery
    instagram_outbound_webhook_token: Optional[str] = None  # Optional token/secret for outbound webhook auth
    
    # Google OAuth configuration (3.3.5)
    google_client_id: Optional[str] = None  # Google OAuth Client ID
    google_client_secret: Optional[str] = None  # Google OAuth Client Secret
    google_redirect_uri: str = "http://localhost:5173/login/oauth/callback"  # OAuth callback URL

    # Widget configuration
    widget_url: Optional[str] = None  # URL for the embeddable chat widget
    # Backend origin used to construct OAuth redirect URIs when running locally
    backend_origin: str = "http://localhost:8000"
    # Meta / Facebook OAuth
    meta_client_id: Optional[str] = None
    meta_client_secret: Optional[str] = None
    meta_api_version: str = "v16.0"
    meta_app_secret: Optional[str] = None  # Meta app secret for webhook signature verification
    
    # Webhook verification tokens (generated per-tenant or globally)
    meta_webhook_verify_token: Optional[str] = None  # Token for WhatsApp/Messenger/Instagram webhook verification
    messenger_webhook_verify_token: Optional[str] = None
    instagram_webhook_verify_token: Optional[str] = None
    
    # Twilio configuration for SMS webhooks
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None  # For webhook verification
    twilio_phone_number: Optional[str] = None  # Default Twilio phone number
    # Token refresh scheduler
    token_refresh_enabled: bool = True
    token_refresh_interval_seconds: int = 3600  # run hourly by default
    # Encryption key used to protect OAuth tokens at rest (Fernet key or passphrase)
    encryption_key: Optional[str] = None
    
    # Cloudflare R2 storage configuration (supports both old and new env var names)
    r2_bucket_name: Optional[str] = None  # R2 bucket name
    r2_access_key: Optional[str] = None  # R2 access key
    r2_secret_key: Optional[str] = None  # R2 secret key
    r2_endpoint_url: Optional[str] = None  # R2 endpoint URL (e.g., https://xxx.r2.cloudflarestorage.com)
    r2_region: str = "auto"  # R2 region
    
    # Legacy R2 config names (for backwards compatibility)
    cloudflare_r2_bucket: Optional[str] = None
    cloudflare_r2_access_key: Optional[str] = None
    cloudflare_r2_secret_key: Optional[str] = None
    cloudflare_r2_endpoint: Optional[str] = None
    
    # Redis configuration for job queue
    redis_url: Optional[str] = None  # Redis URL (e.g., redis://localhost:6379)
    
    # Document processing configuration
    max_file_size_mb: int = 50  # Maximum file size in MB
    allowed_file_types: list = [".pdf", ".docx", ".txt", ".csv", ".md", ".html", ".htm"]


    class Config:
        # Load .env from backend directory so settings are consistent regardless of cwd
        env_file = _BACKEND_ROOT / ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """
    Return a cached Settings instance.

    Using lru_cache ensures we only read environment variables once per process.
    """

    return Settings()


settings = get_settings()


def get_chunking_config() -> ChunkingConfig:
    """
    Get chunking configuration from settings.

    Returns:
        ChunkingConfig instance with values from settings
    """
    return ChunkingConfig(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )

