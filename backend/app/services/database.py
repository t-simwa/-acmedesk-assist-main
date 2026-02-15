"""
Database service for persisting conversation data and document metadata.

This module provides functions for:
- Saving conversation turns to the database
- Retrieving conversation history
- Deleting conversations
- Document metadata management

Implemented with SQLAlchemy and SQLite (async).
"""

import json
import logging
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from sqlalchemy import select, func, delete, and_, case, cast, String, Date
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.base import get_session_factory
from ..models.conversation import Conversation
from ..models.document import Document
from ..models.message import Message
from ..models.setting import Setting

logger = logging.getLogger(__name__)


# Conversation management functions

async def save_conversation_turn(
    session_id: Optional[str],
    message: str,
    answer: str,
    sources_count: int,
    query_time_ms: float,
) -> Optional[str]:
    """
    Save a conversation turn to the database.

    Args:
        session_id: Optional session identifier
        message: The user's message
        answer: The generated answer
        sources_count: Number of sources used
        query_time_ms: Query processing time in milliseconds

    Returns:
        Optional message ID (returns actual ID for assistant message)
    """
    # If no session_id provided, we can't store the conversation
    if not session_id:
        logger.debug(
            "No session_id provided, conversation turn not stored: "
            f"message_length={len(message)}, answer_length={len(answer)}"
        )
        return None

    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Check if conversation exists for this session_id
            result = await session.execute(
                select(Conversation).where(Conversation.session_id == session_id)
            )
            conversation = result.scalar_one_or_none()

            # Create conversation if it doesn't exist
            if conversation is None:
                conversation_id = str(uuid.uuid4())
                conversation = Conversation(
                    id=conversation_id,
                    session_id=session_id,
                    started_at=datetime.utcnow(),
                    last_activity_at=datetime.utcnow(),
                )
                session.add(conversation)
            else:
                conversation_id = conversation.id
                conversation.last_activity_at = datetime.utcnow()

            # Create user message
            user_message_id = str(uuid.uuid4())
            user_message = Message(
                id=user_message_id,
                conversation_id=conversation_id,
                role="user",
                content=message,
                created_at=datetime.utcnow(),
                message_metadata=None,
            )
            session.add(user_message)

            # Create assistant message
            assistant_message_id = str(uuid.uuid4())
            assistant_message = Message(
                id=assistant_message_id,
                conversation_id=conversation_id,
                role="assistant",
                content=answer,
                created_at=datetime.utcnow(),
                message_metadata={
                    "sources_count": sources_count,
                    "query_time_ms": query_time_ms,
                },
            )
            session.add(assistant_message)

            await session.commit()

            logger.info(
                f"Conversation turn saved: session_id={session_id}, "
                f"message_length={len(message)}, answer_length={len(answer)}, "
                f"sources={sources_count}, query_time_ms={query_time_ms:.2f}"
            )

            return assistant_message_id

        except Exception as e:
            await session.rollback()
            logger.error(f"Error saving conversation turn: {e}", exc_info=True)
            raise


async def get_conversation_history(
    session_id: str, limit: int = 50, offset: int = 0
) -> tuple[List[dict], int]:
    """
    Retrieve conversation history for a session.

    Args:
        session_id: Session identifier
        limit: Maximum number of messages to retrieve
        offset: Number of messages to skip

    Returns:
        Tuple of (list of conversation messages, total count)
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Find conversation by session_id
            result = await session.execute(
                select(Conversation).where(Conversation.session_id == session_id)
            )
            conversation = result.scalar_one_or_none()

            if conversation is None:
                logger.debug(f"No conversation history found for session_id={session_id}")
                return [], 0

            # Get total count
            count_result = await session.execute(
                select(func.count(Message.id)).where(Message.conversation_id == conversation.id)
            )
            total = count_result.scalar() or 0

            # Get messages with pagination
            result = await session.execute(
                select(Message)
                .where(Message.conversation_id == conversation.id)
                .order_by(Message.created_at.asc())
                .limit(limit)
                .offset(offset)
            )
            messages = result.scalars().all()

            message_dicts = [msg.to_dict() for msg in messages]

            logger.info(
                f"Retrieved conversation history: session_id={session_id}, "
                f"total={total}, limit={limit}, offset={offset}, returned={len(message_dicts)}"
            )

            return message_dicts, total

        except Exception as e:
            logger.error(f"Error retrieving conversation history: {e}", exc_info=True)
            raise


async def update_message_reaction(message_id: str, reaction: Optional[str]) -> bool:
    """
    Update reaction for a message.

    Args:
        message_id: Message identifier
        reaction: Reaction type ("thumbs_up", "thumbs_down", or None to remove)

    Returns:
        True if message was found and updated, False otherwise
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Find message by ID
            result = await session.execute(
                select(Message).where(Message.id == message_id)
            )
            message = result.scalar_one_or_none()

            if message is None:
                logger.debug(f"No message found to update reaction: message_id={message_id}")
                return False

            # Update metadata with reaction
            metadata = message.message_metadata or {}
            if reaction:
                metadata["reaction"] = reaction
            else:
                metadata.pop("reaction", None)

            message.message_metadata = metadata
            await session.commit()

            logger.info(
                f"Updated message reaction: message_id={message_id}, reaction={reaction}"
            )

            return True

        except Exception as e:
            await session.rollback()
            logger.error(f"Error updating message reaction: {e}", exc_info=True)
            raise


