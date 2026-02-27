"""
Base model and database setup for SQLAlchemy.
"""

from pathlib import Path
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from ..config import settings


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


# Database engine and session management
_engine = None
_session_factory = None


def get_database_url() -> str:
    """
    Get the database URL from settings or default to SQLite.
    
    Returns:
        Database URL string
    """
    if settings.database_url:
        return settings.database_url
    
    # Default to SQLite in backend/data directory
    # Use absolute path relative to this file's location
    # __file__ = backend/app/models/base.py
    # parent = backend/app/models
    # parent.parent = backend/app
    # parent.parent.parent = backend
    db_dir = Path(__file__).parent.parent.parent / "data"
    db_dir.mkdir(parents=True, exist_ok=True)
    
    # Use absolute path for SQLite
    db_path = db_dir / "acmedesk.db"
    return f"sqlite+aiosqlite:///{db_path.resolve()}"


def get_engine():
    """Get or create the database engine."""
    global _engine
    if _engine is None:
        database_url = get_database_url()
        # For SQLite, ensure we can use the connection from different threads
        connect_args = {}
        if "sqlite" in database_url:
            connect_args["check_same_thread"] = False
        _engine = create_async_engine(
            database_url,
            echo=False,  # Set to True for SQL query logging
            future=True,
            pool_pre_ping=True,  # Verify connections before using
            connect_args=connect_args,
        )
    return _engine


def get_session_factory():
    """Get or create the session factory."""
    global _session_factory
    if _session_factory is None:
        engine = get_engine()
        _session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_factory


@asynccontextmanager
async def get_db_session():
    """
    Get a database session as an async context manager.
    
    Usage:
        async with get_db_session() as session:
            # Use session here
            pass
    """
    factory = get_session_factory()
    async with factory() as session:
        yield session


async def init_db():
    """
    Initialize the database by creating all tables.
    
    This should be called once at application startup.
    """
    # Import all models to register them with Base.metadata
    from app.models import (  # noqa: F401
        tenant, user, chatbot_instance, conversation, document, message,
        contact, lead, campaign, booking, plan, setting, user_preferences,
        audit_log, api_key, team_member, knowledge_base
    )
    
    engine = get_engine()
    async with engine.begin() as conn:
        # create tables based on current models; this will not modify existing tables
        await conn.run_sync(Base.metadata.create_all)
        # ensure any previously added columns that weren't part of the original
        # schema get added automatically (useful when running against an older
        # SQLite file created before new fields were added to the models).
        await _ensure_schema_updates(conn)
    print("Database initialized successfully")


async def close_db():
    """Close the database engine."""
    global _engine, _session_factory
    if _engine:
        await _engine.dispose()
        _engine = None
    _session_factory = None


# ---------------------------------------------------------------------------
# Schema migration helpers
# ---------------------------------------------------------------------------

async def _ensure_schema_updates(conn):
    """Run a series of ad-hoc schema fixes for SQLite.

    This logic was originally in ``backend/scripts/fix_database_schema.py`` and
    ensures that when the database file was created against an older version of
    the models, any new columns are appended so that queries don't throw
    ``OperationalError: no such column``.

    We keep the checks fairly limited to the columns we actually started using
    after the initial deployment (User verification/reset tokens, conversation
    and document user_id references, etc.). The checks are idempotent so it is
    safe to call them on every startup.
    """
    from sqlalchemy import text

    # conversations/document user_id columns and indexes
    try:
        result = await conn.execute(text("PRAGMA table_info(conversations)"))
        columns = [col[1] for col in result.fetchall()]
        if "user_id" not in columns:
            await conn.execute(
                text("ALTER TABLE conversations ADD COLUMN user_id VARCHAR(36)")
            )
        # index creation is harmless if already exists
        await conn.execute(
            text("CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)")
        )
    except Exception:
        # ignore failures, we'll fix them manually with the script if needed
        pass

    try:
        result = await conn.execute(text("PRAGMA table_info(documents)"))
        columns = [col[1] for col in result.fetchall()]
        if "user_id" not in columns:
            await conn.execute(
                text("ALTER TABLE documents ADD COLUMN user_id VARCHAR(36)")
            )
        await conn.execute(
            text("CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)")
        )
    except Exception:
        pass

    # user table additional columns
    try:
        result = await conn.execute(text("PRAGMA table_info(users)"))
        columns = [col[1] for col in result.fetchall()]

        missing_columns = {
            "is_active": "BOOLEAN NOT NULL DEFAULT 1",
            "is_verified": "BOOLEAN NOT NULL DEFAULT 0",
            "verification_token": "VARCHAR(36)",
            "verification_token_expires": "TIMESTAMP",
            "reset_token": "VARCHAR(36)",
            "reset_token_expires": "TIMESTAMP",
        }
        for col_name, col_type in missing_columns.items():
            if col_name not in columns:
                await conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
    except Exception:
        pass


async def fix_schema():
    """Public helper that can be invoked from scripts or tests.

    This creates all tables and then applies the lightweight ad‑hoc schema
    updates. It is essentially the same as :pyfunc:`init_db` except we expose it
    directly so the standalone script can call it without duplicating the logic.
    """
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _ensure_schema_updates(conn)
    await engine.dispose()
