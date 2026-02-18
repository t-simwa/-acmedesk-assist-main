"""
User model for authentication and role management.
"""

from datetime import datetime
from typing import Optional
from enum import Enum

from sqlalchemy import String, DateTime, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class UserRole(str, Enum):
    """User role enumeration."""
    ADMIN = "admin"
    ANALYST = "analyst"
    VIEWER = "viewer"


class User(Base):
    """User model for authentication and role management."""
    
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    email: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # For future auth
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), nullable=False, default=UserRole.VIEWER)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role.value,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
