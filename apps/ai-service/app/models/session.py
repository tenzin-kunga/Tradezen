from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, AsyncIterator

from .common import (
    Intent,
    Memory,
    RetrievedDocument,
    SessionMetrics,
    TokenBudget,
    ToolResult,
)
from .provider import ModelProfile, ProviderCapabilities

if TYPE_CHECKING:
    from ..cache.manager import CacheManager
    from ..events.bus import EventBus
    from ..features.registry import FeatureRegistry
    from ..providers.base import LLMProvider
    from ..telemetry.collector import TelemetryCollector


class SessionLogger:
    """Per-stage structured logging."""

    def __init__(self, request_id: str, trace_id: str):
        self.request_id = request_id
        self.trace_id = trace_id
        self._entries: list[dict] = []

    def _log(self, stage: str, **kwargs):
        entry = {
            "timestamp": time.time(),
            "request_id": self.request_id,
            "trace_id": self.trace_id,
            "stage": stage,
            **kwargs,
        }
        self._entries.append(entry)
        import logging

        logging.getLogger("ai_service").info(f"[{stage}] {kwargs}")

    def info(self, stage: str, **kwargs):
        self._log(stage, level="info", **kwargs)

    def error(self, stage: str, **kwargs):
        self._log(stage, level="error", **kwargs)

    def warn(self, stage: str, **kwargs):
        self._log(stage, level="warning", **kwargs)

    def get_entries(self) -> list[dict]:
        return list(self._entries)


@dataclass
class AISession:
    """Everything flows through this single object."""

    # Identity
    request_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str | None = None

    # User
    user_id: str = ""

    # Provider (set during routing)
    provider: LLMProvider | None = None
    model: str = ""
    profile: ModelProfile | None = None
    capabilities: ProviderCapabilities = field(default_factory=ProviderCapabilities)

    # Context
    retrieved_docs: list[RetrievedDocument] = field(default_factory=list)
    memories: list[Memory] = field(default_factory=list)
    tool_results: list[ToolResult] = field(default_factory=list)

    # Routing
    intent: Intent | None = None

    # Config
    temperature: float | None = None
    stream: bool = True

    # Metrics
    metrics: SessionMetrics = field(default_factory=SessionMetrics)

    # Infrastructure (set by container)
    cache: CacheManager | None = None
    events: EventBus | None = None
    logger: SessionLogger | None = None
    telemetry: TelemetryCollector | None = None
    feature_flags: FeatureRegistry | None = None
    token_budget: TokenBudget | None = None

    def __post_init__(self):
        if self.logger is None:
            self.logger = SessionLogger(self.request_id, self.trace_id)
        self.metrics.request_id = self.request_id
        self._start_time = time.time()

    def start_timer(self):
        self._start_time = time.time()

    def elapsed_ms(self) -> float:
        return (time.time() - self._start_time) * 1000
