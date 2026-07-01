# Production Deployment Guide

This document describes the steps required to deploy the Multi-Tenant QR Restaurant Ordering SaaS platform to a production environment.

---

## 1. Stack Deployment Model

The system is split into three main components:
*   **Database**: PostgreSQL hosted on **Supabase** with connection pooling enabled.
*   **API Backend**: NestJS hosted on **Railway**, **Render**, or **AWS ECS** in a Docker container.
*   **Web Frontend**: Next.js App Router hosted on **Vercel** with CDN and edge page caching enabled.

```mermaid
graph TD
    %% Internet entry
    DNS["Custom Domain (DNS)"] -->|SSL / HTTPS| CDN["Vercel Edge CDN"]
    CDN -->|Next.js Client| Diner["Diner Mobile Browser"]
    CDN -->|Next.js Admin| Admin["Merchant Admin Tablet"]

    %% API Requests
    Diner & Admin -->|REST API Requests| Gateway["Railway / Render App Server (NestJS)"]
    Diner & Admin -->|WebSockets Tunnel| WebSockets["Socket.IO Server (NestJS)"]

    %% Backend Storage
    Gateway & WebSockets -->|Port 6543 (Pooler)| Pooler["Supabase Connection Pooler"]
    Pooler -->|SQL queries| Database["PostgreSQL Core DB"]
    
    %% Media Storage
    Gateway -->|Image Uploads| Cloudinary["Cloudinary Storage"]
```

---

## 2. Database Provisioning & Schema Deploy

We use **Supabase** as the primary PostgreSQL host.

1.  **Create a Project**: Provision a new PostgreSQL instance in your target region.
2.  **Get connection strings**:
    *   **Transaction Pooler (Port 6543)**: For `DATABASE_URL` (E.g. `postgres://[user].[project]:[pass]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`).
    *   **Session Direct (Port 5432)**: For `DIRECT_URL` (E.g. `postgres://postgres:[pass]@db.[project].supabase.co:5432/postgres`).
3.  **Deploy Schema**: Run Prisma migrations from your development machine to populate the database:
    ```bash
    cd backend
    DATABASE_URL="your_supabase_transaction_pooler_url" DIRECT_URL="your_supabase_session_direct_url" npx prisma migrate deploy
    ```
4.  **Seed Database**: Run the seed script to create roles, default tenants, and initial users:
    ```bash
    DATABASE_URL="your_supabase_transaction_pooler_url" node prisma/seed.js
    ```

---

## 3. API Backend Deployment (Dockerized)

The NestJS backend runs inside a Docker container.

### 3.1. Docker Configuration

Create a [Dockerfile](file:///home/enjay/myPP/backend/Dockerfile) in the `backend/` directory:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "run", "start:prod"]
```

### 3.2. Deploying to Railway / Render
1.  **Connect repository**: Link your GitHub repository and set the root directory to `backend/`.
2.  **Inject Variables**: Populate production variables (see Section 5 below).
3.  **Deploy**: Railway/Render will automatically detect the Dockerfile, build the image, and deploy it to a secure endpoint (e.g. `api.restaurant-saas.com`).

---

## 4. Web Frontend Deployment (Vercel)

1.  **Add Project**: Import the repository in Vercel.
2.  **Configure Root**: Set **Root Directory** to `frontend`.
3.  **Inject Variables**:
    *   `NEXT_PUBLIC_API_URL` = `https://api.restaurant-saas.com/v1`
    *   `NEXT_PUBLIC_SOCKET_URL` = `https://api.restaurant-saas.com`
4.  **Deploy**: Vercel compiles the build, deploys it to the edge, and sets up SSL certificates.

---

## 5. Production Environment Variables Reference

### 5.1. Backend Variables (`backend/.env`)

| Variable | Example Value | Purpose |
| :--- | :--- | :--- |
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `production` | Enables production mode |
| `DATABASE_URL` | `postgresql://...:6543/postgres?pgbouncer=true` | PgBouncer database pooler URL |
| `DIRECT_URL` | `postgresql://...:5432/postgres` | Direct database URL |
| `JWT_SECRET` | `5c9f5647a...` | Cryptographic secret for access tokens |
| `ALLOWED_ORIGINS`| `https://restaurant-saas.com,https://admin.restaurant-saas.com` | Allowed CORS origins |
| `CLOUDINARY_URL` | `cloudinary://key:secret@name` | Cloudinary integration key |

### 5.2. Frontend Variables (`frontend/.env.production`)

| Variable | Example Value | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://api.restaurant-saas.com/v1` | Target endpoint for REST requests |
| `NEXT_PUBLIC_SOCKET_URL` | `https://api.restaurant-saas.com` | Target endpoint for WebSocket connections |

---

## 6. Docker Compose Local setup

For testing the production build locally:

Create a `docker-compose.yml` in the repository root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: qr_postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: qr_saas
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    container_name: qr_backend
    ports:
      - "3001:3001"
    environment:
      PORT: 3001
      NODE_ENV: development
      DATABASE_URL: "postgresql://postgres:password@postgres:5432/qr_saas?schema=public"
      JWT_SECRET: "strongsecret123"
      ALLOWED_ORIGINS: "http://localhost:3000"
    depends_on:
      - postgres

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: qr_frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: "http://localhost:3001/v1"
      NEXT_PUBLIC_SOCKET_URL: "http://localhost:3001"
    depends_on:
      - backend

volumes:
  pgdata:
```
