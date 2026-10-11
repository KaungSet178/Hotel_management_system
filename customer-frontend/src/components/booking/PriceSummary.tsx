import type { AddOn, PriceBreakdown, RatePlan, StayRange } from '@/types';
import { formatMMK } from '@/lib/currency';
import { formatRange, nightsBetween } from '@/lib/dates';
import { cn } from '@/lib/cn';

/**
 * Single source of truth for the money summary. It renders whatever
 * `computeBreakdown` produced — never a hardcoded total.
 */
export function PriceSummary({
  ratePlan,
  stay,
  addOns = [],
  breakdown,
  className,
  footer,
  title = 'Reservation Summary',
}: {
  ratePlan: RatePlan;
  stay: StayRange;
  addOns?: AddOn[];
  breakdown: PriceBreakdown;
  className?: string;
  footer?: React.ReactNode;
  title?: string;
}) {
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  return (
    <div className={cn('rounded-2xl border border-brand-900/10 bg-white p-5 shadow-card', className)}>
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-mute">{title}</h3>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-soft">Dates of stay</dt>
          <dd className="font-medium text-ink">
            {formatRange(stay.checkIn, stay.checkOut)} · {nights} night{nights === 1 ? '' : 's'}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-soft">Rate plan</dt>
          <dd className="text-right font-medium text-ink">{ratePlan.label}</dd>
        </div>
      </dl>

      <div className="my-4 border-t border-dashed border-brand-900/12" />

      <dl className="space-y-2 text-sm">
        {breakdown.lines.map((line, index) => (
          <div key={`${line.label}-${index}`} className="flex items-start justify-between gap-3">
            <dt className="text-ink-soft">
              {line.label}
              {line.note ? <span className="ml-1 text-xs text-ink-mute">({line.note})</span> : null}
            </dt>
            <dd className="whitespace-nowrap font-medium text-ink">{formatMMK(line.amount)}</dd>
          </div>
        ))}
        {addOns.length > 0 ? (
          <p className="pt-1 text-xs text-ink-mute">{addOns.length} enhancement(s) added to your stay</p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-soft">Service charge (10%)</dt>
          <dd className="whitespace-nowrap font-medium text-ink">{formatMMK(breakdown.serviceCharge)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-soft">Commercial tax (5%)</dt>
          <dd className="whitespace-nowrap font-medium text-ink">{formatMMK(breakdown.tax)}</dd>
        </div>
      </dl>

      <div className="my-4 border-t border-brand-900/12" />

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink">Estimated grand total</span>
        <span className="text-lg font-bold text-brand-800">{formatMMK(breakdown.total)}</span>
      </div>
      <p className="mt-1 text-xs text-ink-mute">Inclusive of all taxes &amp; fees · MMK</p>

      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}