import { describe, expect, it } from 'vitest';
import { addDaysISO, formatDate, formatRange, isDateString, nightsBetween } from '@/lib/dates';

describe('dates', () => {
  it('computes nights between an inclusive check-in and exclusive check-out', () => {
    expect(nightsBetween('2026-10-16', '2026-10-19')).toBe(3);
    expect(nightsBetween('2026-10-16', '2026-10-17')).toBe(1);
    expect(nightsBetween('2026-10-16', '2026-10-16')).toBe(0);
  });

  it('never returns negative nights for reversed ranges', () => {
    expect(nightsBetween('2026-10-19', '2026-10-16')).toBe(0);
  });

  it('validates ISO date strings', () => {
    expect(isDateString('2026-10-16')).toBe(true);
    expect(isDateString('not-a-date')).toBe(false);
    expect(isDateString('')).toBe(false);
  });

  it('adds days across month boundaries', () => {
    expect(addDaysISO('2026-10-30', 3)).toBe('2026-11-02');
  });

  it('formats human-readable labels', () => {
    expect(formatDate('2026-10-16')).toBe('16 Oct 2026');
    const range = formatRange('2026-10-16', '2026-10-19');
    expect(range).toContain('16 Oct');
    expect(range).toContain('19 Oct 2026');
  });
});
