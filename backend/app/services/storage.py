"""
Storage service for document file management.

This module provides functions for:
- Storing uploaded document files (local or Cloudflare R2)
- Retrieving document file paths
- Deleting document files
- Secure filename handling and validation
- Multi-tenant file organization
"""

import hashlib
import logging
import re
import uuid
from io import BytesIO
from pathlib import Path
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from ..config import settings

logger = logging.getLogger(__name__)

# Default storage directory (fallback when R2 not configured)
STORAGE_DIR = Path("storage/documents")

# Allowed file extensions (whitelist approach for security)
ALLOWED_EXTENSIONS = {".md", ".markdown", ".html", ".htm", ".txt", ".pdf", ".docx", ".csv"}

# Maximum file size (50MB per spec 5.1.1)
MAX_FILE_SIZE = 50 * 1024 * 1024


class R2Storage:
    """Cloudflare R2 storage client."""
    
    def __init__(self):
        # Support both new and legacy config names
        self.bucket_name = getattr(settings, 'r2_bucket_name', None) or getattr(settings, 'cloudflare_r2_bucket', None)
        self.access_key = getattr(settings, 'r2_access_key', None) or getattr(settings, 'cloudflare_r2_access_key', None)
        self.secret_key = getattr(settings, 'r2_secret_key', None) or getattr(settings, 'cloudflare_r2_secret_key', None)
        self.endpoint_url = getattr(settings, 'r2_endpoint_url', None) or getattr(settings, 'cloudflare_r2_endpoint', None)
        self.region = getattr(settings, 'r2_region', 'auto')
        self.enabled = all([self.bucket_name, self.access_key, self.secret_key, self.endpoint_url])
        
        if self.enabled:
            self.client = boto3.client(
                's3',
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                endpoint_url=self.endpoint_url,
                region_name=self.region,
            )
            logger.info("R2 storage initialized successfully")
        else:
            self.client = None
            logger.info("R2 not configured, using local storage")
    
    def _get_key(self, tenant_id: str, doc_id: str, filename: str) -> str:
        """Generate R2 object key."""
        safe_filename = Path(filename).name
        return f"tenants/{tenant_id}/documents/{doc_id}/{safe_filename}"
    
    def upload(self, tenant_id: str, doc_id: str, filename: str, content: bytes) -> str:
        """Upload file to R2."""
        if not self.enabled:
            raise RuntimeError("R2 is not configured")
        
        key = self._get_key(tenant_id, doc_id, filename)
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=content,
            ContentType=self._get_content_type(filename)
        )
        
        # Return the R2 URL
        return f"{self.endpoint_url}/{self.bucket_name}/{key}"
    
    def download(self, tenant_id: str, doc_id: str, filename: str) -> bytes:
        """Download file from R2."""
        if not self.enabled:
            raise RuntimeError("R2 is not configured")
        
        key = self._get_key(tenant_id, doc_id, filename)
        response = self.client.get_object(Bucket=self.bucket_name, Key=key)
        return response['Body'].read()
    
    def delete(self, tenant_id: str, doc_id: str, filename: str) -> bool:
        """Delete file from R2."""
        if not self.enabled:
            raise RuntimeError("R2 is not configured")
        
        key = self._get_key(tenant_id, doc_id, filename)
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError:
            return False
    
    def exists(self, tenant_id: str, doc_id: str, filename: str) -> bool:
        """Check if file exists in R2."""
        if not self.enabled:
            return False
        
        key = self._get_key(tenant_id, doc_id, filename)
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError:
            return False
    
    def _get_content_type(self, filename: str) -> str:
        """Get content type based on file extension."""
        ext = Path(filename).suffix.lower()
        content_types = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.html': 'text/html',
            '.htm': 'text/html',
            '.csv': 'text/csv',
        }
        return content_types.get(ext, 'application/octet-stream')


# Global R2 storage instance
r2_storage = R2Storage()


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
    max_filename_length = 255
    if len(safe_name) > max_filename_length:
        name_part, ext = safe_name.rsplit('.', 1) if '.' in safe_name else (safe_name, '')
        max_name_len = max_filename_length - len(ext) - 1 if ext else max_filename_length
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


