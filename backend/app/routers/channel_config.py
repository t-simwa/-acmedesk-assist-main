"""Endpoints to save provider selections for channels.

Provides POST /api/channels/{channel}/configure to persist provider-specific
configuration (e.g., selected Page id and page_access_token for Messenger,
selected WhatsApp Business phone id for WhatsApp).
"""

import logging
import json
import uuid
import httpx

from ..config import settings

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from ..routers.auth import get_current_user
from ..models.base import get_db_session
from ..models.channel_config import ChannelConfig
from ..services.crypto import encrypt, decrypt

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/channels", tags=["channels"])


class MessengerConfigureRequest(BaseModel):
    page_id: str



class WhatsAppConfigureRequest(BaseModel):
    whatsapp_business_account_id: str
    phone_number_id: str
    display_phone_number: str


@router.post("/{channel}/configure")
async def configure_channel(channel: str, payload: dict, current_user=Depends(get_current_user)):
    """Save provider-specific configuration for channel.

    This is a flexible endpoint that validates known channels and stores the
    payload JSON into ChannelConfig.config. For Messenger we also persist the
    page_access_token encrypted in oauth_tokens field so message sending code can
    use it directly if needed.
    """
    valid = {"messenger", "whatsapp", "sms", "email", "instagram", "widget"}
    if channel not in valid:
        raise HTTPException(status_code=404, detail="Unknown channel")

    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == current_user.tenant_id,
            ChannelConfig.channel == channel,
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        # Helper to try exchange page access token using stored user token
        async def _try_get_page_token(page_id: str) -> str | None:
            try:
                from ..services.meta_token import refresh_user_token_if_needed

                token_data = await refresh_user_token_if_needed(current_user.tenant_id)
                if not token_data:
                    return None
                user_token = token_data.get("access_token")
                if not user_token:
                    return None
                async with httpx.AsyncClient(timeout=10) as client:
                    url = f"https://graph.facebook.com/{settings.meta_api_version}/{page_id}?fields=access_token&access_token={user_token}"
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        data = resp.json()
                        return data.get("access_token")
            except Exception:
                return None
            return None

        if cfg is None:
            cfg = ChannelConfig(
                id=str(uuid.uuid4()),
                tenant_id=current_user.tenant_id,
                channel=channel,
                enabled=True,
                connected=True,
                config=payload,
            )

            if channel == "messenger" and payload.get("page_id"):
                page_id = payload.get("page_id")
                page_token = await _try_get_page_token(str(page_id))
                if page_token:
                    cfg.oauth_tokens = encrypt(json.dumps({"page_access_token": page_token}))
                    cfg.connected = True
                else:
                    cfg.connected = False

            session.add(cfg)
        else:
            cfg.config = payload
            cfg.enabled = True
            if channel == "messenger" and payload.get("page_id"):
                page_id = payload.get("page_id")
                page_token = await _try_get_page_token(str(page_id))
                if page_token:
                    cfg.oauth_tokens = encrypt(json.dumps({"page_access_token": page_token}))
                    cfg.connected = True
                else:
                    cfg.connected = False
            else:
                cfg.connected = True

        try:
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error("Failed to save channel configuration: %s", e)
            raise HTTPException(status_code=500, detail="Failed to persist configuration")

    return {"message": "Configuration saved"}
