"""
Fix database schema by ensuring all tables have user_id columns.

This script:
1. Initializes the database (creates all tables with current schema)
2. Adds user_id columns if tables exist but columns don't

Run this script to fix the database schema issue.

Usage:
    python backend/scripts/fix_database_schema.py
"""

import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.models.base import Base, get_database_url, get_engine


async def fix_schema():
    """Fix database schema by creating tables and adding missing columns."""
    database_url = get_database_url()
    engine = create_async_engine(database_url, echo=False)
    
    try:
        # First, create all tables (this won't modify existing tables)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("[OK] Ensured all tables exist with current schema")
        
        # Now add user_id columns if they don't exist
        async with engine.begin() as conn:
            # Check and add user_id to conversations
            try:
                result = await conn.execute(
                    text("PRAGMA table_info(conversations)")
                )
                columns = [col[1] for col in result.fetchall()]
                if "user_id" not in columns:
                    await conn.execute(
                        text("ALTER TABLE conversations ADD COLUMN user_id VARCHAR(36)")
                    )
                    print("[OK] Added user_id column to conversations")
                else:
                    print("[SKIP] conversations.user_id already exists")
            except Exception as e:
                print(f"[WARN] Could not check/add user_id to conversations: {e}")
            
            # Check and add user_id to documents
            try:
                result = await conn.execute(
                    text("PRAGMA table_info(documents)")
                )
                columns = [col[1] for col in result.fetchall()]
                if "user_id" not in columns:
                    await conn.execute(
                        text("ALTER TABLE documents ADD COLUMN user_id VARCHAR(36)")
                    )
                    print("[OK] Added user_id column to documents")
                else:
                    print("[SKIP] documents.user_id already exists")
            except Exception as e:
                print(f"[WARN] Could not check/add user_id to documents: {e}")
            
            # Create indexes
            try:
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)")
                )
                print("[OK] Created index on conversations.user_id")
            except Exception as e:
                print(f"[WARN] Could not create index: {e}")
            
            try:
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)")
                )
                print("[OK] Created index on documents.user_id")
            except Exception as e:
                print(f"[WARN] Could not create index: {e}")
        
        print("\n[OK] Database schema fixed!")
        print("You can now restart your backend server.")
        
    except Exception as e:
        print(f"\n[ERROR] Failed to fix schema: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(fix_schema())
