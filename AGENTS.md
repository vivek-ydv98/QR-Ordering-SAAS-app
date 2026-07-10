# QRSAAS — Agent Guide

## Project layout

- `frontend/` — Next.js 15 (App Router) + React 19 + Tailwind CSS, port 3000
- `backend/` — NestJS 10 + Prisma ORM + PostgreSQL, port 3001
- **Not a monorepo.** Each dir has its own `package.json` and `node_modules`. Install and run separately.

## Environment setup

- Copy `.env.example` → `backend/.env` **and** `frontend/.env.local` (two separate files)
- `NEXT_PUBLIC_API_URL` must be set in `frontend/.env.local` (e.g. `http://localhost:3001/v1`); `TenantContext.tsx` has a hardcoded fallback to `https://api.qr-ordering.in/v1` that will fail locally
- `DATABASE_URL` = pooler (port 6543), `DIRECT_URL` = direct (port 5432, for migrations)
- `JWT_SECRET` required; generate with `openssl rand -base64 32`

## Exact commands

### Backend
| Action | Command |
|--------|---------|
| Dev server (watch) | `npm run start:dev` |
| Build | `npm run build` |
| Prod | `npm run start:prod` |
| Format | `npm run format` (prettier) |

### Frontend
| Action | Command |
|--------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` (next lint) — prompts for setup on first run |

## Database (Prisma)

```bash
# After schema changes
npx prisma generate          # regenerate client
npx prisma migrate dev       # create + apply migration
npx prisma migrate deploy    # apply in prod

# Seed (creates super admin + 2 restaurants + menu items)
node prisma/seed.js
```

Seed credentials: `superadmin@platform.com` / `Password123`, `admin@tandooripalace.com` / `Password123`

## Testing

| Package | Framework | Config | Tests |
|---------|-----------|--------|-------|
| Backend | Jest 30 + ts-jest | `jest.config.ts` in `backend/` | `backend/tests/` (10 suites, 110 tests) |
| Frontend (unit) | Vitest 4 + testing-library/react | `vitest.config.ts` in `frontend/` | `frontend/tests/unit/` (9 files, 70 tests) |
| Frontend (E2E) | Playwright | `playwright.config.ts` in `frontend/` | `frontend/tests/e2e/specs/` (3 spec files) |

### Commands

| Action | Command |
|--------|---------|
| Backend tests | `cd backend && npm test` |
| Backend (watch) | `cd backend && npm run test:watch` |
| Backend (coverage) | `cd backend && npm run test:coverage` |
| Frontend tests | `cd frontend && npm test` |
| Frontend (watch) | `cd frontend && npm run test:watch` |
| Frontend (coverage) | `cd frontend && npm run test:coverage` |
| Frontend (E2E) | `cd frontend && npm run test:e2e` |

### Note

Backend `test:e2e` script references `./test/jest-e2e.json` which does **not exist** on disk.

## Routing

- **Centralized route constants** in `frontend/src/lib/routes.ts` — import `ROUTES` everywhere instead of hardcoded strings
- **Role-dedicated pages:** `/admin/live-orders`, `/admin/kds`, `/admin/waiter-hub`, `/admin/billing` — each role gets its own landing page via `getAdminDefaultRoute(role)`
- **Customer routes** at `/{tenant}/table/{tableId}` and `/{tenant}/menu` (no `/r/` prefix)
- **Edge middleware** at `frontend/src/middleware.ts` — 301 redirects from legacy `/r/`, `/kitchen`, `/waiter`, `/login`, `/admin/dashboard/*`; extracts `x-tenant-slug` header for customer routes

## Multi-tenancy

| Layer | Detail |
|-------|--------|
| Header | `X-Tenant-ID` (UUID) sent by frontend on every admin API call |
| Resolution | `TenantMiddleware` resolves slug → UUID via raw (unscoped) Prisma client, stores in `AsyncLocalStorage<restaurantId>` |
| Prisma auto-filter | `PrismaService.$extends` injects `restaurantId = tenantId` into all queries on scoped models (Staff, Table, MenuCategory, MenuItem, Order, KitchenTicket, RestaurantSetting, AuditLog) — **User model is excluded** |
| Guard | `TenantGuard` enforces JWT `restaurantId` === `X-Tenant-ID`; `SUPER_ADMIN` bypasses; anonymous customer requests bypass |
| Public routes | `/v1/auth` fully bypasses tenant middleware; `/v1/restaurants`, `/v1/audit-logs`, `/v1/users`, `/socket.io` are optional-tenant |
| Socket isolation | Clients join `tenant:<id>` rooms; `KitchenGateway` enforces tenant scope on join |

## Backend API

- Base path: `/v1` (set in `backend/src/main.ts`)
- Global rate limit: 100 req / 60s (`@nestjs/throttler`)
- Prisma dual-client: `prisma.client` (tenant-scoped via `$extends`) vs `prisma.rawClient` (unscoped, for public lookups)
- Validation: `ValidationPipe` with whitelist + transform + forbidNonWhitelisted

## Order state machine

`pending → confirmed → preparing → ready → served → completed`

`cancelled` allowed only from `pending` or `confirmed`. Tax fields on Order model: `cgst`, `sgst`, `serviceCharge` (nullable Decimal amounts) + `cgstRate`, `sgstRate`, `serviceChargeRate` (nullable Decimal rates) + `grandTotal`.

Note: `getCompletedOrdersToday()` in `orders.service.ts` uses a **7-day** window despite its name.

## Frontend conventions

- **`src/` directory** — Next.js App Router under `src/app/`, middleware at `src/middleware.ts`, pages at `src/app/<segment>/`
- CSS framework: Tailwind 3 with HSL CSS variables (`--primary`, `--radius` etc.) set dynamically by `TenantContext`
- State: Zustand stores in `src/store/`
- API: Axios instance in `src/lib/api.ts`; socket.io-client hook in `src/hooks/useSocket.ts`
- Icons: lucide-react

## Backend conventions

- TypeScript with `strictNullChecks: false`, `noImplicitAny: false`
- No ESLint configured
- Model files in `src/*/entities/` (TypeORM-style decorators are unused despite being present)
- Common module at `src/common/` — contains tenant middleware, guards, filters, pipes, decorators, errors
- `/v1/auth` routes handle both admin login and customer phone OTP flow

## Notable gaps

- No CI/CD (`.github/` does not exist)
- `docs/` referenced in README but does not exist locally
- `frontend/next.config.mjs` only adds security headers and Unsplash image remote
- Seed `prisma/seed.js` has a duplicate log message on line 342 (`"Created Menu Addons"` instead of `"Created Sample Orders"`)
