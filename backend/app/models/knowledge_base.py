"""
Knowledge Base model for organizing documents into knowledge bases.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class KnowledgeBase(Base):
    """Knowledge Base model for grouping documents."""
    
    __tablename__ = "knowledge_bases"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)  # None for default/system KB
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)  # True for system default KB
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)  # Whether KB is active
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "is_default": self.is_default,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }


class UserKnowledgeBasePreference(Base):
    """User preferences for which knowledge bases are active for RAG search."""
    
    __tablename__ = "user_knowledge_base_preferences"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True, unique=True)
    use_default_kb: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)  # Whether to use default KB
    active_kb_ids: Mapped[str] = mapped_column(String(1000), nullable=False, default="[]")  # JSON array of active KB IDs
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        import json
        try:
            active_ids = json.loads(self.active_kb_ids) if self.active_kb_ids else []
        except (TypeError, ValueError):
            active_ids = []
        if not isinstance(active_ids, list):
            active_ids = []
        return {
            "id": self.id,
            "user_id": self.user_id,
            "use_default_kb": self.use_default_kb,
            "active_kb_ids": active_ids,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
