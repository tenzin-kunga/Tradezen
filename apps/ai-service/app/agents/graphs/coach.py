"""
CoachGraph — LangGraph workflow for coaching.

Flow:
  LoadAnalytics → RetrieveJournals → RetrieveMemories
          ↘          ↓                   ↓
          └───────→ BehaviorAnalysis ←──┘
                         ↓
                  GenerateCoaching
                         ↓
                      Validate
                         ↓
                    StoreCoaching

All nodes delegate to CoachingService.
"""
from __future__ import annotations

import logging

logger = logging.getLogger("ai_service.graphs.coach")


def build_coach_graph(coaching_service):
    """Build a CoachGraph. Returns compiled graph when langgraph is available."""

    try:
        from langgraph.graph import StateGraph
        from .states import CoachState
    except ImportError:
        logger.warning("LangGraph not installed. CoachGraph unavailable.")
        return None

    graph = StateGraph(CoachState)

    async def load_analytics(state: CoachState):
        state.analytics = await coaching_service.load_analytics(state)
        return state

    async def retrieve_journals(state: CoachState):
        state.journals = await coaching_service.retrieve_journals(state)
        return state

    async def retrieve_memories(state: CoachState):
        state.memories = await coaching_service.retrieve_memories(state)
        return state

    async def analyze_behavior(state: CoachState):
        state.behavior_analysis = await coaching_service.analyze_behavior(state)
        return state

    async def generate_coaching(state: CoachState):
        state.coaching_output = await coaching_service.generate_coaching(state)
        return state

    async def validate(state: CoachState):
        state.validation_result = await coaching_service.validate(state)
        return state

    graph.add_node("load_analytics", load_analytics)
    graph.add_node("retrieve_journals", retrieve_journals)
    graph.add_node("retrieve_memories", retrieve_memories)
    graph.add_node("analyze_behavior", analyze_behavior)
    graph.add_node("generate_coaching", generate_coaching)
    graph.add_node("validate", validate)

    graph.set_entry_point("load_analytics")
    graph.add_edge("load_analytics", "retrieve_journals")
    graph.add_edge("retrieve_journals", "retrieve_memories")
    graph.add_edge("retrieve_memories", "analyze_behavior")
    graph.add_edge("analyze_behavior", "generate_coaching")
    graph.add_edge("generate_coaching", "validate")

    return graph.compile()
