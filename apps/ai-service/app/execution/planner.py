from __future__ import annotations

from ..models.common import ExecutionMode


class ExecutionPlanner:
    """Selects execution strategy based on intent result."""

    def select(self, intent_result) -> ExecutionMode:
        if hasattr(intent_result, "execution"):
            return intent_result.execution
        return ExecutionMode.DIRECT
