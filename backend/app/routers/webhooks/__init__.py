"""
Webhook routers for receiving inbound messages from channel providers.

All webhooks follow this pattern:
- GET /webhooks/{channel} - Webhook verification (Meta)
- POST /webhooks/{channel} - Message receive
"""

from .whatsapp_webhook import router as whatsapp_router
from .messenger_webhook import router as messenger_router
from .instagram_webhook import router as instagram_router
from .sms_webhook import router as sms_router

__all__ = [
    "whatsapp_router",
    "messenger_router", 
    "instagram_router",
    "sms_router",
]
