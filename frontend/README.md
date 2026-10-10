# Frontend Application Directory

Welcome! This folder is reserved for the frontend team to build the client-facing guest portal and staff management dashboards.

---

## Backend API Connection

The backend server runs at `http://localhost:3000`.

### Core API Endpoints:
* `GET /api/rooms`: Browse luxury room catalog & live availability
* `POST /api/bookings`: Create concurrency-safe reservation (Requires Auth)
* `POST /api/payments/checkout`: Unified Checkout for KBZPay & Visa/Stripe
* `POST /api/check-in/scan`: Contactless QR check-in scanner
* `GET /api/service-requests`: In-room concierge & housekeeping service requests
* `GET /api/events`: Server-Sent Events (SSE) stream for real-time room & status updates

For comprehensive endpoint specifications, request payloads, and status codes, see [`backend/API_DOCUMENTATION.md`](../backend/API_DOCUMENTATION.md).

---

## Recommended Frameworks:
You can initialize your frontend app right here (e.g., Vite + React, Next.js, or Vue):
```bash
# Inside the frontend/ directory:
npx create-vite . --template react
# or
npx create-next-app@latest .
```
