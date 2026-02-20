"""
Migration script to add user_id columns to conversations and documents tables.

This script:
1. Adds user_id column to conversations table (if it doesn't exist)
2. Adds user_id column to documents table (if it doesn't exist)
3. Assigns existing records to the first user in the system (or deletes them if no users exist)

Run this script once after updating the models to include user_id fields.

Usage:
    python scripts/migrate_add_user_id.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings
from app.models.base import get_database_url


async def check_column_exists(conn, table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    if "sqlite" in get_database_url():
        # SQLite: Query pragma table_info
        result = await conn.execute(
            text(f"PRAGMA table_info({table_name})")
        )
        columns = result.fetchall()
        return any(col[1] == column_name for col in columns)
    else:
        # PostgreSQL/MySQL: Query information_schema
        result = await conn.execute(
            text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = :table_name AND column_name = :column_name
            """),
            {"table_name": table_name, "column_name": column_name}
        )
        return result.fetchone() is not None


async def table_exists(conn, table_name: str) -> bool:
    """Check if a table exists."""
    if "sqlite" in get_database_url():
        result = await conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name=:name"),
            {"name": table_name}
        )
        return result.fetchone() is not None
    else:
        result = await conn.execute(
            text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = :table_name
            """),
            {"table_name": table_name}
        )
        return result.fetchone() is not None


async def get_first_user_id(conn) -> str | None:
    """Get the ID of the first user in the system."""
    # Check if users table exists first
    if not await table_exists(conn, "users"):
        return None
    
    result = await conn.execute(
        text("SELECT id FROM users ORDER BY created_at ASC LIMIT 1")
    )
    row = result.fetchone()
    return row[0] if row else None


async def migrate():
    """Run the migration to add user_id columns."""
    database_url = get_database_url()
    engine = create_async_engine(database_url, echo=False)
    
    try:
        async with engine.begin() as conn:
            print("Starting migration: Adding user_id columns...")
            
            # Check if tables exist
            conversations_exists = await table_exists(conn, "conversations")
            documents_exists = await table_exists(conn, "documents")
            
            if not conversations_exists and not documents_exists:
                print("[OK] Tables don't exist yet. They will be created with user_id columns on next app startup.")
                print("     No migration needed - just restart your backend server.")
                return
            
            # Check if conversations.user_id exists
            conversations_has_user_id = await check_column_exists(conn, "conversations", "user_id") if conversations_exists else False
            documents_has_user_id = await check_column_exists(conn, "documents", "user_id") if documents_exists else False
            
            if conversations_has_user_id and documents_has_user_id:
                print("[OK] user_id columns already exist. Migration not needed.")
                return
            
            # Get first user ID for assigning existing records
            first_user_id = await get_first_user_id(conn)
            
            if not first_user_id:
                print("[WARN] No users found in the system.")
                print("  Existing conversations and documents will be deleted.")
                print("  (This is safe if you haven't registered any users yet)")
                delete_existing = True
            else:
                print(f"[OK] Found first user: {first_user_id}")
                print("  Existing records will be assigned to this user.")
                delete_existing = False
            
            # Add user_id to conversations table
            if conversations_exists and not conversations_has_user_id:
                print("\nAdding user_id column to conversations table...")
                
                if "sqlite" in database_url:
                    # SQLite: Add column (SQLite doesn't support adding NOT NULL columns directly)
                    # We'll add it as nullable first, then update, then we can't make it NOT NULL
                    # without recreating the table, so we'll just add it with a default
                    await conn.execute(
                        text("ALTER TABLE conversations ADD COLUMN user_id VARCHAR(36)")
                    )
                    
                    # Update existing records
                    if delete_existing:
                        await conn.execute(
                            text("DELETE FROM conversations WHERE user_id IS NULL")
                        )
                        print("  [OK] Deleted existing conversations (no users in system)")
                    else:
                        result = await conn.execute(
                            text("UPDATE conversations SET user_id = :user_id WHERE user_id IS NULL"),
                            {"user_id": first_user_id}
                        )
                        print(f"  [OK] Assigned existing conversations to user {first_user_id}")
                else:
                    # PostgreSQL/MySQL: Add column with default
                    await conn.execute(
                        text("ALTER TABLE conversations ADD COLUMN user_id VARCHAR(36) NOT NULL DEFAULT ''")
                    )
                    
                    if delete_existing:
                        await conn.execute(
                            text("DELETE FROM conversations WHERE user_id = ''")
                        )
                    else:
                        await conn.execute(
                            text("UPDATE conversations SET user_id = :user_id WHERE user_id = ''"),
                            {"user_id": first_user_id}
                        )
                
                # Create index
                try:
                    await conn.execute(
                        text("CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)")
                    )
                    print("  [OK] Created index on conversations.user_id")
                except Exception as e:
                    print(f"  [WARN] Could not create index (may already exist): {e}")
            
            # Add user_id to documents table
            if documents_exists and not documents_has_user_id:
                print("\nAdding user_id column to documents table...")
                
                if "sqlite" in database_url:
                    await conn.execute(
                        text("ALTER TABLE documents ADD COLUMN user_id VARCHAR(36)")
                    )
                    
                    # Update existing records
                    if delete_existing:
                        await conn.execute(
                            text("DELETE FROM documents WHERE user_id IS NULL")
                        )
                        print("  [OK] Deleted existing documents (no users in system)")
                    else:
                        result = await conn.execute(
                            text("UPDATE documents SET user_id = :user_id WHERE user_id IS NULL"),
                            {"user_id": first_user_id}
                        )
                        print(f"  [OK] Assigned existing documents to user {first_user_id}")
                else:
                    await conn.execute(
                        text("ALTER TABLE documents ADD COLUMN user_id VARCHAR(36) NOT NULL DEFAULT ''")
                    )
                    
                    if delete_existing:
                        await conn.execute(
                            text("DELETE FROM documents WHERE user_id = ''")
                        )
                    else:
                        await conn.execute(
                            text("UPDATE documents SET user_id = :user_id WHERE user_id = ''"),
                            {"user_id": first_user_id}
                        )
                
                # Create index
                try:
                    await conn.execute(
                        text("CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)")
                    )
                    print("  [OK] Created index on documents.user_id")
                except Exception as e:
                    print(f"  [WARN] Could not create index (may already exist): {e}")
            
            print("\n[OK] Migration completed successfully!")
            
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(migrate())
