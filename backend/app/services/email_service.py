from __future__ import annotations

"""
Email channel service.

Responsibilities:
- Fetch messages from an email inbox (IMAP) and convert them into conversations/messages.
- Send outbound email replies for a given email thread.

This module is intentionally conservative:
- If email channel configuration is incomplete, it will no-op gracefully.
- Network/protocol errors are logged and surfaced as exceptions to the API layer.
"""

import email
import imaplib
import logging
import smtplib
import uuid
from dataclasses import dataclass
from email.message import EmailMessage
from typing import List, Optional, Dict, Any

from sqlalchemy import select

from ..config import settings
from ..models.base import get_session_factory
from ..models.conversation import Conversation
from ..models.message import Message

logger = logging.getLogger(__name__)


EMAIL_CHANNEL_METADATA_KEY = "channel"
EMAIL_CHANNEL_NAME = "email"


@dataclass
class EmailThreadSummary:
    thread_id: str
    subject: str
    last_message_at: str
    from_address: Optional[str]
    to_address: Optional[str]
    message_count: int


def _is_email_channel_enabled() -> bool:
    """Return True if the email channel is enabled and minimally configured."""
    if not settings.email_channel_enabled:
        return False
    if not settings.email_imap_host or not settings.email_imap_username or not settings.email_imap_password:
        logger.warning("Email channel enabled but IMAP configuration is incomplete")
        return False
    return True


async def fetch_and_store_new_emails(user_id: str) -> int:
    """
    Fetch new emails from the configured IMAP inbox and store them as conversation messages.

    Args:
        user_id: Admin user ID performing the sync; used as owner of created conversations.

    Returns:
        Number of new email messages imported.
    """
    if not _is_email_channel_enabled():
        logger.info("Email channel is disabled or not configured; skipping inbox sync")
        return 0

    imported_count = 0

    try:
        if settings.email_imap_use_ssl:
            imap = imaplib.IMAP4_SSL(settings.email_imap_host, settings.email_imap_port)
        else:
            imap = imaplib.IMAP4(settings.email_imap_host, settings.email_imap_port)

        imap.login(settings.email_imap_username, settings.email_imap_password)
        imap.select(settings.email_imap_mailbox)

        # Fetch only unseen messages to avoid duplicates
        status, data = imap.search(None, "UNSEEN")
        if status != "OK":
            logger.warning("IMAP search for UNSEEN messages failed: %s", status)
            imap.logout()
            return 0

        message_ids = data[0].split()
        if not message_ids:
            imap.logout()
            return 0

        session_factory = get_session_factory()
        async with session_factory() as session:
            for msg_id in message_ids:
                status, msg_data = imap.fetch(msg_id, "(RFC822)")
                if status != "OK" or not msg_data:
                    logger.warning("IMAP fetch failed for id=%s: %s", msg_id, status)
                    continue

                _, raw_bytes = msg_data[0]
                msg = email.message_from_bytes(raw_bytes)

                subject = str(email.header.make_header(email.header.decode_header(msg.get("Subject", ""))))
                from_addr = msg.get("From", "")
                to_addr = msg.get("To", "")
                message_id = msg.get("Message-ID", str(uuid.uuid4()))
                in_reply_to = msg.get("In-Reply-To")
                references = msg.get("References")

                # Compute a stable thread identifier
                thread_id = (in_reply_to or references or message_id or str(uuid.uuid4())).strip()

                # Flatten text parts for content
                body_parts: List[str] = []
                attachment_filenames: List[str] = []

                if msg.is_multipart():
                    for part in msg.walk():
                        content_disposition = part.get("Content-Disposition", "")
                        filename = part.get_filename()

                        if filename:
                            decoded_name = str(
                                email.header.make_header(email.header.decode_header(filename))
                            )
                            attachment_filenames.append(decoded_name)

                        content_type = part.get_content_type()
                        if content_type == "text/plain" and "attachment" not in content_disposition.lower():
                            try:
                                charset = part.get_content_charset() or "utf-8"
                                payload = part.get_payload(decode=True)
                                if payload is not None:
                                    body_parts.append(payload.decode(charset, errors="replace"))
                            except Exception:
                                continue
                else:
                    try:
                        charset = msg.get_content_charset() or "utf-8"
                        payload = msg.get_payload(decode=True)
                        if payload is not None:
                            body_parts.append(payload.decode(charset, errors="replace"))
                    except Exception:
                        pass

                body = "\n".join(body_parts).strip() or "(no content)"

                # Ensure conversation exists for thread (per-admin owner)
                session_identifier = f"email-{thread_id}"
                result = await session.execute(
                    select(Conversation).where(
                        Conversation.session_id == session_identifier,
                        Conversation.user_id == user_id,
                    )
                )
                conversation = result.scalar_one_or_none()

                if conversation is None:
                    conversation_id = str(uuid.uuid4())
                    conversation = Conversation(
                        id=conversation_id,
                        user_id=user_id,
                        session_id=session_identifier,
                        started_at=email.utils.parsedate_to_datetime(msg.get("Date"))
                        if msg.get("Date")
                        else None,
                        last_activity_at=email.utils.parsedate_to_datetime(msg.get("Date"))
                        if msg.get("Date")
                        else None,
                    )
                    session.add(conversation)
                else:
                    conversation_id = conversation.id

                # Create inbound email message
                message_record = Message(
                    id=str(uuid.uuid4()),
                    conversation_id=conversation_id,
                    role="user",
                    content=body,
                    created_at=email.utils.parsedate_to_datetime(msg.get("Date"))
                    if msg.get("Date")
                    else None,
                    message_metadata={
                        EMAIL_CHANNEL_METADATA_KEY: EMAIL_CHANNEL_NAME,
                        "direction": "inbound",
                        "email_message_id": message_id,
                        "email_thread_id": thread_id,
                        "subject": subject,
                        "from": from_addr,
                        "to": to_addr,
                        "attachments": attachment_filenames,
                    },
                )
                session.add(message_record)
                conversation.last_activity_at = message_record.created_at

                imported_count += 1

            await session.commit()

        imap.logout()
        logger.info("Imported %s new email messages", imported_count)
        return imported_count

    except Exception as exc:
        logger.error("Error during email inbox sync: %s", exc, exc_info=True)
        raise


