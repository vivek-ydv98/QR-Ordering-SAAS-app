# System Development Roadmap

This document outlines the development phases, upcoming integrations, and the expansion plan for the QR Restaurant SaaS platform.

---

## Phase 1: Core Experience Optimization (Q3 2026)

*   **PWA Offline Queueing**: Implement IndexedDB on waiter terminals to queue table status updates locally when network connectivity is lost, syncing automatically once a connection is re-established.
*   **Split Billing**: Introduce a checkout option for customers to split the table's total bill evenly or by ordered items.
*   **Integrated UPI Payments**: Add dynamic UPI QR codes directly inside the customer's checkout drawer to enable instant mobile payments.

---

## Phase 2: AI & Personalization Engine (Q4 2026)

*   **AI Dish Recommendations**: Analyze past ordering combinations to suggest popular add-ons or side dishes (e.g. suggesting Garlic Bread when a Pizza is added).
*   **AI Chat Assistant**: A customer assistant to answer menu queries (e.g. "Which dishes are gluten-free?", "Recommend something spicy").
*   **Loyalty & Cashbacks**: Implement a reward points program based on the customer's phone number to encourage repeat visits.

---

## Phase 3: Enterprise & Integrations (Q1 2027)

*   **Inventory & Stock Tracking**: Track ingredient stock levels in real-time. Automatically mark menu items as out-of-stock when required ingredients are depleted.
*   **POS Terminal Integration**: Connect with existing restaurant POS systems (like Petpooja or Toast) to sync menu updates and incoming orders.
*   **i18n Multi-language Menu Support**: Allow customers to translate menu descriptions into regional Indian languages (Hindi, Bengali, Telugu, Kannada, Tamil) based on client locale settings.
*   **Super-Admin Tenant Subscriptions**: Integrate Stripe or Razorpay subscription billing in the Super-Admin panel to manage recurring payments for restaurant owners.
