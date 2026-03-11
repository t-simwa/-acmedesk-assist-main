import logging
import httpx

logger = logging.getLogger(__name__)

async def send_slack_message(webhook_url: str, context: dict) -> None:
    """Send a notification to a Slack incoming webhook.

    Args:
        webhook_url: Full Slack webhook URL.
        context: A dict with message context, e.g. conversation_id, last_message, etc.
    """
    try:
        text = (
            f"*Escalation triggered* for {context.get('business_name')}\n"
            f"Conversation: {context.get('conversation_id')}\n"
            f"Last message: {context.get('last_message')}\n"
            f"Reason: {context.get('reason')}"
        )
        payload = {"text": text}
        async with httpx.AsyncClient() as client:
            resp = await client.post(webhook_url, json=payload, timeout=10.0)
            resp.raise_for_status()
    except Exception as e:
        logger.error("Error sending Slack message: %s", e, exc_info=True)
        # swallow exceptions; escalation should not crash
