from __future__ import annotations

"""
Facebook Messenger channel service (J3.1).

Responsibilities:
- Convert inbound Messenger payloads into conversations/messages.
- List Messenger threads and messages for an admin.
- Send outbound Messenger replies (optionally via an outbound webhook).
"""

import logging
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

import httpx
import json
from sqlalchemy import select

from ..config import settings
from ..models.base import get_session_factory
from ..models.conversation import Conversation
from ..models.message import Message, MessageRole
from ..services.database import get_effective_tenant_id
from ..models.channel_config import ChannelConfig
from ..services.crypto import decrypt

logger = logging.getLogger(__name__)


MESSENGER_CHANNEL_METADATA_KEY = "channel"
MESSENGER_CHANNEL_NAME = "messenger"


@dataclass
class MessengerThreadSummary:
    thread_id: str
    last_message_at: str
    sender_id: Optional[str]
    page_id: Optional[str]
    message_count: int


def _build_thread_id(sender_id: str, page_id: str) -> str:
    """
    Build a stable thread identifier for a Messenger conversation.
    """
    return f"{sender_id}->{page_id}"


async def create_inbound_messenger_message(
    user_id: str,
    sender_id: str,
    page_id: str,
    body: str,
    provider_message_id: Optional[str] = None,
    attachments: Optional[List[Dict[str, Any]]] = None,
) -> dict:
    """
    Create an inbound Messenger message, converting it into a conversation/message.

    attachments can be used to represent rich media (images, documents, etc.).
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        # Resolve the correct tenant_id from user_id
        effective_tenant_id = await get_effective_tenant_id(user_id=user_id, session=session)
        
        thread_id = _build_thread_id(sender_id, page_id)
        session_identifier = f"{MESSENGER_CHANNEL_NAME}-{thread_id}"

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
            MESSENGER_CHANNEL_METADATA_KEY: MESSENGER_CHANNEL_NAME,
            "direction": "inbound",
            "messenger_thread_id": thread_id,
            "from": sender_id,
            "to": page_id,
            "provider_message_id": provider_message_id,
        }
        if attachments:
            metadata["attachments"] = attachments

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
        # route through universal message router
        from ..services.message_router import route_message
        from ..models.message_event import MessageEvent

        event = MessageEvent(
            tenant_id=effective_tenant_id,
            channel=MESSENGER_CHANNEL_NAME,
            channel_user_id=sender_id,
            channel_conversation_id=thread_id,
            contact_phone=None,
            contact_email=None,
            contact_name=None,
            contact_avatar_url=None,
            message_id=provider_message_id or message.id,
            message_type="text",
            text=body,
            raw_payload={"from": sender_id, "to": page_id},
            timestamp=now,
            reply_to_message_id=None,
            media_url=None,
            media_type=None,
            media_caption=None,
            button_payload=None,
            selected_option=None,
        )
        try:
            await route_message(event, session)
        except Exception:
            logger.exception("error routing messenger message")
        return message.to_dict()


async def list_messenger_threads(
    user_id: str,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[MessengerThreadSummary], int]:
    """
    List Messenger threads for the given admin user.
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
            if metadata.get(MESSENGER_CHANNEL_METADATA_KEY) != MESSENGER_CHANNEL_NAME:
                continue

            thread_id = metadata.get("messenger_thread_id")
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
                    "sender_id": metadata.get("from"),
                    "page_id": metadata.get("to"),
                    "message_count": 1,
                }
            else:
                existing["message_count"] += 1
                if created_at_iso > existing["last_message_at"]:
                    existing["last_message_at"] = created_at_iso

        all_threads = [
            MessengerThreadSummary(
                thread_id=t["thread_id"],
                last_message_at=t["last_message_at"],
                sender_id=t["sender_id"],
                page_id=t["page_id"],
                message_count=t["message_count"],
            )
            for t in threads.values()
        ]

        all_threads.sort(key=lambda t: t.last_message_at, reverse=True)
        total = len(all_threads)
        return all_threads[offset : offset + limit], total


