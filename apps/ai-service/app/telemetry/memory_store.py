from __future__ import annotations

from collections import deque

from .models import RequestTrace
from .repository import TraceQuery
from .models import Stage


class InMemoryTracesStore:
    """In-memory trace store. Swappable via TracesRepository interface."""

    def __init__(self, max_traces: int = 1000):
        self._traces: deque[RequestTrace] = deque(maxlen=max_traces)

    async def save(self, trace: RequestTrace):
        self._traces.append(trace)

    async def get(self, request_id: str) -> RequestTrace | None:
        for t in reversed(self._traces):
            if t.request_id == request_id:
                return t
        return None

    async def query(self, filters: TraceQuery | None = None) -> list[RequestTrace]:
        result = list(self._traces)
        if filters:
            if filters.user_id:
                result = [t for t in result if t.user_id == filters.user_id]
            if filters.intent:
                result = [t for t in result if any(
                    s.attributes.get("intent") == filters.intent for s in t.spans
                )]
        limit = filters.limit if filters else 50
        return result[-limit:]
