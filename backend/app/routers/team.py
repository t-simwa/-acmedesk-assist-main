"""
Team invitation API endpoints.

Implements:
- GET /api/team/accept?token={token} - Check invite status
- POST /api/team/accept - Accept invitation and create/link account
"""

import logging
import secrets
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import select

from ..config import settings
from ..models.base import get_db_session
from ..models.user import User, UserRole
from ..models.tenant import Tenant
from ..models.team_member import TeamMember, TeamMemberRole, InvitationStatus
from ..schemas.admin import (
    AcceptInviteRequest,
    AcceptInviteResponse,
    AcceptInviteStatusResponse,
)
from ..services.auth import hash_password, generate_user_id
from ..services.invite_service import verify_invite_token, accept_invitation

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/team", tags=["team"])


@router.get("/accept", response_model=AcceptInviteStatusResponse)
async def check_invite_status(token: str = Query(..., description="Invitation token")):
    """
    Check the status of an invitation token.
    
    Returns information about the invitation without accepting it.
    """
    try:
        payload = verify_invite_token(token)
        
        email = payload.get("sub")
        tenant_id = payload.get("tenant_id")
        role = payload.get("role")
        expires_at = payload.get("exp")
        
        async with get_db_session() as session:
            result = await session.execute(
                select(Tenant).where(Tenant.id == tenant_id)
            )
            tenant = result.scalar_one_or_none()
            
            tenant_name = tenant.business_name if tenant else "Unknown"
        
        return AcceptInviteStatusResponse(
            valid=True,
            email=email,
            tenant_name=tenant_name,
            role=role,
            expires_at=datetime.fromtimestamp(expires_at).isoformat() if expires_at else None,
            message=f"You've been invited to join {tenant_name} as a {role}"
        )
        
    except Exception as e:
        logger.warning(f"Invalid invite token: {str(e)}")
        return AcceptInviteStatusResponse(
            valid=False,
            message="Invalid or expired invitation token"
        )


@router.post("/accept", response_model=AcceptInviteResponse)
async def accept_invite(request_data: AcceptInviteRequest):
    """
    Accept a team invitation.
    
    For new users: Creates a new account with the invited email
    For existing users: Links the user to the tenant with the assigned role
    
    The invitation token is validated, and the user is either created
    or linked to the tenant based on whether they already exist.
    """
    try:
        payload = verify_invite_token(request_data.token)
    except Exception as e:
        logger.warning(f"Invalid invite token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired invitation token"
        )
    
    email = payload.get("sub")
    tenant_id = payload.get("tenant_id")
    role = payload.get("role")
    
    async with get_db_session() as session:
        result = await session.execute(
            select(User).where(User.email == email)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            if existing_user.tenant_id and existing_user.tenant_id != tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This email is already associated with another organization"
                )
            
            existing_user.tenant_id = tenant_id
            existing_user.role = UserRole(role) if role else UserRole.AGENT
            
            if not existing_user.is_verified:
                existing_user.is_verified = True
            
            user_id = existing_user.id
            full_name = existing_user.full_name
            
            logger.info(f"Linked existing user {email} to tenant {tenant_id}")
        else:
            user_id = generate_user_id()
            password_hash = hash_password(request_data.password)
            
            new_user = User(
                id=user_id,
                tenant_id=tenant_id,
                email=email,
                password_hash=password_hash,
                full_name=request_data.full_name or email.split("@")[0],
                role=UserRole(role) if role else UserRole.AGENT,
                is_verified=True,
            )
            
            session.add(new_user)
            full_name = request_data.full_name
            
            logger.info(f"Created new user {email} in tenant {tenant_id}")
        
        result = await session.execute(
            select(TeamMember).where(
                TeamMember.tenant_id == tenant_id,
                TeamMember.email == email
            )
        )
        team_member = result.scalar_one_or_none()
        
        if team_member:
            team_member.user_id = user_id
            team_member.status = InvitationStatus.ACCEPTED
            team_member.accepted_at = datetime.utcnow()
            team_member.invite_token = None
            team_member.invite_token_expires = None
        
        await session.commit()
        
        return AcceptInviteResponse(
            message="You have been added to the team",
            tenant_id=tenant_id,
            role=role,
            email=email,
            name=full_name
        )
