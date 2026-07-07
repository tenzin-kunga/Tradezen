from __future__ import annotations

import uuid
from datetime import datetime, timezone

from ..database.connection import Database
from ..database.types import EmbeddingRow


class VectorRepository:
    """pgvector search over ai_embeddings."""

    def __init__(self, db: Database):
        self.db = db

    async def insert(self, document_id: str, embedding: list[float], model: str, version: int = 1) -> EmbeddingRow:
        now = datetime.now(timezone.utc)
        embedding_row = EmbeddingRow(
            id=str(uuid.uuid4()),
            document_id=document_id,
            embedding=embedding,
            embedding_model=model,
            embedding_version=version,
            dimension=len(embedding),
            created_at=now,
        )
        vec_str = "[" + ",".join(str(x) for x in embedding) + "]"
        await self.db.execute(
            """INSERT INTO ai_embeddings (id, document_id, embedding, embedding_model, embedding_version, dimension, created_at)
               VALUES ($1, $2, $3::vector, $4, $5, $6, $7)""",
            embedding_row.id, document_id, vec_str, model, version, len(embedding), now,
        )
        return embedding_row

    async def search(
        self,
        user_id: str,
        query_embedding: list[float],
        limit: int = 10,
        min_score: float = 0.5,
        source_types: list[str] | None = None,
    ) -> list[dict]:
        vec_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
        source_filter = ""
        params: list = [user_id, vec_str, limit, min_score]
        if source_types:
            placeholders = ",".join(f"${i}" for i in range(5, 5 + len(source_types)))
            source_filter = f"AND d.source_type IN ({placeholders})"
            params.extend(source_types)

        query = f"""
            SELECT
                d.id as document_id,
                d.source_type,
                d.source_id,
                d.chunk_index,
                d.content,
                d.metadata,
                e.embedding_model,
                1 - (e.embedding <=> $2::vector) as score
            FROM ai_embeddings e
            JOIN ai_documents d ON e.document_id = d.id
            WHERE d.user_id = $1
              AND 1 - (e.embedding <=> $2::vector) >= $4
              {source_filter}
            ORDER BY e.embedding <=> $2::vector
            LIMIT $3
        """
        rows = await self.db.fetch(query, *params)
        return [
            {
                "document_id": str(r["document_id"]),
                "source_type": r["source_type"],
                "source_id": str(r["source_id"]) if r.get("source_id") else None,
                "chunk_index": r.get("chunk_index", 0),
                "content": r.get("content", "") or "",
                "metadata": r.get("metadata", {}),
                "embedding_model": r.get("embedding_model", ""),
                "score": float(r["score"]),
            }
            for r in rows
        ]

    async def delete_by_document(self, document_id: str) -> bool:
        result = await self.db.execute(
            "DELETE FROM ai_embeddings WHERE document_id = $1", document_id
        )
        return "DELETE" in result

    async def count(self, user_id: str) -> int:
        return await self.db.fetchval(
            """SELECT COUNT(*) FROM ai_embeddings e
               JOIN ai_documents d ON e.document_id = d.id
               WHERE d.user_id = $1""",
            user_id,
        )
