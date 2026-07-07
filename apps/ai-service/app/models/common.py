from __future__ import annotations

from enum import Enum
from pydantic import BaseModel


class ExecutionMode(str, Enum):
    """How a request should be executed."""
    DIRECT = "direct"       # Single LLM call
    TOOL = "tool"           # LLM + iterative tool use
    WORKFLOW = "workflow"   # LangGraph orchestration
    BACKGROUND = "background"  # Async jobs (memory extraction, embedding)


class Complexity(str, Enum):
    """Query complexity level."""
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"


class RetrievedDocument(BaseModel):
    document_id: str = ""
    source_type: str = ""
    source_id: str | None = None
    content: str = ""
    title: str | None = None
    score: float = 0.0
    metadata: dict = {}
    citation: str | None = None


class ToolResult(BaseModel):
    tool_name: str
    action: str = ""
    content: str
    confidence: float = 1.0
    metadata: dict = {}


class Memory(BaseModel):
    id: str
    content: str
    memory_type: str
    importance: int = 5
    metadata: dict = {}


class Intent(BaseModel):
    name: str
    confidence: float = 1.0
    complexity: Complexity = Complexity.SIMPLE
    execution: ExecutionMode = ExecutionMode.DIRECT


class SessionMetrics(BaseModel):
    request_id: str = ""
    provider: str = ""
    model: str = ""
    latency_ms: float = 0
    retrieval_ms: float = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    tool_calls: list[str] = []
    retrieved_docs: int = 0
    used_docs: int = 0
    cache_hit: bool = False
    memory_hit: bool = False
    intent: str = ""
    intent_confidence: float = 0
    cost_usd: float | None = None
    planner_rule: str = ""
    completed_steps: list[str] = []

    # Sprint 7A: stage latency breakdown
    planner_ms: float = 0
    sql_ms: float = 0
    prompt_build_ms: float = 0
    first_token_ms: float = 0
    generation_ms: float = 0
    background_ms: float = 0
    total_latency_ms: float = 0


class TokenBudget(BaseModel):
    total: int = 32768
    system_prompt: int = 400
    conversation: int = 900
    memory: int = 500
    retrieved_docs: int = 3500
    tool_results: int = 200

    @classmethod
    def for_model(cls, context_window: int) -> TokenBudget:
        return cls(
            total=context_window,
            system_prompt=min(400, context_window // 10),
            conversation=min(900, context_window // 5),
            memory=min(500, context_window // 8),
            retrieved_docs=min(3500, context_window // 3),
            tool_results=min(200, context_window // 16),
        )
