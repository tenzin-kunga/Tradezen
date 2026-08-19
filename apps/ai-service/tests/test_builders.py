from __future__ import annotations

import pytest
from datetime import datetime

from app.database.types import TradeRow, JournalRow
from app.services.document_builders import (
    Document,
    TradeDocumentBuilder,
    JournalDocumentBuilder,
)


class TestTradeDocumentBuilder:
    def setup_method(self):
        self.builder = TradeDocumentBuilder()

    def test_version(self):
        assert self.builder.VERSION == 1

    def test_full_trade(self):
        trade = TradeRow(
            id="t1", user_id="u1", symbol="EURUSD", direction="LONG",
            entry_price=1.085, exit_price=1.092, lot_size=1.0, pnl=700.0,
            strategy="SMC", notes="Clean break of structure",
            trade_date=datetime(2024, 1, 15),
        )
        doc = self.builder.build(trade)
        assert isinstance(doc, Document)
        assert "EURUSD" in doc.content
        assert "LONG" in doc.content
        assert "SMC" in doc.content
        assert "+700" in doc.content
        assert "Clean break of structure" in doc.content
        assert "2024-01-15" in doc.content

    def test_metadata(self):
        trade = TradeRow(
            id="t1", user_id="u1", symbol="EURUSD", direction="LONG",
            entry_price=1.085, exit_price=1.092, lot_size=1.0, pnl=700.0,
            strategy="SMC", trade_date=datetime(2024, 1, 15),
        )
        doc = self.builder.build(trade)
        assert doc.metadata["builder"] == "trade"
        assert doc.metadata["builder_version"] == 1
        assert doc.metadata["entity"] == "trade"
        assert doc.metadata["entity_id"] == "t1"
        assert doc.metadata["user_id"] == "u1"
        assert doc.metadata["symbol"] == "EURUSD"
        assert doc.metadata["direction"] == "LONG"
        assert doc.metadata["strategy"] == "SMC"

    def test_no_strategy_no_notes(self):
        trade = TradeRow(
            id="t2", user_id="u1", symbol="GBPUSD", direction="SHORT",
            entry_price=1.27, exit_price=1.265, lot_size=0.5, pnl=250.0,
        )
        doc = self.builder.build(trade)
        assert "Strategy:" not in doc.content
        assert "Notes:" not in doc.content
        assert "GBPUSD" in doc.content
        assert "+250" in doc.content

    def test_negative_pnl(self):
        trade = TradeRow(
            id="t3", user_id="u1", symbol="USDJPY", direction="LONG",
            entry_price=150.0, exit_price=149.5, lot_size=1.0, pnl=-500.0,
            trade_date=datetime(2024, 2, 1),
        )
        doc = self.builder.build(trade)
        assert "-500" in doc.content
        # No + sign for negative
        assert "+-500" not in doc.content

    def test_frozen(self):
        trade = TradeRow(
            id="t1", user_id="u1", symbol="EURUSD", direction="LONG",
            entry_price=1.085, exit_price=1.092, lot_size=1.0, pnl=700.0,
        )
        doc = self.builder.build(trade)
        with pytest.raises(AttributeError):
            doc.content = "modified"


class TestJournalDocumentBuilder:
    def setup_method(self):
        self.builder = JournalDocumentBuilder()

    def test_version(self):
        assert self.builder.VERSION == 1

    def test_full_journal(self):
        journal = JournalRow(
            id="j1", user_id="u1", date="2024-01-15",
            mood="confident", market_conditions="trending",
            pre_market_notes="Watching EURUSD", post_market_notes="Took the long",
            lessons="Stayed patient",
        )
        doc = self.builder.build(journal)
        assert isinstance(doc, Document)
        assert "2024-01-15" in doc.content
        assert "confident" in doc.content
        assert "Watching EURUSD" in doc.content
        assert "Took the long" in doc.content
        assert "Stayed patient" in doc.content

    def test_metadata(self):
        journal = JournalRow(
            id="j1", user_id="u1", date="2024-01-15", mood="confident",
        )
        doc = self.builder.build(journal)
        assert doc.metadata["builder"] == "journal"
        assert doc.metadata["builder_version"] == 1
        assert doc.metadata["entity"] == "journal"
        assert doc.metadata["entity_id"] == "j1"
        assert doc.metadata["user_id"] == "u1"
        assert doc.metadata["date"] == "2024-01-15"
        assert doc.metadata["mood"] == "confident"

    def test_minimal_journal(self):
        journal = JournalRow(id="j2", user_id="u1", date="2024-01-16")
        doc = self.builder.build(journal)
        assert "2024-01-16" in doc.content
        assert "Mood:" not in doc.content
        assert "Pre-market:" not in doc.content

    def test_frozen(self):
        journal = JournalRow(id="j1", user_id="u1", date="2024-01-15")
        doc = self.builder.build(journal)
        with pytest.raises(AttributeError):
            doc.content = "modified"
