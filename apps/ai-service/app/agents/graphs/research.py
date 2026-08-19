"""
ResearchGraph — LangGraph workflow for market research.

Flow:
  CreatePlan → SearchWeb → SearchSEC → SearchNews → GetFinancials
      │          │          │           │            │
      └──────────┴──────────┴───────────┴────────────┘
                         ↓
                    MergeResults
                         ↓
                      Critique
                         ↓
                   GenerateReport

All nodes delegate to ResearchService.
"""
from __future__ import annotations

import logging

logger = logging.getLogger("ai_service.graphs.research")


def build_research_graph(research_service):
    try:
        from langgraph.graph import StateGraph
        from .states import ResearchState
    except ImportError:
        logger.warning("LangGraph not installed. ResearchGraph unavailable.")
        return None

    graph = StateGraph(ResearchState)

    async def create_plan(state: ResearchState):
        state.plan = await research_service.create_plan(state)
        return state

    async def search_web(state: ResearchState):
        state.search_results = await research_service.search_web(state)
        return state

    async def search_sec(state: ResearchState):
        state.sec_findings = await research_service.search_sec(state)
        return state

    async def search_news(state: ResearchState):
        state.news = await research_service.search_news(state)
        return state

    async def get_financials(state: ResearchState):
        state.financials = await research_service.get_financials(state)
        return state

    async def merge_results(state: ResearchState):
        state.merge_result = await research_service.merge_results(state)
        return state

    async def critique(state: ResearchState):
        state.critique = await research_service.critique(state)
        return state

    async def generate_report(state: ResearchState):
        state.final_report = await research_service.generate_report(state)
        return state

    graph.add_node("create_plan", create_plan)
    graph.add_node("search_web", search_web)
    graph.add_node("search_sec", search_sec)
    graph.add_node("search_news", search_news)
    graph.add_node("get_financials", get_financials)
    graph.add_node("merge_results", merge_results)
    graph.add_node("critique", critique)
    graph.add_node("generate_report", generate_report)

    graph.set_entry_point("create_plan")
    graph.add_edge("create_plan", "search_web")
    graph.add_edge("search_web", "search_sec")
    graph.add_edge("search_sec", "search_news")
    graph.add_edge("search_news", "get_financials")
    graph.add_edge("get_financials", "merge_results")
    graph.add_edge("merge_results", "critique")
    graph.add_edge("critique", "generate_report")

    return graph.compile()
