from __future__ import annotations

from dataclasses import dataclass, field

from ..models.common import RetrievedDocument, ToolResult


@dataclass(frozen=True)
class Context:
    """Immutable inference context. Built once, consumed by complete/stream."""
    user_id: str
    query: str
    messages: list[dict] = field(default_factory=list)
    intent: object = None
    retrieved_docs: list[RetrievedDocument] = field(default_factory=list)
    memories: list = field(default_factory=list)
    model: str = ""
    provider: object = None
    temperature: float = 0.4
    request_id: str = ""

    # Sprint 6C: planner + engine
    plan: object = None  # QueryPlan
    sql_results: list[ToolResult] = field(default_factory=list)
    completed_steps: list[str] = field(default_factory=list)

    # Slice 7: NestJS owns orchestration + final context; Python passthrough.
    context_owned: bool = False
