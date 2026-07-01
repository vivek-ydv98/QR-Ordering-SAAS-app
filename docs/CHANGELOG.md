# Changelog

All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-06-29

### Added
*   Added automatic tax rate calculation (CGST, SGST, Service Charge) in `useCartStore` based on the restaurant's settings.
*   Added an auto-chime buzzer in KDS (`kitchen/page.tsx`) using the browser's Web Audio API to bypass browser autoplay blocks.
*   Added `TenantGuard` to secure endpoints against cross-tenant data requests.

### Changed
*   Moved tenant identification checks to the request header (`X-Tenant-ID`) instead of relying on URL query parameters.
*   Optimized dashboard stats querying, reducing DB search latency.

### Fixed
*   Fixed a checkout bug where item customizations with the same ID but different options would overwrite each other in the cart.
*   Fixed socket connection drops under poor network coverage by implementing automatic reconnection retry logic.

---

## [1.2.0] - 2026-05-15

### Added
*   Implemented the Kitchen Display System (KDS) for cooking staff.
*   Added order status visual aging colors (Green -> Amber -> Red).
*   Added a waiter assistance paging system.

---

## [1.1.0] - 2026-03-10

### Added
*   Added QR Code generator for dining tables.
*   Added restaurant settings configuration page.
*   Added Menu Category and Add-ons configuration forms.

---

## [1.0.0] - 2026-01-15

### Added
*   Initial SaaS multi-tenant architecture setup.
*   Prisma schema definition with Postgres mappings.
*   Staff user logins and JWT authentication strategy.
