"""
Tenant-scoped vector database collections for multi-tenancy isolation.

This module provides:
- TenantVectorStore: Wrapper around VectorStore that creates separate collections per tenant
- get_tenant_collection_name(): Generate collection name for a tenant
- get_tenant_vector_store(): Get or create a vector store for a specific tenant
"""

import logging
import os
from typing import Dict, List, Optional

from ..tenancy.context import get_current_tenant_id
from .vector_store import VectorStore, CHROMADB_AVAILABLE

logger = logging.getLogger(__name__)

# Default persist directory for vector stores
DEFAULT_PERSIST_DIR = os.environ.get("CHROMA_PERSIST_DIR", "backend/data/vector_db")

# Collection name prefix
COLLECTION_PREFIX = "tenant_"


def get_tenant_collection_name(tenant_id: str, base_name: str = "documents") -> str:
    """
    Generate a collection name for a specific tenant.
    
    Args:
        tenant_id: The tenant's unique identifier
        base_name: Base name for the collection (e.g., "documents")
        
    Returns:
        Collection name in format "tenant_{tenant_id}_{base_name}"
    """
    # Sanitize tenant_id to be safe for collection names
    sanitized_id = tenant_id.replace("-", "_").replace(":", "_")
    return f"{COLLECTION_PREFIX}{sanitized_id}_{base_name}"


class TenantVectorStore:
    """
    Tenant-scoped vector store wrapper.
    
    This class ensures that each tenant has isolated vector storage
    by creating separate ChromaDB collections for each tenant.
    
    Usage:
        # Get tenant-scoped store (automatically uses current tenant context)
        store = TenantVectorStore()
        
        # Or specify tenant explicitly
        store = TenantVectorStore(tenant_id="specific-tenant-id")
        
        # Add documents - they will be stored in tenant's collection
        store.add_documents(chunks, embeddings)
        
        # Search - only searches tenant's collection
        results = store.search(query_embedding)
    """

    def __init__(
        self,
        tenant_id: Optional[str] = None,
        base_name: str = "documents",
        persist_directory: Optional[str] = None,
    ):
        """
        Initialize the tenant-scoped vector store.
        
        Args:
            tenant_id: Optional tenant ID. If not provided, uses current tenant context.
            base_name: Base name for the collection
            persist_directory: Directory to persist ChromaDB data
        """
        if not CHROMADB_AVAILABLE:
            raise ImportError("chromadb not installed. Install with: pip install chromadb")
        
        # Get tenant_id from context if not provided
        self.tenant_id = tenant_id or get_current_tenant_id()
        if not self.tenant_id:
            raise ValueError(
                "No tenant_id provided and no tenant context set. "
                "Either provide tenant_id or use within a request with tenant context."
            )
        
        self.base_name = base_name
        self.collection_name = get_tenant_collection_name(self.tenant_id, base_name)
        
        # Determine persist directory
        if persist_directory:
            self.persist_directory = persist_directory
        else:
            # Use tenant-specific subdirectory
            self.persist_directory = os.path.join(DEFAULT_PERSIST_DIR, self.tenant_id)
        
        # Initialize the underlying vector store
        self._store = VectorStore(
            collection_name=self.collection_name,
            persist_directory=self.persist_directory,
        )
        
        logger.info(f"Initialized tenant vector store for tenant: {self.tenant_id}")

    @property
    def collection(self):
        """Get the underlying ChromaDB collection."""
        return self._store.collection

    def add_documents(
        self,
        chunks: List,
        embeddings: List[List[float]],
        metadatas: Optional[List[Dict]] = None,
    ) -> List[str]:
        """
        Add document chunks to the tenant's vector store.
        
        This method automatically adds tenant_id to the metadata for all chunks.
        
        Args:
            chunks: List of Chunk objects
            embeddings: List of embedding vectors
            metadatas: Optional list of metadata dictionaries
            
        Returns:
            List of vector IDs
        """
        # Add tenant_id to metadata
        if metadatas is None:
            metadatas = [{}] * len(chunks)
        
        for metadata in metadatas:
            metadata["tenant_id"] = self.tenant_id
        
        return self._store.add_documents(
            chunks=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
        )

    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        filter_metadata: Optional[Dict] = None,
    ) -> List[Dict]:
        """
        Search within the tenant's vector store.
        
        This automatically filters to only the current tenant's documents.
        
        Args:
            query_embedding: Embedding vector for the query
            top_k: Number of top results to return
            filter_metadata: Optional additional metadata filters
            
        Returns:
            List of search results
        """
        # Add tenant filter automatically
        if filter_metadata is None:
            filter_metadata = {}
        
        filter_metadata["tenant_id"] = self.tenant_id
        
        return self._store.search(
            query_embedding=query_embedding,
            top_k=top_k,
            filter_metadata=filter_metadata,
        )

    def delete_by_doc_id(self, doc_id: str) -> int:
        """
        Delete all chunks for a specific document within this tenant.
        
        Args:
            doc_id: Document ID to delete
            
        Returns:
            Number of chunks deleted
        """
        return self._store.delete_by_doc_id(doc_id)

    def get_collection_count(self) -> int:
        """Get the number of chunks in this tenant's collection."""
        return self._store.get_collection_count()

    def clear_collection(self):
        """Clear all chunks from this tenant's collection."""
        self._store.clear_collection()


