"""
Unified Inbox API endpoints (9.7).

Implements:
- GET  /api/inbox              - List all conversations across channels
- GET  /api/inbox/{id}         - Get conversation detail with messages
- POST /api/inbox/{id}/reply   - Send a reply in a conversation
"""

import json
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, desc, or_, exists, case
from sqlalchemy.dialects.postgresql import insert

from ..models.base import get_session_factory
from ..models.contact import Contact
from ..models.conversation import (
    Channel,
    Conversation,
    ConversationStatus,
)
from ..models.message import Message, MessageRole
from ..models.escalation import ConversationEscalation
from ..models.message_template import MessageTemplate
from ..models.training_feedback import TrainingFeedback
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.inbox import (
    InboxAIDraftRequest,
    InboxAIDraftResponse,
    InboxContactResponse,
    InboxContactUpdateRequest,
    InboxConversationCreateRequest,
    InboxConversationCreateResponse,
    InboxEscalationsResponse,
    InboxFlagTrainingRequest,
    InboxFlagTrainingResponse,
    InboxListResponse,
    InboxMessageItem,
    InboxMessagesResponse,
    InboxReplyRequest,
    InboxReplyResponse,
    InboxThreadDetailResponse,
    InboxThreadItem,
    InboxContactHistoryResponse,
    InboxTemplateItem,
    InboxTemplatesResponse,
)
from ..services import test_stream as test_stream_service
from ..services.auth import decode_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/inbox", tags=["inbox"])


def _publish_inbox_event(tenant_id: str, payload: dict):
    """Publish a UI update event for the tenant's inbox."""
    try:
        test_stream_service.publish_event(tenant_id, "inbox", payload)
    except Exception:
        logger.exception("Failed to publish inbox event")


async def _get_ws_user(websocket):
    """Authenticate a websocket connection using query token or Authorization header."""
    token = None
    # Prefer query parameter for websocket clients
    token = websocket.query_params.get("token")
    if not token:
        auth_header = websocket.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()

    if not token:
        await websocket.close(code=1008)
        return None

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=1008)
        return None

    from ..models.user import User
    from ..models.base import get_session_factory

    user_id = payload.get("sub")
    if not user_id:
        await websocket.close(code=1008)
        return None

    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            await websocket.close(code=1008)
            return None
        return user


@router.websocket("/ws")
async def inbox_ws(websocket):
    """WebSocket endpoint for inbox real-time events."""
    await websocket.accept()
    user = await _get_ws_user(websocket)
    if not user:
        return

    tenant_id = user.tenant_id

    try:
        async for payload in test_stream_service.subscribe(tenant_id, "inbox"):
            if payload is None:
                # ping
                await websocket.send_text(json.dumps({"type": "ping"}))
                continue
            await websocket.send_text(json.dumps(payload))
    except Exception:
        logger.exception("Inbox websocket connection ended unexpectedly")
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


@router.get("/stream")
async def inbox_event_stream(current_user: User = Depends(get_current_user)):
    """Server-Sent Events endpoint for inbox updates."""
    tenant_id = current_user.tenant_id

    async def event_generator():
        async for payload in test_stream_service.subscribe(tenant_id, "inbox"):
            if payload is None:
                # Keep-alive comment for SSE
                yield ":keep-alive\n\n"
                continue
            yield f"data: {json.dumps(payload)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("", response_model=InboxListResponse)
