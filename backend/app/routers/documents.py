"""
Document management API endpoints.

Implements Milestone 5 specifications:
- 5.1.1: Upload endpoint with R2 storage, 50MB limit, async processing
- 5.1.2: URL ingestion endpoint
- 5.1.4: Duplicate detection
- 5.1.5: Password-protected PDF handling
- 5.1.6: Processing status polling
- 5.3.x: Document management UI endpoints
"""

import logging
import uuid
from pathlib import Path
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from ..config import settings
from ..models.document import DocumentStatus
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.documents import (
    ArchiveDocumentResponse,
    DeleteDocumentResponse,
    DocumentDetailResponse,
    DocumentListResponse,
    DocumentMetadata,
    DocumentStatusResponse,
    DocumentUploadResponse,
    DuplicateCheckResponse,
    ReplaceDocumentResponse,
    ReindexResponse,
    StorageUsageResponse,
    URLIngestionRequest,
    URLIngestionResponse,
)
from ..services import database, storage
from ..services.document_queue import queue_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB per spec 5.1.1


def get_document_type(filename: str) -> str:
    """Determine document type from filename."""
    ext = Path(filename).suffix.lower()
    type_map = {
        ".pdf": "pdf",
        ".docx": "docx",
        ".txt": "text",
        ".csv": "csv",
        ".md": "markdown",
        ".markdown": "markdown",
        ".html": "html",
        ".htm": "html",
    }
    return type_map.get(ext, "unknown")


async def get_current_tenant_id(current_user: User) -> str:
    """Get tenant ID from current user."""
    # Get tenant_id from user, default to user.id if not available
    tenant_id = getattr(current_user, 'tenant_id', None)
    return tenant_id if tenant_id else current_user.id


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    file: UploadFile = File(...),
    chatbot_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
) -> DocumentUploadResponse:
    """
    Upload a document file (5.1.1).
    
    - Accepts multipart form data
    - Validates file type (PDF, DOCX, TXT, CSV)
    - Validates file size (max 50MB)
    - Checks tenant storage limit
    - Saves file to R2 or local storage
    - Returns 202 Accepted immediately (async processing)
    """
    # Validate file type
    doc_type = get_document_type(file.filename or "")
    if doc_type == "unknown":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Supported formats: .pdf, .docx, .txt, .csv, .md, .html",
        )

    # Read file content
    file_content = await file.read()
    
    # Validate file size (5.1.1)
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / (1024*1024):.0f}MB",
        )

    # Get tenant ID
    tenant_id = await get_current_tenant_id(current_user)
    
    # Check storage limits
    used_bytes, doc_count = await database.get_storage_usage(tenant_id)
    storage_limit = 100 * 1024 * 1024  # 100MB default limit (should come from plan)
    if used_bytes + len(file_content) > storage_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Storage limit exceeded. Used {used_bytes / (1024*1024):.1f}MB of {storage_limit / (1024*1024):.0f}MB",
        )

    try:
        # Compute content hash for duplicate detection (5.1.4)
        content_hash = storage.compute_file_hash(file_content)
        
        # Check for duplicates
        duplicate = await database.check_duplicate_document(tenant_id, content_hash)
        is_duplicate = duplicate is not None
        
        # Generate document ID
        doc_id = str(uuid.uuid4())
        
        # Save file
        doc_id, storage_url = storage.save_uploaded_file(
            file_content, 
            file.filename or "unknown",
            tenant_id=tenant_id,
            doc_id=doc_id
        )
        
        file_size = len(file_content)

        # Create document record
        document = await database.create_document(
            doc_id=doc_id,
            name=f"{doc_id}_{file.filename or 'unknown'}",  # Stored filename
            doc_type=doc_type,
            file_path=storage_url,
            file_size=file_size,
            status="processing",
            tenant_id=tenant_id,
            chatbot_id=chatbot_id,
            original_filename=file.filename or "unknown",
            storage_url=storage_url,
            content_hash=content_hash,
        )

        # Try to enqueue for background processing (5.1.3)
        if queue_service.enabled:
            queue_service.enqueue_document_processing(
                doc_id=doc_id,
                tenant_id=tenant_id,
                file_path=storage_url,
                filename=file.filename or "unknown",
                chatbot_id=chatbot_id,
            )
        else:
            # Fallback: process synchronously
            from ..services.document_queue import process_document_job
            await process_document_job({
                "doc_id": doc_id,
                "tenant_id": tenant_id,
                "file_path": storage_url,
                "filename": file.filename or "unknown",
                "chatbot_id": chatbot_id,
            })

        return DocumentUploadResponse(
            id=doc_id,
            name=file.filename or "unknown",
            status="processing",
            message="Document uploaded successfully and is being processed",
            is_duplicate=is_duplicate,
            duplicate_of=duplicate.get("id") if duplicate else None,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document: {str(e)}",
        )


@router.post("/check-duplicate", response_model=DuplicateCheckResponse)
async def check_duplicate(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
) -> DuplicateCheckResponse:
    """
    Check if a file is a duplicate before uploading (5.1.4).
    """
    file_content = await file.read()
    tenant_id = await get_current_tenant_id(current_user)
    content_hash = storage.compute_file_hash(file_content)
    
    duplicate = await database.check_duplicate_document(tenant_id, content_hash)
    
    return DuplicateCheckResponse(
        is_duplicate=duplicate is not None,
        duplicate_of=duplicate.get("id") if duplicate else None,
        duplicate_filename=duplicate.get("original_filename") if duplicate else None,
        can_proceed=True,
    )


@router.post("/ingest-url", response_model=URLIngestionResponse, status_code=status.HTTP_202_ACCEPTED)
async def ingest_url(
    request: URLIngestionRequest,
    current_user: User = Depends(get_current_user)
) -> URLIngestionResponse:
    """
    Ingest content from a URL (5.1.2).
    
    - Accepts URL
    - Uses trafilatura to extract clean text
    - Saves as .txt to storage
    - Processes like a regular document
    """
    import trafilatura
    
    tenant_id = await get_current_tenant_id(current_user)
    
    try:
        # Extract content from URL
        downloaded = trafilatura.fetch_url(request.url)
        if not downloaded:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract content from URL. Make sure the URL is accessible.",
            )
        
        text = trafilatura.extract(downloaded)
        if not text or len(text.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No extractable text found at URL",
            )
        
        # Generate document ID and filename
        doc_id = str(uuid.uuid4())
        filename = f"{doc_id}.txt"
        
        # Create filename from URL domain
        from urllib.parse import urlparse
        domain = urlparse(request.url).netloc
        display_name = f"{domain}_content"
        
        # Encode text to bytes
        file_content = text.encode('utf-8')
        
        # Save to storage
        doc_id, storage_url = storage.save_uploaded_file(
            file_content,
            filename,
            tenant_id=tenant_id,
            doc_id=doc_id
        )
        
        # Create document record
        document = await database.create_document(
            doc_id=doc_id,
            name=filename,
            doc_type="text",
            file_path=storage_url,
            file_size=len(file_content),
            status="processing",
            tenant_id=tenant_id,
            chatbot_id=request.chatbot_id,
            original_filename=display_name,
            storage_url=storage_url,
            source_url=request.url,
        )
        
        # Queue for processing
        if queue_service.enabled:
            queue_service.enqueue_document_processing(
                doc_id=doc_id,
                tenant_id=tenant_id,
                file_path=storage_url,
                filename=filename,
                chatbot_id=request.chatbot_id,
            )
        else:
            from ..services.document_queue import process_document_job
            await process_document_job({
                "doc_id": doc_id,
                "tenant_id": tenant_id,
                "file_path": storage_url,
                "filename": filename,
                "chatbot_id": request.chatbot_id,
            })
        
        return URLIngestionResponse(
            id=doc_id,
            name=display_name,
            status="processing",
            message="URL content extracted and is being processed",
        )
        
    except HTTPException:
        raise
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="URL ingestion requires trafilatura library. Install with: pip install trafilatura",
        )
    except Exception as e:
        logger.error(f"Error ingesting URL: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest URL: {str(e)}",
        )


