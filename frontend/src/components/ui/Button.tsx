import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover focus-visible:outline-primary',
  secondary: 'bg-white text-ink border border-line hover:border-primary hover:text-primary',
  ghost: 'bg-transparent text-ink hover:bg-black/5',
  dark: 'bg-pitch text-white hover:bg-black',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm min-h-[36px]',
  md: 'h-11 px-5 text-[15px] min-h-[44px]',
  lg: 'h-12 px-6 text-base min-h-[48px]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, disabled, children, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-card font-semibold transition-all duration-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? 'Cargando…' : children}
    </button>
  ),
);
Button.displayName = 'Button';
