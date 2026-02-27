"""Enable Row-Level Security (RLS) for multi-tenancy isolation.

This migration enables RLS on all tenant-scoped tables and creates
policies that ensure each tenant can only access their own data.

Revision ID: rls_001
Revises: 
Create Date: 2026-02-27

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'rls_001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Tables that should have RLS enabled
TENANT_TABLES = [
    'tenants',
    'users',
    'chatbot_instances',
    'documents',
    'conversations',
    'messages',
    'contacts',
    'leads',
    'campaigns',
    'bookings',
    'settings',
    'audit_logs',
    'api_keys',
    'team_members',
    'knowledge_bases',
    'user_preferences',
]


def upgrade() -> None:
    """
    Enable RLS on all tenant-scoped tables.
    
    This creates a security layer that prevents tenants from accessing
    each other's data even if there's a bug in application code.
    """
    # Note: These SQL commands are PostgreSQL-specific
    # They will be skipped when running against SQLite
    
    # Check if we're using PostgreSQL
    conn = op.get_bind()
    dialect = conn.dialect.name
    
    if dialect != 'postgresql':
        # Skip RLS for SQLite (development) or other databases
        return
    
    for table_name in TENANT_TABLES:
        # Enable RLS on the table
        op.execute(f'ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY')
        
        # Create a policy that restricts access to rows where tenant_id matches
        # the current setting (extracted from JWT and stored in app.current_tenant_id)
        policy_name = f'{table_name}_tenant_isolation'
        
        # Drop existing policy if it exists (for idempotency)
        op.execute(f'DROP POLICY IF EXISTS {policy_name} ON {table_name}')
        
        # Create the RLS policy
        # This policy uses a function that we'll create to get the current tenant_id
        op.execute(f'''
            CREATE POLICY {policy_name} ON {table_name}
            FOR ALL
            USING (
                tenant_id = current_setting('app.current_tenant_id', true)
                OR tenant_id IS NULL
            )
        ''')
    
    # Create a function to safely get the current tenant_id
    op.execute('''
        CREATE OR REPLACE FUNCTION get_current_tenant_id()
        RETURNS TEXT AS $$
        BEGIN
            RETURN current_setting('app.current_tenant_id', true);
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
    ''')


def downgrade() -> None:
    """
    Disable RLS on all tenant-scoped tables.
    
    This removes the security layer - use with caution!
    """
    conn = op.get_bind()
    dialect = conn.dialect.name
    
    if dialect != 'postgresql':
        return
    
    for table_name in TENANT_TABLES:
        # Drop the RLS policy
        policy_name = f'{table_name}_tenant_isolation'
        op.execute(f'DROP POLICY IF EXISTS {policy_name} ON {table_name}')
        
        # Disable RLS on the table
        op.execute(f'ALTER TABLE {table_name} DISABLE ROW LEVEL SECURITY')
    
    # Drop the helper function
    op.execute('DROP FUNCTION IF EXISTS get_current_tenant_id()')
