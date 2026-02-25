"""
Facebook Messenger channel API endpoints (J3.1 – Messenger Integration).

Implements:
- POST /api/messenger/inbound-test        – Create a mock inbound Messenger message for testing
- GET  /api/messenger/threads             – List Messenger threads for the current admin
- GET  /api/messenger/threads/{thread_id} – List messages for a specific Messenger thread
- POST /api/messenger/threads/{thread_id}/reply – Send a Messenger reply and persist it
"""

import logging
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from ..models.user import User
from ..routers.auth import get_current_user
from ..services import messenger_service

logger = logging.getLogger(__name__)


class MessengerMessageMetadata(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str | None = None
    metadata: dict = Field(default_factory=dict)


class MessengerThreadListResponse(BaseModel):
    threads: List[MessengerMessageMetadata]
    total: int
    limit: int
    offset: int


class MessengerThreadMessagesResponse(BaseModel):
    thread_id: str
    messages: List[MessengerMessageMetadata]


class MessengerReplyRequest(BaseModel):
    body: str = Field(..., min_length=1)


class MessengerReplyResponse(BaseModel):
    message: MessengerMessageMetadata


class MessengerInboundTestRequest(BaseModel):
    sender_id: str = Field(..., description="Customer's Facebook sender ID")
    page_id: str = Field(..., description="Facebook Page ID configured for this channel")
    body: str = Field(..., description="Message body content")
    attachments: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="Optional list of attachments (images, documents, etc.)"
    )


router = APIRouter(prefix="/api/messenger", tags=["messenger"])


@router.post(
    "/inbound-test",
    response_model=MessengerMessageMetadata,
    status_code=status.HTTP_201_CREATED,
)
async def create_inbound_messenger_test_message(
    request: MessengerInboundTestRequest,
    current_user: User = Depends(get_current_user),
) -> MessengerMessageMetadata:
    """
    Create a mock inbound Messenger message for the current admin.

    This endpoint is primarily for manual testing and development; in production,
    a provider webhook or integration layer should call messenger_service.create_inbound_messenger_message
    directly.
    """
    try:
        message_dict = await messenger_service.create_inbound_messenger_message(
            user_id=current_user.id,
            sender_id=request.sender_id,
            page_id=request.page_id,
            body=request.body,
            provider_message_id=None,
            attachments=request.attachments,
        )
        return MessengerMessageMetadata(
            id=message_dict["id"],
            role=message_dict["role"],
            content=message_dict["content"],
            timestamp=message_dict.get("timestamp"),
            metadata=message_dict.get("metadata") or {},
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Error creating inbound Messenger test message: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the inbound Messenger message: {str(exc)}",
        ) from exc


@router.get(
    "/threads",
    response_model=MessengerThreadListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_messenger_threads(
    limit: int = Query(50, ge=1, le=100, description="Maximum number of threads to retrieve"),
    offset: int = Query(0, ge=0, description="Number of threads to skip"),
    current_user: User = Depends(get_current_user),
) -> MessengerThreadListResponse:
    """
    List Messenger threads for the current admin.
    """
    try:
        threads, total = await messenger_service.list_messenger_threads(
            user_id=current_user.id,
            limit=limit,
            offset=offset,
        )

        return MessengerThreadListResponse(
            threads=[
                MessengerMessageMetadata(
                    id=t.thread_id,
                    role="thread",
                    content=f"{t.sender_id or 'Unknown'} ↔ {t.page_id or 'Unknown'}",
                    timestamp=t.last_message_at,
                    metadata={
                        "from": t.sender_id,
                        "to": t.page_id,
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
        logger.error("Error listing Messenger threads: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while listing Messenger threads: {str(exc)}",
        ) from exc


@router.get(
    "/threads/{thread_id}",
    response_model=MessengerThreadMessagesResponse,
    status_code=status.HTTP_200_OK,
)
async def get_messenger_thread_messages(
    thread_id: str,
    current_user: User = Depends(get_current_user),
) -> MessengerThreadMessagesResponse:
    """
    Get messages for a specific Messenger thread.
    """
    try:
        messages = await messenger_service.list_messenger_thread_messages(
            user_id=current_user.id,
            thread_id=thread_id,
        )

        return MessengerThreadMessagesResponse(
            thread_id=thread_id,
            messages=[
                MessengerMessageMetadata(
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
            "Error getting Messenger thread messages for %s: %s", thread_id, exc, exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving Messenger thread messages: {str(exc)}",
        ) from exc


@router.post(
    "/threads/{thread_id}/reply",
    response_model=MessengerReplyResponse,
    status_code=status.HTTP_200_OK,
)
async def reply_to_messenger_thread(
    thread_id: str,
    request: MessengerReplyRequest,
    current_user: User = Depends(get_current_user),
) -> MessengerReplyResponse:
    """
    Send a Messenger reply for the specified thread and persist it in the conversation history.
    """
    if not request.body.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reply body must not be empty",
        )

    try:
        message_dict = await messenger_service.send_messenger_reply(
            user_id=current_user.id,
            thread_id=thread_id,
            body=request.body,
        )
        message = MessengerMessageMetadata(
            id=message_dict["id"],
            role=message_dict["role"],
            content=message_dict["content"],
            timestamp=message_dict.get("timestamp"),
            metadata=message_dict.get("metadata") or {},
        )
        return MessengerReplyResponse(message=message)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "Error sending Messenger reply for thread %s: %s", thread_id, exc, exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while sending the Messenger reply: {str(exc)}",
        ) from exc
