"""
Chatbot Configuration API endpoints.
Milestone 7.6 - Configuration Page with 6 Tabs
"""

import logging
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select

from ..dependencies.auth import get_current_user
from ..models.base import get_db_session
from ..models.user import User
from ..models.chatbot_instance import (
    ChatbotInstance, WidgetPosition, ResponseTone, ResponseLength,
    ConversationStarterDisplay, OutsideHoursBehavior, LeadCaptureTrigger
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])


# ─── Request/Response Models ───────────────────────────────────────────────────

class Tab1AppearanceRequest(BaseModel):
    """Tab 1 — Appearance configuration."""
    name: str = Field(..., min_length=1, max_length=100)
    avatar_url: Optional[str] = None
    role_text: Optional[str] = None
    brand_color: str = Field(default="#4F8EF7")
    secondary_color: str = Field(default="#7C3AED")
    user_message_color: str = Field(default="#4F8EF7")
    widget_position: str = Field(default="bottom_right")
    show_powered_by: bool = Field(default=True)
    font_size: str = Field(default="medium")  # small | medium | large


class Tab2BehaviorRequest(BaseModel):
    """Tab 2 — Behavior configuration."""
    response_language: str = Field(default="auto")
    response_tone: str = Field(default="professional")
    response_length: str = Field(default="medium")
    greeting_message: Optional[str] = None
    farewell_message: Optional[str] = None
    fallback_message: Optional[str] = None
    escalation_message: Optional[str] = None
    show_typing: bool = Field(default=True)
    show_citations: bool = Field(default=True)
    read_receipts: bool = Field(default=False)
    suggested_starter_questions: Optional[List[str]] = Field(default=None, max_items=5)
    conversation_starters_display: str = Field(default="first_visit_only")


class Tab3BusinessHoursRequest(BaseModel):
    """Tab 3 — Business Hours configuration."""
    business_hours_enabled: bool = Field(default=False)
    timezone: Optional[str] = None
    weekly_schedule: Optional[Dict[str, Any]] = None
    outside_hours_behavior: str = Field(default="continue_answering")
    offline_message: Optional[str] = None
    back_online_message: Optional[str] = None
    holiday_hours: Optional[List[Dict[str, Any]]] = None


class Tab4EscalationRequest(BaseModel):
    """Tab 4 — Escalation Triggers configuration."""
    auto_escalation_enabled: bool = Field(default=False)
    confidence_threshold: float = Field(default=50.0, ge=0.0, le=100.0)
    unanswered_questions_threshold: str = Field(default="3")
    sentiment_escalation_enabled: bool = Field(default=False)
    keyword_triggers: Optional[List[str]] = None
    escalation_email_addresses: Optional[List[str]] = None
    escalation_slack_webhook: Optional[str] = None
    escalation_whatsapp_notification: bool = Field(default=False)


class Tab5LeadCaptureRequest(BaseModel):
    """Tab 5 — Lead Capture configuration."""
    lead_capture_enabled: bool = Field(default=False)
    lead_capture_trigger: str = Field(default="never")
    lead_capture_fields_config: Optional[Dict[str, Any]] = None
    lead_capture_message: Optional[str] = None
    lead_capture_thank_you_message: Optional[str] = None
    lead_capture_skip_enabled: bool = Field(default=False)
    lead_capture_skip_button_text: Optional[str] = None


class Tab6NotificationsRequest(BaseModel):
    """Tab 6 — Notifications configuration."""
    notifications_config: Optional[Dict[str, Any]] = None
    notification_email_addresses: Optional[List[str]] = None


