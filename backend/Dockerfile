# =============================================================================
# Stage 1 — deps: Install production + dev dependencies
# =============================================================================
FROM node:20-alpine AS deps

# Install OS-level build tools needed by native modules (bcryptjs uses pure JS, but good to have)
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy lockfile and manifests first for layer-cache efficiency
COPY package.json package-lock.json ./

# Install ALL deps (dev included) — needed to run `prisma generate` and `nest build`
RUN npm ci --legacy-peer-deps

# Copy Prisma schema so we can generate the client
COPY prisma ./prisma

# Generate Prisma client into node_modules/@prisma/client
RUN npx prisma generate

# =============================================================================
# Stage 2 — builder: Compile TypeScript → dist/
# =============================================================================
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Bring in the full node_modules (with generated Prisma client)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy all source files
COPY . .

# Compile NestJS project (outputs to ./dist)
RUN npm run build

# =============================================================================
# Stage 3 — runner: Lean production image
# =============================================================================
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="QR Ordering SaaS — Backend"
LABEL org.opencontainers.image.description="NestJS 10 + Prisma ORM multi-tenant API"

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs \
    && adduser  --system --uid 1001 nestjs

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

# Copy only what's needed at runtime
COPY --from=builder --chown=nestjs:nodejs /app/dist         ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma       ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Copy the entrypoint script
COPY --chown=nestjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nestjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3001/v1/health 2>/dev/null || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/main"]
