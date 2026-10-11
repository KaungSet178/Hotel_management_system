# API Contracts — StayFlow Customer Frontend

This document is the interface between the **StayFlow customer frontend** and the
future **backend API**. It describes every endpoint the app expects, the request
shapes it sends, and the response shapes it renders.

The TypeScript source of truth lives in [`src/services/contracts.ts`](./src/services/contracts.ts)
and [`src/types/index.ts`](./src/types/index.ts). The frontend currently runs against
an in-browser **mock** implementation (`src/services/mock/*`) that already honours
these contracts; the real implementation lives in `src/services/http/index.ts` and is
selected with `VITE_SERVICE_MODE=http`.

---

## Conventions

- **Base URL:** configured via `VITE_API_BASE_URL` (e.g. `https://api.stayflow.mm`).
- **Content type:** `application/json` for all request/response bodies.
- **Envelope:** endpoints return the **resource directly** (an object or array) with
  HTTP `200`; empty results return `204 No Content`. The backend does **not** need to
  wrap payloads — the frontend service layer adds its own `{ data, meta }` envelope
  internally.
- **Errors:** non-2xx status with a JSON body:
  ```json
  { "message": "Human-readable reason" }
  ```
  The client maps status → error code automatically:

  | HTTP status | Client `ErrorCode` | UI behaviour |
  | --- | --- | --- |
  | `400`, `409`, `422` | `INVALID_INPUT` | Inline validation / form error |
  | `401`, `403` | `INVALID_INPUT` | Access denied (folio/PIN) |
  | `404` | `NOT_FOUND` | "Not found" empty state |
  | `>= 500` | `SERVER` | Retryable error toast |
  | network failure / timeout | `NETWORK` | Offline/timeout message |

- **Timeouts:** the client aborts requests after **15s** and surfaces a retryable error.
- **Dates:** ISO `YYYY-MM-DD`. `checkIn` is **inclusive**, `checkOut` is **exclusive**
  (the number of nights is `checkOut − checkIn`, always ≥ 1).
- **Money:** integers in **MMK**.

### Endpoint index

| # | Method | Path | Service method |
| --- | --- | --- | --- |
| 1 | `GET` | `/destinations` | `HotelService.getDestinations` |
| 2 | `GET` | `/hotels` | `HotelService.getFeaturedRooms` (`?featured=true`) |
| 3 | `GET` | `/hotels/:hotelId` | `HotelService.getHotel` |
| 4 | `GET` | `/hotels/:hotelId/rooms` | `HotelService.listHotelRooms` |
| 5 | `GET` | `/rooms` | `HotelService.searchRooms` |
| 6 | `GET` | `/rooms/:roomId` | `HotelService.getRoom` |
| 7 | `GET` | `/rooms/:roomId/availability` | `HotelService.checkAvailability` |
| 8 | `GET` | `/add-ons` | `HotelService.getAddOns` |
| 9 | `POST` | `/bookings` | `BookingService.createBooking` |
| 10 | `POST` | `/payments` | `PaymentService.processPayment` |
| 11 | `GET` | `/reservations` | `BookingService.listMyBookings` |
| 12 | `GET` | `/reservations/:reference` | `BookingService.getBooking` / `lookupBooking` |
| 13 | `POST` | `/reservations/:reference/cancel` | `BookingService.cancelBooking` |
| 14 | `GET` | `/reservations/:reference/service-requests` | `ServiceRequestService.listForReservation` |
| 15 | `POST` | `/reservations/:reference/service-requests` | `ServiceRequestService.create` |
| 16 | `POST` | `/auth/google` | Identity provider (client-side mock in `lib/auth.ts`) |
| 17 | `POST` | `/auth/phone/request` · `/auth/phone/verify` | Phone OTP (client-side mock) |
| 18 | `POST` | `/auth/email` · `GET/PATCH /me` | Email sign-in + profile (client-side mock) |

