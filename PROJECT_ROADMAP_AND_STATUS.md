# Grand Azure Hotel Management System
## Master Project Status, Completed Work & Comprehensive Roadmap

**Document Version:** 2.1.0  
**Last Updated:** October 12, 2026  
**Repository:** [https://github.com/KaungSet178/Hotel_management_system](https://github.com/KaungSet178/Hotel_management_system)  
**Architecture:** Monorepo (`backend/` + `customer-frontend/`)  

---

## 1. Executive Summary

The **Grand Azure Hotel Management System** is a unified, end-to-end hospitality platform bridging customer-facing UX (booking, digital key passes, and in-room concierge) with internal hotel operations (reception, housekeeping, and administration). 

The platform is organized as a clean monorepo:
1. **`backend/`:** Node.js Express API Gateway, Supabase PostgreSQL database, concurrency-safe row-locking engine, dual payment gateway (Stripe & KBZPay), Server-Sent Events (SSE) realtime bus, and 24-hour auto-cancellation worker.
2. **`customer-frontend/`:** StayFlow luxury guest web application (React, TypeScript, Vite, Tailwind CSS, Lucide icons, Vitest).

---

## 2. Completed Milestones (100% Verified)

All backend infrastructure, database migrations, customer frontend contracts, and live HTTP integration are complete and verified with automated test suites:

```text
============================================================
Automated Backend Integration Tests: 46 Passed, 0 Failed (100%)
Automated Frontend Vitest Tests:     44 Passed, 0 Failed (100%)
Total Verified Test Coverage:        90 Passed, 0 Failed (100%)
============================================================
```

### Phase 1: Core Database Architecture & Concurrency Guard
* **PostgreSQL Relational Schema (`supabase/`):**
  * 8 Custom ENUM types: `user_role`, `room_status`, `payment_method`, `payment_status`, `booking_status`, `service_category`, `service_priority`, `service_status`.
  * 5 Relational Tables: `rooms`, `profiles`, `bookings`, `room_service_requests`, and `audit_logs`.
  * Indexes on `(room_id, check_in_date, check_out_date)`, `qr_token`, `auto_cancel_at`, and `status`.
  * Row Level Security (RLS) policies enforcing multi-role tenant isolation.
* **Concurrency & Double-Booking Protection (`book_room_atomic`):**
  * PostgreSQL stored procedure using `SELECT ... FOR UPDATE` row-level locking.
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
* **Strict CORS Whitelisting:** Configurable origin matching `FRONTEND_URL` (supports `http://localhost:5173`, `http://localhost:3000`).
* **Tiered Rate Limiting (`server/middleware/rateLimiter.js`):**
  * Global Baseline: 100 requests per 15-minute window per IP.
  * Strict Sensitive Limiter: 5 requests per 1-minute window on `/api/check-in/scan` and `POST /api/bookings` to block brute-force attacks.

### Phase 5: Cloud Deployment & Stripe CLI Verification
* **Live Supabase Synchronization:**
  * Connected to live Supabase project `https://mzmkiivcjbnhjjymiuha.supabase.co`.
  * Executed master schema [`supabase/COMPLETE_DATABASE_SETUP.sql`](backend/supabase/COMPLETE_DATABASE_SETUP.sql).
  * Luxury suites and default staff/guest profiles seeded and operational.
* **Automated 24-Hour Cancellation Policy:**
  * Native PostgreSQL `pg_cron` scheduled job: `'hourly-24h-unpaid-cancellation-check'` runs `public.auto_cancel_unpaid_bookings()` directly inside the database every hour.
* **Stripe CLI Local Webhook Verification:**
  * Installed Stripe CLI `v1.53.1` on Windows.
  * Verified live webhook forwarding: `stripe trigger checkout.session.completed` received by Express, signature verified, and test booking updated to `PAID`.

### Phase 6: Customer Frontend Integration & Supabase Migration 005
* **Customer Frontend Integration (`customer-frontend/`):**
  * StayFlow customer web app pulled from teammate's branch.
  * Features luxury destination showcase, hotel directory, interactive room cards, date picker, booking stepper, digital key pass, Folio PIN access, and in-room concierge.
  * 38/38 Vitest tests passing. Production build succeeds cleanly.
* **Supabase Migration 005 (`backend/supabase/migrations/20261011_005_customer_frontend_support.sql`):**
  * Added `destinations` and `hotels` tables with foreign keys and RLS policies.
  * Enhanced `rooms` table with slugs, hotel foreign key, hero/gallery image URLs, amenities, bed configurations, ratings, and review counts.
  * Enhanced `bookings` table with `folio_pin` (4-digit security PIN), `draft_key` (idempotency key), `payment_proof` (bank transfer slip storage), guest contact details, flight numbers, and price breakdowns.
  * Upgraded `book_room_atomic` PostgreSQL function to 24 named parameters with row-locking concurrency guard.
* **15 Customer REST API Endpoints (`backend/server/routes/customerRoutes.js`):**
  * Implemented destinations, hotels, room search/filters, room availability checker, draft booking lifecycle, reference/PIN booking lookup, payment proof upload, and in-room guest service requests.
* **Live HTTP Service Mode:**
  * Configured `customer-frontend/.env` to `VITE_SERVICE_MODE=http` and `VITE_API_BASE_URL=http://localhost:3000/api`.
  * Verified live cross-origin HTTP communication between React frontend and Express backend.

### Phase 7: Real Authentication, Email Verification Gate & Strict RLS Hardening
* **Real Supabase Authentication & Multi-Provider Auth (`customer-frontend/src/lib/auth.ts`, `AuthContext.tsx`):**
  * Implemented complete Email/Password authentication lifecycle: user registration (`signUpWithEmail`), password login (`signInWithPassword`), forgot password recovery (`resetPasswordForEmail`), in-app password reset (`updatePassword`), and email verification resend.
  * Seamless Google OAuth single sign-on (`signInWithOAuth`) with automatic hash/param extraction and redirection cleaning.
  * Dedicated auth pages: `/verify-email` and `/reset-password`.
* **Persistent Login & Last Identity Remembering:**
  * Configured client token persistence (`persistSession: true`, `autoRefreshToken: true`) and `INITIAL_SESSION` hydration to keep guests securely signed in across browser restarts until manual logout.
  * Remembers and pre-fills the last logged-in identity (`stayflow.last_login_email`, `stayflow.last_login_name`, `stayflow.last_login_at`) with a "Keep me signed in on this device" control.
* **Mandatory Email Verification & Reservation Protection:**
  * Room browsing and searching is public, but completing a room reservation strictly requires an authenticated account with a verified email address.
  * Frontend `EmailVerificationGate` blocks guest folio submission until email confirmation.
  * Backend `requireVerifiedEmail` middleware intercepts unverified attempts (`403 EMAIL_NOT_VERIFIED`).
* **Strict Row Level Security & Profile Synchronisation:**
  * **Migration 006 (`backend/supabase/migrations/20261012_006_strict_row_level_security.sql`):** Recursion-safe `current_user_role()`, guest folio data isolation, staff RBAC policies.
  * **Migration 007 (`backend/supabase/migrations/20261012_007_auth_users_profile_trigger.sql`):** PostgreSQL `handle_new_user()` trigger on `auth.users` automatically synchronizing new accounts into `public.profiles`.
  * Resolved `bookings_guest_id_fkey` constraint violation by auto-reconciling profile IDs and provisioning missing rows prior to atomic booking execution.
  * Upgraded Express body parser limits to `15mb` to cleanly support high-resolution base64 bank transfer screenshots.
* **Documentation Consolidation:**
  * Cleaned obsolete files (`backend/PROJECT_SPECS.md`, `backend/PROGRESS_TRACKER.md`, legacy `frontend/`).
  * Rewrote `backend/API_DOCUMENTATION.md` into the Master Unified API Specification covering Customer API, Staff API, Payments, and SSE Events.
  * Updated `backend/BACKEND_SETUP.md` with Migrations 005, 006, 007, and dual-auth architecture.

---

## 3. What Is Left to Implement (Remaining Work Roadmap)

With the Customer-facing guest experience and backend engine 100% complete, the remaining implementation tasks focus on **Staff Operations UI**, **Payment Slip Verification Workflow**, and **Cloud Production Deployment**:

```text
Remaining Work Roadmap
├── 1. Staff Operations Portal UI (Front-Desk, Housekeeping & Admin)
│   ├── Receptionist Live Room Rack Grid View (Color-coded status tiles)
│   ├── Front-Desk Camera/Webcam QR Code Scanner (/api/check-in/scan)
│   ├── Guest 1-Click Check-Out Workflow (/api/check-out/:id)
│   ├── Housekeeping Mobile Cleaning Queue (Mark Clean & Ready)
│   ├── Housekeeping In-Room Service Requests Board (Live status progression)
│   └── Admin Occupancy & Revenue Analytics Dashboard
├── 2. Bank Transfer Payment Slip Verification Workflow
│   ├── Staff UI to view uploaded payment proof slips
│   ├── Staff Approval endpoint (PATCH /api/bookings/:id/payment-proof/verify -> PAID)
│   └── Staff Rejection endpoint with reason notes
└── 3. Cloud Production Deployment & Live Webhooks
    ├── Express Backend deployment to cloud PaaS (Render / Railway)
    ├── Customer Frontend deployment to CDN (Vercel / Netlify)
    └── Live Stripe & KBZPay production webhook URL registration
```

---

### Priority 1: Staff Operations Portal UI

All backend API endpoints and real-time SSE events for staff operations are already built and tested. What is needed is the frontend UI dashboard for hotel staff:

#### 1. Front-Desk Reception Dashboard
* **Live Room Rack Grid View:**
  * Color-coded room grid:
    * 🟢 Green: `AVAILABLE`
    * 🔴 Red: `OCCUPIED`
    * 🟡 Yellow: `CLEANING`
    * 🟣 Purple: `MAINTENANCE`
  * Real-time tile updates without page refresh via `/api/live-events` (SSE).
* **QR Code Check-In Camera Scanner:**
  * Webcam / mobile camera scanner integrated using browser `html5-qrcode` or equivalent.
  * Scans guest's digital pass QR code (`qr_token`), submits to `POST /api/check-in/scan`, and instantly marks room `OCCUPIED`.
* **Guest Check-Out Action:**
  * 1-click check-out button calling `POST /api/check-out/:id`.
  * Transitions booking to `CHECKED_OUT` and automatically switches room to `CLEANING` for housekeeping.

#### 2. Housekeeping Mobile/Tablet Dashboard
* **Cleaning Queue:**
  * Displays rooms currently flagged as `CLEANING`.
  * Action button: *"Mark Clean & Ready"* calling `PATCH /api/rooms/:id/status` with `status: "AVAILABLE"`.
* **In-Room Service Requests Board:**
  * Real-time list of guest requests received from in-room concierge.
  * Status updater: `PENDING` ➔ `IN_PROGRESS` ➔ `COMPLETED` calling `PATCH /api/service-requests/:id/status`.

#### 3. General Manager / Admin Dashboard
* **Hotel Analytics:**
  * Real-time occupancy percentage and revenue totals.
* **Policy & Background Jobs Control:**
  * Manual trigger button for 24-hour unpaid booking cancellation (`POST /api/jobs/trigger-cancellation`).
  * System audit log viewer displaying timestamps, actors, and actions.

---

### Priority 2: Bank Transfer Payment Slip Verification Workflow

Guests can now upload bank transfer screenshots via `POST /api/bookings/:bookingId/payment-proof`. To complete this workflow:
* **Staff Verification Endpoint:**
  * Add `PATCH /api/bookings/:id/payment-proof/verify` requiring `RECEPTIONIST` or `ADMIN` role.
  * If approved: updates `payment_status` to `PAID`, clears `auto_cancel_at`, and broadcasts `booking:paid`.
  * If rejected: records rejection notes and notifies guest.
* **Staff Verification UI:**
  * Image modal in the staff dashboard to inspect the receipt screenshot and click "Approve" or "Reject".

---

### Priority 3: Cloud Production Deployment

* **Backend Deployment:**
  * Deploy `backend/` to Render, Railway, or AWS.
  * Set production environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `FRONTEND_URL`).
