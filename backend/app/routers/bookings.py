"""
Bookings CRUD API endpoints (9.10).

Implements:
- GET    /api/bookings           - List bookings with pagination
- POST   /api/bookings           - Create a new booking
- GET    /api/bookings/{id}      - Get booking detail
- PUT    /api/bookings/{id}      - Update a booking
- DELETE /api/bookings/{id}      - Delete a booking
- GET    /api/bookings/stats     - Get booking stats
"""

import logging
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func

from ..models.base import get_session_factory
from ..models.booking import Booking
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.bookings import (
    BookingCreateRequest,
    BookingItem,
    BookingListResponse,
    BookingStats,
    BookingUpdateRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/bookings", tags=["bookings"])


def _booking_to_item(b: Booking) -> BookingItem:
    d = b.to_dict()
    return BookingItem(**d)


@router.get("", response_model=BookingListResponse)
async def list_bookings(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    booking_status: Optional[str] = Query(None, alias="status"),
    source_channel: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
) -> BookingListResponse:
    session_factory = get_session_factory()
    async with session_factory() as session:
        query = select(Booking).where(Booking.tenant_id == current_user.tenant_id)
        count_query = select(func.count(Booking.id)).where(Booking.tenant_id == current_user.tenant_id)

        if booking_status:
            query = query.where(Booking.status == booking_status)
            count_query = count_query.where(Booking.status == booking_status)

        if source_channel:
            query = query.where(Booking.source_channel == source_channel)
            count_query = count_query.where(Booking.source_channel == source_channel)

        total_result = await session.execute(count_query)
        total = total_result.scalar() or 0

        offset = (page - 1) * per_page
        query = query.order_by(Booking.updated_at.desc()).offset(offset).limit(per_page)
        result = await session.execute(query)
        bookings = result.scalars().all()

        return BookingListResponse(
            bookings=[_booking_to_item(b) for b in bookings],
            total=total, page=page, per_page=per_page,
        )


@router.get("/stats", response_model=BookingStats)
async def get_booking_stats(
    current_user: User = Depends(get_current_user),
) -> BookingStats:
    session_factory = get_session_factory()
    async with session_factory() as session:
        base = select(func.count(Booking.id)).where(Booking.tenant_id == current_user.tenant_id)
        total = (await session.execute(base)).scalar() or 0
        requested = (await session.execute(base.where(Booking.status == "requested"))).scalar() or 0
        confirmed = (await session.execute(base.where(Booking.status == "confirmed"))).scalar() or 0
        completed = (await session.execute(base.where(Booking.status == "completed"))).scalar() or 0
        cancelled = (await session.execute(base.where(Booking.status == "cancelled"))).scalar() or 0
        return BookingStats(
            total=total, requested=requested, confirmed=confirmed,
            completed=completed, cancelled=cancelled,
        )


@router.post("", response_model=BookingItem, status_code=status.HTTP_201_CREATED)
async def create_booking(
    request: BookingCreateRequest,
    current_user: User = Depends(get_current_user),
) -> BookingItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        now = datetime.utcnow()
        booking = Booking(
            id=str(uuid.uuid4()),
            tenant_id=current_user.tenant_id,
            contact_id=request.contact_id,
            conversation_id=request.conversation_id,
            service=request.service,
            preferred_date=request.preferred_date,
            preferred_time=request.preferred_time,
            status="requested",
            notes=request.notes,
            source_channel=request.source_channel,
            created_at=now,
            updated_at=now,
        )
        session.add(booking)
        await session.commit()
        await session.refresh(booking)
        return _booking_to_item(booking)


@router.get("/{booking_id}", response_model=BookingItem)
async def get_booking(
    booking_id: str,
    current_user: User = Depends(get_current_user),
) -> BookingItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Booking).where(
                Booking.id == booking_id,
                Booking.tenant_id == current_user.tenant_id,
            )
        )
        booking = result.scalar_one_or_none()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        return _booking_to_item(booking)


@router.put("/{booking_id}", response_model=BookingItem)
async def update_booking(
    booking_id: str,
    request: BookingUpdateRequest,
    current_user: User = Depends(get_current_user),
) -> BookingItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Booking).where(
                Booking.id == booking_id,
                Booking.tenant_id == current_user.tenant_id,
            )
        )
        booking = result.scalar_one_or_none()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        update_data = request.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(booking, key, value)
        booking.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(booking)
        return _booking_to_item(booking)


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_booking(
    booking_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Booking).where(
                Booking.id == booking_id,
                Booking.tenant_id == current_user.tenant_id,
            )
        )
        booking = result.scalar_one_or_none()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        await session.delete(booking)
        await session.commit()
