"""
SMS Provider Adapters.

Provides unified interface for sending SMS via different providers:
- Twilio
- Africa's Talking
- Vonage (future)
"""

import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from datetime import datetime

import httpx
from sqlalchemy import select

from ..models.base import get_db_session
from ..models.channel_config import ChannelConfig
from ..services.crypto import encrypt, decrypt
import json

logger = logging.getLogger(__name__)


class SMSProviderAdapter(ABC):
    """Abstract base class for SMS provider adapters."""

    @abstractmethod
    async def send_sms(self, to: str, body: str, from_number: Optional[str] = None) -> dict:
        """Send an SMS message."""
        pass

    @abstractmethod
    async def verify_credentials(self) -> dict:
        """Verify provider credentials are valid."""
        pass

    @abstractmethod
    async def get_account_info(self) -> dict:
        """Get account information (balance, phone numbers, etc.)."""
        pass


class TwilioAdapter(SMSProviderAdapter):
    """Twilio SMS provider adapter."""

    def __init__(self, account_sid: str, auth_token: str, from_number: Optional[str] = None):
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.from_number = from_number
        self.base_url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}"

    async def send_sms(self, to: str, body: str, from_number: Optional[str] = None) -> dict:
        """Send SMS via Twilio."""
        sender = from_number or self.from_number
        if not sender:
            raise ValueError("No from number configured")

        url = f"{self.base_url}/Messages.json"

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                url,
                auth=(self.account_sid, self.auth_token),
                data={
                    "To": to,
                    "From": sender,
                    "Body": body,
                },
            )

            if resp.status_code not in (200, 201):
                error_data = resp.json()
                error_msg = error_data.get("message", "Unknown error")
                logger.error(f"Twilio send failed: {error_msg}")
                raise ValueError(f"Twilio error: {error_msg}")

            result = resp.json()
            return {
                "success": True,
                "provider": "twilio",
                "message_id": result.get("sid"),
                "status": result.get("status"),
                "to": to,
                "from": sender,
                "sent_at": datetime.utcnow().isoformat() + "Z",
            }

    async def verify_credentials(self) -> dict:
        """Verify Twilio credentials."""
        url = f"{self.base_url}.json"

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, auth=(self.account_sid, self.auth_token))

            if resp.status_code == 200:
                data = resp.json()
                return {
                    "verified": True,
                    "provider": "twilio",
                    "account_name": data.get("friendly_name"),
                    "account_status": data.get("status"),
                }
            else:
                return {
                    "verified": False,
                    "provider": "twilio",
                    "error": "Invalid credentials",
                }

    async def get_account_info(self) -> dict:
        """Get Twilio account info."""
        url = f"{self.base_url}.json"

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, auth=(self.account_sid, self.auth_token))

            if resp.status_code == 200:
                data = resp.json()
                return {
                    "provider": "twilio",
                    "account_sid": self.account_sid,
                    "friendly_name": data.get("friendly_name"),
                    "status": data.get("status"),
                    "type": data.get("type"),
                }
            else:
                raise ValueError("Failed to fetch account info")


class AfricasTalkingAdapter(SMSProviderAdapter):
    """Africa's Talking SMS provider adapter."""

    def __init__(
        self,
        username: str,
        api_key: str,
        sender_id: Optional[str] = None,
        shortcode: Optional[str] = None,
        sandbox: bool = False,
    ):
        self.username = username
        self.api_key = api_key
        self.sender_id = sender_id
        self.shortcode = shortcode
        self.sandbox = sandbox

        if sandbox:
            self.base_url = "https://api.sandbox.africastalking.com/version1"
        else:
            self.base_url = "https://api.africastalking.com/version1"

    async def send_sms(self, to: str, body: str, from_number: Optional[str] = None) -> dict:
        """Send SMS via Africa's Talking."""
        sender = from_number or self.shortcode or self.sender_id

        url = f"{self.base_url}/messaging"
        headers = {
            "ApiKey": self.api_key,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        }

        data = {
            "username": self.username,
            "to": to,
            "message": body,
        }

        if sender:
            data["from"] = sender

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, headers=headers, data=data)

            if resp.status_code not in (200, 201):
                logger.error(f"Africa's Talking send failed: {resp.text}")
                raise ValueError(f"Africa's Talking error: {resp.text}")

            result = resp.json()
            sms_data = result.get("SMSMessageData", {})
            recipients = sms_data.get("Recipients", [])

            if recipients:
                recipient = recipients[0]
                return {
                    "success": True,
                    "provider": "africas_talking",
                    "message_id": recipient.get("messageId"),
                    "status": recipient.get("status"),
                    "status_code": recipient.get("statusCode"),
                    "cost": recipient.get("cost"),
                    "to": to,
                    "from": sender,
                    "sent_at": datetime.utcnow().isoformat() + "Z",
                }
            else:
                return {
                    "success": False,
                    "provider": "africas_talking",
                    "error": sms_data.get("Message", "No recipients"),
                }

    async def verify_credentials(self) -> dict:
        """Verify Africa's Talking credentials."""
        url = f"{self.base_url}/user?username={self.username}"
        headers = {"ApiKey": self.api_key, "Accept": "application/json"}

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=headers)

            if resp.status_code == 200:
                data = resp.json()
                user_data = data.get("UserData", {})
                return {
                    "verified": True,
                    "provider": "africas_talking",
                    "username": self.username,
                    "balance": user_data.get("balance"),
                }
            else:
                return {
                    "verified": False,
                    "provider": "africas_talking",
                    "error": "Invalid credentials",
                }

    async def get_account_info(self) -> dict:
        """Get Africa's Talking account info."""
        url = f"{self.base_url}/user?username={self.username}"
        headers = {"ApiKey": self.api_key, "Accept": "application/json"}

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=headers)

            if resp.status_code == 200:
                data = resp.json()
                user_data = data.get("UserData", {})
                return {
                    "provider": "africas_talking",
                    "username": self.username,
                    "balance": user_data.get("balance"),
                }
            else:
                raise ValueError("Failed to fetch account info")


