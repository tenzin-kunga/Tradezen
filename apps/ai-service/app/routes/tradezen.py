from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse

from ..models.chat import ChatRequest, Message

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("")
async def chat(request: Request):
    body = await request.json()
    user_id = body.get("user_id", "")
    messages = [Message(**m) for m in body.get("messages", [])]
    stream = body.get("stream", True)

    chat_req = ChatRequest(
        user_id=user_id,
        conversation_id=body.get("conversation_id"),
        messages=messages,
        model=body.get("model"),
        temperature=body.get("temperature"),
        stream=stream,
    )

    session = request.state.session
    container = request.app.state.container

    if stream:
        async def generate():
            async for token in container.chat_service.handle_stream(chat_req, session):
                yield token
        return StreamingResponse(generate(), media_type="text/plain")

    response = await container.chat_service.handle(chat_req, session)
    return response.model_dump()


@router.post("/coach")
async def coach(request: Request):
    body = await request.json()
    messages = [Message(**m) for m in body.get("messages", [])]
    user_id = body.get("user_id", "")

    chat_req = ChatRequest(user_id=user_id, messages=messages, stream=False)
    session = request.state.session
    container = request.app.state.container

    response = await container.chat_service.handle(chat_req, session)
    return response.model_dump()


@router.post("/research")
async def research(request: Request):
    body = await request.json()
    messages = [Message(**m) for m in body.get("messages", [])]
    user_id = body.get("user_id", "")

    chat_req = ChatRequest(user_id=user_id, messages=messages, stream=False)
    session = request.state.session
    container = request.app.state.container

    response = await container.chat_service.handle(chat_req, session)
    return response.model_dump()


@router.post("/journal")
async def journal(request: Request):
    body = await request.json()
    messages = [Message(**m) for m in body.get("messages", [])]
    user_id = body.get("user_id", "")

    chat_req = ChatRequest(user_id=user_id, messages=messages, stream=False)
    session = request.state.session
    container = request.app.state.container

    response = await container.chat_service.handle(chat_req, session)
    return response.model_dump()
