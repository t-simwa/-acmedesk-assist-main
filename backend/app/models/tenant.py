"""
Tenant model for multi-tenancy support.
Every client/business is a tenant in the system.
"""

from datetime import datetime
from typing import Optional, List
from enum import Enum
import json

from sqlalchemy import String, DateTime, Integer, Enum as SQLEnum, Text, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class SubscriptionStatus(str, Enum):
    """Subscription status enumeration."""
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    TRIALING = "trialing"
    SUSPENDED = "suspended"


class PlanTier(str, Enum):
    """Plan tier enumeration for demo mode."""
    STARTER = "starter"
    GROWTH = "growth"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class Tenant(Base):
    """
    Tenant model - core multi-tenancy table.
    Every client/business is a tenant.
    """
    
    __tablename__ = "tenants"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    business_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    website_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="UTC")
    plan_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)  # FK to plans
    plan_tier: Mapped[Optional[PlanTier]] = mapped_column(SQLEnum(PlanTier), nullable=True)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    subscription_status: Mapped[SubscriptionStatus] = mapped_column(
        SQLEnum(SubscriptionStatus),
        nullable=False,
        default=SubscriptionStatus.TRIALING
    )
    conversation_count_this_month: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    onboarding_step: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    skipped_steps: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    users = relationship("User", back_populates="tenant")
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "business_name": self.business_name,
            "business_description": self.business_description,
            "industry": self.industry,
            "website_url": self.website_url,
            "logo_url": self.logo_url,
            "timezone": self.timezone,
            "plan_id": self.plan_id,
            "plan_tier": self.plan_tier.value if self.plan_tier else None,
            "subscription_status": self.subscription_status.value if self.subscription_status else None,
            "conversation_count_this_month": self.conversation_count_this_month,
            "onboarding_step": self.onboarding_step,
            "onboarding_completed": self.onboarding_completed,
            "skipped_steps": self.skipped_steps or [],
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
