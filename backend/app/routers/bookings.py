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

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status, WebSocket, WebSocketDisconnect
from sqlalchemy import select, func, or_, desc, asc

from ..models.base import get_session_factory
from ..models.booking import Booking
from ..models.booking_note import BookingNote
from ..models.booking_activity import BookingActivity
from ..models.contact import Contact
from ..models.service import Service
from ..models.user import User
from ..routers.auth import get_current_user
from ..services.message_router import _send_channel_response
from ..schemas.bookings import (
    BookingActivityResponse,
    BookingActivityItem,
    BookingCreateNoteRequest,
    BookingCreateRequest,
    BookingItem,
    BookingListResponse,
    BookingNoteItem,
    BookingNotesResponse,
    BookingStats,
    BookingUpdateRequest,
    BookingConfirmRequest,
    BookingCancelRequest,
    BookingCompleteRequest,
    BookingRescheduleRequest,
    BookingSendReminderRequest,
    BookingReminderSettingsResponse,
    BookingReminderSettingsUpdateRequest,
    BookingBulkRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/bookings", tags=["bookings"])

# Simple in-memory pubsub for websocket clients. This is intentionally lightweight and
# only intended to provide real-time refresh hints; it does not persist state.
active_websockets: List[WebSocket] = []


async def broadcast_booking_event(event: Dict[str, Any]) -> None:
    payload = json.dumps(event)
    for ws in active_websockets[:]:
        try:
            await ws.send_text(payload)
        except Exception:
            try:
                active_websockets.remove(ws)
            except ValueError:
                pass


def _booking_to_item(b: Booking, contact: Optional[Contact] = None, service: Optional[Service] = None) -> BookingItem:
    d = b.to_dict()
    if contact:
        # Keep minimal contact data for list/detail display
        d["contact"] = contact.to_dict()
    if service:
        d["service_obj"] = {
            "id": service.id,
            "tenant_id": service.tenant_id,
            "name": service.name,
            "description": service.description,
            "duration_minutes": service.duration_minutes,
            "default_price": float(service.default_price) if service.default_price is not None else None,
            "currency": service.currency,
            "created_at": service.created_at.isoformat() + "Z" if service.created_at else None,
            "updated_at": service.updated_at.isoformat() + "Z" if service.updated_at else None,
        }
    return BookingItem(**d)


async def _get_booking(session, booking_id: str, tenant_id: str) -> Booking:
    result = await session.execute(
        select(Booking).where(
            Booking.id == booking_id,
            Booking.tenant_id == tenant_id,
            Booking.deleted_at.is_(None),
        )
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


async def _get_or_create_reminder_settings(session, tenant_id: str):
    from ..models.booking_reminder_setting import BookingReminderSetting

    result = await session.execute(
        select(BookingReminderSetting).where(BookingReminderSetting.tenant_id == tenant_id)
    )
    setting = result.scalar_one_or_none()
    if setting:
        return setting

    setting = BookingReminderSetting(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        enabled_24h=True,
        enabled_2h=True,
        enabled_manual=True,
    )
    session.add(setting)
    await session.commit()
    await session.refresh(setting)
    return setting


def _format_ics_datetime(dt: datetime) -> str:
    return dt.strftime("%Y%m%dT%H%M%SZ")


async def _log_booking_activity(session, booking: Booking, type: str, message: str | None = None, details: dict | None = None) -> None:
    event = BookingActivity(
        id=str(uuid.uuid4()),
        booking_id=booking.id,
        tenant_id=booking.tenant_id,
        type=type,
        message=message,
        details=json.dumps(details) if details is not None else None,
    )
    session.add(event)


async def _send_booking_notification(session, booking: Booking, message: str, channel: Optional[str] = None) -> None:
    """Send a notification to the user via the booking's originating channel."""
    if not booking.source_channel or not booking.contact_id:
        return
    try:
        await _send_channel_response(
            channel or booking.source_channel,
            booking.contact_id,
            message,
            channel=channel or booking.source_channel,
            db=session,
        )
    except Exception as e:
        logger.exception("Failed to send booking notification: %s", e)


async def _booking_activity(session, booking: Booking) -> List[Dict[str, str]]:
    # Prefer persisted activity if available
    result = await session.execute(
        select(BookingActivity)
        .where(
            BookingActivity.booking_id == booking.id,
            BookingActivity.tenant_id == booking.tenant_id,
        )
        .order_by(BookingActivity.created_at.asc())
    )
    events = []
    for a in result.scalars().all():
        events.append({
            "timestamp": a.created_at.isoformat() + "Z",
            "type": a.type,
            "message": a.message or "",
        })
    if events:
        return events

    # Fallback (derived from booking timestamps)
    if booking.created_at:
        events.append({"timestamp": booking.created_at.isoformat() + "Z", "type": "created", "message": "Booking created"})
    if booking.confirmed_at:
        events.append({"timestamp": booking.confirmed_at.isoformat() + "Z", "type": "confirmed", "message": "Booking confirmed"})
    if booking.completed_at:
        events.append({"timestamp": booking.completed_at.isoformat() + "Z", "type": "completed", "message": "Booking completed"})
    if booking.cancelled_at:
        events.append({"timestamp": booking.cancelled_at.isoformat() + "Z", "type": "cancelled", "message": f"Booking cancelled ({booking.cancellation_reason or 'no reason'})"})
    if booking.reminder_manual_sent_at:
        events.append({"timestamp": booking.reminder_manual_sent_at.isoformat() + "Z", "type": "reminder_manual", "message": "Manual reminder sent"})
    if booking.reminder_24h_sent_at:
        events.append({"timestamp": booking.reminder_24h_sent_at.isoformat() + "Z", "type": "reminder_24h", "message": "24h reminder sent"})
    if booking.reminder_2h_sent_at:
        events.append({"timestamp": booking.reminder_2h_sent_at.isoformat() + "Z", "type": "reminder_2h", "message": "2h reminder sent"})
    # Sort events chronologically
    events.sort(key=lambda e: e["timestamp"])
    return events


@router.get("/{booking_id}/activity", response_model=BookingActivityResponse)
async def booking_activity(
    booking_id: str,
    current_user: User = Depends(get_current_user),
) -> BookingActivityResponse:
    session_factory = get_session_factory()
    async with session_factory() as session:
        booking = await _get_booking(session, booking_id, current_user.tenant_id)
        events = await _booking_activity(session, booking)
        return BookingActivityResponse(events=events)


@router.get("/{booking_id}/notes", response_model=BookingNotesResponse)
async def booking_notes(
    booking_id: str,
    current_user: User = Depends(get_current_user),
) -> BookingNotesResponse:
    session_factory = get_session_factory()
    async with session_factory() as session:
        await _get_booking(session, booking_id, current_user.tenant_id)
        result = await session.execute(
            select(BookingNote)
            .where(
                BookingNote.booking_id == booking_id,
                BookingNote.tenant_id == current_user.tenant_id,
            )
            .order_by(BookingNote.created_at.desc())
        )
        notes = result.scalars().all()
        return BookingNotesResponse(notes=[
            {
                "id": n.id,
                "booking_id": n.booking_id,
                "tenant_id": n.tenant_id,
                "user_id": n.user_id,
                "content": n.content,
                "created_at": n.created_at.isoformat() + "Z" if n.created_at else None,
                "updated_at": n.updated_at.isoformat() + "Z" if n.updated_at else None,
            }
            for n in notes
        ])


@router.post("/{booking_id}/notes", response_model=BookingNoteItem)
async def add_booking_note(
    booking_id: str,
    request: BookingCreateNoteRequest,
    current_user: User = Depends(get_current_user),
) -> BookingNoteItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        booking = await _get_booking(session, booking_id, current_user.tenant_id)
        note = BookingNote(
            id=str(uuid.uuid4()),
            booking_id=booking.id,
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            content=request.content,
        )
        session.add(note)
        await session.commit()
        await session.refresh(note)
        await _log_booking_activity(session, booking, "booking.note", "Note added")
        return BookingNoteItem(
            id=note.id,
            booking_id=note.booking_id,
            tenant_id=note.tenant_id,
            user_id=note.user_id,
            content=note.content,
            created_at=note.created_at.isoformat() + "Z" if note.created_at else None,
            updated_at=note.updated_at.isoformat() + "Z" if note.updated_at else None,
        )


@router.websocket("/ws")
async def booking_updates_ws(websocket: WebSocket):
    await websocket.accept()
    active_websockets.append(websocket)
    try:
        while True:
            # Keep connection alive; clients may send pings.
            await websocket.receive_text()
    except WebSocketDisconnect:
        try:
            active_websockets.remove(websocket)
        except ValueError:
            pass


@router.get("", response_model=BookingListResponse)
async def list_bookings(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    booking_status: Optional[str] = Query(None, alias="status"),
    source_channel: Optional[str] = Query(None),
    service_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
) -> BookingListResponse:
    session_factory = get_session_factory()
    async with session_factory() as session:
        query = (
            select(Booking, Contact, Service)
            .outerjoin(Contact, (Booking.contact_id == Contact.id) & (Contact.tenant_id == current_user.tenant_id))
            .outerjoin(Service, (Booking.service_id == Service.id) & (Service.tenant_id == current_user.tenant_id))
            .where(Booking.tenant_id == current_user.tenant_id)
        )
        count_query = select(func.count(Booking.id)).where(Booking.tenant_id == current_user.tenant_id)

        if booking_status:
            query = query.where(Booking.status == booking_status)
            count_query = count_query.where(Booking.status == booking_status)

        if source_channel:
            query = query.where(Booking.source_channel == source_channel)
            count_query = count_query.where(Booking.source_channel == source_channel)

        if service_id:
            query = query.where(Booking.service_id == service_id)
            count_query = count_query.where(Booking.service_id == service_id)

        if search:
            search_like = f"%{search}%"
            search_clause = or_(
                Booking.service.ilike(search_like),
                Booking.notes.ilike(search_like),
                Contact.full_name.ilike(search_like),
                Contact.email.ilike(search_like),
                Contact.phone.ilike(search_like),
            )
            query = query.where(search_clause)
            count_query = count_query.where(search_clause)

        total_result = await session.execute(count_query)
        total = total_result.scalar() or 0

        if sort == "date_asc":
            query = query.order_by(Booking.booking_date.asc(), Booking.booking_time.asc())
        elif sort == "date_desc":
            query = query.order_by(Booking.booking_date.desc(), Booking.booking_time.desc())
        elif sort == "service":
            query = query.order_by(Booking.service.asc())
        elif sort == "status":
            query = query.order_by(Booking.status.asc())
        else:
            query = query.order_by(Booking.updated_at.desc())

        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page)
        result = await session.execute(query)
        rows = result.all()

        bookings = [
            _booking_to_item(booking, contact, service)
            for booking, contact, service in rows
        ]

        return BookingListResponse(
            bookings=bookings,
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

        # today count (bookings with booking_date == today)
        from datetime import date
        today = date.today().isoformat()
        today_count = (await session.execute(
            base.where(Booking.booking_date == today)
        )).scalar() or 0

        # revenue = sum of actual_value for completed bookings
        revenue = (await session.execute(
            select(func.coalesce(func.sum(Booking.actual_value), 0)).where(
                Booking.tenant_id == current_user.tenant_id,
                Booking.status == "completed",
            )
        )).scalar() or 0.0

        return BookingStats(
            total=total, requested=requested, confirmed=confirmed,
            completed=completed, cancelled=cancelled,
            today=today_count,
            revenue=float(revenue),
        )


@router.get("/reminder-settings", response_model=BookingReminderSettingsResponse)
async def get_booking_reminder_settings(
    current_user: User = Depends(get_current_user),
) -> BookingReminderSettingsResponse:
    session_factory = get_session_factory()
    async with session_factory() as session:
        setting = await _get_or_create_reminder_settings(session, current_user.tenant_id)
        return BookingReminderSettingsResponse(
            enabled_24h=setting.enabled_24h,
            enabled_2h=setting.enabled_2h,
            enabled_manual=setting.enabled_manual,
        )


@router.put("/reminder-settings", response_model=BookingReminderSettingsResponse)
async def update_booking_reminder_settings(
    request: BookingReminderSettingsUpdateRequest,
    current_user: User = Depends(get_current_user),
) -> BookingReminderSettingsResponse:
    session_factory = get_session_factory()
    async with session_factory() as session:
        setting = await _get_or_create_reminder_settings(session, current_user.tenant_id)
        if request.enabled_24h is not None:
            setting.enabled_24h = request.enabled_24h
        if request.enabled_2h is not None:
            setting.enabled_2h = request.enabled_2h
        if request.enabled_manual is not None:
            setting.enabled_manual = request.enabled_manual
        await session.commit()
        await session.refresh(setting)
        return BookingReminderSettingsResponse(
            enabled_24h=setting.enabled_24h,
            enabled_2h=setting.enabled_2h,
            enabled_manual=setting.enabled_manual,
        )


@router.post("", response_model=BookingItem, status_code=status.HTTP_201_CREATED)
async def create_booking(
    request: BookingCreateRequest,
    current_user: User = Depends(get_current_user),
) -> BookingItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        now = datetime.utcnow()
        booking_date = None
        if request.booking_date:
            try:
                booking_date = datetime.fromisoformat(request.booking_date)
            except Exception:
                booking_date = None

        booking = Booking(
            id=str(uuid.uuid4()),
            tenant_id=current_user.tenant_id,
            contact_id=request.contact_id,
            conversation_id=request.conversation_id,
            service=request.service,
            service_id=request.service_id,
            service_details=request.service_details,
            location=request.location,
            special_requests=request.special_requests,
            booking_date=booking_date,
            booking_time=request.booking_time,
            duration_minutes=request.duration_minutes,
            status="requested",
            booking_value=request.booking_value,
            currency=request.currency or "KES",
            assigned_to=request.assigned_to,
            notes=request.notes,
            source_channel=request.source_channel,
            created_at=now,
            updated_at=now,
        )
        session.add(booking)
        await session.commit()
        await session.refresh(booking)
        await broadcast_booking_event({
            "type": "booking.created",
            "booking_id": booking.id,
            "status": booking.status.value if booking.status else None,
            "tenant_id": booking.tenant_id,
        })
        return _booking_to_item(booking)


@router.get("/{booking_id}", response_model=BookingItem)
async def get_booking(
    booking_id: str,
    current_user: User = Depends(get_current_user),
) -> BookingItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Booking, Contact, Service)
            .outerjoin(Contact, (Booking.contact_id == Contact.id) & (Contact.tenant_id == current_user.tenant_id))
            .outerjoin(Service, (Booking.service_id == Service.id) & (Service.tenant_id == current_user.tenant_id))
            .where(
                Booking.id == booking_id,
                Booking.tenant_id == current_user.tenant_id,
            )
        )
        row = result.one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Booking not found")
        booking, contact, service = row
        return _booking_to_item(booking, contact, service)


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
        if "booking_date" in update_data and update_data.get("booking_date"):
            try:
                update_data["booking_date"] = datetime.fromisoformat(update_data["booking_date"])
            except Exception:
                update_data["booking_date"] = None
        for key, value in update_data.items():
            setattr(booking, key, value)
        booking.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(booking)
        await broadcast_booking_event({
            "type": "booking.updated",
            "booking_id": booking.id,
            "status": booking.status.value if booking.status else None,
            "tenant_id": booking.tenant_id,
        })
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


