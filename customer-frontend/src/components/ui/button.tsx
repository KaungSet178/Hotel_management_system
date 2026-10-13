import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 will-change-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 hover:shadow-md active:bg-brand-900 shadow-sm',
  secondary: 'bg-lavender-200 text-brand-900 hover:bg-lavender-300',
  outline: 'border border-brand-700/30 bg-white text-brand-800 hover:border-brand-700 hover:bg-brand-50',
  ghost: 'text-brand-800 hover:bg-brand-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 hover:shadow-md',
  link: 'text-brand-700 underline-offset-4 hover:underline p-0 h-auto',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
};

export function buttonStyles(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(
    base,
    variants[variant],
    variant === 'link' ? '' : sizes[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leadingIcon,
  trailingIcon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
}