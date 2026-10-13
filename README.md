# Grand Azure Luxury Resort & Hotel Management System

A unified, end-to-end hospitality platform connecting customer-facing luxury booking experiences with internal hotel management operations.

---

## Repository Structure

```text
hotel_management_system/
├── backend/                  # Node.js + Express + Supabase Backend Engine
│   ├── server/               # Express API Gateway, Middleware & Services
│   │   ├── routes/           # customerRoutes.js (15 customer guest REST endpoints)
│   │   ├── middleware/       # Auth, RBAC guards, Rate limiters, Validation
│   │   ├── services/         # KBZPay & Stripe dual payment services
│   │   ├── validators/       # Zod schemas (Bookings, Services, Rooms)
│   │   ├── qrService.js      # HMAC cryptographic QR pass generator
│   │   ├── checkSupabase.js  # Live cloud database diagnostic tool
│   │   ├── test-suite.js     # 46-test automated verification suite
│   │   └── index.js          # Express server entry point & SSE realtime stream
│   ├── supabase/             # PostgreSQL database schemas, migrations & functions
│   │   ├── migrations/       # SQL Migrations (001 - 007)
│   │   ├── functions/        # Deno Edge Functions (cancellation cron)
│   │   └── COMPLETE_DATABASE_SETUP.sql # Consolidated cloud setup script
│   ├── public/               # Static demo assets
│   ├── .env.example          # Example environment variable template
│   ├── .env.production.example # Production environment variable template
│   ├── API_DOCUMENTATION.md  # Master Unified REST API reference
│   └── BACKEND_SETUP.md      # Backend developer & database setup guide
├── customer-frontend/        # StayEase Luxury Guest Web Application
│   ├── src/                  # React 18, TypeScript, Tailwind CSS
│   ├── API_CONTRACTS.md      # Customer frontend API specifications
│   ├── README.md             # Customer web app documentation & architecture
│   ├── vitest.config.ts      # 38 automated frontend tests
│   └── package.json          # Frontend dependencies & scripts
├── staff-frontend/           # StayEase staff and admin portal (React + Vite)
│   ├── src/                  # Front-desk operations, authentication and admin screens
│   ├── .env.example          # Supabase configuration template
│   └── package.json          # Staff portal dependencies and scripts
├── .gitignore                # Git ignore configuration
├── package.json              # Monorepo task runner
├── PROJECT_ROADMAP_AND_STATUS.md # Master project status & remaining implementation roadmap
└── README.md                 # Project overview (this document)
```

---

## Tech Stack

* **Backend Engine:** Node.js with Express.js
* **Database & Auth:** Supabase (PostgreSQL with Row Level Security & custom ENUMs)
* **Concurrency Protection:** PostgreSQL Row-Level Locking (`SELECT ... FOR UPDATE` via `book_room_atomic`)
* **Realtime Streaming:** Supabase Realtime & Server-Sent Events (SSE) at `/api/live-events`
* **Automated Background Jobs:** PostgreSQL native `pg_cron` (24-hour unpaid booking cancellation)
* **Payment Gateways:** Dual gateway scaffolding for KBZPay & Stripe (Visa/Mastercard)
* **Validation & Security:** Zod schemas, Helmet security headers, Express Rate Limiting
* **Customer Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, Vitest

---

## Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- Active Supabase account (or local Supabase CLI)

### 2. Environment Configuration
Set up the backend environment variables:
```bash
cp backend/.env.example backend/.env
# Update backend/.env with your Supabase URL, keys, and secrets
```

### 3. Running from Root Monorepo
From the repository root, you can control both backend and frontend applications:

### Staff & Admin Portal Setup
```bash
# Navigate to the staff portal
cd staff-frontend

# Install dependencies and start the app
npm install
npm run dev
```

Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `staff-frontend/.env`
using the template in `staff-frontend/.env.example`. The portal includes front-desk
reservations, check-in/out, guest services, and role-based admin screens.

```bash
# Start the Express Backend API (http://localhost:3000)
npm run dev

# Start the StayEase Customer Frontend (http://localhost:5173)
npm run frontend:dev

# Run Backend Automated Integration Tests (46 passing tests)
npm test

# Run Frontend Automated Vitest Tests (44 passing tests)
npm run frontend:test

# Verify Live Supabase Cloud Database Connectivity
npm run check:db

# Build Customer Frontend for Production
npm run frontend:build
```

---

## Documentation Directory

| Document | Description |
| :--- | :--- |
| [**backend/API_DOCUMENTATION.md**](backend/API_DOCUMENTATION.md) | **Master Unified API Specification**: All 15 Customer endpoints, Staff Operations endpoints, Dual Payment gateways, and SSE Realtime events. |
| [**backend/BACKEND_SETUP.md**](backend/BACKEND_SETUP.md) | **Backend Architecture & Database Setup Guide**: Migrations 001–007, Supabase CLI deployment, dual-auth model, and concurrency rules. |
| [**ADMIN_AND_STAFF_PORTAL_DOCUMENTATION.md**](ADMIN_AND_STAFF_PORTAL_DOCUMENTATION.md) | **Staff & Admin Management Portal Architecture**: Supabase Auth, RBAC, strict role isolation, Executive suite, and Front Desk operations. |
| [**PROJECT_ROADMAP_AND_STATUS.md**](PROJECT_ROADMAP_AND_STATUS.md) | **Master Roadmap & Status**: Completed phases, test verification metrics, and detailed backlog of remaining work (Staff Portal UI, Payment Slip approval, Production deployment). |
| [**customer-frontend/README.md**](customer-frontend/README.md) | **Customer Web App Guide**: Architecture, service modes (`mock` vs `http`), state management, and design system. |
| [**customer-frontend/API_CONTRACTS.md**](customer-frontend/API_CONTRACTS.md) | **StayEase Frontend Contracts**: Exact request/response shapes consumed by the customer UI. |
