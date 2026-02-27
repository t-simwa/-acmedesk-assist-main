import pytest
import pytest_asyncio
import tempfile
from pathlib import Path

from sqlalchemy import text

from app.models import base


@pytest.mark.asyncio
async def test_fix_schema_adds_new_user_columns(tmp_path, monkeypatch):
    """`fix_schema` should add verification/reset token columns to an existing
    users table that was created with an older schema.
    """
    # create a temporary sqlite file and override the database url
    db_file = tmp_path / "test.db"
    monkeypatch.setattr(
        base,
        "get_database_url",
        lambda: f"sqlite+aiosqlite:///{db_file.resolve()}",
    )

    # create an "old" users table without the new fields
    engine = base.get_engine()
    async with engine.begin() as conn:
        await conn.execute(text(
            """
            CREATE TABLE users (
                id VARCHAR(36) PRIMARY KEY,
                tenant_id VARCHAR(36),
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL
            )
            """
        ))

    # run the shared helper which creates tables and applies schema updates
    await base.fix_schema()

    # inspect the resulting table structure
    async with engine.connect() as conn:
        result = await conn.execute(text("PRAGMA table_info(users)"))
        columns = [row[1] for row in result.fetchall()]

    assert "verification_token_expires" in columns
    assert "reset_token_expires" in columns
    assert "is_active" in columns
    assert "is_verified" in columns
