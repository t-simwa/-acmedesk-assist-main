"""
Dashboard API endpoints for the client dashboard overview page.

Implements:
- GET /api/dashboard/summary - Get all dashboard metrics with date range
- GET /api/dashboard/recent-conversations - Get last 5 conversations
- GET /api/dashboard/recent-leads - Get last 5 leads
- GET /api/dashboard/chatbot-status - Get chatbot live/paused status
- GET /api/dashboard/unanswered-count - Get count of unanswered questions
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel

from ..models.user import User
from ..models.conversation import Conversation, Channel, ConversationStatus, ConversationOutcome
from ..models.lead import Lead, LeadStatus
from ..models.chatbot_instance import ChatbotInstance, ChatbotStatus
from ..routers.auth import get_current_user
from ..services import database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class DateRangeFilter(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    preset: Optional[str] = None  # "today", "7days", "30days", "custom"


class KPIMetric(BaseModel):
    label: str
    value: int
    trend: Optional[float] = None
    trend_direction: Optional[str] = None  # "up", "down", "neutral"


class ConversationVolumeData(BaseModel):
    date: str
    count: int


class ConversationOutcomeData(BaseModel):
    outcome: str
    count: int
    percentage: float


class ChannelData(BaseModel):
    channel: str
    count: int
    icon: str


class RecentConversationItem(BaseModel):
    id: str
    channel: str
    contact_name: str
    first_message: str
    status: str
    time_ago: str


class RecentLeadItem(BaseModel):
    id: str
    name: str
    email: str
    channel: str
    status: str
    time_ago: str


class ChatbotStatusResponse(BaseModel):
    status: str  # "live", "paused", "not_installed"
    last_active: Optional[str] = None
    embed_code: Optional[str] = None
    chatbot_name: Optional[str] = None


class Announcement(BaseModel):
    id: str
    type: str
    message: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class DashboardSummary(BaseModel):
    # KPI Metrics
    total_conversations: int
    leads_captured: int
    resolution_rate: float
    avg_response_time: str
    
    # Trends
    conversations_trend: Optional[float] = None
    leads_trend: Optional[float] = None
    resolution_trend: Optional[float] = None
    response_time_trend: Optional[float] = None
    
    # Charts Data
    conversation_volume: List[ConversationVolumeData]
    conversation_outcomes: List[ConversationOutcomeData]
    channel_breakdown: List[ChannelData]
    
    # Recent Items
    recent_conversations: List[RecentConversationItem]
    recent_leads: List[RecentLeadItem]
    
    # Alerts
    unanswered_count: int
    chatbot_status: ChatbotStatusResponse
    announcement: Optional[Announcement] = None


# ============================================================================
# Helper Functions
# ============================================================================

def calculate_trend(current: float, previous: float) -> tuple[float, str]:
    """Calculate trend percentage and direction."""
    if previous == 0:
        return 0.0, "neutral"
    
    change = ((current - previous) / previous) * 100
    direction = "up" if change > 0 else "down" if change < 0 else "neutral"
    return round(change, 1), direction


def get_date_range(preset: str = "7days") -> tuple[datetime, datetime]:
    """Get date range from preset."""
    end_date = datetime.utcnow()
    start_date = end_date
    
    if preset == "today":
        start_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif preset == "7days":
        start_date = end_date - timedelta(days=7)
    elif preset == "30days":
        start_date = end_date - timedelta(days=30)
    elif preset == "90days":
        start_date = end_date - timedelta(days=90)
    
    return start_date, end_date


def get_previous_date_range(preset: str = "7days") -> tuple[datetime, datetime]:
    """Get previous date range for trend comparison."""
    end_date = datetime.utcnow()
    
    if preset == "today":
        start_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
        prev_end = start_date - timedelta(seconds=1)
        prev_start = prev_end.replace(hour=0, minute=0, second=0, microsecond=0)
        return prev_start, prev_end
    elif preset == "7days":
        start_date = end_date - timedelta(days=7)
        prev_end = start_date - timedelta(seconds=1)
        prev_start = prev_end - timedelta(days=7)
        return prev_start, prev_end
    elif preset == "30days":
        start_date = end_date - timedelta(days=30)
        prev_end = start_date - timedelta(seconds=1)
        prev_start = prev_end - timedelta(days=30)
        return prev_start, prev_end
    elif preset == "90days":
        start_date = end_date - timedelta(days=90)
        prev_end = start_date - timedelta(seconds=1)
        prev_start = prev_end - timedelta(days=90)
        return prev_start, prev_end
    
    # Default fallback
    start_date = end_date - timedelta(days=7)
    return start_date, end_date


def format_time_ago(dt: Optional[datetime]) -> str:
    """Format datetime as relative time string. Handles None and timezone-aware datetimes."""
    if dt is None:
        return "—"
    now = datetime.utcnow()
    # Normalize to naive UTC for subtraction (SQLite returns naive; avoid tz mismatch)
    if getattr(dt, "tzinfo", None) is not None:
        dt = dt.replace(tzinfo=None) if dt.tzinfo else dt
    try:
        diff = now - dt
    except TypeError:
        return "—"
    if diff.days > 30:
        return f"{diff.days // 30}mo ago"
    elif diff.days > 0:
        return f"{diff.days}d ago"
    elif diff.seconds >= 3600:
        return f"{diff.seconds // 3600}h ago"
    elif diff.seconds >= 60:
        return f"{diff.seconds // 60}m ago"
    else:
        return "just now"


def format_response_time(ms: Optional[float]) -> str:
    """Format response time in human-readable format. Handles None."""
    if ms is None:
        return "—"
    if ms < 1000:
        return f"{int(ms)}ms"
    else:
        seconds = ms / 1000
        return f"{seconds:.1f}s"


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    preset: str = Query("7days", description="Date range preset: today, 7days, 30days"),
    start_date: Optional[str] = Query(None, description="Custom start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="Custom end date (ISO format)"),
    current_user: User = Depends(get_current_user),
) -> DashboardSummary:
    """
    Get comprehensive dashboard summary with all metrics.
    
    Returns:
        DashboardSummary with KPIs, charts data, recent items, and alerts
    """
    logger.info("Dashboard summary requested (preset=%s)", preset)
    try:
        tenant_id = current_user.tenant_id or current_user.id
        if not tenant_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No tenant_id for user")

        # Determine date range
        if start_date and end_date:
            try:
                start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
                end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            except ValueError:
                start, end = get_date_range(preset)
        else:
            start, end = get_date_range(preset)
        
        # Get previous period for trends
        prev_start, prev_end = get_previous_date_range(preset)
        
        # ========== KPI Metrics ==========
        # Use same count-by-date-range as conversations page; avoid get_admin_conversation_list for summary.
        total_conversations = await database.get_conversations_count_by_date_range(
            tenant_id, start, end, user_id=current_user.id
        )
        prev_conversations = await database.get_conversations_count_by_date_range(
            tenant_id, prev_start, prev_end, user_id=current_user.id
        )
        conversations_trend, _ = calculate_trend(total_conversations, prev_conversations)
        
        # Leads captured
        leads_captured = await database.get_leads_count_by_date_range(tenant_id, start, end, user_id=current_user.id)
        prev_leads = await database.get_leads_count_by_date_range(tenant_id, prev_start, prev_end, user_id=current_user.id)
        leads_trend, _ = calculate_trend(leads_captured, prev_leads)
        
        # Resolution rate
        resolution_rate = await database.get_resolution_rate_by_date_range(tenant_id, start, end, user_id=current_user.id)
        prev_resolution = await database.get_resolution_rate_by_date_range(tenant_id, prev_start, prev_end, user_id=current_user.id)
        resolution_trend, _ = calculate_trend(resolution_rate, prev_resolution)
        
        # Average response time
        avg_response_time_ms = await database.get_avg_response_time(tenant_id, start, end)
        avg_response_time = format_response_time(avg_response_time_ms)
        
        prev_avg_response = await database.get_avg_response_time(tenant_id, prev_start, prev_end)
        if prev_avg_response > 0:
            response_time_trend = round(((avg_response_time_ms - prev_avg_response) / prev_avg_response) * 100, 1)
        else:
            response_time_trend = 0.0
        
        # ========== Charts Data ==========
        
        # Conversation volume by day
        volume_data = await database.get_conversations_by_date_range(tenant_id, start, end, user_id=current_user.id)
        conversation_volume = [
            ConversationVolumeData(date=item["date"], count=item["count"])
            for item in volume_data
        ]
        
        # Conversation outcomes
        outcomes = await database.get_conversation_outcomes(tenant_id, start, end, user_id=current_user.id)
        total_outcomes = sum(o["count"] for o in outcomes)
        conversation_outcomes = [
            ConversationOutcomeData(
                outcome=o["outcome"],
                count=o["count"],
                percentage=round((o["count"] / total_outcomes * 100) if total_outcomes > 0 else 0, 1)
            )
            for o in outcomes
        ]
        
        # Channel breakdown
        channels = await database.get_conversations_by_channel(tenant_id, start, end, user_id=current_user.id)
        channel_icons = {
            "web": "🌐",
            "whatsapp": "💬",
            "instagram": "📸",
            "facebook": "📘",
            "email": "📧",
            "sms": "📱"
        }
        channel_breakdown = [
            ChannelData(
                channel=c["channel"],
                count=c["count"],
                icon=channel_icons.get(c["channel"], "💬")
            )
            for c in channels
        ]
        
        # ========== Recent Items ==========
        
        # Recent conversations
        recent_convs = await database.get_recent_conversations(tenant_id, limit=5, user_id=current_user.id)
        recent_conversations = [
            RecentConversationItem(
                id=conv["id"],
                channel=conv.get("channel", "web"),
                contact_name=conv.get("contact_name") or "Anonymous",
                first_message=((conv.get("first_message") or "")[:50] + "...") if (conv.get("first_message") or "").strip() else "No message",
                status=conv.get("status", "active"),
                time_ago=format_time_ago(conv.get("started_at"))
            )
            for conv in recent_convs
        ]
        
        # Recent leads
        recent_leads = await database.get_recent_leads(tenant_id, limit=5, user_id=current_user.id)
        recent_leads_list = [
            RecentLeadItem(
                id=lead["id"],
                name=lead.get("name") or "Unknown",
                email=lead.get("email") or "",
                channel=lead.get("source_channel") or "web",
                status=lead.get("status", "new"),
                time_ago=format_time_ago(lead.get("created_at"))
            )
            for lead in recent_leads
        ]
        
        # ========== Alerts ==========
        
        # Unanswered questions
        unanswered_count = await database.get_unanswered_questions_count(tenant_id, start, end, user_id=current_user.id)
        
        # Chatbot status (build response model explicitly for validation)
        chatbot_status_raw = await database.get_chatbot_status(tenant_id)
        chatbot_status = ChatbotStatusResponse(
            status=str(chatbot_status_raw.get("status", "not_installed")),
            last_active=chatbot_status_raw.get("last_active"),
            embed_code=chatbot_status_raw.get("embed_code"),
            chatbot_name=chatbot_status_raw.get("chatbot_name"),
        )

        # Announcement banner (optional)
        announcement_raw = await database.get_announcement()
        announcement = Announcement(**announcement_raw) if announcement_raw else None
        
        return DashboardSummary(
            total_conversations=total_conversations,
            leads_captured=leads_captured,
            resolution_rate=round(resolution_rate, 1),
            avg_response_time=avg_response_time,
            conversations_trend=conversations_trend,
            leads_trend=leads_trend,
            resolution_trend=resolution_trend,
            response_time_trend=response_time_trend,
            conversation_volume=conversation_volume,
            conversation_outcomes=conversation_outcomes,
            channel_breakdown=channel_breakdown,
            recent_conversations=recent_conversations,
            recent_leads=recent_leads_list,
            unanswered_count=unanswered_count,
            chatbot_status=chatbot_status,
            announcement=announcement
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error("Error getting dashboard summary: %s", e, exc_info=True)
        # Return full traceback in detail temporarily to aid debugging locally
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load dashboard data: {tb}"
        )


@router.get("/recent-conversations")
async def get_recent_conversations(
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
) -> List[RecentConversationItem]:
    """Get recent conversations for the dashboard."""
    try:
        tenant_id = current_user.tenant_id or current_user.id
        recent_convs = await database.get_recent_conversations(tenant_id, limit=limit, user_id=current_user.id)
        
        return [
            RecentConversationItem(
                id=conv["id"],
                channel=conv["channel"],
                contact_name=conv.get("contact_name", "Anonymous"),
                first_message=conv.get("first_message", "")[:50] + "..." if conv.get("first_message") else "No message",
                status=conv["status"],
                time_ago=format_time_ago(conv["started_at"])
            )
            for conv in recent_convs
        ]
    except Exception as e:
        logger.error(f"Error getting recent conversations: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load conversations: {str(e)}"
        )


@router.get("/recent-leads")
async def get_recent_leads(
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
) -> List[RecentLeadItem]:
    """Get recent leads for the dashboard."""
    try:
        tenant_id = current_user.tenant_id or current_user.id
        recent_leads = await database.get_recent_leads(tenant_id, limit=limit, user_id=current_user.id)
        
        return [
            RecentLeadItem(
                id=lead["id"],
                name=lead.get("name", "Unknown"),
                email=lead.get("email", ""),
                channel=lead.get("source_channel", "web"),
                status=lead["status"],
                time_ago=format_time_ago(lead["created_at"])
            )
            for lead in recent_leads
        ]
    except Exception as e:
        logger.error(f"Error getting recent leads: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load leads: {str(e)}"
        )


@router.get("/chatbot-status", response_model=ChatbotStatusResponse)
async def get_chatbot_status(
    current_user: User = Depends(get_current_user),
) -> ChatbotStatusResponse:
    """Get chatbot status (live/paused/not_installed) for the dashboard."""
    try:
        tenant_id = current_user.tenant_id or current_user.id
        return await database.get_chatbot_status(tenant_id)
    except Exception as e:
        logger.error(f"Error getting chatbot status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load chatbot status: {str(e)}"
        )


@router.get("/unanswered-count")
async def get_unanswered_count(
    preset: str = Query("7days", description="Date range preset: today, 7days, 30days"),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Get count of unanswered questions for the dashboard alert."""
    try:
        tenant_id = current_user.tenant_id or current_user.id
        start, end = get_date_range(preset)
        
        count = await database.get_unanswered_questions_count(tenant_id, start, end, user_id=current_user.id)
        
        return {"unanswered_count": count}
    except Exception as e:
        logger.error(f"Error getting unanswered count: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load unanswered count: {str(e)}"
        )
