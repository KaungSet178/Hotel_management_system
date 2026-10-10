# Grand Azure Hotel Management System
## Master Project Status, Completed Work & Comprehensive Roadmap

**Document Version:** 1.0.0  
**Last Updated:** October 11, 2026  
**Repository:** [https://github.com/KaungSet178/Hotel_management_system](https://github.com/KaungSet178/Hotel_management_system)  
**Architecture:** Monorepo (`backend/` + `frontend/`)  

---

## 1. Executive Summary

The **Grand Azure Hotel Management System** is a unified, end-to-end hospitality platform bridging customer-facing UX (booking, digital key passes, and in-room concierge) with internal hotel operations (reception, housekeeping, and administration). 

The project is structured into two collaborative workstreams:
1. **Backend Engineering:** Complete REST API, Supabase PostgreSQL database, concurrency-safe locking engine, payment webhooks, real-time event streaming, and security hardening.
2. **Frontend Engineering:** Client-facing web applications, staff management portals, and real-time dashboard interfaces.

---

## 2. What We Have Done (100% Completed on Backend)

All 5 core backend engineering phases have been implemented, tested, security-hardened, and verified live on Supabase and GitHub.

```text
============================================================
Automated Integration Test Results: 46 Passed, 0 Failed (100%)
============================================================
```

### Phase 1: Core Database Architecture & Concurrency Guard
* **PostgreSQL Relational Schema (`supabase/`):**
  * 8 Custom ENUM types: `user_role`, `room_status`, `payment_method`, `payment_status`, `booking_status`, `service_category`, `service_priority`, `service_status`.
  * 5 Relational Tables: `rooms`, `profiles`, `bookings`, `room_service_requests`, and `audit_logs`.
  * Indexes on `(room_id, check_in_date, check_out_date)`, `qr_token`, `auto_cancel_at`, and `status`.
  * Row Level Security (RLS) policies enforcing multi-role tenant isolation.
* **Concurrency & Double-Booking Protection (`book_room_atomic`):**
  * Implemented PostgreSQL stored procedure using `SELECT ... FOR UPDATE` row-level locking.
  * Guarantees zero double-bookings under concurrent booking attempts for overlapping dates (`409 Conflict`).
* **Contactless QR Check-In Engine (`qrService.js`):**
  * Cryptographic HMAC-SHA256 signature generation preventing QR forgery.
  * Base64 QR image generation (340px) for mobile passes and in-room portals.
  * Self-check-in verification endpoint transitioning room status to `OCCUPIED`.
* **Supabase Auth & RBAC Middleware (`server/middleware/auth.js`, `roles.js`):**
  * Bearer token extraction and verification via Supabase Auth (`supabase.auth.getUser`).
  * `requireRole(...roles)` higher-order guard enforcing permissions for `GUEST`, `RECEPTIONIST`, `HOUSEKEEPING`, and `ADMIN`.
  * Strict guest data partitioning: Guests can only query their own reservations; Housekeeping is barred from customer booking details.

### Phase 2: Dual Payment Gateway & Webhook Scaffolding
* **Unified Checkout Endpoint (`POST /api/payments/checkout`):**
  * Supports both **KBZPay** (prepay order string generation) and **Visa/Stripe** (Checkout session URL generation).
  * Enforces ownership, pending state, and blocks double payments on already `PAID` bookings.
* **KBZPay Service (`services/kbzPayService.js`):**
  * Parameter sorting, SHA256 merchant key hashing, and incoming webhook signature verification.
* **Stripe Service (`services/stripeService.js`):**
  * Stripe Checkout Session creation and raw-body buffer HMAC-SHA256 signature verification (`t=<timestamp>,v1=<hash>`).
  * Webhook listener auto-updates bookings to `PAID`, clears cancellation deadline (`auto_cancel_at = null`), and attaches transaction metadata.

### Phase 3: Zod Schema Validation & Centralized Error Envelopes
* **Zod Middleware Factory (`server/middleware/validate.js`):**
  * Request payload validation intercepting invalid input before controller logic.
* **Comprehensive Schemas (`server/validators/schemas.js`):**
  * `createBookingSchema`: Validates UUID `room_id`, date chronology (`check_out_date > check_in_date`), and payment methods.
  * `scanQrCheckInSchema`: Validates QR token formats.
  * `serviceRequestSchema`: Validates service categories (`TOWELS`, `CLEANING`, `MAINTENANCE`, `FOOD_BEVERAGE`, `AMENITIES`, `OTHER`) and priority flags.
  * `updateRoomStatusSchema`: Validates room statuses (`AVAILABLE`, `OCCUPIED`, `CLEANING`, `MAINTENANCE`).
* **Centralized Error Handler (`server/middleware/errorHandler.js`):**
  * Unified JSON envelope format: `{ success: false, error: string, code: string, details?: any }`.

### Phase 4: Security Hardening & Rate Limiting
* **Helmet Security Headers:** Globally hides `X-Powered-By`, enforces `X-Content-Type-Options: nosniff`, and applies basic XSS filtering.
* **Strict CORS Whitelisting:** Configurable origin matching `FRONTEND_URL` (defaults to `http://localhost:3000`).
* **Tiered Rate Limiting (`server/middleware/rateLimiter.js`):**
  * Global Baseline: 100 requests per 15-minute window per IP.
  * Strict Sensitive Limiter: 5 requests per 1-minute window on `/api/check-in/scan` and `POST /api/bookings` to block brute-force attacks.

### Phase 5: Cloud Deployment & Stripe CLI Verification
* **Live Supabase Synchronization:**
  * Connected to live Supabase project `https://mzmkiivcjbnhjjymiuha.supabase.co`.
  * Executed master schema [`supabase/COMPLETE_DATABASE_SETUP.sql`](backend/supabase/COMPLETE_DATABASE_SETUP.sql).
  * 6 luxury rooms and default staff/guest profiles seeded and operational.
* **Automated 24-Hour Cancellation Policy:**
  * Native PostgreSQL `pg_cron` scheduled job: `'hourly-24h-unpaid-cancellation-check'` runs `public.auto_cancel_unpaid_bookings()` directly inside the database every hour.
* **Stripe CLI Local Webhook Verification:**
  * Installed Stripe CLI `v1.53.1` on Windows.
  * Created test sandbox account (`acct_1UOvyi6eD2LcmEcl`).
  * Verified live webhook forwarding: `stripe trigger checkout.session.completed` received by Express, signature verified, and test booking updated to `PAID`.
* **Repository Restructuring & Git Publication:**
  * Monorepo established: `backend/` and `frontend/`.
  * Protected secrets: `.env` and `node_modules/` secured via `.gitignore`.
  * Committed and pushed to GitHub `main` branch: `https://github.com/KaungSet178/Hotel_management_system`.

---

## 3. What Is Still Left to Complete the Entire Project

To complete the full end-to-end hotel system, the remaining work is divided into **Frontend Development**, **Real-Time Integration**, and **Production Cloud Hosting**:

```
Remaining Tasks Breakdown
├── A. Frontend Web App (Teammate's Workstream)
│   ├── 1. Project Initialization & Design System
│   ├── 2. Customer Guest Experience
│   ├── 3. In-Room Guest Portal
│   ├── 4. Receptionist Staff Rack & Scanner
│   ├── 5. Housekeeping Cleaning Queue
│   └── 6. Admin Analytics & Policy Monitor
├── B. Frontend-to-Backend Integration
│   ├── 1. API Client & JWT Token Management
│   └── 2. Real-Time Event Bus Subscription (SSE / WebSockets)
└── C. Cloud Production Hosting & Live Domain
    ├── 1. Backend Server Deployment (Render / Railway / AWS)
    ├── 2. Frontend Web App Deployment (Vercel / Netlify)
    └── 3. Live Payment Gateway Webhook URLs
```

---

### A. Frontend Development Tasks (In `frontend/`)

Your teammate can build the frontend using React (Vite/Next.js) or modern HTML/CSS/JS. The frontend needs the following screens and workflows:

#### 1. Customer Guest Portal
* [ ] **Room Catalog Page (`GET /api/rooms`):**
  * Display luxury room cards (images, prices, amenities, capacity).
  * Filter by room status (`AVAILABLE` vs `OCCUPIED`).
* [ ] **Booking & Reservation Modal (`POST /api/bookings`):**
  * Check-in and check-out date picker with price calculator.
  * Guest contact inputs (Name, Email, Phone).
  * Payment method selector:
    * **Online Payment (Visa/Stripe):** Redirect to Stripe Checkout URL.
    * **KBZPay (Online):** Display QR / prepay order string.
    * **Pay at Hotel:** Explain 24-hour hold window and auto-cancellation policy.
* [ ] **Digital Room Key & QR Pass Screen:**
  * Display high-resolution Base64 QR code (`qr_code_data_url`).
  * Display booking reference (e.g. `LUX-8491`), room number, and check-in dates.

#### 2. In-Room Concierge Portal (Accessed by Scanning In-Room QR Code)
* [ ] **Guest Services Screen (`POST /api/service-requests`):**
  * Request categories: Extra Towels, Room Cleaning, Maintenance, Dining/Drinks, Toiletries.
  * Priority selector (`NORMAL`, `URGENT`).
  * Live status badge (`PENDING` ➔ `IN_PROGRESS` ➔ `COMPLETED`).

#### 3. Receptionist Front-Desk Dashboard
* [ ] **Live Room Rack (Grid View):**
  * Color-coded room grid:
    * 🟢 Green: `AVAILABLE`
    * 🔴 Red: `OCCUPIED`
    * 🟡 Yellow: `CLEANING`
    * 🟣 Purple: `MAINTENANCE`
  * Real-time updates without page refresh via `/api/events` (SSE).
* [ ] **QR Code Check-In Scanner (`POST /api/check-in/scan`):**
  * Webcam / mobile camera scanner to scan guest QR passes on arrival.
  * Instant check-in confirmation and automatic room rack update.
* [ ] **Guest Check-Out (`POST /api/check-out/:id`):**
  * 1-click check-out button that marks booking `CHECKED_OUT` and automatically switches room to `CLEANING` for housekeeping.

#### 4. Housekeeping Mobile/Tablet Dashboard
* [ ] **Cleaning Queue View (`GET /api/rooms`):**
  * Shows rooms currently flagged as `CLEANING`.
  * Action button: *"Mark Clean & Ready"* (`PATCH /api/rooms/:id/status` ➔ `AVAILABLE`).
* [ ] **In-Room Service Requests Board (`GET /api/service-requests`):**
  * Real-time list of guest requests.
  * Status updater: `PENDING` ➔ `IN_PROGRESS` ➔ `COMPLETED`.

#### 5. General Manager / Admin Dashboard
* [ ] **Hotel Analytics:**
  * Current occupancy percentage and daily revenue totals.
* [ ] **Policy & Background Jobs Control (`POST /api/jobs/trigger-cancellation`):**
  * Manual trigger button to evaluate and cancel expired 24-hour unpaid reservations.
  * Audit log viewer displaying actor IDs and system timestamps.

---

### B. Integration & Real-Time Plumbing Tasks

* [ ] **Auth Token Storage & Interceptors:**
  * Save Supabase JWT session token in `localStorage` or secure cookie upon login.
  * Attach `Authorization: Bearer <token>` automatically in all API requests.
* [ ] **Server-Sent Events (SSE) Listener:**
  * Connect to `http://localhost:3000/api/events`.
  * Listen for:
    * `room:updated`: Updates room rack tiles immediately.
    * `booking:created` & `booking:checked_in`: Updates front-desk arrival lists.
    * `service_request:created` & `service_request:updated`: Pushes notifications to housekeeping.

---

### C. Final Cloud Production Deployment

* [ ] **Backend Hosting:**
  * Deploy `backend/` to a cloud PaaS (e.g., Render, Railway, Fly.io, or Heroku).
  * Configure production environment variables (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`, `STRIPE_WEBHOOK_SECRET`).
* [ ] **Frontend Hosting:**
  * Deploy `frontend/` to Vercel, Netlify, or Cloudflare Pages.
  * Set `VITE_API_BASE_URL` or `NEXT_PUBLIC_API_URL` to point to the live backend URL.
* [ ] **Live Stripe & KBZPay Webhook Registration:**
  * Register `https://your-backend-domain.com/api/payments/webhook/stripe` in the Stripe Dashboard.
  * Register the KBZPay production callback URL with KBZPay merchant portal.
* [ ] **Custom Domain & SSL:**
  * Point hotel domain (e.g. `grandazurehotel.com`) with automated HTTPS certificates.

---

## 4. Current File & Directory Map

```text
Hotel_management_system/
├── backend/                             # 100% COMPLETE BACKEND ENGINE
│   ├── server/                          # Express.js REST API
│   │   ├── middleware/                  # auth.js, roles.js, validate.js, rateLimiter.js, errorHandler.js
│   │   ├── services/                    # kbzPayService.js, stripeService.js
│   │   ├── validators/                  # schemas.js (Zod)
│   │   ├── qrService.js                 # HMAC cryptographic QR generator
│   │   ├── cancellationJob.js           # 24h cancellation runner
│   │   ├── checkSupabase.js             # Live database diagnostics
│   │   ├── test-suite.js                # 46-test automated suite
│   │   └── index.js                     # Server entry point
│   ├── supabase/                        # Database migrations & Edge Functions
│   │   ├── migrations/                  # SQL Migrations 001 - 004
│   │   ├── functions/                   # cancellation-job Edge Function (Deno)
│   │   └── COMPLETE_DATABASE_SETUP.sql  # Master database script
│   ├── public/                          # Mock preview assets
│   ├── .env.example                     # Backend env template
│   ├── .env.production.example          # Production env template
│   ├── API_DOCUMENTATION.md             # API specifications for frontend team
│   ├── BACKEND_SETUP.md                 # Backend setup guide
│   └── PROGRESS_TRACKER.md              # Backend progress tracker
├── frontend/                            # DEDICATED FRONTEND WORKSPACE
│   └── README.md                        # Onboarding guide & endpoint cheat sheet
├── .gitignore                           # Production gitignore
├── package.json                         # Root monorepo command runner
├── PROJECT_ROADMAP_AND_STATUS.md        # This document
└── README.md                            # High-level overview
```
