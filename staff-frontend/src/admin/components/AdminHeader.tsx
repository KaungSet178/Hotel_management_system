import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Calendar, ChevronDown, Sparkles, Clock } from 'lucide-react';
import { formatMyanmarDateTime } from '@/lib/format';

interface AdminHeaderProps {
  title: string;
  subtitle: string;
  badge?: string;
  actions?: ReactNode;
  monthSelector?: {
    value: string;
    onChange: (month: string) => void;
  };
}

export function AdminHeader({
  title,
  subtitle,
  badge,
  actions,
  monthSelector,
}: AdminHeaderProps) {
  const [mmtTime, setMmtTime] = useState(() => formatMyanmarDateTime(new Date()));

  useEffect(() => {
    const timer = setInterval(() => {
      setMmtTime(formatMyanmarDateTime(new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mb-6 flex flex-col justify-between gap-4 border-b border-outline-variant/40 pb-5 lg:flex-row lg:items-end">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-label-xs font-semibold tracking-wider text-secondary uppercase">
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Grand Azure Resort & Spa</span>
          <span className="text-on-surface-variant/40">•</span>
          <span className="text-on-surface-variant">Management Console</span>
          <span className="text-on-surface-variant/40">•</span>
          <span className="inline-flex items-center gap-1 font-mono normal-case tracking-normal text-secondary font-semibold">
            <Clock className="h-3 w-3" />
            {mmtTime}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
            {title}
          </h1>
          {badge && (
            <span className="inline-flex items-center gap-1 rounded-full border border-secondary/20 bg-secondary-container/40 px-3 py-0.5 text-label-xs font-semibold text-on-secondary-container">
              <Sparkles className="h-3 w-3 text-secondary" />
              {badge}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200/80 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Sync Active
          </span>
        </div>
        <p className="mt-1 text-body-sm text-on-surface-variant">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {monthSelector && (
          <div className="relative flex items-center rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 py-1.5 shadow-xs transition hover:border-outline-variant">
            <Calendar className="mr-2 h-4 w-4 text-secondary shrink-0" />
            <select
              value={monthSelector.value}
              onChange={(e) => monthSelector.onChange(e.target.value)}
              className="appearance-none bg-transparent pr-6 text-label-sm font-semibold text-on-surface outline-none cursor-pointer"
            >
              <option value="2026-10">October 2026 (Active Fiscal)</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-08">August 2026</option>
              <option value="2026-07">July 2026</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-on-surface-variant/70" />
          </div>
        )}

        {actions}
      </div>
    </div>
  );
}
