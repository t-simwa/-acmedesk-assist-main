"""
Settings API endpoints.

Implements:
- GET /api/settings/rag - Get RAG configuration settings
- PUT /api/settings/rag - Update RAG configuration settings
- POST /api/settings/rag/validate - Validate RAG settings without saving
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, status

from ..config import settings
from ..schemas.settings import (
    RAGSettingsResponse,
    RAGSettingsUpdateRequest,
    RAGSettingsUpdateResponse,
    RAGSettingsValidationRequest,
    RAGSettingsValidationResponse,
)
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
                chunk_overlap=db_settings.get("chunk_overlap", settings.chunk_overlap),
                embedding_model=db_settings.get("embedding_model", settings.embedding_model),
                chunking_strategy=db_settings.get("chunking_strategy", "recursive"),
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
                chunk_overlap=settings.chunk_overlap,
                embedding_model=settings.embedding_model,
                chunking_strategy="recursive",
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
                "chunk_overlap": settings.chunk_overlap,
                "embedding_model": settings.embedding_model,
                "chunking_strategy": "recursive",
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
        if request.chunk_overlap is not None:
            updated_settings["chunk_overlap"] = request.chunk_overlap
        if request.embedding_model is not None:
            updated_settings["embedding_model"] = request.embedding_model
        if request.chunking_strategy is not None:
            updated_settings["chunking_strategy"] = request.chunking_strategy

        # Validate chunk_overlap < chunk_size
        if updated_settings["chunk_overlap"] >= updated_settings["chunk_size"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="chunk_overlap must be less than chunk_size",
            )

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
            chunk_overlap=updated_settings["chunk_overlap"],
            embedding_model=updated_settings["embedding_model"],
            chunking_strategy=updated_settings.get("chunking_strategy", "recursive"),
        )

        return RAGSettingsUpdateResponse(
            message="RAG settings updated successfully",
            settings=response_settings,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating RAG settings: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating RAG settings: {str(e)}",
        )


@router.post("/rag/validate", response_model=RAGSettingsValidationResponse, status_code=status.HTTP_200_OK)
async def validate_rag_settings(request: RAGSettingsValidationRequest) -> RAGSettingsValidationResponse:
    """
    Validate RAG settings without saving them.

    This endpoint allows testing settings before applying them. It performs validation
    checks and returns any errors or warnings.

    Args:
        request: RAGSettingsValidationRequest with settings to validate

    Returns:
        RAGSettingsValidationResponse with validation results
    """
    errors = []
    warnings = []

    try:
        # Get current settings to merge with validation request
        current_settings = await database.get_rag_settings()
        
        # Merge current settings with validation request
        if current_settings:
            merged_settings = current_settings.copy()
        else:
            merged_settings = {
                "model": settings.llm_model,
                "temperature": settings.llm_temperature,
                "top_k": settings.retrieval_top_k,
                "max_tokens": settings.llm_max_tokens,
                "system_prompt": settings.system_prompt,
                "chunk_size": settings.chunk_size,
                "chunk_overlap": settings.chunk_overlap,
                "embedding_model": settings.embedding_model,
                "chunking_strategy": "recursive",
            }

        # Update with validation request values
        if request.model is not None:
            merged_settings["model"] = request.model
        if request.temperature is not None:
            merged_settings["temperature"] = request.temperature
        if request.top_k is not None:
            merged_settings["top_k"] = request.top_k
        if request.max_tokens is not None:
            merged_settings["max_tokens"] = request.max_tokens
        if request.system_prompt is not None:
            merged_settings["system_prompt"] = request.system_prompt
        if request.chunk_size is not None:
            merged_settings["chunk_size"] = request.chunk_size
        if request.chunk_overlap is not None:
            merged_settings["chunk_overlap"] = request.chunk_overlap
        if request.embedding_model is not None:
            merged_settings["embedding_model"] = request.embedding_model
        if request.chunking_strategy is not None:
            merged_settings["chunking_strategy"] = request.chunking_strategy

        # Validation checks
        chunk_size = merged_settings.get("chunk_size", settings.chunk_size)
        chunk_overlap = merged_settings.get("chunk_overlap", settings.chunk_overlap)

        if chunk_overlap >= chunk_size:
            errors.append("Chunk overlap must be less than chunk size")

        if chunk_size < 100:
            warnings.append("Very small chunk size (< 100) may result in poor context retention")

        if chunk_size > 2000:
            warnings.append("Very large chunk size (> 2000) may exceed model context limits")

        if chunk_overlap > chunk_size * 0.5:
            warnings.append("High overlap (> 50% of chunk size) may cause redundant processing")

        temperature = merged_settings.get("temperature", settings.llm_temperature)
        if temperature > 1.5:
            warnings.append("High temperature (> 1.5) may produce less consistent responses")

        top_k = merged_settings.get("top_k", settings.retrieval_top_k)
        if top_k > 20:
            warnings.append("Very high top_k (> 20) may slow down retrieval and increase costs")

        max_tokens = merged_settings.get("max_tokens", settings.llm_max_tokens)
        if max_tokens < 256:
            warnings.append("Very low max_tokens (< 256) may truncate responses")

        if max_tokens > 4096:
            warnings.append("Very high max_tokens (> 4096) may exceed model limits and increase costs")

        return RAGSettingsValidationResponse(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
        )

    except Exception as e:
        logger.error(f"Error validating RAG settings: {e}", exc_info=True)
        return RAGSettingsValidationResponse(
            valid=False,
            errors=[f"Validation error: {str(e)}"],
            warnings=[],
        )
