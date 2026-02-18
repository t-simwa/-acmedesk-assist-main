"""
Admin API endpoints for RBAC, audit logs, API keys, and team management.

Implements:
- GET /api/admin/current-user - Get current user info
- GET /api/admin/audit-logs - List audit logs
- GET /api/admin/api-keys - List API keys
- POST /api/admin/api-keys - Create API key
- DELETE /api/admin/api-keys/{key_id} - Revoke API key
- GET /api/admin/team - List team members
- POST /api/admin/team/invite - Invite team member
- PUT /api/admin/team/{member_id}/role - Update team member role
- DELETE /api/admin/team/{member_id} - Remove team member
"""

import hashlib
import secrets
import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, HTTPException, status, Request, Query
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models.base import get_db_session
from ..models.user import User, UserRole
from ..models.audit_log import AuditLog, AuditAction, AuditResourceType
from ..models.api_key import APIKey
from ..models.team_member import TeamMember, TeamMemberRole, InvitationStatus
from ..schemas.admin import (
    CurrentUserResponse,
    AuditLogResponse,
    AuditLogListResponse,
    AuditLogFilterRequest,
    APIKeyCreateRequest,
    APIKeyCreateResponse,
    APIKeyResponse,
    APIKeyListResponse,
    APIKeyRevokeRequest,
    TeamMemberResponse,
    TeamMemberListResponse,
    TeamMemberInviteRequest,
    TeamMemberInviteResponse,
    TeamMemberUpdateRoleRequest,
    TeamMemberUpdateRoleResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Default user ID for single-user prototype
DEFAULT_USER_ID = "default"
DEFAULT_USER_EMAIL = "admin@acmedesk.com"
DEFAULT_USER_ROLE = UserRole.ADMIN


def hash_api_key(key: str) -> str:
    """Hash an API key using SHA-256."""
    return hashlib.sha256(key.encode()).hexdigest()


def generate_api_key() -> tuple[str, str]:
    """Generate a new API key and return (key, hash, prefix)."""
    # Generate a secure random key
    key = f"acmedesk_{secrets.token_urlsafe(32)}"
    key_hash = hash_api_key(key)
    key_prefix = key[:16]  # First 16 characters for display
    return key, key_hash, key_prefix


async def create_audit_log(
    action: AuditAction,
    resource_type: AuditResourceType,
    description: str,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    resource_id: Optional[str] = None,
    resource_name: Optional[str] = None,
    metadata: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    status: str = "success",
) -> AuditLog:
    """Create an audit log entry."""
    async with get_db_session() as session:
        audit_log = AuditLog(
            id=str(uuid.uuid4()),
            user_id=user_id or DEFAULT_USER_ID,
            user_email=user_email or DEFAULT_USER_EMAIL,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            description=description,
            metadata_json=metadata,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
        )
        session.add(audit_log)
        await session.commit()
        await session.refresh(audit_log)
        return audit_log


def get_user_permissions(role: str) -> List[str]:
    """Get permissions for a user role."""
    permissions = {
        "admin": [
            "admin:read",
            "admin:write",
            "documents:read",
            "documents:write",
            "documents:delete",
            "analytics:read",
            "settings:read",
            "settings:write",
            "team:read",
            "team:write",
            "team:invite",
            "team:remove",
            "api_keys:read",
            "api_keys:write",
            "api_keys:revoke",
            "audit_logs:read",
        ],
        "analyst": [
            "documents:read",
            "documents:write",
            "analytics:read",
            "settings:read",
        ],
        "viewer": [
            "documents:read",
            "analytics:read",
        ],
    }
    return permissions.get(role, [])


@router.get("/current-user", response_model=CurrentUserResponse, status_code=status.HTTP_200_OK)
async def get_current_user(request: Request) -> CurrentUserResponse:
    """
    Get current user information and permissions.
    
    Returns the current user's information including role and permissions.
    For now, returns a default admin user (single-user prototype).
    
    Returns:
        CurrentUserResponse with user info and permissions
    """
    try:
        # For single-user prototype, return default admin user
        role = DEFAULT_USER_ROLE.value
        permissions = get_user_permissions(role)
        
        return CurrentUserResponse(
            id=DEFAULT_USER_ID,
            email=DEFAULT_USER_EMAIL,
            name="Admin User",
            role=role,
            is_active=True,
            permissions=permissions,
        )
    except Exception as e:
        logger.error(f"Error getting current user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get current user information",
        )


@router.get("/audit-logs", response_model=AuditLogListResponse, status_code=status.HTTP_200_OK)
async def list_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    resource_id: Optional[str] = Query(None, description="Filter by resource ID"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    limit: int = Query(50, ge=1, le=100, description="Number of logs to return"),
    offset: int = Query(0, ge=0, description="Number of logs to skip"),
) -> AuditLogListResponse:
    """
    List audit logs with filtering and pagination.
    
    Returns a paginated list of audit logs with optional filtering by:
    - action: The action performed
    - resource_type: Type of resource affected
    - resource_id: ID of the affected resource
    - user_id: User who performed the action
    - status: Status of the action (success, error, warning)
    - start_date: Start date for date range filter (ISO format)
    - end_date: End date for date range filter (ISO format)
    
    Returns:
        AuditLogListResponse with paginated audit logs
    """
    try:
        async with get_db_session() as session:
            # Build query
            query = select(AuditLog)
            conditions = []
            
            if action:
                conditions.append(AuditLog.action == AuditAction(action))
            if resource_type:
                conditions.append(AuditLog.resource_type == AuditResourceType(resource_type))
            if resource_id:
                conditions.append(AuditLog.resource_id == resource_id)
            if user_id:
                conditions.append(AuditLog.user_id == user_id)
            if status:
                conditions.append(AuditLog.status == status)
            if start_date:
                try:
                    start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
                    conditions.append(AuditLog.created_at >= start_dt)
                except ValueError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid start_date format. Use ISO format (e.g., 2024-01-01T00:00:00Z)",
                    )
            if end_date:
                try:
                    end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                    conditions.append(AuditLog.created_at <= end_dt)
                except ValueError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid end_date format. Use ISO format (e.g., 2024-01-01T00:00:00Z)",
                    )
            
            if conditions:
                query = query.where(and_(*conditions))
            
            # Get total count
            count_query = select(func.count()).select_from(AuditLog)
            if conditions:
                count_query = count_query.where(and_(*conditions))
            total_result = await session.execute(count_query)
            total = total_result.scalar() or 0
            
            # Get paginated results
            query = query.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
            result = await session.execute(query)
            logs = result.scalars().all()
            
            return AuditLogListResponse(
                logs=[AuditLogResponse(**log.to_dict()) for log in logs],
                total=total,
                limit=limit,
                offset=offset,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing audit logs: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list audit logs",
        )


