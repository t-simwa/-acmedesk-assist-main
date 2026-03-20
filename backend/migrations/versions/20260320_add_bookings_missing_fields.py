"""add missing bookings fields (service_id, notes, source_channel)

Revision ID: 20260320_add_bookings_missing_fields
Revises: 20260318_create_services_table
Create Date: 2026-03-20
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260320_add_bookings_missing_fields'
down_revision = '20260318_create_services_table'
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

    # Add missing columns that are defined in the model but not in previous migrations
    add_col('service_id', sa.Column('service_id', sa.String(36), nullable=True))
    add_col('notes', sa.Column('notes', sa.Text(), nullable=True))
    add_col('source_channel', sa.Column('source_channel', sa.String(50), nullable=True))

    # Create index on service_id if it doesn't exist
    existing_indexes = {i['name'] for i in inspector.get_indexes('bookings')}
    if 'ix_bookings_service_id' not in existing_indexes:
        op.create_index('ix_bookings_service_id', 'bookings', ['service_id'])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'bookings' not in inspector.get_table_names():
        return

    existing_cols = {c['name'] for c in inspector.get_columns('bookings')}
    for col in ['service_id', 'notes', 'source_channel']:
        if col in existing_cols:
            op.drop_column('bookings', col)

    existing_indexes = {i['name'] for i in inspector.get_indexes('bookings')}
    if 'ix_bookings_service_id' in existing_indexes:
        op.drop_index('ix_bookings_service_id', table_name='bookings')
