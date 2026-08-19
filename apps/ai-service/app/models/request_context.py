from __future__ import annotations

from pydantic import BaseModel

from .principal import Principal


class RequestContext(BaseModel):
    """Structured context attached to every AI request. Single object to extend."""

    request_id: str
    trace_id: str = ""
    conversation_id: str | None = None
    principal: Principal | None = None
    provider: str = ""
    model: str = ""
    metadata: dict | None = None
