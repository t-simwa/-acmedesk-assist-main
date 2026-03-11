from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional

import httpx
import pdfplumber
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ...models.conversation import Conversation
from ...models.chatbot_instance import ChatbotInstance
from ...models.message import Message, MessageRole
from ...models.knowledge_base import KnowledgeBase
from .. import rag
from ...config import get_settings
from ...models.base import get_session_factory

logger = logging.getLogger(__name__)

EMAIL_HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
  <meta charset=\"UTF-8\"> 
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"> 
</head>
<body style=\"margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;\">
  <div style=\"max-width:600px;margin:0 auto;padding:32px 16px;\">  
    {response_html}
    {citations_html}
    <p style=\"margin-top:32px;font-size:12px;color:#9CA3AF;\">Powered by {powered_by_html}</p>
  </div>
</body>
</html>"""


class EmailClassifier:
    personal_domains = {
        "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
        "icloud.com", "protonmail.com", "zoho.com",
    }

    @classmethod
    def is_company_email(cls, email: str) -> bool:
        domain = email.split('@')[-1].lower()
        return domain not in cls.personal_domains

    @classmethod
    def classify(cls, email_data: Dict[str, Any], confidence: float) -> str:
        if cls.is_company_email(email_data.get("from_email", "")):
            if email_data.get("text_body", "").count("?") > 1:
                return "draft"
        keywords = [
            "enterprise", "contract", "sla", "nda", "partnership",
            "pricing for", "annual", "volume", "custom",
        ]
        lower = email_data.get("text_body", "").lower()
        if any(k in lower for k in keywords):
            return "draft"
        if confidence >= 0.85:
            return "auto"
        if 0.60 <= confidence < 0.85:
            return "draft"
        return "escalate"


class EmailProcessor:
    @staticmethod
    async def process_inbound(
        tenant_id: str,
        email_data: Dict[str, Any],
        conversation: Conversation,
        chatbot_config: ChatbotInstance,
        db: AsyncSession,
    ) -> None:
        # 1. auto-acknowledgment
        await EmailProcessor.send_auto_ack(email_data, chatbot_config)

        # 2. attachments
        if email_data.get("attachments"):
            for att in email_data["attachments"]:
                if att.get("content_type") == "application/pdf":
                    try:
                        with pdfplumber.open(att["file_path"]) as pdf:
                            text = "\n".join(p.extract_text() or "" for p in pdf.pages)
                            # store or index temporarily if needed
                    except Exception:
                        logger.exception("pdf parse failed")
        # 3. run RAG
        query = email_data.get("text_body") or ""
        active_kb = await EmailProcessor._get_active_kb_ids(tenant_id)
        answer, sources, confidence_low = await rag.process_chat_query(
            query=query,
            user_id=tenant_id,
            active_kb_ids=active_kb,
            fallback_message=chatbot_config.fallback_message or "",
        )

        # compute confidence score from sources
        highest = max((s.score for s in sources), default=1.0)
        classification = EmailClassifier.classify(email_data, highest)
        if classification == "auto":
            await EmailProcessor.send_email_response(conversation, answer, sources, chatbot_config, db)
        elif classification == "draft":
            await EmailProcessor.create_email_draft(conversation, answer, sources, db)
        else:
            # escalate
            conversation.status = "escalated"
            conversation.escalation_reason = "low_confidence"
            await db.commit()
            # notify owner via existing escalation service

    @staticmethod
    async def send_auto_ack(email_data: Dict[str, Any], chatbot_config: ChatbotInstance) -> None:
        # send a simple acknowledgement using configured email provider
        settings = get_settings()
        to_addr = email_data.get("from_email")
        if not to_addr:
            logger.debug("Skipping auto-ack; missing address")
            return
        subject = chatbot_config.greeting_message or "Thanks for reaching out"
        body = f"<p>Hi,</p><p>Thanks for your email. We'll get back to you soon.</p>"
        try:
            await EmailProcessor.send_email_direct(to_addr, body, subject)
        except Exception as e:
            logger.error("Auto-ack send failed: %s", e)

    @staticmethod
    async def send_email_response(
        conversation: Conversation,
        answer: str,
        sources: List[Any],
        chatbot_config: ChatbotInstance,
        db: AsyncSession,
    ) -> None:
        citations_html = ""
        if sources:
            items = ''.join(f"<li><a href=\"{s.get('url','#')}\">{s.get('title')}</a></li>" for s in sources)
            citations_html = f"<div style=\"background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;\">" \
                             f"<p style=\"color:#64748b;font-size:13px;font-weight:600;margin:0 0 8px;\">Sources used:</p><ul style=\"margin:0;padding-left:20px;color:#475569;font-size:13px;\">{items}</ul></div>"
        body = EMAIL_HTML_TEMPLATE.format(
            response_html=answer,
            citations_html=citations_html,
            powered_by_html="NexaChat",
        )
        # send via sendgrid
        logger.info("Sending AI email to conversation %s", conversation.id)
        try:
            await EmailProcessor.send_email_direct(conversation.contact_email or "", body)
        except Exception as e:
            logger.error("Failed to send AI email: %s", e)
        # update conversation
        conversation.last_message_at = datetime.utcnow()
        await db.commit()
    @staticmethod
    async def send_email_direct(recipient: str, body_html: str, subject: str = "") -> None:
        """Send email via configured provider: SendGrid, Resend, or SMTP.

        Args:
            recipient: destination email address
            body_html: HTML content
            subject: optional subject line
        """
        settings = get_settings()
        provider = settings.email_provider.lower() if settings.email_provider else "sendgrid"

        if provider == "resend" and settings.resend_api_key:
            api_key = settings.resend_api_key
            from_addr = settings.resend_from_email
            if not from_addr:
                logger.warning("Resend from email not configured; skipping %s", recipient)
                return
            payload = {
                "from": {"email": from_addr},
                "to": [{"email": recipient}],
                "subject": subject or settings.sendgrid_default_subject or "",
                "html": body_html,
            }
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            async with httpx.AsyncClient() as client:
                resp = await client.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=10.0)
                resp.raise_for_status()
                logger.info("Resend email sent to %s status=%s", recipient, resp.status_code)
            return

        if provider == "smtp":
            # fallback to SMTP
            import aiosmtplib
            from email.message import EmailMessage
            msg = EmailMessage()
            msg["From"] = settings.smtp_from_email
            msg["To"] = recipient
            msg["Subject"] = subject
            msg.set_content(body_html, subtype="html")
            try:
                await aiosmtplib.send(msg,
                                       hostname=settings.smtp_host,
                                       port=settings.smtp_port,
                                       username=settings.smtp_username,
                                       password=settings.smtp_password,
                                       start_tls=settings.smtp_use_tls)
                logger.info("SMTP email sent to %s", recipient)
            except Exception as e:
                logger.error("SMTP send failed: %s", e)
            return

        # default: SendGrid
        api_key = settings.sendgrid_api_key
        from_addr = settings.sendgrid_from_email
        if not api_key or not from_addr:
            logger.warning("SendGrid not configured; skipping email to %s", recipient)
            return
        if not subject:
            subject = settings.sendgrid_default_subject or ""
        payload = {
            "personalizations": [{"to": [{"email": recipient}]}],
            "from": {"email": from_addr},
            "subject": subject,
            "content": [{"type": "text/html", "value": body_html}],
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                json=payload,
                headers=headers,
                timeout=10.0,
            )
            resp.raise_for_status()
            logger.info("SendGrid email sent to %s status=%s", recipient, resp.status_code)
    @staticmethod
    async def create_email_draft(
        conversation: Conversation,
        answer: str,
        sources: List[Any],
        db: AsyncSession,
    ) -> None:
        draft = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content=answer,
            status="draft",
            created_at=datetime.utcnow(),
        )
        db.add(draft)
        await db.commit()
        # websocket event omitted

    @staticmethod
    async def approve_and_send_draft(
        draft_message_id: str,
        user_id: str,
        db: AsyncSession,
    ) -> None:
        stmt = select(Message).where(Message.id == draft_message_id)
        res = await db.execute(stmt)
        draft = res.scalar_one_or_none()
        if not draft or draft.status != "draft":
            raise ValueError("Draft not found")
        # send email (placeholder)
        draft.status = "sent"
        await db.commit()
        # log approval

    @staticmethod
    async def _get_active_kb_ids(tenant_id: str) -> List[str]:
        session_factory = get_session_factory()
        async with session_factory() as session:
            result = await session.execute(
                select(KnowledgeBase.id).where(
                    KnowledgeBase.tenant_id == tenant_id,
                    KnowledgeBase.is_active == True,
                )
            )
            return result.scalars().all()
