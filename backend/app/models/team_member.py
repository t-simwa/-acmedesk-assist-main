"""
Team member model for managing team invitations and memberships.
"""

from datetime import datetime
from typing import Optional
from enum import Enum

from sqlalchemy import String, DateTime, Boolean, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class TeamMemberRole(str, Enum):
    """Team member role enumeration - matches plan specification."""
    OWNER = "owner"
    ADMIN = "admin"
    AGENT = "agent"


class InvitationStatus(str, Enum):
    """Invitation status enumeration."""
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"


class TeamMember(Base):
    """Team member model for managing team invitations and memberships."""
    
    __tablename__ = "team_members"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    role: Mapped[TeamMemberRole] = mapped_column(SQLEnum(TeamMemberRole), nullable=False, default=TeamMemberRole.AGENT)
    status: Mapped[InvitationStatus] = mapped_column(SQLEnum(InvitationStatus), nullable=False, default=InvitationStatus.PENDING)
    invited_by: Mapped[str] = mapped_column(String(36), nullable=False)
    invited_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    invite_token: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    invite_token_expires: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "user_id": self.user_id,
            "email": self.email,
            "name": self.name,
            "role": self.role.value,
            "status": self.status.value,
            "invited_by": self.invited_by,
            "invited_at": self.invited_at.isoformat() + "Z" if self.invited_at else None,
            "accepted_at": self.accepted_at.isoformat() + "Z" if self.accepted_at else None,
            "invite_token": self.invite_token,
            "invite_token_expires": self.invite_token_expires.isoformat() + "Z" if self.invite_token_expires else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
