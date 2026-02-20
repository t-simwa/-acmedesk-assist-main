"""
Knowledge Base management API endpoints.

Implements:
- GET /api/knowledge-bases - List knowledge bases
- POST /api/knowledge-bases - Create a knowledge base
- GET /api/knowledge-bases/{id} - Get knowledge base details
- PUT /api/knowledge-bases/{id} - Update a knowledge base
- DELETE /api/knowledge-bases/{id} - Delete a knowledge base
- GET /api/knowledge-bases/preferences - Get user knowledge base preferences
- PUT /api/knowledge-bases/preferences - Update user knowledge base preferences
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.knowledge_base import (
    CreateKnowledgeBaseRequest,
    KnowledgeBaseListResponse,
    KnowledgeBaseMetadata,
    KnowledgeBasePreferencesResponse,
    KnowledgeBaseResponse,
    UpdateKnowledgeBasePreferencesRequest,
    UpdateKnowledgeBaseRequest,
    UserKnowledgeBasePreferences,
)
from ..services import database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/knowledge-bases", tags=["knowledge-bases"])


# IMPORTANT: /preferences routes must come BEFORE /{kb_id} routes
# Otherwise FastAPI will match "preferences" as a kb_id parameter
@router.get("/preferences", response_model=KnowledgeBasePreferencesResponse, status_code=status.HTTP_200_OK)
async def get_knowledge_base_preferences(
    current_user: User = Depends(get_current_user),
) -> KnowledgeBasePreferencesResponse:
    """
    Get user knowledge base preferences.

    Returns:
        KnowledgeBasePreferencesResponse with user preferences
    """
    try:
        prefs = await database.get_user_knowledge_base_preferences(current_user.id)

        return KnowledgeBasePreferencesResponse(
            preferences=UserKnowledgeBasePreferences(
                use_default_kb=prefs["use_default_kb"],
                active_kb_ids=prefs["active_kb_ids"],
            )
        )
    except Exception as e:
        logger.error(f"Error getting KB preferences: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get knowledge base preferences: {str(e)}",
        )


@router.put("/preferences", response_model=KnowledgeBasePreferencesResponse, status_code=status.HTTP_200_OK)
async def update_knowledge_base_preferences(
    request: UpdateKnowledgeBasePreferencesRequest,
    current_user: User = Depends(get_current_user),
) -> KnowledgeBasePreferencesResponse:
    """
    Update user knowledge base preferences.

    Args:
        request: UpdateKnowledgeBasePreferencesRequest with preferences

    Returns:
        KnowledgeBasePreferencesResponse with updated preferences
    """
    try:
        updated_prefs = await database.update_user_knowledge_base_preferences(
            user_id=current_user.id,
            use_default_kb=request.use_default_kb,
            active_kb_ids=request.active_kb_ids,
        )

        return KnowledgeBasePreferencesResponse(
            preferences=UserKnowledgeBasePreferences(
                use_default_kb=updated_prefs["use_default_kb"],
                active_kb_ids=updated_prefs["active_kb_ids"],
            )
        )
    except Exception as e:
        logger.error(f"Error updating KB preferences: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update knowledge base preferences: {str(e)}",
        )


@router.get("", response_model=KnowledgeBaseListResponse, status_code=status.HTTP_200_OK)
async def list_knowledge_bases(
    current_user: User = Depends(get_current_user),
) -> KnowledgeBaseListResponse:
    """
    List knowledge bases available to the current user.

    Returns default knowledge base + user's custom knowledge bases.

    Returns:
        KnowledgeBaseListResponse with list of knowledge bases
    """
    try:
        knowledge_bases = await database.list_knowledge_bases(user_id=current_user.id)

        return KnowledgeBaseListResponse(
            knowledge_bases=[KnowledgeBaseMetadata(**kb) for kb in knowledge_bases],
            total=len(knowledge_bases),
        )
    except Exception as e:
        logger.error(f"Error listing knowledge bases: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list knowledge bases: {str(e)}",
        )


@router.post("", response_model=KnowledgeBaseResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge_base(
    request: CreateKnowledgeBaseRequest,
    current_user: User = Depends(get_current_user),
) -> KnowledgeBaseResponse:
    """
    Create a new knowledge base.

    Args:
        request: CreateKnowledgeBaseRequest with name and optional description

    Returns:
        KnowledgeBaseResponse with created knowledge base metadata
    """
    try:
        knowledge_base = await database.create_knowledge_base(
            name=request.name,
            user_id=current_user.id,
            description=request.description,
        )

        return KnowledgeBaseResponse(knowledge_base=KnowledgeBaseMetadata(**knowledge_base))
    except Exception as e:
        logger.error(f"Error creating knowledge base: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create knowledge base: {str(e)}",
        )


@router.get("/{kb_id}", response_model=KnowledgeBaseResponse, status_code=status.HTTP_200_OK)
async def get_knowledge_base(
    kb_id: str,
    current_user: User = Depends(get_current_user),
) -> KnowledgeBaseResponse:
    """
    Get knowledge base details by ID.

    Args:
        kb_id: Knowledge base identifier

    Returns:
        KnowledgeBaseResponse with knowledge base metadata

    Raises:
        HTTPException: If knowledge base is not found or user doesn't have access
    """
    knowledge_base = await database.get_knowledge_base(kb_id)
    if not knowledge_base:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Knowledge base not found: {kb_id}",
        )

    # Check access: user can access default KB or their own KBs
    if not knowledge_base.get("is_default") and knowledge_base.get("user_id") != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this knowledge base",
        )

    return KnowledgeBaseResponse(knowledge_base=KnowledgeBaseMetadata(**knowledge_base))


@router.put("/{kb_id}", response_model=KnowledgeBaseResponse, status_code=status.HTTP_200_OK)
async def update_knowledge_base(
    kb_id: str,
    request: UpdateKnowledgeBaseRequest,
    current_user: User = Depends(get_current_user),
) -> KnowledgeBaseResponse:
    """
    Update a knowledge base.

    Args:
        kb_id: Knowledge base identifier
        request: UpdateKnowledgeBaseRequest with fields to update

    Returns:
        KnowledgeBaseResponse with updated knowledge base metadata

    Raises:
        HTTPException: If knowledge base is not found or user doesn't have access
    """
    # Check if KB exists and user has access
    knowledge_base = await database.get_knowledge_base(kb_id)
    if not knowledge_base:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Knowledge base not found: {kb_id}",
        )

    # User can only update their own KBs (not default)
    if knowledge_base.get("is_default") or knowledge_base.get("user_id") != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this knowledge base",
        )

    try:
        updated_kb = await database.update_knowledge_base(
            kb_id=kb_id,
            name=request.name,
            description=request.description,
            is_active=request.is_active,
        )

        if not updated_kb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Knowledge base not found: {kb_id}",
            )

        return KnowledgeBaseResponse(knowledge_base=KnowledgeBaseMetadata(**updated_kb))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating knowledge base: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update knowledge base: {str(e)}",
        )


@router.delete("/{kb_id}", status_code=status.HTTP_200_OK)
async def delete_knowledge_base(
    kb_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Delete a knowledge base.

    Args:
        kb_id: Knowledge base identifier

    Returns:
        Success message

    Raises:
        HTTPException: If knowledge base is not found or user doesn't have permission
    """
    # Check if KB exists
    knowledge_base = await database.get_knowledge_base(kb_id)
    if not knowledge_base:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Knowledge base not found: {kb_id}",
        )

    # User can only delete their own KBs (not default)
    if knowledge_base.get("is_default"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete the default knowledge base",
        )

    if knowledge_base.get("user_id") != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this knowledge base",
        )

    try:
        deleted = await database.delete_knowledge_base(kb_id=kb_id, user_id=current_user.id)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Knowledge base not found: {kb_id}",
            )

        return {"message": f"Knowledge base '{knowledge_base['name']}' has been successfully deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting knowledge base: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete knowledge base: {str(e)}",
        )
