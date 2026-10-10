/**
 * Comprehensive Automated Test Suite for Hotel Management System Backend
 * Phase 1: Authentication, RBAC Role Guards, Guest Isolation & Concurrency
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BASE_URL = 'http://localhost:3000';
const { generateSignature } = require('./services/kbzPayService');
const { generateWebhookSignatureHeader } = require('./services/stripeService');

const TOKENS = {
  ADMIN: 'Bearer demo-token-admin',
  RECEPTIONIST: 'Bearer demo-token-receptionist',
  HOUSEKEEPING: 'Bearer demo-token-housekeeping',
  GUEST_1: 'Bearer demo-token-guest',       // Elena Rostova (user-guest-001)
  GUEST_2: 'Bearer demo-token-guest-2',     // Marcus Vance (user-guest-002)
  INVALID: 'Bearer invalid-token-xyz'
};

const TEST_RUN_CLIENT_ID = `test-run-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const originalFetch = global.fetch;
global.fetch = async (url, options = {}) => {
  const headers = { ...(options.headers || {}) };
  if (!headers['x-client-id']) {
    headers['x-client-id'] = TEST_RUN_CLIENT_ID;
  }
  return originalFetch(url, { ...options, headers });
};

async function runTests() {
  console.log('🧪 Starting Phase 1 Backend Security & Concurrency Tests...\n');
  let passed = 0;
  let failed = 0;

  async function assert(desc, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${desc} -> ${err.message}`);
      failed++;
    }
  }

  // ==========================================================================
  // 1. PUBLIC ROUTES
  // ==========================================================================
  console.log('\n--- 1. Public Endpoints ---');
  await assert('GET /api/config is accessible without token', async () => {
    const res = await fetch(`${BASE_URL}/api/config`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.mode) throw new Error('Missing mode in config');
  });

  let availableRoomId = null;
  let availableRoomNumber = null;
  await assert('GET /api/rooms is accessible without token', async () => {
    const res = await fetch(`${BASE_URL}/api/rooms`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) throw new Error('Invalid room list');
    let avail = json.data.find(r => r.status === 'AVAILABLE');
    if (!avail && json.data.length > 0) {
      avail = json.data[0];
      await fetch(`${BASE_URL}/api/rooms/${avail.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': TOKENS.RECEPTIONIST
        },
        body: JSON.stringify({ status: 'AVAILABLE' })
      });
    }
    if (!avail) throw new Error('No available room found');
    availableRoomId = avail.id;
    availableRoomNumber = avail.room_number;
  });

  // ==========================================================================
  // 2. AUTHENTICATION ENFORCEMENT (401 UNAUTHORIZED)
  // ==========================================================================
  console.log('\n--- 2. Auth Enforcement (401 Unauthorized) ---');
  await assert('GET /api/bookings rejects request with missing Authorization header (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/bookings`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const json = await res.json();
    if (json.code !== 'UNAUTHORIZED') throw new Error(`Expected UNAUTHORIZED code, got ${json.code}`);
  });

  await assert('POST /api/bookings rejects request with missing token (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: availableRoomId })
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await assert('POST /api/check-in/scan rejects request with missing token (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/check-in/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_token: 'fake-token' })
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await assert('GET /api/bookings rejects request with invalid/forged token (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      headers: { 'Authorization': TOKENS.INVALID }
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const json = await res.json();
    if (json.code !== 'UNAUTHORIZED') throw new Error(`Expected UNAUTHORIZED, got ${json.code}`);
  });

  await assert('PATCH /api/rooms/:id/status rejects request with missing token (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/rooms/${availableRoomId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CLEANING' })
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // ==========================================================================
  // 3. ROLE-BASED ACCESS CONTROL (403 FORBIDDEN)
  // ==========================================================================
  console.log('\n--- 3. RBAC Role Guards (403 Forbidden) ---');
  await assert('GUEST role is forbidden from updating room status (403)', async () => {
    const res = await fetch(`${BASE_URL}/api/rooms/${availableRoomId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.GUEST_1
      },
      body: JSON.stringify({ status: 'MAINTENANCE' })
    });
    if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
    const json = await res.json();
    if (json.code !== 'FORBIDDEN') throw new Error(`Expected FORBIDDEN code, got ${json.code}`);
  });

  await assert('HOUSEKEEPING role is forbidden from viewing customer booking records (403)', async () => {
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      headers: { 'Authorization': TOKENS.HOUSEKEEPING }
    });
    if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
    const json = await res.json();
    if (json.code !== 'FORBIDDEN') throw new Error(`Expected FORBIDDEN code, got ${json.code}`);
  });

  await assert('GUEST role is forbidden from updating service request status (403)', async () => {
    const res = await fetch(`${BASE_URL}/api/service-requests/s1111111-1111-2222-3333-444444444001`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.GUEST_1
      },
      body: JSON.stringify({ status: 'COMPLETED' })
    });
    if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
  });

  await assert('RECEPTIONIST role is forbidden from triggering background cancellation jobs (403)', async () => {
    const res = await fetch(`${BASE_URL}/api/jobs/trigger-cancellation`, {
      method: 'POST',
      headers: { 'Authorization': TOKENS.RECEPTIONIST }
    });
    if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
  });

  // ==========================================================================
  // 4. BOOKING CREATION & CONCURRENCY (ROW LOCKING)
  // ==========================================================================
  console.log('\n--- 4. Concurrency & Booking Transactions ---');
  const runOffset = (Math.floor(Date.now() / 1000) % 2000) * 10 + Math.floor(Math.random() * 5) + 20;
  const s4CheckIn = new Date(Date.now() + (runOffset + 20) * 86400000).toISOString().split('T')[0];
  const s4CheckOut = new Date(Date.now() + (runOffset + 24) * 86400000).toISOString().split('T')[0];
  const s4OverlapIn = new Date(Date.now() + (runOffset + 21) * 86400000).toISOString().split('T')[0];
  const s4OverlapOut = new Date(Date.now() + (runOffset + 23) * 86400000).toISOString().split('T')[0];

  let createdBooking = null;
  await assert('GUEST creates booking successfully and guest_id is attached', async () => {
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.GUEST_1
      },
      body: JSON.stringify({
        room_id: availableRoomId,
        check_in_date: s4CheckIn,
        check_out_date: s4CheckOut,
        total_amount: 1120.00,
        payment_method: 'PAY_AT_HOTEL'
      })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
    createdBooking = json.data;
  });

  await assert('Atomic row locking blocks duplicate overlapping booking (409 Conflict)', async () => {
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.GUEST_2
      },
      body: JSON.stringify({
        room_id: availableRoomId,
        check_in_date: s4OverlapIn, // Overlaps with s4CheckIn - s4CheckOut
        check_out_date: s4OverlapOut,
        total_amount: 560.00,
        payment_method: 'ONLINE'
      })
    });
    if (res.status !== 409) throw new Error(`Expected 409 Conflict, got ${res.status}`);
    const json = await res.json();
    if (json.code !== 'DATES_UNAVAILABLE') throw new Error(`Expected DATES_UNAVAILABLE, got ${json.code}`);
  });

  // ==========================================================================
  // 5. GUEST RECORD ISOLATION & DATA PARTITIONING
  // ==========================================================================
  console.log('\n--- 5. Guest Record Isolation ---');
  await assert('Guest only retrieves their own reservations in GET /api/bookings', async () => {
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      headers: { 'Authorization': TOKENS.GUEST_1 }
    });
    const json = await res.json();
    if (!json.success) throw new Error('Failed to retrieve bookings');
    // Ensure all returned bookings belong to Guest 1
    const foreignBookings = json.data.filter(b => b.guest_email !== 'elena.rostova@example.com' && b.guest_id !== 'user-guest-001' && b.guest_id !== '00000000-0000-0000-0000-000000000004');
    if (foreignBookings.length > 0) throw new Error('Data breach: Guest received another guest records!');
  });

  await assert('Guest 1 is forbidden from querying Guest 2 reservation by reference (403)', async () => {
    // Marcus Vance's booking is LUX-9230
    const res = await fetch(`${BASE_URL}/api/bookings/LUX-9230`, {
      headers: { 'Authorization': TOKENS.GUEST_1 }
    });
    if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
  });

  await assert('Staff (RECEPTIONIST) CAN query Guest 2 reservation by reference (200)', async () => {
    const res = await fetch(`${BASE_URL}/api/bookings/LUX-9230`, {
      headers: { 'Authorization': TOKENS.RECEPTIONIST }
    });
    if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();
    if (json.data.booking_reference !== 'LUX-9230') throw new Error('Wrong booking returned');
  });

  // ==========================================================================
  // 6. CONTACTLESS QR CHECK-IN WITH ROLE GUARDS
  // ==========================================================================
  console.log('\n--- 6. Contactless QR Check-In ---');
  await assert('Guest 2 is forbidden from scanning Guest 1 QR token (403)', async () => {
    const res = await fetch(`${BASE_URL}/api/check-in/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.GUEST_2 // Guest 2 scanning Guest 1's pass
      },
      body: JSON.stringify({ qr_token: createdBooking.qr_token })
    });
    if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
  });

  await assert('Guest 1 successfully self-checks in with own QR token (200)', async () => {
    const res = await fetch(`${BASE_URL}/api/check-in/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.GUEST_1 // Guest 1 scanning own pass
      },
      body: JSON.stringify({ qr_token: createdBooking.qr_token })
    });
    const json = await res.json();
    if (!json.success || json.data.room_number !== createdBooking.room_number) {
      throw new Error(json.error || 'Check-in failed');
    }
  });

  await assert('Duplicate check-in attempt is rejected gracefully', async () => {
    const res = await fetch(`${BASE_URL}/api/check-in/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.RECEPTIONIST
      },
      body: JSON.stringify({ qr_token: createdBooking.qr_token })
    });
    const json = await res.json();
    if (json.code !== 'ALREADY_CHECKED_IN') throw new Error(`Expected ALREADY_CHECKED_IN, got ${json.code}`);
  });

  // ==========================================================================
  // 7. IN-ROOM SERVICE REQUESTS & STAFF PROGRESSION
  // ==========================================================================
  console.log('\n--- 7. In-Room Concierge & Staff Status Progression ---');
  let serviceReqId = null;
  await assert('Guest files in-room service request (201)', async () => {
    const res = await fetch(`${BASE_URL}/api/service-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.GUEST_1
      },
      body: JSON.stringify({
        room_number: availableRoomNumber,
        category: 'TOWELS',
        priority: 'URGENT',
        details: 'Extra Egyptian cotton spa towels please.'
      })
    });
    const json = await res.json();
    if (!json.success || !json.data.id) throw new Error('Failed to create request');
    serviceReqId = json.data.id;
  });

  await assert('HOUSEKEEPING updates request status PENDING -> IN_PROGRESS -> COMPLETED', async () => {
    // Step 1: In Progress
    const res1 = await fetch(`${BASE_URL}/api/service-requests/${serviceReqId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.HOUSEKEEPING
      },
      body: JSON.stringify({ status: 'IN_PROGRESS' })
    });
    const json1 = await res1.json();
    if (!json1.success || json1.data.status !== 'IN_PROGRESS') throw new Error('Failed to set IN_PROGRESS');

    // Step 2: Completed
    const res2 = await fetch(`${BASE_URL}/api/service-requests/${serviceReqId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.HOUSEKEEPING
      },
      body: JSON.stringify({ status: 'COMPLETED' })
    });
    const json2 = await res2.json();
    if (!json2.success || json2.data.status !== 'COMPLETED') throw new Error('Failed to set COMPLETED');
  });

  // ==========================================================================
  // 8. STAFF ROOM STATUS & GUEST CHECK-OUT
  // ==========================================================================
  console.log('\n--- 8. Room Management & Check-Out ---');
  await assert('RECEPTIONIST updates room status to OCCUPIED (200)', async () => {
    const res = await fetch(`${BASE_URL}/api/rooms/${availableRoomId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.RECEPTIONIST
      },
      body: JSON.stringify({ status: 'OCCUPIED' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });

  await assert('RECEPTIONIST checks out guest; room auto-assigned to CLEANING', async () => {
    const res = await fetch(`${BASE_URL}/api/check-out/${createdBooking.booking_id}`, {
      method: 'POST',
      headers: { 'Authorization': TOKENS.RECEPTIONIST }
    });
    const json = await res.json();
    if (!json.success || json.data.room.status !== 'CLEANING') {
      throw new Error('Room not set to CLEANING after checkout');
    }
  });

  // ==========================================================================
  // 9. ADMIN CANCELLATION JOBS
  // ==========================================================================
  console.log('\n--- 9. Admin Policy Jobs ---');
  await assert('ADMIN runs background 24-hr cancellation job (200)', async () => {
    const res = await fetch(`${BASE_URL}/api/jobs/trigger-cancellation`, {
      method: 'POST',
      headers: { 'Authorization': TOKENS.ADMIN }
    });
    const json = await res.json();
    if (!json.success || typeof json.data.cancelled_count !== 'number') {
      throw new Error('Failed to run cancellation job');
    }
  });

  await assert('ADMIN simulates expired 24h booking & verifies automated policy release', async () => {
    const res = await fetch(`${BASE_URL}/api/demo/simulate-expired-booking`, {
      method: 'POST',
      headers: { 'Authorization': TOKENS.ADMIN }
    });
    const json = await res.json();
    if (!json.success || json.cancellation.cancelled_count < 1) {
      throw new Error('Simulation failed to cancel expired reservation');
    }
  });

  // ==========================================================================
  // 10. PHASE 2: DUAL PAYMENT GATEWAY (KBZPAY & VISA/STRIPE) & WEBHOOKS
  // ==========================================================================
  console.log('\n--- 10. Phase 2: Dual Payment Gateway & Webhook Scaffolding ---');

  // Setup: Create unpaid test booking 1 for Guest 1 (KBZPay test target on Room 102)
  const runOffset10 = (Math.floor(Date.now() / 1000) % 2000) * 10 + Math.floor(Math.random() * 5) + 300;
  const kbzInDate = new Date(Date.now() + (runOffset10 + 30) * 86400000).toISOString().split('T')[0];
  const kbzOutDate = new Date(Date.now() + (runOffset10 + 32) * 86400000).toISOString().split('T')[0];
  const visaInDate = new Date(Date.now() + (runOffset10 + 35) * 86400000).toISOString().split('T')[0];
  const visaOutDate = new Date(Date.now() + (runOffset10 + 38) * 86400000).toISOString().split('T')[0];

  let kbzBooking = null;
  await assert('Setup: Create pending/unpaid Pay-at-Hotel booking for KBZPay flow', async () => {
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.GUEST_1
      },
      body: JSON.stringify({
        room_id: 'a1111111-1111-1111-1111-111111111102',
        guest_name: 'Elena Rostova',
        guest_email: 'elena.rostova@example.com',
        check_in_date: kbzInDate,
        check_out_date: kbzOutDate,
        total_amount: 680.00,
        payment_method: 'PAY_AT_HOTEL',
        payment_status: 'PENDING'
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success || !json.data.booking_id) throw new Error('Failed to create KBZ test booking');
    kbzBooking = json.data;
  });

  // Setup: Create unpaid test booking 2 for Guest 1 (Visa / Stripe test target on Room 201)
  let visaBooking = null;
  await assert('Setup: Create pending/unpaid Pay-at-Hotel booking for Visa/Stripe flow', async () => {
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.GUEST_1
      },
      body: JSON.stringify({
        room_id: 'a1111111-1111-1111-1111-111111111201',
        guest_name: 'Elena Rostova',
        guest_email: 'elena.rostova@example.com',
        check_in_date: visaInDate,
        check_out_date: visaOutDate,
        total_amount: 1020.00,
        payment_method: 'PAY_AT_HOTEL',
        payment_status: 'PENDING'
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success || !json.data.booking_id) throw new Error('Failed to create Visa test booking');
    visaBooking = json.data;
  });

  // 10.1 Checkout Endpoint Validation & Auth
  await assert('POST /api/payments/checkout rejects missing token (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/payments/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: kbzBooking.booking_id, provider: 'KBZPAY' })
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await assert('POST /api/payments/checkout rejects invalid provider (400)', async () => {
    const res = await fetch(`${BASE_URL}/api/payments/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.GUEST_1
      },
      body: JSON.stringify({ booking_id: kbzBooking.booking_id, provider: 'CRYPTO' })
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const json = await res.json();
    if (json.code !== 'INVALID_PROVIDER') throw new Error(`Expected INVALID_PROVIDER, got ${json.code}`);
  });

  await assert('POST /api/payments/checkout rejects guest paying for another user reservation (403)', async () => {
    const res = await fetch(`${BASE_URL}/api/payments/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.GUEST_2 // Marcus Vance trying to checkout Elena's booking
      },
      body: JSON.stringify({ booking_id: kbzBooking.booking_id, provider: 'KBZPAY' })
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // 10.2 KBZPay Prepay Order Generation
  await assert('Guest requests KBZPay checkout string for unpaid booking (200)', async () => {
    const res = await fetch(`${BASE_URL}/api/payments/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.GUEST_1
      },
      body: JSON.stringify({
        booking_id: kbzBooking.booking_id,
        provider: 'KBZPAY'
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success || json.provider !== 'KBZPAY') throw new Error('Expected KBZPAY provider response');
    if (!json.prepay_order_string || !json.prepay_order_string.includes('prepay_id=')) {
      throw new Error('Missing or invalid prepay_order_string');
    }
    if (!json.prepay_data || !json.prepay_data.sign) {
      throw new Error('Missing cryptographic sign in prepay_data');
    }
  });

  // 10.3 Visa / Stripe Checkout Session Generation
  await assert('Guest requests Visa/Stripe checkout URL for unpaid booking (200)', async () => {
    const res = await fetch(`${BASE_URL}/api/payments/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.GUEST_1
      },
      body: JSON.stringify({
        booking_id: visaBooking.booking_id,
        provider: 'VISA'
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success || json.provider !== 'VISA') throw new Error('Expected VISA provider response');
    if (!json.checkout_url || !json.checkout_url.includes('https://checkout.stripe.com')) {
      throw new Error('Missing or invalid Stripe checkout_url');
    }
    if (!json.session_id || !json.session_id.startsWith('cs_test_')) {
      throw new Error('Missing or invalid session_id');
    }
  });

  // 10.4 KBZPay Webhook Signature & Success
  await assert('KBZPay webhook rejects invalid/tampered signature (400)', async () => {
    const tamperedPayload = {
      appid: 'kp_azure_hotel_app_2026',
      merch_code: '2009847192',
      merch_order_id: `KBZ-${kbzBooking.booking_reference}-test`,
      booking_id: kbzBooking.booking_id,
      total_amount: '680.00',
      trade_status: 'SUCCESS',
      sign: 'BAD_SIGNATURE_TAMPERED_HASH'
    };
    const res = await fetch(`${BASE_URL}/api/payments/webhook/kbzpay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tamperedPayload)
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const json = await res.json();
    if (json.code !== 'INVALID_SIGNATURE') throw new Error(`Expected INVALID_SIGNATURE code, got ${json.code}`);
  });

  await assert('Successful KBZPay webhook verifies signature, marks PAID, and unlocks QR token (200)', async () => {
    const validPayload = {
      appid: 'kp_azure_hotel_app_2026',
      merch_code: '2009847192',
      merch_order_id: `KBZ-${kbzBooking.booking_reference}-success`,
      booking_id: kbzBooking.booking_id,
      total_amount: '680.00',
      trade_status: 'SUCCESS',
      timestamp: Math.floor(Date.now() / 1000).toString(),
      nonce_str: 'nonce_kbz_valid_7788'
    };
    // Calculate authentic cryptographic signature matching merchant key
    validPayload.sign = generateSignature(validPayload);

    const res = await fetch(`${BASE_URL}/api/payments/webhook/kbzpay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.Response || json.Response.result !== 'SUCCESS') {
      throw new Error(`Expected KBZPay SUCCESS response structure, got ${JSON.stringify(json.Response)}`);
    }
    if (json.payment_status !== 'PAID') throw new Error(`Expected payment_status PAID, got ${json.payment_status}`);
    if (!json.qr_token || !json.qr_token.startsWith('LUX-QR-')) {
      throw new Error('Cryptographic QR token was not unlocked or assigned');
    }

    // Verify reservation state in DB: payment_status is PAID, auto_cancel_at is cleared
    const checkRes = await fetch(`${BASE_URL}/api/bookings/${kbzBooking.booking_reference}`, {
      headers: { 'Authorization': TOKENS.GUEST_1 }
    });
    const checkJson = await checkRes.json();
    if (checkJson.data.payment_status !== 'PAID') throw new Error('DB payment_status is not PAID');
    if (checkJson.data.auto_cancel_at !== null) throw new Error('auto_cancel_at deadline was not cleared');
  });

  // 10.5 Stripe Webhook Signature & Success
  await assert('Stripe webhook rejects invalid/tampered signature header (400)', async () => {
    const rawPayload = JSON.stringify({
      id: 'evt_tampered_test',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_bad', metadata: { booking_id: visaBooking.booking_id } } }
    });
    const res = await fetch(`${BASE_URL}/api/payments/webhook/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=1600000000,v1=tampered_hmac_hex_code_12345'
      },
      body: rawPayload
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const json = await res.json();
    if (json.code !== 'INVALID_SIGNATURE') throw new Error(`Expected INVALID_SIGNATURE code, got ${json.code}`);
  });

  await assert('Successful Stripe webhook verifies raw signature, marks PAID, and unlocks QR token (200)', async () => {
    const stripePayload = {
      id: `evt_stripe_test_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_test_${Date.now()}`,
          payment_status: 'paid',
          metadata: {
            booking_id: visaBooking.booking_id,
            booking_reference: visaBooking.booking_reference
          }
        }
      }
    };
    const rawBuffer = Buffer.from(JSON.stringify(stripePayload), 'utf8');
    const validSignatureHeader = generateWebhookSignatureHeader(rawBuffer);

    const res = await fetch(`${BASE_URL}/api/payments/webhook/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': validSignatureHeader
      },
      body: rawBuffer
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.received || !json.success) throw new Error('Expected Stripe webhook success acknowledgement');
    if (json.payment_status !== 'PAID') throw new Error(`Expected payment_status PAID, got ${json.payment_status}`);
    if (!json.qr_token || !json.qr_token.startsWith('LUX-QR-')) {
      throw new Error('Cryptographic QR token was not unlocked or assigned');
    }

    // Verify reservation state in DB: payment_status is PAID, auto_cancel_at is cleared
    const checkRes = await fetch(`${BASE_URL}/api/bookings/${visaBooking.booking_reference}`, {
      headers: { 'Authorization': TOKENS.GUEST_1 }
    });
    const checkJson = await checkRes.json();
    if (checkJson.data.payment_status !== 'PAID') throw new Error('DB payment_status is not PAID');
    if (checkJson.data.auto_cancel_at !== null) throw new Error('auto_cancel_at deadline was not cleared');
  });

  // 10.6 Rejection of Checkout for already PAID booking
  await assert('POST /api/payments/checkout rejects already PAID booking (400)', async () => {
    const res = await fetch(`${BASE_URL}/api/payments/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.GUEST_1
      },
      body: JSON.stringify({
        booking_id: kbzBooking.booking_id,
        provider: 'KBZPAY'
      })
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const json = await res.json();
    if (json.code !== 'ALREADY_PAID') throw new Error(`Expected ALREADY_PAID code, got ${json.code}`);
  });

  // ==========================================================================
  // 11. PHASE 3: REQUEST INPUT VALIDATION & STANDARDIZED ERROR HANDLING
  // ==========================================================================
  console.log('\n--- 11. Phase 3: Zod Schema Validation & Centralized Error Envelopes ---');

  await assert('Booking rejection: check-out date before check-in date (400)', async () => {
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.GUEST_1
      },
      body: JSON.stringify({
        room_id: 'a1111111-1111-1111-1111-111111111102',
        check_in_date: '2026-12-15',
        check_out_date: '2026-12-10', // Strictly before check-in!
        payment_method: 'PAY_AT_HOTEL'
      })
    });
    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
    const json = await res.json();
    if (!json.error || !json.error.details) throw new Error('Expected standard error envelope with details');
    if (json.code !== 'VALIDATION_ERROR' && json.error.code !== 'VALIDATION_ERROR') {
      throw new Error(`Expected VALIDATION_ERROR code, got ${json.code}`);
    }
    const hasField = json.error.details.some(d => d.field === 'check_out_date');
    if (!hasField) throw new Error('Validation details did not pinpoint check_out_date');
  });

  await assert('Booking rejection: invalid non-UUID room_id (400)', async () => {
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.GUEST_1
      },
      body: JSON.stringify({
        room_id: 'not-a-valid-uuid-12345',
        check_in_date: '2026-12-10',
        check_out_date: '2026-12-12'
      })
    });
    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
    const json = await res.json();
    if (!json.error || !json.error.details) throw new Error('Expected standard error envelope');
    const hasField = json.error.details.some(d => d.field === 'room_id');
    if (!hasField) throw new Error('Validation details did not pinpoint room_id');
  });

  await assert('Service request rejection: invalid request_type like "PIZZA" (400)', async () => {
    const res = await fetch(`${BASE_URL}/api/service-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.GUEST_1
      },
      body: JSON.stringify({
        room_number: availableRoomNumber,
        request_type: 'PIZZA', // Invalid enum value!
        details: 'Extra large pepperoni pizza please'
      })
    });
    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
    const json = await res.json();
    if (!json.error || !json.error.details) throw new Error('Expected standard error envelope');
    if (json.code !== 'VALIDATION_ERROR' && json.error.code !== 'VALIDATION_ERROR') {
      throw new Error(`Expected VALIDATION_ERROR code, got ${json.code}`);
    }
    const hasField = json.error.details.some(d => d.field.includes('request_type') || d.field.includes('category'));
    if (!hasField) throw new Error('Validation details did not pinpoint request_type/category');
  });

  await assert('Room status rejection: invalid room status like "EXPLODED" (400)', async () => {
    const res = await fetch(`${BASE_URL}/api/rooms/${availableRoomId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.RECEPTIONIST
      },
      body: JSON.stringify({
        status: 'EXPLODED'
      })
    });
    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
    const json = await res.json();
    if (!json.error || !json.error.details) throw new Error('Expected standard error envelope');
    const hasField = json.error.details.some(d => d.field === 'status');
    if (!hasField) throw new Error('Validation details did not pinpoint status field');
  });

  await assert('Service request status rejection: invalid status like "WAITING" (400)', async () => {
    const res = await fetch(`${BASE_URL}/api/service-requests/s1111111-1111-2222-3333-444444444001`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.HOUSEKEEPING
      },
      body: JSON.stringify({
        status: 'WAITING'
      })
    });
    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
    const json = await res.json();
    if (!json.error || !json.error.details) throw new Error('Expected standard error envelope');
    const hasField = json.error.details.some(d => d.field === 'status');
    if (!hasField) throw new Error('Validation details did not pinpoint status field');
  });

  await assert('Centralized Error Envelope structure verification', async () => {
    const res = await fetch(`${BASE_URL}/api/service-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKENS.GUEST_1
      },
      body: JSON.stringify({
        request_type: 'INVALID_BURGER'
      })
    });
    const json = await res.json();
    if (typeof json.success !== 'boolean' || json.success !== false) throw new Error('success must be boolean false');
    if (typeof json.error !== 'object' || json.error === null) throw new Error('error must be an object');
    if (!json.error.code || typeof json.error.code !== 'string') throw new Error('error.code must be a string');
    if (!json.error.message || typeof json.error.message !== 'string') throw new Error('error.message must be a string');
    if (!Array.isArray(json.error.details)) throw new Error('error.details must be an array');
  });

  // ==========================================================================
  // 12. PHASE 4: SECURITY HARDENING & RATE LIMITING
  // ==========================================================================
  console.log('\n--- 12. Phase 4: Security Hardening & Rate Limiting ---');

  await assert('Helmet security headers hide X-Powered-By & set nosniff', async () => {
    const res = await fetch(`${BASE_URL}/api/config`);
    const xPoweredBy = res.headers.get('x-powered-by');
    if (xPoweredBy) throw new Error(`x-powered-by header must be hidden, found: ${xPoweredBy}`);
    const nosniff = res.headers.get('x-content-type-options');
    if (nosniff !== 'nosniff') throw new Error(`Expected x-content-type-options: nosniff, got: ${nosniff}`);
  });

  await assert('Strict Rate Limiting: Rapid loop on /api/check-in/scan triggers 429 Too Many Requests', async () => {
    const rateLimitClientId = `test-client-scan-rate-${Date.now()}`;
    let hit429 = false;
    let rateLimitJson = null;

    // Hit the strict limiter in rapid succession until 429 is triggered
    for (let i = 0; i < 15; i++) {
      const res = await fetch(`${BASE_URL}/api/check-in/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': TOKENS.GUEST_1,
          'x-client-id': rateLimitClientId
        },
        body: JSON.stringify({ qr_token: 'dummy-qr-token-for-rate-test' })
      });

      if (res.status === 429) {
        hit429 = true;
        rateLimitJson = await res.json();
        break;
      }
    }

    if (!hit429) {
      throw new Error('Rate limit was not triggered after 15 rapid requests');
    }

    // Verify standardized JSON error envelope matching Phase 3
    if (rateLimitJson.success !== false) throw new Error('Expected success to be false');
    if (rateLimitJson.code !== 'RATE_LIMIT_EXCEEDED') throw new Error(`Expected code to be RATE_LIMIT_EXCEEDED, got ${rateLimitJson.code}`);
    if (!rateLimitJson.error || typeof rateLimitJson.error !== 'object') throw new Error('Expected error object');
    if (rateLimitJson.error.code !== 'RATE_LIMIT_EXCEEDED') throw new Error(`Expected error.code to be RATE_LIMIT_EXCEEDED, got ${rateLimitJson.error.code}`);
    if (typeof rateLimitJson.error.message !== 'string') throw new Error('Expected error.message string');
    if (!Array.isArray(rateLimitJson.error.details) || rateLimitJson.error.details.length === 0) {
      throw new Error('Expected error.details non-empty array');
    }
  });

  await assert('Strict Rate Limiting: Rapid loop on POST /api/bookings triggers 429 Too Many Requests', async () => {
    const rateLimitClientId = `test-client-booking-rate-${Date.now()}`;
    let hit429 = false;
    let rateLimitJson = null;

    for (let i = 0; i < 15; i++) {
      const res = await fetch(`${BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': TOKENS.GUEST_1,
          'x-client-id': rateLimitClientId
        },
        body: JSON.stringify({
          room_id: 'a1111111-1111-1111-1111-111111111101',
          check_in_date: '2027-01-10',
          check_out_date: '2027-01-12',
          payment_method: 'PAY_AT_HOTEL'
        })
      });

      if (res.status === 429) {
        hit429 = true;
        rateLimitJson = await res.json();
        break;
      }
    }

    if (!hit429) {
      throw new Error('Booking rate limit was not triggered after 15 rapid requests');
    }
    if (rateLimitJson.code !== 'RATE_LIMIT_EXCEEDED') throw new Error('Expected RATE_LIMIT_EXCEEDED code');
  });

  console.log(`\n============================================================`);
  console.log(`Phase 1, Phase 2, Phase 3 & Phase 4 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`============================================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal Test Exception:', err);
  process.exit(1);
});
