# ADR 0002: PostgreSQL + pgvector

## Status

Accepted

## Context

TradeZen needs:
- Relational database for trades, journals, users
- Vector storage for AI embeddings (semantic search)
- Full-text search capabilities
- JSON flexibility for settings and layouts

## Decision

Use PostgreSQL 16 with pgvector extension:
- Primary database for all structured data
- pgvector for AI embedding storage and similarity search
- Drizzle ORM for type-safe database access
- Neon for production, Docker for development

## Consequences

**Easier:**
- Single database technology to manage
- Vector search without separate vector database
- Full-text search built-in
- JSONB for flexible schemas

**Harder:**
- pgvector requires extension installation
- Some vector operations may be slower than specialized vector databases
- Migration management with Drizzle
