"""
Pydantic schemas for email channel (J1.1/J1.2).
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class EmailThreadSummary(BaseModel):
  thread_id: str = Field(..., description="Stable identifier for the email thread")
  subject: str = Field(..., description="Email subject")
  last_message_at: str = Field(..., description="ISO timestamp of the last message in the thread")
  from_address: Optional[str] = Field(None, description="Original sender address")
  to_address: Optional[str] = Field(None, description="Original recipient address")
  message_count: int = Field(..., description="Number of messages in the thread")


class EmailThreadListResponse(BaseModel):
  threads: List[EmailThreadSummary]
  total: int
  limit: int
  offset: int


class EmailMessageMetadata(BaseModel):
  id: str
  role: str
  content: str
  timestamp: Optional[str] = None
  metadata: Optional[dict] = None


class EmailThreadMessagesResponse(BaseModel):
  thread_id: str
  messages: List[EmailMessageMetadata]


class EmailReplyRequest(BaseModel):
  body: str = Field(..., description="Reply body in plain text")


class EmailReplyResponse(BaseModel):
  message: EmailMessageMetadata

