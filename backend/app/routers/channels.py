"""
Channel configuration API endpoints (9.1).

Implements:
- GET  /api/channels        - List all channel configurations
- POST /api/channels/{name}/toggle - Enable/disable a channel
- GET  /api/channels/health - Get channel health metrics
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func

from ..config import settings
from ..models.user import User
from ..models.channel_config import ChannelConfig
from ..routers.auth import get_current_user
from ..models.base import get_db_session
from ..models.message import Message
from ..models.conversation import Conversation
from ..schemas.channels import (
    ChannelConfigItem,
    ChannelConfigListResponse,
    ChannelToggleRequest,
    ChannelToggleResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/channels", tags=["channels"])


CHANNEL_DEFINITIONS = [
    {
        "channel": "whatsapp",
        "display_name": "WhatsApp Business",
        "description": "Connect your WhatsApp Business account to send and receive messages.",
        "enabled_attr": "whatsapp_channel_enabled",
        "connected_check": lambda: bool(settings.whatsapp_default_from_number),
    },
    {
        "channel": "email",
        "display_name": "Email",
        "description": "Connect your email inbox via IMAP/SMTP for inbound and outbound email support.",
        "enabled_attr": "email_channel_enabled",
        "connected_check": lambda: bool(settings.email_imap_host and settings.email_imap_username),
    },
    {
        "channel": "sms",
        "display_name": "SMS",
        "description": "Send and receive SMS messages through your connected provider.",
        "enabled_attr": "sms_channel_enabled",
        "connected_check": lambda: bool(settings.sms_default_from_number),
    },
    {
        "channel": "messenger",
        "display_name": "Facebook Messenger",
        "description": "Connect your Facebook Page to manage Messenger conversations.",
        "enabled_attr": "messenger_channel_enabled",
        "connected_check": lambda: bool(settings.messenger_page_id),
    },
    {
        "channel": "instagram",
        "display_name": "Instagram DMs",
        "description": "Connect your Instagram Business account to manage direct messages.",
        "enabled_attr": "instagram_channel_enabled",
        "connected_check": lambda: bool(settings.instagram_account_id),
    },
]


@router.get("", response_model=ChannelConfigListResponse)
async def list_channels(
    current_user: User = Depends(get_current_user),
) -> ChannelConfigListResponse:
    # Read per-tenant channel configs when available; fall back to settings
    channels = []
    # determine plan gating: only GROWTH+ tiers unlock channels
    tenant_plan = getattr(current_user.tenant, "plan_tier", None)
    def is_locked(channel_key: str) -> (bool, Optional[str]):
        # for demo we require at least GROWTH for all non-widget channels
        if tenant_plan is None:
            return False, None
        from ..models.tenant import PlanTier
        if tenant_plan in (PlanTier.GROWTH, PlanTier.PRO, PlanTier.ENTERPRISE):
            return False, None
        # widget always unlocked
        if channel_key == "widget":
            return False, None
        return True, "Available on Growth plan"

    async with get_db_session() as session:
        for ch_def in CHANNEL_DEFINITIONS:
            # Attempt to load tenant-scoped config
            stmt = select(ChannelConfig).where(
                ChannelConfig.tenant_id == current_user.tenant_id,
                ChannelConfig.channel == ch_def["channel"],
            )
            result = await session.execute(stmt)
            cfg = result.scalar_one_or_none()

            if cfg:
                enabled = cfg.enabled
                connected = cfg.connected
            else:
                enabled = getattr(settings, ch_def["enabled_attr"], False)
                connected = ch_def["connected_check"]()

            locked, lock_reason = is_locked(ch_def["channel"])

            channels.append(
                ChannelConfigItem(
                    channel=ch_def["channel"],
                    enabled=enabled,
                    connected=connected,
                    display_name=ch_def["display_name"],
                    description=ch_def["description"],
                    locked=locked,
                    lock_reason=lock_reason,
                )
            )

    return ChannelConfigListResponse(channels=channels)


@router.post("/{channel_name}/toggle", response_model=ChannelToggleResponse)
async def toggle_channel(
    channel_name: str,
    request: ChannelToggleRequest,
    current_user: User = Depends(get_current_user),
) -> ChannelToggleResponse:
    """
    Toggle a channel on or off.

    Note: In a real deployment, this would persist to the database or update
    tenant-specific settings. For now, this is a stub that acknowledges the
    request without persisting (settings are env-driven).
    """
    valid_channels = [ch["channel"] for ch in CHANNEL_DEFINITIONS]
    if channel_name not in valid_channels:
        raise HTTPException(status_code=404, detail=f"Unknown channel: {channel_name}")

    # Persist toggle to tenant-scoped ChannelConfig
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == current_user.tenant_id,
            ChannelConfig.channel == channel_name,
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if cfg is None:
            # create new
            import uuid

            cfg = ChannelConfig(
                id=str(uuid.uuid4()),
                tenant_id=current_user.tenant_id,
                channel=channel_name,
                enabled=request.enabled,
                connected=False,
                config={},
            )
            session.add(cfg)
        else:
            cfg.enabled = request.enabled

        try:
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error("Failed to persist channel toggle: %s", e)
            raise HTTPException(status_code=500, detail="Failed to update channel setting")

    action = "enabled" if request.enabled else "disabled"
    return ChannelToggleResponse(
        channel=channel_name,
        enabled=request.enabled,
        message=f"Channel '{channel_name}' has been {action}.",
    )


@router.post("/{channel_name}/disconnect")
async def disconnect_channel(
    channel_name: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Disconnect a channel by removing its configuration.
    """
    valid_channels = [ch["channel"] for ch in CHANNEL_DEFINITIONS]
    if channel_name not in valid_channels:
        raise HTTPException(status_code=404, detail=f"Unknown channel: {channel_name}")

    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == current_user.tenant_id,
            ChannelConfig.channel == channel_name,
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if cfg:
            cfg.connected = False
            cfg.config = {}
            try:
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error("Failed to disconnect channel: %s", e)
                raise HTTPException(status_code=500, detail="Failed to disconnect channel")

    return {"message": f"Channel '{channel_name}' has been disconnected."}


