# Core Features Catalog

This document details the features implemented in the Multi-Tenant QR Restaurant Ordering SaaS platform.

---

## 1. Authentication & Security (RBAC)
*   **JWT Access Tokens**: Issued upon successful login to authenticate staff and administrator APIs.
*   **HttpOnly Refresh Cookies**: Enables secure session persistence without exposing sensitive tokens to client-side scripts.
*   **Role-Based Access Control**: Restricts API endpoints and UI navigations using roles:
    *   `SUPER_ADMIN`: Manages restaurants, billing, and system configurations.
    *   `RESTAURANT_ADMIN`: Full access to the restaurant's settings, staff, menus, and tables.
    *   `MANAGER`: Configures menu items, manages staff shifts, and resolves order issues.
    *   `CASHIER`: Manages payments, settles tables, and prints receipts.
    *   `KITCHEN_STAFF`: Monitors cooking tickets in the KDS and updates prep statuses.
    *   `WAITER`: Places orders, updates table statuses, and resolves service requests.
    *   `CUSTOMER`: Places orders from their table and calls for service.

---

## 2. Multi-Tenant Restaurant Isolation
*   **Automatic Tenant Routing**: Resolves branding, settings, and menus using the database slug parsed from the request header or URL.
*   **Dynamic UI Theming**: Injects custom HSL brand colors into the document root at runtime.
*   **Custom Settings Profile**: Allows each restaurant to configure its active features, tax rates (CGST, SGST, service charges), and QR code designs.

---

## 3. Customer PWA & Dining Menu
*   **Scan-to-Order**: Instant customer onboarding upon scanning the table's physical QR code.
*   **Dietary Filters**: Vegetarian/Non-vegetarian indicators (FSSAI compliance) and category quick-scroll tabs.
*   **Add-ons & Variants Customizer**: Interactive bottom drawer sheet to choose portion sizes and toppings.
*   **Persistent Zustand Cart**: Keeps selected items in the cart during browser page refreshes or network drops.
*   **Digital Billing Engine**: Calculates Indian GST and service charge taxes in real-time.

---

## 4. Kitchen Display System (KDS)
*   **Order Card Queues**: Displays KOT details, elapsed timers, and customer notes on kitchen tablets or TVs.
*   **Visual Status Aging**: Card borders change color based on queue time:
    *   **Under 10 minutes**: Green (On time)
    *   **10 to 15 minutes**: Amber (Delayed)
    *   **Over 15 minutes**: Crimson (Late)
*   **Web Audio Buzzer**: Synthesizes alerts using the browser's Web Audio API to bypass autoplay audio blocks.

---

## 5. Waiter Assistance & Tables Hub
*   **Real-time Assistance Calling**: Allows customers to request specific items (water, bill, cutlery) or call a waiter, sending an alert directly to the staff hub.
*   **Digital Table Board**: Interactive dashboard displaying table statuses (`VACANT`, `OCCUPIED`, `WAITING_BILL`, `DIRTY`) to help staff manage floor operations.
*   **Mobile Order Placement**: Allows waitstaff to take orders directly at the table using mobile devices.

---

## 6. Restaurant Admin Dashboard
*   **Live Analytics**: Displays daily sales revenue, active KOT counts, table occupancy rates, and average preparation speeds.
*   **Category & Menu Builder**: Interface to add/edit categories, dishes, variants, and pricing.
*   **QR Generator**: Generates and exports print-ready QR codes for dining tables.
*   **Staff Registry**: Management portal to add employees, assign roles, and track active shifts.
