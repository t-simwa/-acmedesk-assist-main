"""Internal notes attached to conversation sessions.

These notes are visible only to agents/admins and are stored persistently.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class ConversationInternalNote(Base):
    """Agent/internal note associated with a conversation."""

    __tablename__ = "conversation_internal_notes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    note: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    created_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
