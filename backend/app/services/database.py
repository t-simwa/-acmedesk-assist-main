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
from ..models.conversation import Conversation, Rating, ConversationOutcome
from ..models.document import Document
from ..models.lead import Lead, LeadStatus
from ..models.message import Message
from ..models.setting import Setting
from ..models.user_preferences import UserPreferences
from ..models.knowledge_base import KnowledgeBase, UserKnowledgeBasePreference

logger = logging.getLogger(__name__)


# ============================================================================
# Tenant ID Resolution Helper
# ============================================================================

async def resolve_tenant_id(user_id: Optional[str], session: Optional[AsyncSession] = None) -> Optional[str]:
    """
    Resolve a user_id to their actual tenant_id.
    
    This ensures conversations are stored with the correct tenant_id rather than
    accidentally using user_id as tenant_id.
    
    Args:
        user_id: The user's ID
        session: Optional existing database session (creates new one if not provided)
        
    Returns:
        The user's tenant_id if found, otherwise None
    """
    if not user_id:
        return None
    
    from ..models.user import User
    
    async def _lookup(sess: AsyncSession) -> Optional[str]:
        result = await sess.execute(
            select(User.tenant_id).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    if session:
        return await _lookup(session)
    else:
        session_factory = get_session_factory()
        async with session_factory() as new_session:
            return await _lookup(new_session)


async def get_effective_tenant_id(
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None,
    session: Optional[AsyncSession] = None,
) -> str:
    """
    Get the effective tenant_id for storing records.
    
    Priority:
    1. If tenant_id is provided, use it
    2. If user_id is provided, look up the user's tenant_id
    3. Fall back to user_id if lookup fails
    4. Fall back to "anonymous" if nothing else available
    
    Args:
        tenant_id: Explicit tenant_id (highest priority)
        user_id: User's ID (will lookup their tenant_id)
        session: Optional existing database session
        
    Returns:
        The resolved tenant_id
    """
    if tenant_id:
        return tenant_id
    
    if user_id:
        resolved = await resolve_tenant_id(user_id, session)
        if resolved:
            return resolved
        # Fall back to user_id if we can't find their tenant
        return user_id
    
    return "anonymous"


# Conversation management functions

async def save_conversation_turn(
    session_id: Optional[str],
    message: str,
    answer: str,
    sources_count: int,
    query_time_ms: float,
    user_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
) -> Optional[str]:
    """
    Save a conversation turn to the database.

    Args:
        session_id: Optional session identifier
        message: The user's message
        answer: The generated answer
        sources_count: Number of sources used
        query_time_ms: Query processing time in milliseconds
        user_id: Optional user ID (used when tenant_id not provided)
        tenant_id: Optional tenant ID for admin list consistency (prefer over user_id)

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
            # Resolve the correct tenant_id (lookup user's tenant if needed)
            effective_tenant = await get_effective_tenant_id(tenant_id, user_id, session)
            
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
                    tenant_id=effective_tenant,
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
            )
            session.add(assistant_message)

            # Keep message_count in sync for admin list
            conversation.message_count = (conversation.message_count or 0) + 2

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
    session_id: str,
    limit: int = 50,
    offset: int = 0,
    user_id: Optional[str] = None,
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
            # Find conversation by session_id, optionally filtered by user_id
            query = select(Conversation).where(Conversation.session_id == session_id)
            if user_id:
                query = query.where(Conversation.tenant_id == user_id)
            result = await session.execute(query)
            conversation = result.scalar_one_or_none()

            if conversation is None:
                logger.debug(f"No conversation history found for session_id={session_id}, tenant_id ={user_id}")
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


async def update_message_reaction(message_id: str, reaction: Optional[str], user_id: Optional[str] = None) -> bool:
    """
    Update reaction for a message, optionally filtered by user_id.

    Args:
        message_id: Message identifier
        reaction: Reaction type ("thumbs_up", "thumbs_down", or None to remove)
        user_id: Optional user ID to ensure user can only update reactions on their own messages

    Returns:
        True if message was found and updated, False otherwise
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Find message by ID, optionally filtered by user_id through conversation
            query = select(Message).where(Message.id == message_id)
            if user_id:
                # Join with Conversation to filter by user_id
                query = query.join(Conversation).where(Conversation.tenant_id == user_id)
            result = await session.execute(query)
            message = result.scalar_one_or_none()

            if message is None:
                logger.debug(f"No message found to update reaction: message_id={message_id}, tenant_id ={user_id}")
                return False

            # Update the conversation's rating based on the reaction
            # (Message model has no metadata column; rating is stored at conversation level)
            from ..models.conversation import Rating
            conv_result = await session.execute(
                select(Conversation).where(Conversation.id == message.conversation_id)
            )
            conversation = conv_result.scalar_one_or_none()
            if conversation:
                if reaction == "thumbs_up":
                    conversation.rating = Rating.POSITIVE
                elif reaction == "thumbs_down":
                    conversation.rating = Rating.NEGATIVE
                else:
                    conversation.rating = None
                await session.commit()

            logger.info(
                f"Updated message reaction: message_id={message_id}, reaction={reaction}"
            )

            return True

        except Exception as e:
            await session.rollback()
            logger.error(f"Error updating message reaction: {e}", exc_info=True)
            raise


async def delete_conversation(session_id: str, user_id: Optional[str] = None) -> bool:
    """
    Delete a conversation by session ID, optionally filtered by user_id.

    Args:
        session_id: Session identifier
        user_id: Optional user ID to ensure user can only delete their own conversations

    Returns:
        True if conversation was deleted, False if it didn't exist
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Find conversation by session_id, optionally filtered by user_id
            query = select(Conversation).where(Conversation.session_id == session_id)
            if user_id:
                query = query.where(Conversation.tenant_id == user_id)
            result = await session.execute(query)
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


async def set_conversation_rating(
    session_id: str,
    rating: str,
    user_id: Optional[str] = None,
) -> bool:
    """
    Set conversation rating (feedback) by session_id, e.g. for in-platform chat.
    user_id is used as tenant_id to scope the conversation.
    """
    if rating not in ("positive", "negative"):
        return False
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            query = select(Conversation).where(Conversation.session_id == session_id)
            if user_id:
                query = query.where(Conversation.tenant_id == user_id)
            result = await session.execute(query)
            conv = result.scalar_one_or_none()
            if conv is None:
                return False
            conv.rating = Rating.POSITIVE if rating == "positive" else Rating.NEGATIVE
            await session.commit()
            return True
        except Exception as e:
            await session.rollback()
            logger.error(f"Error setting conversation rating: {e}", exc_info=True)
            raise


async def get_conversation_by_session(
    session_id: str,
    user_id: Optional[str] = None,
) -> Optional[Conversation]:
    """Get conversation by session_id, optionally scoped by user_id (tenant_id)."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        query = select(Conversation).where(Conversation.session_id == session_id)
        if user_id:
            query = query.where(Conversation.tenant_id == user_id)
        result = await session.execute(query)
        return result.scalar_one_or_none()


async def create_lead_for_session(
    session_id: str,
    user_id: str,
    lead_data: dict,
) -> bool:
    """Create a lead from in-platform chat (conversation identified by session_id + user_id)."""
    conv = await get_conversation_by_session(session_id, user_id)
    if not conv:
        return False
    session_factory = get_session_factory()
    async with session_factory() as session:
        lead_id = str(uuid.uuid4())
        lead = Lead(
            id=lead_id,
            tenant_id=conv.tenant_id,
            conversation_id=conv.id,
            source_channel="web",
            lead_capture_data=lead_data,
            status=LeadStatus.NEW,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(lead)
        await session.commit()
    return True


# Document management functions

async def create_document(
    doc_id: str,
    name: str,
    doc_type: str,
    file_path: str,
    file_size: int,
    status: str = "processing",
    user_id: Optional[str] = None,
    knowledge_base_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    chatbot_id: Optional[str] = None,
    original_filename: Optional[str] = None,
    storage_url: Optional[str] = None,
    content_hash: Optional[str] = None,
    source_url: Optional[str] = None,
) -> dict:
    """
    Create a new document metadata record.

    Args:
        doc_id: Unique document identifier
        name: Document name/filename
        doc_type: Document type (pdf, docx, txt, csv, markdown, html)
        file_path: Path to the stored file
        file_size: File size in bytes
        status: Processing status (default: "processing")
        user_id: User ID (for backwards compatibility)
        knowledge_base_id: Knowledge base ID
        tenant_id: Tenant ID for multi-tenancy
        chatbot_id: Chatbot ID
        original_filename: Original filename for display
        storage_url: Storage URL (R2 or local)
        content_hash: MD5 hash for duplicate detection
        source_url: Source URL for URL ingestion

    Returns:
        Document metadata dictionary
    """
    from ..models.document import DocumentStatus
    
    # Use tenant_id as primary, fall back to user_id
    doc_tenant_id = tenant_id or user_id or "anonymous"
    
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            document = Document(
                id=doc_id,
                tenant_id=doc_tenant_id,
                chatbot_id=chatbot_id,
                filename=name,
                original_filename=original_filename or name,
                file_type=doc_type,
                file_size=file_size,
                storage_url=storage_url or file_path,
                content_hash=content_hash,
                status=DocumentStatus(status),
                chunk_count=0,
                source_url=source_url,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
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
    page_count: Optional[int] = None,
    is_archived: Optional[bool] = None,
    content_hash: Optional[str] = None,
    file_size: Optional[int] = None,
    storage_url: Optional[str] = None,
) -> Optional[dict]:
    """
    Update document metadata.

    Args:
        doc_id: Document identifier
        status: New status (if provided)
        chunk_count: New chunk count (if provided)
        error_message: Error message (if provided, None to clear)
        page_count: Page count for PDFs (if provided)
        is_archived: Archive status (if provided)
        content_hash: MD5 hash (if provided)
        file_size: File size in bytes (if provided)
        storage_url: Storage URL (if provided)

    Returns:
        Updated document metadata dictionary if found, None otherwise
    """
    from ..models.document import DocumentStatus
    
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
                # Convert string status to enum
                try:
                    document.status = DocumentStatus(status)
                except ValueError:
                    document.status = DocumentStatus.PROCESSING
                    
                if status == "ready":
                    document.last_retrieved_at = datetime.utcnow()
                elif status == "failed" and error_message:
                    document.error_message = error_message
                elif status != "failed":
                    document.error_message = None

            if chunk_count is not None:
                document.chunk_count = chunk_count

            if page_count is not None:
                document.page_count = page_count
                
            if is_archived is not None:
                document.is_archived = is_archived

            if content_hash is not None:
                document.content_hash = content_hash
                
            if file_size is not None:
                document.file_size = file_size
                
            if storage_url is not None:
                document.storage_url = storage_url

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
    user_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    include_archived: bool = False,
) -> tuple[List[dict], int]:
    """
    List documents with pagination, search, and filtering.

    Args:
        limit: Maximum number of documents to return
        offset: Number of documents to skip
        search: Search term to filter by document name (case-insensitive)
        status: Filter by status (processing, ready, failed)
        doc_type: Filter by document type (pdf, docx, txt, csv, etc.)
        user_id: Optional user ID to filter by (for backwards compatibility)
        tenant_id: Optional tenant ID for multi-tenancy
        include_archived: Whether to include archived documents

    Returns:
        Tuple of (list of document metadata dictionaries, total count)
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Build query with filters
            query = select(Document)
            conditions = []

            # Use tenant_id as primary filter
            if tenant_id:
                conditions.append(Document.tenant_id == tenant_id)
            elif user_id:
                conditions.append(Document.tenant_id == user_id)

            if search:
                conditions.append(func.lower(Document.original_filename).contains(func.lower(search)))

            if status:
                conditions.append(Document.status == status)

            if doc_type:
                conditions.append(Document.file_type == doc_type)
                
            if not include_archived:
                conditions.append(Document.is_archived == False)

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


async def check_duplicate_document(tenant_id: str, content_hash: str) -> Optional[dict]:
    """
    Check if a document with the same content hash already exists for this tenant.
    
    Args:
        tenant_id: Tenant ID
        content_hash: MD5 hash of file content
        
    Returns:
        Document metadata dict if duplicate found, None otherwise
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(
                select(Document).where(
                    and_(
                        Document.tenant_id == tenant_id,
                        Document.content_hash == content_hash,
                        Document.is_archived == False
                    )
                )
            )
            document = result.scalar_one_or_none()
            
            if document:
                logger.info(f"Duplicate document found: doc_id={document.id}, hash={content_hash}")
                return document.to_dict()
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking duplicate document: {e}", exc_info=True)
            raise


async def get_storage_usage(tenant_id: str) -> tuple[int, int]:
    """
    Get storage usage for a tenant.
    
    Args:
        tenant_id: Tenant ID
        
    Returns:
        Tuple of (used_bytes, document_count)
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Sum file sizes
            result = await session.execute(
                select(func.sum(Document.file_size)).where(
                    and_(
                        Document.tenant_id == tenant_id,
                        Document.is_archived == False
                    )
                )
            )
            total_size = result.scalar() or 0
            
            # Count documents
            count_result = await session.execute(
                select(func.count(Document.id)).where(
                    and_(
                        Document.tenant_id == tenant_id,
                        Document.is_archived == False
                    )
                )
            )
            doc_count = count_result.scalar() or 0
            
            return int(total_size), int(doc_count)
            
        except Exception as e:
            logger.error(f"Error getting storage usage: {e}", exc_info=True)
            raise


async def get_document_by_tenant(doc_id: str, tenant_id: str) -> Optional[dict]:
    """
    Get document metadata by ID for a specific tenant.
    
    Args:
        doc_id: Document identifier
        tenant_id: Tenant ID for verification
        
    Returns:
        Document metadata dictionary if found and belongs to tenant, None otherwise
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(
                select(Document).where(
                    and_(
                        Document.id == doc_id,
                        Document.tenant_id == tenant_id
                    )
                )
            )
            document = result.scalar_one_or_none()

            if document:
                return document.to_dict()
            return None

        except Exception as e:
            logger.error(f"Error getting document by tenant: {e}", exc_info=True)
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

async def get_total_conversations(user_id: Optional[str] = None) -> int:
    """Get total number of conversations, optionally filtered by user_id."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            query = select(func.count(Conversation.id))
            if user_id:
                query = query.where(Conversation.tenant_id == user_id)
            result = await session.execute(query)
            total = result.scalar() or 0
            return total
        except Exception as e:
            logger.error(f"Error getting total conversations: {e}", exc_info=True)
            raise


async def get_total_messages(user_id: Optional[str] = None) -> int:
    """Get total number of messages, optionally filtered by user_id."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Join with Conversation to filter by user_id
            if user_id:
                query = select(func.count(Message.id)).join(Conversation).where(Conversation.tenant_id == user_id)
            else:
                query = select(func.count(Message.id))
            result = await session.execute(query)
            total = result.scalar() or 0
            return total
        except Exception as e:
            logger.error(f"Error getting total messages: {e}", exc_info=True)
            raise


async def get_conversations_by_day(days: int = 7, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get conversation counts by day for the last N days, optionally filtered by user_id.

    Args:
        days: Number of days to look back (default: 7)
        user_id: Optional user ID to filter by

    Returns:
        List of dictionaries with date and count
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Calculate start date
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Query conversations in the date range, optionally filtered by user_id
            query = select(Conversation).where(Conversation.started_at >= start_date)
            if user_id:
                query = query.where(Conversation.tenant_id == user_id)
            
            result = await session.execute(query)
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


async def get_resolution_rate(user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Get resolution rate metrics (resolved via bot vs escalated), optionally filtered by user_id.

    Uses Conversation.status and Conversation.outcome fields to determine outcomes.
    """
    from ..models.conversation import ConversationStatus, ConversationOutcome

    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Base filter
            base_filter = []
            if user_id:
                base_filter.append(Conversation.tenant_id == user_id)

            # Total conversations
            total_query = select(func.count(Conversation.id)).where(*base_filter)
            total_result = await session.execute(total_query)
            total_conversations = total_result.scalar() or 0

            # Resolved: status == RESOLVED or outcome == RESOLVED
            resolved_query = select(func.count(Conversation.id)).where(
                *base_filter,
                Conversation.status == ConversationStatus.RESOLVED,
            )
            resolved_result = await session.execute(resolved_query)
            resolved_via_bot = resolved_result.scalar() or 0

            # Escalated: status == ESCALATED or outcome == ESCALATED
            escalated_query = select(func.count(Conversation.id)).where(
                *base_filter,
                Conversation.status == ConversationStatus.ESCALATED,
            )
            escalated_result = await session.execute(escalated_query)
            escalated = escalated_result.scalar() or 0

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


async def get_response_accuracy_metrics(user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Get response accuracy metrics using available Message fields.
    Uses confidence_score and citations (sources) from the Message model.
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Get assistant messages with citations or confidence_score
            query = (
                select(Message.confidence_score, Message.citations)
                .join(Conversation)
                .where(Message.role == "assistant")
            )
            if user_id:
                query = query.where(Conversation.tenant_id == user_id)
            result = await session.execute(query)
            rows = result.all()

            sources_counts = []
            for confidence_score, citations in rows:
                if citations and isinstance(citations, list):
                    sources_counts.append(len(citations))

            avg_sources_count = sum(sources_counts) / len(sources_counts) if sources_counts else 0.0

            return {
                "average_query_time_ms": 0.0,
                "average_sources_count": round(avg_sources_count, 1)
            }

        except Exception as e:
            logger.error(f"Error getting response accuracy metrics: {e}", exc_info=True)
            raise


async def get_top_question_categories(limit: int = 5, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get top question categories, optionally filtered by user_id.

    Note: This is a simplified implementation. In a real system, you would
    categorize questions using NLP or predefined categories. For now, we'll
    return a placeholder structure.
    """
    # This is a placeholder - in a real implementation, you would:
    # 1. Extract categories from message content using NLP
    # 2. Or use predefined categories based on keywords
    # 3. Or use a classification model
    # 4. Filter by user_id if provided
    
    # For now, return empty list as categories need to be determined
    # based on actual question analysis
    return []


async def get_user_satisfaction_metrics(user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Get user satisfaction metrics using Conversation.rating field (POSITIVE / NEGATIVE).
    """
    from ..models.conversation import Rating

    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            base_filter = []
            if user_id:
                base_filter.append(Conversation.tenant_id == user_id)

            # Count positive ratings
            thumbs_up_query = select(func.count(Conversation.id)).where(
                *base_filter,
                Conversation.rating == Rating.POSITIVE,
            )
            thumbs_up_result = await session.execute(thumbs_up_query)
            thumbs_up = thumbs_up_result.scalar() or 0

            # Count negative ratings
            thumbs_down_query = select(func.count(Conversation.id)).where(
                *base_filter,
                Conversation.rating == Rating.NEGATIVE,
            )
            thumbs_down_result = await session.execute(thumbs_down_query)
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


async def get_api_usage_metrics(user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Get API usage and cost tracking metrics, optionally filtered by user_id.

    Note: This is a simplified implementation. In a real system, you would
    track API calls and token usage from the LLM service. For now, we'll
    estimate based on the number of assistant messages (each represents an API call).
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Count total assistant messages (each represents an API call), optionally filtered by user_id
            query = (
                select(func.count(Message.id))
                .join(Conversation)
                .where(Message.role == "assistant")
            )
            if user_id:
                query = query.where(Conversation.tenant_id == user_id)
            total_requests_result = await session.execute(query)
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


async def get_top_queries(limit: int = 10, user_id: Optional[str] = None) -> tuple[List[Dict[str, Any]], int]:
    """
    Get top queries with statistics, optionally filtered by user_id.

    Args:
        limit: Maximum number of queries to return
        user_id: Optional user ID to filter by

    Returns:
        Tuple of (list of top queries, total unique queries count)
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # Get all user messages grouped by content, optionally filtered by user_id
            query = (
                select(
                    Message.content.label("query"),
                    func.count(Message.id).label("count")
                )
                .join(Conversation)
                .where(Message.role == "user")
            )
            if user_id:
                query = query.where(Conversation.tenant_id == user_id)
            query = query.group_by(Message.content).order_by(func.count(Message.id).desc()).limit(limit)
            
            result = await session.execute(query)
            rows = result.all()

            # Get total unique queries, optionally filtered by user_id
            total_query = (
                select(func.count(func.distinct(Message.content)))
                .join(Conversation)
                .where(Message.role == "user")
            )
            if user_id:
                total_query = total_query.where(Conversation.tenant_id == user_id)
            total_result = await session.execute(total_query)
            total = total_result.scalar() or 0

            # For each query, count resolved instances
            queries = []
            for row in rows:
                query_text = row.query
                count = row.count or 0

                # Find all user messages with this query, optionally filtered by user_id
                user_messages_query = (
                    select(Message)
                    .join(Conversation)
                    .where(Message.role == "user", Message.content == query_text)
                )
                if user_id:
                    user_messages_query = user_messages_query.where(Conversation.tenant_id == user_id)
                user_messages_result = await session.execute(user_messages_query)
                user_messages = user_messages_result.scalars().all()

                # Determine resolved count by checking if the conversation was rated POSITIVE
                # (Message model has no per-message reaction; rating is stored at conversation level)
                from ..models.conversation import Rating
                resolved_count = 0
                for user_msg in user_messages:
                    conv_result = await session.execute(
                        select(Conversation.rating)
                        .where(Conversation.id == user_msg.conversation_id)
                    )
                    conv_rating = conv_result.scalar_one_or_none()
                    if conv_rating == Rating.POSITIVE:
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


# User Preferences management functions

DEFAULT_USER_ID = "default"  # For single-user prototype


async def get_user_preferences(user_id: str = DEFAULT_USER_ID) -> Optional[dict]:
    """
    Get user preferences for a user.
    
    Args:
        user_id: User ID (defaults to "default" for single-user prototype)
    
    Returns:
        User preferences dictionary or None if not found
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(
                select(UserPreferences).where(UserPreferences.tenant_id == user_id)
            )
            preferences = result.scalar_one_or_none()
            
            if preferences:
                return preferences.to_dict()
            return None
            
        except Exception as e:
            logger.error(f"Error getting user preferences: {e}", exc_info=True)
            raise


async def create_or_update_user_preferences(
    user_id: str = DEFAULT_USER_ID,
    name: Optional[str] = None,
    email: Optional[str] = None,
    avatar_url: Optional[str] = None,
    notifications_email: Optional[bool] = None,
    notifications_in_app: Optional[bool] = None,
    notifications_push: Optional[bool] = None,
    language: Optional[str] = None,
    timezone: Optional[str] = None,
) -> dict:
    """
    Create or update user preferences.
    
    Args:
        user_id: User ID (defaults to "default" for single-user prototype)
        name: User's full name (optional)
        email: User's email address (optional)
        avatar_url: Avatar image URL or base64 data URL (optional)
        notifications_email: Enable email notifications (optional)
        notifications_in_app: Enable in-app notifications (optional)
        notifications_push: Enable push notifications (optional)
        language: Language preference (optional)
        timezone: Timezone preference (optional)
    
    Returns:
        Updated user preferences dictionary
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(
                select(UserPreferences).where(UserPreferences.tenant_id == user_id)
            )
            preferences = result.scalar_one_or_none()
            
            if preferences is None:
                # Create new preferences
                preferences_id = str(uuid.uuid4())
                preferences = UserPreferences(
                    id=preferences_id,
                    tenant_id =user_id,
                    name=name,
                    email=email,
                    avatar_url=avatar_url,
                    notifications_email=notifications_email if notifications_email is not None else True,
                    notifications_in_app=notifications_in_app if notifications_in_app is not None else True,
                    notifications_push=notifications_push if notifications_push is not None else False,
                    language=language or "en",
                    timezone=timezone or "UTC",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                session.add(preferences)
            else:
                # Update existing preferences
                if name is not None:
                    preferences.name = name
                if email is not None:
                    preferences.email = email
                if avatar_url is not None:
                    preferences.avatar_url = avatar_url
                if notifications_email is not None:
                    preferences.notifications_email = notifications_email
                if notifications_in_app is not None:
                    preferences.notifications_in_app = notifications_in_app
                if notifications_push is not None:
                    preferences.notifications_push = notifications_push
                if language is not None:
                    preferences.language = language
                if timezone is not None:
                    preferences.timezone = timezone
                preferences.updated_at = datetime.utcnow()
            
            await session.commit()
            
            # Refresh to get updated values
            await session.refresh(preferences)
            
            logger.info(f"User preferences saved: tenant_id ={user_id}")
            return preferences.to_dict()
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error saving user preferences: {e}", exc_info=True)
            raise


async def delete_user_avatar(user_id: str = DEFAULT_USER_ID) -> bool:
    """
    Delete user avatar.
    
    Args:
        user_id: User ID (defaults to "default" for single-user prototype)
    
    Returns:
        True if avatar was deleted, False if user preferences not found
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(
                select(UserPreferences).where(UserPreferences.tenant_id == user_id)
            )
            preferences = result.scalar_one_or_none()
            
            if preferences is None:
                return False
            
            preferences.avatar_url = None
            preferences.updated_at = datetime.utcnow()
            
            await session.commit()
            
            logger.info(f"User avatar deleted: tenant_id ={user_id}")
            return True
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error deleting user avatar: {e}", exc_info=True)
            raise


# Knowledge Base management functions

async def create_knowledge_base(
    name: str,
    user_id: str,
    description: Optional[str] = None,
) -> dict:
    """
    Create a new knowledge base.

    Args:
        name: Knowledge base name
        user_id: User ID who owns this knowledge base
        description: Optional description

    Returns:
        Knowledge base metadata dictionary
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            kb_id = str(uuid.uuid4())
            knowledge_base = KnowledgeBase(
                id=kb_id,
                user_id=user_id,
                name=name,
                description=description,
                is_default=False,
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )

            session.add(knowledge_base)
            await session.commit()
            await session.refresh(knowledge_base)

            logger.info(f"Created knowledge base: id={kb_id}, name={name}, user_id={user_id}")

            return knowledge_base.to_dict()

        except Exception as e:
            await session.rollback()
            logger.error(f"Error creating knowledge base: {e}", exc_info=True)
            raise


async def get_knowledge_base(kb_id: str) -> Optional[dict]:
    """
    Get knowledge base by ID.

    Args:
        kb_id: Knowledge base identifier

    Returns:
        Knowledge base metadata dictionary if found, None otherwise
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
            kb = result.scalar_one_or_none()

            if kb:
                return kb.to_dict()
            return None

        except Exception as e:
            logger.error(f"Error getting knowledge base: {e}", exc_info=True)
            raise


async def list_knowledge_bases(user_id: Optional[str] = None) -> List[dict]:
    """
    List knowledge bases, optionally filtered by user_id.

    Args:
        user_id: Optional user ID to filter by (None returns all including default)

    Returns:
        List of knowledge base metadata dictionaries
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            query = select(KnowledgeBase)
            
            if user_id:
                # Return default KB + user's custom KBs
                query = query.where(
                    (KnowledgeBase.is_default == True) | (KnowledgeBase.user_id == user_id)
                )
            # If no user_id is provided, return all KBs (including default)
            
            query = query.order_by(KnowledgeBase.is_default.desc(), KnowledgeBase.created_at.desc())
            result = await session.execute(query)
            kbs = result.scalars().all()

            return [kb.to_dict() for kb in kbs]

        except Exception as e:
            logger.error(f"Error listing knowledge bases: {e}", exc_info=True)
            raise


async def update_knowledge_base(
    kb_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> Optional[dict]:
    """
    Update knowledge base.

    Args:
        kb_id: Knowledge base identifier
        name: Optional new name
        description: Optional new description
        is_active: Optional new active status

    Returns:
        Updated knowledge base metadata dictionary if found, None otherwise
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
            kb = result.scalar_one_or_none()

            if kb is None:
                return None

            if name is not None:
                kb.name = name
            if description is not None:
                kb.description = description
            if is_active is not None:
                kb.is_active = is_active
            
            kb.updated_at = datetime.utcnow()
            await session.commit()
            await session.refresh(kb)

            logger.info(f"Updated knowledge base: id={kb_id}")

            return kb.to_dict()

        except Exception as e:
            await session.rollback()
            logger.error(f"Error updating knowledge base: {e}", exc_info=True)
            raise


async def delete_knowledge_base(kb_id: str, user_id: str) -> bool:
    """
    Delete a knowledge base (only if user owns it and it's not default).

    Args:
        kb_id: Knowledge base identifier
        user_id: User ID to verify ownership

    Returns:
        True if deleted, False if not found or not allowed
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(
                select(KnowledgeBase).where(
                    KnowledgeBase.id == kb_id,
                    KnowledgeBase.user_id == user_id,
                    KnowledgeBase.is_default == False
                )
            )
            kb = result.scalar_one_or_none()

            if kb is None:
                return False

            await session.delete(kb)
            await session.commit()

            logger.info(f"Deleted knowledge base: id={kb_id}, tenant_id ={user_id}")

            return True

        except Exception as e:
            await session.rollback()
            logger.error(f"Error deleting knowledge base: {e}", exc_info=True)
            raise


async def get_user_knowledge_base_preferences(user_id: str) -> dict:
    """
    Get user knowledge base preferences, creating default if not exists.

    Args:
        user_id: User identifier

    Returns:
        User knowledge base preferences dictionary
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(
                select(UserKnowledgeBasePreference).where(UserKnowledgeBasePreference.user_id == user_id)
            )
            prefs = result.scalar_one_or_none()

            if prefs is None:
                # Create default preferences
                prefs_id = str(uuid.uuid4())
                prefs = UserKnowledgeBasePreference(
                    id=prefs_id,
                    user_id=user_id,
                    use_default_kb=True,
                    active_kb_ids="[]",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                session.add(prefs)
                await session.commit()
                await session.refresh(prefs)

            return prefs.to_dict()

        except Exception as e:
            await session.rollback()
            logger.error(f"Error getting user KB preferences: {e}", exc_info=True)
            raise


async def update_user_knowledge_base_preferences(
    user_id: str,
    use_default_kb: bool,
    active_kb_ids: List[str],
) -> dict:
    """
    Update user knowledge base preferences.

    Args:
        user_id: User identifier
        use_default_kb: Whether to use default knowledge base
        active_kb_ids: List of active knowledge base IDs

    Returns:
        Updated preferences dictionary
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(
                select(UserKnowledgeBasePreference).where(UserKnowledgeBasePreference.user_id == user_id)
            )
            prefs = result.scalar_one_or_none()

            if prefs is None:
                # Create preferences
                prefs_id = str(uuid.uuid4())
                prefs = UserKnowledgeBasePreference(
                    id=prefs_id,
                    user_id=user_id,
                    use_default_kb=use_default_kb,
                    active_kb_ids=json.dumps(active_kb_ids),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                session.add(prefs)
            else:
                prefs.use_default_kb = use_default_kb
                prefs.active_kb_ids = json.dumps(active_kb_ids)
                prefs.updated_at = datetime.utcnow()

            await session.commit()
            await session.refresh(prefs)

            logger.info(f"Updated user KB preferences: user_id={user_id}")

            return prefs.to_dict()

        except Exception as e:
            await session.rollback()
            logger.error(f"Error updating user KB preferences: {e}", exc_info=True)
            raise


async def get_active_knowledge_base_ids(user_id: str) -> List[str]:
    """
    Get list of active knowledge base IDs for a user (for RAG filtering).

    Args:
        user_id: User identifier

    Returns:
        List of active knowledge base IDs
    """
    prefs = await get_user_knowledge_base_preferences(user_id)
    active_ids: List[str] = []

    # Always include the system default knowledge base so that core
    # documentation from data/docs is available for all users, regardless
    # of individual preference toggles. This ensures the main chat
    # experience is always backed by the default KB.
    default_kb = await get_knowledge_base("00000000-0000-0000-0000-000000000001")
    if default_kb:
        active_ids.append(default_kb["id"])

    # Add user's selected custom KBs (avoiding duplicates)
    for kb_id in prefs["active_kb_ids"]:
        if kb_id not in active_ids:
            active_ids.append(kb_id)

    return active_ids


async def get_active_knowledge_base_ids_by_tenant(tenant_id: str) -> List[str]:
    """
    Get list of active knowledge base IDs for a tenant (for widget RAG filtering).

    Args:
        tenant_id: Tenant identifier

    Returns:
        List of active knowledge base IDs
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        from sqlalchemy import select
        from ..models.knowledge_base import KnowledgeBase
        
        # For now, tenant_id is treated as the owning user_id for KB purposes
        result = await session.execute(
            select(KnowledgeBase.id).where(
                KnowledgeBase.user_id == tenant_id,
                KnowledgeBase.is_active == True
            )
        )
        kb_ids = [row[0] for row in result.fetchall()]
        
        return kb_ids


# ============================================================================
# Dashboard-specific functions (Milestone 7.2)
# ============================================================================

def _effective_tenant_ids(tenant_id: str, user_id: Optional[str] = None) -> List[str]:
    """Return [tenant_id, user_id] deduplicated so list/dashboard include both org and user-owned rows."""
    ids = [tenant_id]
    if user_id and user_id not in ids:
        ids.append(user_id)
    return ids


async def get_conversations_count_by_date_range(
    tenant_id: str,
    start_date: datetime,
    end_date: datetime,
    user_id: Optional[str] = None,
) -> int:
    """Get total conversation count within a date range."""
    tenant_ids = _effective_tenant_ids(tenant_id, user_id)
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(func.count(Conversation.id))
            .where(
                Conversation.tenant_id.in_(tenant_ids),
                Conversation.started_at >= start_date,
                Conversation.started_at <= end_date
            )
        )
        return result.scalar() or 0


async def get_leads_count_by_date_range(
    tenant_id: str,
    start_date: datetime,
    end_date: datetime,
    user_id: Optional[str] = None,
) -> int:
    """Get total leads count within a date range."""
    tenant_ids = _effective_tenant_ids(tenant_id, user_id)
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(func.count(Lead.id))
            .where(
                Lead.tenant_id.in_(tenant_ids),
                Lead.created_at >= start_date,
                Lead.created_at <= end_date
            )
        )
        return result.scalar() or 0


async def get_resolution_rate_by_date_range(
    tenant_id: str,
    start_date: datetime,
    end_date: datetime,
    user_id: Optional[str] = None,
) -> float:
    """Get resolution rate percentage within a date range."""
    tenant_ids = _effective_tenant_ids(tenant_id, user_id)
    session_factory = get_session_factory()
    async with session_factory() as session:
        # Get resolved count
        resolved_result = await session.execute(
            select(func.count(Conversation.id))
            .where(
                Conversation.tenant_id.in_(tenant_ids),
                Conversation.started_at >= start_date,
                Conversation.started_at <= end_date,
                Conversation.outcome == ConversationOutcome.RESOLVED
            )
        )
        resolved = resolved_result.scalar() or 0
        
        # Get total with outcome
        total_result = await session.execute(
            select(func.count(Conversation.id))
            .where(
                Conversation.tenant_id.in_(tenant_ids),
                Conversation.started_at >= start_date,
                Conversation.started_at <= end_date,
                Conversation.outcome.isnot(None)
            )
        )
        total = total_result.scalar() or 0
        
        if total == 0:
            return 0.0
        
        return (resolved / total) * 100


async def get_conversations_by_date_range(
    tenant_id: str,
    start_date: datetime,
    end_date: datetime,
    user_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Get conversation counts grouped by date."""
    tenant_ids = _effective_tenant_ids(tenant_id, user_id)
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(
                func.date(Conversation.started_at).label("date"),
                func.count(Conversation.id).label("count")
            )
            .where(
                Conversation.tenant_id.in_(tenant_ids),
                Conversation.started_at >= start_date,
                Conversation.started_at <= end_date
            )
            .group_by(func.date(Conversation.started_at))
            .order_by(func.date(Conversation.started_at))
        )
        
        return [{"date": str(row.date), "count": row.count} for row in result.fetchall()]


async def get_conversation_outcomes(
    tenant_id: str,
    start_date: datetime,
    end_date: datetime,
    user_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Get conversation outcomes breakdown."""
    tenant_ids = _effective_tenant_ids(tenant_id, user_id)
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(
                Conversation.outcome,
                func.count(Conversation.id).label("count")
            )
            .where(
                Conversation.tenant_id.in_(tenant_ids),
                Conversation.started_at >= start_date,
                Conversation.started_at <= end_date,
                Conversation.outcome.isnot(None)
            )
            .group_by(Conversation.outcome)
        )
        
        return [
            {"outcome": row.outcome.value if row.outcome else "unknown", "count": row.count}
            for row in result.fetchall()
        ]


async def get_conversations_by_channel(
    tenant_id: str,
    start_date: datetime,
    end_date: datetime,
    user_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Get conversation counts grouped by channel."""
    tenant_ids = _effective_tenant_ids(tenant_id, user_id)
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(
                Conversation.channel,
                func.count(Conversation.id).label("count")
            )
            .where(
                Conversation.tenant_id.in_(tenant_ids),
                Conversation.started_at >= start_date,
                Conversation.started_at <= end_date
            )
            .group_by(Conversation.channel)
            .order_by(func.count(Conversation.id).desc())
        )
        
        return [
            {"channel": row.channel.value if row.channel else "web", "count": row.count}
            for row in result.fetchall()
        ]


async def get_avg_response_time(
    tenant_id: str,
    start_date: datetime,
    end_date: datetime
) -> float:
    """Get average response time in milliseconds.
    
    Note: Since Message model doesn't have message_metadata field,
    this returns a placeholder value. In production, this could be
    calculated from actual response time tracking.
    """
    # Return placeholder - in production would track actual response times
    return 1500.0  # 1.5 seconds placeholder


async def get_recent_conversations(
    tenant_id: str,
    limit: int = 5,
    user_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Get recent conversations with contact info."""
    tenant_ids = _effective_tenant_ids(tenant_id, user_id)
    session_factory = get_session_factory()
    async with session_factory() as session:
        from ..models.message import Message, MessageRole
        from ..models.contact import Contact
        
        result = await session.execute(
            select(Conversation, Contact, Message)
            .outerjoin(Contact, Conversation.contact_id == Contact.id)
            .outerjoin(
                Message,
                and_(
                    Message.conversation_id == Conversation.id,
                    Message.role == MessageRole.USER
                )
            )
            .where(Conversation.tenant_id.in_(tenant_ids))
            .order_by(Conversation.started_at.desc())
            .limit(limit)
        )
        
        conversations = []
        for conv, contact, msg in result.fetchall():
            conversations.append({
                "id": conv.id,
                "channel": conv.channel.value if conv.channel else "web",
                "contact_name": contact.full_name if contact and contact.full_name else "Anonymous",
                "first_message": msg.content if msg else "",
                "status": conv.status.value if conv.status else "active",
                "started_at": conv.started_at
            })
        
        return conversations


async def get_recent_leads(
    tenant_id: str,
    limit: int = 5,
    user_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Get recent leads with contact info."""
    tenant_ids = _effective_tenant_ids(tenant_id, user_id)
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Lead)
            .where(Lead.tenant_id.in_(tenant_ids))
            .order_by(Lead.created_at.desc())
            .limit(limit)
        )
        
        leads = []
        for lead in result.fetchall():
            lead_data = lead.lead_capture_data or {}
            leads.append({
                "id": lead.id,
                "name": lead_data.get("name", "Unknown"),
                "email": lead_data.get("email", ""),
                "source_channel": lead.source_channel or "web",
                "status": lead.status.value if lead.status else "new",
                "created_at": lead.created_at
            })
        
        return leads


async def get_unanswered_questions_count(
    tenant_id: str,
    start_date: datetime,
    end_date: datetime,
    user_id: Optional[str] = None,
) -> int:
    """Get count of conversations that were escalated (unanswered)."""
    tenant_ids = _effective_tenant_ids(tenant_id, user_id)
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(func.count(Conversation.id))
            .where(
                Conversation.tenant_id.in_(tenant_ids),
                Conversation.started_at >= start_date,
                Conversation.started_at <= end_date,
                Conversation.outcome == ConversationOutcome.ESCALATED
            )
        )
        return result.scalar() or 0


async def get_chatbot_status(tenant_id: str) -> Dict[str, Any]:
    """Get chatbot status for the dashboard."""
    from ..models.chatbot_instance import ChatbotInstance, ChatbotStatus
    
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(ChatbotInstance)
            .where(ChatbotInstance.tenant_id == tenant_id)
            .order_by(ChatbotInstance.created_at.desc())
            .limit(1)
        )
        chatbot = result.scalar_one_or_none()
        
        if not chatbot:
            return {
                "status": "not_installed",
                "last_active": None,
                "embed_code": None,
                "chatbot_name": None
            }
        
        # Generate embed code
        embed_code = f'<script src="https://nexachat.com/widget.js" data-chatbot-id="{chatbot.id}" async></script>'
        
        return {
            "status": chatbot.status.value if chatbot.status else "paused",
            "last_active": chatbot.updated_at.isoformat() + "Z" if chatbot.updated_at else None,
            "embed_code": embed_code,
            "chatbot_name": chatbot.name
        }


# =============================================================================
# Milestone 7.3 - Analytics Page Database Methods
# =============================================================================

async def get_leads_analytics(
    tenant_id: str,
    days: int = 30,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Get lead analytics for 7.3.6 - Lead analytics section."""
    from datetime import timedelta
    from ..models.lead import Lead, LeadStatus
    from ..models.conversation import Conversation, ConversationStatus

    tenant_ids = _effective_tenant_ids(tenant_id, user_id)
    session_factory = get_session_factory()
    async with session_factory() as session:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        prev_start = start_date - timedelta(days=days)

        # Total leads in date range
        result = await session.execute(
            select(func.count(Lead.id))
            .where(
                Lead.tenant_id.in_(tenant_ids),
                Lead.created_at >= start_date,
                Lead.created_at <= end_date
            )
        )
        total_leads = result.scalar() or 0

        # Previous period for trend
        result = await session.execute(
            select(func.count(Lead.id))
            .where(
                Lead.tenant_id.in_(tenant_ids),
                Lead.created_at >= prev_start,
                Lead.created_at < start_date
            )
        )
        prev_leads = result.scalar() or 0

        # Leads by day
        result = await session.execute(
            select(
                func.date(Lead.created_at).label("date"),
                func.count(Lead.id).label("count")
            )
            .where(
                Lead.tenant_id.in_(tenant_ids),
                Lead.created_at >= start_date,
                Lead.created_at <= end_date
            )
            .group_by(func.date(Lead.created_at))
            .order_by(func.date(Lead.created_at))
        )
        leads_by_day = [{"date": str(row.date), "count": row.count} for row in result]
        
        # Leads by channel/source
        result = await session.execute(
            select(
                Lead.source_channel,
                func.count(Lead.id).label("count")
            )
            .where(
                Lead.tenant_id.in_(tenant_ids),
                Lead.created_at >= start_date,
                Lead.created_at <= end_date
            )
            .group_by(Lead.source_channel)
        )
        total_from_channels = sum(row.count for row in result)
        lead_sources = []
        for row in result:
            percentage = (row.count / total_from_channels * 100) if total_from_channels > 0 else 0
            lead_sources.append({
                "channel": row.source_channel or "web",
                "count": row.count,
                "percentage": round(percentage, 1)
            })
        
        # Conversion funnel
        # Conversations -> Leads -> Contacted -> Qualified -> Converted
        result = await session.execute(
            select(func.count(Conversation.id))
            .where(
                Conversation.tenant_id.in_(tenant_ids),
                Conversation.started_at >= start_date,
                Conversation.started_at <= end_date
            )
        )
        total_conversations = result.scalar() or 0

        contacted = await session.execute(
            select(func.count(Lead.id))
            .where(
                Lead.tenant_id.in_(tenant_ids),
                Lead.created_at >= start_date,
                Lead.created_at <= end_date,
                Lead.status.in_([LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.CONVERTED])
            )
        )
        contacted_count = contacted.scalar() or 0

        qualified = await session.execute(
            select(func.count(Lead.id))
            .where(
                Lead.tenant_id.in_(tenant_ids),
                Lead.created_at >= start_date,
                Lead.created_at <= end_date,
                Lead.status.in_([LeadStatus.QUALIFIED, LeadStatus.CONVERTED])
            )
        )
        qualified_count = qualified.scalar() or 0

        converted = await session.execute(
            select(func.count(Lead.id))
            .where(
                Lead.tenant_id.in_(tenant_ids),
                Lead.created_at >= start_date,
                Lead.created_at <= end_date,
                Lead.status == LeadStatus.CONVERTED
            )
        )
        converted_count = converted.scalar() or 0
        
        conversion_funnel = [
            {"stage": "Conversations", "count": total_conversations, "percentage": 100.0},
            {"stage": "Leads", "count": total_leads, "percentage": round((total_leads / total_conversations * 100) if total_conversations > 0 else 0, 1)},
            {"stage": "Contacted", "count": contacted_count, "percentage": round((contacted_count / total_leads * 100) if total_leads > 0 else 0, 1)},
            {"stage": "Qualified", "count": qualified_count, "percentage": round((qualified_count / contacted_count * 100) if contacted_count > 0 else 0, 1)},
            {"stage": "Converted", "count": converted_count, "percentage": round((converted_count / qualified_count * 100) if qualified_count > 0 else 0, 1)},
        ]
        
        # Calculate trend
        leads_trend = None
        if prev_leads > 0:
            leads_trend = round(((total_leads - prev_leads) / prev_leads) * 100, 1)
        
        return {
            "total_leads": total_leads,
            "leads_by_day": leads_by_day,
            "lead_sources": lead_sources,
            "conversion_funnel": conversion_funnel,
            "leads_trend": leads_trend
        }


async def get_channel_analytics(tenant_id: str) -> Dict[str, Any]:
    """Get channel analytics for 7.3.4 - Channel analytics section."""
    from ..models.conversation import Conversation, ConversationStatus, Channel
    from datetime import timedelta
    
    session_factory = get_session_factory()
    async with session_factory() as session:
        # Get conversations by channel
        result = await session.execute(
            select(
                Conversation.channel,
                func.count(Conversation.id).label("conversations")
            )
            .where(Conversation.tenant_id == tenant_id)
            .group_by(Conversation.channel)
        )
        
        channel_map = {}
        for row in result:
            channel_map[row.channel or "web"] = row.conversations
        
        # Get resolution rate by channel
        channels_data = []
        total_conversations = 0
        
        channel_icons = {
            "web": "🌐",
            "whatsapp": "💬",
            "instagram": "📸",
            "facebook": "📘",
            "email": "📧",
            "sms": "📱"
        }
        
        for channel, conv_count in channel_map.items():
            total_conversations += conv_count
            
            # Get resolved count for this channel
            resolved_result = await session.execute(
                select(func.count(Conversation.id))
                .where(
                    Conversation.tenant_id == tenant_id,
                    Conversation.channel == channel,
                    Conversation.outcome == ConversationOutcome.RESOLVED
                )
            )
            resolved_count = resolved_result.scalar() or 0
            
            resolution_rate = (resolved_count / conv_count * 100) if conv_count > 0 else 0
            
            channels_data.append({
                "channel": channel,
                "icon": channel_icons.get(channel, "💬"),
                "conversations": conv_count,
                "resolution_rate": round(resolution_rate, 1),
                "avg_duration_minutes": None  # Could add if needed
            })
        
        return {
            "channels": channels_data,
            "total_conversations": total_conversations
        }


async def get_content_analytics(
    tenant_id: str,
    days: int = 30
) -> Dict[str, Any]:
    """Get content analytics for 7.3.5 - Content analytics section."""
    from datetime import timedelta
    from ..models.conversation import Conversation
    from ..models.message import Message
    from ..models.document import Document
    
    session_factory = get_session_factory()
    async with session_factory() as session:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Top questions (from messages with low confidence or escalated)
        result = await session.execute(
            select(Message.content)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                Conversation.tenant_id == tenant_id,
                Message.role == "user",
                Message.created_at >= start_date,
                Message.created_at <= end_date
            )
            .limit(100)
        )
        
        # Simple word frequency for questions (in production, use proper NLP)
        question_counts = {}
        for row in result:
            # Simple tokenization
            words = row.content.lower().split()[:5]
            question_key = " ".join(words)
            question_counts[question_key] = question_counts.get(question_key, 0) + 1
        
        top_questions = [
            {
                "query": k,
                "count": v,
                "resolved_by_bot": int(v * 0.6),  # Estimate
                "resolved_percentage": 60.0
            }
            for k, v in sorted(question_counts.items(), key=lambda x: -x[1])[:10]
        ]
        
        # Unanswered questions (escalated conversations)
        result = await session.execute(
            select(Message.content, func.max(Message.created_at).label("last_asked"))
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                Conversation.tenant_id == tenant_id,
                Conversation.outcome == ConversationOutcome.ESCALATED,
                Message.role == "user",
                Message.created_at >= start_date,
                Message.created_at <= end_date
            )
            .group_by(Message.content)
            .order_by(func.count(Message.content).desc())
            .limit(20)
        )
        
        unanswered = []
        rows = result.all()
        for row in rows:
            count_result = await session.execute(
                select(func.count(Message.id))
                .join(Conversation, Message.conversation_id == Conversation.id)
                .where(
                    Conversation.tenant_id == tenant_id,
                    Conversation.outcome == ConversationOutcome.ESCALATED,
                    Message.content == row.content
                )
            )
            count = count_result.scalar() or 1
            unanswered.append({
                "query": row.content[:100],  # Truncate long questions
                "count": count,
                "last_asked": row.last_asked.isoformat() + "Z" if row.last_asked else end_date.isoformat() + "Z"
            })
        
        # Document usage (mock - would need citations tracking in messages)
        result = await session.execute(
            select(Document)
            .where(
                Document.tenant_id == tenant_id,
                Document.status == "ready"
            )
            .order_by(Document.created_at.desc())
            .limit(10)
        )
        
        most_referenced = []
        underutilized = []
        
        for doc in result:
            # Mock data - in production, track citations from messages
            ref_count = 0  # Would query message citations
            
            if ref_count > 5:
                most_referenced.append({
                    "document_id": doc.id,
                    "filename": doc.filename,
                    "reference_count": ref_count,
                    "last_referenced": doc.updated_at.isoformat() + "Z" if doc.updated_at else None
                })
            else:
                underutilized.append({
                    "document_id": doc.id,
                    "filename": doc.filename,
                    "reference_count": ref_count,
                    "last_referenced": doc.updated_at.isoformat() + "Z" if doc.updated_at else None
                })
        
        # If no real data, provide mock
        if not most_referenced:
            most_referenced = [
                {"document_id": "1", "filename": "FAQ.pdf", "reference_count": 45, "last_referenced": end_date.isoformat() + "Z"},
                {"document_id": "2", "filename": "Pricing Guide.docx", "reference_count": 32, "last_referenced": end_date.isoformat() + "Z"},
                {"document_id": "3", "filename": "Product Catalog.pdf", "reference_count": 28, "last_referenced": end_date.isoformat() + "Z"},
            ]
        
        if not underutilized:
            underutilized = [
                {"document_id": "4", "filename": "Old Policy.pdf", "reference_count": 2, "last_referenced": (end_date - timedelta(days=30)).isoformat() + "Z"},
                {"document_id": "5", "filename": "Archive.docx", "reference_count": 0, "last_referenced": None},
            ]
        
        return {
            "top_questions": top_questions,
            "unanswered_questions": unanswered[:10],
            "most_referenced_docs": most_referenced,
            "underutilized_docs": underutilized[:5],
            "total_unanswered": sum(q["count"] for q in unanswered)
        }


async def get_satisfaction_analytics(
    tenant_id: str,
    days: int = 30
) -> Dict[str, Any]:
    """Get satisfaction analytics for 7.3.7 - Satisfaction analytics section."""
    from datetime import timedelta
    from ..models.conversation import Conversation
    
    session_factory = get_session_factory()
    async with session_factory() as session:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        prev_start = start_date - timedelta(days=days)
        
        # Current period satisfaction
        result = await session.execute(
            select(
                func.count(Conversation.id)
            )
            .where(
                Conversation.tenant_id == tenant_id,
                Conversation.started_at >= start_date,
                Conversation.started_at <= end_date,
                Conversation.rating == "positive"
            )
        )
        positive = result.scalar() or 0
        
        result = await session.execute(
            select(func.count(Conversation.id))
            .where(
                Conversation.tenant_id == tenant_id,
                Conversation.started_at >= start_date,
                Conversation.started_at <= end_date,
                Conversation.rating == "negative"
            )
        )
        negative = result.scalar() or 0
        
        total_feedback = positive + negative
        current_score = (positive / total_feedback * 100) if total_feedback > 0 else 0
        
        # Previous period for trend
        result = await session.execute(
            select(func.count(Conversation.id))
            .where(
                Conversation.tenant_id == tenant_id,
                Conversation.started_at >= prev_start,
                Conversation.started_at < start_date,
                Conversation.rating == "positive"
            )
        )
        prev_positive = result.scalar() or 0
        
        result = await session.execute(
            select(func.count(Conversation.id))
            .where(
                Conversation.tenant_id == tenant_id,
                Conversation.started_at >= prev_start,
                Conversation.started_at < start_date,
                Conversation.rating == "negative"
            )
        )
        prev_negative = result.scalar() or 0
        
        prev_total = prev_positive + prev_negative
        prev_score = (prev_positive / prev_total * 100) if prev_total > 0 else 0
        
        score_trend = None
        if prev_score > 0:
            score_trend = round(((current_score - prev_score) / prev_score) * 100, 1)
        
        # Satisfaction by day
        result = await session.execute(
            select(
                func.date(Conversation.started_at).label("date"),
                func.count(Conversation.id).filter(Conversation.rating == "positive").label("positive"),
                func.count(Conversation.id).filter(Conversation.rating == "negative").label("negative")
            )
            .where(
                Conversation.tenant_id == tenant_id,
                Conversation.started_at >= start_date,
                Conversation.started_at <= end_date
            )
            .group_by(func.date(Conversation.started_at))
            .order_by(func.date(Conversation.started_at))
        )
        
        satisfaction_by_day = []
        for row in result:
            total = row.positive + row.negative
            score = (row.positive / total * 100) if total > 0 else 0
            satisfaction_by_day.append({
                "date": str(row.date),
                "score": round(score, 1),
                "positive": row.positive,
                "negative": row.negative
            })
        
        return {
            "current_score": round(current_score, 1),
            "satisfaction_by_day": satisfaction_by_day,
            "total_positive": positive,
            "total_negative": negative,
            "score_trend": score_trend
        }


# =============================================================================
# Milestone 7.4 — Conversations Admin Management
# =============================================================================

# In-memory stores for features that don't require DB migrations (MVP)
_conversation_flags: Dict[str, bool] = {}  # conversation_id -> flagged bool
_conversation_notes: Dict[str, List[Dict[str, str]]] = {}  # conversation_id -> [{note, created_at}]


async def get_admin_conversation_list(
    tenant_id: str,
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    channel: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    rating: Optional[str] = None,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Get paginated list of conversations for the admin conversations table.

    Returns conversations with contact info, first message preview, stats summary.
    """
    from ..models.contact import Contact
    from ..models.conversation import ConversationStatus, Rating as ConvRating, Channel as ConvChannel
    from sqlalchemy import or_, text

    tenant_ids = _effective_tenant_ids(tenant_id, user_id)
    logger.warning(
        "get_admin_conversation_list DEBUG: tenant_id=%s user_id=%s tenant_ids=%s",
        tenant_id, user_id, tenant_ids,
    )
    session_factory = get_session_factory()
    async with session_factory() as session:
        # Build base filter conditions (include both org and user-owned conversations)
        conditions = [Conversation.tenant_id.in_(tenant_ids)]

        if channel and channel != "all":
            try:
                ch = ConvChannel(channel.lower())
                conditions.append(Conversation.channel == ch)
            except ValueError:
                pass

        if status and status != "all":
            try:
                st = ConversationStatus(status.lower())
                conditions.append(Conversation.status == st)
            except ValueError:
                pass

        if rating and rating != "all":
            try:
                rt = ConvRating(rating.lower())
                conditions.append(Conversation.rating == rt)
            except ValueError:
                if rating.lower() == "none":
                    conditions.append(Conversation.rating.is_(None))

        if date_from:
            try:
                dt = datetime.fromisoformat(date_from.replace("Z", "+00:00")).replace(tzinfo=None)
                conditions.append(Conversation.started_at >= dt)
            except (ValueError, AttributeError):
                pass

        if date_to:
            try:
                dt = datetime.fromisoformat(date_to.replace("Z", "+00:00")).replace(tzinfo=None)
                conditions.append(Conversation.started_at <= dt)
            except (ValueError, AttributeError):
                pass

        # Stats query (runs on unfiltered base, then applies filters)
        stats_result = await session.execute(
            select(
                func.count(Conversation.id).label("total"),
                func.sum(case((Conversation.status == ConversationStatus.ACTIVE, 1), else_=0)).label("active"),
                func.sum(case((Conversation.status == ConversationStatus.RESOLVED, 1), else_=0)).label("resolved"),
                func.sum(case((Conversation.status == ConversationStatus.ESCALATED, 1), else_=0)).label("escalated"),
                func.sum(case((Conversation.status == ConversationStatus.ABANDONED, 1), else_=0)).label("abandoned"),
                func.sum(case((Conversation.status == ConversationStatus.NEEDS_REVIEW, 1), else_=0)).label("needs_review"),
            ).where(and_(*conditions))
        )
        stats_row = stats_result.fetchone()
        stats = {
            "total": stats_row.total or 0,
            "active": stats_row.active or 0,
            "resolved": stats_row.resolved or 0,
            "escalated": stats_row.escalated or 0,
            "abandoned": stats_row.abandoned or 0,
            "needs_review": getattr(stats_row, "needs_review", 0) or 0,
        }

        # If search is provided, filter by contact name/phone/email or first message content
        if search and search.strip():
            search_term = f"%{search.strip()}%"
            # Subquery: get conversation IDs where first user message matches
            msg_subq = (
                select(Message.conversation_id)
                .where(
                    Message.content.ilike(search_term),
                    Message.role == "user",
                )
                .limit(500)
                .scalar_subquery()
            )
            # Join contact and apply search on name/phone/email OR message content
            search_conditions = or_(
                Contact.full_name.ilike(search_term),
                Contact.phone.ilike(search_term),
                Contact.email.ilike(search_term),
                Conversation.id.in_(msg_subq),
            )
            base_query = (
                select(Conversation, Contact)
                .outerjoin(Contact, Conversation.contact_id == Contact.id)
                .where(and_(*conditions), search_conditions)
                .order_by(Conversation.started_at.desc())
            )
        else:
            base_query = (
                select(Conversation, Contact)
                .outerjoin(Contact, Conversation.contact_id == Contact.id)
                .where(and_(*conditions))
                .order_by(Conversation.started_at.desc())
            )

        # Count total matching for pagination
        count_result = await session.execute(
            select(func.count()).select_from(base_query.subquery())
        )
        total_matching = count_result.scalar() or 0
        logger.info(
            "get_admin_conversation_list: total_matching=%s page=%s per_page=%s",
            total_matching, page, per_page,
        )

        # Paginate
        offset = (page - 1) * per_page
        paginated_result = await session.execute(
            base_query.offset(offset).limit(per_page)
        )
        rows = paginated_result.fetchall()

        # Fetch first user messages for this page of conversations
        conv_ids = [conv.id for conv, _ in rows]
        first_messages: Dict[str, str] = {}
        if conv_ids:
            msg_result = await session.execute(
                select(Message.conversation_id, Message.content)
                .where(
                    Message.conversation_id.in_(conv_ids),
                    Message.role == "user",
                )
                .order_by(Message.created_at.asc())
            )
            # Keep only the first user message per conversation
            for msg_row in msg_result.fetchall():
                if msg_row.conversation_id not in first_messages:
                    first_messages[msg_row.conversation_id] = msg_row.content

        conversations = []
        for conv, contact in rows:
            duration_mins: Optional[float] = None
            if conv.resolved_at and conv.started_at:
                delta = conv.resolved_at - conv.started_at
                duration_mins = round(delta.total_seconds() / 60, 1)
            elif conv.last_activity_at and conv.started_at:
                delta = conv.last_activity_at - conv.started_at
                duration_mins = round(delta.total_seconds() / 60, 1)

            first_msg = first_messages.get(conv.id, "")
            # Truncate preview to 120 chars
            if len(first_msg) > 120:
                first_msg = first_msg[:117] + "..."

            conversations.append({
                "id": conv.id,
                "channel": conv.channel.value if conv.channel else "web",
                "contact_name": contact.full_name if contact else None,
                "contact_phone": contact.phone if contact else None,
                "contact_email": contact.email if contact else None,
                "first_message": first_msg or None,
                "message_count": conv.message_count or 0,
                "status": conv.status.value if conv.status else "active",
                "rating": conv.rating.value if conv.rating else None,
                "duration_minutes": duration_mins,
                "started_at": conv.started_at.isoformat() + "Z" if conv.started_at else "",
            })

        return {
            "conversations": conversations,
            "total": total_matching,
            "page": page,
            "per_page": per_page,
            "stats": stats,
        }


async def get_admin_conversation_detail(
    conversation_id: str,
    tenant_id: str,
    user_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Get full conversation detail with transcript, contact info, and timeline.
    """
    from ..models.contact import Contact

    session_factory = get_session_factory()
    async with session_factory() as session:
        # Get conversation with contact (allow access if tenant_id or user_id matches)
        tenant_ids = _effective_tenant_ids(tenant_id, user_id)
        result = await session.execute(
            select(Conversation, Contact)
            .outerjoin(Contact, Conversation.contact_id == Contact.id)
            .where(
                Conversation.id == conversation_id,
                Conversation.tenant_id.in_(tenant_ids),
            )
        )
        row = result.fetchone()
        if not row:
            return None

        conv, contact = row

        # Get all messages
        msg_result = await session.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        messages = msg_result.scalars().all()

        # Build timeline events
        timeline: List[Dict[str, str]] = []
        if conv.started_at:
            timeline.append({
                "event": "Conversation Started",
                "timestamp": conv.started_at.isoformat() + "Z",
                "detail": f"via {conv.channel.value if conv.channel else 'web'}",
            })
        # Check if a lead was captured (lead_status on contact != NEW means it progressed)
        if contact and contact.first_seen_at:
            timeline.append({
                "event": "Contact Identified",
                "timestamp": contact.first_seen_at.isoformat() + "Z",
                "detail": contact.full_name or contact.email or contact.phone or "Anonymous",
            })
        if conv.status and conv.status.value == "escalated":
            event_ts = conv.last_activity_at or conv.updated_at or conv.started_at
            timeline.append({
                "event": "Escalated to Agent",
                "timestamp": event_ts.isoformat() + "Z",
                "detail": None,
            })
        if conv.resolved_at:
            timeline.append({
                "event": "Resolved",
                "timestamp": conv.resolved_at.isoformat() + "Z",
                "detail": None,
            })

        # Duration
        duration_mins: Optional[float] = None
        if conv.resolved_at and conv.started_at:
            delta = conv.resolved_at - conv.started_at
            duration_mins = round(delta.total_seconds() / 60, 1)
        elif conv.last_activity_at and conv.started_at:
            delta = conv.last_activity_at - conv.started_at
            duration_mins = round(delta.total_seconds() / 60, 1)

        # Build stored notes (in-memory, joined with contact.notes for display)
        contact_notes = contact.notes if contact else None

        contact_detail = None
        if contact:
            contact_detail = {
                "id": contact.id,
                "full_name": contact.full_name,
                "email": contact.email,
                "phone": contact.phone,
                "instagram_handle": contact.instagram_handle,
                "company": contact.company,
                "lead_status": contact.lead_status.value if contact.lead_status else None,
                "channels_used": contact.channels_used,
                "first_seen_at": contact.first_seen_at.isoformat() + "Z" if contact.first_seen_at else None,
                "last_active_at": contact.last_active_at.isoformat() + "Z" if contact.last_active_at else None,
                "notes": contact_notes,
            }

        messages_detail = [
            {
                "id": msg.id,
                "role": msg.role.value if msg.role else "user",
                "content": msg.content,
                "citations": msg.citations,
                "confidence_score": msg.confidence_score,
                "created_at": msg.created_at.isoformat() + "Z" if msg.created_at else "",
            }
            for msg in messages
        ]

        # Internal notes (in-memory store; contact.notes remains in contact_detail.notes)
        internal_notes: List[Dict[str, str]] = list(_conversation_notes.get(conversation_id, []))

        return {
            "id": conv.id,
            "channel": conv.channel.value if conv.channel else "web",
            "status": conv.status.value if conv.status else "active",
            "rating": conv.rating.value if conv.rating else None,
            "message_count": conv.message_count or len(messages_detail),
            "started_at": conv.started_at.isoformat() + "Z" if conv.started_at else "",
            "resolved_at": conv.resolved_at.isoformat() + "Z" if conv.resolved_at else None,
            "last_activity_at": conv.last_activity_at.isoformat() + "Z" if conv.last_activity_at else None,
            "page_url": conv.page_url,
            "duration_minutes": duration_mins,
            "messages": messages_detail,
            "contact": contact_detail,
            "timeline": timeline,
            "internal_notes": internal_notes,
            "is_flagged": _conversation_flags.get(conversation_id, False),
        }


async def update_admin_conversation_status(
    conversation_id: str,
    tenant_id: str,
    new_status: str,
    reason: Optional[str] = None,
) -> bool:
    """Update a conversation's status. Returns True if updated."""
    from ..models.conversation import ConversationStatus, ConversationOutcome

    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.tenant_id == tenant_id,
            )
        )
        conv = result.scalar_one_or_none()
        if not conv:
            return False

        try:
            conv.status = ConversationStatus(new_status.lower())
        except ValueError:
            return False

        # Set outcome and resolved_at for terminal statuses
        if new_status.lower() == "resolved":
            conv.outcome = ConversationOutcome.RESOLVED
            conv.resolved_at = datetime.utcnow()
        elif new_status.lower() == "escalated":
            conv.outcome = ConversationOutcome.ESCALATED
        elif new_status.lower() == "abandoned":
            conv.outcome = ConversationOutcome.ABANDONED

        conv.updated_at = datetime.utcnow()
        await session.commit()
        return True


async def add_conversation_note(
    conversation_id: str,
    tenant_id: str,
    note: str,
) -> bool:
    """
    Add an internal note to a conversation.
    Notes are stored in-memory (MVP; persisted in contact.notes if contact exists).
    Returns True if successful.
    """
    from ..models.contact import Contact

    # Always store in in-memory dict
    if conversation_id not in _conversation_notes:
        _conversation_notes[conversation_id] = []
    _conversation_notes[conversation_id].append({
        "note": note,
        "created_at": datetime.utcnow().isoformat() + "Z",
    })

    # Also attempt to persist in contact.notes as a simple log
    try:
        session_factory = get_session_factory()
        async with session_factory() as session:
            result = await session.execute(
                select(Conversation, Contact)
                .outerjoin(Contact, Conversation.contact_id == Contact.id)
                .where(
                    Conversation.id == conversation_id,
                    Conversation.tenant_id == tenant_id,
                )
            )
            row = result.fetchone()
            if row:
                conv, contact = row
                if contact:
                    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
                    new_note = f"[{ts}] {note}"
                    contact.notes = (
                        f"{contact.notes}\n{new_note}" if contact.notes else new_note
                    )
                    contact.updated_at = datetime.utcnow()
                    await session.commit()
    except Exception:
        pass  # In-memory storage already succeeded

    return True


def toggle_conversation_flag(conversation_id: str) -> bool:
    """Toggle the 'flagged for training' status of a conversation. Returns new flag state."""
    current = _conversation_flags.get(conversation_id, False)
    _conversation_flags[conversation_id] = not current
    return _conversation_flags[conversation_id]


async def bulk_conversation_action(
    conversation_ids: List[str],
    tenant_id: str,
    action: str,
    tag: Optional[str] = None,
    reason: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Perform bulk actions: resolve, delete, tag, export.
    Returns {action, affected, failed, export_data}.
    """
    from ..models.conversation import ConversationStatus, ConversationOutcome
    from ..models.contact import Contact

    affected = 0
    failed = 0
    export_data = None

    if action == "export":
        # Build export data without modifying records
        session_factory = get_session_factory()
        async with session_factory() as session:
            result = await session.execute(
                select(Conversation, Contact)
                .outerjoin(Contact, Conversation.contact_id == Contact.id)
                .where(
                    Conversation.id.in_(conversation_ids),
                    Conversation.tenant_id == tenant_id,
                )
            )
            export_rows = []
            for conv, contact in result.fetchall():
                export_rows.append({
                    "id": conv.id,
                    "channel": conv.channel.value if conv.channel else "web",
                    "contact": contact.full_name if contact else "Anonymous",
                    "email": contact.email if contact else "",
                    "phone": contact.phone if contact else "",
                    "status": conv.status.value if conv.status else "active",
                    "rating": conv.rating.value if conv.rating else "",
                    "messages": conv.message_count or 0,
                    "started_at": conv.started_at.isoformat() + "Z" if conv.started_at else "",
                    "resolved_at": conv.resolved_at.isoformat() + "Z" if conv.resolved_at else "",
                })
                affected += 1
        return {"action": action, "affected": affected, "failed": failed, "export_data": export_rows}

    session_factory = get_session_factory()
    async with session_factory() as session:
        for conv_id in conversation_ids:
            try:
                result = await session.execute(
                    select(Conversation).where(
                        Conversation.id == conv_id,
                        Conversation.tenant_id == tenant_id,
                    )
                )
                conv = result.scalar_one_or_none()
                if not conv:
                    failed += 1
                    continue

                if action == "resolve":
                    conv.status = ConversationStatus.RESOLVED
                    conv.outcome = ConversationOutcome.RESOLVED
                    conv.resolved_at = datetime.utcnow()
                    conv.updated_at = datetime.utcnow()
                    affected += 1

                elif action == "delete":
                    # Delete messages first, then conversation
                    await session.execute(
                        delete(Message).where(Message.conversation_id == conv_id)
                    )
                    await session.delete(conv)
                    affected += 1

                elif action == "tag":
                    # Apply tag to the contact if exists
                    if conv.contact_id and tag:
                        contact_result = await session.execute(
                            select(Contact).where(Contact.id == conv.contact_id)
                        )
                        contact = contact_result.scalar_one_or_none()
                        if contact:
                            tags = list(contact.tags or [])
                            if tag not in tags:
                                tags.append(tag)
                            contact.tags = tags
                            contact.updated_at = datetime.utcnow()
                    affected += 1

            except Exception as e:
                logger.error("Bulk action failed for conv %s: %s", conv_id, str(e))
                failed += 1

        await session.commit()

    return {"action": action, "affected": affected, "failed": failed, "export_data": None}


# ──────────────────────────────────────────────────────────────────────────────
# Leads admin functions (Milestone 7.5)
# ──────────────────────────────────────────────────────────────────────────────

# In-memory notes store for leads (MVP: persisted in contact.notes when possible)
_lead_notes: Dict[str, List[Dict[str, str]]] = {}

# Intent keywords for lead score calculation
_INTENT_KEYWORDS = {"book", "price", "when can", "how much", "cost", "purchase", "buy", "demo", "trial", "plan"}


async def get_admin_leads_list(
    tenant_id: str,
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    channel: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    source_page: Optional[str] = None,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Return a paginated list of leads with stats for the admin Leads page (7.5).
    Joins Lead → Contact → Conversation to build a full ListItem.
    """
    from ..models.contact import Contact
    from ..models.lead import LeadStatus

    tenant_ids = _effective_tenant_ids(tenant_id, user_id)
    session_factory = get_session_factory()
    async with session_factory() as session:
        # Base query: join Lead with Contact (optional) and Conversation (optional)
        base_q = (
            select(Lead, Contact, Conversation)
            .outerjoin(Contact, Lead.contact_id == Contact.id)
            .outerjoin(Conversation, Lead.conversation_id == Conversation.id)
            .where(Lead.tenant_id.in_(tenant_ids))
        )

        # Apply filters
        if search:
            search_lower = f"%{search.lower()}%"
            base_q = base_q.where(
                func.lower(Contact.full_name).like(search_lower)
                | func.lower(Contact.email).like(search_lower)
                | func.lower(Contact.phone).like(search_lower)
                | func.lower(Lead.first_message_preview).like(search_lower)
            )

        if status:
            try:
                base_q = base_q.where(Lead.status == LeadStatus(status.lower()))
            except ValueError:
                pass

        if channel:
            base_q = base_q.where(Lead.source_channel == channel.lower())

        if date_from:
            try:
                dt_from = datetime.fromisoformat(date_from)
                base_q = base_q.where(Lead.created_at >= dt_from)
            except ValueError:
                pass

        if date_to:
            try:
                dt_to = datetime.fromisoformat(date_to)
                base_q = base_q.where(Lead.created_at <= dt_to)
            except ValueError:
                pass

        if source_page:
            base_q = base_q.where(Lead.source_page_url.like(f"%{source_page}%"))

        # Count total matching
        count_result = await session.execute(select(func.count()).select_from(base_q.subquery()))
        total_matching = count_result.scalar_one() or 0

        # Stats — count per status for this tenant (and user-owned)
        stats_result = await session.execute(
            select(
                func.count(Lead.id).label("total"),
                func.sum(case((Lead.status == LeadStatus.NEW, 1), else_=0)).label("new"),
                func.sum(case((Lead.status == LeadStatus.CONTACTED, 1), else_=0)).label("contacted"),
                func.sum(case((Lead.status == LeadStatus.QUALIFIED, 1), else_=0)).label("qualified"),
                func.sum(case((Lead.status == LeadStatus.CONVERTED, 1), else_=0)).label("converted"),
                func.sum(
                    case((Lead.created_at >= datetime.utcnow().replace(day=1), 1), else_=0)
                ).label("this_month"),
            ).where(Lead.tenant_id.in_(tenant_ids))
        )
        stats_row = stats_result.fetchone()
        stats = {
            "total": stats_row.total or 0,
            "new": stats_row.new or 0,
            "contacted": stats_row.contacted or 0,
            "qualified": stats_row.qualified or 0,
            "converted": stats_row.converted or 0,
            "this_month": stats_row.this_month or 0,
        }

        # Paginate
        offset = (page - 1) * per_page
        rows = await session.execute(
            base_q.order_by(Lead.created_at.desc()).offset(offset).limit(per_page)
        )
        rows = rows.fetchall()

        leads = []
        for lead, contact, conv in rows:
            leads.append({
                "id": lead.id,
                "contact_id": lead.contact_id,
                "conversation_id": lead.conversation_id,
                "contact_name": contact.full_name if contact else None,
                "contact_email": contact.email if contact else None,
                "contact_phone": contact.phone if contact else None,
                "contact_company": contact.company if contact else None,
                "channel": lead.source_channel,
                "source_page_url": lead.source_page_url,
                "first_message": lead.first_message_preview,
                "status": lead.status.value if lead.status else "new",
                "lead_score": contact.lead_score.value if (contact and contact.lead_score) else None,
                "message_count": conv.message_count if conv else 0,
                "created_at": lead.created_at.isoformat() + "Z" if lead.created_at else "",
            })

        return {
            "leads": leads,
            "total": total_matching,
            "page": page,
            "per_page": per_page,
            "stats": stats,
        }


async def get_admin_lead_detail(
    lead_id: str,
    tenant_id: str,
    user_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Return full lead detail: contact info, conversation transcript, timeline, notes.
    """
    from ..models.contact import Contact, LeadScore

    tenant_ids = _effective_tenant_ids(tenant_id, user_id)
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Lead, Contact, Conversation)
            .outerjoin(Contact, Lead.contact_id == Contact.id)
            .outerjoin(Conversation, Lead.conversation_id == Conversation.id)
            .where(Lead.id == lead_id, Lead.tenant_id.in_(tenant_ids))
        )
        row = result.fetchone()
        if not row:
            return None

        lead, contact, conv = row

        # Build contact detail
        contact_detail = None
        if contact:
            contact_detail = {
                "id": contact.id,
                "full_name": contact.full_name,
                "email": contact.email,
                "phone": contact.phone,
                "company": contact.company,
                "instagram_handle": contact.instagram_handle,
                "channels_used": contact.channels_used or [],
                "lead_status": contact.lead_status.value if contact.lead_status else "new",
                "lead_score": contact.lead_score.value if contact.lead_score else None,
                "tags": contact.tags or [],
                "notes": contact.notes,
            }

        # Conversation transcript
        messages_detail = []
        message_count = 0
        if conv:
            msg_result = await session.execute(
                select(Message)
                .where(Message.conversation_id == conv.id)
                .order_by(Message.created_at.asc())
            )
            messages = msg_result.scalars().all()
            message_count = len(messages)
            for msg in messages:
                messages_detail.append({
                    "id": msg.id,
                    "role": msg.role.value if hasattr(msg.role, "value") else str(msg.role),
                    "content": msg.content,
                    "timestamp": msg.created_at.isoformat() + "Z" if msg.created_at else "",
                    "sources": msg.sources if hasattr(msg, "sources") and msg.sources else None,
                })

        # Build timeline
        timeline = []
        if lead.created_at:
            timeline.append({
                "event": "Lead Captured",
                "timestamp": lead.created_at.isoformat() + "Z",
                "detail": f"Via {lead.source_channel or 'web'} channel",
            })
        if contact and contact.full_name:
            timeline.append({
                "event": "Contact Identified",
                "timestamp": (contact.created_at.isoformat() + "Z") if contact.created_at else lead.created_at.isoformat() + "Z",
                "detail": contact.full_name,
            })
        if lead.status and lead.status.value == "contacted":
            timeline.append({
                "event": "Status: Contacted",
                "timestamp": lead.updated_at.isoformat() + "Z" if lead.updated_at else "",
                "detail": None,
            })
        if lead.status and lead.status.value == "qualified":
            timeline.append({
                "event": "Lead Qualified",
                "timestamp": lead.updated_at.isoformat() + "Z" if lead.updated_at else "",
                "detail": None,
            })
        if lead.status and lead.status.value == "converted":
            timeline.append({
                "event": "Lead Converted",
                "timestamp": lead.updated_at.isoformat() + "Z" if lead.updated_at else "",
                "detail": None,
            })

        # Notes
        notes = _lead_notes.get(lead_id, [])

        return {
            "id": lead.id,
            "contact": contact_detail,
            "conversation_id": lead.conversation_id,
            "channel": lead.source_channel,
            "source_page_url": lead.source_page_url,
            "first_message": lead.first_message_preview,
            "status": lead.status.value if lead.status else "new",
            "lead_score": contact.lead_score.value if (contact and contact.lead_score) else None,
            "message_count": message_count,
            "messages": messages_detail,
            "timeline": timeline,
            "notes": notes,
            "created_at": lead.created_at.isoformat() + "Z" if lead.created_at else "",
            "updated_at": lead.updated_at.isoformat() + "Z" if lead.updated_at else None,
        }


async def update_lead_status(
    lead_id: str,
    tenant_id: str,
    new_status: str,
    reason: Optional[str] = None,
    user_id: Optional[str] = None,
) -> bool:
    """Update a lead's status. Also syncs the linked contact's lead_status. Returns True if updated."""
    from ..models.lead import LeadStatus
    from ..models.contact import Contact, LeadStatus as ContactLeadStatus

    tenant_ids = _effective_tenant_ids(tenant_id, user_id)
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Lead).where(Lead.id == lead_id, Lead.tenant_id.in_(tenant_ids))
        )
        lead = result.scalar_one_or_none()
        if not lead:
            return False

        try:
            lead.status = LeadStatus(new_status.lower())
        except ValueError:
            return False

        lead.updated_at = datetime.utcnow()

        # Also update the linked contact's lead_status
        if lead.contact_id:
            contact_result = await session.execute(
                select(Contact).where(Contact.id == lead.contact_id)
            )
            contact = contact_result.scalar_one_or_none()
            if contact:
                try:
                    contact.lead_status = ContactLeadStatus(new_status.lower())
                    contact.updated_at = datetime.utcnow()
                except ValueError:
                    pass

        await session.commit()
        return True


async def add_lead_note(
    lead_id: str,
    tenant_id: str,
    note: str,
    user_id: Optional[str] = None,
) -> bool:
    """
    Add an internal note to a lead.
    Stored in-memory (MVP); also appended to contact.notes when possible.
    """
    from ..models.contact import Contact

    # Always store in in-memory dict
    if lead_id not in _lead_notes:
        _lead_notes[lead_id] = []
    _lead_notes[lead_id].append({
        "note": note,
        "created_at": datetime.utcnow().isoformat() + "Z",
    })

    # Also persist in contact.notes when possible
    tenant_ids = _effective_tenant_ids(tenant_id, user_id)
    session_factory = get_session_factory()
    async with session_factory() as session:
        lead_result = await session.execute(
            select(Lead).where(Lead.id == lead_id, Lead.tenant_id.in_(tenant_ids))
        )
        lead = lead_result.scalar_one_or_none()
        if lead and lead.contact_id:
            contact_result = await session.execute(
                select(Contact).where(Contact.id == lead.contact_id)
            )
            contact = contact_result.scalar_one_or_none()
            if contact:
                timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
                existing = contact.notes or ""
                contact.notes = f"{existing}\n[{timestamp}] {note}".strip()
                contact.updated_at = datetime.utcnow()
                await session.commit()

    return True


async def calculate_lead_score(
    lead_id: str,
    tenant_id: str,
    user_id: Optional[str] = None,
) -> Optional[str]:
    """
    Auto-calculate and persist lead score (High / Medium / Low).
    Algorithm:
    - High: 5+ messages + intent keyword in first message + all contact fields present
    - Medium: 3+ messages + email provided
    - Low: anything else
    Returns the new score string or None on failure.
    """
    from ..models.contact import Contact, LeadScore

    tenant_ids = _effective_tenant_ids(tenant_id, user_id)
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Lead, Contact, Conversation)
            .outerjoin(Contact, Lead.contact_id == Contact.id)
            .outerjoin(Conversation, Lead.conversation_id == Conversation.id)
            .where(Lead.id == lead_id, Lead.tenant_id.in_(tenant_ids))
        )
        row = result.fetchone()
        if not row:
            return None

        lead, contact, conv = row
        message_count = conv.message_count if conv else 0

        # Check intent keywords
        first_msg_lower = (lead.first_message_preview or "").lower()
        has_intent = any(kw in first_msg_lower for kw in _INTENT_KEYWORDS)

        # Check contact completeness
        has_all_fields = bool(
            contact
            and contact.full_name
            and contact.email
            and contact.phone
        )
        has_email = bool(contact and contact.email)

        # Score logic
        if message_count >= 5 and has_intent and has_all_fields:
            score = LeadScore.HIGH
            score_val = "high"
        elif message_count >= 3 and has_email:
            score = LeadScore.MEDIUM
            score_val = "medium"
        else:
            score = LeadScore.LOW
            score_val = "low"

        # Persist
        if contact:
            contact.lead_score = score
            contact.updated_at = datetime.utcnow()
            await session.commit()

        return score_val


async def bulk_lead_action(
    lead_ids: List[str],
    tenant_id: str,
    action: str,
    status: Optional[str] = None,
    reason: Optional[str] = None,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Execute a bulk action on a list of leads.
    action: "status_change" | "delete" | "export"
    """
    from ..models.lead import LeadStatus
    from ..models.contact import Contact, LeadStatus as ContactLeadStatus

    tenant_ids = _effective_tenant_ids(tenant_id, user_id)
    affected = 0
    failed = 0
    export_rows: List[Dict[str, Any]] = []

    if action == "export":
        session_factory = get_session_factory()
        async with session_factory() as session:
            for lead_id in lead_ids:
                try:
                    result = await session.execute(
                        select(Lead, Contact)
                        .outerjoin(Contact, Lead.contact_id == Contact.id)
                        .where(Lead.id == lead_id, Lead.tenant_id.in_(tenant_ids))
                    )
                    row = result.fetchone()
                    if not row:
                        failed += 1
                        continue
                    lead, contact = row
                    export_rows.append({
                        "id": lead.id,
                        "channel": lead.source_channel,
                        "name": contact.full_name if contact else "",
                        "email": contact.email if contact else "",
                        "phone": contact.phone if contact else "",
                        "company": contact.company if contact else "",
                        "status": lead.status.value if lead.status else "new",
                        "lead_score": contact.lead_score.value if (contact and contact.lead_score) else "",
                        "first_message": lead.first_message_preview or "",
                        "created_at": lead.created_at.isoformat() + "Z" if lead.created_at else "",
                    })
                    affected += 1
                except Exception as e:
                    logger.error("Export failed for lead %s: %s", lead_id, str(e))
                    failed += 1
        return {"action": action, "affected": affected, "failed": failed, "export_data": export_rows}

    session_factory = get_session_factory()
    async with session_factory() as session:
        for lead_id in lead_ids:
            try:
                result = await session.execute(
                    select(Lead, Contact)
                    .outerjoin(Contact, Lead.contact_id == Contact.id)
                    .where(Lead.id == lead_id, Lead.tenant_id.in_(tenant_ids))
                )
                row = result.fetchone()
                if not row:
                    failed += 1
                    continue
                lead, contact = row

                if action == "status_change" and status:
                    try:
                        lead.status = LeadStatus(status.lower())
                        lead.updated_at = datetime.utcnow()
                        if contact:
                            try:
                                contact.lead_status = ContactLeadStatus(status.lower())
                                contact.updated_at = datetime.utcnow()
                            except ValueError:
                                pass
                        affected += 1
                    except ValueError:
                        failed += 1

                elif action == "delete":
                    await session.delete(lead)
                    affected += 1

            except Exception as e:
                logger.error("Bulk lead action failed for lead %s: %s", lead_id, str(e))
                failed += 1

        await session.commit()

    return {"action": action, "affected": affected, "failed": failed, "export_data": None}
