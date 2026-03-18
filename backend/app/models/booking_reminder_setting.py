"""Reminder settings for bookings."""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class BookingReminderSetting(Base):
    __tablename__ = "booking_reminder_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    enabled_24h: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    enabled_2h: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    enabled_manual: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
