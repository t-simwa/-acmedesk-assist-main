"""
Channel configuration API endpoints (9.1).

Implements:
- GET  /api/channels        - List all channel configurations
- POST /api/channels/{name}/toggle - Enable/disable a channel
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..config import settings
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.channels import (
    ChannelConfigItem,
    ChannelConfigListResponse,
    ChannelToggleRequest,
    ChannelToggleResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/channels", tags=["channels"])


CHANNEL_DEFINITIONS = [
    {
        "channel": "whatsapp",
        "display_name": "WhatsApp Business",
        "description": "Connect your WhatsApp Business account to send and receive messages.",
        "enabled_attr": "whatsapp_channel_enabled",
        "connected_check": lambda: bool(settings.whatsapp_default_from_number),
    },
    {
        "channel": "email",
        "display_name": "Email",
        "description": "Connect your email inbox via IMAP/SMTP for inbound and outbound email support.",
        "enabled_attr": "email_channel_enabled",
        "connected_check": lambda: bool(settings.email_imap_host and settings.email_imap_username),
    },
    {
        "channel": "sms",
        "display_name": "SMS",
        "description": "Send and receive SMS messages through your connected provider.",
        "enabled_attr": "sms_channel_enabled",
        "connected_check": lambda: bool(settings.sms_default_from_number),
    },
    {
        "channel": "messenger",
        "display_name": "Facebook Messenger",
        "description": "Connect your Facebook Page to manage Messenger conversations.",
        "enabled_attr": "messenger_channel_enabled",
        "connected_check": lambda: bool(settings.messenger_page_id),
    },
    {
        "channel": "instagram",
        "display_name": "Instagram DMs",
        "description": "Connect your Instagram Business account to manage direct messages.",
        "enabled_attr": "instagram_channel_enabled",
        "connected_check": lambda: bool(settings.instagram_account_id),
    },
]


@router.get("", response_model=ChannelConfigListResponse)
async def list_channels(
    current_user: User = Depends(get_current_user),
) -> ChannelConfigListResponse:
    channels = []
    for ch_def in CHANNEL_DEFINITIONS:
        enabled = getattr(settings, ch_def["enabled_attr"], False)
        connected = ch_def["connected_check"]()
        channels.append(
            ChannelConfigItem(
                channel=ch_def["channel"],
                enabled=enabled,
                connected=connected,
                display_name=ch_def["display_name"],
                description=ch_def["description"],
            )
        )
    return ChannelConfigListResponse(channels=channels)


@router.post("/{channel_name}/toggle", response_model=ChannelToggleResponse)
async def toggle_channel(
    channel_name: str,
    request: ChannelToggleRequest,
    current_user: User = Depends(get_current_user),
) -> ChannelToggleResponse:
    """
    Toggle a channel on or off.

    Note: In a real deployment, this would persist to the database or update
    tenant-specific settings. For now, this is a stub that acknowledges the
    request without persisting (settings are env-driven).
    """
    valid_channels = [ch["channel"] for ch in CHANNEL_DEFINITIONS]
    if channel_name not in valid_channels:
        raise HTTPException(status_code=404, detail=f"Unknown channel: {channel_name}")

    action = "enabled" if request.enabled else "disabled"
    return ChannelToggleResponse(
        channel=channel_name,
        enabled=request.enabled,
        message=f"Channel '{channel_name}' has been {action}. Note: Full configuration requires environment variables.",
    )
