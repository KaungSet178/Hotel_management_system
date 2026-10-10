# Hotel Management System — Frontend Integration & API Contract

Welcome! This document provides the complete API specification, data models, real-time event signatures, and integration guidelines for building the frontend application against the Express + Supabase backend.

---

## 1. Quick Start & Server Environment

- **Base URL**: `http://localhost:3000`
- **Default Port**: `3000` (Configurable via `PORT` in `.env`)
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <supabase_jwt_or_demo_token>` (Required on all protected endpoints)
- **Backend Status Check**: `GET /api/config`

### Role-Based Access Control & Development Tokens
The backend validates incoming tokens against Supabase Auth (`supabase.auth.getUser()`) and queries the user's role from the `profiles` table.

For local development and frontend testing without logging into Supabase, the following static development tokens are pre-configured:

| Role | Development Bearer Token | User Persona | Permissions |
| --- | --- | --- | --- |
| **GUEST** | `Bearer demo-token-guest` | Elena Rostova | Create bookings, view own bookings, self-check-in own QR code, file service requests |
| **RECEPTIONIST** | `Bearer demo-token-receptionist` | Sophia Clark | View all bookings, check in any guest pass, check out guests, update room status, view requests |
| **HOUSEKEEPING** | `Bearer demo-token-housekeeping` | Maria Gomez | View all service requests, transition status (`IN_PROGRESS` -> `COMPLETED`), update room status (`CLEANING`) |
| **ADMIN** | `Bearer demo-token-admin` | Arthur Sterling | Unrestricted access across all operational, financial, and background job endpoints |

```javascript
// Example Authenticated Request
const res = await fetch('http://localhost:3000/api/bookings', {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer demo-token-guest'
  }
});
```

---

## 2. Real-Time Infrastructure (WebSockets / SSE)

The backend provides two ways for the frontend to receive real-time updates:
1. **Server-Sent Events (SSE)** at `GET /api/live-events` (Zero configuration, works immediately).
2. **Supabase Realtime Channel** (Direct PostgreSQL CDC over WebSockets via `@supabase/supabase-js`).

### Subscribing via SSE (Recommended for Frontend):
```javascript
const evtSource = new EventSource('http://localhost:3000/api/live-events');

// 1. When a new booking is created
evtSource.addEventListener('booking_created', (e) => {
  const booking = JSON.parse(e.data);
  console.log('New reservation:', booking);
});

// 2. When a guest checks in via QR code
evtSource.addEventListener('booking_checked_in', (e) => {
  const data = JSON.parse(e.data);
  console.log('Guest checked in:', data.guest_name, 'Suite:', data.room_number);
});

// 3. When an unpaid booking is auto-cancelled by 24h policy
evtSource.addEventListener('booking_cancelled', (e) => {
  const booking = JSON.parse(e.data);
  console.log('Auto-cancelled booking:', booking.booking_reference);
});

// 4. When a room status changes (AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE)
evtSource.addEventListener('room_updated', (e) => {
  const room = JSON.parse(e.data);
  console.log('Room updated:', room.room_number, room.status);
});

// 5. When a guest submits an in-room service request (Towels, Cleaning, etc.)
evtSource.addEventListener('service_request_created', (e) => {
  const request = JSON.parse(e.data);
  console.log('New service request:', request);
  // Trigger audio chime or UI badge
});

// 6. When staff updates request status (PENDING -> IN_PROGRESS -> COMPLETED)
evtSource.addEventListener('service_request_updated', (e) => {
  const request = JSON.parse(e.data);
  console.log('Request status updated:', request.id, request.status);
});
```

---

## 3. Room Management Endpoints

### `GET /api/rooms`
Retrieves all luxury suites with their current status, price, floor, and amenities.

**Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "a1111111-1111-1111-1111-111111111101",
      "room_number": "101",
      "room_type": "Deluxe Ocean View",
      "floor": 1,
      "price_per_night": 280.00,
      "capacity": 2,
      "status": "AVAILABLE",
      "amenities": ["King Bed", "Ocean Balcony", "Espresso Machine", "Rain Shower"],
      "image_url": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?...",
      "description": "Panoramic ocean vistas from an expansive private terrace."
    }
  ]
}
```

