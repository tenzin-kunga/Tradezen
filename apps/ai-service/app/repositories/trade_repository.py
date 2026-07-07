from __future__ import annotations

from ..database.connection import Database
from ..database.types import TradeRow, TradeAnalytics, WeekdayPerformance


class TradeRepository:
    """Read-only trade queries for RAG retrieval."""

    def __init__(self, db: Database):
        self.db = db

    async def list_by_user(self, user_id: str, limit: int = 100) -> list[TradeRow]:
        rows = await self.db.fetch(
            "SELECT * FROM trades WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
            user_id, limit,
        )
        return [self._row_to_trade(r) for r in rows]

    async def get(self, trade_id: str) -> TradeRow | None:
        row = await self.db.fetchrow("SELECT * FROM trades WHERE id = $1", trade_id)
        return self._row_to_trade(row) if row else None

    async def search_by_symbol(self, user_id: str, symbol: str) -> list[TradeRow]:
        rows = await self.db.fetch(
            "SELECT * FROM trades WHERE user_id = $1 AND UPPER(symbol) = UPPER($2) ORDER BY created_at DESC",
            user_id, symbol,
        )
        return [self._row_to_trade(r) for r in rows]

    async def get_analytics(self, user_id: str) -> TradeAnalytics:
        row = await self.db.fetchrow(
            """SELECT
                COUNT(*) as total_trades,
                COALESCE(SUM(pnl), 0) as total_pnl,
                COALESCE(AVG(pnl), 0) as avg_pnl,
                COUNT(*) FILTER (WHERE pnl > 0) as wins,
                COUNT(*) FILTER (WHERE pnl <= 0) as losses,
                COALESCE(AVG(pnl) FILTER (WHERE pnl > 0), 0) as avg_win,
                COALESCE(AVG(pnl) FILTER (WHERE pnl < 0), 0) as avg_loss
            FROM trades WHERE user_id = $1""",
            user_id,
        )
        total = row["total_trades"]
        wins = row["wins"]
        win_rate = (wins / total * 100) if total > 0 else 0
        gross_profit = abs(row["avg_win"] * wins) if wins > 0 else 0
        gross_loss = abs(row["avg_loss"] * (total - wins)) if (total - wins) > 0 else 0
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0
        expectancy = (
            (row["avg_win"] * win_rate / 100) + (row["avg_loss"] * (1 - win_rate / 100))
        )
        return TradeAnalytics(
            total_trades=total,
            win_rate=win_rate,
            total_pnl=row["total_pnl"],
            avg_win=row["avg_win"],
            avg_loss=row["avg_loss"],
            profit_factor=profit_factor,
            expectancy=expectancy,
        )

    async def get_weekday_performance(self, user_id: str) -> list[WeekdayPerformance]:
        rows = await self.db.fetch(
            """SELECT
                TO_CHAR(created_at, 'Day') as day,
                COALESCE(SUM(pnl), 0) as total_pnl,
                COALESCE(AVG(pnl), 0) as avg_pnl,
                COUNT(*) as trade_count,
                COUNT(*) FILTER (WHERE pnl > 0) as win_count
            FROM trades WHERE user_id = $1
            GROUP BY TO_CHAR(created_at, 'Day'), EXTRACT(DOW FROM created_at)
            ORDER BY EXTRACT(DOW FROM created_at)""",
            user_id,
        )
        return [
            WeekdayPerformance(
                day=r["day"].strip(),
                total_pnl=r["total_pnl"],
                avg_pnl=r["avg_pnl"],
                trade_count=r["trade_count"],
                win_count=r["win_count"],
            )
            for r in rows
        ]

    async def get_recent(self, user_id: str, limit: int = 5) -> list[TradeRow]:
        rows = await self.db.fetch(
            "SELECT * FROM trades WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
            user_id, limit,
        )
        return [self._row_to_trade(r) for r in rows]

    def _row_to_trade(self, row) -> TradeRow:
        return TradeRow(
            id=str(row["id"]),
            user_id=str(row["user_id"]),
            symbol=row["symbol"],
            direction=row.get("direction", ""),
            entry_price=float(row.get("entry_price", 0)),
            exit_price=float(row.get("exit_price", 0)),
            lot_size=float(row.get("lot_size", 0)),
            pnl=float(row.get("pnl", 0)),
            stop_loss=float(row["stop_loss"]) if row.get("stop_loss") else None,
            take_profit=float(row["take_profit"]) if row.get("take_profit") else None,
            strategy=row.get("strategy"),
            notes=row.get("notes"),
            trade_date=row.get("trade_date"),
            created_at=row.get("created_at"),
        )
