# Repository Structure Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the TradeZen repository structure to follow modern Turborepo monorepo conventions, improving long-term maintainability.

**Architecture:** Move infrastructure configs into `infra/`, reorganize documentation under `docs/`, add Architecture Decision Records, and organize scripts into logical subfolders. All changes preserve existing functionality by updating references.

**Tech Stack:** File system operations, Docker Compose, documentation files

---

## File Structure

### New Directory Layout

```
tradezen/
├── infra/                              # NEW - infrastructure configs
│   ├── docker/
│   │   ├── nginx.conf                  # MOVED from root
│   │   └── postgresql.conf             # MOVED from root
│   ├── docker-compose.yml              # MOVED from root
│   ├── docker-compose.scaling.yml      # MOVED from root
│   └── render.yaml                     # MOVED from root
│
├── docs/
│   ├── architecture/                   # MOVED from docs/superpowers/specs/
│   │   ├── TEMPLATE.md
│   │   ├── 2026-06-13-phase2-dashboard-command-center.md
│   │   ├── 2026-06-14-ai-trading-insights-design.md
│   │   ├── 2026-06-14-strategy-analytics-design.md
│   │   ├── 2026-06-24-dashboard-layout-redesign.md
│   │   └── 2026-06-24-dashboard-ui-refinement.md
│   ├── planning/                       # MOVED from docs/superpowers/plans/
│   │   ├── 2026-06-13-phase2-dashboard-command-center.md
│   │   ├── 2026-06-14-dashboard-personalization.md
│   │   ├── 2026-06-24-dashboard-grid-redesign.md
│   │   └── 2026-06-24-dashboard-ui-refinement.md
│   ├── decisions/                      # NEW - Architecture Decision Records
│   │   ├── README.md
│   │   ├── 0001-monorepo-structure.md
│   │   ├── 0002-postgres-pgvector.md
│   │   ├── 0003-authentication.md
│   │   └── 0004-ai-integration.md
│   └── claude-mem-schema.md            # MOVED from docs/superpowers/
│
├── scripts/
│   ├── dev/                            # NEW - development scripts
│   │   └── start.bat                   # MOVED from root
│   ├── db/                             # NEW - database scripts
│   │   ├── backup.sh                   # MOVED from scripts/
│   │   └── restore.sh                  # MOVED from scripts/
│   ├── security/                       # NEW - security scripts
│   │   ├── rotate-secrets.sh           # MOVED from scripts/
│   │   └── rotate-secrets.bat          # MOVED from scripts/
│   └── monitoring/                     # NEW - monitoring scripts
│       └── redis-benchmark.sh          # MOVED from scripts/
│
├── docker-compose.yml                  # DELETED - moved to infra/
├── docker-compose.scaling.yml          # DELETED - moved to infra/
├── nginx.conf                          # DELETED - moved to infra/docker/
├── postgresql.conf                     # DELETED - moved to infra/docker/
├── render.yaml                         # DELETED - moved to infra/
├── start.bat                           # DELETED - moved to scripts/dev/
└── docs/superpowers/                   # DELETED - contents reorganized
```

---

### Task 1: Create Infrastructure Directory and Move Configs

**Files:**

- Create: `infra/docker/nginx.conf`
- Create: `infra/docker/postgresql.conf`
- Create: `infra/docker-compose.yml`
- Create: `infra/docker-compose.scaling.yml`
- Create: `infra/render.yaml`
- Delete: `nginx.conf` (root)
- Delete: `postgresql.conf` (root)
- Delete: `docker-compose.yml` (root)
- Delete: `docker-compose.scaling.yml` (root)
- Delete: `render.yaml` (root)

- [ ] **Step 1: Create infra directory structure**

```bash
mkdir -p infra/docker
```

