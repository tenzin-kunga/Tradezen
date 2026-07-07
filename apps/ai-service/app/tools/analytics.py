from __future__ import annotations

from ..repositories.trade_repository import TradeRepository
from ..models.common import ToolResult


class AnalyticsTool:
    """Deterministic trading analytics. Semantic methods, no SQL exposed."""

    name = "analytics"
    description = "Trading analytics: win rate, PnL, drawdown, expectancy, profit factor, Sharpe ratio, weekday performance."

    def __init__(self, trade_repo: TradeRepository):
        self.trade_repo = trade_repo

    async def get_win_rate(self, user_id: str) -> ToolResult:
        data = await self.trade_repo.get_analytics(user_id)
        return ToolResult(
            tool_name=self.name,
            action="get_win_rate",
            content=f"Win rate: {data.win_rate:.1f}% ({data.total_trades} trades)",
        )

    async def get_drawdown(self, user_id: str) -> ToolResult:
        data = await self.trade_repo.get_analytics(user_id)
        return ToolResult(
            tool_name=self.name,
            action="get_drawdown",
            content=f"Max drawdown: {data.max_drawdown:.1f}%",
        )

    async def get_profit_factor(self, user_id: str) -> ToolResult:
        data = await self.trade_repo.get_analytics(user_id)
        return ToolResult(
            tool_name=self.name,
            action="get_profit_factor",
            content=f"Profit factor: {data.profit_factor:.2f}",
        )

    async def get_sharpe_ratio(self, user_id: str) -> ToolResult:
        data = await self.trade_repo.get_analytics(user_id)
        return ToolResult(
            tool_name=self.name,
            action="get_sharpe_ratio",
            content=f"Sharpe ratio: {data.sharpe_ratio:.2f}",
        )

    async def get_expectancy(self, user_id: str) -> ToolResult:
        data = await self.trade_repo.get_analytics(user_id)
        return ToolResult(
            tool_name=self.name,
            action="get_expectancy",
            content=f"Expectancy: ${data.expectancy:.2f}",
        )

    async def get_total_pnl(self, user_id: str) -> ToolResult:
        data = await self.trade_repo.get_analytics(user_id)
        return ToolResult(
            tool_name=self.name,
            action="get_total_pnl",
            content=f"Total PnL: ${data.total_pnl:.2f}",
        )

    async def get_best_weekday(self, user_id: str) -> ToolResult:
        weekday_data = await self.trade_repo.get_weekday_performance(user_id)
        if weekday_data:
            best = max(weekday_data, key=lambda d: d.total_pnl)
            return ToolResult(
                tool_name=self.name,
                action="get_best_weekday",
                content=f"Best weekday: {best.day} (avg PnL: ${best.avg_pnl:.2f}, {best.trade_count} trades)",
            )
        return ToolResult(
            tool_name=self.name, action="get_best_weekday",
            content="No weekday data available", confidence=0.5,
        )

    async def get_all_stats(self, user_id: str) -> ToolResult:
        data = await self.trade_repo.get_analytics(user_id)
        weekday_data = await self.trade_repo.get_weekday_performance(user_id)
        lines = [
            f"Total trades: {data.total_trades}",
            f"Win rate: {data.win_rate:.1f}%",
            f"Total PnL: ${data.total_pnl:.2f}",
            f"Avg win: ${data.avg_win:.2f}",
            f"Avg loss: ${data.avg_loss:.2f}",
            f"Profit factor: {data.profit_factor:.2f}",
            f"Expectancy: ${data.expectancy:.2f}",
        ]
        if weekday_data:
            best = max(weekday_data, key=lambda d: d.total_pnl)
            lines.append(f"Best weekday: {best.day}")
        return ToolResult(
            tool_name=self.name, action="get_all_stats",
            content="\n".join(lines),
        )

    def get_schema(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "methods": [
                "get_win_rate", "get_drawdown", "get_profit_factor",
                "get_sharpe_ratio", "get_expectancy", "get_total_pnl",
                "get_best_weekday", "get_all_stats",
            ],
        }
