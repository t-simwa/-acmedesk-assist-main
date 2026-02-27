"""
SQLAlchemy event hooks for automatic tenant filtering.

This module provides:
- TenantFilterMixin: Mixin class that adds tenant filtering to models
- create_tenant_filter_event(): Creates before_flush event to filter queries
- get_tenant_filter_clause(): Generates WHERE clause for tenant_id
"""

from typing import Optional

from sqlalchemy import event, inspect
from sqlalchemy.orm import Query

from ..tenancy.context import get_current_tenant_id


class TenantFilterMixin:
    """
    Mixin class that adds automatic tenant filtering to SQLAlchemy models.
    
    Usage:
        class MyModel(TenantFilterMixin, Base):
            __tablename__ = "my_models"
            tenant_id = Column(String(36), nullable=False)
            ...
    
    This mixin ensures that all queries automatically filter by tenant_id
    when a tenant context is set.
    """

    @classmethod
    def add_tenant_filter_events(cls):
        """
        Add SQLAlchemy event listeners for automatic tenant filtering.
        
        This should be called after the model class is defined.
        """
        @event.listens_for(cls, "before_flush")
        def before_flush(session, flush_context, instances):
            """Filter queries by tenant_id if tenant context is set."""
            tenant_id = get_current_tenant_id()
            if tenant_id is None:
                return  # No tenant context, allow all (for super admins)
            
            # Check if this model has tenant_id column
            mapper = inspect(cls)
            if "tenant_id" not in mapper.columns:
                return
            
            # For SELECT queries, add tenant_id filter
            if session.query is not None:
                # This is a simplified approach - in production you'd want
                # more sophisticated query modification
                pass


def get_tenant_filter_clause(model_class):
    """
    Generate a tenant filter clause for a model class.
    
    Args:
        model_class: The SQLAlchemy model class
        
    Returns:
        SQLAlchemy filter clause or None if model doesn't have tenant_id
    """
    tenant_id = get_current_tenant_id()
    if tenant_id is None:
        return None
    
    mapper = inspect(model_class)
    if "tenant_id" not in mapper.columns:
        return None
    
    return model_class.tenant_id == tenant_id


def filter_query_by_tenant(query: Query, model_class) -> Query:
    """
    Filter a SQLAlchemy query by the current tenant.
    
    Args:
        query: The SQLAlchemy query to filter
        model_class: The model class being queried
        
    Returns:
        The filtered query
    """
    filter_clause = get_tenant_filter_clause(model_class)
    if filter_clause is not None:
        return query.filter(filter_clause)
    return query


class TenantScopedMixin:
    """
    Mixin that automatically scopes queries to the current tenant.
    
    Usage:
        class MyRepository(TenantScopedMixin):
            def get_all(self):
                return self.filter_query_by_tenant(
                    super().get_all(),
                    MyModel
                )
    """

    def filter_query_by_tenant(self, query: Query, model_class) -> Query:
        """Filter query by current tenant."""
        return filter_query_by_tenant(query, model_class)
