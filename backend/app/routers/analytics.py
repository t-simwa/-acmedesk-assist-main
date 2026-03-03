"""
Analytics API endpoints.

Implements:
- GET /api/analytics/summary - Get analytics summary
- GET /api/analytics/top-queries - Get top queries with statistics
- GET /api/analytics/leads - Get lead analytics (7.3.6)
- GET /api/analytics/channels - Get channel analytics (7.3.4)
- GET /api/analytics/content - Get content analytics (7.3.5)
- GET /api/analytics/satisfaction - Get satisfaction analytics (7.3.7)
- POST /api/analytics/schedule-report - Schedule report (7.3.1)
"""

import logging
import uuid
from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.analytics import (
    AnalyticsSummaryResponse,
    APIUsageMetrics,
    ConversationCountByDay,
    QuestionCategory,
    TopQuery,
    TopQueriesResponse,
    LeadAnalyticsResponse,
    LeadCountByDay,
    LeadSourceItem,
    ConversionFunnelItem,
    ChannelAnalyticsResponse,
    ChannelConversationItem,
    ContentAnalyticsResponse,
    UnansweredQuestion,
    DocumentUsageItem,
    SatisfactionAnalyticsResponse,
    SatisfactionDataPoint,
    ScheduleReportRequest,
    ScheduleReportResponse,
)
from ..services import database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# In-memory store for scheduled reports (in production, use database)
scheduled_reports: Dict[str, Dict[str, Any]] = {}


@router.get("/summary", response_model=AnalyticsSummaryResponse, status_code=status.HTTP_200_OK)
async def get_analytics_summary(
    days: int = Query(7, ge=1, le=30, description="Number of days to include in conversation counts"),
    current_user: User = Depends(get_current_user),
) -> AnalyticsSummaryResponse:
    """
    Get analytics summary.

    Returns comprehensive analytics including:
    - Total conversations count
    - Total messages count
    - Conversation counts by day (last N days)
    - Resolution rate (resolved via bot vs escalated)
    - Response accuracy metrics
    - Top question categories
    - API usage/costs tracking
    - User satisfaction tracking

    Args:
        days: Number of days to include in conversation counts (default: 7, max: 30)

    Returns:
        AnalyticsSummaryResponse with all analytics metrics

    Raises:
        HTTPException: If there's an error retrieving analytics
    """
    try:
        # Get all metrics in parallel (if possible) or sequentially, filtered by user_id
        user_id = current_user.id
        total_conversations = await database.get_total_conversations(user_id=user_id)
        total_messages = await database.get_total_messages(user_id=user_id)
        conversations_by_day = await database.get_conversations_by_day(days=days, user_id=user_id)
        resolution_rate = await database.get_resolution_rate(user_id=user_id)
        response_accuracy = await database.get_response_accuracy_metrics(user_id=user_id)
        top_categories = await database.get_top_question_categories(limit=5, user_id=user_id)
        api_usage = await database.get_api_usage_metrics(user_id=user_id)
        user_satisfaction = await database.get_user_satisfaction_metrics(user_id=user_id)

        # Format conversations by day
        formatted_conversations_by_day = [
            ConversationCountByDay(date=item["date"], count=item["count"])
            for item in conversations_by_day
        ]

        # Format top categories
        formatted_top_categories = [
            QuestionCategory(category=item["category"], count=item["count"])
            for item in top_categories
        ]

        # Format API usage
        formatted_api_usage = APIUsageMetrics(
            total_requests=api_usage["total_requests"],
            total_tokens_used=api_usage.get("total_tokens_used"),
            estimated_cost=api_usage.get("estimated_cost"),
            last_updated=api_usage["last_updated"],
        )

        logger.info(
            f"Retrieved analytics summary: conversations={total_conversations}, "
            f"messages={total_messages}, days={days}"
        )

        return AnalyticsSummaryResponse(
            total_conversations=total_conversations,
            total_messages=total_messages,
            conversations_by_day=formatted_conversations_by_day,
            resolution_rate=resolution_rate,
            response_accuracy=response_accuracy,
            top_categories=formatted_top_categories,
            api_usage=formatted_api_usage,
            user_satisfaction=user_satisfaction,
        )

    except Exception as e:
        logger.error(f"Error getting analytics summary: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving analytics: {str(e)}",
        )


