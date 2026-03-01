"""
Database models for AcmeDesk Assist.

This module defines SQLAlchemy models for:
- tenants: Multi-tenancy (clients/businesses)
- users: User authentication and roles
- chatbot_instances: Chatbot configurations
- documents: Document metadata
- conversations: Conversation sessions
- messages: Individual messages in conversations
- contacts: Customer/visitor information
- leads: Lead capture
- campaigns: Broadcast messaging
- bookings: Appointment scheduling
- plans: Subscription plans
- settings: RAG configuration settings
- user_preferences: User profile and preferences
- audit_logs: Audit trail for system changes
- api_keys: API access tokens
- team_members: Team invitations and memberships
- knowledge_base: Knowledge bases for RAG
"""

from .base import Base
from .tenant import Tenant, SubscriptionStatus, PlanTier
from .user import User, UserRole
from .chatbot_instance import ChatbotInstance, ChatbotStatus, WidgetPosition, ResponseTone, ResponseLength
from .conversation import Conversation, Channel, ConversationStatus, ConversationOutcome, Rating
from .document import Document, DocumentStatus
from .message import Message, MessageRole
from .contact import Contact, LeadStatus, LeadScore
from .lead import Lead
from .campaign import Campaign, CampaignStatus, Channel as CampaignChannel
from .booking import Booking, BookingStatus
from .plan import Plan
from .setting import Setting
from .user_preferences import UserPreferences
from .audit_log import AuditLog, AuditAction, AuditResourceType
from .api_key import APIKey
from .team_member import TeamMember, TeamMemberRole, InvitationStatus
from .knowledge_base import KnowledgeBase, UserKnowledgeBasePreference

__all__ = [
    # Base
    "Base",
    
    # Tenant & Plans
    "Tenant",
    "SubscriptionStatus",
    "PlanTier",
    "Plan",
    
    # Users
    "User",
    "UserRole",
    
    # Chatbot
    "ChatbotInstance",
    "ChatbotStatus",
    "WidgetPosition",
    "ResponseTone",
    "ResponseLength",
    
    # Conversations
    "Conversation",
    "Channel",
    "ConversationStatus",
    "ConversationOutcome",
    "Rating",
    
    # Documents
    "Document",
    "DocumentStatus",
    
    # Messages
    "Message",
    "MessageRole",
    
    # Contacts & Leads
    "Contact",
    "LeadStatus",
    "LeadScore",
    "Lead",
    
    # Campaigns
    "Campaign",
    "CampaignStatus",
    "CampaignChannel",
    
    # Bookings
    "Booking",
    "BookingStatus",
    
    # Settings & Preferences
    "Setting",
    "UserPreferences",
    
    # Audit & API
    "AuditLog",
    "AuditAction",
    "AuditResourceType",
    "APIKey",
    
    # Team
    "TeamMember",
    "TeamMemberRole",
    "InvitationStatus",
    
    # Knowledge Base
    "KnowledgeBase",
    "UserKnowledgeBasePreference",
]
