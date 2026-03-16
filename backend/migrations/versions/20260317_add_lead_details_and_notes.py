"""add lead extended fields, notes, activity, and scheduled followups

Revision ID: 20260317_add_lead_details_and_notes
Revises: 20260316_add_export_jobs_and_flags
Create Date: 2026-03-17
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260317_add_lead_details_and_notes'
down_revision = '20260316_add_export_jobs_and_flags'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Add lead columns
    existing_cols = {c['name'] for c in inspector.get_columns('leads')}
    if 'name' not in existing_cols:
        op.add_column('leads', sa.Column('name', sa.String(255), nullable=True))
    if 'email' not in existing_cols:
        op.add_column('leads', sa.Column('email', sa.String(255), nullable=True))
    if 'phone' not in existing_cols:
        op.add_column('leads', sa.Column('phone', sa.String(50), nullable=True))
    if 'instagram_handle' not in existing_cols:
        op.add_column('leads', sa.Column('instagram_handle', sa.String(100), nullable=True))
    if 'facebook_id' not in existing_cols:
        op.add_column('leads', sa.Column('facebook_id', sa.String(255), nullable=True))

    if 'score' not in existing_cols:
        op.add_column('leads', sa.Column('score', sa.String(20), nullable=True))
    if 'score_factors' not in existing_cols:
        op.add_column('leads', sa.Column('score_factors', sa.JSON(), nullable=True))
    if 'score_manual_override' not in existing_cols:
        op.add_column('leads', sa.Column('score_manual_override', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    if 'score_updated_at' not in existing_cols:
        op.add_column('leads', sa.Column('score_updated_at', sa.DateTime(), nullable=True))

    if 'est_value' not in existing_cols:
        op.add_column('leads', sa.Column('est_value', sa.Numeric(12, 2), nullable=True))
    if 'actual_value' not in existing_cols:
        op.add_column('leads', sa.Column('actual_value', sa.Numeric(12, 2), nullable=True))
    if 'currency' not in existing_cols:
        op.add_column('leads', sa.Column('currency', sa.String(10), nullable=False, server_default='KES'))

    if 'tags' not in existing_cols:
        op.add_column('leads', sa.Column('tags', sa.JSON(), nullable=True))
    if 'assigned_to' not in existing_cols:
        # SQLite cannot add foreign key constraints using ALTER TABLE.
        # Use batch mode to ensure this migration works in SQLite.
        with op.batch_alter_table('leads') as batch:
            batch.add_column(sa.Column('assigned_to', sa.String(36), nullable=True))
            batch.create_index('ix_leads_assigned_to', ['assigned_to'])
    if 'viewed_at' not in existing_cols:
        op.add_column('leads', sa.Column('viewed_at', sa.DateTime(), nullable=True))
    if 'converted_at' not in existing_cols:
        op.add_column('leads', sa.Column('converted_at', sa.DateTime(), nullable=True))
    if 'lost_at' not in existing_cols:
        op.add_column('leads', sa.Column('lost_at', sa.DateTime(), nullable=True))

    # Create lead_notes table
    if 'lead_notes' not in inspector.get_table_names():
        op.create_table(
            'lead_notes',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('lead_id', sa.String(36), sa.ForeignKey('leads.id'), nullable=False, index=True),
            sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id'), nullable=False, index=True),
            sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        )

    # Create lead_activity table
    if 'lead_activity' not in inspector.get_table_names():
        op.create_table(
            'lead_activity',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('lead_id', sa.String(36), sa.ForeignKey('leads.id'), nullable=False, index=True),
            sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id'), nullable=False, index=True),
            sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('type', sa.String(64), nullable=False),
            sa.Column('title', sa.String(255), nullable=True),
            sa.Column('data', sa.JSON(), nullable=True),
            sa.Column('occurred_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        )

    # Create scheduled_followups table
    if 'scheduled_followups' not in inspector.get_table_names():
        op.create_table(
            'scheduled_followups',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('lead_id', sa.String(36), sa.ForeignKey('leads.id'), nullable=False, index=True),
            sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id'), nullable=False, index=True),
            sa.Column('channel', sa.String(32), nullable=False),
            sa.Column('subject', sa.String(255), nullable=True),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('is_ai_assisted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('scheduled_at', sa.DateTime(), nullable=False),
            sa.Column('sent_at', sa.DateTime(), nullable=True),
            sa.Column('cancelled_at', sa.DateTime(), nullable=True),
            sa.Column('status', sa.String(32), nullable=False, server_default='pending'),
            sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'scheduled_followups' in inspector.get_table_names():
        op.drop_table('scheduled_followups')
    if 'lead_activity' in inspector.get_table_names():
        op.drop_table('lead_activity')
    if 'lead_notes' in inspector.get_table_names():
        op.drop_table('lead_notes')

    existing_cols = {c['name'] for c in inspector.get_columns('leads')}
    for col in [
        'name', 'email', 'phone', 'instagram_handle', 'facebook_id',
        'score', 'score_factors', 'score_manual_override', 'score_updated_at',
        'est_value', 'actual_value', 'currency',
        'tags', 'assigned_to', 'viewed_at', 'converted_at', 'lost_at',
    ]:
        if col in existing_cols:
            with op.batch_alter_table('leads') as batch:
                batch.drop_column(col)
