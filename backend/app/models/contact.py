"""
Contact model for storing customer/visitor information.
"""

from datetime import datetime
from typing import Optional, List
from enum import Enum
import json

from sqlalchemy import String, DateTime, Enum as SQLEnum, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class LeadStatus(str, Enum):
    """Lead status enumeration."""
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    CONVERTED = "converted"
    LOST = "lost"


class LeadScore(str, Enum):
    """Lead score enumeration."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Contact(Base):
    """
    Contact model - stores customer/visitor information across channels.
    """
    
    __tablename__ = "contacts"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    instagram_handle: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    company: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    channels_used: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)  # Array of channel names
    first_seen_channel: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    first_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_active_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    lead_status: Mapped[LeadStatus] = mapped_column(
        SQLEnum(LeadStatus),
        nullable=False,
        default=LeadStatus.NEW
    )
    lead_score: Mapped[Optional[LeadScore]] = mapped_column(SQLEnum(LeadScore), nullable=True)
    tags: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)  # Array of tag strings
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "full_name": self.full_name,
            "email": self.email,
            "phone": self.phone,
            "instagram_handle": self.instagram_handle,
            "company": self.company,
            "channels_used": self.channels_used,
            "first_seen_channel": self.first_seen_channel,
            "first_seen_at": self.first_seen_at.isoformat() + "Z" if self.first_seen_at else None,
            "last_active_at": self.last_active_at.isoformat() + "Z" if self.last_active_at else None,
            "lead_status": self.lead_status.value if self.lead_status else None,
            "lead_score": self.lead_score.value if self.lead_score else None,
            "tags": self.tags,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