@router.get("/conversations", response_model=InboxListResponse)
async def list_inbox_threads(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    channel: Optional[List[str]] = Query(None),
    inbox_status: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
) -> InboxListResponse:
    """List conversations across all channels for the unified inbox."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        query = (
            select(Conversation, Contact)
            .outerjoin(Contact, Conversation.contact_id == Contact.id)
            .where(Conversation.tenant_id == current_user.tenant_id)
        )
        count_query = select(func.count(Conversation.id)).where(
            Conversation.tenant_id == current_user.tenant_id
        )

        if channel:
            query = query.where(Conversation.channel.in_(channel))
            count_query = count_query.where(Conversation.channel.in_(channel))

        if inbox_status:
            # Support spec-style tabs (unread, escalated, ai_active, mine, resolved).
            if inbox_status == "unread":
                query = query.where(Conversation.unread_count > 0)
                count_query = count_query.where(Conversation.unread_count > 0)
            elif inbox_status == "escalated":
                query = query.where(Conversation.status == ConversationStatus.ESCALATED)
                count_query = count_query.where(Conversation.status == ConversationStatus.ESCALATED)
            elif inbox_status == "ai_active":
                query = query.where(
                    Conversation.handled_by == "ai",
                    Conversation.status == ConversationStatus.ACTIVE,
                )
                count_query = count_query.where(
                    Conversation.handled_by == "ai",
                    Conversation.status == ConversationStatus.ACTIVE,
                )
            elif inbox_status == "mine":
                query = query.where(Conversation.assigned_to == current_user.id)
                count_query = count_query.where(Conversation.assigned_to == current_user.id)
            elif inbox_status == "resolved":
                query = query.where(Conversation.status == ConversationStatus.RESOLVED)
                count_query = count_query.where(Conversation.status == ConversationStatus.RESOLVED)
            else:
                # Default: filter by raw status value (compatibility fallback)
                query = query.where(Conversation.status == inbox_status)
                count_query = count_query.where(Conversation.status == inbox_status)

        if search:
            search_like = f"%{search}%"
            message_exists = exists(
                select(Message.id).where(
                    Message.conversation_id == Conversation.id,
                    Message.content.ilike(search_like),
                )
            )

            contact_match = (
                Contact.full_name.ilike(search_like)
                | Contact.email.ilike(search_like)
                | Contact.phone.ilike(search_like)
            )

            query = query.where(or_(contact_match, message_exists))
            count_query = count_query.where(or_(contact_match, message_exists))

        # Get the paginated thread list
        total_result = await session.execute(count_query)
        total = total_result.scalar() or 0

        # Compute tab & channel counts for visual badges
        counts_query = select(
            func.count(Conversation.id),
            func.sum(case((Conversation.unread_count > 0, 1), else_=0)),
            func.sum(case((Conversation.status == ConversationStatus.ESCALATED, 1), else_=0)),
            func.sum(case(((Conversation.handled_by == "ai") & (Conversation.status == ConversationStatus.ACTIVE), 1), else_=0)),
            func.sum(case((Conversation.assigned_to == current_user.id, 1), else_=0)),
            func.sum(case((Conversation.status == ConversationStatus.RESOLVED, 1), else_=0)),
        ).where(Conversation.tenant_id == current_user.tenant_id)
        counts_result = await session.execute(counts_query)
        (c_all, c_unread, c_escalated, c_ai_active, c_mine, c_resolved) = counts_result.one()

        channel_counts_query = (
            select(Conversation.channel, func.count(Conversation.id))
            .where(Conversation.tenant_id == current_user.tenant_id)
            .group_by(Conversation.channel)
        )
        channel_counts_result = await session.execute(channel_counts_query)
        channel_counts = {row[0]: row[1] for row in channel_counts_result.all() if row[0]}

        offset = (page - 1) * per_page
        query = query.order_by(desc(Conversation.last_activity_at)).offset(offset).limit(per_page)
        result = await session.execute(query)
        rows = result.all()

        threads = []
        for conversation, contact in rows:
            # Get last message for preview
            last_msg_result = await session.execute(
                select(Message)
                .where(Message.conversation_id == conversation.id)
                .order_by(Message.created_at.desc())
                .limit(1)
            )
            last_msg = last_msg_result.scalar_one_or_none()

            unread_count = conversation.unread_count or 0

            threads.append(
                InboxThreadItem(
                    id=conversation.id,
                    channel=conversation.channel.value if conversation.channel else "web",
                    contact_name=contact.full_name if contact else None,
                    contact_email=contact.email if contact else None,
                    contact_phone=contact.phone if contact else None,
                    last_message=last_msg.content[:200] if last_msg else None,
                    last_message_role=last_msg.role.value if getattr(last_msg, "role", None) else None,
                    last_message_at=(
                        conversation.last_activity_at.isoformat() + "Z"
                        if conversation.last_activity_at else None
                    ),
                    message_count=conversation.message_count or 0,
                    status=conversation.status.value if conversation.status else "active",
                    is_unread=unread_count > 0,
                    handled_by=conversation.handled_by,
                    assigned_to=conversation.assigned_to,
                    escalated_at=(
                        conversation.escalated_at.isoformat() + "Z"
                        if conversation.escalated_at else None
                    ),
                    sla_deadline=(
                        conversation.sla_deadline.isoformat() + "Z"
                        if conversation.sla_deadline else None
                    ),
                )
            )

        return InboxListResponse(
            threads=threads,
            total=total,
            page=page,
            per_page=per_page,
            counts={
                "all": c_all or 0,
                "unread": c_unread or 0,
                "escalated": c_escalated or 0,
                "ai_active": c_ai_active or 0,
                "mine": c_mine or 0,
                "resolved": c_resolved or 0,
            },
            channel_counts=channel_counts,
        )


@router.get("/{conversation_id}", response_model=InboxThreadDetailResponse)
async def get_inbox_thread(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
) -> InboxThreadDetailResponse:
    """Get full conversation detail with messages."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Conversation, Contact)
            .outerjoin(Contact, Conversation.contact_id == Contact.id)
            .where(
                Conversation.id == conversation_id,
                Conversation.tenant_id == current_user.tenant_id,
            )
        )
        row = result.first()
        if not row:
            raise HTTPException(status_code=404, detail="Conversation not found")

        conversation, contact = row

        msg_result = await session.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        messages = msg_result.scalars().all()

        # Mark as read by the agent when fetching the thread
        if conversation.unread_count and conversation.unread_count > 0:
            conversation.unread_count = 0
            await session.commit()
            _publish_inbox_event(current_user.tenant_id, {
                "type": "thread_updated",
                "conversation_id": conversation.id,
                "unread_count": 0,
            })

        # Determine the last user message timestamp (used for WhatsApp 24-hour window enforcement)
        last_user_message_at = None
        for m in reversed(messages):
            if getattr(m, "role", None) == MessageRole.USER:
                if m.created_at:
                    last_user_message_at = m.created_at.isoformat() + "Z"
                break

        return InboxThreadDetailResponse(
            conversation_id=conversation.id,
            channel=conversation.channel.value if conversation.channel else "web",
            status=conversation.status.value if conversation.status else "active",
            contact_name=contact.full_name if contact else None,
            contact_email=contact.email if contact else None,
            contact_phone=contact.phone if contact else None,
            handled_by=conversation.handled_by,
            assigned_to=conversation.assigned_to,
            escalated_at=conversation.escalated_at.isoformat() + "Z" if conversation.escalated_at else None,
            sla_deadline=conversation.sla_deadline.isoformat() + "Z" if conversation.sla_deadline else None,
            last_user_message_at=last_user_message_at,
            messages=[
                InboxMessageItem(
                    id=m.id,
                    role=m.role.value if getattr(m, "role", None) else None,
                    content=m.content or "",
                    created_at=m.created_at.isoformat() + "Z" if m.created_at else None,
                    metadata=m.message_metadata or None,
                )
                for m in messages
            ],
        )


