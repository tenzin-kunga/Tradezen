# TradeZen Architecture Guide

## Overview

TradeZen uses different architectures for development and production environments.

- Development: Local API/Web + Docker infrastructure
- Production: Vercel + Railway + Neon

## Development Architecture

```text
Developer PC
├── Next.js Web (Local)
├── NestJS API (Local)
└── Docker
    ├── PostgreSQL
    └── Redis
```

### Startup

```bash
docker compose --env-file .env.docker up -d postgres redis

cd apps/api
bun run dev

cd apps/web
bun run dev
```

## Production Architecture

```text
Users
  │
  ▼
Vercel (Next.js)
  │
  ▼
Railway (NestJS API)
  │
  ▼
Neon PostgreSQL
```

### Benefits

- Fast local development
- Managed production infrastructure
- Low operational overhead
- Easy scalability

## Alternative Self-Hosted Production

```text
Internet
  │
  ▼
Nginx/Caddy
  │
  ▼
Docker Network
├── Web
├── API
├── PostgreSQL
└── Redis
```
