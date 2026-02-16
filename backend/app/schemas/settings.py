"""
Pydantic schemas for settings API requests and responses.
"""

from typing import Optional, Literal

from pydantic import BaseModel, Field


class RAGSettingsResponse(BaseModel):
    """
    Response model for GET /api/settings/rag endpoint.

    Attributes:
        model: LLM model name (e.g., "gpt-4", "gpt-3.5-turbo")
        temperature: Sampling temperature (0.0 to 2.0)
        top_k: Number of top-K results to retrieve
        max_tokens: Maximum tokens to generate
        system_prompt: Custom system prompt (None if using default)
        chunk_size: Chunk size for document chunking
        chunk_overlap: Overlap size between chunks
        embedding_model: Embedding model name
        chunking_strategy: Chunking strategy method
    """

    model: str = Field(..., description="LLM model name")
    temperature: float = Field(..., ge=0.0, le=2.0, description="Sampling temperature (0.0 to 2.0)")
    top_k: int = Field(..., ge=1, description="Number of top-K results to retrieve")
    max_tokens: int = Field(..., ge=1, description="Maximum tokens to generate")
    system_prompt: Optional[str] = Field(None, description="Custom system prompt (None if using default)")
    chunk_size: int = Field(..., ge=1, description="Chunk size for document chunking")
    chunk_overlap: int = Field(..., ge=0, description="Overlap size between chunks")
    embedding_model: str = Field(..., description="Embedding model name")
    chunking_strategy: str = Field(default="recursive", description="Chunking strategy method")


class RAGSettingsUpdateRequest(BaseModel):
    """
    Request model for PUT /api/settings/rag endpoint.

    Attributes:
        model: LLM model name (optional)
        temperature: Sampling temperature (optional, 0.0 to 2.0)
        top_k: Number of top-K results to retrieve (optional)
        max_tokens: Maximum tokens to generate (optional)
        system_prompt: Custom system prompt (optional, None to use default)
        chunk_size: Chunk size for document chunking (optional)
        chunk_overlap: Overlap size between chunks (optional)
        embedding_model: Embedding model name (optional)
        chunking_strategy: Chunking strategy method (optional)
    """

    model: Optional[str] = Field(None, description="LLM model name")
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0, description="Sampling temperature (0.0 to 2.0)")
    top_k: Optional[int] = Field(None, ge=1, description="Number of top-K results to retrieve")
    max_tokens: Optional[int] = Field(None, ge=1, description="Maximum tokens to generate")
    system_prompt: Optional[str] = Field(None, description="Custom system prompt (None to use default)")
    chunk_size: Optional[int] = Field(None, ge=1, description="Chunk size for document chunking")
    chunk_overlap: Optional[int] = Field(None, ge=0, description="Overlap size between chunks")
    embedding_model: Optional[str] = Field(None, description="Embedding model name")
    chunking_strategy: Optional[Literal["recursive", "fixed", "semantic"]] = Field(None, description="Chunking strategy method")


class RAGSettingsValidationRequest(BaseModel):
    """
    Request model for POST /api/settings/rag/validate endpoint.
    Used to validate settings without saving them.
    """

    model: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    top_k: Optional[int] = Field(None, ge=1)
    max_tokens: Optional[int] = Field(None, ge=1)
    system_prompt: Optional[str] = None
    chunk_size: Optional[int] = Field(None, ge=1)
    chunk_overlap: Optional[int] = Field(None, ge=0)
    embedding_model: Optional[str] = None
    chunking_strategy: Optional[Literal["recursive", "fixed", "semantic"]] = None


class RAGSettingsValidationResponse(BaseModel):
    """
    Response model for POST /api/settings/rag/validate endpoint.
    """

    valid: bool = Field(..., description="Whether the settings are valid")
    errors: list[str] = Field(default_factory=list, description="List of validation errors")
    warnings: list[str] = Field(default_factory=list, description="List of validation warnings")


class RAGSettingsUpdateResponse(BaseModel):
    """
    Response model for PUT /api/settings/rag endpoint.

    Attributes:
        message: Human-readable message about the update
        settings: Updated RAG settings
    """

    message: str = Field(..., description="Human-readable message about the update")
    settings: RAGSettingsResponse = Field(..., description="Updated RAG settings")
