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
