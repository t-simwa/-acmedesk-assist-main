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

    # Denormalized contact info (for historical integrity)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    instagram_handle: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    facebook_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Lead scoring
    score: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    score_factors: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    score_manual_override: Mapped[bool] = mapped_column(nullable=False, default=False)
    score_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Financials
    est_value: Mapped[Optional[float]] = mapped_column(nullable=True)
    actual_value: Mapped[Optional[float]] = mapped_column(nullable=True)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="KES")

    # Tags + assignment
    tags: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    assigned_to: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)

    # Tracking
    viewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    converted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    lost_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

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
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "instagram_handle": self.instagram_handle,
            "facebook_id": self.facebook_id,
            "score": self.score,
            "score_factors": self.score_factors,
            "score_manual_override": self.score_manual_override,
            "score_updated_at": self.score_updated_at.isoformat() + "Z" if self.score_updated_at else None,
            "est_value": self.est_value,
            "actual_value": self.actual_value,
            "currency": self.currency,
            "tags": self.tags,
            "assigned_to": self.assigned_to,
            "viewed_at": self.viewed_at.isoformat() + "Z" if self.viewed_at else None,
            "converted_at": self.converted_at.isoformat() + "Z" if self.converted_at else None,
            "lost_at": self.lost_at.isoformat() + "Z" if self.lost_at else None,
            "status": self.status.value if self.status else None,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
