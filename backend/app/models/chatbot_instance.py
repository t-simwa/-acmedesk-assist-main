"""
Chatbot Instance model - one per tenant.
Represents the configuration for a chatbot widget.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import json

from sqlalchemy import String, DateTime, Boolean, Enum as SQLEnum, Text, JSON, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class ChatbotStatus(str, Enum):
    """Chatbot status enumeration."""
    LIVE = "live"
    PAUSED = "paused"
    SUSPENDED = "suspended"


class WidgetPosition(str, Enum):
    """Widget position enumeration."""
    BOTTOM_RIGHT = "bottom_right"
    BOTTOM_LEFT = "bottom_left"
    TOP_RIGHT = "top_right"
    TOP_LEFT = "top_left"


class ResponseTone(str, Enum):
    """Response tone enumeration."""
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    CASUAL = "casual"
    FORMAL = "formal"


class ResponseLength(str, Enum):
    """Response length enumeration."""
    SHORT = "short"
    MEDIUM = "medium"
    LONG = "long"


class ConversationStarterDisplay(str, Enum):
    """Conversation starter display mode."""
    FIRST_VISIT_ONLY = "first_visit_only"
    EVERY_SESSION = "every_session"


class OutsideHoursBehavior(str, Enum):
    """Outside business hours behavior."""
    CONTINUE_ANSWERING = "continue_answering"
    AI_OFFLINE_COLLECT_DETAILS = "ai_offline_collect_details"
    SHOW_OFFLINE_MESSAGE = "show_offline_message"


class LeadCaptureTrigger(str, Enum):
    """When to trigger lead capture."""
    AFTER_X_MESSAGES = "after_x_messages"
    ON_ESCALATION = "on_escalation"
    AT_CONVERSATION_START = "at_conversation_start"
    NEVER = "never"


class ChatbotInstance(Base):
    """
    Chatbot Instance model - one per tenant.
    Contains all widget configuration and customization options.
    Milestone 7.6 - 6 tabs: Appearance, Behavior, Business Hours, Escalation, Lead Capture, Notifications
    """
    
    __tablename__ = "chatbot_instances"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    
    # ─── Tab 1: Appearance ──────────────────────────────────────────────────────
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    brand_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#4F8EF7")  # Hex color
    secondary_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#7C3AED")  # Hex color
    user_message_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#4F8EF7")  # User message color
    widget_position: Mapped[WidgetPosition] = mapped_column(
        SQLEnum(WidgetPosition),
        nullable=False,
        default=WidgetPosition.BOTTOM_RIGHT
    )
    show_powered_by: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    font_size: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")  # small | medium | large
    
    # ─── Tab 2: Behavior ───────────────────────────────────────────────────────
    response_language: Mapped[str] = mapped_column(String(5), nullable=False, default="auto")  # auto | language code (en, es, fr, etc.)
    response_tone: Mapped[ResponseTone] = mapped_column(
        SQLEnum(ResponseTone),
        nullable=False,
        default=ResponseTone.PROFESSIONAL
    )
    response_length: Mapped[ResponseLength] = mapped_column(
        SQLEnum(ResponseLength),
        nullable=False,
        default=ResponseLength.MEDIUM
    )
    greeting_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    farewell_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fallback_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    escalation_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    show_typing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    show_citations: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    read_receipts: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    suggested_starter_questions: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)  # Up to 5 questions
    conversation_starters_display: Mapped[ConversationStarterDisplay] = mapped_column(
        SQLEnum(ConversationStarterDisplay),
        nullable=False,
        default=ConversationStarterDisplay.FIRST_VISIT_ONLY
    )
    
    # ─── Tab 3: Business Hours ─────────────────────────────────────────────────
    business_hours_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    timezone: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g., "America/New_York"
    weekly_schedule: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)  # Day-based schedule config
    outside_hours_behavior: Mapped[OutsideHoursBehavior] = mapped_column(
        SQLEnum(OutsideHoursBehavior),
        nullable=False,
        default=OutsideHoursBehavior.CONTINUE_ANSWERING
    )
    offline_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    back_online_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    holiday_hours: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)  # Array of {date, hours}
    
    # ─── Tab 4: Escalation Triggers ────────────────────────────────────────────
    auto_escalation_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    confidence_threshold: Mapped[float] = mapped_column(Float, nullable=False, default=50.0)  # 0-100%
    unanswered_questions_threshold: Mapped[int] = mapped_column(String(3), nullable=False, default="3")  # After X unanswered questions
    sentiment_escalation_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    keyword_triggers: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)  # Array of escalation keywords
    escalation_email_addresses: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)  # Array of emails
    escalation_slack_webhook: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    escalation_whatsapp_notification: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    
    # ─── Tab 5: Lead Capture ───────────────────────────────────────────────────
    lead_capture_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    lead_capture_trigger: Mapped[LeadCaptureTrigger] = mapped_column(
        SQLEnum(LeadCaptureTrigger),
        nullable=False,
        default=LeadCaptureTrigger.NEVER
    )
    lead_capture_fields_config: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)  # Field configuration
    lead_capture_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lead_capture_thank_you_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lead_capture_skip_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    lead_capture_skip_button_text: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # ─── Tab 6: Notifications ──────────────────────────────────────────────────
    notifications_config: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)  # Notification preferences matrix
    notification_email_addresses: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)  # Multiple email recipients
    
    # ─── Core ──────────────────────────────────────────────────────────────────
    status: Mapped[ChatbotStatus] = mapped_column(
        SQLEnum(ChatbotStatus),
        nullable=False,
        default=ChatbotStatus.PAUSED
    )
    allowed_domains: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)  # Array of domain strings
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            # Core
            "id": self.id,
            "tenant_id": self.tenant_id,
            "status": self.status.value if self.status else "paused",
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
            # Tab 1: Appearance
            "name": self.name,
            "avatar_url": self.avatar_url,
            "brand_color": self.brand_color,
            "secondary_color": self.secondary_color,
            "user_message_color": self.user_message_color,
            "widget_position": self.widget_position.value if self.widget_position else None,
            "show_powered_by": self.show_powered_by,
            "font_size": self.font_size,
            # Tab 2: Behavior
            "response_language": self.response_language,
            "response_tone": self.response_tone.value if self.response_tone else None,
            "response_length": self.response_length.value if self.response_length else None,
            "greeting_message": self.greeting_message,
            "farewell_message": self.farewell_message,
            "fallback_message": self.fallback_message,
            "escalation_message": self.escalation_message,
            "show_typing": self.show_typing,
            "show_citations": self.show_citations,
            "read_receipts": self.read_receipts,
            "suggested_starter_questions": self.suggested_starter_questions,
            "conversation_starters_display": self.conversation_starters_display.value if self.conversation_starters_display else None,
            # Tab 3: Business Hours
            "business_hours_enabled": self.business_hours_enabled,
            "timezone": self.timezone,
            "weekly_schedule": self.weekly_schedule,
            "outside_hours_behavior": self.outside_hours_behavior.value if self.outside_hours_behavior else None,
            "offline_message": self.offline_message,
            "back_online_message": self.back_online_message,
            "holiday_hours": self.holiday_hours,
            # Tab 4: Escalation Triggers
            "auto_escalation_enabled": self.auto_escalation_enabled,
            "confidence_threshold": self.confidence_threshold,
            "unanswered_questions_threshold": self.unanswered_questions_threshold,
            "sentiment_escalation_enabled": self.sentiment_escalation_enabled,
            "keyword_triggers": self.keyword_triggers,
            "escalation_email_addresses": self.escalation_email_addresses,
            "escalation_slack_webhook": self.escalation_slack_webhook,
            "escalation_whatsapp_notification": self.escalation_whatsapp_notification,
            # Tab 5: Lead Capture
            "lead_capture_enabled": self.lead_capture_enabled,
            "lead_capture_trigger": self.lead_capture_trigger.value if self.lead_capture_trigger else None,
            "lead_capture_fields_config": self.lead_capture_fields_config,
            "lead_capture_message": self.lead_capture_message,
            "lead_capture_thank_you_message": self.lead_capture_thank_you_message,
            "lead_capture_skip_enabled": self.lead_capture_skip_enabled,
            "lead_capture_skip_button_text": self.lead_capture_skip_button_text,
            # Tab 6: Notifications
            "notifications_config": self.notifications_config,
            "notification_email_addresses": self.notification_email_addresses,
            # Other
            "allowed_domains": self.allowed_domains,
        }
