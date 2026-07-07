from __future__ import annotations

import logging
from typing import Any

import asyncpg

logger = logging.getLogger("ai_service.database")


class Database:
    """Async PostgreSQL connection pool with transaction support."""

    def __init__(self, dsn: str):
        self.dsn = dsn
        self.pool: asyncpg.Pool | None = None

    async def connect(self):
        self.pool = await asyncpg.create_pool(
            self.dsn, min_size=2, max_size=10, command_timeout=5
        )
        logger.info("Database pool connected")

    async def close(self):
        if self.pool:
            await self.pool.close()
            logger.info("Database pool closed")

    def transaction(self):
        """Context manager for transactions."""
        return self.pool.acquire()

    async def fetch(self, query: str, *args) -> list[asyncpg.Record]:
        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def fetchrow(self, query: str, *args) -> asyncpg.Record | None:
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def fetchval(self, query: str, *args) -> Any:
        async with self.pool.acquire() as conn:
            return await conn.fetchval(query, *args)

    async def execute(self, query: str, *args) -> str:
        async with self.pool.acquire() as conn:
            return await conn.execute(query, *args)

    async def health_check(self) -> bool:
        try:
            async with self.pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            return True
        except Exception:
            return False
