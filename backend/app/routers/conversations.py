"""
Conversation management API endpoints.

Implements:
- GET /api/conversations - Retrieve conversation history for a session
- DELETE /api/conversations/{id} - Delete a conversation by session ID
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.chat import (
    ConversationHistoryResponse,
    ConversationMessage,
    DeleteConversationResponse,
    MessageReactionRequest,
    MessageReactionResponse,
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
    current_user: User = Depends(get_current_user),
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
        # Retrieve conversation history from database (filtered by user_id)
        messages, total = await database.get_conversation_history(
            session_id=session_id, limit=limit, offset=offset, user_id=current_user.id
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
async def delete_conversation(
    session_id: str,
    current_user: User = Depends(get_current_user)
) -> DeleteConversationResponse:
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
        # Delete conversation from database (filtered by user_id)
        deleted = await database.delete_conversation(session_id=session_id, user_id=current_user.id)

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


@router.post(
    "/messages/reaction",
    response_model=MessageReactionResponse,
    status_code=status.HTTP_200_OK,
)
async def update_message_reaction(
    request: MessageReactionRequest,
    current_user: User = Depends(get_current_user)
) -> MessageReactionResponse:
    """
    Update reaction for a message.

    This endpoint:
    1. Validates the request body
    2. Updates the message reaction in the database
    3. Returns the updated reaction status

    Args:
        request: MessageReactionRequest containing message_id and reaction

    Returns:
        MessageReactionResponse with updated reaction status

    Raises:
        HTTPException: If request validation fails or processing error occurs
    """
    logger.info(
        "Received message reaction update: message_id=%s, reaction=%s",
        request.message_id,
        request.reaction,
    )

    # Validate reaction type
    if request.reaction not in ["thumbs_up", "thumbs_down"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reaction must be 'thumbs_up' or 'thumbs_down'",
        )

    try:
        # Update message reaction in database (filtered by user_id)
        updated = await database.update_message_reaction(
            message_id=request.message_id,
            reaction=request.reaction,
            user_id=current_user.id,
        )

        if updated:
            response = MessageReactionResponse(
                message_id=request.message_id,
                reaction=request.reaction,
                success=True,
            )
            logger.info(
                "Message reaction updated successfully: message_id=%s, reaction=%s",
                request.message_id,
                request.reaction,
            )
        else:
            response = MessageReactionResponse(
                message_id=request.message_id,
                reaction=None,
                success=False,
            )
            logger.warning(
                "Message not found for reaction update: message_id=%s",
                request.message_id,
            )

        return response

    except Exception as e:
        logger.error(
            "Error updating message reaction: %s, message_id=%s",
            str(e),
            request.message_id,
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating message reaction: {str(e)}",
        )


@router.delete(
    "/messages/reaction/{message_id}",
    response_model=MessageReactionResponse,
    status_code=status.HTTP_200_OK,
)
async def remove_message_reaction(
    message_id: str,
    current_user: User = Depends(get_current_user)
) -> MessageReactionResponse:
    """
    Remove reaction from a message.

    Args:
        message_id: Message identifier

    Returns:
        MessageReactionResponse with success status

    Raises:
        HTTPException: If processing error occurs
    """
    logger.info("Received remove message reaction request: message_id=%s", message_id)

    try:
        # Remove message reaction from database (filtered by user_id)
        updated = await database.update_message_reaction(
            message_id=message_id,
            reaction=None,
            user_id=current_user.id,
        )

        if updated:
            response = MessageReactionResponse(
                message_id=message_id,
                reaction=None,
                success=True,
            )
            logger.info("Message reaction removed successfully: message_id=%s", message_id)
        else:
            response = MessageReactionResponse(
                message_id=message_id,
                reaction=None,
                success=False,
            )
            logger.warning("Message not found for reaction removal: message_id=%s", message_id)

        return response

    except Exception as e:
        logger.error(
            "Error removing message reaction: %s, message_id=%s",
            str(e),
            message_id,
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while removing message reaction: {str(e)}",
        )
