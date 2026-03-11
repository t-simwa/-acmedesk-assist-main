"""Create channel_configs table for tenant-scoped channel settings.

Revision ID: 006_create_channel_configs
Revises: 005
Create Date: 2026-03-09

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006_create_channel_configs'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # Make this migration idempotent: skip creation if the table already exists.
    inspector = sa.inspect(conn)
    if inspector.has_table('channel_configs'):
        # table already present (likely created by init_db during development); skip
        return

    # Create table with JSON/oauth_tokens stored as TEXT for broad compatibility
    op.create_table(
        'channel_configs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('channel', sa.String(50), nullable=False, index=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('connected', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('config', sa.JSON(), nullable=True),
        sa.Column('oauth_tokens', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if inspector.has_table('channel_configs'):
        op.drop_table('channel_configs')
