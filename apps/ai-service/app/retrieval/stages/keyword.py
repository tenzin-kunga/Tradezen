from __future__ import annotations

import time
import logging

from ...database.connection import Database

logger = logging.getLogger("ai_service.retrieval.keyword")


class KeywordSearchStage:
    """Full-text search using PostgreSQL tsvector + ts_rank."""

    def __init__(self, db: Database):
        self.db = db

    async def search(
        self,
        user_id: str,
        query: str,
        limit: int = 10,
        source_types: list[str] | None = None,
    ) -> list[dict]:
        start = time.monotonic()

        # Build tsquery from user input
        tsquery = self._build_tsquery(query)

        source_filter = ""
        params: list = [user_id, tsquery, limit]
        if source_types:
            placeholders = ",".join(f"${i}" for i in range(4, 4 + len(source_types)))
            source_filter = f"AND d.source_type IN ({placeholders})"
            params.extend(source_types)

        sql = f"""
            SELECT
                d.id as document_id,
                d.source_type,
                d.source_id,
                d.chunk_index,
                d.content,
                d.metadata,
                ts_rank(d.search_vector, to_tsquery('english', $2)) as rank
            FROM ai_documents d
            WHERE d.user_id = $1
              AND d.search_vector @@ to_tsquery('english', $2)
              {source_filter}
            ORDER BY rank DESC
            LIMIT $3
        """

        rows = await self.db.fetch(sql, *params)
        elapsed_ms = (time.monotonic() - start) * 1000

        results = [
            {
                "document_id": str(r["document_id"]),
                "source_type": r["source_type"],
                "source_id": str(r["source_id"]) if r.get("source_id") else None,
                "chunk_index": r.get("chunk_index", 0),
                "content": r.get("content", "") or "",
                "metadata": r.get("metadata", {}),
                "score": float(r["rank"]),
            }
            for r in rows
        ]

        logger.debug(f"Keyword search: {len(results)} results ({elapsed_ms:.0f}ms)")
        return results

    @staticmethod
    def _build_tsquery(query: str) -> str:
        """Convert user query to tsquery. Uses websearch syntax for natural language."""
        # Strip special tsquery chars, split into words
        words = query.replace("'", "''").split()
        if not words:
            return "''"
        # Use prefix matching for partial word matches
        terms = [f"{w}:*" for w in words if w]
        return " & ".join(terms)
