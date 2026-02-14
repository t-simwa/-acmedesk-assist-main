"""
Database service for persisting conversation data and document metadata.

This module provides functions for:
- Saving conversation turns to the database
- Retrieving conversation history
- Deleting conversations
- Document metadata management

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

# In-memory storage for documents
# Structure: {doc_id: document_metadata_dict}
# Each document is a dict with: id, name, type, status, file_path, file_size, chunk_count, created_at, updated_at, last_indexed_at, error_message
_documents: Dict[str, dict] = {}


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
    timestamp = datetime.utcnow().isoformat() + "Z"

    document = {
        "id": doc_id,
        "name": name,
        "type": doc_type,
        "status": status,
        "file_path": file_path,
        "file_size": file_size,
        "chunk_count": 0,
        "created_at": timestamp,
        "updated_at": timestamp,
        "last_indexed_at": None,
        "error_message": None,
    }

    _documents[doc_id] = document

    logger.info(f"Created document record: doc_id={doc_id}, name={name}, status={status}")

    return document


async def get_document(doc_id: str) -> Optional[dict]:
    """
    Get document metadata by ID.

    Args:
        doc_id: Document identifier

    Returns:
        Document metadata dictionary if found, None otherwise
    """
    return _documents.get(doc_id)


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
    if doc_id not in _documents:
        logger.warning(f"Document not found for update: doc_id={doc_id}")
        return None

    document = _documents[doc_id]
    document["updated_at"] = datetime.utcnow().isoformat() + "Z"

    if status is not None:
        document["status"] = status
        if status == "indexed":
            document["last_indexed_at"] = document["updated_at"]
        elif status == "error" and error_message:
            document["error_message"] = error_message
        elif status != "error":
            document["error_message"] = None

    if chunk_count is not None:
        document["chunk_count"] = chunk_count

    if error_message is not None:
        document["error_message"] = error_message

    logger.info(f"Updated document: doc_id={doc_id}, status={status}, chunk_count={chunk_count}")

    return document


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
    # Start with all documents
    documents = list(_documents.values())

    # Apply search filter
    if search:
        search_lower = search.lower()
        documents = [doc for doc in documents if search_lower in doc["name"].lower()]

    # Apply status filter
    if status:
        documents = [doc for doc in documents if doc["status"] == status]

    # Apply type filter
    if doc_type:
        documents = [doc for doc in documents if doc["type"] == doc_type]

    # Sort by created_at descending (newest first)
    documents.sort(key=lambda x: x["created_at"], reverse=True)

    total = len(documents)

    # Apply pagination
    paginated_documents = documents[offset : offset + limit]

    logger.info(
        f"Listed documents: total={total}, limit={limit}, offset={offset}, "
        f"returned={len(paginated_documents)}, search={search}, status={status}, type={doc_type}"
    )

    return paginated_documents, total


async def delete_document(doc_id: str) -> bool:
    """
    Delete a document metadata record.

    Args:
        doc_id: Document identifier

    Returns:
        True if document was deleted, False if it didn't exist
    """
    if doc_id not in _documents:
        logger.warning(f"Document not found for deletion: doc_id={doc_id}")
        return False

    del _documents[doc_id]

    logger.info(f"Deleted document record: doc_id={doc_id}")

    return True
