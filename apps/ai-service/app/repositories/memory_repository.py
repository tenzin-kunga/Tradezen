from __future__ import annotations

import uuid
from datetime import datetime, timezone
import json

from ..database.connection import Database
from ..database.types import MemoryRow


class MemoryRepository:
    """CRUD for ai_memories."""

    def __init__(self, db: Database):
        self.db = db

    async def create(
        self,
        user_id: str,
        memory_type: str,
        content: str,
        document_id: str | None = None,
        importance: int = 5,
        metadata: dict | None = None,
        expires_at=None,
    ) -> MemoryRow:
        now = datetime.now(timezone.utc)
        mem = MemoryRow(
            id=str(uuid.uuid4()),
            user_id=user_id,
            document_id=document_id,
            memory_type=memory_type,
            importance=importance,
            metadata=metadata or {},
            expires_at=expires_at,
            created_at=now,
            updated_at=now,
        )
        meta_json = json.dumps(mem.metadata)
        await self.db.execute(
            """INSERT INTO ai_memories (id, user_id, document_id, memory_type, importance, metadata, expires_at, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
            mem.id, mem.user_id, mem.document_id, mem.memory_type,
            mem.importance, meta_json, mem.expires_at, mem.created_at, mem.updated_at,
        )
        return mem

    async def get(self, memory_id: str) -> MemoryRow | None:
        row = await self.db.fetchrow("SELECT * FROM ai_memories WHERE id = $1", memory_id)
        return self._row_to_mem(row) if row else None

    async def list_by_user(self, user_id: str, memory_type: str | None = None) -> list[MemoryRow]:
        if memory_type:
            rows = await self.db.fetch(
                "SELECT * FROM ai_memories WHERE user_id = $1 AND memory_type = $2 ORDER BY importance DESC, created_at DESC",
                user_id, memory_type,
            )
        else:
            rows = await self.db.fetch(
                "SELECT * FROM ai_memories WHERE user_id = $1 ORDER BY importance DESC, created_at DESC",
                user_id,
            )
        return [self._row_to_mem(r) for r in rows]

    async def update(self, memory_id: str, **kwargs) -> MemoryRow | None:
        allowed = {"importance", "memory_type", "metadata", "expires_at"}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return await self.get(memory_id)
        now = datetime.now(timezone.utc)
        set_clauses = []
        params = []
        for i, (k, v) in enumerate(updates.items(), 1):
            if k == "metadata":
                v = json.dumps(v)
            set_clauses.append(f"{k} = ${i}")
            params.append(v)
        set_clauses.append(f"updated_at = ${len(params) + 1}")
        params.append(now)
        params.append(memory_id)
        await self.db.execute(
            f"UPDATE ai_memories SET {', '.join(set_clauses)} WHERE id = ${len(params)}",
            *params,
        )
        return await self.get(memory_id)

    async def delete(self, memory_id: str) -> bool:
        result = await self.db.execute("DELETE FROM ai_memories WHERE id = $1", memory_id)
        return result == "DELETE 1"

    def _row_to_mem(self, row) -> MemoryRow:
        meta = row.get("metadata", {})
        if isinstance(meta, str):
            meta = json.loads(meta)
        return MemoryRow(
            id=str(row["id"]),
            user_id=str(row["user_id"]),
            document_id=str(row["document_id"]) if row.get("document_id") else None,
            memory_type=row.get("memory_type", ""),
            importance=row.get("importance", 5),
            metadata=meta,
            expires_at=row.get("expires_at"),
            created_at=row.get("created_at"),
            updated_at=row.get("updated_at"),
        )
