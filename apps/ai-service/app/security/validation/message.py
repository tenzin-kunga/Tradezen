from __future__ import annotations

from ...models.chat import ChatRequest, Message


class MessageValidator:
    def validate(self, request: ChatRequest) -> tuple[bool, str | None]:
        if not request.messages:
            return False, "At least one message is required"
        total = sum(len(m.content) for m in request.messages)
        if total > 20000:
            return False, f"Prompt too large ({total} > 20000 chars)"
        return True, None


class PromptValidator:
    def __init__(self, max_messages: int = 50):
        self.max_messages = max_messages

    def validate(self, request: ChatRequest) -> tuple[bool, str | None]:
        if len(request.messages) > self.max_messages:
            return False, f"Too many messages ({len(request.messages)} > {self.max_messages})"
        for msg in request.messages:
            msg.content = msg.content.replace("\x00", "").strip()
        return True, None
