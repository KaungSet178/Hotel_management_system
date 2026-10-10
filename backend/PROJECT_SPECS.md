# Hotel Management System: Architecture & Project Documentation

**Project Vision**
A unified, end-to-end hospitality platform that bridges the gap between customer experience (UX) and internal hotel operations. Rather than functioning solely as a booking engine, the system centralizes Room Management, Payment Tracking, Housekeeping, and Guest Services to eliminate manual workflows and communication bottlenecks.

---

## 1. Key Features & Core Workflows

* **Concurrency-Safe Booking Engine:** Guests can browse real-time room availability and book online. The system uses PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) to guarantee zero double-bookings, even if multiple users attempt to book the exact same room simultaneously.
* **Flexible Payment Options:** Supports both "Online Payment" (to be integrated with a payment gateway) and "Pay at Hotel" workflows.
* **Automated 24-Hour Cancellation:** A background worker actively monitors unpaid "Pay at Hotel" reservations. If a booking passes the 24-hour hold deadline without payment or check-in, the system automatically cancels the reservation and releases the room inventory.
* **Contactless QR Check-In:** Upon booking confirmation, the system generates a secure, HMAC-signed cryptographic QR token. Guests scan this at the reception desk to bypass human queues and trigger an instant, automated self-check-in process.
* **In-Room Digital Concierge:** Guests can scan a static room QR code to access a service portal. This allows them to request extra towels, room cleaning, maintenance, or food and beverage directly from their phones.
* **Real-Time Staff Dashboard:** Built on Server-Sent Events (SSE), staff dashboards receive instant, zero-refresh updates for new bookings, check-ins, and incoming service requests.
* **Role-Based Access Control (RBAC):** Strict security enforced at the database level. User roles include `GUEST`, `RECEPTIONIST`, `HOUSEKEEPING`, and `ADMIN`, ensuring staff only see and interact with data relevant to their department.

---

## 2. Tech Stack

| Component | Technology | Purpose |
| --- | --- | --- |
| **Backend Framework** | Node.js & Express.js | API Gateway routing, request validation, and cryptographic services. |
| **Database** | Supabase (PostgreSQL) | ACID-compliant relational data storage, strict constraints, and transaction locking. |
| **Authentication** | Supabase Auth & RLS | Identity management and Row Level Security to isolate guest and staff data. |
| **Real-Time Data** | Server-Sent Events (SSE) | Lightweight, unidirectional event streams pushing live updates to front-end dashboards. |
| **Background Jobs** | pg_cron / Edge Functions | Scheduled execution of the automated cancellation policy. |
| **Security/Crypto** | Node native `crypto` | HMAC-signing for QR codes to prevent token forgery. |

---

## 3. Key Deliverables (Current State)

**I. Express.js API Gateway (`server/`)**
A fully functional REST API providing endpoints for:

* Inventory & Status (`/api/rooms`)
* Atomic Booking Transactions (`/api/bookings`)
* QR Self-Check-In (`/api/check-in/scan`)
* In-Room Service Requests (`/api/service-requests`)
* SSE Live Event Bridge (`/api/live-events`)

**II. Database Migrations & Stored Procedures (`supabase/`)**

* `20261010_001_initial_schema.sql`: Core tables (`profiles`, `rooms`, `bookings`, `room_service_requests`) and custom Enums.
* `20261010_002_concurrency_and_cancellation.sql`: PL/pgSQL functions including `book_room_atomic()` for race-condition prevention and `check_in_with_qr_token()`.
* `20261010_003_seed_data.sql`: Initialized luxury suites and amenity data for testing.

**III. Specialized Backend Modules**

* **Cryptographic QR Service (`server/qrService.js`):** Generates secure Base64 Data URL images and in-room portal links.
* **Cancellation Worker (`server/cancellationJob.js`):** The logic evaluating deadlines and releasing inventory.

**IV. Team & Integration Assets**

* `API_DOCUMENTATION.md`: Complete frontend integration guide with request/response schemas and WebSocket/SSE listeners.
* `BACKEND_SETUP.md`: Deployment and environment configuration instructions.
* **Automated Test Suite (`server/test-suite.js`):** 11/11 passing tests covering all primary backend flows.
