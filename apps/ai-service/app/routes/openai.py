from __future__ import annotations

import time
import uuid

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse

from ..models.chat import (
    ChatRequest,
    Message,
    OpenAIChoice,
    OpenAIMessage,
    OpenAIRequest,
    OpenAIResponse,
    OpenAIUsage,
)
from ..models.session import AISession
from ..routing.model_registry import ModelRegistry

router = APIRouter(prefix="/v1", tags=["openai-compat"])


@router.post("/chat/completions")
async def openai_chat(request: Request):
    """OpenAI-compatible chat endpoint. Adapter pattern."""
    body = await request.json()
    openai_req = OpenAIRequest(**body)

    container = request.app.state.container

    # Extract provider context early — needed by both tools and non-tools paths.
    provider_context = getattr(request.state, "provider_context", None)
    api_key = provider_context.get("api_key") if provider_context else None
    provider_name_ctx = provider_context.get("provider") if provider_context else None
    base_url = (
        (provider_context.get("base_url") if provider_context else None)
        or (container.config.provider_base_urls.get(provider_name_ctx) if provider_name_ctx else None)
    )

    # Tool-calling passthrough: the NestJS AgentRuntime owns the tool loop, so
    # forward the raw request verbatim to a provider that supports function calling.
    if openai_req.tools:
        # Honor the requested model's provider, not the configured default.
        provider_req, model_id = ModelRegistry.split_provider_model(openai_req.model)
        entry = container.model_registry.get(model_id) if model_id else None
        provider_name = provider_req or (entry["provider"] if entry else container.config.ai_provider)
        try:
            provider = container.provider_factory.get(provider_name)
        except ValueError:
            # Unknown vendor prefix (e.g. "groq") — fall through to cloud provider.
            provider = container.provider_factory.get(container.config.cloud_provider_name)
        if getattr(provider.capabilities, "supports_tools", False):
            raw = await provider.raw_chat(body, api_key=api_key, base_url=base_url, provider_name=provider_name_ctx)
            return raw
        # Provider can't do tools — drop them and run the normal pipeline.

    # Convert to TradeZen-native format
    session: AISession = request.state.session
    messages = [Message(role=m.role, content=m.content) for m in openai_req.messages]
    chat_req = ChatRequest(
        user_id=session.user_id,
        messages=messages,
        model=openai_req.model,
        temperature=openai_req.temperature,
        stream=openai_req.stream,
        context_owned=request.headers.get("x-context-owned-by-nestjs", "").lower() == "true",
    )

    if openai_req.stream:
        return StreamingResponse(
            _stream_openai(container, chat_req, session, api_key, base_url),
            media_type="text/event-stream",
        )

    response = await container.chat_service.handle(chat_req, session, api_key=api_key, base_url=base_url)

    # Convert to OpenAI format
    return OpenAIResponse(
        id=f"chatcmpl-{uuid.uuid4().hex[:12]}",
        created=int(time.time()),
        model=response.model,
        choices=[
            OpenAIChoice(
                message=OpenAIMessage(role="assistant", content=response.content),
            )
        ],
        usage=OpenAIUsage(
            prompt_tokens=response.usage.prompt_tokens,
            completion_tokens=response.usage.completion_tokens,
            total_tokens=response.usage.total_tokens,
        ),
    ).model_dump()


async def _stream_openai(container, chat_req: ChatRequest, session: AISession, api_key: str | None = None, base_url: str | None = None):
    """Stream in OpenAI SSE format. Uses the same pipeline as non-streaming."""
    import json

    yield 'data: {"object":"chat.completion.chunk","choices":[{"delta":{"role":"assistant"},"index":0}]}\n\n'

    async for token in container.chat_service.handle_stream(chat_req, session, api_key=api_key, base_url=base_url):
        chunk = {
            "object": "chat.completion.chunk",
            "choices": [{"delta": {"content": token}, "index": 0}],
        }
        yield f"data: {json.dumps(chunk)}\n\n"

    # Final chunk with usage (stream_options.include_usage) before [DONE].
    usage = getattr(session, "usage", {})
    if usage:
        yield f"data: {json.dumps({'object': 'chat.completion.chunk', 'choices': [], 'usage': usage})}\n\n"

    yield "data: [DONE]\n\n"
