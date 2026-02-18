"""
API key model for managing API access tokens.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class APIKey(Base):
    """API key model for managing API access tokens."""
    
    __tablename__ = "api_keys"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)  # Owner of the API key
    name: Mapped[str] = mapped_column(String(200), nullable=False)  # User-friendly name for the key
    key_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)  # Hashed API key
    key_prefix: Mapped[str] = mapped_column(String(16), nullable=False)  # First 8 chars for display
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)  # Last time the key was used
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)  # Optional expiration
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self, include_hash: bool = False) -> dict:
        """Convert model to dictionary."""
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "key_prefix": self.key_prefix,
            "last_used_at": self.last_used_at.isoformat() + "Z" if self.last_used_at else None,
            "expires_at": self.expires_at.isoformat() + "Z" if self.expires_at else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
        if include_hash:
            data["key_hash"] = self.key_hash
        return data
