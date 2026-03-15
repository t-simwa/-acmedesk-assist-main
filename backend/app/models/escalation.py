"""Model for storing conversation escalation / de-escalation history."""

from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import String, DateTime, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class EscalationType(str, Enum):
    ESCALATED = "escalated"
    DEESCALATED = "deescalated"


class ConversationEscalation(Base):
    __tablename__ = "conversation_escalations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("conversations.id"), nullable=False, index=True)
    type: Mapped[EscalationType] = mapped_column(SQLEnum(EscalationType), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
