"""
Instagram DM channel API endpoints (9.4 - Instagram DMs).

Replaces the former Twitter/X channel endpoints.

Implements:
- POST /api/instagram/inbound-test        - Create a mock inbound Instagram DM for testing
- GET  /api/instagram/threads             - List Instagram DM threads for the current admin
- GET  /api/instagram/threads/{thread_id} - List messages for a specific Instagram DM thread
- POST /api/instagram/threads/{thread_id}/reply - Send an Instagram DM reply and persist it
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from ..models.user import User
from ..routers.auth import get_current_user
from ..services import instagram_service

logger = logging.getLogger(__name__)


class InstagramMessageMetadata(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str | None = None
    metadata: dict = Field(default_factory=dict)


class InstagramThreadListResponse(BaseModel):
    threads: List[InstagramMessageMetadata]
    total: int
    limit: int
    offset: int


class InstagramThreadMessagesResponse(BaseModel):
    thread_id: str
    messages: List[InstagramMessageMetadata]


class InstagramReplyRequest(BaseModel):
    body: str = Field(..., min_length=1)


class InstagramReplyResponse(BaseModel):
    message: InstagramMessageMetadata


class InstagramInboundTestRequest(BaseModel):
    sender_id: str = Field(..., description="Customer's Instagram user ID / handle")
    account_id: str = Field(..., description="Instagram business account ID")
    body: str = Field(..., description="Message body content")
    media_urls: Optional[list[str]] = Field(
        default=None, description="Optional list of media URLs attached to the DM"
    )


router = APIRouter(prefix="/api/instagram", tags=["instagram"])


@router.post(
    "/inbound-test",
    response_model=InstagramMessageMetadata,
    status_code=status.HTTP_201_CREATED,
)
async def create_inbound_instagram_test_message(
    request: InstagramInboundTestRequest,
    current_user: User = Depends(get_current_user),
) -> InstagramMessageMetadata:
    """Create a mock inbound Instagram DM for the current admin."""
    try:
        message_dict = await instagram_service.create_inbound_instagram_message(
            user_id=current_user.id,
            sender_id=request.sender_id,
            account_id=request.account_id,
            body=request.body,
            provider_message_id=None,
            media_urls=request.media_urls,
        )
        return InstagramMessageMetadata(
            id=message_dict["id"],
            role=message_dict["role"],
            content=message_dict["content"],
            timestamp=message_dict.get("timestamp"),
            metadata=message_dict.get("metadata") or {},
        )
    except Exception as exc:
        logger.error("Error creating inbound Instagram test message: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the inbound Instagram message: {str(exc)}",
        ) from exc


@router.get(
    "/threads",
    response_model=InstagramThreadListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_instagram_threads(
    limit: int = Query(50, ge=1, le=100, description="Maximum number of threads to retrieve"),
    offset: int = Query(0, ge=0, description="Number of threads to skip"),
    current_user: User = Depends(get_current_user),
) -> InstagramThreadListResponse:
    """List Instagram DM threads for the current admin."""
    try:
        threads, total = await instagram_service.list_instagram_threads(
            user_id=current_user.id, limit=limit, offset=offset,
        )
        return InstagramThreadListResponse(
            threads=[
                InstagramMessageMetadata(
                    id=t.thread_id,
                    role="thread",
                    content=f"{t.sender_id or 'Unknown'} -> {t.recipient_id or 'Unknown'}",
                    timestamp=t.last_message_at,
                    metadata={
                        "from": t.sender_id,
                        "to": t.recipient_id,
                        "message_count": t.message_count,
                    },
                )
                for t in threads
            ],
            total=total, limit=limit, offset=offset,
        )
    except Exception as exc:
        logger.error("Error listing Instagram threads: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while listing Instagram threads: {str(exc)}",
        ) from exc


@router.get(
    "/threads/{thread_id}",
    response_model=InstagramThreadMessagesResponse,
    status_code=status.HTTP_200_OK,
)
async def get_instagram_thread_messages(
    thread_id: str,
    current_user: User = Depends(get_current_user),
) -> InstagramThreadMessagesResponse:
    """Get messages for a specific Instagram DM thread."""
    try:
        messages = await instagram_service.list_instagram_thread_messages(
            user_id=current_user.id, thread_id=thread_id,
        )
        return InstagramThreadMessagesResponse(
            thread_id=thread_id,
            messages=[
                InstagramMessageMetadata(
                    id=m["id"], role=m["role"], content=m["content"],
                    timestamp=m.get("timestamp"),
                    metadata=m.get("metadata") or {},
                )
                for m in messages
            ],
        )
    except Exception as exc:
        logger.error("Error getting Instagram thread messages for %s: %s", thread_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving Instagram thread messages: {str(exc)}",
        ) from exc


@router.post(
    "/threads/{thread_id}/reply",
    response_model=InstagramReplyResponse,
    status_code=status.HTTP_200_OK,
)
async def reply_to_instagram_thread(
    thread_id: str,
    request: InstagramReplyRequest,
    current_user: User = Depends(get_current_user),
) -> InstagramReplyResponse:
    """Send an Instagram DM reply for the specified thread."""
    if not request.body.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reply body must not be empty",
        )
    try:
        message_dict = await instagram_service.send_instagram_reply(
            user_id=current_user.id, thread_id=thread_id, body=request.body,
        )
        message = InstagramMessageMetadata(
            id=message_dict["id"], role=message_dict["role"],
            content=message_dict["content"],
            timestamp=message_dict.get("timestamp"),
            metadata=message_dict.get("metadata") or {},
        )
        return InstagramReplyResponse(message=message)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Error sending Instagram reply for thread %s: %s", thread_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while sending the Instagram reply: {str(exc)}",
        ) from exc
