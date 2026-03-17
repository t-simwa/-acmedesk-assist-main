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
from datetime import datetime, timedelta
from io import BytesIO
from typing import Dict, Any, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    REPORTLAB_AVAILABLE = True
except ImportError:  # pragma: no cover
    REPORTLAB_AVAILABLE = False

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
    ShareReportRequest,
    ShareReportResponse,
)
from ..services import database


def _parse_date_range(
    range: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
) -> Tuple[datetime, datetime, Optional[datetime], Optional[datetime]]:
    """Parse a date range selector into absolute UTC start/end datetimes.

    Returns (start, end, compare_start, compare_end).
    """
    now = datetime.utcnow()

    range = (range or "").lower()
    start = None
    end = now

    if range in ("today", "1d"):
        start = datetime(now.year, now.month, now.day)
        end = now
    elif range in ("7d", "7days", "last7days"):
        start = now - timedelta(days=7)
    elif range in ("30d", "30days", "last30days"):
        start = now - timedelta(days=30)
    elif range in ("90d", "90days", "last90days"):
        start = now - timedelta(days=90)
    elif range in ("custom",):
        if from_date and to_date:
            try:
                start = datetime.fromisoformat(from_date.replace("Z", "+00:00")).replace(tzinfo=None)
                end = datetime.fromisoformat(to_date.replace("Z", "+00:00")).replace(tzinfo=None)
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid from/to date format")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Custom range requires from/to parameters")
    else:
        # Default to last 30 days
        start = now - timedelta(days=30)

    # Ensure start <= end
    if start > end:
        start, end = end, start

    # Compute compare period (previous period of same length)
    duration = end - start
    compare_end = start
    compare_start = start - duration

    return start, end, compare_start, compare_end

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# NOTE: Scheduled reports are persisted in the database via the Settings table.
# This avoids losing schedules when the service restarts.


@router.get("/summary", response_model=AnalyticsSummaryResponse, status_code=status.HTTP_200_OK)
async def get_analytics_summary(
    range: str = Query("30d", description="Date range (today, 7d, 30d, 90d, custom)"),
    from_date: Optional[str] = Query(None, description="Custom range start date (ISO 8601)"),
    to_date: Optional[str] = Query(None, description="Custom range end date (ISO 8601)"),
    compare: bool = Query(False, description="Whether to include previous period comparison"),
    current_user: User = Depends(get_current_user),
) -> AnalyticsSummaryResponse:
    """Get analytics summary.

    Supports time ranges and optional comparison to the previous period.
    """
    try:
        user_id = current_user.id
        start, end, compare_start, compare_end = _parse_date_range(range, from_date, to_date)

        # Current period metrics
        summary = await database.get_analytics_summary_range(start, end, user_id=user_id)

        compare_summary = None
        compare_period = None
        if compare:
            compare_summary = await database.get_analytics_summary_range(compare_start, compare_end, user_id=user_id)
            compare_period = {"from": compare_start.isoformat() + "Z", "to": compare_end.isoformat() + "Z"}

        period = {"from": start.isoformat() + "Z", "to": end.isoformat() + "Z"}

        logger.info(
            f"Retrieved analytics summary: period={period} compare={compare} user={user_id}"
        )

        # Build response
        response = AnalyticsSummaryResponse(
            total_conversations=summary["total_conversations"],
            total_messages=summary["total_messages"],
            conversations_by_day=[
                ConversationCountByDay(date=item["date"], count=item["count"])
                for item in summary["conversations_by_day"]
            ],
            resolution_rate=summary["resolution_rate"],
            response_accuracy=summary.get("response_accuracy", {}),
            top_categories=[
                QuestionCategory(category=item["category"], count=item["count"])
                for item in summary.get("top_categories", [])
            ],
            api_usage=APIUsageMetrics(**summary.get("api_usage", {})),
            user_satisfaction=summary.get("user_satisfaction", {}),
            period=period,
            compare_period=compare_period,
            compare_summary=compare_summary,
        )

        return response

    except HTTPException:
        raise
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
    range: str = Query("30d", description="Date range (today, 7d, 30d, 90d, custom)"),
    from_date: Optional[str] = Query(None, description="Custom range start date (ISO 8601)"),
    to_date: Optional[str] = Query(None, description="Custom range end date (ISO 8601)"),
    compare: bool = Query(False, description="Whether to include previous period comparison"),
    current_user: User = Depends(get_current_user),
) -> LeadAnalyticsResponse:
    """Get lead analytics for 7.3.6 - Lead Analytics Section."""
    try:
        tenant_id = current_user.tenant_id or current_user.id
        start, end, compare_start, compare_end = _parse_date_range(range, from_date, to_date)

        data = await database.get_leads_analytics(tenant_id, start_date=start, end_date=end, user_id=current_user.id)

        compare_data = None
        compare_period = None
        if compare:
            compare_data = await database.get_leads_analytics(tenant_id, start_date=compare_start, end_date=compare_end, user_id=current_user.id)
            compare_period = {"from": compare_start.isoformat() + "Z", "to": compare_end.isoformat() + "Z"}

        period = {"from": start.isoformat() + "Z", "to": end.isoformat() + "Z"}

        logger.info(f"Retrieved lead analytics: total_leads={data['total_leads']}, period={period}")

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
                    percentage=item["percentage"],
                )
                for item in data["lead_sources"]
            ],
            conversion_funnel=[
                ConversionFunnelItem(
                    stage=item["stage"],
                    count=item["count"],
                    percentage=item["percentage"],
                )
                for item in data["conversion_funnel"]
            ],
            leads_trend=data.get("leads_trend"),
            period=period,
            compare_period=compare_period,
            compare_data=compare_data,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting lead analytics: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving lead analytics: {str(e)}",
        )


