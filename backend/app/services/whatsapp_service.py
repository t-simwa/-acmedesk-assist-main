from __future__ import annotations

"""
WhatsApp channel service (J2.2).

Responsibilities:
- Convert inbound WhatsApp payloads into conversations/messages.
- List WhatsApp threads and messages for an admin.
- Send outbound WhatsApp replies (optionally via an outbound webhook).
"""

import logging
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

import httpx
from sqlalchemy import select

from ..config import settings
from ..models.base import get_session_factory
from ..models.conversation import Conversation
from ..models.message import Message, MessageRole
from ..services.database import get_effective_tenant_id
from ..models.channel_config import ChannelConfig
from ..services.crypto import decrypt
import json

logger = logging.getLogger(__name__)


WHATSAPP_CHANNEL_METADATA_KEY = "channel"
WHATSAPP_CHANNEL_NAME = "whatsapp"


@dataclass
class WhatsAppThreadSummary:
    thread_id: str
    last_message_at: str
    wa_id: Optional[str]
    business_number: Optional[str]
    message_count: int


def _build_thread_id(wa_id: str, business_number: str) -> str:
    """
    Build a stable thread identifier for a WhatsApp conversation.
    """
    return f"{wa_id}->{business_number}"


async def create_inbound_whatsapp_message(
    wa_id: str,
    business_number: str,
    body: str,
    user_id: Optional[str] = None,
    provider_message_id: Optional[str] = None,
    media_urls: Optional[List[str]] = None,
    caption: Optional[str] = None,
) -> dict:
    """
    Create an inbound WhatsApp message, converting it into a conversation/message.

    media_urls can be used to represent rich media (images, documents, etc.).
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        # Resolve the correct tenant_id from user_id
        effective_tenant_id = await get_effective_tenant_id(user_id=user_id, session=session)
        
        thread_id = _build_thread_id(wa_id, business_number)
        session_identifier = f"{WHATSAPP_CHANNEL_NAME}-{thread_id}"

        result = await session.execute(
            select(Conversation).where(
                Conversation.session_id == session_identifier,
                Conversation.tenant_id == effective_tenant_id,
            )
        )
        conversation = result.scalar_one_or_none()

        now = datetime.utcnow()

        if conversation is None:
            conversation = Conversation(
                id=str(uuid.uuid4()),
                tenant_id=effective_tenant_id,
                session_id=session_identifier,
                started_at=now,
                last_activity_at=now,
            )
            session.add(conversation)

        metadata: Dict[str, Any] = {
            WHATSAPP_CHANNEL_METADATA_KEY: WHATSAPP_CHANNEL_NAME,
            "direction": "inbound",
            "whatsapp_thread_id": thread_id,
            "from": wa_id,
            "to": business_number,
            "provider_message_id": provider_message_id,
        }
        if media_urls:
            metadata["media_urls"] = media_urls
        if caption:
            metadata["caption"] = caption

        message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role=MessageRole.USER,
            content=body or "",
            created_at=now,
            message_metadata=metadata,
        )
        session.add(message)
        conversation.last_activity_at = now

        await session.commit()
        return message.to_dict()


async def list_whatsapp_threads(
    user_id: str,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[WhatsAppThreadSummary], int]:
    """
    List WhatsApp threads for the given admin user.
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        # Resolve the correct tenant_id from user_id
        effective_tenant_id = await get_effective_tenant_id(user_id=user_id, session=session)
        
        result = await session.execute(
            select(Message, Conversation)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(Conversation.tenant_id == effective_tenant_id)
            .order_by(Message.created_at.desc())
        )
        rows = result.all()

        threads: Dict[str, Dict[str, Any]] = {}

        for message, _conversation in rows:
            metadata = message.message_metadata or {}
            if metadata.get(WHATSAPP_CHANNEL_METADATA_KEY) != WHATSAPP_CHANNEL_NAME:
                continue

            thread_id = metadata.get("whatsapp_thread_id")
            if not thread_id:
                continue

            created_at_iso = (
                message.created_at.isoformat() + "Z" if message.created_at else ""
            )

            existing = threads.get(thread_id)
            if not existing:
                threads[thread_id] = {
                    "thread_id": thread_id,
                    "last_message_at": created_at_iso,
                    "wa_id": metadata.get("from"),
                    "business_number": metadata.get("to"),
                    "message_count": 1,
                }
            else:
                existing["message_count"] += 1
                if created_at_iso > existing["last_message_at"]:
                    existing["last_message_at"] = created_at_iso

        all_threads = [
            WhatsAppThreadSummary(
                thread_id=t["thread_id"],
                last_message_at=t["last_message_at"],
                wa_id=t["wa_id"],
                business_number=t["business_number"],
                message_count=t["message_count"],
            )
            for t in threads.values()
        ]

        all_threads.sort(key=lambda t: t.last_message_at, reverse=True)
        total = len(all_threads)
        return all_threads[offset : offset + limit], total


