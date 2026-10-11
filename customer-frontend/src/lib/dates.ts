import {
  addDays,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfToday,
} from 'date-fns';

/** Parse an ISO `YYYY-MM-DD` string to a Date (timezone-safe). */
export function parseDate(value: string): Date {
  return parseISO(value);
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(value: string, days: number): string {
  return toISODate(addDays(parseDate(value), days));
}

export function isDateString(value: string): boolean {
  return isValid(parseISO(value));
}

/** Number of nights between inclusive check-in and exclusive check-out. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  if (!isDateString(checkIn) || !isDateString(checkOut)) return 0;
  const nights = differenceInCalendarDays(parseDate(checkOut), parseDate(checkIn));
  return Math.max(0, nights);
}

export function isCheckedOutBefore(checkOut: string, other: string): boolean {
  return parseDate(checkOut) <= parseDate(other);
}

/** Human label, e.g. `18 Oct 2026`. */
export function formatDate(value: string): string {
  return format(parseDate(value), 'd MMM yyyy');
}

/** Short human label, e.g. `18 Oct`. */
export function formatDateShort(value: string): string {
  return format(parseDate(value), 'd MMM');
}

export function formatRange(checkIn: string, checkOut: string): string {
  return `${formatDateShort(checkIn)} – ${formatDate(checkOut)}`;
}

/** Today + n days as ISO (used for demo seed + default search dates). */
export function todayPlus(days: number): string {
  return toISODate(addDays(startOfToday(), days));
}