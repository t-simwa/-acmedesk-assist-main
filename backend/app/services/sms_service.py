from __future__ import annotations

"""
SMS channel service (J2.1).

Responsibilities:
- Convert inbound SMS payloads into conversations/messages.
- List SMS threads and messages for an admin.
- Send outbound SMS replies (optionally via an outbound webhook).
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


SMS_CHANNEL_METADATA_KEY = "channel"
SMS_CHANNEL_NAME = "sms"


@dataclass
class SmsThreadSummary:
    thread_id: str
    last_message_at: str
    from_number: Optional[str]
    to_number: Optional[str]
    message_count: int


def _build_thread_id(from_number: str, to_number: str) -> str:
    """
    Build a stable thread identifier for an SMS conversation.

    For now we treat the pair (from, to) as the conversation key.
    """
    return f"{from_number}->{to_number}"


async def create_inbound_sms_message(
    user_id: str,
    from_number: str,
    to_number: str,
    body: str,
    provider_message_id: Optional[str] = None,
) -> dict:
    """
    Create an inbound SMS message, converting it into a conversation/message.

    This is intentionally provider-agnostic; any upstream integration that can
    supply from/to/body can call this service.
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        thread_id = _build_thread_id(from_number, to_number)
        session_identifier = f"{SMS_CHANNEL_NAME}-{thread_id}"

        # Ensure conversation exists for this admin and thread
        result = await session.execute(
            select(Conversation).where(
                Conversation.session_id == session_identifier,
                Conversation.user_id == user_id,
            )
        )
        conversation = result.scalar_one_or_none()

        now = datetime.utcnow()

        if conversation is None:
            conversation = Conversation(
                id=str(uuid.uuid4()),
                user_id=user_id,
                session_id=session_identifier,
                started_at=now,
                last_activity_at=now,
            )
            session.add(conversation)

        message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role="user",
            content=body or "",
            created_at=now,
            message_metadata={
                SMS_CHANNEL_METADATA_KEY: SMS_CHANNEL_NAME,
                "direction": "inbound",
                "sms_thread_id": thread_id,
                "from": from_number,
                "to": to_number,
                "provider_message_id": provider_message_id,
            },
        )
        session.add(message)
        conversation.last_activity_at = now

        await session.commit()
        return message.to_dict()


async def list_sms_threads(
    user_id: str,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[SmsThreadSummary], int]:
    """
    List SMS threads for the given admin user.

    Threads are grouped by sms_thread_id in message metadata.
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Message, Conversation)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(Conversation.user_id == user_id)
            .order_by(Message.created_at.desc())
        )
        rows = result.all()

        threads: Dict[str, Dict[str, Any]] = {}

        for message, _conversation in rows:
            metadata = message.message_metadata or {}
            if metadata.get(SMS_CHANNEL_METADATA_KEY) != SMS_CHANNEL_NAME:
                continue

            thread_id = metadata.get("sms_thread_id")
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
                    "from_number": metadata.get("from"),
                    "to_number": metadata.get("to"),
                    "message_count": 1,
                }
            else:
                existing["message_count"] += 1
                if created_at_iso > existing["last_message_at"]:
                    existing["last_message_at"] = created_at_iso

        all_threads = [
            SmsThreadSummary(
                thread_id=t["thread_id"],
                last_message_at=t["last_message_at"],
                from_number=t["from_number"],
                to_number=t["to_number"],
                message_count=t["message_count"],
            )
            for t in threads.values()
        ]

        all_threads.sort(key=lambda t: t.last_message_at, reverse=True)
        total = len(all_threads)
        return all_threads[offset : offset + limit], total


async def list_sms_thread_messages(user_id: str, thread_id: str) -> List[dict]:
    """
    List messages for a specific SMS thread.
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Message, Conversation)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                Conversation.user_id == user_id,
                Message.message_metadata["sms_thread_id"].as_string() == thread_id,
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


async def send_sms_reply(user_id: str, thread_id: str, body: str) -> dict:
    """
    Send an SMS reply for a given thread and persist it as an assistant message.

    If sms_outbound_webhook_url is configured, this function will POST a JSON
    payload there so an external integration (e.g. Twilio, SNS) can deliver it.
    """
    if not settings.sms_channel_enabled:
        raise ValueError("SMS channel is disabled")

    if not settings.sms_default_from_number:
        raise ValueError("SMS default from number is not configured")

    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Message, Conversation)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                Conversation.user_id == user_id,
                Message.message_metadata["sms_thread_id"].as_string() == thread_id,
            )
            .order_by(Message.created_at.desc())
        )
        latest = result.first()
        if not latest:
            raise ValueError(f"No messages found for SMS thread {thread_id}")

        latest_message, conversation = latest
        metadata = latest_message.message_metadata or {}

        # We always reply to the counterparty in the last message.
        last_from = metadata.get("from")
        last_to = metadata.get("to")

        if not last_from or not last_to:
            raise ValueError("SMS metadata missing from/to; cannot determine recipient")

        # Determine recipient number (the non-default number)
        default_from = settings.sms_default_from_number
        if last_from == default_from:
            recipient_number = last_to
        else:
            recipient_number = last_from

        now = datetime.utcnow()

        # Optionally call outbound webhook so an external provider can deliver the SMS
        if settings.sms_outbound_webhook_url:
            payload = {
                "channel": SMS_CHANNEL_NAME,
                "thread_id": thread_id,
                "from": default_from,
                "to": recipient_number,
                "body": body,
                "user_id": user_id,
            }
            headers: Dict[str, str] = {"Content-Type": "application/json"}
            if settings.sms_outbound_webhook_token:
                headers["Authorization"] = f"Bearer {settings.sms_outbound_webhook_token}"

            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    response = await client.post(
                        settings.sms_outbound_webhook_url,
                        json=payload,
                        headers=headers,
                    )
                    response.raise_for_status()
            except Exception as exc:  # noqa: BLE001
                logger.error("Error calling SMS outbound webhook: %s", exc, exc_info=True)
                raise

        assistant_message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role="assistant",
            content=body,
            created_at=now,
            message_metadata={
                SMS_CHANNEL_METADATA_KEY: SMS_CHANNEL_NAME,
                "direction": "outbound",
                "sms_thread_id": thread_id,
                "from": settings.sms_default_from_number,
                "to": recipient_number,
            },
        )
        session.add(assistant_message)
        conversation.last_activity_at = now
        await session.commit()

        return assistant_message.to_dict()

