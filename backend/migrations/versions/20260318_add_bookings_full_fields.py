"""add full bookings schema fields

Revision ID: 20260318_add_bookings_full_fields
Revises: 20260317_add_lead_details_and_notes
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260318_add_bookings_full_fields'
down_revision = '20260317_add_lead_details_and_notes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'bookings' not in inspector.get_table_names():
        return

    existing_cols = {c['name'] for c in inspector.get_columns('bookings')}

    def add_col(name, col):
        if name not in existing_cols:
            op.add_column('bookings', col)

    add_col('service_details', sa.Column('service_details', sa.Text(), nullable=True))
    add_col('location', sa.Column('location', sa.String(255), nullable=True))
    add_col('special_requests', sa.Column('special_requests', sa.Text(), nullable=True))
    add_col('booking_date', sa.Column('booking_date', sa.Date(), nullable=True))
    add_col('booking_time', sa.Column('booking_time', sa.String(20), nullable=True))
    add_col('duration_minutes', sa.Column('duration_minutes', sa.Integer(), nullable=True))
    add_col('booking_value', sa.Column('booking_value', sa.Numeric(12, 2), nullable=True))
    add_col('actual_value', sa.Column('actual_value', sa.Numeric(12, 2), nullable=True))
    add_col('currency', sa.Column('currency', sa.String(10), nullable=False, server_default='KES'))
    add_col('assigned_to', sa.Column('assigned_to', sa.String(36), nullable=True))
    add_col('confirmed_at', sa.Column('confirmed_at', sa.DateTime(), nullable=True))
    add_col('completed_at', sa.Column('completed_at', sa.DateTime(), nullable=True))
    add_col('cancelled_at', sa.Column('cancelled_at', sa.DateTime(), nullable=True))
    add_col('cancellation_reason', sa.Column('cancellation_reason', sa.Text(), nullable=True))
    add_col('no_show_at', sa.Column('no_show_at', sa.DateTime(), nullable=True))
    add_col('reminder_24h_sent_at', sa.Column('reminder_24h_sent_at', sa.DateTime(), nullable=True))
    add_col('reminder_2h_sent_at', sa.Column('reminder_2h_sent_at', sa.DateTime(), nullable=True))
    add_col('reminder_manual_sent_at', sa.Column('reminder_manual_sent_at', sa.DateTime(), nullable=True))
    add_col('deleted_at', sa.Column('deleted_at', sa.DateTime(), nullable=True))

    if 'ix_bookings_deleted_at' not in {i['name'] for i in inspector.get_indexes('bookings')}:
        op.create_index('ix_bookings_deleted_at', 'bookings', ['deleted_at'])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'bookings' not in inspector.get_table_names():
        return

    existing_cols = {c['name'] for c in inspector.get_columns('bookings')}
    for col in [
        'service_details', 'location', 'booking_date', 'booking_time', 'duration_minutes',
        'booking_value', 'actual_value', 'currency', 'assigned_to',
        'confirmed_at', 'completed_at', 'cancelled_at', 'cancellation_reason', 'no_show_at',
        'reminder_24h_sent_at', 'reminder_2h_sent_at', 'reminder_manual_sent_at', 'deleted_at',
    ]:
        if col in existing_cols:
            op.drop_column('bookings', col)

    if 'ix_bookings_deleted_at' in {i['name'] for i in inspector.get_indexes('bookings')}:
        op.drop_index('ix_bookings_deleted_at', table_name='bookings')
