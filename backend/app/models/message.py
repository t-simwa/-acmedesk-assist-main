"""
Message model for storing individual messages in conversations.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Message(Base):
    """Message model for conversation messages."""
    
    __tablename__ = "messages"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("conversations.id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user, assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    message_metadata: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)  # Store additional metadata as JSON (column name is 'metadata' but attribute is 'message_metadata' to avoid SQLAlchemy conflict)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "role": self.role,
            "content": self.content,
            "timestamp": self.created_at.isoformat() + "Z" if self.created_at else None,
            "metadata": self.message_metadata,  # Return as 'metadata' in API response
        }