async def delete_conversation(session_id: str) -> bool:
    """
    Delete a conversation by session ID.

    Args:
        session_id: Session identifier

    Returns:
        True if conversation was deleted, False if it didn't exist
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Find conversation by session_id
            result = await session.execute(
                select(Conversation).where(Conversation.session_id == session_id)
            )
            conversation = result.scalar_one_or_none()

            if conversation is None:
                logger.debug(f"No conversation found to delete for session_id={session_id}")
                return False

            # Count messages before deletion
            count_result = await session.execute(
                select(func.count(Message.id)).where(Message.conversation_id == conversation.id)
            )
            message_count = count_result.scalar() or 0

            # Delete messages (cascade should handle this, but explicit is safer)
            await session.execute(
                delete(Message).where(Message.conversation_id == conversation.id)
            )

            # Delete conversation
            await session.delete(conversation)
            await session.commit()

            logger.info(
                f"Deleted conversation: session_id={session_id}, "
                f"messages_deleted={message_count}"
            )

            return True

        except Exception as e:
            await session.rollback()
            logger.error(f"Error deleting conversation: {e}", exc_info=True)
            raise


# Document management functions

async def create_document(
    doc_id: str,
    name: str,
    doc_type: str,
    file_path: str,
    file_size: int,
    status: str = "processing",
) -> dict:
    """
    Create a new document metadata record.

    Args:
        doc_id: Unique document identifier
        name: Document name/filename
        doc_type: Document type (markdown, html, text)
        file_path: Path to the stored file
        file_size: File size in bytes
        status: Processing status (default: "processing")

    Returns:
        Document metadata dictionary
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            document = Document(
                id=doc_id,
                name=name,
                type=doc_type,
                status=status,
                file_path=file_path,
                file_size=file_size,
                chunk_count=0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                last_indexed_at=None,
                error_message=None,
            )

            session.add(document)
            await session.commit()
            await session.refresh(document)

            logger.info(f"Created document record: doc_id={doc_id}, name={name}, status={status}")

            return document.to_dict()

        except Exception as e:
            await session.rollback()
            logger.error(f"Error creating document: {e}", exc_info=True)
            raise


async def get_document(doc_id: str) -> Optional[dict]:
    """
    Get document metadata by ID.

    Args:
        doc_id: Document identifier

    Returns:
        Document metadata dictionary if found, None otherwise
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(select(Document).where(Document.id == doc_id))
            document = result.scalar_one_or_none()

            if document:
                return document.to_dict()
            return None

        except Exception as e:
            logger.error(f"Error getting document: {e}", exc_info=True)
            raise


async def update_document(
    doc_id: str,
    status: Optional[str] = None,
    chunk_count: Optional[int] = None,
    error_message: Optional[str] = None,
) -> Optional[dict]:
    """
    Update document metadata.

    Args:
        doc_id: Document identifier
        status: New status (if provided)
        chunk_count: New chunk count (if provided)
        error_message: Error message (if provided, None to clear)

    Returns:
        Updated document metadata dictionary if found, None otherwise
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(select(Document).where(Document.id == doc_id))
            document = result.scalar_one_or_none()

            if document is None:
                logger.warning(f"Document not found for update: doc_id={doc_id}")
                return None

            # Update fields
            document.updated_at = datetime.utcnow()

            if status is not None:
                document.status = status
                if status == "indexed":
                    document.last_indexed_at = datetime.utcnow()
                elif status == "error" and error_message:
                    document.error_message = error_message
                elif status != "error":
                    document.error_message = None

            if chunk_count is not None:
                document.chunk_count = chunk_count

            if error_message is not None:
                document.error_message = error_message

            await session.commit()
            await session.refresh(document)

            logger.info(f"Updated document: doc_id={doc_id}, status={status}, chunk_count={chunk_count}")

            return document.to_dict()

        except Exception as e:
            await session.rollback()
            logger.error(f"Error updating document: {e}", exc_info=True)
            raise


