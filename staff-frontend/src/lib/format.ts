/** Format a number as Myanmar Kyat, e.g. `759,000 MMK`. */
export function mmk(value: number): string {
  return `${Math.round(value).toLocaleString('en-US')} MMK`;
}

/** Front-desk exchange rate: 1 USD = 4,000 MMK. */
export const USD_RATE = 4000;

/** Format an MMK amount as US dollars, e.g. `$189.75`. */
export function usd(valueMmk: number): string {
  return `$${(valueMmk / USD_RATE).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export type DisplayCurrency = 'MMK' | 'USD';

/** Format an MMK amount in the requested display currency. */
export function formatCurrency(valueMmk: number, currency: DisplayCurrency): string {
  return currency === 'USD' ? usd(valueMmk) : mmk(valueMmk);
}

/** Human label like `18 Oct` / `18 Oct 2025`. */
export function shortDate(iso: string, withYear = false): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const label = `${d} ${months[m - 1]}`;
  return withYear ? `${label} ${y}` : label;
}

/** `18 – 21 Oct` */
export function dateRange(checkIn: string, checkOut: string): string {
  return `${shortDate(checkIn)} – ${shortDate(checkOut)}`;
}

/** Copy text to clipboard with a silent fallback. */
export function copyToClipboard(text: string): void {
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text);
  }
}

/** Initials for an avatar, e.g. `Thant Zin Oo` -> `TZ`. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export const MYANMAR_TIMEZONE = 'Asia/Yangon';

/** Today's date as `YYYY-MM-DD` in Myanmar Time (Asia/Yangon, UTC+06:30). */
export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: MYANMAR_TIMEZONE }).format(new Date());
}

/** Add `n` days to a `YYYY-MM-DD` date safely preserving Myanmar date boundaries. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return new Intl.DateTimeFormat('en-CA', { timeZone: MYANMAR_TIMEZONE }).format(target);
}

/** Formats a date/timestamp to Myanmar Time (e.g. `Tue, 13 Oct 2026, 02:45 PM MMT`). */
export function formatMyanmarDateTime(date: Date | string | number = new Date(), includeSeconds = false): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return (
    new Intl.DateTimeFormat('en-US', {
      timeZone: MYANMAR_TIMEZONE,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: true,
    }).format(d) + ' MMT'
  );
}

/** Formats a date into a full human-readable string in Myanmar time: e.g. `Tuesday, 13 October 2026`. */
export function formatMyanmarFullDate(date: Date | string | number = new Date()): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: MYANMAR_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/** Formats an ISO string (YYYY-MM-DD) into short weekday label and 2-digit day number in Myanmar timezone. */
export function getDayLabelAndNum(isoDate: string): { dayLabel: string; dayNum: string } {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: MYANMAR_TIMEZONE,
    weekday: 'short',
  }).format(dateObj);
  const dayNum = String(d).padStart(2, '0');
  return { dayLabel, dayNum };
}