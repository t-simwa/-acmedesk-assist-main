"""
Minimal Meta OAuth endpoints for generating auth URL and handling callback.

This provides two endpoints used by the frontend during setup wizards:
- GET  /api/auth/meta/url - returns an authorization URL to redirect the user to
- POST /api/auth/meta/callback - accepts a code and stores tokens in ChannelConfig

This implementation expects environment-configured CLIENT_ID/SECRET and
will exchange the code via Facebook Graph API. Tokens are stored in the
channel_configs.oauth_tokens field as opaque JSON.
"""

import logging
import httpx
import json
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from ..config import settings
from ..routers.auth import get_current_user
from ..models.base import get_db_session
from ..models.channel_config import ChannelConfig
from ..services.crypto import encrypt, decrypt
from sqlalchemy import select
from ..services.meta_token import refresh_user_token_if_needed

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth/meta", tags=["auth"])


class MetaAuthUrlResponse(BaseModel):
    url: str


@router.get("/url", response_model=MetaAuthUrlResponse)
async def get_meta_auth_url(redirect_path: str = "/", current_user=Depends(get_current_user)):
    if not settings.meta_client_id:
        raise HTTPException(status_code=500, detail="Meta client ID not configured")

    redirect_uri = f"{settings.backend_origin}/api/auth/meta/callback"
    # We include state as tenant id for CSRF + tenant mapping (simple approach)
    state = current_user.tenant_id
    scope = "pages_messaging,instagram_basic,whatsapp_business_management,whatsapp_business_messaging"
    url = (
        f"https://www.facebook.com/{settings.meta_api_version}/dialog/oauth?client_id={settings.meta_client_id}"
        f"&redirect_uri={redirect_uri}&state={state}&scope={scope}"
    )
    return MetaAuthUrlResponse(url=url)


class MetaCallbackRequest(BaseModel):
    code: str
    state: str


@router.post("/callback")
async def meta_oauth_callback(payload: MetaCallbackRequest, current_user=Depends(get_current_user)):
    """Exchange code for tokens and persist to tenant ChannelConfig for whatsapp/messenger/instagram.

    NOTE: This is a simplified implementation. In production you should
    validate 'state' matches a stored CSRF token and securely encrypt tokens
    at rest. The exchange uses the Graph API's oauth/access_token endpoint.
    """
    if payload.state != current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Invalid state")

    if not settings.meta_client_id or not settings.meta_client_secret:
        raise HTTPException(status_code=500, detail="Meta OAuth not configured")

    redirect_uri = f"{settings.backend_origin}/api/auth/meta/callback"
    token_url = (
        f"https://graph.facebook.com/{settings.meta_api_version}/oauth/access_token?client_id={settings.meta_client_id}"
        f"&redirect_uri={redirect_uri}&client_secret={settings.meta_client_secret}&code={payload.code}"
    )

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(token_url)
        if resp.status_code != 200:
            logger.error("Meta OAuth token exchange failed: %s", resp.text)
            raise HTTPException(status_code=500, detail="Failed to exchange code for tokens")
        token_data = resp.json()

    # Persist token data to ChannelConfig for these channels
    async with get_db_session() as session:
        # Upsert ChannelConfig entries for messenger, instagram, whatsapp
        for channel_key in ("messenger", "instagram", "whatsapp"):
            stmt = select(ChannelConfig).where(
                ChannelConfig.tenant_id == current_user.tenant_id,
                ChannelConfig.channel == channel_key,
            )
            result = await session.execute(stmt)
            cfg = result.scalar_one_or_none()
            if cfg is None:
                cfg = ChannelConfig(
                    id=str(uuid.uuid4()),
                    tenant_id=current_user.tenant_id,
                    channel=channel_key,
                    enabled=True,
                    connected=True,
                    config={},
                    oauth_tokens=encrypt(json.dumps(token_data)),
                )
                session.add(cfg)
            else:
                cfg.enabled = True
                cfg.connected = True
                cfg.oauth_tokens = encrypt(json.dumps(token_data))
        try:
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error("Failed to save meta oauth tokens: %s", e)
            raise HTTPException(status_code=500, detail="Failed to save OAuth tokens")

    return {"message": "Connected to Meta. You can now select Pages and Numbers in the channel setup."}


