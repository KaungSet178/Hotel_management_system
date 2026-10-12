# Grand Azure & StayFlow — Unified API Specification

Welcome to the **Master Unified API Specification** for the Hotel Management System.

This document serves as the single source of truth for both:
1. **Customer Guest Applications** ([`customer-frontend/`](../customer-frontend/) — *StayFlow* client portal)
2. **Staff & Operational Systems** (Front Desk, Housekeeping, Operations & Administration)

---

## 1. Quick Start & Server Environment

* **Base URL**: `http://localhost:3000/api`
* **Port**: `3000` (Configurable via `PORT` in `.env`)
* **Content-Type**: `application/json`
* **Realtime SSE Stream**: `GET http://localhost:3000/api/live-events`
* **Health Check**: `GET http://localhost:3000/api/config`

### Dual Authentication Strategies

The API supports flexible access mechanisms based on persona and operation:

| Persona | Access Mechanism | Use Case |
| :--- | :--- | :--- |
| **Guest (Reservation Checkout)** | **Bearer Token (Verified Email)** (`Authorization: Bearer <token>`) | Finalizing room reservations (`POST /api/bookings`) with real Supabase Auth accounts. |
| **Guest (Self-Service Folio)** | **4-Digit Folio PIN** (`?pin=1234` or `{ "pin": "1234" }`) | Existing reservation lookup, folio billing statement, slip upload review, in-room concierge requests, and cancellation. |
| **Staff & Admin** | **Bearer Token (Role Protected)** (`Authorization: Bearer <token>`) | Internal hotel operations, QR check-in scanning, room status transitions, housekeeping queue, and financial reconciliation. |

#### Pre-Configured Development Personas (Staff & Test Tokens)
```text
Bearer demo-token-guest         -> Elena Rostova (Guest Persona, Verified Email)
Bearer demo-token-receptionist  -> Clara Vance (Front Desk Receptionist)
Bearer demo-token-housekeeping  -> Mateo Silva (Housekeeping Staff)
Bearer demo-token-admin         -> Grand Azure Admin (General Manager / Admin)
```

---

## 2. Customer Guest Endpoints (StayFlow)

The customer frontend endpoints return clean JSON resource bodies directly (`200 OK` on success, `404` for not found, `409` for sold-out conflicts, `422` for input validation errors).

### 2.1 Destinations & Hotel Properties

#### `GET /api/destinations`
Returns all supported destination regions.
* **Response `200 OK`**:
  ```json
  [
    {
      "id": "yangon-heritage",
      "label": "Yangon · Heritage Quarter",
      "hotelIds": ["yangon-riverside"]
    },
    {
      "id": "yangon-central",
      "label": "Yangon · Downtown Central",
      "hotelIds": ["downtown-central"]
    },
    {
      "id": "inle-lake",
      "label": "Inle Lake · Shan State",
      "hotelIds": ["inle-lake"]
    }
  ]
  ```

#### `GET /api/hotels`
Lists boutique hotel properties. Filterable by query parameters.
* **Query Parameters**:
  * `destination` (optional): Filter by destination ID (e.g. `yangon-heritage`).
  * `featured` (optional): Filter to featured properties (`true` or `false`).
* **Response `200 OK`**: `Hotel[]` array.

#### `GET /api/hotels/:hotelId`
Retrieves detailed profile, address, gallery, and policies for a specific hotel.
* **Parameters**: `:hotelId` (e.g. `yangon-riverside`, `downtown-central`, `inle-lake`).
* **Response `200 OK`**: `Hotel` object.

#### `GET /api/hotels/:hotelId/rooms`
Retrieves all bookable suites for a hotel with stay pricing and availability.
* **Query Parameters**: `checkIn=YYYY-MM-DD`, `checkOut=YYYY-MM-DD`, `adults=2`, `rooms=1`.
* **Response `200 OK`**: `RoomListing[]` array.

---

### 2.2 Room Search & Availability

