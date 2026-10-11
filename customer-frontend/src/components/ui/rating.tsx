import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Rating({
  value,
  count,
  size = 'sm',
  className,
}: {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(value));
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="inline-flex" aria-hidden="true">
        {stars.map((filled, i) => (
          <Star
            key={i}
            className={cn(
              size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
              filled ? 'fill-amber-400 text-amber-400' : 'text-amber-200',
            )}
          />
        ))}
      </span>
      <span className={cn('font-semibold text-ink', size === 'sm' ? 'text-xs' : 'text-sm')}>
        {value.toFixed(1)}
      </span>
      {typeof count === 'number' ? (
        <span className="text-xs text-ink-mute">({count})</span>
      ) : null}
      <span className="sr-only">
        Rated {value.toFixed(1)} out of 5{typeof count === 'number' ? ` from ${count} reviews` : ''}
      </span>
    </span>
  );
}