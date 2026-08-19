from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from .models import RequestTrace


@dataclass(frozen=True)
class TraceQuery:
    """Generic query filters. Extensible without changing interface."""
    user_id: str | None = None
    intent: str | None = None
    limit: int = 50


class TracesRepository(Protocol):
    """Interface for trace storage. Swappable: memory → SQLite → Postgres → Jaeger."""

    async def save(self, trace: RequestTrace) -> None: ...
    async def get(self, request_id: str) -> RequestTrace | None: ...
    async def query(self, filters: TraceQuery | None = None) -> list[RequestTrace]: ...
