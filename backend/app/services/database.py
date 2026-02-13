"""
Database service for persisting conversation data.

This module provides functions for:
- Saving conversation turns to the database
- Retrieving conversation history
- Deleting conversations

Currently implemented with in-memory storage that will be replaced
with actual database implementation in Section C.
"""

import logging
import uuid
from datetime import datetime
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# In-memory storage for conversations
# Structure: {session_id: [message1, message2, ...]}
# Each message is a dict with: id, role, content, timestamp, metadata
_conversations: Dict[str, List[dict]] = {}


async def save_conversation_turn(
    session_id: Optional[str],
    message: str,
    answer: str,
    sources_count: int,
    query_time_ms: float,
) -> Optional[str]:
    """
    Save a conversation turn to the database.

    This implementation uses in-memory storage and will be replaced with:
    - Database connection and session management
    - Insert conversation record
    - Insert message records
    - Return conversation/message IDs

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

    # Initialize conversation list for this session if it doesn't exist
    if session_id not in _conversations:
        _conversations[session_id] = []

    timestamp = datetime.utcnow().isoformat() + "Z"

    # Create user message
    user_message_id = str(uuid.uuid4())
    user_message = {
        "id": user_message_id,
        "role": "user",
        "content": message,
        "timestamp": timestamp,
        "metadata": None,
    }
    _conversations[session_id].append(user_message)

    # Create assistant message
    assistant_message_id = str(uuid.uuid4())
    assistant_message = {
        "id": assistant_message_id,
        "role": "assistant",
        "content": answer,
        "timestamp": timestamp,
        "metadata": {
            "sources_count": sources_count,
            "query_time_ms": query_time_ms,
        },
    }
    _conversations[session_id].append(assistant_message)

    logger.info(
        f"Conversation turn saved: session_id={session_id}, "
        f"message_length={len(message)}, answer_length={len(answer)}, "
        f"sources={sources_count}, query_time_ms={query_time_ms:.2f}"
    )

    return assistant_message_id


async def get_conversation_history(
    session_id: str, limit: int = 50, offset: int = 0
) -> tuple[List[dict], int]:
    """
    Retrieve conversation history for a session.

    This implementation uses in-memory storage and will be replaced with:
    - Database query for conversation messages
    - Message retrieval with pagination

    Args:
        session_id: Session identifier
        limit: Maximum number of messages to retrieve
        offset: Number of messages to skip

    Returns:
        Tuple of (list of conversation messages, total count)
    """
    if session_id not in _conversations:
        logger.debug(f"No conversation history found for session_id={session_id}")
        return [], 0

    messages = _conversations[session_id]
    total = len(messages)

    # Apply pagination
    paginated_messages = messages[offset : offset + limit]

    logger.info(
        f"Retrieved conversation history: session_id={session_id}, "
        f"total={total}, limit={limit}, offset={offset}, returned={len(paginated_messages)}"
    )

    return paginated_messages, total


async def delete_conversation(session_id: str) -> bool:
    """
    Delete a conversation by session ID.

    This implementation uses in-memory storage and will be replaced with:
    - Database deletion of conversation records
    - Cascade deletion of associated messages

    Args:
        session_id: Session identifier

    Returns:
        True if conversation was deleted, False if it didn't exist
    """
    if session_id not in _conversations:
        logger.debug(f"No conversation found to delete for session_id={session_id}")
        return False

    message_count = len(_conversations[session_id])
    del _conversations[session_id]

    logger.info(
        f"Deleted conversation: session_id={session_id}, "
        f"messages_deleted={message_count}"
    )

    return True
