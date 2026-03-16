"""add export job table and flag column to conversations

Revision ID: 20260316_add_export_jobs_and_flags
Revises: 20260315_add_inbox_routing_fields
Create Date: 2026-03-16
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260316_add_export_jobs_and_flags'
down_revision = '20260315_add_inbox_routing_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    existing_cols = {c['name'] for c in inspector.get_columns('conversations')}
    if 'is_flagged' not in existing_cols:
        op.add_column(
            'conversations',
            sa.Column('is_flagged', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        )

    # Create export_jobs table if it doesn't exist
    if 'export_jobs' not in inspector.get_table_names():
        op.create_table(
            'export_jobs',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
            sa.Column('kind', sa.Enum('csv', 'zip', 'pdf', name='exportjobkind'), nullable=False),
            sa.Column('status', sa.Enum('pending', 'processing', 'ready', 'failed', name='exportjobstatus'), nullable=False),
            sa.Column('filters', sa.JSON(), nullable=True),
            sa.Column('row_count', sa.Integer(), nullable=True),
            sa.Column('file_path', sa.String(1000), nullable=True),
            sa.Column('email', sa.String(255), nullable=True),
            sa.Column('error', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    existing_cols = {c['name'] for c in inspector.get_columns('conversations')}
    if 'is_flagged' in existing_cols:
        with op.batch_alter_table('conversations') as batch:
            batch.drop_column('is_flagged')

    if 'export_jobs' in inspector.get_table_names():
        op.drop_table('export_jobs')
