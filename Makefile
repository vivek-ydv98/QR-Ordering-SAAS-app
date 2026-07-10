# =============================================================================
# QR Restaurant Ordering SaaS — Docker Makefile
# A single place for all common Docker commands.
# =============================================================================

ENV_FILE ?= .env.docker
COMPOSE  := docker compose --env-file $(ENV_FILE)
COMPOSE_DEV := docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file $(ENV_FILE)

.PHONY: help setup build up down restart logs shell-backend shell-frontend \
        build-backend build-frontend migrate seed prune dev dev-down

# ---------------------------------------------------------------------------
# Default target
# ---------------------------------------------------------------------------
help:
	@echo ""
	@echo "  QR Ordering SaaS — Docker Commands"
	@echo "  ===================================="
	@echo ""
	@echo "  Setup"
	@echo "    make setup          Copy .env.docker.example → .env.docker (edit before using)"
	@echo ""
	@echo "  Production"
	@echo "    make build          Build (or rebuild) all images"
	@echo "    make build-backend  Build only the backend image"
	@echo "    make build-frontend Build only the frontend image"
	@echo "    make up             Start all services in detached mode"
	@echo "    make down           Stop and remove containers"
	@echo "    make restart        Restart all services"
	@echo "    make logs           Tail logs from all services"
	@echo ""
	@echo "  Development"
	@echo "    make dev            Start dev stack (hot-reload)"
	@echo "    make dev-down       Stop dev stack"
	@echo ""
	@echo "  Database"
	@echo "    make migrate        Run Prisma migrate deploy inside the backend container"
	@echo "    make seed           Run Prisma seed script inside the backend container"
	@echo ""
	@echo "  Utilities"
	@echo "    make shell-backend  Open a shell in the running backend container"
	@echo "    make shell-frontend Open a shell in the running frontend container"
	@echo "    make prune          Remove dangling images and stopped containers"
	@echo ""

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
setup:
	@if [ -f .env.docker ]; then \
		echo ".env.docker already exists. Edit it directly."; \
	else \
		cp .env.docker.example .env.docker; \
		echo "Created .env.docker from template. Fill in your credentials before running 'make up'."; \
	fi

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
build:
	$(COMPOSE) build --parallel

build-backend:
	$(COMPOSE) build backend

build-frontend:
	$(COMPOSE) build frontend

# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------
up: build
	$(COMPOSE) up -d
	@echo ""
	@echo "  ✅  Services started:"
	@echo "      Frontend → http://localhost:$$(grep FRONTEND_PORT $(ENV_FILE) 2>/dev/null | cut -d= -f2 || echo 3000)"
	@echo "      Backend  → http://localhost:$$(grep BACKEND_PORT  $(ENV_FILE) 2>/dev/null | cut -d= -f2 || echo 3001)"

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

logs:
	$(COMPOSE) logs -f

# ---------------------------------------------------------------------------
# Development stack
# ---------------------------------------------------------------------------
dev:
	$(COMPOSE_DEV) up --build

dev-down:
	$(COMPOSE_DEV) down

# ---------------------------------------------------------------------------
# Database helpers (run inside the running backend container)
# ---------------------------------------------------------------------------
migrate:
	$(COMPOSE) exec backend npx prisma migrate deploy --schema=./prisma/schema.prisma

seed:
	$(COMPOSE) exec backend node prisma/seed.js

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------
shell-backend:
	$(COMPOSE) exec backend sh

shell-frontend:
	$(COMPOSE) exec frontend sh

prune:
	docker image prune -f
	docker container prune -f
	@echo "Pruned dangling images and stopped containers."
