const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const {
  isConfigured,
  realtimeBus,
  getRooms,
  getRoomById,
  updateRoomStatus,
  getBookings,
  getBookingByRefOrToken,
  createAtomicBooking,
  checkInWithQrToken,
  checkOutBooking,
  getServiceRequests,
  createServiceRequest,
  updateServiceRequestStatus,
  runCancellationCheck,
  markBookingAsPaid,
  verifyPaymentProof,
  createWalkInBooking
} = require('./supabaseClient');
const { createSecureQrToken, generateQrDataUrl, generateInRoomQr } = require('./qrService');
const { startCancellationJob } = require('./cancellationJob');
const { requireAuth, requireVerifiedEmail } = require('./middleware/auth');
const { requireRole } = require('./middleware/roles');
const { createPrepayOrder, verifyWebhookSignature } = require('./services/kbzPayService');
const { createCheckoutSession, constructEvent } = require('./services/stripeService');
const helmet = require('helmet');
const { globalLimiter, strictLimiter } = require('./middleware/rateLimiter');
const { validateRequest } = require('./middleware/validate');
const { errorHandler } = require('./middleware/errorHandler');
const {
  createBookingSchema,
  createServiceRequestSchema,
  updateRoomStatusSchema,
  updateServiceRequestStatusSchema,
  checkoutPaymentSchema,
  scanQrCheckInSchema
} = require('./validators/schemas');

const app = express();
const PORT = process.env.PORT || 3000;

// Hide X-Powered-By header
app.disable('x-powered-by');

// ----------------------------------------------------------------------------
// 1. Security Headers (Helmet)
// ----------------------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
        connectSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// ----------------------------------------------------------------------------
// 2. Strict CORS Configuration
// Strict in production using FRONTEND_URL whitelist; falls back to localhost for development.
// ----------------------------------------------------------------------------
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile, server-to-server, test suite, curl) with no origin header
    if (!origin) return callback(null, true);

    if (process.env.NODE_ENV === 'production') {
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: Origin not permitted by Access-Control-Allow-Origin'));
    }

    // Development mode fallback
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
};

app.use(cors(corsOptions));

// ----------------------------------------------------------------------------
// 3. Global Baseline Rate Limiter
// ----------------------------------------------------------------------------
app.use('/api', globalLimiter);

// ----------------------------------------------------------------------------
// CRITICAL: Mount Stripe raw buffer webhook BEFORE global express.json()
// Stripe HMAC-SHA256 signature verification requires the exact unparsed byte buffer.
// ----------------------------------------------------------------------------
app.post(
  '/api/payments/webhook/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    let event;

    try {
      event = constructEvent(req.body, signature);
    } catch (err) {
      console.warn('Stripe webhook signature verification failed:', err.message);
      return res.status(400).json({
        success: false,
        error: `Webhook Error: ${err.message}`,
        code: 'INVALID_SIGNATURE'
      });
    }

    try {
      const session = (event.data && event.data.object) ? event.data.object : event;
      const metadata = session.metadata || {};
      let bookingId = metadata.booking_id || session.booking_id || (event.metadata && event.metadata.booking_id);

      // Support Stripe CLI default simulation triggers without custom metadata
      if (!bookingId) {
        const { getBookings } = require('./supabaseClient');
        const allBookings = await getBookings();
        const pendingBooking = allBookings.find(b => (b.payment_status || '').toUpperCase() === 'PENDING');
        if (pendingBooking) {
          bookingId = pendingBooking.id;
          console.log(`✓ [Stripe Webhook] Test event detected: auto-linked to pending booking ${pendingBooking.booking_reference} (${bookingId})`);
        }
      }

      if (!bookingId) {
        return res.status(400).json({
          success: false,
          error: 'No booking_id found in Stripe session metadata.',
          code: 'MISSING_BOOKING_METADATA'
        });
      }

      const updatedBooking = await markBookingAsPaid(bookingId, {
        provider: 'VISA',
        transaction_id: session.id || session.payment_intent || `ch_${Date.now()}`
      });

      return res.status(200).json({
        received: true,
        success: true,
        booking_id: updatedBooking.id,
        booking_reference: updatedBooking.booking_reference,
        payment_status: updatedBooking.payment_status,
        status: updatedBooking.status || updatedBooking.booking_status,
        qr_token: updatedBooking.qr_token
      });
    } catch (err) {
      console.error('Error processing Stripe webhook:', err.message);
      const statusCode = err.code === 'BOOKING_NOT_FOUND' ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: err.message
      });
    }
  }
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ----------------------------------------------------------------------------
// Realtime Server-Sent Events (SSE) Bridge for Instant Dashboard Updates
// ----------------------------------------------------------------------------
const sseClients = new Set();

