# 🍽️ QuickBite: Multi-Tenant QR Restaurant Ordering SaaS Platform

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-blue.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.1.0-black.svg?style=flat&logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.0.0-red.svg?style=flat&logo=nestjs)](https://nestjs.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-6.4.0-2D3748.svg?style=flat&logo=prisma)](https://prisma.io/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-336791.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A production-grade, highly scalable **Multi-Tenant QR-based Restaurant Ordering and POS SaaS Platform** customized for modern dining setups. It isolates customer ordering, merchant administration, Kitchen Display Systems (KDS), Waiter Operations, and global Super-Admin controls into a unified codebase.

---

## 🗺️ Architectural Topology

The system uses a single database, shared-schema multi-tenant design with dynamic theme injection and edge routing.

```mermaid
graph TD
    A["QR Code Scan / Subdomain URL (/r/[tenant]/table/[tableId])"] --> B["Next.js Edge Routing"]
    B -->|Resolves Tenant Slug & Table ID| C["Next.js App Router Engine"]
    
    C -->|Dynamic CSS variables injected at DOM Root| D["Customer App Shell (Mobile-First PWA)"]
    C -->|Staff Session Token check| E["Restaurant Admin Portal"]
    C -->|High Contrast TV/Tablet Shell| F["Kitchen Display System (KDS)"]
    C -->|Floor Service Hub| G["Waiter Operations Hub"]
    C -->|Root Auth Guard| H["Super Admin Control Panel"]

    %% Shared State & Data Services
    D & E & F & G & H -->|Queries & Mutations| I["TanStack Query Cache Layer"]
    D & E & F & G & H -->|Local Reactive States| J["Zustand Global Stores (Cart & UI)"]
    D & E & F & G & H -->|Realtime Channels| K["Socket.IO Client Manager"]

    %% Edge API Interceptors
    I -->|Axios Agent - lib/api.ts| L["NestJS API Gateway"]
    L -->|X-Tenant-ID Header Routing| M["Multi-Tenant PostgreSQL Database"]
    K -->|WebSocket Tunnel| N["NestJS Socket.IO Gateways"]
```

---

## ✨ Key Features

### 📱 Customer App (Mobile-First PWA)
- **Zero-Install Onboarding**: Scan a table's QR code to immediately launch the ordering experience.
- **Dynamic HSL Theme Injection**: The restaurant's custom brand colors, logos, and rounded corners are loaded dynamically on page load without rebuilding code.
- **Interactive Menu & Cart**: Instant search, category filters, vegetarian/non-vegetarian toggle flags, and full support for customized dishes (e.g., portion sizes, extra toppings).
- **Taxation Engine**: Auto-calculates CGST, SGST, and custom service charges compliant with Indian taxation standards.
- **Live Tracker & Waiter Calling**: Real-time notifications for order status changes and direct waiter assistance requests (water, cutlery, bill, etc.).

### 🏪 Merchant Operations Suite
- **Interactive Admin Dashboard**: Live sales tracking, popular menu items analytics, and digital table layout status.
- **Kitchen Display System (KDS)**: High-contrast layout designed for mounted screens. Features ticket aging warnings (green/amber/red status boundaries) and an autoplay-bypassing audio alert system.
- **Waiter Operations Hub**: Allows waitstaff to monitor live tables, take orders on-the-fly, update ticket statuses, and receive real-time push alerts from tables.
- **QR Code Generator**: Effortlessly generate table-specific QR codes mapping table coordinates directly to URLs.

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

## 📂 Project Structure

```
QR-Ordering-SAAS-app/
├── backend/                        # NestJS API Backend
│   ├── prisma/                     # Database Schema & Seed scripts
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/                        # NestJS Application Source
│   │   ├── auth/                   # Authentication & Session Handlers
│   │   ├── common/                 # Global Guards (Tenant, JWT, RBAC), Filters, Middleware
│   │   ├── menu/                   # Menu, Variant, and Category Controllers
│   │   ├── orders/                 # FSM-driven Order Transactions
│   │   ├── restaurants/            # Tenant profiles and settings
│   │   ├── sockets/                # Socket.IO Gateway for real-time channels
│   │   └── staff/                  # Employee Management
│   └── package.json
│
├── frontend/                       # Next.js App Router Frontend
│   ├── public/                     # Static assets & PWA Manifest
│   ├── src/                        # Next.js Application Source
│   │   ├── app/                    # File-system Routing pages
│   │   │   ├── r/[tenant]/         # Customer menus by slug
│   │   │   ├── admin/              # Merchant Dashboard
│   │   │   ├── kitchen/            # KDS Terminal
│   │   │   └── waiter/             # Waiter Hub
│   │   ├── components/             # Reusable UI & Layout shells
│   │   ├── context/                # Tenant Theme Provider
│   │   ├── hooks/                  # Socket.io Room hook wrapper
│   │   ├── lib/                    # Axios API clients & Socket singletons
│   │   ├── store/                  # Zustand Persistent state stores
│   │   └── styles/                 # Tailwind system utilities
│   └── package.json
```

---

## ⚙️ Environment Configuration

You must create and configure `.env` files in both directories before starting the application.

### Backend Environment Variables (`backend/.env`)

Create a `backend/.env` file and populate it with the template below:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration (Comma-separated list of origins)
ALLOWED_ORIGINS=http://localhost:3000

# Database Configurations
DATABASE_URL="postgresql://username:password@localhost:5432/qr_saas?schema=public"
DIRECT_URL="postgresql://username:password@localhost:5432/qr_saas?schema=public"

# JWT Authentication Secrets
JWT_SECRET="generate-a-strong-32-byte-key"
JWT_EXPIRATION="15m"

# Cloudinary Integration (For uploading menu item images)
CLOUDINARY_URL="cloudinary://api_key:api_secret@cloud_name"
```

### Frontend Environment Variables (`frontend/.env.local`)

Create a `frontend/.env.local` file and populate it with:

```env
# Local Backend Target URLs
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001/v1
```

---

## 🚀 Installation & Setup Instructions

Follow these steps to configure your environment and run the platform locally.

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **PostgreSQL** database instance (local or hosted, e.g., Supabase)

### 1. Clone the repository
```bash
git clone https://github.com/vivek-ydv98/QR-Ordering-SAAS-app.git
cd QR-Ordering-SAAS-app
```

### 2. Set Up the Backend
```bash
cd backend
npm install

# 1. Update the backend/.env with your PostgreSQL database credentials
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

## ⚓ API & Realtime Integrations

### Tenant Isolation
Clients must send a header with the restaurant identifier to isolate queries:
`X-Tenant-ID: {restaurant_slug}`

### Key REST Endpoints

| Method | Endpoint | Auth Scope | Action |
| :--- | :--- | :--- | :--- |
| **POST** | `/v1/auth/login` | Public | Authentication |
| **POST** | `/v1/menu/items` | Manager / Admin | Add menu items |
| **GET** | `/v1/menu` | Public | Retrieve active menu |
| **POST** | `/v1/orders` | Customer | Place new table order |
| **PATCH**| `/v1/orders/:id/status` | Kitchen / Waiter | Advance order lifecycle |

### Realtime WebSocket Rooms
WebSockets automatically group users based on tenant context. Events such as new tickets or status transitions emit message alerts to targeted rooms:
- **`tenant:{restaurant_id}`**: Broadcasts KOTs and waiter help requests to logged-in employees.
- **`tenant:{restaurant_id}:table:{table_id}`**: Broadcasts active ticket updates directly to the customer's browser.

---

## 🚀 Deployment Guide

### Database (Supabase)
1. Initialize a PostgreSQL instance.
2. Apply migrations: `DATABASE_URL=your_supabase_pooler_url npx prisma migrate deploy`.

### Backend (Railway / Render / AWS ECS)
1. Link your GitHub repository.
2. Set Environment Variables corresponding to `backend/.env`.
3. Set start command to `npm run build:prod`.

### Frontend (Vercel)
1. Link the repository frontend folder.
2. Inject environment variables matching `frontend/.env.local`.
3. Vercel will auto-compile Next.js edge routers and deploy globally.

---

## 🤝 Contribution Guidelines

1. **Create an Issue**: Open an issue discussing your design choices before editing core multi-tenancy pipelines.
2. **Branch Naming**: Use clean descriptive titles: `feature/table-merging` or `bugfix/kds-refresh-timer`.
3. **Commit Convention**: Commit messages must follow Conventional Commit specs (e.g., `feat: ...`, `fix: ...`, `chore: ...`).

---

## ⚠️ Known Issues and Limitations
- **Autoplay Audio Rules**: Some browsers block the KDS alarm on first boot. The user must interact with the page once (e.g. click anywhere) to allow sound.
- **No Offline Checkout**: Customers require an active network connection to submit orders. Offline recovery queues are only active for waiter portals.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