@router.get("/{doc_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    doc_id: str,
    current_user: User = Depends(get_current_user)
) -> DocumentStatusResponse:
    """
    Get document processing status (5.1.6).
    
    - Client polls this endpoint while status is 'processing'
    - Returns current status, progress, and any error message
    """
    tenant_id = await get_current_tenant_id(current_user)
    document = await database.get_document_by_tenant(doc_id, tenant_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document not found: {doc_id}",
        )
    
    # Get progress from Redis if available
    progress = 0
    job_status = queue_service.get_job_status(doc_id)
    if job_status:
        progress = job_status.get("progress", 0)
    elif document.get("status") == "processing":
        progress = 50  # Default processing progress
    
    return DocumentStatusResponse(
        id=doc_id,
        status=document.get("status", "processing"),
        chunk_count=document.get("chunk_count"),
        page_count=document.get("page_count"),
        error_message=document.get("error_message"),
        progress=progress,
    )


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None, alias="type"),
    include_archived: bool = Query(False),
    current_user: User = Depends(get_current_user),
) -> DocumentListResponse:
    """
    List documents with pagination, search, and filters (5.3.1).
    """
    tenant_id = await get_current_tenant_id(current_user)
    
    documents, total = await database.list_documents(
        limit=limit,
        offset=offset,
        search=search,
        status=status,
        doc_type=type,
        tenant_id=tenant_id,
        include_archived=include_archived,
    )

    return DocumentListResponse(
        documents=[DocumentMetadata(**doc) for doc in documents],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/usage", response_model=StorageUsageResponse)
async def get_storage_usage(
    current_user: User = Depends(get_current_user)
) -> StorageUsageResponse:
    """Get storage usage for current tenant (5.3.1)."""
    tenant_id = await get_current_tenant_id(current_user)
    used_bytes, doc_count = await database.get_storage_usage(tenant_id)
    
    # Limit should come from the tenant's plan
    limit_bytes = 100 * 1024 * 1024  # 100MB default
    
    return StorageUsageResponse(
        used_bytes=used_bytes,
        limit_bytes=limit_bytes,
        used_percent=round((used_bytes / limit_bytes) * 100, 1) if limit_bytes > 0 else 0,
        document_count=doc_count,
    )


@router.get("/{doc_id}", response_model=DocumentDetailResponse)
async def get_document(
    doc_id: str,
    current_user: User = Depends(get_current_user)
) -> DocumentDetailResponse:
    """Get document details."""
    tenant_id = await get_current_tenant_id(current_user)
    document = await database.get_document_by_tenant(doc_id, tenant_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document not found: {doc_id}",
        )
    
    return DocumentDetailResponse(document=DocumentMetadata(**document))


@router.post("/{doc_id}/archive", response_model=ArchiveDocumentResponse)
async def archive_document(
    doc_id: str,
    current_user: User = Depends(get_current_user)
) -> ArchiveDocumentResponse:
    """
    Archive a document (5.3.5).
    
    - Removes from vector store (chatbot stops using it)
    - Keeps original file and database record
    """
    tenant_id = await get_current_tenant_id(current_user)
    document = await database.get_document_by_tenant(doc_id, tenant_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document not found: {doc_id}",
        )
    
    # Update document as archived
    await database.update_document(doc_id, is_archived=True)
    
    # TODO: Remove from vector store
    
    return ArchiveDocumentResponse(
        id=doc_id,
        archived=True,
        message="Document archived successfully",
    )


@router.post("/{doc_id}/restore", response_model=ArchiveDocumentResponse)
async def restore_document(
    doc_id: str,
    current_user: User = Depends(get_current_user)
) -> ArchiveDocumentResponse:
    """Restore an archived document (5.3.5)."""
    tenant_id = await get_current_tenant_id(current_user)
    document = await database.get_document_by_tenant(doc_id, tenant_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document not found: {doc_id}",
        )
    
    # Update document as not archived
    await database.update_document(doc_id, is_archived=False)
    
    # Re-process and re-embed
    # TODO: Trigger re-processing
    
    return ArchiveDocumentResponse(
        id=doc_id,
        archived=False,
        message="Document restored successfully",
    )


@router.post("/{doc_id}/replace", response_model=ReplaceDocumentResponse)
async def replace_document(
    doc_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
) -> ReplaceDocumentResponse:
    """
    Replace document with new version (5.3.6).
    
    - Deletes old chunks from vector store
    - Processes new file
    - Preserves filename in UI
    """
    tenant_id = await get_current_tenant_id(current_user)
    document = await database.get_document_by_tenant(doc_id, tenant_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document not found: {doc_id}",
        )
    
    # Read new file
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / (1024*1024):.0f}MB",
        )
    
    # Compute new hash
    content_hash = storage.compute_file_hash(file_content)
    
    # Save new file (replace)
    _, storage_url = storage.save_uploaded_file(
        file_content,
        file.filename or document.get("original_filename", "unknown"),
        tenant_id=tenant_id,
        doc_id=doc_id
    )
    
    # Update document
    await database.update_document(
        doc_id,
        status="processing",
        content_hash=content_hash,
        file_size=len(file_content),
        storage_url=storage_url,
    )
    
    # TODO: Delete old vectors and re-process
    
    return ReplaceDocumentResponse(
        id=doc_id,
        status="processing",
        message="Document replaced successfully, reprocessing...",
    )


