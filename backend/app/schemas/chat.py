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


class ConversationMessage(BaseModel):
    """
    A single message in a conversation.

    Attributes:
        id: Unique message identifier
        role: Role of the message sender (user or assistant)
        content: The message content
        timestamp: ISO 8601 timestamp when the message was created
        metadata: Optional metadata about the message (sources_count, query_time_ms, etc.)
    """

    id: str = Field(..., description="Unique message identifier")
    role: str = Field(..., description="Role of the message sender (user or assistant)")
    content: str = Field(..., description="The message content")
    timestamp: str = Field(..., description="ISO 8601 timestamp when the message was created")
    metadata: Optional[dict] = Field(None, description="Optional metadata about the message")


class ConversationHistoryResponse(BaseModel):
    """
    Response model for conversation history endpoint.

    Attributes:
        session_id: Session identifier
        messages: List of conversation messages
        total: Total number of messages in the conversation
        limit: Maximum number of messages returned
        offset: Number of messages skipped
    """

    session_id: str = Field(..., description="Session identifier")
    messages: List[ConversationMessage] = Field(default_factory=list, description="List of conversation messages")
    total: int = Field(..., ge=0, description="Total number of messages in the conversation")
    limit: int = Field(..., ge=1, description="Maximum number of messages returned")
    offset: int = Field(..., ge=0, description="Number of messages skipped")


class DeleteConversationResponse(BaseModel):
    """
    Response model for delete conversation endpoint.

    Attributes:
        session_id: Session identifier that was deleted
        deleted: Whether the deletion was successful
        message: Human-readable message about the deletion
    """

    session_id: str = Field(..., description="Session identifier that was deleted")
    deleted: bool = Field(..., description="Whether the deletion was successful")
    message: str = Field(..., description="Human-readable message about the deletion")


class MessageReactionRequest(BaseModel):
    """
    Request model for updating message reaction.

    Attributes:
        message_id: Unique message identifier
        reaction: Reaction type ("thumbs_up" or "thumbs_down")
    """

    message_id: str = Field(..., description="Unique message identifier")
    reaction: str = Field(..., description="Reaction type: 'thumbs_up' or 'thumbs_down'")


class MessageReactionResponse(BaseModel):
    """
    Response model for message reaction endpoint.

    Attributes:
        message_id: Unique message identifier
        reaction: Current reaction type ("thumbs_up", "thumbs_down", or None)
        success: Whether the update was successful
    """

    message_id: str = Field(..., description="Unique message identifier")
    reaction: Optional[str] = Field(None, description="Current reaction type")
    success: bool = Field(..., description="Whether the update was successful")