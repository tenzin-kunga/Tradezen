# TradeZen Development Plan — Improvements Roadmap Execution

> **Generated:** 2026-05-16
> **Source:** Rules.md + Improvements.md + Current Project State
> **Branch:** develop
> **Last Commit:** dc0d3dc (comprehensive project overhaul)

---

## Current State Assessment

### ✅ Already Implemented
- Docker infrastructure (multi-stage builds, healthchecks, resource limits)
- CI/CD pipeline (security, lint, test, build/deploy)
- Glass Depth UI design system
- Authentication (JWT + HTTP-only refresh cookies)
- Core CRUD (trades, journals, tags, chat)
- Swagger API docs (dev only)
- Environment validation (dev mode disabled)
- Secret rotation scripts + pre-commit hooks
- start.bat (5-step startup process)

### 🔧 Partially Implemented
- Validation (DTOs exist but need hardening per TZ-001)
- Error handling (global filter exists but needs standardization per TZ-002)
- Transactions (basic pool queries, no wrappers per TZ-003)
- Logging (basic console.log, needs structured logging per TZ-004)
- Rate limiting (not implemented per TZ-010)
- Analytics (basic metrics, needs professional engine per TZ-031)

### ❌ Not Yet Started
- Drizzle ORM / tRPC / Zod (Epic 03)
- BullMQ queue system (Epic 05)
- Socket.IO realtime (Epic 06)
- AI memory system (Epic 07)
- Mobile optimization (Epic 08)
- Monitoring stack (Epic 09)
- Git workflow enforcement (Epic 10)

---

## Available Skills & Plugins

| Skill/Plugin | Purpose | Assigned Phases |
|---|---|---|
| **gsd-opencode** | Planning, execution, verification agents | All phases |
| **context-mode** | Context management, sandboxed execution | All phases |
| **claude-mem** | Session memory, decision tracking | All phases |
| **brainstorming** | Design exploration, approach comparison | Phase 0, 3, 5, 7 |
| **writing-plans** | Implementation plan generation | Each phase |
| **executing-plans** | Plan execution with checkpoints | Each phase |
| **subagent-driven-development** | Parallel task execution | Phases 1, 2, 4, 6 |
| **systematic-debugging** | Bug investigation, root cause | All phases |
| **test-driven-development** | Test-first development | Phases 1, 2, 3, 4 |
| **verification-before-completion** | Pre-commit verification | All phases |
| **frontend-design** | UI/UX implementation | Phases 3, 6, 8 |
| **skill-creator** | Custom skill generation | Phase 0, 5 |
| **mcp-builder** | MCP server creation | Phase 5, 7 |
| **receiving-code-review** | Code review feedback | All phases |
| **requesting-code-review** | PR review requests | All phases |
| **trade-import** | CSV/Excel trade import | Phase 4 |

---

## Phased Execution Plan

### Phase 0: Foundation & Planning (Week 1)
**Goal:** Establish development infrastructure and planning framework

| Task | Skill/Plugin | Rules Reference | Deliverable |
|---|---|---|---|
| Create spec templates | `skill-creator` | §18.4, §19.1 | `docs/superpowers/specs/` structure |
| Set up gsd-opencode workflows | `gsd-opencode` | §18, §19 | Agent configurations |
| Create claude-mem memory schema | `claude-mem` | §3.5, §12.3 | Decision tracking system |
| Establish branch protection rules | Manual | §18.1, §18.2 | GitHub branch rules |
| Create PR template | Manual | §18.3, §18.4 | `.github/PULL_REQUEST_TEMPLATE.md` |

**Verification:** `verification-before-completion` checklist
**Risk:** Low — infrastructure setup only

---

### Phase 1: Core Backend Hardening (Weeks 2-3)
**Goal:** Stabilize backend with validation, error handling, transactions, logging

| Task | Skill/Plugin | Rules Reference | Deliverable |
|---|---|---|---|
| TZ-001: Global Validation Hardening | `test-driven-development` + `subagent-driven-development` | §7, §3.4 | Strict DTOs, validation decorators |
| TZ-002: Centralized Error Handling | `systematic-debugging` | §7.3, §6.5 | Global exception filter, error schema |
| TZ-003: Transaction-Safe DB Operations | `test-driven-development` | §8.3, §3.1 | Transaction wrappers, rollback handling |
| TZ-004: Structured Logging System | `subagent-driven-development` | §16, §15.4 | Pino/Winston integration, correlation IDs |

