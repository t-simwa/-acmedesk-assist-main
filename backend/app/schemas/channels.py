"""
Pydantic schemas for Channel configuration (9.1).
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class ChannelConfigItem(BaseModel):
    """Configuration status for a single channel."""
    channel: str = Field(..., description="Channel identifier (whatsapp, email, sms, messenger, instagram)")
    enabled: bool = False
    connected: bool = False
    display_name: str = ""
    description: str = ""


class ChannelConfigListResponse(BaseModel):
    channels: List[ChannelConfigItem] = Field(default_factory=list)


class ChannelToggleRequest(BaseModel):
    enabled: bool = Field(..., description="Whether to enable or disable the channel")


class ChannelToggleResponse(BaseModel):
    channel: str
    enabled: bool
    message: str
