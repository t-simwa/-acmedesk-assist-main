"""
Billing and Stripe integration endpoints for onboarding checkout flow.

Implements:
- POST /api/billing/create-checkout-session  — create Stripe Checkout Session for selected plan
- POST /webhooks/stripe                      — Stripe webhook handler for subscription events
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func

from ..config import settings
from ..dependencies.auth import get_current_user
from ..models.base import get_db_session
from ..models.plan import Plan
from ..models.tenant import PlanTier, SubscriptionStatus, Tenant
from ..models.user import User
from ..services.email import email_service

logger = logging.getLogger(__name__)


# Configure Stripe SDK if credentials are available
if settings.stripe_secret_key:
  stripe.api_key = settings.stripe_secret_key
else:
  logger.info("Stripe secret key not configured. Billing endpoints will be disabled (optional feature).")


class CheckoutSessionRequest(BaseModel):
    """Payload for creating a Stripe Checkout session."""

    plan_tier: str = Field(..., description="Selected plan tier (starter | growth | pro | enterprise)")


class CheckoutSessionResponse(BaseModel):
    """Response containing the Checkout session URL."""

    checkout_url: str


router = APIRouter(tags=["billing"])


def _map_plan_tier_to_name(plan_tier: str) -> str:
    """Map plan tier slug to human-friendly plan name used in Plan.name."""
    mapping = {
        "starter": "Starter",
        "growth": "Growth",
        "pro": "Pro",
        "enterprise": "Enterprise",
    }
    return mapping.get(plan_tier.lower(), plan_tier.capitalize())


@router.post(
    "/api/billing/create-checkout-session",
    response_model=CheckoutSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_checkout_session(
    payload: CheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
) -> CheckoutSessionResponse:
    """
    Create a Stripe Checkout Session for onboarding Step 2 (Choose Plan).

    - Validates requested plan tier
    - Looks up corresponding Plan record and Stripe Price ID
    - Creates a Stripe-hosted Checkout Session in subscription mode
    - Attaches tenant and plan metadata for webhook handling
    """
    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe is not configured for this environment.",
        )

    plan_tier_slug = payload.plan_tier.lower()
    if plan_tier_slug not in {"starter", "growth", "pro", "enterprise"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan tier selected.",
        )

    async with get_db_session() as session:
        # Load tenant for current user
        tenant_result = await session.execute(
            select(Tenant).where(Tenant.id == current_user.tenant_id)
        )
        tenant = tenant_result.scalar_one_or_none()

        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found.",
            )

        # Find Plan by name (Starter/Growth/Pro/Enterprise) as per spec
        plan_name = _map_plan_tier_to_name(plan_tier_slug)
        plan_result = await session.execute(
            select(Plan).where(func.lower(Plan.name) == func.lower(plan_name))
        )
        plan: Optional[Plan] = plan_result.scalar_one_or_none()

        if not plan or not plan.stripe_price_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected plan is not configured for billing yet. Please contact support.",
            )

        metadata: Dict[str, str] = {
            "tenant_id": tenant.id,
            "plan_id": plan.id,
            "plan_tier": plan_tier_slug,
        }

        success_url = f"{settings.frontend_origin}/onboarding?step=3&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{settings.frontend_origin}/onboarding?step=2&canceled=1"

    # Create Stripe Checkout session in a thread to avoid blocking the event loop
    try:
        checkout_session = await asyncio.to_thread(
            stripe.checkout.Session.create,
            mode="subscription",
            line_items=[
                {
                    "price": plan.stripe_price_id,
                    "quantity": 1,
                }
            ],
            success_url=success_url,
            cancel_url=cancel_url,
            customer=tenant.stripe_customer_id or None,
            customer_email=None if tenant.stripe_customer_id else current_user.email,
            metadata=metadata,
        )
    except stripe.error.StripeError as exc:  # type: ignore[attr-defined]
        logger.error("Error creating Stripe Checkout Session: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to start checkout. Please try again in a moment.",
        ) from exc

    return CheckoutSessionResponse(checkout_url=checkout_session.url)  # type: ignore[no-any-return]


async def _handle_checkout_session_completed(session_obj: Dict[str, Any]) -> None:
    """
    Handle checkout.session.completed event.

    - Attach Stripe customer and subscription IDs to tenant
    - Update tenant plan_id/plan_tier and subscription_status
    - Reset monthly conversation counter
    - Send payment confirmation email to tenant owner
    """
    metadata = session_obj.get("metadata") or {}
    tenant_id = metadata.get("tenant_id")
    plan_id = metadata.get("plan_id")
    plan_tier_slug = metadata.get("plan_tier")

    if not tenant_id:
        logger.warning("Stripe checkout.session.completed received without tenant_id metadata.")
        return

    async with get_db_session() as session:
        tenant_result = await session.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        tenant = tenant_result.scalar_one_or_none()

        if not tenant:
            logger.error("Tenant %s not found for checkout.session.completed", tenant_id)
            return

        plan: Optional[Plan] = None
        if plan_id:
            plan_result = await session.execute(select(Plan).where(Plan.id == plan_id))
            plan = plan_result.scalar_one_or_none()

        # Update tenant billing fields
        tenant.stripe_customer_id = session_obj.get("customer") or tenant.stripe_customer_id
        tenant.stripe_subscription_id = session_obj.get("subscription") or tenant.stripe_subscription_id
        tenant.subscription_status = SubscriptionStatus.ACTIVE

        if plan:
            tenant.plan_id = plan.id

        if plan_tier_slug:
            try:
                tenant.plan_tier = PlanTier(plan_tier_slug)
            except ValueError:
                logger.warning("Unknown plan tier '%s' in webhook metadata", plan_tier_slug)

        tenant.conversation_count_this_month = 0

        # Ensure onboarding progresses past the billing step
        if tenant.onboarding_step < 3:
            tenant.onboarding_step = 3

        # Choose the earliest-created user for this tenant as billing contact
        user_result = await session.execute(
            select(User).where(User.tenant_id == tenant.id).order_by(User.created_at.asc())
        )
        owner = user_result.scalars().first()

        await session.commit()

    # Send payment confirmation email outside transaction
    if owner:
        amount_total = session_obj.get("amount_total") or 0
        currency = (session_obj.get("currency") or "usd").upper()
        amount_display = float(amount_total) / 100 if amount_total else 0.0

        try:
            await email_service.send_payment_success_email(
                to_email=owner.email,
                user_name=getattr(owner, "full_name", None),
                amount=amount_display,
                currency=currency,
                plan_name=plan.name if plan else _map_plan_tier_to_name(plan_tier_slug or ""),
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to send payment success email for tenant %s: %s", tenant_id, exc)


async def _handle_invoice_payment_failed(invoice_obj: Dict[str, Any]) -> None:
    """
    Handle invoice.payment_failed event.

    - Mark tenant subscription_status as PAST_DUE
    - Notify tenant owner via email
    """
    customer_id = invoice_obj.get("customer")
    if not customer_id:
        logger.warning("invoice.payment_failed without customer id")
        return

    async with get_db_session() as session:
        tenant_result = await session.execute(
            select(Tenant).where(Tenant.stripe_customer_id == customer_id)
        )
        tenant = tenant_result.scalar_one_or_none()

        if not tenant:
            logger.error("No tenant found for Stripe customer %s on payment_failed", customer_id)
            return

        tenant.subscription_status = SubscriptionStatus.PAST_DUE

        user_result = await session.execute(
            select(User).where(User.tenant_id == tenant.id).order_by(User.created_at.asc())
        )
        owner = user_result.scalars().first()

        await session.commit()

    if owner:
        amount_due = invoice_obj.get("amount_due") or 0
        currency = (invoice_obj.get("currency") or "usd").upper()
        amount_display = float(amount_due) / 100 if amount_due else 0.0

        try:
            await email_service.send_payment_failed_email(
                to_email=owner.email,
                user_name=getattr(owner, "full_name", None),
                amount=amount_display,
                currency=currency,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to send payment failure email for tenant %s: %s", tenant.id, exc)


@router.post("/webhooks/stripe", status_code=status.HTTP_200_OK)
async def stripe_webhook(request: Request) -> Dict[str, bool]:
    """
    Stripe webhook endpoint for billing events.

    Currently handles:
    - checkout.session.completed
    - invoice.payment_failed
    """
    if not settings.stripe_webhook_secret:
        logger.error("Stripe webhook secret not configured; rejecting webhook call.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe webhooks are not configured.",
        )

    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")

    try:
        event = stripe.Webhook.construct_event(  # type: ignore[attr-defined]
            payload=payload,
            sig_header=sig_header,
            secret=settings.stripe_webhook_secret,
        )
    except ValueError as exc:  # Invalid payload
        logger.warning("Invalid Stripe webhook payload: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload.",
        ) from exc
    except stripe.error.SignatureVerificationError as exc:  # type: ignore[attr-defined]
        logger.warning("Invalid Stripe webhook signature: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature.",
        ) from exc

    event_type = event.get("type")
    data_object = event.get("data", {}).get("object") or {}

    if event_type == "checkout.session.completed":
        await _handle_checkout_session_completed(data_object)
    elif event_type == "invoice.payment_failed":
        await _handle_invoice_payment_failed(data_object)
    else:
        logger.info("Unhandled Stripe event type: %s", event_type)

    return {"received": True}

