"""
Audit log model for tracking system changes and user actions.
"""

from datetime import datetime
from typing import Optional
from enum import Enum

from sqlalchemy import String, Text, DateTime, Enum as SQLEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class AuditAction(str, Enum):
    """Audit action types."""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    VIEW = "view"
    LOGIN = "login"
    LOGOUT = "logout"
    UPLOAD = "upload"
    DOWNLOAD = "download"
    EXPORT = "export"
    IMPORT = "import"
    INVITE = "invite"
    REMOVE = "remove"
    ROLE_CHANGE = "role_change"
    SETTINGS_CHANGE = "settings_change"
    API_KEY_CREATE = "api_key_create"
    API_KEY_REVOKE = "api_key_revoke"


class AuditResourceType(str, Enum):
    """Resource types for audit logs."""
    USER = "user"
    DOCUMENT = "document"
    CONVERSATION = "conversation"
    SETTING = "setting"
    API_KEY = "api_key"
    TEAM_MEMBER = "team_member"
    SYSTEM = "system"


class AuditLog(Base):
    """Audit log model for tracking system changes."""
    
    __tablename__ = "audit_logs"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)  # User who performed the action
    user_email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # User email for quick reference
    action: Mapped[AuditAction] = mapped_column(SQLEnum(AuditAction), nullable=False, index=True)
    resource_type: Mapped[AuditResourceType] = mapped_column(SQLEnum(AuditResourceType), nullable=False, index=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)  # ID of the affected resource
    resource_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # Name/title of the resource
    description: Mapped[str] = mapped_column(Text, nullable=False)  # Human-readable description
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)  # Additional context data (stored as 'metadata' in DB)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Browser/client user agent
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="success")  # success, error, warning
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_email": self.user_email,
            "action": self.action.value,
            "resource_type": self.resource_type.value,
            "resource_id": self.resource_id,
            "resource_name": self.resource_name,
            "description": self.description,
            "metadata": self.metadata_json,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "status": self.status,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }
