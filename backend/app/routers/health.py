"""
Health and system status endpoints.

Implements:
- GET /api/health - Basic status check
- GET /api/health/ready - Readiness check (DB, vector DB connectivity)
- GET /api/health/live - Liveness check (uptime, last successful checks)
"""

import time
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, status

from ..config import settings

router = APIRouter(prefix="/api/health", tags=["health"])

# Track application start time for uptime calculation
_app_start_time: Optional[float] = None


def _get_app_start_time() -> float:
    """Get or initialize the application start time."""
    global _app_start_time
    if _app_start_time is None:
        _app_start_time = time.time()
    return _app_start_time


@router.get("")
async def health_check() -> Dict[str, str]:
    """
    Basic health check endpoint.

    Returns a simple status indicating the service is running.
    This is useful for load balancers and monitoring tools.

    Returns:
        Dict with status "ok" and service version.
    """
    return {
        "status": "ok",
        "version": "0.1.0",
        "service": settings.app_name,
    }


@router.get("/ready")
async def readiness_check() -> Dict[str, Any]:
    """
    Readiness check endpoint.

    Checks if the service is ready to accept traffic by verifying:
    - Database connectivity (if configured)
    - Vector database connectivity (if configured)

    Returns:
        Dict with overall readiness status and component checks.
        If DB/vector DB are not configured, they are marked as "not_configured"
        rather than failing.
    """
    checks: Dict[str, Dict[str, str]] = {}
    overall_ready = True

    # Check database connectivity (if configured)
    if settings.database_url:
        # TODO: When database is implemented, add actual connectivity check here
        # For now, we just check if the URL is configured
        checks["database"] = {
            "status": "configured",
            "message": "Database URL is configured (connectivity check not yet implemented)",
        }
    else:
        checks["database"] = {
            "status": "not_configured",
            "message": "Database URL not configured",
        }
        # Not configured is not a failure for readiness in early stages
        overall_ready = True

    # Check vector database connectivity (if configured)
    if settings.vector_db_url:
        # TODO: When vector DB is implemented, add actual connectivity check here
        # For now, we just check if the URL is configured
        checks["vector_db"] = {
            "status": "configured",
            "message": "Vector DB URL is configured (connectivity check not yet implemented)",
        }
    else:
        checks["vector_db"] = {
            "status": "not_configured",
            "message": "Vector DB URL not configured",
        }
        # Not configured is not a failure for readiness in early stages
        overall_ready = True

    response = {
        "status": "ready" if overall_ready else "not_ready",
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    # Return 200 even if some checks are not_configured (early stage)
    # In production, you might want to return 503 if critical services are down
    return response


@router.get("/live")
async def liveness_check() -> Dict[str, Any]:
    """
    Liveness check endpoint.

    Returns uptime information and last successful check timestamps.
    Useful for Kubernetes liveness probes and monitoring.

    Returns:
        Dict with uptime (seconds), start time, and last successful check info.
    """
    start_time = _get_app_start_time()
    current_time = time.time()
    uptime_seconds = int(current_time - start_time)

    # Calculate human-readable uptime
    uptime_days = uptime_seconds // 86400
    uptime_hours = (uptime_seconds % 86400) // 3600
    uptime_minutes = (uptime_seconds % 3600) // 60
    uptime_secs = uptime_seconds % 60

    uptime_str = f"{uptime_days}d {uptime_hours}h {uptime_minutes}m {uptime_secs}s"

    return {
        "status": "alive",
        "uptime_seconds": uptime_seconds,
        "uptime": uptime_str,
        "start_time": datetime.fromtimestamp(start_time).isoformat() + "Z",
        "current_time": datetime.fromtimestamp(current_time).isoformat() + "Z",
        "last_check": datetime.utcnow().isoformat() + "Z",
    }
