# TradeZen — Manual Setup Checklist

> All code is implemented. These are the manual steps you must complete to make everything work.

---

## 1. Environment Variables

### Root `.env` (or `.env.docker` for Docker)

```bash
# ── Database ─────────────────────────────────────────────────────────────────
DB_PASSWORD=<strong-random-password>

# ── JWT Secrets ──────────────────────────────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<64+ char hex string>
JWT_REFRESH_SECRET=<64+ char hex string>

# ── OAuth Providers ──────────────────────────────────────────────────────────
# See section 2 below for how to create these
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback

# ── OpenRouter (AI Chat) ─────────────────────────────────────────────────────
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_AVAILABLE_MODELS=qwen/qwen3-next-80b-a3b-instruct:free,google/gemma-3-4b-it:free,nvidia/nemotron-nano-9b-v2:free

# ── URLs ─────────────────────────────────────────────────────────────────────
WEB_URL=http://localhost:3000
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

### `apps/api/.env` (local dev, if not using Docker)

Same as above, plus:
```bash
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/tradezen
NODE_ENV=development
PORT=3001
REDIS_HOST=localhost
REDIS_PORT=6379
```

### `apps/web/.env.local`

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

---

## 2. OAuth Provider Setup

### Google OAuth

1. Go to https://console.cloud.google.com/apis/credentials
2. Create a project or select existing one
3. Click **Create Credentials** → **OAuth client ID**
4. Application type: **Web application**
5. Authorized JavaScript origins:
   - `http://localhost:3000`
   - `http://localhost:3001`
   - `https://your-domain.com` (production)
6. Authorized redirect URIs:
   - `http://localhost:3001/auth/google/callback`
   - `https://your-domain.com/auth/google/callback` (production)
7. Copy **Client ID** and **Client Secret** to `.env`

### GitHub OAuth

1. Go to https://github.com/settings/developers → **OAuth Apps**
2. Click **New OAuth App**
3. Application name: `TradeZen`
4. Homepage URL: `http://localhost:3000`
5. Authorization callback URL:
   - `http://localhost:3001/auth/github/callback`
   - `https://your-domain.com/auth/github/callback` (production)
6. Copy **Client ID** and generate **Client Secret** to `.env`

---

## 3. Database Migration

The schema has new tables and columns. Run:

```bash
# Option A: Drizzle push (dev only, drops data)
cd apps/api
bun run db:push

# Option B: Create migration (recommended)
cd apps/api
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

### New schema changes:
- `users` table: `password_hash` now nullable, added `auth_method` column (default: `'password'`)
- `accounts` table: new table for OAuth provider linking

### If using raw SQL:
```sql
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN auth_method TEXT NOT NULL DEFAULT 'password';

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  provider_email TEXT,
  provider_username TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);

CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_provider ON accounts(provider);
```

---

## 4. Docker Setup

```bash
# Create .env.docker
cp apps/api/.env.example .env.docker
# Fill in real values in .env.docker

# Start all services
docker-compose --env-file .env.docker up -d

# Run migrations inside container
docker-compose exec api npm run migrate  # npm inside container
```

---

## 5. GitHub Branch Protection (TZ-090)

Go to https://github.com/tampered-sin/Tradezen/settings/branches

### `main` branch:
- [x] Require pull request reviews before merging (1 approval)
- [x] Require status checks: `Security Audit`, `Lint & Type Check`, `Unit Tests`, `E2E Tests`
- [x] Require branches to be up to date
- [x] Include administrators
- [x] Do not allow deletions
- [x] Do not allow force pushes

### `develop` branch:
- [x] Require pull request reviews before merging (1 approval)
- [x] Require status checks: `Security Audit`, `Lint & Type Check`, `Unit Tests`
- [x] Require branches to be up to date

---

## 6. CI/CD Secrets

Go to https://github.com/tampered-sin/Tradezen/settings/secrets/actions

### Required secrets for `main` branch deployments:
| Secret | Purpose |
|--------|---------|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `RENDER_API_KEY` | Render deployment API key |
| `RENDER_SERVICE_ID` | Render service ID |
| `VERCEL_TOKEN` | Vercel deployment token |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `VERCEL_ORG_ID` | Vercel org ID |
| `CODECOV_TOKEN` | Codecov upload token (optional) |


---

## 7. Redis (for BullMQ queues)

If not using Docker, install Redis locally:

```bash
# macOS
brew install redis
brew services start redis

# Windows (use WSL or Docker)
# Docker is recommended: docker-compose up -d redis

# Ubuntu
sudo apt install redis-server
sudo systemctl start redis-server
```

Verify: `redis-cli ping` → should return `PONG`

---

## 8. AI/LLM Configuration

### OpenRouter (already configured)
- Set `OPENROUTER_API_KEY` in `.env`
- Models are pre-configured in `.env.example`

### If using OpenAI directly (for embeddings/AI memory):
```bash
OPENAI_API_KEY=sk-...
```

### If using local embeddings:
- No additional setup needed (pgvector handles it)

---

## 9. Production Deployment

### Render (API):
1. Connect repo → `apps/api`
2. Build command: `bun install && bun run build --filter=api`
3. Start command: `bun run start:prod`
4. Add all env vars from section 1
5. Attach PostgreSQL database

### Vercel (Web):
1. Connect repo → `apps/web`
2. Root directory: `apps/web`
3. Build command: `next build`
4. Add env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SENTRY_DSN`

### Or Docker Compose (self-hosted):
```bash
docker-compose --env-file .env.docker up -d
```

---

## 10. Post-Deployment Verification

After deployment, verify:

- [ ] API health: `curl https://your-api.com/` → returns `OK`
- [ ] Web loads: `https://your-web.com/` → login page visible
- [ ] Database connected: login with existing account works
- [ ] OAuth login: Google/GitHub buttons redirect correctly
- [ ] Realtime: create a trade → dashboard updates without refresh
- [ ] AI chat: send a message → receives response
- [ ] Backups: check `/backups/` directory for daily dumps
- [ ] CI/CD: push to `develop` → GitHub Actions runs successfully

---

## Quick Reference: What's Automated vs Manual

| Feature | Status | Manual Step |
|---------|--------|-------------|
| Validation hardening | ✅ Done | None |
| Error handling | ✅ Done | None |
| Transaction-safe DB | ✅ Done | None |
| Structured logging | ✅ Done | None |
| Rate limiting | ✅ Done | None |
| Security headers | ✅ Done | None |
| 2FA foundation | ✅ Done | Enable in UI |
| Drizzle ORM | ✅ Done | Run migration |
| tRPC integration | ✅ Done | None |
| Analytics engine | ✅ Done | None |
| BullMQ queues | ✅ Done | Start Redis |
| Socket.IO realtime | ✅ Done | None |
| AI memory (pgvector) | ✅ Done | Set OpenAI key |
| LangGraph workflows | ✅ Done | Set OpenAI key |
| Mobile responsive | ✅ Done | None |
| Notifications | ✅ Done | None |
| Report generation | ✅ Done | None |
| Backup automation | ✅ Done | Docker only |
| CI/CD pipeline | ✅ Done | Set secrets |
| Horizontal scaling | ✅ Done | Configure nginx |
| **OAuth (Google/GitHub)** | ✅ Done | **Create OAuth apps, set env vars** |
| **Database migration** | ✅ Code ready | **Run migration** |
| **Branch protection** | ✅ Guide ready | **Configure in GitHub** |
| **Environment variables** | ✅ Template ready | **Fill real values** |

---

*Generated 2026-05-17. All code implemented, these steps are configuration-only.*
