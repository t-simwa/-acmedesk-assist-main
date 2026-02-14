"""
Storage service for document file management.

This module provides functions for:
- Storing uploaded document files
- Retrieving document file paths
- Deleting document files
"""

import logging
import uuid
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Default storage directory
STORAGE_DIR = Path("storage/documents")


def ensure_storage_dir() -> Path:
    """
    Ensure the storage directory exists.

    Returns:
        Path to the storage directory
    """
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    return STORAGE_DIR


def save_uploaded_file(file_content: bytes, filename: str) -> tuple[str, Path]:
    """
    Save an uploaded file to storage.

    Args:
        file_content: File content as bytes
        filename: Original filename

    Returns:
        Tuple of (document_id, file_path)
    """
    storage_dir = ensure_storage_dir()

    # Generate unique document ID
    doc_id = str(uuid.uuid4())

    # Get file extension
    file_ext = Path(filename).suffix.lower()

    # Create safe filename: doc_id + original extension
    safe_filename = f"{doc_id}{file_ext}"
    file_path = storage_dir / safe_filename

    # Write file
    file_path.write_bytes(file_content)

    logger.info(f"Saved uploaded file: {filename} -> {file_path} (doc_id: {doc_id})")

    return doc_id, file_path


def get_file_path(doc_id: str) -> Optional[Path]:
    """
    Get the file path for a document ID.

    Args:
        doc_id: Document identifier

    Returns:
        Path to the file if it exists, None otherwise
    """
    storage_dir = ensure_storage_dir()

    # Search for file with this doc_id (filename format: doc_id.ext)
    for file_path in storage_dir.glob(f"{doc_id}.*"):
        if file_path.is_file():
            return file_path

    logger.warning(f"File not found for doc_id: {doc_id}")
    return None


def delete_file(doc_id: str) -> bool:
    """
    Delete a document file by document ID.

    Args:
        doc_id: Document identifier

    Returns:
        True if file was deleted, False if it didn't exist
    """
    file_path = get_file_path(doc_id)
    if file_path and file_path.exists():
        try:
            file_path.unlink()
            logger.info(f"Deleted file: {file_path} (doc_id: {doc_id})")
            return True
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {e}")
            return False
    else:
        logger.warning(f"File not found for deletion: doc_id={doc_id}")
        return False


def get_file_size(file_path: Path) -> int:
    """
    Get file size in bytes.

    Args:
        file_path: Path to the file

    Returns:
        File size in bytes, 0 if file doesn't exist
    """
    if file_path.exists():
        return file_path.stat().st_size
    return 0
