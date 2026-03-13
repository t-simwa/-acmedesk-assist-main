"""
SMS Webhook Handler

Receives inbound SMS messages from SMS providers (Twilio, Africa's Talking).
Implements standardized webhook processing for different providers.

Webhook URL: POST /webhooks/sms
"""

import logging
from typing import Optional
from fastapi import APIRouter, Request, Query, HTTPException, Header, Depends, status
from pydantic import BaseModel, Field

from ...config import settings
from ...services import sms_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/sms", tags=["webhooks"])

# SMS opt-out keywords (TCPA/CTIA compliance)
OPT_OUT_KEYWORDS = {"stop", "unsubscribe", "cancel", "end", "quit"}
HELP_KEYWORDS = {"help", "info"}
OPT_IN_KEYWORDS = {"start", "yes", "unstop"}


async def _handle_keyword_message(from_number: str, body: str, provider: str) -> dict | None:
    """
    Handle STOP/HELP/START keyword messages per TCPA/CTIA compliance.
    Returns a dict with action taken, or None if not a keyword message.
    """
    body_lower = body.strip().lower()
    
    # Check for opt-out
    if body_lower in OPT_OUT_KEYWORDS:
        logger.info(f"SMS opt-out received from {from_number}: {body}")
        await sms_service.set_opt_out_status(from_number, opted_out=True)
        return {
            "action": "opt_out",
            "from_number": from_number,
            "response": "You have been unsubscribed and will no longer receive messages."
        }
    
    # Check for help request
    if body_lower in HELP_KEYWORDS:
        logger.info(f"SMS help request from {from_number}: {body}")
        return {
            "action": "help",
            "from_number": from_number,
            "response": "Reply STOP to unsubscribe. Msg&Data rates may apply. Contact support@example.com for help."
        }
    
    # Check for opt-in (re-subscribe)
    if body_lower in OPT_IN_KEYWORDS:
        logger.info(f"SMS opt-in received from {from_number}: {body}")
        await sms_service.set_opt_out_status(from_number, opted_out=False)
        return {
            "action": "opt_in",
            "from_number": from_number,
            "response": "You have been re-subscribed and will receive messages again."
        }
    
    return None


class TwilioWebhook(BaseModel):
    """Twilio incoming SMS webhook format"""
    MessageSid: str
    AccountSid: str
    From: str
    To: str
    Body: str
    NumMedia: int = 0


class AfricaTalkingWebhook(BaseModel):
    """Africa's Talking incoming SMS webhook format"""
    from_: str = Field(..., alias="from")
    to: str
    text: str
    date: str
    id: str
    linkId: Optional[str] = None
    
    class Config:
        populate_by_name = True


async def process_twilio_sms(from_number: str, to_number: str, body: str, message_sid: str) -> dict:
    """Process incoming SMS from Twilio"""
    
    try:
        # Check for STOP/HELP/START keywords first (TCPA/CTIA compliance)
        keyword_result = await _handle_keyword_message(from_number, body, "twilio")
        if keyword_result is not None:
            return {
                "message_id": message_sid,
                "status": "keyword_handled",
                **keyword_result
            }
        
        # Check if sender has opted out
        if await sms_service.is_opted_out(from_number):
            logger.info(f"Ignoring message from opted-out number: {from_number}")
            return {
                "message_id": message_sid,
                "status": "ignored",
                "reason": "sender_opted_out"
            }
        
        message_dict = await sms_service.create_inbound_sms_message(
            user_id=None,  # Will be resolved from phone number mapping
            from_number=from_number,
            to_number=to_number,
            body=body,
            provider_message_id=message_sid,
        )
        
        return {
            "message_id": message_sid,
            "status": "processed",
            "nexachat_id": message_dict.get("id")
        }
    except Exception as e:
        logger.error(f"Error processing Twilio SMS: {e}", exc_info=True)
        return {
            "message_id": message_sid,
            "status": "error",
            "error": str(e)
        }


