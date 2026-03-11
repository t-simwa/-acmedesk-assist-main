"""Background scheduler to refresh Meta user tokens for tenants.

This uses APScheduler to periodically run a job that finds tenants with
stored Meta tokens and calls refresh_user_token_if_needed for each.

The scheduler is started from app.main during startup when enabled via
settings.token_refresh_enabled.
"""
from __future__ import annotations

import logging
from typing import List
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from ..config import settings
from ..models.base import get_db_session
from ..models.channel_config import ChannelConfig
from .meta_token import refresh_user_token_if_needed

logger = logging.getLogger(__name__)


scheduler: AsyncIOScheduler | None = None


async def _refresh_all_tenants() -> None:
    """Find tenants with stored oauth_tokens and attempt refresh."""
    try:
        async with get_db_session() as session:
            stmt = select(ChannelConfig.tenant_id).where(ChannelConfig.oauth_tokens.isnot(None)).distinct()
            res = await session.execute(stmt)
            tenant_rows = res.scalars().all()
    except Exception as e:
        logger.error("Failed to query tenants for token refresh: %s", e)
        return

    for tenant_id in tenant_rows:
        try:
            logger.info("Refreshing Meta tokens for tenant %s", tenant_id)
            await refresh_user_token_if_needed(tenant_id)
        except Exception as e:
            logger.warning("Failed to refresh token for %s: %s", tenant_id, e)


def start_scheduler() -> AsyncIOScheduler:
    global scheduler
    if scheduler is not None:
        return scheduler

    scheduler = AsyncIOScheduler()
    interval = max(60, int(getattr(settings, "token_refresh_interval_seconds", 3600)))
    # Schedule the job to run every `interval` seconds
    scheduler.add_job(_refresh_all_tenants, "interval", seconds=interval, id="meta_token_refresh")
    scheduler.start()
    logger.info("Started token refresh scheduler (interval=%s seconds)", interval)
    return scheduler


def shutdown_scheduler() -> None:
    global scheduler
    if scheduler:
        try:
            scheduler.shutdown(wait=False)
        except Exception:
            pass
        scheduler = None
