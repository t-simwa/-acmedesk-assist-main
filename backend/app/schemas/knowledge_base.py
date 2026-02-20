"""
Pydantic schemas for knowledge base API requests and responses.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class KnowledgeBaseMetadata(BaseModel):
    """Knowledge base metadata model."""

    id: str = Field(..., description="Unique knowledge base identifier")
    user_id: Optional[str] = Field(None, description="User ID who owns this knowledge base (None for default)")
    name: str = Field(..., description="Knowledge base name")
    description: Optional[str] = Field(None, description="Knowledge base description")
    is_default: bool = Field(..., description="Whether this is the default system knowledge base")
    is_active: bool = Field(..., description="Whether this knowledge base is active")
    created_at: Optional[str] = Field(None, description="ISO 8601 timestamp when knowledge base was created")
    updated_at: Optional[str] = Field(None, description="ISO 8601 timestamp when knowledge base was last updated")


class CreateKnowledgeBaseRequest(BaseModel):
    """Request model for creating a knowledge base."""

    name: str = Field(..., description="Knowledge base name", min_length=1, max_length=255)
    description: Optional[str] = Field(None, description="Knowledge base description", max_length=500)


class UpdateKnowledgeBaseRequest(BaseModel):
    """Request model for updating a knowledge base."""

    name: Optional[str] = Field(None, description="Knowledge base name", min_length=1, max_length=255)
    description: Optional[str] = Field(None, description="Knowledge base description", max_length=500)
    is_active: Optional[bool] = Field(None, description="Whether this knowledge base is active")


class KnowledgeBaseResponse(BaseModel):
    """Response model for a single knowledge base."""

    knowledge_base: KnowledgeBaseMetadata = Field(..., description="Knowledge base metadata")


class KnowledgeBaseListResponse(BaseModel):
    """Response model for listing knowledge bases."""

    knowledge_bases: List[KnowledgeBaseMetadata] = Field(..., description="List of knowledge bases")
    total: int = Field(..., description="Total number of knowledge bases")


class UserKnowledgeBasePreferences(BaseModel):
    """User knowledge base preferences model."""

    use_default_kb: bool = Field(..., description="Whether to use the default knowledge base")
    active_kb_ids: List[str] = Field(..., description="List of active knowledge base IDs")


class UpdateKnowledgeBasePreferencesRequest(BaseModel):
    """Request model for updating user knowledge base preferences."""

    use_default_kb: bool = Field(..., description="Whether to use the default knowledge base")
    active_kb_ids: List[str] = Field(..., description="List of active knowledge base IDs")


class KnowledgeBasePreferencesResponse(BaseModel):
    """Response model for user knowledge base preferences."""

    preferences: UserKnowledgeBasePreferences = Field(..., description="User knowledge base preferences")