@router.get("/{conversation_id}/messages", response_model=InboxMessagesResponse)
async def get_inbox_thread_messages(
    conversation_id: str,
    before: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
) -> InboxMessagesResponse:
    """Get messages for a conversation (cursor pagination)."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Conversation)
            .where(
                Conversation.id == conversation_id,
                Conversation.tenant_id == current_user.tenant_id,
            )
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        msg_query = select(Message).where(Message.conversation_id == conversation_id)
        if before:
            msg_query = msg_query.where(Message.created_at < before)
        msg_query = msg_query.order_by(Message.created_at.desc()).limit(limit + 1)

        msg_result = await session.execute(msg_query)
        fetched = msg_result.scalars().all()

        has_more = len(fetched) > limit
        if has_more:
            fetched = fetched[:limit]

        messages = [
            InboxMessageItem(
                id=m.id,
                role=m.role.value if getattr(m, "role", None) else None,
                content=m.content or "",
                created_at=m.created_at.isoformat() + "Z" if m.created_at else None,
                metadata=m.message_metadata or None,
            )
            for m in reversed(fetched)
        ]

        return InboxMessagesResponse(messages=messages, has_more=has_more)


@router.post("/conversations", response_model=InboxConversationCreateResponse)
async def create_inbox_conversation(
    request: InboxConversationCreateRequest,
    current_user: User = Depends(get_current_user),
) -> InboxConversationCreateResponse:
    """Create a new conversation and send the first message."""
    import uuid
    from datetime import datetime

    session_factory = get_session_factory()
    async with session_factory() as session:
        # Find or create contact
        contact = None
        if request.contact_email:
            result = await session.execute(
                select(Contact)
                .where(
                    Contact.tenant_id == current_user.tenant_id,
                    Contact.email == request.contact_email,
                )
                .limit(1)
            )
            contact = result.scalar_one_or_none()

        if not contact and request.contact_phone:
            result = await session.execute(
                select(Contact)
                .where(
                    Contact.tenant_id == current_user.tenant_id,
                    Contact.phone == request.contact_phone,
                )
                .limit(1)
            )
            contact = result.scalar_one_or_none()

        if not contact:
            contact = Contact(
                id=str(uuid.uuid4()),
                tenant_id=current_user.tenant_id,
                full_name=request.contact_name,
                email=request.contact_email,
                phone=request.contact_phone,
            )
            session.add(contact)

        # Create conversation
        conv_id = str(uuid.uuid4())
        conversation = Conversation(
            id=conv_id,
            tenant_id=current_user.tenant_id,
            contact_id=contact.id if contact else None,
            channel=request.channel,
            handled_by="ai",
            unread_count=1,
            last_activity_at=datetime.utcnow(),
        )
        session.add(conversation)

        # Create initial message
        msg_id = str(uuid.uuid4())
        message = Message(
            id=msg_id,
            conversation_id=conv_id,
            role=MessageRole.USER,
            content=request.initial_message,
            created_at=datetime.utcnow(),
            message_metadata={
                "channel": request.channel,
                "direction": "inbound",
                "sent_by": contact.id if contact else None,
            },
        )
        session.add(message)

        await session.commit()

        _publish_inbox_event(current_user.tenant_id, {
            "type": "thread_updated",
            "conversation_id": conversation.id,
        })

        return InboxConversationCreateResponse(
            conversation_id=conversation.id,
            message_id=message.id,
        )


@router.get("/{conversation_id}/contact", response_model=InboxContactResponse)
async def get_inbox_thread_contact(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
) -> InboxContactResponse:
    """Get (unified) contact info for a conversation."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Conversation, Contact)
            .outerjoin(Contact, Conversation.contact_id == Contact.id)
            .where(
                Conversation.id == conversation_id,
                Conversation.tenant_id == current_user.tenant_id,
            )
        )
        row = result.first()
        if not row:
            raise HTTPException(status_code=404, detail="Conversation not found")

        conversation, contact = row
        if not contact:
            return InboxContactResponse()

        return InboxContactResponse(
            contact_id=contact.id,
            name=contact.full_name,
            email=contact.email,
            phone=contact.phone,
            tags=contact.tags if hasattr(contact, "tags") else None,
            notes=getattr(contact, "notes", None),
            lead_status=getattr(contact, "lead_status", None),
        )


