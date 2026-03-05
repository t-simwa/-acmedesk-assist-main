"""
Super Admin API endpoints for platform-wide management.

Implements Milestone 10.2 backend surface:
- GET /api/super-admin/dashboard  — Platform overview metrics
- GET /api/super-admin/clients    — Client list for management

These endpoints are protected by super-admin guards and are intentionally
conservative in scope to avoid affecting tenant-facing APIs.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select

from ..models.base import get_db_session
from ..models.tenant import Tenant, SubscriptionStatus
from ..models.plan import Plan
from ..models.user import User
from ..dependencies.auth import require_super_admin


router = APIRouter(prefix="/api/super-admin", tags=["super-admin"])


# ---------------------------------------------------------------------------
# Pydantic response models (kept simple for now)
# ---------------------------------------------------------------------------


class PlatformKpiCard(BaseModel):
    label: str
    value: float
    suffix: str | None = None
    trend: float | None = None


class RecentSignupItem(BaseModel):
    tenant_id: str
    business_name: str
    plan: str | None = None
    created_at: datetime
    status: str


class FailedJobItem(BaseModel):
    id: str
    tenant_name: str
    error: str
    created_at: datetime


class SystemStatusItem(BaseModel):
    name: str
    status: str  # "operational" | "degraded" | "down"
    value: str | None = None


class SuperAdminDashboardResponse(BaseModel):
    cards: List[PlatformKpiCard]
    mrr_last_12_months: List[dict]
    recent_signups: List[RecentSignupItem]
    recent_failed_jobs: List[FailedJobItem]
    system_status: List[SystemStatusItem]


class SuperAdminClientItem(BaseModel):
    id: str
    business_name: str
    owner_email: str | None
    plan: str | None
    status: str
    conversations_this_month: int
    mrr_contribution: float
    join_date: datetime
    last_active: datetime | None


class SuperAdminClientsResponse(BaseModel):
    clients: List[SuperAdminClientItem]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _decimal_to_float(value: Decimal | None) -> float:
    if value is None:
        return 0.0
    try:
        return float(value)
    except Exception:
        return 0.0


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/dashboard",
    response_model=SuperAdminDashboardResponse,
    status_code=status.HTTP_200_OK,
)
async def get_super_admin_dashboard(
    current_user: User = Depends(require_super_admin()),
) -> SuperAdminDashboardResponse:
    """
    Platform overview metrics for `/admin` dashboard (10.2.1).

    Uses existing tenant metadata for realistic counts, and provides
    safe placeholder values where we don't yet track a metric directly.
    """
    # Time ranges
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    prev_month_start = (
        datetime(now.year - 1, 12, 1)
        if now.month == 1
        else datetime(now.year, now.month - 1, 1)
    )

    async with get_db_session() as session:
        # Total active clients
        active_statuses = [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIALING,
        ]
        total_active_clients = await session.scalar(
            select(func.count(Tenant.id)).where(Tenant.subscription_status.in_(active_statuses))
        )

        # New signups this month
        new_signups_this_month = await session.scalar(
            select(func.count(Tenant.id)).where(Tenant.created_at >= month_start)
        )

        # Churned this month
        churned_this_month = await session.scalar(
            select(func.count(Tenant.id)).where(
                Tenant.subscription_status == SubscriptionStatus.CANCELLED,
                Tenant.updated_at >= month_start,
            )
        )

        # Approximate MRR = sum(monthly_price for active tenants)
        mrr_query = (
            select(func.coalesce(func.sum(Plan.monthly_price), 0))
            .select_from(Tenant)
            .join(Plan, Tenant.plan_id == Plan.id, isouter=True)
            .where(Tenant.subscription_status.in_(active_statuses))
        )
        mrr_total: Decimal | None = await session.scalar(mrr_query)
        mrr_total_float = _decimal_to_float(mrr_total)

        # Simple placeholder for conversations this month aggregated
        conversations_this_month = await session.scalar(
            select(func.coalesce(func.sum(Tenant.conversation_count_this_month), 0))
        )

        # Recent signups (last 10 tenants)
        recent_tenants = (
            await session.execute(
                select(Tenant)
                .order_by(Tenant.created_at.desc())
                .limit(10)
            )
        ).scalars().all()

        # For now we don't have a dedicated "failed jobs" table.
        recent_failed_jobs: List[FailedJobItem] = []

        # Build response pieces
        cards: List[PlatformKpiCard] = [
            PlatformKpiCard(label="Total Active Clients", value=float(total_active_clients or 0)),
            PlatformKpiCard(label="Total Conversations (This Month)", value=float(conversations_this_month or 0)),
            PlatformKpiCard(label="Monthly Recurring Revenue", value=mrr_total_float, suffix="USD"),
            PlatformKpiCard(label="New Signups This Month", value=float(new_signups_this_month or 0)),
            PlatformKpiCard(label="Churned This Month", value=float(churned_this_month or 0)),
            # API costs / uptime are placeholders until we wire billing/monitoring
            PlatformKpiCard(label="OpenAI API Costs (This Month)", value=0.0, suffix="USD"),
            PlatformKpiCard(label="Platform Uptime (This Month)", value=99.9, suffix="%"),
        ]

        # Very simple placeholder: last 12 months MRR is flat at current MRR
        mrr_last_12_months: List[dict] = []
        for i in range(11, -1, -1):
            month_date = now - timedelta(days=30 * i)
            mrr_last_12_months.append(
                {
                    "month": month_date.strftime("%Y-%m"),
                    "new_mrr": mrr_total_float if i == 0 else 0.0,
                    "churned_mrr": 0.0,
                    "net_mrr": mrr_total_float if i == 0 else 0.0,
                }
            )

        recent_signups: List[RecentSignupItem] = []
        for tenant in recent_tenants:
            recent_signups.append(
                RecentSignupItem(
                    tenant_id=tenant.id,
                    business_name=tenant.business_name,
                    plan=tenant.plan_tier.value if tenant.plan_tier else None,
                    created_at=tenant.created_at,
                    status=tenant.subscription_status.value,
                )
            )

        system_status: List[SystemStatusItem] = [
            SystemStatusItem(name="API Response Time", status="operational", value="< 300ms"),
            SystemStatusItem(name="Vector DB Health", status="operational", value="Healthy"),
            SystemStatusItem(name="Email Delivery", status="operational", value="99% last 24h"),
            SystemStatusItem(name="OpenAI API", status="operational", value="All regions"),
        ]

        return SuperAdminDashboardResponse(
            cards=cards,
            mrr_last_12_months=mrr_last_12_months,
            recent_signups=recent_signups,
            recent_failed_jobs=recent_failed_jobs,
            system_status=system_status,
        )


@router.get(
    "/clients",
    response_model=SuperAdminClientsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_super_admin_clients(
    current_user: User = Depends(require_super_admin()),
) -> SuperAdminClientsResponse:
    """
    Client management list for `/admin/clients` (10.2.2).

    Returns one row per tenant with basic business and billing information.
    """
    async with get_db_session() as session:
        # Join tenants to plans for MRR
        tenants_with_plan = (
            await session.execute(
                select(Tenant, Plan)
                .join(Plan, Tenant.plan_id == Plan.id, isouter=True)
                .order_by(Tenant.created_at.desc())
            )
        ).all()

        clients: List[SuperAdminClientItem] = []

        for tenant, plan in tenants_with_plan:
            # Best-effort: fetch a single owner user for owner_email and last_active
            owner_email = None
            last_active = None

            owner_row = await session.execute(
                select(User).where(
                    User.tenant_id == tenant.id,
                )
            )
            owner = owner_row.scalars().first()
            if owner:
                owner_email = owner.email
                last_active = owner.last_login_at

            clients.append(
                SuperAdminClientItem(
                    id=tenant.id,
                    business_name=tenant.business_name,
                    owner_email=owner_email,
                    plan=plan.name if plan else None,
                    status=tenant.subscription_status.value,
                    conversations_this_month=tenant.conversation_count_this_month,
                    mrr_contribution=_decimal_to_float(
                        plan.monthly_price if plan else Decimal(0)
                    ),
                    join_date=tenant.created_at,
                    last_active=last_active,
                )
            )

        return SuperAdminClientsResponse(clients=clients)

