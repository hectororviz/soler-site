import { useState } from 'react';
import { api, resolveCrest } from '../../../services/api';
import { AdminPage, ConfirmButton, FormError, InlineForm, Field, Panel, inputCls } from '../components';
import { useAdminList, useAdminWrite } from '../hooks';
import type { GalleryAlbum, GalleryImage } from '../types';
import { usePageTitle } from '../../../lib/usePageTitle';
import { MiniMd } from '../../../lib/miniMd';

function PhotoRow({ item, isCover, onSave, onCover, onRemove }: {
  item: GalleryImage;
  isCover: boolean;
  onSave: (data: { caption?: string | null; order?: number }) => void;
  onCover: () => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(item.caption ?? '');
  const [order, setOrder] = useState(String(item.order));
  const src = resolveCrest(item.imagePath);
  return (
    <li className={`overflow-hidden rounded-card border ${item.active ? 'border-line' : 'border-dashed opacity-60'}`}>
      <span className="relative block">
        {src && <img src={src} alt={item.caption ?? ''} className="aspect-[3/2] h-32 w-full object-cover" loading="lazy" decoding="async" width={480} height={160} />}
        {isCover && <span className="absolute left-2 top-2 rounded-full bg-pitch px-2 py-0.5 text-xs font-bold text-white">Portada</span>}
      </span>
      <div className="flex flex-wrap items-center gap-2 p-2">
        {editing ? (
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <input className={inputCls} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Epígrafe" />
            <input className={`${inputCls} w-20`} value={order} inputMode="numeric" onChange={(e) => setOrder(e.target.value)} aria-label="Orden" />
            <button
              onClick={() => { onSave({ caption: caption.trim() || null, order: Number(order) || 0 }); setEditing(false); }}
              className="inline-flex h-9 shrink-0 items-center rounded-card bg-pitch px-3 text-sm font-bold text-white"
            >
              Guardar
            </button>
            <button onClick={() => setEditing(false)} className="inline-flex h-9 shrink-0 items-center rounded-card border border-line px-3 text-sm">Cancelar</button>
          </span>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate text-sm">{item.caption || <span className="text-ink-muted">Sin epígrafe</span>}</span>
            <button onClick={() => setEditing(true)} className="inline-flex h-9 shrink-0 items-center rounded-card border border-line px-3 text-sm font-semibold">Editar</button>
            {!isCover && (
              <button onClick={onCover} className="inline-flex h-9 shrink-0 items-center rounded-card border border-line px-3 text-sm font-semibold" title="Usar como portada del álbum">
                Portada
              </button>
            )}
            <ConfirmButton onConfirm={onRemove}>Eliminar</ConfirmButton>
          </>
        )}
      </div>
    </li>
  );
}

function AlbumPanel({ album, onChanged }: { album: GalleryAlbum; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(album.title);
  const [body, setBody] = useState(album.body ?? '');
  const [order, setOrder] = useState(String(album.order));
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const w = useAdminWrite(onChanged);

  const saveAlbum = () => {
    if (!title.trim()) return;
    w.run(
      () => api.patch(`/admin/gallery/albums/${album.id}`, { title: title.trim(), body: body.trim() || null, order: Number(order) || 0 }, { admin: true }),
      ['admin-gallery-albums'],
    ).then(() => setEditing(false));
  };

  const upload = () => {
    if (!files?.length) return;
    const MAX = 12 * 1024 * 1024;
    const tooBig = Array.from(files).find((f) => f.size > MAX);
    if (tooBig) {
      setUploadError(`"${tooBig.name}" supera los 12 MB. Achicá la foto e intentá de nuevo.`);
      return;
    }
    setUploadError(null);
    setUploading(true);
    (async () => {
      try {
        const base = album.images.length ? Math.max(...album.images.map((i) => i.order)) + 1 : 0;
        let n = 0;
        for (const f of Array.from(files)) {
          const up = await api.upload<{ imagePath: string }>('/admin/files', f, 'file', { admin: true });
          await api.post('/admin/gallery', { imagePath: up.imagePath, albumId: album.id, order: base + n }, { admin: true });
          n++;
        }
        setFiles(null);
        onChanged();
      } finally {
        setUploading(false);
      }
    })();
  };

  return (
    <Panel title={`${album.title} (${album.images.length} fotos)${album.active ? '' : ' · oculto'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setOpen((v) => !v)} className="inline-flex h-9 items-center rounded-card border border-line px-3 text-sm font-semibold">
          {open ? 'Contraer' : 'Gestionar fotos'}
        </button>
        <button onClick={() => setEditing((v) => !v)} className="inline-flex h-9 items-center rounded-card border border-line px-3 text-sm font-semibold">Editar datos</button>
        <button
          onClick={() => w.run(() => api.patch(`/admin/gallery/albums/${album.id}`, { active: !album.active }, { admin: true }), ['admin-gallery-albums']).then(onChanged)}
          className="inline-flex h-9 items-center rounded-card border border-line px-3 text-sm font-semibold"
        >
          {album.active ? 'Ocultar' : 'Mostrar'}
        </button>
        <ConfirmButton onConfirm={() => w.run(() => api.del(`/admin/gallery/albums/${album.id}`, { admin: true }), ['admin-gallery-albums']).then(onChanged)}>
          Eliminar álbum
        </ConfirmButton>
        <span className="text-xs text-ink-muted">Al eliminar, las fotos quedan sueltas.</span>
      </div>
      {editing && (
        <div className="mt-3 flex flex-col gap-3">
          <Field label="Título">
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Jornada Soler - D. Villa de Mayo" />
          </Field>
          <Field label="Texto (mini-markdown)">
            <textarea className={`${inputCls} h-24 py-2`} value={body} onChange={(e) => setBody(e.target.value)} placeholder="**Tarde de fútbol** en casa..." />
            {body.trim() && (
              <div className="mt-2 rounded-card border border-line bg-black/[0.02] p-3">
                <MiniMd text={body} className="space-y-1 text-sm" />
              </div>
            )}
          </Field>
          <Field label="Orden">
            <input className={`${inputCls} w-24`} value={order} inputMode="numeric" onChange={(e) => setOrder(e.target.value)} />
          </Field>
          <div>
            <button onClick={saveAlbum} className="inline-flex h-10 items-center rounded-card bg-pitch px-5 text-sm font-bold text-white">Guardar álbum</button>
          </div>
        </div>
      )}
      {open && (
        <div className="mt-3">
          <Field label="Subir fotos al álbum (varias a la vez)">
            <span className="flex flex-wrap items-center gap-2">
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="text-sm font-normal" onChange={(e) => setFiles(e.target.files)} />
              <button
                onClick={upload}
                disabled={!files?.length || uploading}
                className="inline-flex h-9 items-center rounded-card bg-pitch px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                {uploading ? 'Subiendo…' : 'Subir'}
              </button>
            </span>
            <span className="text-xs text-ink-muted">PNG, JPG o WebP de hasta 12 MB por foto.</span>
          </Field>
          {uploadError && <p className="mt-1 text-sm font-semibold text-red-700">{uploadError}</p>}
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {album.images.map((g) => (
              <PhotoRow
                key={g.id}
                item={g}
                isCover={album.coverImageId === g.id || (!album.coverImageId && album.images[0]?.id === g.id)}
                onSave={(data) => w.run(() => api.patch(`/admin/gallery/${g.id}`, data, { admin: true }), ['admin-gallery-albums']).then(onChanged)}
                onCover={() => w.run(() => api.patch(`/admin/gallery/albums/${album.id}`, { coverImageId: g.id }, { admin: true }), ['admin-gallery-albums']).then(onChanged)}
                onRemove={() => w.run(() => api.del(`/admin/gallery/${g.id}`, { admin: true }), ['admin-gallery-albums']).then(onChanged)}
              />
            ))}
          </ul>
          {!album.images.length && <p className="mt-2 text-sm text-ink-muted">Este álbum todavía no tiene fotos.</p>}
        </div>
      )}
      <FormError message={w.error} />
    </Panel>
  );
}

export function GalleryPage() {
  usePageTitle('Galería — Admin');
  const albums = useAdminList<GalleryAlbum[]>('admin-gallery-albums', '/admin/gallery/albums');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const w = useAdminWrite(() => { setTitle(''); setBody(''); });

  const create = () => {
    if (!title.trim()) return;
    setPending(true);
    w.run(
      () => api.post('/admin/gallery/albums', { title: title.trim(), body: body.trim() || undefined }, { admin: true }),
      ['admin-gallery-albums'],
    ).finally(() => setPending(false));
  };

  return (
    <AdminPage title="Galería" desc="Álbumes públicos del club: un post con varias fotos. Solo los activos se muestran en el sitio.">
      <Panel title="Nuevo álbum">
        <InlineForm onSubmit={create} pending={pending} submitLabel="Crear álbum">
          <Field label="Título">
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Jornada Soler - D. Villa de Mayo" />
          </Field>
          <Field label="Texto (mini-markdown: **negrita**, [link](https://…))">
            <input className={inputCls} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tarde de fútbol en casa..." />
          </Field>
        </InlineForm>
        <FormError message={w.error} />
      </Panel>
      <div className="mt-4 flex flex-col gap-4">
        {albums.isPending ? <p className="text-sm text-ink-muted">Cargando…</p> : (
          (albums.data ?? []).map((a) => (
            <AlbumPanel key={a.id} album={a} onChanged={() => albums.refetch?.()} />
          ))
        )}
        {(albums.data ?? []).length === 0 && !albums.isPending && (
          <p className="text-sm text-ink-muted">Todavía no hay álbumes. Creá el primero arriba.</p>
        )}
      </div>
    </AdminPage>
  );
}