async def _exchange_code_and_persist(code: str, state: str, current_user):
    """Helper to exchange code and persist tokens. Raises HTTPException on failure."""
    if state != current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Invalid state")

    if not settings.meta_client_id or not settings.meta_client_secret:
        raise HTTPException(status_code=500, detail="Meta OAuth not configured")

    redirect_uri = f"{settings.backend_origin}/api/auth/meta/callback"
    token_url = (
        f"https://graph.facebook.com/{settings.meta_api_version}/oauth/access_token?client_id={settings.meta_client_id}"
        f"&redirect_uri={redirect_uri}&client_secret={settings.meta_client_secret}&code={code}"
    )

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(token_url)
        if resp.status_code != 200:
            logger.error("Meta OAuth token exchange failed: %s", resp.text)
            raise HTTPException(status_code=500, detail="Failed to exchange code for tokens")
        token_data = resp.json()

    # Try to exchange short-lived user token for a long-lived token and store expiry
    try:
        user_token = token_data.get("access_token")
        if user_token:
            exch_url = (
                f"https://graph.facebook.com/{settings.meta_api_version}/oauth/access_token?grant_type=fb_exchange_token"
                f"&client_id={settings.meta_client_id}&client_secret={settings.meta_client_secret}"
                f"&fb_exchange_token={user_token}"
            )
            async with httpx.AsyncClient(timeout=10) as client:
                exch_resp = await client.get(exch_url)
                if exch_resp.status_code == 200:
                    exch_data = exch_resp.json()
                    # Merge and compute expires_at if provided
                    token_data.update(exch_data)
                    expires = exch_data.get("expires_in")
                    if expires:
                        token_data["expires_at"] = (
                            datetime.utcnow() + timedelta(seconds=int(expires))
                        ).isoformat() + "Z"
    except Exception as e:
        logger.warning("Failed to exchange for long-lived token: %s", e)

    # Persist token data to ChannelConfig for these channels
    async with get_db_session() as session:
        # Upsert ChannelConfig entries for messenger, instagram, whatsapp
        for channel_key in ("messenger", "instagram", "whatsapp"):
            stmt = select(ChannelConfig).where(
                ChannelConfig.tenant_id == current_user.tenant_id,
                ChannelConfig.channel == channel_key,
            )
            result = await session.execute(stmt)
            cfg = result.scalar_one_or_none()
            if cfg is None:
                cfg = ChannelConfig(
                    id=str(uuid.uuid4()),
                    tenant_id=current_user.tenant_id,
                    channel=channel_key,
                    enabled=True,
                    connected=True,
                    config={},
                    oauth_tokens=encrypt(json.dumps(token_data)),
                )
                session.add(cfg)
            else:
                cfg.enabled = True
                cfg.connected = True
                cfg.oauth_tokens = encrypt(json.dumps(token_data))
        try:
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error("Failed to save meta oauth tokens: %s", e)
            raise HTTPException(status_code=500, detail="Failed to save OAuth tokens")

    return {"message": "Connected to Meta. You can now select Pages and Numbers in the channel setup."}


@router.get("/callback")
async def meta_oauth_callback_get(code: str, state: str, current_user=Depends(get_current_user)):
    """Handle GET redirect from Meta OAuth (Facebook redirects here with code and state).

    This endpoint performs the same exchange & persist logic and returns a small
    JSON payload. In production you might redirect the user back to the frontend
    instead of returning JSON.
    """
    # Perform the exchange and persist tokens, then return a small HTML page
    # that notifies the opener window (frontend) via postMessage and closes.
    await _exchange_code_and_persist(code, state, current_user)

    frontend_origin = getattr(settings, "frontend_origin", "http://localhost:8080")
    html = f"""
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Connected</title>
      </head>
      <body>
        <p>Connected to Meta. You can close this window.</p>
        <script>
          try {{
            window.opener.postMessage({{"type":"meta_oauth","status":"connected"}}, "{frontend_origin}");
          }} catch (e) {{ /* ignore */ }}
          // Attempt to close the popup
          window.close();
        </script>
      </body>
    </html>
    """
    return HTMLResponse(content=html)


