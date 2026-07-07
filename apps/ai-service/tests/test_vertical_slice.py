from __future__ import annotations

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from app.services.document_builders import TradeDocumentBuilder, JournalDocumentBuilder, Document
from app.services.ingestion_service import IngestionService, IngestionResult
from app.models.context import Context
from app.models.common import RetrievedDocument
from app.database.types import TradeRow, JournalRow


class TestDocumentBuilders:
    """Phase 1: Builders produce correct content and metadata."""

    def test_trade_to_document(self):
        trade = TradeRow(
            id="t1", user_id="u1", symbol="EURUSD", direction="LONG",
            entry_price=1.085, exit_price=1.092, lot_size=1.0, pnl=700.0,
            strategy="SMC", notes="Clean break", trade_date=datetime(2024, 1, 15),
        )
        doc = TradeDocumentBuilder().build(trade)
        assert isinstance(doc, Document)
        assert "EURUSD" in doc.content
        assert doc.metadata["entity"] == "trade"
        assert doc.metadata["builder_version"] == 1

    def test_journal_to_document(self):
        journal = JournalRow(
            id="j1", user_id="u1", date="2024-01-15",
            mood="confident", pre_market_notes="Watching EURUSD",
        )
        doc = JournalDocumentBuilder().build(journal)
        assert isinstance(doc, Document)
        assert "confident" in doc.content
        assert doc.metadata["entity"] == "journal"


class TestIngestionService:
    """Phase 1: Ingestion orchestrates doc → embed → persist."""

    @pytest.mark.asyncio
    async def test_ingest_trades_creates_documents(self):
        mock_db = MagicMock()
        mock_doc_repo = AsyncMock()
        mock_vec_repo = AsyncMock()
        mock_trade_repo = AsyncMock()
        mock_journal_repo = AsyncMock()
        mock_embed = AsyncMock()
        mock_embed.generate_single = AsyncMock(return_value=[0.1] * 768)
        mock_embed.get_model_info = MagicMock(return_value={"model": "nomic-embed-text"})

        trade = TradeRow(
            id="t1", user_id="u1", symbol="EURUSD", direction="LONG",
            entry_price=1.085, exit_price=1.092, lot_size=1.0, pnl=700.0,
        )
        mock_trade_repo.list_by_user = AsyncMock(return_value=[trade])
        mock_doc_repo.create_or_find = AsyncMock(return_value=(MagicMock(id="doc1"), True))

        svc = IngestionService(mock_db, mock_doc_repo, mock_vec_repo, mock_trade_repo, mock_journal_repo, mock_embed)
        result = await svc.ingest_trades("u1")

        assert result.scanned == 1
        assert result.created == 1
        assert result.skipped == 0
        mock_doc_repo.create_or_find.assert_called_once()
        mock_embed.generate_single.assert_called_once()
        mock_vec_repo.insert.assert_called_once()

    @pytest.mark.asyncio
    async def test_ingest_skips_unchanged(self):
        mock_db = MagicMock()
        mock_doc_repo = AsyncMock()
        mock_vec_repo = AsyncMock()
        mock_trade_repo = AsyncMock()
        mock_journal_repo = AsyncMock()
        mock_embed = AsyncMock()

        trade = TradeRow(
            id="t1", user_id="u1", symbol="EURUSD", direction="LONG",
            entry_price=1.085, exit_price=1.092, lot_size=1.0, pnl=700.0,
        )
        mock_trade_repo.list_by_user = AsyncMock(return_value=[trade])
        mock_doc_repo.create_or_find = AsyncMock(return_value=(MagicMock(id="doc1"), False))

        svc = IngestionService(mock_db, mock_doc_repo, mock_vec_repo, mock_trade_repo, mock_journal_repo, mock_embed)
        result = await svc.ingest_trades("u1")

        assert result.scanned == 1
        assert result.skipped == 1
        assert result.created == 0
        mock_embed.generate_single.assert_not_called()

    @pytest.mark.asyncio
    async def test_ingest_result_counts(self):
        mock_db = MagicMock()
        mock_doc_repo = AsyncMock()
        mock_vec_repo = AsyncMock()
        mock_trade_repo = AsyncMock()
        mock_journal_repo = AsyncMock()
        mock_embed = AsyncMock()
        mock_embed.generate_single = AsyncMock(return_value=[0.1] * 768)
        mock_embed.get_model_info = MagicMock(return_value={"model": "nomic-embed-text"})

        trades = [
            TradeRow(id=f"t{i}", user_id="u1", symbol="EURUSD", direction="LONG",
                     entry_price=1.0, exit_price=1.1, lot_size=1.0, pnl=100.0)
            for i in range(5)
        ]
        mock_trade_repo.list_by_user = AsyncMock(return_value=trades)
        # First 2 created, next 2 skipped, last one fails
        mock_doc_repo.create_or_find = AsyncMock(side_effect=[
            (MagicMock(id="d0"), True),
            (MagicMock(id="d1"), True),
            (MagicMock(id="d2"), False),
            (MagicMock(id="d3"), False),
            Exception("embed fail"),
        ])

        svc = IngestionService(mock_db, mock_doc_repo, mock_vec_repo, mock_trade_repo, mock_journal_repo, mock_embed)
        result = await svc.ingest_trades("u1")

        assert result.scanned == 5
        assert result.created == 2
        assert result.skipped == 2
        assert result.failed == 1
        assert len(result.errors) == 1


