"""
User model for authentication and role management.
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from enum import Enum

from sqlalchemy import String, DateTime, Boolean, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user_session import UserSession
    from .two_factor_auth import TwoFactorAuth


class UserRole(str, Enum):
    """User role enumeration - matches plan specification."""
    SUPER_ADMIN = "super_admin"
    OWNER = "owner"
    ADMIN = "admin"
    AGENT = "agent"


class User(Base):
    """
    User model for authentication and role management.
    tenant_id is NULL only for super admins.
    """
    
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), nullable=False, default=UserRole.AGENT)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    verification_token: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    verification_token_expires: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    reset_token: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    reset_token_expires: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    tenant: Mapped[Optional["Tenant"]] = relationship("Tenant", back_populates="users")
    two_factor_auth: Mapped[Optional["TwoFactorAuth"]] = relationship(
        "TwoFactorAuth", back_populates="user", uselist=False
    )
    sessions: Mapped[List["UserSession"]] = relationship("UserSession", back_populates="user")
    
    @property
    def is_2fa_enabled(self) -> bool:
        two_fa = getattr(self, 'two_factor_auth', None)
        return bool(two_fa and two_fa.is_enabled)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role.value if self.role else None,
            "avatar_url": self.avatar_url,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "is_2fa_enabled": self.is_2fa_enabled,
            "last_login_at": self.last_login_at.isoformat() + "Z" if self.last_login_at else None,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }
