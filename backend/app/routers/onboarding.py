"""
Onboarding API endpoints for the wizard flow.
"""

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..dependencies.auth import get_current_user
from ..models.base import get_db_session
from ..models.user import User
from ..models.tenant import Tenant, PlanTier
from ..models.chatbot_instance import ChatbotInstance
from ..models.document import Document, DocumentStatus
from ..schemas.onboarding import (
    OnboardingStatusResponse,
    BusinessProfileRequest,
    BusinessProfileResponse,
    PlanSelectionRequest,
    PlanSelectionResponse,
    ChatbotConfigRequest,
    ChatbotConfigResponse,
    StepCompleteRequest,
    StepCompleteResponse,
    SkipStepRequest,
    SkipStepResponse,
    EmbedCodeResponse,
    DocumentStatusResponse,
    PlanInfo,
    PlanTier as PlanTierEnum,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

DEMO_PLANS = [
    PlanInfo(
        tier="starter",
        name="Starter",
        description="Perfect for small businesses just getting started",
        price_monthly=49,
        setup_fee=299,
        features=[
            "500 conversations/month",
            "20 documents",
            "100MB storage",
            "2 channels",
            "Email support",
        ],
        highlighted=False,
    ),
    PlanInfo(
        tier="growth",
        name="Growth",
        description="Most popular for growing businesses",
        price_monthly=99,
        setup_fee=499,
        features=[
            "2,000 conversations/month",
            "50 documents",
            "500MB storage",
            "4 channels",
            "Priority support",
            "1 campaign/month",
        ],
        highlighted=True,
    ),
    PlanInfo(
        tier="pro",
        name="Pro",
        description="For businesses that need it all",
        price_monthly=349,
        setup_fee=1299,
        features=[
            "Unlimited conversations",
            "Unlimited documents",
            "Unlimited storage",
            "All 6 channels",
            "Priority support + monthly call",
            "Unlimited campaigns",
            "White-label option",
        ],
        highlighted=False,
    ),
]


@router.get("/status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    current_user: User = Depends(get_current_user)
) -> OnboardingStatusResponse:
    """
    Get current onboarding status and progress.
    """
    async with get_db_session() as session:
        result = await session.execute(
            select(Tenant).where(Tenant.id == current_user.tenant_id)
        )
        tenant = result.scalar_one_or_none()
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        doc_result = await session.execute(
            select(func.count(Document.id)).where(
                Document.tenant_id == current_user.tenant_id
            )
        )
        total_docs = doc_result.scalar() or 0
        
        ready_result = await session.execute(
            select(func.count(Document.id)).where(
                Document.tenant_id == current_user.tenant_id,
                Document.status == DocumentStatus.READY
            )
        )
        ready_docs = ready_result.scalar() or 0
        
        chatbot_result = await session.execute(
            select(ChatbotInstance).where(
                ChatbotInstance.tenant_id == current_user.tenant_id
            )
        )
        chatbot = chatbot_result.scalar_one_or_none()
        
        return OnboardingStatusResponse(
            current_step=tenant.onboarding_step,
            completed=tenant.onboarding_completed,
            skipped_steps=tenant.skipped_steps or [],
            business_name=tenant.business_name,
            industry=tenant.industry,
            website_url=tenant.website_url,
            plan_tier=tenant.plan_tier.value if tenant.plan_tier else None,
            chatbot_name=chatbot.name if chatbot else None,
            document_count=total_docs,
            ready_document_count=ready_docs,
        )


@router.get("/plans", response_model=list[PlanInfo])
async def get_available_plans():
    """
    Get available subscription plans (demo mode).
    """
    return DEMO_PLANS


@router.put("/profile", response_model=BusinessProfileResponse)
async def update_business_profile(
    request: BusinessProfileRequest,
    current_user: User = Depends(get_current_user)
) -> BusinessProfileResponse:
    """
    Step 1: Update business profile.
    """
    async with get_db_session() as session:
        result = await session.execute(
            select(Tenant).where(Tenant.id == current_user.tenant_id)
        )
        tenant = result.scalar_one_or_none()
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        if request.business_name is not None:
            tenant.business_name = request.business_name
        if request.industry is not None:
            tenant.industry = request.industry
        if request.website_url is not None:
            tenant.website_url = request.website_url
        if request.business_description is not None:
            tenant.business_description = request.business_description
        if request.logo_url is not None:
            tenant.logo_url = request.logo_url
        
        await session.commit()
        
        return BusinessProfileResponse(
            message="Business profile updated successfully",
            business_name=tenant.business_name,
            industry=tenant.industry,
            website_url=tenant.website_url,
            business_description=tenant.business_description,
            logo_url=tenant.logo_url,
        )


@router.put("/plan", response_model=PlanSelectionResponse)
async def select_plan(
    request: PlanSelectionRequest,
    current_user: User = Depends(get_current_user)
) -> PlanSelectionResponse:
    """
    Step 2: Select subscription plan (demo mode - no payment).
    """
    async with get_db_session() as session:
        result = await session.execute(
            select(Tenant).where(Tenant.id == current_user.tenant_id)
        )
        tenant = result.scalar_one_or_none()
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        tenant.plan_tier = PlanTier(request.plan_tier.value)
        
        await session.commit()
        
        return PlanSelectionResponse(
            message=f"Plan '{request.plan_tier.value}' selected successfully",
            plan_tier=request.plan_tier.value,
            trial_days=7,
        )


@router.get("/documents/status", response_model=DocumentStatusResponse)
async def get_document_status(
    current_user: User = Depends(get_current_user)
) -> DocumentStatusResponse:
    """
    Get document processing status for Step 3.
    """
    async with get_db_session() as session:
        result = await session.execute(
            select(func.count(Document.id)).where(
                Document.tenant_id == current_user.tenant_id
            )
        )
        total = result.scalar() or 0
        
        ready_result = await session.execute(
            select(func.count(Document.id)).where(
                Document.tenant_id == current_user.tenant_id,
                Document.status == DocumentStatus.READY
            )
        )
        ready = ready_result.scalar() or 0
        
        processing_result = await session.execute(
            select(func.count(Document.id)).where(
                Document.tenant_id == current_user.tenant_id,
                Document.status == DocumentStatus.PROCESSING
            )
        )
        processing = processing_result.scalar() or 0
        
        failed_result = await session.execute(
            select(func.count(Document.id)).where(
                Document.tenant_id == current_user.tenant_id,
                Document.status == DocumentStatus.FAILED
            )
        )
        failed = failed_result.scalar() or 0
        
        return DocumentStatusResponse(
            total=total,
            ready=ready,
            processing=processing,
            failed=failed,
        )


@router.put("/chatbot", response_model=ChatbotConfigResponse)
async def configure_chatbot(
    request: ChatbotConfigRequest,
    current_user: User = Depends(get_current_user)
) -> ChatbotConfigResponse:
    """
    Step 4: Configure chatbot settings.
    """
    async with get_db_session() as session:
        result = await session.execute(
            select(ChatbotInstance).where(
                ChatbotInstance.tenant_id == current_user.tenant_id
            )
        )
        chatbot = result.scalar_one_or_none()
        
        if not chatbot:
            chatbot = ChatbotInstance(
                id=str(uuid.uuid4()),
                tenant_id=current_user.tenant_id,
                name=request.name or "Aria",
            )
            session.add(chatbot)
        
        if request.name is not None:
            chatbot.name = request.name
        if request.avatar_url is not None:
            chatbot.avatar_url = request.avatar_url
        if request.brand_color is not None:
            chatbot.brand_color = request.brand_color
        if request.secondary_color is not None:
            chatbot.secondary_color = request.secondary_color
        if request.greeting_message is not None:
            chatbot.greeting_message = request.greeting_message
        if request.fallback_message is not None:
            chatbot.fallback_message = request.fallback_message
        
        await session.commit()
        
        return ChatbotConfigResponse(
            message="Chatbot configured successfully",
            chatbot_id=chatbot.id,
            name=chatbot.name,
            brand_color=chatbot.brand_color,
            greeting_message=chatbot.greeting_message,
            fallback_message=chatbot.fallback_message,
        )


@router.post("/complete", response_model=StepCompleteResponse)
async def complete_step(
    request: StepCompleteRequest,
    current_user: User = Depends(get_current_user)
) -> StepCompleteResponse:
    """
    Mark a step as complete and move to next.
    """
    async with get_db_session() as session:
        result = await session.execute(
            select(Tenant).where(Tenant.id == current_user.tenant_id)
        )
        tenant = result.scalar_one_or_none()
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        if request.step == 6:
            tenant.onboarding_completed = True
            tenant.onboarding_step = 6
            await session.commit()
            return StepCompleteResponse(
                message="Onboarding completed!",
                next_step=6,
                completed=True,
            )
        
        tenant.onboarding_step = request.step + 1
        await session.commit()
        
        return StepCompleteResponse(
            message=f"Step {request.step} completed",
            next_step=request.step + 1,
            completed=False,
        )


@router.post("/skip", response_model=SkipStepResponse)
async def skip_step(
    request: SkipStepRequest,
    current_user: User = Depends(get_current_user)
) -> SkipStepResponse:
    """
    Skip an optional step.
    """
    async with get_db_session() as session:
        result = await session.execute(
            select(Tenant).where(Tenant.id == current_user.tenant_id)
        )
        tenant = result.scalar_one_or_none()
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        skipped = tenant.skipped_steps or []
        if request.step not in [s for s in skipped]:
            skipped.append(str(request.step))
            tenant.skipped_steps = skipped
        
        if request.step == 6:
            tenant.onboarding_completed = True
            tenant.onboarding_step = 6
            await session.commit()
            return SkipStepResponse(
                message="Onboarding completed (skipped steps)",
                skipped_step=request.step,
                next_step=6,
            )
        
        tenant.onboarding_step = request.step + 1
        await session.commit()
        
        return SkipStepResponse(
            message=f"Step {request.step} skipped",
            skipped_step=request.step,
            next_step=request.step + 1,
        )


@router.get("/embed-code", response_model=EmbedCodeResponse)
async def get_embed_code(
    current_user: User = Depends(get_current_user)
) -> EmbedCodeResponse:
    """
    Step 6: Get embed code for the chatbot.
    """
    async with get_db_session() as session:
        result = await session.execute(
            select(ChatbotInstance).where(
                ChatbotInstance.tenant_id == current_user.tenant_id
            )
        )
        chatbot = result.scalar_one_or_none()
        
        if not chatbot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chatbot not configured"
            )
        
        embed_code = f'<script src="{settings.widget_url or "https://widget.acmedesk.com/widget.js"}" data-chatbot-id="{chatbot.id}" async></script>'
        
        instructions = {
            "html": {
                "title": "HTML",
                "description": "Add this code before the closing </body> tag",
                "code": embed_code,
            },
            "wordpress": {
                "title": "WordPress",
                "steps": [
                    "Install a header/footer script plugin",
                    "Add the embed code to the header section",
                    "Or use a custom HTML widget in your sidebar",
                ],
                "code": embed_code,
            },
            "shopify": {
                "title": "Shopify",
                "steps": [
                    "Go to Online Store > Themes",
                    "Click Actions > Edit Code",
                    "Open theme.liquid file",
                    "Paste before </body> tag",
                ],
                "code": embed_code,
            },
            "webflow": {
                "title": "Webflow",
                "steps": [
                    "Add an Embed element",
                    "Paste the code",
                    "Publish your site",
                ],
                "code": embed_code,
            },
            "wix": {
                "title": "Wix",
                "steps": [
                    "Go to Settings > Custom Code",
                    "Add custom code",
                    "Choose body start",
                ],
                "code": embed_code,
            },
            "squarespace": {
                "title": "Squarespace",
                "steps": [
                    "Go to Settings > Advanced",
                    "Click Code Injection",
                    "Add to Footer",
                ],
                "code": embed_code,
            },
        }
        
        return EmbedCodeResponse(
            chatbot_id=chatbot.id,
            embed_code=embed_code,
            installation_instructions=instructions,
        )


@router.post("/dismiss-checklist", response_model=dict)
async def dismiss_setup_checklist(
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Permanently dismiss the setup checklist banner.
    """
    async with get_db_session() as session:
        result = await session.execute(
            select(Tenant).where(Tenant.id == current_user.tenant_id)
        )
        tenant = result.scalar_one_or_none()
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        skipped = tenant.skipped_steps or []
        if "checklist" not in skipped:
            skipped.append("checklist")
            tenant.skipped_steps = skipped
        
        await session.commit()
        
        return {"message": "Setup checklist dismissed"}
