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
    openai_api_key: Optional[str] = None
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

