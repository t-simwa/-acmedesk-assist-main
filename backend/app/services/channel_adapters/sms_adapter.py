from __future__ import annotations

import logging
import re
from typing import Optional

import httpx
from twilio.rest import Client as TwilioClient
from twilio.request_validator import RequestValidator

from ...config import get_settings
from ...models.contact import Contact
from ...models.conversation import Conversation
from ...models.message import Message, MessageRole
from ..contact_unification import check_opt_out

logger = logging.getLogger(__name__)


class SMSAdapter:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.settings = get_settings()
        # load provider config from DB or settings
        self.provider = self.settings.sms_provider  # 'twilio' or 'africastalking'
        self.twilio_client = None
        if self.provider == 'twilio':
            self.twilio_client = TwilioClient(self.settings.twilio_sid, self.settings.twilio_auth_token)
        self.at_client = None  # could be httpx client for africastalking

    async def send_sms(self, to_number: str, body: str) -> None:
        if await check_opt_out(to_number, 'sms', self.tenant_id, db=None):
            logger.info("Number %s opted out of SMS; not sending", to_number)
            return
        if self.provider == 'twilio':
            self.twilio_client.messages.create(
                body=body,
                from_=self.settings.twilio_from_number,
                to=to_number
            )
        elif self.provider == 'africastalking':
            # simplistic example
            async with httpx.AsyncClient() as client:
                await client.post("https://api.africastalking.com/version1/messaging", json={
                    "username": self.settings.at_username,
                    "to": to_number,
                    "message": body,
                }, headers={"apiKey": self.settings.at_api_key})

    def validate_twilio_signature(self, url: str, params: dict, signature: str) -> bool:
        validator = RequestValidator(self.settings.twilio_auth_token)
        return validator.validate(url, params, signature)


# convenience functions for use in routers
async def send_sms(to_number: str, body: str) -> None:
    adapter = SMSAdapter(tenant_id="")
    await adapter.send_sms(to_number, body)
