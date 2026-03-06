"""
Conversation management API endpoints.

Implements:
- GET /api/conversations - Retrieve conversation history for a session
- DELETE /api/conversations/{id} - Delete a conversation by session ID
- GET /api/conversations/admin/list - Admin paginated list with filters (7.4)
- GET /api/conversations/admin/{id} - Admin conversation detail (7.4)
- PATCH /api/conversations/admin/{id}/status - Update status (7.4)
- POST /api/conversations/admin/{id}/notes - Add internal note (7.4)
- POST /api/conversations/admin/{id}/flag - Toggle training flag (7.4)
- POST /api/conversations/admin/bulk - Bulk actions (7.4)
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
from ..schemas.conversations import (
    ConversationListResponse,
    ConversationDetailResponse,
    ConversationStatusUpdateRequest,
    ConversationStatusUpdateResponse,
    ConversationNoteRequest,
    ConversationNoteResponse,
    ConversationFlagResponse,
    ConversationBulkRequest,
    ConversationBulkResponse,
    ConversationFeedbackRequest,
    ConversationFeedbackResponse,
    ConversationLeadRequest,
    ConversationLeadResponse,
)
from ..services import database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


# =============================================================================
# Milestone 7.4 — Admin Conversation Management
# NOTE: /admin/* routes must be declared BEFORE /{session_id} to avoid
# FastAPI matching "admin" as a session_id.
# =============================================================================

@router.get(
    "/admin/list",
    response_model=ConversationListResponse,
    status_code=status.HTTP_200_OK,
    summary="List conversations with filters (admin)",
)
async def list_conversations_admin(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search contact name, phone, email, or message content"),
    channel: Optional[str] = Query(None, description="Filter by channel (web/whatsapp/instagram/facebook/email/sms/all)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (active/resolved/escalated/abandoned/all)"),
    date_from: Optional[str] = Query(None, description="ISO 8601 start date"),
    date_to: Optional[str] = Query(None, description="ISO 8601 end date"),
    rating: Optional[str] = Query(None, description="Filter by rating (positive/negative/none/all)"),
    current_user: User = Depends(get_current_user),
) -> ConversationListResponse:
    """
    Paginated list of conversations for the admin dashboard table.
    Supports filtering by search, channel, status, date range, and rating.
    Also returns stats summary (total/active/resolved/escalated/abandoned).
    """
    tenant_id = current_user.tenant_id or current_user.id
    try:
        data = await database.get_admin_conversation_list(
            tenant_id=tenant_id,
            page=page,
            per_page=per_page,
            search=search,
            channel=channel,
            status=status_filter,
            date_from=date_from,
            date_to=date_to,
            rating=rating,
        )
        return ConversationListResponse(**data)
    except Exception as e:
        logger.error("Error listing conversations: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing conversations: {str(e)}",
        )


@router.get(
    "/admin/{conversation_id}",
    response_model=ConversationDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get full conversation detail (admin)",
)
async def get_conversation_detail_admin(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
) -> ConversationDetailResponse:
    """Full conversation detail: transcript, contact info, timeline."""
    tenant_id = current_user.tenant_id or current_user.id
    try:
        data = await database.get_admin_conversation_detail(
            conversation_id=conversation_id,
            tenant_id=tenant_id,
        )
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation {conversation_id} not found",
            )
        return ConversationDetailResponse(**data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error getting conversation detail %s: %s", conversation_id, str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting conversation: {str(e)}",
        )


@router.patch(
    "/admin/{conversation_id}/status",
    response_model=ConversationStatusUpdateResponse,
    status_code=status.HTTP_200_OK,
    summary="Update conversation status (admin)",
)
async def update_conversation_status_admin(
    conversation_id: str,
    request: ConversationStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
) -> ConversationStatusUpdateResponse:
    """Change a conversation's status (resolved/escalated/abandoned/active)."""
    tenant_id = current_user.tenant_id or current_user.id
    valid_statuses = {"active", "resolved", "escalated", "abandoned"}
    if request.status.lower() not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
        )
    try:
        updated = await database.update_admin_conversation_status(
            conversation_id=conversation_id,
            tenant_id=tenant_id,
            new_status=request.status.lower(),
            reason=request.reason,
        )
        return ConversationStatusUpdateResponse(
            id=conversation_id,
            status=request.status.lower(),
            updated=updated,
            message="Status updated successfully" if updated else "Conversation not found",
        )
    except Exception as e:
        logger.error("Error updating conversation status %s: %s", conversation_id, str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating status: {str(e)}",
        )


