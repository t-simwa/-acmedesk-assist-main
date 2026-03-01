"""
Migration script to add plan_tier column to tenants table.

This script:
1. Adds plan_tier column to tenants table (if it doesn't exist)

Run this script once after updating the models to include plan_tier field.

Usage:
    python scripts/migrate_add_plan_tier.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings
from app.models.base import get_database_url


async def check_column_exists(conn, table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    if "sqlite" in get_database_url():
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


async def add_plan_tier_column():
    """Add plan_tier column to tenants table if it doesn't exist."""
    database_url = get_database_url()
    engine = create_async_engine(database_url, echo=True)
    
    async with engine.begin() as conn:
        # Check if column already exists
        exists = await check_column_exists(conn, "tenants", "plan_tier")
        
        if exists:
            print("Column 'plan_tier' already exists in tenants table. Skipping.")
            return
        
        # Add the column
        print("Adding 'plan_tier' column to tenants table...")
        
        if "sqlite" in database_url:
            await conn.execute(
                text("ALTER TABLE tenants ADD COLUMN plan_tier VARCHAR(20)")
            )
        else:
            await conn.execute(
                text("ALTER TABLE tenants ADD COLUMN plan_tier VARCHAR(20)")
            )
        
        print("Column 'plan_tier' added successfully!")
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(add_plan_tier_column())