class ChannelHealthItem(BaseModel):
    channel: str
    status: str
    messages_today: int
    messages_change: float
    delivery_rate: float
    last_error: Optional[str] = None
    last_error_at: Optional[str] = None
    connected_at: Optional[str] = None
    phone_number: Optional[str] = None
    account_name: Optional[str] = None


class ChannelHealthResponse(BaseModel):
    channels: List[ChannelHealthItem]
    total_messages_today: int
    avg_delivery_rate: float


@router.get("/health", response_model=ChannelHealthResponse)
async def get_channel_health(
    current_user: User = Depends(get_current_user),
) -> ChannelHealthResponse:
    """
    Get health metrics for all channels.
    Returns message counts, delivery rates, and error status.
    """
    channels = []
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    
    async with get_db_session() as session:
        for ch_def in CHANNEL_DEFINITIONS:
            channel_name = ch_def["channel"]
            
            stmt = select(ChannelConfig).where(
                ChannelConfig.tenant_id == current_user.tenant_id,
                ChannelConfig.channel == channel_name,
            )
            result = await session.execute(stmt)
            cfg = result.scalar_one_or_none()
            
            connected = cfg.connected if cfg else ch_def["connected_check"]()
            enabled = cfg.enabled if cfg else getattr(settings, ch_def["enabled_attr"], False)
            
            messages_today = 0
            delivery_rate = 100.0
            last_error = None
            last_error_at = None
            connected_at = None
            
            if connected:
                channel_key = f"{channel_name}-"
                conv_stmt = select(Conversation).where(
                    Conversation.tenant_id == current_user.tenant_id,
                    Conversation.session_id.like(f"{channel_key}%"),
                )
                conv_result = await session.execute(conv_stmt)
                conversations = conv_result.scalars().all()
                conv_ids = [c.id for c in conversations]
                
                if conv_ids:
                    msg_stmt = select(Message).where(
                        Message.conversation_id.in_(conv_ids),
                        Message.created_at >= today_start,
                    )
                    msg_result = await session.execute(msg_stmt)
                    messages = msg_result.scalars().all()
                    messages_today = len(messages)
                    
                    delivered_count = sum(1 for m in messages if m.message_metadata and m.message_metadata.get("status") != "failed")
                    if messages:
                        delivery_rate = round((delivered_count / len(messages)) * 100, 1)
                
                if conversations:
                    earliest = min(c.started_at for c in conversations if c.started_at)
                    connected_at = earliest.isoformat() + "Z" if earliest else None
            
            status = "disconnected"
            if connected and enabled:
                status = "active"
            elif enabled and not connected:
                status = "warning"
            
            phone_number = None
            account_name = None
            if cfg and cfg.config:
                phone_number = cfg.config.get("display_phone_number") or cfg.config.get("phone_number")
                account_name = cfg.config.get("account_name") or cfg.config.get("page_name")
            
            channels.append(ChannelHealthItem(
                channel=channel_name,
                status=status,
                messages_today=messages_today,
                messages_change=0.0,
                delivery_rate=delivery_rate,
                last_error=last_error,
                last_error_at=last_error_at,
                connected_at=connected_at,
                phone_number=phone_number,
                account_name=account_name,
            ))
        
        widget_stmt = select(func.count(Message.id)).where(
            Message.created_at >= today_start,
        )
        widget_result = await session.execute(widget_stmt)
        widget_messages = widget_result.scalar() or 0
        
        channels.append(ChannelHealthItem(
            channel="widget",
            status="active",
            messages_today=widget_messages,
            messages_change=0.0,
            delivery_rate=100.0,
            connected_at=None,
        ))
    
    total_messages = sum(c.messages_today for c in channels)
    active_channels = [c for c in channels if c.status == "active"]
    avg_delivery = sum(c.delivery_rate for c in active_channels) / len(active_channels) if active_channels else 0.0
    
    return ChannelHealthResponse(
        channels=channels,
        total_messages_today=total_messages,
        avg_delivery_rate=round(avg_delivery, 1),
    )


