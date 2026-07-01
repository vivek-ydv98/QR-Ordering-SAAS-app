# Security Policy & Implementation Specifications

This document outlines the security architecture and measures implemented to protect the platform.

---

## 1. Authentication & Session Protection

*   **Access Token (JWT)**: Signed using the **HMAC SHA-256** algorithm. The signature is validated by the [jwt-auth.guard.ts](file:///home/enjay/myPP/backend/src/common/guards/jwt-auth.guard.ts) on every API request.
*   **Refresh Token**: Issued as cryptographically secure random UUIDs. Saved in the database with a hashed signature and sent to the client inside a secure cookie:
    ```javascript
    HttpOnly, Secure, SameSite=Strict
    ```
    This setup prevents cross-site scripting (XSS) attacks from accessing or stealing session states.

---

## 2. Authorization & Tenant Isolation (RBAC & Multi-Tenancy)

*   **Endpoint Access Control**: Verified via the [roles.guard.ts](file:///home/enjay/myPP/backend/src/common/guards/roles.guard.ts) and annotated at the controller layer:
    ```typescript
    @Roles('RESTAURANT_ADMIN')
    @UseGuards(JwtAuthGuard, RolesGuard)
    ```
*   **Tenant Separation**: Enforced by the [tenant.guard.ts](file:///home/enjay/myPP/backend/src/common/guards/tenant.guard.ts) and the extended [prisma.service.ts](file:///home/enjay/myPP/backend/src/prisma/prisma.service.ts). This setup prevents cross-tenant access, ensuring users cannot query or modify data belonging to other restaurants.

---

## 3. Data Sanitization & Input Validation

*   **DTO validation**: All API request bodies are validated using NestJS global validation pipes with `class-validator` and `class-transformer`. If a payload does not match the DTO types, the request is rejected with a `400 Bad Request` before invoking any service code.
*   **SQL Injection Protection**: We use **Prisma ORM** for database queries. Prisma parameterizes all SQL queries by default, protecting the database against SQL injection attacks. Raw SQL queries are avoided.
*   **XSS Protection**: Next.js automatically escapes values rendered in the DOM, preventing Cross-Site Scripting (XSS) injections in customer menus and admin pages.
*   **CORS Settings**: The backend configures CORS rules using the `ALLOWED_ORIGINS` variable. Request origins that are not in the allowed list are blocked, preventing malicious external sites from making unauthorized API requests.

---

## 4. Operational Auditing & Secrets

*   **Audit Logging**: Critical operations (e.g. deleting staff accounts, changing menu prices, resetting passwords) are saved in the `audit_logs` database table. These logs record the user ID, restaurant ID, action name, details, and IP address.
*   **Secrets Configuration**: Environment secrets (like `DATABASE_URL`, `JWT_SECRET`, and `CLOUDINARY_URL`) are loaded from `.env` files. These files are excluded from git history via `.gitignore` to prevent credentials leaks in source control.
*   **Database Transport Encryption**: Connections between the NestJS app servers and the Supabase PostgreSQL database use SSL/TLS encryption (`sslmode=require`) to prevent data interception.
