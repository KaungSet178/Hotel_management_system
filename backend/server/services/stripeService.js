const crypto = require('crypto');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_azure_luxury_hotel_2026';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_azure_hotel_stripe_secret_2026';

/**
 * Generate Mocked Stripe Checkout Session for Visa / Card Payments
 */
function createCheckoutSession(booking, options = {}) {
  const sessionId = `cs_test_${crypto.randomBytes(16).toString('hex')}`;
  const serverHost = options.host || 'http://localhost:3000';
  const unitAmountCents = Math.round(Number(booking.total_amount) * 100);

  const metadata = {
    booking_id: booking.id,
    booking_reference: booking.booking_reference,
    room_number: String(booking.room_number),
    guest_name: booking.guest_name,
    guest_email: booking.guest_email
  };

  const session = {
    id: sessionId,
    object: 'checkout.session',
    payment_method_types: ['card'],
    mode: 'payment',
    currency: 'usd',
    amount_total: unitAmountCents,
    customer_email: booking.guest_email,
    metadata,
    payment_status: 'unpaid',
    success_url: `${serverHost}/?payment=success&ref=${booking.booking_reference}`,
    cancel_url: `${serverHost}/?payment=cancelled&ref=${booking.booking_reference}`,
    url: `https://checkout.stripe.com/pay/${sessionId}#mock`
  };

  return {
    success: true,
    provider: 'VISA',
    session_id: sessionId,
    checkout_url: session.url,
    session_data: session
  };
}

/**
 * Generate Stripe-compatible signature header for testing/simulation
 * Format: t=<timestamp>,v1=<hex_hmac>
 */
function generateWebhookSignatureHeader(rawBody, timestamp = Math.floor(Date.now() / 1000), secret = (process.env.STRIPE_WEBHOOK_SECRET || STRIPE_WEBHOOK_SECRET)) {
  const payloadString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  const signedPayload = `${timestamp}.${payloadString}`;
  const hmac = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  return `t=${timestamp},v1=${hmac}`;
}

/**
 * Verify and construct Stripe Webhook Event from raw payload buffer
 * Adheres to Stripe SDK's constructEvent verification standard
 */
function constructEvent(rawBody, signatureHeader, secret = (process.env.STRIPE_WEBHOOK_SECRET || STRIPE_WEBHOOK_SECRET)) {
  if (!signatureHeader) {
    throw new Error('No stripe-signature header value was provided.');
  }

  // Parse t and v1 from header
  const signatureComponents = signatureHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.trim().split('=');
    if (key && value) acc[key] = value;
    return acc;
  }, {});

  const timestamp = signatureComponents.t;
  const signature = signatureComponents.v1;

  if (!timestamp || !signature) {
    throw new Error('Malformed stripe-signature header; missing timestamp or signature.');
  }

  // Convert rawBody to string
  const payloadString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  const signedPayload = `${timestamp}.${payloadString}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const actualBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    throw new Error('Stripe signature verification failed: signature mismatch.');
  }

  // Safely parse JSON
  try {
    return JSON.parse(payloadString);
  } catch (err) {
    throw new Error(`Failed to parse Stripe webhook JSON: ${err.message}`);
  }
}

module.exports = {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  createCheckoutSession,
  generateWebhookSignatureHeader,
  constructEvent
};
