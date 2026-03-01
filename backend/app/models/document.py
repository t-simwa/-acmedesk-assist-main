"""
Document model for storing document metadata.
"""

from datetime import datetime
from typing import Optional
from enum import Enum

from sqlalchemy import String, Integer, DateTime, Text, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class DocumentStatus(str, Enum):
    """Document processing status enumeration."""
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"
    ARCHIVED = "archived"


class Document(Base):
    """
    Document metadata model - stores uploaded documents for RAG processing.
    """
    
    __tablename__ = "documents"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    chatbot_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("chatbot_instances.id"), nullable=True, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)  # Original filename for display
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)  # pdf, docx, txt, csv, md, html
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    storage_url: Mapped[str] = mapped_column(String(500), nullable=False)
    content_hash: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)  # MD5 hash for duplicate detection
    status: Mapped[DocumentStatus] = mapped_column(
        SQLEnum(DocumentStatus),
        nullable=False,
        default=DocumentStatus.PROCESSING
    )
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # For URL ingestion
    upload_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    last_retrieved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_archived: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "chatbot_id": self.chatbot_id,
            "filename": self.filename,
            "original_filename": self.original_filename,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "storage_url": self.storage_url,
            "content_hash": self.content_hash,
            "status": self.status.value if self.status else None,
            "chunk_count": self.chunk_count,
            "page_count": self.page_count,
            "source_url": self.source_url,
            "upload_date": self.upload_date.isoformat() + "Z" if self.upload_date else None,
            "last_retrieved_at": self.last_retrieved_at.isoformat() + "Z" if self.last_retrieved_at else None,
            "error_message": self.error_message,
            "is_archived": self.is_archived,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
