from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass
class ExecutionResult:
    content: str
    tool_calls: list[str] = field(default_factory=list)
    retrieved_docs: int = 0
    memory_hits: int = 0
    latency_ms: float = 0.0
    usage: dict[str, Any] = field(default_factory=dict)  # prompt_tokens, completion_tokens, total_tokens


class ExecutionStrategy(Protocol):
    """Protocol for execution strategies."""

    async def execute(
        self,
        user_id: str,
        query: str,
        conversation: list[dict],
        session,
    ) -> ExecutionResult: ...