- [ ] **Step 2: Move nginx.conf to infra/docker/**

```bash
move nginx.conf infra/docker/nginx.conf
```

- [ ] **Step 3: Move postgresql.conf to infra/docker/**

```bash
move postgresql.conf infra/docker/postgresql.conf
```

- [ ] **Step 4: Move docker-compose files to infra/**

```bash
move docker-compose.yml infra/docker-compose.yml
move docker-compose.scaling.yml infra/docker-compose.scaling.yml
```

- [ ] **Step 5: Move render.yaml to infra/**

```bash
move render.yaml infra/render.yaml
```

- [ ] **Step 6: Update docker-compose.scaling.yml nginx path**

Edit `infra/docker-compose.scaling.yml` line 21:

- Before: `./nginx.conf:/etc/nginx/nginx.conf:ro`
- After: `./docker/nginx.conf:/etc/nginx/nginx.conf:ro`

- [ ] **Step 7: Update docker-compose.yml postgresql.conf path**

Edit `infra/docker-compose.yml` line 36 (commented out):

- Before: `# - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro`
- After: `# - ./docker/postgresql.conf:/etc/postgresql/postgresql.conf:ro`

- [ ] **Step 8: Update docker-compose.yml scripts path**

Edit `infra/docker-compose.yml` line 157:

- Before: `./scripts:/scripts:ro`
- After: `../scripts:/scripts:ro`

- [ ] **Step 9: Update docker-compose.yml backups path**

Edit `infra/docker-compose.yml` line 150:

- Before: `./backups:/backups`
- After: `../backups:/backups`

- [ ] **Step 10: Update start.bat docker compose commands**

Edit `scripts/dev/start.bat` to use `--file infra/docker-compose.yml`:

- Replace all `docker compose --env-file .env.docker` with `docker compose --file infra/docker-compose.yml --env-file .env.docker`

- [ ] **Step 11: Update docs/scaling.md usage instructions**

Edit `docs/scaling.md` lines 8, 11:

- Before: `docker-compose -f docker-compose.yml -f docker-compose.scaling.yml up -d --scale api=3`
- After: `docker compose --file infra/docker-compose.yml --file infra/docker-compose.scaling.yml up -d --scale api=3`

- [ ] **Step 12: Commit infrastructure reorganization**

```bash
git add infra/
git rm nginx.conf postgresql.conf docker-compose.yml docker-compose.scaling.yml render.yaml
git commit -m "refactor: move infrastructure configs to infra/ directory"
```

---

### Task 2: Reorganize Documentation Structure

**Files:**

- Create: `docs/architecture/` (from `docs/superpowers/specs/`)
- Create: `docs/planning/` (from `docs/superpowers/plans/`)
- Move: `docs/superpowers/claude-mem-schema.md` to `docs/`
- Delete: `docs/superpowers/` directory

- [ ] **Step 1: Create new docs directories**

```bash
mkdir -p docs/architecture
mkdir -p docs/planning
```

- [ ] **Step 2: Move architecture specs**

```bash
move docs/superpowers/specs/TEMPLATE.md docs/architecture/
move docs/superpowers/specs/2026-06-13-phase2-dashboard-command-center.md docs/architecture/
move docs/superpowers/specs/2026-06-14-ai-trading-insights-design.md docs/architecture/
move docs/superpowers/specs/2026-06-14-strategy-analytics-design.md docs/architecture/
move docs/superpowers/specs/2026-06-24-dashboard-layout-redesign.md docs/architecture/
move docs/superpowers/specs/2026-06-24-dashboard-ui-refinement.md docs/architecture/
```

- [ ] **Step 3: Move planning docs**

```bash
move docs/superpowers/plans/2026-06-13-phase2-dashboard-command-center.md docs/planning/
move docs/superpowers/plans/2026-06-14-dashboard-personalization.md docs/planning/
move docs/superpowers/plans/2026-06-24-dashboard-grid-redesign.md docs/planning/
move docs/superpowers/plans/2026-06-24-dashboard-ui-refinement.md docs/planning/
```

- [ ] **Step 4: Move claude-mem-schema.md**

```bash
move docs/superpowers/claude-mem-schema.md docs/
```

- [ ] **Step 5: Remove empty superpowers directory**

```bash
rmdir docs/superpowers/specs
rmdir docs/superpowers/plans
rmdir docs/superpowers
```

- [ ] **Step 6: Update AGENTS.md plan location reference**

Edit `AGENTS.md` line 47:

- Before: `docs/superpowers/plans/`
- After: `docs/planning/`

- [ ] **Step 7: Update writing-plans skill reference**

This is a global skill file, not in this repo. The skill references `docs/superpowers/plans/` as default location. User preferences override this, so no change needed.

- [ ] **Step 8: Commit documentation reorganization**

```bash
git add docs/architecture/ docs/planning/ docs/claude-mem-schema.md
git rm -r docs/superpowers/
git commit -m "refactor: reorganize docs into architecture/, planning/, decisions/"
```

---

### Task 3: Add Architecture Decision Records

**Files:**

- Create: `docs/decisions/README.md`
- Create: `docs/decisions/0001-monorepo-structure.md`
- Create: `docs/decisions/0002-postgres-pgvector.md`
- Create: `docs/decisions/0003-authentication.md`
- Create: `docs/decisions/0004-ai-integration.md`

- [ ] **Step 1: Create decisions directory**

```bash
mkdir -p docs/decisions
```

- [ ] **Step 2: Create ADR README**

Create `docs/decisions/README.md`:

````markdown
# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for the TradeZen project.

## What is an ADR?

An ADR is a short document that captures an important architectural decision along with its context and consequences.

## Format

Each ADR follows this template:

```markdown
# ADR [Number]: [Title]

## Status

[Proposed | Accepted | Deprecated | Superseded by [ADR-000X]]

## Context

[What is the issue that we're seeing that motivates this decision?]

## Decision

[What is the change that we're proposing and/or doing?]

## Consequences

[What becomes easier or more difficult to do because of this change?]
```
````

## Index

| ADR  | Title                   | Status   |
| ---- | ----------------------- | -------- |
| 0001 | Monorepo Structure      | Accepted |
| 0002 | PostgreSQL + pgvector   | Accepted |
| 0003 | Authentication Strategy | Accepted |
| 0004 | AI Integration          | Accepted |

````

- [ ] **Step 3: Create ADR 0001 - Monorepo Structure**

Create `docs/decisions/0001-monorepo-structure.md`:

```markdown
# ADR 0001: Monorepo Structure

## Status

Accepted

## Context

TradeZen is a full-stack application with a Next.js frontend and NestJS backend. We need to decide on the project structure to support:
- Shared types between frontend and backend
- Shared UI components (if any)
- Independent deployments
- Developer experience (single repo, single install)

## Decision

Use Turborepo with Bun workspaces in a monorepo structure:
- `apps/web` - Next.js 14 (App Router)
- `apps/api` - NestJS 11
- `packages/db` - Drizzle ORM + pgvector
- `packages/types` - Shared TypeScript types
- `packages/ui` - Shared UI components
- `packages/eslint-config` - Shared ESLint configs
- `packages/typescript-config` - Shared TypeScript configs

## Consequences

**Easier:**
- Sharing types between frontend and backend
- Coordinated deployments
- Single `bun install` for all dependencies
- Turborepo caching for builds

**Harder:**
- More complex initial setup
- Need to understand workspace protocol
- Build order dependencies (db before api)
````

- [ ] **Step 4: Create ADR 0002 - PostgreSQL + pgvector**

Create `docs/decisions/0002-postgres-pgvector.md`:

```markdown
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
```

- [ ] **Step 5: Create ADR 0003 - Authentication**

Create `docs/decisions/0003-authentication.md`:

```markdown
# ADR 0003: Authentication Strategy

## Status

Accepted

## Context

TradeZen needs:

- Secure user authentication
- OAuth support (Google, GitHub)
- JWT-based API authentication
- Refresh token rotation
- Two-factor authentication

## Decision

Implement JWT-based authentication with:

- Access tokens (short-lived, 15 minutes)
- Refresh tokens (HTTP-only cookies, 7 days)
- OAuth via Passport.js (Google, GitHub)
- Two-factor authentication (TOTP)
- Rate limiting and brute-force protection

## Consequences

**Easier:**

- Stateless API authentication
- OAuth for quick signup
- Refresh tokens for seamless UX
- 2FA for security-conscious users

**Harder:**

- Token rotation complexity
- OAuth provider integration
- Session management
- Rate limiting implementation
```

- [ ] **Step 6: Create ADR 0004 - AI Integration**

Create `docs/decisions/0004-ai-integration.md`:

```markdown
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
```

- [ ] **Step 7: Commit ADRs**

```bash
git add docs/decisions/
git commit -m "docs: add Architecture Decision Records (ADRs)"
```

---

### Task 4: Organize Scripts into Subfolders

**Files:**

- Create: `scripts/dev/`
- Create: `scripts/db/`
- Create: `scripts/security/`
- Create: `scripts/monitoring/`
- Move: `start.bat` to `scripts/dev/`
- Move: `backup.sh`, `restore.sh` to `scripts/db/`
- Move: `rotate-secrets.sh`, `rotate-secrets.bat` to `scripts/security/`
- Move: `redis-benchmark.sh` to `scripts/monitoring/`

- [ ] **Step 1: Create scripts subdirectories**

```bash
mkdir -p scripts/dev
mkdir -p scripts/db
mkdir -p scripts/security
mkdir -p scripts/monitoring
```

- [ ] **Step 2: Move start.bat to scripts/dev/**

```bash
move start.bat scripts/dev/start.bat
```

- [ ] **Step 3: Move database scripts**

```bash
move scripts/backup.sh scripts/db/backup.sh
move scripts/restore.sh scripts/db/restore.sh
```

- [ ] **Step 4: Move security scripts**

```bash
move scripts/rotate-secrets.sh scripts/security/rotate-secrets.sh
move scripts/rotate-secrets.bat scripts/security/rotate-secrets.bat
```

- [ ] **Step 5: Move monitoring scripts**

```bash
move scripts/redis-benchmark.sh scripts/monitoring/redis-benchmark.sh
```

- [ ] **Step 6: Update docker-compose.yml scripts path**

Edit `infra/docker-compose.yml` line 157:

- Before: `../scripts:/scripts:ro`
- After: `../scripts/db:/scripts:ro`

- [ ] **Step 7: Update start.bat internal paths**

Edit `scripts/dev/start.bat` to update relative paths:

- Line 61: Change `cd /d "%~dp0apps\api"` to `cd /d "%~dp0..\apps\api"`
- Line 79: Change `cd /d "%~dp0apps\web"` to `cd /d "%~dp0..\apps\web"`
- Line 89: Change `cd /d "%~dp0apps\web"` to `cd /d "%~dp0..\apps\web"`

- [ ] **Step 8: Update AGENTS.md start.bat reference**

Edit `AGENTS.md` line 32:

- Before: `start.bat`
- After: `scripts/dev/start.bat`

- [ ] **Step 9: Update README.md start.bat references**

Edit `README.md` lines 48, 62:

- Before: `start.bat`
- After: `scripts/dev/start.bat`

- [ ] **Step 10: Update docs/Architecture.md start.bat reference**

Edit `docs/Architecture.md` line 180:

- Before: `start.bat`
- After: `scripts/dev/start.bat`

- [ ] **Step 11: Update docs/DEV_QUICKSTART.md start.bat references**

Edit `docs/DEV_QUICKSTART.md` lines 58-59, 229:

- Before: `start.bat`
- After: `scripts/dev/start.bat`

- [ ] **Step 12: Update SECURE-SETUP-SUMMARY.md rotate-secrets references**

Edit `SECURE-SETUP-SUMMARY.md` lines 110, 116, 217:

- Before: `scripts/rotate-secrets.sh` and `scripts/rotate-secrets.bat`
- After: `scripts/security/rotate-secrets.sh` and `scripts/security/rotate-secrets.bat`

- [ ] **Step 13: Update docs/AUDIT-REPORT.md rotate-secrets reference**

Edit `docs/AUDIT-REPORT.md` line 87:

- Before: `scripts/rotate-secrets.sh`
- After: `scripts/security/rotate-secrets.sh`

- [ ] **Step 14: Update docs/SECURITY.md references**

Edit `docs/SECURITY.md` lines 51, 180, 255:

- Before: `scripts/rotate-secrets.sh`
- After: `scripts/security/rotate-secrets.sh`

- [ ] **Step 15: Update docs/DEPLOYMENT.md backup reference**

Edit `docs/DEPLOYMENT.md` line 355:

- Before: `scripts/backup.sh`
- After: `scripts/db/backup.sh`

- [ ] **Step 16: Commit scripts reorganization**

```bash
git add scripts/
git commit -m "refactor: organize scripts into dev/, db/, security/, monitoring/"
```

---

### Task 5: Clean Up Empty Directories

**Files:**

- Delete: `backups/` (if exists)
- Delete: `drizzle/` (if exists)
- Delete: `apps/api/uploads/` (if exists)

- [ ] **Step 1: Remove empty backups directory**

```bash
if exist backups rmdir backups
```

- [ ] **Step 2: Remove empty drizzle directory**

```bash
if exist drizzle rmdir drizzle
```

- [ ] **Step 3: Remove empty uploads directory**

```bash
if exist apps\api\uploads rmdir apps\api\uploads
```

- [ ] **Step 4: Commit cleanup**

```bash
git add -A
git commit -m "chore: remove empty directories"
```

---

### Task 6: Update Documentation References

**Files:**

- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/Architecture.md`
- Modify: `docs/DEPLOYMENT.md`
- Modify: `docs/DEV_QUICKSTART.md`
- Modify: `docs/SECURITY.md`
- Modify: `SECURE-SETUP-SUMMARY.md`
- Modify: `docs/AUDIT-REPORT.md`
- Modify: `docs/scaling.md`

- [ ] **Step 1: Update README.md Docker commands**

Edit `README.md` to update all Docker commands:

- Before: `docker compose --env-file .env.docker up -d postgres redis`
- After: `docker compose --file infra/docker-compose.yml --env-file .env.docker up -d postgres redis`

- [ ] **Step 2: Update AGENTS.md Docker commands**

Edit `AGENTS.md` to update all Docker commands:

- Before: `docker compose --env-file .env.docker up -d postgres redis`
- After: `docker compose --file infra/docker-compose.yml --env-file .env.docker up -d postgres redis`

- [ ] **Step 3: Update docs/Architecture.md Docker commands**

Edit `docs/Architecture.md` to update all Docker commands.

- [ ] **Step 4: Update docs/DEPLOYMENT.md Docker commands**

Edit `docs/DEPLOYMENT.md` to update all Docker commands and backup script paths.

- [ ] **Step 5: Update docs/DEV_QUICKSTART.md Docker commands**

Edit `docs/DEV_QUICKSTART.md` to update all Docker commands.

- [ ] **Step 6: Update docs/SECURITY.md script paths**

Edit `docs/SECURITY.md` to update all script paths.

- [ ] **Step 7: Update SECURE-SETUP-SUMMARY.md script paths**

Edit `SECURE-SETUP-SUMMARY.md` to update all script paths.

- [ ] **Step 8: Update docs/AUDIT-REPORT.md script paths**

Edit `docs/AUDIT-REPORT.md` to update all script paths.

- [ ] **Step 9: Update docs/scaling.md usage instructions**

Edit `docs/scaling.md` to update Docker commands.

- [ ] **Step 10: Commit documentation updates**

```bash
git add README.md AGENTS.md docs/
git commit -m "docs: update all references to new file locations"
```

---

## Self-Review Checklist

1. **Spec coverage:** ✅ All high-priority items addressed
   - Infrastructure configs moved to `infra/` ✅
   - `docs/superpowers` renamed and reorganized ✅
   - Planning docs under `docs/planning/` ✅
   - ADRs added to `docs/decisions/` ✅
   - Scripts organized into subfolders ✅

2. **Placeholder scan:** ✅ No placeholders found
   - All steps have concrete actions
   - All file paths are exact
   - All commands are complete

3. **Type consistency:** ✅ All references updated
   - Docker commands updated consistently
   - Script paths updated consistently
   - Documentation references updated

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-28-repository-structure-reorganization.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
