"""
Pydantic schemas for Contacts CRUD (9.8).
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class ContactItem(BaseModel):
    id: str
    tenant_id: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    instagram_handle: Optional[str] = None
    company: Optional[str] = None
    channels_used: Optional[List[str]] = None
    first_seen_channel: Optional[str] = None
    first_seen_at: Optional[str] = None
    last_active_at: Optional[str] = None
    lead_status: Optional[str] = None
    lead_score: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ContactListResponse(BaseModel):
    contacts: List[ContactItem] = Field(default_factory=list)
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    per_page: int = Field(..., ge=1)


class ContactCreateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    instagram_handle: Optional[str] = None
    company: Optional[str] = None
    lead_status: Optional[str] = None
    lead_score: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None


class ContactUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    instagram_handle: Optional[str] = None
    company: Optional[str] = None
    lead_status: Optional[str] = None
    lead_score: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None


class ContactDetailResponse(BaseModel):
    contact: ContactItem
    conversations_count: int = 0
    bookings_count: int = 0
