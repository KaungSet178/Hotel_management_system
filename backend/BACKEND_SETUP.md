# Backend Architecture & Supabase Setup Guide

This guide covers everything you need to run, configure, and deploy the backend infrastructure for the Grand Azure Hotel Management System.

---

## 1. Project Structure

```
hotel_management_system/
├── server/
│   ├── index.js                  # Express.js API Gateway, SSE Realtime Stream, Helmet & Strict CORS
│   ├── supabaseClient.js         # Supabase client + fallback reactive store + row locking
│   ├── qrService.js              # Cryptographic QR token generator & QR image renderer
│   ├── cancellationJob.js        # 24-Hour cancellation policy background worker
│   ├── test-suite.js             # Automated end-to-end backend test runner (46/46 passing)
│   ├── middleware/
│   │   ├── auth.js               # Supabase JWT token verification
│   │   ├── roles.js              # RBAC role guards (requireRole)
│   │   ├── validate.js           # Zod schema request validation factory
│   │   ├── rateLimiter.js        # Global (100/15m) & Strict (10/1m) rate limiters
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
│   │   ├── 20261010_003_seed_data.sql                  # Seed luxury hotel suites
│   │   └── 20261011_004_schedule_cancellations.sql     # Native pg_cron hourly automated job
│   └── functions/
│       └── cancellation-job/index.ts                   # Supabase Edge Function for scheduled cron
├── API_DOCUMENTATION.md          # Frontend integration contract & error envelope guide
├── PROGRESS_TRACKER.md           # Master roadmap and completed phase status
├── .env                          # Local development secrets
├── .env.production.example       # Production template with all required keys
└── package.json                  # Dependencies & scripts (deploy:db, deploy:functions, test)
```

---

## 2. Production Cloud Deployment via Supabase CLI

Follow these exact steps to push database schemas, triggers, RLS policies, seed suites, and `pg_cron` jobs to your live Supabase project.

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
Apply all migrations (`001`, `002`, `003`, `004`) to your remote database in one command:
```bash
# Using the production script defined in package.json
npm run deploy:db

# Or directly via Supabase CLI:
npx supabase db push
```

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

## 3. Production Server Environment Setup

1. Copy `.env.production.example` to `.env.production`:
   ```bash
   cp .env.production.example .env.production
   ```
2. Populate the required keys:
   ```ini
   PORT=3000
   NODE_ENV=production
   FRONTEND_URL=https://hotel.yourdomain.com
   QR_SECRET_SALT=super-secure-random-phrase
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   SUPABASE_URL=https://[PROJECT-REF].supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   KBZPAY_APP_ID=kp...
   KBZPAY_MERCH_CODE=200...
   KBZPAY_MERCHANT_KEY=secret_key
   ```
3. Start the API Gateway in production mode:
   ```bash
   NODE_ENV=production npm start
   ```

---

## 4. 24-Hour Cancellation Policy: How It Works in Production

In production, **PostgreSQL's native `pg_cron` extension** runs `public.auto_cancel_unpaid_bookings()` every hour directly in the database.
* Identifies unpaid `PAY_AT_HOTEL` reservations that have exceeded the 24-hour hold window (`auto_cancel_at <= NOW()`).
* Serializes row updates (`FOR UPDATE`), transitions booking status to `CANCELLED`, and releases room availability for new guests.
* Writes a verifiable record to `public.audit_logs`.
* Removes the need for the Node.js Express server to maintain polling loops in production.

---

## 5. Double-Booking Concurrency Protection

Double-booking is prevented at the database transaction layer:
1. In PostgreSQL, `book_room_atomic()` locks the target room row:
   ```sql
   SELECT * FROM public.rooms WHERE id = p_room_id FOR UPDATE;
   ```
2. Any concurrent booking attempts for the same room are serialized.
3. Overlapping date ranges against existing `CONFIRMED` or `CHECKED_IN` reservations are detected.
4. If a conflict exists, the transaction aborts and returns HTTP 409 Conflict with `code: 'DATES_UNAVAILABLE'`.

---

## 6. Running Local Verification Tests

```bash
# Run the 46 automated security, concurrency, and validation tests
npm test
```
