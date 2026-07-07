from __future__ import annotations

from ..models.common import ToolResult


class Tool:
    """Protocol for callable tools."""
    name: str
    description: str

    async def execute(self, user_id: str, action: str, params: dict) -> ToolResult: ...
    def get_schema(self) -> dict: ...
