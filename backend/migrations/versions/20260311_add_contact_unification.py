"""add channel identifiers and contact events table

Revision ID: 20260311_add_contact_unification
Revises: 
Create Date: 2026-03-11 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260311_add_contact_unification'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # add columns only if they don't already exist (safe for reruns)
    if 'channel_identifiers' not in [c['name'] for c in inspector.get_columns('contacts')]:
        op.add_column('contacts', sa.Column('channel_identifiers', sa.JSON(), nullable=True))
    if 'opted_out' not in [c['name'] for c in inspector.get_columns('contacts')]:
        op.add_column('contacts', sa.Column('opted_out', sa.Boolean(), nullable=False, server_default=sa.false()))
    if 'opted_out_channels' not in [c['name'] for c in inspector.get_columns('contacts')]:
        op.add_column('contacts', sa.Column('opted_out_channels', sa.JSON(), nullable=True))

    # chatbot instance extras
    if 'role_text' not in [c['name'] for c in inspector.get_columns('chatbot_instances')]:
        op.add_column('chatbot_instances', sa.Column('role_text', sa.String(200), nullable=True))
    if 'channel_overrides' not in [c['name'] for c in inspector.get_columns('chatbot_instances')]:
        op.add_column('chatbot_instances', sa.Column('channel_overrides', sa.JSON(), nullable=True))

    # create contact_events table only if missing
    if not inspector.has_table('contact_events'):
        op.create_table(
            'contact_events',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('contact_id', sa.String(36), sa.ForeignKey('contacts.id'), nullable=False, index=True),
            sa.Column('event_type', sa.String(50), nullable=False),
            sa.Column('details', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )


def downgrade():
    op.drop_table('contact_events')
    op.drop_column('contacts', 'opted_out_channels')
    op.drop_column('contacts', 'opted_out')
    op.drop_column('contacts', 'channel_identifiers')
