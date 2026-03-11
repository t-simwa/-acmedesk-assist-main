"""
Pydantic schemas for Unified Inbox (9.7).
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class InboxThreadItem(BaseModel):
    """A single thread in the unified inbox."""
    id: str = Field(..., description="Conversation UUID")
    channel: str = Field(..., description="Channel name (whatsapp, email, sms, messenger, instagram, web)")
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[str] = None
    message_count: int = 0
    status: str = "active"
    is_unread: bool = False


class InboxListResponse(BaseModel):
    threads: List[InboxThreadItem] = Field(default_factory=list)
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    per_page: int = Field(..., ge=1)


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
    messages: List[InboxMessageItem] = Field(default_factory=list)


class InboxReplyRequest(BaseModel):
    body: str = Field(..., min_length=1, description="Reply body in plain text")


class InboxReplyResponse(BaseModel):
    message: InboxMessageItem
