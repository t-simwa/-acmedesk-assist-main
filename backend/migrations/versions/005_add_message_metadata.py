"""Add message_metadata JSON column to messages table.

Revision ID: 005
Revises: 004
Create Date: 2026-03-08

Adds a nullable JSON column `message_metadata` to the `messages` table so
services can store channel-specific metadata (thread ids, provider info, etc.).

For PostgreSQL we use JSON; for SQLite this will create a column that accepts
text - SQLAlchemy/DBAPI will handle JSON serialization.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    if dialect == 'postgresql':
        op.add_column('messages', sa.Column('message_metadata', sa.JSON(), nullable=True))
    else:
        # SQLite and others - use generic JSON/JSON-like column
        op.add_column('messages', sa.Column('message_metadata', sa.JSON(), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    op.drop_column('messages', 'message_metadata')
