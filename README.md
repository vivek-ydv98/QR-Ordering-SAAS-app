# 🍽️ QuickBite: Multi-Tenant QR Restaurant Ordering & POS SaaS Platform

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-blue.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.1.0-black.svg?style=flat&logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.0.0-red.svg?style=flat&logo=nestjs)](https://nestjs.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-6.4.0-2D3748.svg?style=flat&logo=prisma)](https://prisma.io/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-336791.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A production-grade, highly scalable **Multi-Tenant QR-based Restaurant Ordering and POS SaaS Platform** customized for modern dining setups. It isolates customer ordering, merchant administration, Kitchen Display Systems (KDS), Waiter Operations, and global Super-Admin controls into a unified codebase.

---

## 📖 Developer Documentation Index

To help developers understand the project, the following documentation files have been created in the `docs/` folder:

1.  **[ARCHITECTURE.md](file:///home/enjay/myPP/docs/ARCHITECTURE.md)**: Details the system topography, dynamic theme injection, request-response lifecycles, and backend context isolation.
2.  **[DATABASE.md](file:///home/enjay/myPP/docs/DATABASE.md)**: Relational entity diagrams (ERDs), table columns, indexes, unique constraints, and cascade delete rules.
3.  **[API.md](file:///home/enjay/myPP/docs/API.md)**: Reference guide for all REST API endpoints, request payloads, headers, query params, and responses.
4.  **[AUTH.md](file:///home/enjay/myPP/docs/AUTH.md)**: Details authentication mechanisms, JWT/Refresh tokens, routing security, and the role permission matrix.
5.  **[DEPLOYMENT.md](file:///home/enjay/myPP/docs/DEPLOYMENT.md)**: Production hosting instructions (Vercel, Railway, Supabase), Docker setups, and production environment variables.
6.  **[CONTRIBUTING.md](file:///home/enjay/myPP/docs/CONTRIBUTING.md)**: Git branch guidelines, Conventional Commits, code styling, linting, and pull request workflows.
7.  **[FEATURES.md](file:///home/enjay/myPP/docs/FEATURES.md)**: A catalog of all implemented features grouped by user roles and operational modules.
8.  **[ROADMAP.md](file:///home/enjay/myPP/docs/ROADMAP.md)**: Planned features, loyalty systems, AI integrations, offline queues, and enterprise updates.
9.  **[SECURITY.md](file:///home/enjay/myPP/docs/SECURITY.md)**: Detailed documentation of security measures including input validation, XSS, CSRF, and SQL injection protection.
10. **[TROUBLESHOOTING.md](file:///home/enjay/myPP/docs/TROUBLESHOOTING.md)**: Debugging steps for common errors, database timeouts, and real-time socket disconnections.
11. **[CODEBASE.md](file:///home/enjay/myPP/docs/CODEBASE.md)**: Detailed folder blueprints, directory structures, and module dependency graphs.
12. **[COMPONENTS.md](file:///home/enjay/myPP/docs/COMPONENTS.md)**: React components, hooks, Zustand stores, and rendering performance optimizations.
13. **[MIGRATIONS.md](file:///home/enjay/myPP/docs/MIGRATIONS.md)**: Prisma database migration steps, seeder scripts, and rollback strategies.
14. **[CONFIGURATION.md](file:///home/enjay/myPP/docs/CONFIGURATION.md)**: Comprehensive explanations of configuration files (package.json, tsconfig, next.config).
15. **[BUSINESS_LOGIC.md](file:///home/enjay/myPP/docs/BUSINESS_LOGIC.md)**: Explains primary operations like ordering flows, kitchen updates, and tax calculations in plain English.

---

## 🛠️ Technology Stack

| Layer | Technology | Key Libraries/Tools |
| :--- | :--- | :--- |
| **Frontend** | React 19, Next.js 15.1.0 | Tailwind CSS, Framer Motion, Lucide React, Recharts |
| **State Management** | Zustand & TanStack Query | `useCartStore`, `useUIStore` with localStorage persistence |
| **Realtime Tunnel** | Socket.IO Client | Singleton client with automatic network reconnection |
| **Backend API** | NestJS 10.0.0 | TypeScript, Class-Validator, Passport, JWT Auth |
| **Database & ORM** | PostgreSQL & Prisma ORM | Row Level Security (RLS) policies, PgBouncer pooling |

---

## 🚀 Installation & Setup Instructions

Follow these steps to configure your environment and run the platform locally.

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **PostgreSQL** database instance (local or hosted, e.g., Supabase)

### 1. Clone the Repository
```bash
git clone https://github.com/vivek-ydv98/QR-Ordering-SAAS-app.git
cd QR-Ordering-SAAS-app
```

### 2. Set Up the Backend
```bash
cd backend
npm install

# 1. Copy template and edit backend/.env with your PostgreSQL database credentials
cp ../.env.example .env

# 2. Run Database Migrations
npx prisma migrate dev

# 3. Seed Database with default roles, restaurants, and menu catalog items
npm run prisma:generate
node prisma/seed.js

# 4. Start NestJS Dev Server
npm run start:dev
```
The API backend should now be running at `http://localhost:3001`.

### 3. Set Up the Frontend
```bash
cd ../frontend
npm install

# 1. Start Next.js Dev Server
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

---

## 🏎️ Build and Run Steps

### Production Build

#### Backend
To compile TypeScript and prepare NestJS for production:
```bash
cd backend
npm run build
npm run start:prod
```

#### Frontend
To optimize Next.js modules and output static/SSR pages:
```bash
cd frontend
npm run build
npm run start
```

---

## 🧪 Testing

### Running Tests (Backend)
- To run unit tests and verify API validators:
  ```bash
  cd backend
  npm run test
  ```
- To run integration/e2e tests:
  ```bash
  npm run test:e2e
  ```

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
