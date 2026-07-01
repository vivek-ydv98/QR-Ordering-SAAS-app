# Developer Contribution Guidelines

Welcome! This document outlines coding standards, repository conventions, and the pull request workflow for this project.

---

## 1. Setup Environment

To run the application locally, follow these prerequisites:
*   Use **Node.js v18+** and **npm v9+**.
*   Configure the database locally or connect to a development instance in Supabase.
*   Make sure local `.env` and `.env.local` files match the templates in the root `.env.example`.

---

## 2. Git Branch Naming Conventions

All developers must follow this branch naming structure:

*   **Features**: `feat/` prefix followed by the feature description:
    `feat/table-splitting-system`
*   **Bug Fixes**: `fix/` prefix followed by the issue description:
    `fix/kds-timers-safari`
*   **Refactoring**: `refactor/` prefix:
    `refactor/auth-middleware`
*   **Documentation**: `docs/` prefix:
    `docs/api-update`

---

## 3. Commit Message Standards

This project follows the **Conventional Commits** specification:

*   `feat: add upi payment qr code to checkout drawer` (New feature)
*   `fix: resolve socket reconnect loop on bad connection` (Bug fix)
*   `docs: update API.md with cashier endpoints` (Documentation change)
*   `style: format files using prettier rules` (Formatting change)
*   `refactor: clean up calculations in useCartStore` (Refactoring)

---

## 4. Coding Conventions & Code Styles

### 4.1. TypeScript & JavaScript
*   **Strict Typing**: Do not use `any` unless absolutely necessary. Define models, types, and interfaces in [types/index.ts](file:///home/enjay/myPP/frontend/src/types/index.ts) or backend DTOs.
*   **Pure Functions**: Keep side effects isolated, especially in state stores.
*   **Async/Await**: Prefer `async/await` syntax over raw Promises.
*   **Destructuring**: Use object destructuring for variables and props:
    ```typescript
    const { subtotal, grandTotal } = useCartStore();
    ```

### 4.2. CSS & Layouts (Tailwind)
*   **Design Tokens**: Use CSS variables for branding instead of hardcoded hex values:
    Use `bg-primary` instead of `bg-[#34D399]`.
*   **Layout Hierarchy**: Build layouts to be mobile-first. Taps and click targets must be at least `48px` high on mobile views.

---

## 5. Pull Request Checklists

Before opening a pull request, ensure that:
1.  **Code Compiles**: Next.js builds successfully (`npm run build` inside `frontend/`).
2.  **Linter Verification**: Run linting checks:
    ```bash
    npm run lint
    ```
3.  **Tests Pass**: Backend unit and integration tests run successfully:
    ```bash
    npm run test
    ```
4.  **Database Migrations**: Any database schema changes are committed along with their Prisma migration files under `backend/prisma/migrations/`.
5.  **Documentation Updated**: Related markdown files are updated with any new API endpoints, database columns, or environment variables.
