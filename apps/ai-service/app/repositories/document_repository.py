from __future__ import annotations

import uuid
import json
from datetime import datetime, timezone

from ..database.connection import Database
from ..database.types import DocumentRow, content_hash


class DocumentRepository:
    """CRUD for ai_documents. Checks content_hash to skip re-embedding."""

    def __init__(self, db: Database):
        self.db = db

    async def create_or_find(
        self,
        user_id: str,
        source_type: str,
        content: str,
        source_id: str | None = None,
        chunk_index: int = 0,
        metadata: dict | None = None,
    ) -> tuple[DocumentRow, bool]:
        """Returns (document, was_created). Skips if content_hash unchanged."""
        h = content_hash(content)
        existing = await self.db.fetchrow(
            "SELECT * FROM ai_documents WHERE user_id = $1 AND source_type = $2 AND source_id = $3 AND chunk_index = $4",
            user_id, source_type, source_id, chunk_index,
        )
        if existing and existing["content_hash"] == h:
            return self._row_to_doc(existing), False

        if existing:
            now = datetime.now(timezone.utc)
            meta = metadata or existing.get("metadata", {})
            if isinstance(meta, str):
                meta = json.loads(meta)
            meta.update(metadata or {})
            doc = DocumentRow(
                id=str(existing["id"]),
                user_id=user_id,
                source_type=source_type,
                source_id=source_id,
                chunk_index=chunk_index,
                content=content,
                content_hash=h,
                metadata=meta,
                created_at=existing.get("created_at"),
                updated_at=now,
            )
            await self.db.execute(
                "UPDATE ai_documents SET content = $1, content_hash = $2, metadata = $3, updated_at = $4 WHERE id = $5",
                content, h, json.dumps(meta), now, doc.id,
            )
            return doc, True

        now = datetime.now(timezone.utc)
        doc = DocumentRow(
            id=str(uuid.uuid4()),
            user_id=user_id,
            source_type=source_type,
            source_id=source_id,
            chunk_index=chunk_index,
            content=content,
            content_hash=h,
            metadata=metadata or {},
            created_at=now,
            updated_at=now,
        )
        meta_json = json.dumps(doc.metadata)
        await self.db.execute(
            """INSERT INTO ai_documents (id, user_id, source_type, source_id, chunk_index, content, content_hash, metadata, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)""",
            doc.id, doc.user_id, doc.source_type, doc.source_id, doc.chunk_index,
            doc.content, doc.content_hash, meta_json, doc.created_at, doc.updated_at,
        )
        return doc, True

    async def get(self, document_id: str) -> DocumentRow | None:
        row = await self.db.fetchrow("SELECT * FROM ai_documents WHERE id = $1", document_id)
        return self._row_to_doc(row) if row else None

    async def get_by_source(self, user_id: str, source_type: str, source_id: str) -> DocumentRow | None:
        row = await self.db.fetchrow(
            "SELECT * FROM ai_documents WHERE user_id = $1 AND source_type = $2 AND source_id = $3",
            user_id, source_type, source_id,
        )
        return self._row_to_doc(row) if row else None

    async def list_by_source(self, user_id: str, source_type: str, source_id: str) -> list[DocumentRow]:
        rows = await self.db.fetch(
            "SELECT * FROM ai_documents WHERE user_id = $1 AND source_type = $2 AND source_id = $3",
            user_id, source_type, source_id,
        )
        return [self._row_to_doc(r) for r in rows]

    async def list_by_user(self, user_id: str, source_type: str | None = None) -> list[DocumentRow]:
        if source_type:
            rows = await self.db.fetch(
                "SELECT * FROM ai_documents WHERE user_id = $1 AND source_type = $2 ORDER BY created_at DESC",
                user_id, source_type,
            )
        else:
            rows = await self.db.fetch(
                "SELECT * FROM ai_documents WHERE user_id = $1 ORDER BY created_at DESC",
                user_id,
            )
        return [self._row_to_doc(r) for r in rows]

    async def delete(self, document_id: str) -> bool:
        result = await self.db.execute("DELETE FROM ai_documents WHERE id = $1", document_id)
        return result == "DELETE 1"

    def _row_to_doc(self, row) -> DocumentRow:
        meta = row.get("metadata", {})
        if isinstance(meta, str):
            meta = json.loads(meta)
        return DocumentRow(
            id=str(row["id"]),
            user_id=str(row["user_id"]),
            source_type=row["source_type"],
            source_id=str(row["source_id"]) if row.get("source_id") else None,
            chunk_index=row.get("chunk_index", 0),
            content=row.get("content", "") or "",
            content_hash=row.get("content_hash", ""),
            metadata=meta,
            created_at=row.get("created_at"),
            updated_at=row.get("updated_at"),
        )
