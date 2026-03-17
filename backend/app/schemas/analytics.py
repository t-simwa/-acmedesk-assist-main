"""
Pydantic schemas for analytics API requests and responses.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class ConversationCountByDay(BaseModel):
    """
    Conversation count for a specific day.

    Attributes:
        date: Date in ISO 8601 format (YYYY-MM-DD)
        count: Number of conversations on this date
    """

    date: str = Field(..., description="Date in ISO 8601 format (YYYY-MM-DD)")
    count: int = Field(..., ge=0, description="Number of conversations on this date")


class QuestionCategory(BaseModel):
    """
    Question category with count.

    Attributes:
        category: Category name
        count: Number of questions in this category
    """

    category: str = Field(..., description="Category name")
    count: int = Field(..., ge=0, description="Number of questions in this category")


class APIUsageMetrics(BaseModel):
    """
    API usage and cost tracking metrics.

    Attributes:
        total_requests: Total number of API requests
        total_tokens_used: Total tokens used (if tracked)
        estimated_cost: Estimated cost in USD (if tracked)
        last_updated: ISO 8601 timestamp when metrics were last updated
    """

    total_requests: int = Field(..., ge=0, description="Total number of API requests")
    total_tokens_used: Optional[int] = Field(None, ge=0, description="Total tokens used (if tracked)")
    estimated_cost: Optional[float] = Field(None, ge=0.0, description="Estimated cost in USD (if tracked)")
    last_updated: str = Field(..., description="ISO 8601 timestamp when metrics were last updated")


class WeekdayCount(BaseModel):
    """Conversation counts for each weekday."""

    weekday: str = Field(..., description="Weekday name (e.g., Monday)")
    count: int = Field(..., ge=0, description="Number of conversations")


class HourCount(BaseModel):
    """Conversation counts for each hour of the day."""

    hour: int = Field(..., ge=0, le=23, description="Hour of the day (0-23)")
    count: int = Field(..., ge=0, description="Number of conversations")


class ResponseTimeBucket(BaseModel):
    """Response time distribution bucket."""

    bucket: str = Field(..., description="Response time bucket label (e.g., 0-500ms)")
    count: int = Field(..., ge=0, description="Number of responses in this bucket")


class KBCoveragePoint(BaseModel):
    """Knowledge base coverage over time."""

    date: str = Field(..., description="Date in ISO 8601 format")
    coverage: float = Field(..., ge=0.0, le=100.0, description="Knowledge base coverage percentage")


class AnalyticsSummaryResponse(BaseModel):
    """
    Response model for GET /api/analytics/summary endpoint.

    Attributes:
        total_conversations: Total number of conversations
        total_messages: Total number of messages
        conversations_by_day: Conversation counts by day (last 7 or 30 days)
        resolution_rate: Resolution rate (resolved via bot vs escalated)
        response_accuracy: Response accuracy metrics
        top_categories: Top question categories
        api_usage: API usage and cost tracking
        user_satisfaction: User satisfaction metrics from feedback
    """

    total_conversations: int = Field(..., ge=0, description="Total number of conversations")
    total_messages: int = Field(..., ge=0, description="Total number of messages")
    conversations_by_day: List[ConversationCountByDay] = Field(
        default_factory=list, description="Conversation counts by day"
    )
    resolution_rate: dict = Field(
        default_factory=dict,
        description="Resolution rate metrics (resolved_via_bot, escalated, total, percentage)"
    )
    response_accuracy: dict = Field(
        default_factory=dict,
        description="Response accuracy metrics (average_query_time_ms, average_sources_count)"
    )
    top_categories: List[QuestionCategory] = Field(
        default_factory=list, description="Top question categories"
    )
    api_usage: APIUsageMetrics = Field(..., description="API usage and cost tracking")
    user_satisfaction: dict = Field(
        default_factory=dict,
        description="User satisfaction metrics (thumbs_up, thumbs_down, total_feedback, satisfaction_rate)"
    )

    # Additional analytics series
    volume_by_weekday: Optional[List[WeekdayCount]] = Field(
        default=None,
        description="Conversation counts by weekday (Monday..Sunday)"
    )
    volume_by_hour: Optional[List[HourCount]] = Field(
        default=None,
        description="Conversation counts by hour (0-23)"
    )
    response_time_distribution: Optional[List[ResponseTimeBucket]] = Field(
        default=None,
        description="Distribution of response times"
    )
    kb_coverage_trend: Optional[List[KBCoveragePoint]] = Field(
        default=None,
        description="Knowledge base coverage trend over time"
    )

    period: Optional[dict] = Field(
        default=None,
        description="Current date range used for the analytics data (from/to)"
    )
    compare_period: Optional[dict] = Field(
        default=None,
        description="Previous period used for comparison (from/to)"
    )
    compare_summary: Optional[dict] = Field(
        default=None,
        description="Analytics summary for the compare period"
    )
    compare_volume_by_weekday: Optional[List[WeekdayCount]] = Field(
        default=None,
        description="Weekday counts for the compare period"
    )
    compare_volume_by_hour: Optional[List[HourCount]] = Field(
        default=None,
        description="Hourly counts for the compare period"
    )
    compare_response_time_distribution: Optional[List[ResponseTimeBucket]] = Field(
        default=None,
        description="Response time distribution for the compare period"
    )
    compare_kb_coverage_trend: Optional[List[KBCoveragePoint]] = Field(
        default=None,
        description="KB coverage trend for the compare period"
    )


class TopQuery(BaseModel):
    """
    Top query with statistics.

    Attributes:
        query: The question/query text
        count: Number of times this query was asked
        resolved_by_bot: Number of times resolved by bot
        resolved_percentage: Percentage of times resolved by bot (0.0 to 100.0)
    """

    query: str = Field(..., description="The question/query text")
    count: int = Field(..., ge=0, description="Number of times this query was asked")
    resolved_by_bot: int = Field(..., ge=0, description="Number of times resolved by bot")
    resolved_percentage: float = Field(..., ge=0.0, le=100.0, description="Percentage of times resolved by bot")


class TopQueriesResponse(BaseModel):
    """
    Response model for GET /api/analytics/top-queries endpoint.

    Attributes:
        queries: List of top queries with statistics
        total: Total number of unique queries
        limit: Maximum number of queries returned
    """

    queries: List[TopQuery] = Field(default_factory=list, description="List of top queries with statistics")
    total: int = Field(..., ge=0, description="Total number of unique queries")
    limit: int = Field(..., ge=1, description="Maximum number of queries returned")


# =============================================================================
# Milestone 7.3 - Analytics Page Schemas
# =============================================================================

class LeadCountByDay(BaseModel):
    """Lead count by date."""
    date: str = Field(..., description="Date in ISO 8601 format (YYYY-MM-DD)")
    count: int = Field(..., ge=0, description="Number of leads on this date")


class LeadSourceItem(BaseModel):
    """Lead source breakdown."""
    channel: str = Field(..., description="Channel name")
    count: int = Field(..., ge=0, description="Number of leads from this channel")
    percentage: float = Field(..., ge=0.0, le=100.0, description="Percentage of total leads")


class ConversionFunnelItem(BaseModel):
    """Conversion funnel stage."""
    stage: str = Field(..., description="Funnel stage name")
    count: int = Field(..., ge=0, description="Number of leads at this stage")
    percentage: float = Field(..., ge=0.0, le=100.0, description="Percentage from previous stage")


class LeadAnalyticsResponse(BaseModel):
    """Response model for GET /api/analytics/leads endpoint (7.3.6)."""
    total_leads: int = Field(..., ge=0, description="Total leads in date range")
    leads_by_day: List[LeadCountByDay] = Field(default_factory=list, description="Leads over time")
    lead_sources: List[LeadSourceItem] = Field(default_factory=list, description="Lead sources by channel")
    conversion_funnel: List[ConversionFunnelItem] = Field(default_factory=list, description="Conversion funnel stages")
    leads_trend: Optional[float] = Field(None, description="Trend percentage vs previous period")
    period: Optional[dict] = Field(None, description="Current date range used for the analytics data (from/to)")
    compare_period: Optional[dict] = Field(None, description="Previous period used for comparison (from/to)")
    compare_data: Optional[dict] = Field(None, description="Analytics summary for the compare period")


class ChannelConversationItem(BaseModel):
    """Channel conversation breakdown."""
    channel: str = Field(..., description="Channel name")
    icon: str = Field(..., description="Channel icon/emoji")
    conversations: int = Field(..., ge=0, description="Number of conversations")
    resolution_rate: float = Field(..., ge=0.0, le=100.0, description="Resolution rate percentage")
    avg_duration_minutes: Optional[float] = Field(None, ge=0.0, description="Average conversation duration in minutes")


class ChannelAnalyticsResponse(BaseModel):
    """Response model for GET /api/analytics/channels endpoint (7.3.4)."""
    channels: List[ChannelConversationItem] = Field(default_factory=list, description="Channel breakdown")
    total_conversations: int = Field(..., ge=0, description="Total conversations across all channels")


class UnansweredQuestion(BaseModel):
    """Unanswered question item."""
    query: str = Field(..., description="The question that wasn't answered")
    count: int = Field(..., ge=0, description="Number of times asked")
    last_asked: str = Field(..., description="ISO timestamp of last time asked")


class DocumentUsageItem(BaseModel):
    """Document usage for RAG."""
    document_id: str = Field(..., description="Document ID")
    filename: str = Field(..., description="Document filename")
    reference_count: int = Field(..., ge=0, description="Times referenced in responses")
    last_referenced: Optional[str] = Field(None, description="ISO timestamp of last reference")


class ContentAnalyticsResponse(BaseModel):
    """Response model for GET /api/analytics/content endpoint (7.3.5)."""
    top_questions: List[TopQuery] = Field(default_factory=list, description="Top 10 questions")
    unanswered_questions: List[UnansweredQuestion] = Field(default_factory=list, description="Unanswered questions")
    most_referenced_docs: List[DocumentUsageItem] = Field(default_factory=list, description="Most referenced documents")
    underutilized_docs: List[DocumentUsageItem] = Field(default_factory=list, description="Underutilized documents")
    total_unanswered: int = Field(..., ge=0, description="Total unanswered questions count")


class SatisfactionDataPoint(BaseModel):
    """Satisfaction score over time."""
    date: str = Field(..., description="Date in ISO 8601 format")
    score: float = Field(..., ge=0.0, le=100.0, description="Satisfaction score percentage")
    positive: int = Field(..., ge=0, description="Positive feedback count")
    negative: int = Field(..., ge=0, description="Negative feedback count")


class SatisfactionAnalyticsResponse(BaseModel):
    """Response model for GET /api/analytics/satisfaction endpoint (7.3.7)."""
    current_score: float = Field(..., ge=0.0, le=100.0, description="Current satisfaction score")
    satisfaction_by_day: List[SatisfactionDataPoint] = Field(default_factory=list, description="Satisfaction over time")
    total_positive: int = Field(..., ge=0, description="Total positive feedback")
    total_negative: int = Field(..., ge=0, description="Total negative feedback")
    score_trend: Optional[float] = Field(None, description="Trend percentage vs previous period")


class ScheduleReportRequest(BaseModel):
    """Request model for scheduling analytics reports (7.3.1)."""
    frequency: str = Field(..., description="Frequency: weekly or monthly")
    day_of_week: Optional[int] = Field(None, ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)")
    day_of_month: Optional[int] = Field(None, ge=1, le=31, description="Day of month (1-31)")
    time: str = Field(..., description="Time in HH:MM format")
    recipient_email: str = Field(..., description="Email address to send report to")
    enabled: bool = Field(default=True, description="Whether the schedule is active")


class ScheduleReportResponse(BaseModel):
    """Response model for scheduled report."""
    id: str = Field(..., description="Schedule ID")
    frequency: str = Field(..., description="Frequency: weekly or monthly")
    day_of_week: Optional[int] = Field(None, description="Day of week")
    day_of_month: Optional[int] = Field(None, description="Day of month")
    time: str = Field(..., description="Time in HH:MM format")
    recipient_email: str = Field(..., description="Email address")
    enabled: bool = Field(..., description="Whether active")
    created_at: str = Field(..., description="ISO timestamp of creation")


class ShareReportRequest(BaseModel):
    """Request model to create a shareable analytics report link."""
    range: Optional[str] = Field(None, description="Date range (today, 7d, 30d, 90d, custom)")
    from_date: Optional[str] = Field(None, description="Custom range start date (ISO 8601)")
    to_date: Optional[str] = Field(None, description="Custom range end date (ISO 8601)")
    compare: Optional[bool] = Field(False, description="Whether to include previous period comparison")


class ShareReportResponse(BaseModel):
    """Response model for a shareable report link."""
    token: str = Field(..., description="Unique link token")
    url: str = Field(..., description="Shareable URL")
    expires_at: str = Field(..., description="ISO timestamp when link expires")
