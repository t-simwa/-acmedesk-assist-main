"""
Plan model for subscription plans.
"""

from datetime import datetime
from typing import Optional
from decimal import Decimal

from sqlalchemy import String, Integer, Numeric, JSON
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Plan(Base):
    """
    Plan model - subscription plans with limits and features.
    """
    
    __tablename__ = "plans"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    setup_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    monthly_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    conversation_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # 0 = unlimited
    document_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # 0 = unlimited
    storage_limit_mb: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # 0 = unlimited
    channel_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # 0 = unlimited
    features: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # jsonb for feature flags
    stripe_price_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, unique=True)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "setup_fee": float(self.setup_fee) if self.setup_fee else 0,
            "monthly_price": float(self.monthly_price) if self.monthly_price else 0,
            "conversation_limit": self.conversation_limit,
            "document_limit": self.document_limit,
            "storage_limit_mb": self.storage_limit_mb,
            "channel_limit": self.channel_limit,
            "features": self.features,
            "stripe_price_id": self.stripe_price_id,
        }
