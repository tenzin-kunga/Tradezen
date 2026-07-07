from __future__ import annotations

import logging

logger = logging.getLogger("ai_service.agents.default")


class GeneralAgent:
    """Fallback agent for general intent. Uses direct strategy."""

    name = "general"

    def can_handle(self, intent_name: str) -> bool:
        return intent_name == "general"

    async def execute(self, user_id, query, conversation, session, strategy=None):
        return await strategy.execute(user_id, query, conversation, session)
