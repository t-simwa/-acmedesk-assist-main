"""
Pydantic schemas for document API requests and responses.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class DocumentStatus(str):
    """Document processing status enum."""

    PROCESSING = "processing"
    INDEXED = "indexed"
    ERROR = "error"


class DocumentType(str):
    """Document type enum."""

    MARKDOWN = "markdown"
    HTML = "html"
    TEXT = "text"
    UNKNOWN = "unknown"


class DocumentMetadata(BaseModel):
    """
    Document metadata model.

    Attributes:
        id: Unique document identifier
        name: Document name/filename
        type: Document type (markdown, html, text)
        status: Processing status (processing, indexed, error)
        file_path: Path to the stored file
        file_size: File size in bytes
        chunk_count: Number of chunks created from this document
        created_at: ISO 8601 timestamp when document was created
        updated_at: ISO 8601 timestamp when document was last updated
        last_indexed_at: ISO 8601 timestamp when document was last indexed (None if never indexed)
        error_message: Error message if status is 'error' (None otherwise)
    """

    id: str = Field(..., description="Unique document identifier")
    knowledge_base_id: Optional[str] = Field(None, description="Knowledge base ID this document belongs to")
    name: str = Field(..., description="Document name/filename")
    type: str = Field(..., description="Document type (markdown, html, text)")
    status: str = Field(..., description="Processing status (processing, indexed, error)")
    file_path: str = Field(..., description="Path to the stored file")
    file_size: int = Field(..., ge=0, description="File size in bytes")
    chunk_count: int = Field(default=0, ge=0, description="Number of chunks created from this document")
    created_at: str = Field(..., description="ISO 8601 timestamp when document was created")
    updated_at: str = Field(..., description="ISO 8601 timestamp when document was last updated")
    last_indexed_at: Optional[str] = Field(None, description="ISO 8601 timestamp when document was last indexed")
    error_message: Optional[str] = Field(None, description="Error message if status is 'error'")


class DocumentUploadResponse(BaseModel):
    """
    Response model for document upload endpoint.

    Attributes:
        id: Unique document identifier
        name: Document name/filename
        status: Processing status (processing, indexed, error)
        message: Human-readable message about the upload result
    """

    id: str = Field(..., description="Unique document identifier")
    name: str = Field(..., description="Document name/filename")
    status: str = Field(..., description="Processing status")
    message: str = Field(..., description="Human-readable message about the upload result")


class DocumentListResponse(BaseModel):
    """
    Response model for document list endpoint.

    Attributes:
        documents: List of document metadata
        total: Total number of documents matching the query
        limit: Maximum number of documents returned
        offset: Number of documents skipped
    """

    documents: List[DocumentMetadata] = Field(default_factory=list, description="List of document metadata")
    total: int = Field(..., ge=0, description="Total number of documents matching the query")
    limit: int = Field(..., ge=1, description="Maximum number of documents returned")
    offset: int = Field(..., ge=0, description="Number of documents skipped")


class DocumentDetailResponse(BaseModel):
    """
    Response model for document detail endpoint.

    Attributes:
        document: Document metadata
    """

    document: DocumentMetadata = Field(..., description="Document metadata")


class ReindexResponse(BaseModel):
    """
    Response model for document reindex endpoint.

    Attributes:
        id: Document identifier
        status: New processing status
        message: Human-readable message about the reindex result
    """

    id: str = Field(..., description="Document identifier")
    status: str = Field(..., description="New processing status")
    message: str = Field(..., description="Human-readable message about the reindex result")


class DeleteDocumentResponse(BaseModel):
    """
    Response model for document delete endpoint.

    Attributes:
        id: Document identifier that was deleted
        deleted: Whether the deletion was successful
        message: Human-readable message about the deletion
    """

    id: str = Field(..., description="Document identifier that was deleted")
    deleted: bool = Field(..., description="Whether the deletion was successful")
    message: str = Field(..., description="Human-readable message about the deletion")
