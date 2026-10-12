# Backend Architecture & Supabase Setup Guide

This guide covers everything required to run, configure, and deploy the backend infrastructure and database schema for the Grand Azure Luxury Hotel Management System.

---

## 1. Project Structure

```text
backend/
├── server/
│   ├── index.js                  # Express.js API Gateway, SSE Realtime Stream, Helmet & Strict CORS
│   ├── supabaseClient.js         # Supabase client + fallback reactive store + row locking
│   ├── qrService.js              # Cryptographic QR token generator & QR image renderer
│   ├── cancellationJob.js        # 24-Hour cancellation policy background worker
│   ├── checkSupabase.js          # Live database diagnostic script (tables, RPCs, connectivity)
│   ├── test-suite.js             # Automated end-to-end backend test runner (46/46 passing)
│   ├── routes/
│   │   └── customerRoutes.js     # 15 Customer-facing REST endpoints (StayFlow contracts)
│   ├── middleware/
│   │   ├── auth.js               # Supabase JWT token verification
│   │   ├── roles.js              # RBAC role guards (requireRole)
│   │   ├── validate.js           # Zod schema request validation factory
│   │   ├── rateLimiter.js        # Global (100/15m) & Strict (5/1m) rate limiters
│   │   └── errorHandler.js       # Centralized JSON error handler
│   ├── validators/
│   │   └── schemas.js            # Zod validation schemas (Bookings, Services, Rooms)
│   └── services/
│       ├── kbzPayService.js      # KBZPay ASCII sorting signature & webhook verification
│       └── stripeService.js      # Stripe Checkout & raw buffer HMAC verification
├── supabase/
│   ├── migrations/
│   │   ├── 20261010_001_initial_schema.sql             # Tables, Enums, Indexes, RLS
│   │   ├── 20261010_002_concurrency_and_cancellation.sql # book_room_atomic, check_in_with_qr_token
│   │   ├── 20261010_003_seed_data.sql                  # Seed luxury hotel suites & staff
│   │   ├── 20261011_004_schedule_cancellations.sql     # Native pg_cron hourly automated job
│   │   └── 20261011_005_customer_frontend_support.sql # Destinations, hotels, draft keys, folio PINs
│   ├── functions/
│   │   └── cancellation-job/index.ts                   # Supabase Edge Function for scheduled cron
│   └── COMPLETE_DATABASE_SETUP.sql                     # Master consolidated migration script
├── API_DOCUMENTATION.md          # Master Unified API Specification (Customer & Staff)
├── BACKEND_SETUP.md              # This setup guide
├── .env                          # Local development secrets
├── .env.example                  # Local environment template
├── .env.production.example       # Production template with all required keys
└── package.json                  # Dependencies & scripts (dev, test, deploy:db)
```

---

## 2. Production Cloud Deployment via Supabase CLI

Follow these steps to push database schemas, triggers, RLS policies, seed suites, and `pg_cron` jobs to your live Supabase project.

### Step 1: Install & Authenticate Supabase CLI
```bash
# Authenticate with your Supabase account
npx supabase login
```

### Step 2: Link Your Remote Supabase Project
Obtain your **Project Reference ID** from your Supabase Project Dashboard URL (`https://supabase.com/dashboard/project/<your-project-id>`):
```bash
npx supabase link --project-ref <your-project-id>
```
*(Enter your database password when prompted).*

### Step 3: Push Database Migrations & Native `pg_cron`
Apply all migrations (`001`, `002`, `003`, `004`, `005`, `006`, `007`) to your remote database in one command:
```bash
# Run from backend directory
npm run deploy:db

# Or directly via Supabase CLI:
npx supabase db push
```

#### What Recent Migrations Add:
- **Migration 005 (`customer_frontend_support.sql`):** Normalized `destinations` & `hotels` tables, enhanced `rooms` and `bookings` tables, upgraded `book_room_atomic` to 24 parameters with `SELECT ... FOR UPDATE` row locking.
- **Migration 006 (`strict_row_level_security.sql`):** Recursion-safe `current_user_role()` function, strict Row Level Security (RLS) policies for guest folio isolation and staff role-based access.
- **Migration 007 (`auth_users_profile_trigger.sql`):** PostgreSQL `handle_new_user()` trigger on `auth.users` ensuring every authenticated account is automatically synchronized with `public.profiles`, preventing `bookings_guest_id_fkey` foreign key constraint violations.