@router.get("/{conversation_id}/escalations", response_model=InboxEscalationsResponse)
async def get_inbox_thread_escalations(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
) -> InboxEscalationsResponse:
    """Return escalation history for a conversation."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(ConversationEscalation)
            .where(
                ConversationEscalation.conversation_id == conversation_id,
                ConversationEscalation.tenant_id == current_user.tenant_id,
            )
            .order_by(ConversationEscalation.created_at.desc())
        )
        escalations = result.scalars().all()

        return InboxEscalationsResponse(
            escalations=[
                InboxEscalationItem(
                    id=e.id,
                    type=e.type.value if hasattr(e.type, 'value') else str(e.type),
                    reason=e.reason,
                    created_by=e.created_by,
                    created_at=e.created_at.isoformat() + "Z" if e.created_at else None,
                )
                for e in escalations
            ]
        )


@router.get("/{conversation_id}/history", response_model=InboxContactHistoryResponse)
async def get_inbox_thread_history(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
) -> InboxContactHistoryResponse:
    """Return recent conversation history for the same contact."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Conversation)
            .where(
                Conversation.id == conversation_id,
                Conversation.tenant_id == current_user.tenant_id,
            )
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        if not conversation.contact_id:
            return InboxContactHistoryResponse(history=[])

        history_result = await session.execute(
            select(Conversation)
            .where(
                Conversation.tenant_id == current_user.tenant_id,
                Conversation.contact_id == conversation.contact_id,
                Conversation.id != conversation_id,
            )
            .order_by(desc(Conversation.last_activity_at))
            .limit(10)
        )
        history = history_result.scalars().all()

        return InboxContactHistoryResponse(
            history=[
                InboxContactHistoryItem(
                    conversation_id=h.id,
                    status=h.status.value if h.status else "active",
                    last_activity_at=h.last_activity_at.isoformat() + "Z" if h.last_activity_at else None,
                    message_count=h.message_count or 0,
                )
                for h in history
            ]
        )