@router.get("/channels", response_model=ChannelAnalyticsResponse, status_code=status.HTTP_200_OK)
async def get_channel_analytics(
    range: str = Query("30d", description="Date range (today, 7d, 30d, 90d, custom)"),
    from_date: Optional[str] = Query(None, description="Custom range start date (ISO 8601)"),
    to_date: Optional[str] = Query(None, description="Custom range end date (ISO 8601)"),
    current_user: User = Depends(get_current_user),
) -> ChannelAnalyticsResponse:
    """Get channel analytics for 7.3.4 - Channel Analytics Section."""
    try:
        tenant_id = current_user.tenant_id or current_user.id
        start, end, _, _ = _parse_date_range(range, from_date, to_date)
        data = await database.get_channel_analytics(tenant_id, start_date=start, end_date=end)

        logger.info(f"Retrieved channel analytics: channels={len(data['channels'])}")

        return ChannelAnalyticsResponse(
            channels=[
                ChannelConversationItem(
                    channel=item["channel"],
                    icon=item["icon"],
                    conversations=item["conversations"],
                    resolution_rate=item["resolution_rate"],
                    avg_duration_minutes=item.get("avg_duration_minutes"),
                )
                for item in data["channels"]
            ],
            total_conversations=data["total_conversations"],
        )

    except Exception as e:
        logger.error(f"Error getting channel analytics: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving channel analytics: {str(e)}",
        )


@router.get("/content", response_model=ContentAnalyticsResponse, status_code=status.HTTP_200_OK)
async def get_content_analytics(
    range: str = Query("30d", description="Date range (today, 7d, 30d, 90d, custom)"),
    from_date: Optional[str] = Query(None, description="Custom range start date (ISO 8601)"),
    to_date: Optional[str] = Query(None, description="Custom range end date (ISO 8601)"),
    current_user: User = Depends(get_current_user),
) -> ContentAnalyticsResponse:
    """Get content analytics for 7.3.5 - Content Analytics Section."""
    try:
        tenant_id = current_user.tenant_id or current_user.id
        start, end, _, _ = _parse_date_range(range, from_date, to_date)
        logger.debug(f"Fetching content analytics for tenant_id={tenant_id}, range={range}")
        data = await database.get_content_analytics(tenant_id, start_date=start, end_date=end)
        
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
    range: str = Query("30d", description="Date range (today, 7d, 30d, 90d, custom)"),
    from_date: Optional[str] = Query(None, description="Custom range start date (ISO 8601)"),
    to_date: Optional[str] = Query(None, description="Custom range end date (ISO 8601)"),
    current_user: User = Depends(get_current_user),
) -> SatisfactionAnalyticsResponse:
    """Get satisfaction analytics for 7.3.7 - Satisfaction Analytics Section."""
    try:
        tenant_id = current_user.tenant_id or current_user.id
        start, end, _, _ = _parse_date_range(range, from_date, to_date)
        data = await database.get_satisfaction_analytics(tenant_id, start_date=start, end_date=end)
        
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
        tenant_id = current_user.tenant_id or current_user.id

        report = {
            "id": report_id,
            "tenant_id": tenant_id,
            "frequency": request.frequency,
            "day_of_week": request.day_of_week,
            "day_of_month": request.day_of_month,
            "time": request.time,
            "recipient_email": request.recipient_email,
            "enabled": request.enabled,
            "created_at": now.isoformat() + "Z",
        }

        await database.save_scheduled_report(tenant_id, report)

        logger.info(f"Created scheduled report: {report_id} for {request.recipient_email}")

        return ScheduleReportResponse(**report)

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

    reports = await database.get_scheduled_reports(tenant_id)

    return [
        ScheduleReportResponse(
            id=report["id"],
            frequency=report["frequency"],
            day_of_week=report.get("day_of_week"),
            day_of_month=report.get("day_of_month"),
            time=report["time"],
            recipient_email=report["recipient_email"],
            enabled=report["enabled"],
            created_at=report["created_at"],
        )
        for report in reports
    ]


