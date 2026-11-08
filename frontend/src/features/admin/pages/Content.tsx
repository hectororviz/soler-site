import { useState } from 'react';
import { api } from '../../../services/api';
import { AdminPage, ConfirmButton, FormError, InlineForm, Field, Panel, inputCls } from '../components';
import { useAdminList, useAdminWrite } from '../hooks';
import type { PageSlot, Sponsor } from '../types';
import { usePageTitle } from '../../../lib/usePageTitle';

const SLOTS = ['club', 'contacto', 'hero'];

function SlotEditor({ slot }: { slot: string }) {
  const q = useAdminList<PageSlot | null>('admin-slot', `/content?slot=${slot}`);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loaded, setLoaded] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const w = useAdminWrite(() => {});

  if (q.data && loaded !== slot) {
    setTitle(q.data.title ?? '');
    setBody(q.data.body ?? '');
    setLoaded(slot);
  }

  const save = () => {
    setPending(true);
    w.run(
      () => api.post('/admin/content', { slot, title: title || undefined, body: body || undefined }, { admin: true }),
      ['admin-slot'],
    ).finally(() => setPending(false));
  };

  return (
    <Panel title={`Bloque: ${slot}`}>
      {q.isPending ? <p className="text-sm text-ink-muted">Cargando…</p> : (
        <>
          <div className="flex flex-col gap-3">
            <Field label="Título">
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Texto">
              <textarea className={`${inputCls} h-28 py-2`} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            <div>
              <button onClick={save} disabled={pending} className="inline-flex h-11 items-center rounded-card bg-pitch px-5 font-bold text-white disabled:opacity-50">
                {pending ? 'Guardando…' : 'Guardar bloque'}
              </button>
            </div>
          </div>
          <FormError message={w.error} />
        </>
      )}
    </Panel>
  );
}

export function ContentPage() {
  usePageTitle('Contenido y sponsors — Admin');
  const sponsors = useAdminList<Sponsor[]>('admin-sponsors', '/admin/sponsors');
  const [name, setName] = useState('');
  const [href, setHref] = useState('');
  const [pending, setPending] = useState(false);
  const w = useAdminWrite(() => { setName(''); setHref(''); });

  const create = () => {
    if (!name.trim()) return;
    setPending(true);
    w.run(
      () => api.post('/admin/sponsors', { name: name.trim(), href: href.trim() || undefined }, { admin: true }),
      ['admin-sponsors'],
    ).finally(() => setPending(false));
  };

  const toggle = (s: Sponsor) => {
    w.run(() => api.patch(`/admin/sponsors/${s.id}`, { active: !s.active }, { admin: true }), ['admin-sponsors']);
  };

  const remove = (id: string) => {
    w.run(() => api.del(`/admin/sponsors/${id}`, { admin: true }), ['admin-sponsors']);
  };

  return (
    <AdminPage title="Contenido" desc="Textos institucionales por bloque y sponsors. Nada se publica inventado: lo vacío no se muestra.">
      <div className="grid gap-4 lg:grid-cols-2">
        {SLOTS.map((s) => <SlotEditor key={s} slot={s} />)}
      </div>
      <div className="mt-4">
        <Panel title="Nuevo sponsor">
          <InlineForm onSubmit={create} pending={pending} submitLabel="Agregar">
            <Field label="Nombre">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Enlace (opcional)">
              <input className={inputCls} value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://…" />
            </Field>
          </InlineForm>
          <FormError message={w.error} />
        </Panel>
        <div className="mt-4">
          <Panel title={`Sponsors (${sponsors.data?.length ?? 0})`}>
            <ul className="divide-y divide-line">
              {(sponsors.data ?? []).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className="font-semibold">{s.name} <span className="text-sm font-normal text-ink-muted">{s.active ? '· visible' : '· oculto'}</span></span>
                  <span className="flex gap-2">
                    <button onClick={() => toggle(s)} className="inline-flex h-9 items-center rounded-card border border-line px-3 text-sm font-semibold">
                      {s.active ? 'Ocultar' : 'Mostrar'}
                    </button>
                    <ConfirmButton onConfirm={() => remove(s.id)}>Eliminar</ConfirmButton>
                  </span>
                </li>
              ))}
              {(sponsors.data ?? []).length === 0 && !sponsors.isPending && (
                <li className="py-2 text-sm text-ink-muted">Sin sponsors.</li>
              )}
            </ul>
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}