@router.post("/{doc_id}/reindex", response_model=ReindexResponse)
async def reindex_document(
    doc_id: str,
    current_user: User = Depends(get_current_user)
) -> ReindexResponse:
    """Re-index a document."""
    tenant_id = await get_current_tenant_id(current_user)
    document = await database.get_document_by_tenant(doc_id, tenant_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document not found: {doc_id}",
        )
    
    # Reset status and re-process
    await database.update_document(doc_id, status="processing", chunk_count=0)
    
    # Queue for processing
    if queue_service.enabled:
        queue_service.enqueue_document_processing(
            doc_id=doc_id,
            tenant_id=tenant_id,
            file_path=document.get("storage_url", ""),
            filename=document.get("original_filename", "unknown"),
            chatbot_id=document.get("chatbot_id"),
        )
    else:
        from ..services.document_queue import process_document_job
        await process_document_job({
            "doc_id": doc_id,
            "tenant_id": tenant_id,
            "file_path": document.get("storage_url", ""),
            "filename": document.get("original_filename", "unknown"),
            "chatbot_id": document.get("chatbot_id"),
        })
    
    return ReindexResponse(
        id=doc_id,
        status="processing",
        message="Document reindexing started",
    )


@router.delete("/{doc_id}", response_model=DeleteDocumentResponse)
async def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user)
) -> DeleteDocumentResponse:
    """
    Delete a document (5.3.7).
    
    - Deletes from R2/local storage
    - Deletes all chunks from vector store
    - Deletes database record
    """
    tenant_id = await get_current_tenant_id(current_user)
    document = await database.get_document_by_tenant(doc_id, tenant_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document not found: {doc_id}",
        )
    
    # Delete from storage
    storage.delete_file(
        doc_id,
        tenant_id=tenant_id,
        filename=document.get("original_filename")
    )
    
    # TODO: Delete from vector store
    
    # Delete from database
    deleted = await database.delete_document(doc_id)
    
    return DeleteDocumentResponse(
        id=doc_id,
        deleted=deleted,
        message=f"Document '{document.get('original_filename')}' deleted successfully",
    )
