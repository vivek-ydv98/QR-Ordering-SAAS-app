# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Development Setup & Commands

### Environment Setup
1. **Prerequisites**: Node.js v18+, npm v9+, PostgreSQL database
2. **Environment Files**: Copy `.env.example` to `.env` (backend) and `.env.local` (frontend) 
3. **Database Setup**: 
   ```bash
   cd backend
   npm install
   npx prisma migrate dev
   npm run prisma:generate
   node prisma/seed.js
   ```

### Backend Commands (NestJS)
- `cd backend && npm run start:dev` - Start development server with hot reload
- `cd backend && npm run build` - Build for production
- `cd backend && npm run start:prod` - Start production server
- `cd backend && npm run test` - Run unit tests
- `cd backend && npm run test:e2e` - Run end-to-end tests
- `cd backend && npm run format` - Format code with Prettier
- `cd backend && npm run prisma:generate` - Regenerate Prisma client

### Frontend Commands (Next.js)
- `cd frontend && npm run dev` - Start development server
- `cd frontend && npm run build` - Build for production
- `cd frontend && npm run start` - Start production server
- `cd frontend && npm run lint` - Run ESLint and Tailwind linting

## 🏗️ High-Level Architecture

### System Overview
This is a multi-tenant SaaS platform for QR-based restaurant ordering and POS, featuring:
- **Frontend**: Next.js 15 (App Router) with React 19, Tailwind CSS, Zustand state management
- **Backend**: NestJS 10 with PostgreSQL & Prisma ORM, Socket.IO for real-time
- **Architecture**: Decoupled client-server with multi-tenant isolation via restaurant_id scoping

### Key Architectural Patterns

#### Multi-Tenant Isolation
- **Logical Database Isolation**: Shared database/schema with `restaurant_id` foreign keys on all tenant tables
- **AsyncLocalStorage**: Tenant ID resolved from `X-Tenant-ID` header and stored in request context
- **Prisma Interception**: Automatic `where: { restaurantId }` injection on all queries
- **Row Level Security**: Database-level RLS policies as backup protection

#### Request-Response Flow
```
Client Request → Tenant Middleware (extract X-Tenant-ID) 
→ Database lookup for restaurant UUID → AsyncLocalStorage binding
→ JWT/Auth Guards → Role-Based Access Control → Controller → Service 
→ Prisma Service (auto-scoped queries) → PostgreSQL Database
```

#### Real-Time Architecture
- **Socket.IO Gateways**: Tenant-scoped rooms for targeted broadcasts
- **Connection Handshake**: TenantId validation from query parameters
- **Event Routing**: 
  - Kitchen/WebSocket: `tenant:{restaurantId}` broadcasts
  - Table-specific: `tenant:{restaurantId}:table:{tableId}` broadcasts
  - Customer events: `table:{tableId}` subscriptions

### Folder Structure

#### Frontend (`/frontend/src/`)
```
app/                    # Next.js App Router
  ├── r/[tenant]/table/[tableId]/   # Customer menu & ordering
  ├── admin/dashboard/              # Merchant analytics & config
  ├── kitchen/page.tsx              # Kitchen Display System (KDS)
  ├── waiter/page.tsx               # Waiter operations hub
  └── super-admin/page.tsx          # System admin dashboard
components/             # Reusable UI components
context/                # TenantContext for dynamic theme injection
hooks/                  # Custom hooks (useSocket, etc.)
lib/                    # Axios instance, Socket.IO client singleton
store/                  # Zustand stores (useCartStore, useUIStore)
```

#### Backend (`/backend/src/`)
```
app.module.ts           # Core module registration
main.ts                 # Application entry point & global middleware
auth/                   # JWT strategies, login handlers
common/                 # Multi-tenant context & security guards
menu/                   # Menu categories, items, variants, addons
orders/                 # Order processing & state machine
prisma/                 # Extended PrismaService with tenant scoping
restaurants/            # Tenant setup & table registration
sockets/                # Socket.IO notifications gateway
staff/                  # Employee schedules & assignments
```

## 📋 Development Workflow & Best Practices

### Git Practices
- **Branch Naming**: 
  - Features: `feat/feature-name`
  - Bugs: `fix/bug-description` 
  - Refactoring: `refactor/component-name`
  - Docs: `docs/documentation-update`
- **Commits**: Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`)

### Coding Standards
- **TypeScript**: Avoid `any`; define types in `frontend/src/types/` or backend DTOs
- **Async Patterns**: Prefer `async/await` over raw Promises
- **Destructuring**: Use object destructuring for props and store values
- **Tailwind**: Use CSS variables (`bg-primary`) instead of hardcoded colors for theming
- **Mobile First**: Minimum 48px tap targets on mobile views

### Pull Request Checklist
Before opening a PR, ensure:
1. ✅ **Builds Successfully**: `npm run build` in both frontend/backend
2. ✅ **Linting Passes**: `npm run lint` (frontend) + Prettier (backend)
3. ✅ **Tests Pass**: `npm run test` (backend unit/integration tests)
4. ✅ **Database Changes**: Include Prisma migration files for schema updates
5. ✅ **Documentation Updated**: Update relevant API, database, or feature docs

### Testing Strategy
- **Backend**: Jest-based unit and integration tests covering services, controllers, guards
- **Frontend**: Test coverage inferred from linting and build success (Jest configured implicitly)
- **Database**: Tests run against migrated schema with seed data

## 🛠️ Technology Stack Reference

| Layer | Technology | Key Details |
|-------|------------|-------------|
| **Frontend** | React 19, Next.js 15.1.0 | App Router, Server Components, Route Groups |
| **Styling** | Tailwind CSS 3.4.15 | CSS variables for dynamic theming |
| **State** | Zustand 5.0.1, TanStack Query 5.62.0 | Cart/UI state persistence, server state |
| **Realtime** | Socket.IO Client 4.8.1 | Singleton client with auto-reconnect |
| **Backend** | NestJS 10.0.0 | Modular architecture, TypeScript |
| **Database** | PostgreSQL + Prisma 6.4.0 | Row Level Security, automatic migrations |
| **Auth** | JWT + Passport | Access/refresh tokens, role-based guards |
| **Realtime** | Socket.IO Server 4.7.2 | Tenant-scoped rooms, Redis-ready for scaling |
| **File Storage** | Cloudinary Integration | Image uploads for menu items, logos |

## 🔧 Key Configuration Files

- **Backend**: `nest-cli.json`, `tsconfig.json`, `.env`, `prisma/schema.prisma`
- **Frontend**: `next.config.mjs`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `.env.local`
- **Root**: `.env.example` (template for environment variables)

## 📚 Related Documentation
See `docs/` directory for detailed specifications:
- `ARCHITECTURE.md` - Deep dive into system architecture
- `DATABASE.md` - Complete ERD and table specifications  
- `API.md` - Complete REST API reference with examples
- `AUTH.md` - Authentication and authorization details
- `DEPLOYMENT.md` - Production deployment guides
- `CONTRIBUTING.md` - Development workflow and code standards