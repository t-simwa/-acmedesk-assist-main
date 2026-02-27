"""
Email channel API endpoints (J1 – Email Channel).

Implements:
- POST /api/email/sync      – Trigger inbox sync (IMAP) and import new messages
- GET  /api/email/threads   – List email threads for the current admin
- GET  /api/email/threads/{thread_id} – List messages for a specific email thread
- POST /api/email/threads/{thread_id}/reply – Send an email reply and persist it
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.email import (
    EmailThreadListResponse,
    EmailThreadMessagesResponse,
    EmailReplyRequest,
    EmailReplyResponse,
    EmailMessageMetadata,
)
from ..services import email_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/email", tags=["email"])


@router.post(
    "/sync",
    status_code=status.HTTP_200_OK,
)
async def sync_email_inbox(
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Trigger an email inbox sync for the current admin.

    This endpoint:
    - Connects to the configured IMAP inbox (if enabled)
    - Imports any unseen messages into conversations/messages
    - Returns a count of imported messages
    """
    try:
        imported = await email_service.fetch_and_store_new_emails(tenant_id=current_user.tenant_id)
        return {"imported": imported}
    except Exception as exc:
        logger.error("Error during email inbox sync: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while syncing the email inbox: {str(exc)}",
        )


@router.get(
    "/threads",
    response_model=EmailThreadListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_email_threads(
    limit: int = Query(50, ge=1, le=100, description="Maximum number of threads to retrieve"),
    offset: int = Query(0, ge=0, description="Number of threads to skip"),
    current_user: User = Depends(get_current_user),
) -> EmailThreadListResponse:
    """
    List email threads for the current admin.
    """
    try:
        threads, total = await email_service.list_email_threads(
            tenant_id=current_user.tenant_id,
            limit=limit,
            offset=offset,
        )

        return EmailThreadListResponse(
            threads=[
                EmailMessageMetadata(
                    id=t.thread_id,
                    role="thread",
                    content=t.subject,
                    timestamp=t.last_message_at,
                    metadata={
                        "from": t.from_address,
                        "to": t.to_address,
                        "message_count": t.message_count,
                    },
                )  # type: ignore[arg-type]
                for t in threads
            ],
            total=total,
            limit=limit,
            offset=offset,
        )
    except Exception as exc:
        logger.error("Error listing email threads: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while listing email threads: {str(exc)}",
        )


@router.get(
    "/threads/{thread_id}",
    response_model=EmailThreadMessagesResponse,
    status_code=status.HTTP_200_OK,
)
async def get_email_thread_messages(
    thread_id: str,
    current_user: User = Depends(get_current_user),
) -> EmailThreadMessagesResponse:
    """
    Get messages for a specific email thread.
    """
    try:
        messages = await email_service.list_email_thread_messages(
            tenant_id=current_user.tenant_id,
            thread_id=thread_id,
        )

        return EmailThreadMessagesResponse(
            thread_id=thread_id,
            messages=[
                EmailMessageMetadata(
                    id=m["id"],
                    role=m["role"],
                    content=m["content"],
                    timestamp=m.get("timestamp"),
                    metadata=m.get("metadata") or {},
                )
                for m in messages
            ],
        )
    except Exception as exc:
        logger.error("Error getting email thread messages for %s: %s", thread_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving email thread messages: {str(exc)}",
        )


@router.post(
    "/threads/{thread_id}/reply",
    response_model=EmailReplyResponse,
    status_code=status.HTTP_200_OK,
)
async def reply_to_email_thread(
    thread_id: str,
    request: EmailReplyRequest,
    current_user: User = Depends(get_current_user),
) -> EmailReplyResponse:
    """
    Send an email reply for the specified thread and persist it in the conversation history.
    """
    if not request.body.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reply body must not be empty",
        )

    try:
        message_dict = await email_service.send_email_reply(
            tenant_id=current_user.tenant_id,
            thread_id=thread_id,
            body=request.body,
        )

        message = EmailMessageMetadata(
            id=message_dict["id"],
            role=message_dict["role"],
            content=message_dict["content"],
            timestamp=message_dict.get("timestamp"),
            metadata=message_dict.get("metadata") or {},
        )

        return EmailReplyResponse(message=message)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error("Error sending email reply for thread %s: %s", thread_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while sending the email reply: {str(exc)}",
        )

