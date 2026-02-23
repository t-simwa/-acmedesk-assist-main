"""
WhatsApp channel API endpoints (J2.2 – WhatsApp Integration).

Implements:
- POST /api/whatsapp/inbound-test        – Create a mock inbound WhatsApp message for testing
- GET  /api/whatsapp/threads             – List WhatsApp threads for the current admin
- GET  /api/whatsapp/threads/{thread_id} – List messages for a specific WhatsApp thread
- POST /api/whatsapp/threads/{thread_id}/reply – Send a WhatsApp reply and persist it
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from ..models.user import User
from ..routers.auth import get_current_user
from ..services import whatsapp_service

logger = logging.getLogger(__name__)


class WhatsAppMessageMetadata(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str | None = None
    metadata: dict = Field(default_factory=dict)


class WhatsAppThreadListResponse(BaseModel):
    threads: List[WhatsAppMessageMetadata]
    total: int
    limit: int
    offset: int


class WhatsAppThreadMessagesResponse(BaseModel):
    thread_id: str
    messages: List[WhatsAppMessageMetadata]


class WhatsAppReplyRequest(BaseModel):
    body: str = Field(..., min_length=1)


class WhatsAppReplyResponse(BaseModel):
    message: WhatsAppMessageMetadata


class WhatsAppInboundTestRequest(BaseModel):
    wa_id: str = Field(..., description="Customer WhatsApp ID / phone (e.g. +15551234567)")
    business_number: str = Field(
        ..., description="Business WhatsApp number configured for this channel"
    )
    body: str = Field(..., description="Message body content")
    media_urls: Optional[list[str]] = Field(
        default=None, description="Optional list of media URLs for rich content"
    )
    caption: Optional[str] = Field(
        default=None, description="Optional caption for rich media messages"
    )


router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])


@router.post(
    "/inbound-test",
    response_model=WhatsAppMessageMetadata,
    status_code=status.HTTP_201_CREATED,
)
async def create_inbound_whatsapp_test_message(
    request: WhatsAppInboundTestRequest,
    current_user: User = Depends(get_current_user),
) -> WhatsAppMessageMetadata:
    """
    Create a mock inbound WhatsApp message for the current admin.

    This endpoint is primarily for manual testing and development; in production,
    a provider webhook or integration layer should call whatsapp_service.create_inbound_whatsapp_message
    directly.
    """
    try:
        message_dict = await whatsapp_service.create_inbound_whatsapp_message(
            user_id=current_user.id,
            wa_id=request.wa_id,
            business_number=request.business_number,
            body=request.body,
            provider_message_id=None,
            media_urls=request.media_urls,
            caption=request.caption,
        )
        return WhatsAppMessageMetadata(
            id=message_dict["id"],
            role=message_dict["role"],
            content=message_dict["content"],
            timestamp=message_dict.get("timestamp"),
            metadata=message_dict.get("metadata") or {},
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Error creating inbound WhatsApp test message: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the inbound WhatsApp message: {str(exc)}",
        ) from exc


@router.get(
    "/threads",
    response_model=WhatsAppThreadListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_whatsapp_threads(
    limit: int = Query(50, ge=1, le=100, description="Maximum number of threads to retrieve"),
    offset: int = Query(0, ge=0, description="Number of threads to skip"),
    current_user: User = Depends(get_current_user),
) -> WhatsAppThreadListResponse:
    """
    List WhatsApp threads for the current admin.
    """
    try:
        threads, total = await whatsapp_service.list_whatsapp_threads(
            user_id=current_user.id,
            limit=limit,
            offset=offset,
        )

        return WhatsAppThreadListResponse(
            threads=[
                WhatsAppMessageMetadata(
                    id=t.thread_id,
                    role="thread",
                    content=f"{t.wa_id or 'Unknown'} ↔ {t.business_number or 'Unknown'}",
                    timestamp=t.last_message_at,
                    metadata={
                        "from": t.wa_id,
                        "to": t.business_number,
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
        logger.error("Error listing WhatsApp threads: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while listing WhatsApp threads: {str(exc)}",
        ) from exc


@router.get(
    "/threads/{thread_id}",
    response_model=WhatsAppThreadMessagesResponse,
    status_code=status.HTTP_200_OK,
)
async def get_whatsapp_thread_messages(
    thread_id: str,
    current_user: User = Depends(get_current_user),
) -> WhatsAppThreadMessagesResponse:
    """
    Get messages for a specific WhatsApp thread.
    """
    try:
        messages = await whatsapp_service.list_whatsapp_thread_messages(
            user_id=current_user.id,
            thread_id=thread_id,
        )

        return WhatsAppThreadMessagesResponse(
            thread_id=thread_id,
            messages=[
                WhatsAppMessageMetadata(
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
            "Error getting WhatsApp thread messages for %s: %s", thread_id, exc, exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving WhatsApp thread messages: {str(exc)}",
        ) from exc


@router.post(
    "/threads/{thread_id}/reply",
    response_model=WhatsAppReplyResponse,
    status_code=status.HTTP_200_OK,
)
async def reply_to_whatsapp_thread(
    thread_id: str,
    request: WhatsAppReplyRequest,
    current_user: User = Depends(get_current_user),
) -> WhatsAppReplyResponse:
    """
    Send a WhatsApp reply for the specified thread and persist it in the conversation history.
    """
    if not request.body.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reply body must not be empty",
        )

    try:
        message_dict = await whatsapp_service.send_whatsapp_reply(
            user_id=current_user.id,
            thread_id=thread_id,
            body=request.body,
        )
        message = WhatsAppMessageMetadata(
            id=message_dict["id"],
            role=message_dict["role"],
            content=message_dict["content"],
            timestamp=message_dict.get("timestamp"),
            metadata=message_dict.get("metadata") or {},
        )
        return WhatsAppReplyResponse(message=message)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "Error sending WhatsApp reply for thread %s: %s", thread_id, exc, exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while sending the WhatsApp reply: {str(exc)}",
        ) from exc

