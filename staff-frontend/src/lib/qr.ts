/** Parsing helpers for the contactless check-in QR pass (mock-friendly). */

export interface ExpressCheckInPass {
  v: number;
  type: 'stayease-express-checkin';
  ref: string;
  token: string;
  ci: string;
}

export interface ScannedPass {
  /** The booking reference carried by the pass, e.g. `SF-89241-K7`. */
  ref: string;
  /** `express` when the payload was a JSON pass, `plain` for a bare reference. */
  channel: 'express' | 'plain';
  /** The full parsed pass when the QR held a StayEase express-check-in payload. */
  pass: ExpressCheckInPass | null;
}

/** Normalise a reference for comparison — strips a leading `#` and upper-cases. */
export function normalizeRef(ref: string): string {
  return ref.trim().replace(/^#/, '').toUpperCase();
}

/**
 * Decode the raw text a scanner read into a booking reference.
 *
 * Accepts either a StayEase express-check-in JSON payload (as produced by the
 * guest booking confirmation) or a bare booking reference typed/pasted by the
 * front desk. Returns `null` when the code is not a recognisable pass.
 */
export function parseScan(raw: string): ScannedPass | null {
  const text = raw.trim();
  if (!text) return null;

  if (text.startsWith('{')) {
    try {
      const data = JSON.parse(text) as Partial<ExpressCheckInPass>;
      if (
        data.type === 'stayease-express-checkin' &&
        typeof data.ref === 'string' &&
        data.ref.trim().length > 0
      ) {
        return {
          ref: data.ref,
          channel: 'express',
          pass: {
            v: typeof data.v === 'number' ? data.v : 1,
            type: 'stayease-express-checkin',
            ref: data.ref,
            token: typeof data.token === 'string' ? data.token : '',
            ci: typeof data.ci === 'string' ? data.ci : '',
          },
        };
      }
    } catch {
      // Not JSON — fall through to treat as an opaque code.
    }
    return null;
  }

  return { ref: text, channel: 'plain', pass: null };
}
