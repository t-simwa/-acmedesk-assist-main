"""
Settings API endpoints.

Implements:
- GET /api/settings/rag - Get RAG configuration settings
- PUT /api/settings/rag - Update RAG configuration settings
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, status

from ..config import settings
from ..schemas.settings import RAGSettingsResponse, RAGSettingsUpdateRequest, RAGSettingsUpdateResponse
from ..services import database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/rag", response_model=RAGSettingsResponse, status_code=status.HTTP_200_OK)
async def get_rag_settings() -> RAGSettingsResponse:
    """
    Get current RAG configuration settings.

    Returns the current RAG settings including:
    - Model selection
    - Temperature settings
    - Max tokens configuration
    - Top-K results
    - System prompt customization
    - Chunk size settings

    Returns:
        RAGSettingsResponse with current RAG configuration

    Raises:
        HTTPException: If there's an error retrieving settings
    """
    try:
        # Try to get settings from database first
        db_settings = await database.get_rag_settings()

        if db_settings:
            # Use database settings
            logger.info("Retrieved RAG settings from database")
            return RAGSettingsResponse(
                model=db_settings.get("model", settings.llm_model),
                temperature=db_settings.get("temperature", settings.llm_temperature),
                top_k=db_settings.get("top_k", settings.retrieval_top_k),
                max_tokens=db_settings.get("max_tokens", settings.llm_max_tokens),
                system_prompt=db_settings.get("system_prompt", settings.system_prompt),
                chunk_size=db_settings.get("chunk_size", settings.chunk_size),
            )
        else:
            # Fall back to config defaults
            logger.info("Using default RAG settings from config")
            return RAGSettingsResponse(
                model=settings.llm_model,
                temperature=settings.llm_temperature,
                top_k=settings.retrieval_top_k,
                max_tokens=settings.llm_max_tokens,
                system_prompt=settings.system_prompt,
                chunk_size=settings.chunk_size,
            )

    except Exception as e:
        logger.error(f"Error getting RAG settings: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving RAG settings: {str(e)}",
        )


@router.put("/rag", response_model=RAGSettingsUpdateResponse, status_code=status.HTTP_200_OK)
async def update_rag_settings(request: RAGSettingsUpdateRequest) -> RAGSettingsUpdateResponse:
    """
    Update RAG configuration settings.

    Updates the RAG configuration for the tenant/project. Only provided fields are updated.
    Fields that are not provided remain unchanged.

    Args:
        request: RAGSettingsUpdateRequest with fields to update

    Returns:
        RAGSettingsUpdateResponse with updated settings

    Raises:
        HTTPException: If there's an error updating settings
    """
    try:
        # Get current settings (from database or config)
        current_settings = await database.get_rag_settings()

        if current_settings:
            # Update existing settings
            updated_settings = current_settings.copy()
        else:
            # Start with config defaults
            updated_settings = {
                "model": settings.llm_model,
                "temperature": settings.llm_temperature,
                "top_k": settings.retrieval_top_k,
                "max_tokens": settings.llm_max_tokens,
                "system_prompt": settings.system_prompt,
                "chunk_size": settings.chunk_size,
            }

        # Update only provided fields
        if request.model is not None:
            updated_settings["model"] = request.model
        if request.temperature is not None:
            updated_settings["temperature"] = request.temperature
        if request.top_k is not None:
            updated_settings["top_k"] = request.top_k
        if request.max_tokens is not None:
            updated_settings["max_tokens"] = request.max_tokens
        if request.system_prompt is not None:
            updated_settings["system_prompt"] = request.system_prompt
        if request.chunk_size is not None:
            updated_settings["chunk_size"] = request.chunk_size

        # Save to database
        await database.update_rag_settings(updated_settings)

        logger.info(f"Updated RAG settings: {updated_settings}")

        # Return updated settings
        response_settings = RAGSettingsResponse(
            model=updated_settings["model"],
            temperature=updated_settings["temperature"],
            top_k=updated_settings["top_k"],
            max_tokens=updated_settings["max_tokens"],
            system_prompt=updated_settings.get("system_prompt"),
            chunk_size=updated_settings["chunk_size"],
        )

        return RAGSettingsUpdateResponse(
            message="RAG settings updated successfully",
            settings=response_settings,
        )

    except Exception as e:
        logger.error(f"Error updating RAG settings: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating RAG settings: {str(e)}",
        )
