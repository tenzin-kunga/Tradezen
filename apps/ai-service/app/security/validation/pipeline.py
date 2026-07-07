from __future__ import annotations

from typing import Protocol

from ...models.chat import ChatRequest


class Validator(Protocol):
    def validate(self, request: ChatRequest) -> tuple[bool, str | None]: ...


class ValidationPipeline:
    """Runs request through a chain of validators."""

    def __init__(self, validators: list[Validator]):
        self.validators = validators

    def validate(self, request: ChatRequest) -> tuple[bool, str | None]:
        for v in self.validators:
            ok, error = v.validate(request)
            if not ok:
                return False, error
        return True, None
