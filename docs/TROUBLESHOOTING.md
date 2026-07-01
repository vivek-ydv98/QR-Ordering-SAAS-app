# Troubleshooting & Solutions Guide

This document lists common issues encountered during development or production, along with their causes and step-by-step solutions.

---

## 1. Database Connection Failures

### 1.1. Prisma: "Invalid `prisma.order.findMany()` invocation..."
*   **Root Cause**: The PostgreSQL database (local or Supabase) is unreached or paused.
*   **Solution**:
    1.  Verify the connection string in `backend/.env`.
    2.  If using Supabase, check the project dashboard to ensure the database instance is active.
    3.  Confirm you are using the transaction pooler URL (port 6543) for `DATABASE_URL` and the direct URL (port 5432) for `DIRECT_URL` in Prisma configurations.
    4.  Verify network access and firewalls:
        ```bash
        nc -zv aws-0-us-east-1.pooler.supabase.com 6543
        ```

### 1.2. "P2024: Prisma client connection timeout"
*   **Root Cause**: Connection pool exhaustion.
*   **Solution**:
    1.  Ensure you are using a connection pooler like PgBouncer.
    2.  Append `&connection_limit=10` or configure appropriate pool sizing in your `DATABASE_URL`.
    3.  Make sure the Prisma client singleton is reused across requests instead of being re-instantiated.

---

## 2. Authentication & JWT Issues

### 2.1. API requests fail with 401 Unauthorized
*   **Root Cause**: The JWT token has expired or is invalid.
*   **Solution**:
    1.  Access tokens expire after 15 minutes. Check if the client frontend is sending refresh token requests to `/auth/refresh` on expiry.
    2.  Verify that the `Authorization: Bearer <token>` header is correctly formatted and sent with the request.
    3.  Ensure the `JWT_SECRET` variable is identical on both the authentication service and token validation guards.

### 2.2. API requests fail with 403 Forbidden (Tenant mismatch)
*   **Root Cause**: The client's `X-Tenant-ID` header does not match the `restaurantId` claim inside the decoded JWT token.
*   **Solution**:
    1.  Check the decoded payload of the access token on [jwt.io](https://jwt.io) and verify the `restaurantId` matches.
    2.  Ensure staff members are making API requests only within their assigned restaurant context.

---

## 3. Real-time WebSocket Disconnections

### 3.1. KDS or Waiter hub does not receive updates
*   **Root Cause**: WebSocket connection failure or room subscription mismatch.
*   **Solution**:
    1.  Check the browser console for connection logs. If the connection fails, verify the `NEXT_PUBLIC_SOCKET_URL` points to the correct backend server.
    2.  Ensure the client passes a valid `tenantId` in the connection handshake parameters.
    3.  Verify that the kitchen gateway has successfully subscribed the socket client to the target room (`tenant:{restaurantId}`).

---

## 4. Build and Deployment Failures

### 4.1. Next.js Build: "Type error: Category is not assignable to type..."
*   **Root Cause**: TypeScript compilation errors due to mismatched type declarations between the frontend and backend.
*   **Solution**:
    1.  Run the types sync script or update [types/index.ts](file:///home/enjay/myPP/frontend/src/types/index.ts) to match the database entities.
    2.  Verify the Prisma client has been generated:
        ```bash
        npx prisma generate
        ```

### 4.2. Next.js: "Autoplay blocked for audio context..."
*   **Root Cause**: Browsers block automatic sound alerts (like KDS buzzer) before the user interacts with the page.
*   **Solution**:
    1.  This is a browser security feature. The KDS operator must click or tap anywhere on the screen once after page load to activate the AudioContext.
