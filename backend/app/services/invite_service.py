"""
Invitation service for managing team member invitations with JWT tokens.
"""

import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from jose import jwt, JWTError

from ..config import settings
from ..models.team_member import TeamMember, InvitationStatus
from sqlalchemy import select

logger = logging.getLogger(__name__)

INVITE_TOKEN_EXPIRE_HOURS = 24


def create_invite_token(
    email: str,
    tenant_id: str,
    role: str,
    expires_in_hours: int = INVITE_TOKEN_EXPIRE_HOURS
) -> str:
    """
    Create a JWT invite token.
    
    Args:
        email: Email address of the invitee
        tenant_id: ID of the tenant inviting the user
        role: Role to assign (owner, admin, agent)
        expires_in_hours: Token expiration time in hours
        
    Returns:
        JWT token string
    """
    expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)
    
    payload = {
        "sub": email,
        "tenant_id": tenant_id,
        "role": role,
        "type": "invite",
        "exp": expires_at,
        "iat": datetime.utcnow(),
    }
    
    token = jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )
    
    logger.info(f"Created invite token for {email} with role {role}")
    
    return token


def verify_invite_token(token: str) -> Dict[str, Any]:
    """
    Verify and decode an invite token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token payload
        
    Raises:
        JWTError: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        
        if payload.get("type") != "invite":
            raise JWTError("Invalid token type")
        
        return payload
        
    except JWTError as e:
        logger.warning(f"Invalid invite token: {str(e)}")
        raise


def generate_invite_uuid() -> str:
    """
    Generate a secure UUID for invite token.
    
    Returns:
        UUID string
    """
    return secrets.token_urlsafe(16)


async def create_team_invitation(
    email: str,
    tenant_id: str,
    role: str,
    invited_by: str,
    name: Optional[str] = None
) -> TeamMember:
    """
    Create a team invitation record with JWT token.
    
    Args:
        email: Email address of the invitee
        tenant_id: ID of the tenant
        role: Role to assign
        invited_by: User ID of the inviter
        name: Optional name of the invitee
        
    Returns:
        Created TeamMember record
    """
    from ..models.base import get_db_session
    
    invite_token = generate_invite_uuid()
    expires_at = datetime.utcnow() + timedelta(hours=INVITE_TOKEN_EXPIRE_HOURS)
    
    async with get_db_session() as session:
        team_member = TeamMember(
            id=secrets.token_urlsafe(16),
            tenant_id=tenant_id,
            email=email,
            name=name,
            role=role,
            status=InvitationStatus.PENDING,
            invited_by=invited_by,
            invite_token=invite_token,
            invite_token_expires=expires_at,
        )
        
        session.add(team_member)
        await session.commit()
        await session.refresh(team_member)
        
        logger.info(f"Created team invitation for {email} in tenant {tenant_id}")
        
        return team_member


async def get_invitation_by_token(token: str) -> Optional[TeamMember]:
    """
    Get a team invitation by token.
    
    Args:
        token: Invite token
        
    Returns:
        TeamMember if found and not expired, None otherwise
    """
    from ..models.base import get_db_session
    from sqlalchemy import select
    
    async with get_db_session() as session:
        result = await session.execute(
            select(TeamMember).where(TeamMember.invite_token == token)
        )
        invitation = result.scalar_one_or_none()
        
        if invitation and invitation.invite_token_expires:
            if invitation.invite_token_expires < datetime.utcnow():
                logger.warning(f"Invitation token expired for {invitation.email}")
                return None
                
        return invitation


async def accept_invitation(
    invitation: TeamMember,
    user_id: str
) -> None:
    """
    Mark a team invitation as accepted.
    
    Args:
        invitation: TeamMember record
        user_id: ID of the user accepting the invitation
    """
    from ..models.base import get_db_session
    
    async with get_db_session() as session:
        result = await session.execute(
            select(TeamMember).where(TeamMember.id == invitation.id)
        )
        team_member = result.scalar_one_or_none()
        
        if team_member:
            team_member.user_id = user_id
            team_member.status = InvitationStatus.ACCEPTED
            team_member.accepted_at = datetime.utcnow()
            team_member.invite_token = None
            team_member.invite_token_expires = None
            
            await session.commit()
            
            logger.info(f"Invitation accepted for {team_member.email}")
