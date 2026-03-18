"""
Pydantic schemas for Bookings CRUD (9.10).
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field

from .contacts import ContactItem


class BookingItem(BaseModel):
    id: str
    tenant_id: str
    contact_id: Optional[str] = None
    contact: Optional[ContactItem] = None
    conversation_id: Optional[str] = None
    service_id: Optional[str] = None
    service: str
    service_details: Optional[str] = None
    service_obj: Optional["ServiceItem"] = None
    location: Optional[str] = None
    special_requests: Optional[str] = None
    booking_date: Optional[str] = None
    booking_time: Optional[str] = None
    booking_datetime: Optional[str] = None
    duration_minutes: Optional[int] = None
    status: str
    booking_value: Optional[float] = None
    actual_value: Optional[float] = None
    currency: Optional[str] = None
    assigned_to: Optional[str] = None
    confirmed_at: Optional[str] = None
    completed_at: Optional[str] = None
    cancelled_at: Optional[str] = None
    cancellation_reason: Optional[str] = None
    no_show_at: Optional[str] = None
    reminder_24h_sent_at: Optional[str] = None
    reminder_2h_sent_at: Optional[str] = None
    reminder_manual_sent_at: Optional[str] = None
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
    service_id: Optional[str] = None
    service: str = Field(..., min_length=1)
    service_details: Optional[str] = None
    location: Optional[str] = None
    booking_date: Optional[str] = None
    booking_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    booking_value: Optional[float] = None
    currency: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    source_channel: Optional[str] = None


class BookingUpdateRequest(BaseModel):
    contact_id: Optional[str] = None
    conversation_id: Optional[str] = None
    service_id: Optional[str] = None
    service: Optional[str] = None
    service_details: Optional[str] = None
    location: Optional[str] = None
    booking_date: Optional[str] = None
    booking_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None
    booking_value: Optional[float] = None
    actual_value: Optional[float] = None
    currency: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None


class BookingConfirmRequest(BaseModel):
    channel: Optional[str] = None
    send_notification: Optional[bool] = True
    message: Optional[str] = None


class BookingCancelRequest(BaseModel):
    reason: str
    channel: Optional[str] = None
    send_notification: Optional[bool] = True
    message: Optional[str] = None
    internal_note: Optional[str] = None


class BookingCompleteRequest(BaseModel):
    actual_value: Optional[float] = None
    satisfaction_note: Optional[str] = None


class BookingRescheduleRequest(BaseModel):
    new_date: str
    new_time: str
    reason: Optional[str] = None
    channel: Optional[str] = None
    send_notification: Optional[bool] = True
    message: Optional[str] = None


class BookingSendReminderRequest(BaseModel):
    channel: Optional[str] = None
    message: Optional[str] = None


class BookingReminderSettingsResponse(BaseModel):
    enabled_24h: bool
    enabled_2h: bool
    enabled_manual: bool


class BookingReminderSettingsUpdateRequest(BaseModel):
    enabled_24h: Optional[bool] = None
    enabled_2h: Optional[bool] = None
    enabled_manual: Optional[bool] = None


class BookingBulkRequest(BaseModel):
    booking_ids: list[str]
    action: str
    params: Optional[dict] = None


class BookingActivityItem(BaseModel):
    timestamp: str
    type: str
    message: Optional[str] = None


class BookingActivityResponse(BaseModel):
    events: List[BookingActivityItem] = Field(default_factory=list)


class ServiceItem(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    default_price: Optional[float] = None
    currency: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ServiceCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    default_price: Optional[float] = None
    currency: Optional[str] = None


class BookingNoteItem(BaseModel):
    id: str
    booking_id: str
    tenant_id: str
    user_id: Optional[str] = None
    content: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class BookingNotesResponse(BaseModel):
    notes: List[BookingNoteItem] = Field(default_factory=list)


class BookingCreateNoteRequest(BaseModel):
    content: str


class BookingStats(BaseModel):
    total: int = 0
    requested: int = 0
    confirmed: int = 0
    completed: int = 0
    cancelled: int = 0
    today: int = 0
    revenue: float = 0.0
