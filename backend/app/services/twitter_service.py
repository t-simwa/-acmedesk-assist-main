from __future__ import annotations

"""
Twitter/X channel service (J3.2).

Responsibilities:
- Convert inbound Twitter DM payloads into conversations/messages.
- List Twitter DM threads and messages for an admin.
- Send outbound Twitter DM replies (optionally via an outbound webhook).
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
from ..models.message import Message

logger = logging.getLogger(__name__)


TWITTER_CHANNEL_METADATA_KEY = "channel"
TWITTER_CHANNEL_NAME = "twitter"


@dataclass
class TwitterThreadSummary:
    thread_id: str
    last_message_at: str
    sender_id: Optional[str]
    account_id: Optional[str]
    message_count: int


def _build_thread_id(sender_id: str, account_id: str) -> str:
    """
    Build a stable thread identifier for a Twitter DM conversation.
    """
    return f"{sender_id}->{account_id}"


async def create_inbound_twitter_message(
    user_id: str,
    sender_id: str,
    account_id: str,
    body: str,
    provider_message_id: Optional[str] = None,
    media_urls: Optional[List[str]] = None,
) -> dict:
    """
    Create an inbound Twitter DM message, converting it into a conversation/message.

    media_urls can be used to represent images or other media attached to the DM.
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        thread_id = _build_thread_id(sender_id, account_id)
        session_identifier = f"{TWITTER_CHANNEL_NAME}-{thread_id}"

        result = await session.execute(
            select(Conversation).where(
                Conversation.session_id == session_identifier,
                Conversation.tenant_id == user_id,
            )
        )
        conversation = result.scalar_one_or_none()

        now = datetime.utcnow()

        if conversation is None:
            conversation = Conversation(
                id=str(uuid.uuid4()),
                tenant_id =user_id,
                session_id=session_identifier,
                started_at=now,
                last_activity_at=now,
            )
            session.add(conversation)

        metadata: Dict[str, Any] = {
            TWITTER_CHANNEL_METADATA_KEY: TWITTER_CHANNEL_NAME,
            "direction": "inbound",
            "twitter_thread_id": thread_id,
            "from": sender_id,
            "to": account_id,
            "provider_message_id": provider_message_id,
        }
        if media_urls:
            metadata["media_urls"] = media_urls

        message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role="user",
            content=body or "",
            created_at=now,
            message_metadata=metadata,
        )
        session.add(message)
        conversation.last_activity_at = now

        await session.commit()
        return message.to_dict()


async def list_twitter_threads(
    user_id: str,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[TwitterThreadSummary], int]:
    """
    List Twitter DM threads for the given admin user.
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Message, Conversation)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(Conversation.tenant_id == user_id)
            .order_by(Message.created_at.desc())
        )
        rows = result.all()

        threads: Dict[str, Dict[str, Any]] = {}

        for message, _conversation in rows:
            metadata = message.message_metadata or {}
            if metadata.get(TWITTER_CHANNEL_METADATA_KEY) != TWITTER_CHANNEL_NAME:
                continue

            thread_id = metadata.get("twitter_thread_id")
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
                    "account_id": metadata.get("to"),
                    "message_count": 1,
                }
            else:
                existing["message_count"] += 1
                if created_at_iso > existing["last_message_at"]:
                    existing["last_message_at"] = created_at_iso

        all_threads = [
            TwitterThreadSummary(
                thread_id=t["thread_id"],
                last_message_at=t["last_message_at"],
                sender_id=t["sender_id"],
                account_id=t["account_id"],
                message_count=t["message_count"],
            )
            for t in threads.values()
        ]

        all_threads.sort(key=lambda t: t.last_message_at, reverse=True)
        total = len(all_threads)
        return all_threads[offset : offset + limit], total


async def list_twitter_thread_messages(user_id: str, thread_id: str) -> List[dict]:
    """
    List messages for a specific Twitter DM thread.
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Message, Conversation)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                Conversation.tenant_id == user_id,
                Message.message_metadata["twitter_thread_id"].as_string() == thread_id,
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


async def send_twitter_reply(user_id: str, thread_id: str, body: str) -> dict:
    """
    Send a Twitter DM reply for a given thread and persist it as an assistant message.

    If twitter_outbound_webhook_url is configured, this function will POST a JSON
    payload there so an external integration (e.g. Twitter API) can deliver it.
    """
    if not settings.twitter_channel_enabled:
        raise ValueError("Twitter channel is disabled")

    if not settings.twitter_account_id:
        raise ValueError("Twitter account ID is not configured")

    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Message, Conversation)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                Conversation.tenant_id == user_id,
                Message.message_metadata["twitter_thread_id"].as_string() == thread_id,
            )
            .order_by(Message.created_at.desc())
        )
        latest = result.first()
        if not latest:
            raise ValueError(f"No messages found for Twitter thread {thread_id}")

        latest_message, conversation = latest
        metadata = latest_message.message_metadata or {}

        sender_id = metadata.get("from")
        account_id = metadata.get("to") or settings.twitter_account_id

        if not sender_id or not account_id:
            raise ValueError("Twitter metadata missing from/to; cannot determine recipient")

        now = datetime.utcnow()

        if settings.twitter_outbound_webhook_url:
            payload = {
                "channel": TWITTER_CHANNEL_NAME,
                "thread_id": thread_id,
                "from": account_id,
                "to": sender_id,
                "body": body,
                "user_id": user_id,
            }
            headers: Dict[str, str] = {"Content-Type": "application/json"}
            if settings.twitter_outbound_webhook_token:
                headers["Authorization"] = f"Bearer {settings.twitter_outbound_webhook_token}"

            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    response = await client.post(
                        settings.twitter_outbound_webhook_url,
                        json=payload,
                        headers=headers,
                    )
                    response.raise_for_status()
            except Exception as exc:  # noqa: BLE001
                logger.error(
                    "Error calling Twitter outbound webhook: %s", exc, exc_info=True
                )
                raise

        assistant_message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role="assistant",
            content=body,
            created_at=now,
            message_metadata={
                TWITTER_CHANNEL_METADATA_KEY: TWITTER_CHANNEL_NAME,
                "direction": "outbound",
                "twitter_thread_id": thread_id,
                "from": settings.twitter_account_id,
                "to": sender_id,
            },
        )
        session.add(assistant_message)
        conversation.last_activity_at = now
        await session.commit()

        return assistant_message.to_dict()
