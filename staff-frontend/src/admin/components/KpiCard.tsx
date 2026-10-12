import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
  progress?: {
    current: number;
    target: number;
    label?: string;
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
  progress,
  icon: Icon,
  variant = 'neutral',
}: KpiCardProps) {
  const iconThemes = {
    neutral: 'bg-surface-container text-[#0e2a4a]',
    primary: 'bg-[#0e2a4a] text-white',
    secondary: 'bg-secondary-container text-on-secondary-container',
    accent: 'bg-[#89f5e7] text-[#071322]',
  };

  const borderAccents = {
    neutral: 'border-l-4 border-l-slate-400',
    primary: 'border-l-4 border-l-[#0e2a4a]',
    secondary: 'border-l-4 border-l-secondary',
    accent: 'border-l-4 border-l-[#89f5e7]',
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-outline-variant',
        borderAccents[variant],
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-label-sm font-semibold tracking-wide text-on-surface-variant uppercase">
            {title}
          </p>
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform duration-200 group-hover:scale-105',
              iconThemes[variant],
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-on-surface">
            {value}
          </span>
          {unit && (
            <span className="text-label-sm font-medium text-on-surface-variant">
              {unit}
            </span>
          )}
        </div>
      </div>

      {progress && (
        <div className="mt-4">
          <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
            <span>{progress.label || 'Progress vs Target'}</span>
            <span className="font-bold text-on-surface">
              {Math.min(100, Math.round((progress.current / progress.target) * 100))}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  Math.round((progress.current / progress.target) * 100),
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {(subtext || trend) && !progress && (
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-outline-variant/30 pt-3 text-[11px] leading-snug">
          {subtext && (
            <span className="text-on-surface-variant font-medium">
              {subtext}
            </span>
          )}
          {trend && (
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-label-xs font-bold whitespace-nowrap',
                trend.positive
                  ? 'bg-emerald-500/10 text-emerald-700'
                  : 'bg-rose-500/10 text-rose-700',
              )}
            >
              {trend.positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {trend.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
