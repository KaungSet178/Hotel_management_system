# Grand Azure Luxury Resort & Hotel Management System

A unified, end-to-end hospitality platform connecting guest experiences with internal hotel operations.

---

## Repository Structure

```text
Hotel_management_system/
├── backend/                  # Node.js + Express + Supabase Backend Engine
│   ├── server/               # Express API Gateway, Middleware & Services
│   │   ├── middleware/       # Auth, RBAC guards, Rate limiters, Validation
│   │   ├── services/         # KBZPay & Stripe dual payment services
│   │   ├── validators/       # Zod schemas
│   │   ├── qrService.js      # HMAC cryptographic QR pass generator
│   │   ├── checkSupabase.js  # Live cloud database diagnostic tool
│   │   ├── test-suite.js     # 46-test automated verification suite
│   │   └── index.js          # Main Express server entry point
│   ├── supabase/             # PostgreSQL database schemas, migrations & functions
│   │   ├── migrations/       # Versioned SQL migrations (001 - 004)
│   │   ├── functions/        # Deno Edge Functions
│   │   └── COMPLETE_DATABASE_SETUP.sql # Consolidated 1-click cloud setup
│   ├── public/               # Static demo client portal
│   ├── .env.example          # Example environment variable template
│   ├── .env.production.example # Production environment variable template
│   ├── API_DOCUMENTATION.md  # Complete REST API reference
│   ├── BACKEND_SETUP.md      # Backend developer setup guide
│   └── PROGRESS_TRACKER.md   # Architectural milestones & test status
├── frontend/                 # Client applications (Web, Mobile, Admin Dashboard)
│   └── README.md             # Frontend developer guidelines & API connection
├── .gitignore                # Production git ignore configuration
├── package.json              # Monorepo task runner
└── README.md                 # Project overview
```

---

## Tech Stack

* **Backend Engine:** Node.js with Express.js
* **Database & Auth:** Supabase (PostgreSQL with Row Level Security)
* **Concurrency:** PostgreSQL Row-Level Locking (`SELECT ... FOR UPDATE`)
* **Realtime:** Supabase Realtime & Server-Sent Events (SSE)
* **Automated Background Jobs:** PostgreSQL native `pg_cron`
* **Payment Gateways:** Dual gateway scaffolding for KBZPay & Stripe (Visa)
* **Validation & Security:** Zod schemas, Helmet security headers, Express Rate Limit

---

## Getting Started

### 1. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Copy environment variables and configure your Supabase keys
cp .env.example .env

# Run automated test suite (46 tests)
npm test

# Start the backend server
npm start
```

### 2. Live Database Synchronization
To verify database connectivity against Supabase:
```bash
npm run check:db
```

---

## API Documentation
See [backend/API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md) for full endpoint specifications, role permissions, and request/response examples.
