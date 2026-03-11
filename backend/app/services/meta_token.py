"""Meta (Facebook) token management helpers.

Provides utilities to check expiry and refresh user access tokens using the
Facebook Graph API. Refresh is attempted when a stored token reports an
`expires_at` within `REFRESH_THRESHOLD_SECONDS` or no expiry is present.

These helpers operate on tenant-scoped ChannelConfig rows and update the
`oauth_tokens` field (encrypted via services.crypto.encrypt) for
messenger/instagram/whatsapp entries.
"""

import logging
from datetime import datetime, timedelta
import json

import httpx
from sqlalchemy import select

from ..config import settings
from ..models.base import get_db_session
from ..models.channel_config import ChannelConfig
from ..services.crypto import decrypt, encrypt

logger = logging.getLogger(__name__)

# When token expires within this many seconds, attempt to refresh
REFRESH_THRESHOLD_SECONDS = 60 * 60 * 24  # 24 hours


async def _read_token_from_cfg(cfg: ChannelConfig) -> dict | None:
    if not cfg or not cfg.oauth_tokens:
        return None
    try:
        token_json = decrypt(cfg.oauth_tokens)
        return json.loads(token_json)
    except Exception:
        try:
            return json.loads(cfg.oauth_tokens)
        except Exception:
            return None


def _token_expires_at(token_data: dict) -> datetime | None:
    # Prefer explicit ISO timestamp
    expires_at_val = token_data.get("expires_at")
    if expires_at_val:
        if isinstance(expires_at_val, str) and expires_at_val.endswith("Z"):
            try:
                return datetime.fromisoformat(expires_at_val.replace("Z", ""))
            except Exception:
                return None
    # Fallback to numeric expires_in (seconds)
    expires_in = token_data.get("expires_in")
    if expires_in is None:
        return None
    try:
        secs = int(expires_in)
        return datetime.utcnow() + timedelta(seconds=secs)
    except Exception:
        return None


async def refresh_user_token_if_needed(tenant_id: str) -> dict | None:
    """Ensure the stored Meta user token for the tenant is valid.

    If token appears expired or near expiry, attempt to exchange it for a
    long-lived token via the Graph API. On success, update all relevant
    ChannelConfig.oauth_tokens rows for the tenant.
    Returns the (possibly refreshed) token_data dict or None if no token.
    """
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(ChannelConfig.tenant_id == tenant_id)
        res = await session.execute(stmt)
        configs = res.scalars().all()

        # find any config with oauth_tokens
        cfg_with_token = None
        for c in configs:
            if c.oauth_tokens:
                cfg_with_token = c
                break

        if not cfg_with_token:
            return None

        token_data = await _read_token_from_cfg(cfg_with_token)
        if not token_data:
            return None

        expires_at = _token_expires_at(token_data)
        if expires_at:
            secs_left = (expires_at - datetime.utcnow()).total_seconds()
        else:
            secs_left = 0

        # If token has plenty of time left, do nothing
        if expires_at and secs_left > REFRESH_THRESHOLD_SECONDS:
            return token_data

        # Attempt refresh/exchange using Graph API
        user_token = token_data.get("access_token")
        if not user_token:
            return token_data

        try:
            exch_url = (
                f"https://graph.facebook.com/{settings.meta_api_version}/oauth/access_token?grant_type=fb_exchange_token"
                f"&client_id={settings.meta_client_id}&client_secret={settings.meta_client_secret}"
                f"&fb_exchange_token={user_token}"
            )
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(exch_url)
                if resp.status_code != 200:
                    logger.warning("Meta token refresh failed: %s", resp.text)
                    return token_data
                exch = resp.json()
        except Exception as e:
            logger.warning("Meta token refresh error: %s", e)
            return token_data

        # Merge new data and set expires_at if provided
        token_data.update(exch)
        expires = exch.get("expires_in")
        if expires:
            token_data["expires_at"] = (datetime.utcnow() + timedelta(seconds=int(expires))).isoformat() + "Z"

        # Persist updated token_data to all relevant ChannelConfig rows
        try:
            for cfg in configs:
                if cfg.channel in ("messenger", "instagram", "whatsapp"):
                    cfg.oauth_tokens = encrypt(json.dumps(token_data))
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error("Failed to persist refreshed token: %s", e)

        return token_data


async def debug_token_scopes(token: str) -> list[str] | None:
    """Return list of scopes associated with a user access token via debug_token.

    Uses the app access token (client_id|client_secret) to call Graph API debug_token.
    Returns list of scopes or None on failure.
    """
    try:
        app_access = f"{settings.meta_client_id}|{settings.meta_client_secret}"
        url = f"https://graph.facebook.com/{settings.meta_api_version}/debug_token?input_token={token}&access_token={app_access}"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                logger.warning("debug_token failed: %s", resp.text)
                return None
            data = resp.json().get("data", {})
            scopes = data.get("scopes") or []
            return scopes
    except Exception as e:
        logger.warning("debug_token exception: %s", e)
        return None
