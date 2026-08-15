from __future__ import annotations

from enum import Enum
from dataclasses import dataclass, field


class StepType(str, Enum):
    SQL = "sql"
    RAG = "rag"
    MEMORY = "memory"


@dataclass(frozen=True)
class RagConfig:
    source_types: list[str] = field(default_factory=lambda: ["trade", "journal", "memory"])
    top_k: int = 5
    min_score: float = 0.5


@dataclass(frozen=True)
class SqlConfig:
    capabilities: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class MemoryConfig:
    pass


@dataclass(frozen=True)
class ExecutionStep:
    type: StepType
    config: RagConfig | SqlConfig | MemoryConfig | None = None


@dataclass(frozen=True)
class QueryPlan:
    steps: list[ExecutionStep] = field(default_factory=list)
    template: str = "chat"
    use_streaming: bool = True


@dataclass(frozen=True)
class PlanningResult:
    plan: QueryPlan
    matched_rule: str = ""
    planner_latency_ms: float = 0.0


@dataclass(frozen=True)
class PlanningRequest:
    query: str
    intent: object  # IntentResult
    session: object  # AISession