> 
> **Note:** endpoint 10 (`/payments`) is **reserved** — the MVP booking flow uses a
> **manual transfer + proof upload** instead of an automatic gateway (see endpoint 9 and
> endpoint 10 below). And endpoints 16–18 are **not yet wired into the service layer** —
> the MVP implements authentication entirely client-side in
> [`src/lib/auth.ts`](./src/lib/auth.ts). They document the shape a real backend should
> expose so the mock can be swapped without UI changes.

---

## Domain types (wire format)

These are the JSON shapes used across endpoints. Optional fields are marked `?`.

```ts
interface Destination { id: string; label: string; hotelIds: string[] }

interface Address {
  line1: string; line2?: string; city: string; region: string; country: string;
}
interface HotelImage { src: string; alt: string }

interface Hotel {
  id: string; slug: string; name: string; tagline: string; description: string;
  address: Address; rating: number; reviewCount: number;
  heroImage: string; gallery: HotelImage[];
  facilities: string[]; checkInTime: string; checkOutTime: string; hotline: string;
  featured?: boolean;
}

type RoomCategory = 'Deluxe' | 'Executive' | 'Junior' | 'Villa' | 'Studio';
interface Room {
  id: string; hotelId: string; name: string; category: RoomCategory;
  wing: string; floorRange: string; roomNumbers: string;
  description: string; longDescription?: string;
  maxGuests: number; bedConfiguration: string; areaSqm: number;
  amenities: string[]; images: HotelImage[];
  rating: number; reviewCount: number;
  inventory: number;                 // bookable units of this room type
  tags: string[];
  blockoutRanges: StayRange[];       // fully-blocked date ranges
}

interface StayRange { checkIn: string; checkOut: string } // ISO YYYY-MM-DD

interface RatePlan {
  id: 'flexible' | 'saver' | 'wellness';
  label: string;
  nightlyRate: number;               // MMK
  features: string[];
  refundable: boolean;
  payAtHotel: boolean;
  recommended?: boolean;
  promoNote?: string;
  savePercent?: number;
}

interface AddOn {
  id: string; label: string;
  category: 'transport' | 'indulgence' | 'privilege' | 'concierge';
  price: number;                     // MMK
  description: string; icon: string;
}

interface AvailabilityInfo {
  available: boolean;
  roomsLeft: number;
  reason?: 'sold_out' | 'no_dates';
}

interface RoomListing {
  room: Room;
  hotel: Hotel;
  ratePlans: RatePlan[];
  fromNightly: number;               // lowest nightly rate for the stay, MMK
  availability: AvailabilityInfo;
}

interface PriceLine { label: string; amount: number; note?: string }
interface PriceBreakdown {
  lines: PriceLine[];
  subtotal: number;                  // MMK (base: rooms + add-ons)
  serviceCharge: number;             // MMK (10%)
  tax: number;                       // MMK (5%)
  total: number;                     // MMK
  currency: 'MMK' | 'USD';
}

type BookingStatus =
  | 'pending' | 'confirmed' | 'checked_in'
  | 'checked_out' | 'cancelled' | 'no_show';
type PaymentMethod = 'KBZPAY' | 'WAVEPAY' | 'CB_PAY' | 'CARD' | 'PAY_AT_HOTEL';
type PaymentStatus =
  | 'pending' | 'awaiting_review' | 'paid' | 'settled' | 'refunded' | 'pay_at_hotel';

interface PaymentProof {
  fileName: string;                  // original upload name
  mimeType: string;                  // image/* (JPEG/PNG/WebP)
  dataUrl: string;                   // base64 data URL (mock only; real API uses multipart)
  uploadedAt: string;                // ISO timestamp
}

interface GuestDetails {
  fullName: string; email: string;
  phoneCountryCode: string; phone: string;
  estimatedArrival: string;
  preferences: {
    highFloor: boolean; quietRoom: boolean; lateCheckIn: boolean;
    featherFreePillows: boolean; celebrationNote: boolean;
  };
  conNotes: string;
  agreeToTerms: boolean;
}

interface Booking {
  reference: string;                 // e.g. SF-89241-K7
  folioId: string;                   // e.g. SF-2026-9481
  pin: string;                       // 4-digit folio PIN
  draftKey: string;                  // idempotency key
  hotel: Hotel; room: Room;
  stay: StayRange; nights: number; adults: number; rooms: number;
  ratePlan: RatePlan; addOns: AddOn[];
  guest: GuestDetails;
  price: PriceBreakdown;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentProof?: PaymentProof;
  transactionId?: string;
  roomNumber?: string;
  cancelRefundAmount?: number;
  cancelledAt?: string;
  createdAt: string;
}

type ServiceRequestCategory =
  | 'extra_towels' | 'housekeeping' | 'minibar' | 'maintenance'
  | 'airport' | 'dining' | 'other';
type ServiceRequestStatus =
  | 'pending' | 'assigned' | 'in_progress' | 'in_transit' | 'completed';

interface ServiceRequest {
  id: string;
  reservationReference: string;
  category: ServiceRequestCategory; categoryLabel: string;
  details: string; deliveryTime: string;
  status: ServiceRequestStatus;
  createdAt: string; updatedAt: string;
  staffName?: string; expectedArrival?: string;
}
```

