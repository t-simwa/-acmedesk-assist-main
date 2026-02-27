"""
Campaign model for broadcast messaging.
"""

from datetime import datetime
from typing import Optional
from enum import Enum

from sqlalchemy import String, DateTime, Integer, Enum as SQLEnum, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class CampaignStatus(str, Enum):
    """Campaign status enumeration."""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    SENT = "sent"
    CANCELLED = "cancelled"


class Channel(str, Enum):
    """Channel enumeration."""
    WHATSAPP = "whatsapp"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    EMAIL = "email"
    SMS = "sms"


class Campaign(Base):
    """
    Campaign model - for broadcast messaging to customers.
    """
    
    __tablename__ = "campaigns"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    channel: Mapped[Channel] = mapped_column(SQLEnum(Channel), nullable=False)
    status: Mapped[CampaignStatus] = mapped_column(
        SQLEnum(CampaignStatus),
        nullable=False,
        default=CampaignStatus.DRAFT
    )
    audience_filter: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # jsonb for filtering
    message_template: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sent_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    delivered_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    read_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reply_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "name": self.name,
            "channel": self.channel.value if self.channel else None,
            "status": self.status.value if self.status else None,
            "audience_filter": self.audience_filter,
            "message_template": self.message_template,
            "scheduled_at": self.scheduled_at.isoformat() + "Z" if self.scheduled_at else None,
            "sent_at": self.sent_at.isoformat() + "Z" if self.sent_at else None,
            "sent_count": self.sent_count,
            "delivered_count": self.delivered_count,
            "read_count": self.read_count,
            "reply_count": self.reply_count,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