# =============================================================================
# FACTORY FUNCTION
# =============================================================================

async def get_sms_adapter(tenant_id: str) -> SMSProviderAdapter:
    """
    Get the SMS adapter for a tenant based on their configured provider.
    
    Args:
        tenant_id: Tenant UUID
    
    Returns:
        SMSProviderAdapter instance configured for the tenant
    
    Raises:
        ValueError if SMS not configured for tenant
    """
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == tenant_id,
            ChannelConfig.channel == "sms",
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if not cfg or not cfg.config:
            raise ValueError("SMS not configured for this tenant")

        credentials = cfg.config.get("credentials", {})
        provider = credentials.get("provider")

        if not provider:
            raise ValueError("No SMS provider configured")

        if provider == "twilio":
            return TwilioAdapter(
                account_sid=credentials.get("account_sid"),
                auth_token=credentials.get("auth_token"),
                from_number=credentials.get("twilio_phone_number"),
            )
        elif provider == "africas_talking":
            return AfricasTalkingAdapter(
                username=credentials.get("at_username"),
                api_key=credentials.get("at_api_key"),
                sender_id=credentials.get("at_sender_id"),
                shortcode=credentials.get("at_shortcode"),
            )
        else:
            raise ValueError(f"Unknown SMS provider: {provider}")


async def send_sms(
    tenant_id: str,
    to: str,
    body: str,
    from_number: Optional[str] = None,
) -> dict:
    """
    Send an SMS message using the tenant's configured provider.
    
    Args:
        tenant_id: Tenant UUID
        to: Recipient phone number
        body: Message body
        from_number: Optional sender number (uses default if not provided)
    
    Returns:
        dict with send result
    """
    adapter = await get_sms_adapter(tenant_id)
    return await adapter.send_sms(to, body, from_number)


async def verify_sms_credentials(tenant_id: str) -> dict:
    """Verify SMS credentials for a tenant."""
    adapter = await get_sms_adapter(tenant_id)
    return await adapter.verify_credentials()


# =============================================================================
# OPT-OUT LIST MANAGEMENT
# =============================================================================

async def add_to_opt_out_list(tenant_id: str, phone_number: str, reason: str = "STOP") -> dict:
    """Add a phone number to the opt-out list."""
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == tenant_id,
            ChannelConfig.channel == "sms",
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if not cfg:
            raise ValueError("SMS not configured")

        config = cfg.config or {}
        opt_outs = config.get("opt_out_list", [])

        # Check if already opted out
        if any(o.get("phone_number") == phone_number for o in opt_outs):
            return {"message": "Already opted out", "phone_number": phone_number}

        opt_outs.append({
            "phone_number": phone_number,
            "opted_out_at": datetime.utcnow().isoformat() + "Z",
            "reason": reason,
        })

        config["opt_out_list"] = opt_outs
        cfg.config = config
        await session.commit()

        logger.info(f"Added {phone_number} to opt-out list for tenant {tenant_id}")
        return {"message": "Opted out successfully", "phone_number": phone_number}


async def remove_from_opt_out_list(tenant_id: str, phone_number: str) -> dict:
    """Remove a phone number from the opt-out list (re-subscribe)."""
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == tenant_id,
            ChannelConfig.channel == "sms",
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if not cfg:
            raise ValueError("SMS not configured")

        config = cfg.config or {}
        opt_outs = config.get("opt_out_list", [])

        config["opt_out_list"] = [o for o in opt_outs if o.get("phone_number") != phone_number]
        cfg.config = config
        await session.commit()

        logger.info(f"Removed {phone_number} from opt-out list for tenant {tenant_id}")
        return {"message": "Opted back in", "phone_number": phone_number}


async def is_opted_out(tenant_id: str, phone_number: str) -> bool:
    """Check if a phone number is opted out."""
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == tenant_id,
            ChannelConfig.channel == "sms",
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if not cfg or not cfg.config:
            return False

        opt_outs = cfg.config.get("opt_out_list", [])
        return any(o.get("phone_number") == phone_number for o in opt_outs)


async def get_opt_out_list(tenant_id: str) -> List[dict]:
    """Get the full opt-out list for a tenant."""
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(
            ChannelConfig.tenant_id == tenant_id,
            ChannelConfig.channel == "sms",
        )
        result = await session.execute(stmt)
        cfg = result.scalar_one_or_none()

        if not cfg or not cfg.config:
            return []

        return cfg.config.get("opt_out_list", [])