#### `GET /api/rooms`
Cross-property room catalog and availability search.
* **Query Parameters**:
  * `destination` (optional): Destination identifier.
  * `checkIn` (ISO Date): e.g. `2026-10-20`.
  * `checkOut` (ISO Date): e.g. `2026-10-23`.
  * `adults` (number): Number of adult guests (default `2`).
  * `rooms` (number): Number of rooms requested (default `1`).
* **Response `200 OK`**: `RoomListing[]` array.
* *Note: If called without query parameters by internal staff dashboards, returns `{ success: true, data: [...] }` staff room inventory.*

#### `GET /api/rooms/:roomId`
Retrieves room specifications, rate plans, gallery, and parent hotel profile.
* **Parameters**: `:roomId` (Slug e.g. `deluxe-azure-suite` or UUID).
* **Response `200 OK`**: `RoomListing` object.

#### `GET /api/rooms/:roomId/availability`
Live availability check against PostgreSQL date overlap bookings.
* **Query Parameters**: `checkIn=YYYY-MM-DD`, `checkOut=YYYY-MM-DD`.
* **Response `200 OK`**:
  ```json
  {
    "available": true,
    "roomsLeft": 5
  }
  ```
  *(Or `{ "available": false, "roomsLeft": 0, "reason": "sold_out" }`)*

#### `GET /api/add-ons`
Returns standard stay enhancements (airport limousine, butler, champagne platter, early check-in, late check-out, strand club).
* **Response `200 OK`**: `AddOn[]` array.

---

### 2.3 Guest Bookings & Folio Statements

#### `POST /api/bookings`
Idempotent customer checkout creating a reservation with atomic row-locking concurrency guard.
* **Headers**: `Content-Type: application/json`
* **Request Body** (`CreateBookingInput`):
  ```json
  {
    "draftKey": "dk_9f81a7b2c",
    "hotelId": "yangon-riverside",
    "roomId": "deluxe-azure-suite",
    "checkIn": "2026-10-25",
    "checkOut": "2026-10-28",
    "adults": 2,
    "rooms": 1,
    "ratePlanId": "flexible",
    "addOnIds": ["early-checkin", "strand-club"],
    "guest": {
      "fullName": "Elena Rostova",
      "email": "elena.rostova@example.com",
      "phoneCountryCode": "+95",
      "phone": "912345678",
      "estimatedArrival": "14:00",
      "preferences": {
        "highFloor": true,
        "quietRoom": true,
        "lateCheckIn": false,
        "featherFreePillows": false,
        "celebrationNote": false
      },
      "conNotes": "Quiet courtyard view preferred.",
      "agreeToTerms": true
    },
    "paymentMethod": "KBZPAY",
    "paymentStatus": "awaiting_review",
    "paymentProof": {
      "fileName": "kbzpay_slip_1025.jpg",
      "mimeType": "image/jpeg",
      "dataUrl": "data:image/jpeg;base64,...",
      "uploadedAt": "2026-10-11T16:30:00.000Z"
    }
  }
  ```
* **Response `200 OK`** (`Booking`):
  ```json
  {
    "reference": "SF-36619-SQ",
    "folioId": "SF-2026-9063",
    "pin": "8752",
    "draftKey": "dk_9f81a7b2c",
    "hotel": { "id": "yangon-riverside", "name": "StayFlow Yangon Riverside" },
    "room": { "id": "deluxe-azure-suite", "name": "Deluxe Azure Suite" },
    "stay": { "checkIn": "2026-10-25", "checkOut": "2026-10-28" },
    "nights": 3,
    "adults": 2,
    "rooms": 1,
    "ratePlan": { "id": "flexible", "nightlyRate": 220000, "label": "Standard Flexible Rate" },
    "addOns": [
      { "id": "early-checkin", "label": "Guaranteed Early Check-in", "price": 65000 },
      { "id": "strand-club", "label": "Strand Club Access", "price": 45000 }
    ],
    "price": {
      "lines": [
        { "label": "220,000 MMK × 3 nights", "amount": 660000 },
        { "label": "Guaranteed Early Check-in", "amount": 65000 },
        { "label": "Strand Club Access", "amount": 45000 }
      ],
      "subtotal": 770000,
      "serviceCharge": 77000,
      "tax": 38500,
      "total": 885500,
      "currency": "MMK"
    },
    "status": "pending",
    "paymentMethod": "KBZPAY",
    "paymentStatus": "awaiting_review",
    "createdAt": "2026-10-11T16:30:00.000Z"
  }
  ```

