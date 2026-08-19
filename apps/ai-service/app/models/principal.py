from __future__ import annotations

from pydantic import BaseModel


class Principal(BaseModel):
    """Authenticated user identity. Downstream code consumes this, not raw JWT dicts."""

    user_id: str
    email: str | None = None
    username: str | None = None
    source: str = "jwt"
