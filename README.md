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

## 2. PostgreSQL Schema & Entity Relationship Diagram (ERD)

The schema is maintained in `src/server/db/schema.sql`:

```mermaid
erDiagram
    USERS ||--o{ ADDRESSES : "has many"
    USERS ||--o{ ORDERS : "places"
    USERS ||--o{ CARTS : "owns"
    USERS ||--o{ AUDIT_LOGS : "performed by"
    
    CATEGORIES ||--o{ PRODUCTS : "contains"
    PRODUCTS ||--o{ PRODUCT_VARIANTS : "has many"
    
    CARTS ||--o{ CART_ITEMS : "contains"
    PRODUCT_VARIANTS ||--o{ CART_ITEMS : "referenced by"
    
    ORDERS ||--o{ ORDER_ITEMS : "consists of"
    PRODUCT_VARIANTS ||--o{ ORDER_ITEMS : "purchased in"
    ORDERS ||--o{ INVENTORY_LOGS : "generates"
    PRODUCT_VARIANTS ||--o{ INVENTORY_LOGS : "logs changes"
```

### Table Definitions & Invariants:
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

---

## 6. Environment Variables Reference

A documented `.env.example` is provided:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | HTTP port the Express server listens on | `5000` |
| `NODE_ENV` | Application environment (`development` / `production`) | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/urban_threads_db` |
| `JWT_SECRET` | Secret key for signing HMAC-SHA256 JWT auth tokens | `your_jwt_secret_key_here` |
| `JWT_EXPIRES_IN` | JWT expiration duration | `7d` |
| `CORS_ORIGIN` | Allowed cross-origin domain for Vite dev server | `http://localhost:3000` |

---

## 7. Known Limitations & Production Roadmap

1. **Payment Gateway Integration:** The current payment gateway operates in sandbox simulation mode. For full production deployment, webhook handlers for Stripe/PayPal can be plugged into `orderService.processCheckout`.
2. **Multi-Currency Support:** The platform currently operates in USD ($). Future iterations can integrate dynamic currency conversion rates based on customer geolocation.
3. **Image Storage CDN:** Product images are currently served from high-resolution Unsplash CDNs. In an enterprise environment, an S3/Cloudflare R2 bucket with automated image resizing would be utilized.

---

## 8. Documentation & Submission Assets

- **Technical Report:** [`TECHNICAL_REPORT.md`](file:///c:/Users/HP/Downloads/Alson%20ai/TECHNICAL_REPORT.md) (covers architecture, FSM, concurrency controls, test evidence, and video walkthrough script).
- **OpenAPI 3.0 Specification:** [`docs/openapi.yaml`](file:///c:/Users/HP/Downloads/Alson%20ai/docs/openapi.yaml).
- **PostgreSQL Schema:** [`src/server/db/schema.sql`](file:///c:/Users/HP/Downloads/Alson%20ai/src/server/db/schema.sql).
- **Test Suite:** [`tests/`](file:///c:/Users/HP/Downloads/Alson%20ai/tests/) (10 test files, 27 passing tests).


