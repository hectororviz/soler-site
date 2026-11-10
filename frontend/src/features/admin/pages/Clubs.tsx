import { useState } from 'react';
import { api, resolveCrest } from '../../../services/api';
import { AdminPage, FormError, InlineForm, Field, Panel, inputCls } from '../components';
import { useAdminList, useAdminWrite } from '../hooks';
import type { AdminClub } from '../types';
import { usePageTitle } from '../../../lib/usePageTitle';

function ClubRow({ club, onSave }: { club: AdminClub; onSave: (id: string, data: Partial<AdminClub>) => void }) {
  const [mapsUrl, setMapsUrl] = useState(club.mapsUrl ?? '');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(club.name);
  const [shortName, setShortName] = useState(club.shortName);
  const [externalId, setExternalId] = useState(club.externalId ?? '');
  const src = resolveCrest(club.crestPath);
  return (
    <li className="flex flex-col gap-2 rounded-card border border-line px-3 py-2">
      <span className="flex items-center gap-3">
        {src ? (
          <img src={src} alt={`Escudo de ${club.name}`} className="h-9 w-9 object-contain" loading="lazy" decoding="async" width={36} height={36} />
        ) : (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-pitch font-display text-xs font-bold text-gold">
            {club.shortName.slice(0, 2).toUpperCase()}
          </span>
        )}
        {editing ? (
          <span className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
            <input className={inputCls} value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="Nombre corto" />
            <input className={inputCls} value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="ID externo" />
          </span>
        ) : (
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{club.name}</span>
            <span className="block truncate text-[13px] text-ink-muted">
              {club.shortName} · /{club.slug}{club.externalId ? ` · ext:${club.externalId}` : ''}
            </span>
          </span>
        )}
        <button
          onClick={() => {
            if (editing) onSave(club.id, { name: name.trim() || club.name, shortName: shortName.trim() || club.shortName, externalId: externalId.trim() || null });
            setEditing((v) => !v);
          }}
          className="inline-flex h-11 shrink-0 items-center rounded-card border border-line px-3 text-sm font-semibold hover:border-primary"
        >
          {editing ? 'Guardar' : 'Editar'}
        </button>
      </span>
      <span className="flex items-center gap-2">
        <input
          className={inputCls}
          value={mapsUrl}
          onChange={(e) => setMapsUrl(e.target.value)}
          placeholder="Link de Google Maps de la cancha"
        />
        <button
          onClick={() => onSave(club.id, { mapsUrl: mapsUrl.trim() || null })}
          className="inline-flex h-11 shrink-0 items-center rounded-card border border-line px-3 text-sm font-semibold hover:border-primary"
        >
          Guardar Maps
        </button>
      </span>
    </li>
  );
}
export function ClubsPage() {
  usePageTitle('Clubes — Admin');
  const list = useAdminList<AdminClub[]>('admin-clubs', '/clubs');
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [externalId, setExternalId] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [crest, setCrest] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const w = useAdminWrite(() => { setName(''); setShortName(''); setExternalId(''); setMapsUrl(''); setCrest(null); });

  const create = () => {
    if (!name.trim() || !shortName.trim()) return;
    setPending(true);
    (async () => {
      try {
        let crestPath: string | undefined;
        if (crest) {
          const up = await api.upload<{ crestPath: string }>('/admin/clubs/crest', crest, 'file', { admin: true });
          crestPath = up.crestPath;
        }
        await w.run(
          () => api.post('/admin/clubs', {
            name: name.trim(),
            shortName: shortName.trim(),
            externalId: externalId.trim() || undefined,
            mapsUrl: mapsUrl.trim() || undefined,
            crestPath,
          }, { admin: true }),
          ['admin-clubs'],
        );
      } finally {
        setPending(false);
      }
    })();
  };

  return (
    <AdminPage title="Clubes" desc="72 clubes precargados desde el CSV municipal. Escudo reemplazable.">
      <Panel title="Nuevo club">
        <InlineForm onSubmit={create} pending={pending} submitLabel="Crear">
          <Field label="Nombre">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Club Ejemplo" />
          </Field>
          <Field label="Nombre corto">
            <input className={inputCls} value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="Ejemplo" />
          </Field>
          <Field label="ID externo (Ligas)">
            <input className={inputCls} value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="opcional" />
          </Field>
          <Field label="Maps (link de Google Maps)">
            <input className={inputCls} value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="https://maps.google.com/…" />
          </Field>
          <Field label="Escudo (png/jpg/svg/webp ≤2MB)">
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="text-sm"
              onChange={(e) => setCrest(e.target.files?.[0] ?? null)}
            />
          </Field>
        </InlineForm>
        <FormError message={w.error} />
      </Panel>
      <div className="mt-4">
        <Panel title={`Registrados (${list.data?.length ?? 0})`}>
          {list.isPending ? <p className="text-sm text-ink-muted">Cargando…</p> : list.isError ? (
            <p className="text-sm text-ink-muted">No se pudo cargar.</p>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {list.data!.map((c) => (
                <ClubRow key={c.id} club={c} onSave={(id, data) => w.run(() => api.patch(`/admin/clubs/${id}`, data, { admin: true }), ['admin-clubs'])} />
              ))}
            </ul>
          )}
          <FormError message={w.error} />
        </Panel>
      </div>
    </AdminPage>
  );
}
