from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.conversation import Conversation, ConversationStatus
from ..models.message import Message, MessageRole
from ..models.chatbot_instance import ChatbotInstance
from ..models.contact import Contact
from ..config import get_settings
from ..services import rag
from ..models.base import get_session_factory
from .contact_unification import (
    resolve_or_create_contact,
    send_returning_customer_greeting,
    check_opt_out,
)
from .business_hours import is_within_business_hours, get_outside_hours_response
from .escalation import check_and_trigger_escalation
from .channel_formatter import ChannelFormatter

logger = logging.getLogger(__name__)


async def route_message(event, db: AsyncSession) -> None:
    """Central router invoked by all channel adapters/webhooks.

    This function implements the universal pipeline described in spec,
    and is idempotent per event.message_id.
    """
    tenant_id = event.tenant_id
    message_id = event.message_id

    # dedup using contact_events table or redis; simple DB check for now
    existing = await db.execute(
        select(Message).where(Message.message_metadata['provider_message_id'].as_string() == message_id)
    )
    if existing.scalar_one_or_none():
        logger.debug("message %s already processed, skipping", message_id)
        return

    # resolve or create contact
    contact, returning = await resolve_or_create_contact(tenant_id, event, db)

    # find/create conversation
    session_identifier = f"{event.channel}-{event.channel_conversation_id}"
    result = await db.execute(
        select(Conversation).where(
            Conversation.session_id == session_identifier,
            Conversation.tenant_id == tenant_id,
        )
    )
    conversation = result.scalar_one_or_none()
    now = datetime.utcnow()
    if conversation is None:
        conversation = Conversation(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            session_id=session_identifier,
            channel=event.channel,
            channel_conversation_id=event.channel_conversation_id,
            status=ConversationStatus.ACTIVE,
            started_at=now,
            last_activity_at=now,
            contact_id=contact.id,
        )
        db.add(conversation)
        await db.commit()

    # save user message
    msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conversation.id,
        role=MessageRole.USER,
        content=event.text or "",
        created_at=now,
        message_metadata={
            "channel": event.channel,
            "provider_message_id": message_id,
            "from": event.channel_user_id,
            "to": None,
        },
    )
    db.add(msg)
    conversation.last_activity_at = now
    await db.commit()

    # human takeover concept deprecated; messages always processed by AI unless escalated

    # load chatbot config
    settings = get_settings()
    async with db as session:
        result = await session.execute(
            select(ChatbotInstance).where(ChatbotInstance.tenant_id == tenant_id)
        )
        chatbot = result.scalar_one_or_none()

    # check chatbot status
    if chatbot and chatbot.status != "live":
        # send paused message
        paused_msg = chatbot.paused_message or "The chatbot is currently paused."
        await _send_channel_response(event.channel, event.channel_user_id, paused_msg, channel=event.channel, db=db)
        return

    # check conversation limits - placeholder
    # (not implemented, assume OK)

    # business hours
    if chatbot:
        tz = getattr(settings, 'default_timezone', 'UTC')
        open_flag, next_open = is_within_business_hours(chatbot, tz)
        if not open_flag:
            behaviour = chatbot.outside_hours_behavior or "continue"
            msg_text, notice = get_outside_hours_response(chatbot, next_open, event.channel, behaviour)
            if msg_text is not None:
                await _send_channel_response(event.channel, event.channel_user_id, msg_text, channel=event.channel, db=db)
                return
            else:
                # append notice later to ai response
                extra_notice = notice
        else:
            extra_notice = None
    else:
        extra_notice = None

    # media processing: TODO (Whisper, Vision) - not implemented here

    # run RAG pipeline
    history = []
    result = await db.execute(
        select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at.asc()).limit(10)
    )
    for m in result.scalars().all():
        history.append({"role": m.role, "content": m.content, "timestamp": m.created_at.isoformat()})

    # build dynamic system prompt using prompt_builder if chatbot exists
    system_prompt = None
    if chatbot:
        from .prompt_builder import build_system_prompt
        from ..models.tenant import Tenant
        # fetch tenant record
        async with get_session_factory()() as tsession:
            tres = await tsession.execute(select(Tenant).where(Tenant.id == tenant_id))
            tenant = tres.scalar_one_or_none() or Tenant(id=tenant_id, business_name="", business_description="", industry="")
        business_hours_active = True
        try:
            business_hours_active, _ = is_within_business_hours(chatbot, get_settings().default_timezone)
        except Exception:
            business_hours_active = True
        system_prompt = build_system_prompt(
            chatbot_config=chatbot,
            tenant=tenant,
            channel=event.channel,
            business_hours_active=business_hours_active,
            conversation_context={},
        )

    rag_answer, sources, low_conf = await rag.process_chat_query(
        query=event.text or "",
        channel=event.channel,
        user_id=contact.id,
        active_kb_ids=await _get_active_kb_ids(contact.id),
        fallback_message=(chatbot.fallback_message if chatbot else ""),
        system_prompt=system_prompt,
    )

    # escalate check
    escalated = False
    if chatbot:
        escalated = await check_and_trigger_escalation(
            conversation,
            event.text or "",
            rag_answer,
            max((s.score for s in sources), default=1.0),
            chatbot,
            history,
            db,
        )
    if escalated:
        # send escalation message
        esc_msg = chatbot.escalation_message or "I'll connect you with our team."
        await _send_channel_response(event.channel, event.channel_user_id, esc_msg, channel=event.channel, db=db)
        return

    # append notice if any
    if extra_notice:
        rag_answer += f"\n\n{extra_notice}"

    # if email channel, delegate to email processor which handles classification
    if event.channel == "email":
        from .channel_adapters.email_service import EmailProcessor
        # conversation already exists above; load chatbot_config earlier
        await EmailProcessor.send_email_response(conversation, rag_answer, sources, chatbot, db)
        return

    # format response for other channels
    formatted = ChannelFormatter.format_response(rag_answer, event.channel, options=None)

    # send response
    await _send_channel_formatted(event.channel, event.channel_user_id, formatted, db)

    # save assistant message
    asst_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conversation.id,
        role=MessageRole.ASSISTANT,
        content=rag_answer,
        created_at=datetime.utcnow(),
        message_metadata={"channel": event.channel, "direction": "outbound"},
    )
    db.add(asst_msg)
    conversation.last_activity_at = datetime.utcnow()
    await db.commit()

    # returning customer greeting
    if returning:
        await send_returning_customer_greeting(contact, event.channel, conversation, lambda text: _send_channel_response(event.channel, event.channel_user_id, text, channel=event.channel, db=db), db)

    # analytics event (omitted)