@router.delete("/schedule-report/{report_id}", status_code=status.HTTP_200_OK)
async def delete_scheduled_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
) -> Dict[str, str]:
    """Delete a scheduled report."""
    tenant_id = current_user.tenant_id or current_user.id

    deleted = await database.delete_scheduled_report(tenant_id, report_id)
    if deleted:
        return {"message": "Report schedule deleted"}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Scheduled report not found",
    )


@router.post("/share-report", response_model=ShareReportResponse, status_code=status.HTTP_201_CREATED)
async def share_report(
    request: ShareReportRequest,
    current_user: User = Depends(get_current_user),
) -> ShareReportResponse:
    """Create a shareable analytics report link (public access)."""
    try:
        token = str(uuid.uuid4())
        now = datetime.utcnow()
        expires_at = (now + timedelta(days=7)).isoformat() + "Z"

        payload = {
            "token": token,
            "tenant_id": current_user.tenant_id or current_user.id,
            "created_at": now.isoformat() + "Z",
            "expires_at": expires_at,
            "params": {
                "range": request.range,
                "from": request.from_date,
                "to": request.to_date,
                "compare": request.compare,
            },
        }

        await database.save_shared_report(token, payload)

        # The frontend can construct the full URL with the token
        return ShareReportResponse(
            token=token,
            url=f"/analytics/shared/{token}",
            expires_at=expires_at,
        )

    except Exception as e:
        logger.error(f"Error generating shareable report link: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create shareable report link",
        )


@router.get("/share-report/{token}", response_model=AnalyticsSummaryResponse, status_code=status.HTTP_200_OK)
async def get_shared_report(token: str):
    """Get analytics summary for a shared report token (no auth required)."""
    try:
        report = await database.get_shared_report(token)
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared report not found")

        # Validate expiration
        expires_at = report.get("expires_at")
        if expires_at:
            expires_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00")).replace(tzinfo=None)
            if datetime.utcnow() > expires_dt:
                raise HTTPException(status_code=status.HTTP_410_GONE, detail="Shared report link has expired")

        params = report.get("params", {}) or {}
        start, end, compare_start, compare_end = _parse_date_range(
            params.get("range", "30d"),
            params.get("from"),
            params.get("to"),
        )
        summary = await database.get_analytics_summary_range(start, end, user_id=report.get("tenant_id"))

        return AnalyticsSummaryResponse(**summary)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving shared report: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching shared report",
        )


@router.post("/export/pdf", status_code=status.HTTP_200_OK)
async def export_pdf(
    range: str = Query("30d", description="Date range (today, 7d, 30d, 90d, custom)"),
    from_date: Optional[str] = Query(None, description="Custom range start date (ISO 8601)"),
    to_date: Optional[str] = Query(None, description="Custom range end date (ISO 8601)"),
    compare: bool = Query(False, description="Whether to include previous period comparison"),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Generate a server-side PDF analytics report."""
    if not REPORTLAB_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PDF generation is unavailable because the reportlab package is not installed.",
        )

    try:
        start, end, compare_start, compare_end = _parse_date_range(range, from_date, to_date)
        user_id = current_user.id
        summary = await database.get_analytics_summary_range(start, end, user_id=user_id)

        # Generate a simple PDF report (server-side)
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=letter)
        pdf.setTitle("NexaChat Analytics Report")

        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawString(40, 750, "NexaChat Analytics Report")

        pdf.setFont("Helvetica", 11)
        pdf.drawString(40, 730, f"Period: {summary.get('period', {}).get('from', '')} to {summary.get('period', {}).get('to', '')}")
        pdf.drawString(40, 715, f"Total Conversations: {summary.get('total_conversations', 0)}")
        pdf.drawString(40, 700, f"Total Messages: {summary.get('total_messages', 0)}")
        pdf.drawString(40, 685, f"Resolution Rate: {summary.get('resolution_rate', {}).get('percentage', 0)}%")
        pdf.drawString(40, 670, f"Satisfaction: {summary.get('user_satisfaction', {}).get('satisfaction_rate', 0)}%")

        pdf.showPage()
        pdf.save()
        buffer.seek(0)

        headers = {
            "Content-Disposition": "attachment; filename=analytics-report.pdf",
        }
        return StreamingResponse(buffer, media_type="application/pdf", headers=headers)

    except Exception as e:
        logger.error(f"Error generating PDF report: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while generating PDF report",
        )