@router.get("/api-keys", response_model=APIKeyListResponse, status_code=status.HTTP_200_OK)
async def list_api_keys(request: Request) -> APIKeyListResponse:
    """
    List all API keys for the current user.
    
    Returns a list of all API keys owned by the current user.
    The actual key values are never returned - only prefixes are shown.
    
    Returns:
        APIKeyListResponse with list of API keys
    """
    try:
        async with get_db_session() as session:
            query = select(APIKey).where(
                and_(
                    APIKey.user_id == DEFAULT_USER_ID,
                    APIKey.is_active == True,
                )
            ).order_by(APIKey.created_at.desc())
            result = await session.execute(query)
            keys = result.scalars().all()
            
            # Create audit log
            await create_audit_log(
                action=AuditAction.VIEW,
                resource_type=AuditResourceType.API_KEY,
                description="Listed API keys",
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
            )
            
            return APIKeyListResponse(
                keys=[APIKeyResponse(**key.to_dict()) for key in keys],
                total=len(keys),
            )
    except Exception as e:
        logger.error(f"Error listing API keys: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list API keys",
        )


@router.post("/api-keys", response_model=APIKeyCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    request_body: APIKeyCreateRequest,
    request: Request,
) -> APIKeyCreateResponse:
    """
    Create a new API key.
    
    Generates a new API key for the current user. The key is only shown once
    in the response - it should be stored securely by the client.
    
    Args:
        request_body: API key creation request with name and optional expiration
        
    Returns:
        APIKeyCreateResponse with the new API key (shown only once)
    """
    try:
        async with get_db_session() as session:
            # Generate API key
            key, key_hash, key_prefix = generate_api_key()
            
            # Calculate expiration if provided
            expires_at = None
            if request_body.expires_in_days:
                expires_at = datetime.utcnow() + timedelta(days=request_body.expires_in_days)
            
            # Create API key record
            api_key = APIKey(
                id=str(uuid.uuid4()),
                user_id=DEFAULT_USER_ID,
                name=request_body.name,
                key_hash=key_hash,
                key_prefix=key_prefix,
                expires_at=expires_at,
                is_active=True,
            )
            session.add(api_key)
            await session.commit()
            await session.refresh(api_key)
            
            # Create audit log
            await create_audit_log(
                action=AuditAction.API_KEY_CREATE,
                resource_type=AuditResourceType.API_KEY,
                resource_id=api_key.id,
                resource_name=api_key.name,
                description=f"Created API key: {api_key.name}",
                metadata={"key_prefix": key_prefix},
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
            )
            
            return APIKeyCreateResponse(
                id=api_key.id,
                name=api_key.name,
                key=key,  # Only shown once
                key_prefix=key_prefix,
                expires_at=api_key.expires_at.isoformat() + "Z" if api_key.expires_at else None,
                created_at=api_key.created_at.isoformat() + "Z",
                message="API key created successfully. Store it securely - it won't be shown again.",
            )
    except Exception as e:
        logger.error(f"Error creating API key: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create API key",
        )


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_200_OK)
async def revoke_api_key(
    key_id: str,
    request_body: Optional[APIKeyRevokeRequest] = None,
    request: Request = None,
) -> dict:
    """
    Revoke an API key.
    
    Marks an API key as inactive, preventing its future use.
    
    Args:
        key_id: ID of the API key to revoke
        request_body: Optional reason for revoking the key
        
    Returns:
        Success message
    """
    try:
        async with get_db_session() as session:
            # Find API key
            query = select(APIKey).where(
                and_(
                    APIKey.id == key_id,
                    APIKey.user_id == DEFAULT_USER_ID,
                )
            )
            result = await session.execute(query)
            api_key = result.scalar_one_or_none()
            
            if not api_key:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="API key not found",
                )
            
            # Revoke key
            api_key.is_active = False
            await session.commit()
            
            # Create audit log
            await create_audit_log(
                action=AuditAction.API_KEY_REVOKE,
                resource_type=AuditResourceType.API_KEY,
                resource_id=api_key.id,
                resource_name=api_key.name,
                description=f"Revoked API key: {api_key.name}",
                metadata={"reason": request_body.reason if request_body else None},
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent") if request else None,
            )
            
            return {"message": "API key revoked successfully", "id": key_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking API key: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke API key",
        )


