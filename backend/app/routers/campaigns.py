"""
Campaigns CRUD API endpoints (9.9).

Implements:
- GET    /api/campaigns           - List campaigns with pagination
- POST   /api/campaigns           - Create a new campaign
- GET    /api/campaigns/{id}      - Get campaign detail
- PUT    /api/campaigns/{id}      - Update a campaign
- DELETE /api/campaigns/{id}      - Delete a campaign
- POST   /api/campaigns/{id}/send - Send/schedule a campaign
"""

import logging
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func

from ..models.base import get_session_factory
from ..models.campaign import Campaign
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.campaigns import (
    CampaignCreateRequest,
    CampaignItem,
    CampaignListResponse,
    CampaignStats,
    CampaignUpdateRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])


def _campaign_to_item(c: Campaign) -> CampaignItem:
    d = c.to_dict()
    return CampaignItem(**d)


@router.get("", response_model=CampaignListResponse)
async def list_campaigns(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    channel: Optional[str] = Query(None),
    campaign_status: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
) -> CampaignListResponse:
    session_factory = get_session_factory()
    async with session_factory() as session:
        query = select(Campaign).where(Campaign.tenant_id == current_user.tenant_id)
        count_query = select(func.count(Campaign.id)).where(Campaign.tenant_id == current_user.tenant_id)

        if channel:
            query = query.where(Campaign.channel == channel)
            count_query = count_query.where(Campaign.channel == channel)

        if campaign_status:
            query = query.where(Campaign.status == campaign_status)
            count_query = count_query.where(Campaign.status == campaign_status)

        total_result = await session.execute(count_query)
        total = total_result.scalar() or 0

        offset = (page - 1) * per_page
        query = query.order_by(Campaign.updated_at.desc()).offset(offset).limit(per_page)
        result = await session.execute(query)
        campaigns = result.scalars().all()

        return CampaignListResponse(
            campaigns=[_campaign_to_item(c) for c in campaigns],
            total=total, page=page, per_page=per_page,
        )


@router.post("", response_model=CampaignItem, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    request: CampaignCreateRequest,
    current_user: User = Depends(get_current_user),
) -> CampaignItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        now = datetime.utcnow()
        campaign = Campaign(
            id=str(uuid.uuid4()),
            tenant_id=current_user.tenant_id,
            name=request.name,
            channel=request.channel,
            status="draft",
            message_template=request.message_template,
            audience_filter=request.audience_filter,
            created_at=now,
            updated_at=now,
        )
        session.add(campaign)
        await session.commit()
        await session.refresh(campaign)
        return _campaign_to_item(campaign)


@router.get("/stats", response_model=CampaignStats)
async def get_campaign_stats(
    current_user: User = Depends(get_current_user),
) -> CampaignStats:
    session_factory = get_session_factory()
    async with session_factory() as session:
        base = select(func.count(Campaign.id)).where(Campaign.tenant_id == current_user.tenant_id)
        total = (await session.execute(base)).scalar() or 0
        draft = (await session.execute(base.where(Campaign.status == "draft"))).scalar() or 0
        scheduled = (await session.execute(base.where(Campaign.status == "scheduled"))).scalar() or 0
        sending = (await session.execute(base.where(Campaign.status == "sending"))).scalar() or 0
        sent = (await session.execute(base.where(Campaign.status == "sent"))).scalar() or 0
        cancelled = (await session.execute(base.where(Campaign.status == "cancelled"))).scalar() or 0
        return CampaignStats(
            total=total, draft=draft, scheduled=scheduled,
            sending=sending, sent=sent, cancelled=cancelled,
        )


@router.get("/{campaign_id}", response_model=CampaignItem)
async def get_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
) -> CampaignItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Campaign).where(
                Campaign.id == campaign_id,
                Campaign.tenant_id == current_user.tenant_id,
            )
        )
        campaign = result.scalar_one_or_none()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return _campaign_to_item(campaign)


@router.put("/{campaign_id}", response_model=CampaignItem)
async def update_campaign(
    campaign_id: str,
    request: CampaignUpdateRequest,
    current_user: User = Depends(get_current_user),
) -> CampaignItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Campaign).where(
                Campaign.id == campaign_id,
                Campaign.tenant_id == current_user.tenant_id,
            )
        )
        campaign = result.scalar_one_or_none()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        update_data = request.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(campaign, key, value)
        campaign.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(campaign)
        return _campaign_to_item(campaign)


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Campaign).where(
                Campaign.id == campaign_id,
                Campaign.tenant_id == current_user.tenant_id,
            )
        )
        campaign = result.scalar_one_or_none()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        await session.delete(campaign)
        await session.commit()


@router.post("/{campaign_id}/send", response_model=CampaignItem)
async def send_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
) -> CampaignItem:
    """Mark a campaign as sending (stub — real delivery handled by background worker)."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Campaign).where(
                Campaign.id == campaign_id,
                Campaign.tenant_id == current_user.tenant_id,
            )
        )
        campaign = result.scalar_one_or_none()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        if campaign.status not in ("draft", "scheduled"):
            raise HTTPException(status_code=400, detail="Campaign cannot be sent in its current status")

        campaign.status = "sending"
        campaign.sent_at = datetime.utcnow()
        campaign.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(campaign)
        return _campaign_to_item(campaign)
