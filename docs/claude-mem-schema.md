# Claude-Mem Memory Schema

> **Purpose:** Structured decision tracking system for TradeZen development
> **Version:** 1.0
> **Created:** 2026-05-16

## Memory Types

### 1. Decisions

Track architectural and strategic decisions with rationale.

```json
{
  "type": "decision",
  "id": "DEC-001",
  "title": "Use Drizzle ORM instead of Prisma",
  "date": "2026-05-16",
  "status": "approved",
  "context": "Phase 3 database migration",
  "decision": "Adopt Drizzle ORM for type-safe queries",
  "rationale": "Better TypeScript inference, lighter bundle, SQL-like API",
  "alternatives": ["Prisma", "Raw pg", "Kysely"],
  "consequences": ["Need manual migration scripts", "Smaller community"],
  "tags": ["database", "orm", "phase-3"]
}
```

### 2. Constraints

Document technical and business constraints.

```json
{
  "type": "constraint",
  "id": "CON-001",
  "title": "Financial calculations must be deterministic",
  "source": "Rules.md §4",
  "description": "All P&L, Sharpe, Sortino calculations use deterministic math",
  "enforcement": "Code review + unit tests",
  "tags": ["analytics", "rules", "deterministic"]
}
```

### 3. Context

Session context and progress tracking.

```json
{
  "type": "context",
  "session_id": "ses-xxx",
  "date": "2026-05-16",
  "phase": "Phase 3",
  "tasks_completed": ["TZ-020", "TZ-021"],
  "tasks_in_progress": ["TZ-022"],
  "blockers": [],
  "notes": "Migration from raw pg to Drizzle in progress"
}
```

### 4. Patterns

Reusable code patterns and anti-patterns.

```json
{
  "type": "pattern",
  "id": "PAT-001",
  "title": "Transaction-safe CRUD operations",
  "category": "database",
  "pattern": "Wrap all write operations in database.transaction()",
  "example": "packages/db/src/transactions.ts",
  "anti_pattern": "Direct pool.query() for writes without transaction wrapper",
  "tags": ["database", "transactions", "phase-1"]
}
```

## Usage Guidelines

1. **Record decisions** when choosing between alternatives
2. **Document constraints** from Rules.md that affect implementation
3. **Track context** at phase boundaries and session ends
4. **Capture patterns** when discovering reusable solutions
5. **Search before acting** — check memory before repeating work

## Storage

- Decisions: `.planning/decisions/`
- Constraints: `.planning/constraints/`
- Context: Session memory (claude-mem)
- Patterns: `.planning/patterns/`