**Room Status Values**:
- `AVAILABLE`: Ready to be booked.
- `OCCUPIED`: Guest currently checked in.
- `CLEANING`: Guest checked out; assigned to Housekeeping.
- `MAINTENANCE`: Under engineering repair / unavailable for booking.

---

### `PATCH /api/rooms/:id/status`
Staff updates room status (e.g. Housekeeping marks room as clean, or maintenance starts).

**Request Body**:
```json
{
  "status": "AVAILABLE" // One of: "AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE"
}
```

---

## 4. Bookings & Concurrency Protection

### `POST /api/bookings`
Creates a reservation. The backend executes an atomic PostgreSQL transaction with row-level locking (`SELECT ... FOR UPDATE`) to guarantee zero double-bookings.

**Request Body**:
```json
{
  "room_id": "a1111111-1111-1111-1111-111111111101",
  "guest_name": "Eleanor Sterling",
  "guest_email": "eleanor@sterling.luxury",
  "guest_phone": "+1 555-0192",
  "check_in_date": "2026-11-10",
  "check_out_date": "2026-11-14",
  "total_amount": 1120.00,
  "payment_method": "PAY_AT_HOTEL" // "ONLINE" or "PAY_AT_HOTEL"
}
```

**Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "booking_id": "b8391204-...",
    "booking_reference": "LUX-4821",
    "room_number": "101",
    "qr_token": "LUX-QR-LUX-4821-8f2a1b9c",
    "qr_code_data_url": "data:image/png;base64,iVBORw0KGgoAAAANSUh...",
    "auto_cancel_at": "2026-11-11T21:40:00.000Z", // Set for 24h Pay-at-Hotel rule
    "in_room_portal": {
      "targetUrl": "http://localhost:3000/?room=101&booking=...#guest-service",
      "qrDataUrl": "data:image/png;base64,..."
    }
  }
}
```

**Error Handling (Double-Booking Conflict)**:
- **Status**: `409 Conflict`
- **Body**:
  ```json
  {
    "success": false,
    "error": "This room is already reserved for the selected dates.",
    "code": "DATES_UNAVAILABLE"
  }
  ```

---

### `GET /api/bookings`
Returns all bookings (for the Staff Dashboard).

### `GET /api/bookings/:query`
Look up a specific reservation by `booking_reference`, `qr_token`, or `id`.

---

## 5. Contactless QR Check-In

### `POST /api/check-in/scan`
Called by the self-service kiosk or staff scanner when scanning the guest's QR code token.

**Request Body**:
```json
{
  "qr_token": "LUX-QR-LUX-4821-8f2a1b9c"
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "Welcome, Eleanor Sterling! Room 101 is ready.",
  "data": {
    "booking_id": "b8391204-...",
    "booking_reference": "LUX-4821",
    "guest_name": "Eleanor Sterling",
    "room_number": "101",
    "checked_in_at": "2026-10-10T21:45:00.000Z",
    "inRoomPortal": {
      "targetUrl": "http://localhost:3000/?room=101#guest-service",
      "qrDataUrl": "data:image/png;base64,..."
    }
  }
}
```

**Error Cases**:
- `INVALID_TOKEN` (400): QR code does not match any booking.
- `ALREADY_CHECKED_IN` (400): Guest has already checked in.
- `BOOKING_INACTIVE` (400): Booking was cancelled or expired.

---

## 6. Guest Check-Out

### `POST /api/check-out/:id`
Checks out a reservation. The backend automatically marks the room status as `CLEANING` so housekeeping staff is notified immediately in real time.

---

## 7. In-Room Service Requests (Real-Time Concierge)

### `GET /api/service-requests`
Lists all service requests.

### `POST /api/service-requests`
Submits a guest request from inside the room (via room tablet or scanned mobile QR).

**Request Body**:
```json
{
  "room_number": "101",
  "guest_name": "Eleanor Sterling",
  "category": "TOWELS", // TOWELS, CLEANING, MAINTENANCE, FOOD_BEVERAGE, AMENITIES, OTHER
  "priority": "URGENT", // LOW, NORMAL, URGENT
  "details": "Please send 3 extra Egyptian cotton bath towels."
}
```

**Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "id": "s829103-...",
    "room_number": "101",
    "guest_name": "Eleanor Sterling",
    "category": "TOWELS",
    "priority": "URGENT",
    "status": "PENDING",
    "details": "Please send 3 extra Egyptian cotton bath towels.",
    "created_at": "2026-10-10T21:46:00.000Z"
  }
}
```

