"""
Application configuration for the AcmeDesk Assist backend.

Central place to load environment-based settings such as:
- OpenAI / LLM API keys
- Database URLs
- Vector database configuration

For now we keep this intentionally small; it can grow as the project does.
"""

from functools import lru_cache
from typing import Optional

from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings

from app.rag.chunking import ChunkingConfig


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

    class Config:
        env_file = ".env"
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

