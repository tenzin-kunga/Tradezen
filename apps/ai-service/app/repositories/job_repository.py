from __future__ import annotations

from ..database.connection import Database
from ..database.types import EmbeddingJobRow


class JobRepository:
    """CRUD for ai_embedding_jobs."""

    def __init__(self, db: Database):
        self.db = db

    async def get(self, job_id: str) -> EmbeddingJobRow | None:
        row = await self.db.fetchrow("SELECT * FROM ai_embedding_jobs WHERE id = $1", job_id)
        return self._row_to_job(row) if row else None

    async def get_pending(self, limit: int = 10) -> list[EmbeddingJobRow]:
        rows = await self.db.fetch(
            "SELECT * FROM ai_embedding_jobs WHERE status = 'pending' ORDER BY created_at LIMIT $1",
            limit,
        )
        return [self._row_to_job(r) for r in rows]

    async def get_by_document(self, document_id: str) -> list[EmbeddingJobRow]:
        rows = await self.db.fetch(
            "SELECT * FROM ai_embedding_jobs WHERE document_id = $1 ORDER BY created_at DESC",
            document_id,
        )
        return [self._row_to_job(r) for r in rows]

    async def count_by_status(self, user_id: str) -> dict[str, int]:
        rows = await self.db.fetch(
            """SELECT j.status, COUNT(*) as count
               FROM ai_embedding_jobs j
               JOIN ai_documents d ON j.document_id = d.id
               WHERE d.user_id = $1
               GROUP BY j.status""",
            user_id,
        )
        return {r["status"]: r["count"] for r in rows}

    def _row_to_job(self, row) -> EmbeddingJobRow:
        return EmbeddingJobRow(
            id=str(row["id"]),
            document_id=str(row["document_id"]),
            status=row["status"],
            embedding_model=row.get("embedding_model"),
            error_message=row.get("error_message"),
            started_at=row.get("started_at"),
            completed_at=row.get("completed_at"),
            created_at=row.get("created_at"),
        )