---

## Endpoints

### 1. List destinations

```http
GET /destinations
```

- **Response `200`:** `Destination[]`
- **Used by:** Home search form, search filters.

### 2. List / feature hotels

```http
GET /hotels?destination={id}&featured={true|false}
```

- **Query:** `destination?` (string), `featured?` (boolean). `getFeaturedRooms` calls
  this with `featured=true` and slices client-side.
- **Response `200`:** `Hotel[]`
- **Used by:** Home featured suites, search results grouping.

### 3. Hotel detail

```http
GET /hotels/:hotelId
```

- **Response `200`:** `Hotel`
- **Errors:** `404` if the hotel id is unknown.
- **Used by:** Hotel detail page.

### 4. Hotel rooms for a stay

```http
GET /hotels/:hotelId/rooms?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&adults=2&rooms=1
```

- **Query:** `checkIn`, `checkOut`, `adults`, `rooms` (all required).
- **Response `200`:** `RoomListing[]` — availability and `fromNightly` are computed
  for the given stay.
- **Used by:** Hotel detail page room list.

### 5. Search rooms

```http
GET /rooms?destination={id}&checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&adults=2&rooms=1
```

- **Query:** `destination?`, `checkIn`, `checkOut`, `adults`, `rooms`.
- **Response `200`:** `RoomListing[]`.
- **Notes:** server computes availability and `fromNightly`; the frontend still applies
  its own filters (category, bed, amenities, price, availability) and sorting.
- **Used by:** Search results page.

### 6. Room detail

```http
GET /rooms/:roomId
```

- **Response `200`:** `RoomListing` (room + hotel + `ratePlans` + `fromNightly` + `availability`).
- **Errors:** `404` if the room id is unknown.
- **Used by:** Room detail page, booking page.

### 7. Availability

```http
GET /rooms/:roomId/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
```

- **Response `200`:** `AvailabilityInfo`
- **Notes:** authoritative check; should run again server-side inside `POST /bookings`
  to prevent overselling.
- **Used by:** Room detail price rail, booking page re-validation.

### 8. Add-ons

```http
GET /add-ons
```

- **Response `200`:** `AddOn[]`
- **Used by:** Booking step 1 (enhancements).

---

### 9. Create booking

```http
POST /bookings
Content-Type: application/json
```

**Request body** (`CreateBookingInput`):

