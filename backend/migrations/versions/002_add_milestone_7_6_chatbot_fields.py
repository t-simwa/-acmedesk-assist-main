"""Add Milestone 7.6 chatbot configuration fields.

Revision ID: 002
Revises: rls_001_enable_rls
Create Date: 2026-03-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '002'
down_revision = 'rls_001_enable_rls'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add new fields to chatbot_instances table for Milestone 7.6."""
    conn = op.get_bind()
    dialect = conn.dialect.name

    # For SQLite, guard against adding columns that already exist (idempotent)
    existing_cols = set()
    if dialect == 'sqlite':
        try:
            rows = conn.execute(text("PRAGMA table_info(chatbot_instances)"))
            existing_cols = {row[1] for row in rows.fetchall()}
        except Exception:
            existing_cols = set()

    # List of (column_name, Column) to add
    columns_to_add = [
        # Tab 1: Appearance
        ('user_message_color', sa.Column('user_message_color', sa.String(7), nullable=False, server_default='#4F8EF7')),
        ('font_size', sa.Column('font_size', sa.String(20), nullable=False, server_default='medium')),
        # Tab 2: Behavior
        ('response_language', sa.Column('response_language', sa.String(5), nullable=False, server_default='auto')),
        ('farewell_message', sa.Column('farewell_message', sa.Text(), nullable=True)),
        ('read_receipts', sa.Column('read_receipts', sa.Boolean(), nullable=False, server_default='false')),
        ('suggested_starter_questions', sa.Column('suggested_starter_questions', sa.JSON(), nullable=True)),
        ('conversation_starters_display', sa.Column('conversation_starters_display', sa.String(50), nullable=False, server_default='first_visit_only')),
        # Tab 3: Business Hours
        ('business_hours_enabled', sa.Column('business_hours_enabled', sa.Boolean(), nullable=False, server_default='false')),
        ('timezone', sa.Column('timezone', sa.String(100), nullable=True)),
        ('weekly_schedule', sa.Column('weekly_schedule', sa.JSON(), nullable=True)),
        ('outside_hours_behavior', sa.Column('outside_hours_behavior', sa.String(50), nullable=False, server_default='continue_answering')),
        ('back_online_message', sa.Column('back_online_message', sa.Text(), nullable=True)),
        ('holiday_hours', sa.Column('holiday_hours', sa.JSON(), nullable=True)),
        # Tab 4: Escalation Triggers
        ('auto_escalation_enabled', sa.Column('auto_escalation_enabled', sa.Boolean(), nullable=False, server_default='false')),
        ('confidence_threshold', sa.Column('confidence_threshold', sa.Float(), nullable=False, server_default='50.0')),
        ('unanswered_questions_threshold', sa.Column('unanswered_questions_threshold', sa.String(3), nullable=False, server_default='3')),
        ('sentiment_escalation_enabled', sa.Column('sentiment_escalation_enabled', sa.Boolean(), nullable=False, server_default='false')),
        ('keyword_triggers', sa.Column('keyword_triggers', sa.JSON(), nullable=True)),
        ('escalation_email_addresses', sa.Column('escalation_email_addresses', sa.JSON(), nullable=True)),
        ('escalation_slack_webhook', sa.Column('escalation_slack_webhook', sa.String(500), nullable=True)),
        ('escalation_whatsapp_notification', sa.Column('escalation_whatsapp_notification', sa.Boolean(), nullable=False, server_default='false')),
        # Tab 5: Lead Capture
        ('lead_capture_enabled', sa.Column('lead_capture_enabled', sa.Boolean(), nullable=False, server_default='false')),
        ('lead_capture_trigger', sa.Column('lead_capture_trigger', sa.String(50), nullable=False, server_default='never')),
        ('lead_capture_fields_config', sa.Column('lead_capture_fields_config', sa.JSON(), nullable=True)),
        ('lead_capture_message', sa.Column('lead_capture_message', sa.Text(), nullable=True)),
        ('lead_capture_thank_you_message', sa.Column('lead_capture_thank_you_message', sa.Text(), nullable=True)),
        ('lead_capture_skip_enabled', sa.Column('lead_capture_skip_enabled', sa.Boolean(), nullable=False, server_default='false')),
        ('lead_capture_skip_button_text', sa.Column('lead_capture_skip_button_text', sa.String(100), nullable=True)),
        # Tab 6: Notifications
        ('notifications_config', sa.Column('notifications_config', sa.JSON(), nullable=True)),
        ('notification_email_addresses', sa.Column('notification_email_addresses', sa.JSON(), nullable=True)),
    ]

    for col_name, col in columns_to_add:
        if dialect == 'sqlite' and col_name in existing_cols:
            # Skip adding existing column
            continue
        op.add_column('chatbot_instances', col)


def downgrade() -> None:
    """Remove new fields from chatbot_instances table."""
    # Tab 6
    op.drop_column('chatbot_instances', 'notification_email_addresses')
    op.drop_column('chatbot_instances', 'notifications_config')
    
    # Tab 5
    op.drop_column('chatbot_instances', 'lead_capture_skip_button_text')
    op.drop_column('chatbot_instances', 'lead_capture_skip_enabled')
    op.drop_column('chatbot_instances', 'lead_capture_thank_you_message')
    op.drop_column('chatbot_instances', 'lead_capture_message')
    op.drop_column('chatbot_instances', 'lead_capture_fields_config')
    op.drop_column('chatbot_instances', 'lead_capture_trigger')
    op.drop_column('chatbot_instances', 'lead_capture_enabled')
    
    # Tab 4
    op.drop_column('chatbot_instances', 'escalation_whatsapp_notification')
    op.drop_column('chatbot_instances', 'escalation_slack_webhook')
    op.drop_column('chatbot_instances', 'escalation_email_addresses')
    op.drop_column('chatbot_instances', 'keyword_triggers')
    op.drop_column('chatbot_instances', 'sentiment_escalation_enabled')
    op.drop_column('chatbot_instances', 'unanswered_questions_threshold')
    op.drop_column('chatbot_instances', 'confidence_threshold')
    op.drop_column('chatbot_instances', 'auto_escalation_enabled')
    
    # Tab 3
    op.drop_column('chatbot_instances', 'holiday_hours')
    op.drop_column('chatbot_instances', 'back_online_message')
    op.drop_column('chatbot_instances', 'outside_hours_behavior')
    op.drop_column('chatbot_instances', 'weekly_schedule')
    op.drop_column('chatbot_instances', 'timezone')
    op.drop_column('chatbot_instances', 'business_hours_enabled')
    
    # Tab 2
    op.drop_column('chatbot_instances', 'conversation_starters_display')
    op.drop_column('chatbot_instances', 'suggested_starter_questions')
    op.drop_column('chatbot_instances', 'read_receipts')
    op.drop_column('chatbot_instances', 'farewell_message')
    op.drop_column('chatbot_instances', 'response_language')
    
    # Tab 1
    op.drop_column('chatbot_instances', 'font_size')
    op.drop_column('chatbot_instances', 'user_message_color')
