"""
Unified channel settings service.

Provides CRUD operations for channel-specific settings, storing them
in the ChannelConfig.config JSON field with structured keys.
"""

import logging
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, Literal

from sqlalchemy import select

from ..models.base import get_db_session
from ..models.channel_config import ChannelConfig
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
)

logger = logging.getLogger(__name__)

ChannelKey = Literal["whatsapp", "email", "sms", "messenger", "instagram", "widget"]


async def get_channel_config(tenant_id: str, channel: ChannelKey) -> Optional[ChannelConfig]:
    """Retrieve channel config for a tenant."""
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == tenant_id,
            ChannelConfig.channel == channel,
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()


async def ensure_channel_config(tenant_id: str, channel: ChannelKey) -> ChannelConfig:
    """Get or create a channel config record for a tenant."""
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == tenant_id,
            ChannelConfig.channel == channel,
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if cfg is None:
            cfg = ChannelConfig(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                channel=channel,
                enabled=False,
                connected=False,
                config={},
            )
            session.add(cfg)
            await session.commit()
            await session.refresh(cfg)

        return cfg


async def update_channel_settings(
    tenant_id: str,
    channel: ChannelKey,
    settings_key: str,
    settings_data: Dict[str, Any],
) -> ChannelConfig:
    """
    Update a specific settings section for a channel.
    
    Args:
        tenant_id: Tenant UUID
        channel: Channel key
        settings_key: Key within config JSON (e.g., 'behavior', 'appearance', 'profile', 'credentials')
        settings_data: Dictionary of settings to merge
    
    Returns:
        Updated ChannelConfig
    """
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == tenant_id,
            ChannelConfig.channel == channel,
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if cfg is None:
            cfg = ChannelConfig(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                channel=channel,
                enabled=True,
                connected=False,
                config={},
            )
            session.add(cfg)

        # Merge settings into config JSON
        existing_config = cfg.config or {}
        existing_section = existing_config.get(settings_key, {})
        existing_section.update(settings_data)
        existing_config[settings_key] = existing_section
        cfg.config = existing_config
        cfg.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(cfg)

        logger.info(f"Updated {channel}.{settings_key} settings for tenant {tenant_id}")
        return cfg


