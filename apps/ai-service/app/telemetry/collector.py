from __future__ import annotations

import time
from typing import Any

from ..models.common import SessionMetrics


class TelemetryCollector:
    """Stores per-request telemetry. Export to monitoring later."""

    def __init__(self):
        self._records: list[dict[str, Any]] = []

    def record(self, metrics: SessionMetrics):
        self._records.append(
            {
                "request_id": metrics.request_id,
                "provider": metrics.provider,
                "model": metrics.model,
                "latency_ms": metrics.latency_ms,
                "retrieval_ms": metrics.retrieval_ms,
                "prompt_tokens": metrics.prompt_tokens,
                "completion_tokens": metrics.completion_tokens,
                "tool_calls": metrics.tool_calls,
                "retrieved_docs": metrics.retrieved_docs,
                "used_docs": metrics.used_docs,
                "cache_hit": metrics.cache_hit,
                "memory_hit": metrics.memory_hit,
                "intent": metrics.intent,
                "intent_confidence": metrics.intent_confidence,
                "cost_usd": metrics.cost_usd,
                "timestamp": time.time(),
            }
        )

    def recent(self, limit: int = 100) -> list[dict]:
        return self._records[-limit:]

    async def flush(self):
        """Flush collected telemetry. Override to export to monitoring."""
        count = len(self._records)
        if count > 0:
            self._records.clear()
