"""
Authentication dependencies for FastAPI.
"""

import logging
from typing import List, Optional
from functools import wraps

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy import select

from ..config import settings
from ..models.base import get_db_session
from ..models.user import User

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    request: Request = None
) -> User:
    """
    Get the current authenticated user from JWT token.
    
    Args:
        credentials: Bearer token credentials
        request: FastAPI request object
        
    Returns:
        User object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    async with get_db_session() as session:
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled",
            )
        
        return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Optional[User]:
    """
    Get the current user if authenticated, None otherwise.
    
    Args:
        credentials: Bearer token credentials
        
    Returns:
        User object or None
    """
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


def require_roles(allowed_roles: List[str]):
    """
    FastAPI dependency factory that checks user's role.
    
    Usage:
        @router.get("/protected")
        async def protected_route(user: User = Depends(require_roles(["admin", "owner"]))):
            ...
    
    Args:
        allowed_roles: List of allowed role strings
        
    Returns:
        Dependency function that checks user's role
    """
    async def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role.value not in allowed_roles:
            logger.warning(
                f"User {user.email} with role {user.role.value} "
                f"attempted to access endpoint requiring {allowed_roles}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}"
            )
        return user
    
    return role_checker


def require_role(*allowed_roles: str):
    """
    FastAPI dependency that checks user's role.
    
    Usage:
        @router.get("/protected")
        async def protected_route(user: User = Depends(require_role("admin", "owner"))):
            ...
    
    Args:
        allowed_roles: Role strings that are allowed
        
    Returns:
        Dependency function that checks user's role
    """
    return require_roles(list(allowed_roles))


def require_owner():
    """
    FastAPI dependency that requires owner role.
    
    Usage:
        @router.delete("/delete")
        async def delete_something(user: User = Depends(require_owner())):
            ...
    """
    async def owner_checker(user: User = Depends(get_current_user)) -> User:
        if user.role.value != "owner":
            logger.warning(
                f"User {user.email} with role {user.role.value} "
                f"attempted to access owner-only endpoint"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This action requires owner privileges"
            )
        return user
    
    return owner_checker


def require_admin():
    """
    FastAPI dependency that requires admin or owner role.
    
    Usage:
        @router.post("/invite")
        async def invite_user(user: User = Depends(require_admin())):
            ...
    """
    async def admin_checker(user: User = Depends(get_current_user)) -> User:
        if user.role.value not in ["owner", "admin"]:
            logger.warning(
                f"User {user.email} with role {user.role.value} "
                f"attempted to access admin-only endpoint"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This action requires admin or owner privileges"
            )
        return user
    
    return admin_checker
