"""
WhatsApp Message Templates Service.

Handles submission, listing, and status tracking of WhatsApp message templates
via the Meta Graph API.
"""

import logging
import json
from typing import List, Optional
from datetime import datetime

import httpx
from sqlalchemy import select

from ..config import settings
from ..models.base import get_db_session
from ..models.channel_config import ChannelConfig
from ..services.crypto import decrypt
from ..schemas.channel_settings import WhatsAppTemplateCreate, WhatsAppTemplateStatus

logger = logging.getLogger(__name__)


async def get_whatsapp_access_token(tenant_id: str) -> Optional[str]:
    """Get the WhatsApp access token for a tenant."""
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == tenant_id,
            ChannelConfig.channel == "whatsapp",
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if not cfg or not cfg.oauth_tokens:
            return None

        try:
            token_json = decrypt(cfg.oauth_tokens)
            token_data = json.loads(token_json)
        except Exception:
            # Fallback to plaintext if decryption fails
            try:
                token_data = json.loads(cfg.oauth_tokens)
            except Exception:
                return None

        return token_data.get("access_token")


async def get_whatsapp_business_account_id(tenant_id: str) -> Optional[str]:
    """Get the configured WhatsApp Business Account ID for a tenant."""
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == tenant_id,
            ChannelConfig.channel == "whatsapp",
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if not cfg or not cfg.config:
            return None

        return cfg.config.get("whatsapp_business_account_id")


async def submit_template(
    tenant_id: str,
    template: WhatsAppTemplateCreate,
) -> dict:
    """
    Submit a message template to Meta for approval.
    
    Args:
        tenant_id: Tenant UUID
        template: Template creation payload
    
    Returns:
        dict with template id and status from Meta API
    """
    access_token = await get_whatsapp_access_token(tenant_id)
    if not access_token:
        raise ValueError("WhatsApp not connected. Please complete OAuth first.")

    waba_id = await get_whatsapp_business_account_id(tenant_id)
    if not waba_id:
        raise ValueError("WhatsApp Business Account not configured.")

    api_version = settings.meta_api_version or "v18.0"
    url = f"https://graph.facebook.com/{api_version}/{waba_id}/message_templates"

    # Build template components
    components = []
    
    # Header (optional)
    if template.header_text:
        components.append({
            "type": "HEADER",
            "format": "TEXT",
            "text": template.header_text,
        })
    
    # Body (required)
    components.append({
        "type": "BODY",
        "text": template.body_text,
    })
    
    # Footer (optional)
    if template.footer_text:
        components.append({
            "type": "FOOTER",
            "text": template.footer_text,
        })
    
    # Buttons (optional)
    if template.buttons:
        components.append({
            "type": "BUTTONS",
            "buttons": template.buttons,
        })

    payload = {
        "name": template.name,
        "language": template.language,
        "category": template.category,
        "components": components,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            url,
            headers={"Authorization": f"Bearer {access_token}"},
            json=payload,
        )

        if resp.status_code not in (200, 201):
            error_data = resp.json()
            error_msg = error_data.get("error", {}).get("message", "Unknown error")
            logger.error(f"Failed to submit WhatsApp template: {error_msg}")
            raise ValueError(f"Meta API error: {error_msg}")

        result = resp.json()
        logger.info(f"Submitted WhatsApp template '{template.name}' for tenant {tenant_id}")

        # Store template in local config for tracking
        await _store_template_locally(tenant_id, template, result.get("id"), "PENDING")

        return {
            "id": result.get("id"),
            "name": template.name,
            "status": "PENDING",
            "message": "Template submitted for Meta review",
        }


async def _store_template_locally(
    tenant_id: str,
    template: WhatsAppTemplateCreate,
    meta_template_id: Optional[str],
    status: str,
) -> None:
    """Store template metadata locally for tracking."""
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == tenant_id,
            ChannelConfig.channel == "whatsapp",
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if cfg:
            config = cfg.config or {}
            templates = config.get("templates", [])
            
            # Update or add template
            template_entry = {
                "name": template.name,
                "category": template.category,
                "language": template.language,
                "body_text": template.body_text,
                "header_text": template.header_text,
                "footer_text": template.footer_text,
                "meta_id": meta_template_id,
                "status": status,
                "submitted_at": datetime.utcnow().isoformat() + "Z",
            }
            
            # Replace if exists, otherwise append
            existing_idx = next(
                (i for i, t in enumerate(templates) if t.get("name") == template.name),
                None
            )
            if existing_idx is not None:
                templates[existing_idx] = template_entry
            else:
                templates.append(template_entry)
            
            config["templates"] = templates
            cfg.config = config
            await session.commit()


