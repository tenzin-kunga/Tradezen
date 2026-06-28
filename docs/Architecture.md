# TradeZen Architecture Documentation

Version: 1.1
Status: Active
Last Updated: May 2026

---

# 1. Executive Summary

TradeZen is a modern AI-assisted trading journal platform designed to help traders:

* Track trades
* Analyze performance
* Improve trading psychology
* Maintain trading journals
* Receive AI-driven coaching and insights

The platform follows a cloud-native architecture that separates concerns between:

* Frontend
* Backend API
* Database
* Caching
* AI Services
* Monitoring

This architecture is designed to:

* Scale from a single user to thousands of traders
* Maintain high reliability
* Preserve data integrity
* Support future AI-driven coaching features

---

# 2. System Architecture Overview

## High-Level Architecture

```text
┌────────────────────────────────────┐
│              Users                 │
└────────────────┬───────────────────┘
                 │ HTTPS
                 ▼
┌────────────────────────────────────┐
│         Vercel Frontend            │
│          Next.js 14                │
└────────────────┬───────────────────┘
                 │ REST API
                 ▼
┌────────────────────────────────────┐
│          Railway API               │
│           NestJS 11                │
└───────┬──────────┬───────────┬─────┘
        │          │           │
        ▼          ▼           ▼
   PostgreSQL    Redis      AI Layer
      Neon      Cache      OpenRouter
```

---

# 3. Architectural Principles

TradeZen follows the following principles:

## Separation of Concerns

Frontend, backend, database, and AI systems are isolated.

## Stateless API

API instances do not store session state.

Benefits:

* Easy scaling
* Easy deployments
* Fault tolerance

## Security First

* JWT Authentication
* HTTP-only cookies
* User-level data isolation
* Parameterized queries

## Cloud Native

Infrastructure can be deployed on:

* Railway
* Render
* AWS
* Azure
* GCP
* Kubernetes

without code changes.

---

# 4. Development Architecture

## Purpose

Optimized for:

* Hot reload
* Fast iteration
* Debugging
* Local testing

---

## Architecture Diagram

```text
Developer Machine
│
├── Next.js Web (Local)
│   localhost:3000
│
├── NestJS API (Local)
│   localhost:3001
│
└── Docker
    ├── PostgreSQL
    └── Redis
```

---

## Why Hybrid Development?

Running API and Web locally provides:

* Fast refresh
* Better debugging
* Direct VSCode integration
* Lower memory consumption

Docker is used only for infrastructure services.

---

## Local Startup Flow

### Prerequisites

Docker containers for infrastructure:

```bash
docker compose up -d postgres redis
```

### Build shared packages first

```bash
bun run build --filter=@tradezen/db
```

### Start apps

```bash
# Terminal 1 — API (port 3001)
cd apps/api
bun run dev

# Terminal 2 — Web (port 3000)
cd apps/web
bun run dev
```

### Quick start

```bash
scripts/dev/start.bat
# or (root package.json dev script builds db + starts both)
bun run dev
```

---

# 5. Production Architecture

## Current Production Stack

### Frontend

Platform:

Vercel

Responsibilities:

* Serve Next.js application
* CDN distribution
* Static asset optimization
* SSL

---

### Backend

Platform:

Railway

Responsibilities:

* REST APIs
* Authentication
* Business logic
* Database access

---

### Database

Platform:

Neon PostgreSQL

Responsibilities:

* User management
* Trade storage
* Journal storage
* Analytics storage

---

## Production Flow

```text
User
 │
 ▼
Vercel
 │
 ▼
Railway API
 │
 ▼
Neon PostgreSQL
```

---

# 6. Monorepo Architecture

```text
tradezen/
│
├── apps/
│   ├── api/        (NestJS 11 — Express + tRPC)
│   └── web/        (Next.js 14 — React)
│
├── packages/
│   ├── db/         (@tradezen/db — Drizzle ORM, schema, migrations)
│   ├── types/
│   ├── ui/
│   ├── eslint-config/
│   └── tsconfig/
│
├── docs/
├── infra/
├── turbo.json
└── package.json
```

---

## Benefits

### Shared Types

Single source of truth.

Example:

```ts
Trade
User
Journal
Analytics
```

Shared between frontend and backend.

---

### Shared Database Package (`@tradezen/db`)

Single source of truth for database schema, types, and validation.

All Drizzle ORM table definitions, relations, and Zod validation live in `packages/db`.

Must be built (`bun run build --filter=@tradezen/db`) before API or web can run.

### Shared Components

Reusable UI components.

Future:

```text
Button
Card
Chart
Modal
Table
```

---

# 7. Backend Architecture

NestJS uses a modular architecture.

```text
API
│
├── Auth Module
├── Trades Module
├── Journals Module
├── Tags Module
├── Analytics Module
├── Chat Module
└── AI Module
```

---

## Auth Module

Responsibilities:

* Registration
* Login
* JWT issuance
* Refresh tokens

---

## Trades Module

Responsibilities:

* CRUD operations
* Trade calculations
* Behavioral tracking

---

## Journal Module

Responsibilities:

* Daily journals
* Reflections
* Emotional tracking