@router.get("/team", response_model=TeamMemberListResponse, status_code=status.HTTP_200_OK)
async def list_team_members(request: Request) -> TeamMemberListResponse:
    """
    List all team members.
    
    Returns a list of all team members including their roles and invitation status.
    
    Returns:
        TeamMemberListResponse with list of team members
    """
    try:
        async with get_db_session() as session:
            query = select(TeamMember).order_by(TeamMember.created_at.desc())
            result = await session.execute(query)
            members = result.scalars().all()
            
            # Create audit log
            await create_audit_log(
                action=AuditAction.VIEW,
                resource_type=AuditResourceType.TEAM_MEMBER,
                description="Listed team members",
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
            )
            
            return TeamMemberListResponse(
                members=[TeamMemberResponse(**member.to_dict()) for member in members],
                total=len(members),
            )
    except Exception as e:
        logger.error(f"Error listing team members: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list team members",
        )


@router.post("/team/invite", response_model=TeamMemberInviteResponse, status_code=status.HTTP_201_CREATED)
async def invite_team_member(
    request_body: TeamMemberInviteRequest,
    request: Request,
) -> TeamMemberInviteResponse:
    """
    Invite a new team member.
    
    Creates a new team member invitation. The invitee will receive an email
    (in a real implementation) with instructions to accept the invitation.
    
    Args:
        request_body: Invitation request with email, name, and role
        
    Returns:
        TeamMemberInviteResponse with invitation details
    """
    try:
        async with get_db_session() as session:
            # Check if member already exists
            query = select(TeamMember).where(TeamMember.email == request_body.email)
            result = await session.execute(query)
            existing = result.scalar_one_or_none()
            
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Team member with email {request_body.email} already exists",
                )
            
            # Validate role
            try:
                role = TeamMemberRole(request_body.role)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid role: {request_body.role}. Must be one of: admin, analyst, viewer",
                )
            
            # Create team member invitation
            team_member = TeamMember(
                id=str(uuid.uuid4()),
                email=request_body.email,
                name=request_body.name,
                role=role,
                status=InvitationStatus.PENDING,
                invited_by=DEFAULT_USER_ID,
            )
            session.add(team_member)
            await session.commit()
            await session.refresh(team_member)
            
            # Create audit log
            await create_audit_log(
                action=AuditAction.INVITE,
                resource_type=AuditResourceType.TEAM_MEMBER,
                resource_id=team_member.id,
                resource_name=team_member.email,
                description=f"Invited team member: {team_member.email} with role {team_member.role.value}",
                metadata={"email": team_member.email, "role": team_member.role.value},
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
            )
            
            return TeamMemberInviteResponse(
                id=team_member.id,
                email=team_member.email,
                name=team_member.name,
                role=team_member.role.value,
                status=team_member.status.value,
                invited_at=team_member.invited_at.isoformat() + "Z",
                message="Invitation sent successfully",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inviting team member: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to invite team member",
        )


