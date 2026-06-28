# ADR 0004: AI Integration

## Status

Accepted

## Context

TradeZen needs AI capabilities for:

- Trading insights and coaching
- Journal analysis
- Semantic search
- Memory and context management

## Decision

Integrate AI via OpenRouter with:

- LangChain for LLM orchestration
- LangGraph for complex workflows
- pgvector for embedding storage
- OpenRouter for multi-model access

## Consequences

**Easier:**

- Multiple AI model access via OpenRouter
- Complex workflows with LangGraph
- Semantic search with embeddings
- Cost optimization across models

**Harder:**

- OpenRouter dependency
- API key management
- Rate limiting across models
- Token cost tracking
