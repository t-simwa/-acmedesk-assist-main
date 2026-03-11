"""
Channel settings API endpoints.

Provides endpoints for saving and retrieving channel-specific settings
including behavior, appearance, profiles, and credentials.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from ..routers.auth import get_current_user
from ..models.user import User
from ..services import channel_settings as settings_service
from ..schemas.channel_settings import (
    WhatsAppBehaviorSettings,
    EmailBehaviorSettings,
    SmsBehaviorSettings,
    SmsCredentials,
    MessengerProfileSettings,
    MessengerBehaviorSettings,
    InstagramProfileSettings,
    InstagramBehaviorSettings,
    WidgetAppearanceSettings,
    WidgetBehaviorSettings,
    WidgetDomainSettings,
    WidgetEmbedCodeResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/channels", tags=["channel-settings"])


# =============================================================================
# WHATSAPP SETTINGS
# =============================================================================

@router.get("/whatsapp/settings/behavior", response_model=WhatsAppBehaviorSettings)
async def get_whatsapp_behavior_settings(
    current_user: User = Depends(get_current_user),
) -> WhatsAppBehaviorSettings:
    """Get WhatsApp behavior settings."""
    return await settings_service.get_whatsapp_behavior(current_user.tenant_id)


@router.put("/whatsapp/settings/behavior", response_model=dict)
async def save_whatsapp_behavior_settings(
    settings: WhatsAppBehaviorSettings,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Save WhatsApp behavior settings."""
    await settings_service.save_whatsapp_behavior(current_user.tenant_id, settings)
    return {"message": "WhatsApp behavior settings saved"}


# =============================================================================
# EMAIL SETTINGS
# =============================================================================

@router.get("/email/settings/behavior", response_model=EmailBehaviorSettings)
async def get_email_behavior_settings(
    current_user: User = Depends(get_current_user),
) -> EmailBehaviorSettings:
    """Get email behavior settings."""
    return await settings_service.get_email_behavior(current_user.tenant_id)