async def list_messenger_thread_messages(user_id: str, thread_id: str) -> List[dict]:
    """
    List messages for a specific Messenger thread.
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
                Message.message_metadata["messenger_thread_id"].as_string() == thread_id,
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


async def send_messenger_reply(user_id: str, thread_id: str, body: str) -> dict:
    """
    Send a Messenger reply for a given thread and persist it as an assistant message.

    If messenger_outbound_webhook_url is configured, this function will POST a JSON
    payload there so an external integration (e.g. Facebook Messenger API) can deliver it.
    """
    if not settings.messenger_channel_enabled:
        raise ValueError("Messenger channel is disabled")

    if not settings.messenger_page_id:
        raise ValueError("Messenger page ID is not configured")

    session_factory = get_session_factory()
    async with session_factory() as session:
        # Resolve the correct tenant_id from user_id
        effective_tenant_id = await get_effective_tenant_id(user_id=user_id, session=session)
        
        result = await session.execute(
            select(Message, Conversation)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                Conversation.tenant_id == effective_tenant_id,
                Message.message_metadata["messenger_thread_id"].as_string() == thread_id,
            )
            .order_by(Message.created_at.desc())
        )
        latest = result.first()
        if not latest:
            raise ValueError(f"No messages found for Messenger thread {thread_id}")

        latest_message, conversation = latest
        metadata = latest_message.message_metadata or {}

        sender_id = metadata.get("from")
        page_id = metadata.get("to") or settings.messenger_page_id

        if not sender_id or not page_id:
            raise ValueError("Messenger metadata missing from/to; cannot determine recipient")

        now = datetime.utcnow()

        if settings.messenger_outbound_webhook_url:
            payload = {
                "channel": MESSENGER_CHANNEL_NAME,
                "thread_id": thread_id,
                "from": page_id,
                "to": sender_id,
                "body": body,
                "user_id": user_id,
            }
            headers: Dict[str, str] = {"Content-Type": "application/json"}
            if settings.messenger_outbound_webhook_token:
                headers["Authorization"] = f"Bearer {settings.messenger_outbound_webhook_token}"

            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    response = await client.post(
                        settings.messenger_outbound_webhook_url,
                        json=payload,
                        headers=headers,
                    )
                    response.raise_for_status()
            except Exception as exc:  # noqa: BLE001
                logger.error(
                    "Error calling Messenger outbound webhook: %s", exc, exc_info=True
                )
                raise

            # Persist assistant message and return
            assistant_message = Message(
                id=str(uuid.uuid4()),
                conversation_id=conversation.id,
                role=MessageRole.ASSISTANT,
                content=body,
                created_at=now,
                message_metadata={
                    MESSENGER_CHANNEL_METADATA_KEY: MESSENGER_CHANNEL_NAME,
                    "direction": "outbound",
                    "messenger_thread_id": thread_id,
                    "from": settings.messenger_page_id,
                    "to": sender_id,
                },
            )
            session.add(assistant_message)
            conversation.last_activity_at = now
            await session.commit()

            return assistant_message.to_dict()

        # If outbound webhook is not configured, attempt to send via Facebook Graph API
        # using a stored page access token in ChannelConfig.oauth_tokens for this tenant.
        async with session_factory() as session2:
            stmt = select(ChannelConfig).where(
                ChannelConfig.tenant_id == effective_tenant_id,
                ChannelConfig.channel == "messenger",
            )
            res = await session2.execute(stmt)
            cfg = res.scalar_one_or_none()

        page_access_token = None
        # First check the persisted page_access_token in ChannelConfig.oauth_tokens
        if cfg and cfg.oauth_tokens:
            try:
                token_json = decrypt(cfg.oauth_tokens)
                token_data = json.loads(token_json)
            except Exception:
                token_data = json.loads(cfg.oauth_tokens)
            # Accept either explicit page_access_token or access_token keys
            page_access_token = token_data.get("page_access_token") or token_data.get("access_token")

        if not page_access_token:
            # No token available to call Graph API; persist message locally and return
            assistant_message = Message(
                id=str(uuid.uuid4()),
                conversation_id=conversation.id,
                role=MessageRole.ASSISTANT,
                content=body,
                created_at=now,
                message_metadata={
                    MESSENGER_CHANNEL_METADATA_KEY: MESSENGER_CHANNEL_NAME,
                    "direction": "outbound",
                    "messenger_thread_id": thread_id,
                    "from": page_id,
                    "to": sender_id,
                },
            )
            session.add(assistant_message)
            conversation.last_activity_at = now
            await session.commit()

            return assistant_message.to_dict()

        # Call Facebook Graph API to send message via page
        # Use page_id as the recipient page resource
        send_url = f"https://graph.facebook.com/{settings.meta_api_version}/{page_id}/messages"
        payload = {"recipient": {"id": sender_id}, "message": {"text": body}}
        params = {"access_token": page_access_token}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(send_url, json=payload, params=params)
                resp.raise_for_status()
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to send Messenger message via Graph API: %s", exc, exc_info=True)
            raise

        # Persist assistant message after successful send
        assistant_message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content=body,
            created_at=now,
            message_metadata={
                MESSENGER_CHANNEL_METADATA_KEY: MESSENGER_CHANNEL_NAME,
                "direction": "outbound",
                "messenger_thread_id": thread_id,
                "from": page_id,
                "to": sender_id,
                "provider_sent": True,
            },
        )
        session.add(assistant_message)
        conversation.last_activity_at = now
        await session.commit()

        return assistant_message.to_dict()