### Step 4: Verify `pg_cron` Schedule in Remote Database
Verify the hourly cancellation worker is scheduled directly inside PostgreSQL:
```sql
-- Run in Supabase Dashboard SQL Editor
SELECT jobid, jobname, schedule, command, active 
FROM cron.job;
```
You will see `hourly-24h-unpaid-cancellation-check` scheduled with `'0 * * * *'` calling `public.auto_cancel_unpaid_bookings()`.

### Step 5: (Optional) Deploy Edge Function
If you also want the cloud serverless Edge Function:
```bash
npm run deploy:functions

# Or directly:
npx supabase functions deploy cancellation-job
```

---

## 3. Server Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure the required keys in `backend/.env`:
   ```ini
   PORT=3000
   NODE_ENV=development
   # Comma-separated CORS allowed origins (supports local Vite frontend)
   FRONTEND_URL=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
   QR_SECRET_SALT=your-secure-random-hmac-salt

   # Supabase Cloud Configuration
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   SUPABASE_URL=https://[PROJECT-REF].supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

   # Payment Gateway Scaffolding
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   KBZPAY_APP_ID=kp...
   KBZPAY_MERCH_CODE=200...
   KBZPAY_MERCHANT_KEY=secret_key
   ```
3. Start the API Gateway:
   ```bash
   # Development with auto-restart on file change
   npm run dev

   # Or standard start
   npm start
   ```

---

## 4. Dual-Architecture Authentication Model

The backend supports two distinct authentication paths:

1. **Anonymous Customer Guest Flow (StayFlow UI):**
   - Guests do not need a pre-existing user account to book.
   - When a booking is finalized, the backend generates:
     - A booking reference (e.g. `LUX-8491`)
     - A 4-digit Folio PIN (e.g. `4821`)
     - A cryptographically signed QR token (`qr_token`)
   - Guests retrieve and manage their reservation using `/api/bookings/:id?pin=4821` or `/api/bookings/reference/LUX-8491?pin=4821`.
   - Guests submit in-room requests using their reference and PIN.
2. **Staff Operations Flow (Front-Desk / Housekeeping / Admin):**
   - Staff members authenticate via Supabase Auth (`supabase.auth.signInWithPassword`).
   - Every request must include the header:
     ```text
     Authorization: Bearer <supabase_jwt_access_token>
     ```
   - Express middleware (`requireAuth` and `requireRole`) extracts the JWT, verifies the role in `public.profiles`, and grants access to protected endpoints (`/api/rooms/:id/status`, `/api/check-in/scan`, `/api/check-out/:id`, etc.).

---

## 5. Concurrency & Double-Booking Protection

Double-booking is prevented strictly at the PostgreSQL transaction layer:
1. In PostgreSQL, `book_room_atomic()` executes:
   ```sql
   SELECT * FROM public.rooms WHERE id = p_room_id FOR UPDATE;
   ```
2. Any concurrent booking attempts for the same room are serialized.
3. Overlapping date ranges against existing `CONFIRMED` or `CHECKED_IN` reservations are detected.
4. If a conflict exists, the transaction aborts and returns HTTP 409 Conflict with `code: 'DATES_UNAVAILABLE'`.
5. If the draft key has already been converted to a booking, the function returns the existing booking idempotently without double-charging.

---

## 6. 24-Hour Cancellation Policy: Production Execution

In production, **PostgreSQL's native `pg_cron` extension** runs `public.auto_cancel_unpaid_bookings()` every hour directly in the database:
- Identifies unpaid `PAY_AT_HOTEL` reservations that have exceeded the 24-hour hold window (`auto_cancel_at <= NOW()`).
- Serializes row updates (`FOR UPDATE`), transitions booking status to `CANCELLED`, and releases room availability for new guests.
- Writes a verifiable audit record to `public.audit_logs`.
- For environments where `pg_cron` is not installed, the Express background worker in `cancellationJob.js` serves as a fallback runner.

---

## 7. Running Verification & Diagnostics

From the repository root or `backend/` directory:

```bash
# 1. Run live database connectivity diagnostic across all tables & RPCs
npm run check:db

# 2. Run backend 46-test automated security, concurrency, and validation test suite
npm test

# 3. Start the live customer frontend (Vite)
npm run frontend:dev

# 4. Run frontend 38-test Vitest test suite
npm run frontend:test
```
