"""
Base model and database setup for SQLAlchemy.
"""

import logging
from pathlib import Path
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from ..config import settings

logger = logging.getLogger(__name__)


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

    # tenant table onboarding columns
    try:
        result = await conn.execute(text("PRAGMA table_info(tenants)"))
        columns = [col[1] for col in result.fetchall()]

        missing_columns = {
            "onboarding_step": "INTEGER NOT NULL DEFAULT 1",
            "onboarding_completed": "BOOLEAN NOT NULL DEFAULT 0",
            "skipped_steps": "JSON",
        }
        for col_name, col_type in missing_columns.items():
            if col_name not in columns:
                await conn.execute(text(f"ALTER TABLE tenants ADD COLUMN {col_name} {col_type}"))
    except Exception:
        pass

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
        
        missing_columns = {
            "user_id": "VARCHAR(36)",
            "original_filename": "VARCHAR(255) NOT NULL DEFAULT ''",
        }
        for col_name, col_type in missing_columns.items():
            if col_name not in columns:
                await conn.execute(
                    text(f"ALTER TABLE documents ADD COLUMN {col_name} {col_type}")
                )
        
        await conn.execute(
            text("CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)")
        )
    except Exception:
        pass

    # chatbot_instances table additional columns (from Milestone 7.6)
    try:
        result = await conn.execute(text("PRAGMA table_info(chatbot_instances)"))
        columns = [col[1] for col in result.fetchall()]
        
        missing_columns = {
            "user_message_color": "VARCHAR(7) NOT NULL DEFAULT '#4F8EF7'",
            "widget_position": "VARCHAR(50) NOT NULL DEFAULT 'bottom-right'",
            "response_language": "VARCHAR(20) NOT NULL DEFAULT 'auto'",
            "response_tone": "VARCHAR(50) NOT NULL DEFAULT 'professional'",
            "response_length": "VARCHAR(50) NOT NULL DEFAULT 'concise'",
            "show_typing": "BOOLEAN NOT NULL DEFAULT 1",
            "show_citations": "BOOLEAN NOT NULL DEFAULT 1",
            "read_receipts": "BOOLEAN NOT NULL DEFAULT 0",
            "suggested_starter_questions": "JSON",
            "conversation_starters_display": "VARCHAR(50) NOT NULL DEFAULT 'buttons'",
            "business_hours_enabled": "BOOLEAN NOT NULL DEFAULT 0",
            "timezone": "VARCHAR(100)",
            "weekly_schedule": "JSON",
            "outside_hours_behavior": "VARCHAR(100) NOT NULL DEFAULT 'continue_answering'",
            "offline_message": "TEXT",
            "back_online_message": "TEXT",
            "holiday_hours": "JSON",
            "auto_escalation_enabled": "BOOLEAN NOT NULL DEFAULT 0",
            "confidence_threshold": "FLOAT NOT NULL DEFAULT 50",
            "unanswered_questions_threshold": "VARCHAR(50) NOT NULL DEFAULT '3'",
            "sentiment_escalation_enabled": "BOOLEAN NOT NULL DEFAULT 0",
            "keyword_triggers": "JSON",
            "escalation_email_addresses": "JSON",
            "escalation_slack_webhook": "TEXT",
            "escalation_whatsapp_notification": "BOOLEAN NOT NULL DEFAULT 0",
            "lead_capture_enabled": "BOOLEAN NOT NULL DEFAULT 0",
            "lead_capture_trigger": "VARCHAR(100) NOT NULL DEFAULT 'never'",
            "lead_capture_fields_config": "JSON",
            "lead_capture_message": "TEXT",
            "lead_capture_thank_you_message": "TEXT",
            "lead_capture_skip_enabled": "BOOLEAN NOT NULL DEFAULT 0",
            "lead_capture_skip_button_text": "VARCHAR(255)",
            "notifications_config": "JSON",
            "notification_email_addresses": "JSON",
        }
        for col_name, col_type in missing_columns.items():
            if col_name not in columns:
                await conn.execute(
                    text(f"ALTER TABLE chatbot_instances ADD COLUMN {col_name} {col_type}")
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

    # knowledge_bases and user_knowledge_base_preferences (if missing)
    try:
        result = await conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='knowledge_bases'"))
        if result.fetchone() is None:
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
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_knowledge_bases_user_id ON knowledge_bases(user_id)"))
            logger.info("Created knowledge_bases table (schema update)")
    except Exception as e:
        logger.warning("Schema update knowledge_bases: %s", e)
    try:
        result = await conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='user_knowledge_base_preferences'"))
        if result.fetchone() is None:
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
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_user_kb_prefs_user_id ON user_knowledge_base_preferences(user_id)"))
            logger.info("Created user_knowledge_base_preferences table (schema update)")
    except Exception as e:
        logger.warning("Schema update user_knowledge_base_preferences: %s", e)
    # Default knowledge base row if missing
    try:
        await conn.execute(
            text("INSERT OR IGNORE INTO knowledge_bases (id, user_id, name, description, is_default, is_active, created_at, updated_at) VALUES (:id, NULL, :name, :description, 1, 1, datetime('now'), datetime('now'))"),
            {"id": "00000000-0000-0000-0000-000000000001", "name": "Default Knowledge Base", "description": "System default knowledge base"}
        )
    except Exception as e:
        logger.warning("Schema update default KB insert: %s", e)


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
