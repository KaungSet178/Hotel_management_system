import type { ReactNode } from 'react';
import { Calendar } from 'lucide-react';

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
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 border-b border-outline-variant/50 pb-5 sm:flex-row sm:items-center">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-headline-sm font-semibold tracking-tight text-on-surface">
            {title}
          </h1>
          {badge && (
            <span className="rounded-full bg-secondary-container px-2.5 py-0.5 text-label-sm font-medium text-on-secondary-container">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-body-md text-on-surface-variant">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {monthSelector && (
          <div className="flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-1.5 shadow-sm">
            <Calendar className="h-4 w-4 text-on-surface-variant" />
            <select
              value={monthSelector.value}
              onChange={(e) => monthSelector.onChange(e.target.value)}
              className="bg-transparent text-label-md font-medium text-on-surface outline-none cursor-pointer"
            >
              <option value="2026-10">October 2026 (Current)</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-08">August 2026</option>
              <option value="2026-07">July 2026</option>
            </select>
          </div>
        )}

        {actions}
      </div>
    </div>
  );
}
