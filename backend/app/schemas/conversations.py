"""
Pydantic schemas for Conversations admin API (Milestone 7.4).

Covers:
- Paginated conversation list with filters (7.4.1, 7.4.2, 7.4.3)
- Full conversation detail with transcript (7.4.4)
- Bulk actions (7.4.5)
"""

from typing import List, Optional
from pydantic import BaseModel, Field


# ─── List / Table ─────────────────────────────────────────────────────────────

class ConversationListItem(BaseModel):
    """Single row in the conversations table."""
    id: str = Field(..., description="Conversation UUID")
    channel: str = Field(..., description="Channel name (web, whatsapp, etc.)")
    contact_name: Optional[str] = Field(None, description="Contact full name")
    contact_phone: Optional[str] = Field(None, description="Contact phone number")
    contact_email: Optional[str] = Field(None, description="Contact email")
    first_message: Optional[str] = Field(None, description="Preview of first user message")
    message_count: int = Field(..., ge=0, description="Total message count")
    status: str = Field(..., description="active | resolved | escalated | abandoned")
    rating: Optional[str] = Field(None, description="positive | negative | null")
    duration_minutes: Optional[float] = Field(None, ge=0, description="Duration in minutes")
    started_at: str = Field(..., description="ISO 8601 start timestamp")


class ConversationStats(BaseModel):
    """Stats summary bar counts for current filtered set."""
    total: int = Field(..., ge=0)
    active: int = Field(..., ge=0)
    resolved: int = Field(..., ge=0)
    escalated: int = Field(..., ge=0)
    abandoned: int = Field(..., ge=0)
    needs_review: int = Field(default=0, ge=0)


class ConversationListResponse(BaseModel):
    """Paginated list response with stats (7.4.2 + 7.4.3)."""
    conversations: List[ConversationListItem] = Field(default_factory=list)
    total: int = Field(..., ge=0, description="Total matching conversations")
    page: int = Field(..., ge=1)
    per_page: int = Field(..., ge=1)
    stats: ConversationStats = Field(..., description="Stats for current filter")


# ─── Detail ───────────────────────────────────────────────────────────────────

class ConversationMessageDetail(BaseModel):
    """A single message in the transcript."""
    id: str
    role: str = Field(..., description="user | assistant | system")
    content: str
    citations: Optional[list] = Field(None, description="Source citations from RAG")
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    created_at: str


class ConversationContactDetail(BaseModel):
    """Contact info shown in the right panel."""
    id: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    instagram_handle: Optional[str] = None
    company: Optional[str] = None
    lead_status: Optional[str] = None
    channels_used: Optional[List[str]] = None
    first_seen_at: Optional[str] = None
    last_active_at: Optional[str] = None
    notes: Optional[str] = None


class ConversationTimelineEvent(BaseModel):
    """Timeline event (conversation started, lead captured, escalated, resolved)."""
    event: str = Field(..., description="Event type label")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    detail: Optional[str] = Field(None, description="Optional extra info")


class ConversationInternalNote(BaseModel):
    """Internal note (agent-only) on a conversation."""
    note: str = Field(..., description="Note text")
    created_at: str = Field(..., description="ISO 8601 timestamp")


class ConversationDetailResponse(BaseModel):
    """Full conversation detail for the transcript/detail panel (7.4.4)."""
    id: str
    channel: str
    status: str
    rating: Optional[str]
    message_count: int
    started_at: str
    resolved_at: Optional[str]
    last_activity_at: Optional[str]
    page_url: Optional[str]
    duration_minutes: Optional[float]
    messages: List[ConversationMessageDetail] = Field(default_factory=list)
    contact: Optional[ConversationContactDetail] = None
    timeline: List[ConversationTimelineEvent] = Field(default_factory=list)
    internal_notes: List[ConversationInternalNote] = Field(
        default_factory=list,
        description="Internal notes (agent-only) for this conversation",
    )
    is_flagged: bool = Field(default=False, description="Flagged for AI training")


# ─── Status Update ─────────────────────────────────────────────────────────────

class ConversationStatusUpdateRequest(BaseModel):
    """PATCH /api/conversations/admin/{id}/status"""
    status: str = Field(..., description="active | resolved | escalated | abandoned | needs_review")
    reason: Optional[str] = Field(None, description="Optional reason for the change")


class ConversationStatusUpdateResponse(BaseModel):
    id: str
    status: str
    updated: bool
    message: str


# ─── Notes ────────────────────────────────────────────────────────────────────

class ConversationNoteRequest(BaseModel):
    """POST /api/conversations/admin/{id}/notes"""
    note: str = Field(..., min_length=1, description="Internal note text")


class ConversationNoteResponse(BaseModel):
    conversation_id: str
    note: str
    added: bool
    message: str


# ─── Flag for Training ────────────────────────────────────────────────────────

class ConversationFlagResponse(BaseModel):
    conversation_id: str
    is_flagged: bool
    message: str


# ─── Bulk Actions ─────────────────────────────────────────────────────────────

class ConversationBulkRequest(BaseModel):
    """POST /api/conversations/admin/bulk"""
    action: str = Field(..., description="resolve | delete | tag | export")
    conversation_ids: List[str] = Field(..., min_length=1)
    tag: Optional[str] = Field(None, description="Tag string for 'tag' action")
    reason: Optional[str] = Field(None, description="Reason for 'resolve' action")


class ConversationBulkResponse(BaseModel):
    action: str
    affected: int
    failed: int
    message: str
    export_data: Optional[List[dict]] = Field(None, description="Data for 'export' action")


# ─── In-platform feedback (Flow 5 parity) ─────────────────────────────────────

class ConversationFeedbackRequest(BaseModel):
    """POST /api/conversations/feedback - session feedback (Was this helpful? 👍/👎)."""
    session_id: str = Field(..., description="Conversation session ID")
    rating: str = Field(..., description="positive | negative")


class ConversationFeedbackResponse(BaseModel):
    success: bool
    message: str


class ConversationLeadRequest(BaseModel):
    """POST /api/conversations/lead - in-platform lead capture (Flow 5 parity)."""
    session_id: str = Field(..., description="Conversation session ID")
    lead_data: dict = Field(..., description="{ name?, email?, phone?, company? }")


class ConversationLeadResponse(BaseModel):
    success: bool
    message: str
