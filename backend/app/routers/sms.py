"""
SMS channel API endpoints (J2.1 – SMS Integration).

Implements:
- POST /api/sms/inbound-test        – Create a mock inbound SMS message for testing
- GET  /api/sms/threads             – List SMS threads for the current admin
- GET  /api/sms/threads/{thread_id} – List messages for a specific SMS thread
- POST /api/sms/threads/{thread_id}/reply – Send an SMS reply and persist it
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from ..models.user import User
from ..routers.auth import get_current_user
from ..services import sms_service

logger = logging.getLogger(__name__)


class SmsMessageMetadata(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str | None = None
    metadata: dict = Field(default_factory=dict)


class SmsThreadListResponse(BaseModel):
    threads: List[SmsMessageMetadata]
    total: int
    limit: int
    offset: int


class SmsThreadMessagesResponse(BaseModel):
    thread_id: str
    messages: List[SmsMessageMetadata]


class SmsReplyRequest(BaseModel):
    body: str = Field(..., min_length=1)


class SmsReplyResponse(BaseModel):
    message: SmsMessageMetadata


class SmsInboundTestRequest(BaseModel):
    from_number: str = Field(..., description="Customer phone number (e.g. +15551234567)")
    to_number: str = Field(..., description="Support number configured for SMS")
    body: str = Field(..., description="Message body content")


router = APIRouter(prefix="/api/sms", tags=["sms"])


@router.post(
    "/inbound-test",
    response_model=SmsMessageMetadata,
    status_code=status.HTTP_201_CREATED,
)
async def create_inbound_sms_test_message(
    request: SmsInboundTestRequest,
    current_user: User = Depends(get_current_user),
) -> SmsMessageMetadata:
    """
    Create a mock inbound SMS message for the current admin.

    This endpoint is primarily for manual testing and development; in production,
    a provider webhook or integration layer should call sms_service.create_inbound_sms_message
    directly.
    """
    try:
        message_dict = await sms_service.create_inbound_sms_message(
            user_id=current_user.id,
            from_number=request.from_number,
            to_number=request.to_number,
            body=request.body,
            provider_message_id=None,
        )
        return SmsMessageMetadata(
            id=message_dict["id"],
            role=message_dict["role"],
            content=message_dict["content"],
            timestamp=message_dict.get("timestamp"),
            metadata=message_dict.get("metadata") or {},
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Error creating inbound SMS test message: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the inbound SMS message: {str(exc)}",
        ) from exc


@router.get(
    "/threads",
    response_model=SmsThreadListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_sms_threads(
    limit: int = Query(50, ge=1, le=100, description="Maximum number of threads to retrieve"),
    offset: int = Query(0, ge=0, description="Number of threads to skip"),
    current_user: User = Depends(get_current_user),
) -> SmsThreadListResponse:
    """
    List SMS threads for the current admin.
    """
    try:
        threads, total = await sms_service.list_sms_threads(
            user_id=current_user.id,
            limit=limit,
            offset=offset,
        )

        return SmsThreadListResponse(
            threads=[
                SmsMessageMetadata(
                    id=t.thread_id,
                    role="thread",
                    content=f"{t.from_number or 'Unknown'} ↔ {t.to_number or 'Unknown'}",
                    timestamp=t.last_message_at,
                    metadata={
                        "from": t.from_number,
                        "to": t.to_number,
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
        logger.error("Error listing SMS threads: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while listing SMS threads: {str(exc)}",
        ) from exc


@router.get(
    "/threads/{thread_id}",
    response_model=SmsThreadMessagesResponse,
    status_code=status.HTTP_200_OK,
)
async def get_sms_thread_messages(
    thread_id: str,
    current_user: User = Depends(get_current_user),
) -> SmsThreadMessagesResponse:
    """
    Get messages for a specific SMS thread.
    """
    try:
        messages = await sms_service.list_sms_thread_messages(
            user_id=current_user.id,
            thread_id=thread_id,
        )

        return SmsThreadMessagesResponse(
            thread_id=thread_id,
            messages=[
                SmsMessageMetadata(
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
        logger.error("Error getting SMS thread messages for %s: %s", thread_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving SMS thread messages: {str(exc)}",
        ) from exc


@router.post(
    "/threads/{thread_id}/reply",
    response_model=SmsReplyResponse,
    status_code=status.HTTP_200_OK,
)
async def reply_to_sms_thread(
    thread_id: str,
    request: SmsReplyRequest,
    current_user: User = Depends(get_current_user),
) -> SmsReplyResponse:
    """
    Send an SMS reply for the specified thread and persist it in the conversation history.
    """
    if not request.body.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reply body must not be empty",
        )

    try:
        message_dict = await sms_service.send_sms_reply(
            user_id=current_user.id,
            thread_id=thread_id,
            body=request.body,
        )
        message = SmsMessageMetadata(
            id=message_dict["id"],
            role=message_dict["role"],
            content=message_dict["content"],
            timestamp=message_dict.get("timestamp"),
            metadata=message_dict.get("metadata") or {},
        )
        return SmsReplyResponse(message=message)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.error("Error sending SMS reply for thread %s: %s", thread_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while sending the SMS reply: {str(exc)}",
        ) from exc