class ChatbotConfigRequest(BaseModel):
    """Complete chatbot configuration (all 6 tabs)."""
    # Tab 1
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    role_text: Optional[str] = None
    brand_color: Optional[str] = None
    secondary_color: Optional[str] = None
    user_message_color: Optional[str] = None
    widget_position: Optional[str] = None
    show_powered_by: Optional[bool] = None
    font_size: Optional[str] = None
    # Tab 2
    response_language: Optional[str] = None
    response_tone: Optional[str] = None
    response_length: Optional[str] = None
    greeting_message: Optional[str] = None
    farewell_message: Optional[str] = None
    fallback_message: Optional[str] = None
    escalation_message: Optional[str] = None
    show_typing: Optional[bool] = None
    show_citations: Optional[bool] = None
    read_receipts: Optional[bool] = None
    suggested_starter_questions: Optional[List[str]] = None
    conversation_starters_display: Optional[str] = None
    # Tab 3
    business_hours_enabled: Optional[bool] = None
    timezone: Optional[str] = None
    weekly_schedule: Optional[Dict[str, Any]] = None
    outside_hours_behavior: Optional[str] = None
    offline_message: Optional[str] = None
    back_online_message: Optional[str] = None
    holiday_hours: Optional[List[Dict[str, Any]]] = None
    # Tab 4
    auto_escalation_enabled: Optional[bool] = None
    confidence_threshold: Optional[float] = None
    unanswered_questions_threshold: Optional[str] = None
    sentiment_escalation_enabled: Optional[bool] = None
    keyword_triggers: Optional[List[str]] = None
    escalation_email_addresses: Optional[List[str]] = None
    escalation_slack_webhook: Optional[str] = None
    escalation_whatsapp_notification: Optional[bool] = None
    # Tab 5
    lead_capture_enabled: Optional[bool] = None
    lead_capture_trigger: Optional[str] = None
    lead_capture_fields_config: Optional[Dict[str, Any]] = None
    lead_capture_message: Optional[str] = None
    lead_capture_thank_you_message: Optional[str] = None
    lead_capture_skip_enabled: Optional[bool] = None
    lead_capture_skip_button_text: Optional[str] = None
    # Tab 6
    notifications_config: Optional[Dict[str, Any]] = None
    notification_email_addresses: Optional[List[str]] = None

    # ------------------------------------------------------------------
    # Validators
    # ------------------------------------------------------------------
    @field_validator('keyword_triggers', mode='before')
    def _split_keywords(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(',') if s.strip()]
        return v

    @field_validator('escalation_email_addresses', mode='before')
    def _split_escalation_emails(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(',') if s.strip()]
        return v

    @field_validator('notification_email_addresses', mode='before')
    def _split_notification_emails(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(',') if s.strip()]
        return v

    @field_validator('unanswered_questions_threshold', mode='before')
    def _threshold_to_str(cls, v):
        if v is None:
            return v
        return str(v)

    @field_validator('suggested_starter_questions', mode='before')
    def _clean_starters(cls, v):
        if isinstance(v, list):
            return [s for s in v if s is not None and s != ""]
        return v

    @field_validator(
        'notifications_config',
        'lead_capture_fields_config',
        'weekly_schedule',
        'holiday_hours',
        mode='before',
    )
    def _parse_json_fields(cls, v):
        if isinstance(v, str):
            try:
                return __import__('json').loads(v)
            except Exception:
                pass
        return v


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/config")
async def get_chatbot_config(
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Get complete chatbot configuration for the current tenant.
    Returns all 6 tabs of configuration.
    """
    async with get_db_session() as session:
        result = await session.execute(
            select(ChatbotInstance).where(
                ChatbotInstance.tenant_id == current_user.tenant_id
            )
        )
        chatbot = result.scalar_one_or_none()
    
    if not chatbot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chatbot not found"
        )
    
    return chatbot.to_dict()


@router.put("/config")
async def update_chatbot_config(
    config: ChatbotConfigRequest,
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Update chatbot configuration (unified endpoint for all 6 tabs).
    Accepts partial updates - only provided fields are updated.
    """
    async with get_db_session() as session:
        result = await session.execute(
            select(ChatbotInstance).where(
                ChatbotInstance.tenant_id == current_user.tenant_id
            )
        )
        chatbot = result.scalar_one_or_none()
        
        if not chatbot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chatbot not found"
            )
        
        # All allowed fields across 6 tabs
        allowed_fields = {
            # Tab 1
            'name', 'avatar_url', 'role_text', 'brand_color', 'secondary_color', 'user_message_color',
            'widget_position', 'show_powered_by', 'font_size',
            # Tab 2
            'response_language', 'response_tone', 'response_length', 'greeting_message',
            'farewell_message', 'fallback_message', 'escalation_message', 'show_typing',
            'show_citations', 'read_receipts', 'suggested_starter_questions',
            'conversation_starters_display',
            # Tab 3
            'business_hours_enabled', 'timezone', 'weekly_schedule', 'outside_hours_behavior',
            'offline_message', 'back_online_message', 'holiday_hours',
            # Tab 4
            'auto_escalation_enabled', 'confidence_threshold', 'unanswered_questions_threshold',
            'sentiment_escalation_enabled', 'keyword_triggers', 'escalation_email_addresses',
            'escalation_slack_webhook', 'escalation_whatsapp_notification',
            # Tab 5
            'lead_capture_enabled', 'lead_capture_trigger', 'lead_capture_fields_config',
            'lead_capture_message', 'lead_capture_thank_you_message', 'lead_capture_skip_enabled',
            'lead_capture_skip_button_text',
            # Tab 6
            'notifications_config', 'notification_email_addresses', 'allowed_domains'
        }
        
        # Update only provided fields
        config_dict = config.model_dump(exclude_unset=True)
        # Some frontends may send CSV strings or JSON strings; normalize here so
        # the database accepts them and clients don't all need to be perfect.
        list_fields = {
            'keyword_triggers',
            'escalation_email_addresses',
            'notification_email_addresses',
        }
        json_fields = {
            'notifications_config',
            'lead_capture_fields_config',
            'weekly_schedule',
            'holiday_hours',
        }
        for key, value in config_dict.items():
            if key in list_fields and isinstance(value, str):
                # convert comma-separated string to list
                config_dict[key] = [s.strip() for s in value.split(',') if s.strip()]
                value = config_dict[key]
            if key in json_fields and isinstance(value, str):
                try:
                    config_dict[key] = __import__('json').loads(value)
                    value = config_dict[key]
                except Exception:
                    # leave as-is, pydantic will raise if invalid
                    pass
            if key == 'unanswered_questions_threshold' and value is not None and not isinstance(value, str):
                config_dict[key] = str(value)
                value = config_dict[key]

            if key in allowed_fields and hasattr(chatbot, key):
                # Handle enum conversions
                if key == 'widget_position' and value:
                    try:
                        setattr(chatbot, key, WidgetPosition(value))
                    except ValueError:
                        pass
                elif key == 'response_tone' and value:
                    try:
                        setattr(chatbot, key, ResponseTone(value))
                    except ValueError:
                        pass
                elif key == 'response_length' and value:
                    try:
                        setattr(chatbot, key, ResponseLength(value))
                    except ValueError:
                        pass
                elif key == 'conversation_starters_display' and value:
                    try:
                        setattr(chatbot, key, ConversationStarterDisplay(value))
                    except ValueError:
                        pass
                elif key == 'outside_hours_behavior' and value:
                    try:
                        setattr(chatbot, key, OutsideHoursBehavior(value))
                    except ValueError:
                        pass
                elif key == 'lead_capture_trigger' and value:
                    try:
                        setattr(chatbot, key, LeadCaptureTrigger(value))
                    except ValueError:
                        pass
                else:
                    setattr(chatbot, key, value)
        
        await session.commit()
        
        # Fetch updated chatbot
        result = await session.execute(
            select(ChatbotInstance).where(
                ChatbotInstance.tenant_id == current_user.tenant_id
            )
        )
        chatbot = result.scalar_one_or_none()
    
    return chatbot.to_dict()


@router.put("/domains")
async def update_allowed_domains(
    config: dict,
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Update allowed domains for the chatbot.
    """
    domains = config.get('allowed_domains', [])
    
    async with get_db_session() as session:
        result = await session.execute(
            select(ChatbotInstance).where(
                ChatbotInstance.tenant_id == current_user.tenant_id
            )
        )
        chatbot = result.scalar_one_or_none()
        
        if not chatbot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chatbot not found"
            )
        
        chatbot.allowed_domains = domains
        await session.commit()
    
    return {
        "id": chatbot.id,
        "allowed_domains": chatbot.allowed_domains or []
    }

