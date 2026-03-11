"""
Comprehensive Pydantic schemas for channel-specific settings.

Each channel has behavior settings, appearance settings (where applicable),
and channel-specific configuration that can be persisted to the ChannelConfig model.
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


# =============================================================================
# WHATSAPP SETTINGS
# =============================================================================

class WhatsAppBehaviorSettings(BaseModel):
    """WhatsApp channel behavior settings."""
    greeting_message: str = Field(
        default="Hi! 👋 Thanks for reaching out. I'm here to help — what can I assist you with today?",
        max_length=1000
    )
    use_global_business_hours: bool = True
    offline_behavior: Literal["keep_active_24_7", "send_offline_template"] = "keep_active_24_7"
    response_delay: int = Field(default=2, ge=0, le=8, description="Delay in seconds before responding")
    show_typing_indicator: bool = True
    unknown_intent_message: str = Field(
        default="That's a great question — let me connect you with a team member who can help better. What's the best way to reach you?",
        max_length=1000
    )
    transcribe_voice: bool = True
    analyze_images: bool = True


class WhatsAppTemplateCreate(BaseModel):
    """Schema for creating/submitting a WhatsApp message template."""
    name: str = Field(..., pattern=r"^[a-z][a-z0-9_]*$", max_length=512)
    category: Literal["UTILITY", "MARKETING", "AUTHENTICATION"]
    language: str = Field(default="en", max_length=10)
    body_text: str = Field(..., max_length=1024)
    header_text: Optional[str] = Field(default=None, max_length=60)
    footer_text: Optional[str] = Field(default=None, max_length=60)
    buttons: Optional[List[dict]] = None


class WhatsAppTemplateStatus(BaseModel):
    """Status of a WhatsApp message template."""
    name: str
    category: str
    status: Literal["PENDING", "APPROVED", "REJECTED", "NOT_SUBMITTED"]
    language: str
    body_text: str
    rejection_reason: Optional[str] = None


# =============================================================================
# EMAIL SETTINGS
# =============================================================================

class EmailBehaviorSettings(BaseModel):
    """Email channel behavior settings."""
    from_name: str = Field(default="Support", max_length=100)
    reply_to: Optional[str] = None
    signature: str = Field(
        default="—\nSupport Team",
        max_length=500
    )
    response_mode: Literal["auto_send", "always_draft", "hybrid"] = "hybrid"
    auto_send_threshold: int = Field(default=85, ge=0, le=100, description="Auto-send if confidence >= this")
    draft_threshold: int = Field(default=60, ge=0, le=100, description="Draft if confidence >= this")
    auto_acknowledgement_enabled: bool = True
    auto_acknowledgement_message: str = Field(
        default="Thank you for emailing us! We've received your message and will respond within a few hours.",
        max_length=1000
    )


class EmailVerifyForwardingRequest(BaseModel):
    """Request to initiate email forwarding verification."""
    email_address: str


class EmailVerifyForwardingResponse(BaseModel):
    """Response with verification instructions."""
    verification_code: str
    inbound_address: str
    instructions: str
    verified: bool = False


# =============================================================================
# SMS SETTINGS
# =============================================================================

class SmsCredentials(BaseModel):
    """SMS provider credentials."""
    provider: Literal["twilio", "africas_talking", "vonage"]
    # Twilio
    account_sid: Optional[str] = None
    auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None
    # Africa's Talking
    at_username: Optional[str] = None
    at_api_key: Optional[str] = None
    at_shortcode: Optional[str] = None
    at_sender_id: Optional[str] = None
    # Vonage
    vonage_api_key: Optional[str] = None
    vonage_api_secret: Optional[str] = None
    vonage_phone_number: Optional[str] = None


class SmsBehaviorSettings(BaseModel):
    """SMS channel behavior settings."""
    max_characters: int = Field(default=320, ge=160, le=480)
    enable_link_shortening: bool = True
    help_message: str = Field(
        default="[Business Name] Support. For help visit [website]. To unsubscribe reply STOP.",
        max_length=160
    )
    compliance_footer_enabled: bool = True


class SmsOptOutEntry(BaseModel):
    """Entry in SMS opt-out list."""
    phone_number: str
    opted_out_at: str
    reason: Optional[str] = None


# =============================================================================
# MESSENGER SETTINGS
# =============================================================================

class MessengerMenuItem(BaseModel):
    """Persistent menu item for Messenger."""
    title: str = Field(..., max_length=30)
    payload: str = Field(..., max_length=1000)


class MessengerProfileSettings(BaseModel):
    """Facebook Messenger profile settings (synced to Facebook)."""
    get_started_message: str = Field(
        default="Welcome! 👋 I'm your AI assistant. Ask me anything about our services, pricing, or bookings.",
        max_length=2000
    )
    persistent_menu: List[MessengerMenuItem] = Field(
        default_factory=lambda: [
            MessengerMenuItem(title="🤖 Ask a Question", payload="Hi, I have a question"),
            MessengerMenuItem(title="📅 Book Appointment", payload="I'd like to book"),
            MessengerMenuItem(title="👤 Talk to Someone", payload="I need human support"),
        ],
        max_length=3
    )
    ice_breakers: List[str] = Field(
        default_factory=lambda: [
            "What services do you offer?",
            "How do I book an appointment?",
            "What are your hours?",
            "Can I speak to someone?",
        ],
        max_length=4
    )
    enable_rich_cards: bool = True
    enable_carousels: bool = True


class MessengerBehaviorSettings(BaseModel):
    """Messenger behavior settings."""
    response_delay: int = Field(default=2, ge=0, le=8)
    show_typing_indicator: bool = True


# =============================================================================
# INSTAGRAM SETTINGS
# =============================================================================

class InstagramProfileSettings(BaseModel):
    """Instagram DM profile settings."""
    ice_breakers: List[str] = Field(
        default_factory=lambda: [
            "What are your service prices?",
            "How do I book an appointment?",
            "What areas do you serve?",
        ],
        max_length=4
    )
    story_mention_auto_reply_enabled: bool = True
    story_mention_auto_reply_message: str = Field(
        default="Thank you so much for the mention! 🙏 Is there anything I can help you with today?",
        max_length=1000
    )
    story_reply_enabled: bool = True
    story_reply_message: str = Field(
        default="Thanks for engaging with our story! How can I help?",
        max_length=1000
    )
    enable_quick_reply_chips: bool = True


class InstagramBehaviorSettings(BaseModel):
    """Instagram DM behavior settings."""
    response_delay: int = Field(default=2, ge=0, le=8)
    show_typing_indicator: bool = True


# =============================================================================
# WEB WIDGET SETTINGS
# =============================================================================

class WidgetAppearanceSettings(BaseModel):
    """Web widget appearance settings."""
    position: Literal["bottom-right", "bottom-left"] = "bottom-right"
    launcher_icon: Literal["chat", "message", "support", "custom"] = "chat"
    custom_icon_url: Optional[str] = None
    launcher_label: str = Field(default="Chat with us", max_length=30)
    primary_color: str = Field(default="#0F172A", pattern=r"^#[0-9A-Fa-f]{6}$")
    button_color: str = Field(default="#0F172A", pattern=r"^#[0-9A-Fa-f]{6}$")
    button_text_color: str = Field(default="#FFFFFF", pattern=r"^#[0-9A-Fa-f]{6}$")
    header_color: str = Field(default="#0F172A", pattern=r"^#[0-9A-Fa-f]{6}$")
    header_text_color: str = Field(default="#FFFFFF", pattern=r"^#[0-9A-Fa-f]{6}$")
    border_radius: int = Field(default=24, ge=0, le=48)
    show_powered_by: bool = True


class WidgetBehaviorSettings(BaseModel):
    """Web widget behavior settings."""
    auto_open_delay: int = Field(default=0, ge=0, le=120, description="0 = never auto-open")
    mobile_behavior: Literal["same_as_desktop", "hide_on_mobile", "show_button_only"] = "same_as_desktop"
    greeting_message: str = Field(
        default="Hi! 👋 How can I help you today?",
        max_length=500
    )
    offline_message: str = Field(
        default="We're currently offline but leave a message and we'll get back to you!",
        max_length=500
    )
    show_typing_indicator: bool = True
    sound_enabled: bool = False
    persist_session: bool = True
    quick_replies: List[str] = Field(
        default_factory=lambda: ["I have a question", "I need support", "Talk to a person"],
        max_length=5
    )
    response_delay: int = Field(default=1, ge=0, le=5)
    enable_file_upload: bool = True
    max_file_size_mb: int = Field(default=10, ge=1, le=25)


class WidgetDomainSettings(BaseModel):
    """Web widget domain whitelist settings."""
    allowed_domains: List[str] = Field(default_factory=list)
    restrict_by_domain: bool = False
    include_subdomains: bool = True


class WidgetEmbedCodeResponse(BaseModel):
    """Response containing widget embed code."""
    embed_code: str
    widget_id: str
    cdn_url: str


# =============================================================================
# UNIFIED CHANNEL SETTINGS UPDATE
# =============================================================================

class ChannelSettingsUpdate(BaseModel):
    """Generic wrapper for updating any channel's settings."""
    behavior: Optional[dict] = None
    appearance: Optional[dict] = None
    profile: Optional[dict] = None
    domains: Optional[dict] = None
    credentials: Optional[dict] = None


# =============================================================================
# CHANNEL HEALTH & LOGS
# =============================================================================

class ChannelMessageLog(BaseModel):
    """Single message log entry for channel health dashboard."""
    id: str
    direction: Literal["inbound", "outbound"]
    status: Literal["delivered", "failed", "pending", "read"]
    timestamp: str
    preview: str
    error: Optional[str] = None
    recipient: Optional[str] = None


class ChannelHealthDetail(BaseModel):
    """Detailed health info for a single channel."""
    channel: str
    status: Literal["active", "warning", "error", "disconnected"]
    messages_today: int
    messages_yesterday: int
    messages_change_percent: float
    delivery_rate: float
    avg_response_time_ms: Optional[int] = None
    last_error: Optional[str] = None
    last_error_at: Optional[str] = None
    connected_at: Optional[str] = None
    phone_number: Optional[str] = None
    account_name: Optional[str] = None
    recent_logs: List[ChannelMessageLog] = Field(default_factory=list)


class ChannelHealthDashboard(BaseModel):
    """Full channel health dashboard response."""
    channels: List[ChannelHealthDetail]
    total_messages_today: int
    total_messages_yesterday: int
    avg_delivery_rate: float
    channels_active: int
    channels_warning: int
    channels_error: int
