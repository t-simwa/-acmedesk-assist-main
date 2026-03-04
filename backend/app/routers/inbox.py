"""
Unified Inbox API endpoints (9.7).

Implements:
- GET  /api/inbox              - List all conversations across channels
- GET  /api/inbox/{id}         - Get conversation detail with messages
- POST /api/inbox/{id}/reply   - Send a reply in a conversation
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc

from ..models.base import get_session_factory
from ..models.contact import Contact
from ..models.conversation import Conversation
from ..models.message import Message
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.inbox import (
    InboxListResponse,
    InboxMessageItem,
    InboxReplyRequest,
    InboxReplyResponse,
    InboxThreadDetailResponse,
    InboxThreadItem,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/inbox", tags=["inbox"])


@router.get("", response_model=InboxListResponse)
async def list_inbox_threads(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    channel: Optional[str] = Query(None),
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
            query = query.where(Conversation.channel == channel)
            count_query = count_query.where(Conversation.channel == channel)

        if inbox_status:
            query = query.where(Conversation.status == inbox_status)
            count_query = count_query.where(Conversation.status == inbox_status)

        total_result = await session.execute(count_query)
        total = total_result.scalar() or 0

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

            threads.append(
                InboxThreadItem(
                    id=conversation.id,
                    channel=conversation.channel.value if conversation.channel else "web",
                    contact_name=contact.full_name if contact else None,
                    contact_email=contact.email if contact else None,
                    contact_phone=contact.phone if contact else None,
                    last_message=last_msg.content[:200] if last_msg else None,
                    last_message_at=(
                        conversation.last_activity_at.isoformat() + "Z"
                        if conversation.last_activity_at else None
                    ),
                    message_count=conversation.message_count or 0,
                    status=conversation.status.value if conversation.status else "active",
                    is_unread=False,
                )
            )

        return InboxListResponse(
            threads=threads, total=total, page=page, per_page=per_page,
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

        return InboxThreadDetailResponse(
            conversation_id=conversation.id,
            channel=conversation.channel.value if conversation.channel else "web",
            status=conversation.status.value if conversation.status else "active",
            contact_name=contact.full_name if contact else None,
            contact_email=contact.email if contact else None,
            contact_phone=contact.phone if contact else None,
            messages=[
                InboxMessageItem(
                    id=m.id,
                    role=m.role,
                    content=m.content or "",
                    created_at=m.created_at.isoformat() + "Z" if m.created_at else None,
                    metadata=m.message_metadata,
                )
                for m in messages
            ],
        )


@router.post("/{conversation_id}/reply", response_model=InboxReplyResponse)
async def reply_to_inbox_thread(
    conversation_id: str,
    request: InboxReplyRequest,
    current_user: User = Depends(get_current_user),
) -> InboxReplyResponse:
    """Send a reply in a conversation (channel-agnostic)."""
    import uuid
    from datetime import datetime

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

        now = datetime.utcnow()
        message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role="assistant",
            content=request.body,
            created_at=now,
            message_metadata={
                "channel": conversation.channel.value if conversation.channel else "web",
                "direction": "outbound",
                "sent_by": current_user.id,
            },
        )
        session.add(message)
        conversation.last_activity_at = now
        conversation.message_count = (conversation.message_count or 0) + 1
        await session.commit()

        return InboxReplyResponse(
            message=InboxMessageItem(
                id=message.id,
                role=message.role,
                content=message.content or "",
                created_at=now.isoformat() + "Z",
                metadata=message.message_metadata,
            )
        )
