"""add service_id and reminder settings

Revision ID: 20260318_add_service_and_reminder_settings
Revises: 20260318_add_bookings_full_fields
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260318_add_service_and_reminder_settings'
down_revision = '20260318_add_bookings_full_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Add service_id to bookings if missing
    if 'bookings' in inspector.get_table_names():
        existing_cols = {c['name'] for c in inspector.get_columns('bookings')}
        if 'service_id' not in existing_cols:
            op.add_column('bookings', sa.Column('service_id', sa.String(36), nullable=True))

    # Create booking_reminder_settings table
    if 'booking_reminder_settings' not in inspector.get_table_names():
        op.create_table(
            'booking_reminder_settings',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
            sa.Column('enabled_24h', sa.Boolean(), nullable=False, server_default=sa.text('1')),
            sa.Column('enabled_2h', sa.Boolean(), nullable=False, server_default=sa.text('1')),
            sa.Column('enabled_manual', sa.Boolean(), nullable=False, server_default=sa.text('1')),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'bookings' in inspector.get_table_names():
        existing_cols = {c['name'] for c in inspector.get_columns('bookings')}
        if 'service_id' in existing_cols:
            op.drop_column('bookings', 'service_id')

    if 'booking_reminder_settings' in inspector.get_table_names():
        op.drop_table('booking_reminder_settings')
