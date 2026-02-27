"""
Multi-tenancy module for AcmeDesk Assist.

This module provides:
- TenantContextMiddleware: Middleware for extracting tenant_id from JWT
- Tenant context management using contextvars
- Dependencies for FastAPI endpoints
"""

from .context import (
    TenantContextMiddleware,
    clear_tenant_context,
    get_current_tenant_id,
    get_optional_tenant,
    require_tenant,
    set_current_tenant_id,
)

__all__ = [
    "TenantContextMiddleware",
    "clear_tenant_context",
    "get_current_tenant_id",
    "get_optional_tenant",
    "require_tenant",
    "set_current_tenant_id",
]
