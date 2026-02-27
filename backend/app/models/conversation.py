"""
Conversation model for storing conversation sessions.
"""

from datetime import datetime
from typing import Optional
from enum import Enum

from sqlalchemy import String, DateTime, Integer, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Channel(str, Enum):
    """Channel enumeration."""
    WEB = "web"
    WHATSAPP = "whatsapp"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    EMAIL = "email"
    SMS = "sms"


class ConversationStatus(str, Enum):
    """Conversation status enumeration."""
    ACTIVE = "active"
    RESOLVED = "resolved"
    ESCALATED = "escalated"
    ABANDONED = "abandoned"


class ConversationOutcome(str, Enum):
    """Conversation outcome enumeration."""
    RESOLVED = "resolved"
    ESCALATED = "escalated"
    ABANDONED = "abandoned"


class Rating(str, Enum):
    """Conversation rating enumeration."""
    POSITIVE = "positive"
    NEGATIVE = "negative"


class Conversation(Base):
    """
    Conversation session model - tracks conversations across channels.
    """
    
    __tablename__ = "conversations"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    chatbot_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("chatbot_instances.id"), nullable=True, index=True)
    contact_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("contacts.id"), nullable=True, index=True)
    channel: Mapped[Channel] = mapped_column(SQLEnum(Channel), nullable=False, default=Channel.WEB)
    channel_conversation_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # External ID from channel
    session_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)  # Session identifier
    status: Mapped[ConversationStatus] = mapped_column(
        SQLEnum(ConversationStatus),
        nullable=False,
        default=ConversationStatus.ACTIVE
    )
    outcome: Mapped[Optional[ConversationOutcome]] = mapped_column(SQLEnum(ConversationOutcome), nullable=True)
    message_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_activity_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    page_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    rating: Mapped[Optional[Rating]] = mapped_column(SQLEnum(Rating), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "chatbot_id": self.chatbot_id,
            "contact_id": self.contact_id,
            "channel": self.channel.value if self.channel else None,
            "channel_conversation_id": self.channel_conversation_id,
            "session_id": self.session_id,
            "status": self.status.value if self.status else None,
            "outcome": self.outcome.value if self.outcome else None,
            "message_count": self.message_count,
            "started_at": self.started_at.isoformat() + "Z" if self.started_at else None,
            "resolved_at": self.resolved_at.isoformat() + "Z" if self.resolved_at else None,
            "last_activity_at": self.last_activity_at.isoformat() + "Z" if self.last_activity_at else None,
            "page_url": self.page_url,
            "rating": self.rating.value if self.rating else None,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