@router.post("/{booking_id}/confirm", response_model=BookingItem)
async def confirm_booking(
    booking_id: str,
    request: BookingConfirmRequest,
    current_user: User = Depends(get_current_user),
) -> BookingItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        booking = await _get_booking(session, booking_id, current_user.tenant_id)
        booking.status = "confirmed"
        booking.confirmed_at = datetime.utcnow()
        booking.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(booking)

        if request.send_notification:
            msg = request.message or f"Your booking for {booking.booking_date or 'the scheduled time'} has been confirmed."
            await _send_booking_notification(session, booking, msg, channel=request.channel)
        await _log_booking_activity(session, booking, "booking.confirmed", "Booking confirmed")
        await broadcast_booking_event({
            "type": "booking.confirmed",
            "booking_id": booking.id,
            "status": booking.status.value if booking.status else None,
            "tenant_id": booking.tenant_id,
        })
        return _booking_to_item(booking)


@router.post("/{booking_id}/cancel", response_model=BookingItem)
async def cancel_booking(
    booking_id: str,
    request: BookingCancelRequest,
    current_user: User = Depends(get_current_user),
) -> BookingItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        booking = await _get_booking(session, booking_id, current_user.tenant_id)
        booking.status = "cancelled"
        booking.cancelled_at = datetime.utcnow()
        booking.cancellation_reason = request.reason
        booking.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(booking)

        if request.send_notification:
            msg = request.message or f"Your booking has been cancelled. Reason: {request.reason or 'No reason provided'}."
            await _send_booking_notification(session, booking, msg, channel=request.channel)
        if request.internal_note:
            logger.info("Internal note for booking %s: %s", booking_id, request.internal_note)
        await _log_booking_activity(session, booking, "booking.cancelled", f"Booking cancelled ({request.reason or 'no reason'})")
        await broadcast_booking_event({
            "type": "booking.cancelled",
            "booking_id": booking.id,
            "status": booking.status.value if booking.status else None,
            "tenant_id": booking.tenant_id,
        })
        return _booking_to_item(booking)


