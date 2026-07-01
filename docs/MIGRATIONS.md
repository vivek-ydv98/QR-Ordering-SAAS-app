# Database Migration & Seeding Specifications

This document outlines the database migration strategy, schema updates pipeline, rollback procedures, and the database seeding system.

---

## 1. Migration Overview (Prisma Schema-first approach)

This project uses **Prisma Migrations** to manage schema changes in PostgreSQL. The schema is defined in [schema.prisma](file:///home/enjay/myPP/backend/prisma/schema.prisma) and acts as the single source of truth for the database layout.

*   **Development Schema Sync**: Developers use `npx prisma migrate dev` to generate SQL migration scripts and apply changes to their local database.
*   **Production Schema Deploy**: SQL migrations are applied to production databases using `npx prisma migrate deploy` in the deployment pipeline.

---

## 2. Developer Migration Workflow

Follow these steps when making database schema modifications:

1.  **Modify Prisma Schema**: Edit the database models in [schema.prisma](file:///home/enjay/myPP/backend/prisma/schema.prisma).
2.  **Generate Migration**: Run the migration tool to generate the SQL script:
    ```bash
    cd backend
    npx prisma migrate dev --name add_discount_price_to_items
    ```
    This command:
    *   Compares your schema file with the database state.
    *   Creates a new SQL migration folder under `backend/prisma/migrations/`.
    *   Applies the SQL changes to your local database.
    *   Generates updated TypeScript types in node_modules (`@prisma/client`).
3.  **Commit Files**: Commit both the updated [schema.prisma](file:///home/enjay/myPP/backend/prisma/schema.prisma) file and the generated SQL migration files under `backend/prisma/migrations/`.

---

## 3. Production Deployment & Rollbacks

### 3.1. Deployment Pipeline
In production (e.g. CI/CD or Railway build steps), the migration pipeline executes the following command during build/release steps:
```bash
npx prisma migrate deploy
```
This applies any un-applied SQL migrations to the target database in chronological order.

### 3.2. Rollback Strategy
Since Postgres migrations are applied using direct SQL steps, rollbacks require caution:
1.  **Backward Compatibility**: Ensure schema changes are backward-compatible. For example, add new columns as nullable first so that running servers do not fail before their code is updated.
2.  **Manual Rollbacks**: If a migration fails or must be rolled back:
    *   Identify the migration that was applied.
    *   Write a manual SQL script to reverse the schema changes (e.g. `ALTER TABLE drop column ...`).
    *   Execute the script directly on the database.
    *   Run `npx prisma migrate resolve --rolled-back <migration_name>` to mark the migration as rolled back in the prisma migrations table history.

---

## 4. Seeding System

Initial data, roles, and default tenant setups are populated using the seeder file [seed.js](file:///home/enjay/myPP/backend/prisma/seed.js).

### 4.1. Run Seed Command
To populate the database with seed data:
```bash
cd backend
node prisma/seed.js
```

### 4.2. Seed Content
The seeder performs these actions in order:
1.  **Creates Roles**: Inserts core system roles (`SUPER_ADMIN`, `RESTAURANT_ADMIN`, `MANAGER`, `WAITER`, `KITCHEN_STAFF`, `CASHIER`).
2.  **Creates Restaurants**: Inserts demo restaurants (e.g., Tandoori Palace, Veg Bite) with slug configurations and HSL styling colors.
3.  **Creates Users & Staff**: Registers default admin accounts (e.g. `admin@tandoori.com`) and hashes passwords using Argon2 / Bcrypt.
4.  **Creates Menu categories & Items**: populates menus with items, variants, and addons.
5.  **Registers Tables**: Sets up dining tables (e.g. Table 1, Table 2) with active status properties.
