# =============================================================================
# Stage 1 — deps: Install all dependencies
# =============================================================================
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# =============================================================================
# Stage 2 — builder: Build Next.js production bundle
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (public, baked into the JS bundle at build time)
# These are overridden at build via --build-arg / compose build.args
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/v1
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL

# Enable Next.js standalone output for minimal Docker image
# We inject this here rather than editing next.config.mjs so the dev server stays unchanged.
ENV NEXT_TELEMETRY_DISABLED=1

# Patch next.config.mjs to add output: 'standalone' before the build
RUN node -e "\
  const fs = require('fs'); \
  let c = fs.readFileSync('next.config.mjs', 'utf8'); \
  if (!c.includes('output:')) { \
    c = c.replace('reactStrictMode: true,', 'reactStrictMode: true,\n  output: \"standalone\",'); \
    fs.writeFileSync('next.config.mjs', c); \
  } \
"

RUN npm run build

# =============================================================================
# Stage 3 — runner: Minimal production image using Next.js standalone
# =============================================================================
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="QR Ordering SaaS — Frontend"
LABEL org.opencontainers.image.description="Next.js 15 + React 19 multi-tenant SaaS frontend"

RUN addgroup --system --gid 1001 nodejs \
    && adduser  --system --uid 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy the standalone server bundle (self-contained)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Copy static files (JS chunks, images, CSS)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
# Copy public assets (favicon, icons, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/ 2>/dev/null | grep -q "html" || exit 1

CMD ["node", "server.js"]
