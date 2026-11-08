import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';

export function AdminPage({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl font-extrabold uppercase md:text-4xl">{title}</h1>
      {desc && <p className="mt-1 max-w-3xl text-[15px] text-ink-muted">{desc}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-white p-4 shadow-soft md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold uppercase">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm font-semibold">
      {label}
      {children}
    </label>
  );
}

export const inputCls =
  'h-11 rounded-card border border-line bg-white px-3 text-[15px] font-normal text-ink disabled:opacity-50';

export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = '¿Eliminar? Clic para confirmar',
}: {
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: string;
}) {
  const [armed, setArmed] = useState(false);
  if (armed) {
    return (
      <span className="inline-flex gap-1">
        <button
          className="inline-flex h-9 items-center rounded-card bg-primary px-3 text-sm font-bold text-white"
          onClick={() => {
            setArmed(false);
            onConfirm();
          }}
        >
          {confirmLabel}
        </button>
        <button
          className="inline-flex h-9 items-center rounded-card border border-line px-3 text-sm font-semibold"
          onClick={() => setArmed(false)}
        >
          No
        </button>
      </span>
    );
  }
  return (
    <button
      className="inline-flex h-9 items-center rounded-card border border-line px-3 text-sm font-semibold text-primary hover:border-primary"
      onClick={() => setArmed(true)}
    >
      {children}
    </button>
  );
}

export function InlineForm({ onSubmit, children, submitLabel = 'Guardar', pending }: {
  onSubmit: () => void;
  children: ReactNode;
  submitLabel?: string;
  pending?: boolean;
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-card bg-black/[0.03] p-3">
      {children}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center rounded-card bg-pitch px-5 font-bold text-white hover:bg-black disabled:opacity-50"
      >
        {pending ? 'Guardando…' : submitLabel}
      </button>
    </form>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-3 rounded-card border border-primary/30 bg-primary-soft px-4 py-2.5 text-sm font-medium text-primary">
      {message}
    </p>
  );
}