@router.post("/{booking_id}/complete", response_model=BookingItem)
async def complete_booking(
    booking_id: str,
    request: BookingCompleteRequest,
    current_user: User = Depends(get_current_user),
) -> BookingItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        booking = await _get_booking(session, booking_id, current_user.tenant_id)
        booking.status = "completed"
        booking.completed_at = datetime.utcnow()
        if request.actual_value is not None:
            booking.actual_value = request.actual_value
        booking.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(booking)
        await _log_booking_activity(session, booking, "booking.completed", "Booking completed")
        await broadcast_booking_event({
            "type": "booking.completed",
            "booking_id": booking.id,
            "status": booking.status.value if booking.status else None,
            "tenant_id": booking.tenant_id,
        })
        return _booking_to_item(booking)


@router.patch("/{booking_id}/reschedule", response_model=BookingItem)
async def reschedule_booking(
    booking_id: str,
    request: BookingRescheduleRequest,
    current_user: User = Depends(get_current_user),
) -> BookingItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        booking = await _get_booking(session, booking_id, current_user.tenant_id)
        booking.booking_date = request.new_date
        booking.booking_time = request.new_time
        booking.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(booking)
        if request.send_notification:
            msg = request.message or f"Your booking has been rescheduled to {request.new_date} at {request.new_time}."
            await _send_booking_notification(session, booking, msg, channel=request.channel)
        await _log_booking_activity(session, booking, "booking.rescheduled", f"Booking rescheduled to {request.new_date} {request.new_time}")
        await broadcast_booking_event({
            "type": "booking.rescheduled",
            "booking_id": booking.id,
            "status": booking.status.value if booking.status else None,
            "tenant_id": booking.tenant_id,
        })
        return _booking_to_item(booking)