#### `GET /api/reservations`
Lists reservations. If called with guest JWT Bearer token, filters to guest's bookings.
* **Response `200 OK`**: `Booking[]` array.

#### `GET /api/reservations/:reference`
Retrieves guest folio statement.
* **Security**: Requires either `?pin=XXXX` matching the booking's 4-digit Folio PIN, OR an authenticated user/staff Bearer token.
* **Response `200 OK`**: `Booking` object.
* **Error `401 Unauthorized`**: If PIN is missing or invalid.

#### `POST /api/reservations/:reference/cancel`
Guest self-cancellation protected by 4-digit Folio PIN.
* **Request Body**: `{ "pin": "8752" }`
* **Response `200 OK`**: Updated `Booking` with `status: "cancelled"`, itemized refund share, and `cancelledAt` timestamp.
* **Error `401 Unauthorized`**: If PIN is invalid.

---

### 2.4 In-Room Concierge & Service Requests

#### `GET /api/reservations/:reference/service-requests`
Returns all service requests filed for the reservation.
* **Response `200 OK`**: `ServiceRequest[]` array.

#### `POST /api/reservations/:reference/service-requests`
Files an in-room service request (Towels, Cleaning, Minibar, Dining, Maintenance).
* **Request Body**:
  ```json
  {
    "category": "extra_towels",
    "details": "2 sets of extra Egyptian cotton towels please.",
    "deliveryTime": "20:30"
  }
  ```
* **Response `201 Created`**:
  ```json
  {
    "id": "463c5b87-ce99-4767-9f6e-c97472636984",
    "reservationReference": "SF-36619-SQ",
    "category": "extra_towels",
    "categoryLabel": "extra_towels",
    "details": "2 sets of extra Egyptian cotton towels please.",
    "deliveryTime": "20:30",
    "status": "pending",
    "createdAt": "2026-10-11T16:35:00.000Z"
  }
  ```

---

## 3. Internal Staff & Operations Endpoints

Staff endpoints require `Authorization: Bearer <token>` and enforce Role-Based Access Control (`GUEST`, `RECEPTIONIST`, `HOUSEKEEPING`, `ADMIN`).

### 3.1 Contactless QR Check-In Scanner

#### `POST /api/check-in/scan`
Validates guest QR code token, verifies cryptographic HMAC signature, sets room status to `OCCUPIED`, and sets booking to `CHECKED_IN`.
* **Guard**: `strictLimiter` (rate-limited), authenticated user.
* **Request Body**:
  ```json
  {
    "qr_token": "LUX-QR-SF-36619-SQ-9e8a71b2"
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Welcome, Elena Rostova! Room 101 is ready.",
    "data": {
      "booking_id": "...",
      "guest_name": "Elena Rostova",
      "room_number": "101",
      "inRoomPortal": {
        "room_number": "101",
        "portal_url": "http://localhost:3000/portal?room=101&booking=...",
        "qr_data_url": "data:image/png;base64,..."
      }
    }
  }
  ```

### 3.2 Guest Check-Out

#### `POST /api/check-out/:id`
Front desk checks out guest. Automatically transitions booking to `CHECKED_OUT` and marks room as `CLEANING` for housekeeping.
* **Guard**: `requireRole('RECEPTIONIST', 'ADMIN')`.
* **Response `200 OK`**: `{ success: true, message: "Check-out successful. Room sent to housekeeping." }`

### 3.3 Room Status Management