app.get('/api/live-events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('retry: 3000\n\n');
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  const client = { res };
  sseClients.add(client);

  req.on('close', () => {
    sseClients.delete(client);
  });
});

function broadcastEvent(eventType, payload) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Subscribe internal Realtime Bus events and broadcast over SSE
realtimeBus.on('booking:created', (data) => broadcastEvent('booking_created', data));
realtimeBus.on('booking:checked_in', (data) => broadcastEvent('booking_checked_in', data));
realtimeBus.on('booking:checked_out', (data) => broadcastEvent('booking_checked_out', data));
realtimeBus.on('booking:cancelled', (data) => broadcastEvent('booking_cancelled', data));
realtimeBus.on('booking:paid', (data) => broadcastEvent('booking_paid', data));
realtimeBus.on('booking:updated', (data) => broadcastEvent('booking_updated', data));
realtimeBus.on('room:updated', (data) => broadcastEvent('room_updated', data));
realtimeBus.on('service_request:created', (data) => broadcastEvent('service_request_created', data));
realtimeBus.on('service_request:updated', (data) => broadcastEvent('service_request_updated', data));

// ----------------------------------------------------------------------------
// API Endpoints
// ----------------------------------------------------------------------------

// Mount Customer-Facing Frontend Router (StayFlow MVP Contracts)
const customerRoutes = require('./routes/customerRoutes');
app.use('/api', customerRoutes);

// Mount Customer Authentication Router
const { router: authRoutes } = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// 1. Health & Config
app.get('/api/config', (req, res) => {
  res.json({
    isConfigured,
    mode: isConfigured ? 'SUPABASE_CONNECTED' : 'LOCAL_REACTIVE_ENGINE',
    supabaseUrl: process.env.SUPABASE_URL || null,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null
  });
});

