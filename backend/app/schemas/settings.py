"""
Pydantic schemas for settings API requests and responses.
"""

from typing import Optional

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
    """

    model: str = Field(..., description="LLM model name")
    temperature: float = Field(..., ge=0.0, le=2.0, description="Sampling temperature (0.0 to 2.0)")
    top_k: int = Field(..., ge=1, description="Number of top-K results to retrieve")
    max_tokens: int = Field(..., ge=1, description="Maximum tokens to generate")
    system_prompt: Optional[str] = Field(None, description="Custom system prompt (None if using default)")
    chunk_size: int = Field(..., ge=1, description="Chunk size for document chunking")


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
    """

    model: Optional[str] = Field(None, description="LLM model name")
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0, description="Sampling temperature (0.0 to 2.0)")
    top_k: Optional[int] = Field(None, ge=1, description="Number of top-K results to retrieve")
    max_tokens: Optional[int] = Field(None, ge=1, description="Maximum tokens to generate")
    system_prompt: Optional[str] = Field(None, description="Custom system prompt (None to use default)")
    chunk_size: Optional[int] = Field(None, ge=1, description="Chunk size for document chunking")


class RAGSettingsUpdateResponse(BaseModel):
    """
    Response model for PUT /api/settings/rag endpoint.

    Attributes:
        message: Human-readable message about the update
        settings: Updated RAG settings
    """

    message: str = Field(..., description="Human-readable message about the update")
    settings: RAGSettingsResponse = Field(..., description="Updated RAG settings")
