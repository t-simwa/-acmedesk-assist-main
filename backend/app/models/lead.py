"""
Lead model for capturing leads from conversations.
"""

from datetime import datetime
from typing import Optional
from enum import Enum

from sqlalchemy import String, DateTime, Enum as SQLEnum, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class LeadStatus(str, Enum):
    """Lead capture status enumeration."""
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    CONVERTED = "converted"
    LOST = "lost"


class Lead(Base):
    """
    Lead model - captures lead information from conversations.
    """
    
    __tablename__ = "leads"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    contact_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("contacts.id"), nullable=True, index=True)
    conversation_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("conversations.id"), nullable=True, index=True)
    source_channel: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    source_page_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    first_message_preview: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lead_capture_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # jsonb: name/email/phone/company/custom
    status: Mapped[LeadStatus] = mapped_column(
        SQLEnum(LeadStatus),
        nullable=False,
        default=LeadStatus.NEW
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "contact_id": self.contact_id,
            "conversation_id": self.conversation_id,
            "source_channel": self.source_channel,
            "source_page_url": self.source_page_url,
            "first_message_preview": self.first_message_preview,
            "lead_capture_data": self.lead_capture_data,
            "status": self.status.value if self.status else None,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
