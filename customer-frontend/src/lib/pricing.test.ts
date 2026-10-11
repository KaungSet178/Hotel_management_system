import { describe, expect, it } from 'vitest';
import { computeBreakdown, refundPercent, saverNightlyRate } from '@/lib/pricing';
import type { AddOn, RatePlan } from '@/types';

const flexible: RatePlan = {
  id: 'flexible',
  label: 'Standard Flexible Rate',
  nightlyRate: 220000,
  features: [],
  refundable: true,
  payAtHotel: true,
};

const addOn: AddOn = {
  id: 'airport-transfer',
  label: 'Airport Limousine Transfer',
  category: 'transport',
  price: 150000,
  description: '',
  icon: 'Car',
};

describe('computeBreakdown', () => {
  it('applies 10% service charge and 5% commercial tax to the base', () => {
    const result = computeBreakdown({ ratePlan: flexible, nights: 3 });
    expect(result.subtotal).toBe(660000);
    expect(result.serviceCharge).toBe(66000);
    expect(result.tax).toBe(33000);
    expect(result.total).toBe(759000);
    expect(result.currency).toBe('MMK');
  });

  it('multiplies the nightly rate by rooms for multi-room bookings', () => {
    const single = computeBreakdown({ ratePlan: flexible, nights: 2, rooms: 1 });
    const double = computeBreakdown({ ratePlan: flexible, nights: 2, rooms: 2 });
    expect(double.subtotal).toBe(single.subtotal * 2);
    expect(double.total).toBe(single.total * 2);
  });

  it('adds enhancements into the base before service charge and tax', () => {
    const result = computeBreakdown({ ratePlan: flexible, nights: 1, addOns: [addOn] });
    expect(result.subtotal).toBe(220000 + 150000);
    expect(result.lines).toHaveLength(2);
    expect(result.serviceCharge).toBe(Math.round(370000 * 0.1));
    expect(result.tax).toBe(Math.round(370000 * 0.05));
  });

  it('never returns a negative subtotal for zero nights', () => {
    const result = computeBreakdown({ ratePlan: flexible, nights: -5 });
    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
  });
});

describe('saverNightlyRate', () => {
  it('discounts 15% by default and rounds to an integer', () => {
    expect(saverNightlyRate(220000)).toBe(187000);
    expect(Number.isInteger(saverNightlyRate(185000))).toBe(true);
  });
});

describe('refundPercent', () => {
  it('refunds 100% at or beyond 48 hours', () => {
    expect(refundPercent('2026-11-10', '2026-11-07')).toBe(100);
    expect(refundPercent('2026-11-10', '2026-11-08')).toBe(100);
  });

  it('refunds 50% between 24 and 48 hours', () => {
    expect(refundPercent('2026-11-10', '2026-11-09')).toBe(50);
  });

  it('refunds nothing under 24 hours', () => {
    expect(refundPercent('2026-11-10', '2026-11-10')).toBe(0);
  });
});
