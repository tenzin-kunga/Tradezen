from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Protocol

if TYPE_CHECKING:
    pass


class LLMProvider(Protocol):
    """Protocol for LLM providers."""

    name: str

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.4,
        max_tokens: int | None = None,
        stream: bool = False,
    ) -> dict[str, Any]: ...

    async def stream(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.4,
        max_tokens: int | None = None,
    ): ...

    async def health_check(self) -> bool: ...


@dataclass
class ProviderCapabilities:
    supports_streaming: bool = True
    supports_tools: bool = False
    supports_reasoning: bool = False
    supports_json: bool = True
    supports_vision: bool = False
    supports_embeddings: bool = False
    max_context: int = 32768


@dataclass
class ModelProfile:
    name: str
    provider: str
    context_window: int = 32768
    temperature: float = 0.4
    supports_tools: bool = False
    supports_vision: bool = False
    supports_reasoning: bool = False
    cost_per_1k_input: float | None = None
    cost_per_1k_output: float | None = None