def get_tenant_vector_store(
    tenant_id: Optional[str] = None,
    base_name: str = "documents",
) -> TenantVectorStore:
    """
    Factory function to get or create a tenant-scoped vector store.
    
    Args:
        tenant_id: Optional tenant ID. Uses current context if not provided.
        base_name: Base name for the collection
        
    Returns:
        TenantVectorStore instance for the specified tenant
    """
    return TenantVectorStore(
        tenant_id=tenant_id,
        base_name=base_name,
    )


class MultiTenantVectorStore:
    """
    Vector store that manages collections for multiple tenants.
    
    This is useful for admin operations that need to access all tenants'
    data or for cross-tenant analytics.
    """

    def __init__(self, persist_directory: Optional[str] = None):
        """
        Initialize the multi-tenant vector store manager.
        
        Args:
            persist_directory: Base directory for persisting ChromaDB data
        """
        if not CHROMADB_AVAILABLE:
            raise ImportError("chromadb not installed")
        
        self.persist_directory = persist_directory or DEFAULT_PERSIST_DIR

    def get_tenant_store(self, tenant_id: str) -> TenantVectorStore:
        """
        Get a vector store for a specific tenant.
        
        Args:
            tenant_id: The tenant's unique identifier
            
        Returns:
            TenantVectorStore for the tenant
        """
        return TenantVectorStore(
            tenant_id=tenant_id,
            persist_directory=self.persist_directory,
        )

    def list_tenant_collections(self) -> List[str]:
        """
        List all tenant collection names.
        
        Returns:
            List of collection names
        """
        import chromadb
        from chromadb.config import Settings as ChromaSettings
        
        client = chromadb.PersistentClient(
            path=self.persist_directory,
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        
        collections = client.list_collections()
        tenant_collections = [
            c.name for c in collections 
            if c.name.startswith(COLLECTION_PREFIX)
        ]
        
        return tenant_collections

    def delete_tenant_data(self, tenant_id: str) -> bool:
        """
        Delete all vector data for a specific tenant.
        
        This is useful when cleaning up after a tenant is deleted.
        
        Args:
            tenant_id: The tenant's unique identifier
            
        Returns:
            True if successful
        """
        try:
            store = self.get_tenant_store(tenant_id)
            store.clear_collection()
            logger.info(f"Deleted vector data for tenant: {tenant_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting tenant {tenant_id} vector data: {e}")
            return False
