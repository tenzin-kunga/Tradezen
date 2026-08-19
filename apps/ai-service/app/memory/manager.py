from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from ..database.connection import Database
from ..database.types import content_hash
from ..repositories.document_repository import DocumentRepository
from ..repositories.memory_repository import MemoryRepository
from ..repositories.vector_repository import VectorRepository
from ..embeddings.service import EmbeddingService

logger = logging.getLogger("ai_service.memory")


class MemoryManager:
    """Centralized memory management via documents + memories tables."""

    def __init__(
        self,
        db: Database,
        doc_repo: DocumentRepository,
        mem_repo: MemoryRepository,
        vector_repo: VectorRepository,
        embedding_service: EmbeddingService,
    ):
        self.db = db
        self.doc_repo = doc_repo
        self.mem_repo = mem_repo
        self.vector_repo = vector_repo
        self.embedding_service = embedding_service

    async def add_memory(
        self,
        user_id: str,
        content: str,
        memory_type: str = "fact",
        importance: int = 5,
        metadata: dict | None = None,
    ) -> str:
        doc, created = await self.doc_repo.create_or_find(
            user_id=user_id,
            source_type="memory",
            content=content,
            metadata=metadata,
        )
        if created:
            embedding = await self.embedding_service.generate_single(content)
            await self.vector_repo.insert(doc.id, embedding, self.embedding_service.model_info["model"])
            await self.mem_repo.create(
                user_id=user_id,
                memory_type=memory_type,
                content=content,
                document_id=doc.id,
                importance=importance,
                metadata=metadata,
            )
        return doc.id

    async def get_user_memories(self, user_id: str, memory_type: str | None = None) -> list:
        return await self.mem_repo.list_by_user(user_id, memory_type)

    async def delete_memory(self, memory_id: str) -> bool:
        mem = await self.mem_repo.get(memory_id)
        if mem and mem.document_id:
            await self.vector_repo.delete_by_document(mem.document_id)
            await self.doc_repo.delete(mem.document_id)
        return await self.mem_repo.delete(memory_id)
