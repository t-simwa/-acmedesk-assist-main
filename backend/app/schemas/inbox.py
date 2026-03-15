"""
Pydantic schemas for Unified Inbox (9.7).
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class InboxThreadItem(BaseModel):
    """A single thread in the unified inbox."""
    id: str = Field(..., description="Conversation UUID")
    channel: str = Field(..., description="Channel name (whatsapp, email, sms, messenger, instagram, web)")
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    last_message: Optional[str] = None
    last_message_role: Optional[str] = None
    last_message_at: Optional[str] = None
    message_count: int = 0
    status: str = "active"
    is_unread: bool = False
    handled_by: Optional[str] = None
    assigned_to: Optional[str] = None
    escalated_at: Optional[str] = None
    sla_deadline: Optional[str] = None


class InboxContactHistoryItem(BaseModel):
    conversation_id: str
    status: str
    last_activity_at: Optional[str] = None
    message_count: int = 0


class InboxContactHistoryResponse(BaseModel):
    history: List[InboxContactHistoryItem] = Field(default_factory=list)


class InboxEscalationItem(BaseModel):
    id: str
    type: str
    reason: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[str] = None


class InboxEscalationsResponse(BaseModel):
    escalations: List[InboxEscalationItem] = Field(default_factory=list)


class InboxConversationCreateRequest(BaseModel):
    channel: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    initial_message: str


class InboxConversationCreateResponse(BaseModel):
    conversation_id: str
    message_id: str


class InboxCounts(BaseModel):
    all: int = 0
    unread: int = 0
    escalated: int = 0
    ai_active: int = 0
    mine: int = 0
    resolved: int = 0


class InboxListResponse(BaseModel):
    threads: List[InboxThreadItem] = Field(default_factory=list)
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    per_page: int = Field(..., ge=1)
    counts: InboxCounts = Field(default_factory=InboxCounts)
    channel_counts: Dict[str, int] = Field(default_factory=dict)


class InboxMessageItem(BaseModel):
    id: str
    role: Optional[str] = None
    content: str
    created_at: Optional[str] = None
    metadata: Optional[dict] = None


class InboxThreadDetailResponse(BaseModel):
    conversation_id: str
    channel: str
    status: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    handled_by: Optional[str] = None
    assigned_to: Optional[str] = None
    escalated_at: Optional[str] = None
    sla_deadline: Optional[str] = None
    last_user_message_at: Optional[str] = None
    messages: List[InboxMessageItem] = Field(default_factory=list)


class InboxReplyRequest(BaseModel):
    body: str = Field(..., min_length=1, description="Reply body in plain text")
    internal_note: Optional[bool] = Field(False, description="If true, the message is stored as an internal note (not sent to the user).")


class InboxReplyResponse(BaseModel):
    message: InboxMessageItem


class InboxFlagTrainingRequest(BaseModel):
    message_id: str = Field(..., description="ID of the message being flagged")
    priority: str = Field(..., description="Priority of the flag (low|medium|high)")
    comment: Optional[str] = Field(None, description="Optional agent comment")


class InboxFlagTrainingResponse(BaseModel):
    success: bool
    feedback_id: str


class InboxAIDraftRequest(BaseModel):
    conversation_id: str
    channel: str


class InboxAIDraftResponse(BaseModel):
    draft: str
    confidence: float
    sources_used: List[str]


class InboxTemplateItem(BaseModel):
    id: str
    name: str
    content: str
    created_by: Optional[str] = None
    created_at: Optional[str] = None


class InboxTemplatesResponse(BaseModel):
    templates: List[InboxTemplateItem] = Field(default_factory=list)


class InboxMessagesResponse(BaseModel):
    messages: List[InboxMessageItem] = Field(default_factory=list)
    has_more: bool = False


class InboxContactResponse(BaseModel):
    contact_id: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    lead_status: Optional[str] = None


class InboxContactUpdateRequest(BaseModel):
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    lead_status: Optional[str] = None
