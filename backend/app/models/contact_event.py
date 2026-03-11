"""
ContactEvent model for logging unification, greeting, and opt‑out events.
"""

from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class ContactEvent(Base):
    __tablename__ = "contact_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    contact_id: Mapped[str] = mapped_column(String(36), ForeignKey("contacts.id"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
