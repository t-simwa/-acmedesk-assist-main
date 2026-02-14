"""
Storage service for document file management.

This module provides functions for:
- Storing uploaded document files
- Retrieving document file paths
- Deleting document files
- Secure filename handling and validation
"""

import logging
import re
import uuid
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Default storage directory
STORAGE_DIR = Path("storage/documents")

# Allowed file extensions (whitelist approach for security)
ALLOWED_EXTENSIONS = {".md", ".markdown", ".html", ".htm", ".txt"}

# Maximum filename length (excluding path)
MAX_FILENAME_LENGTH = 255


def ensure_storage_dir() -> Path:
    """
    Ensure the storage directory exists.

    Returns:
        Path to the storage directory
    """
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    return STORAGE_DIR


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to prevent path traversal and other security issues.

    Args:
        filename: Original filename

    Returns:
        Sanitized filename (just the basename, no path components)
    """
    # Extract just the filename (no path components)
    safe_name = Path(filename).name

    # Remove any path traversal attempts
    safe_name = safe_name.replace("..", "").replace("/", "").replace("\\", "")

    # Remove or replace dangerous characters
    # Keep alphanumeric, dots, hyphens, underscores, and spaces
    safe_name = re.sub(r'[^a-zA-Z0-9._\-\s]', '_', safe_name)

    # Limit length
    if len(safe_name) > MAX_FILENAME_LENGTH:
        name_part, ext = safe_name.rsplit('.', 1) if '.' in safe_name else (safe_name, '')
        max_name_len = MAX_FILENAME_LENGTH - len(ext) - 1 if ext else MAX_FILENAME_LENGTH
        safe_name = safe_name[:max_name_len] + (f'.{ext}' if ext else '')

    return safe_name


def validate_file_extension(filename: str) -> bool:
    """
    Validate that the file has an allowed extension.

    Args:
        filename: Filename to validate

    Returns:
        True if extension is allowed, False otherwise
    """
    ext = Path(filename).suffix.lower()
    return ext in ALLOWED_EXTENSIONS


def save_uploaded_file(file_content: bytes, filename: str) -> tuple[str, Path]:
    """
    Save an uploaded file to storage with secure filename handling.

    Args:
        file_content: File content as bytes
        filename: Original filename

    Returns:
        Tuple of (document_id, file_path)

    Raises:
        ValueError: If filename is invalid or extension is not allowed
    """
    # Sanitize and validate filename
    sanitized_name = sanitize_filename(filename)
    
    if not sanitized_name:
        raise ValueError("Invalid filename: filename is empty after sanitization")

    # Get file extension
    file_ext = Path(sanitized_name).suffix.lower()

    # Validate extension
    if not validate_file_extension(sanitized_name):
        raise ValueError(
            f"File extension '{file_ext}' is not allowed. "
            f"Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    storage_dir = ensure_storage_dir()

    # Generate unique document ID
    doc_id = str(uuid.uuid4())

    # Create safe filename: doc_id + validated extension
    # This prevents any path traversal or filename injection attacks
    safe_filename = f"{doc_id}{file_ext}"
    file_path = storage_dir / safe_filename

    # Ensure the file path is within the storage directory (additional safety check)
    try:
        file_path.resolve().relative_to(storage_dir.resolve())
    except ValueError:
        raise ValueError("Invalid file path: path traversal detected")

    # Write file
    file_path.write_bytes(file_content)

    logger.info(
        f"Saved uploaded file: {filename} (sanitized: {sanitized_name}) -> "
        f"{file_path} (doc_id: {doc_id})"
    )

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