@router.get("/pages")
async def list_meta_pages(current_user=Depends(get_current_user)):
    """List Facebook Pages accessible by the connected Meta account.

    Returns page id, name and a page access token (if available) so the frontend
    can let the user select which Page to connect.
    """
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == current_user.tenant_id,
            ChannelConfig.channel == "messenger",
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if not cfg or not cfg.oauth_tokens:
            raise HTTPException(status_code=404, detail="Meta is not connected for this tenant")

        token_blob = cfg.oauth_tokens
        if not token_blob:
            raise HTTPException(status_code=404, detail="No OAuth tokens stored")
        try:
            token_json = decrypt(token_blob)
            token_data = json.loads(token_json)
        except Exception:
            # fallback to plaintext
            token_data = json.loads(token_blob)
        user_access_token = token_data.get("access_token")

        if not user_access_token:
            raise HTTPException(status_code=500, detail="No access token available")

    # Ensure we have a refreshed token if needed
    try:
        refreshed = await refresh_user_token_if_needed(current_user.tenant_id)
        if refreshed and refreshed.get("access_token"):
            user_access_token = refreshed.get("access_token")
    except Exception:
        # If refresh fails, continue with existing token (will error later if invalid)
        pass

    # Call Graph API to list pages
    url = f"https://graph.facebook.com/{settings.meta_api_version}/me/accounts?access_token={user_access_token}"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        if resp.status_code != 200:
            logger.error("Failed to list pages: %s", resp.text)
            raise HTTPException(status_code=502, detail="Failed to fetch Pages from Meta")
        data = resp.json()

    pages = []
    for item in data.get("data", []):
        pages.append({
            "id": item.get("id"),
            "name": item.get("name"),
            # Do not return page access tokens to the frontend; tokens are fetched server-side when saving configuration
        })

    return {"pages": pages}


@router.get("/instagram_accounts")
async def list_instagram_accounts(current_user=Depends(get_current_user)):
    """List Instagram Business accounts connected via Meta OAuth.

    Graph API: GET /me/accounts?fields=instagram_business_account{username,ig_id,name,followers_count}
    Requires instagram_basic and pages_show_list permissions.
    """
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == current_user.tenant_id,
            ChannelConfig.channel == "messenger",
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if not cfg or not cfg.oauth_tokens:
            raise HTTPException(status_code=404, detail="Meta is not connected for this tenant")

        token_blob = cfg.oauth_tokens
        try:
            token_json = decrypt(token_blob)
            token_data = json.loads(token_json)
        except Exception:
            token_data = json.loads(token_blob)
        user_access_token = token_data.get("access_token")

        if not user_access_token:
            raise HTTPException(status_code=500, detail="No access token available")

    # Refresh token if needed
    try:
        refreshed = await refresh_user_token_if_needed(current_user.tenant_id)
        if refreshed and refreshed.get("access_token"):
            user_access_token = refreshed.get("access_token")
    except Exception:
        pass

    url = (
        f"https://graph.facebook.com/{settings.meta_api_version}/me/accounts?fields=instagram_business_account{{username,ig_id,name,followers_count}}&access_token={user_access_token}"
    )

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        if resp.status_code != 200:
            logger.error("Failed to list instagram accounts: %s", resp.text)
            raise HTTPException(status_code=502, detail="Failed to fetch Instagram accounts from Meta")
        data = resp.json()

    accounts = []
    for item in data.get("data", []):
        ig = item.get("instagram_business_account")
        if ig:
            accounts.append({
                "id": ig.get("ig_id"),
                "username": ig.get("username"),
                "name": ig.get("name"),
                "followers": ig.get("followers_count"),
            })
    return {"instagram_accounts": accounts}


@router.get("/whatsapp_accounts")
async def list_whatsapp_accounts(current_user=Depends(get_current_user)):
    """List WhatsApp Business Accounts and phone numbers visible to the connected Meta account.

    Uses the user access token to fetch `whatsapp_business_accounts` and their
    `phone_numbers`. Requires `whatsapp_business_management` permission.
    """
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == current_user.tenant_id,
            ChannelConfig.channel == "whatsapp",
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if not cfg or not cfg.oauth_tokens:
            raise HTTPException(status_code=404, detail="Meta is not connected for this tenant")

        token_blob = cfg.oauth_tokens
        if not token_blob:
            raise HTTPException(status_code=404, detail="No OAuth tokens stored")
        try:
            token_json = decrypt(token_blob)
            token_data = json.loads(token_json)
        except Exception:
            token_data = json.loads(token_blob)
        user_access_token = token_data.get("access_token")

        if not user_access_token:
            raise HTTPException(status_code=500, detail="No access token available")

    # Attempt token refresh if needed
    try:
        refreshed = await refresh_user_token_if_needed(current_user.tenant_id)
        if refreshed and refreshed.get("access_token"):
            user_access_token = refreshed.get("access_token")
    except Exception:
        pass

    url = (
        f"https://graph.facebook.com/{settings.meta_api_version}/me?fields=whatsapp_business_accounts{{display_name,phone_numbers{{display_phone_number,id,quality_status}}}}&access_token={user_access_token}"
    )

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        if resp.status_code != 200:
            logger.error("Failed to list whatsapp accounts: %s", resp.text)
            raise HTTPException(status_code=502, detail="Failed to fetch WhatsApp accounts from Meta")
        data = resp.json()

    wbas = data.get("whatsapp_business_accounts", [])
    out = []
    for wba in wbas:
        phones = []
        for pn in wba.get("phone_numbers", []):
            phones.append({
                "id": pn.get("id"),
                "display_phone_number": pn.get("display_phone_number"),
                "quality_status": pn.get("quality_status"),
            })
        out.append({"id": wba.get("id"), "display_name": wba.get("display_name"), "phone_numbers": phones})

    return {"whatsapp_business_accounts": out}