async def list_documents(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    status: Optional[str] = None,
    doc_type: Optional[str] = None,
) -> tuple[List[dict], int]:
    """
    List documents with pagination, search, and filtering.

    Args:
        limit: Maximum number of documents to return
        offset: Number of documents to skip
        search: Search term to filter by document name (case-insensitive)
        status: Filter by status (processing, indexed, error)
        doc_type: Filter by document type (markdown, html, text)

    Returns:
        Tuple of (list of document metadata dictionaries, total count)
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Build query with filters
            query = select(Document)
            conditions = []

            if search:
                conditions.append(func.lower(Document.name).contains(func.lower(search)))

            if status:
                conditions.append(Document.status == status)

            if doc_type:
                conditions.append(Document.type == doc_type)

            if conditions:
                query = query.where(and_(*conditions))

            # Get total count
            count_query = select(func.count(Document.id))
            if conditions:
                count_query = count_query.where(and_(*conditions))
            count_result = await session.execute(count_query)
            total = count_result.scalar() or 0

            # Get paginated results, ordered by created_at descending
            result = await session.execute(
                query.order_by(Document.created_at.desc()).limit(limit).offset(offset)
            )
            documents = result.scalars().all()

            document_dicts = [doc.to_dict() for doc in documents]

            logger.info(
                f"Listed documents: total={total}, limit={limit}, offset={offset}, "
                f"returned={len(document_dicts)}, search={search}, status={status}, type={doc_type}"
            )

            return document_dicts, total

        except Exception as e:
            logger.error(f"Error listing documents: {e}", exc_info=True)
            raise


async def delete_document(doc_id: str) -> bool:
    """
    Delete a document metadata record.

    Args:
        doc_id: Document identifier

    Returns:
        True if document was deleted, False if it didn't exist
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(select(Document).where(Document.id == doc_id))
            document = result.scalar_one_or_none()

            if document is None:
                logger.warning(f"Document not found for deletion: doc_id={doc_id}")
                return False

            await session.delete(document)
            await session.commit()

            logger.info(f"Deleted document record: doc_id={doc_id}")

            return True

        except Exception as e:
            await session.rollback()
            logger.error(f"Error deleting document: {e}", exc_info=True)
            raise


# Settings management functions

async def get_rag_settings() -> Optional[Dict[str, Any]]:
    """
    Get RAG configuration settings from database.

    Returns:
        Dictionary with RAG settings if found, None otherwise
        Falls back to config defaults if not found in database
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(
                select(Setting).where(Setting.key == "rag_config")
            )
            setting = result.scalar_one_or_none()

            if setting:
                # Parse JSON value
                settings_dict = json.loads(setting.value)
                logger.info("Retrieved RAG settings from database")
                return settings_dict
            else:
                logger.debug("No RAG settings found in database, will use config defaults")
                return None

        except Exception as e:
            logger.error(f"Error getting RAG settings: {e}", exc_info=True)
            raise


async def update_rag_settings(settings_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update RAG configuration settings in database.

    Args:
        settings_dict: Dictionary with RAG settings to update

    Returns:
        Updated RAG settings dictionary
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(
                select(Setting).where(Setting.key == "rag_config")
            )
            setting = result.scalar_one_or_none()

            if setting:
                # Update existing setting
                setting.value = json.dumps(settings_dict)
                setting.updated_at = datetime.utcnow()
            else:
                # Create new setting
                setting_id = str(uuid.uuid4())
                setting = Setting(
                    id=setting_id,
                    key="rag_config",
                    value=json.dumps(settings_dict),
                    description="RAG configuration settings (model, temperature, top_k, max_tokens, system_prompt, chunk_size)",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                session.add(setting)

            await session.commit()
            await session.refresh(setting)

            logger.info(f"Updated RAG settings: {settings_dict}")

            return settings_dict

        except Exception as e:
            await session.rollback()
            logger.error(f"Error updating RAG settings: {e}", exc_info=True)
            raise


# Analytics functions

async def get_total_conversations() -> int:
    """Get total number of conversations."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(select(func.count(Conversation.id)))
            total = result.scalar() or 0
            return total
        except Exception as e:
            logger.error(f"Error getting total conversations: {e}", exc_info=True)
            raise


