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



"""Utility script that runs the same ad‑hoc schema fixes executed by the
application during startup.

This file is kept for backwards-compatibility and for developers who want to
manually repair an existing SQLite file. The actual migration logic lives in
``app.models.base`` and is invoked automatically by ``init_db()`` when the
server starts; the script simply imports and wraps that helper so developers
don't have to open Python directly.
"""

import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.models.base import fix_schema


if __name__ == "__main__":
    # call the shared helper
    asyncio.run(fix_schema())
