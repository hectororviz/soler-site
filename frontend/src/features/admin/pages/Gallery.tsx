import { useState } from 'react';
import { api, resolveCrest } from '../../../services/api';
import { AdminPage, ConfirmButton, FormError, InlineForm, Field, Panel, inputCls } from '../components';
import { useAdminList, useAdminWrite } from '../hooks';
import type { GalleryImage } from '../types';
import { usePageTitle } from '../../../lib/usePageTitle';

function GalleryRow({ item, onSave, onToggle, onRemove }: {
  item: GalleryImage;
  onSave: (id: string, data: { caption?: string | null; order?: number }) => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(item.caption ?? '');
  const [order, setOrder] = useState(String(item.order));
  const src = resolveCrest(item.imagePath);
  const save = () => {
    onSave(item.id, { caption: caption.trim() || null, order: Number(order) || 0 });
    setEditing(false);
  };
  return (
    <li className={`overflow-hidden rounded-card border ${item.active ? 'border-line' : 'border-dashed opacity-60'}`}>
      {src && <img src={src} alt={item.caption ?? ''} className="h-40 w-full object-cover" loading="lazy" />}
      <div className="flex items-center justify-between gap-2 p-2">
        {editing ? (
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <input className={inputCls} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Epígrafe" />
            <input className={`${inputCls} w-20`} value={order} inputMode="numeric" onChange={(e) => setOrder(e.target.value)} aria-label="Orden" />
            <button onClick={save} className="inline-flex h-9 shrink-0 items-center rounded-card bg-pitch px-3 text-sm font-bold text-white">Guardar</button>
            <button onClick={() => setEditing(false)} className="inline-flex h-9 shrink-0 items-center rounded-card border border-line px-3 text-sm">Cancelar</button>
          </span>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate text-sm">{item.caption || <span className="text-ink-muted">Sin epígrafe</span>}</span>
            <button onClick={() => setEditing(true)} className="inline-flex h-9 shrink-0 items-center rounded-card border border-line px-3 text-sm font-semibold">Editar</button>
            <button
              onClick={onToggle}
              className="inline-flex h-9 items-center rounded-card border border-line px-3 text-sm font-semibold"
            >
              {item.active ? 'Ocultar' : 'Mostrar'}
            </button>
            <ConfirmButton onConfirm={onRemove}>Eliminar</ConfirmButton>
          </>
        )}
      </div>
    </li>
  );
}

export function GalleryPage() {
  usePageTitle('Galería — Admin');
  const list = useAdminList<GalleryImage[]>('admin-gallery', '/admin/gallery');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const w = useAdminWrite(() => { setCaption(''); setFile(null); });

  const create = () => {
    if (!file) return;
    setPending(true);
    (async () => {
      try {
        const up = await api.upload<{ imagePath: string }>('/admin/files', file, 'file', { admin: true });
        await w.run(
          () => api.post('/admin/gallery', { imagePath: up.imagePath, caption: caption.trim() || undefined }, { admin: true }),
          ['admin-gallery'],
        );
      } finally {
        setPending(false);
      }
    })();
  };

  return (
    <AdminPage title="Galería" desc="Fotos públicas del club. Solo las activas se muestran en el sitio.">
      <Panel title="Nueva foto">
        <InlineForm onSubmit={create} pending={pending} submitLabel="Subir">
          <Field label="Imagen (png/jpg/webp ≤4MB)">
            <input type="file" accept="image/png,image/jpeg,image/webp" className="text-sm font-normal" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          <Field label="Epígrafe (opcional)">
            <input className={inputCls} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Festejo Fecha 8" />
          </Field>
        </InlineForm>
        <FormError message={w.error} />
      </Panel>
      <div className="mt-4">
        <Panel title={`Fotos (${list.data?.length ?? 0})`}>
          {list.isPending ? <p className="text-sm text-ink-muted">Cargando…</p> : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(list.data ?? []).map((g) => (
                <GalleryRow
                  key={g.id}
                  item={g}
                  onSave={(id, data) => w.run(() => api.patch(`/admin/gallery/${id}`, data, { admin: true }), ['admin-gallery'])}
                  onToggle={() => w.run(() => api.patch(`/admin/gallery/${g.id}`, { active: !g.active }, { admin: true }), ['admin-gallery'])}
                  onRemove={() => w.run(() => api.del(`/admin/gallery/${g.id}`, { admin: true }), ['admin-gallery'])}
                />
              ))}
            </ul>
          )}
          <FormError message={w.error} />
        </Panel>
      </div>
    </AdminPage>
  );
}
