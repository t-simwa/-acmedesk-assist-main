"""
Multi-tenancy context management for AcmeDesk Assist.

This module provides:
- TenantContext: Context variable for storing current tenant_id
- get_current_tenant_id(): Get the current tenant_id from context
- set_current_tenant_id(): Set the current tenant_id in context
- require_tenant(): Dependency for endpoints requiring tenant context
"""

from contextvars import ContextVar
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from ..config import settings


tenant_context: ContextVar[Optional[str]] = ContextVar("tenant_context", default=None)


def get_current_tenant_id() -> Optional[str]:
    """
    Get the current tenant_id from the context.
    
    Returns:
        The tenant_id if set, None otherwise
    """
    return tenant_context.get()


def set_current_tenant_id(tenant_id: Optional[str]) -> None:
    """
    Set the current tenant_id in the context.
    
    Args:
        tenant_id: The tenant_id to set
    """
    tenant_context.set(tenant_id)


def clear_tenant_context() -> None:
    """Clear the tenant context."""
    tenant_context.set(None)


class TenantContextMiddleware:
    """
    FastAPI middleware that extracts tenant_id from JWT and stores it in context.
    
    This middleware runs on every authenticated request and:
    1. Extracts the JWT from the Authorization header
    2. Decodes the JWT and extracts tenant_id
    3. Stores tenant_id in a context variable for use in request handlers
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Import here to avoid circular imports
        from fastapi import Request
        from starlette.middleware.base import BaseHTTPMiddleware

        # Get the authorization header
        headers = dict(scope.get("headers", {}))
        auth_header = headers.get(b"authorization", b"").decode("utf-8")

        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            try:
                payload = jwt.decode(
                    token,
                    settings.jwt_secret_key,
                    algorithms=["HS256"]
                )
                tenant_id = payload.get("tenant_id")
                if tenant_id:
                    set_current_tenant_id(tenant_id)
            except JWTError:
                pass  # No tenant_id in token or invalid token

        # Process the request
        await self.app(scope, receive, send)


async def require_tenant(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))
) -> str:
    """
    FastAPI dependency that requires a valid tenant_id in the JWT.
    
    This dependency:
    1. Validates the JWT token
    2. Extracts the tenant_id
    3. Returns the tenant_id for use in the endpoint
    
    Args:
        credentials: The HTTP Bearer token credentials
        
    Returns:
        The tenant_id from the JWT
        
    Raises:
        HTTPException: If no valid token or no tenant_id in token
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret_key,
            algorithms=["HS256"]
        )
        tenant_id = payload.get("tenant_id")
        
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tenant context",
            )
        
        # Set the tenant context for this request
        set_current_tenant_id(tenant_id)
        
        return tenant_id
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_tenant() -> Optional[str]:
    """
    FastAPI dependency that gets tenant_id if present, but doesn't require it.
    
    Returns:
        The tenant_id if present in JWT, None otherwise
    """
    # This will be implemented with proper JWT handling
    return get_current_tenant_id()