---

### `PATCH /api/service-requests/:id`
Staff updates the request lifecycle:
- `PENDING` -> `IN_PROGRESS` -> `COMPLETED`

**Request Body**:
```json
{
  "status": "IN_PROGRESS",
  "assigned_to": "Housekeeping Beta"
}
```

---

## 8. 24-Hour Cancellation Policy Background Job

- **Policy**: Unpaid reservations choosing `PAY_AT_HOTEL` receive an `auto_cancel_at` timestamp set 24 hours in the future.
- **Worker**: The background worker automatically evaluates and cancels expired holds.

### Endpoints for Testing:
- `POST /api/jobs/trigger-cancellation`: Manually runs the cancellation check immediately.
- `POST /api/demo/simulate-expired-booking`: Generates an expired booking and triggers the worker to demonstrate auto-cancellation in real time.

---

## 9. Dual Payment Gateway Integration (KBZPay & Visa/Stripe)

### Overview
The Grand Azure Luxury Hotel backend supports both domestic mobile wallets (**KBZPay**) and international card payments (**Visa via Stripe**).

### 9.1 Unified Checkout Endpoint (`POST /api/payments/checkout`)
Protected by `requireAuth`. Initiates checkout for pending, unpaid bookings.

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "booking_id": "b1111111-2222-3333-4444-555555555002",
  "provider": "KBZPAY" // or "VISA"
}
```

**Validation & Access Control**:
1. `booking_id` must exist in reservations.
2. Must belong to the authenticated guest (`req.user.id` or `req.user.email`) or staff (`RECEPTIONIST`/`ADMIN`).
3. Booking must be unpaid (`payment_status: 'PENDING'` or `'UNPAID'`).
4. If already `PAID`, returns `400 Bad Request` (`code: 'ALREADY_PAID'`).
5. If cancelled or expired, returns `400 Bad Request` (`code: 'BOOKING_INACTIVE'`).

**Responses**:

*When `provider === 'KBZPAY'`*:
```json
{
  "success": true,
  "provider": "KBZPAY",
  "booking_id": "b1111111-2222-3333-4444-555555555002",
  "booking_reference": "LUX-9230",
  "amount": 560.00,
  "prepay_order_string": "prepay_id=KBZ_PREPAY_7a2b9c...&appid=kp_azure_hotel_app_2026&merch_code=2009847192&nonce_str=...&timestamp=1773359123&sign=...",
  "prepay_data": {
    "appid": "kp_azure_hotel_app_2026",
    "merch_code": "2009847192",
    "merch_order_id": "KBZ-LUX-9230-1773359123",
    "total_amount": "560.00",
    "currency": "USD",
    "trade_type": "PWA",
    "title": "Grand Azure Luxury - Suite 101",
    "timestamp": "1773359123",
    "nonce_str": "...",
    "prepay_id": "KBZ_PREPAY_7a2b9c...",
    "sign": "..."
  }
}
```

*When `provider === 'VISA'`*:
```json
{
  "success": true,
  "provider": "VISA",
  "booking_id": "b1111111-2222-3333-4444-555555555002",
  "booking_reference": "LUX-9230",
  "amount": 560.00,
  "checkout_url": "https://checkout.stripe.com/pay/cs_test_9a1b2c3d#mock",
  "session_id": "cs_test_9a1b2c3d...",
  "data": {
    "id": "cs_test_9a1b2c3d...",
    "payment_method_types": ["card"],
    "amount_total": 56000,
    "customer_email": "marcus.vance@example.com",
    "metadata": {
      "booking_id": "b1111111-2222-3333-4444-555555555002",
      "booking_reference": "LUX-9230",
      "room_number": "101"
    }
  }
}
```

---

### 9.2 Dual Webhook Listeners & Signature Architecture

Different payment providers enforce distinct parsing and cryptographic verification requirements:

| Provider | Webhook Endpoint | Parsing Requirement | Signature Verification Method | Success Return |
| --- | --- | --- | --- | --- |
| **Visa (Stripe)** | `POST /api/payments/webhook/stripe` | `express.raw({ type: 'application/json' })` (Mounted **before** global `express.json()`) | `stripe-signature` header containing timestamp `t` and HMAC-SHA256 `v1` | `200 OK` `{ "received": true, "success": true }` |
| **KBZPay** | `POST /api/payments/webhook/kbzpay` | Standard JSON (`express.json()`) | ASCII-sorted parameter string hashed with merchant key (`sign` in payload or header) | `200 OK` `{ "Response": { "result": "SUCCESS", "message": "OK" } }` |

#### Webhook Success Lifecycle (Both Providers):
1. **Signature Verification**: Validates authenticity using provider-specific cryptographic signatures; invalid signatures immediately return `400 Bad Request` (`code: 'INVALID_SIGNATURE'`).
2. **Booking Resolution**: Extracts `booking_id` from metadata or order payload.
3. **Database Transaction**:
   - Updates `payment_status` to `'PAID'`.
   - Updates `booking_status` and `status` to `'CONFIRMED'`.
   - Clears `auto_cancel_at = null` (releases reservation from the 24-hour unpaid cancellation watchlist).
   - Generates and assigns the cryptographic `qr_token` for contactless arrival check-in.
4. **Real-time Event Emission**: Emits `booking:paid` and `booking:updated` on the internal Realtime bus and broadcasts over SSE (`booking_paid`) to all connected dashboards.

---

## 10. Standardized Error Handling & Zod Request Validation

All API endpoints intercept malformed requests and unhandled exceptions using Zod validation middleware ([`server/middleware/validate.js`](file:///c:/Users/ACER/OneDrive/Desktop/hotel_management_system/server/middleware/validate.js)) and a centralized error handling middleware ([`server/middleware/errorHandler.js`](file:///c:/Users/ACER/OneDrive/Desktop/hotel_management_system/server/middleware/errorHandler.js)).

### Standard Error Response Envelope (`4xx` & `5xx`)
Every failure response strictly adheres to the following JSON structure:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request input validation failed.",
    "details": [
      {
        "field": "check_out_date",
        "message": "check_out_date must be strictly after check_in_date",
        "code": "custom"
      }
    ]
  }
}
```

