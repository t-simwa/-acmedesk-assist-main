"""
Document management API endpoints.

Implements:
- POST /api/documents/upload - Upload a document file
- GET /api/documents - List documents with pagination, search, and filters
- GET /api/documents/{id} - Get document details
- POST /api/documents/{id}/reindex - Re-index a document
- DELETE /api/documents/{id} - Delete a document
"""

import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from ..config import get_chunking_config, settings
from ..rag.chunking import chunk_text
from ..rag.embeddings import EmbeddingModel
from ..rag.ingestion import ingest_document
from ..rag.vector_store import VectorStore
from ..schemas.documents import (
    DeleteDocumentResponse,
    DocumentDetailResponse,
    DocumentListResponse,
    DocumentMetadata,
    DocumentUploadResponse,
    ReindexResponse,
)
from ..services import database, storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])

# Initialize embedding model and vector store (singleton pattern)
_embedding_model: Optional[EmbeddingModel] = None
_vector_store: Optional[VectorStore] = None


def get_embedding_model() -> EmbeddingModel:
    """Get or create embedding model instance."""
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = EmbeddingModel(
            model_name=settings.embedding_model,
            openai_api_key=settings.openai_api_key,
            use_openai=settings.use_openai_embeddings,
        )
    return _embedding_model


def get_vector_store() -> VectorStore:
    """Get or create vector store instance."""
    global _vector_store
    if _vector_store is None:
        persist_dir = settings.vector_store_persist_dir or "backend/data/vector_db"
        _vector_store = VectorStore(
            collection_name=settings.vector_collection_name,
            persist_directory=persist_dir,
        )
    return _vector_store


def get_document_type(filename: str) -> str:
    """Determine document type from filename."""
    ext = Path(filename).suffix.lower()
    if ext in [".md", ".markdown"]:
        return "markdown"
    elif ext in [".html", ".htm"]:
        return "html"
    elif ext == ".txt":
        return "text"
    elif ext == ".pdf":
        return "pdf"
    elif ext == ".docx":
        return "docx"
    else:
        return "unknown"


async def index_document(doc_id: str, file_path: Path) -> tuple[int, Optional[str]]:
    """
    Index a document: ingest, chunk, embed, and store in vector DB.

    Args:
        doc_id: Document identifier
        file_path: Path to the document file

    Returns:
        Tuple of (chunk_count, error_message)
    """
    try:
        # Update status to processing
        await database.update_document(doc_id, status="processing", error_message=None)

        # Ingest document
        doc = ingest_document(file_path)
        if doc is None:
            error_msg = f"Failed to ingest document: unsupported format or error reading file"
            await database.update_document(doc_id, status="error", error_message=error_msg)
            return 0, error_msg

        # Chunk document
        chunking_config = get_chunking_config()
        chunks = chunk_text(doc.text, chunking_config, doc_id, doc.url)

        if not chunks:
            error_msg = "No chunks created from document"
            await database.update_document(doc_id, status="error", error_message=error_msg)
            return 0, error_msg

        # Generate embeddings
        embedding_model = get_embedding_model()
        texts = [chunk.text for chunk in chunks]
        embeddings = embedding_model.embed_batch(texts)

        # Store in vector DB
        vector_store = get_vector_store()
        vector_store.add_documents(chunks, embeddings)

        # Update document status
        chunk_count = len(chunks)
        await database.update_document(doc_id, status="indexed", chunk_count=chunk_count)

        logger.info(f"Successfully indexed document: doc_id={doc_id}, chunks={chunk_count}")

        return chunk_count, None

    except Exception as e:
        error_msg = f"Error indexing document: {str(e)}"
        logger.error(f"Indexing error for doc_id={doc_id}: {e}", exc_info=True)
        await database.update_document(doc_id, status="error", error_message=error_msg)
        return 0, error_msg


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile = File(...)) -> DocumentUploadResponse:
    """
    Upload a document file.

    Accepts MD/HTML/TXT/PDF/DOCX files, stores them, creates metadata record,
    and enqueues ingestion/indexing task.

    Args:
        file: Uploaded file (multipart/form-data)

    Returns:
        DocumentUploadResponse with document ID and status

    Raises:
        HTTPException: If file format is not supported or upload fails
    """
    # Validate file type
    doc_type = get_document_type(file.filename or "")
    if doc_type == "unknown":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Supported formats: .md, .html, .htm, .txt, .pdf, .docx",
        )

    # Validate file size (10MB limit)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / (1024*1024):.0f}MB",
        )

    try:
        # Save file to storage
        doc_id, file_path = storage.save_uploaded_file(file_content, file.filename or "unknown")

        # Get file size
        file_size = storage.get_file_size(file_path)

        # Create document metadata record with status "processing"
        document = await database.create_document(
            doc_id=doc_id,
            name=file.filename or "unknown",
            doc_type=doc_type,
            file_path=str(file_path),
            file_size=file_size,
            status="processing",
        )

        # Index document synchronously
        chunk_count, error_message = await index_document(doc_id, file_path)

        # Get updated document
        document = await database.get_document(doc_id)
        if not document:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve document")

        return DocumentUploadResponse(
            id=document["id"],
            name=document["name"],
            status=document["status"],
            message=f"Document uploaded and {'indexed successfully' if document['status'] == 'indexed' else 'processing failed'}",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document: {str(e)}",
        )


