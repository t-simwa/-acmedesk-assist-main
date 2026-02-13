"""
Conversation management API endpoints.

Implements:
- GET /api/conversations - Retrieve conversation history for a session
- DELETE /api/conversations/{id} - Delete a conversation by session ID
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from ..schemas.chat import (
    ConversationHistoryResponse,
    ConversationMessage,
    DeleteConversationResponse,
)
from ..services import database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get(
    "",
    response_model=ConversationHistoryResponse,
    status_code=status.HTTP_200_OK,
)
async def get_conversations(
    session_id: str = Query(..., description="Session identifier"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of messages to retrieve"),
    offset: int = Query(0, ge=0, description="Number of messages to skip"),
) -> ConversationHistoryResponse:
    """
    Retrieve conversation history for a session.

    This endpoint:
    1. Validates the session_id query parameter
    2. Retrieves conversation messages with pagination
    3. Returns a structured response with messages and metadata

    Args:
        session_id: Session identifier (required query parameter)
        limit: Maximum number of messages to retrieve (default: 50, max: 100)
        offset: Number of messages to skip for pagination (default: 0)

    Returns:
        ConversationHistoryResponse with messages, total count, and pagination info

    Raises:
        HTTPException: If request validation fails or processing error occurs
    """
    logger.info(
        "Received conversation history request: session_id=%s, limit=%s, offset=%s",
        session_id,
        limit,
        offset,
    )

    try:
        # Retrieve conversation history from database
        messages, total = await database.get_conversation_history(
            session_id=session_id, limit=limit, offset=offset
        )

        # Convert dict messages to ConversationMessage models
        conversation_messages = [
            ConversationMessage(
                id=msg["id"],
                role=msg["role"],
                content=msg["content"],
                timestamp=msg["timestamp"],
                metadata=msg.get("metadata"),
            )
            for msg in messages
        ]

        response = ConversationHistoryResponse(
            session_id=session_id,
            messages=conversation_messages,
            total=total,
            limit=limit,
            offset=offset,
        )

        logger.info(
            "Conversation history retrieved successfully: session_id=%s, "
            "total=%s, returned=%s",
            session_id,
            total,
            len(conversation_messages),
        )

        return response

    except Exception as e:
        logger.error(
            "Error retrieving conversation history: %s, session_id=%s",
            str(e),
            session_id,
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving conversation history: {str(e)}",
        )


@router.delete(
    "/{session_id}",
    response_model=DeleteConversationResponse,
    status_code=status.HTTP_200_OK,
)
async def delete_conversation(session_id: str) -> DeleteConversationResponse:
    """
    Delete a conversation by session ID.

    This endpoint:
    1. Validates the session_id path parameter
    2. Deletes all messages associated with the session
    3. Returns a success confirmation

    Args:
        session_id: Session identifier (path parameter)

    Returns:
        DeleteConversationResponse with deletion status and message

    Raises:
        HTTPException: If processing error occurs
    """
    logger.info("Received delete conversation request: session_id=%s", session_id)

    try:
        # Delete conversation from database
        deleted = await database.delete_conversation(session_id=session_id)

        if deleted:
            response = DeleteConversationResponse(
                session_id=session_id,
                deleted=True,
                message=f"Conversation with session_id '{session_id}' has been successfully deleted.",
            )
            logger.info("Conversation deleted successfully: session_id=%s", session_id)
        else:
            response = DeleteConversationResponse(
                session_id=session_id,
                deleted=False,
                message=f"No conversation found with session_id '{session_id}'.",
            )
            logger.info("No conversation found to delete: session_id=%s", session_id)

        return response

    except Exception as e:
        logger.error(
            "Error deleting conversation: %s, session_id=%s",
            str(e),
            session_id,
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deleting the conversation: {str(e)}",
        )
