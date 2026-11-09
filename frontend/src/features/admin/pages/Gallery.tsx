import { useState } from 'react';
import { api, resolveCrest } from '../../../services/api';
import { AdminPage, ConfirmButton, FormError, InlineForm, Field, Panel, inputCls } from '../components';
import { useAdminList, useAdminWrite } from '../hooks';
import type { GalleryImage } from '../types';
import { usePageTitle } from '../../../lib/usePageTitle';

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
              {(list.data ?? []).map((g) => {
                const src = resolveCrest(g.imagePath);
                return (
                  <li key={g.id} className={`overflow-hidden rounded-card border ${g.active ? 'border-line' : 'border-dashed opacity-60'}`}>
                    {src && <img src={src} alt={g.caption ?? ''} className="h-40 w-full object-cover" loading="lazy" />}
                    <div className="flex items-center justify-between gap-2 p-2">
                      <span className="min-w-0 flex-1 truncate text-sm">{g.caption || <span className="text-ink-muted">Sin epígrafe</span>}</span>
                      <button
                        onClick={() => w.run(() => api.patch(`/admin/gallery/${g.id}`, { active: !g.active }, { admin: true }), ['admin-gallery'])}
                        className="inline-flex h-9 items-center rounded-card border border-line px-3 text-sm font-semibold"
                      >
                        {g.active ? 'Ocultar' : 'Mostrar'}
                      </button>
                      <ConfirmButton onConfirm={() => w.run(() => api.del(`/admin/gallery/${g.id}`, { admin: true }), ['admin-gallery'])}>Eliminar</ConfirmButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <FormError message={w.error} />
        </Panel>
      </div>
    </AdminPage>
  );
}
