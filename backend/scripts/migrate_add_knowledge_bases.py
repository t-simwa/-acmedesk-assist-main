"""
Migration script to add knowledge base tables and update documents table.

This script:
1. Creates knowledge_bases table
2. Creates user_knowledge_base_preferences table
3. Adds knowledge_base_id column to documents table
4. Creates default knowledge base for system docs
"""

import asyncio
import sys
import json
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings
from app.models.base import get_database_url


async def check_table_exists(conn, table_name: str) -> bool:
    """Check if a table exists."""
    database_url = get_database_url()
    if "sqlite" in database_url:
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


async def check_column_exists(conn, table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    database_url = get_database_url()
    if "sqlite" in database_url:
        result = await conn.execute(
            text(f"PRAGMA table_info({table_name})")
        )
        columns = result.fetchall()
        return any(col[1] == column_name for col in columns)
    else:
        result = await conn.execute(
            text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = :table_name AND column_name = :column_name
            """),
            {"table_name": table_name, "column_name": column_name}
        )
        return result.fetchone() is not None


async def migrate():
    """Run the migration to add knowledge base tables."""
    # Get the correct database URL (ensure we're using the right path)
    database_url = get_database_url()
    # Fix path if it has double backend (when running from backend directory)
    if "backend/backend" in database_url or "backend\\backend" in database_url:
        from pathlib import Path
        # Get project root (go up from backend/scripts)
        project_root = Path(__file__).parent.parent.parent
        db_path = project_root / "backend" / "data" / "acmedesk.db"
        database_url = f"sqlite+aiosqlite:///{db_path.resolve()}"
    
    engine = create_async_engine(database_url, echo=False)
    
    try:
        async with engine.begin() as conn:
            print("Starting migration: Adding knowledge base tables...")
            
            # Check if tables already exist
            kb_exists = await check_table_exists(conn, "knowledge_bases")
            pref_exists = await check_table_exists(conn, "user_knowledge_base_preferences")
            doc_has_kb_id = await check_column_exists(conn, "documents", "knowledge_base_id")
            
            if kb_exists and pref_exists and doc_has_kb_id:
                print("[OK] Knowledge base tables already exist. Migration not needed.")
                return
            
            # Create knowledge_bases table
            if not kb_exists:
                print("\nCreating knowledge_bases table...")
                if "sqlite" in database_url:
                    await conn.execute(text("""
                        CREATE TABLE knowledge_bases (
                            id VARCHAR(36) PRIMARY KEY,
                            user_id VARCHAR(36),
                            name VARCHAR(255) NOT NULL,
                            description VARCHAR(500),
                            is_default BOOLEAN NOT NULL DEFAULT 0,
                            is_active BOOLEAN NOT NULL DEFAULT 1,
                            created_at DATETIME NOT NULL,
                            updated_at DATETIME NOT NULL,
                            FOREIGN KEY (user_id) REFERENCES users(id)
                        )
                    """))
                    await conn.execute(text("CREATE INDEX idx_knowledge_bases_user_id ON knowledge_bases(user_id)"))
                else:
                    await conn.execute(text("""
                        CREATE TABLE knowledge_bases (
                            id VARCHAR(36) PRIMARY KEY,
                            user_id VARCHAR(36),
                            name VARCHAR(255) NOT NULL,
                            description VARCHAR(500),
                            is_default BOOLEAN NOT NULL DEFAULT FALSE,
                            is_active BOOLEAN NOT NULL DEFAULT TRUE,
                            created_at TIMESTAMP NOT NULL,
                            updated_at TIMESTAMP NOT NULL,
                            FOREIGN KEY (user_id) REFERENCES users(id)
                        )
                    """))
                    await conn.execute(text("CREATE INDEX idx_knowledge_bases_user_id ON knowledge_bases(user_id)"))
                print("  [OK] Created knowledge_bases table")
            
            # Create user_knowledge_base_preferences table
            if not pref_exists:
                print("\nCreating user_knowledge_base_preferences table...")
                if "sqlite" in database_url:
                    await conn.execute(text("""
                        CREATE TABLE user_knowledge_base_preferences (
                            id VARCHAR(36) PRIMARY KEY,
                            user_id VARCHAR(36) NOT NULL UNIQUE,
                            use_default_kb BOOLEAN NOT NULL DEFAULT 1,
                            active_kb_ids VARCHAR(1000) NOT NULL DEFAULT '[]',
                            created_at DATETIME NOT NULL,
                            updated_at DATETIME NOT NULL,
                            FOREIGN KEY (user_id) REFERENCES users(id)
                        )
                    """))
                    await conn.execute(text("CREATE INDEX idx_user_kb_prefs_user_id ON user_knowledge_base_preferences(user_id)"))
                else:
                    await conn.execute(text("""
                        CREATE TABLE user_knowledge_base_preferences (
                            id VARCHAR(36) PRIMARY KEY,
                            user_id VARCHAR(36) NOT NULL UNIQUE,
                            use_default_kb BOOLEAN NOT NULL DEFAULT TRUE,
                            active_kb_ids VARCHAR(1000) NOT NULL DEFAULT '[]',
                            created_at TIMESTAMP NOT NULL,
                            updated_at TIMESTAMP NOT NULL,
                            FOREIGN KEY (user_id) REFERENCES users(id)
                        )
                    """))
                    await conn.execute(text("CREATE INDEX idx_user_kb_prefs_user_id ON user_knowledge_base_preferences(user_id)"))
                print("  [OK] Created user_knowledge_base_preferences table")
            
            # Add knowledge_base_id to documents table
            if not doc_has_kb_id:
                print("\nAdding knowledge_base_id column to documents table...")
                if "sqlite" in database_url:
                    await conn.execute(text("ALTER TABLE documents ADD COLUMN knowledge_base_id VARCHAR(36)"))
                    await conn.execute(text("CREATE INDEX idx_documents_knowledge_base_id ON documents(knowledge_base_id)"))
                else:
                    await conn.execute(text("ALTER TABLE documents ADD COLUMN knowledge_base_id VARCHAR(36)"))
                    await conn.execute(text("CREATE INDEX idx_documents_knowledge_base_id ON documents(knowledge_base_id)"))
                print("  [OK] Added knowledge_base_id column to documents table")
            
            # Create default knowledge base
            print("\nCreating default knowledge base...")
            default_kb_id = "00000000-0000-0000-0000-000000000001"
            default_kb_exists = await conn.execute(
                text("SELECT id FROM knowledge_bases WHERE id = :id"),
                {"id": default_kb_id}
            )
            if not default_kb_exists.fetchone():
                from datetime import datetime
                now = datetime.utcnow().isoformat()
                await conn.execute(
                    text("""
                        INSERT INTO knowledge_bases 
                        (id, user_id, name, description, is_default, is_active, created_at, updated_at)
                        VALUES (:id, NULL, :name, :description, :is_default, :is_active, :created_at, :updated_at)
                    """),
                    {
                        "id": default_kb_id,
                        "name": "Default Knowledge Base",
                        "description": "System default knowledge base containing documentation from data/docs folder",
                        "is_default": True if "sqlite" in database_url else 1,
                        "is_active": True if "sqlite" in database_url else 1,
                        "created_at": now,
                        "updated_at": now,
                    }
                )
                print("  [OK] Created default knowledge base")
            else:
                print("  [OK] Default knowledge base already exists")
            
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