```jsonc
{
  "draftKey": "dk_6f1c...",        // idempotency key (client-generated)
  "hotelId": "yangon-riverside",
  "roomId": "deluxe-azure",
  "checkIn": "2026-10-16",
  "checkOut": "2026-10-19",
  "adults": 2,
  "rooms": 1,
  "ratePlanId": "flexible",
  "addOnIds": ["airport-transfer", "spa-ritual"],
  "guest": { /* GuestDetails */ },
  "paymentMethod": "KBZPAY",
  "paymentStatus": "awaiting_review",
  "paymentProof": { /* PaymentProof */ },   // required for digital methods
  "transactionId": "txn_..."                // only when a gateway issued one
}
```

**Response `200`:** `Booking` (including server-generated `reference`, `folioId`, `pin`,
and the **server-recomputed** `price`).

**Requirements:**

- **Idempotent on `draftKey`** — repeating the same request must return the existing
  booking, never create a duplicate.
- **Re-validate availability** and recompute the price server-side; never trust
  client totals.
- **Status:** bookings are created `status: 'pending'` with `paymentStatus:
  'awaiting_review'` (digital transfer, with `paymentProof`) or `'pay_at_hotel'`
  (no proof). A staff member later moves payment to `paid`/`settled` and the booking
  to `confirmed` — the client must **never** mark a booking paid or confirmed on its
  own.
- **Errors:** `409` if the room sold out between search and submission; `422` for
  invalid guest details or a missing payment proof on a digital method.
- **Used by:** Booking page (create), Confirmation page.

### 10. Process payment (reserved / not used by the MVP flow)

```http
POST /payments
Content-Type: application/json
```

**Request body** (`PaymentRequest`):

```json
{
  "amount": 759000,
  "currency": "MMK",
  "method": "KBZPAY",
  "idempotencyKey": "dk_6f1c..."
}
```

**Response `200`** (`PaymentResult`):

```json
{ "success": true, "transactionId": "txn_9a2f...", "message": "Payment authorised" }
```

**Requirements:**

- **Idempotent on `idempotencyKey`** (the booking `draftKey`).
- On failure return `success: false` with a safe, non-technical `message`.
- **Note:** the MVP booking flow **does not call this endpoint**. Payment is a
  **manual transfer** — the guest pays to a displayed payee account (QR/number) and
  uploads a screenshot; a staff member verifies it. This endpoint documents the shape a
  real gateway adapter (KBZPay / WavePay / CB Pay / card processor) would expose if
  automatic payment is added later. No card data is ever collected, transmitted or
  stored.

---

### 11. List reservations

```http
GET /reservations
```

- **Auth:** authenticated guest. The mock implementation returns locally-created and
  seeded reservations.
- **Response `200`:** `Booking[]`
- **Used by:** My Bookings.

### 12. Get a reservation

```http
GET /reservations/:reference?pin=1234
```

- **Query:** `pin?` — required for authenticated-less lookup.
- **Response `200`:** `Booking`
- **Access rules:** the reference alone is **never sufficient**. The server must require
  either an authenticated session **or** the correct 4-digit `pin`.
- **Errors:** `401`/`403` for a wrong/absent `pin`; `404` for unknown references.
- **Used by:** Reservation Detail, Confirmation (folio), Guest Services.

### 13. Cancel a reservation

```http
POST /reservations/:reference/cancel
Content-Type: application/json

{ "pin": "1234" }
```

- **Response `200`:** the updated `Booking` with `status: "cancelled"`,
  `cancelledAt`, and `cancelRefundAmount` computed from the refund matrix.
- **Refund matrix:** ≥48h before check-in → 100%; 24–48h → 50%; <24h → 0%.
- **Used by:** My Bookings, Reservation Detail.

### 14. List in-stay service requests

```http
GET /reservations/:reference/service-requests
```

- **Response `200`:** `ServiceRequest[]`
- **Used by:** Guest Services monitor.

### 15. Create a service request

```http
POST /reservations/:reference/service-requests
Content-Type: application/json
```