class EmailVerifyForwardingRequest(BaseModel):
    email_address: str


class EmailVerifyForwardingResponse(BaseModel):
    verified: bool
    message: str
    inbound_address: str


@router.post("/email/verify-forwarding", response_model=EmailVerifyForwardingResponse)
async def verify_email_forwarding(
    request: EmailVerifyForwardingRequest,
    current_user: User = Depends(get_current_user),
) -> EmailVerifyForwardingResponse:
    """
    Verify email forwarding is working by checking if a test email was received.
    """
    import uuid
    
    tenant_id = current_user.tenant_id or "default"
    inbound_address = f"{tenant_id[:8]}@inbound.nexachat.com"
    
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == current_user.tenant_id,
            ChannelConfig.channel == "email",
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()
        
        from ..services.channel_settings import save_email_forwarding_config

    if cfg and cfg.config:
            received_test = cfg.config.get("forwarding_verified", False)
            if received_test:
                # persist config success
                await save_email_forwarding_config(
                    current_user.tenant_id,
                    request.email_address,
                    inbound_address,
                    True,
                )
                return EmailVerifyForwardingResponse(
                    verified=True,
                    message="Forwarding is working! We received your test email.",
                    inbound_address=inbound_address,
                )
    
    # not verified yet, persist tentative info
    async with get_db_session() as session:
        # update or create channel config entry email
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == current_user.tenant_id,
            ChannelConfig.channel == "email",
        )
        result = await session.execute(stmt)
        cfg2 = result.scalar_one_or_none()
        if cfg2 is None:
            import uuid
            cfg2 = ChannelConfig(
                id=str(uuid.uuid4()),
                tenant_id=current_user.tenant_id,
                channel="email",
                enabled=False,
                connected=False,
                config={
                    "email_address": request.email_address,
                    "forwarding_verified": False,
                },
            )
            session.add(cfg2)
        else:
            cfg2.config = {
                **(cfg2.config or {}),
                "email_address": request.email_address,
                "forwarding_verified": False,
            }
        try:
            await session.commit()
        except Exception:
            await session.rollback()

    return EmailVerifyForwardingResponse(
        verified=False,
        message="No test email received yet. Send a test email to verify forwarding.",
        inbound_address=inbound_address,
    )


