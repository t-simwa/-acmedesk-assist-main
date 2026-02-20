"""
Database models for AcmeDesk Assist.

This module defines SQLAlchemy models for:
- documents: Document metadata
- conversations: Conversation sessions
- messages: Individual messages in conversations
- settings: RAG configuration settings
- user_preferences: User profile and preferences
- users: User authentication and roles
- audit_logs: Audit trail for system changes
- api_keys: API access tokens
- team_members: Team invitations and memberships
"""

from .base import Base
from .conversation import Conversation
from .document import Document
from .message import Message
from .setting import Setting
from .user_preferences import UserPreferences
from .user import User, UserRole
from .audit_log import AuditLog, AuditAction, AuditResourceType
from .api_key import APIKey
from .team_member import TeamMember, TeamMemberRole, InvitationStatus
from .knowledge_base import KnowledgeBase, UserKnowledgeBasePreference

__all__ = [
    "Base",
    "Document",
    "Conversation",
    "Message",
    "Setting",
    "UserPreferences",
    "User",
    "UserRole",
    "AuditLog",
    "AuditAction",
    "AuditResourceType",
    "APIKey",
    "TeamMember",
    "TeamMemberRole",
    "InvitationStatus",
    "KnowledgeBase",
    "UserKnowledgeBasePreference",
]
