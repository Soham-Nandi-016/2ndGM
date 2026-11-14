"""
2ndGM AI Chess Lab — PostgreSQL Connection Pool
================================================
Async SQLAlchemy engine + session factory pointing at the live
Supabase PostgreSQL instance defined in .env (DATABASE_URL).

Usage:
    from db.postgres import get_db_session, engine

    async with get_db_session() as session:
        result = await session.execute(select(MyModel))
"""

from __future__ import annotations

import os

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

load_dotenv()

# ---------------------------------------------------------------------------
# Supabase connection — psycopg2 driver requires the postgresql+psycopg2 scheme.
# The raw DATABASE_URL uses the standard 'postgresql://' prefix; we swap it here
# for the async-compatible 'postgresql+asyncpg' driver.
# ---------------------------------------------------------------------------
_raw_url: str = os.environ["DATABASE_URL"]

# Supabase pooler endpoint uses port 6543 with pgbouncer in transaction mode.
# asyncpg works fine with it; we only need to adjust the scheme prefix.
DATABASE_URL: str = _raw_url.replace(
    "postgresql://", "postgresql+asyncpg://", 1
)

# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------
engine = create_async_engine(
    DATABASE_URL,
    echo=False,          # set True temporarily to debug queries
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,  # validates connections before handing them out
)

# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ---------------------------------------------------------------------------
# Declarative base (shared by all ORM models)
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# FastAPI dependency — yields an async session, rolls back on error
# ---------------------------------------------------------------------------
async def get_db_session() -> AsyncSession:  # type: ignore[return]
    """
    FastAPI dependency that provides a transactional async DB session.

    Usage in a router:
        @router.get("/...")
        async def my_endpoint(db: AsyncSession = Depends(get_db_session)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
