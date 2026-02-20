"""
Simple script to add user_id columns to existing tables.

This script directly adds the columns without complex checks.
Run this if you're getting "no such column: conversations.user_id" errors.

Usage:
    python backend/scripts/add_user_id_columns.py
"""

import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.models.base import get_database_url


async def add_columns():
    """Add user_id columns to conversations and documents tables."""
    database_url = get_database_url()
    engine = create_async_engine(database_url, echo=True)
    
    try:
        async with engine.begin() as conn:
            print("Adding user_id columns...")
            
            # Add user_id to conversations (if it doesn't exist)
            try:
                await conn.execute(
                    text("ALTER TABLE conversations ADD COLUMN user_id VARCHAR(36)")
                )
                print("[OK] Added user_id column to conversations table")
            except Exception as e:
                if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                    print("[SKIP] conversations.user_id already exists")
                else:
                    print(f"[WARN] Could not add user_id to conversations: {e}")
            
            # Add user_id to documents (if it doesn't exist)
            try:
                await conn.execute(
                    text("ALTER TABLE documents ADD COLUMN user_id VARCHAR(36)")
                )
                print("[OK] Added user_id column to documents table")
            except Exception as e:
                if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                    print("[SKIP] documents.user_id already exists")
                else:
                    print(f"[WARN] Could not add user_id to documents: {e}")
            
            # Create indexes
            try:
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)")
                )
                print("[OK] Created index on conversations.user_id")
            except Exception as e:
                print(f"[WARN] Could not create index on conversations: {e}")
            
            try:
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)")
                )
                print("[OK] Created index on documents.user_id")
            except Exception as e:
                print(f"[WARN] Could not create index on documents: {e}")
            
            # Update existing records - assign to first user or set to a placeholder
            try:
                result = await conn.execute(
                    text("SELECT id FROM users LIMIT 1")
                )
                user_row = result.fetchone()
                if user_row:
                    user_id = user_row[0]
                    await conn.execute(
                        text("UPDATE conversations SET user_id = :user_id WHERE user_id IS NULL"),
                        {"user_id": user_id}
                    )
                    await conn.execute(
                        text("UPDATE documents SET user_id = :user_id WHERE user_id IS NULL"),
                        {"user_id": user_id}
                    )
                    print(f"[OK] Assigned existing records to user {user_id}")
                else:
                    # No users - delete existing records
                    await conn.execute(text("DELETE FROM conversations WHERE user_id IS NULL"))
                    await conn.execute(text("DELETE FROM documents WHERE user_id IS NULL"))
                    print("[OK] Deleted existing records (no users in system)")
            except Exception as e:
                print(f"[WARN] Could not update existing records: {e}")
            
            print("\n[OK] Migration completed!")
            
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(add_columns())
