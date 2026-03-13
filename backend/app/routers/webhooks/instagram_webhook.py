"""
Instagram Webhook Handler

Receives inbound Instagram DM messages from Meta's Cloud API.
Implements webhook verification handshake and message processing.

Webhook URL: POST /webhooks/instagram
Verify URL: GET /webhooks/instagram?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
"""

import logging
from typing import Optional

from fastapi import APIRouter, Request, Query, HTTPException, status
from pydantic import BaseModel, Field

from ...config import settings
from ...services import instagram_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/instagram", tags=["webhooks"])


async def verify_webhook(
    hub_mode: Optional[str] = Query(None),
    hub_verify_token: Optional[str] = Query(None),
    hub_challenge: Optional[str] = Query(None)
):
    """
    Meta sends a GET request to verify webhook ownership.
    """
    expected_token = settings.instagram_webhook_verify_token
    
    if not expected_token:
        logger.warning("Instagram webhook verify token not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook verification not configured"
        )
    
    if hub_mode == "subscribe" and hub_verify_token == expected_token:
        logger.info("Instagram webhook verified successfully")
        return hub_challenge
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Webhook verification failed"
    )


async def process_instagram_message(messaging: dict, ig_id: str) -> dict:
    """Process a single Instagram message from webhook payload"""
    
    user_id = messaging.get("sender", {}).get("id")
    recipient_id = messaging.get("recipient", {}).get("id")
    message_id = messaging.get("message", {}).get("mid")
    timestamp = messaging.get("timestamp")
    
    message = messaging.get("message", {})
    msg_type = message.get("type", "text")
    
    content = ""
    media_url = None
    media_type = None
    
    if msg_type == "text":
        content = message.get("text", "")
    elif msg_type == "image":
        media_url = message.get("image", {}).get("url")
        media_type = "image"
        content = "[Image]"
    elif msg_type == "video":
        media_url = message.get("video", {}).get("url")
        media_type = "video"
        content = "[Video]"
    elif msg_type == "audio":
        media_url = message.get("audio", {}).get("url")
        media_type = "audio"
        content = "[Audio]"
    elif msg_type == "story_mention":
        media_url = message.get("story", {}).get("url")
        content = "[Story Mention]"
    elif msg_type == "story_reply":
        content = message.get("story", {}).get("reply", {}).get("text", "")
    elif msg_type == "like":
        content = "[Liked a message]"
    
    try:
        # Build media_urls list if media is present
        media_urls = [media_url] if media_url else None
        
        message_dict = await instagram_service.create_inbound_instagram_message(
            user_id=None,  # Will be resolved from IG account mapping
            sender_id=user_id,
            account_id=ig_id,
            body=content,
            provider_message_id=message_id,
            media_urls=media_urls,
        )
        
        return {
            "message_id": message_id,
            "status": "processed",
            "nexachat_id": message_dict.get("id")
        }
    except Exception as e:
        logger.error(f"Error processing Instagram message: {e}", exc_info=True)
        return {
            "message_id": message_id,
            "status": "error",
            "error": str(e)
        }


async def process_webhook_payload(payload: dict) -> dict:
    """Process incoming Instagram webhook payload"""
    results = []
    
    for entry in payload.get("entry", []):
        ig_id = entry.get("id")
        messaging_events = entry.get("messaging", [])
        
        for event in messaging_events:
            if "message" in event:
                result = await process_instagram_message(event, ig_id)
                results.append(result)
            
            # Handle story mentions (different payload structure)
            elif "standby" in event:
                # Handle standby messages (continuation of conversation)
                logger.debug(f"Instagram standby: {event}")
            
            # Handle reactions
            elif "reaction" in event:
                logger.debug(f"Instagram reaction: {event.get('reaction')}")
    
    return {
        "success": True,
        "messages_processed": len(results),
        "results": results
    }


@router.get("")
async def webhook_verify(
    hub_mode: str = Query(None),
    hub_verify_token: str = Query(None),
    hub_challenge: str = Query(None),
):
    """Handle Instagram webhook verification (GET request)"""
    return await verify_webhook(hub_mode, hub_verify_token, hub_challenge)


@router.post("")
async def webhook_handler(request: Request) -> dict:
    """Handle incoming Instagram messages (POST request)"""
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload"
        )
    
    logger.info(f"Received Instagram webhook")
    
    if "entry" not in payload:
        return {"status": "ignored"}
    
    result = await process_webhook_payload(payload)
    return result


@router.get("/health")
async def webhook_health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "webhook": "instagram",
        "configured": bool(settings.instagram_webhook_verify_token)
    }
