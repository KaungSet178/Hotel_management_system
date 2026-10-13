/** Booking reference, folio and PIN generation (mock-friendly, dev only). */

const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const NUM = '0123456789';

function pick(chars: string, n: number): string {
  let out = '';
  for (let i = 0; i < n; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/** Public booking reference, e.g. `SF-89241-K7`. */
export function generateReference(): string {
  const number = pick(NUM, 5);
  const alpha = pick(ALPHA, 2);
  return `SF-${number}-${alpha}`;
}

/** Folio id, e.g. `SF-2026-9481`. */
export function generateFolioId(year: string | number = new Date().getFullYear()): string {
  return `SF-${year}-${pick(NUM, 4)}`;
}

/** 4-digit PIN used as the mock access mechanism for folio lookup. */
export function generatePin(): string {
  return pick(NUM, 4);
}

export function generateServiceRequestId(seq: number): string {
  return `SR-${seq}`;
}

export function generatePaymentReference(prefix: string): string {
  return `${prefix}-${pick(NUM, 6)}`;
}

/**
 * QR payload for the express check-in pass.
 *
 * Deliberately opaque and free of guest PII *and* of the folio PIN: a scanned
 * or screenshotted QR must never grant folio access on its own. The desk
 * already knows the booking from the reference; the random token only proves
 * the pass was issued by us.
 */
export function buildQrPayload(reference: string, checkIn: string): string {
  return JSON.stringify({
    v: 1,
    type: 'stayease-express-checkin',
    ref: reference,
    token: `ci_${pick(ALPHA + NUM, 12)}`,
    ci: checkIn,
  });
}