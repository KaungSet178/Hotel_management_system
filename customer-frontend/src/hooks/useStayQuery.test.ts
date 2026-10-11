import { describe, expect, it } from 'vitest';
import { parseStayParams } from '@/hooks/useStayQuery';

describe('parseStayParams', () => {
  it('parses a complete set of search parameters', () => {
    const params = new URLSearchParams({
      dest: 'yangon-heritage',
      in: '2026-10-16',
      out: '2026-10-19',
      adults: '2',
      rooms: '1',
    });
    const stay = parseStayParams(params);
    expect(stay.destination).toBe('yangon-heritage');
    expect(stay.checkIn).toBe('2026-10-16');
    expect(stay.checkOut).toBe('2026-10-19');
    expect(stay.nights).toBe(3);
    expect(stay.adults).toBe(2);
    expect(stay.rooms).toBe(1);
    expect(stay.complete).toBe(true);
  });

  it('falls back to sensible defaults when parameters are missing', () => {
    const stay = parseStayParams(new URLSearchParams());
    expect(stay.complete).toBe(false);
    expect(stay.adults).toBe(2);
    expect(stay.rooms).toBe(1);
    expect(stay.nights).toBeGreaterThan(0);
  });

  it('clamps occupancy into safe bounds', () => {
    const stay = parseStayParams(new URLSearchParams({ adults: '99', rooms: '-3' }));
    expect(stay.adults).toBe(8);
    expect(stay.rooms).toBe(1);
  });

  it('repairs a check-out that is not after check-in', () => {
    const stay = parseStayParams(
      new URLSearchParams({ in: '2026-10-16', out: '2026-10-15' }),
    );
    expect(stay.checkOut > stay.checkIn).toBe(true);
    expect(stay.nights).toBeGreaterThan(0);
  });

  it('produces a stable query string carrying the stay forward', () => {
    const stay = parseStayParams(
      new URLSearchParams({ dest: 'inle-lake', in: '2026-10-16', out: '2026-10-19', adults: '3', rooms: '2' }),
    );
    expect(stay.queryString).toContain('dest=inle-lake');
    expect(stay.queryString).toContain('in=2026-10-16');
    expect(stay.queryString).toContain('rooms=2');
  });
});