@router.get("/top-queries", response_model=TopQueriesResponse, status_code=status.HTTP_200_OK)
async def get_top_queries(
    limit: int = Query(10, ge=1, le=100, description="Maximum number of queries to return"),
    current_user: User = Depends(get_current_user),
) -> TopQueriesResponse:
    """
    Get top queries with statistics.

    Returns the top N most frequently asked questions with:
    - Query text
    - Count of occurrences
    - Number of times resolved by bot
    - Percentage of times resolved by bot

    Args:
        limit: Maximum number of queries to return (default: 10, max: 100)

    Returns:
        TopQueriesResponse with top queries and statistics

    Raises:
        HTTPException: If there's an error retrieving top queries
    """
    try:
        queries, total = await database.get_top_queries(limit=limit, user_id=current_user.id)

        # Format queries
        formatted_queries = [
            TopQuery(
                query=item["query"],
                count=item["count"],
                resolved_by_bot=item["resolved_by_bot"],
                resolved_percentage=item["resolved_percentage"],
            )
            for item in queries
        ]

        logger.info(f"Retrieved top queries: total={total}, limit={limit}, returned={len(formatted_queries)}")

        return TopQueriesResponse(
            queries=formatted_queries,
            total=total,
            limit=limit,
        )

    except Exception as e:
        logger.error(f"Error getting top queries: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving top queries: {str(e)}",
        )


# =============================================================================
# Milestone 7.3 - Analytics Page Endpoints
# =============================================================================