@router.get("/instagram_accounts")
async def list_instagram_accounts(current_user=Depends(get_current_user)):
    """List Instagram Business accounts linked to connected Facebook Pages.

    Uses the user access token to fetch Facebook Pages and their connected
    Instagram Business accounts. Requires `instagram_basic` permission.
    """
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == current_user.tenant_id,
            ChannelConfig.channel == "instagram",
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if not cfg or not cfg.oauth_tokens:
            raise HTTPException(status_code=404, detail="Meta is not connected for this tenant")

        token_blob = cfg.oauth_tokens
        if not token_blob:
            raise HTTPException(status_code=404, detail="No OAuth tokens stored")
        try:
            token_json = decrypt(token_blob)
            token_data = json.loads(token_json)
        except Exception:
            token_data = json.loads(token_blob)
        user_access_token = token_data.get("access_token")

        if not user_access_token:
            raise HTTPException(status_code=500, detail="No access token available")

    # Attempt token refresh if needed
    try:
        refreshed = await refresh_user_token_if_needed(current_user.tenant_id)
        if refreshed and refreshed.get("access_token"):
            user_access_token = refreshed.get("access_token")
    except Exception:
        pass

    # First get all Facebook Pages
    pages_url = f"https://graph.facebook.com/{settings.meta_api_version}/me/accounts?access_token={user_access_token}"
    
    instagram_accounts = []

    async with httpx.AsyncClient(timeout=15) as client:
        pages_resp = await client.get(pages_url)
        if pages_resp.status_code != 200:
            logger.error("Failed to list pages for Instagram: %s", pages_resp.text)
            raise HTTPException(status_code=502, detail="Failed to fetch Pages from Meta")
        
        pages_data = pages_resp.json()
        
        # For each page, check for connected Instagram Business account
        for page in pages_data.get("data", []):
            page_id = page.get("id")
            page_name = page.get("name")
            page_token = page.get("access_token")
            
            # Fetch Instagram Business account connected to this page
            ig_url = f"https://graph.facebook.com/{settings.meta_api_version}/{page_id}?fields=instagram_business_account{{id,username,profile_picture_url,followers_count}}&access_token={page_token}"
            
            ig_resp = await client.get(ig_url)
            if ig_resp.status_code == 200:
                ig_data = ig_resp.json()
                ig_account = ig_data.get("instagram_business_account")
                
                if ig_account:
                    instagram_accounts.append({
                        "id": ig_account.get("id"),
                        "username": ig_account.get("username"),
                        "profile_picture_url": ig_account.get("profile_picture_url"),
                        "followers_count": ig_account.get("followers_count"),
                        "linked_page_id": page_id,
                        "linked_page_name": page_name,
                    })

    return {"instagram_accounts": instagram_accounts}


@router.post("/disconnect")
async def meta_disconnect(current_user=Depends(get_current_user)):
    """Disconnect Meta for tenant: clears stored oauth_tokens and marks channels disconnected."""
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(ChannelConfig.tenant_id == current_user.tenant_id)
        result = await session.execute(stmt)
        configs = result.scalars().all()

        for cfg in configs:
            if cfg.channel in ("messenger", "instagram", "whatsapp"):
                cfg.oauth_tokens = None
                cfg.connected = False

        try:
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error("Failed to disconnect Meta: %s", e)
            raise HTTPException(status_code=500, detail="Failed to disconnect Meta")

    return {"message": "Disconnected Meta for tenant"}
