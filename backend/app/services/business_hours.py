from __future__ import annotations

from datetime import datetime, time, timedelta
from typing import Optional, Tuple

import pytz

from ..models.chatbot_instance import ChatbotInstance


def parse_time(tstr: str, now: datetime, tz) -> datetime:
    # tstr like '13:00'
    h, m = map(int, tstr.split(":"))
    dt = tz.localize(datetime(now.year, now.month, now.day, h, m))
    return dt


def get_next_open_time(chatbot_config: ChatbotInstance, now: datetime, tz) -> Optional[str]:
    # naive implementation: scan next 7 days
    for i in range(1, 8):
        check = now + timedelta(days=i)
        day = check.strftime("%A").lower()
        hours = chatbot_config.weekly_hours.get(day, {}) if chatbot_config.weekly_hours else {}
        if hours and hours.get("open"):
            open_dt = parse_time(hours["open"], check, tz)
            return open_dt.strftime("%Y-%m-%d %H:%M %Z")
    return None


def is_within_business_hours(
    chatbot_config: ChatbotInstance,
    tenant_timezone: str
) -> Tuple[bool, Optional[str]]:
    """
    Returns (is_open, next_open_time_str).
    """
    if not chatbot_config.business_hours_enabled:
        return True, None

    tz = pytz.timezone(tenant_timezone or "UTC")
    now = datetime.now(tz)

    # Check holiday hours first
    today_str = now.strftime("%Y-%m-%d")
    holiday = next(
        (h for h in (chatbot_config.holiday_hours or []) if h.get("date") == today_str),
        None
    )

    if holiday:
        if not holiday.get("open"):
            next_open = get_next_open_time(chatbot_config, now, tz)
            return False, next_open
        close_time = parse_time(holiday["close_time"], now, tz)
    else:
        day_config = (chatbot_config.weekly_hours or {}).get(now.strftime("%A").lower())
        if not day_config or not day_config.get("open"):
            next_open = get_next_open_time(chatbot_config, now, tz)
            return False, next_open
        open_time = parse_time(day_config["open"], now, tz)
        close_time = parse_time(day_config["close"], now, tz)

    is_open = open_time <= now <= close_time
    next_open = None if is_open else get_next_open_time(chatbot_config, now, tz)
    return is_open, next_open


def get_outside_hours_response(
    chatbot_config: ChatbotInstance,
    next_open: str,
    channel: str,
    behavior: str  # 'continue'|'offline'|'custom'
) -> Tuple[Optional[str], Optional[str]]:
    """
    Returns (message, notice). If message is None, AI should continue but notice may be appended.
    """
    if behavior == "continue":
        notice = f"(Our team is currently offline — back at {next_open}. The AI is still here to help!)"
        return None, notice

    if behavior == "offline":
        msg = chatbot_config.offline_message or ""
        return msg, None

    if behavior == "custom":
        msg = chatbot_config.offline_message or ""
        return msg, None

    return None, None