async def list_email_threads(user_id: str, limit: int = 50, offset: int = 0) -> tuple[List[EmailThreadSummary], int]:
    """
    List email threads for the given user, derived from message metadata.
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Fetch all messages for this user that belong to the email channel.
            # We use a simple in-Python grouping to avoid DB JSON dialect differences.
            result = await session.execute(
                select(Message, Conversation)
                .join(Conversation, Message.conversation_id == Conversation.id)
                .where(
                    Conversation.user_id == user_id,
                )
                .order_by(Message.created_at.desc())
            )
            rows = result.all()

            threads: Dict[str, Dict[str, Any]] = {}

            for message, conversation in rows:
                metadata = message.message_metadata or {}
                if metadata.get(EMAIL_CHANNEL_METADATA_KEY) != EMAIL_CHANNEL_NAME:
                    continue

                thread_id = metadata.get("email_thread_id")
                if not thread_id:
                    continue

                existing = threads.get(thread_id)
                created_at_iso = (
                    message.created_at.isoformat() + "Z" if message.created_at else ""
                )

                if not existing:
                    threads[thread_id] = {
                        "thread_id": thread_id,
                        "subject": metadata.get("subject", "(no subject)"),
                        "last_message_at": created_at_iso,
                        "from_address": metadata.get("from"),
                        "to_address": metadata.get("to"),
                        "message_count": 1,
                    }
                else:
                    existing["message_count"] += 1
                    # Keep the most recent timestamp
                    if created_at_iso > existing["last_message_at"]:
                        existing["last_message_at"] = created_at_iso

            all_threads = [
                EmailThreadSummary(
                    thread_id=t["thread_id"],
                    subject=t["subject"],
                    last_message_at=t["last_message_at"],
                    from_address=t["from_address"],
                    to_address=t["to_address"],
                    message_count=t["message_count"],
                )
                for t in threads.values()
            ]

            # Sort by last_message_at descending
            all_threads.sort(key=lambda t: t.last_message_at, reverse=True)
            total = len(all_threads)

            return all_threads[offset : offset + limit], total

        except Exception as exc:
            logger.error("Error listing email threads: %s", exc, exc_info=True)
            raise


async def list_email_thread_messages(user_id: str, thread_id: str) -> List[dict]:
    """
    List messages for a specific email thread.
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(
                select(Message, Conversation)
                .join(Conversation, Message.conversation_id == Conversation.id)
                .where(
                    Conversation.user_id == user_id,
                    Message.message_metadata["email_thread_id"].as_string() == thread_id,
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

        except Exception as exc:
            logger.error("Error listing email thread messages: %s", exc, exc_info=True)
            raise


def _build_email_message(
    subject: str,
    body: str,
    from_email: str,
    to_email: str,
    reply_to_message_id: Optional[str] = None,
) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    if reply_to_message_id:
        msg["In-Reply-To"] = reply_to_message_id
        msg["References"] = reply_to_message_id
    msg.set_content(body)
    return msg


async def send_email_reply(
    user_id: str,
    thread_id: str,
    body: str,
) -> dict:
    """
    Send an email reply for a given email thread and persist it as an assistant message.

    For simplicity we:
    - Use SMTP configuration from settings.
    - Use the last inbound email in the thread as the reply target.
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Find the latest inbound email in this thread to reply to
            result = await session.execute(
                select(Message, Conversation)
                .join(Conversation, Message.conversation_id == Conversation.id)
                .where(
                    Conversation.user_id == user_id,
                    Message.message_metadata["email_thread_id"].as_string() == thread_id,
                )
                .order_by(Message.created_at.desc())
            )
            latest = result.first()
            if not latest:
                raise ValueError(f"No messages found for email thread {thread_id}")

            latest_message, conversation = latest
            metadata = latest_message.message_metadata or {}

            original_from = metadata.get("from")
            original_to = metadata.get("to") or settings.smtp_from_email
            original_subject = metadata.get("subject", "(no subject)")
            original_message_id = metadata.get("email_message_id")

            if not original_from:
                raise ValueError("Original email 'from' address is missing; cannot send reply")

            # Build reply subject
            reply_subject = original_subject
            if not reply_subject.lower().startswith("re:"):
                reply_subject = f"Re: {reply_subject}"

            from_email = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
            to_email = original_from

            msg = _build_email_message(
                subject=reply_subject,
                body=body,
                from_email=from_email,
                to_email=to_email,
                reply_to_message_id=original_message_id,
            )

            # Send via SMTP
            try:
                if settings.smtp_use_tls:
                    server = smtplib.SMTP(settings.smtp_host, settings.smtp_port)
                    server.starttls()
                else:
                    server = smtplib.SMTP(settings.smtp_host, settings.smtp_port)

                if settings.smtp_username and settings.smtp_password:
                    server.login(settings.smtp_username, settings.smtp_password)

                server.send_message(msg)
                server.quit()
            except Exception as exc:
                logger.error("Error sending SMTP email: %s", exc, exc_info=True)
                raise

            # Persist reply as assistant message in conversation
            assistant_message = Message(
                id=str(uuid.uuid4()),
                conversation_id=conversation.id,
                role="assistant",
                content=body,
                created_at=None,
                message_metadata={
                    EMAIL_CHANNEL_METADATA_KEY: EMAIL_CHANNEL_NAME,
                    "direction": "outbound",
                    "email_thread_id": thread_id,
                    "subject": reply_subject,
                    "from": original_to,
                    "to": original_from,
                },
            )
            session.add(assistant_message)
            await session.commit()

            return assistant_message.to_dict()

        except Exception as exc:
            logger.error("Error sending email reply for thread %s: %s", thread_id, exc, exc_info=True)
            raise

