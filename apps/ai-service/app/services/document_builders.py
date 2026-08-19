from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from ..database.types import TradeRow, JournalRow


@dataclass(frozen=True)
class Document:
    """Canonical ingestion contract. Builders produce these; persistence layer consumes them."""
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


class TradeDocumentBuilder:
    """Converts a TradeRow into an embedding-ready Document."""

    VERSION = 1

    def build(self, trade: TradeRow) -> Document:
        date_str = trade.trade_date.strftime("%Y-%m-%d") if trade.trade_date else "unknown date"
        pnl_sign = "+" if trade.pnl >= 0 else ""

        lines = [
            f"Trade: {trade.symbol} {trade.direction.upper()} on {date_str}",
        ]
        if trade.strategy:
            lines.append(f"Strategy: {trade.strategy}")
        lines.append(f"Entry: {trade.entry_price} → Exit: {trade.exit_price}")
        lines.append(f"PnL: {pnl_sign}{trade.pnl}")
        if trade.notes:
            lines.append(f"Notes: {trade.notes}")

        content = "\n".join(lines)

        metadata: dict[str, Any] = {
            "builder": "trade",
            "builder_version": self.VERSION,
            "entity": "trade",
            "entity_id": trade.id,
            "user_id": trade.user_id,
            "symbol": trade.symbol,
            "direction": trade.direction,
            "strategy": trade.strategy or "",
            "pnl": trade.pnl,
            "trade_date": date_str,
        }

        return Document(content=content, metadata=metadata)


class JournalDocumentBuilder:
    """Converts a JournalRow into an embedding-ready Document."""

    VERSION = 1

    def build(self, journal: JournalRow) -> Document:
        lines = [f"Journal: {journal.date}"]
        if journal.mood:
            lines.append(f"Mood: {journal.mood}")
        if journal.market_conditions:
            lines.append(f"Market conditions: {journal.market_conditions}")
        if journal.pre_market_notes:
            lines.append(f"Pre-market: {journal.pre_market_notes}")
        if journal.post_market_notes:
            lines.append(f"Post-market: {journal.post_market_notes}")
        if journal.lessons:
            lines.append(f"Lessons: {journal.lessons}")

        content = "\n".join(lines)

        metadata: dict[str, Any] = {
            "builder": "journal",
            "builder_version": self.VERSION,
            "entity": "journal",
            "entity_id": journal.id,
            "user_id": journal.user_id,
            "date": journal.date,
            "mood": journal.mood or "",
        }

        return Document(content=content, metadata=metadata)
