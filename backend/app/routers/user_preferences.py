"""
User Preferences API endpoints.

Implements:
- GET /api/user/preferences - Get user preferences
- PUT /api/user/preferences - Update user preferences
- POST /api/user/avatar - Upload user avatar
- DELETE /api/user/avatar - Delete user avatar
"""

import base64
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form

from ..config import settings
from ..schemas.user_preferences import (
    UserPreferencesResponse,
    UserPreferencesUpdateRequest,
    UserPreferencesUpdateResponse,
    AvatarUploadResponse,
    NotificationPreferences,
)
from ..services import database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/user", tags=["user"])

DEFAULT_USER_ID = "default"  # For single-user prototype


@router.get("/preferences", response_model=UserPreferencesResponse, status_code=status.HTTP_200_OK)
async def get_user_preferences() -> UserPreferencesResponse:
    """
    Get current user preferences.
    
    Returns the current user preferences including:
    - Profile information (name, email, avatar)
    - Notification preferences (email, in-app, push)
    - Language and timezone preferences
    
    Returns:
        UserPreferencesResponse with current user preferences
    
    Raises:
        HTTPException: If there's an error retrieving preferences
    """
    try:
        prefs_dict = await database.get_user_preferences(DEFAULT_USER_ID)
        
        if prefs_dict is None:
            # Return default preferences if none exist
            return UserPreferencesResponse(
                id="",
                user_id=DEFAULT_USER_ID,
                name=None,
                email=None,
                avatar_url=None,
                notifications=NotificationPreferences(
                    email=True,
                    in_app=True,
                    push=False,
                ),
                language="en",
                timezone="UTC",
                additional_preferences=None,
                created_at="",
                updated_at="",
            )
        
        # Convert database dict to response model
        return UserPreferencesResponse(
            id=prefs_dict["id"],
            user_id=prefs_dict["user_id"],
            name=prefs_dict.get("name"),
            email=prefs_dict.get("email"),
            avatar_url=prefs_dict.get("avatar_url"),
            notifications=NotificationPreferences(
                email=prefs_dict.get("notifications", {}).get("email", True),
                in_app=prefs_dict.get("notifications", {}).get("in_app", True),
                push=prefs_dict.get("notifications", {}).get("push", False),
            ),
            language=prefs_dict.get("language", "en"),
            timezone=prefs_dict.get("timezone", "UTC"),
            additional_preferences=prefs_dict.get("additional_preferences"),
            created_at=prefs_dict.get("created_at", ""),
            updated_at=prefs_dict.get("updated_at", ""),
        )
        
    except Exception as e:
        logger.error(f"Error getting user preferences: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user preferences: {str(e)}"
        )


@router.put("/preferences", response_model=UserPreferencesUpdateResponse, status_code=status.HTTP_200_OK)
async def update_user_preferences(
    request: UserPreferencesUpdateRequest
) -> UserPreferencesUpdateResponse:
    """
    Update user preferences.
    
    Updates user preferences including:
    - Profile information (name, email)
    - Notification preferences (email, in-app, push)
    - Language and timezone preferences
    
    Args:
        request: UserPreferencesUpdateRequest with fields to update
    
    Returns:
        UserPreferencesUpdateResponse with updated preferences
    
    Raises:
        HTTPException: If there's an error updating preferences
    """
    try:
        # Prepare update parameters
        update_params = {}
        
        if request.name is not None:
            update_params["name"] = request.name
        if request.email is not None:
            update_params["email"] = request.email
        if request.notifications is not None:
            update_params["notifications_email"] = request.notifications.email
            update_params["notifications_in_app"] = request.notifications.in_app
            update_params["notifications_push"] = request.notifications.push
        if request.language is not None:
            update_params["language"] = request.language
        if request.timezone is not None:
            update_params["timezone"] = request.timezone
        
        # Update preferences
        updated_prefs = await database.create_or_update_user_preferences(
            user_id=DEFAULT_USER_ID,
            **update_params
        )
        
        # Convert to response model
        response = UserPreferencesResponse(
            id=updated_prefs["id"],
            user_id=updated_prefs["user_id"],
            name=updated_prefs.get("name"),
            email=updated_prefs.get("email"),
            avatar_url=updated_prefs.get("avatar_url"),
            notifications=NotificationPreferences(
                email=updated_prefs.get("notifications", {}).get("email", True),
                in_app=updated_prefs.get("notifications", {}).get("in_app", True),
                push=updated_prefs.get("notifications", {}).get("push", False),
            ),
            language=updated_prefs.get("language", "en"),
            timezone=updated_prefs.get("timezone", "UTC"),
            additional_preferences=updated_prefs.get("additional_preferences"),
            created_at=updated_prefs.get("created_at", ""),
            updated_at=updated_prefs.get("updated_at", ""),
        )
        
        return UserPreferencesUpdateResponse(
            message="User preferences updated successfully",
            preferences=response
        )
        
    except Exception as e:
        logger.error(f"Error updating user preferences: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user preferences: {str(e)}"
        )


@router.post("/avatar", response_model=AvatarUploadResponse, status_code=status.HTTP_200_OK)
async def upload_avatar(
    file: UploadFile = File(..., description="Avatar image file")
) -> AvatarUploadResponse:
    """
    Upload user avatar image.
    
    Accepts an image file and stores it as a base64 data URL.
    Supported formats: PNG, JPG, JPEG, GIF, WebP
    Max file size: 2MB
    
    Args:
        file: Image file to upload
    
    Returns:
        AvatarUploadResponse with avatar URL (base64 data URL)
    
    Raises:
        HTTPException: If file is invalid or upload fails
    """
    try:
        # Validate file type
        allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
            )
        
        # Validate file size (2MB max)
        file_content = await file.read()
        if len(file_content) > 2 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds 2MB limit"
            )
        
        # Convert to base64 data URL
        base64_data = base64.b64encode(file_content).decode("utf-8")
        mime_type = file.content_type or "image/png"
        avatar_url = f"data:{mime_type};base64,{base64_data}"
        
        # Save to database
        await database.create_or_update_user_preferences(
            user_id=DEFAULT_USER_ID,
            avatar_url=avatar_url
        )
        
        logger.info(f"Avatar uploaded successfully for user: {DEFAULT_USER_ID}")
        
        return AvatarUploadResponse(
            message="Avatar uploaded successfully",
            avatar_url=avatar_url
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading avatar: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload avatar: {str(e)}"
        )


@router.delete("/avatar", status_code=status.HTTP_200_OK)
async def delete_avatar() -> dict:
    """
    Delete user avatar.
    
    Removes the avatar image from user preferences.
    
    Returns:
        Success message
    
    Raises:
        HTTPException: If deletion fails
    """
    try:
        deleted = await database.delete_user_avatar(DEFAULT_USER_ID)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User preferences not found"
            )
        
        logger.info(f"Avatar deleted successfully for user: {DEFAULT_USER_ID}")
        
        return {
            "message": "Avatar deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting avatar: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete avatar: {str(e)}"
        )