@router.put("/email/settings/behavior", response_model=dict)
async def save_email_behavior_settings(
    settings: EmailBehaviorSettings,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Save email behavior settings."""
    await settings_service.save_email_behavior(current_user.tenant_id, settings)
    return {"message": "Email behavior settings saved"}


# =============================================================================
# SMS SETTINGS
# =============================================================================

@router.get("/sms/settings/behavior", response_model=SmsBehaviorSettings)
async def get_sms_behavior_settings(
    current_user: User = Depends(get_current_user),
) -> SmsBehaviorSettings:
    """Get SMS behavior settings."""
    return await settings_service.get_sms_behavior(current_user.tenant_id)


@router.put("/sms/settings/behavior", response_model=dict)
async def save_sms_behavior_settings(
    settings: SmsBehaviorSettings,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Save SMS behavior settings."""
    await settings_service.save_sms_behavior(current_user.tenant_id, settings)
    return {"message": "SMS behavior settings saved"}


@router.put("/sms/settings/credentials", response_model=dict)
async def save_sms_credentials(
    credentials: SmsCredentials,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Save SMS provider credentials."""
    await settings_service.save_sms_credentials(current_user.tenant_id, credentials)
    return {"message": "SMS credentials saved"}


# =============================================================================
# MESSENGER SETTINGS
# =============================================================================

@router.get("/messenger/settings/profile", response_model=MessengerProfileSettings)
async def get_messenger_profile_settings(
    current_user: User = Depends(get_current_user),
) -> MessengerProfileSettings:
    """Get Messenger profile settings."""
    return await settings_service.get_messenger_profile(current_user.tenant_id)


@router.put("/messenger/settings/profile", response_model=dict)
async def save_messenger_profile_settings(
    profile: MessengerProfileSettings,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Save Messenger profile settings."""
    await settings_service.save_messenger_profile(current_user.tenant_id, profile)
    return {"message": "Messenger profile settings saved"}


@router.get("/messenger/settings/behavior", response_model=MessengerBehaviorSettings)
async def get_messenger_behavior_settings(
    current_user: User = Depends(get_current_user),
) -> MessengerBehaviorSettings:
    """Get Messenger behavior settings."""
    return await settings_service.get_messenger_behavior(current_user.tenant_id)


@router.put("/messenger/settings/behavior", response_model=dict)
async def save_messenger_behavior_settings(
    settings: MessengerBehaviorSettings,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Save Messenger behavior settings."""
    await settings_service.save_messenger_behavior(current_user.tenant_id, settings)
    return {"message": "Messenger behavior settings saved"}


# =============================================================================
# INSTAGRAM SETTINGS
# =============================================================================

@router.get("/instagram/settings/profile", response_model=InstagramProfileSettings)
async def get_instagram_profile_settings(
    current_user: User = Depends(get_current_user),
) -> InstagramProfileSettings:
    """Get Instagram profile settings."""
    return await settings_service.get_instagram_profile(current_user.tenant_id)


@router.put("/instagram/settings/profile", response_model=dict)
async def save_instagram_profile_settings(
    profile: InstagramProfileSettings,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Save Instagram profile settings."""
    await settings_service.save_instagram_profile(current_user.tenant_id, profile)
    return {"message": "Instagram profile settings saved"}


@router.get("/instagram/settings/behavior", response_model=InstagramBehaviorSettings)
async def get_instagram_behavior_settings(
    current_user: User = Depends(get_current_user),
) -> InstagramBehaviorSettings:
    """Get Instagram behavior settings."""
    return await settings_service.get_instagram_behavior(current_user.tenant_id)


@router.put("/instagram/settings/behavior", response_model=dict)
async def save_instagram_behavior_settings(
    settings: InstagramBehaviorSettings,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Save Instagram behavior settings."""
    await settings_service.save_instagram_behavior(current_user.tenant_id, settings)
    return {"message": "Instagram behavior settings saved"}


# =============================================================================
# WIDGET SETTINGS
# =============================================================================

@router.get("/widget/settings/appearance", response_model=WidgetAppearanceSettings)
async def get_widget_appearance_settings(
    current_user: User = Depends(get_current_user),
) -> WidgetAppearanceSettings:
    """Get widget appearance settings."""
    return await settings_service.get_widget_appearance(current_user.tenant_id)


@router.put("/widget/settings/appearance", response_model=dict)
async def save_widget_appearance_settings(
    appearance: WidgetAppearanceSettings,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Save widget appearance settings."""
    await settings_service.save_widget_appearance(current_user.tenant_id, appearance)
    return {"message": "Widget appearance settings saved"}


@router.get("/widget/settings/behavior", response_model=WidgetBehaviorSettings)
async def get_widget_behavior_settings(
    current_user: User = Depends(get_current_user),
) -> WidgetBehaviorSettings:
    """Get widget behavior settings."""
    return await settings_service.get_widget_behavior(current_user.tenant_id)


@router.put("/widget/settings/behavior", response_model=dict)
async def save_widget_behavior_settings(
    behavior: WidgetBehaviorSettings,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Save widget behavior settings."""
    await settings_service.save_widget_behavior(current_user.tenant_id, behavior)
    return {"message": "Widget behavior settings saved"}


@router.get("/widget/settings/domains", response_model=WidgetDomainSettings)
async def get_widget_domain_settings(
    current_user: User = Depends(get_current_user),
) -> WidgetDomainSettings:
    """Get widget domain whitelist settings."""
    return await settings_service.get_widget_domains(current_user.tenant_id)


@router.put("/widget/settings/domains", response_model=dict)
async def save_widget_domain_settings(
    domains: WidgetDomainSettings,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Save widget domain whitelist settings."""
    await settings_service.save_widget_domains(current_user.tenant_id, domains)
    return {"message": "Widget domain settings saved"}


@router.get("/widget/embed-code", response_model=WidgetEmbedCodeResponse)
async def get_widget_embed_code(
    current_user: User = Depends(get_current_user),
) -> WidgetEmbedCodeResponse:
    """Generate widget embed code for the current tenant."""
    result = await settings_service.generate_widget_embed_code(current_user.tenant_id)
    return WidgetEmbedCodeResponse(**result)


# =============================================================================
# GENERIC SETTINGS RETRIEVAL
# =============================================================================

@router.get("/{channel}/settings")
async def get_all_channel_settings(
    channel: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Get all settings for a channel."""
    valid_channels = {"whatsapp", "email", "sms", "messenger", "instagram", "widget"}
    if channel not in valid_channels:
        raise HTTPException(status_code=404, detail=f"Unknown channel: {channel}")

    all_settings = await settings_service.get_channel_settings(
        current_user.tenant_id, channel  # type: ignore
    )
    return {"channel": channel, "settings": all_settings}
