from __future__ import annotations

from pydantic import BaseModel


class TokenUsage(BaseModel):
    """Normalized token usage across all providers."""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class ResponseMetadata(BaseModel):
    """Granular timing and metadata for responses."""
    provider: str = ""
    model: str = ""
    total_latency_ms: float = 0
    retrieval_latency_ms: float = 0
    prompt_build_latency_ms: float = 0
    generation_latency_ms: float = 0
    provider_latency_ms: float = 0
    intent: str = ""
    intent_confidence: float = 0
    tool_calls: list[str] = []
    retrieved_docs: int = 0
    used_docs: int = 0
    memory_hits: int = 0
    cache_hit: bool = False
    cost_usd: float | None = None
    token_usage: TokenUsage | None = None