async def _send_channel_response(channel: str, user_id: str, text: str, *, channel_id: Optional[str] = None, db: AsyncSession) -> None:
    # simple switch; in real code would call adapter send functions
    if channel == "whatsapp":
        from .whatsapp_service import send_whatsapp_reply
        await send_whatsapp_reply(user_id=user_id, thread_id=user_id, body=text)
    elif channel == "email":
        from .email_service import send_email_direct
        await send_email_direct(user_id, text)
    elif channel == "sms":
        from .channel_adapters.sms_adapter import send_sms
        await send_sms(user_id, text)
    else:
        # web or fallback
        pass

async def _send_channel_formatted(channel: str, user_id: str, formatted: Any, db: AsyncSession) -> None:
    # stub: send the formatted response via whichever adapter
    if channel == "whatsapp":
        from .whatsapp_service import send_whatsapp_reply
        body = formatted.parts[0] if formatted.parts else ""
        await send_whatsapp_reply(user_id=user_id, thread_id=user_id, body=body)
    elif channel == "email":
        from .email_service import send_email_direct
        body = formatted.html or (formatted.parts[0] if formatted.parts else "")
        await send_email_direct(user_id, body)
    elif channel == "sms":
        from .channel_adapters.sms_adapter import send_sms
        body = formatted.parts[0] if formatted.parts else ""
        await send_sms(user_id, body)
    else:
        # web or others – handled elsewhere
        pass


async def _get_active_kb_ids(user_id: str) -> list:
    from ..models.knowledge_base import KnowledgeBase
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(KnowledgeBase.id).where(
                KnowledgeBase.user_id == user_id,
                KnowledgeBase.is_active == True,
            )
        )
        rows = result.scalars().all()
        return rows
