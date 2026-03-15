"""add inbox routing fields to conversations

Revision ID: 20260315_add_inbox_routing_fields
Revises: 007_create_notifications, 20260311_add_contact_unification
Create Date: 2026-03-15
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260315_add_inbox_routing_fields'
down_revision = ('007_create_notifications', '20260311_add_contact_unification')
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    existing_cols = {c['name'] for c in inspector.get_columns('conversations')}

    if 'handled_by' not in existing_cols:
        op.add_column(
            'conversations',
            sa.Column('handled_by', sa.String(36), nullable=False, server_default='ai'),
        )

    if 'assigned_to' not in existing_cols:
        # SQLite doesn't support adding foreign key constraints via ALTER TABLE.
        # We'll just add the raw column here and rely on application logic.
        op.add_column(
            'conversations',
            sa.Column('assigned_to', sa.String(36), nullable=True),
        )

    if 'unread_count' not in existing_cols:
        op.add_column(
            'conversations',
            sa.Column('unread_count', sa.Integer(), nullable=False, server_default='0'),
        )

    if 'escalated_at' not in existing_cols:
        op.add_column(
            'conversations',
            sa.Column('escalated_at', sa.DateTime(), nullable=True),
        )

    if 'sla_deadline' not in existing_cols:
        op.add_column(
            'conversations',
            sa.Column('sla_deadline', sa.DateTime(), nullable=True),
        )


def downgrade() -> None:
    # Drop columns if present (SQLite supports it via batch mode)
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    existing_cols = {c['name'] for c in inspector.get_columns('conversations')}

    with op.batch_alter_table('conversations') as batch:
        if 'sla_deadline' in existing_cols:
            batch.drop_column('sla_deadline')
        if 'escalated_at' in existing_cols:
            batch.drop_column('escalated_at')
        if 'unread_count' in existing_cols:
            batch.drop_column('unread_count')
        if 'assigned_to' in existing_cols:
            batch.drop_column('assigned_to')
        if 'handled_by' in existing_cols:
            batch.drop_column('handled_by')
