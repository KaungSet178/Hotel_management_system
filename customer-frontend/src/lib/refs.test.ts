import { describe, expect, it } from 'vitest';
import { buildQrPayload, generateFolioId, generatePin, generateReference } from '@/lib/refs';

describe('refs', () => {
  it('generates a booking reference in the SF-#####-XX format', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateReference()).toMatch(/^SF-\d{5}-[A-Z]{2}$/);
    }
  });

  it('generates a folio id in the SF-YYYY-#### format', () => {
    expect(generateFolioId(2026)).toMatch(/^SF-2026-\d{4}$/);
  });

  it('generates a 4-digit PIN', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generatePin()).toMatch(/^\d{4}$/);
    }
  });

  it('builds an opaque QR payload without PII or the folio PIN', () => {
    const payload = buildQrPayload('SF-89241-K7', '2026-10-16');
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    expect(parsed.ref).toBe('SF-89241-K7');
    expect(parsed.ci).toBe('2026-10-16');
    expect(parsed.type).toBe('stayflow-express-checkin');
    expect(payload).not.toContain('@');
    expect(String(parsed.token)).toMatch(/^ci_[A-Z0-9]{12}$/);
  });
});
