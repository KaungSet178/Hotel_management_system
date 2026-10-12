import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  trend?: {
    positive: boolean;
    text: string;
  };
  icon: LucideIcon;
  variant?: 'primary' | 'secondary' | 'accent' | 'neutral';
}

export function KpiCard({
  title,
  value,
  unit,
  subtext,
  trend,
  icon: Icon,
  variant = 'neutral',
}: KpiCardProps) {
  const variantStyles = {
    neutral: 'bg-surface-container-lowest border-outline-variant/60 text-on-surface',
    primary: 'bg-primary-container/10 border-primary-container/30 text-on-surface',
    secondary: 'bg-secondary-container/30 border-secondary-container/60 text-on-surface',
    accent: 'bg-[#89f5e7]/10 border-[#89f5e7]/30 text-on-surface',
  };

  const iconStyles = {
    neutral: 'bg-surface-container text-on-surface-variant',
    primary: 'bg-primary text-white',
    secondary: 'bg-secondary-container text-on-secondary-container',
    accent: 'bg-[#89f5e7] text-[#0b1626]',
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5',
        variantStyles[variant],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-label-md font-medium text-on-surface-variant">{title}</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-headline-md font-bold tracking-tight text-on-surface">
              {value}
            </span>
            {unit && <span className="text-body-sm font-medium text-on-surface-variant">{unit}</span>}
          </div>
        </div>
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs transition group-hover:scale-105',
            iconStyles[variant],
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>

      {(subtext || trend) && (
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-outline-variant/30 pt-3 text-body-xs">
          {subtext && <span className="text-on-surface-variant">{subtext}</span>}
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-xs font-semibold',
                trend.positive
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
              )}
            >
              {trend.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
