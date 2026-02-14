"""
Setting model for storing RAG configuration settings.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, DateTime, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Setting(Base):
    """RAG configuration settings model."""
    
    __tablename__ = "settings"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)  # e.g., "rag_config"
    value: Mapped[str] = mapped_column(Text, nullable=False)  # JSON string for complex values
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "key": self.key,
            "value": self.value,
            "description": self.description,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
