"""Notifications API.

Basic tenant-scoped notifications system.
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..models.user import User
from ..routers.auth import get_current_user
from ..services import database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=List[dict])
async def get_notifications(
    unread_only: bool = Query(False, description="Only return unread notifications"),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
) -> List[dict]:
    """Get notifications for the current tenant."""
    tenant_id = current_user.tenant_id or current_user.id
    notifications = await database.get_notifications(tenant_id, limit=limit, unread_only=unread_only)
    return notifications


@router.put("/{notification_id}/read", response_model=dict)
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Mark a single notification as read."""
    tenant_id = current_user.tenant_id or current_user.id
    notification = await database.mark_notification_read(tenant_id, notification_id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return notification


@router.put("/mark-all-read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(current_user: User = Depends(get_current_user)) -> None:
    """Mark all notifications as read."""
    tenant_id = current_user.tenant_id or current_user.id
    await database.mark_all_notifications_read(tenant_id)
    return None