async def get_total_messages() -> int:
    """Get total number of messages."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(select(func.count(Message.id)))
            total = result.scalar() or 0
            return total
        except Exception as e:
            logger.error(f"Error getting total messages: {e}", exc_info=True)
            raise


async def get_conversations_by_day(days: int = 7) -> List[Dict[str, Any]]:
    """
    Get conversation counts by day for the last N days.

    Args:
        days: Number of days to look back (default: 7)

    Returns:
        List of dictionaries with date and count
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Calculate start date
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Query all conversations in the date range
            result = await session.execute(
                select(Conversation)
                .where(Conversation.started_at >= start_date)
            )
            
            conversations = result.scalars().all()
            
            # Group by date in Python
            date_counts = defaultdict(int)
            
            for conv in conversations:
                if conv.started_at:
                    # Extract date part (YYYY-MM-DD)
                    date_key = conv.started_at.date().isoformat()
                    date_counts[date_key] += 1
            
            # Convert to list of dicts and sort by date
            counts = [
                {"date": date, "count": count}
                for date, count in sorted(date_counts.items())
            ]
            
            return counts

        except Exception as e:
            logger.error(f"Error getting conversations by day: {e}", exc_info=True)
            raise


async def get_resolution_rate() -> Dict[str, Any]:
    """
    Get resolution rate metrics (resolved via bot vs escalated).

    Note: For now, we assume a conversation is "resolved" if it has at least one
    assistant message with positive feedback (thumbs_up). "Escalated" conversations
    are those with negative feedback (thumbs_down) or marked as escalated in metadata.
    This is a simplified implementation that can be enhanced later.
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Get total conversations
            total_result = await session.execute(select(func.count(Conversation.id)))
            total_conversations = total_result.scalar() or 0

            # Count conversations with positive feedback (thumbs_up)
            # This is a simplified approach - we count messages with thumbs_up reaction
            resolved_result = await session.execute(
                select(func.count(func.distinct(Message.conversation_id)))
                .where(
                    Message.role == "assistant",
                    Message.message_metadata.contains({"reaction": "thumbs_up"})
                )
            )
            resolved_via_bot = resolved_result.scalar() or 0

            # Count conversations with negative feedback (thumbs_down) as escalated
            escalated_result = await session.execute(
                select(func.count(func.distinct(Message.conversation_id)))
                .where(
                    Message.role == "assistant",
                    Message.message_metadata.contains({"reaction": "thumbs_down"})
                )
            )
            escalated = escalated_result.scalar() or 0

            # Calculate percentage
            percentage = (resolved_via_bot / total_conversations * 100) if total_conversations > 0 else 0.0

            return {
                "resolved_via_bot": resolved_via_bot,
                "escalated": escalated,
                "total": total_conversations,
                "percentage": round(percentage, 2)
            }

        except Exception as e:
            logger.error(f"Error getting resolution rate: {e}", exc_info=True)
            raise


async def get_response_accuracy_metrics() -> Dict[str, Any]:
    """
    Get response accuracy metrics (average query time, average sources count).
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Get all assistant messages with metadata
            result = await session.execute(
                select(Message)
                .where(
                    Message.role == "assistant",
                    Message.message_metadata.isnot(None)
                )
            )
            messages = result.scalars().all()

            # Calculate averages in Python
            query_times = []
            sources_counts = []

            for msg in messages:
                if msg.message_metadata:
                    if "query_time_ms" in msg.message_metadata:
                        try:
                            query_times.append(float(msg.message_metadata["query_time_ms"]))
                        except (ValueError, TypeError):
                            pass
                    if "sources_count" in msg.message_metadata:
                        try:
                            sources_counts.append(int(msg.message_metadata["sources_count"]))
                        except (ValueError, TypeError):
                            pass

            avg_query_time_ms = sum(query_times) / len(query_times) if query_times else 0.0
            avg_sources_count = sum(sources_counts) / len(sources_counts) if sources_counts else 0.0

            return {
                "average_query_time_ms": round(avg_query_time_ms, 2),
                "average_sources_count": round(avg_sources_count, 1)
            }

        except Exception as e:
            logger.error(f"Error getting response accuracy metrics: {e}", exc_info=True)
            raise


async def get_top_question_categories(limit: int = 5) -> List[Dict[str, Any]]:
    """
    Get top question categories.

    Note: This is a simplified implementation. In a real system, you would
    categorize questions using NLP or predefined categories. For now, we'll
    return a placeholder structure.
    """
    # This is a placeholder - in a real implementation, you would:
    # 1. Extract categories from message content using NLP
    # 2. Or use predefined categories based on keywords
    # 3. Or use a classification model
    
    # For now, return empty list as categories need to be determined
    # based on actual question analysis
    return []


