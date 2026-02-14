"""
Conversation model for storing conversation sessions.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Conversation(Base):
    """Conversation session model."""
    
    __tablename__ = "conversations"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    session_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "session_id": self.session_id,
            "started_at": self.started_at.isoformat() + "Z" if self.started_at else None,
            "last_activity_at": self.last_activity_at.isoformat() + "Z" if self.last_activity_at else None,
        }
