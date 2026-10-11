import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone =
  | 'brand'
  | 'lavender'
  | 'amber'
  | 'green'
  | 'red'
  | 'slate'
  | 'outline';

const tones: Record<BadgeTone, string> = {
  brand: 'bg-brand-700 text-white',
  lavender: 'bg-lavender-200 text-brand-900',
  amber: 'bg-amber-100 text-amber-800',
  green: 'bg-emerald-100 text-emerald-800',
  red: 'bg-rose-100 text-rose-700',
  slate: 'bg-slate-100 text-slate-700',
  outline: 'border border-brand-700/25 text-brand-800',
};

export function Badge({
  tone = 'brand',
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium leading-none',
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}