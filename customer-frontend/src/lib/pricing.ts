import type { AddOn, PriceBreakdown, RatePlan } from '@/types';
import { formatMMK } from './currency';

export const SERVICE_CHARGE_RATE = 0.1;
export const COMMERCIAL_TAX_RATE = 0.05;

export interface PricingInput {
  ratePlan: RatePlan;
  nights: number;
  rooms?: number;
  addOns?: AddOn[];
}

/**
 * Builds the consistent MMK price breakdown used across the whole flow.
 * Base     = nightly rate × nights × rooms + all add-on prices
 * Service  = 10% of base, Commercial tax = 5% of base.
 * Any change here automatically propagates everywhere because the UI never
 * hardcodes totals — it always derives them from this function.
 */
export function computeBreakdown({ ratePlan, nights, rooms = 1, addOns = [] }: PricingInput): PriceBreakdown {
  const safeNights = Math.max(0, nights);
  const safeRooms = Math.max(1, rooms);
  const roomTotal = Math.round(ratePlan.nightlyRate * safeNights * safeRooms);
  const extrasTotal = addOns.reduce((sum, a) => sum + a.price, 0);
  const subtotal = roomTotal + extrasTotal;
  const serviceCharge = Math.round(subtotal * SERVICE_CHARGE_RATE);
  const tax = Math.round(subtotal * COMMERCIAL_TAX_RATE);

  const roomPart = `${formatMMK(ratePlan.nightlyRate)} × ${safeNights} night${safeNights === 1 ? '' : 's'}`;
  const lines: PriceBreakdown['lines'] = [
    {
      label: safeRooms > 1 ? `${roomPart} × ${safeRooms} rooms` : roomPart,
      amount: roomTotal,
      note: ratePlan.label,
    },
  ];
  for (const addOn of addOns) {
    lines.push({ label: addOn.label, amount: addOn.price, note: 'Add-on' });
  }

  return {
    lines,
    subtotal,
    serviceCharge,
    tax,
    total: subtotal + serviceCharge + tax,
    currency: 'MMK',
  };
}

export function saverNightlyRate(flexibleNightlyRate: number, savePercent = 15): number {
  return Math.round(flexibleNightlyRate * (1 - savePercent / 100));
}

/**
 * Refund share based on cancellation timing relative to check-in:
 * ≥48h → 100%, 24–48h → 50%, <24h → 0% (matches the reference refund matrix).
 */
export function refundPercent(checkInISO: string, nowISO: string): number {
  const checkIn = new Date(`${checkInISO}T14:00:00`);
  const now = new Date(`${nowISO}T14:00:00`);
  const ms = checkIn.getTime() - now.getTime();
  const hours = ms / 3_600_000;
  if (hours >= 48) return 100;
  if (hours >= 24) return 50;
  return 0;
}

export function refundLabel(checkInISO: string, nowISO: string): string {
  const pct = refundPercent(checkInISO, nowISO);
  if (pct === 100) return '100% full cancellation refund';
  if (pct === 50) return '50% partial refund';
  return 'Non-refundable under 24 hours from arrival';
}