@router.post(
    "/admin/{conversation_id}/notes",
    response_model=ConversationNoteResponse,
    status_code=status.HTTP_200_OK,
    summary="Add internal note to conversation (admin)",
)
async def add_conversation_note_admin(
    conversation_id: str,
    request: ConversationNoteRequest,
    current_user: User = Depends(get_current_user),
) -> ConversationNoteResponse:
    """Add an internal note to a conversation (visible to agents only)."""
    tenant_id = current_user.tenant_id or current_user.id
    try:
        added = await database.add_conversation_note(
            conversation_id=conversation_id,
            tenant_id=tenant_id,
            note=request.note,
        )
        return ConversationNoteResponse(
            conversation_id=conversation_id,
            note=request.note,
            added=added,
            message="Note added successfully" if added else "Failed to add note",
        )
    except Exception as e:
        logger.error("Error adding note to conversation %s: %s", conversation_id, str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding note: {str(e)}",
        )


@router.post(
    "/admin/{conversation_id}/flag",
    response_model=ConversationFlagResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle 'Flag for Training' on a conversation (admin)",
)
async def flag_conversation_admin(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
) -> ConversationFlagResponse:
    """Toggle the 'flagged for AI training' status of a conversation."""
    is_flagged = database.toggle_conversation_flag(conversation_id)
    return ConversationFlagResponse(
        conversation_id=conversation_id,
        is_flagged=is_flagged,
        message=f"Conversation {'flagged' if is_flagged else 'unflagged'} for training",
    )


@router.post(
    "/admin/bulk",
    response_model=ConversationBulkResponse,
    status_code=status.HTTP_200_OK,
    summary="Bulk action on conversations (admin)",
)
async def bulk_conversations_admin(
    request: ConversationBulkRequest,
    current_user: User = Depends(get_current_user),
) -> ConversationBulkResponse:
    """
    Perform bulk actions: resolve, delete, tag contacts, or export.
    Destructive actions (delete) require explicit action='delete'.
    """
    tenant_id = current_user.tenant_id or current_user.id
    valid_actions = {"resolve", "delete", "tag", "export"}
    if request.action.lower() not in valid_actions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action. Must be one of: {', '.join(valid_actions)}",
        )
    try:
        result = await database.bulk_conversation_action(
            conversation_ids=request.conversation_ids,
            tenant_id=tenant_id,
            action=request.action.lower(),
            tag=request.tag,
            reason=request.reason,
        )
        return ConversationBulkResponse(**result)
    except Exception as e:
        logger.error("Bulk conversation action failed: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk action failed: {str(e)}",
        )


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
    "/feedback",
    response_model=ConversationFeedbackResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit conversation feedback (Flow 5 parity)",
)
async def submit_conversation_feedback(
    body: ConversationFeedbackRequest,
    current_user: User = Depends(get_current_user),
) -> ConversationFeedbackResponse:
    """
    Submit feedback (Was this conversation helpful? 👍/👎) for the in-platform chat.
    Looks up the conversation by session_id and current user (tenant_id) and sets rating.
    """
    if body.rating not in ("positive", "negative"):
        return ConversationFeedbackResponse(
            success=False,
            message="Rating must be 'positive' or 'negative'.",
        )
    try:
        ok = await database.set_conversation_rating(
            session_id=body.session_id,
            rating=body.rating,
            user_id=current_user.id,
        )
        if ok:
            return ConversationFeedbackResponse(success=True, message="Feedback saved successfully.")
        return ConversationFeedbackResponse(
            success=False,
            message="No conversation found for this session.",
        )
    except Exception as e:
        logger.error("Error saving conversation feedback: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save feedback.",
        )


@router.post(
    "/lead",
    response_model=ConversationLeadResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit lead capture from in-platform chat (Flow 5 parity)",
)
async def submit_conversation_lead(
    body: ConversationLeadRequest,
    current_user: User = Depends(get_current_user),
) -> ConversationLeadResponse:
    """Save lead data (name, email, etc.) for the current session's conversation."""
    try:
        ok = await database.create_lead_for_session(
            session_id=body.session_id,
            user_id=current_user.id,
            lead_data=body.lead_data,
        )
        if ok:
            return ConversationLeadResponse(success=True, message="Lead captured successfully.")
        return ConversationLeadResponse(
            success=False,
            message="No conversation found for this session.",
        )
    except Exception as e:
        logger.error("Error saving conversation lead: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to capture lead.",
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
