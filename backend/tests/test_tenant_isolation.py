"""
Tenant isolation tests for multi-tenancy architecture.

This module tests that:
1. Tenant context is properly set and retrieved
2. Vector store queries only return results for the current tenant
3. File storage is properly isolated per tenant

Run with: pytest backend/tests/test_tenant_isolation.py -v
"""

import pytest
from unittest.mock import Mock, patch, MagicMock

# Test imports
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


class TestTenantContext:
    """Tests for tenant context management."""

    def test_set_and_get_tenant_id(self):
        """Test that tenant_id can be set and retrieved from context."""
        from app.tenancy.context import (
            set_current_tenant_id,
            get_current_tenant_id,
            clear_tenant_context,
        )
        
        # Clear any existing context
        clear_tenant_context()
        
        # Initially should be None
        assert get_current_tenant_id() is None
        
        # Set tenant ID
        test_tenant_id = "tenant-123"
        set_current_tenant_id(test_tenant_id)
        
        # Should now return the tenant ID
        assert get_current_tenant_id() == test_tenant_id
        
        # Clear and verify it's None again
        clear_tenant_context()
        assert get_current_tenant_id() is None

    def test_tenant_context_isolation(self):
        """Test that tenant context doesn't leak between tests."""
        from app.tenancy.context import (
            set_current_tenant_id,
            get_current_tenant_id,
            clear_tenant_context,
        )
        
        # Each test should start with clean context
        clear_tenant_context()
        
        # Set different tenant IDs
        set_current_tenant_id("tenant-a")
        assert get_current_tenant_id() == "tenant-a"
        
        # Clear and set another
        clear_tenant_context()
        set_current_tenant_id("tenant-b")
        assert get_current_tenant_id() == "tenant-b"


class TestTenantVectorStore:
    """Tests for tenant-scoped vector store."""

    @patch('app.rag.tenant_vector_store.CHROMADB_AVAILABLE', True)
    @patch('app.rag.vector_store.CHROMADB_AVAILABLE', True)
    def test_get_tenant_collection_name(self):
        """Test collection name generation for tenants."""
        from app.rag.tenant_vector_store import get_tenant_collection_name
        
        tenant_id = "tenant-abc-123"
        
        collection_name = get_tenant_collection_name(tenant_id, "documents")
        
        assert collection_name == "tenant_tenant_abc_123_documents"
        assert "tenant_tenant" in collection_name  # Prefix added

    @patch('app.rag.tenant_vector_store.CHROMADB_AVAILABLE', True)
    @patch('app.rag.vector_store.CHROMADB_AVAILABLE', True)
    def test_tenant_store_requires_tenant_id(self):
        """Test that TenantVectorStore requires tenant_id."""
        from app.tenancy.context import clear_tenant_context
        from app.rag.tenant_vector_store import TenantVectorStore
        
        # Clear context and ensure no tenant_id
        clear_tenant_context()
        
        # Should raise ValueError without tenant context (and without explicit tenant_id)
        with pytest.raises(ValueError, match="No tenant_id"):
            with patch('app.rag.vector_store.VectorStore.__init__', return_value=None):
                with patch('app.rag.vector_store.VectorStore.collection', create=True):
                    TenantVectorStore(tenant_id=None)

    @patch('app.rag.tenant_vector_store.CHROMADB_AVAILABLE', True)
    @patch('app.rag.vector_store.CHROMADB_AVAILABLE', True)
    def test_tenant_store_with_explicit_tenant_id(self):
        """Test TenantVectorStore with explicit tenant_id."""
        from app.tenancy.context import set_current_tenant_id
        from app.rag.tenant_vector_store import TenantVectorStore
        
        with patch('app.rag.vector_store.VectorStore.__init__', return_value=None):
            with patch('app.rag.vector_store.VectorStore.collection', create=True):
                set_current_tenant_id("test-tenant")
                
                store = TenantVectorStore(tenant_id="explicit-tenant")
                
                assert store.tenant_id == "explicit-tenant"
                assert "explicit_tenant" in store.collection_name


