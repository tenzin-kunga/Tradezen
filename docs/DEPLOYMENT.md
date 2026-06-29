# TradeZen — Production Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Deploy Backend (API)](#deploy-backend-api)
6. [Deploy Frontend (Web)](#deploy-frontend-web)
7. [SSL/TLS Configuration](#ssltls-configuration)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backups](#backups)
10. [Disaster Recovery](#disaster-recovery)

---

## Prerequisites

- Docker & Docker Compose installed on server (or Kubernetes cluster)
- Domain name (optional for dev, required for prod)
- SSL certificates (Let's Encrypt recommended)
- Server with ≥ 2GB RAM, ≥ 1 vCPU, ≥ 20GB storage

---

## Infrastructure Setup

### Option A: Single Server (VPS)

**Provider:** DigitalOcean, Linode, AWS EC2, Vultr

**Example (DigitalOcean Droplet):**

```bash
# 1. Create Ubuntu 22.04 LTS droplet (2GB RAM, 1 vCPU, 40GB SSD)
# 2. SSH into server
ssh root@your-server-ip

# 3. Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 4. Create tradezen user
adduser tradezen
usermod -aG docker tradezen
su - tradezen

# 5. Clone repo
git clone https://github.com/yourusername/Tradezen.git
cd Tradezen
```

### Option B: Docker Swarm (multi-node)

```bash
# Initialize swarm on manager node
docker swarm init

# Join workers (run on manager, then on each worker)
docker swarm join --token <token> <manager-ip>:2377

# Deploy stack
docker stack deploy -c infra/docker-compose.yml tradezen
```

### Option C: Kubernetes

```yaml
# k8s/deployment.yaml — create Kubernetes manifests
# Use Helm chart for easier management (recommended)
```

---

## Environment Configuration

### 1. Generate Secrets

```bash
# JWT secrets (64+ chars each)
openssl rand -base64 64 > jwt-secret.txt
openssl rand -base64 64 > jwt-refresh-secret.txt

# Database password (32+ chars)
openssl rand -base64 32 > db-password.txt

# Display them
cat jwt-secret.txt
cat jwt-refresh-secret.txt
cat db-password.txt
```

**Save these securely** — you won't be able to recover them.

### 2. Create `.env.docker` File

```bash
# On server, in project root (Tradezen/)
cp .env.docker.example .env.docker

# Edit .env.docker with actual values
nano .env.docker
```

Fill in:

```bash
DB_PASSWORD=<from db-password.txt>
JWT_SECRET=<from jwt-secret.txt>
JWT_REFRESH_SECRET=<from jwt-refresh-secret.txt>
OPENROUTER_API_KEY=<your-openrouter-key>

# Production overrides:
WEB_URL=https://tradezen.yourdomain.com
NODE_ENV=production
```

### 3. Secure `.env.docker`

```bash
chmod 600 .env.docker
echo ".env.docker" >> .gitignore  # Ensure it's never committed
```

---

## Database Setup

### Local PostgreSQL (Docker)

Already configured in `infra/docker-compose.yml`.

**Initialize:**

```bash
docker compose --file infra/docker-compose.yml --env-file .env.docker up -d postgres
docker compose --file infra/docker-compose.yml --env-file .env.docker exec postgres psql -U postgres -c "SELECT version();"
```

**Backup:**

```bash
docker compose --file infra/docker-compose.yml --env-file .env.docker exec postgres pg_dump -U postgres tradezen > backup_$(date +%Y%m%d).sql
```

**Restore:**

```bash
docker compose --file infra/docker-compose.yml --env-file .env.docker exec -T postgres psql -U postgres tradezen < backup_20250101.sql
```

### Cloud PostgreSQL (Production Recommendation)

**Providers:**

- **Neon** — serverless, auto-scaling, branching
- **Railway** — simple deployment, backups included
- **Supabase** — managed Postgres + auth (but you have custom auth)
- **AWS RDS** — full control, VPC integration

**Migration from local to cloud:**

```bash
# 1. Dump local DB
docker compose --file infra/docker-compose.yml exec postgres pg_dump -U postgres tradezen > local_dump.sql

# 2. Get cloud DB connection string from provider dashboard
export DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require

# 3. Restore to cloud
psql $DATABASE_URL -f local_dump.sql

# 4. Update .env.docker:
#    DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
#    (Comment out individual DB_* vars — DATABASE_URL takes precedence)
```

---

## Deploy Backend (API)

### Build & Run with Docker Compose

```bash
# In project root (Tradezen/)
docker compose --file infra/docker-compose.yml --env-file .env.docker up -d api

# View logs
docker compose --file infra/docker-compose.yml logs -f api

# Check health
curl http://localhost:3001/healthz  # or just /
```

### Manual Docker Build & Run

```bash
# Build
docker build -t tradezen-api ./apps/api

# Run
docker run -d \
  --name tradezen-api \
  --network tradezen-net \
  -p 3001:3001 \
  --env-file .env.docker \
  --restart unless-stopped \
  tradezen-api

# Health check
docker ps | grep tradezen-api
docker logs tradezen-api
```

---

## Deploy Frontend (Web)

### Docker Compose

```bash
docker compose --file infra/docker-compose.yml --env-file .env.docker up -d web

# Verify
curl http://localhost:3000
```

### Vercel Deployment (Recommended for Next.js)

**Automatic:** Push to `main` branch triggers Vercel deploy (if linked).

**Manual:**

```bash
# Install Vercel CLI
bun install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Environment variables in Vercel:**

- `NEXT_PUBLIC_API_URL` = `https://api.tradezen.yourdomain.com` (or Railway/Render URL)

---

## SSL/TLS Configuration

### Using Caddy (Easy, Automatic Let's Encrypt)

```yaml
# docker-compose.yml — add service:
  caddy:
    image: caddy:alpine
    container_name: tradezen-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    networks:
      tradezen-net:
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - api
      - web

volumes:
  caddy_data:
  caddy_config:
```

```txt
# caddy/Caddyfile
tradezen.yourdomain.com {
    # Reverse proxy API
    reverse_proxy /api/* api:3001

    # Reverse proxy Web (Next.js)
    reverse_proxy /* web:3000

    # Automatic HTTPS
    tls you@example.com
}
```

### Using Nginx + Let's Encrypt (Manual)

```bash
# Install certbot
apt-get install certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d tradezen.yourdomain.com

# Auto-renewal test
certbot renew --dry-run
```

---

## Monitoring & Logging

### Docker Logs

```bash
# View all logs
docker compose --file infra/docker-compose.yml logs -f

# View specific service
docker compose --file infra/docker-compose.yml logs -f api

# Log rotation (configure in /etc/docker/daemon.json)
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

### Application Monitoring

**Options:**

- **Prometheus + Grafana** — scrape metrics from app (add `/metrics` endpoint)
- **Datadog** — agent-based monitoring
- **New Relic** — APM for Node.js

### Health Checks

Already configured in Dockerfiles. Orchestrator will restart unhealthy containers.

---

## Backups

### Automated Daily Backups (PostgreSQL)

```bash
# crontab -e (as root or tradezen user)
0 2 * * * /usr/local/bin/backup-tradezen.sh
```

```bash
#!/bin/bash
# /usr/local/bin/backup-tradezen.sh
BACKUP_DIR=/backups/tradezen
DATE=$(date +%Y%m%d_%H%M%S)
docker compose --file /home/tradezen/Tradezen/infra/docker-compose.yml exec -T postgres pg_dump -U postgres tradezen > $BACKUP_DIR/tradezen_$DATE.sql
gzip $BACKUP_DIR/tradezen_$DATE.sql
find $BACKUP_DIR -type f -mtime +7 -delete  # Keep 7 days
```

**Off-site backups:** Sync to S3, Backblaze B2, or Dropbox weekly.

---

## Disaster Recovery

### Recovery from Backup

```bash
# 1. Stop services
docker compose --file infra/docker-compose.yml down

# 2. Restore database
gunzip -c backup_20250101.sql.gz | docker compose --file infra/docker-compose.yml exec -T postgres psql -U postgres tradezen

# 3. Restart services
docker compose --file infra/docker-compose.yml up -d

# 4. Verify
docker compose --file infra/docker-compose.yml ps
docker compose --file infra/docker-compose.yml logs --tail 50
```

### Rebuild from Scratch

```bash
# Nuclear option — destroy everything, rebuild fresh
docker compose --file infra/docker-compose.yml down -v  # removes volumes (DATA LOSS)
rm -rf pgdata redisdata
docker compose --file infra/docker-compose.yml --env-file .env.docker up -d

# Then restore from latest backup
```

---

## Scaling

### Horizontal Scaling (API)

```bash
# Scale API to 3 replicas
docker compose --file infra/docker-compose.yml up -d --scale api=3
```

**Requires:**

- Load balancer (nginx, HAProxy, Traefik) in front
- Session stickiness disabled (JWT is stateless)

### Database Connection Pooling

Use PgBouncer:

```yaml
pgbouncer:
  image: pgbouncer/pgbouncer:latest
  environment:
    - DATABASES=tradezen=postgres=postgres:5432
    - PGBOUNCER_AUTH_TYPE=md5
    - PGBOUNCER_ADMIN_USERS=postgres
  networks:
    - tradezen-net
  depends_on:
    - postgres
```

API connects to `pgbouncer:6432` instead of `postgres:5432`.

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs tradezen-api

# Common issues:
# - Missing env vars: "JWT_SECRET not set"
# - DB not ready: increase healthcheck start-period in Dockerfile or depends_on condition
```

### Database Connection Refused

```bash
# Verify postgres is healthy
docker compose --file infra/docker-compose.yml ps postgres
docker compose --file infra/docker-compose.yml logs postgres

# Test connection from API container
docker compose --file infra/docker-compose.yml exec api node -e "const {pool} = require('./dist/db'); pool.query('SELECT 1')"
```

### Healthcheck Failing

```bash
# Manually test endpoint
docker compose --file infra/docker-compose.yml exec api curl http://localhost:3001/

# If Swagger in prod: disable it or update healthcheck to hit `/` instead of `/api/docs`
```

### High Memory Usage

```bash
# Check container memory
docker stats

# If API > 400MB, check for memory leaks
# Use --inspect and Chrome DevTools, or clinic.js
```

---

## Security Checklist

- [ ] `.env.docker` file with strong secrets
- [ ] `.env.docker` in `.gitignore`
- [ ] No secrets in Docker image history (`docker history tradezen-api`)
- [ ] Non-root user in Dockerfile (`USER nestjs`)
- [ ] Swagger disabled in production
- [ ] CORS restricted to production domain
- [ ] HTTPS enforced (HSTS header)
- [ ] DB not exposed to host (`ports:` removed)
- [ ] Resource limits set (`deploy.resources`)
- [ ] Health checks defined
- [ ] Restart policy: `unless-stopped`
- [ ] Regular backups scheduled
- [ ] Monitoring dashboard set up
- [ ] Log aggregation (Papertrail, Loggly, Loki)

---

## Cost Estimate (Monthly)

| Service           | Provider      | Cost (USD)              |
| ----------------- | ------------- | ----------------------- |
| VPS (2GB RAM)     | DigitalOcean  | $12                     |
| PostgreSQL (Neon) | Neon          | Free tier → $19 (100GB) |
| SSL Certificate   | Let's Encrypt | Free                    |
| Backups (S3)      | Backblaze B2  | $0.005/GB/month         |
| Monitoring        | Grafana Cloud | Free tier               |
| **Total**         |               | **~$31-50/month**       |

(Using Render/Railway instead of VPS: ~$7-25/month for hobby/prod tiers)

---

## Support

For questions, refer to:

- `SECURITY.md` — Security hardening details
- `docs/Architecture.md` — Full architecture & dev guide
- `README.md` — Quick start
