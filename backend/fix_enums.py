"""
Direct database fix script for invalid enum values.
This bypasses Alembic and applies the fixes directly.
"""

import sqlite3
import os
from pathlib import Path

# Database path
db_path = Path(__file__).parent / "data" / "acmedesk.db"

if not db_path.exists():
    print(f"Error: Database not found at {db_path}")
    exit(1)

print(f"Connecting to database: {db_path}")
conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

try:
    # Fix conversation_starters_display enum values
    print("Fixing conversation_starters_display...")
    cursor.execute("""
        UPDATE chatbot_instances 
        SET conversation_starters_display = 'first_visit_only'
        WHERE conversation_starters_display NOT IN ('first_visit_only', 'every_session')
        AND conversation_starters_display IS NOT NULL;
    """)
    print(f"  Fixed {cursor.rowcount} records")
    
    # Fix outside_hours_behavior enum values
    print("Fixing outside_hours_behavior...")
    cursor.execute("""
        UPDATE chatbot_instances 
        SET outside_hours_behavior = 'continue_answering'
        WHERE outside_hours_behavior NOT IN ('continue_answering', 'ai_offline_collect_details', 'show_offline_message')
        AND outside_hours_behavior IS NOT NULL;
    """)
    print(f"  Fixed {cursor.rowcount} records")
    
    # Fix response_tone enum values
    print("Fixing response_tone...")
    cursor.execute("""
        UPDATE chatbot_instances 
        SET response_tone = 'professional'
        WHERE response_tone NOT IN ('professional', 'friendly', 'casual', 'formal')
        AND response_tone IS NOT NULL;
    """)
    print(f"  Fixed {cursor.rowcount} records")
    
    # Fix response_length enum values
    print("Fixing response_length...")
    cursor.execute("""
        UPDATE chatbot_instances 
        SET response_length = 'medium'
        WHERE response_length NOT IN ('short', 'medium', 'long')
        AND response_length IS NOT NULL;
    """)
    print(f"  Fixed {cursor.rowcount} records")
    
    # Fix widget_position enum values
    print("Fixing widget_position...")
    cursor.execute("""
        UPDATE chatbot_instances 
        SET widget_position = 'bottom_right'
        WHERE widget_position NOT IN ('bottom_right', 'bottom_left', 'top_right', 'top_left')
        AND widget_position IS NOT NULL;
    """)
    print(f"  Fixed {cursor.rowcount} records")
    
    # Fix lead_capture_trigger enum values
    print("Fixing lead_capture_trigger...")
    cursor.execute("""
        UPDATE chatbot_instances 
        SET lead_capture_trigger = 'never'
        WHERE lead_capture_trigger NOT IN ('after_x_messages', 'on_escalation', 'at_conversation_start', 'never')
        AND lead_capture_trigger IS NOT NULL;
    """)
    print(f"  Fixed {cursor.rowcount} records")
    
    conn.commit()
    print("\nAll enum values have been fixed successfully!")
    
except Exception as e:
    conn.rollback()
    print(f"Error: {e}")
    exit(1)
finally:
    conn.close()
