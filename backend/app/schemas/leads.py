"""
Pydantic schemas for the Leads admin API (Milestone 7.5).
"""

from typing import Optional, List, Any, Dict
from pydantic import BaseModel


class LeadStats(BaseModel):
    total: int = 0
    new: int = 0
    contacted: int = 0
    qualified: int = 0
    converted: int = 0
    this_month: int = 0


class LeadListItem(BaseModel):
    id: str
    contact_id: Optional[str] = None
    conversation_id: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_company: Optional[str] = None
    channel: Optional[str] = None
    source_page_url: Optional[str] = None
    first_message: Optional[str] = None
    status: str = "new"
    lead_score: Optional[str] = None  # high / medium / low
    message_count: int = 0
    created_at: str


class LeadListResponse(BaseModel):
    leads: List[LeadListItem]
    total: int
    page: int
    per_page: int
    stats: LeadStats


class LeadTimelineEvent(BaseModel):
    event: str
    timestamp: str
    detail: Optional[str] = None


class LeadMessageItem(BaseModel):
    id: str
    role: str  # "user" | "assistant" | "system"
    content: str
    timestamp: str
    sources: Optional[List[str]] = None


class LeadContactDetail(BaseModel):
    id: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    instagram_handle: Optional[str] = None
    channels_used: Optional[List[str]] = None
    lead_status: Optional[str] = None
    lead_score: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None


class LeadDetailResponse(BaseModel):
    id: str
    contact: Optional[LeadContactDetail] = None
    conversation_id: Optional[str] = None
    channel: Optional[str] = None
    source_page_url: Optional[str] = None
    first_message: Optional[str] = None
    status: str = "new"
    lead_score: Optional[str] = None
    message_count: int = 0
    messages: List[LeadMessageItem] = []
    timeline: List[LeadTimelineEvent] = []
    notes: List[Dict[str, str]] = []
    created_at: str
    updated_at: Optional[str] = None


class LeadStatusUpdateRequest(BaseModel):
    status: str
    reason: Optional[str] = None


class LeadStatusUpdateResponse(BaseModel):
    id: str
    status: str
    updated_at: str


class LeadNoteRequest(BaseModel):
    note: str


class LeadNoteResponse(BaseModel):
    id: str
    note: str
    timestamp: str


class LeadScoreResponse(BaseModel):
    id: str
    lead_score: Optional[str]
    updated_at: str


class LeadBulkRequest(BaseModel):
    action: str  # "status_change" | "delete" | "export"
    lead_ids: List[str]
    status: Optional[str] = None  # for status_change action
    reason: Optional[str] = None


class LeadBulkResponse(BaseModel):
    action: str
    affected: int
    failed: int
    export_data: Optional[List[Dict[str, Any]]] = None
