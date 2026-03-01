"""
Pydantic schemas for document API requests and responses.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class DocumentStatus(str):
    """Document processing status enum."""

    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"
    ARCHIVED = "archived"


class DocumentType(str):
    """Document type enum."""

    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    CSV = "csv"
    MARKDOWN = "markdown"
    HTML = "html"
    UNKNOWN = "unknown"


class DocumentMetadata(BaseModel):
    """
    Document metadata model.

    Attributes:
        id: Unique document identifier
        tenant_id: Tenant ID
        chatbot_id: Chatbot ID
        filename: Stored filename
        original_filename: Original filename for display
        file_type: Document type (pdf, docx, txt, csv, etc.)
        file_size: File size in bytes
        storage_url: URL where file is stored
        content_hash: MD5 hash for duplicate detection
        status: Processing status (processing, ready, failed, archived)
        chunk_count: Number of chunks created from this document
        page_count: Number of pages (for PDFs)
        source_url: Source URL for URL ingestion
        upload_date: ISO 8601 timestamp when document was uploaded
        last_retrieved_at: ISO 8601 timestamp when document was last used
        error_message: Error message if status is 'failed'
        is_archived: Whether document is archived
        created_at: ISO 8601 timestamp when document was created
        updated_at: ISO 8601 timestamp when document was last updated
    """

    id: str = Field(..., description="Unique document identifier")
    tenant_id: str = Field(..., description="Tenant ID")
    chatbot_id: Optional[str] = Field(None, description="Chatbot ID this document belongs to")
    filename: str = Field(..., description="Stored filename")
    original_filename: str = Field(..., description="Original filename for display")
    file_type: str = Field(..., description="Document type (pdf, docx, txt, csv, etc.)")
    file_size: int = Field(..., ge=0, description="File size in bytes")
    storage_url: str = Field(..., description="URL where file is stored")
    content_hash: Optional[str] = Field(None, description="MD5 hash for duplicate detection")
    status: str = Field(..., description="Processing status (processing, ready, failed, archived)")
    chunk_count: int = Field(default=0, ge=0, description="Number of chunks created from this document")
    page_count: Optional[int] = Field(None, description="Number of pages (for PDFs)")
    source_url: Optional[str] = Field(None, description="Source URL for URL ingestion")
    upload_date: str = Field(..., description="ISO 8601 timestamp when document was uploaded")
    last_retrieved_at: Optional[str] = Field(None, description="ISO 8601 timestamp when document was last used")
    error_message: Optional[str] = Field(None, description="Error message if status is 'failed'")
    is_archived: bool = Field(default=False, description="Whether document is archived")
    created_at: str = Field(..., description="ISO 8601 timestamp when document was created")
    updated_at: str = Field(..., description="ISO 8601 timestamp when document was last updated")


class DocumentUploadResponse(BaseModel):
    """
    Response model for document upload endpoint.

    Attributes:
        id: Unique document identifier
        name: Document original filename
        status: Processing status (processing, ready, failed)
        message: Human-readable message about the upload result
    """

    id: str = Field(..., description="Unique document identifier")
    name: str = Field(..., description="Document original filename")
    status: str = Field(..., description="Processing status")
    message: str = Field(..., description="Human-readable message about the upload result")
    is_duplicate: bool = Field(default=False, description="Whether this is a duplicate file")
    duplicate_of: Optional[str] = Field(None, description="ID of duplicate document if applicable")


class URLIngestionRequest(BaseModel):
    """Request model for URL ingestion endpoint."""
    
    url: str = Field(..., description="URL to ingest content from")
    chatbot_id: Optional[str] = Field(None, description="Chatbot ID to associate with")


class URLIngestionResponse(BaseModel):
    """
    Response model for URL ingestion endpoint.
    
    Attributes:
        id: Unique document identifier
        name: Extracted title or URL
        status: Processing status
        message: Human-readable message
    """
    
    id: str = Field(..., description="Unique document identifier")
    name: str = Field(..., description="Extracted title or URL")
    status: str = Field(..., description="Processing status")
    message: str = Field(..., description="Human-readable message")


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


class DocumentStatusResponse(BaseModel):
    """
    Response model for document status check endpoint.
    
    Attributes:
        id: Document identifier
        status: Current processing status
        chunk_count: Number of chunks (if ready)
        page_count: Number of pages (if PDF)
        error_message: Error message if failed
        progress: Processing progress percentage
    """
    
    id: str = Field(..., description="Document identifier")
    status: str = Field(..., description="Current processing status")
    chunk_count: Optional[int] = Field(None, description="Number of chunks")
    page_count: Optional[int] = Field(None, description="Number of pages")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    progress: int = Field(default=0, description="Processing progress percentage")


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


class ArchiveDocumentResponse(BaseModel):
    """
    Response model for document archive endpoint.
    
    Attributes:
        id: Document identifier
        archived: Whether the document was archived
        message: Human-readable message
    """
    
    id: str = Field(..., description="Document identifier")
    archived: bool = Field(..., description="Whether the document was archived")
    message: str = Field(..., description="Human-readable message")


class ReplaceDocumentResponse(BaseModel):
    """
    Response model for document replace endpoint.
    
    Attributes:
        id: Document identifier
        status: New processing status
        message: Human-readable message
    """
    
    id: str = Field(..., description="Document identifier")
    status: str = Field(..., description="New processing status")
    message: str = Field(..., description="Human-readable message")


class DuplicateCheckResponse(BaseModel):
    """
    Response model for duplicate check.
    
    Attributes:
        is_duplicate: Whether the file is a duplicate
        duplicate_of: ID of existing document if duplicate
        duplicate_filename: Filename of existing document
        can_proceed: Whether upload can proceed
    """
    
    is_duplicate: bool = Field(..., description="Whether the file is a duplicate")
    duplicate_of: Optional[str] = Field(None, description="ID of existing document if duplicate")
    duplicate_filename: Optional[str] = Field(None, description="Filename of existing document")
    can_proceed: bool = Field(..., description="Whether upload can proceed")


class StorageUsageResponse(BaseModel):
    """
    Response model for storage usage endpoint.
    
    Attributes:
        used_bytes: Storage used in bytes
        limit_bytes: Storage limit in bytes
        used_percent: Usage percentage
        document_count: Number of documents
    """
    
    used_bytes: int = Field(..., description="Storage used in bytes")
    limit_bytes: int = Field(..., description="Storage limit in bytes")
    used_percent: float = Field(..., description="Usage percentage")
    document_count: int = Field(..., description="Number of documents")
