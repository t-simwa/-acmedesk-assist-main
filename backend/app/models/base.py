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
    # Ensure the directory exists
    db_dir = Path("backend/data")
    db_dir.mkdir(parents=True, exist_ok=True)
    
    # Use absolute path for SQLite
    db_path = db_dir / "acmedesk.db"
    return f"sqlite+aiosqlite:///{db_path.resolve()}"


def get_engine():
    """Get or create the database engine."""
    global _engine
    if _engine is None:
        database_url = get_database_url()
        _engine = create_async_engine(
            database_url,
            echo=False,  # Set to True for SQL query logging
            future=True,
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
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database initialized successfully")


async def close_db():
    """Close the database engine."""
    global _engine
    if _engine:
        await _engine.dispose()
        _engine = None
