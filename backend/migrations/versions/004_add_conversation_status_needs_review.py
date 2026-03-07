"""Add needs_review to ConversationStatus enum.

Revision ID: 004
Revises: 003
Create Date: 2026-03-07

Adds ConversationStatus.NEEDS_REVIEW so owners can mark conversations
for follow-up/knowledge-base review (Flow 6 - docs/page.md).

- SQLite: no schema change (status column is string-based; new value is valid).
- PostgreSQL: add the new value to the conversationstatus enum type.
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add 'needs_review' to ConversationStatus enum where applicable."""
    conn = op.get_bind()
    dialect = conn.dialect.name

    if dialect == 'postgresql':
        # PostgreSQL: add enum value idempotently (type name from SQLAlchemy Enum(ConversationStatus))
        op.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum e
                    JOIN pg_type t ON e.enumtypid = t.oid
                    WHERE t.typname = 'conversationstatus' AND e.enumlabel = 'needs_review'
                ) THEN
                    ALTER TYPE conversationstatus ADD VALUE 'needs_review';
                END IF;
            END $$;
        """)
    # SQLite: no change; status column stores strings, so 'needs_review' is already valid.


def downgrade() -> None:
    """Remove 'needs_review' from ConversationStatus (PostgreSQL only).

    Note: PostgreSQL does not support removing an enum value directly.
    Optionally: update any rows with status 'needs_review' to 'active', then
    recreate the type if required. For simplicity we no-op; revert the
    application code to drop NEEDS_REVIEW if you need full rollback.
    """
    conn = op.get_bind()
    dialect = conn.dialect.name

    if dialect == 'postgresql':
        # Move any conversations marked needs_review back to active
        op.execute("""
            UPDATE conversations
            SET status = 'active'
            WHERE status = 'needs_review'
        """)
    # Cannot remove enum value in PostgreSQL without recreating the type.
    # SQLite: no schema to revert.