> **Security Note**: In production mode (`NODE_ENV=production`), stack traces are completely suppressed to prevent sensitive internal implementation details from leaking.

### Core Validation Rules Matrix ([`server/validators/schemas.js`](file:///c:/Users/ACER/OneDrive/Desktop/hotel_management_system/server/validators/schemas.js))

| Route | Method | Schema / Target | Validation Rules |
| :--- | :--- | :--- | :--- |
| `/api/bookings` | `POST` | `createBookingSchema` | `room_id` (valid UUID), `check_in_date` (valid ISO date string), `check_out_date` (strictly after `check_in_date`), `payment_method` (`ONLINE` or `PAY_AT_HOTEL`) |
| `/api/service-requests` | `POST` | `createServiceRequestSchema` | `room_id` (UUID) or `room_number` (string); `request_type` or `category` must be one of: `TOWEL`, `CLEANING`, `MAINTENANCE`, `OTHER` |
| `/api/rooms/:id/status` | `PATCH` | `updateRoomStatusSchema` | `status` must be one of: `AVAILABLE`, `OCCUPIED`, `CLEANING`, `MAINTENANCE` |
| `/api/service-requests/:id` | `PATCH` | `updateServiceRequestStatusSchema` | `status` must be one of: `PENDING`, `IN_PROGRESS`, `COMPLETED` |
| `/api/payments/checkout` | `POST` | `checkoutPaymentSchema` | `booking_id` (required non-empty string), `provider` (`KBZPAY` or `VISA`) |
| `/api/check-in/scan` | `POST` | `scanQrCheckInSchema` | `qr_token` (required non-empty string) |

### System Error Code Catalog