@router.post("/{booking_id}/send-reminder", response_model=BookingItem)
async def send_reminder(
    booking_id: str,
    request: BookingSendReminderRequest,
    current_user: User = Depends(get_current_user),
) -> BookingItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        booking = await _get_booking(session, booking_id, current_user.tenant_id)
        booking.reminder_manual_sent_at = datetime.utcnow()
        booking.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(booking)
        msg = request.message or f"Reminder: Your booking is scheduled for {booking.booking_date or 'the scheduled time'}."
        await _send_booking_notification(session, booking, msg, channel=request.channel)
        await _log_booking_activity(session, booking, "booking.reminder_sent", "Manual reminder sent")
        await broadcast_booking_event({
            "type": "booking.reminder_sent",
            "booking_id": booking.id,
            "status": booking.status.value if booking.status else None,
            "tenant_id": booking.tenant_id,
        })
        return _booking_to_item(booking)


@router.post("/bulk", response_model=dict)
async def bulk_bookings_action(
    request: BookingBulkRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    session_factory = get_session_factory()
    async with session_factory() as session:
        processed = 0
        failed = 0
        for bid in request.booking_ids[:50]:
            try:
                booking = await _get_booking(session, bid, current_user.tenant_id)
                if request.action == "confirm":
                    booking.status = "confirmed"
                    booking.confirmed_at = datetime.utcnow()
                elif request.action == "complete":
                    booking.status = "completed"
                    booking.completed_at = datetime.utcnow()
                elif request.action == "cancel":
                    booking.status = "cancelled"
                    booking.cancelled_at = datetime.utcnow()
                else:
                    continue
                booking.updated_at = datetime.utcnow()
                processed += 1
            except Exception:
                failed += 1
        await session.commit()
        # Record a bulk action event; associate with the first booking if available for lookup
        if request.booking_ids:
            try:
                booking_for_log = await _get_booking(session, request.booking_ids[0], current_user.tenant_id)
                await _log_booking_activity(
                    session,
                    booking_for_log,
                    "booking.bulk",
                    f"Bulk action: {request.action}",
                    {"ids": request.booking_ids[:50]},
                )
            except Exception:
                pass

        await broadcast_booking_event({
            "type": "booking.bulk",
            "booking_ids": request.booking_ids[:50],
            "action": request.action,
            "processed": processed,
            "failed": failed,
            "tenant_id": current_user.tenant_id,
        })
        return {"processed": processed, "failed": failed}


@router.get("/calendar")
async def calendar_view(
    start_date: str = Query(...),
    end_date: str = Query(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    session_factory = get_session_factory()
    async with session_factory() as session:
        query = select(Booking).where(
            Booking.tenant_id == current_user.tenant_id,
            Booking.deleted_at.is_(None),
            Booking.booking_date >= start_date,
            Booking.booking_date <= end_date,
        )
        result = await session.execute(query)
        bookings = result.scalars().all()

        summary_by_date: dict = {}
        for b in bookings:
            date_key = b.booking_date.isoformat() if b.booking_date else ""
            entry = summary_by_date.setdefault(date_key, {"count": 0, "statuses": {}, "total_value": 0})
            entry["count"] += 1
            entry["statuses"][b.status.value if b.status else ""] = entry["statuses"].get(b.status.value if b.status else "", 0) + 1
            if b.booking_value:
                entry["total_value"] += float(b.booking_value)
        return {"bookings": [_booking_to_item(b) for b in bookings], "summary_by_date": summary_by_date}


@router.get("/export/ics")
async def export_ics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
) -> Response:
    session_factory = get_session_factory()
    async with session_factory() as session:
        query = select(Booking).where(
            Booking.tenant_id == current_user.tenant_id,
            Booking.deleted_at.is_(None),
        )
        if start_date:
            query = query.where(Booking.booking_date >= start_date)
        if end_date:
            query = query.where(Booking.booking_date <= end_date)
        result = await session.execute(query)
        bookings = result.scalars().all()

        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//NexaChat//Bookings//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
        ]
        for b in bookings:
            if not b.booking_date or not b.booking_time:
                continue
            try:
                dtstart = datetime.fromisoformat(f"{b.booking_date}T{b.booking_time}")
            except Exception:
                continue
            dtend = dtstart
            if b.duration_minutes:
                from datetime import timedelta

                dtend = dtstart + timedelta(minutes=b.duration_minutes)
            uid = f"{b.id}@nexachat"
            lines.extend([
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{_format_ics_datetime(datetime.utcnow())}",
                f"DTSTART:{_format_ics_datetime(dtstart)}",
                f"DTEND:{_format_ics_datetime(dtend)}",
                f"SUMMARY:{b.service}",
                f"DESCRIPTION:{b.notes or ''}",
                "END:VEVENT",
            ])
        lines.append("END:VCALENDAR")
        body = "\r\n".join(lines)
        return Response(content=body, media_type="text/calendar", headers={
            "Content-Disposition": "attachment; filename=bookings.ics",
        })


@router.get("/export/csv")
async def export_csv(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    service_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
) -> Response:
    session_factory = get_session_factory()
    async with session_factory() as session:
        query = (
            select(Booking, Contact)
            .outerjoin(Contact, (Booking.contact_id == Contact.id) & (Contact.tenant_id == current_user.tenant_id))
            .where(
                Booking.tenant_id == current_user.tenant_id,
                Booking.deleted_at.is_(None),
            )
        )
        if start_date:
            query = query.where(Booking.booking_date >= start_date)
        if end_date:
            query = query.where(Booking.booking_date <= end_date)
        if status:
            query = query.where(Booking.status == status)
        if service_id:
            query = query.where(Booking.service_id == service_id)

        result = await session.execute(query)
        rows = result.all()

        lines = [
            "id,booking_date,booking_time,service,contact_id,contact_name,status,booking_value,currency,notes",
        ]
        for booking, contact in rows:
            lines.append(
                ",".join([
                    booking.id,
                    booking.booking_date or "",
                    booking.booking_time or "",
                    (booking.service or "").replace(",", " "),
                    booking.contact_id or "",
                    (contact.full_name if contact else "") or "",
                    booking.status or "",
                    str(booking.booking_value or ""),
                    booking.currency or "",
                    (booking.notes or "").replace(",", " "),
                ])
            )
        body = "\r\n".join(lines)
        return Response(content=body, media_type="text/csv", headers={
            "Content-Disposition": "attachment; filename=bookings.csv",
        })
