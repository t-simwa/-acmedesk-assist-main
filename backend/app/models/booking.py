"""
Booking model for appointment scheduling.
"""

from datetime import datetime, date
from typing import Optional
from enum import Enum

from sqlalchemy import String, DateTime, Enum as SQLEnum, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class BookingStatus(str, Enum):
    """Booking status enumeration."""
    REQUESTED = "requested"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Booking(Base):
    """
    Booking model - for appointment scheduling.
    """
    
    __tablename__ = "bookings"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    contact_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("contacts.id"), nullable=True, index=True)
    conversation_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("conversations.id"), nullable=True, index=True)
    service: Mapped[str] = mapped_column(String(200), nullable=False)
    preferred_date: Mapped[Optional[date]] = mapped_column(DateTime, nullable=True)
    preferred_time: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # e.g., "14:00"
    status: Mapped[BookingStatus] = mapped_column(
        SQLEnum(BookingStatus),
        nullable=False,
        default=BookingStatus.REQUESTED
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_channel: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "contact_id": self.contact_id,
            "conversation_id": self.conversation_id,
            "service": self.service,
            "preferred_date": self.preferred_date.isoformat() if self.preferred_date else None,
            "preferred_time": self.preferred_time,
            "status": self.status.value if self.status else None,
            "notes": self.notes,
            "source_channel": self.source_channel,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
