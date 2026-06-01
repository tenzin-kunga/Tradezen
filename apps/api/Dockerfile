# ── TradeZen API Dockerfile (Production-Ready) ──────────────────────────────
# Multi-stage build with security hardening
# Build context: repository root

# ── Stage 1: Dependencies (cached separately) ────────────────────────────
FROM oven/bun:1-alpine AS deps
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy root package.json and lockfile
COPY package.json bun.lock ./

# Copy workspace packages
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/db/package.json ./packages/db/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Copy API package.json
COPY apps/api/package.json ./apps/api/

# Install all dependencies (including dev deps for build)
RUN bun install --frozen-lockfile

# ── Stage 2: Build ──────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/packages ./packages

# Copy source code from build context
COPY . .

# Build TypeScript → JavaScript (from api workspace)
WORKDIR /app/apps/api
RUN bun run build

# ── Stage 3: Runner (minimal attack surface) ──────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app/apps/api

# Install dumb-init globally
RUN apk add --no-cache dumb-init

# Create non-root user (nestjs) with explicit UID/GID
RUN addgroup --system --gid 1001 nestjs && \
    adduser --system --uid 1001 --ingroup nestjs --home /app nestjs

# Copy built artifacts
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/migrations ./migrations
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./package.json

# Set proper ownership
RUN chown -R nestjs:nestjs /app

# Switch to non-root user
USER nestjs

# Environment (production defaults)
ENV NODE_ENV=production \
    PORT=3001

# Expose port
EXPOSE 3001

# Health check — ensure API responds
HEALTHCHECK --interval=30s \
            --timeout=3s \
            --start-period=10s \
            --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/', (r) => {if(r.statusCode!==200)throw new Error('unhealthy');}).on('error',()=>{process.exit(1);})"

# Use dumb-init to properly handle signals (SIGTERM, SIGINT)
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main"]
