"""
Onboarding schemas for the wizard flow.
"""

from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class PlanTier(str, Enum):
    """Plan tier enumeration for demo mode."""
    STARTER = "starter"
    GROWTH = "growth"
    PRO = "pro"
    ENTERPRISE = "enterprise"


INDUSTRY_OPTIONS = [
    "E-commerce",
    "Legal",
    "Real Estate",
    "Healthcare",
    "SaaS",
    "Cleaning/Home Services",
    "Food & Beverage",
    "Retail",
    "Education",
    "Finance",
    "Travel",
    "Other",
]


class OnboardingStatusResponse(BaseModel):
    """Response for getting onboarding status."""
    current_step: int
    completed: bool
    skipped_steps: List[str] = []
    business_name: Optional[str] = None
    industry: Optional[str] = None
    website_url: Optional[str] = None
    plan_tier: Optional[str] = None
    chatbot_name: Optional[str] = None
    document_count: int = 0
    ready_document_count: int = 0


class BusinessProfileRequest(BaseModel):
    """Request for Step 1: Business Profile."""
    business_name: Optional[str] = Field(None, max_length=255)
    industry: Optional[str] = Field(None, max_length=100)
    website_url: Optional[str] = Field(None, max_length=500)
    business_description: Optional[str] = None
    logo_url: Optional[str] = None


class BusinessProfileResponse(BaseModel):
    """Response for Business Profile step."""
    message: str
    business_name: Optional[str] = None
    industry: Optional[str] = None
    website_url: Optional[str] = None
    business_description: Optional[str] = None
    logo_url: Optional[str] = None


class PlanSelectionRequest(BaseModel):
    """Request for Step 2: Plan Selection."""
    plan_tier: PlanTier


class PlanSelectionResponse(BaseModel):
    """Response for Plan Selection step."""
    message: str
    plan_tier: str
    trial_days: int = 7


class ChatbotConfigRequest(BaseModel):
    """Request for Step 4: Chatbot Configuration."""
    name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = None
    brand_color: Optional[str] = Field(None, max_length=7)
    secondary_color: Optional[str] = Field(None, max_length=7)
    greeting_message: Optional[str] = None
    fallback_message: Optional[str] = None


class ChatbotConfigResponse(BaseModel):
    """Response for Chatbot Configuration step."""
    message: str
    chatbot_id: Optional[str] = None
    name: Optional[str] = None
    brand_color: Optional[str] = None
    greeting_message: Optional[str] = None
    fallback_message: Optional[str] = None


class StepCompleteRequest(BaseModel):
    """Request to mark a step as complete."""
    step: int = Field(..., ge=1, le=6)


class StepCompleteResponse(BaseModel):
    """Response for step completion."""
    message: str
    next_step: int
    completed: bool


class SkipStepRequest(BaseModel):
    """Request to skip a step."""
    step: int = Field(..., ge=1, le=6)
    reason: Optional[str] = None


class SkipStepResponse(BaseModel):
    """Response for skipping a step."""
    message: str
    skipped_step: int
    next_step: int


class EmbedCodeResponse(BaseModel):
    """Response for Step 6: Embed Code."""
    chatbot_id: str
    embed_code: str
    installation_instructions: dict


class DocumentStatusResponse(BaseModel):
    """Response for document status check."""
    total: int
    ready: int
    processing: int
    failed: int


class PlanInfo(BaseModel):
    """Plan information for display."""
    tier: str
    name: str
    description: str
    price_monthly: float
    setup_fee: float
    features: List[str]
    highlighted: bool = False
