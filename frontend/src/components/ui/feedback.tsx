import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-line bg-white shadow-soft transition-shadow duration-200 hover:shadow-lift', className)}
      {...rest}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-black/10', className)} />;
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-white px-6 py-10 text-center">
      <p className="font-display text-2xl font-bold uppercase">{title}</p>
      {hint && <p className="mt-2 text-sm text-ink-muted">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'No se pudo cargar la información',
  hint = 'Reintentá en unos segundos.',
  onRetry,
}: {
  title?: string;
  hint?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-card border border-line bg-white px-6 py-10 text-center">
      <p className="font-display text-2xl font-bold uppercase text-primary">{title}</p>
      <p className="mt-2 text-sm text-ink-muted">{hint}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex h-11 items-center rounded-card border border-line px-5 font-semibold hover:border-primary hover:text-primary"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  link,
}: {
  title: string;
  description?: string;
  link?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-3xl font-bold uppercase leading-none md:text-4xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-[15px] text-ink-muted">{description}</p>}
      </div>
      {link}
    </div>
  );
}