async def list_whatsapp_thread_messages(user_id: str, thread_id: str) -> List[dict]:
    """
    List messages for a specific WhatsApp thread.
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        # Resolve the correct tenant_id from user_id
        effective_tenant_id = await get_effective_tenant_id(user_id=user_id, session=session)
        
        result = await session.execute(
            select(Message, Conversation)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                Conversation.tenant_id == effective_tenant_id,
                Message.message_metadata["whatsapp_thread_id"].as_string() == thread_id,
            )
            .order_by(Message.created_at.asc())
        )
        rows = result.all()

        messages: List[dict] = []
        for message, _conversation in rows:
            data = message.to_dict()
            data["metadata"] = message.message_metadata or {}
            messages.append(data)

        return messages


async def send_whatsapp_reply(user_id: str, thread_id: str, body: str) -> dict:
    """
    Send a WhatsApp reply for a given thread and persist it as an assistant message.

    If whatsapp_outbound_webhook_url is configured, this function will POST a JSON
    payload there so an external integration (e.g. WhatsApp Business API, Twilio)
    can deliver it.
    """
    if not settings.whatsapp_channel_enabled:
        raise ValueError("WhatsApp channel is disabled")

    if not settings.whatsapp_default_from_number:
        raise ValueError("WhatsApp default from number is not configured")

    session_factory = get_session_factory()
    async with session_factory() as session:
        # Resolve the correct tenant_id from user_id
        effective_tenant_id = await get_effective_tenant_id(user_id=user_id, session=session)
        
        result = await session.execute(
            select(Message, Conversation)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                Conversation.tenant_id == effective_tenant_id,
                Message.message_metadata["whatsapp_thread_id"].as_string() == thread_id,
            )
            .order_by(Message.created_at.desc())
        )
        latest = result.first()
        if not latest:
            raise ValueError(f"No messages found for WhatsApp thread {thread_id}")

        latest_message, conversation = latest
        metadata = latest_message.message_metadata or {}

        wa_id = metadata.get("from")
        business_number = metadata.get("to") or settings.whatsapp_default_from_number

        if not wa_id or not business_number:
            raise ValueError("WhatsApp metadata missing from/to; cannot determine recipient")

        now = datetime.utcnow()

    # Optionally call outbound webhook so an external provider can deliver the WhatsApp message
    if settings.whatsapp_outbound_webhook_url:
        payload = {
            "channel": WHATSAPP_CHANNEL_NAME,
            "thread_id": thread_id,
            "from": settings.whatsapp_default_from_number,
            "to": wa_id,
            "body": body,
            "user_id": user_id,
        }
        headers: Dict[str, str] = {"Content-Type": "application/json"}
        if settings.whatsapp_outbound_webhook_token:
            headers["Authorization"] = f"Bearer {settings.whatsapp_outbound_webhook_token}"

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    settings.whatsapp_outbound_webhook_url,
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Error calling WhatsApp outbound webhook: %s", exc, exc_info=True
            )
            raise

        assistant_message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content=body,
            created_at=now,
            message_metadata={
                WHATSAPP_CHANNEL_METADATA_KEY: WHATSAPP_CHANNEL_NAME,
                "direction": "outbound",
                "whatsapp_thread_id": thread_id,
                "from": settings.whatsapp_default_from_number,
                "to": wa_id,
            },
        )
        session.add(assistant_message)
        conversation.last_activity_at = now
        await session.commit()

        return assistant_message.to_dict()

    # If no outbound webhook is configured, attempt to send via Meta Graph API
    # using a stored phone_number_id from ChannelConfig.config and access token from oauth_tokens.
    session_factory = get_session_factory()
    async with session_factory() as session2:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == effective_tenant_id,
            ChannelConfig.channel == "whatsapp",
        )
        res = await session2.execute(stmt)
        cfg = res.scalar_one_or_none()

    phone_number_id = None
    access_token = None
    if cfg:
        # config may contain the selected phone_number_id
        try:
            cfg_config = cfg.config or {}
            phone_number_id = cfg_config.get("phone_number_id") or cfg_config.get("display_phone_number")
        except Exception:
            cfg_config = {}

        if cfg and cfg.oauth_tokens:
            try:
                token_json = decrypt(cfg.oauth_tokens)
                token_data = json.loads(token_json)
            except Exception:
                token_data = json.loads(cfg.oauth_tokens)
            access_token = token_data.get("access_token")

    if not phone_number_id or not access_token:
        # Persist assistant message locally and return when unable to send
        assistant_message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content=body,
            created_at=now,
            message_metadata={
                WHATSAPP_CHANNEL_METADATA_KEY: WHATSAPP_CHANNEL_NAME,
                "direction": "outbound",
                "whatsapp_thread_id": thread_id,
                "from": business_number,
                "to": wa_id,
            },
        )
        session.add(assistant_message)
        conversation.last_activity_at = now
        await session.commit()

        return assistant_message.to_dict()

    # Call Graph API to send WhatsApp message via phone_number_id
    send_url = f"https://graph.facebook.com/{settings.meta_api_version}/{phone_number_id}/messages"
    payload = {"messaging_product": "whatsapp", "to": wa_id, "type": "text", "text": {"body": body}}
    params = {"access_token": access_token}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(send_url, json=payload, params=params)
            resp.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to send WhatsApp message via Graph API: %s", exc, exc_info=True)
        raise

    assistant_message = Message(
        id=str(uuid.uuid4()),
        conversation_id=conversation.id,
        role=MessageRole.ASSISTANT,
        content=body,
        created_at=now,
        message_metadata={
            WHATSAPP_CHANNEL_METADATA_KEY: WHATSAPP_CHANNEL_NAME,
            "direction": "outbound",
            "whatsapp_thread_id": thread_id,
            "from": business_number,
            "to": wa_id,
            "provider_sent": True,
        },
    )
    session.add(assistant_message)
    conversation.last_activity_at = now
    await session.commit()

    return assistant_message.to_dict()

