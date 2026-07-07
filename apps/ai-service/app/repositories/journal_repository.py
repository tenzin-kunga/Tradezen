from __future__ import annotations

from ..database.connection import Database
from ..database.types import JournalRow


class JournalRepository:
    """Read-only journal queries for RAG retrieval."""

    def __init__(self, db: Database):
        self.db = db

    async def list_by_user(self, user_id: str, limit: int = 50) -> list[JournalRow]:
        rows = await self.db.fetch(
            "SELECT * FROM journals WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
            user_id, limit,
        )
        return [self._row_to_journal(r) for r in rows]

    async def get(self, journal_id: str) -> JournalRow | None:
        row = await self.db.fetchrow("SELECT * FROM journals WHERE id = $1", journal_id)
        return self._row_to_journal(row) if row else None

    async def search_by_content(self, user_id: str, query: str, limit: int = 10) -> list[JournalRow]:
        rows = await self.db.fetch(
            """SELECT * FROM journals
               WHERE user_id = $1
                 AND (
                   pre_market_notes ILIKE '%' || $2 || '%'
                   OR post_market_notes ILIKE '%' || $2 || '%'
                   OR lessons ILIKE '%' || $2 || '%'
                 )
               ORDER BY created_at DESC LIMIT $3""",
            user_id, query, limit,
        )
        return [self._row_to_journal(r) for r in rows]

    async def get_recent(self, user_id: str, limit: int = 5) -> list[JournalRow]:
        rows = await self.db.fetch(
            "SELECT * FROM journals WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
            user_id, limit,
        )
        return [self._row_to_journal(r) for r in rows]

    def _row_to_journal(self, row) -> JournalRow:
        return JournalRow(
            id=str(row["id"]),
            user_id=str(row["user_id"]),
            date=row.get("date", ""),
            pre_market_notes=row.get("pre_market_notes"),
            post_market_notes=row.get("post_market_notes"),
            mood=row.get("mood"),
            market_conditions=row.get("market_conditions"),
            lessons=row.get("lessons"),
            created_at=row.get("created_at"),
        )