@router.get("", response_model=DocumentListResponse, status_code=status.HTTP_200_OK)
async def list_documents(
    limit: int = Query(50, ge=1, le=100, description="Maximum number of documents to return"),
    offset: int = Query(0, ge=0, description="Number of documents to skip"),
    search: Optional[str] = Query(None, description="Search term to filter by document name"),
    status: Optional[str] = Query(None, description="Filter by status (processing, indexed, error)"),
    type: Optional[str] = Query(None, alias="type", description="Filter by document type (markdown, html, text, pdf, docx)"),
) -> DocumentListResponse:
    """
    List documents with pagination, search, and filtering.

    Args:
        limit: Maximum number of documents to return (1-100)
        offset: Number of documents to skip
        search: Search term to filter by document name (case-insensitive)
        status: Filter by status (processing, indexed, error)
        type: Filter by document type (markdown, html, text, pdf, docx)

    Returns:
        DocumentListResponse with list of documents and pagination info
    """
    documents, total = await database.list_documents(
        limit=limit,
        offset=offset,
        search=search,
        status=status,
        doc_type=type,
    )

    return DocumentListResponse(
        documents=[DocumentMetadata(**doc) for doc in documents],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{doc_id}", response_model=DocumentDetailResponse, status_code=status.HTTP_200_OK)
async def get_document(doc_id: str) -> DocumentDetailResponse:
    """
    Get document details by ID.

    Returns metadata and basic stats (chunk count, last indexed).

    Args:
        doc_id: Document identifier

    Returns:
        DocumentDetailResponse with document metadata

    Raises:
        HTTPException: If document is not found
    """
    document = await database.get_document(doc_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document not found: {doc_id}")

    return DocumentDetailResponse(document=DocumentMetadata(**document))


@router.post("/{doc_id}/reindex", response_model=ReindexResponse, status_code=status.HTTP_200_OK)
async def reindex_document(doc_id: str) -> ReindexResponse:
    """
    Re-index a document.

    Re-runs ingestion and indexing for the document.

    Args:
        doc_id: Document identifier

    Returns:
        ReindexResponse with new status and message

    Raises:
        HTTPException: If document is not found
    """
    # Get document
    document = await database.get_document(doc_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document not found: {doc_id}")

    # Get file path
    file_path = Path(document["file_path"])
    if not file_path.exists():
        error_msg = f"Document file not found: {file_path}"
        await database.update_document(doc_id, status="error", error_message=error_msg)
        return ReindexResponse(
            id=doc_id,
            status="error",
            message=error_msg,
        )

    # Delete existing vectors for this document
    try:
        vector_store = get_vector_store()
        deleted_count = vector_store.delete_by_doc_id(doc_id)
        logger.info(f"Deleted {deleted_count} existing chunks for doc_id={doc_id} before reindexing")
    except Exception as e:
        logger.warning(f"Error deleting existing chunks for doc_id={doc_id}: {e}")

    # Re-index document
    chunk_count, error_message = await index_document(doc_id, file_path)

    # Get updated document
    document = await database.get_document(doc_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve document")

    if document["status"] == "indexed":
        message = f"Document re-indexed successfully with {chunk_count} chunks"
    else:
        message = f"Re-indexing failed: {error_message or 'Unknown error'}"

    return ReindexResponse(
        id=doc_id,
        status=document["status"],
        message=message,
    )


@router.delete("/{doc_id}", response_model=DeleteDocumentResponse, status_code=status.HTTP_200_OK)
async def delete_document(doc_id: str) -> DeleteDocumentResponse:
    """
    Delete a document.

    Removes metadata, source file, and vectors.

    Args:
        doc_id: Document identifier

    Returns:
        DeleteDocumentResponse with deletion status

    Raises:
        HTTPException: If document is not found
    """
    # Get document to verify it exists
    document = await database.get_document(doc_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document not found: {doc_id}")

    try:
        # Delete vectors from vector store
        try:
            vector_store = get_vector_store()
            deleted_count = vector_store.delete_by_doc_id(doc_id)
            logger.info(f"Deleted {deleted_count} chunks from vector store for doc_id={doc_id}")
        except Exception as e:
            logger.warning(f"Error deleting vectors for doc_id={doc_id}: {e}")

        # Delete file from storage
        storage.delete_file(doc_id)

        # Delete metadata from database
        deleted = await database.delete_document(doc_id)

        if deleted:
            return DeleteDocumentResponse(
                id=doc_id,
                deleted=True,
                message=f"Document '{document['name']}' has been successfully deleted",
            )
        else:
            return DeleteDocumentResponse(
                id=doc_id,
                deleted=False,
                message=f"Document metadata deleted but some cleanup may have failed",
            )

    except Exception as e:
        logger.error(f"Error deleting document {doc_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}",
        )
