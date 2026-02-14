"""
Document model for storing document metadata.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Document(Base):
    """Document metadata model."""
    
    __tablename__ = "documents"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # markdown, html, text, unknown
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="processing")  # processing, indexed, error
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_indexed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "status": self.status,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "chunk_count": self.chunk_count,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
            "last_indexed_at": self.last_indexed_at.isoformat() + "Z" if self.last_indexed_at else None,
            "error_message": self.error_message,
        }
