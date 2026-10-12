# StayFlow Unified Operations & Executive Management Portal Documentation

## 1. Executive Summary

This document details the architecture, authentication, role-based access control (RBAC), and feature implementation of the **StayFlow Unified Operations & Executive Management Portal** (`staff-frontend`). 

The portal serves two distinct internal hospitality personas through a single, secure web application:
1. **Hotel General Manager & Administrators (`ADMIN`)**: Strategic yield management, dynamic room pricing, channel intelligence, financial ledgers, and audit logs.
2. **Front Desk & Operations Staff (`RECEPTIONIST`, `HOUSEKEEPING`)**: Day-to-day guest check-ins, walk-in reservations, deposit proof verification, express QR check-ins, and folio settlement.

---

## 2. Key Architecture Principles

### 2.1 Single Unified Portal with Zero Merge Conflicts
To allow front desk developers and management suite developers to work in parallel without Git merge conflicts:
- **Admin Domain:** Isolated entirely inside `staff-frontend/src/admin/` (components, pages, context, and state).
- **Staff Operations Domain:** Preserved in `staff-frontend/src/pages/` and `staff-frontend/src/store.tsx`.
- **Shared Infrastructure:** Common shell layout in `src/components/layout.tsx`, navigation contracts in `src/nav.ts`, and Supabase authentication in `src/auth/` and `src/auth.tsx`.

### 2.2 Strict Role Separation (No Dashboard Switching)
Per hospitality security standards and explicit product requirements:
- **No Switching Allowed:** Cross-dashboard switcher buttons, demo role toggles, and switching banners have been **strictly prohibited and completely removed**.
- **Admin Isolation:** Users with the `ADMIN` role are restricted strictly to Executive Management pages (`/admin/*`). Attempting to access staff operations routes (`/reservations`, `/availability`, etc.) automatically redirects back to `/admin`.
- **Staff Isolation:** Users with the `RECEPTIONIST` or `HOUSEKEEPING` role are restricted strictly to Front Desk Operations pages (`/reservations`, etc.). Attempting to access `/admin/*` automatically redirects back to `/reservations`.
- **Navigation Isolation:** The sidebar navigation dynamically renders *only* the links relevant to the authenticated user's role:
  - Admin sees only **EXECUTIVE MANAGEMENT** (`/admin`, `/admin/rooms`, `/admin/channels`, `/admin/finances`, `/admin/audit`).
  - Staff sees only **OPERATIONS & FRONT DESK** (`/reservations`, `/availability`, `/requests`, `/qr-checkin`, `/services`, `/checkout`).

---

## 3. Supabase Authentication & RBAC

### 3.1 Closed Provisioning Model (No Public Sign-Up)
- **No Self-Registration:** Public account creation is disabled. Staff and Admin accounts are provisioned exclusively through Supabase Auth and database administrator controls.
- **Guest Access Prohibition:** Accounts registered as `GUEST` are rejected with `Access Denied` if they attempt to sign in to the staff/admin portal.

### 3.2 Authentication Pipeline
1. **User Sign-In:** `staff-frontend/src/auth/LoginPage.tsx` submits credentials to `supabase.auth.signInWithPassword`.
2. **Profile Resolution:** The user's ID is queried against `public.profiles` to retrieve their assigned role (`ADMIN`, `RECEPTIONIST`, `HOUSEKEEPING`).
3. **Session Persistence:** Authenticated staff profiles are cached with token management handled by `@supabase/supabase-js`.
4. **Role Routing:**
   - `ADMIN` $\rightarrow$ redirected immediately to `/admin`.
   - `RECEPTIONIST` / `HOUSEKEEPING` $\rightarrow$ redirected immediately to `/reservations`.

### 3.3 Database Migrations
- Migration `backend/supabase/migrations/20261012_008_staff_auth_profile_sync.sql` syncs roles and profiles between `auth.users` and `public.profiles`.

---

## 4. Admin Executive Management Suite

### 4.1 Executive Overview (`/admin`)
- **Key Performance Indicators (KPIs):**
  - **Occupancy Rate:** Real-time percentage with occupied vs. total room counts and week-over-week trends.
  - **Average Daily Rate (ADR):** Tracked in Myanmar Kyats (MMK).
  - **Revenue Per Available Room (RevPAR):** Direct measure of hospitality efficiency.
  - **Gross Month-to-Date (MTD) Revenue:** Tracked against monthly targets.
- **14-Day Demand & Channel Split:** Interactive stacked visualization comparing counter walk-ins against online direct web bookings.
- **Automated Hold Sweeps:** One-click trigger for 24-hour unpaid booking sweep and policy enforcement.
- **Executive Statement Export:** Instant CSV generation of monthly reservation ledgers.
- **Room Rack Status:** Summary of rooms available for sale, occupied, and locked for maintenance.

### 4.2 Room Inventory & Dynamic Pricing Matrix (`/admin/rooms`)
- **Interactive Room Grid:** Filterable by floor (Floors 1–5), category (Deluxe Azure, Heritage Exec, Governor Suite), and status (Available, Occupied, Maintenance).
- **Pricing & Inventory Modal:**
  - Base nightly rate configuration.
  - Weekend rate surge adjustments.
  - High-demand / occupancy yield surge multiplier.
  - Maintenance lockout toggle and notes.

### 4.3 Channel Intelligence (`/admin/channels`)
- **Channel Performance Breakdown:** Direct Web, Front Desk Walk-In, Corporate Partnerships, Phone Inquiries.
- **Channel Economics:** Revenue share %, ADR comparison by channel, and commission overhead tracking.

### 4.4 Financial Reconciliation & Ledgers (`/admin/finances`)
- **Multi-Gateway Ledger:** Track transactions across KBZPay QR, Stripe Card Processing, and Front Desk Cash.
- **Settlement Matching:** Auto-match rates and manual discrepancy resolution for hotel cashiers.

### 4.5 Policy & Audit Logs (`/admin/audit`)
- **Immutable Action Log:** Logs every administrative rate change, cancellation sweep, cashier override, and maintenance lockout with timestamp and operator identity.

---

## 5. Staff Front Desk Operations

- **Reservations Registry (`/reservations`):** Real-time booking management filtered by `ALL`, `PENDING`, `TODAY`, `UPCOMING`, and `IN HOUSE`.
- **Availability & Walk-in Booking (`/availability`):** Interactive room rack for counter guest booking with instant folio calculation.
- **Deposit Payment Verification (`/requests`):** Review guest payment slips (KBZPay / bank transfer) and confirm bookings.
- **Express QR Check-in (`/qr-checkin`):** Camera and manual token scanner for HMAC cryptographic check-in passes.
- **Guest Services (`/services`):** Track housekeeping, room service, luggage requests, and maintenance work orders.
- **Check-Out & Folio Billing (`/checkout`):** Itemized folio billing (room charges, incidentals, taxes) with one-click departure settlement.

---

## 6. Verification & Automated Testing

- **TypeScript Compilation:** Validated with `tsc -b && vite build` (0 type errors, production build verified).
- **Route Isolation Verification:**
  - `admin@hotel.com` successfully logged in $\rightarrow$ redirected to `/admin` $\rightarrow$ attempted direct URL navigation to `/reservations` $\rightarrow$ automatically redirected back to `/admin`.
  - `reception@hotel.com` successfully logged in $\rightarrow$ redirected to `/reservations` $\rightarrow$ attempted direct URL navigation to `/admin` $\rightarrow$ automatically redirected back to `/reservations`.
  - Confirmed total absence of switcher buttons, switch banners, or cross-domain links.
