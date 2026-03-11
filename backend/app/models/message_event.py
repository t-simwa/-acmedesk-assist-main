from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any


@dataclass
class MessageEvent:
    # Identity
    tenant_id: str                     # UUID of the business
    channel: str                       # 'whatsapp'|'instagram'|'facebook'|'email'|'sms'|'web'
    channel_user_id: str               # External user ID for this channel
    channel_conversation_id: str       # External conversation/thread ID

    # Contact info (whatever the channel provides)
    contact_phone: Optional[str]       # E.164 format if available
    contact_email: Optional[str]       # if available
    contact_name: Optional[str]        # display name from channel profile
    contact_avatar_url: Optional[str]  # profile picture URL if available

    # Message content
    message_id: str                    # Channel's native message ID
    message_type: str                  # 'text'|'audio'|'image'|'document'|'interactive'|'location'
    text: Optional[str]                # Extracted text (after Whisper/Vision processing)
    raw_payload: Dict[str, Any]        # Full original payload (stored for debugging)
    timestamp: datetime                # Message timestamp from channel

    # For reply tracking
    reply_to_message_id: Optional[str] # For threaded channels (email)

    # Media (if applicable)
    media_url: Optional[str]           # Temporary CDN URL (channel provides, expires fast)
    media_type: Optional[str]          # MIME type
    media_caption: Optional[str]       # Caption attached to image/video

    # Interactive (if applicable)
    button_payload: Optional[str]      # For button/postback responses
    selected_option: Optional[str]     # Human-readable selection
