"""Fix invalid enum values in chatbot_instances.

Revision ID: 003
Revises: 002
Create Date: 2026-03-03

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Fix invalid enum values in chatbot_instances table."""
    # Fix conversation_starters_display enum values
    # Valid values are: 'first_visit_only', 'every_session'
    # Replace any invalid values (like 'buttons') with 'first_visit_only' as default
    op.execute("""
        UPDATE chatbot_instances 
        SET conversation_starters_display = 'first_visit_only'
        WHERE conversation_starters_display NOT IN ('first_visit_only', 'every_session')
        AND conversation_starters_display IS NOT NULL;
    """)
    
    # Fix outside_hours_behavior enum values
    # Valid values are: 'continue_answering', 'ai_offline_collect_details', 'show_offline_message'
    op.execute("""
        UPDATE chatbot_instances 
        SET outside_hours_behavior = 'continue_answering'
        WHERE outside_hours_behavior NOT IN ('continue_answering', 'ai_offline_collect_details', 'show_offline_message')
        AND outside_hours_behavior IS NOT NULL;
    """)
    
    # Fix response_tone enum values
    # Valid values are: 'professional', 'friendly', 'casual', 'formal'
    op.execute("""
        UPDATE chatbot_instances 
        SET response_tone = 'professional'
        WHERE response_tone NOT IN ('professional', 'friendly', 'casual', 'formal')
        AND response_tone IS NOT NULL;
    """)
    
    # Fix response_length enum values
    # Valid values are: 'short', 'medium', 'long'
    op.execute("""
        UPDATE chatbot_instances 
        SET response_length = 'medium'
        WHERE response_length NOT IN ('short', 'medium', 'long')
        AND response_length IS NOT NULL;
    """)
    
    # Fix widget_position enum values
    # Valid values are: 'bottom_right', 'bottom_left', 'top_right', 'top_left'
    op.execute("""
        UPDATE chatbot_instances 
        SET widget_position = 'bottom_right'
        WHERE widget_position NOT IN ('bottom_right', 'bottom_left', 'top_right', 'top_left')
        AND widget_position IS NOT NULL;
    """)
    
    # Fix lead_capture_trigger enum values
    # Valid values are: 'after_x_messages', 'on_escalation', 'at_conversation_start', 'never'
    op.execute("""
        UPDATE chatbot_instances 
        SET lead_capture_trigger = 'never'
        WHERE lead_capture_trigger NOT IN ('after_x_messages', 'on_escalation', 'at_conversation_start', 'never')
        AND lead_capture_trigger IS NOT NULL;
    """)


def downgrade() -> None:
    """Downgrade is not possible as this migration only fixes data consistency."""
    # No downgrade needed - this migration only corrects invalid data
    pass
