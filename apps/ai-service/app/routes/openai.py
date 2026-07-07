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

router = APIRouter(prefix="/v1", tags=["openai-compat"])


@router.post("/chat/completions")
async def openai_chat(request: Request):
    """OpenAI-compatible chat endpoint. Adapter pattern."""
    body = await request.json()
    openai_req = OpenAIRequest(**body)

    # Convert to TradeZen-native format
    messages = [Message(role=m.role, content=m.content) for m in openai_req.messages]
    chat_req = ChatRequest(
        user_id="openai-user",
        messages=messages,
        model=openai_req.model,
        temperature=openai_req.temperature,
        stream=openai_req.stream,
    )

    session: AISession = request.state.session
    container = request.app.state.container

    if openai_req.stream:
        return StreamingResponse(
            _stream_openai(container, chat_req, session),
            media_type="text/event-stream",
        )

    response = await container.chat_service.handle(chat_req, session)

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


async def _stream_openai(container, chat_req: ChatRequest, session: AISession):
    """Stream in OpenAI SSE format. Uses the same pipeline as non-streaming."""
    import json

    yield 'data: {"object":"chat.completion.chunk","choices":[{"delta":{"role":"assistant"},"index":0}]}\n\n'

    async for token in container.chat_service.handle_stream(chat_req, session):
        chunk = {
            "object": "chat.completion.chunk",
            "choices": [{"delta": {"content": token}, "index": 0}],
        }
        yield f"data: {json.dumps(chunk)}\n\n"

    yield "data: [DONE]\n\n"