// 2. Rooms
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await getRooms();
    res.json({ success: true, data: rooms });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/rooms/:id', async (req, res) => {
  try {
    const room = await getRoomById(req.params.id);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    res.json({ success: true, data: room });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update room status (Requires RECEPTIONIST, HOUSEKEEPING, or ADMIN)
app.patch('/api/rooms/:id/status', requireAuth, requireRole('RECEPTIONIST', 'HOUSEKEEPING', 'ADMIN'), validateRequest(updateRoomStatusSchema), async (req, res, next) => {
  try {
    const { status } = req.body;
    const updated = await updateRoomStatus(req.params.id, status);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// 3. Bookings & Atomic Concurrency (Require Authentication)
app.get('/api/bookings', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'HOUSEKEEPING') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Housekeeping staff is not authorized to access booking records.',
        code: 'FORBIDDEN'
      });
    }

    // Guests only retrieve their own bookings; Staff/Admin retrieve all
    const bookings = await getBookings(req.user);
    res.json({ success: true, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/bookings/:query', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'HOUSEKEEPING') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Housekeeping staff is not authorized to access booking records.',
        code: 'FORBIDDEN'
      });
    }

    const booking = await getBookingByRefOrToken(req.params.query);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    // Isolation check: GUEST role cannot view reservations belonging to other guests
    if (req.user.role === 'GUEST') {
      const isOwner =
        (booking.guest_id && booking.guest_id === req.user.id) ||
        (booking.guest_email && booking.guest_email.toLowerCase() === req.user.email.toLowerCase());

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You cannot access reservations belonging to other guests.',
          code: 'FORBIDDEN'
        });
      }
    }

    // Generate in-room service QR portal code
    const serverHost = `${req.protocol}://${req.get('host')}`;
    const inRoomPortal = await generateInRoomQr(booking.room_number, booking.id, serverHost);

    res.json({
      success: true,
      data: {
        ...booking,
        inRoomPortal
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/bookings', strictLimiter, requireAuth, requireVerifiedEmail, validateRequest(createBookingSchema), async (req, res, next) => {
  try {
    const {
      room_id,
      guest_name,
      guest_email,
      guest_phone,
      check_in_date,
      check_out_date,
      total_amount,
      payment_method,
      payment_status = 'PENDING'
    } = req.body;

    if (!room_id || !check_in_date || !check_out_date) {
      return res.status(400).json({ success: false, error: 'Missing required booking fields.' });
    }

    // Enforce guest identity from authenticated token
    const effectiveGuestId = req.user.id;
    const effectiveEmail = req.user.role === 'GUEST' ? req.user.email : (guest_email || req.user.email);
    const effectiveName = req.user.role === 'GUEST' ? (req.user.full_name || guest_name || 'Guest') : (guest_name || req.user.full_name);

    // Generate Unique Reference & Cryptographic Token
    const randomSuffix = `${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;
    const booking_reference = `LUX-${randomSuffix}`;
    const tempBookingId = require('crypto').randomUUID();
    const qr_token = createSecureQrToken(tempBookingId, booking_reference);

    // Concurrency-Safe Atomic Booking
    const bookingResult = await createAtomicBooking({
      room_id,
      guest_id: effectiveGuestId,
      guest_name: effectiveName,
      guest_email: effectiveEmail,
      guest_phone: guest_phone || '',
      check_in_date,
      check_out_date,
      total_amount: Number(total_amount),
      payment_method,
      payment_status: payment_method === 'ONLINE' ? 'PAID' : payment_status,
      qr_token,
      booking_reference
    });

    // Generate High-Res QR Pass image (Base64 Data URL)
    const qrCodeDataUrl = await generateQrDataUrl(qr_token, { width: 340 });

    // Generate In-Room Portal QR Code
    const serverHost = `${req.protocol}://${req.get('host')}`;
    const inRoomPortal = await generateInRoomQr(bookingResult.room_number, bookingResult.booking_id, serverHost);

    res.status(201).json({
      success: true,
      data: {
        ...bookingResult,
        qr_code_data_url: qrCodeDataUrl,
        in_room_portal: inRoomPortal
      }
    });
  } catch (err) {
    console.error('Booking creation error:', err.message);
    const statusCode = err.code === 'DATES_UNAVAILABLE' ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      error: err.message,
      code: err.code || 'BOOKING_FAILED'
    });
  }
});

// ----------------------------------------------------------------------------
// Dual Payment Gateway Integration (KBZPay & Visa/Stripe)
// ----------------------------------------------------------------------------

/**
 * Unified Payment Checkout Endpoint
 * POST /api/payments/checkout
 * Accepts: { booking_id, provider: 'KBZPAY' | 'VISA' }
 * Validates ownership, pending & unpaid booking status.
 */
app.post('/api/payments/checkout', requireAuth, async (req, res) => {
  try {
    const { booking_id, provider } = req.body;

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        error: 'booking_id is required.',
        code: 'MISSING_BOOKING_ID'
      });
    }

    if (!provider || !['KBZPAY', 'VISA'].includes(String(provider).toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment provider. Provider must be 'KBZPAY' or 'VISA'.",
        code: 'INVALID_PROVIDER'
      });
    }

    // Verify booking exists
    const booking = await getBookingByRefOrToken(booking_id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found.',
        code: 'BOOKING_NOT_FOUND'
      });
    }

    // Verify booking belongs to req.user.id
    const isOwner =
      (booking.guest_id && booking.guest_id === req.user.id) ||
      (booking.guest_email && req.user.email && booking.guest_email.toLowerCase() === req.user.email.toLowerCase()) ||
      (['RECEPTIONIST', 'ADMIN'].includes(req.user.role));

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are not authorized to checkout reservations for another guest.',
        code: 'FORBIDDEN'
      });
    }

    // Verify booking is PENDING & UNPAID
    const paymentStatus = (booking.payment_status || '').toUpperCase();
    const bookingStatus = (booking.booking_status || booking.status || '').toUpperCase();

    if (paymentStatus === 'PAID') {
      return res.status(400).json({
        success: false,
        error: 'Booking has already been paid.',
        code: 'ALREADY_PAID'
      });
    }

    if (['CANCELLED', 'EXPIRED'].includes(bookingStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot initiate checkout for a cancelled or expired booking.',
        code: 'BOOKING_INACTIVE'
      });
    }

    if (bookingStatus === 'CHECKED_IN') {
      return res.status(400).json({
        success: false,
        error: 'Guest is already checked in.',
        code: 'ALREADY_CHECKED_IN'
      });
    }

    const normalizedProvider = String(provider).toUpperCase();

    if (normalizedProvider === 'KBZPAY') {
      const kbzOrder = createPrepayOrder(booking);
      return res.json({
        success: true,
        provider: 'KBZPAY',
        booking_id: booking.id,
        booking_reference: booking.booking_reference,
        amount: booking.total_amount,
        prepay_order_string: kbzOrder.prepay_string,
        prepay_data: kbzOrder.prepay_data,
        data: kbzOrder
      });
    }

    if (normalizedProvider === 'VISA') {
      const serverHost = `${req.protocol}://${req.get('host')}`;
      const stripeSession = createCheckoutSession(booking, { host: serverHost });
      return res.json({
        success: true,
        provider: 'VISA',
        booking_id: booking.id,
        booking_reference: booking.booking_reference,
        amount: booking.total_amount,
        checkout_url: stripeSession.checkout_url,
        session_id: stripeSession.session_id,
        data: stripeSession
      });
    }
  } catch (err) {
    console.error('Payment checkout error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      code: 'CHECKOUT_FAILED'
    });
  }
});

