"""Create notifications table for in-app notifications.

Revision ID: 007_create_notifications
Revises: 006_create_channel_configs
Create Date: 2026-03-13

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '007_create_notifications'
down_revision = '006_create_channel_configs'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    inspector = sa.inspect(conn)
    if inspector.has_table('notifications'):
        return

    op.create_table(
        'notifications',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('type', sa.String(50), nullable=False, server_default='system'),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if inspector.has_table('notifications'):
        op.drop_table('notifications')
