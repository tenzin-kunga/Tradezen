from __future__ import annotations

import logging
from ..models.common import ToolResult

logger = logging.getLogger("ai_service.analytics_service")


class AnalyticsService:
    """Source-agnostic analytics. Dispatches by capability name."""

    def __init__(self, analytics_tool=None, sql_tool=None):
        self._tools = {}
        if analytics_tool:
            self._tools["analytics"] = analytics_tool
        if sql_tool:
            self._tools["sql"] = sql_tool

        self._dispatch: dict[str, tuple[str, str]] = {
            "win_rate": ("analytics", "get_win_rate"),
            "total_pnl": ("analytics", "get_total_pnl"),
            "drawdown": ("analytics", "get_drawdown"),
            "profit_factor": ("analytics", "get_profit_factor"),
            "expectancy": ("analytics", "get_expectancy"),
            "sharpe": ("analytics", "get_sharpe_ratio"),
            "best_weekday": ("analytics", "get_best_weekday"),
            "all_stats": ("analytics", "get_all_stats"),
            # SQL-specific
            "total_trades": ("sql", "get_total_trades"),
            "avg_win": ("sql", "get_avg_win"),
            "avg_loss": ("sql", "get_avg_loss"),
        }

    async def execute(self, capability: str, user_id: str) -> ToolResult:
        if capability not in self._dispatch:
            return ToolResult(
                tool_name="analytics",
                action=capability,
                content=f"Unknown capability: {capability}",
                confidence=0.0,
            )

        tool_name, method = self._dispatch[capability]
        tool = self._tools.get(tool_name)
        if not tool:
            return ToolResult(
                tool_name="analytics",
                action=capability,
                content=f"Tool '{tool_name}' not available",
                confidence=0.0,
            )

        try:
            return await getattr(tool, method)(user_id)
        except Exception as e:
            logger.warning(f"Analytics capability '{capability}' failed: {e}")
            return ToolResult(
                tool_name="analytics",
                action=capability,
                content=f"Error: {e}",
                confidence=0.0,
            )

    def capabilities(self) -> list[str]:
        return list(self._dispatch.keys())
