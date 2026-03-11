from __future__ import annotations

import logging
from typing import List, Optional
from datetime import datetime

from ..models.conversation import Conversation
from ..models.chatbot_instance import ChatbotInstance
from ..services.email import send_escalation_alert_email
from ..services.slack import send_slack_message
from ..services.whatsapp_service import send_whatsapp_reply  # reuse for notification

logger = logging.getLogger(__name__)


async def check_and_trigger_escalation(
    conversation: Conversation,
    message: str,
    ai_response: str,
    confidence_score: float,
    chatbot_config: ChatbotInstance,
    message_history: List[dict],
    db,  # AsyncSession
) -> bool:
    """
    Checks all escalation conditions and triggers escalation if any are met.
    Returns True if escalation was triggered.
    """
    should_escalate = False
    escalation_reason = None

    # 1. Keyword match
    keywords = chatbot_config.keyword_triggers or []
    message_lower = message.lower()
    matched_keyword = next((k for k in keywords if k.lower() in message_lower), None)
    if matched_keyword:
        should_escalate = True
        escalation_reason = f"keyword: '{matched_keyword}'"

    # 2. Low confidence threshold
    threshold = (chatbot_config.confidence_threshold or 65) / 100
    if confidence_score < threshold:
        unanswered_in_a_row = 0
        for turn in reversed(message_history):
            if turn.get("role") == "assistant" and turn.get("confidence") is not None:
                if turn.get("confidence") < threshold:
                    unanswered_in_a_row += 1
                else:
                    break
        if unanswered_in_a_row >= (chatbot_config.unanswered_threshold or 2):
            should_escalate = True
            escalation_reason = f"low_confidence_{confidence_score:.2f}"

    # 3. Sentiment escalation (placeholder simple detection)
    if chatbot_config.sentiment_escalation_enabled:
        frustration_signals = ["angry", "upset", "frustrated", "hate", "furious"]
        if any(word in message_lower for word in frustration_signals):
            should_escalate = True
            escalation_reason = "sentiment"

    if not should_escalate:
        return False

    # Trigger escalation
    conversation.status = "escalated"
    conversation.escalated_at = datetime.utcnow() if hasattr(conversation, 'escalated_at') else None
    conversation.escalation_reason = escalation_reason
    await db.commit()

    await notify_escalation(conversation, escalation_reason, chatbot_config)
    return True


async def notify_escalation(conversation, reason, chatbot_config):
    """Send escalation notifications via all configured destinations"""
    context = {
        "business_name": conversation.tenant.business_name if conversation.tenant else "",
        "conversation_id": conversation.id,
        "last_message": conversation.messages[-1].content if conversation.messages else "",
        "reason": reason,
    }

    # Email notification
    for email in (chatbot_config.escalation_emails or []):
        try:
            await send_escalation_alert_email(email, context)
        except Exception as e:
            logger.error("Failed to send escalation email to %s: %s", email, e)

    # Slack webhook
    if chatbot_config.escalation_slack_webhook:
        try:
            await send_slack_message(chatbot_config.escalation_slack_webhook, context)
        except Exception as e:
            logger.error("Failed to send escalation slack message: %s", e)

    # WhatsApp notification
    if chatbot_config.escalation_whatsapp_number:
        try:
            # reusing whatsapp reply function for notification
            await send_whatsapp_reply(
                user_id="system",
                thread_id=conversation.session_id,
                body=f"Escalation triggered: {context['last_message']}",
            )
        except Exception as e:
            logger.error("Failed to send escalation whatsapp: %s", e)