async def get_user_satisfaction_metrics() -> Dict[str, Any]:
    """
    Get user satisfaction metrics from thumbs up/down feedback.
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Count thumbs up
            thumbs_up_result = await session.execute(
                select(func.count(Message.id))
                .where(
                    Message.role == "assistant",
                    Message.message_metadata.contains({"reaction": "thumbs_up"})
                )
            )
            thumbs_up = thumbs_up_result.scalar() or 0

            # Count thumbs down
            thumbs_down_result = await session.execute(
                select(func.count(Message.id))
                .where(
                    Message.role == "assistant",
                    Message.message_metadata.contains({"reaction": "thumbs_down"})
                )
            )
            thumbs_down = thumbs_down_result.scalar() or 0

            total_feedback = thumbs_up + thumbs_down
            satisfaction_rate = (thumbs_up / total_feedback * 100) if total_feedback > 0 else 0.0

            return {
                "thumbs_up": thumbs_up,
                "thumbs_down": thumbs_down,
                "total_feedback": total_feedback,
                "satisfaction_rate": round(satisfaction_rate, 2)
            }

        except Exception as e:
            logger.error(f"Error getting user satisfaction metrics: {e}", exc_info=True)
            raise


async def get_api_usage_metrics() -> Dict[str, Any]:
    """
    Get API usage and cost tracking metrics.

    Note: This is a simplified implementation. In a real system, you would
    track API calls and token usage from the LLM service. For now, we'll
    estimate based on the number of assistant messages (each represents an API call).
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Count total assistant messages (each represents an API call)
            total_requests_result = await session.execute(
                select(func.count(Message.id))
                .where(Message.role == "assistant")
            )
            total_requests = total_requests_result.scalar() or 0

            # Estimate tokens (simplified - in real system, track actual tokens)
            # Assume average of 500 tokens per request
            total_tokens_used = total_requests * 500

            # Estimate cost (simplified - using GPT-3.5-turbo pricing as example)
            # $0.0015 per 1K input tokens, $0.002 per 1K output tokens
            # Simplified: assume 50% input, 50% output
            estimated_cost = (total_tokens_used / 1000) * 0.00175  # Average of input/output pricing

            return {
                "total_requests": total_requests,
                "total_tokens_used": total_tokens_used,
                "estimated_cost": round(estimated_cost, 4),
                "last_updated": datetime.utcnow().isoformat() + "Z"
            }

        except Exception as e:
            logger.error(f"Error getting API usage metrics: {e}", exc_info=True)
            raise


async def get_top_queries(limit: int = 10) -> tuple[List[Dict[str, Any]], int]:
    """
    Get top queries with statistics.

    Args:
        limit: Maximum number of queries to return

    Returns:
        Tuple of (list of top queries, total unique queries count)
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Get all user messages grouped by content
            result = await session.execute(
                select(
                    Message.content.label("query"),
                    func.count(Message.id).label("count")
                )
                .where(Message.role == "user")
                .group_by(Message.content)
                .order_by(func.count(Message.id).desc())
                .limit(limit)
            )
            rows = result.all()

            # Get total unique queries
            total_result = await session.execute(
                select(func.count(func.distinct(Message.content)))
                .where(Message.role == "user")
            )
            total = total_result.scalar() or 0

            # For each query, count resolved instances
            queries = []
            for row in rows:
                query_text = row.query
                count = row.count or 0

                # Find all user messages with this query
                user_messages_result = await session.execute(
                    select(Message)
                    .where(Message.role == "user", Message.content == query_text)
                )
                user_messages = user_messages_result.scalars().all()

                # For each user message, check if the next assistant message has thumbs_up
                resolved_count = 0
                for user_msg in user_messages:
                    # Find the next assistant message in the same conversation
                    assistant_result = await session.execute(
                        select(Message)
                        .where(
                            Message.conversation_id == user_msg.conversation_id,
                            Message.role == "assistant",
                            Message.created_at > user_msg.created_at
                        )
                        .order_by(Message.created_at.asc())
                        .limit(1)
                    )
                    assistant_msg = assistant_result.scalar_one_or_none()
                    if assistant_msg and assistant_msg.message_metadata:
                        if assistant_msg.message_metadata.get("reaction") == "thumbs_up":
                            resolved_count += 1

                resolved_percentage = round((resolved_count / count * 100) if count > 0 else 0.0, 2)

                queries.append({
                    "query": query_text,
                    "count": count,
                    "resolved_by_bot": resolved_count,
                    "resolved_percentage": resolved_percentage
                })

            return queries, total

        except Exception as e:
            logger.error(f"Error getting top queries: {e}", exc_info=True)
            raise