@router.patch("/{conversation_id}/contact", response_model=InboxContactResponse)
async def update_inbox_thread_contact(
    conversation_id: str,
    request: InboxContactUpdateRequest,
    current_user: User = Depends(get_current_user),
) -> InboxContactResponse:
    """Update contact info (notes / tags / lead status) for an inbox conversation."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Conversation, Contact)
            .outerjoin(Contact, Conversation.contact_id == Contact.id)
            .where(
                Conversation.id == conversation_id,
                Conversation.tenant_id == current_user.tenant_id,
            )
        )
        row = result.first()
        if not row:
            raise HTTPException(status_code=404, detail="Conversation not found")

        conversation, contact = row
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")

        if request.notes is not None:
            contact.notes = request.notes
        if request.tags is not None:
            contact.tags = request.tags
        if request.lead_status is not None:
            contact.lead_status = request.lead_status

        await session.commit()

        return InboxContactResponse(
            contact_id=contact.id,
            name=contact.full_name,
            email=contact.email,
            phone=contact.phone,
            tags=contact.tags,
            notes=contact.notes,
            lead_status=contact.lead_status,
        )


@router.post("/{conversation_id}/reply", response_model=InboxReplyResponse)
async def reply_to_inbox_thread(
    conversation_id: str,
    request: InboxReplyRequest,
    current_user: User = Depends(get_current_user),
) -> InboxReplyResponse:
    """Send a reply in a conversation (channel-agnostic)."""
    import uuid

    if not request.body.strip():
        raise HTTPException(status_code=400, detail="Reply body must not be empty")

    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.tenant_id == current_user.tenant_id,
            )
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # WhatsApp 24-hour user messaging window
        if conversation.channel == Channel.WHATSAPP:
            last_user_msg = await session.scalar(
                select(Message)
                .where(
                    Message.conversation_id == conversation.id,
                    Message.role == MessageRole.USER,
                )
                .order_by(Message.created_at.desc())
                .limit(1)
            )
            if last_user_msg and last_user_msg.created_at:
                delta = datetime.utcnow() - last_user_msg.created_at
                if delta.total_seconds() > 24 * 60 * 60:
                    raise HTTPException(
                        status_code=403,
                        detail=(
                            "WhatsApp messages can only be sent within 24 hours of the last user message. "
                            "Please ask the user to message you again or use another channel."
                        ),
                    )

        now = datetime.utcnow()
        message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content=request.body,
            created_at=now,
            message_metadata={
                "channel": conversation.channel.value if conversation.channel else "web",
                "direction": "outbound",
                "sent_by": current_user.id,
                "delivery_status": "sent",
                "internal_note": bool(request.internal_note),
            },
        )
        session.add(message)
        conversation.last_activity_at = now
        conversation.message_count = (conversation.message_count or 0) + 1
        await session.commit()

        # Notify any subscribed UI clients to refresh this conversation
        _publish_inbox_event(current_user.tenant_id, {
            "type": "thread_updated",
            "conversation_id": conversation.id,
            "message": {
                "id": message.id,
                "role": message.role.value if getattr(message, "role", None) else None,
                "content": message.content or "",
                "created_at": now.isoformat() + "Z",
                "metadata": message.message_metadata,
            },
        })

        return InboxReplyResponse(
            message=InboxMessageItem(
                id=message.id,
                role=message.role.value if getattr(message, "role", None) else None,
                content=message.content or "",
                created_at=now.isoformat() + "Z",
                metadata=message.message_metadata,
            )
        )


@router.post("/ai-draft", response_model=InboxAIDraftResponse)
async def get_ai_draft(
    request: InboxAIDraftRequest,
    current_user: User = Depends(get_current_user),
) -> InboxAIDraftResponse:
    """Generate an AI draft reply for a given conversation."""
    from datetime import datetime

    session_factory = get_session_factory()
    async with session_factory() as session:
        # Validate conversation belongs to tenant
        result = await session.execute(
            select(Conversation).where(
                Conversation.id == request.conversation_id,
                Conversation.tenant_id == current_user.tenant_id,
            )
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Fetch last messages for context
        msg_query = (
            select(Message)
            .where(Message.conversation_id == request.conversation_id)
            .order_by(Message.created_at.desc())
            .limit(5)
        )
        msg_result = await session.execute(msg_query)
        messages = msg_result.scalars().all()

        # Simple draft: echo last user message + template
        last_user_msg = next((m for m in messages if m.role == MessageRole.USER), None)
        draft_text = (
            f"Thanks for your message! "
            f"I saw you said: '{last_user_msg.content if last_user_msg else '...' }'. "
            "Here is what I suggest:"
        )

        return InboxAIDraftResponse(
            draft=draft_text,
            confidence=0.75,
            sources_used=["Conversation history"],
        )


@router.get("/templates", response_model=InboxTemplatesResponse)
async def list_message_templates(current_user: User = Depends(get_current_user)) -> InboxTemplatesResponse:
    """List saved message templates."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(MessageTemplate)
            .where(MessageTemplate.tenant_id == current_user.tenant_id)
            .order_by(MessageTemplate.created_at.desc())
        )
        templates = result.scalars().all()

        return InboxTemplatesResponse(
            templates=[
                InboxTemplateItem(
                    id=t.id,
                    name=t.name,
                    content=t.content,
                    created_by=t.created_by,
                    created_at=t.created_at.isoformat() + "Z" if t.created_at else None,
                )
                for t in templates
            ]
        )


