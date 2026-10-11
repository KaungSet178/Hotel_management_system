import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { useId } from 'react';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

const controlBase =
  'rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-mute/70 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:bg-lavender-100 disabled:text-ink-mute';

function controlClass(hasError?: boolean, className?: string) {
  return cn(
    controlBase,
    hasError ? 'border-rose-400 focus:border-rose-500' : 'border-brand-900/15 focus:border-brand-500',
    className,
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-ink-mute">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ invalid, className, type = 'text', ...rest }: InputProps) {
  return (
    <input
      type={type}
      aria-invalid={invalid || undefined}
      className={controlClass(invalid, cn('w-full', className))}
      {...rest}
    />
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ invalid, className, rows = 4, ...rest }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={controlClass(invalid, cn('w-full resize-y', className))}
      {...rest}
    />
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  ref?: Ref<HTMLSelectElement>;
}

export function Select({ invalid, className, children, ...rest }: SelectProps) {
  // A caller-supplied width wins; otherwise the select fills its container. This
  // avoids emitting both `w-full` and `w-28` (our `cn` doesn't merge Tailwind
  // classes), which previously collapsed fixed-width selects inside flex rows.
  const hasOwnWidth = /(?:^|\s)(?:min-|max-)?w-/.test(className ?? '');
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={controlClass(
          invalid,
          cn(hasOwnWidth ? undefined : 'w-full', 'cursor-pointer appearance-none pr-9', className),
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute"
        aria-hidden="true"
      />
    </div>
  );
}

export function Checkbox({
  label,
  description,
  className,
  id,
  ref,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  description?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={inputId}
        ref={ref}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-brand-900/25 text-brand-700 accent-brand-700 focus:ring-brand-500"
        {...rest}
      />
      <label htmlFor={inputId} className="text-sm text-ink-soft">
        <span className="font-medium text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-ink-mute">{description}</span> : null}
      </label>
    </div>
  );
}

export function Stepper({
  value,
  min = 1,
  max = 10,
  onChange,
  label,
  id,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  label: string;
  id?: string;
}) {
  return (
    <div id={id} className="inline-flex items-center gap-3" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Decrease ${label}`}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-900/15 bg-white text-brand-800 transition-colors hover:bg-brand-50 disabled:opacity-40"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="min-w-6 text-center text-sm font-semibold text-ink" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`Increase ${label}`}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-900/15 bg-white text-brand-800 transition-colors hover:bg-brand-50 disabled:opacity-40"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}