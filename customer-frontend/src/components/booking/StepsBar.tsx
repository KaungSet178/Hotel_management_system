import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

const STEPS = ['Select Room', 'Guest Details', 'Payment Method', 'Confirmation'] as const;

export function StepsBar({
  current,
  onSelect,
}: {
  current: 1 | 2 | 3 | 4;
  onSelect?: (step: 1 | 2 | 3) => void;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-2 sm:gap-4" aria-label="Booking progress">
      {STEPS.map((label, index) => {
        const step = (index + 1) as 1 | 2 | 3 | 4;
        const complete = step < current;
        const active = step === current;
        const clickable = onSelect && step < current && step < 4;
        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelect?.(step as 1 | 2 | 3)}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-full px-1 text-left',
                clickable ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  active && 'bg-brand-700 text-white',
                  complete && 'bg-brand-100 text-brand-700',
                  !active && !complete && 'bg-lavender-200 text-ink-mute',
                )}
              >
                {complete ? <Check className="h-4 w-4" aria-hidden="true" /> : step}
              </span>
              <span
                className={cn(
                  'hidden text-sm font-medium sm:inline',
                  active ? 'text-ink' : 'text-ink-mute',
                )}
              >
                {label}
              </span>
            </button>
            {step < 4 ? <span className="hidden h-px w-6 bg-brand-900/15 sm:block" aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
}