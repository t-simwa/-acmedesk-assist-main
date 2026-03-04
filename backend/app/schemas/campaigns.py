"""
Pydantic schemas for Campaigns CRUD (9.9).
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class CampaignItem(BaseModel):
    id: str
    tenant_id: str
    name: str
    channel: str
    status: str
    audience_filter: Optional[dict] = None
    message_template: Optional[str] = None
    scheduled_at: Optional[str] = None
    sent_at: Optional[str] = None
    sent_count: int = 0
    delivered_count: int = 0
    read_count: int = 0
    reply_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CampaignListResponse(BaseModel):
    campaigns: List[CampaignItem] = Field(default_factory=list)
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    per_page: int = Field(..., ge=1)


class CampaignCreateRequest(BaseModel):
    name: str = Field(..., min_length=1)
    channel: str = Field(..., description="whatsapp | instagram | facebook | email | sms")
    message_template: Optional[str] = None
    audience_filter: Optional[dict] = None
    scheduled_at: Optional[str] = None


class CampaignUpdateRequest(BaseModel):
    name: Optional[str] = None
    channel: Optional[str] = None
    status: Optional[str] = None
    message_template: Optional[str] = None
    audience_filter: Optional[dict] = None
    scheduled_at: Optional[str] = None


class CampaignStats(BaseModel):
    total: int = 0
    draft: int = 0
    scheduled: int = 0
    sending: int = 0
    sent: int = 0
    cancelled: int = 0
