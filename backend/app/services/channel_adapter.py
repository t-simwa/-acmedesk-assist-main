from __future__ import annotations

"""
Channel Adapter base class (9.1).

Provides a uniform interface for all channel services.
"""

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import httpx
from sqlalchemy import select

from ..models.base import get_session_factory
from ..models.conversation import Conversation
from ..models.message import Message

logger = logging.getLogger(__name__)


@dataclass
class ThreadSummary:
    """Channel-agnostic thread summary."""
    thread_id: str
    last_message_at: str
    sender_id: Optional[str] = None
    recipient_id: Optional[str] = None
    message_count: int = 0
    extra: Dict[str, Any] = field(default_factory=dict)


class ChannelAdapter:
    """Base class for omnichannel service adapters."""

    CHANNEL_NAME: str = ""
    THREAD_ID_KEY: str = ""
    METADATA_CHANNEL_KEY: str = "channel"

    @staticmethod
    def _build_thread_id(sender_id: str, recipient_id: str) -> str:
        return f"{sender_id}->{recipient_id}"

    async def create_inbound_message(
        self, user_id: str, sender_id: str, recipient_id: str, body: str,
        *, provider_message_id: Optional[str] = None,
        extra_metadata: Optional[Dict[str, Any]] = None,
    ) -> dict:
        session_factory = get_session_factory()
        async with session_factory() as session:
            thread_id = self._build_thread_id(sender_id, recipient_id)
            session_identifier = f"{self.CHANNEL_NAME}-{thread_id}"
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
                    id=str(uuid.uuid4()), tenant_id=user_id,
                    session_id=session_identifier, started_at=now, last_activity_at=now,
                )
                session.add(conversation)
            metadata: Dict[str, Any] = {
                self.METADATA_CHANNEL_KEY: self.CHANNEL_NAME,
                "direction": "inbound", self.THREAD_ID_KEY: thread_id,
                "from": sender_id, "to": recipient_id,
                "provider_message_id": provider_message_id,
            }
            if extra_metadata:
                metadata.update(extra_metadata)
            message = Message(
                id=str(uuid.uuid4()), conversation_id=conversation.id,
                role="user", content=body or "", created_at=now,
                message_metadata=metadata,
            )
            session.add(message)
            conversation.last_activity_at = now
            await session.commit()
            return message.to_dict()

    async def list_threads(
        self, user_id: str, limit: int = 50, offset: int = 0,
    ) -> Tuple[List[ThreadSummary], int]:
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
            for message, _conv in rows:
                md = message.message_metadata or {}
                if md.get(self.METADATA_CHANNEL_KEY) != self.CHANNEL_NAME:
                    continue
                tid = md.get(self.THREAD_ID_KEY)
                if not tid:
                    continue
                ts = message.created_at.isoformat() + "Z" if message.created_at else ""
                ex = threads.get(tid)
                if not ex:
                    threads[tid] = {
                        "thread_id": tid, "last_message_at": ts,
                        "sender_id": md.get("from"), "recipient_id": md.get("to"),
                        "message_count": 1,
                    }
                else:
                    ex["message_count"] += 1
                    if ts > ex["last_message_at"]:
                        ex["last_message_at"] = ts
            all_t = [
                ThreadSummary(
                    thread_id=t["thread_id"], last_message_at=t["last_message_at"],
                    sender_id=t["sender_id"], recipient_id=t["recipient_id"],
                    message_count=t["message_count"],
                ) for t in threads.values()
            ]
            all_t.sort(key=lambda x: x.last_message_at, reverse=True)
            total = len(all_t)
            return all_t[offset:offset + limit], total

    async def list_thread_messages(self, user_id: str, thread_id: str) -> List[dict]:
        session_factory = get_session_factory()
        async with session_factory() as session:
            result = await session.execute(
                select(Message, Conversation)
                .join(Conversation, Message.conversation_id == Conversation.id)
                .where(
                    Conversation.tenant_id == user_id,
                    Message.message_metadata[self.THREAD_ID_KEY].as_string() == thread_id,
                )
                .order_by(Message.created_at.asc())
            )
            rows = result.all()
            messages: List[dict] = []
            for message, _conv in rows:
                data = message.to_dict()
                data["metadata"] = message.message_metadata or {}
                messages.append(data)
            return messages

    async def send_reply(
        self, user_id: str, thread_id: str, body: str, *,
        channel_enabled: bool, default_sender_id: Optional[str],
        outbound_webhook_url: Optional[str] = None,
        outbound_webhook_token: Optional[str] = None,
    ) -> dict:
        if not channel_enabled:
            raise ValueError(f"{self.CHANNEL_NAME.title()} channel is disabled")
        if not default_sender_id:
            raise ValueError(f"{self.CHANNEL_NAME.title()} default sender ID is not configured")
        session_factory = get_session_factory()
        async with session_factory() as session:
            result = await session.execute(
                select(Message, Conversation)
                .join(Conversation, Message.conversation_id == Conversation.id)
                .where(
                    Conversation.tenant_id == user_id,
                    Message.message_metadata[self.THREAD_ID_KEY].as_string() == thread_id,
                )
                .order_by(Message.created_at.desc())
            )
            latest = result.first()
            if not latest:
                raise ValueError(f"No messages found for {self.CHANNEL_NAME} thread {thread_id}")
            latest_message, conversation = latest
            md = latest_message.message_metadata or {}
            sender_id = md.get("from")
            recipient_id = md.get("to") or default_sender_id
            if not sender_id or not recipient_id:
                raise ValueError(f"{self.CHANNEL_NAME.title()} metadata missing from/to")
            now = datetime.utcnow()
            if outbound_webhook_url:
                payload = {
                    "channel": self.CHANNEL_NAME, "thread_id": thread_id,
                    "from": default_sender_id, "to": sender_id,
                    "body": body, "user_id": user_id,
                }
                headers: Dict[str, str] = {"Content-Type": "application/json"}
                if outbound_webhook_token:
                    headers["Authorization"] = f"Bearer {outbound_webhook_token}"
                try:
                    async with httpx.AsyncClient(timeout=10) as client:
                        resp = await client.post(outbound_webhook_url, json=payload, headers=headers)
                        resp.raise_for_status()
                except Exception as exc:
                    logger.error("Error calling %s outbound webhook: %s", self.CHANNEL_NAME, exc, exc_info=True)
                    raise
            assistant_message = Message(
                id=str(uuid.uuid4()), conversation_id=conversation.id,
                role="assistant", content=body, created_at=now,
                message_metadata={
                    self.METADATA_CHANNEL_KEY: self.CHANNEL_NAME,
                    "direction": "outbound", self.THREAD_ID_KEY: thread_id,
                    "from": default_sender_id, "to": sender_id,
                },
            )
            session.add(assistant_message)
            conversation.last_activity_at = now
            await session.commit()
            return assistant_message.to_dict()
