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
    activity: List[Dict[str, Any]] = []
    notes: List[Dict[str, Any]] = []
    created_at: str
    updated_at: Optional[str] = None


class LeadStatusUpdateRequest(BaseModel):
    status: str
    reason: Optional[str] = None


class LeadStatusUpdateResponse(BaseModel):
    id: str
    status: str
    updated_at: str


class LeadUpdateRequest(BaseModel):
    status: Optional[str] = None
    est_value: Optional[float] = None
    actual_value: Optional[float] = None
    tags: Optional[List[str]] = None
    assigned_to: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    score: Optional[int] = None


class LeadUpdateResponse(BaseModel):
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
    format: Optional[str] = None  # for export: "hubspot" | "salesforce" | "generic"


class LeadBulkResponse(BaseModel):
    action: str
    affected: int
    failed: int
    export_data: Optional[List[Dict[str, Any]]] = None


class LeadCreateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = "new"
    score: Optional[int] = None
    est_value: Optional[float] = None
    source: Optional[str] = None
    channel: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    interest: Optional[str] = None


class LeadCreateResponse(BaseModel):
    id: str
    status: str


class LeadStatsResponse(BaseModel):
    stats: LeadStats


class LeadPipelineStatus(BaseModel):
    count: int
    total_value: Optional[float] = None
    leads: List[LeadListItem]
    limit_exceeded: Optional[bool] = False


class LeadPipelineResponse(BaseModel):
    pipeline: Dict[str, LeadPipelineStatus]
    max_per_column: Optional[int] = None


class LeadFollowupDraftRequest(BaseModel):
    lead_id: str
    channel: str


class LeadFollowupDraftResponse(BaseModel):
    draft: Dict[str, Any]
    suggested_cta: Optional[str] = None
    tone: Optional[str] = None


class LeadFollowupSendRequest(BaseModel):
    lead_id: str
    channel: str
    subject: Optional[str] = None
    content: str
    is_ai_assisted: bool = False
    scheduled_at: Optional[str] = None


class LeadFollowupSendResponse(BaseModel):
    success: bool
    message_id: Optional[str] = None
    sent_at: Optional[str] = None


class LeadAssignee(BaseModel):
    id: str
    full_name: Optional[str] = None
    email: Optional[str] = None
