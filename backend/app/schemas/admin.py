"""
Pydantic schemas for admin API requests and responses.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime

from pydantic import BaseModel, Field, EmailStr


# ============================================================================
# User & Role Schemas
# ============================================================================

class UserRole(str):
    """User role enumeration - matches plan specification."""
    OWNER = "owner"
    ADMIN = "admin"
    AGENT = "agent"


class UserResponse(BaseModel):
    """User response model."""
    id: str
    email: str
    name: Optional[str] = None
    role: str
    is_active: bool
    created_at: str
    updated_at: str


class CurrentUserResponse(BaseModel):
    """Current user response model."""
    id: str
    email: str
    name: Optional[str] = None
    role: str
    is_active: bool
    permissions: List[str] = Field(default_factory=list)


# ============================================================================
# Audit Log Schemas
# ============================================================================

class AuditLogResponse(BaseModel):
    """Audit log response model."""
    id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    resource_name: Optional[str] = None
    description: str
    metadata: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    status: str
    created_at: str


class AuditLogListResponse(BaseModel):
    """Audit log list response model."""
    logs: List[AuditLogResponse]
    total: int
    limit: int
    offset: int


class AuditLogFilterRequest(BaseModel):
    """Audit log filter request model."""
    action: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    user_id: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


# ============================================================================
# API Key Schemas
# ============================================================================

class APIKeyCreateRequest(BaseModel):
    """API key create request model."""
    name: str = Field(..., min_length=1, max_length=200, description="User-friendly name for the API key")
    expires_in_days: Optional[int] = Field(None, ge=1, le=365, description="Number of days until expiration (optional)")


class APIKeyCreateResponse(BaseModel):
    """API key create response model."""
    id: str
    name: str
    key: str = Field(..., description="The API key (only shown once)")
    key_prefix: str
    expires_at: Optional[str] = None
    created_at: str
    message: str = Field(default="API key created successfully. Store it securely - it won't be shown again.")


class APIKeyResponse(BaseModel):
    """API key response model."""
    id: str
    user_id: str
    name: str
    key_prefix: str
    last_used_at: Optional[str] = None
    expires_at: Optional[str] = None
    is_active: bool
    created_at: str
    updated_at: str


class APIKeyListResponse(BaseModel):
    """API key list response model."""
    keys: List[APIKeyResponse]
    total: int


class APIKeyRevokeRequest(BaseModel):
    """API key revoke request model."""
    reason: Optional[str] = Field(None, max_length=500, description="Reason for revoking the key")


# ============================================================================
# Team Management Schemas
# ============================================================================

class TeamMemberRole(str):
    """Team member role enumeration - matches plan specification."""
    OWNER = "owner"
    ADMIN = "admin"
    AGENT = "agent"


class TeamMemberResponse(BaseModel):
    """Team member response model."""
    id: str
    tenant_id: str
    user_id: Optional[str] = None
    email: str
    name: Optional[str] = None
    role: str
    status: str
    invited_by: str
    invited_at: str
    accepted_at: Optional[str] = None
    invite_token_expires: Optional[str] = None
    is_active: bool
    created_at: str
    updated_at: str


class TeamMemberListResponse(BaseModel):
    """Team member list response model."""
    members: List[TeamMemberResponse]
    total: int


class TeamMemberInviteRequest(BaseModel):
    """Team member invite request model."""
    email: EmailStr = Field(..., description="Email address to invite")
    name: Optional[str] = Field(None, max_length=200, description="Name of the invitee")
    role: str = Field(default="agent", description="Role to assign (owner, admin, agent)")


class TeamMemberInviteResponse(BaseModel):
    """Team member invite response model."""
    id: str
    email: str
    name: Optional[str] = None
    role: str
    status: str
    invited_at: str
    message: str = Field(default="Invitation sent successfully")


class TeamMemberUpdateRoleRequest(BaseModel):
    """Team member update role request model."""
    role: str = Field(..., description="New role to assign (owner, admin, agent)")


class TeamMemberUpdateRoleResponse(BaseModel):
    """Team member update role response model."""
    id: str
    role: str
    message: str = Field(default="Role updated successfully")


# ============================================================================
# Accept Invite Schemas
# ============================================================================

class AcceptInviteRequest(BaseModel):
    """Accept invite request model for new user registration."""
    token: str = Field(..., description="Invitation token from email")
    password: str = Field(..., min_length=8, description="Password for new account")
    full_name: Optional[str] = Field(None, max_length=200, description="Full name of the user")


class AcceptInviteResponse(BaseModel):
    """Accept invite response model."""
    message: str
    tenant_id: str
    role: str
    email: str
    name: Optional[str] = None


class AcceptInviteStatusResponse(BaseModel):
    """Check invite status response model."""
    valid: bool
    email: Optional[str] = None
    name: Optional[str] = None
    tenant_name: Optional[str] = None
    role: Optional[str] = None
    expires_at: Optional[str] = None
    message: Optional[str] = None
