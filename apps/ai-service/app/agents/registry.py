from __future__ import annotations

import logging

from .base import Agent
from ..execution.base import ExecutionResult

logger = logging.getLogger("ai_service.agents.registry")


class AgentRegistry:
    """Dictionary-based agent registry. O(1) dispatch."""

    def __init__(self):
        self.agents: dict[str, Agent] = {}
        self.default_intent = "general"

    def register(self, intent: str, agent: Agent):
        self.agents[intent] = agent

    def get(self, intent: str) -> Agent:
        return self.agents.get(intent, self.agents.get(self.default_intent))

    async def execute(
        self,
        intent: str,
        user_id: str,
        query: str,
        conversation: list[dict],
        session,
        strategy,
    ) -> ExecutionResult:
        agent = self.get(intent)
        if agent is None:
            raise ValueError(f"No agent registered for intent: {intent}")
        return await agent.execute(user_id, query, conversation, session, strategy)
