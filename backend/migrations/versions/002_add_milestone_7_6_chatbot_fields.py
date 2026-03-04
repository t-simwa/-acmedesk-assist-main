"""Add Milestone 7.6 chatbot configuration fields.

Revision ID: 002
Revises: rls_001_enable_rls
Create Date: 2026-03-03

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = 'rls_001_enable_rls'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add new fields to chatbot_instances table for Milestone 7.6."""
    # Tab 1: Appearance - new fields
    op.add_column('chatbot_instances', sa.Column('user_message_color', sa.String(7), nullable=False, server_default='#4F8EF7'))
    op.add_column('chatbot_instances', sa.Column('font_size', sa.String(20), nullable=False, server_default='medium'))
    
    # Tab 2: Behavior - new fields
    op.add_column('chatbot_instances', sa.Column('response_language', sa.String(5), nullable=False, server_default='auto'))
    op.add_column('chatbot_instances', sa.Column('farewell_message', sa.Text(), nullable=True))
    op.add_column('chatbot_instances', sa.Column('read_receipts', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('chatbot_instances', sa.Column('suggested_starter_questions', sa.JSON(), nullable=True))
    op.add_column('chatbot_instances', sa.Column('conversation_starters_display', sa.String(50), nullable=False, server_default='first_visit_only'))
    
    # Tab 3: Business Hours - new fields
    op.add_column('chatbot_instances', sa.Column('business_hours_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('chatbot_instances', sa.Column('timezone', sa.String(100), nullable=True))
    op.add_column('chatbot_instances', sa.Column('weekly_schedule', sa.JSON(), nullable=True))
    op.add_column('chatbot_instances', sa.Column('outside_hours_behavior', sa.String(50), nullable=False, server_default='continue_answering'))
    op.add_column('chatbot_instances', sa.Column('back_online_message', sa.Text(), nullable=True))
    op.add_column('chatbot_instances', sa.Column('holiday_hours', sa.JSON(), nullable=True))
    
    # Tab 4: Escalation Triggers - new fields
    op.add_column('chatbot_instances', sa.Column('auto_escalation_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('chatbot_instances', sa.Column('confidence_threshold', sa.Float(), nullable=False, server_default='50.0'))
    op.add_column('chatbot_instances', sa.Column('unanswered_questions_threshold', sa.String(3), nullable=False, server_default='3'))
    op.add_column('chatbot_instances', sa.Column('sentiment_escalation_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('chatbot_instances', sa.Column('keyword_triggers', sa.JSON(), nullable=True))
    op.add_column('chatbot_instances', sa.Column('escalation_email_addresses', sa.JSON(), nullable=True))
    op.add_column('chatbot_instances', sa.Column('escalation_slack_webhook', sa.String(500), nullable=True))
    op.add_column('chatbot_instances', sa.Column('escalation_whatsapp_notification', sa.Boolean(), nullable=False, server_default='false'))
    
    # Tab 5: Lead Capture - new fields
    op.add_column('chatbot_instances', sa.Column('lead_capture_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('chatbot_instances', sa.Column('lead_capture_trigger', sa.String(50), nullable=False, server_default='never'))
    op.add_column('chatbot_instances', sa.Column('lead_capture_fields_config', sa.JSON(), nullable=True))
    op.add_column('chatbot_instances', sa.Column('lead_capture_message', sa.Text(), nullable=True))
    op.add_column('chatbot_instances', sa.Column('lead_capture_thank_you_message', sa.Text(), nullable=True))
    op.add_column('chatbot_instances', sa.Column('lead_capture_skip_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('chatbot_instances', sa.Column('lead_capture_skip_button_text', sa.String(100), nullable=True))
    
    # Tab 6: Notifications - new fields
    op.add_column('chatbot_instances', sa.Column('notifications_config', sa.JSON(), nullable=True))
    op.add_column('chatbot_instances', sa.Column('notification_email_addresses', sa.JSON(), nullable=True))


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