**Request body** (`CreateServiceRequestInput`):

```json
{
  "category": "extra_towels",
  "categoryLabel": "Extra towels",
  "details": "2 extra bath towels please",
  "deliveryTime": "2026-10-16T18:00"
}
```

**Response `200`:** the new `ServiceRequest` with `status: "pending"`.

- **Eligibility:** only for stays that are **checked in** (or otherwise eligible).
- **Lifecycle (server-driven):** `pending → assigned → in_progress → in_transit → completed`.
  The client polls/reads status; in mock mode this is simulated with timers.
- **Errors:** `409` if the stay is not eligible for requests.
- **Used by:** Guest Services.

---

## Authentication & profile (planned)

These endpoints describe the intended identity layer. **In this MVP they are mocked
client-side** (`src/lib/auth.ts`, `src/context/AuthContext.tsx`); the frontend does
not call a backend for auth yet.

### 16. Google sign-in

```http
POST /auth/google
Content-Type: application/json

{ "idToken": "<google-id-token>" }
```

- **Response `200`:** `{ "token": "<session-token>", "user": UserProfile }`
- **Notes:** verify the Google ID token server-side; never trust a client email.

### 17. Phone sign-in (OTP)

```http
POST /auth/phone/request
Content-Type: application/json

{ "phoneCountryCode": "+95", "phone": "9 798 123 456" }
```

- **Response `200`:** `{ "sentTo": "+95 9 798 123 456", "expiresInSec": 300 }`

```http
POST /auth/phone/verify
Content-Type: application/json

{ "phoneCountryCode": "+95", "phone": "9 798 123 456", "code": "000000" }
```

- **Response `200`:** `{ "token": "<session-token>", "user": UserProfile }`
- **Errors:** `401` for an invalid or expired code.

### 18. Email sign-in + profile

```http
POST /auth/email
Content-Type: application/json

{ "email": "you@example.com", "fullName": "Thant Zin" }
```

- **Response `200`:** `{ "token": "<session-token>", "user": UserProfile }`

```http
GET /me
PATCH /me
Content-Type: application/json

{ "fullName": "...", "email": "...", "phoneCountryCode": "+95", "phone": "..." }
```

- **Response `200`:** `UserProfile`
- **Auth:** bearer session token. `PATCH /me` updates contact details.

### UserProfile

```ts
type AuthProvider = 'google' | 'phone' | 'email';
interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  avatarUrl?: string;
  provider: AuthProvider;
  createdAt: string;
}
```

### Reservation ownership

The frontend traces a guest's reservations by matching **email or phone**
(`matchesProfile` in `lib/auth.ts`) — equivalent to a backend filtering
`GET /reservations` by the authenticated `UserProfile`. Phone comparison uses a
digits-only suffix match so formatting differences don't break the link.

---

## Frontend behaviour that the backend must respect

1. **Never trust client prices.** `POST /bookings` must recompute totals from the rate
   plan, nights, rooms and add-ons.
2. **Idempotency everywhere money moves.** `draftKey` (booking) and `idempotencyKey`
   (payment) guarantee network-retry safety.
3. **Access is reference + PIN (or session).** Never expose a folio to a bare reference.
4. **The QR pass is opaque.** It contains no PII and no folio PIN — the backend should
   resolve it to a signed, short-lived check-in token if that flow is implemented.
5. **Availability is re-checked at booking time** to prevent overselling.
6. **Service-request transitions are server-authoritative**; the UI reflects them and
   does not invent statuses.

---

## Swapping mock → real backend

```bash
# .env
VITE_SERVICE_MODE=http
VITE_API_BASE_URL=https://api.stayflow.mm
```

Then implement the endpoints above. No UI changes are required: the services registry
(`src/services/index.ts`) selects the HTTP adapters automatically, and there is **no
silent fallback** to mock data if the API is misconfigured or unreachable.
