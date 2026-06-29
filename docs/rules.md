# TradeZen Engineering Constitution

> Unified governance, architecture, security, infrastructure, analytics,
> AI, scalability, and operational standards for TradeZen.
>
> This document defines the non-negotiable rules that govern:
>
> - engineering decisions
> - product integrity
> - infrastructure evolution
> - backend architecture
> - AI systems
> - financial calculations
> - security standards
> - deployment practices
>
> Every contributor and system component must comply with these standards.

---

# 1. Philosophy & Governance

TradeZen is:

- a professional-grade trading journal
- a behavioral analytics platform
- an AI-assisted trading psychology system

TradeZen is NOT:

- a signal provider
- a financial advisory platform
- a gambling system
- a “get rich quick” product

Core engineering priorities:

1. Reliability
2. Determinism
3. Accuracy
4. Security
5. Simplicity
6. Scalability
7. Maintainability
8. Transparency

---

# 2. Golden Rule

> If a feature compromises:
>
> - data integrity
> - user trust
> - determinism
> - security
> - system stability
>
> it must NOT be shipped.

---

# 3. Data Integrity Rules

## 3.1 Trade Preservation

- Trades must never be silently modified
- Trades must never be silently deleted
- User-entered data must remain recoverable
- Destructive actions require explicit user intent

---

## 3.2 Deterministic Financial Logic

All calculations must be:

- deterministic
- reproducible
- backend-controlled
- versioned

Frontend must never become authoritative for:

- PnL
- analytics
- risk calculations
- behavioral metrics

---

## 3.3 UTC Time Standards

- All timestamps stored in UTC
- Timezone conversion only at presentation layer

---

## 3.4 Numeric Precision

- Prices stored as raw numeric values
- No rounding during storage
- Avoid floating-point precision drift
- Use decimal-safe financial calculations

---

## 3.5 Immutable Auditability

Critical actions must remain traceable:

- trade creation
- trade edits
- imports
- analytics recalculation
- AI-generated summaries

---

# 4. Financial Calculation Rules

## 4.1 PnL Formula

### BUY

```text
PnL = (Exit Price - Entry Price) × Lot Size
```

### SELL

```text
PnL = (Entry Price - Exit Price) × Lot Size
```

---

## 4.2 Risk Formula

```text
Risk = |Entry - Stop Loss|
```

---

## 4.3 Reward Formula

```text
Reward = |Take Profit - Entry|
```

---

## 4.4 Calculation Rules

- Calculations must never depend on live market feeds
- Stored trade data is the source of truth
- Formula changes must:
  - be documented
  - be versioned
  - remain reproducible

---

## 4.5 No Hidden Calculations

Every metric shown to users must:

- be explainable
- be reproducible
- expose methodology if requested

---

# 5. Backend Authority Rules

## 5.1 Backend as Source of Truth

Critical logic must remain backend-controlled:

- analytics
- trade calculations
- validation
- authentication
- permissions
- AI memory persistence

---

## 5.2 Frontend Restrictions

Frontend must never:

- bypass validation
- mutate financial calculations
- compute authoritative analytics
- expose unauthorized data

---

# 6. Security Rules

## 6.1 Authentication

- All endpoints require authentication except auth endpoints
- Sessions must expire
- Refresh tokens must rotate
- HTTP-only cookies preferred

---

## 6.2 Password Rules

Passwords must:

- use bcrypt or stronger
- never be logged
- never be exposed
- never be returned in responses

---

## 6.3 JWT Rules

JWT tokens must:

- expire
- use strong secrets
- never use fallback secrets
- never be logged

---

## 6.4 Authorization Rules

Users may only:

- view their own data
- modify their own data

All queries must enforce:

```sql
WHERE user_id = ?
```

---

## 6.5 Infrastructure Security

Production systems must include:

- HTTPS
- HSTS
- CSP
- rate limiting
- audit logging
- CI/CD security scanning

---

## 6.6 Secrets Management

Secrets must:

- never be committed
- never exist in logs
- never exist in frontend bundles
- use environment variables or secret managers

---

# 7. Validation Rules

## 7.1 Input Validation

Validate:

- request bodies
- query params
- route params
- websocket payloads
- CSV imports

---

## 7.2 Schema Validation

Validation must enforce:

- numeric ranges
- enums
- required fields
- string lengths
- valid timestamps

---

## 7.3 Unknown Fields

Reject unknown request payload fields.

---

# 8. Database Rules

## 8.1 Database Standards

Primary database:

- PostgreSQL

Realtime/cache:

- Redis

---

## 8.2 Query Standards

Avoid:

- N+1 queries
- unindexed scans
- expensive joins on hot paths

Critical indexes:

- user_id
- symbol_id
- created_at

---

## 8.3 Transactions

Critical writes require transactions:

- trade CRUD
- imports
- analytics snapshots
- AI memory writes

---

## 8.4 Migrations

- Every migration reversible
- Destructive migrations require backups
- Production migrations require rollback plans

---

# 9. Redis & Realtime Rules

## 9.1 Redis Usage

Redis allowed only for:

- caching
- pub/sub
- websocket scaling
- queues
- ephemeral realtime state

Redis must NEVER become:

- source of truth
- permanent storage

---

## 9.2 Cache Expiration

Realtime market cache:

```text
≤ 5 seconds
```

---

## 9.3 Stale Data Handling

If market APIs fail:

