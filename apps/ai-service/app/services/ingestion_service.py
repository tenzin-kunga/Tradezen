from __future__ import annotations

import logging
from dataclasses import dataclass, field

from ..database.connection import Database
from ..repositories.document_repository import DocumentRepository
from ..repositories.vector_repository import VectorRepository
from ..repositories.trade_repository import TradeRepository
from ..repositories.journal_repository import JournalRepository
from ..embeddings.service import EmbeddingService
from .document_builders import TradeDocumentBuilder, JournalDocumentBuilder

logger = logging.getLogger("ai_service.ingestion")


@dataclass
class IngestionResult:
    scanned: int = 0
    created: int = 0
    skipped: int = 0
    failed: int = 0
    errors: list[str] = field(default_factory=list)


class IngestionService:
    """Reads trades/journals from main DB → builds documents → embeds → persists."""

    def __init__(
        self,
        db: Database,
        doc_repo: DocumentRepository,
        vector_repo: VectorRepository,
        trade_repo: TradeRepository,
        journal_repo: JournalRepository,
        embedding_service: EmbeddingService,
    ):
        self.db = db
        self.doc_repo = doc_repo
        self.vector_repo = vector_repo
        self.trade_repo = trade_repo
        self.journal_repo = journal_repo
        self.embedding_service = embedding_service
        self.trade_builder = TradeDocumentBuilder()
        self.journal_builder = JournalDocumentBuilder()

    async def ingest_trades(self, user_id: str) -> IngestionResult:
        result = IngestionResult()
        trades = await self.trade_repo.list_by_user(user_id, limit=10000)
        result.scanned = len(trades)

        for trade in trades:
            try:
                await self._ingest_one(
                    user_id=user_id,
                    source_type="trade",
                    source_id=trade.id,
                    content=self.trade_builder.build(trade).content,
                    metadata=self.trade_builder.build(trade).metadata,
                    result=result,
                )
            except Exception as e:
                result.failed += 1
                result.errors.append(f"trade:{trade.id}: {e}")
                logger.warning(f"Failed to ingest trade {trade.id}: {e}")

        logger.info(f"Ingested trades for {user_id}: {result.created} created, {result.skipped} skipped, {result.failed} failed")
        return result

    async def ingest_journals(self, user_id: str) -> IngestionResult:
        result = IngestionResult()
        journals = await self.journal_repo.list_by_user(user_id, limit=10000)
        result.scanned = len(journals)

        for journal in journals:
            try:
                doc = self.journal_builder.build(journal)
                await self._ingest_one(
                    user_id=user_id,
                    source_type="journal",
                    source_id=journal.id,
                    content=doc.content,
                    metadata=doc.metadata,
                    result=result,
                )
            except Exception as e:
                result.failed += 1
                result.errors.append(f"journal:{journal.id}: {e}")
                logger.warning(f"Failed to ingest journal {journal.id}: {e}")

        logger.info(f"Ingested journals for {user_id}: {result.created} created, {result.skipped} skipped, {result.failed} failed")
        return result

    async def ingest_all(self, user_id: str) -> dict[str, IngestionResult]:
        trades = await self.ingest_trades(user_id)
        journals = await self.ingest_journals(user_id)
        return {"trades": trades, "journals": journals}

    async def get_status(self, user_id: str) -> dict:
        doc_count = await self.db.fetchval(
            "SELECT COUNT(*) FROM ai_documents WHERE user_id = $1", user_id,
        )
        emb_count = await self.db.fetchval(
            "SELECT COUNT(*) FROM ai_embeddings e JOIN ai_documents d ON e.document_id = d.id WHERE d.user_id = $1", user_id,
        )
        last_row = await self.db.fetchrow(
            "SELECT MAX(updated_at) as last FROM ai_documents WHERE user_id = $1", user_id,
        )
        return {
            "documents": doc_count or 0,
            "embeddings": emb_count or 0,
            "last_ingestion": last_row["last"] if last_row and last_row["last"] else None,
        }

    async def _ingest_one(
        self,
        user_id: str,
        source_type: str,
        source_id: str,
        content: str,
        metadata: dict,
        result: IngestionResult,
    ) -> None:
        doc, created = await self.doc_repo.create_or_find(
            user_id=user_id,
            source_type=source_type,
            content=content,
            source_id=source_id,
            metadata=metadata,
        )

        if not created:
            result.skipped += 1
            return

        embedding = await self.embedding_service.generate_single(content)
        await self.vector_repo.insert(
            document_id=doc.id,
            embedding=embedding,
            model=self.embedding_service.get_model_info()["model"],
        )
        result.created += 1