@router.put("/team/{member_id}/role", response_model=TeamMemberUpdateRoleResponse, status_code=status.HTTP_200_OK)
async def update_team_member_role(
    member_id: str,
    request_body: TeamMemberUpdateRoleRequest,
    request: Request,
) -> TeamMemberUpdateRoleResponse:
    """
    Update a team member's role.
    
    Changes the role of an existing team member.
    
    Args:
        member_id: ID of the team member
        request_body: New role to assign
        
    Returns:
        TeamMemberUpdateRoleResponse with updated role
    """
    try:
        async with get_db_session() as session:
            # Find team member
            query = select(TeamMember).where(TeamMember.id == member_id)
            result = await session.execute(query)
            team_member = result.scalar_one_or_none()
            
            if not team_member:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Team member not found",
                )
            
            # Validate role
            try:
                new_role = TeamMemberRole(request_body.role)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid role: {request_body.role}. Must be one of: admin, analyst, viewer",
                )
            
            old_role = team_member.role.value
            team_member.role = new_role
            await session.commit()
            await session.refresh(team_member)
            
            # Create audit log
            await create_audit_log(
                action=AuditAction.ROLE_CHANGE,
                resource_type=AuditResourceType.TEAM_MEMBER,
                resource_id=team_member.id,
                resource_name=team_member.email,
                description=f"Changed role of {team_member.email} from {old_role} to {new_role.value}",
                metadata={"old_role": old_role, "new_role": new_role.value},
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
            )
            
            return TeamMemberUpdateRoleResponse(
                id=team_member.id,
                role=team_member.role.value,
                message="Role updated successfully",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating team member role: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update team member role",
        )


@router.delete("/team/{member_id}", status_code=status.HTTP_200_OK)
async def remove_team_member(
    member_id: str,
    request: Request,
) -> dict:
    """
    Remove a team member.
    
    Removes a team member from the team (marks as inactive).
    
    Args:
        member_id: ID of the team member to remove
        
    Returns:
        Success message
    """
    try:
        async with get_db_session() as session:
            # Find team member
            query = select(TeamMember).where(TeamMember.id == member_id)
            result = await session.execute(query)
            team_member = result.scalar_one_or_none()
            
            if not team_member:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Team member not found",
                )
            
            # Remove member (mark as inactive)
            team_member.is_active = False
            await session.commit()
            
            # Create audit log
            await create_audit_log(
                action=AuditAction.REMOVE,
                resource_type=AuditResourceType.TEAM_MEMBER,
                resource_id=team_member.id,
                resource_name=team_member.email,
                description=f"Removed team member: {team_member.email}",
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
            )
            
            return {"message": "Team member removed successfully", "id": member_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing team member: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove team member",
        )