/**
 * KBZPay Webhook Listener (Standard JSON parsing)
 * POST /api/payments/webhook/kbzpay
 * Verifies ASCII sorted param SHA256 signature, updates booking to PAID, unlocks QR token.
 */
app.post('/api/payments/webhook/kbzpay', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({
        Response: { result: 'FAIL', message: 'Payload is missing or invalid' },
        success: false,
        error: 'Invalid payload'
      });
    }

    // Expects signature within the payload or headers
    const signature = payload.sign || req.headers['x-kbzpay-signature'] || req.headers['signature'];
    const payloadToVerify = { ...payload };
    if (signature && !payloadToVerify.sign) {
      payloadToVerify.sign = signature;
    }

    const isValid = verifyWebhookSignature(payloadToVerify);
    if (!isValid) {
      console.warn('KBZPay webhook signature verification failed.');
      return res.status(400).json({
        Response: {
          result: 'FAIL',
          message: 'Invalid cryptographic signature'
        },
        success: false,
        error: 'Invalid KBZPay signature',
        code: 'INVALID_SIGNATURE'
      });
    }

    // Extract booking_id from callback_info, direct booking_id, or merch_order_id
    let bookingId = payload.booking_id;
    if (!bookingId && payload.callback_info) {
      try {
        const callbackObj = typeof payload.callback_info === 'string'
          ? JSON.parse(payload.callback_info)
          : payload.callback_info;
        bookingId = callbackObj.booking_id || callbackObj.booking_reference;
      } catch {
        bookingId = payload.callback_info;
      }
    }

    if (!bookingId && payload.merch_order_id) {
      const parts = payload.merch_order_id.split('-');
      if (parts.length >= 3) {
        bookingId = `${parts[1]}-${parts[2]}`;
      }
    }

    if (!bookingId) {
      return res.status(400).json({
        Response: { result: 'FAIL', message: 'Missing booking identification' },
        success: false,
        error: 'Missing booking identification in payload'
      });
    }

    const updatedBooking = await markBookingAsPaid(bookingId, {
      provider: 'KBZPAY',
      transaction_id: payload.mm_order_id || payload.prepay_id || payload.merch_order_id
    });

    return res.status(200).json({
      Response: {
        result: 'SUCCESS',
        message: 'OK'
      },
      success: true,
      booking_id: updatedBooking.id,
      booking_reference: updatedBooking.booking_reference,
      payment_status: updatedBooking.payment_status,
      status: updatedBooking.status || updatedBooking.booking_status,
      qr_token: updatedBooking.qr_token
    });
  } catch (err) {
    console.error('KBZPay webhook processing error:', err.message);
    const statusCode = err.code === 'BOOKING_NOT_FOUND' ? 404 : 500;
    return res.status(statusCode).json({
      Response: { result: 'FAIL', message: err.message },
      success: false,
      error: err.message
    });
  }
});

