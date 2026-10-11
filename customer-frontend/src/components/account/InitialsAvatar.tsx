import { cn } from '@/lib/cn';
import { initialsOf } from '@/lib/auth';

export function InitialsAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white',
        'h-9 w-9',
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
