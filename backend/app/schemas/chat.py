"""
Pydantic schemas for chat API requests and responses.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class SourceRef(BaseModel):
    """
    Reference to a source document/chunk used in generating the answer.

    Attributes:
        doc_id: Identifier of the source document
        chunk_index: Index of the chunk within the document (0-based)
        title: Title or name of the source document
        snippet: A short snippet of the relevant text from the source
        score: Relevance score (0.0 to 1.0) indicating how relevant this source is
    """

    doc_id: str = Field(..., description="Identifier of the source document")
    chunk_index: int = Field(..., description="Index of the chunk within the document")
    title: Optional[str] = Field(None, description="Title or name of the source document")
    snippet: Optional[str] = Field(None, description="Short snippet of relevant text from the source")
    score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Relevance score (0.0 to 1.0)")


class ChatMetadata(BaseModel):
    """
    Metadata about the chat response generation.

    Attributes:
        session_id: Session identifier for the conversation
        query_time_ms: Time taken to process the query in milliseconds
        sources_count: Number of sources used in generating the answer
        model: LLM model used for generation (if applicable)
        timestamp: ISO 8601 timestamp when the response was generated
    """

    session_id: Optional[str] = Field(None, description="Session identifier for the conversation")
    query_time_ms: float = Field(..., description="Time taken to process the query in milliseconds")
    sources_count: int = Field(..., ge=0, description="Number of sources used in generating the answer")
    model: Optional[str] = Field(None, description="LLM model used for generation")
    timestamp: str = Field(..., description="ISO 8601 timestamp when the response was generated")


class ChatRequest(BaseModel):
    """
    Request model for chat API endpoint.

    Attributes:
        session_id: Optional session identifier for maintaining conversation context
        message: The user's message/query
    """

    session_id: Optional[str] = Field(None, description="Optional session identifier for conversation context")
    message: str = Field(..., min_length=1, description="The user's message or query")


class ChatResponse(BaseModel):
    """
    Response model for chat API endpoint.

    Attributes:
        answer: The generated answer to the user's query
        sources: List of source references used in generating the answer
        metadata: Metadata about the response generation
    """

    answer: str = Field(..., description="The generated answer to the user's query")
    sources: List[SourceRef] = Field(default_factory=list, description="List of source references")
    metadata: ChatMetadata = Field(..., description="Metadata about the response generation")
