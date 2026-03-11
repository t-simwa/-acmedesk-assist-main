"""
Facebook Messenger Webhook Handler

Receives messages from Meta FB Messenger API and routes them into
message_router. Supports verification handshake and basic message parsing.
"""

import logging
from typing import Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Request, Query, HTTPException, status

from ...config import settings
from ...services import facebook_service
from ...services.message_router import route_message
from ...models.message_event import MessageEvent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks/facebook", tags=["webhooks"])


async def verify_webhook(
    hub_mode: Optional[str] = Query(None),
    hub_verify_token: Optional[str] = Query(None),
    hub_challenge: Optional[str] = Query(None),
):
    expected = settings.facebook_webhook_verify_token
    if not expected:
        logger.warning("Facebook webhook verify token not configured")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook not configured")
    if hub_mode == "subscribe" and hub_verify_token == expected:
        logger.info("Facebook webhook verified")
        return hub_challenge
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification failed")


async def process_facebook_event(event: Dict[str, Any]) -> Optional[Dict]:
    sender = event.get("sender", {}).get("id")
    recipient = event.get("recipient", {}).get("id")
    timestamp = event.get("timestamp")
    message = event.get("message") or {}
    postback = event.get("postback")

    if message:
        mid = message.get("mid")
        text = message.get("text")
        # ignore attachments for simplicity
        evt = MessageEvent(
            tenant_id="",
            channel="facebook",
            channel_user_id=sender,
            channel_conversation_id=sender,
            contact_phone=None,
            contact_email=None,
            contact_name=None,
            contact_avatar_url=None,
            message_id=mid or str(timestamp),
            message_type="text",
            text=text,
            raw_payload=event,
            timestamp=datetime.utcnow(),
            reply_to_message_id=None,
            media_url=None,
            media_type=None,
            media_caption=None,
            button_payload=None,
            selected_option=None,
        )
        await route_message(evt, db=None)
        return {"status": "processed", "message_id": mid}
    if postback:
        payload = postback.get("payload")
        # treat as message for now
        evt = MessageEvent(
            tenant_id="",
            channel="facebook",
            channel_user_id=sender,
            channel_conversation_id=sender,
            contact_phone=None,
            contact_email=None,
            contact_name=None,
            contact_avatar_url=None,
            message_id=str(timestamp),
            message_type="postback",
            text=payload,
            raw_payload=event,
            timestamp=datetime.utcnow(),
            reply_to_message_id=None,
            media_url=None,
            media_type=None,
            media_caption=None,
            button_payload=payload,
            selected_option=None,
        )
        await route_message(evt, db=None)
        return {"status": "processed", "postback": payload}
    return None


@router.get("")
async def webhook_verify(
    hub_mode: str = Query(None),
    hub_verify_token: str = Query(None),
    hub_challenge: str = Query(None),
):
    return await verify_webhook(hub_mode, hub_verify_token, hub_challenge)


@router.post("")
async def webhook_handler(request: Request) -> Dict:
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON")

    logger.info("Received Facebook webhook")
    for entry in payload.get("entry", []):
        for ev in entry.get("messaging", []):
            await process_facebook_event(ev)
    return {"success": True}


@router.get("/health")
async def webhook_health():
    return {"status": "healthy", "webhook": "facebook", "configured": bool(settings.facebook_webhook_verify_token)}