async def get_channel_settings(
    tenant_id: str,
    channel: ChannelKey,
    settings_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Retrieve channel settings.
    
    Args:
        tenant_id: Tenant UUID
        channel: Channel key
        settings_key: Optional key to retrieve specific section
    
    Returns:
        Settings dictionary (full config or specific section)
    """
    cfg = await get_channel_config(tenant_id, channel)
    if cfg is None or cfg.config is None:
        return {}

    if settings_key:
        return cfg.config.get(settings_key, {})
    return cfg.config


# =============================================================================
# WHATSAPP SETTINGS
# =============================================================================

async def save_whatsapp_behavior(tenant_id: str, settings: WhatsAppBehaviorSettings) -> ChannelConfig:
    """Save WhatsApp behavior settings."""
    return await update_channel_settings(
        tenant_id, "whatsapp", "behavior", settings.model_dump()
    )


async def get_whatsapp_behavior(tenant_id: str) -> WhatsAppBehaviorSettings:
    """Get WhatsApp behavior settings with defaults."""
    data = await get_channel_settings(tenant_id, "whatsapp", "behavior")
    return WhatsAppBehaviorSettings(**data) if data else WhatsAppBehaviorSettings()


# =============================================================================
# EMAIL SETTINGS
# =============================================================================

async def save_email_behavior(tenant_id: str, settings: EmailBehaviorSettings) -> ChannelConfig:
    """Save email behavior settings."""
    return await update_channel_settings(
        tenant_id, "email", "behavior", settings.model_dump()
    )


async def get_email_behavior(tenant_id: str) -> EmailBehaviorSettings:
    """Get email behavior settings with defaults."""
    data = await get_channel_settings(tenant_id, "email", "behavior")
    return EmailBehaviorSettings(**data) if data else EmailBehaviorSettings()


async def save_email_forwarding_config(
    tenant_id: str,
    email_address: str,
    inbound_address: str,
    verified: bool = False,
) -> ChannelConfig:
    """Save email forwarding configuration."""
    return await update_channel_settings(
        tenant_id, "email", "forwarding", {
            "email_address": email_address,
            "inbound_address": inbound_address,
            "verified": verified,
            "verified_at": datetime.utcnow().isoformat() + "Z" if verified else None,
        }
    )


# =============================================================================
# SMS SETTINGS
# =============================================================================

async def save_sms_credentials(tenant_id: str, credentials: SmsCredentials) -> ChannelConfig:
    """Save SMS provider credentials."""
    # Filter out None values to keep config clean
    creds_data = {k: v for k, v in credentials.model_dump().items() if v is not None}
    return await update_channel_settings(
        tenant_id, "sms", "credentials", creds_data
    )


async def get_sms_credentials(tenant_id: str) -> Optional[SmsCredentials]:
    """Get SMS provider credentials."""
    data = await get_channel_settings(tenant_id, "sms", "credentials")
    if data and data.get("provider"):
        return SmsCredentials(**data)
    return None


async def save_sms_behavior(tenant_id: str, settings: SmsBehaviorSettings) -> ChannelConfig:
    """Save SMS behavior settings."""
    return await update_channel_settings(
        tenant_id, "sms", "behavior", settings.model_dump()
    )


async def get_sms_behavior(tenant_id: str) -> SmsBehaviorSettings:
    """Get SMS behavior settings with defaults."""
    data = await get_channel_settings(tenant_id, "sms", "behavior")
    return SmsBehaviorSettings(**data) if data else SmsBehaviorSettings()


# =============================================================================
# MESSENGER SETTINGS
# =============================================================================

async def save_messenger_profile(tenant_id: str, profile: MessengerProfileSettings) -> ChannelConfig:
    """Save Messenger profile settings."""
    # Convert menu items to dicts
    profile_data = profile.model_dump()
    profile_data["persistent_menu"] = [
        item.model_dump() if hasattr(item, "model_dump") else item
        for item in profile.persistent_menu
    ]
    return await update_channel_settings(
        tenant_id, "messenger", "profile", profile_data
    )


async def get_messenger_profile(tenant_id: str) -> MessengerProfileSettings:
    """Get Messenger profile settings with defaults."""
    data = await get_channel_settings(tenant_id, "messenger", "profile")
    return MessengerProfileSettings(**data) if data else MessengerProfileSettings()


async def save_messenger_behavior(tenant_id: str, settings: MessengerBehaviorSettings) -> ChannelConfig:
    """Save Messenger behavior settings."""
    return await update_channel_settings(
        tenant_id, "messenger", "behavior", settings.model_dump()
    )


async def get_messenger_behavior(tenant_id: str) -> MessengerBehaviorSettings:
    """Get Messenger behavior settings with defaults."""
    data = await get_channel_settings(tenant_id, "messenger", "behavior")
    return MessengerBehaviorSettings(**data) if data else MessengerBehaviorSettings()


# =============================================================================
# INSTAGRAM SETTINGS
# =============================================================================

async def save_instagram_profile(tenant_id: str, profile: InstagramProfileSettings) -> ChannelConfig:
    """Save Instagram profile settings."""
    return await update_channel_settings(
        tenant_id, "instagram", "profile", profile.model_dump()
    )


async def get_instagram_profile(tenant_id: str) -> InstagramProfileSettings:
    """Get Instagram profile settings with defaults."""
    data = await get_channel_settings(tenant_id, "instagram", "profile")
    return InstagramProfileSettings(**data) if data else InstagramProfileSettings()


async def save_instagram_behavior(tenant_id: str, settings: InstagramBehaviorSettings) -> ChannelConfig:
    """Save Instagram behavior settings."""
    return await update_channel_settings(
        tenant_id, "instagram", "behavior", settings.model_dump()
    )


async def get_instagram_behavior(tenant_id: str) -> InstagramBehaviorSettings:
    """Get Instagram behavior settings with defaults."""
    data = await get_channel_settings(tenant_id, "instagram", "behavior")
    return InstagramBehaviorSettings(**data) if data else InstagramBehaviorSettings()


# =============================================================================
# WIDGET SETTINGS
# =============================================================================

async def save_widget_appearance(tenant_id: str, appearance: WidgetAppearanceSettings) -> ChannelConfig:
    """Save widget appearance settings."""
    return await update_channel_settings(
        tenant_id, "widget", "appearance", appearance.model_dump()
    )


async def get_widget_appearance(tenant_id: str) -> WidgetAppearanceSettings:
    """Get widget appearance settings with defaults."""
    data = await get_channel_settings(tenant_id, "widget", "appearance")
    return WidgetAppearanceSettings(**data) if data else WidgetAppearanceSettings()


async def save_widget_behavior(tenant_id: str, behavior: WidgetBehaviorSettings) -> ChannelConfig:
    """Save widget behavior settings."""
    return await update_channel_settings(
        tenant_id, "widget", "behavior", behavior.model_dump()
    )


async def get_widget_behavior(tenant_id: str) -> WidgetBehaviorSettings:
    """Get widget behavior settings with defaults."""
    data = await get_channel_settings(tenant_id, "widget", "behavior")
    return WidgetBehaviorSettings(**data) if data else WidgetBehaviorSettings()


async def save_widget_domains(tenant_id: str, domains: WidgetDomainSettings) -> ChannelConfig:
    """Save widget domain whitelist settings."""
    return await update_channel_settings(
        tenant_id, "widget", "domains", domains.model_dump()
    )


async def get_widget_domains(tenant_id: str) -> WidgetDomainSettings:
    """Get widget domain settings with defaults."""
    data = await get_channel_settings(tenant_id, "widget", "domains")
    return WidgetDomainSettings(**data) if data else WidgetDomainSettings()


async def generate_widget_embed_code(tenant_id: str, cdn_url: str = "https://cdn.nexachat.com") -> dict:
    """Generate widget embed code for a tenant."""
    appearance = await get_widget_appearance(tenant_id)
    
    embed_code = f'''<script>
  (function() {{
    var d = document, s = d.createElement('script');
    s.src = '{cdn_url}/widget.js';
    s.async = true;
    s.onload = function() {{
      window.NexaChat && window.NexaChat.init({{
        widgetId: '{tenant_id}',
        position: '{appearance.position}',
        primaryColor: '{appearance.primary_color}',
        launcherLabel: '{appearance.launcher_label}',
        showPoweredBy: {str(appearance.show_powered_by).lower()}
      }});
    }};
    d.head.appendChild(s);
  }})();
</script>'''

    return {
        "embed_code": embed_code,
        "widget_id": tenant_id,
        "cdn_url": cdn_url,
    }


# =============================================================================
# CHANNEL CONNECTION STATUS
# =============================================================================

async def mark_channel_connected(
    tenant_id: str,
    channel: ChannelKey,
    connection_info: Optional[Dict[str, Any]] = None,
) -> ChannelConfig:
    """Mark a channel as connected with optional connection metadata."""
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == tenant_id,
            ChannelConfig.channel == channel,
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if cfg is None:
            cfg = ChannelConfig(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                channel=channel,
                enabled=True,
                connected=True,
                config={},
            )
            session.add(cfg)
        else:
            cfg.connected = True
            cfg.enabled = True

        # Store connection info
        existing_config = cfg.config or {}
        existing_config["connected_at"] = datetime.utcnow().isoformat() + "Z"
        if connection_info:
            existing_config.update(connection_info)
        cfg.config = existing_config
        cfg.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(cfg)

        logger.info(f"Marked {channel} as connected for tenant {tenant_id}")
        return cfg


async def mark_channel_disconnected(tenant_id: str, channel: ChannelKey) -> ChannelConfig:
    """Mark a channel as disconnected."""
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == tenant_id,
            ChannelConfig.channel == channel,
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if cfg:
            cfg.connected = False
            cfg.oauth_tokens = None
            # Preserve config but mark as disconnected
            existing_config = cfg.config or {}
            existing_config["disconnected_at"] = datetime.utcnow().isoformat() + "Z"
            cfg.config = existing_config
            cfg.updated_at = datetime.utcnow()

            await session.commit()
            await session.refresh(cfg)

        return cfg
