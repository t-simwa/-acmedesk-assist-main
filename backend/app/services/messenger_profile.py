"""
Facebook Messenger Profile Sync Service.

Handles syncing Messenger Profile settings (Get Started, Persistent Menu, Ice Breakers)
to Facebook via the Graph API.
"""

import logging
import json
from typing import Optional, List, Dict, Any

import httpx
from sqlalchemy import select

from ..config import settings
from ..models.base import get_db_session
from ..models.channel_config import ChannelConfig
from ..services.crypto import decrypt
from ..schemas.channel_settings import MessengerProfileSettings, MessengerMenuItem

logger = logging.getLogger(__name__)


async def get_page_access_token(tenant_id: str) -> Optional[str]:
    """Get the Facebook Page access token for a tenant."""
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == tenant_id,
            ChannelConfig.channel == "messenger",
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if not cfg or not cfg.oauth_tokens:
            return None

        try:
            token_json = decrypt(cfg.oauth_tokens)
            token_data = json.loads(token_json)
        except Exception:
            try:
                token_data = json.loads(cfg.oauth_tokens)
            except Exception:
                return None

        return token_data.get("page_access_token")


async def get_page_id(tenant_id: str) -> Optional[str]:
    """Get the configured Facebook Page ID for a tenant."""
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == tenant_id,
            ChannelConfig.channel == "messenger",
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if not cfg or not cfg.config:
            return None

        return cfg.config.get("page_id")


async def sync_messenger_profile(
    tenant_id: str,
    profile: MessengerProfileSettings,
) -> dict:
    """
    Sync Messenger Profile settings to Facebook.
    
    This updates the Get Started button, greeting text, persistent menu,
    and ice breakers for the connected Facebook Page.
    
    Args:
        tenant_id: Tenant UUID
        profile: Messenger profile settings to sync
    
    Returns:
        dict with sync result
    """
    page_token = await get_page_access_token(tenant_id)
    page_id = await get_page_id(tenant_id)

    if not page_token or not page_id:
        raise ValueError("Messenger not connected. Please complete setup first.")

    api_version = settings.meta_api_version or "v18.0"
    url = f"https://graph.facebook.com/{api_version}/me/messenger_profile"

    # Build the profile payload
    profile_payload: Dict[str, Any] = {}

    # Get Started button
    profile_payload["get_started"] = {
        "payload": "GET_STARTED"
    }

    # Greeting text
    profile_payload["greeting"] = [
        {
            "locale": "default",
            "text": profile.get_started_message,
        }
    ]

    # Persistent Menu
    if profile.persistent_menu:
        menu_items = []
        for item in profile.persistent_menu:
            if isinstance(item, MessengerMenuItem):
                menu_items.append({
                    "type": "postback",
                    "title": item.title,
                    "payload": item.payload,
                })
            elif isinstance(item, dict):
                menu_items.append({
                    "type": "postback",
                    "title": item.get("title", ""),
                    "payload": item.get("payload", ""),
                })

        profile_payload["persistent_menu"] = [
            {
                "locale": "default",
                "composer_input_disabled": False,
                "call_to_actions": menu_items,
            }
        ]

    # Ice Breakers
    if profile.ice_breakers:
        ice_breaker_items = []
        for i, question in enumerate(profile.ice_breakers[:4]):  # Max 4 ice breakers
            ice_breaker_items.append({
                "question": question,
                "payload": f"ICE_BREAKER_{i}",
            })
        profile_payload["ice_breakers"] = ice_breaker_items

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            url,
            headers={"Authorization": f"Bearer {page_token}"},
            json=profile_payload,
        )

        if resp.status_code != 200:
            error_data = resp.json()
            error_msg = error_data.get("error", {}).get("message", "Unknown error")
            logger.error(f"Failed to sync Messenger profile: {error_msg}")
            raise ValueError(f"Facebook API error: {error_msg}")

        result = resp.json()
        logger.info(f"Synced Messenger profile for tenant {tenant_id}")

        return {
            "success": True,
            "message": "Messenger profile synced to Facebook",
            "result": result,
        }


async def get_messenger_profile(tenant_id: str) -> dict:
    """
    Fetch current Messenger Profile from Facebook.
    
    Returns:
        dict with current profile settings from Facebook
    """
    page_token = await get_page_access_token(tenant_id)

    if not page_token:
        raise ValueError("Messenger not connected")

    api_version = settings.meta_api_version or "v18.0"
    url = f"https://graph.facebook.com/{api_version}/me/messenger_profile"

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            url,
            headers={"Authorization": f"Bearer {page_token}"},
            params={
                "fields": "get_started,greeting,persistent_menu,ice_breakers"
            },
        )

        if resp.status_code != 200:
            error_data = resp.json()
            error_msg = error_data.get("error", {}).get("message", "Unknown error")
            raise ValueError(f"Failed to fetch profile: {error_msg}")

        data = resp.json()
        return {
            "get_started": data.get("data", [{}])[0].get("get_started") if data.get("data") else None,
            "greeting": data.get("data", [{}])[0].get("greeting") if data.get("data") else None,
            "persistent_menu": data.get("data", [{}])[0].get("persistent_menu") if data.get("data") else None,
            "ice_breakers": data.get("data", [{}])[0].get("ice_breakers") if data.get("data") else None,
        }


async def delete_messenger_profile_fields(
    tenant_id: str,
    fields: List[str],
) -> dict:
    """
    Delete specific Messenger Profile fields.
    
    Args:
        tenant_id: Tenant UUID
        fields: List of field names to delete (e.g., ["persistent_menu", "ice_breakers"])
    
    Returns:
        dict with deletion result
    """
    page_token = await get_page_access_token(tenant_id)

    if not page_token:
        raise ValueError("Messenger not connected")

    api_version = settings.meta_api_version or "v18.0"
    url = f"https://graph.facebook.com/{api_version}/me/messenger_profile"

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.delete(
            url,
            headers={"Authorization": f"Bearer {page_token}"},
            json={"fields": fields},
        )

        if resp.status_code != 200:
            error_data = resp.json()
            error_msg = error_data.get("error", {}).get("message", "Unknown error")
            raise ValueError(f"Failed to delete profile fields: {error_msg}")

        return {"success": True, "deleted_fields": fields}
