"""
Analytics API endpoints.

Implements:
- GET /api/analytics/summary - Get analytics summary
- GET /api/analytics/top-queries - Get top queries with statistics
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.analytics import (
    AnalyticsSummaryResponse,
    APIUsageMetrics,
    ConversationCountByDay,
    QuestionCategory,
    TopQuery,
    TopQueriesResponse,
)
from ..services import database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


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
