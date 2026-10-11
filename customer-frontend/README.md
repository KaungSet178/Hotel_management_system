# StayFlow — Hotel Management System (Customer Frontend)

A polished, responsive, customer-facing frontend MVP for **StayFlow**, a boutique
hotel brand in Myanmar. Built for the **ASEAN Digital Awards 2027**, it delivers the
complete digital guest journey — from discovery to booking, check-in, folio
management and in-stay service requests — and is structured so a real backend can
be dropped in without touching the UI.

> **Status:** MVP complete. Type-check, production build, lint and unit tests all pass.
> The app runs against a fully-featured **mock service layer** out of the box; switching
> to a real backend is a one-line environment change.

---

## Table of contents

- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Guest journey & routes](#guest-journey--routes)
- [Architecture](#architecture)
- [Pricing model](#pricing-model)
- [Mock mode & demo data](#mock-mode--demo-data)
- [Access control (folio PIN)](#access-control-folio-pin)
- [Testing](#testing)
- [Accessibility & UX](#accessibility--ux)
- [Known limitations & next steps](#known-limitations--next-steps)
- [Project structure](#project-structure)

---

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React 19 + TypeScript 6 |
| Build | Vite 8 (`@vitejs/plugin-react`) |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`), design tokens in `src/index.css` |
| Routing | React Router 7 (`BrowserRouter`) |
| Forms | react-hook-form 7 + zod 4 (`@hookform/resolvers`) |
| Icons | lucide-react |
| Dates | date-fns 4 |
| QR | qrcode.react 4 |
| Tests | Vitest 5 + Testing Library + jsdom |
| Lint | ESLint 10 + typescript-eslint 8 + react-hooks/react-refresh |

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. (optional) configure the backend — defaults to the built-in mock layer
cp .env.example .env

# 3. Start the dev server (http://localhost:5173)
npm run dev
```

No backend is required — the app defaults to `VITE_SERVICE_MODE=mock` and ships with
seeded hotels, rooms, reservations and service requests.

---

## Environment variables

See `.env.example`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_SERVICE_MODE` | `mock` | `mock` uses the in-browser service layer; `http` calls the real backend. |
| `VITE_API_BASE_URL` | _(empty)_ | Base URL for the real backend, e.g. `https://api.stayflow.mm`. Required when `VITE_SERVICE_MODE=http`. |

There is **no silent fallback** from `http` to `mock`: if `http` is selected and the
API is unreachable or unconfigured, the UI surfaces a clear, actionable error. This
keeps integration problems obvious.

---

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Type-check (`tsc -b`) then produce a production build in `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run typecheck` | Run the TypeScript project build with no output. |
| `npm run lint` | Run ESLint across the repo. |
| `npm run test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |

---

## Guest journey & routes

| Route | Page | Purpose |
| --- | --- | --- |
| `/` | Home | Hero search, brand stats, featured suites, operating standard, testimonial. |
| `/search` | Search Results | Availability for the stay, filters (category, bed, amenities, price, availability) and sorting. |
| `/hotels/:hotelId` | Hotel Detail | Gallery, facilities, check-in policy and the hotel's available room types. |
| `/rooms/:roomId` | Room Detail | Suite architecture, amenities, policies and a sticky price rail with availability. |
| `/book/:roomId` | Booking | 3-step checkout: rate plan + add-ons → guest details → payment. Digital methods show a payee QR/number and a **proof upload**; the booking is submitted **pending staff approval**. **Requires sign-in** — anonymous guests see a create-account gate. |
| `/confirmation/:reference` | Confirmation | Status-aware banner (pending review vs. confirmed), QR express check-in pass, folio, PIN reveal, price breakdown, uploaded payment proof, **download PDF pass** (lazy-loaded jsPDF) / save QR / add-to-calendar. A **"save your pass" reminder modal** appears on arrival with a QR preview, folio PIN + copy, and a download action (dismissed once per booking per session). |
| `/bookings` | My Bookings | **Requires sign-in** — anonymous visitors see a sign-in gate. Signed-in guests get a segmented list (Upcoming / In-stay / Past / Cancelled), reference+PIN lookup, cancel with refund. Reached from the profile. |
| `/account` | Profile | Signed-in guest identity, loyalty tier, live booking status, "My bookings" entry point and editable contact details. |
| `/reservations/:reference` | Reservation Detail | Full folio, refund estimate, PIN reveal, cancel, add-to-calendar, links to services. |
| `/reservations/:reference/services` | Guest Services | Live request status monitor + submit new in-stay requests. |
| `/guest-services` | Guest Services entry | Explains in-stay services, lists checked-in stays, allows lookup. |
| `*` | Not Found | Friendly 404 with recovery links. |

Search state (destination, dates, guests, rooms) is carried in the URL query string
and preserved across every step of the funnel via `useStayQuery`.

---

## Architecture

The codebase cleanly separates **domain**, **services** and **UI** so the backend can
be swapped in isolation.

```
src/
  types/            Domain models (Hotel, Room, Booking, ServiceRequest, …)
  lib/              Pure, framework-free helpers
    currency.ts       MMK formatting
    dates.ts          ISO + nights + formatting
    pricing.ts        computeBreakdown / refundPercent  (single source of truth for money)
    refs.ts           reference, folio, PIN and QR payload generation
    access.ts         mock folio access (reference + PIN)
    cn.ts             class-name helper
  services/         Backend abstraction
    types.ts          HotelService / BookingService / PaymentService / ServiceRequestService
    contracts.ts      Documented backend endpoints + request/response types
    errors.ts         AppError + stable ErrorCodes + toUserMessage
    apiClient.ts      Typed fetch wrapper (timeout, query, error mapping)
    mock/             In-browser implementation (seed data + localStorage persistence)
    http/             Real backend adapters (thin mapping onto apiClient)
    index.ts          Service registry — chooses mock or http from env
  hooks/            useAsync, useMockDbVersion, useStayQuery
  context/          BookingContext (the in-progress booking draft)
  components/
    ui/             Design-system primitives (button, card, form, modal, toast, …)
    layout/         Header, Footer, Layout, error boundary, search form, support dialog
    booking/        StepsBar, PriceSummary, FolioGate
    hotel/          RoomListingCard, Gallery
  pages/            One component per route
  mock/             Seed data + persistent mock store
```

**Key principle:** UI components never hardcode money. Every total is derived from
`computeBreakdown(...)` in `src/lib/pricing.ts`, and the same function is used by the
mock backend when materialising a booking — so client previews and server totals
always agree.

---

## Pricing model

Consistent across the whole flow (`src/lib/pricing.ts`):

```
base     = nightlyRate × nights × rooms + Σ add-ons
service  = 10% of base
tax      = 5% of base        (commercial tax)
total    = base + service + tax
```

- **Rate plans:** `flexible` (recommended, refundable, pay-at-hotel), `saver`
  (15% off, non-refundable), `wellness` (spa & dining package; eligible for the Deluxe
  Azure Suite and all Villas).
- **Refund matrix:** ≥48h → 100%, 24–48h → 50%, <24h → 0%.
- All amounts are integers in **MMK**.

---

## Mock mode & demo data

`VITE_SERVICE_MODE=mock` (default) powers the entire app from an in-browser store:

- **Seed data** (`src/mock/seed.ts`): 3 destinations, 3 hotels, 9 room types, 6 add-ons,
  4 seeded reservations and in-stay service requests.
- **Persistence:** the mock DB survives reloads via `localStorage` (`stayflow.db.v1`).
- **Simulated latency** on every call.
- **Manual transfers & staff approval (payment flow):** there is no live payment
  gateway. On the payment step the guest picks a method, then sees the **payee account
  and a QR code** (`src/lib/paymentAccounts.ts`) and **uploads a screenshot** of their
  payment (`src/lib/image.ts` compresses it to a data URL). The booking is created in a
  **`pending`** state with `paymentStatus: 'awaiting_review'` — a staff member confirms
  it later, so nothing is ever auto-marked "confirmed/paid". Digital methods require a
  proof upload; `PAY_AT_HOTEL` needs none and is created with `paymentStatus:
  'pay_at_hotel'`. Submissions are **idempotent on the booking draft key**, so a
  duplicate returns the existing booking instead of double-booking.
- **Live service progression:** a new in-stay request advances
  `pending → assigned → in_transit → completed` on timers, and the UI updates via a
  store subscription (`useMockDbVersion`) — no polling.

Demo tips:

- Reservation **`SF-2026-8812`** is already **checked in**, so you can request in-stay
  services immediately.
- The **Presidential Garden Villa** is intentionally blocked for the next week to
  demonstrate sold-out behaviour.

localStorage keys: `stayflow.db.v1` (mock DB), `stayflow.folio-access.v1` (granted
folios), `stayflow.booking-draft.v1` (in-progress booking).

---

## Accounts & profiles (mock auth)

Every guest can sign in with **Google**, **phone number (OTP)** or **email** —
the choice is offered in the global sign-in dialog. No real credentials or tokens
are exchanged; the flow and its session are mocked in [`src/lib/auth.ts`](./src/lib/auth.ts)
and surfaced through [`src/context/AuthContext.tsx`](./src/context/AuthContext.tsx).

- **Session:** persisted in `localStorage` (`stayflow.session.v1`) and synced across
  tabs, so a signed-in guest stays signed in until they sign out.
- **Identity & tracing:** a reservation is linked to a guest by **email or phone**
  (`matchesProfile`), so the profile page can trace live booking status for every
  reservation — upcoming, in-stay, past and cancelled.
- **Sign-in UI:** the dialog (`src/components/account/SignInDialog.tsx`) and the
  header profile menu (`ProfileMenu`) are the single entry points. "Continue with
  phone" simulates an SMS OTP (any 6 digits works in the demo).
- **Demo guest:** all three options sign you in as the sample guest **Thant Zin**
  (`thant.zin@example.com` / `+95 9 798 123 456`) so the seeded reservations appear
  immediately. Other emails/phones start a fresh, empty profile.
- **Profile page (`/account`):** identity card with loyalty tier (`New Member →
  Azure Explorer → Azure Elite → Azure Prestige`, derived from completed stays),
  booking-status stats, a live "Trace your bookings" list and editable contact
  details.
- **Account-gated booking:** browsing — Home, Search, Hotel/Room details, rate selection —
  is fully open to everyone, no account required. The checkout (`/book/:roomId`) is
  gated: an anonymous guest sees a create-account prompt
  (`src/components/booking/BookingAuthGate.tsx`) and, after signing in, the live
  3-step flow mounts with their details pre-filled.
- **Booking prefills:** the booking flow pre-fills guest details from the signed-in
  profile and associates the new reservation with it.
- **Information architecture:** "My Bookings" lives in the account area — the header
  profile menu and the profile page both link to it — not in the primary navigation.
- **Bookings are private:** `/bookings` is sign-in gated (`MyBookingsSignInGate`) — an
  anonymous visitor never sees a reservation list, only a prompt to sign in.

`lib/access.ts` remains the secondary path: **reference + 4-digit folio PIN** still
opens a single reservation when a guest is not signed in. Swap both modules for real
authentication during integration.

## Access control (folio PIN)

Reserved folios are **PIN-protected**, but a live guest is never locked out. A folio
**view** (the QR pass, guest services) opens without the PIN when any of these is true
(see `src/hooks/useFolioAccess.ts`):

1. The reservation is **checked in** — the in-stay ticket is open by design, so the
   guest (and the desk) can view the pass / request services immediately.
2. The **signed-in profile matches the booking guest** (email or phone) — your account
   is the recovery path, so a forgotten PIN never blocks an owner.
3. You already unlocked it in this browser (reference + PIN stored locally).

**Managing** a reservation is always PIN-protected: the reservation detail page (cancel,
amend, services entry) renders the `FolioGate` on **every** entry and never skips it,
regardless of the checks above or any saved access. The `FolioGate` adds an
**"I forgot my PIN"** panel with two recovery routes: *open with your matching account*
(one click) or a *one-time code* sent to the booking's contact (simulated in the demo),
plus the hotel hotline as a last resort. Entering a valid PIN (or a recovery path) also
persists the unlock so the pass keeps opening without it afterwards.

This is enforced by `src/lib/access.ts`, `src/hooks/useFolioAccess.ts` and the
`FolioGate` component, mirroring the eventual backend rule (authenticated session or
signed lookup token). The QR check-in pass is **opaque** and contains neither PII nor
the folio PIN, so a photographed QR cannot leak folio access.

---

## Testing

```bash
npm run test
```

Covered by 38 focused unit tests across 6 files:

- `lib/pricing.test.ts` — breakdown maths, multi-room, add-ons, refund thresholds.
- `lib/dates.test.ts` — nights, validation, formatting, month boundaries.
- `lib/refs.test.ts` — reference/folio/PIN formats; QR payload carries no PII or PIN.
- `lib/auth.test.ts` — session sign-in/out, identity matching, loyalty tiers, initials.
- `services/mock/availability.test.ts` — overlap detection, blockouts, inventory, invalid ranges.
- `hooks/useStayQuery.test.ts` — URL parsing, defaults, clamping, repair, carry-forward.

**Current status:** ✅ 38/38 passing.

---

## Accessibility & UX

- Semantic landmarks, labelled navigation and a skip-to-content link.
- Focus-visible outlines on all interactive controls; the modal traps focus,
  closes on `Esc` and restores focus.
- Toasts announced via `aria-live`; async states expose `role="status"`/`role="alert"`.
- Every image has a graceful two-step fallback (Unsplash → picsum → branded gradient)
  so the UI never shows a broken image.
- Fully responsive (mobile → desktop) with `prefers-reduced-motion`-friendly transitions.
- Print-friendly confirmation page (QR pass, folio and receipt).

---

## Known limitations & next steps

- **Payment is manual & staff-verified** — no real gateway or card data. The guest
  transfers to a payee account (QR/number shown on the payment step), uploads a
  screenshot as proof, and the booking stays **pending** until a staff member approves
  it. The `PaymentService` interface remains available for a real adapter (KBZPay /
  WavePay / CB Pay / card processor) and the mock does not charge anything.
- **Auth is mock** — Google, phone (OTP) and email sign-in are simulated in
  `lib/auth.ts`; replace it with a real identity provider (OAuth / SMS gateway) and
  swap `lib/access.ts` for signed lookup tokens during integration. No real
  credentials or tokens are exchanged or stored.
- **Mock data is seeded** — replace `src/mock/*` by setting `VITE_SERVICE_MODE=http`
  and implementing the endpoints in [`API_CONTRACTS.md`](./API_CONTRACTS.md).
- **Bundle size** — the single JS chunk is ~590 kB (~178 kB gzipped). Add route-level
  code-splitting (`React.lazy`) if a smaller initial payload is required.
- Not implemented in this MVP: admin/staff console, real-time staff dispatch,
  multi-currency, loyalty redemption, password-protected demo resets.

---

## Project structure

```
├─ index.html
├─ vite.config.ts / vitest.config.ts / eslint.config.js
├─ tsconfig.app.json / tsconfig.node.json / tsconfig.json
├─ .env.example
├─ API_CONTRACTS.md            ← backend contract reference
└─ src/                        ← application source (see Architecture)
```

---

© 2026 StayFlow. Built as a customer-experience MVP for the ASEAN Digital Awards 2027.
