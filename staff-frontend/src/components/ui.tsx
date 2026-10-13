import { useEffect, useId, useState } from 'react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type {
  BookingRequest,
  BookingStatus,
  RoomStatus,
  ServiceState,
} from '@/types';

/* ---------------------------------- Button --------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'amber';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-container text-white shadow-sm hover:bg-[#16263f] active:bg-primary-container',
  secondary: 'bg-secondary text-white shadow-sm hover:bg-[#00796e]',
  outline:
    'border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low',
  ghost: 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
  danger: 'bg-error text-white shadow-sm hover:bg-[#d32f2f]',
  amber: 'bg-tertiary-fixed text-on-tertiary-fixed-variant shadow-sm hover:bg-tertiary-fixed-dim',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' && 'h-8 px-3 text-label-sm',
        size === 'md' && 'h-9 px-4 text-label-md',
        size === 'lg' && 'h-11 px-6 text-label-md',
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

/* ---------------------------------- Chips --------------------------------- */

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-secondary-container text-on-secondary-container',
  OCCUPIED: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  RESERVED: 'bg-primary-container text-white',
  CLEANING: 'bg-amber-100 text-amber-800 border border-amber-300',
  MAINTENANCE: 'bg-error-container text-on-error-container',
  PENDING: 'bg-sky-100 text-sky-800',
  CONFIRMED: 'bg-secondary-container text-on-secondary-container',
  CHECKED_IN: 'bg-secondary text-white',
  CHECKED_OUT: 'bg-[#e7eeff] text-[#3a475f]',
  CANCELLED: 'bg-error-container text-on-error-container',
  PREPAID: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  'PAY_AT_HOTEL': 'bg-[#e7eeff] text-[#3a475f]',
  'FEE_SETTLED': 'bg-[#e7eeff] text-[#3a475f]',
  PAID: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  PROOF_UPLOADED:
    'bg-[#0e1c32]/80 text-[#ecf1ff] border border-[#86f2e4]/60',
  'AWAITING_GATEWAY': 'bg-[#e7eeff] text-[#3a475f]',
  ROOM_CONFLICT: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  REJECTED: 'bg-error-container text-on-error-container',
  IN_PROGRESS: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  COMPLETED: 'bg-secondary-container text-on-secondary-container',
};

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-[#e7eeff] text-[#3a475f]';
}

export function StatusChip({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm font-medium',
        statusColor(status),
        className,
      )}
    >
      {status}
    </span>
  );
}

/* ---------------------------------- Cards --------------------------------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-xl bg-surface-container-lowest shadow-[0_1px_2px_rgba(17,28,45,0.05),0_10px_30px_-18px_rgba(17,28,45,0.22)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface PanelProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

export function Panel({ title, subtitle, action, className, bodyClassName, children }: PanelProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/40 px-5 py-4">
          <div>
            {title && (
              <h2 className="text-headline-md font-semibold tracking-tight text-on-surface">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-0.5 text-body-sm text-on-surface-variant">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn('px-5 py-5', bodyClassName)}>{children}</div>
    </Card>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-label-sm font-semibold tracking-wide text-secondary uppercase">{eyebrow}</p>
        )}
        <h1 className="mt-1 text-headline-lg font-semibold tracking-tight text-on-surface">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/* --------------------------------- Avatar --------------------------------- */

export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const parts = name.trim().split(/\s+/);
  const label = (parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '').toUpperCase();
  return (
    <span
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary-container text-label-md font-semibold text-on-secondary-container',
        className,
      )}
    >
      {label}
    </span>
  );
}

/* --------------------------------- Modal ---------------------------------- */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  tone?: 'default' | 'danger';
  children: ReactNode;
}

export function Modal({ open, onClose, title, tone = 'default', children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-[#0b1626]/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cn(
          'relative h-fit max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-surface-container-lowest p-6 shadow-[0_24px_80px_-24px_rgba(11,22,38,0.5)]',
          tone === 'danger' ? 'border-error/25' : 'border-outline-variant/60',
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h3
                className={cn(
                  'text-headline-md font-semibold tracking-tight',
                  tone === 'danger' ? 'text-on-error-container' : 'text-on-surface',
                )}
              >
                {title}
              </h3>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-on-surface-variant transition hover:bg-surface-container-low hover:text-on-surface"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* --------------------------------- Fields --------------------------------- */

const FIELD_INPUT =
  'h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-md text-on-surface placeholder:text-[#91949c] outline-none transition focus:border-[#0e1c32] focus:ring-2 focus:ring-[#0e1c32]/15';

export function Field({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-label-md font-medium text-on-surface">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-body-sm text-on-surface-variant">{hint}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(FIELD_INPUT, props.className)} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(FIELD_INPUT, 'pr-8', props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(FIELD_INPUT, 'h-auto min-h-20 py-2', props.className)} />;
}

/* ------------------------------- Stat chips -------------------------------- */

export interface StatItem {
  label: string;
  value: string;
  accent?: 'secondary' | 'primary' | 'amber' | 'danger';
  icon?: ReactNode;
  subtext?: string;
}

const ACCENTS: Record<string, string> = {
  secondary: 'text-secondary',
  primary: 'text-[#0e1c32]',
  amber: 'text-[#b45309]',
  danger: 'text-error',
};

export function StatChip({ label, value, accent = 'secondary', icon, subtext }: StatItem) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-outline-variant/50 bg-white px-3.5 py-2.5">
      {icon && <span className={cn('shrink-0', ACCENTS[accent])}>{icon}</span>}
      <div>
        <p className="text-label-md font-semibold text-on-surface">{value}</p>
        <p className="text-label-sm text-on-surface-variant">{label}</p>
        {subtext && <p className="text-[11px] font-medium text-on-surface-variant/75">{subtext}</p>}
      </div>
    </div>
  );
}

/* ------------------------------- Empty state -------------------------------- */

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low/40 px-6 py-10 text-center">
      <p className="text-body-md font-medium text-on-surface">{title}</p>
      {hint && <p className="text-body-sm text-on-surface-variant">{hint}</p>}
    </div>
  );
}

/* ------------------------------ Count badge -------------------------------- */

export function CountBadge({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-container px-1.5 text-label-sm font-semibold text-on-secondary-container',
        className,
      )}
    >
      {count}
    </span>
  );
}

/* ------------------------------ Reusable types ------------------------------ */

export interface BookingStatusProps {
  status: BookingStatus;
  className?: string;
}

export interface RoomStatusProps {
  status: RoomStatus;
  className?: string;
}

export interface RequestStateProps {
  state: BookingRequest['state'];
  className?: string;
}

export interface ServiceStateProps {
  state: ServiceState;
  className?: string;
}

/* --------------------------------- Id hook --------------------------------- */

export function useLocalId(prefix: string): string {
  const id = useId();
  return `${prefix}-${id.replace(/[:]/g, '')}`;
}

/* --------------------------------- Toggle ---------------------------------- */

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  const [toggled, setToggled] = useState(checked);
  const active = toggled;
  return (
    <button
      type="button"
      onClick={() => {
        const next = !active;
        setToggled(next);
        onChange(next);
      }}
      className="flex items-center gap-2.5"
      aria-pressed={active}
    >
      <span
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          active ? 'bg-secondary' : 'bg-outline-variant',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            active && 'translate-x-5',
          )}
        />
      </span>
      <span className="text-label-md font-medium text-on-surface">{label}</span>
    </button>
  );
}