async def list_templates(tenant_id: str) -> List[WhatsAppTemplateStatus]:
    """
    List all message templates for a tenant.
    
    Fetches fresh status from Meta API and updates local cache.
    """
    access_token = await get_whatsapp_access_token(tenant_id)
    waba_id = await get_whatsapp_business_account_id(tenant_id)

    if not access_token or not waba_id:
        # Return locally stored templates if Meta not connected
        return await _get_local_templates(tenant_id)

    api_version = settings.meta_api_version or "v18.0"
    url = f"https://graph.facebook.com/{api_version}/{waba_id}/message_templates"

    templates = []

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
                params={"fields": "name,category,language,status,components,rejected_reason"},
            )

            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("data", []):
                    # Extract body text from components
                    body_text = ""
                    for comp in item.get("components", []):
                        if comp.get("type") == "BODY":
                            body_text = comp.get("text", "")
                            break

                    templates.append(WhatsAppTemplateStatus(
                        name=item.get("name", ""),
                        category=item.get("category", "UTILITY"),
                        status=item.get("status", "PENDING"),
                        language=item.get("language", "en"),
                        body_text=body_text,
                        rejection_reason=item.get("rejected_reason"),
                    ))

                # Update local cache with fresh statuses
                await _update_local_template_statuses(tenant_id, templates)

    except Exception as e:
        logger.warning(f"Failed to fetch templates from Meta: {e}")
        # Fall back to local templates
        return await _get_local_templates(tenant_id)

    return templates


async def _get_local_templates(tenant_id: str) -> List[WhatsAppTemplateStatus]:
    """Get locally stored template data."""
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == tenant_id,
            ChannelConfig.channel == "whatsapp",
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if not cfg or not cfg.config:
            return []

        templates = cfg.config.get("templates", [])
        return [
            WhatsAppTemplateStatus(
                name=t.get("name", ""),
                category=t.get("category", "UTILITY"),
                status=t.get("status", "NOT_SUBMITTED"),
                language=t.get("language", "en"),
                body_text=t.get("body_text", ""),
                rejection_reason=t.get("rejection_reason"),
            )
            for t in templates
        ]


async def _update_local_template_statuses(
    tenant_id: str,
    meta_templates: List[WhatsAppTemplateStatus],
) -> None:
    """Update local template cache with fresh statuses from Meta."""
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == tenant_id,
            ChannelConfig.channel == "whatsapp",
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if not cfg:
            return

        config = cfg.config or {}
        local_templates = config.get("templates", [])

        # Create lookup by name
        meta_by_name = {t.name: t for t in meta_templates}

        for local in local_templates:
            name = local.get("name")
            if name in meta_by_name:
                meta = meta_by_name[name]
                local["status"] = meta.status
                if meta.rejection_reason:
                    local["rejection_reason"] = meta.rejection_reason

        config["templates"] = local_templates
        cfg.config = config
        await session.commit()


async def delete_template(tenant_id: str, template_name: str) -> dict:
    """
    Delete a message template from Meta.
    
    Args:
        tenant_id: Tenant UUID
        template_name: Name of template to delete
    
    Returns:
        dict with deletion status
    """
    access_token = await get_whatsapp_access_token(tenant_id)
    waba_id = await get_whatsapp_business_account_id(tenant_id)

    if not access_token or not waba_id:
        raise ValueError("WhatsApp not connected")

    api_version = settings.meta_api_version or "v18.0"
    url = f"https://graph.facebook.com/{api_version}/{waba_id}/message_templates"

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.delete(
            url,
            headers={"Authorization": f"Bearer {access_token}"},
            params={"name": template_name},
        )

        if resp.status_code not in (200, 204):
            error_data = resp.json()
            error_msg = error_data.get("error", {}).get("message", "Unknown error")
            raise ValueError(f"Failed to delete template: {error_msg}")

    # Remove from local cache
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == tenant_id,
            ChannelConfig.channel == "whatsapp",
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if cfg and cfg.config:
            config = cfg.config
            templates = config.get("templates", [])
            config["templates"] = [t for t in templates if t.get("name") != template_name]
            cfg.config = config
            await session.commit()

    logger.info(f"Deleted WhatsApp template '{template_name}' for tenant {tenant_id}")
    return {"message": f"Template '{template_name}' deleted"}


async def get_template_by_name(tenant_id: str, template_name: str) -> Optional[WhatsAppTemplateStatus]:
    """Get a specific template by name."""
    templates = await list_templates(tenant_id)
    for t in templates:
        if t.name == template_name:
            return t
    return None
