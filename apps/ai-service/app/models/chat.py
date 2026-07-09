from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class RetrievalOptions(BaseModel):
    top_k: int = 5
    min_score: float = 0.25
    source_types: list[str] | None = None


class ChatRequest(BaseModel):
    """TradeZen-native chat request. Internal API."""

    user_id: str
    conversation_id: str | None = None
    messages: list[Message] = Field(..., max_length=50)
    model: str | None = None
    temperature: float | None = None
    stream: bool = True
    retrieval_options: RetrievalOptions | None = None


class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float | None = None


class Citation(BaseModel):
    doc_id: str
    title: str
    snippet: str
    source: str


class ChatResponse(BaseModel):
    """TradeZen-native chat response. Internal API."""

    content: str
    model: str
    usage: TokenUsage
    request_id: str
    citations: list[Citation] | None = None
    metadata: dict | None = None  # ResponseMetadata serialized


# OpenAI-compatible adapter models


class OpenAIMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class OpenAIRequest(BaseModel):
    model: str | None = None
    messages: list[OpenAIMessage]
    temperature: float | None = None
    stream: bool = False
    max_tokens: int | None = None
    tools: list[dict] | None = None
    tool_choice: object | None = None


class OpenAIChoice(BaseModel):
    index: int = 0
    message: OpenAIMessage
    finish_reason: str | None = "stop"


class OpenAIUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class OpenAIResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: list[OpenAIChoice]
    usage: OpenAIUsage
