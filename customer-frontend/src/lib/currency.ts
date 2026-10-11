/** Currency helpers. All internal money is stored as integer MMK. */

const mmkFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function formatMMK(amount: number): string {
  return `${mmkFormatter.format(Math.round(amount))} MMK`;
}

export function formatUSD(amountMmK: number, rate = 3090): string {
  const usd = amountMmK / rate;
  return `$${usd.toFixed(2)} USD`;
}

export function formatNumber(value: number): string {
  return mmkFormatter.format(value);
}