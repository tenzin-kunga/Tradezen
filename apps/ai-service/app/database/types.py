from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class TradeRow:
    id: str
    user_id: str
    symbol: str
    direction: str
    entry_price: float
    exit_price: float
    lot_size: float
    pnl: float
    stop_loss: float | None = None
    take_profit: float | None = None
    strategy: str | None = None
    notes: str | None = None
    trade_date: datetime | None = None
    created_at: datetime | None = None


@dataclass
class JournalRow:
    id: str
    user_id: str
    date: str
    pre_market_notes: str | None = None
    post_market_notes: str | None = None
    mood: str | None = None
    market_conditions: str | None = None
    lessons: str | None = None
    created_at: datetime | None = None


@dataclass
class DocumentRow:
    id: str
    user_id: str
    source_type: str
    source_id: str | None = None
    chunk_index: int = 0
    content: str = ""
    content_hash: str = ""
    metadata: dict = field(default_factory=dict)
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class EmbeddingRow:
    id: str
    document_id: str
    embedding: list[float] = field(default_factory=list)
    embedding_model: str = ""
    embedding_version: int = 1
    dimension: int = 1536
    created_at: datetime | None = None


@dataclass
class MemoryRow:
    id: str
    user_id: str
    document_id: str | None = None
    memory_type: str = ""
    importance: int = 5
    metadata: dict = field(default_factory=dict)
    expires_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class EmbeddingJobRow:
    id: str
    document_id: str
    status: str = "pending"  # pending, running, completed, failed
    embedding_model: str | None = None
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime | None = None


@dataclass
class TradeAnalytics:
    total_trades: int = 0
    win_rate: float = 0.0
    total_pnl: float = 0.0
    avg_win: float = 0.0
    avg_loss: float = 0.0
    profit_factor: float = 0.0
    max_drawdown: float = 0.0
    sharpe_ratio: float = 0.0
    expectancy: float = 0.0


@dataclass
class WeekdayPerformance:
    day: str
    total_pnl: float
    avg_pnl: float
    trade_count: int
    win_count: int


def content_hash(text: str) -> str:
    """SHA-256 hash of content for dedup."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
