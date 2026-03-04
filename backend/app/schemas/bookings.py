"""
Pydantic schemas for Bookings CRUD (9.10).
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class BookingItem(BaseModel):
    id: str
    tenant_id: str
    contact_id: Optional[str] = None
    conversation_id: Optional[str] = None
    service: str
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    status: str
    notes: Optional[str] = None
    source_channel: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class BookingListResponse(BaseModel):
    bookings: List[BookingItem] = Field(default_factory=list)
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    per_page: int = Field(..., ge=1)


class BookingCreateRequest(BaseModel):
    contact_id: Optional[str] = None
    conversation_id: Optional[str] = None
    service: str = Field(..., min_length=1)
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    notes: Optional[str] = None
    source_channel: Optional[str] = None


class BookingUpdateRequest(BaseModel):
    contact_id: Optional[str] = None
    service: Optional[str] = None
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class BookingStats(BaseModel):
    total: int = 0
    requested: int = 0
    confirmed: int = 0
    completed: int = 0
    cancelled: int = 0