def validate_file_size(file_content: bytes) -> tuple[bool, str]:
    """
    Validate file size is within limits.
    
    Args:
        file_content: File content as bytes
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(file_content) > MAX_FILE_SIZE:
        return False, f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / (1024*1024):.0f}MB"
    return True, ""


def compute_file_hash(file_content: bytes) -> str:
    """
    Compute MD5 hash of file content for duplicate detection.
    
    Args:
        file_content: File content as bytes
        
    Returns:
        MD5 hash hex string
    """
    return hashlib.md5(file_content).hexdigest()


def save_uploaded_file(
    file_content: bytes, 
    filename: str, 
    tenant_id: Optional[str] = None,
    doc_id: Optional[str] = None
) -> tuple[str, str]:
    """
    Save an uploaded file to storage with secure filename handling.
    Supports both R2 and local storage.

    Args:
        file_content: File content as bytes
        filename: Original filename
        tenant_id: Tenant ID for multi-tenancy (required for R2)
        doc_id: Optional document ID (generated if not provided)

    Returns:
        Tuple of (document_id, storage_url)

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

    # Generate unique document ID if not provided
    if not doc_id:
        doc_id = str(uuid.uuid4())

    # Try R2 first if tenant_id is provided
    if tenant_id and r2_storage.enabled:
        try:
            storage_url = r2_storage.upload(tenant_id, doc_id, sanitized_name, file_content)
            logger.info(
                f"Saved uploaded file to R2: {filename} -> {storage_url} (doc_id: {doc_id})"
            )
            return doc_id, storage_url
        except Exception as e:
            logger.warning(f"R2 upload failed, falling back to local storage: {e}")

    # Fallback to local storage
    storage_dir = ensure_storage_dir()
    
    # Create tenant subdirectory for organization
    if tenant_id:
        storage_dir = storage_dir / tenant_id
        storage_dir.mkdir(parents=True, exist_ok=True)

    # Create safe filename: doc_id + validated extension
    safe_filename = f"{doc_id}{file_ext}"
    file_path = storage_dir / safe_filename

    # Ensure the file path is within the storage directory (additional safety check)
    try:
        file_path.resolve().relative_to(storage_dir.resolve())
    except ValueError:
        raise ValueError("Invalid file path: path traversal detected")

    # Write file
    file_path.write_bytes(file_content)

    # Return file:// URL for local storage
    storage_url = f"file://{file_path}"

    logger.info(
        f"Saved uploaded file locally: {filename} (sanitized: {sanitized_name}) -> "
        f"{file_path} (doc_id: {doc_id})"
    )

    return doc_id, storage_url


def get_file_path(doc_id: str, tenant_id: Optional[str] = None) -> Optional[Path]:
    """
    Get the file path for a document ID.

    Args:
        doc_id: Document identifier
        tenant_id: Tenant ID for R2 lookup

    Returns:
        Path to the file if it exists, None otherwise
    """
    # Try R2 first
    if tenant_id and r2_storage.enabled:
        # For R2, we'd need to store the original filename
        # This is a placeholder - in practice, we'd look up from database
        return None

    # Local storage lookup
    storage_dir = ensure_storage_dir()
    if tenant_id:
        storage_dir = storage_dir / tenant_id

    # Search for file with this doc_id (filename format: doc_id.ext)
    for file_path in storage_dir.glob(f"{doc_id}.*"):
        if file_path.is_file():
            return file_path

    logger.warning(f"File not found for doc_id: {doc_id}")
    return None


def get_file_content(doc_id: str, tenant_id: Optional[str] = None, filename: Optional[str] = None) -> Optional[bytes]:
    """
    Get file content from storage.
    
    Args:
        doc_id: Document identifier
        tenant_id: Tenant ID
        filename: Original filename (required for R2)
        
    Returns:
        File content as bytes, or None if not found
    """
    # Try R2 first
    if tenant_id and r2_storage.enabled and filename:
        try:
            return r2_storage.download(tenant_id, doc_id, filename)
        except Exception as e:
            logger.warning(f"R2 download failed: {e}")
    
    # Fallback to local
    file_path = get_file_path(doc_id, tenant_id)
    if file_path and file_path.exists():
        return file_path.read_bytes()
    
    return None


def delete_file(doc_id: str, tenant_id: Optional[str] = None, filename: Optional[str] = None) -> bool:
    """
    Delete a document file by document ID.

    Args:
        doc_id: Document identifier
        tenant_id: Tenant ID
        filename: Original filename (required for R2)

    Returns:
        True if file was deleted, False if it didn't exist
    """
    # Try R2 first
    if tenant_id and r2_storage.enabled and filename:
        try:
            if r2_storage.delete(tenant_id, doc_id, filename):
                logger.info(f"Deleted file from R2: doc_id={doc_id}")
                return True
        except Exception as e:
            logger.warning(f"R2 delete failed: {e}")

    # Fallback to local
    file_path = get_file_path(doc_id, tenant_id)
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
