"""
Booking model for appointment scheduling.
"""

from datetime import datetime, date, time
from typing import Optional
from enum import Enum

from sqlalchemy import String, DateTime, Enum as SQLEnum, Text, ForeignKey, Numeric, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class BookingStatus(str, Enum):
    """Booking status enumeration."""
    REQUESTED = "requested"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class Booking(Base):
    """Booking model - for appointment scheduling."""
    
    __tablename__ = "bookings"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    contact_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("contacts.id"), nullable=True, index=True)
    conversation_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("conversations.id"), nullable=True, index=True)

    service_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("services.id"), nullable=True, index=True)
    service: Mapped[str] = mapped_column(String(200), nullable=False)
    service_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    special_requests: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    booking_date: Mapped[Optional[date]] = mapped_column(DateTime, nullable=True)
    booking_time: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # e.g. "14:00"
    duration_minutes: Mapped[Optional[int]] = mapped_column(nullable=True)

    status: Mapped[BookingStatus] = mapped_column(
        SQLEnum(BookingStatus),
        nullable=False,
        default=BookingStatus.REQUESTED
    )

    booking_value: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    actual_value: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="KES")

    assigned_to: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)

    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    no_show_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    reminder_24h_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    reminder_2h_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    reminder_manual_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_channel: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "contact_id": self.contact_id,
            "conversation_id": self.conversation_id,
            "service_id": self.service_id,
            "service": self.service,
            "service_details": self.service_details,
            "location": self.location,
            "booking_date": self.booking_date.isoformat() if self.booking_date else None,
            "booking_time": self.booking_time,
            "booking_datetime": ("%sT%s" % (self.booking_date.isoformat(), self.booking_time)) if self.booking_date and self.booking_time else None,
            "duration_minutes": self.duration_minutes,
            "status": self.status.value if self.status else None,
            "booking_value": float(self.booking_value) if self.booking_value is not None else None,
            "actual_value": float(self.actual_value) if self.actual_value is not None else None,
            "currency": self.currency,
            "assigned_to": self.assigned_to,
            "confirmed_at": self.confirmed_at.isoformat() + "Z" if self.confirmed_at else None,
            "completed_at": self.completed_at.isoformat() + "Z" if self.completed_at else None,
            "cancelled_at": self.cancelled_at.isoformat() + "Z" if self.cancelled_at else None,
            "cancellation_reason": self.cancellation_reason,
            "no_show_at": self.no_show_at.isoformat() + "Z" if self.no_show_at else None,
            "reminder_24h_sent_at": self.reminder_24h_sent_at.isoformat() + "Z" if self.reminder_24h_sent_at else None,
            "reminder_2h_sent_at": self.reminder_2h_sent_at.isoformat() + "Z" if self.reminder_2h_sent_at else None,
            "reminder_manual_sent_at": self.reminder_manual_sent_at.isoformat() + "Z" if self.reminder_manual_sent_at else None,
            "notes": self.notes,
            "source_channel": self.source_channel,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
