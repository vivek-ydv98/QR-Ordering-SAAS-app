#!/bin/sh
# =============================================================================
# Backend Docker Entrypoint
# Runs Prisma migrations then starts the NestJS server.
# =============================================================================
set -e

echo "==> [entrypoint] Environment: ${NODE_ENV:-development}"
echo "==> [entrypoint] Running Prisma migrate deploy..."

# Apply any pending migrations (safe, never drops data)
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "==> [entrypoint] Migrations complete. Starting NestJS API..."

exec "$@"