class SmsVerifyCredentialsRequest(BaseModel):
    provider: str
    credentials: dict


class SmsVerifyCredentialsResponse(BaseModel):
    verified: bool
    message: str
    phone_number: Optional[str] = None


@router.post("/sms/verify-credentials", response_model=SmsVerifyCredentialsResponse)
async def verify_sms_credentials(
    request: SmsVerifyCredentialsRequest,
    current_user: User = Depends(get_current_user),
) -> SmsVerifyCredentialsResponse:
    """
    Verify SMS provider credentials are valid.
    """
    import httpx
    
    provider = request.provider
    credentials = request.credentials
    
    try:
        if provider == "twilio":
            account_sid = credentials.get("account_sid")
            auth_token = credentials.get("auth_token")
            
            if not account_sid or not auth_token:
                return SmsVerifyCredentialsResponse(
                    verified=False,
                    message="Missing account SID or auth token",
                )
            
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}.json",
                    auth=(account_sid, auth_token),
                )
                
                if resp.status_code == 200:
                    data = resp.json()
                    phone_number = data.get("phone_number")
                    return SmsVerifyCredentialsResponse(
                        verified=True,
                        message=f"Connected to Twilio account: {data.get('friendly_name', 'Account')}",
                        phone_number=phone_number,
                    )
                else:
                    return SmsVerifyCredentialsResponse(
                        verified=False,
                        message="Invalid Twilio credentials. Please check your account SID and auth token.",
                    )
        
        elif provider == "africas_talking":
            username = credentials.get("username")
            api_key = credentials.get("api_key")
            
            if not username or not api_key:
                return SmsVerifyCredentialsResponse(
                    verified=False,
                    message="Missing username or API key",
                )
            
            async with httpx.AsyncClient(timeout=10) as client:
                headers = {"ApiKey": api_key}
                resp = await client.get(
                    f"https://api.africastalking.com/version1/user?username={username}",
                    headers=headers,
                )
                
                if resp.status_code == 200:
                    data = resp.json()
                    user_data = data.get("UserData", {})
                    return SmsVerifyCredentialsResponse(
                        verified=True,
                        message=f"Connected to Africa's Talking as {user_data.get('name', username)}",
                        phone_number=user_data.get("phoneNumber"),
                    )
                else:
                    return SmsVerifyCredentialsResponse(
                        verified=False,
                        message="Invalid Africa's Talking credentials. Please check your username and API key.",
                    )
        
        else:
            return SmsVerifyCredentialsResponse(
                verified=False,
                message=f"Unknown provider: {provider}",
            )
            
    except Exception as e:
        logger.error(f"SMS credential verification failed: {e}")
        return SmsVerifyCredentialsResponse(
            verified=False,
            message=f"Verification failed: {str(e)}",
        )


class WhatsAppTestStatusResponse(BaseModel):
    received: bool
    received_at: Optional[str] = None

