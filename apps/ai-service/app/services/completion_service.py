from __future__ import annotations

import asyncio
import logging

logger = logging.getLogger("ai_service.completion")


class CompletionService:
    """Handles LLM calls with streaming and retry."""

    def __init__(self, config, retry_policy=None):
        self.config = config
        self.retry = retry_policy

    async def complete(self, session, messages: list) -> dict:
        provider = session.provider
        if not provider:
            raise ValueError("No provider set on session")

        dict_msgs = [
            {"role": m.role if hasattr(m, "role") else m.get("role", "user"),
             "content": m.content if hasattr(m, "content") else m.get("content", "")}
            for m in messages
        ]
        temp = session.temperature or 0.4

        result = await provider.chat(
            dict_msgs,
            model=session.model,
            temperature=temp,
            stream=False,
        )
        return {
            "content": result.get("content", ""),
            "model": result.get("model", session.model),
            "usage": result.get("usage", {}),
        }

    async def stream(self, session, messages: list):
        """True streaming — yields tokens, sets up streaming response in session."""
        provider = session.provider
        if not provider:
            raise ValueError("No provider set on session")

        dict_msgs = [
            {"role": m.role if hasattr(m, "role") else m.get("role", "user"),
             "content": m.content if hasattr(m, "content") else m.get("content", "")}
            for m in messages
        ]
        temp = session.temperature or 0.4

        full_response = []
        async for token in provider.stream(dict_msgs, model=session.model, temperature=temp):
            full_response.append(token)
            yield token

        session._full_response = "".join(full_response)
