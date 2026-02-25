"""
Twitter/X channel API endpoints (J3.2 – Twitter Integration).

Implements:
- POST /api/twitter/inbound-test        – Create a mock inbound Twitter DM for testing
- GET  /api/twitter/threads             – List Twitter DM threads for the current admin
- GET  /api/twitter/threads/{thread_id} – List messages for a specific Twitter DM thread
- POST /api/twitter/threads/{thread_id}/reply – Send a Twitter DM reply and persist it
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from ..models.user import User
from ..routers.auth import get_current_user
from ..services import twitter_service

logger = logging.getLogger(__name__)


class TwitterMessageMetadata(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str | None = None
    metadata: dict = Field(default_factory=dict)


class TwitterThreadListResponse(BaseModel):
    threads: List[TwitterMessageMetadata]
    total: int
    limit: int
    offset: int


class TwitterThreadMessagesResponse(BaseModel):
    thread_id: str
    messages: List[TwitterMessageMetadata]


class TwitterReplyRequest(BaseModel):
    body: str = Field(..., min_length=1)


class TwitterReplyResponse(BaseModel):
    message: TwitterMessageMetadata


class TwitterInboundTestRequest(BaseModel):
    sender_id: str = Field(..., description="Customer's Twitter user ID / handle")
    account_id: str = Field(..., description="Twitter account ID configured for this channel")
    body: str = Field(..., description="Message body content")
    media_urls: Optional[list[str]] = Field(
        default=None, description="Optional list of media URLs attached to the DM"
    )


router = APIRouter(prefix="/api/twitter", tags=["twitter"])


@router.post(
    "/inbound-test",
    response_model=TwitterMessageMetadata,
    status_code=status.HTTP_201_CREATED,
)
async def create_inbound_twitter_test_message(
    request: TwitterInboundTestRequest,
    current_user: User = Depends(get_current_user),
) -> TwitterMessageMetadata:
    """
    Create a mock inbound Twitter DM for the current admin.

    This endpoint is primarily for manual testing and development; in production,
    a provider webhook or integration layer should call twitter_service.create_inbound_twitter_message
    directly.
    """
    try:
        message_dict = await twitter_service.create_inbound_twitter_message(
            user_id=current_user.id,
            sender_id=request.sender_id,
            account_id=request.account_id,
            body=request.body,
            provider_message_id=None,
            media_urls=request.media_urls,
        )
        return TwitterMessageMetadata(
            id=message_dict["id"],
            role=message_dict["role"],
            content=message_dict["content"],
            timestamp=message_dict.get("timestamp"),
            metadata=message_dict.get("metadata") or {},
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Error creating inbound Twitter test message: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the inbound Twitter message: {str(exc)}",
        ) from exc


@router.get(
    "/threads",
    response_model=TwitterThreadListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_twitter_threads(
    limit: int = Query(50, ge=1, le=100, description="Maximum number of threads to retrieve"),
    offset: int = Query(0, ge=0, description="Number of threads to skip"),
    current_user: User = Depends(get_current_user),
) -> TwitterThreadListResponse:
    """
    List Twitter DM threads for the current admin.
    """
    try:
        threads, total = await twitter_service.list_twitter_threads(
            user_id=current_user.id,
            limit=limit,
            offset=offset,
        )

        return TwitterThreadListResponse(
            threads=[
                TwitterMessageMetadata(
                    id=t.thread_id,
                    role="thread",
                    content=f"{t.sender_id or 'Unknown'} ↔ {t.account_id or 'Unknown'}",
                    timestamp=t.last_message_at,
                    metadata={
                        "from": t.sender_id,
                        "to": t.account_id,
                        "message_count": t.message_count,
                    },
                )
                for t in threads
            ],
            total=total,
            limit=limit,
            offset=offset,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Error listing Twitter threads: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while listing Twitter threads: {str(exc)}",
        ) from exc


@router.get(
    "/threads/{thread_id}",
    response_model=TwitterThreadMessagesResponse,
    status_code=status.HTTP_200_OK,
)
async def get_twitter_thread_messages(
    thread_id: str,
    current_user: User = Depends(get_current_user),
) -> TwitterThreadMessagesResponse:
    """
    Get messages for a specific Twitter DM thread.
    """
    try:
        messages = await twitter_service.list_twitter_thread_messages(
            user_id=current_user.id,
            thread_id=thread_id,
        )

        return TwitterThreadMessagesResponse(
            thread_id=thread_id,
            messages=[
                TwitterMessageMetadata(
                    id=m["id"],
                    role=m["role"],
                    content=m["content"],
                    timestamp=m.get("timestamp"),
                    metadata=m.get("metadata") or {},
                )
                for m in messages
            ],
        )
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "Error getting Twitter thread messages for %s: %s", thread_id, exc, exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving Twitter thread messages: {str(exc)}",
        ) from exc


@router.post(
    "/threads/{thread_id}/reply",
    response_model=TwitterReplyResponse,
    status_code=status.HTTP_200_OK,
)
async def reply_to_twitter_thread(
    thread_id: str,
    request: TwitterReplyRequest,
    current_user: User = Depends(get_current_user),
) -> TwitterReplyResponse:
    """
    Send a Twitter DM reply for the specified thread and persist it in the conversation history.
    """
    if not request.body.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reply body must not be empty",
        )

    try:
        message_dict = await twitter_service.send_twitter_reply(
            user_id=current_user.id,
            thread_id=thread_id,
            body=request.body,
        )
        message = TwitterMessageMetadata(
            id=message_dict["id"],
            role=message_dict["role"],
            content=message_dict["content"],
            timestamp=message_dict.get("timestamp"),
            metadata=message_dict.get("metadata") or {},
        )
        return TwitterReplyResponse(message=message)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "Error sending Twitter reply for thread %s: %s", thread_id, exc, exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while sending the Twitter reply: {str(exc)}",
        ) from exc