@router.get("/whatsapp/test-status", response_model=WhatsAppTestStatusResponse)
async def whatsapp_test_status(
    current_user: User = Depends(get_current_user),
):
    """Check if a 'TEST' message has been received on WhatsApp since yesterday."""
    from datetime import timedelta
    now = datetime.utcnow()
    window = now - timedelta(days=1)

    # find conversations for whatsapp channel
    channel_key = "whatsapp-"
    async with get_db_session() as session:
        conv_stmt = select(Conversation).where(
            Conversation.tenant_id == current_user.tenant_id,
            Conversation.session_id.like(f"{channel_key}%"),
        )
        conv_result = await session.execute(conv_stmt)
        conversations = conv_result.scalars().all()
        conv_ids = [c.id for c in conversations]
        if not conv_ids:
            return WhatsAppTestStatusResponse(received=False)

        msg_stmt = select(Message).where(
            Message.conversation_id.in_(conv_ids),
            Message.created_at >= window,
            Message.body == "TEST",
        ).order_by(Message.created_at.desc())
        msg_result = await session.execute(msg_stmt)
        msg = msg_result.scalars().first()
        if msg:
            return WhatsAppTestStatusResponse(received=True, received_at=msg.created_at.isoformat() + "Z")
        else:
            return WhatsAppTestStatusResponse(received=False)
# --------------------------------------------------------------------------

class SmsTestRequest(BaseModel):
    phone_number: str
    message: Optional[str] = "This is a test message from NexaChat."

@router.post("/sms/test")
async def send_sms_test(
    request: SmsTestRequest,
    current_user: User = Depends(get_current_user),
):
    """Send a test SMS using the configured provider and credentials."""
    # load credentials from channel settings service
    from ..services.channel_settings import get_sms_credentials

    creds = await get_sms_credentials(current_user.tenant_id)
    if not creds or not creds.provider:
        raise HTTPException(status_code=400, detail="SMS credentials are not configured")

    provider = creds.provider
    try:
        if provider == "twilio":
            account_sid = creds.account_sid
            auth_token = creds.auth_token
            from_number = creds.from_number
            if not account_sid or not auth_token or not from_number:
                raise ValueError("Incomplete Twilio credentials")
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
                    data={
                        "From": from_number,
                        "To": request.phone_number,
                        "Body": request.message,
                    },
                    auth=(account_sid, auth_token),
                )
                if resp.status_code not in (200, 201):
                    raise HTTPException(status_code=502, detail=f"Twilio error: {resp.text}")

        elif provider == "africas_talking":
            username = creds.username
            api_key = creds.api_key
            from_number = creds.from_number
            if not username or not api_key or not from_number:
                raise ValueError("Incomplete Africa's Talking credentials")
            async with httpx.AsyncClient(timeout=10) as client:
                headers = {"ApiKey": api_key}
                data = {
                    "username": username,
                    "to": request.phone_number,
                    "message": request.message,
                    "from": from_number,
                }
                resp = await client.post(
                    "https://api.africastalking.com/version1/messaging",
                    data=data,
                    headers=headers,
                )
                if resp.status_code != 201:
                    raise HTTPException(status_code=502, detail=f"Africa's Talking error: {resp.text}")
        else:
            raise HTTPException(status_code=400, detail=f"Unknown SMS provider: {provider}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send SMS test: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {"message": "Test SMS sent"}


class GenericTestStatusResponse(BaseModel):
    received: bool
    received_at: Optional[str] = None

@router.get("/instagram/test-status", response_model=GenericTestStatusResponse)
async def instagram_test_status(
    current_user: User = Depends(get_current_user),
):
    """Check for a 'TEST' DM received on Instagram."""
    from datetime import timedelta
    now = datetime.utcnow()
    window = now - timedelta(days=1)
    channel_key = "instagram-"
    async with get_db_session() as session:
        conv_stmt = select(Conversation).where(
            Conversation.tenant_id == current_user.tenant_id,
            Conversation.session_id.like(f"{channel_key}%"),
        )
        conv_result = await session.execute(conv_stmt)
        convs = conv_result.scalars().all()
        ids = [c.id for c in convs]
        if not ids:
            return GenericTestStatusResponse(received=False)
        msg_stmt = select(Message).where(
            Message.conversation_id.in_(ids),
            Message.created_at >= window,
            Message.body == "TEST",
        ).order_by(Message.created_at.desc())
        msg_result = await session.execute(msg_stmt)
        msg = msg_result.scalars().first()
        if msg:
            return GenericTestStatusResponse(received=True, received_at=msg.created_at.isoformat() + "Z")
        return GenericTestStatusResponse(received=False)
