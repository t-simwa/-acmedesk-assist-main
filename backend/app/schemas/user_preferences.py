"""
Pydantic schemas for user preferences API requests and responses.
"""

from typing import Optional

from pydantic import BaseModel, Field, EmailStr


class NotificationPreferences(BaseModel):
    """Notification preferences model."""
    
    email: bool = Field(default=True, description="Enable email notifications")
    in_app: bool = Field(default=True, description="Enable in-app notifications")
    push: bool = Field(default=False, description="Enable push notifications")


class UserPreferencesResponse(BaseModel):
    """
    Response model for GET /api/user/preferences endpoint.
    
    Attributes:
        id: User preferences ID
        tenant_id: Tenant/User ID
        name: User's full name
        email: User's email address
        avatar_url: URL or base64 data URL for avatar image
        notifications: Notification preferences
        language: Language preference (ISO 639-1 code)
        timezone: Timezone preference (IANA timezone)
        additional_preferences: Additional preferences stored as JSON
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """
    
    id: str = Field(..., description="User preferences ID")
    tenant_id: str = Field(..., description="Tenant/User ID")
    name: Optional[str] = Field(None, description="User's full name")
    email: Optional[str] = Field(None, description="User's email address")
    avatar_url: Optional[str] = Field(None, description="Avatar image URL or base64 data URL")
    notifications: NotificationPreferences = Field(..., description="Notification preferences")
    language: Optional[str] = Field("en", description="Language preference (ISO 639-1 code)")
    timezone: Optional[str] = Field("UTC", description="Timezone preference (IANA timezone)")
    additional_preferences: Optional[dict] = Field(None, description="Additional preferences")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")


class UserPreferencesUpdateRequest(BaseModel):
    """
    Request model for PUT /api/user/preferences endpoint.
    
    Attributes:
        name: User's full name (optional)
        email: User's email address (optional)
        notifications: Notification preferences (optional)
        language: Language preference (optional, ISO 639-1 code)
        timezone: Timezone preference (optional, IANA timezone)
    """
    
    name: Optional[str] = Field(None, max_length=200, description="User's full name")
    email: Optional[EmailStr] = Field(None, description="User's email address")
    notifications: Optional[NotificationPreferences] = Field(None, description="Notification preferences")
    language: Optional[str] = Field(None, max_length=10, description="Language preference (ISO 639-1 code)")
    timezone: Optional[str] = Field(None, max_length=50, description="Timezone preference (IANA timezone)")


class UserPreferencesUpdateResponse(BaseModel):
    """
    Response model for PUT /api/user/preferences endpoint.
    
    Attributes:
        message: Human-readable message about the update
        preferences: Updated user preferences
    """
    
    message: str = Field(..., description="Human-readable message about the update")
    preferences: UserPreferencesResponse = Field(..., description="Updated user preferences")


class AvatarUploadResponse(BaseModel):
    """
    Response model for POST /api/user/avatar endpoint.
    
    Attributes:
        message: Human-readable message about the upload
        avatar_url: URL or base64 data URL for the uploaded avatar
    """
    
    message: str = Field(..., description="Human-readable message about the upload")
    avatar_url: str = Field(..., description="Avatar image URL or base64 data URL")
