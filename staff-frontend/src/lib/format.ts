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

/** Today's date as `YYYY-MM-DD`. */
export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Add `n` days to a `YYYY-MM-DD` date. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const out = new Date(y, m - 1, d + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${out.getFullYear()}-${p(out.getMonth() + 1)}-${p(out.getDate())}`;
}