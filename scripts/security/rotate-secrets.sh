#!/usr/bin/env bash
# ── TradeZen Secret Rotation Script ──────────────────────────────────────────
# Purpose: Rotate all secrets after a leak or periodic security review.
# WARNING: This invalidates all existing sessions (users must re-login).

set -e

echo "=========================================="
echo "  TradeZen Secret Rotation Tool"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ── 1. Generate New Secrets ───────────────────────────────────────────────────
echo -e "${YELLOW}[1/5] Generating new secrets...${NC}"

NEW_JWT_SECRET=$(openssl rand -base64 64)
NEW_JWT_REFRESH_SECRET=$(openssl rand -base64 64)
NEW_DB_PASSWORD=$(openssl rand -base64 32)

echo "  ✓ Generated JWT_SECRET (64 chars)"
echo "  ✓ Generated JWT_REFRESH_SECRET (64 chars)"
echo "  ✓ Generated DB_PASSWORD (32 chars)"

# ── 2. Backup Current .env.docker ─────────────────────────────────────────────
echo -e "\n${YELLOW}[2/5] Backing up current environment file...${NC}"

if [ -f ".env.docker" ]; then
  cp .env.docker ".env.docker.backup.$(date +%Y%m%d_%H%M%S)"
  echo "  ✓ Backed up to .env.docker.backup.$(date +%Y%m%d_%H%M%S)"
else
  echo -e "${RED}   ✗ .env.docker not found! Create it first.${NC}"
  exit 1
fi

# ── 3. Update .env.docker ─────────────────────────────────────────────────────
echo -e "\n${YELLOW}[3/5] Updating .env.docker with new secrets...${NC}"

# Use sed to replace values (preserves comments/format)
sed -i.bak "s/^DB_PASSWORD=.*/DB_PASSWORD=${NEW_DB_PASSWORD}/" .env.docker
sed -i.bak "s/^JWT_SECRET=.*/JWT_SECRET=${NEW_JWT_SECRET}/" .env.docker
sed -i.bak "s/^JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=${NEW_JWT_REFRESH_SECRET}/" .env.docker

rm -f .env.docker.bak

echo "  ✓ .env.docker updated"

# ── 4. Restart Docker Services ────────────────────────────────────────────────
echo -e "\n${YELLOW}[4/5] Restarting Docker services...${NC}"

docker-compose --env-file .env.docker down
docker-compose --env-file .env.docker up -d postgres

# Wait for Postgres
echo "  Waiting for Postgres to be ready..."
for i in {1..30}; do
  if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "  ✓ Postgres is ready"
    break
  fi
  sleep 1
  if [ $i -eq 30 ]; then
    echo -e "${RED}  ✗ Postgres failed to start${NC}"
    exit 1
  fi
done

# Change DB password (if using same container, just update env works on restart)
# But if DB was using old password from .env, we need to update postgres user password
echo "  Updating Postgres user password..."
docker-compose exec -T postgres psql -U postgres -c "ALTER USER postgres WITH PASSWORD '${NEW_DB_PASSWORD}';"

echo "  ✓ Services restarted with new credentials"

# ── 5. Update CI/CD Secrets ───────────────────────────────────────────────────
echo -e "\n${YELLOW}[5/5] CI/CD Secret Updates Required${NC}"
echo -e "${RED}⚠️  MANUAL ACTION REQUIRED:${NC}"
echo ""
echo "The following GitHub Secrets must be updated in your repository:"
echo "  https://github.com/tampered-sin/Tradezen/settings/secrets/actions"
echo ""
echo "  Secret Name              │ New Value"
echo "  -------------------------┼─────────────────────────────────────"
echo "  JWT_SECRET               │ ${NEW_JWT_SECRET:0:30}..."
echo "  JWT_REFRESH_SECRET       │ ${NEW_JWT_REFRESH_SECRET:0:30}..."
echo "  DB_PASSWORD              │ ${NEW_DB_PASSWORD:0:30}..."
echo ""
echo "Also update Render/Railway environment variables if deployed."
echo ""
echo -e "${GREEN}✅ Secret rotation complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Update GitHub Secrets (see above)"
echo "  2. Redeploy to production (git push to main)"
echo "  3. Notify users they need to re-login (all sessions invalidated)"
echo ""
