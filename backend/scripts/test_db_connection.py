"""
Test database connection and verify schema.
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.models.base import get_engine, get_session_factory
from app.models import conversation, document, message, user


async def test_connection():
    """Test database connection and schema."""
    print("=== Testing Database Connection ===\n")
    
    # Get engine
    engine = get_engine()
    print(f"Engine created: {engine}")
    print(f"Database URL: {engine.url}")
    
    # Test connection
    async with engine.begin() as conn:
        # Check conversations table schema
        result = await conn.execute(text("PRAGMA table_info(conversations)"))
        columns = result.fetchall()
        print("\nConversations table columns:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
        
        # Check if user_id exists
        user_id_exists = any(col[1] == "user_id" for col in columns)
        print(f"\nHas user_id column: {user_id_exists}")
        
        # Try a simple query
        try:
            result = await conn.execute(text("SELECT COUNT(*) FROM conversations"))
            count = result.scalar()
            print(f"Total conversations: {count}")
        except Exception as e:
            print(f"Error querying conversations: {e}")
        
        # Try querying with user_id
        try:
            result = await conn.execute(text("SELECT COUNT(*) FROM conversations WHERE user_id IS NOT NULL"))
            count = result.scalar()
            print(f"Conversations with user_id: {count}")
        except Exception as e:
            print(f"Error querying with user_id: {e}")
    
    # Test SQLAlchemy model
    print("\n=== Testing SQLAlchemy Model ===")
    session_factory = get_session_factory()
    async with session_factory() as session:
        from app.models.conversation import Conversation
        from sqlalchemy import select
        
        # Try to query using the model
        try:
            query = select(Conversation).limit(1)
            result = await session.execute(query)
            conv = result.scalar_one_or_none()
            if conv:
                print(f"Found conversation: {conv.id}, user_id: {conv.user_id}")
            else:
                print("No conversations found")
        except Exception as e:
            print(f"Error querying with SQLAlchemy model: {e}")
            import traceback
            traceback.print_exc()
    
    await engine.dispose()
    print("\n=== Test Complete ===")


if __name__ == "__main__":
    asyncio.run(test_connection())