* **Frontend Deployment:**
  * Deploy `customer-frontend/` to Vercel or Netlify.
  * Set `VITE_API_BASE_URL` to the public backend domain.
* **Live Webhooks & SSL:**
  * Register live webhook callback URLs in Stripe and KBZPay portals.
  * Configure custom domain with automated SSL/TLS certificates.

---

## 4. Repository Structure

```text
hotel_management_system/
├── backend/                             # 100% COMPLETE BACKEND ENGINE
│   ├── server/                          # Express.js REST API
│   │   ├── routes/                      # customerRoutes.js (15 guest endpoints)
│   │   ├── middleware/                  # auth.js, roles.js, validate.js, rateLimiter.js, errorHandler.js
│   │   ├── services/                    # kbzPayService.js, stripeService.js
│   │   ├── validators/                  # schemas.js (Zod)
│   │   ├── qrService.js                 # HMAC cryptographic QR generator
│   │   ├── cancellationJob.js           # 24h cancellation runner
│   │   ├── checkSupabase.js             # Live database diagnostics
│   │   ├── test-suite.js                # 46-test automated backend test runner
│   │   └── index.js                     # Main server entry point & SSE bridge
│   ├── supabase/                        # Database migrations & Edge Functions
│   │   ├── migrations/                  # SQL Migrations 001 - 005
│   │   ├── functions/                   # cancellation-job Edge Function (Deno)
│   │   └── COMPLETE_DATABASE_SETUP.sql  # Master database script
│   ├── public/                          # Mock preview assets
│   ├── .env.example                     # Backend env template
│   ├── .env.production.example          # Production env template
│   ├── API_DOCUMENTATION.md             # Master Unified API Specification
│   └── BACKEND_SETUP.md                 # Backend setup guide
├── customer-frontend/                   # 100% COMPLETE CUSTOMER GUEST WEB APP
│   ├── src/                             # React + TypeScript + Tailwind source code
│   ├── API_CONTRACTS.md                 # Frontend contract specifications
│   ├── README.md                        # Customer app documentation
│   ├── vitest.config.ts                 # Vitest test runner config (38 passing tests)
│   └── package.json                     # Frontend dependencies & scripts
├── .gitignore                           # Production gitignore
├── package.json                         # Root monorepo command runner
├── PROJECT_ROADMAP_AND_STATUS.md        # Master roadmap & completion status (this document)
└── README.md                            # High-level repository overview
```
