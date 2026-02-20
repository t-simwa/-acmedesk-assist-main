"""
Force add user_id columns to database tables.

This script directly executes SQL to add the columns, bypassing any checks.
"""

import sqlite3
from pathlib import Path

db_path = Path("backend/data/acmedesk.db")

if not db_path.exists():
    print(f"Database file not found at {db_path}")
    print("The database will be created with correct schema on next backend startup.")
    exit(0)

conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

try:
    # Check conversations table
    cursor.execute("PRAGMA table_info(conversations)")
    conv_columns = [col[1] for col in cursor.fetchall()]
    print(f"Conversations columns: {conv_columns}")
    
    if "user_id" not in conv_columns:
        print("Adding user_id to conversations...")
        cursor.execute("ALTER TABLE conversations ADD COLUMN user_id VARCHAR(36)")
        print("[OK] Added user_id to conversations")
    else:
        print("[SKIP] conversations.user_id already exists")
    
    # Check documents table
    cursor.execute("PRAGMA table_info(documents)")
    doc_columns = [col[1] for col in cursor.fetchall()]
    print(f"Documents columns: {doc_columns}")
    
    if "user_id" not in doc_columns:
        print("Adding user_id to documents...")
        cursor.execute("ALTER TABLE documents ADD COLUMN user_id VARCHAR(36)")
        print("[OK] Added user_id to documents")
    else:
        print("[SKIP] documents.user_id already exists")
    
    # Create indexes
    try:
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)")
        print("[OK] Created index on conversations.user_id")
    except Exception as e:
        print(f"[WARN] Index creation: {e}")
    
    try:
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)")
        print("[OK] Created index on documents.user_id")
    except Exception as e:
        print(f"[WARN] Index creation: {e}")
    
    # Update existing records
    try:
        cursor.execute("SELECT id FROM users LIMIT 1")
        user_row = cursor.fetchone()
        if user_row:
            user_id = user_row[0]
            cursor.execute("UPDATE conversations SET user_id = ? WHERE user_id IS NULL", (user_id,))
            cursor.execute("UPDATE documents SET user_id = ? WHERE user_id IS NULL", (user_id,))
            print(f"[OK] Assigned existing records to user {user_id}")
        else:
            cursor.execute("DELETE FROM conversations WHERE user_id IS NULL")
            cursor.execute("DELETE FROM documents WHERE user_id IS NULL")
            print("[OK] Deleted existing records (no users)")
    except Exception as e:
        print(f"[WARN] Could not update records: {e}")
    
    conn.commit()
    print("\n[OK] Database schema updated successfully!")
    print("Please restart your backend server.")
    
except Exception as e:
    print(f"\n[ERROR] Failed: {e}")
    import traceback
    traceback.print_exc()
    conn.rollback()
finally:
    conn.close()
