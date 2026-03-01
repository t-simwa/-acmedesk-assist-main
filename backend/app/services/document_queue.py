"""
Redis Queue service for background document processing.

This module provides:
- Job queue management for document processing
- Worker functions for document ingestion, chunking, and embedding
"""

import json
import logging
import time
from pathlib import Path
from typing import Any, Dict, Optional

from redis import Redis

from ..config import settings
from ..models.document import DocumentStatus
from ..services import database

logger = logging.getLogger(__name__)

# Queue names
DOCUMENT_PROCESSING_QUEUE = "document_processing"

# Job statuses
JOB_STATUS_PENDING = "pending"
JOB_STATUS_PROCESSING = "processing"
JOB_STATUS_COMPLETED = "completed"
JOB_STATUS_FAILED = "failed"


class RedisQueueService:
    """Redis-based job queue service."""
    
    def __init__(self):
        self.redis_url = getattr(settings, 'redis_url', None)
        self.client: Optional[Redis] = None
        self.enabled = bool(self.redis_url)
        
        if self.enabled:
            try:
                self.client = Redis.from_url(self.redis_url, decode_responses=True)
                self.client.ping()
                logger.info("Redis queue service initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis: {e}. Document processing will be synchronous.")
                self.enabled = False
    
    def enqueue_document_processing(
        self, 
        doc_id: str, 
        tenant_id: str, 
        file_path: str, 
        filename: str,
        chatbot_id: Optional[str] = None
    ) -> bool:
        """
        Add a document processing job to the queue.
        
        Args:
            doc_id: Document ID
            tenant_id: Tenant ID
            file_path: Path to the file
            filename: Original filename
            chatbot_id: Optional chatbot ID
            
        Returns:
            True if successfully enqueued
        """
        if not self.enabled:
            return False
        
        job_data = {
            "doc_id": doc_id,
            "tenant_id": tenant_id,
            "file_path": file_path,
            "filename": filename,
            "chatbot_id": chatbot_id,
            "status": JOB_STATUS_PENDING,
            "enqueued_at": time.time()
        }
        
        try:
            self.client.rpush(DOCUMENT_PROCESSING_QUEUE, json.dumps(job_data))
            logger.info(f"Enqueued document processing job: doc_id={doc_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to enqueue job: {e}")
            return False
    
    def dequeue_document_processing(self, timeout: int = 5) -> Optional[Dict[str, Any]]:
        """
        Get a job from the queue.
        
        Args:
            timeout: Timeout in seconds
            
        Returns:
            Job data dict or None
        """
        if not self.enabled or not self.client:
            return None
        
        try:
            result = self.client.blpop(DOCUMENT_PROCESSING_QUEUE, timeout=timeout)
            if result:
                _, job_json = result
                return json.loads(job_json)
        except Exception as e:
            logger.error(f"Failed to dequeue job: {e}")
        
        return None
    
    def update_job_status(self, doc_id: str, status: str, progress: int = 0, message: str = "") -> bool:
        """
        Update job status in Redis for real-time status tracking.
        
        Args:
            doc_id: Document ID
            status: Job status
            progress: Progress percentage
            message: Status message
            
        Returns:
            True if successful
        """
        if not self.enabled or not self.client:
            return False
        
        key = f"doc_job:{doc_id}"
        try:
            self.client.hset(key, mapping={
                "status": status,
                "progress": str(progress),
                "message": message,
                "updated_at": time.time()
            })
            self.client.expire(key, 3600)  # Expire after 1 hour
            return True
        except Exception as e:
            logger.error(f"Failed to update job status: {e}")
            return False
    
    def get_job_status(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """
        Get job status from Redis.
        
        Args:
            doc_id: Document ID
            
        Returns:
            Job status dict or None
        """
        if not self.enabled or not self.client:
            return None
        
        key = f"doc_job:{doc_id}"
        try:
            data = self.client.hgetall(key)
            if data:
                return {
                    "status": data.get("status"),
                    "progress": int(data.get("progress", 0)),
                    "message": data.get("message", ""),
                    "updated_at": float(data.get("updated_at", 0))
                }
        except Exception as e:
            logger.error(f"Failed to get job status: {e}")
        
        return None
    
    def is_available(self) -> bool:
        """Check if Redis is available."""
        return self.enabled and self.client is not None


# Global instance
queue_service = RedisQueueService()


async def process_document_job(job_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    Process a document: download, extract text, chunk, embed, and store.
    
    Args:
        job_data: Job data containing doc_id, tenant_id, file_path, etc.
        
    Returns:
        Tuple of (success, error_message)
    """
    from ..rag.chunking import chunk_text
    from ..rag.embeddings import EmbeddingModel
    from ..rag.vector_store import VectorStore
    from ..services.storage import get_file_content
    from ..config import get_chunking_config
    
    doc_id = job_data.get("doc_id")
    tenant_id = job_data.get("tenant_id")
    file_path = job_data.get("file_path")
    filename = job_data.get("filename")
    chatbot_id = job_data.get("chatbot_id")
    
    if not all([doc_id, tenant_id, file_path, filename]):
        logger.error(f"Invalid job data: {job_data}")
        return False, "Invalid job data"
    
    try:
        # Update status to processing
        queue_service.update_job_status(doc_id, JOB_STATUS_PROCESSING, 10, "Starting document processing...")
        await database.update_document(doc_id, status=DocumentStatus.PROCESSING, error_message=None)
        
        # Get file content
        queue_service.update_job_status(doc_id, JOB_STATUS_PROCESSING, 20, "Reading file...")
        file_content = get_file_content(doc_id, tenant_id, filename)
        
        if not file_content:
            error_msg = f"Failed to read file: {file_path}"
            await database.update_document(doc_id, status=DocumentStatus.FAILED, error_message=error_msg)
            queue_service.update_job_status(doc_id, JOB_STATUS_FAILED, 0, error_msg)
            return False, error_msg
        
        # Save to temp file for processing
        from ..services.storage import ensure_storage_dir
        temp_dir = ensure_storage_dir() / "temp"
        temp_dir.mkdir(exist_ok=True)
        temp_filename = f"{doc_id}_{filename}"
        temp_file = temp_dir / temp_filename
        temp_file.write_bytes(file_content)
        
        # Import and run ingestion
        queue_service.update_job_status(doc_id, JOB_STATUS_PROCESSING, 30, "Extracting text...")
        from ..rag.ingestion import ingest_document
        doc = ingest_document(temp_file)
        
        if doc is None:
            error_msg = "Failed to extract text from document - unsupported format or corrupted file"
            await database.update_document(doc_id, status=DocumentStatus.FAILED, error_message=error_msg)
            queue_service.update_job_status(doc_id, JOB_STATUS_FAILED, 0, error_msg)
            return False, error_msg
        
        # Check for password-protected PDF
        if hasattr(doc, 'is_encrypted') and doc.is_encrypted:
            error_msg = "This PDF is password-protected. Please remove the password and re-upload"
            await database.update_document(doc_id, status=DocumentStatus.FAILED, error_message=error_msg)
            queue_service.update_job_status(doc_id, JOB_STATUS_FAILED, 0, error_msg)
            return False, error_msg
        
        # Chunk text
        queue_service.update_job_status(doc_id, JOB_STATUS_PROCESSING, 50, "Chunking text...")
        chunking_config = get_chunking_config()
        chunks = chunk_text(doc.text, chunking_config, doc_id, doc.url)
        
        if not chunks:
            error_msg = "No chunks created from document - document may be empty"
            await database.update_document(doc_id, status=DocumentStatus.FAILED, error_message=error_msg)
            queue_service.update_job_status(doc_id, JOB_STATUS_FAILED, 0, error_msg)
            return False, error_msg
        
        # Generate embeddings
        queue_service.update_job_status(doc_id, JOB_STATUS_PROCESSING, 70, "Generating embeddings...")
        embedding_model = EmbeddingModel(
            model_name=settings.embedding_model,
            openai_api_key=settings.openai_api_key,
            use_openai=settings.use_openai_embeddings,
        )
        texts = [chunk.text for chunk in chunks]
        embeddings = embedding_model.embed_batch(texts)
        
        # Store in vector DB
        queue_service.update_job_status(doc_id, JOB_STATUS_PROCESSING, 85, "Storing vectors...")
        vector_store = VectorStore(
            collection_name=f"tenant_{tenant_id}_documents",
            persist_directory=settings.vector_store_persist_dir or "backend/data/vector_db",
        )
        vector_store.add_documents(
            chunks, 
            embeddings, 
            user_id=tenant_id,
            knowledge_base_id=chatbot_id
        )
        
        # Update document status
        chunk_count = len(chunks)
        page_count = getattr(doc, 'page_count', None)
        
        await database.update_document(
            doc_id, 
            status=DocumentStatus.READY, 
            chunk_count=chunk_count,
            page_count=page_count,
            error_message=None
        )
        
        queue_service.update_job_status(doc_id, JOB_STATUS_COMPLETED, 100, "Processing complete")
        
        # Cleanup temp file
        try:
            temp_file.unlink()
        except:
            pass
        
        logger.info(f"Successfully processed document: doc_id={doc_id}, chunks={chunk_count}")
        return True, None
        
    except Exception as e:
        error_msg = f"Error processing document: {str(e)}"
        logger.error(f"Document processing error for doc_id={doc_id}: {e}", exc_info=True)
        await database.update_document(doc_id, status=DocumentStatus.FAILED, error_message=error_msg)
        queue_service.update_job_status(doc_id, JOB_STATUS_FAILED, 0, error_msg)
        return False, error_msg


def run_worker():
    """
    Run the document processing worker.
    This function should be run as a separate process.
    """
    logger.info("Starting document processing worker...")
    
    while True:
        job_data = queue_service.dequeue_document_processing(timeout=10)
        
        if job_data:
            logger.info(f"Processing job: {job_data.get('doc_id')}")
            # Run synchronously (async needs to be handled differently)
            import asyncio
            try:
                asyncio.run(process_document_job(job_data))
            except Exception as e:
                logger.error(f"Worker error: {e}")
        else:
            # No jobs, wait a bit
            time.sleep(1)
