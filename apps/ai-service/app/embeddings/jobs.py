from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime, timezone

from ..database.connection import Database
from ..database.types import EmbeddingJobRow

logger = logging.getLogger("ai_service.embeddings.jobs")


class EmbeddingJobManager:
    """Manages embedding job lifecycle. Synchronous for now, ready for async."""

    def __init__(self, db: Database):
        self.db = db

    async def create_job(self, document_id: str, model: str | None = None) -> EmbeddingJobRow:
        now = datetime.now(timezone.utc)
        job = EmbeddingJobRow(
            id=str(uuid.uuid4()),
            document_id=document_id,
            status="pending",
            embedding_model=model,
            created_at=now,
        )
        await self.db.execute(
            """INSERT INTO ai_embedding_jobs (id, document_id, status, embedding_model, created_at)
               VALUES ($1, $2, $3, $4, $5)""",
            job.id, job.document_id, job.status, job.embedding_model, job.created_at,
        )
        return job

    async def start_job(self, job_id: str) -> None:
        now = datetime.now(timezone.utc)
        await self.db.execute(
            "UPDATE ai_embedding_jobs SET status = 'running', started_at = $1 WHERE id = $2",
            now, job_id,
        )

    async def complete_job(self, job_id: str) -> None:
        now = datetime.now(timezone.utc)
        await self.db.execute(
            "UPDATE ai_embedding_jobs SET status = 'completed', completed_at = $1 WHERE id = $2",
            now, job_id,
        )

    async def fail_job(self, job_id: str, error: str) -> None:
        now = datetime.now(timezone.utc)
        await self.db.execute(
            "UPDATE ai_embedding_jobs SET status = 'failed', error_message = $1, completed_at = $2 WHERE id = $3",
            error, now, job_id,
        )

    async def get_pending_jobs(self, limit: int = 10) -> list[EmbeddingJobRow]:
        rows = await self.db.fetch(
            "SELECT * FROM ai_embedding_jobs WHERE status = 'pending' ORDER BY created_at LIMIT $1",
            limit,
        )
        return [self._row_to_job(r) for r in rows]

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