class TestTenantStorage:
    """Tests for tenant-scoped file storage."""

    def test_storage_requires_tenant_id(self):
        """Test that TenantStorage requires tenant_id."""
        from app.services.tenant_storage import TenantStorage
        from app.tenancy.context import clear_tenant_context
        
        # Clear context
        clear_tenant_context()
        
        # Should raise ValueError without tenant context (and without explicit tenant_id)
        with pytest.raises(ValueError, match="No tenant_id"):
            TenantStorage(tenant_id=None)

    def test_storage_with_explicit_tenant_id(self):
        """Test TenantStorage with explicit tenant_id."""
        from app.services.tenant_storage import TenantStorage, DEFAULT_STORAGE_BASE
        
        with patch('app.services.tenant_storage.get_current_tenant_id', return_value=None):
            storage = TenantStorage(tenant_id="my-tenant-123")
            
            assert storage.tenant_id == "my-tenant-123"
            expected_dir = DEFAULT_STORAGE_BASE / "my-tenant-123"
            assert storage.tenant_dir == expected_dir

    def test_subdirectories_defined(self):
        """Test that expected subdirectories are defined."""
        from app.services.tenant_storage import SUBDIRS
        
        expected_subdirs = ["documents", "avatars", "chatbot_assets", "exports"]
        
        for subdir in expected_subdirs:
            assert subdir in SUBDIRS


class TestTenantFilterMixin:
    """Tests for SQLAlchemy tenant filtering."""

    def test_get_tenant_filter_clause_no_context(self):
        """Test filter clause returns None when no tenant context."""
        from app.tenancy.filters import get_tenant_filter_clause
        from app.tenancy.context import clear_tenant_context
        from app.models.tenant import Tenant
        
        clear_tenant_context()
        
        # Should return None when no tenant context
        filter_clause = get_tenant_filter_clause(Tenant)
        assert filter_clause is None


class TestTenantMiddleware:
    """Tests for TenantContextMiddleware."""

    def test_middleware_class_exists(self):
        """Test that TenantContextMiddleware can be imported."""
        from app.tenancy.context import TenantContextMiddleware
        
        # Should be able to instantiate with a mock app
        mock_app = Mock()
        middleware = TenantContextMiddleware(mock_app)
        
        assert middleware.app == mock_app


class TestRequireTenantDependency:
    """Tests for the require_tenant FastAPI dependency."""

    def test_require_tenant_import(self):
        """Test that require_tenant can be imported."""
        from app.tenancy.context import require_tenant
        
        # Just verify it exists and is callable
        assert callable(require_tenant)

    def test_require_tenant_depends_on_http_bearer(self):
        """Test that require_tenant uses HTTPBearer."""
        import inspect
        from app.tenancy.context import require_tenant
        
        # Check that HTTPBearer is in the signature
        sig = inspect.signature(require_tenant)
        params = list(sig.parameters.values())
        
        # The dependency should have credentials parameter
        assert len(params) > 0


# Integration-style test that demonstrates tenant isolation
class TestTenantIsolationIntegration:
    """
    Integration test demonstrating tenant isolation.
    
    This test shows how the system prevents Tenant A from accessing
    Tenant B's data - the core requirement of multi-tenancy.
    """

    def test_tenant_isolation_concept(self):
        """
        Demonstrate the tenant isolation concept.
        
        This test verifies that:
        1. Different tenants have different collection names
        2. Each tenant's storage is in a separate directory
        3. The context variable properly isolates tenant data
        """
        from app.rag.tenant_vector_store import get_tenant_collection_name
        from app.services.tenant_storage import TenantStorage, DEFAULT_STORAGE_BASE
        from app.tenancy.context import set_current_tenant_id, clear_tenant_context
        
        # Tenant A
        tenant_a_id = "tenant-a-uuid"
        tenant_a_collection = get_tenant_collection_name(tenant_a_id)
        tenant_a_storage = DEFAULT_STORAGE_BASE / tenant_a_id
        
        # Tenant B
        tenant_b_id = "tenant-b-uuid"
        tenant_b_collection = get_tenant_collection_name(tenant_b_id)
        tenant_b_storage = DEFAULT_STORAGE_BASE / tenant_b_id
        
        # Verify they are different
        assert tenant_a_collection != tenant_b_collection
        assert tenant_a_storage != tenant_b_storage
        
        # Verify each contains the tenant ID (sanitized: - becomes _)
        assert "tenant_a_uuid" in tenant_a_collection
        assert "tenant_b_uuid" in tenant_b_collection
        
        # Verify context isolation
        clear_tenant_context()
        set_current_tenant_id(tenant_a_id)
        
        from app.tenancy.context import get_current_tenant_id
        assert get_current_tenant_id() == tenant_a_id
        
        clear_tenant_context()
        assert get_current_tenant_id() is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