- show last known value
- mark data stale
- never overwrite trade history

---

## 9.4 WebSocket Limits

```text
≤ 1 websocket update/sec/symbol
```

---

## 9.5 Realtime Isolation

Realtime systems must:

- authenticate users
- isolate subscriptions
- avoid direct DB polling
- use Redis pub/sub

---

# 10. Queue & Worker Rules

## 10.1 Queue Requirements

Every async job must be:

- idempotent
- retry-safe
- observable
- recoverable

---

## 10.2 Queue Usage

Queues required for:

- CSV imports
- analytics snapshots
- AI summarization
- embeddings generation
- notifications
- market polling

---

# 11. Analytics Rules

## 11.1 Analytics Integrity

Analytics must:

- derive only from stored trades
- remain deterministic
- remain reproducible

---

## 11.2 Metrics Governance

Metrics definitions must:

- never silently change
- be documented
- be versioned

---

## 11.3 Required Analytics

Core analytics include:

- expectancy
- win rate
- Sharpe ratio
- drawdown
- equity curves
- streak analysis
- behavioral analysis

---

# 12. AI Governance Rules

## 12.1 AI Boundaries

TradeZen AI must NOT:

- provide financial advice
- generate trade signals
- encourage overtrading
- promise profitability

---

## 12.2 AI Purpose

AI exists to:

- summarize journals
- identify patterns
- provide coaching insights
- detect emotional behaviors

---

## 12.3 AI Memory Rules

AI memory systems must:

- remain user-isolated
- support deletion requests
- avoid hallucinated claims
- preserve contextual accuracy

---

## 12.4 Embeddings Rules

Embeddings may include:

- journals
- trade notes
- setups
- behavioral metadata

Embeddings must never include:

- passwords
- tokens
- secrets

---

# 13. UX & Product Integrity Rules

## 13.1 UX Consistency

- Profit always green
- Loss always red
- Neutral values gray

---

## 13.2 Trade Entry UX

```text
≤ 3 interactions required to log a trade
```

---

## 13.3 Transparency

Users must always be able to:

- verify calculations
- edit data
- delete data
- understand metrics

---

## 13.4 No Misleading UX

Do NOT:

- hide sample sizes
- exaggerate performance
- imply guaranteed profitability

---

# 14. Performance & Scalability Rules

## 14.1 API Targets

```text
p95 < 500ms
```

---

## 14.2 Dashboard Targets

```text
< 2 seconds load time
```

---

## 14.3 Scalability Targets

System must support:

```text
≥ 100K trades per user
```

without major degradation.

---

## 14.4 Realtime Scaling

Realtime systems must:

- use Redis caching
- avoid direct DB polling
- scale horizontally

---

# 15. Infrastructure Rules

## 15.1 Environment Parity

Development, staging, and production should remain similar.

---

## 15.2 Docker Standards

Infrastructure must remain containerized:

- PostgreSQL
- Redis
- workers
- monitoring stack

---

## 15.3 Deployment Safety

Production deploys require:

- rollback strategy
- health checks
- monitoring
- backup verification

---

## 15.4 Observability

Monitoring must include:

- API latency
- DB latency
- websocket health
- queue health
- error rates
- memory usage

---

# 16. Logging & Monitoring Rules

## Must Log

- errors
- failed imports
- API failures
- worker failures
- suspicious activity

---

## Must NEVER Log

- passwords
- tokens
- secrets
- sensitive user data

---

# 17. Testing Standards

## 17.1 Required Coverage

Critical systems require testing:

- auth
- calculations
- analytics
- imports
- permissions
- AI memory persistence

---

## 17.2 CI Requirements

CI must fail on:

- lint errors
- type errors
- test failures
- security scan failures

---

# 18. Git & CI/CD Rules

## 18.1 Branching Rules

Every task requires:

- dedicated branch
- PR targeting develop

---

## 18.2 Main Branch Protection

Direct pushes to main forbidden.

---

## 18.3 Merge Rules

Allowed:

- squash merge
- rebase merge

Avoid:

- messy merge commits

---

## 18.4 Commit Standards

Commits should:

- remain atomic
- remain descriptive
- avoid unrelated changes

---

# 19. MVP Discipline Rules

## 19.1 Avoid Premature Complexity

Do NOT:

- microservice too early
- overengineer abstractions
- optimize without bottlenecks

---

## 19.2 Prioritize

1. Reliability
2. Simplicity
3. Accuracy
4. Maintainability
5. Scalability

---

# 20. Architecture Evolution Rules

## 20.1 Current Architecture

Preferred architecture:

```text
Modular Monolith
```

---

## 20.2 Microservice Transition Rules

Do NOT adopt microservices until:

- bottlenecks proven
- operational overhead justified
- service boundaries stable

---

# 21. Production Readiness Requirements

Before production:

- backups verified
- monitoring operational
- HTTPS enforced
- security scans passing
- rollback procedures documented
- secrets rotated
- logs centralized

---

# 22. Engineering Culture Rules

TradeZen engineering should prioritize:

- long-term thinking
- maintainability
- readability
- developer experience
- transparency

Avoid:

- hype-driven architecture
- unnecessary rewrites
- fragile abstractions

---

# 23. Final Governance Rule

> TradeZen must always prioritize:
>
> - trust over speed
> - correctness over hype
> - maintainability over cleverness
> - reliability over feature count
>
> Every engineering decision must reinforce those principles.
