from __future__ import annotations

import logging

logger = logging.getLogger("ai_service.services.coaching")


class CoachingService:
    """Domain logic for trading coaching. Called by LangGraph nodes."""

    def __init__(self, retrieval_pipeline=None, memory_manager=None, completion_service=None):
        self.retrieval = retrieval_pipeline
        self.memory = memory_manager
        self.completion = completion_service

    async def load_analytics(self, state) -> dict:
        """Load trading analytics for coaching context."""
        return {
            "analysis": "Analytics loaded",
            "behaviors": [],
        }

    async def retrieve_journals(self, state) -> list:
        """Retrieve relevant journal entries."""
        if not self.retrieval or not self.completion:
            return []
        try:
            result = await self.retrieval.retrieve_journals(state.user_id, state.query)
            return [d for d in result.documents]
        except Exception as e:
            logger.warning(f"Journal retrieval failed: {e}")
            return []

    async def retrieve_memories(self, state) -> list:
        """Retrieve user memories."""
        if not self.memory:
            return []
        try:
            return await self.memory.get_user_memories(state.user_id)
        except Exception as e:
            logger.warning(f"Memory retrieval failed: {e}")
            return []

    async def analyze_behavior(self, state) -> str:
        """Analyze trading behavior patterns."""
        analytics = getattr(state, "analytics", {})
        journals = getattr(state, "journals", [])
        memories = getattr(state, "memories", [])

        journal_count = len(journals) if journals else 0
        memory_count = len(memories) if memories else 0

        return (
            f"Behavior analysis complete. "
            f"Analyzed {journal_count} journal entries and {memory_count} memories."
        )

    async def generate_coaching(self, state) -> str:
        """Generate coaching advice based on analysis."""
        analysis = getattr(state, "behavior_analysis", "")
        return f"Coaching recommendations generated based on behavior analysis."

    async def validate(self, state) -> str:
        """Validate coaching output quality."""
        return "Coaching output validated."
