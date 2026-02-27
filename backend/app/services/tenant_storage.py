"""
Tenant-scoped file storage service for multi-tenancy isolation.

This module provides:
- TenantStorage: Tenant-scoped file storage
- get_tenant_storage(): Factory function to get tenant storage
- TenantStorageManager: Manager for multiple tenant storages
- Cloud storage integration (S3/R2) support

File structure:
    /tenants/{tenant_id}/documents/{file_id}
    /tenants/{tenant_id}/avatars/{file_id}
    /tenants/{tenant_id}/chatbot_assets/{file_id}
"""

import logging
import os
import uuid
from pathlib import Path
from typing import Optional

from ..tenancy.context import get_current_tenant_id
from .storage import (
    ALLOWED_EXTENSIONS,
    MAX_FILENAME_LENGTH,
    delete_file as delete_file_local,
    get_file_path as get_file_path_local,
    sanitize_filename,
    validate_file_extension,
)

logger = logging.getLogger(__name__)

# Storage subdirectories
SUBDIRS = {
    "documents": "documents",
    "avatars": "avatars",
    "chatbot_assets": "chatbot_assets",
    "exports": "exports",
}

# Default local storage base directory
DEFAULT_STORAGE_BASE = Path("storage/tenants")


class TenantStorage:
    """
    Tenant-scoped file storage.
    
    This class ensures files are stored in tenant-isolated directories
    and provides both local storage and cloud storage (S3/R2) support.
    
    Usage:
        # Get storage for current tenant (uses tenant context)
        storage = TenantStorage()
        
        # Or specify tenant explicitly
        storage = TenantStorage(tenant_id="specific-tenant-id")
        
        # Save a file - stored in /tenants/{tenant_id}/documents/{file_id}
        file_id = storage.save_file(file_content, "document.pdf")
        
        # Get file path
        file_path = storage.get_file_path(file_id)
        
        # Generate signed URL for download
        url = storage.get_signed_url(file_id)
    """

    def __init__(
        self,
        tenant_id: Optional[str] = None,
        storage_base: Optional[Path] = None,
    ):
        """
        Initialize tenant storage.
        
        Args:
            tenant_id: Optional tenant ID. Uses current tenant context if not provided.
            storage_base: Base directory for local storage
        """
        self.tenant_id = tenant_id or get_current_tenant_id()
        if not self.tenant_id:
            raise ValueError(
                "No tenant_id provided and no tenant context set. "
                "Either provide tenant_id or use within a request with tenant context."
            )
        
        self.storage_base = storage_base or DEFAULT_STORAGE_BASE
        self.tenant_dir = self.storage_base / self.tenant_id
        
        # Check if cloud storage is configured
        self.use_cloud = self._check_cloud_storage()
        
        logger.info(f"Initialized tenant storage for tenant: {self.tenant_id}")

    def _check_cloud_storage(self) -> bool:
        """Check if cloud storage (S3/R2) is configured."""
        # Check for R2 or S3 environment variables
        r2_endpoint = os.environ.get("CLOUDFLARE_R2_ENDPOINT")
        s3_endpoint = os.environ.get("AWS_S3_ENDPOINT")
        
        return bool(r2_endpoint or s3_endpoint)

    def _get_subdir(self, subdir: str) -> Path:
        """Get the subdirectory path for this tenant."""
        return self.tenant_dir / SUBDIRS.get(subdir, subdir)

    def ensure_dirs(self):
        """Ensure all tenant storage directories exist."""
        for subdir in SUBDIRS.values():
            dir_path = self._get_subdir(subdir)
            dir_path.mkdir(parents=True, exist_ok=True)

    def save_file(
        self,
        file_content: bytes,
        filename: str,
        subdir: str = "documents",
    ) -> str:
        """
        Save a file in tenant-isolated storage.
        
        Args:
            file_content: File content as bytes
            filename: Original filename (will be sanitized)
            subdir: Subdirectory within tenant storage
            
        Returns:
            Generated file_id
            
        Raises:
            ValueError: If filename is invalid
        """
        # Sanitize and validate filename
        sanitized_name = sanitize_filename(filename)
        
        if not sanitized_name:
            raise ValueError("Invalid filename: filename is empty after sanitization")
        
        file_ext = Path(sanitized_name).suffix.lower()
        
        if not validate_file_extension(sanitized_name):
            raise ValueError(
                f"File extension '{file_ext}' is not allowed. "
                f"Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Ensure directories exist
        self.ensure_dirs()
        
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        
        if self.use_cloud:
            # Use cloud storage
            return self._save_to_cloud(file_id, file_content, file_ext, subdir)
        else:
            # Use local storage
            return self._save_locally(file_id, file_content, sanitized_name, subdir)

    def _save_locally(
        self,
        file_id: str,
        file_content: bytes,
        sanitized_name: str,
        subdir: str,
    ) -> str:
        """Save file to local storage."""
        subdir_path = self._get_subdir(subdir)
        
        # Create safe filename: file_id + original extension
        file_ext = Path(sanitized_name).suffix.lower()
        safe_filename = f"{file_id}{file_ext}"
        file_path = subdir_path / safe_filename
        
        # Write file
        file_path.write_bytes(file_content)
        
        logger.info(
            f"Saved file: {sanitized_name} -> {file_path} "
            f"(tenant: {self.tenant_id}, file_id: {file_id})"
        )
        
        return file_id

    def _save_to_cloud(
        self,
        file_id: str,
        file_content: bytes,
        file_ext: str,
        subdir: str,
    ) -> str:
        """Save file to cloud storage (S3/R2)."""
        import boto3
        from botocore.config import Config
        
        # Get R2/S3 configuration
        r2_endpoint = os.environ.get("CLOUDFLARE_R2_ENDPOINT")
        r2_access_key = os.environ.get("CLOUDFLARE_R2_ACCESS_KEY")
        r2_secret_key = os.environ.get("CLOUDFLARE_R2_SECRET_KEY")
        r2_bucket = os.environ.get("CLOUDFLARE_R2_BUCKET")
        
        if r2_endpoint and r2_access_key and r2_secret_key and r2_bucket:
            # Use Cloudflare R2
            client = boto3.client(
                "s3",
                endpoint_url=r2_endpoint,
                aws_access_key_id=r2_access_key,
                aws_secret_access_key=r2_secret_key,
                config=Config(signature_version="s3v4"),
            )
            
            # Build the S3 key
            s3_key = f"tenants/{self.tenant_id}/{SUBDIRS.get(subdir, subdir)}/{file_id}{file_ext}"
            
            # Upload
            client.put_object(
                Bucket=r2_bucket,
                Key=s3_key,
                Body=file_content,
            )
            
            logger.info(
                f"Saved file to R2: {s3_key} "
                f"(tenant: {self.tenant_id}, file_id: {file_id})"
            )
            
            return file_id
        
        # Fallback to local storage
        return self._save_locally(file_id, file_content, f"file{file_ext}", subdir)

    def get_file_path(self, file_id: str, subdir: str = "documents") -> Optional[Path]:
        """
        Get the local file path for a file ID.
        
        Args:
            file_id: The file identifier
            subdir: Subdirectory to search in
            
        Returns:
            Path to the file if it exists locally, None otherwise
        """
        if self.use_cloud:
            logger.warning("Cannot get local path for cloud-stored file")
            return None
        
        subdir_path = self._get_subdir(subdir)
        
        # Search for file with this file_id
        for file_path in subdir_path.glob(f"{file_id}.*"):
            if file_path.is_file():
                return file_path
        
        logger.warning(f"File not found: {file_id} (tenant: {self.tenant_id})")
        return None

    def get_signed_url(
        self,
        file_id: str,
        subdir: str = "documents",
        expires_in: int = 3600,
    ) -> str:
        """
        Generate a signed URL for downloading a file.
        
        Args:
            file_id: The file identifier
            subdir: Subdirectory
            expires_in: URL expiration time in seconds
            
        Returns:
            Signed URL for downloading the file
        """
        if self.use_cloud:
            # Generate signed URL for cloud storage
            import boto3
            from botocore.config import Config
            
            r2_endpoint = os.environ.get("CLOUDFLARE_R2_ENDPOINT")
            r2_access_key = os.environ.get("CLOUDFLARE_R2_ACCESS_KEY")
            r2_secret_key = os.environ.get("CLOUDFLARE_R2_SECRET_KEY")
            r2_bucket = os.environ.get("CLOUDFLARE_R2_BUCKET")
            
            if r2_endpoint and r2_access_key and r2_secret_key and r2_bucket:
                client = boto3.client(
                    "s3",
                    endpoint_url=r2_endpoint,
                    aws_access_key_id=r2_access_key,
                    aws_secret_access_key=r2_secret_key,
                    config=Config(signature_version="s3v4"),
                )
                
                # Get file extension from the stored file
                # In production, we'd store metadata about the file
                file_ext = self._get_file_extension(file_id, subdir)
                s3_key = f"tenants/{self.tenant_id}/{SUBDIRS.get(subdir, subdir)}/{file_id}{file_ext}"
                
                url = client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": r2_bucket, "Key": s3_key},
                    ExpiresIn=expires_in,
                )
                
                return url
        
        # For local storage, return the file path
        file_path = self.get_file_path(file_id, subdir)
        if file_path:
            return str(file_path)
        
        raise FileNotFoundError(f"File not found: {file_id}")

    def _get_file_extension(self, file_id: str, subdir: str) -> str:
        """Get the file extension for a stored file."""
        # This would typically look up metadata
        # For now, assume .pdf as a fallback
        return ".pdf"

    def delete_file(self, file_id: str, subdir: str = "documents") -> bool:
        """
        Delete a file.
        
        Args:
            file_id: The file identifier
            subdir: Subdirectory
            
        Returns:
            True if file was deleted
        """
        if self.use_cloud:
            # Delete from cloud storage
            import boto3
            from botocore.config import Config
            
            r2_endpoint = os.environ.get("CLOUDFLARE_R2_ENDPOINT")
            r2_access_key = os.environ.get("CLOUDFLARE_R2_ACCESS_KEY")
            r2_secret_key = os.environ.get("CLOUDFLARE_R2_SECRET_KEY")
            r2_bucket = os.environ.get("CLOUDFLARE_R2_BUCKET")
            
            if r2_endpoint and r2_access_key and r2_secret_key and r2_bucket:
                client = boto3.client(
                    "s3",
                    endpoint_url=r2_endpoint,
                    aws_access_key_id=r2_access_key,
                    aws_secret_access_key=r2_secret_key,
                    config=Config(signature_version="s3v4"),
                )
                
                file_ext = self._get_file_extension(file_id, subdir)
                s3_key = f"tenants/{self.tenant_id}/{SUBDIRS.get(subdir, subdir)}/{file_id}{file_ext}"
                
                try:
                    client.delete_object(Bucket=r2_bucket, Key=s3_key)
                    logger.info(f"Deleted file from R2: {s3_key}")
                    return True
                except Exception as e:
                    logger.error(f"Error deleting file from R2: {e}")
                    return False
        
        # Delete from local storage
        file_path = self.get_file_path(file_id, subdir)
        if file_path and file_path.exists():
            try:
                file_path.unlink()
                logger.info(f"Deleted file: {file_path}")
                return True
            except Exception as e:
                logger.error(f"Error deleting file: {e}")
                return False
        
        return False

    def get_storage_usage(self) -> dict:
        """
        Get storage usage for this tenant.
        
        Returns:
            Dictionary with storage usage information
        """
        total_size = 0
        file_count = 0
        
        if not self.use_cloud:
            # Calculate local storage usage
            for subdir in SUBDIRS.values():
                subdir_path = self._get_subdir(subdir)
                if subdir_path.exists():
                    for file_path in subdir_path.rglob("*"):
                        if file_path.is_file():
                            total_size += file_path.stat().st_size
                            file_count += 1
        
        return {
            "tenant_id": self.tenant_id,
            "total_bytes": total_size,
            "total_mb": round(total_size / (1024 * 1024), 2),
            "file_count": file_count,
        }


def get_tenant_storage(
    tenant_id: Optional[str] = None,
    storage_base: Optional[Path] = None,
) -> TenantStorage:
    """
    Factory function to get a tenant-scoped storage instance.
    
    Args:
        tenant_id: Optional tenant ID. Uses current context if not provided.
        storage_base: Base directory for local storage
        
    Returns:
        TenantStorage instance
    """
    return TenantStorage(
        tenant_id=tenant_id,
        storage_base=storage_base,
    )
