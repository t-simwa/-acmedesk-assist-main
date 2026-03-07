#!/usr/bin/env python3
"""
Migration script to fix conversations that were created with tenant_id = user_id.

This script:
1. Finds all conversations where tenant_id is actually a user_id (not a valid tenant_id)
2. Updates them to use the user's actual tenant_id

Run from the backend directory:
    python -m scripts.fix_conversation_tenant_ids
"""

import asyncio
import sys
from pathlib import Path

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, update, text
from app.models.base import get_session_factory, init_db
from app.models.conversation import Conversation
from app.models.user import User


async def fix_conversation_tenant_ids() -> int:
    """
    Fix conversations where tenant_id is actually a user_id.
    
    Returns:
        Number of conversations fixed
    """
    # Initialize database
    await init_db()
    
    session_factory = get_session_factory()
    fixed_count = 0
    
    async with session_factory() as session:
        # Step 1: Get all users and their tenant_ids
        users_result = await session.execute(
            select(User.id, User.tenant_id).where(User.tenant_id.isnot(None))
        )
        user_to_tenant = {row.id: row.tenant_id for row in users_result.fetchall()}
        
        print(f"Found {len(user_to_tenant)} users with tenant_ids")
        
        # Step 2: Get all distinct tenant_ids from conversations
        conv_tenants_result = await session.execute(
            select(Conversation.tenant_id).distinct()
        )
        conv_tenant_ids = {row.tenant_id for row in conv_tenants_result.fetchall()}
        
        print(f"Found {len(conv_tenant_ids)} distinct tenant_ids in conversations")
        
        # Step 3: Find tenant_ids in conversations that are actually user_ids
        # (i.e., they match a user.id but not that user's tenant_id)
        for conv_tenant_id in conv_tenant_ids:
            if conv_tenant_id in user_to_tenant:
                # This conversation's tenant_id is actually a user_id
                actual_tenant_id = user_to_tenant[conv_tenant_id]
                
                if conv_tenant_id != actual_tenant_id:
                    print(f"Found conversations with tenant_id={conv_tenant_id} (user_id)")
                    print(f"  -> Should be: {actual_tenant_id} (actual tenant_id)")
                    
                    # Update all conversations with this incorrect tenant_id
                    update_result = await session.execute(
                        update(Conversation)
                        .where(Conversation.tenant_id == conv_tenant_id)
                        .values(tenant_id=actual_tenant_id)
                    )
                    
                    rows_affected = update_result.rowcount
                    fixed_count += rows_affected
                    print(f"  -> Fixed {rows_affected} conversations")
        
        await session.commit()
    
    return fixed_count


async def main():
    print("=" * 60)
    print("Fixing conversation tenant_ids...")
    print("=" * 60)
    
    try:
        fixed = await fix_conversation_tenant_ids()
        print("=" * 60)
        print(f"Done! Fixed {fixed} conversations.")
        print("=" * 60)
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
