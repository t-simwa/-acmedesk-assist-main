"""
User Preferences model for storing user profile and preferences.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, DateTime, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class UserPreferences(Base):
    """User preferences model for storing user profile and settings."""
    
    __tablename__ = "user_preferences"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True, index=True)  # For future multi-user support, default to "default"
    
    # Profile information
    name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # URL or base64 data URL
    
    # Notification preferences
    notifications_email: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notifications_in_app: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notifications_push: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    
    # Language and localization
    language: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, default="en")  # ISO 639-1 code (e.g., "en", "es", "fr")
    timezone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="UTC")  # IANA timezone (e.g., "America/New_York", "Europe/London")
    
    # Additional preferences stored as JSON
    additional_preferences: Mapped[Optional[dict]] = mapped_column("preferences", JSON, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "email": self.email,
            "avatar_url": self.avatar_url,
            "notifications": {
                "email": self.notifications_email,
                "in_app": self.notifications_in_app,
                "push": self.notifications_push,
            },
            "language": self.language,
            "timezone": self.timezone,
            "additional_preferences": self.additional_preferences,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