**Execution Strategy:**
1. Use `subagent-driven-development` to parallelize TZ-001 through TZ-004
2. Each task gets independent agent with clear acceptance criteria
3. `verification-before-completion` before merging each task
4. `requesting-code-review` for PR review

**Verification:** All tests pass, lint clean, type check passes
**Risk:** Medium — changes to core backend, requires careful testing

---

### Phase 2: Security & Auth Modernization (Weeks 4-5)
**Goal:** Implement rate limiting, security headers, auth evaluation

| Task | Skill/Plugin | Rules Reference | Deliverable |
|---|---|---|---|
| TZ-010: Rate Limiting | `test-driven-development` | §6.1, §6.5 | `@nestjs/throttler` integration |
| TZ-011: Better Auth Evaluation | `brainstorming` | §6, §6.3 | Migration feasibility report |
| TZ-014: Security Hardening Phase 2 | `systematic-debugging` | §6.5, §6.6 | Helmet, CSP, HSTS, audit logging |

**Execution Strategy:**
1. TZ-010 first (quick win, high impact)
2. TZ-011 research parallel (decision point for TZ-012/013)
3. TZ-014 after TZ-010 (security headers depend on stable auth)
4. `receiving-code-review` for security-focused feedback

**Verification:** Security scan passes, rate limiting tested, headers validated
**Risk:** Medium — auth changes can break existing sessions

---

### Phase 3: Database & Type Safety (Weeks 6-8)
**Goal:** Introduce Drizzle ORM, tRPC, shared validation layer

| Task | Skill/Plugin | Rules Reference | Deliverable |
|---|---|---|---|
| TZ-020: Introduce Drizzle ORM | `brainstorming` + `writing-plans` | §8, §3.4 | Drizzle setup, schema layer |
| TZ-021: Migrate CRUD to Drizzle | `test-driven-development` + `subagent-driven-development` | §8.2, §3.1 | Migrated queries |
| TZ-022: Shared DB Package | `skill-creator` | §8, §19.1 | `packages/db` with exports |
| TZ-023: Introduce tRPC | `brainstorming` + `mcp-builder` | §5, §7 | tRPC server/client setup |
| TZ-024: Migrate Internal APIs to tRPC | `executing-plans` | §5.2, §7.3 | Converted endpoints |
| TZ-025: Shared Validation Layer | `test-driven-development` | §7, §7.2 | Zod schemas, centralized validation |

