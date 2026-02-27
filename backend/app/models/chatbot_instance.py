"""
Chatbot Instance model - one per tenant.
Represents the configuration for a chatbot widget.
"""

from datetime import datetime
from typing import Optional, List
from enum import Enum
import json

from sqlalchemy import String, DateTime, Boolean, Enum as SQLEnum, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class ChatbotStatus(str, Enum):
    """Chatbot status enumeration."""
    LIVE = "live"
    PAUSED = "paused"
    SUSPENDED = "suspended"


class WidgetPosition(str, Enum):
    """Widget position enumeration."""
    BOTTOM_RIGHT = "bottom_right"
    BOTTOM_LEFT = "bottom_left"
    TOP_RIGHT = "top_right"
    TOP_LEFT = "top_left"


class ResponseTone(str, Enum):
    """Response tone enumeration."""
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    CASUAL = "casual"
    FORMAL = "formal"


class ResponseLength(str, Enum):
    """Response length enumeration."""
    SHORT = "short"
    MEDIUM = "medium"
    LONG = "long"


class ChatbotInstance(Base):
    """
    Chatbot Instance model - one per tenant.
    Contains all widget configuration and customization options.
    """
    
    __tablename__ = "chatbot_instances"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    brand_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#4F8EF7")  # Hex color
    secondary_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#7C3AED")  # Hex color
    widget_position: Mapped[WidgetPosition] = mapped_column(
        SQLEnum(WidgetPosition),
        nullable=False,
        default=WidgetPosition.BOTTOM_RIGHT
    )
    greeting_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fallback_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    escalation_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    offline_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    response_tone: Mapped[ResponseTone] = mapped_column(
        SQLEnum(ResponseTone),
        nullable=False,
        default=ResponseTone.PROFESSIONAL
    )
    response_length: Mapped[ResponseLength] = mapped_column(
        SQLEnum(ResponseLength),
        nullable=False,
        default=ResponseLength.MEDIUM
    )
    show_citations: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    show_typing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    show_powered_by: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    status: Mapped[ChatbotStatus] = mapped_column(
        SQLEnum(ChatbotStatus),
        nullable=False,
        default=ChatbotStatus.PAUSED
    )
    allowed_domains: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)  # Array of domain strings
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "name": self.name,
            "avatar_url": self.avatar_url,
            "brand_color": self.brand_color,
            "secondary_color": self.secondary_color,
            "widget_position": self.widget_position.value if self.widget_position else None,
            "greeting_message": self.greeting_message,
            "fallback_message": self.fallback_message,
            "escalation_message": self.escalation_message,
            "offline_message": self.offline_message,
            "response_tone": self.response_tone.value if self.response_tone else None,
            "response_length": self.response_length.value if self.response_length else None,
            "show_citations": self.show_citations,
            "show_typing": self.show_typing,
            "show_powered_by": self.show_powered_by,
            "status": self.status.value if self.status else None,
            "allowed_domains": self.allowed_domains,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
