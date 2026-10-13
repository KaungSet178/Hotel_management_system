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

### Phase 8: Staff Operations Portal, Real-Time Sync & Autonomous Room Inventory
* **Staff Front Desk & Admin Console (`staff-frontend/`):**
  * Complete operational workspace supporting Front Desk (`RECEPTIONIST`), Housekeeping (`HOUSEKEEPING`), and Management (`ADMIN`).
  * Strict role routing: Administrators are restricted to executive yield analytics, channel management, and audit logs; staff members are restricted to desk operations.
* **Payment Slip Verification & Dual-Pipeline Visibility:**
  * Online reservations waiting for bank transfer review appear simultaneously in `/requests` and the `/reservations` Waiting Approval queue.
  * Direct rendering and enlargement modal for uploaded payment proof screenshots.
  * Approving payment sets booking to `CONFIRMED` and `PAID`. Rejecting payment marks booking `CANCELLED` and immediately releases the room.
  * Unapproved reservations are strictly blocked from QR check-in until verified.
* **Cross-Portal Real-Time Synchronization & Sound Notifications:**
  * Bi-directional live broadcast using Supabase Realtime (`stayflow-live-broadcast`).
  * Customer portal immediately reacts to staff payment approval without needing manual page refresh.
  * Audio chime and notification badge indicators for new bookings and service updates.
* **In-Room Concierge & Guest Services Dispatch:**
  * Real-time 3-tier KanBan dispatch (`PENDING` ➔ `IN_PROGRESS` ➔ `COMPLETED`).
  * Fix and persistence of staff assignment and work order status in `room_service_requests`.
* **Autonomous Inventory Self-Healing & Overdue Room Release:**
  * **Strict Derived Occupancy:** Rooms are only `OCCUPIED` if an active in-house booking is attached, preventing phantom/ghost occupancies.
  * **Immediate Overdue Room Release:** When a guest fails to check in on their scheduled check-in date (`check_in_date < today`), the reservation is automatically cancelled as no-show, and their room **immediately becomes `AVAILABLE` at once** for walk-in booking.
  * **PostgreSQL Trigger Migrations:**
    * `20261014_010_auto_room_status_sync_trigger.sql`: Syncs room status automatically on booking transitions.
    * `20261014_011_auto_cancel_overdue_checkins.sql`: Stored procedure for automated no-show room release.
  * Continuous 30-second cancellation worker in `backend/server/cancellationJob.js`.

---

## 3. What Is Left to Implement (Remaining Work Roadmap)

With the Customer guest experience, Backend engine, and Staff Operations Portal 100% complete, the remaining implementation tasks focus on **Cloud Production Deployment**:

```text
Remaining Work Roadmap
└── Cloud Production Deployment & Live Webhooks
    ├── Express Backend deployment to cloud PaaS (Render / Railway / AWS)
    ├── Customer Frontend deployment to CDN (Vercel / Netlify)
    ├── Staff Operations Portal deployment to private staff domain
    └── Live Stripe & KBZPay production webhook URL registration
```

---

### Priority 1: Cloud Production Deployment

* **Backend Deployment:**
  * Deploy `backend/` to Render, Railway, or AWS.
  * Set production environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `FRONTEND_URL`).
* **Frontend Deployment:**
  * Deploy `customer-frontend/` and `staff-frontend/` to Vercel or Netlify.
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
