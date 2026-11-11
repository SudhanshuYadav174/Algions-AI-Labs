# Urban Threads (UT) - Premium Streetwear E-Commerce Platform

Urban Threads is a production-grade, database-backed e-commerce platform built for high-performance streetwear drops. Designed with transactional consistency, server-side role-based authorization, inventory concurrency control (`SELECT ... FOR UPDATE`), idempotency key guarantees, and real-time executive analytics.

---

## 1. System Architecture & Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons
- **Backend API**: Node.js + Express 4 + TypeScript (ESM)
- **Database & Persistence**: PostgreSQL 18 with relational integrity, foreign key cascading, and database-level constraint verification (`CHECK (stock_quantity >= 0)`)
- **Authentication**: JWT signed with HMAC-SHA256, HTTP Bearer tokens, bcrypt (10 rounds) salt hashing
- **Testing**: Vitest + Supertest automated suite covering Unit, Integration, Concurrency Race Conditions, and End-to-End journeys

---

## 2. PostgreSQL Schema & Entity Relationships

The schema is maintained in `src/server/db/schema.sql`:

1. **`users`**: Customer & Admin accounts with role constraints (`customer`, `admin`).
2. **`addresses`**: Customer address book with default address flags.
3. **`categories`**: Streetwear categories (`new-arrivals`, `men`, `women`, `accessories`, `sale`).
4. **`products`**: Streetwear garments with slugs, price, compare-at prices, active flags.
5. **`product_variants`**: Size, color, SKU, price adjustments, and strict `CHECK (stock_quantity >= 0)` constraints.
6. **`coupons`**: Discount engine supporting percentage discounts and fixed dollar thresholds.
7. **`carts` & `cart_items`**: Persistent user/session carts with live stock checks.
8. **`orders` & `order_items`**: Atomic order records with unique order numbers and idempotency keys.
9. **`inventory_logs`**: Complete audit trail tracking variant stock deltas, previous stock, new stock, and reasons.
10. **`audit_logs`**: Administrative change capture with previous state, new state, user ID, and IP address.
11. **`idempotency_records`**: Cached responses for repeat checkout requests to guarantee zero duplicate orders.

---

## 3. Demo Credentials (Reviewer Access)

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Store Administrator** | `admin@urbanthreads.com` | `Admin@123456` | Executive reporting, order lifecycle, stock adjustments, product catalog, audit logs |
| **Customer 1** | `customer@urbanthreads.com` | `Customer@123456` | Browsing, cart, checkout, saved address book, personal order tracking |
| **Customer 2** | `jane@example.com` | `Customer@123456` | Multi-tenant customer data isolation verification |

---

## 4. Quick Start & Local Run Steps

### Prerequisites
- Node.js v20+ (tested on v22.14.0)
- PostgreSQL 14+ running locally (default: `localhost:5432`)

### Setup & Run
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
# Copy .env.example to .env and adjust PostgreSQL connection string if needed:
# DATABASE_URL=postgresql://postgres:@localhost:5432/urban_threads_db

# 3. Run database migrations & seed demo catalog
npm run db:migrate
npm run db:seed

# 4. Run automated test suite
npm test

# 5. Build for production
npm run build

# 6. Start production server
npm start
# Server listens on http://localhost:5000 (serves compiled API and frontend)
```

---

## 5. Automated Verification Summary

All 27 automated tests pass across 10 test suites:
- **Unit**: Server pricing math, discount thresholds, 8% tax, shipping, finite state machine transitions.
- **Integration**: Auth & RBAC (401/403 checks), customer data isolation (customer cannot view another's orders), inventory limits.
- **Concurrency**:
  - `raceConditionInventory.test.ts`: 10 simultaneous checkout requests competing for 1 unit; exactly 1 succeeds, 9 fail with 409/400; stock ends at exactly 0.
  - `idempotencyDuplicateCheckout.test.ts`: Replayed checkout requests return cached order without creating duplicates or double-deducting stock.
  - `cancellationStockRestore.test.ts`: Cancellation restores inventory exactly once; repeat cancellation rejected.
- **End-to-End**: Full customer-to-admin lifecycle: Registration -> Search -> Variant Selection -> Cart -> Server Pricing Quote -> Checkout -> Empty Cart -> Order Tracking -> Admin Order Fulfillment.