async def process_africas_talking_sms(from_number: str, to_number: str, body: str, message_id: str, link_id: Optional[str] = None) -> dict:
    """Process incoming SMS from Africa's Talking"""
    
    try:
        # Check for STOP/HELP/START keywords first (TCPA/CTIA compliance)
        keyword_result = await _handle_keyword_message(from_number, body, "africas_talking")
        if keyword_result is not None:
            return {
                "message_id": message_id,
                "status": "keyword_handled",
                **keyword_result
            }
        
        # Check if sender has opted out
        if await sms_service.is_opted_out(from_number):
            logger.info(f"Ignoring message from opted-out number: {from_number}")
            return {
                "message_id": message_id,
                "status": "ignored",
                "reason": "sender_opted_out"
            }
        
        message_dict = await sms_service.create_inbound_sms_message(
            user_id=None,
            from_number=from_number,
            to_number=to_number,
            body=body,
            provider_message_id=message_id,
        )
        
        return {
            "message_id": message_id,
            "status": "processed",
            "nexachat_id": message_dict.get("id")
        }
    except Exception as e:
        logger.error(f"Error processing Africa's Talking SMS: {e}", exc_info=True)
        return {
            "message_id": message_id,
            "status": "error",
            "error": str(e)
        }


@router.post("/twilio")
async def twilio_webhook(
    request: Request,
    x_twilio_signature: Optional[str] = Header(None)
) -> dict:
    """
    Handle incoming SMS from Twilio.
    
    Twilio sends POST with form-encoded body:
    - MessageSid
    - AccountSid  
    - From
    - To
    - Body
    - NumMedia
    """
    try:
        form_data = await request.form()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid form data"
        )
    
    # Verify request is from Twilio (in production, verify signature)
    account_sid = form_data.get("AccountSid")
    
    # Log for debugging
    logger.info(f"Received Twilio SMS from {form_data.get('From')} to {form_data.get('To')}")
    
    # Validate it's for our account
    if settings.twilio_account_sid and account_sid != settings.twilio_account_sid:
        logger.warning(f"Twilio account SID mismatch: {account_sid}")
        # In production, return 403
    
    message_sid = form_data.get("MessageSid")
    from_number = form_data.get("From")
    to_number = form_data.get("To")
    body = form_data.get("Body", "")
    
    result = await process_twilio_sms(from_number, to_number, body, message_sid)
    
    # Twilio expects empty 200 response
    return {"success": True, "message": "OK"}


@router.post("/africas-talking")
async def africa_talking_webhook(request: Request) -> dict:
    """
    Handle incoming SMS from Africa's Talking.
    
    Africa's Talking sends JSON POST with:
    - from
    - to
    - text
    - date
    - id
    - linkId (optional)
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload"
        )
    
    logger.info(f"Received Africa's Talking SMS from {payload.get('from')}")
    
    from_number = payload.get("from")
    to_number = payload.get("to")
    body = payload.get("text", "")
    message_id = payload.get("id")
    link_id = payload.get("linkId")
    
    result = await process_africas_talking_sms(
        from_number, to_number, body, message_id, link_id
    )
    
    # Africa's Talking expects {"status": "Success"}
    return {"status": "Success"}


@router.post("")
async def sms_webhook_generic(request: Request) -> dict:
    """
    Generic SMS webhook - auto-detects provider based on payload format.
    """
    content_type = request.headers.get("content-type", "")
    
    if "application/json" in content_type:
        try:
            payload = await request.json()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON"
            )
        
        # Check for Africa's Talking format
        if "from" in payload and "text" in payload:
            return await africa_talking_webhook(request)
        
    elif "application/x-www-form-urlencoded" in content_type:
        return await twilio_webhook(request)
    
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unsupported content type"
    )


@router.get("/health")
async def webhook_health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "webhook": "sms",
        "providers": ["twilio", "africas_talking"]
    }
