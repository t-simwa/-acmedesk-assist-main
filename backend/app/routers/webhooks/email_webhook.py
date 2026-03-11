"""
Email Webhook Handler
Receives inbound emails from SendGrid Inbound Parse (multipart/form-data) and
passes them to the email processing service.

Webhook URL: POST /webhooks/email
"""

import logging
import email
import tempfile
import uuid
from typing import List

from fastapi import APIRouter, Request, HTTPException, status
from fastapi.datastructures import UploadFile

from ...config import settings
from ...services.channel_adapters.email_service import EmailProcessor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks/email", tags=["webhooks"])


@router.post("")
async def email_webhook(request: Request):
    # SendGrid posts multipart/form-data with keys: subject, from, text, html, etc.
    form = await request.form()
    # verify secret if configured
    if settings.sendgrid_inbound_parse_secret:
        token = form.get("secret")
        if token != settings.sendgrid_inbound_parse_secret:
            logger.warning("Bad SendGrid parse secret")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token")

    # Build email_data dict
    email_data = {
        "from_email": form.get("from"),
        "from_name": form.get("fromname"),
        "to": form.get("to"),
        "subject": form.get("subject"),
        "text_body": form.get("text"),
        "html_body": form.get("html"),
        "headers": form.get("headers"),
        "attachments": [],
    }

    # handle attachments
    files: List[UploadFile] = []
    for key in form:
        if key.startswith("attachment"):
            files.append(form[key])
    for f in files:
        # save to temp file
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            content = await f.read()
            tmp.write(content)
            email_data["attachments"].append({
                "filename": f.filename,
                "content_type": f.content_type,
                "file_path": tmp.name,
            })

    # create or fetch conversation (simplified)
    # For now we just create a dummy conversation object for the processor to use
    from ...models.conversation import Conversation
    conv = Conversation(id="", tenant_id="", session_id="", started_at=None, last_activity_at=None)
    from ...models.chatbot_instance import ChatbotInstance
    cb = ChatbotInstance()
    
    # process inbound email
    from ...models.base import get_db_session
    from ...models.conversation import Conversation, ConversationStatus
    from datetime import datetime

    async with get_db_session() as db:
        conv = Conversation(
            id=str(uuid.uuid4()),
            tenant_id=settings.default_tenant_id or "",
            session_id=str(uuid.uuid4()),
            status=ConversationStatus.ACTIVE,
            started_at=datetime.utcnow(),
            last_activity_at=datetime.utcnow(),
        )
        db.add(conv)
        await db.commit()
        await EmailProcessor.process_inbound(settings.default_tenant_id or "", email_data, conv, cb, db)

    return {"status": "processed"}