| HTTP Status | Error Code | Trigger Condition |
| :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_ERROR` | Schema validation failed on `req.body`, `req.query`, or `req.params`. |
| `400 Bad Request` | `INVALID_PROVIDER` | Payment provider was not `KBZPAY` or `VISA`. |
| `400 Bad Request` | `ALREADY_PAID` | Attempted to checkout a booking that has already been paid. |
| `400 Bad Request` | `INVALID_SIGNATURE` | Webhook cryptographic signature (HMAC-SHA256 or KBZPay SHA256) mismatch. |
| `400 Bad Request` | `INVALID_TOKEN` | Scanned QR token does not match any existing reservation. |
| `400 Bad Request` | `ALREADY_CHECKED_IN`| Guest has already checked in with this QR code token. |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing, malformed, or expired Bearer token in `Authorization` header. |
| `403 Forbidden` | `FORBIDDEN` | Authenticated role lacks permission or guest attempted cross-user access. |
| `403 Forbidden` | `FORBIDDEN_GUEST` | Guest attempted to check in with a pass belonging to another user. |
| `404 Not Found` | `NOT_FOUND` / `BOOKING_NOT_FOUND` | Queried room, booking reference, or service request does not exist. |
| `409 Conflict` | `DATES_UNAVAILABLE` | Atomic row locking detected overlapping reservations for the chosen dates. |
| `429 Too Many Requests` | `RATE_LIMIT_EXCEEDED` | Request frequency exceeded the global baseline or strict endpoint threshold. |
| `500 Internal Error`| `INTERNAL_SERVER_ERROR` | Unhandled runtime exception caught by centralized error handler. |

---

## 11. Security Hardening & Rate Limiting (Phase 4)

To protect system integrity, prevent denial-of-inventory attacks, and safeguard cryptographic tokens, the API enforces strict security headers, CORS origin whitelisting, and tiered rate limits.

### 11.1 Rate Limiting Tiers & Thresholds

| Limiter Scope | Target Endpoints | Threshold Window | Default Max Requests | Security Purpose |
| --- | --- | --- | --- | --- |
| **Global Baseline** | All `/api/*` endpoints | 15 minutes (`900s`) | 100 requests / IP | General DDoS mitigation and resource preservation |
| **Strict Scoped Limiter** | `POST /api/check-in/scan` | 1 minute (`60s`) | 10 requests / IP | Prevents brute-forcing cryptographic QR check-in tokens |
| **Strict Scoped Limiter** | `POST /api/bookings` | 1 minute (`60s`) | 10 requests / IP | Prevents malicious reservation spamming & inventory denial |

### 11.2 Rate Limit Headers
The API includes standard `draft-7` rate limiting headers in all responses:
* `RateLimit-Limit`: Maximum requests permitted in the window.
* `RateLimit-Remaining`: Number of remaining requests in the current window.
* `RateLimit-Reset`: Seconds remaining until the quota resets.
* `Retry-After`: (Included on `429` responses) Seconds to wait before attempting the request again.

### 11.3 Standard `429 Too Many Requests` Response Envelope
When a client exceeds the permitted threshold, the request is intercepted and formatted into the standard Phase 3 error envelope:

```json
{
  "success": false,
  "code": "RATE_LIMIT_EXCEEDED",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please slow down and try again later.",
    "details": [
      {
        "field": null,
        "message": "Rate limit exceeded. Maximum 10 requests allowed per 60 seconds."
      }
    ]
  }
}
```

### 11.4 Cross-Origin Resource Sharing (CORS) Policy
* **Production (`NODE_ENV=production`)**: Strictly whitelists origins specified in the `FRONTEND_URL` environment variable (e.g. `https://hotel.example.com`). All unauthorized browser origins are rejected with HTTP 403 / CORS policy rejection.
* **Development**: Automatically permits local frontend origins (`http://localhost:3000`, `http://127.0.0.1:3000`, Vite `http://localhost:5173`) while allowing non-browser client tools (`curl`, Postman, server-to-server).
* **Credentials**: `credentials: true` is enabled for cross-origin authenticated cookies and tokens.

### 11.5 HTTP Security Headers (`helmet`)
Global security headers are injected at the top of the middleware stack:
* **`X-Powered-By`**: Stripped completely to obscure Express server signatures.
* **`X-Content-Type-Options: nosniff`**: Prevents MIME-type sniffing attacks.
* **`X-Frame-Options: SAMEORIGIN`**: Protects against clickjacking.
* **`Content-Security-Policy (CSP)`**: Configured to protect app scripts while whitelisting resort media CDNs (`https://images.unsplash.com`) and typography (`https://fonts.googleapis.com`, `https://fonts.gstatic.com`).
* **`Referrer-Policy: no-referrer`**: Prevents leakage of internal URL paths.


