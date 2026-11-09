import { useState } from 'react';
import { api, resolveCrest } from '../../../services/api';
import { AdminPage, ConfirmButton, FormError, InlineForm, Field, Panel, inputCls } from '../components';
import { useAdminList, useAdminWrite } from '../hooks';
import type { PageSlot, Sponsor } from '../types';
import { usePageTitle } from '../../../lib/usePageTitle';

const SLOTS = ['club', 'contacto', 'hero'];

function SlotEditor({ slot }: { slot: string }) {
  const q = useAdminList<PageSlot | null>('admin-slot', `/content?slot=${slot}`);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const w = useAdminWrite(() => {});

  if (q.data && loaded !== slot) {
    setTitle(q.data.title ?? '');
    setBody(q.data.body ?? '');
    setImagePath(q.data.imagePath ?? null);
    setLoaded(slot);
  }

  const save = () => {
    setPending(true);
    (async () => {
      try {
        let img = imagePath;
        if (file) {
          const up = await api.upload<{ imagePath: string }>('/admin/files', file, 'file', { admin: true });
          img = up.imagePath;
          setImagePath(img);
          setFile(null);
        }
        await w.run(
          () => api.post('/admin/content', { slot, title: title || undefined, body: body || undefined, imagePath: img }, { admin: true }),
          ['admin-slot'],
        );
      } finally {
        setPending(false);
      }
    })();
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
            <Field label="Imagen (opcional)">
              {imagePath && <img src={resolveCrest(imagePath) ?? ''} alt="" className="mb-2 h-20 object-contain" />}
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="text-sm font-normal"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
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

function SponsorRow({ sponsor, onLogo, onToggle, onRemove }: {
  sponsor: Sponsor;
  onLogo: (id: string, logoPath: string) => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const pick = async (f: File | null) => {
    if (!f) return;
    setUploading(true);
    try {
      const up = await api.upload<{ imagePath: string }>('/admin/files', f, 'file', { admin: true });
      onLogo(sponsor.id, up.imagePath);
    } finally {
      setUploading(false);
    }
  };
  const logo = sponsor.logoPath ? resolveCrest(sponsor.logoPath) : null;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <span className="flex min-w-0 items-center gap-2">
        {logo ? <img src={logo} alt={sponsor.name} className="h-8 object-contain" /> : null}
        <span className="font-semibold">{sponsor.name} <span className="text-sm font-normal text-ink-muted">{sponsor.active ? '· visible' : '· oculto'}</span></span>
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          aria-label={`Logo de ${sponsor.name}`}
          className="max-w-44 text-xs font-normal"
          disabled={uploading}
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        <button onClick={onToggle} className="inline-flex h-9 items-center rounded-card border border-line px-3 text-sm font-semibold">
          {sponsor.active ? 'Ocultar' : 'Mostrar'}
        </button>
        <ConfirmButton onConfirm={onRemove}>Eliminar</ConfirmButton>
      </span>
    </li>
  );
}

export function ContentPage() {
  usePageTitle('Contenido y sponsors — Admin');
  const sponsors = useAdminList<Sponsor[]>('admin-sponsors', '/admin/sponsors');
  const [name, setName] = useState('');
  const [href, setHref] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const w = useAdminWrite(() => { setName(''); setHref(''); setLogoFile(null); });

  const create = () => {
    if (!name.trim()) return;
    setPending(true);
    (async () => {
      try {
        let logoPath: string | undefined;
        if (logoFile) {
          const up = await api.upload<{ imagePath: string }>('/admin/files', logoFile, 'file', { admin: true });
          logoPath = up.imagePath;
        }
        await w.run(
          () => api.post('/admin/sponsors', { name: name.trim(), href: href.trim() || undefined, logoPath }, { admin: true }),
          ['admin-sponsors'],
        );
      } finally {
        setPending(false);
      }
    })();
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
            <Field label="Logo (opcional)">
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="text-sm font-normal" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
            </Field>
          </InlineForm>
          <FormError message={w.error} />
        </Panel>
        <div className="mt-4">
          <Panel title={`Sponsors (${sponsors.data?.length ?? 0})`}>
            <ul className="divide-y divide-line">
              {(sponsors.data ?? []).map((s) => (
                <SponsorRow
                  key={s.id}
                  sponsor={s}
                  onLogo={(id, logoPath) => w.run(() => api.patch(`/admin/sponsors/${id}`, { logoPath }, { admin: true }), ['admin-sponsors'])}
                  onToggle={() => w.run(() => api.patch(`/admin/sponsors/${s.id}`, { active: !s.active }, { admin: true }), ['admin-sponsors'])}
                  onRemove={() => w.run(() => api.del(`/admin/sponsors/${s.id}`, { admin: true }), ['admin-sponsors'])}
                />
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