#### `PATCH /api/rooms/:id/status`
Updates housekeeping and maintenance room statuses.
* **Guard**: `requireRole('RECEPTIONIST', 'HOUSEKEEPING', 'ADMIN')`.
* **Request Body**:
  ```json
  {
    "status": "AVAILABLE"
  }
  ```
  *(Allowed values: `AVAILABLE`, `OCCUPIED`, `CLEANING`, `MAINTENANCE`)*
* **Response `200 OK`**: `{ success: true, data: { ...room } }`

### 3.4 Housekeeping Service Queue

#### `GET /api/service-requests`
Returns all active service requests across all rooms.
* **Guard**: Authenticated staff (`HOUSEKEEPING`, `RECEPTIONIST`, `ADMIN`).
* **Response `200 OK`**: `{ success: true, data: [...] }`

#### `PATCH /api/service-requests/:id`
Updates service request status and assigns staff member.
* **Guard**: `requireRole('HOUSEKEEPING', 'RECEPTIONIST', 'ADMIN')`.
* **Request Body**:
  ```json
  {
    "status": "COMPLETED",
    "assigned_to": "Maria Gomez"
  }
  ```
  *(Status progression: `PENDING` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED`)*

### 3.5 Automated 24-Hour Cancellation Job Trigger

#### `POST /api/jobs/trigger-cancellation`
Manually triggers the background worker that sweeps for unpaid Pay-at-Hotel reservations exceeding 24 hours.
* **Guard**: `requireRole('ADMIN')`.
* **Response `200 OK`**: `{ success: true, data: { cancelled_count: 0 } }`

---

## 4. Dual Payment Gateways & Webhooks

The backend supports both **KBZPay** (Myanmar's leading mobile wallet) and **Stripe / Visa** checkout sessions.

### 4.1 Unified Payment Checkout

#### `POST /api/payments/checkout`
Generates prepay parameters or checkout sessions.
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "booking_id": "b1111111-2222-3333-4444-555555555001",
    "provider": "KBZPAY"
  }
  ```
  *(Or `"provider": "VISA"`)*
* **Response `200 OK` (KBZPay)**: Returns `prepay_order_string` signed with merchant key.
* **Response `200 OK` (Visa/Stripe)**: Returns `checkout_url` and `session_id`.

### 4.2 Webhook Listeners

* **Stripe Webhook**: `POST /api/payments/webhook/stripe`
  * Raw buffer HMAC-SHA256 signature verification (`stripe-signature`).
  * On `checkout.session.completed`, marks booking `PAID`, clears `auto_cancel_at`, and unlocks QR pass.
* **KBZPay Webhook**: `POST /api/payments/webhook/kbzpay`
  * Standard JSON parsing with ASCII-sorted SHA256 signature verification.
  * Updates booking to `PAID` and broadcasts `booking:paid` event.

---

## 5. Real-Time Streaming (Server-Sent Events)

### Subscribe via SSE:
```javascript
const evtSource = new EventSource('http://localhost:3000/api/live-events');

evtSource.addEventListener('booking_created', (e) => {
  const booking = JSON.parse(e.data);
  console.log('New booking:', booking.booking_reference);
});

evtSource.addEventListener('booking_checked_in', (e) => {
  const data = JSON.parse(e.data);
  console.log('Guest checked in:', data.guest_name, 'Room:', data.room_number);
});

evtSource.addEventListener('room_updated', (e) => {
  const room = JSON.parse(e.data);
  console.log('Room updated:', room.room_number, room.status);
});

evtSource.addEventListener('service_request_created', (e) => {
  const req = JSON.parse(e.data);
  console.log('New concierge request:', req.category, req.details);
});
```

---

## 6. Error Handling Envelope

When an error occurs, the API returns a structured JSON payload:
```json
{
  "message": "Human-readable error explanation",
  "code": "INVALID_INPUT",
  "details": []
}
```

Common status codes:
* `400 / 422`: Input validation error.
* `401`: Missing or invalid Folio PIN / Bearer token.
* `403`: Role-based access denied.
* `404`: Resource not found.
* `409`: Room dates unavailable (concurrency conflict).
* `429`: Rate limit exceeded.
* `500`: Internal server error.
