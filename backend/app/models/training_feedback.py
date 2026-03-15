"""Model for storing training feedback flags."""

from datetime import datetime
from enum import Enum

from sqlalchemy import String, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class FeedbackPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TrainingFeedback(Base):
    __tablename__ = "training_feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("conversations.id"), nullable=False, index=True)
    message_id: Mapped[str] = mapped_column(String(36), nullable=False)
    priority: Mapped[FeedbackPriority] = mapped_column(SQLEnum(FeedbackPriority), nullable=False, default=FeedbackPriority.MEDIUM)
    comment: Mapped[str] = mapped_column(String(1000), nullable=True)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