**Execution Strategy:**
1. TZ-020 first (foundation for TZ-021/022)
2. TZ-022 parallel with TZ-021 (shared package doesn't depend on migration)
3. TZ-023 after TZ-020 (tRPC needs DB layer)
4. TZ-024/025 sequential (migration then validation)
5. `subagent-driven-development` for TZ-021 (multiple CRUD modules)

**Verification:** All CRUD operations work, type inference functional, validation centralized
**Risk:** High — major architecture change, requires extensive testing

---

### Phase 4: Analytics & Queue System (Weeks 9-11)
**Goal:** Professional analytics engine, BullMQ infrastructure, CSV import workers

| Task | Skill/Plugin | Rules Reference | Deliverable |
|---|---|---|---|
| TZ-030: Query Optimization | `systematic-debugging` | §8.2, §14.1 | Cursor pagination, indexes |
| TZ-031: Professional Analytics Engine | `test-driven-development` | §4, §11 | Expectancy, Sharpe, drawdown |
| TZ-032: Behavioral Analytics | `subagent-driven-development` | §11.3, §12.2 | FOMO, revenge trading, streaks |
| TZ-033: Strategy Analytics | `test-driven-development` | §11.3, §4.5 | Setup/tag-based analytics |
| TZ-034: Analytics Snapshot Architecture | `executing-plans` | §11.2, §9.1 | Scheduled aggregation jobs |
| TZ-040: Setup BullMQ | `skill-creator` + `mcp-builder` | §10, §9 | Redis queues, workers |
| TZ-041: CSV Import Worker | `trade-import` + `test-driven-development` | §10.2, §3.1 | Async import system |
| TZ-042: AI Processing Queue | `executing-plans` | §10.2, §12 | Queue for embeddings, summaries |

**Execution Strategy:**
1. TZ-030 first (performance foundation)
2. TZ-031/032/033 parallel (analytics modules independent)
3. TZ-034 after TZ-031 (snapshots need analytics engine)
4. TZ-040 parallel with analytics (queue infrastructure independent)
5. TZ-041/042 after TZ-040 (workers need queue)
6. `trade-import` skill for TZ-041 (CSV processing expertise)

**Verification:** Analytics match manual calculations, queue processing functional, imports non-blocking
**Risk:** Medium-High — complex calculations, async processing

---

### Phase 5: Realtime Infrastructure (Weeks 12-13)
**Goal:** Socket.IO realtime layer, Redis pub/sub, live market streaming

| Task | Skill/Plugin | Rules Reference | Deliverable |
|---|---|---|---|
| TZ-050: Socket.IO Realtime Layer | `brainstorming` + `writing-plans` | §9.5, §6.1 | Authenticated sockets, rooms |
| TZ-051: Redis Pub/Sub Architecture | `mcp-builder` | §9.2, §9.3 | Pub/sub channels, TTL strategy |
| TZ-052: Live Market Streaming | `executing-plans` | §9.4, §9.3 | Symbol subscriptions, rate limiting |
| TZ-053: Realtime Dashboard Updates | `frontend-design` | §14.2, §13.1 | Live refresh, broadcasts |

**Execution Strategy:**
1. TZ-050 first (Socket.IO foundation)
2. TZ-051 parallel (Redis pub/sub independent)
3. TZ-052 after TZ-050/051 (streaming needs both)
4. TZ-053 last (frontend depends on backend)
5. `frontend-design` for TZ-053 (UI expertise)

**Verification:** Realtime updates functional, rate limiting enforced, stale data handled
**Risk:** Medium — realtime systems complex, requires careful testing

---

### Phase 6: AI Memory & Coaching (Weeks 14-16)
**Goal:** AI memory architecture, LangGraph integration, vector memory system

| Task | Skill/Plugin | Rules Reference | Deliverable |
|---|---|---|---|
| TZ-060: AI Memory Architecture | `brainstorming` | §12, §12.3 | Architecture document |
| TZ-061: LangGraph Integration | `mcp-builder` + `executing-plans` | §12.1, §12.2 | LangGraph runtime, workflows |
| TZ-062: Journal Intelligence Engine | `test-driven-development` | §12.2, §12.3 | Summarization, pattern detection |
| TZ-063: Vector Memory System | `skill-creator` | §12.4, §12.3 | Embeddings pipeline, vector DB |
| TZ-064: AI Coaching Engine | `executing-plans` | §12.1, §12.2 | Pattern analysis, coaching |
| TZ-065: AI Conversation Memory | `claude-mem` + `executing-plans` | §12.3, §12.5 | Chat persistence, retrieval |

**Execution Strategy:**
1. TZ-060 first (architecture foundation)
2. TZ-061 after TZ-060 (LangGraph needs architecture)
3. TZ-062/063 parallel (intelligence + vector memory independent)
4. TZ-064/065 after TZ-062/063 (coaching/memory need foundation)
5. `claude-mem` for TZ-065 (memory system expertise)
6. `mcp-builder` for TZ-061 (LangGraph tools)

**Verification:** AI memory functional, no hallucinations, user isolation enforced
**Risk:** High — AI systems complex, requires careful governance

---

### Phase 7: Product UX & Infrastructure (Weeks 17-19)
**Goal:** Mobile optimization, notifications, monitoring, backups

| Task | Skill/Plugin | Rules Reference | Deliverable |
|---|---|---|---|
| TZ-070: Mobile Optimization | `frontend-design` | §13, §14.2 | Responsive redesign |
| TZ-071: Notifications & Alerts | `executing-plans` | §13.2, §11 | Journal reminders, alerts |
| TZ-072: Report Generation | `skill-creator` | §13.3, §4.5 | PDF reports, exports |
| TZ-080: Monitoring Stack | `mcp-builder` | §15.4, §16 | Sentry, Grafana, Prometheus |
| TZ-081: Backup Automation | `executing-plans` | §15.3, §21 | Automated backups, recovery |
| TZ-082: Deployment Automation | `executing-plans` | §15.3, §18.2 | Blue-green deploys, rollback |
| TZ-083: Horizontal Scaling | `systematic-debugging` | §14.3, §15.4 | Multi-instance testing |
| TZ-084: Redis Benchmark | `systematic-debugging` | §9, §14.4 | Throughput analysis |

**Execution Strategy:**
1. TZ-070/071/072 parallel (product features independent)
2. TZ-080/081/082 parallel (infrastructure features independent)
3. TZ-083/084 after TZ-080 (scaling needs monitoring)
4. `frontend-design` for TZ-070 (mobile UI expertise)
5. `skill-creator` for TZ-072 (report generation tools)

**Verification:** Mobile UX functional, monitoring operational, backups validated
**Risk:** Medium — infrastructure changes, requires staging environment

---

### Phase 8: Governance & Engineering Discipline (Week 20)
**Goal:** Git workflow enforcement, engineering standards automation

| Task | Skill/Plugin | Rules Reference | Deliverable |
|---|---|---|---|
| TZ-090: Git Workflow Enforcement | Manual | §18, §18.1 | Branch guards, PR rules |
| TZ-091: Engineering Standards Automation | `skill-creator` | §17.2, §18.4 | CI quality gates |

**Execution Strategy:**
1. TZ-090 first (workflow foundation)
2. TZ-091 after TZ-090 (automation depends on workflow)
3. `skill-creator` for TZ-091 (CI automation tools)

**Verification:** Workflow enforced, CI gates functional
**Risk:** Low — process changes only

---

## Execution Guidelines

### Skill Usage Protocol
1. **Always load relevant skill before starting task** — ensures best practices
2. **Use `brainstorming` for design decisions** — explore alternatives before committing
3. **Use `writing-plans` for implementation** — detailed task breakdown
4. **Use `executing-plans` for execution** — checkpoint-based progress
5. **Use `verification-before-completion` before merging** — ensure quality
6. **Use `requesting-code-review` for PRs** — get feedback before merge

### Rules.md Compliance Checklist
- [ ] Data integrity preserved (§3)
- [ ] Financial logic deterministic (§4)
- [ ] Backend authoritative (§5)
- [ ] Security standards met (§6)
- [ ] Validation enforced (§7)
- [ ] Database standards followed (§8)
- [ ] Redis usage appropriate (§9)
- [ ] Queue requirements met (§10)
- [ ] Analytics integrity maintained (§11)
- [ ] AI governance followed (§12)
- [ ] UX consistency preserved (§13)
- [ ] Performance targets met (§14)
- [ ] Infrastructure standards met (§15)
- [ ] Logging standards followed (§16)
- [ ] Testing coverage adequate (§17)
- [ ] Git/CI rules enforced (§18)
- [ ] MVP discipline maintained (§19)
- [ ] Architecture evolution controlled (§20)
- [ ] Production readiness verified (§21)
- [ ] Engineering culture preserved (§22)

### Risk Mitigation
| Risk | Mitigation |
|---|---|
| Breaking changes | Feature flags, backward compatibility |
| Performance regression | Load testing, EXPLAIN ANALYZE |
| Security vulnerability | Trivy scans, npm audit, manual review |
| Data loss | Backups, reversible migrations, transactions |
| Scope creep | Strict adherence to acceptance criteria |
| Skill conflicts | Clear skill boundaries, manual override |

### Progress Tracking
- **Weekly:** Update this document with completed tasks
- **Per Task:** Create spec in `docs/superpowers/specs/`
- **Per Phase:** Review against Rules.md compliance
- **Per Merge:** Run `verification-before-completion` checklist

---

## Next Steps

1. **Review this plan** — confirm scope, priorities, timeline
2. **Approve Phase 0** — start with foundation setup
3. **Create first spec** — `docs/superpowers/specs/phase-0-foundation.md`
4. **Begin execution** — use `executing-plans` skill for Phase 0

---

*Plan generated from Rules.md + Improvements.md + current project state.
All tasks mapped to available skills/plugins and Rules.md constraints.*