---

## Analytics Module

Responsibilities:

* Win rate
* Profit factor
* Drawdown
* Expectancy
* Sharpe Ratio

---

# 8. Database Architecture

## Database Choice

PostgreSQL

Reasons:

* ACID compliance
* Reliability
* Advanced analytics support

---

## All Tables (from `packages/db/src/schema/`)

```text
users                — Auth, preferences, theme
accounts             — OAuth provider links (Google)
login_attempts       — Rate limiting / brute-force protection
trades               — Trade records with PnL, strategy, psychology flags
journals             — Daily trading journals with mood & lessons
tags                 — User-defined tags (categories: setup, emotion, etc.)
trade_tags           — Many-to-many link between trades and tags
chat_threads         — AI chat conversation threads
chat_messages        — Individual messages within threads
ai_insights          — Generated AI insights (performance, behavioral)
coaching_sessions    — AI coaching interventions with severity & triggers
notifications        — In-app notifications
notification_preferences — Per-user notification type toggles
audit_log            — Security audit trail
analytics_snapshots  — Cached analytics metrics per date
embeddings           — Vector embeddings (pgvector, 1536d) for AI memory
```

---

## Data Ownership Model

Every row belongs to a user.

```sql
user_id
```

is required for all user-owned data.

---

## Query Rules

All queries must be scoped:

```sql
WHERE user_id = ?
```

to prevent cross-user access.

---

# 9. Redis Architecture

Current Status:

Optional

Future Uses:

* Session cache
* Analytics cache
* AI memory cache
* Rate limiting
* WebSockets

---

# 10. AI Architecture

Current:

```text
TradeZen
│
└── OpenRouter
```

Supported Models:

* Qwen
* Gemma
* Nemotron

---

## Future AI Architecture

```text
User
 │
 ▼
AI Coach
 │
 ▼
Memory Layer
 │
 ▼
Vector Store
 │
 ▼
LLM
```

---

## Planned Components

### Memory System

Stores:

* User habits
* Mistakes
* Trading strengths
* Emotional patterns

---

### Retrieval Layer

Provides:

* Historical context
* Journal history
* Trade history

---

### Coaching Engine

Generates:

* Personalized coaching
* Behavioral analysis
* Performance reviews

---

# 11. Security Architecture

## Authentication

JWT Access Tokens

```text
15 Minutes
```

Refresh Tokens

```text
7 Days
```

---

## Password Security

```text
bcrypt
```

Hashing only.

Passwords never stored in plaintext.

---

## API Security

Protected Routes:

```text
/trades
/journals
/tags
/chat
```

Public Routes:

```text
/auth/login
/auth/register
```

---

## CORS

Restricted to:

```text
WEB_URL
```

environment variable.

---

# 12. Deployment Architecture

## Current Deployment

### Frontend

```text
GitHub
   ↓
Vercel
```

---

### Backend

```text
GitHub
   ↓
Railway
```

---

### Database

```text
Neon
```

Managed PostgreSQL.

---

# 13. CI/CD Pipeline

```text
Developer
   ↓
GitHub
   ↓
GitHub Actions
   ↓
Tests
   ↓
Build
   ↓
Deploy
```

Checks:

* TypeScript
* ESLint
* Build validation
* Unit tests

---

# 14. Observability

Future Monitoring Stack

```text
Application
 │
  ├── Grafana
  └── Prometheus
```

Metrics:

* API latency
* Error rates
* DB performance
* User activity

---

# 15. Scalability Roadmap

## Phase 1

Current

```text
Vercel
Railway
Neon
```

---

## Phase 2

Add:

```text
Redis
Caching
```

---

## Phase 3

Add:

```text
AI Memory System
Vector Database
Coaching Engine
```

---

## Phase 4

Enterprise Scale

```text
Kubernetes
Load Balancer
Multi-region
CDN Optimization
```

---

# 16. Disaster Recovery

## Database Backups

Neon automated backups.

Additional:

* Weekly exports
* Monthly snapshots

---

## Rollback Strategy

Deployments must support:

```text
Previous Stable Release
```

rollback.

---

# 17. Architecture Decisions

| Decision   | Reason                  |
| ---------- | ----------------------- |
| Next.js    | SEO + Performance       |
| NestJS     | Enterprise architecture |
| PostgreSQL | Reliability             |
| Neon       | Managed Postgres        |
| Railway    | Fast deployment         |
| Vercel     | Best Next.js support    |
| Docker     | Environment consistency |
| Redis      | Future caching          |
| tRPC       | Type-safe API layer     |
| OpenRouter | Model flexibility       |
| Drizzle ORM | Type-safe SQL queries   |
| @tradezen/db | Shared schema & types   |
| pgvector   | AI embedding storage    |

---

# 18. Future Vision

TradeZen will evolve from:

```text
Trading Journal
```

into:

```text
AI Trading Performance Platform
```

with:

* Memory
* Coaching
* Behavioral analytics
* Trade review automation
* Strategy intelligence
* Personalized growth tracking

while maintaining the core principles:

* Reliability
* Accuracy
* Security
* User trust
* Data ownership

```
```
