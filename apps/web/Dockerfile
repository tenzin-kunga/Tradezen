# ── TradeZen Frontend Dockerfile (Next.js Production) ───────────────────────
# Multi-stage build with optimized production output

# ── Stage 1: Dependencies ──────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy workspace package files
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

# Install all dependencies
RUN npm ci

# ── Stage 2: Build ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/packages ./packages

# Copy web source directly to apps/web
COPY apps/web ./apps/web

# Build Next.js app (standalone output at apps/web/.next/standalone)
WORKDIR /app/apps/web
ENV PATH="/app/node_modules/.bin:$PATH"
RUN npx next build

# ── Stage 3: Runner (standalone) ──────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app/apps/web

# Create non-root user
RUN addgroup --system --gid 1001 nextjs && \
    adduser --system --uid 1001 --ingroup nextjs --home /app nextjs

# Copy standalone build output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./_next/static
COPY --from=builder /app/apps/web/package.json ./

# Set ownership
RUN chown -R nextjs:nextjs /app

# Switch to non-root user
USER nextjs

# Environment
ENV NODE_ENV=production \
    PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s \
            --timeout=3s \
            --start-period=10s \
            --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {if(r.statusCode!==200)throw new Error('unhealthy');}).on('error',()=>{process.exit(1);})"

# Start application
CMD ["node", "apps/web/server.js"]