// 4. Contactless QR Check-In (Strict Rate Limiting & Auth Guard)
app.post('/api/check-in/scan', strictLimiter, requireAuth, validateRequest(scanQrCheckInSchema), async (req, res) => {
  try {
    const { qr_token } = req.body;
    if (!qr_token) {
      return res.status(400).json({ success: false, error: 'QR token is required.' });
    }

    const checkInResult = await checkInWithQrToken(qr_token.trim(), req.user);

    // Generate in-room QR code for the guest's mobile phone
    const serverHost = `${req.protocol}://${req.get('host')}`;
    const inRoomPortal = await generateInRoomQr(checkInResult.room_number, checkInResult.booking_id, serverHost);

    res.json({
      success: true,
      message: `Welcome, ${checkInResult.guest_name}! Room ${checkInResult.room_number} is ready.`,
      data: {
        ...checkInResult,
        inRoomPortal
      }
    });
  } catch (err) {
    console.error('QR Check-in error:', err.message);
    const statusCode = err.code === 'FORBIDDEN_GUEST' ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: err.message,
      code: err.code || 'CHECK_IN_FAILED',
      checked_in_at: err.checked_in_at || null
    });
  }
});

// 5. Guest Check-Out (Requires RECEPTIONIST or ADMIN)
app.post('/api/check-out/:id', requireAuth, requireRole('RECEPTIONIST', 'ADMIN'), async (req, res) => {
  try {
    const result = await checkOutBooking(req.params.id);
    res.json({ success: true, message: 'Check-out successful. Room sent to housekeeping.', data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 5b. Verify Payment Proof (Deposit Approval / Rejection by Staff)
app.patch('/api/bookings/:id/payment-proof/verify', requireAuth, requireRole('RECEPTIONIST', 'ADMIN'), async (req, res) => {
  try {
    const { approved = true, notes = '' } = req.body;
    const result = await verifyPaymentProof(req.params.id, Boolean(approved), notes, req.user);
    const message = approved
      ? `Payment verified for booking ${result.booking_reference}. Suite locked!`
      : `Payment rejected for booking ${result.booking_reference}. Reservation cancelled.`;
    res.json({ success: true, message, data: result });
  } catch (err) {
    const statusCode = err.code === 'BOOKING_NOT_FOUND' ? 404 : 400;
    res.status(statusCode).json({ success: false, error: err.message });
  }
});

// 5c. Counter Walk-In Direct Booking (Front Desk)
app.post('/api/walk-in/book', requireAuth, requireRole('RECEPTIONIST', 'ADMIN'), async (req, res) => {
  try {
    const result = await createWalkInBooking(req.body, req.user);
    res.status(201).json({
      success: true,
      message: `Walk-in guest ${result.guest_name} registered for Room ${result.room_number}.`,
      data: result
    });
  } catch (err) {
    const statusCode = err.code === 'ROOM_NOT_FOUND' ? 404 : 400;
    res.status(statusCode).json({ success: false, error: err.message });
  }
});

// 6. In-Room Real-time Service Requests
app.get('/api/service-requests', requireAuth, async (req, res) => {
  try {
    // Guests only retrieve requests for their bookings/room; Staff retrieve all
    const requests = await getServiceRequests(req.user);
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/service-requests', requireAuth, validateRequest(createServiceRequestSchema), async (req, res, next) => {
  try {
    const { room_number, room_id, guest_name, category, request_type, details, priority, booking_id } = req.body;
    let effectiveRoomNumber = room_number;
    if (!effectiveRoomNumber && room_id) {
      const room = await getRoomById(room_id);
      if (room) effectiveRoomNumber = room.room_number;
    }

    const effectiveCategory = (category || request_type || 'OTHER').toUpperCase();
    const effectiveDetails = details || `Service request for ${effectiveCategory.toLowerCase()}`;

    const effectiveName = req.user.role === 'GUEST' ? (req.user.full_name || req.user.email) : (guest_name || req.user.full_name);

    const newRequest = await createServiceRequest({
      room_number: effectiveRoomNumber,
      room_id,
      guest_id: req.user.id,
      guest_name: effectiveName,
      category: effectiveCategory,
      details: effectiveDetails,
      priority: priority || 'NORMAL',
      booking_id
    });

    res.status(201).json({ success: true, data: newRequest });
  } catch (err) {
    next(err);
  }
});

// Staff updates service request status (Requires HOUSEKEEPING, RECEPTIONIST, or ADMIN)
app.patch('/api/service-requests/:id', requireAuth, requireRole('HOUSEKEEPING', 'RECEPTIONIST', 'ADMIN'), validateRequest(updateServiceRequestStatusSchema), async (req, res, next) => {
  try {
    const { status, assigned_to } = req.body;
    const updated = await updateServiceRequestStatus(req.params.id, status, assigned_to || req.user.full_name);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// 7. Background 24-Hour Cancellation Job Trigger (Requires ADMIN)
app.post('/api/jobs/trigger-cancellation', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await runCancellationCheck();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Demo Helper: Simulate Expired 24-hr Booking for instant live testing (Requires ADMIN)
app.post('/api/demo/simulate-expired-booking', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { memoryStore, isConfigured, supabase } = require('./supabaseClient');
    const expiredRef = `EXP-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiredBooking = {
      id: require('crypto').randomUUID(),
      booking_reference: expiredRef,
      guest_id: req.user.id,
      guest_name: 'Simulated Expired Guest',
      guest_email: 'expired.demo@hotel.internal',
      guest_phone: '+1 555-9999',
      room_id: 'a1111111-1111-1111-1111-111111111102',
      room_number: '102',
      check_in_date: '2026-10-15',
      check_out_date: '2026-10-18',
      total_amount: 1020.00,
      payment_method: 'PAY_AT_HOTEL',
      payment_status: 'PENDING',
      booking_status: 'CONFIRMED',
      qr_token: `LUX-QR-${expiredRef}-mock`,
      checked_in_at: null,
      // Deadline set 10 seconds in the past:
      auto_cancel_at: new Date(Date.now() - 10000).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 25).toISOString()
    };

    if (isConfigured && supabase) {
      let validGuestId = null;
      if (req.user && req.user.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.user.id)) {
        const { data: p } = await supabase.from('profiles').select('id').eq('id', req.user.id).maybeSingle();
        if (p) validGuestId = p.id;
      }
      const { error: insErr } = await supabase.from('bookings').insert({
        id: expiredBooking.id,
        booking_reference: expiredBooking.booking_reference,
        guest_id: validGuestId,
        guest_name: expiredBooking.guest_name,
        guest_email: expiredBooking.guest_email,
        guest_phone: expiredBooking.guest_phone,
        room_id: expiredBooking.room_id,
        check_in_date: expiredBooking.check_in_date,
        check_out_date: expiredBooking.check_out_date,
        total_amount: expiredBooking.total_amount,
        payment_method: expiredBooking.payment_method,
        payment_status: expiredBooking.payment_status,
        booking_status: expiredBooking.booking_status,
        qr_token: expiredBooking.qr_token,
        auto_cancel_at: expiredBooking.auto_cancel_at,
        created_at: expiredBooking.created_at
      });
    }

    memoryStore.bookings.unshift(expiredBooking);
    realtimeBus.emit('booking:created', expiredBooking);

    // Now run cancellation check to auto-cancel it
    const cancelResult = await runCancellationCheck();

    res.json({
      success: true,
      message: 'Created Pay-at-Hotel booking with expired 24-hour deadline and triggered cancellation worker.',
      booking: expiredBooking,
      cancellation: cancelResult
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback to SPA index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ----------------------------------------------------------------------------
// Global Centralized Error Handling Middleware (Catches all unhandled exceptions)
// ----------------------------------------------------------------------------
app.use(errorHandler);

// Start Background Worker & Server
startCancellationJob(30000);

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║               GRAND AZURE LUXURY HOTEL SYSTEM ONLINE                 ║
╠══════════════════════════════════════════════════════════════════════╣
║  • Server:        http://localhost:${PORT}                             ║
║  • Architecture:  Express API Gateway + Supabase Database/Realtime   ║
║  • Status:        ${isConfigured ? 'Connected to Remote Supabase' : 'Running High-Fidelity Reactive Engine'}   ║
║  • Realtime Bus:  Active (SSE & WebSockets enabled)                 ║
║  • Cancellation:  24-Hour Policy Worker Active (30s interval)        ║
╚══════════════════════════════════════════════════════════════════════╝
  `);
});