@router.post("/templates", response_model=InboxTemplateItem)
async def create_message_template(
    template: InboxTemplateItem,
    current_user: User = Depends(get_current_user),
) -> InboxTemplateItem:
    """Create a new message template."""
    import uuid
    from datetime import datetime

    session_factory = get_session_factory()
    async with session_factory() as session:
        new_template = MessageTemplate(
            id=str(uuid.uuid4()),
            tenant_id=current_user.tenant_id,
            name=template.name,
            content=template.content,
            created_by=current_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(new_template)
        await session.commit()

        return InboxTemplateItem(
            id=new_template.id,
            name=new_template.name,
            content=new_template.content,
            created_by=new_template.created_by,
            created_at=new_template.created_at.isoformat() + "Z",
        )


@router.post("/{conversation_id}/takeover")
async def takeover_inbox_thread(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
):
    """Take over a conversation from AI/another agent."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Conversation)
            .where(
                Conversation.id == conversation_id,
                Conversation.tenant_id == current_user.tenant_id,
            )
            .with_for_update()
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        if conversation.assigned_to and conversation.assigned_to != current_user.id:
            raise HTTPException(
                status_code=409,
                detail=f"Taken by {conversation.assigned_to}",
            )

        conversation.handled_by = "agent"
        conversation.assigned_to = current_user.id
        conversation.last_activity_at = conversation.last_activity_at or datetime.utcnow()
        await session.commit()

        _publish_inbox_event(current_user.tenant_id, {
            "type": "thread_updated",
            "conversation_id": conversation.id,
            "handled_by": conversation.handled_by,
            "assigned_to": conversation.assigned_to,
        })

        return {"success": True}


@router.post("/{conversation_id}/handback")
async def handback_inbox_thread(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
):
    """Hand back a conversation to AI management."""
    import uuid
    from datetime import datetime

    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Conversation)
            .where(
                Conversation.id == conversation_id,
                Conversation.tenant_id == current_user.tenant_id,
            )
            .with_for_update()
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        conversation.handled_by = "ai"
        conversation.assigned_to = None
        conversation.last_activity_at = conversation.last_activity_at or datetime.utcnow()

        # Log de-escalation event if needed
        await session.execute(
            insert(ConversationEscalation).values(
                id=str(uuid.uuid4()),
                tenant_id=current_user.tenant_id,
                conversation_id=conversation.id,
                type="deescalated",
                created_by=current_user.id,
                created_at=datetime.utcnow(),
            )
        )

        await session.commit()

        _publish_inbox_event(current_user.tenant_id, {
            "type": "thread_updated",
            "conversation_id": conversation.id,
            "handled_by": conversation.handled_by,
            "assigned_to": conversation.assigned_to,
        })

        return {"success": True}


@router.post("/{conversation_id}/flag-training", response_model=InboxFlagTrainingResponse)
async def flag_training(
    conversation_id: str,
    request: InboxFlagTrainingRequest,
    current_user: User = Depends(get_current_user),
) -> InboxFlagTrainingResponse:
    """Flag a message for model training review."""
    import uuid
    from datetime import datetime

    if request.priority not in {"low", "medium", "high"}:
        raise HTTPException(status_code=400, detail="Invalid priority")

    session_factory = get_session_factory()
    async with session_factory() as session:
        # Ensure conversation exists and belongs to tenant
        result = await session.execute(
            select(Conversation.id)
            .where(
                Conversation.id == conversation_id,
                Conversation.tenant_id == current_user.tenant_id,
            )
        )
        conv = result.scalar_one_or_none()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

        feedback_id = str(uuid.uuid4())
        # Insert feedback record (best effort; schema may not exist yet in DB)
        try:
            await session.execute(
                insert(TrainingFeedback).values(
                    id=feedback_id,
                    tenant_id=current_user.tenant_id,
                    conversation_id=conversation_id,
                    message_id=request.message_id,
                    priority=request.priority,
                    comment=request.comment,
                    created_by=current_user.id,
                    created_at=datetime.utcnow(),
                )
            )
            await session.commit()
        except Exception:
            # If table doesn't exist or insert fails, return a generic failure
            raise HTTPException(status_code=500, detail="Failed to store training feedback")

        return InboxFlagTrainingResponse(success=True, feedback_id=feedback_id)


@router.post("/{conversation_id}/escalate")
async def escalate_inbox_thread(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
):
    """Escalate a conversation (mark as escalated)."""
    from datetime import datetime, timedelta

    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.tenant_id == current_user.tenant_id,
            )
            .with_for_update()
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        conversation.status = ConversationStatus.ESCALATED
        conversation.escalated_at = datetime.utcnow()
        # Set a default SLA: 1 hour from now
        conversation.sla_deadline = datetime.utcnow() + timedelta(hours=1)
        conversation.last_activity_at = datetime.utcnow()

        await session.execute(
            insert(ConversationEscalation).values(
                id=str(uuid.uuid4()),
                tenant_id=current_user.tenant_id,
                conversation_id=conversation.id,
                type="escalated",
                created_by=current_user.id,
                created_at=datetime.utcnow(),
            )
        )

        await session.commit()

        _publish_inbox_event(current_user.tenant_id, {
            "type": "thread_updated",
            "conversation_id": conversation.id,
            "status": conversation.status.value if conversation.status else None,
            "escalated_at": conversation.escalated_at.isoformat() + "Z" if conversation.escalated_at else None,
        })

        return {"success": True}


@router.post("/{conversation_id}/deescalate")
async def deescalate_inbox_thread(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
):
    """Clear escalation status for a conversation."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.tenant_id == current_user.tenant_id,
            )
            .with_for_update()
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Return to active state
        conversation.status = ConversationStatus.ACTIVE
        conversation.escalated_at = None
        conversation.sla_deadline = None
        conversation.last_activity_at = datetime.utcnow()
        await session.commit()

        _publish_inbox_event(current_user.tenant_id, {
            "type": "thread_updated",
            "conversation_id": conversation.id,
            "status": conversation.status.value if conversation.status else None,
        })

        return {"success": True}


@router.post("/{conversation_id}/resolve")
async def resolve_inbox_thread(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
):
    """Resolve a conversation."""
    from datetime import datetime

    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.tenant_id == current_user.tenant_id,
            )
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        conversation.status = ConversationStatus.RESOLVED
        conversation.resolved_at = datetime.utcnow()
        conversation.last_activity_at = conversation.resolved_at
        await session.commit()

        _publish_inbox_event(current_user.tenant_id, {
            "type": "thread_updated",
            "conversation_id": conversation.id,
            "status": conversation.status.value if conversation.status else None,
        })

        return {"success": True}


@router.post("/{conversation_id}/reopen")
async def reopen_inbox_thread(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
):
    """Reopen a resolved conversation."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.tenant_id == current_user.tenant_id,
            )
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        conversation.status = ConversationStatus.ACTIVE
        conversation.resolved_at = None
        await session.commit()

        _publish_inbox_event(current_user.tenant_id, {
            "type": "thread_updated",
            "conversation_id": conversation.id,
            "status": conversation.status.value if conversation.status else None,
        })

        return {"success": True}
