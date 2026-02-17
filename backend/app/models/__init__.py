"""
Database models for AcmeDesk Assist.

This module defines SQLAlchemy models for:
- documents: Document metadata
- conversations: Conversation sessions
- messages: Individual messages in conversations
- settings: RAG configuration settings
- user_preferences: User profile and preferences
"""

from .base import Base
from .conversation import Conversation
from .document import Document
from .message import Message
from .setting import Setting
from .user_preferences import UserPreferences

__all__ = ["Base", "Document", "Conversation", "Message", "Setting", "UserPreferences"]
