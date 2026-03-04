from __future__ import annotations

"""
Instagram DM channel service (9.4).

Replaces the former Twitter/X channel. Uses the ChannelAdapter base class
for uniform thread/message handling, with Instagram-specific metadata keys.
"""

import logging
from typing import Any, Dict, List, Optional

from ..config import settings
from .channel_adapter import ChannelAdapter

logger = logging.getLogger(__name__)

INSTAGRAM_CHANNEL_NAME = "instagram"
INSTAGRAM_THREAD_ID_KEY = "instagram_thread_id"


class InstagramAdapter(ChannelAdapter):
    CHANNEL_NAME = INSTAGRAM_CHANNEL_NAME
    THREAD_ID_KEY = INSTAGRAM_THREAD_ID_KEY


# Module-level singleton
_adapter = InstagramAdapter()


async def create_inbound_instagram_message(
    user_id: str,
    sender_id: str,
    account_id: str,
    body: str,
    provider_message_id: Optional[str] = None,
    media_urls: Optional[List[str]] = None,
) -> dict:
    """Create an inbound Instagram DM message."""
    extra: Dict[str, Any] = {}
    if media_urls:
        extra["media_urls"] = media_urls
    return await _adapter.create_inbound_message(
        user_id=user_id,
        sender_id=sender_id,
        recipient_id=account_id,
        body=body,
        provider_message_id=provider_message_id,
        extra_metadata=extra if extra else None,
    )


async def list_instagram_threads(
    user_id: str, limit: int = 50, offset: int = 0,
):
    """List Instagram DM threads for the given admin user."""
    return await _adapter.list_threads(user_id=user_id, limit=limit, offset=offset)


async def list_instagram_thread_messages(user_id: str, thread_id: str) -> List[dict]:
    """List messages for a specific Instagram DM thread."""
    return await _adapter.list_thread_messages(user_id=user_id, thread_id=thread_id)


async def send_instagram_reply(user_id: str, thread_id: str, body: str) -> dict:
    """Send an Instagram DM reply for a given thread."""
    return await _adapter.send_reply(
        user_id=user_id,
        thread_id=thread_id,
        body=body,
        channel_enabled=settings.instagram_channel_enabled,
        default_sender_id=settings.instagram_account_id,
        outbound_webhook_url=settings.instagram_outbound_webhook_url,
        outbound_webhook_token=settings.instagram_outbound_webhook_token,
    )
