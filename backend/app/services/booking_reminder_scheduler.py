"""Background scheduler to send booking reminders.

This is a lightweight scheduler that periodically scans confirmed bookings and sends
reminders (24h and 2h) via the channel the booking originated from.

The scheduler uses the same APScheduler pattern as `token_refresh_scheduler.py`.
"""

import logging
import uuid
from datetime import datetime, date, time, timedelta
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from ..config import settings
from ..models.base import get_session_factory
from ..models.booking import Booking
from ..models.booking_activity import BookingActivity
from ..models.booking_reminder_setting import BookingReminderSetting
from ..services.message_router import _send_channel_response

logger = logging.getLogger(__name__)

scheduler: Optional[AsyncIOScheduler] = None


async def _get_or_create_reminder_setting(session, tenant_id: str) -> BookingReminderSetting:
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


async def _send_reminder(booking: Booking, session) -> None:
    if not booking.source_channel or not booking.contact_id:
        return

    # Build a simple reminder message. In a real system, this would be templated and localized.
    dt = booking.booking_date
    if not dt:
        return

    when = dt.strftime("%Y-%m-%d %H:%M")
    msg = f"Reminder: Your booking is scheduled for {when}."
    try:
        await _send_channel_response(
            booking.source_channel,
            booking.contact_id,
            msg,
            channel=booking.source_channel,
            db=session,
        )
    except Exception as e:
        logger.exception("Failed to send booking reminder for booking %s: %s", booking.id, e)


async def _record_reminder_activity(session, booking: Booking, reminder_type: str) -> None:
    event = BookingActivity(
        id=str(uuid.uuid4()),
        booking_id=booking.id,
        tenant_id=booking.tenant_id,
        type=f"booking.reminder_{reminder_type}",
        message=f"{reminder_type} reminder sent",
    )
    session.add(event)


async def _process_reminders() -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        now = datetime.utcnow()
        # Determine dynamic thresholds
        hours_24 = settings.booking_reminder_24h_hours
        hours_2 = settings.booking_reminder_2h_hours
        window = timedelta(minutes=10)

        # Query bookings that are confirmed and not cancelled/completed
        result = await session.execute(
            select(Booking).where(
                Booking.status == "confirmed",
                Booking.cancelled_at.is_(None),
                Booking.completed_at.is_(None),
            )
        )
        bookings = result.scalars().all()

        tenant_ids = set(b.tenant_id for b in bookings if b.tenant_id)
        tenant_settings: dict[str, BookingReminderSetting] = {}
        for tenant_id in tenant_ids:
            tenant_settings[tenant_id] = await _get_or_create_reminder_setting(session, tenant_id)

        for booking in bookings:
            if not booking.booking_date:
                continue
            tenant_setting = tenant_settings.get(booking.tenant_id)
            if not tenant_setting:
                continue

            booking_dt = booking.booking_date
            # normalize date-only values coming from legacy schema migrations
            if isinstance(booking_dt, date) and not isinstance(booking_dt, datetime):
                booking_dt = datetime.combine(booking_dt, time.min)

            # 24h reminder
            if tenant_setting.enabled_24h and not booking.reminder_24h_sent_at:
                target = booking_dt - timedelta(hours=hours_24)
                if target <= now <= target + window:
                    await _send_reminder(booking, session)
                    booking.reminder_24h_sent_at = now
                    await _record_reminder_activity(session, booking, "24h")

            # 2h reminder
            if tenant_setting.enabled_2h and not booking.reminder_2h_sent_at:
                target = booking_dt - timedelta(hours=hours_2)
                if target <= now <= target + window:
                    await _send_reminder(booking, session)
                    booking.reminder_2h_sent_at = now
                    await _record_reminder_activity(session, booking, "2h")

        await session.commit()


def start_scheduler() -> AsyncIOScheduler:
    global scheduler
    if scheduler is not None:
        return scheduler

    scheduler = AsyncIOScheduler()
    interval = max(60, int(getattr(settings, "booking_reminder_scheduler_interval_seconds", 300)))
    scheduler.add_job(_process_reminders, "interval", seconds=interval, id="booking_reminder_scheduler")
    scheduler.start()
    logger.info("Started booking reminder scheduler (interval=%s seconds)", interval)
    return scheduler


def shutdown_scheduler() -> None:
    global scheduler
    if not scheduler:
        return
    try:
        scheduler.shutdown(wait=False)
    except Exception:
        pass
    scheduler = None
