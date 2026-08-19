from __future__ import annotations

import json
import logging
import time

from .base import ExecutionResult

MAX_ITERATIONS = 5

logger = logging.getLogger("ai_service.execution.tool")


class ToolExecutionStrategy:
    """LLM decides when to call tools, loops until done. No LangGraph."""

    def __init__(self, analytics_tool, sql_tool, completion_service, prompt_builder):
        self.analytics_tool = analytics_tool
        self.sql_tool = sql_tool
        self.completion = completion_service
        self.prompt_builder = prompt_builder

    async def execute(
        self, user_id: str, query: str, conversation: list[dict], session,
    ) -> ExecutionResult:
        start = time.monotonic()
        tool_calls_made: list[str] = []
        tool_results: list = []

        system = {
            "role": "system",
            "content": self._build_tool_system_prompt(),
        }
        messages = [system] + conversation

        for i in range(MAX_ITERATIONS):
            result = await self.completion.complete(session, messages)

            tool_call = self._parse_tool_call(result["content"])
            if not tool_call:
                elapsed = (time.monotonic() - start) * 1000
                return ExecutionResult(
                    content=result["content"],
                    tool_calls=tool_calls_made,
                    latency_ms=elapsed,
                )

            tool_result = await self._run_tool(user_id, tool_call)
            if tool_result:
                tool_calls_made.append(tool_call)
                tool_results.append(tool_result)
                messages.append({
                    "role": "user",
                    "content": f"Tool result ({tool_call}): {tool_result}",
                })
            else:
                messages.append({
                    "role": "user",
                    "content": f"Tool '{tool_call}' not available. Available tools: win_rate, total_pnl, drawdown, expectancy, profit_factor, best_weekday, total_trades, avg_win, avg_loss, sharpe_ratio.",
                })

        elapsed = (time.monotonic() - start) * 1000
        final = await self.completion.complete(session, messages)
        return ExecutionResult(
            content=final["content"],
            tool_calls=tool_calls_made,
            latency_ms=elapsed,
        )

    def _build_tool_system_prompt(self) -> str:
        methods = []
        if self.analytics_tool:
            schema = self.analytics_tool.get_schema()
            methods.extend(schema.get("methods", []))
        return (
            "You have access to analytics tools. "
            "When you need data, respond with TOOL: <method_name>. "
            "The user will provide the result, then you continue. "
            "When you have your final answer, respond without TOOL prefix. "
            f"Available tools: {', '.join(methods)}."
        )

    def _parse_tool_call(self, content: str) -> str | None:
        content = content.strip()
        if content.startswith("TOOL:"):
            return content[5:].strip().split("\n")[0].strip()
        if "TOOL:" in content:
            import re
            m = re.search(r"TOOL:\s*(\S+)", content)
            if m:
                return m.group(1)
        return None

    async def _run_tool(self, user_id: str, method: str) -> str | None:
        for tool in [self.analytics_tool, self.sql_tool]:
            if tool and hasattr(tool, method):
                try:
                    fn = getattr(tool, method)
                    result = await fn(user_id)
                    return result.content
                except Exception as e:
                    logger.warning(f"Tool {method} failed: {e}")
        return None