@router.get("/leads", response_model=LeadAnalyticsResponse, status_code=status.HTTP_200_OK)
async def get_leads_analytics(
    days: int = Query(30, ge=1, le=90, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
) -> LeadAnalyticsResponse:
    """
    Get lead analytics for 7.3.6 - Lead Analytics Section.
    
    Returns:
        - Total leads in date range
        - Leads over time (line chart data)
        - Lead sources by channel (donut chart data)
        - Conversion funnel (Conversations → Leads → Contacted → Qualified → Converted)
        - Trend vs previous period
    """
    try:
        tenant_id = current_user.tenant_id or current_user.id
        data = await database.get_leads_analytics(tenant_id, days)
        
        logger.info(f"Retrieved lead analytics: total_leads={data['total_leads']}, days={days}")
        
        return LeadAnalyticsResponse(
            total_leads=data["total_leads"],
            leads_by_day=[
                LeadCountByDay(date=item["date"], count=item["count"])
                for item in data["leads_by_day"]
            ],
            lead_sources=[
                LeadSourceItem(
                    channel=item["channel"],
                    count=item["count"],
                    percentage=item["percentage"]
                )
                for item in data["lead_sources"]
            ],
            conversion_funnel=[
                ConversionFunnelItem(
                    stage=item["stage"],
                    count=item["count"],
                    percentage=item["percentage"]
                )
                for item in data["conversion_funnel"]
            ],
            leads_trend=data.get("leads_trend")
        )
        
    except Exception as e:
        logger.error(f"Error getting lead analytics: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving lead analytics: {str(e)}",
        )


@router.get("/channels", response_model=ChannelAnalyticsResponse, status_code=status.HTTP_200_OK)
async def get_channel_analytics(
    current_user: User = Depends(get_current_user),
) -> ChannelAnalyticsResponse:
    """
    Get channel analytics for 7.3.4 - Channel Analytics Section.
    
    Returns:
        - Channel breakdown with conversation counts
        - Resolution rate per channel
        - Average duration per channel
    """
    try:
        tenant_id = current_user.tenant_id or current_user.id
        data = await database.get_channel_analytics(tenant_id)
        
        logger.info(f"Retrieved channel analytics: channels={len(data['channels'])}")
        
        return ChannelAnalyticsResponse(
            channels=[
                ChannelConversationItem(
                    channel=item["channel"],
                    icon=item["icon"],
                    conversations=item["conversations"],
                    resolution_rate=item["resolution_rate"],
                    avg_duration_minutes=item.get("avg_duration_minutes")
                )
                for item in data["channels"]
            ],
            total_conversations=data["total_conversations"]
        )
        
    except Exception as e:
        logger.error(f"Error getting channel analytics: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving channel analytics: {str(e)}",
        )


@router.get("/content", response_model=ContentAnalyticsResponse, status_code=status.HTTP_200_OK)
async def get_content_analytics(
    days: int = Query(30, ge=1, le=90, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
) -> ContentAnalyticsResponse:
    """
    Get content analytics for 7.3.5 - Content Analytics Section.
    
    Returns:
        - Top 10 questions table
        - Unanswered questions table
        - Most referenced documents (bar chart)
        - Underutilized documents
    """
    try:
        tenant_id = current_user.tenant_id or current_user.id
        logger.debug(f"Fetching content analytics for tenant_id={tenant_id}, days={days}")
        data = await database.get_content_analytics(tenant_id, days)
        
        logger.info(f"Retrieved content analytics: top_questions={len(data['top_questions'])}")
        
        return ContentAnalyticsResponse(
            top_questions=[
                TopQuery(
                    query=item["query"],
                    count=item["count"],
                    resolved_by_bot=item["resolved_by_bot"],
                    resolved_percentage=item["resolved_percentage"]
                )
                for item in data["top_questions"]
            ],
            unanswered_questions=[
                UnansweredQuestion(
                    query=item["query"],
                    count=item["count"],
                    last_asked=item["last_asked"]
                )
                for item in data["unanswered_questions"]
            ],
            most_referenced_docs=[
                DocumentUsageItem(
                    document_id=item["document_id"],
                    filename=item["filename"],
                    reference_count=item["reference_count"],
                    last_referenced=item.get("last_referenced")
                )
                for item in data["most_referenced_docs"]
            ],
            underutilized_docs=[
                DocumentUsageItem(
                    document_id=item["document_id"],
                    filename=item["filename"],
                    reference_count=item["reference_count"],
                    last_referenced=item.get("last_referenced")
                )
                for item in data["underutilized_docs"]
            ],
            total_unanswered=data["total_unanswered"]
        )
        
    except Exception as e:
        logger.error(f"Error getting content analytics: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving content analytics",
        )


@router.get("/satisfaction", response_model=SatisfactionAnalyticsResponse, status_code=status.HTTP_200_OK)
async def get_satisfaction_analytics(
    days: int = Query(30, ge=1, le=90, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
) -> SatisfactionAnalyticsResponse:
    """
    Get satisfaction analytics for 7.3.7 - Satisfaction Analytics Section.
    
    Returns:
        - Current satisfaction score
        - Satisfaction over time (line chart data)
        - Total positive/negative feedback counts
        - Trend vs previous period
    """
    try:
        tenant_id = current_user.tenant_id or current_user.id
        data = await database.get_satisfaction_analytics(tenant_id, days)
        
        logger.info(f"Retrieved satisfaction analytics: score={data['current_score']}%")
        
        return SatisfactionAnalyticsResponse(
            current_score=data["current_score"],
            satisfaction_by_day=[
                SatisfactionDataPoint(
                    date=item["date"],
                    score=item["score"],
                    positive=item["positive"],
                    negative=item["negative"]
                )
                for item in data["satisfaction_by_day"]
            ],
            total_positive=data["total_positive"],
            total_negative=data["total_negative"],
            score_trend=data.get("score_trend")
        )
        
    except Exception as e:
        logger.error(f"Error getting satisfaction analytics: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving satisfaction analytics: {str(e)}",
        )


@router.post("/schedule-report", response_model=ScheduleReportResponse, status_code=status.HTTP_201_CREATED)
async def schedule_report(
    request: ScheduleReportRequest,
    current_user: User = Depends(get_current_user),
) -> ScheduleReportResponse:
    """
    Schedule automated analytics report (7.3.1 - Schedule Report button).
    
    Creates a scheduled report that will be sent via email.
    """
    try:
        report_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        scheduled_reports[report_id] = {
            "id": report_id,
            "tenant_id": current_user.tenant_id or current_user.id,
            "frequency": request.frequency,
            "day_of_week": request.day_of_week,
            "day_of_month": request.day_of_month,
            "time": request.time,
            "recipient_email": request.recipient_email,
            "enabled": request.enabled,
            "created_at": now.isoformat() + "Z"
        }
        
        logger.info(f"Created scheduled report: {report_id} for {request.recipient_email}")
        
        return ScheduleReportResponse(
            id=report_id,
            frequency=request.frequency,
            day_of_week=request.day_of_week,
            day_of_month=request.day_of_month,
            time=request.time,
            recipient_email=request.recipient_email,
            enabled=request.enabled,
            created_at=now.isoformat() + "Z"
        )
        
    except Exception as e:
        logger.error(f"Error scheduling report: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while scheduling report: {str(e)}",
        )


@router.get("/schedule-report", status_code=status.HTTP_200_OK)
async def get_scheduled_reports(
    current_user: User = Depends(get_current_user),
) -> list[ScheduleReportResponse]:
    """Get all scheduled reports for the current tenant."""
    tenant_id = current_user.tenant_id or current_user.id
    
    reports = [
        ScheduleReportResponse(
            id=report["id"],
            frequency=report["frequency"],
            day_of_week=report.get("day_of_week"),
            day_of_month=report.get("day_of_month"),
            time=report["time"],
            recipient_email=report["recipient_email"],
            enabled=report["enabled"],
            created_at=report["created_at"]
        )
        for report in scheduled_reports.values()
        if report.get("tenant_id") == tenant_id
    ]
    
    return reports


@router.delete("/schedule-report/{report_id}", status_code=status.HTTP_200_OK)
async def delete_scheduled_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
) -> Dict[str, str]:
    """Delete a scheduled report."""
    tenant_id = current_user.tenant_id or current_user.id
    
    if report_id in scheduled_reports:
        if scheduled_reports[report_id].get("tenant_id") == tenant_id:
            del scheduled_reports[report_id]
            return {"message": "Report schedule deleted"}
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Scheduled report not found"
    )
