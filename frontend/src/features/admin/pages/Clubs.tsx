import { useState } from 'react';
import { api, resolveCrest } from '../../../services/api';
import { AdminPage, FormError, InlineForm, Field, Panel, inputCls } from '../components';
import { useAdminList, useAdminWrite } from '../hooks';
import type { AdminClub } from '../types';
import { usePageTitle } from '../../../lib/usePageTitle';

export function ClubsPage() {
  usePageTitle('Clubes — Admin');
  const list = useAdminList<AdminClub[]>('admin-clubs', '/clubs');
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [externalId, setExternalId] = useState('');
  const [crest, setCrest] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const w = useAdminWrite(() => { setName(''); setShortName(''); setExternalId(''); setCrest(null); });

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
              {list.data!.map((c) => {
                const src = resolveCrest(c.crestPath);
                return (
                  <li key={c.id} className="flex items-center gap-3 rounded-card border border-line px-3 py-2">
                    {src ? (
                      <img src={src} alt={`Escudo de ${c.name}`} className="h-9 w-9 object-contain" loading="lazy" />
                    ) : (
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-pitch font-display text-xs font-bold text-gold">
                        {c.shortName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{c.name}</span>
                      <span className="block truncate text-[13px] text-ink-muted">
                        {c.shortName} · /{c.slug}{c.externalId ? ` · ext:${c.externalId}` : ''}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </AdminPage>
  );
}
