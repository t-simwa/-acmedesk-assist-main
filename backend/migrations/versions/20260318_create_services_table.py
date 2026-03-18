"""create services catalog table

Revision ID: 20260318_create_services_table
Revises: 20260318_add_service_and_reminder_settings
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260318_create_services_table'
down_revision = '20260318_add_service_and_reminder_settings'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'services' not in inspector.get_table_names():
        op.create_table(
            'services',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('duration_minutes', sa.Integer(), nullable=True),
            sa.Column('default_price', sa.Numeric(12, 2), nullable=True),
            sa.Column('currency', sa.String(10), nullable=False, server_default='KES'),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'services' in inspector.get_table_names():
        op.drop_table('services')
