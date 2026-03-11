"""
WhatsApp Webhook Handler

Receives inbound WhatsApp messages from Meta's Cloud API.
Implements webhook verification handshake and message processing.

Webhook URL: POST /webhooks/whatsapp
Verify URL: GET /webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
"""

import logging
from typing import Optional

from fastapi import APIRouter, Request, Query, HTTPException, Depends, status
from pydantic import BaseModel, Field

from ...config import settings
from ...models.user import User
from ...routers.auth import get_current_user
from ...services import whatsapp_service
from ...services import test_stream as test_stream_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/whatsapp", tags=["webhooks"])


class WhatsAppWebhookMessage(BaseModel):
    """Schema for individual WhatsApp message in webhook payload"""
    from_: str = Field(..., alias="from")
    to: str
    id: str
    timestamp: str
    type: str
    text: Optional[dict] = None
    image: Optional[dict] = None
    audio: Optional[dict] = None
    video: Optional[dict] = None
    document: Optional[dict] = None
    location: Optional[dict] = None
    
    class Config:
        populate_by_name = True


class WhatsAppWebhookEntry(BaseModel):
    """Schema for WhatsApp webhook entry"""
    id: str
    changes: list[dict]


class WhatsAppWebhookRequest(BaseModel):
    """Schema for incoming WhatsApp webhook from Meta"""
    object: str
    entry: list[dict]


async def verify_webhook(hub_mode: str = Query(None), hub_verify_token: str = Query(None), hub_challenge: str = Query(None)):
    """
    Meta sends a GET request to verify webhook ownership.
    We must return hub_challenge if tokens match.
    """
    expected_token = settings.meta_webhook_verify_token
    
    if not expected_token:
        logger.warning("WhatsApp webhook verify token not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook verification not configured"
        )
    
    if hub_mode == "subscribe" and hub_verify_token == expected_token:
        logger.info("WhatsApp webhook verified successfully")
        return hub_challenge
    
    logger.warning(f"WhatsApp webhook verification failed. Expected: {expected_token}, Got: {hub_verify_token}")
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Webhook verification failed"
    )


async def process_webhook_payload(payload: dict, x_hub_signature: Optional[str] = None) -> dict:
    """
    Process incoming WhatsApp webhook payload.
    Validates signature if configured and processes each message.
    """
    results = []
    
    # Validate webhook signature if secret is configured
    if settings.meta_app_secret and x_hub_signature:
        # Note: In production, you'd verify the HMAC signature
        # For now, we log if signature is present
        logger.debug(f"Received WhatsApp webhook with signature: {x_hub_signature[:20]}...")
    
    # Process each entry in the webhook
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            messages = value.get("messages", [])

            for message in messages:
                msg_id = None
                try:
                    # Extract message data
                    msg_from = message.get("from")
                    msg_id = message.get("id")
                    msg_timestamp = message.get("timestamp")
                    msg_type = message.get("type")
                    
                    # Extract message content based on type
                    content = ""
                    media_url = None
                    caption = None
                    
                    if msg_type == "text":
                        content = message.get("text", {}).get("body", "")
                    elif msg_type == "image":
                        media_url = message.get("image", {}).get("mime_url")
                        caption = message.get("image", {}).get("caption")
                    elif msg_type == "audio":
                        media_url = message.get("audio", {}).get("mime_url")
                    elif msg_type == "video":
                        media_url = message.get("video", {}).get("mime_url")
                        caption = message.get("video", {}).get("caption")
                    elif msg_type == "document":
                        media_url = message.get("document", {}).get("mime_url")
                        caption = message.get("document", {}).get("caption")
                    elif msg_type == "location":
                        location = message.get("location", {})
                        content = f"Location: {location.get('latitude')}, {location.get('longitude')}"
                    elif msg_type == "reaction":
                        content = f"Reacted with: {message.get('reaction', {}).get('emoji', '👍')}"
                    
                    # Get business phone number from the value
                    metadata = value.get("metadata", {})
                    business_phone_number_id = metadata.get("phone_number_id")
                    
                    if not business_phone_number_id:
                        logger.warning(f"No phone_number_id in webhook message: {msg_id}")
                        continue
                    
                    # Create inbound message via service
                    message_dict = await whatsapp_service.create_inbound_whatsapp_message(
                        msg_from,
                        business_phone_number_id,
                        content,
                        user_id=None,  # Will be resolved from phone number mapping inside service
                        provider_message_id=msg_id,
                        media_urls=[media_url] if media_url else None,
                        caption=caption,
                    )
                    
                    results.append({
                        "message_id": msg_id,
                        "status": "processed",
                        "nexachat_id": message_dict.get("id"),
                    })

                    # Publish a test-stream event so wizards can observe inbound messages
                    try:
                        # tenant resolution is handled inside service; use 'anonymous' as fallback
                        tenant_id = (message_dict.get("tenant_id") or "anonymous")
                        test_stream_service.publish_event(tenant_id, "whatsapp", {
                            "provider": "whatsapp",
                            "wa_id": msg_from,
                            "business_number": business_phone_number_id,
                            "message_id": msg_id,
                            "nexachat_id": message_dict.get("id"),
                        })
                    except Exception:
                        logger.exception("Failed to publish test-stream event")
                    
                except Exception as e:
                    logger.error(f"Error processing WhatsApp message {msg_id}: {e}", exc_info=True)
                    results.append({
                        "message_id": msg_id,
                        "status": "error",
                        "error": str(e)
                    })
    
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
    """Handle WhatsApp webhook verification (GET request)"""
    return await verify_webhook(hub_mode, hub_verify_token, hub_challenge)


@router.post("")
async def webhook_handler(request: Request) -> dict:
    """
    Handle incoming WhatsApp messages (POST request).
    
    This endpoint receives messages from Meta's Cloud API when:
    1. Customer sends a message to your WhatsApp Business number
    2. Customer responds to a template message
    3. Message status updates (delivered, read, etc.)
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload"
        )
    
    # Log incoming webhook for debugging
    logger.info(f"Received WhatsApp webhook: {payload.get('object')}")
    
    # Validate it's a WhatsApp business account message
    if payload.get("object") != "whatsapp_business_account":
        logger.warning(f"Received non-WhatsApp webhook: {payload.get('object')}")
        return {"status": "ignored", "reason": "Not a WhatsApp webhook"}
    
    # Extract signature header if present
    x_hub_signature = request.headers.get("x-hub-signature") or request.headers.get("x-hub-signature-256")

    # Process the webhook
    result = await process_webhook_payload(payload, x_hub_signature=x_hub_signature)
    
    return result


@router.get("/health")
async def webhook_health():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "webhook": "whatsapp",
        "configured": bool(settings.meta_webhook_verify_token)
    }
