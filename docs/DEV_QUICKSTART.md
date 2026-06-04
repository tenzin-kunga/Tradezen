# TradeZen — Developer Quick Start (Hardened Setup)

## Prerequisites

- **Bun 1.3+** (recommended) or Node.js 20+
- **Docker Desktop** (includes Docker Compose)
- **Git**

## 1. Clone & Install

```bash
git clone https://github.com/tampered-sin/Tradezen.git
cd Tradezen

# Install dependencies (monorepo)
bun install
```

## 2. Environment Setup

```bash
# Copy environment template
cp .env.docker.example .env.docker

# Edit .env.docker with your values (or use defaults for local dev)
# Minimum required for local:
#   DB_PASSWORD (any non-empty string)
#   JWT_SECRET (generate: openssl rand -base64 64)
#   JWT_REFRESH_SECRET (generate: openssl rand -base64 64)
nano .env.docker
```

For local development, you can use simple defaults:
```bash
DB_PASSWORD=localdevpassword123
JWT_SECRET=dev-secret-only-for-local-development-not-for-production-1234567890
JWT_REFRESH_SECRET=dev-refresh-secret-only-for-local-1234567890
OPENROUTER_API_KEY=sk-or-v1-...  # optional, only if using chat
```

⚠️ **Never commit `.env.docker`** — it's in `.gitignore`.

## 3. Start Infrastructure

```bash
# Start PostgreSQL + Redis
docker-compose --env-file .env.docker up -d postgres redis

# Wait for Postgres to be ready (10-15s)
docker-compose exec postgres pg_isready -U postgres

# Optional: Initialize DB with migrations (uses npm inside container)
docker-compose exec api npm run migrate
```

## 4. Start Development Servers

**Option A: Using start.bat (Windows)**
Double-click `start.bat` — it will start Docker, launch API and Web in separate CMD windows.

**Option B: Manual (cross-platform)**

```bash
# From repo root — builds @tradezen/db, then starts both apps
bun run dev
# → API: http://localhost:3001  Web: http://localhost:3000

# Or individually:
# Terminal 1 — API (NestJS)
cd apps/api && bun run dev

# Terminal 2 — Web (Next.js)
cd apps/web && bun run dev
```

## 5. Verify Installation

- **Frontend:** http://localhost:3000
- **API Docs:** http://localhost:3001/api/docs
- **API Health:** http://localhost:3001/

Create account → log in → add a trade → see it in the trade log.

---

## Common Tasks

### Reset Database

```bash
docker-compose down -v  # WARNING: deletes all data
docker-compose up -d postgres
docker-compose exec api npm run migrate  # npm inside container
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
```

### Run Tests

```bash
# Unit tests
bun run test

# E2E tests (requires DB running)
docker-compose up -d postgres redis
bun run test:e2e --filter=api
```

### Lint & Format

```bash
bun run lint
bun run check-types
bun run format
```

### Build for Production

```bash
# Build all packages
bun run build

# Build Docker images
docker-compose --env-file .env.docker build

# Run production stack
docker-compose --env-file .env.docker up -d
```

---

## Troubleshooting

### Port 3000/3001 Already in Use

```bash
# Find process using port
lsof -i :3000   # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill it
kill -9 <pid>   # macOS/Linux
taskkill /PID <pid> /F  # Windows
```

### Docker Daemon Not Running

```bash
# Start Docker Desktop (Windows/macOS)
# Or start Docker service (Linux)
sudo systemctl start docker
```

### Database Connection Refused

```bash
# Check Postgres is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Wait longer — first startup can take 20-30s for init
```

### Out of Memory (Node.js)

```bash
# Increase Node memory (Next.js dev mode)
# In apps/web/package.json, change dev script:
"dev": "set NODE_OPTIONS=--max-old-space-size=4096 && next dev"  # Windows
# or
"dev": "NODE_OPTIONS='--max-old-space-size=4096' next dev"  # Unix
```

### Migrations Fail

```bash
# Check if migrations table exists
docker-compose exec postgres psql -U postgres -d tradezen -c "\dt"

# Run migrations manually
docker-compose exec api npm run migrate  # npm inside container
```

---

## Security Notes (Local Dev)

- Using weak JWT secrets & DB password is **OK for localhost only**
- **Never** use these values in production
- Generate real secrets for production (see DEPLOYMENT.md)

---

## Project Structure

```
tradezen/
├── apps/
│   ├── api/          # NestJS backend (3001)
│   │   ├── src/
│   │   │   ├── auth/        # Authentication module
│   │   │   ├── trades/      # Trades CRUD
│   │   │   ├── journals/    # Daily journal
│   │   │   ├── tags/        # Tag management
│   │   │   └── chat/        # AI assistant
│   │   └── migrations/      # SQL migrations
│   └── web/          # Next.js frontend (3000)
│       └── app/
│           ├── dashboard/
│           ├── trades/
│           ├── add-trade/
│           ├── analytics/
│           ├── journal/
│           └── login/
├── packages/
│   ├── types/        # Shared TypeScript types
│   └── ui/           # Shared components (planned)
├── docker-compose.yml
├── start.bat         # Windows startup script
└── README.md
```

---

## IDE Setup (VS Code Recommended)

```bash
# Install extensions
ext install:
  - dbaeumer.vscode-eslint
  - esbenp.prettier-vscode
  - ms-vscode.vscode-typescript-next
  - joelday.docthis  # JSDoc generator

# Workspace settings (already in .vscode/settings.json)
# - Format on save
# - ESLint auto-fix
# - Prettier defaults
```

---

## Next Steps

1. **Read Architecture:** `PROJECT_RUNDDOWN.md` (full technical deep-dive)
2. **Security Review:** `SECURITY.md` (Docker, CI/CD hardening)
3. **Deploy:** `DEPLOYMENT.md` (when ready for production)
4. **Todo List:** `IMPLEMENTATION-TASK.md` (feature roadmap)

---

## Getting Help

- **Docs:** See `/docs` folder
- **Issues:** https://github.com/tampered-sin/Tradezen/issues
- **Discussions:** GitHub Discussions tab

---

**Happy Trading! 📈**
