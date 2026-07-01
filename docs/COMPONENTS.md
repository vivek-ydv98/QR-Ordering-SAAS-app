# Frontend Components & State Management Specifications

This document describes the key React components, pages, context providers, and Zustand stores in the application.

---

## 1. Context Providers

### 1.1. `TenantProvider` (in `TenantContext.tsx`)
*   **Purpose**: Resolves the tenant's brand configuration, logo, and active features using the URL slug, and injects custom HSL colors into the HTML root element.
*   **State & Props**:
    *   `tenant`: Active tenant settings object (`id`, `name`, `slug`, `logoUrl`, `theme`, `settings`).
    *   `isLoading`: Boolean indicator for network fetch state.
    *   `error`: Stores errors encountered during resolution.
*   **Hooks Used**: `useParams`, `usePathname`.
*   **API Calls**: `GET /v1/restaurants/by-slug/:slug`.
*   **Performance Considerations**: The resolved theme configuration is cached globally to prevent redundant API calls on client page navigations.

---

## 2. Global State Stores (Zustand)

### 2.1. `useCartStore`
*   **Purpose**: Manages cart items, customization variants, special instructions, and calculates GST taxes.
*   **Persistence**: Serializes cart state to `localStorage` using Zustand's persist middleware, preserving cart items during network drops or page refreshes.
*   **Key Operations**:
    *   `addItem(item, customizations)`: Generates a compound key using `generateCartItemId` and adds the item to the cart. If the item with matching customizations already exists, it increments the quantity.
    *   `removeItem(itemId)`: Removes the target item.
    *   `updateQuantity(itemId, quantity)`: Updates the item quantity.
    *   `clearCart()`: Clears the cart.
*   **Tax Calculations**: Real-time invoice calculations:
    *   `subtotal`: Sum of item base costs and customized options.
    *   `cgst`: `subtotal` * `cgstRate / 100`.
    *   `sgst`: `subtotal` * `sgstRate / 100`.
    *   `serviceCharge`: `subtotal` * `serviceChargeRate / 100`.
    *   `grandTotal`: Sum of subtotal and all taxes.

### 2.2. `useUIStore`
*   **Purpose**: Manages UI state, including active search terms, selected categories, and modal window states.
*   **State Variables**:
    *   `searchQuery`: String query for filtering menu items.
    *   `activeCategory`: Selected category ID for menu navigation.
    *   `cartOpen`: Boolean state for the cart drawer modal.
    *   `assistanceOpen`: Boolean state for the waiter assistance drawer.

---

## 3. Main Operational Pages

### 3.1. Customer Menu Page (`r/[tenant]/table/[tableId]/page.tsx`)
*   **Purpose**: Customer ordering interface. Features menu searches, veg-only filters, dish customization drawers, and order status tracking.
*   **Hooks Used**: `useParams`, `useSocket`, `useCartStore`, `useUIStore`.
*   **API Calls**:
    *   `GET /v1/menu` to load category catalogs.
    *   `POST /v1/orders` to submit new orders.
*   **Re-render Optimization**: Menu item listings are optimized to prevent page shifts. Customization sheets are loaded lazily to improve initial load times.

### 3.2. Kitchen Display System (`app/kitchen/page.tsx`)
*   **Purpose**: Displays cooking ticket cards with timers, status updates, and a audio buzzer.
*   **Hooks Used**: `useSocket`, `useToastStore`.
*   **API Calls**:
    *   `GET /v1/orders` to load active KOT queues.
    *   `PATCH /v1/orders/:id/status` to advance order statuses.
*   **Audio buzzer**: Uses the browser's Web Audio API to synthesize alert chimes without loading external files, bypassing autoplay blocks.

### 3.3. Waiter Operations Hub (`app/waiter/page.tsx`)
*   **Purpose**: Displays floor tables, occupancy states, and alerts from tables.
*   **Hooks Used**: `useSocket`, `useToastStore`.
*   **API Calls**:
    *   `GET /v1/tables` to load table layouts.
    *   `PATCH /v1/tables/:id` to update table statuses (e.g. marking a table clean).
