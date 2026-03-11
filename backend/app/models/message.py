"""
Message model for storing individual messages in conversations.
"""

from datetime import datetime
from typing import Optional
from enum import Enum

from sqlalchemy import String, Text, DateTime, Integer, Float, Enum as SQLEnum, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class MessageRole(str, Enum):
    """Message role enumeration."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Message(Base):
    """
    Message model - stores individual messages in conversations.
    """
    
    __tablename__ = "messages"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("conversations.id"), nullable=False, index=True)
    role: Mapped[MessageRole] = mapped_column(SQLEnum(MessageRole), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)  # jsonb - sources used for answer
    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # AI confidence 0-1
    token_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Number of tokens in message
    message_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "role": self.role.value if self.role else None,
            "content": self.content,
            "citations": self.citations,
            "metadata": self.message_metadata,
            "confidence_score": self.confidence_score,
            "token_count": self.token_count,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }
