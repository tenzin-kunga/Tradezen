from __future__ import annotations

from ..database.connection import Database
from ..models.common import ToolResult


class SQLTool:
    """Safe parameterized SQL execution. Read-only, semantic methods."""

    name = "sql"
    description = "Execute safe read-only SQL queries against trading data."

    def __init__(self, db: Database):
        self.db = db

    async def get_win_rate(self, user_id: str) -> ToolResult:
        row = await self.db.fetchrow(
            "SELECT COUNT(*) FILTER (WHERE pnl > 0) * 100.0 / NULLIF(COUNT(*), 0) as win_rate FROM trades WHERE user_id = $1",
            user_id,
        )
        return ToolResult(
            tool_name=self.name, action="get_win_rate",
            content=f"Win rate: {row['win_rate']:.1f}%" if row and row["win_rate"] else "No trades found",
        )

    async def get_total_trades(self, user_id: str) -> ToolResult:
        row = await self.db.fetchrow(
            "SELECT COUNT(*) as total FROM trades WHERE user_id = $1", user_id,
        )
        return ToolResult(
            tool_name=self.name, action="get_total_trades",
            content=f"Total trades: {row['total']}",
        )

    async def get_total_pnl(self, user_id: str) -> ToolResult:
        row = await self.db.fetchrow(
            "SELECT COALESCE(SUM(pnl), 0) as total_pnl FROM trades WHERE user_id = $1",
            user_id,
        )
        return ToolResult(
            tool_name=self.name, action="get_total_pnl",
            content=f"Total PnL: ${row['total_pnl']:.2f}",
        )

    async def get_avg_win(self, user_id: str) -> ToolResult:
        row = await self.db.fetchrow(
            "SELECT COALESCE(AVG(pnl), 0) as avg_win FROM trades WHERE user_id = $1 AND pnl > 0",
            user_id,
        )
        return ToolResult(
            tool_name=self.name, action="get_avg_win",
            content=f"Average win: ${row['avg_win']:.2f}",
        )

    async def get_avg_loss(self, user_id: str) -> ToolResult:
        row = await self.db.fetchrow(
            "SELECT COALESCE(AVG(pnl), 0) as avg_loss FROM trades WHERE user_id = $1 AND pnl < 0",
            user_id,
        )
        return ToolResult(
            tool_name=self.name, action="get_avg_loss",
            content=f"Average loss: ${row['avg_loss']:.2f}",
        )

    def get_schema(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "methods": [
                "get_win_rate", "get_total_trades", "get_total_pnl",
                "get_avg_win", "get_avg_loss",
            ],
        }