class TestContext:
    """Phase 3: Context is immutable after construction."""

    def test_context_frozen(self):
        ctx = Context(
            user_id="u1", query="test", messages=[{"role": "user", "content": "test"}],
            model="qwen3:latest",
        )
        with pytest.raises(AttributeError):
            ctx.query = "modified"

    def test_context_defaults(self):
        ctx = Context(user_id="u1", query="test")
        assert ctx.messages == []
        assert ctx.retrieved_docs == []
        assert ctx.memories == []
        assert ctx.temperature == 0.4


class TestVerticalSlice:
    """Integration: ingestion → retrieval → context → response flow."""

    @pytest.mark.asyncio
    async def test_full_flow_mocked(self):
        """Simulates: trade exists → ingest → query → retrieve → build context."""
        # 1. Trade exists in DB
        trade = TradeRow(
            id="t1", user_id="u1", symbol="EURUSD", direction="LONG",
            entry_price=1.085, exit_price=1.092, lot_size=1.0, pnl=700.0,
            strategy="SMC", trade_date=datetime(2024, 1, 15),
        )

        # 2. Builder produces document
        doc = TradeDocumentBuilder().build(trade)
        assert "EURUSD" in doc.content
        assert doc.metadata["entity"] == "trade"

        # 3. Simulate retrieval returns this document with content
        retrieved = RetrievedDocument(
            document_id="doc1",
            source_type="trade",
            source_id="t1",
            content=doc.content,
            score=0.92,
            metadata=doc.metadata,
        )

        # 4. Build context with retrieved doc
        ctx = Context(
            user_id="u1",
            query="What was my EURUSD trade?",
            messages=[{"role": "user", "content": "What was my EURUSD trade?"}],
            retrieved_docs=[retrieved],
            model="qwen3:latest",
        )

        # 5. Verify context has the right data including content
        assert len(ctx.retrieved_docs) == 1
        assert ctx.retrieved_docs[0].source_type == "trade"
        assert "EURUSD" in ctx.retrieved_docs[0].content
        assert ctx.retrieved_docs[0].score == 0.92
        assert len(ctx.retrieved_docs[0].content) > 0


class TestContextBudget:
    """Phase 6A: Budget manager truncates over-budget sections."""

    def test_no_truncation_when_under_budget(self):
        from app.prompts.budget import ContextBudgetManager
        budget = ContextBudgetManager(max_tokens=8000)
        sections = {"documents": "short text", "memories": "also short"}
        result = budget.allocate({k: budget.estimate_tokens(v) for k, v in sections.items()})
        assert result["documents"] >= budget.estimate_tokens("short text")

    def test_truncation_when_over_budget(self):
        from app.prompts.budget import ContextBudgetManager
        budget = ContextBudgetManager(max_tokens=100)
        big_text = "word " * 2000  # ~1000 tokens
        sections = {"documents": big_text, "memories": "short"}
        tokens = {k: budget.estimate_tokens(v) for k, v in sections.items()}
        result = budget.allocate(tokens)
        # Big section should be reduced
        assert result["documents"] < tokens["documents"]
        # Small section gets min 100 (budget floor)
        assert result["memories"] >= 100

    def test_estimate_tokens(self):
        from app.prompts.budget import ContextBudgetManager
        budget = ContextBudgetManager()
        assert budget.estimate_tokens("hello world") == 2  # 11 chars / 4 = 2
