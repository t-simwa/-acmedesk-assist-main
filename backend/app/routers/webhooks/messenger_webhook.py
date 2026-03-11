"""
Messenger Webhook Handler

Receives inbound Messenger messages from Meta's Cloud API.
Implements webhook verification handshake and message processing.

Webhook URL: POST /webhooks/messenger
Verify URL: GET /webhooks/messenger?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
"""

import logging
from typing import Optional

from fastapi import APIRouter, Request, Query, HTTPException, Depends, status
from pydantic import BaseModel, Field

from ...config import settings
from ...services import messenger_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/messenger", tags=["webhooks"])


async def verify_webhook(
    hub_mode: Optional[str] = Query(None),
    hub_verify_token: Optional[str] = Query(None),
    hub_challenge: Optional[str] = Query(None)
):
    """
    Meta sends a GET request to verify webhook ownership.
    We must return hub_challenge if tokens match.
    """
    expected_token = settings.messenger_webhook_verify_token
    
    if not expected_token:
        logger.warning("Messenger webhook verify token not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook verification not configured"
        )
    
    if hub_mode == "subscribe" and hub_verify_token == expected_token:
        logger.info("Messenger webhook verified successfully")
        return hub_challenge
    
    logger.warning(f"Messenger webhook verification failed")
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Webhook verification failed"
    )


async def process_messenger_message(messaging: dict, page_id: str) -> dict:
    """Process a single Messenger message from webhook payload"""
    
    sender_id = messaging.get("sender", {}).get("id")
    recipient_id = messaging.get("recipient", {}).get("id")
    message_id = messaging.get("message", {}).get("mid")
    timestamp = messaging.get("timestamp")
    
    message = messaging.get("message", {})
    msg_type = message.get("type", "text")
    
    # Extract message content
    content = ""
    media_url = None
    attachments = []
    
    if msg_type == "text":
        content = message.get("text", "")
    elif msg_type == "attachment":
        attachment = message.get("attachment", {})
        att_type = attachment.get("type")
        payload = attachment.get("payload", {})
        
        if att_type == "image":
            media_url = payload.get("url")
            content = "[Image]"
        elif att_type == "video":
            media_url = payload.get("url")
            content = "[Video]"
        elif att_type == "audio":
            media_url = payload.get("url")
            content = "[Audio]"
        elif att_type == "file":
            media_url = payload.get("url")
            title = payload.get("title", "File")
            content = f"[File: {title}]"
        elif att_type == "location":
            coords = payload.get("coordinates", {})
            content = f"Location: {coords.get('lat')}, {coords.get('long')}"
    elif msg_type == "quick_reply":
        content = message.get("quick_reply", {}).get("payload", "")
    elif msg_type == "postback":
        content = message.get("postback", {}).get("title", "")
    
    # Get user ID from sender (would need to map page-scoped ID to user)
    # For now, use sender_id as the identifier
    
    try:
        message_dict = await messenger_service.create_inbound_messenger_message(
            user_id=None,  # Will be resolved from page mapping
            psid=sender_id,
            page_id=page_id,
            message_content=content,
            provider_message_id=message_id,
            timestamp=timestamp,
            attachments=[media_url] if media_url else [],
        )
        
        return {
            "message_id": message_id,
            "status": "processed",
            "nexachat_id": message_dict.get("id")
        }
    except Exception as e:
        logger.error(f"Error processing Messenger message: {e}", exc_info=True)
        return {
            "message_id": message_id,
            "status": "error",
            "error": str(e)
        }


async def process_webhook_payload(payload: dict) -> dict:
    """Process incoming Messenger webhook payload"""
    results = []
    
    for entry in payload.get("entry", []):
        page_id = entry.get("id")
        messaging_events = entry.get("messaging", [])
        
        for event in messaging_events:
            # Handle messages
            if "message" in event:
                result = await process_messenger_message(event, page_id)
                results.append(result)
            
            # Handle postbacks (button clicks)
            elif "postback" in event:
                postback = event.get("postback", {})
                payload_msg = {
                    "sender": event.get("sender"),
                    "recipient": event.get("recipient"),
                    "message": {
                        "mid": event.get("timestamp"),
                        "type": "postback",
                        "text": postback.get("title", ""),
                        "postback": {
                            "payload": postback.get("payload")
                        }
                    }
                }
                result = await process_messenger_message(payload_msg, page_id)
                results.append(result)
            
            # Handle optins (plugin engaging)
            elif "optin" in event:
                logger.info(f"Messenger optin: {event.get('optin')}")
            
            # Handle delivery receipts
            elif "delivery" in event:
                logger.debug(f"Messenger delivery: {event.get('delivery')}")
            
            # Handle read receipts
            elif "read" in event:
                logger.debug(f"Messenger read: {event.get('read')}")
    
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
    """Handle Messenger webhook verification (GET request)"""
    return await verify_webhook(hub_mode, hub_verify_token, hub_challenge)


@router.post("")
async def webhook_handler(request: Request) -> dict:
    """
    Handle incoming Messenger messages (POST request).
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload"
        )
    
    logger.info(f"Received Messenger webhook")
    
    # Validate it's a page webhook
    if "entry" not in payload:
        logger.warning(f"Received invalid Messenger webhook")
        return {"status": "ignored"}
    
    result = await process_webhook_payload(payload)
    return result


@router.get("/health")
async def webhook_health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "webhook": "messenger",
        "configured": bool(settings.messenger_webhook_verify_token)
    }
